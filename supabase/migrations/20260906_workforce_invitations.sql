-- Phase 3B. Review and apply separately; application work does not authorise execution.
begin;

-- Do not repair/deduplicate production identities automatically. Block this migration
-- if historical duplicates exist. The table lock closes the check/index race.
lock table public.organisation_members in share row exclusive mode;
do $$
begin
  if exists (
    select 1 from public.organisation_members where user_id is not null
    group by organisation_id, user_id having count(*) > 1
  ) then
    raise exception 'Phase 3B blocked: duplicate organisation/user memberships require review';
  end if;
  if not exists (
    select 1 from pg_index i
    where i.indrelid = 'public.organisation_members'::regclass
      and i.indisunique and i.indisvalid and i.indimmediate
      and i.indpred is null and i.indexprs is null and i.indnkeyatts = 2
      and (select array_agg(a.attname::text order by a.attname)
           from unnest(i.indkey::smallint[]) with ordinality k(attnum, position)
           join pg_attribute a on a.attrelid = i.indrelid and a.attnum = k.attnum
           where k.position <= i.indnkeyatts) = array['organisation_id', 'user_id']::text[]
  ) then
    create unique index organisation_members_phase3b_org_user_unique
      on public.organisation_members (organisation_id, user_id);
  end if;
end;
$$;

create table public.organisation_employee_invites (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete restrict,
  person_id uuid not null,
  recipient_email text not null,
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  request_id uuid not null,
  invited_by uuid not null references auth.users(id) on delete restrict,
  delivery_status text not null check (delivery_status in ('sending', 'sent', 'failed', 'unknown')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  sent_at timestamptz,
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id) on delete restrict,
  provider_message_id text,
  unique (organisation_id, person_id),
  foreign key (person_id, organisation_id)
    references public.organisation_people(id, organisation_id) on delete restrict,
  check ((accepted_at is null) = (accepted_by is null))
);
alter table public.organisation_employee_invites enable row level security;
-- Tokens and recipients are exposed only through the bounded admin listing RPC.
revoke all on public.organisation_employee_invites from public, anon, authenticated;
grant select, insert, update on public.organisation_employee_invites to service_role;

-- One source for list/count/selection eligibility. No direct client access.
create function public.workforce_invitation_rows(p_org uuid)
returns table (
  id uuid, name text, business_email text, structural_placement text,
  workforce_status text, root_status text, delivery_status text,
  eligible boolean, sent_at timestamptz, expires_at timestamptz, created_at timestamptz
)
language sql stable security definer set search_path = pg_catalog, public
as $$
  with recursive paths as (
    select u.id, u.name::text as path, array[u.id] as visited
    from public.organisation_units u
    where u.organisation_id = p_org and u.parent_unit_id is null
    union all
    select u.id, paths.path || ' / ' || u.name, paths.visited || u.id
    from public.organisation_units u join paths on paths.id = u.parent_unit_id
    where u.organisation_id = p_org and not u.id = any(paths.visited)
  )
  select p.id, p.name, p.business_email, coalesce(paths.path, 'Not placed in structure'),
    p.workforce_status,
    case when m.user_id is not null then 'joined'
         when i.sent_at is not null then 'sent' else 'not_invited' end,
    i.delivery_status,
    p.workforce_status = 'active' and p.organisation_member_id is null
      and p.business_email_normalized ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
      and (i.id is null or (i.delivery_status = 'failed' and i.accepted_at is null)),
    i.sent_at, i.expires_at, p.created_at
  from public.organisation_people p
  left join paths on paths.id = p.organisation_unit_id
  left join public.organisation_members m
    on m.id = p.organisation_member_id and m.organisation_id = p.organisation_id
  left join public.organisation_employee_invites i
    on i.person_id = p.id and i.organisation_id = p.organisation_id
  where p.organisation_id = p_org;
$$;
revoke all on function public.workforce_invitation_rows(uuid) from public, anon, authenticated;

create function public.list_workforce_invitations(
  p_org uuid, p_search text default '', p_status text default 'all',
  p_after uuid default null, p_limit integer default 50,
  p_cutoff timestamptz default now(), p_eligible_only boolean default false
)
returns jsonb language plpgsql stable security definer set search_path = pg_catalog, public
as $$
declare result jsonb;
begin
  if auth.uid() is null or not public.is_explicit_organisation_admin(p_org) then
    raise exception 'Organisation Administrator access is required' using errcode = '42501';
  end if;
  if p_status not in ('all', 'not_invited', 'sent', 'joined') or length(p_search) > 200
     or p_limit not between 1 and 100 or p_cutoff is null then
    raise exception 'Invalid workforce filter';
  end if;
  with filtered as materialized (
    select * from public.workforce_invitation_rows(p_org) r
    where r.created_at <= p_cutoff
      and (coalesce(p_search, '') = '' or strpos(lower(concat_ws(' ', r.name, r.business_email, r.structural_placement)), lower(p_search)) > 0)
  ), matching as (
    select * from filtered where (p_status = 'all' or root_status = p_status)
      and (not p_eligible_only or eligible)
  ), page as (
    select * from matching where p_after is null or id > p_after order by id limit p_limit
  )
  select jsonb_build_object(
    'rows', coalesce((select jsonb_agg(to_jsonb(page) order by id) from page), '[]'::jsonb),
    'total', (select count(*) from matching),
    'eligible_count', (select count(*) from matching where eligible),
    'counts', (select jsonb_build_object('not_invited', count(*) filter (where root_status = 'not_invited'),
      'sent', count(*) filter (where root_status = 'sent'), 'joined', count(*) filter (where root_status = 'joined')) from filtered),
    'next_cursor', case when (select count(*) from page) = p_limit then (select id::text from page order by id desc limit 1) else null end
  ) into result;
  return result;
end;
$$;
revoke all on function public.list_workforce_invitations(uuid,text,text,uuid,integer,timestamptz,boolean) from public, anon, authenticated;
grant execute on function public.list_workforce_invitations(uuid,text,text,uuid,integer,timestamptz,boolean) to authenticated;

-- Server only. Browser callers cannot claim sends or assert SMTP success.
create function public.claim_workforce_invitation(p_org uuid, p_person uuid, p_actor uuid, p_request uuid, p_hash text)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public
as $$
declare p public.organisation_people%rowtype; i public.organisation_employee_invites%rowtype;
  org public.organisations%rowtype;
begin
  if not exists (select 1 from public.organisation_members
    where organisation_id = p_org and user_id = p_actor and role = 'organisation_admin') then
    raise exception 'Organisation Administrator access is required' using errcode = '42501';
  end if;
  -- Same organisation lock as Phase 3A import: consistent lock ordering throughout.
  perform pg_advisory_xact_lock(hashtextextended(p_org::text, 0));
  select * into p from public.organisation_people where id = p_person and organisation_id = p_org for update;
  if not found then raise exception 'Workforce person is unavailable'; end if;
  if p.workforce_status <> 'active' or p.organisation_member_id is not null
     or p.business_email_normalized is null
     or p.business_email_normalized !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    return jsonb_build_object('skipped', true);
  end if;
  -- A membership created outside this flow is never treated as a fresh invite.
  if exists (select 1 from public.organisation_members m where m.organisation_id = p_org
    and lower(btrim(m.email)) = p.business_email_normalized) then
    return jsonb_build_object('skipped', true, 'reason', 'Existing membership needs linking');
  end if;
  select * into org from public.organisations where id = p_org;
  if nullif(btrim(org.organisation_code), '') is null then raise exception 'Organisation code is unavailable'; end if;
  select * into i from public.organisation_employee_invites where organisation_id = p_org and person_id = p_person for update;
  if found and (i.delivery_status <> 'failed' or i.accepted_at is not null or i.request_id = p_request) then
    return jsonb_build_object('skipped', true);
  end if;
  insert into public.organisation_employee_invites (
    organisation_id, person_id, recipient_email, token_hash, request_id, invited_by, delivery_status, expires_at
  ) values (p_org, p_person, p.business_email_normalized, p_hash, p_request, p_actor, 'sending', now() + interval '7 days')
  on conflict (organisation_id, person_id) do update set recipient_email = excluded.recipient_email,
    token_hash = excluded.token_hash, request_id = excluded.request_id, invited_by = excluded.invited_by,
    delivery_status = 'sending', expires_at = excluded.expires_at, created_at = now(), provider_message_id = null
  returning * into i;
  return jsonb_build_object('id', i.id, 'name', p.name, 'email', i.recipient_email,
    'organisation_name', org.name, 'organisation_code', org.organisation_code);
end;
$$;
revoke all on function public.claim_workforce_invitation(uuid,uuid,uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.claim_workforce_invitation(uuid,uuid,uuid,uuid,text) to service_role;

create function public.finish_workforce_invitation(p_id uuid, p_request uuid, p_hash text, p_outcome text, p_message text default null)
returns boolean language plpgsql security definer set search_path = pg_catalog, public
as $$
begin
  if p_outcome not in ('sent', 'failed', 'unknown') then raise exception 'Invalid delivery outcome'; end if;
  update public.organisation_employee_invites set delivery_status = p_outcome,
    sent_at = case when p_outcome = 'sent' then now() else null end,
    provider_message_id = left(p_message, 500)
  where id = p_id and request_id = p_request and token_hash = p_hash and delivery_status = 'sending';
  return found;
end;
$$;
revoke all on function public.finish_workforce_invitation(uuid,uuid,text,text,text) from public, anon, authenticated;
grant execute on function public.finish_workforce_invitation(uuid,uuid,text,text,text) to service_role;

-- Both employee routes use this transaction. No role, user ID, email or placement
-- is accepted from the client. Token hash is a bearer credential, never a role.
create function public.accept_workforce_invitation(p_code text, p_org uuid, p_token_hash text default null)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public
as $$
declare actor uuid := auth.uid(); verified_email text; org public.organisations%rowtype;
  p public.organisation_people%rowtype; i public.organisation_employee_invites%rowtype;
  m public.organisation_members%rowtype; person_id uuid;
begin
  select lower(btrim(email)) into verified_email from auth.users
    where id = actor and email_confirmed_at is not null;
  if actor is null or verified_email is null then
    raise exception 'A verified signed-in email is required' using errcode = '42501';
  end if;
  select * into org from public.organisations where id = p_org and organisation_code = upper(btrim(p_code));
  if not found then raise exception 'Organisation does not match'; end if;
  perform pg_advisory_xact_lock(hashtextextended(org.id::text, 0));
  if p_token_hash is not null then
    select * into i from public.organisation_employee_invites
      where token_hash = p_token_hash and organisation_id = org.id for update;
    if not found then raise exception 'Invitation is unavailable'; end if;
    if i.recipient_email <> verified_email then raise exception 'Invitation email does not match'; end if;
    if i.accepted_at is not null then raise exception 'Invitation has already been accepted'; end if;
    if i.expires_at <= now() then raise exception 'Invitation has expired'; end if;
    -- A send can be accepted by SMTP before the final DB write succeeds.
    if i.delivery_status = 'failed' then raise exception 'Invitation was not sent'; end if;
    person_id := i.person_id;
  else
    select id into person_id from public.organisation_people
      where organisation_id = org.id and business_email_normalized = verified_email;
  end if;
  if person_id is not null then
    select * into p from public.organisation_people where id = person_id and organisation_id = org.id for update;
    if not found or p.business_email_normalized is distinct from verified_email or p.workforce_status <> 'active' then
      raise exception 'Workforce email or eligibility changed';
    end if;
  end if;
  select * into m from public.organisation_members where organisation_id = org.id and user_id = actor for update;
  if not found then
    -- Do not take over an unclaimed or other-user membership by email.
    if exists (select 1 from public.organisation_members where organisation_id = org.id
      and lower(btrim(email)) = verified_email) then raise exception 'Existing membership requires review'; end if;
    insert into public.organisation_members (
      organisation_id, user_id, profile_key, email, name, department, role, organisation_unit_id,
      invited_at, activated_at, created_at
    ) values (org.id, actor, gen_random_uuid(), verified_email, p.name, null, 'employee', p.organisation_unit_id,
      coalesce(i.sent_at, now()), now(), now())
    on conflict (organisation_id, user_id) do nothing;
    select * into m from public.organisation_members where organisation_id = org.id and user_id = actor for update;
    if not found then raise exception 'Membership could not be established'; end if;
  end if;
  if person_id is not null then
    if p.organisation_member_id is not null and p.organisation_member_id <> m.id then
      raise exception 'Workforce person is linked to another membership';
    end if;
    if exists (select 1 from public.organisation_people where organisation_id = org.id
      and organisation_member_id = m.id and id <> p.id) then raise exception 'Membership is linked to another workforce person'; end if;
    update public.organisation_people set organisation_member_id = m.id
      where id = p.id and organisation_id = org.id;
  end if;
  if i.id is not null then
    update public.organisation_employee_invites set accepted_at = now(), accepted_by = actor where id = i.id;
  end if;
  return jsonb_build_object('membership', jsonb_build_object('id', m.id, 'organisation_id', m.organisation_id,
    'user_id', m.user_id, 'profile_key', m.profile_key, 'email', m.email, 'name', m.name,
    'department', m.department, 'role', m.role),
    'organisation', jsonb_build_object('id', org.id, 'name', org.name, 'organisation_code', org.organisation_code));
end;
$$;
revoke all on function public.accept_workforce_invitation(text,uuid,text) from public, anon, authenticated;
grant execute on function public.accept_workforce_invitation(text,uuid,text) to authenticated;

commit;
