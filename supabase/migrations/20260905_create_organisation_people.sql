begin;

create table public.organisation_people (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete restrict,
  organisation_member_id uuid null,
  organisation_unit_id uuid null,
  manager_person_id uuid null,
  employee_reference_id text null,
  employee_reference_normalized text generated always as (nullif(lower(btrim(employee_reference_id)), '')) stored,
  name text not null,
  business_email text null,
  business_email_normalized text generated always as (nullif(lower(btrim(business_email)), '')) stored,
  job_title text null,
  location text null,
  workforce_status text not null default 'active'
    check (workforce_status in ('active', 'inactive', 'leaver')),
  status_changed_at timestamptz not null default now(),
  source text not null default 'manual'
    check (source in ('manual', 'spreadsheet_import', 'integration')),
  last_confirmed_at timestamptz null,
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organisation_id)
);

alter table public.organisation_units
  add constraint organisation_units_id_organisation_unique
  unique (id, organisation_id);

alter table public.organisation_members
  add constraint organisation_members_id_organisation_unique
  unique (id, organisation_id);

alter table public.organisation_people
  add constraint organisation_people_unit_same_organisation_fk
  foreign key (organisation_unit_id, organisation_id)
  references public.organisation_units(id, organisation_id)
  on delete restrict,
  add constraint organisation_people_member_same_organisation_fk
  foreign key (organisation_member_id, organisation_id)
  references public.organisation_members(id, organisation_id)
  on delete restrict,
  add constraint organisation_people_manager_same_organisation_fk
  foreign key (manager_person_id, organisation_id)
  references public.organisation_people(id, organisation_id)
  on delete restrict,
  add constraint organisation_people_manager_not_self
  check (manager_person_id is null or manager_person_id <> id);

create unique index organisation_people_employee_reference_unique
  on public.organisation_people (organisation_id, employee_reference_normalized)
  where employee_reference_normalized is not null;

create unique index organisation_people_business_email_unique
  on public.organisation_people (organisation_id, business_email_normalized)
  where business_email_normalized is not null;

create unique index organisation_people_member_unique
  on public.organisation_people (organisation_id, organisation_member_id)
  where organisation_member_id is not null;

create index organisation_people_status_idx
  on public.organisation_people (organisation_id, workforce_status);
create index organisation_people_unit_idx
  on public.organisation_people (organisation_id, organisation_unit_id);
create index organisation_people_manager_idx
  on public.organisation_people (organisation_id, manager_person_id);
create index organisation_people_last_confirmed_idx
  on public.organisation_people (organisation_id, last_confirmed_at desc);

create or replace function public.is_explicit_organisation_admin(requested_organisation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organisation_members membership
    where membership.user_id = auth.uid()
      and membership.organisation_id = requested_organisation_id
      and membership.role = 'organisation_admin'
  );
$$;

revoke all on function public.is_explicit_organisation_admin(uuid) from public;
grant execute on function public.is_explicit_organisation_admin(uuid) to authenticated;

create or replace function public.audit_organisation_people_write()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    new.updated_by := auth.uid();
    new.created_at := coalesce(new.created_at, now());
    new.updated_at := now();
    new.status_changed_at := coalesce(new.status_changed_at, now());
  else
    if new.id <> old.id or new.organisation_id <> old.organisation_id
       or new.created_by <> old.created_by or new.created_at <> old.created_at then
      raise exception 'Immutable organisation_people provenance cannot be changed';
    end if;
    if new.workforce_status is distinct from old.workforce_status then
      new.status_changed_at := now();
    end if;
    new.updated_by := auth.uid();
    new.updated_at := now();
  end if;
  return new;
end;
$$;

create trigger organisation_people_audit_write
before insert or update on public.organisation_people
for each row execute function public.audit_organisation_people_write();

alter table public.organisation_people enable row level security;

create policy organisation_people_select_admin
on public.organisation_people for select to authenticated
using (public.is_explicit_organisation_admin(organisation_id));

create policy organisation_people_insert_admin
on public.organisation_people for insert to authenticated
with check (
  public.is_explicit_organisation_admin(organisation_id)
  and created_by = auth.uid()
  and updated_by = auth.uid()
);

create policy organisation_people_update_admin
on public.organisation_people for update to authenticated
using (public.is_explicit_organisation_admin(organisation_id))
with check (public.is_explicit_organisation_admin(organisation_id));

grant select, insert, update on public.organisation_people to authenticated;

create or replace function public.apply_confirmed_workforce_import(
  requested_organisation_id uuid,
  confirmed_units jsonb,
  confirmed_people jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor_id uuid := auth.uid();
  unit_item jsonb;
  person_item jsonb;
  unit_id uuid;
  parent_id uuid;
  leaf_unit_id uuid;
  matched_person_id uuid;
  reference_person_id uuid;
  email_person_id uuid;
  linked_member_id uuid;
  existing_linked_member_id uuid;
  manager_id uuid;
  expected_existing_id uuid;
  expected_membership_id uuid;
  match_count integer;
  created_units integer := 0;
  created_people integer := 0;
  updated_people integer := 0;
  aligned_members integer := 0;
  clean_name text;
  clean_type text;
  unit_key text;
  parent_key text;
  reference_value text;
  email_value text;
  manager_value text;
begin
  if actor_id is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;
  if requested_organisation_id is null or not public.is_explicit_organisation_admin(requested_organisation_id) then
    raise exception 'Organisation Administrator access is required' using errcode = '42501';
  end if;
  if confirmed_units is null or confirmed_people is null
     or jsonb_typeof(confirmed_units) <> 'array' or jsonb_typeof(confirmed_people) <> 'array' then
    raise exception 'Confirmed workforce plan must contain arrays';
  end if;
  if jsonb_array_length(confirmed_units) > 2000 or jsonb_array_length(confirmed_people) > 5000 then
    raise exception 'Confirmed workforce plan exceeds the safe import limit';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(requested_organisation_id::text, 0));

  drop table if exists pg_temp.root_import_units;
  create temporary table pg_temp.root_import_units (
    plan_key text primary key,
    unit_id uuid not null
  ) on commit drop;
  drop table if exists pg_temp.root_import_people;
  create temporary table pg_temp.root_import_people (
    person_id uuid primary key,
    reference_normalized text,
    email_normalized text,
    name_normalized text,
    manager_normalized text
  ) on commit drop;
  for unit_item in select value from jsonb_array_elements(confirmed_units)
  loop
    if jsonb_typeof(unit_item) <> 'object' then
      raise exception 'Invalid organisational unit plan item';
    end if;
    unit_key := nullif(btrim(unit_item->>'key'), '');
    parent_key := nullif(btrim(unit_item->>'parentKey'), '');
    clean_name := nullif(btrim(unit_item->>'name'), '');
    clean_type := nullif(btrim(unit_item->>'unitType'), '');
    expected_existing_id := nullif(btrim(unit_item->>'expectedExistingId'), '')::uuid;
    if unit_key is null or clean_name is null or clean_type not in ('department', 'region', 'country', 'division', 'business_unit', 'function', 'site', 'team', 'other') then
      raise exception 'Invalid organisational unit definition';
    end if;
    if parent_key is not null then
      select mapped.unit_id into parent_id from pg_temp.root_import_units mapped where mapped.plan_key = parent_key;
      if parent_id is null then
        raise exception 'Organisation hierarchy is not parent-first';
      end if;
    else
      parent_id := null;
    end if;

    select count(*), (array_agg(existing.id))[1]
      into match_count, unit_id
      from public.organisation_units existing
     where existing.organisation_id = requested_organisation_id
       and lower(btrim(existing.name)) = lower(clean_name)
       and existing.unit_type = clean_type
       and existing.parent_unit_id is not distinct from parent_id;
    if match_count > 1 then
      raise exception 'Ambiguous organisational unit match';
    end if;
    if unit_id is distinct from expected_existing_id then
      raise exception 'Organisation structure changed after review';
    end if;
    if unit_id is null then
      insert into public.organisation_units (organisation_id, name, unit_type, parent_unit_id, active, created_by)
      values (requested_organisation_id, clean_name, clean_type, parent_id, true, actor_id)
      returning id into unit_id;
      created_units := created_units + 1;
    end if;
    insert into pg_temp.root_import_units(plan_key, unit_id) values (unit_key, unit_id);
  end loop;

  for person_item in select value from jsonb_array_elements(confirmed_people)
  loop
    matched_person_id := null;
    reference_person_id := null;
    email_person_id := null;
    linked_member_id := null;
    existing_linked_member_id := null;
    expected_existing_id := nullif(btrim(person_item->>'expectedExistingPersonId'), '')::uuid;
    expected_membership_id := nullif(btrim(person_item->>'expectedMembershipId'), '')::uuid;
    if jsonb_typeof(person_item) <> 'object' or jsonb_typeof(person_item->'row') <> 'object' then
      raise exception 'Invalid workforce person plan item';
    end if;
    unit_key := nullif(btrim(person_item->>'leafUnitKey'), '');
    select mapped.unit_id into leaf_unit_id from pg_temp.root_import_units mapped where mapped.plan_key = unit_key;
    if leaf_unit_id is null then
      raise exception 'Workforce person has no confirmed leaf unit';
    end if;

    reference_value := nullif(btrim(person_item->'row'->>'employee_id'), '');
    email_value := nullif(lower(btrim(person_item->'row'->>'email')), '');
    clean_name := coalesce(nullif(btrim(person_item->'row'->>'name'), ''), email_value);
    if clean_name is null or email_value is null or email_value !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
      raise exception 'Workforce person requires a valid name and email';
    end if;

    reference_person_id := null;
    email_person_id := null;
    if reference_value is not null then
      select count(*), (array_agg(existing.id))[1] into match_count, reference_person_id
        from public.organisation_people existing
       where existing.organisation_id = requested_organisation_id
         and existing.employee_reference_normalized = lower(reference_value);
      if match_count > 1 then raise exception 'Ambiguous employee reference match'; end if;
    end if;
    select count(*), (array_agg(existing.id))[1] into match_count, email_person_id
      from public.organisation_people existing
     where existing.organisation_id = requested_organisation_id
       and existing.business_email_normalized = email_value;
    if match_count > 1 then raise exception 'Ambiguous business email match'; end if;
    if reference_person_id is not null and email_person_id is not null and reference_person_id <> email_person_id then
      raise exception 'Employee reference and email identify different workforce people';
    end if;
    matched_person_id := coalesce(reference_person_id, email_person_id);
    if matched_person_id is distinct from expected_existing_id then
      raise exception 'Workforce person matching changed after review';
    end if;

    select count(*), (array_agg(membership.id))[1] into match_count, linked_member_id
      from public.organisation_members membership
     where membership.organisation_id = requested_organisation_id
       and lower(btrim(membership.email)) = email_value;
    if match_count > 1 then raise exception 'Ambiguous organisation membership match'; end if;
    if linked_member_id is distinct from expected_membership_id then
      raise exception 'Organisation membership matching changed after review';
    end if;

    if matched_person_id is not null then
      select organisation_member_id into existing_linked_member_id
        from public.organisation_people
       where id = matched_person_id and organisation_id = requested_organisation_id
       for update;
      if existing_linked_member_id is not null and linked_member_id is not null and existing_linked_member_id <> linked_member_id then
        raise exception 'Workforce person is already linked to another membership';
      end if;
      update public.organisation_people
         set organisation_member_id = coalesce(linked_member_id, existing_linked_member_id),
             organisation_unit_id = leaf_unit_id,
             employee_reference_id = reference_value,
             name = clean_name,
             business_email = email_value,
             job_title = nullif(btrim(person_item->'row'->>'job_title'), ''),
             location = nullif(btrim(person_item->'row'->>'location'), ''),
             workforce_status = 'active',
             source = 'spreadsheet_import',
             last_confirmed_at = now(),
             updated_by = actor_id
       where id = matched_person_id and organisation_id = requested_organisation_id;
      updated_people := updated_people + 1;
    else
      insert into public.organisation_people (
        organisation_id, organisation_member_id, organisation_unit_id,
        employee_reference_id, name, business_email, job_title, location,
        workforce_status, source, last_confirmed_at, created_by, updated_by
      ) values (
        requested_organisation_id, linked_member_id, leaf_unit_id,
        reference_value, clean_name, email_value,
        nullif(btrim(person_item->'row'->>'job_title'), ''),
        nullif(btrim(person_item->'row'->>'location'), ''),
        'active', 'spreadsheet_import', now(), actor_id, actor_id
      ) returning id into matched_person_id;
      created_people := created_people + 1;
    end if;

    insert into pg_temp.root_import_people (
      person_id, reference_normalized, email_normalized, name_normalized, manager_normalized
    ) values (
      matched_person_id, lower(reference_value), email_value, lower(clean_name),
      nullif(lower(btrim(person_item->'row'->>'manager')), '')
    );

    linked_member_id := coalesce(linked_member_id, existing_linked_member_id);
    if linked_member_id is not null then
      update public.organisation_members
         set organisation_unit_id = leaf_unit_id
       where id = linked_member_id
         and organisation_id = requested_organisation_id
         and organisation_unit_id is distinct from leaf_unit_id;
      if found then aligned_members := aligned_members + 1; end if;
    end if;
  end loop;

  for matched_person_id, manager_value in
    select imported.person_id, imported.manager_normalized
      from pg_temp.root_import_people imported
     where imported.manager_normalized is not null
  loop
    select count(distinct candidate.person_id), (array_agg(distinct candidate.person_id))[1]
      into match_count, manager_id
      from pg_temp.root_import_people candidate
     where candidate.reference_normalized = manager_value
        or candidate.email_normalized = manager_value
        or candidate.name_normalized = manager_value;
    if match_count <> 1 or manager_id = matched_person_id then
      raise exception 'Manager reference is ambiguous or invalid';
    end if;
    update public.organisation_people
       set manager_person_id = manager_id, updated_by = actor_id
     where id = matched_person_id
       and organisation_id = requested_organisation_id;
    if not found then raise exception 'Manager relationship crossed the organisation boundary'; end if;
  end loop;

  return jsonb_build_object(
    'createdUnits', created_units,
    'createdPeople', created_people,
    'updatedPeople', updated_people,
    'alignedMembers', aligned_members,
    'excludedRows', 0
  );
end;
$$;

revoke all on function public.apply_confirmed_workforce_import(uuid, jsonb, jsonb) from public;
grant execute on function public.apply_confirmed_workforce_import(uuid, jsonb, jsonb) to authenticated;

commit;
