-- Root Health customer public function definitions (catalog-derived, source read-only)
-- Source ref witkwlgldxjwwxmpcyva; 2026-11-18
-- REFERENCE ONLY. DO NOT EXECUTE. Verify dependency closure and SECURITY DEFINER search paths.
-- No customer rows or Auth users are included.

-- accept_introducer_agreement(p_token_hash text, p_evidence jsonb, p_review_hash text)
CREATE OR REPLACE FUNCTION public.accept_introducer_agreement(p_token_hash text, p_evidence jsonb, p_review_hash text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  a public.organisation_introducer_agreements;
  invitation public.introducer_agreement_invitations;
  review public.introducer_agreement_review_copies;
  acceptance public.introducer_agreement_acceptances;
begin
  select *
  into strict invitation
  from public.introducer_agreement_invitations
  where token_hash=p_token_hash
    and expires_at>now();

  select *
  into strict a
  from public.organisation_introducer_agreements
  where id=invitation.agreement_id;

  perform 1
  from public.organisation_introducers
  where id=a.introducer_id
  for update;

  select *
  into strict a
  from public.organisation_introducer_agreements
  where id=a.id;

  select *
  into acceptance
  from public.introducer_agreement_acceptances
  where agreement_id=a.id;

  if found then
    return to_jsonb(acceptance);
  end if;

  if a.status<>'sent'
    or exists(
      select 1
      from public.organisation_introducer_agreements
      where introducer_id=a.introducer_id
        and version>a.version
    )
    or exists(
      select 1
      from public.introducer_google_agreement_operations
      where introducer_id=a.introducer_id
        and state not in ('completed','cancelled')
        and (
          action<>'send'
          or not (progress ? 'smtp_started')
          or lease_until>now()
        )
    )
  then
    raise exception 'Agreement unavailable';
  end if;

  select *
  into strict review
  from public.introducer_agreement_review_copies
  where agreement_id=a.id;

  if p_review_hash is distinct from review.pdf_sha256
    or p_evidence->>'confirmed' is distinct from 'true'
    or nullif(trim(p_evidence->>'full_name'),'') is null
    or length(p_evidence->>'full_name')>200
    or nullif(trim(p_evidence->>'role'),'') is null
    or length(p_evidence->>'role')>200
    or length(coalesce(p_evidence->>'organisation',''))>300
    or lower(trim(p_evidence->>'email'))
      is distinct from lower(a.terms_snapshot->>'contact_email')
    or coalesce(p_evidence->>'date','') !~ '^\d{4}-\d{2}-\d{2}$'
    or (
      nullif(trim(p_evidence->>'organisation'),'') is not null
      and p_evidence->>'authority' is distinct from 'true'
    )
  then
    raise exception 'Acceptance confirmation required';
  end if;

  insert into public.introducer_agreement_acceptances(
    agreement_id,
    evidence,
    terms_snapshot,
    terms_hash,
    review_pdf_sha256
  )
  values(
    a.id,
    p_evidence,
    a.terms_snapshot,
    a.terms_hash,
    review.pdf_sha256
  )
  returning * into acceptance;

  return to_jsonb(acceptance);
end
$function$
;

-- accept_workforce_invitation(p_code text, p_org uuid, p_token_hash text)
CREATE OR REPLACE FUNCTION public.accept_workforce_invitation(p_code text, p_org uuid, p_token_hash text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
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
$function$
;

-- apply_confirmed_workforce_import(requested_organisation_id uuid, confirmed_units jsonb, confirmed_people jsonb)
CREATE OR REPLACE FUNCTION public.apply_confirmed_workforce_import(requested_organisation_id uuid, confirmed_units jsonb, confirmed_people jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
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

  if requested_organisation_id is null
     or not public.is_explicit_organisation_admin(requested_organisation_id) then
    raise exception 'Organisation Administrator access is required'
      using errcode = '42501';
  end if;

  if confirmed_units is null
     or confirmed_people is null
     or jsonb_typeof(confirmed_units) <> 'array'
     or jsonb_typeof(confirmed_people) <> 'array' then
    raise exception 'Confirmed workforce plan must contain arrays';
  end if;

  if jsonb_array_length(confirmed_units) > 2000
     or jsonb_array_length(confirmed_people) > 5000 then
    raise exception 'Confirmed workforce plan exceeds the safe import limit';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(requested_organisation_id::text, 0)
  );

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

  for unit_item in
    select value from jsonb_array_elements(confirmed_units)
  loop
    if jsonb_typeof(unit_item) <> 'object' then
      raise exception 'Invalid organisational unit plan item';
    end if;

    unit_key := nullif(btrim(unit_item->>'key'), '');
    parent_key := nullif(btrim(unit_item->>'parentKey'), '');
    clean_name := nullif(btrim(unit_item->>'name'), '');
    clean_type := nullif(btrim(unit_item->>'unitType'), '');
    expected_existing_id :=
      nullif(btrim(unit_item->>'expectedExistingId'), '')::uuid;

    if unit_key is null
       or clean_name is null
       or clean_type not in (
         'department',
         'region',
         'country',
         'division',
         'business_unit',
         'function',
         'site',
         'team',
         'other'
       ) then
      raise exception 'Invalid organisational unit definition';
    end if;

    if parent_key is not null then
      select mapped.unit_id
      into parent_id
      from pg_temp.root_import_units mapped
      where mapped.plan_key = parent_key;

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
      insert into public.organisation_units (
        organisation_id,
        name,
        unit_type,
        parent_unit_id,
        active,
        created_by
      )
      values (
        requested_organisation_id,
        clean_name,
        clean_type,
        parent_id,
        true,
        actor_id
      )
      returning id into unit_id;

      created_units := created_units + 1;
    end if;

    insert into pg_temp.root_import_units (plan_key, unit_id)
    values (unit_key, unit_id);
  end loop;

  for person_item in
    select value from jsonb_array_elements(confirmed_people)
  loop
    matched_person_id := null;
    reference_person_id := null;
    email_person_id := null;
    linked_member_id := null;
    existing_linked_member_id := null;
    expected_existing_id :=
      nullif(btrim(person_item->>'expectedExistingPersonId'), '')::uuid;
    expected_membership_id :=
      nullif(btrim(person_item->>'expectedMembershipId'), '')::uuid;

    if jsonb_typeof(person_item) <> 'object'
       or jsonb_typeof(person_item->'row') <> 'object' then
      raise exception 'Invalid workforce person plan item';
    end if;

    unit_key := nullif(btrim(person_item->>'leafUnitKey'), '');

    select mapped.unit_id
    into leaf_unit_id
    from pg_temp.root_import_units mapped
    where mapped.plan_key = unit_key;

    if leaf_unit_id is null then
      raise exception 'Workforce person has no confirmed leaf unit';
    end if;

    reference_value :=
      nullif(btrim(person_item->'row'->>'employee_id'), '');
    email_value :=
      nullif(lower(btrim(person_item->'row'->>'email')), '');
    clean_name :=
      coalesce(
        nullif(btrim(person_item->'row'->>'name'), ''),
        email_value
      );

    if clean_name is null
       or email_value is null
       or email_value !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
      raise exception 'Workforce person requires a valid name and email';
    end if;

    reference_person_id := null;
    email_person_id := null;

    if reference_value is not null then
      select count(*), (array_agg(existing.id))[1]
      into match_count, reference_person_id
      from public.organisation_people existing
      where existing.organisation_id = requested_organisation_id
        and existing.employee_reference_normalized = lower(reference_value);

      if match_count > 1 then
        raise exception 'Ambiguous employee reference match';
      end if;
    end if;

    select count(*), (array_agg(existing.id))[1]
    into match_count, email_person_id
    from public.organisation_people existing
    where existing.organisation_id = requested_organisation_id
      and existing.business_email_normalized = email_value;

    if match_count > 1 then
      raise exception 'Ambiguous business email match';
    end if;

    if reference_person_id is not null
       and email_person_id is not null
       and reference_person_id <> email_person_id then
      raise exception 'Employee reference and email identify different workforce people';
    end if;

    matched_person_id := coalesce(reference_person_id, email_person_id);

    if matched_person_id is distinct from expected_existing_id then
      raise exception 'Workforce person matching changed after review';
    end if;

    select count(*), (array_agg(membership.id))[1]
    into match_count, linked_member_id
    from public.organisation_members membership
    where membership.organisation_id = requested_organisation_id
      and lower(btrim(membership.email)) = email_value;

    if match_count > 1 then
      raise exception 'Ambiguous organisation membership match';
    end if;

    if linked_member_id is distinct from expected_membership_id then
      raise exception 'Organisation membership matching changed after review';
    end if;

    if matched_person_id is not null then
      select organisation_member_id
      into existing_linked_member_id
      from public.organisation_people
      where id = matched_person_id
        and organisation_id = requested_organisation_id
      for update;

      if existing_linked_member_id is not null
         and linked_member_id is not null
         and existing_linked_member_id <> linked_member_id then
        raise exception 'Workforce person is already linked to another membership';
      end if;

      update public.organisation_people
      set organisation_member_id =
            coalesce(linked_member_id, existing_linked_member_id),
          organisation_unit_id = leaf_unit_id,
          employee_reference_id = reference_value,
          name = clean_name,
          business_email = email_value,
          job_title =
            nullif(btrim(person_item->'row'->>'job_title'), ''),
          location =
            nullif(btrim(person_item->'row'->>'location'), ''),
          workforce_status = 'active',
          source = 'spreadsheet_import',
          last_confirmed_at = now(),
          updated_by = actor_id
      where id = matched_person_id
        and organisation_id = requested_organisation_id;

      updated_people := updated_people + 1;
    else
      insert into public.organisation_people (
        organisation_id,
        organisation_member_id,
        organisation_unit_id,
        employee_reference_id,
        name,
        business_email,
        job_title,
        location,
        workforce_status,
        source,
        last_confirmed_at,
        created_by,
        updated_by
      )
      values (
        requested_organisation_id,
        linked_member_id,
        leaf_unit_id,
        reference_value,
        clean_name,
        email_value,
        nullif(btrim(person_item->'row'->>'job_title'), ''),
        nullif(btrim(person_item->'row'->>'location'), ''),
        'active',
        'spreadsheet_import',
        now(),
        actor_id,
        actor_id
      )
      returning id into matched_person_id;

      created_people := created_people + 1;
    end if;

    insert into pg_temp.root_import_people (
      person_id,
      reference_normalized,
      email_normalized,
      name_normalized,
      manager_normalized
    )
    values (
      matched_person_id,
      lower(reference_value),
      email_value,
      lower(clean_name),
      nullif(lower(btrim(person_item->'row'->>'manager')), '')
    );

    linked_member_id :=
      coalesce(linked_member_id, existing_linked_member_id);

    if linked_member_id is not null then
      update public.organisation_members
      set organisation_unit_id = leaf_unit_id
      where id = linked_member_id
        and organisation_id = requested_organisation_id
        and organisation_unit_id is distinct from leaf_unit_id;

      if found then
        aligned_members := aligned_members + 1;
      end if;
    end if;
  end loop;

  for matched_person_id, manager_value in
    select imported.person_id, imported.manager_normalized
    from pg_temp.root_import_people imported
    where imported.manager_normalized is not null
  loop
    select
      count(distinct candidate.person_id),
      (array_agg(distinct candidate.person_id))[1]
    into match_count, manager_id
    from pg_temp.root_import_people candidate
    where candidate.reference_normalized = manager_value
       or candidate.email_normalized = manager_value
       or candidate.name_normalized = manager_value;

    if match_count <> 1 or manager_id = matched_person_id then
      raise exception 'Manager reference is ambiguous or invalid';
    end if;

    update public.organisation_people
    set manager_person_id = manager_id,
        updated_by = actor_id
    where id = matched_person_id
      and organisation_id = requested_organisation_id;

    if not found then
      raise exception 'Manager relationship crossed the organisation boundary';
    end if;
  end loop;

  return jsonb_build_object(
    'createdUnits', created_units,
    'createdPeople', created_people,
    'updatedPeople', updated_people,
    'alignedMembers', aligned_members,
    'excludedRows', 0
  );
end;
$function$
;

-- audit_organisation_people_write()
CREATE OR REPLACE FUNCTION public.audit_organisation_people_write()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
$function$
;

-- begin_introducer_google_operation(p_id uuid, p_introducer uuid, p_action text, p_actor uuid, p_lease uuid, p_payload jsonb)
CREATE OR REPLACE FUNCTION public.begin_introducer_google_operation(p_id uuid, p_introducer uuid, p_action text, p_actor uuid, p_lease uuid, p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  op public.introducer_google_agreement_operations;
  a public.organisation_introducer_agreements;
  latest uuid;
  next_version integer;
begin
  if p_actor is null or p_id is null or p_lease is null then
    raise exception 'Identity required';
  end if;

  perform 1
  from public.organisation_introducers
  where id=p_introducer
  for update;

  if not found then
    raise exception 'Introducer unavailable';
  end if;

  select *
  into op
  from public.introducer_google_agreement_operations
  where id=p_id
  for update;

  if found then
    if op.introducer_id<>p_introducer
      or op.actor_id<>p_actor
      or op.action<>p_action
    then
      raise exception 'Operation identity mismatch';
    end if;

    if op.state='completed' then
      return to_jsonb(op);
    end if;

    if op.state='cancelled' then
      raise exception 'Operation was cancelled';
    end if;

    if op.lease_until>now() then
      raise exception 'Operation is still running';
    end if;

    if op.action='send'
      and op.progress ? 'smtp_started'
      and not (op.progress ? 'smtp_receipt')
    then
      raise exception 'Email outcome uncertain; check sent mail before an explicit resend';
    end if;

    update public.introducer_google_agreement_operations
    set
      state='running',
      lease_id=p_lease,
      lease_until=now()+interval '3 minutes'
    where id=p_id
    returning * into op;

    return to_jsonb(op);
  end if;

  if exists(
    select 1
    from public.introducer_google_agreement_operations
    where introducer_id=p_introducer
      and state not in ('completed','cancelled')
      and (action<>'send' or not (progress ? 'smtp_started'))
  ) then
    raise exception 'Retry the existing unfinished operation first';
  end if;

  if exists(
    select 1
    from public.introducer_google_agreement_operations
    where introducer_id=p_introducer
      and lease_until>now()
  ) then
    raise exception 'Another operation is still running';
  end if;

  select id
  into latest
  from public.organisation_introducer_agreements
  where introducer_id=p_introducer
  order by version desc
  limit 1;

  if p_action='generate' then
    if (p_payload->>'previous_id')::uuid is distinct from latest then
      raise exception 'Agreement history changed; refresh first';
    end if;

    select coalesce(max(version),0)+1
    into next_version
    from public.organisation_introducer_agreements
    where introducer_id=p_introducer;

    p_payload=p_payload || jsonb_build_object('version',next_version);

  elsif p_action in ('send','accept') then
    select *
    into strict a
    from public.organisation_introducer_agreements
    where id=(p_payload->>'agreement_id')::uuid
      and introducer_id=p_introducer;

    if a.id is distinct from latest
      or a.status in ('accepted','superseded')
    then
      raise exception 'Only the current unaccepted agreement can be sent or accepted';
    end if;

    if p_action='send'
      and a.terms_hash<>p_payload->>'current_terms_hash'
    then
      raise exception 'Agreement needs updating';
    end if;

    if p_action='send'
      and (
        a.status='sent'
        or exists(
          select 1
          from public.introducer_google_agreement_operations
          where agreement_id=a.id
            and action='send'
        )
      )
      and p_payload->>'confirmed' is distinct from 'true'
    then
      raise exception 'Explicit resend confirmation required';
    end if;

    if p_action='accept'
      and (
        a.status<>'sent'
        or p_payload->>'confirmed' is distinct from 'true'
      )
    then
      raise exception 'Confirm the returned agreement before accepting';
    end if;

  else
    raise exception 'Unknown action';
  end if;

  insert into public.introducer_google_agreement_operations(
    id,
    introducer_id,
    agreement_id,
    action,
    actor_id,
    payload,
    lease_id,
    lease_until
  )
  values(
    p_id,
    p_introducer,
    case
      when p_action='generate' then gen_random_uuid()
      else a.id
    end,
    p_action,
    p_actor,
    p_payload,
    p_lease,
    now()+interval '3 minutes'
  )
  returning * into op;

  return to_jsonb(op);
end
$function$
;

-- cancel_introducer_google_operation(p_id uuid, p_actor uuid)
CREATE OR REPLACE FUNCTION public.cancel_introducer_google_operation(p_id uuid, p_actor uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  op public.introducer_google_agreement_operations;
begin
  select *
  into strict op
  from public.introducer_google_agreement_operations
  where id=p_id;

  perform 1
  from public.organisation_introducers
  where id=op.introducer_id
  for update;

  select *
  into strict op
  from public.introducer_google_agreement_operations
  where id=p_id
  for update;

  if op.actor_id<>p_actor
    or op.state in ('completed','cancelled')
    or op.lease_until>now()
    or op.progress ? 'smtp_started'
    or op.progress ? 'pdf_started'
  then
    raise exception 'Operation cannot safely be cancelled';
  end if;

  update public.introducer_google_agreement_operations
  set
    state='cancelled',
    lease_until=null
  where id=p_id;
end
$function$
;

-- change_introducer_commercial_terms(p_introducer_id uuid, p_commission_percent numeric, p_commission_structure text, p_effective_from timestamp with time zone, p_change_reason text, p_notes text)
CREATE OR REPLACE FUNCTION public.change_introducer_commercial_terms(p_introducer_id uuid, p_commission_percent numeric, p_commission_structure text, p_effective_from timestamp with time zone, p_change_reason text DEFAULT NULL::text, p_notes text DEFAULT NULL::text)
 RETURNS organisation_introducer_policies
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_introducer public.organisation_introducers%rowtype;

  v_policy_at_change public.organisation_introducer_policies%rowtype;

  v_new_policy public.organisation_introducer_policies%rowtype;

  v_current_policy public.organisation_introducer_policies%rowtype;

  v_effective_from timestamptz;

  v_structure text;

  v_previous_until timestamptz;
begin

  -- ----------------------------------------------------------
  -- NORMALISE + VALIDATE
  -- ----------------------------------------------------------

  v_effective_from :=
    coalesce(
      p_effective_from,
      now()
    );

  v_structure :=
    lower(
      trim(
        coalesce(
          p_commission_structure,
          ''
        )
      )
    );

  if
    p_commission_percent is null
    or p_commission_percent < 0
    or p_commission_percent > 100
  then
    raise exception
      'Commission percentage must be between 0 and 100.';
  end if;

  if
    v_structure not in (
      'one_off',
      'recurring'
    )
  then
    raise exception
      'Commission structure must be one_off or recurring.';
  end if;


  -- ----------------------------------------------------------
  -- LOCK INTRODUCER
  -- ----------------------------------------------------------

  select *
  into v_introducer
  from public.organisation_introducers
  where id = p_introducer_id
  for update;

  if not found then
    raise exception
      'Introducer not found.';
  end if;


  -- ----------------------------------------------------------
  -- DO NOT CREATE TWO POLICIES STARTING AT THE SAME INSTANT
  -- ----------------------------------------------------------

  if exists (
    select 1
    from public.organisation_introducer_policies
    where introducer_id = p_introducer_id
      and effective_from = v_effective_from
  ) then
    raise exception
      'Commercial terms already begin at this exact time.';
  end if;


  -- ----------------------------------------------------------
  -- FIND THE POLICY THAT APPLIES AT THE REQUESTED CHANGE TIME
  --
  -- This is the critical change from GREEN 2A.
  -- We no longer assume effective_until IS NULL means
  -- "current".
  -- ----------------------------------------------------------

  select *
  into v_policy_at_change
  from public.organisation_introducer_policies
  where introducer_id = p_introducer_id

    and effective_from <
      v_effective_from

    and (
      effective_until is null
      or effective_until >
        v_effective_from
    )

  order by effective_from desc
  limit 1
  for update;


  if v_policy_at_change.id is null then
    raise exception
      'No commercial policy covers the requested effective time.';
  end if;


  -- Remember when this policy originally ended.
  --
  -- If another scheduled policy already begins later,
  -- the new policy should finish at that same boundary.
  v_previous_until :=
    v_policy_at_change.effective_until;


  -- ----------------------------------------------------------
  -- CLOSE THE POLICY APPLYING AT THE CHANGE TIME
  -- ----------------------------------------------------------

  update public.organisation_introducer_policies

  set effective_until =
    v_effective_from

  where id =
    v_policy_at_change.id;


  -- ----------------------------------------------------------
  -- CREATE THE REPLACEMENT POLICY
  --
  -- If the policy we split already ended at a future scheduled
  -- change, preserve that future boundary.
  -- ----------------------------------------------------------

  insert into public.organisation_introducer_policies (
    introducer_id,
    commission_percent,
    commission_basis,
    commission_structure,
    effective_from,
    effective_until,
    change_reason,
    notes
  )
  values (
    p_introducer_id,

    p_commission_percent,

    'collected_subscription_revenue',

    v_structure,

    v_effective_from,

    v_previous_until,

    nullif(
      trim(
        coalesce(
          p_change_reason,
          ''
        )
      ),
      ''
    ),

    nullif(
      trim(
        coalesce(
          p_notes,
          ''
        )
      ),
      ''
    )
  )

  returning *
  into v_new_policy;


  -- ----------------------------------------------------------
  -- DETERMINE WHAT IS ACTUALLY EFFECTIVE RIGHT NOW
  --
  -- A future scheduled policy must NOT become the introducer's
  -- apparent current terms before its effective date.
  -- ----------------------------------------------------------

  select *
  into v_current_policy
  from public.organisation_introducer_policies

  where introducer_id =
    p_introducer_id

    and effective_from <=
      now()

    and (
      effective_until is null
      or effective_until >
        now()
    )

  order by effective_from desc
  limit 1;


  if v_current_policy.id is null then
    raise exception
      'Root could not determine the currently effective commercial policy.';
  end if;


  -- ----------------------------------------------------------
  -- REFRESH CURRENT CONVENIENCE FIELDS
  -- ----------------------------------------------------------

  update public.organisation_introducers

  set
    commission_percent =
      v_current_policy.commission_percent,

    commission_basis =
      v_current_policy.commission_basis,

    commission_structure =
      v_current_policy.commission_structure,

    updated_at =
      now()

  where id =
    p_introducer_id;


  return v_new_policy;

end;
$function$
;

-- checkpoint_introducer_google_operation(p_id uuid, p_lease uuid, p_progress jsonb, p_state text)
CREATE OR REPLACE FUNCTION public.checkpoint_introducer_google_operation(p_id uuid, p_lease uuid, p_progress jsonb, p_state text DEFAULT 'running'::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if p_state not in ('running','failed','uncertain') then
    raise exception 'Invalid operation state';
  end if;

  update public.introducer_google_agreement_operations
  set
    progress=progress||p_progress,
    state=p_state,
    lease_until=case
      when p_state='running' then now()+interval '3 minutes'
      else null
    end
  where id=p_id
    and lease_id=p_lease
    and state not in ('completed','cancelled');

  if not found then
    raise exception 'Operation lease lost';
  end if;
end
$function$
;

-- claim_workforce_invitation(p_org uuid, p_person uuid, p_actor uuid, p_request uuid, p_hash text)
CREATE OR REPLACE FUNCTION public.claim_workforce_invitation(p_org uuid, p_person uuid, p_actor uuid, p_request uuid, p_hash text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
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
$function$
;

-- finish_introducer_google_operation(p_id uuid, p_lease uuid, p_result jsonb)
CREATE OR REPLACE FUNCTION public.finish_introducer_google_operation(p_id uuid, p_lease uuid, p_result jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  op public.introducer_google_agreement_operations;
  a public.organisation_introducer_agreements;
begin
  select *
  into strict op
  from public.introducer_google_agreement_operations
  where id=p_id;

  perform 1
  from public.organisation_introducers
  where id=op.introducer_id
  for update;

  select *
  into strict op
  from public.introducer_google_agreement_operations
  where id=p_id
  for update;

  if op.state='completed' then
    return op.agreement_id;
  end if;

  if op.state='cancelled' then
    raise exception 'Operation was cancelled';
  end if;

  if op.lease_id is distinct from p_lease then
    raise exception 'Operation lease lost';
  end if;

  if op.action='generate' then
    if p_result->>'document_id' is null
      or (op.progress->>'merged')::boolean is distinct from true
    then
      raise exception 'Document not complete';
    end if;

    insert into public.organisation_introducer_agreements(
      id,
      introducer_id,
      previous_agreement_id,
      version,
      status,
      document_id,
      document_url,
      template_document_id,
      template_revision,
      terms_snapshot,
      terms_hash,
      created_by
    )
    values(
      op.agreement_id,
      op.introducer_id,
      (op.payload->>'previous_id')::uuid,
      (op.payload->>'version')::integer,
      'draft',
      p_result->>'document_id',
      p_result->>'document_url',
      op.payload->>'template_id',
      p_result->>'template_revision',
      op.payload->'terms',
      op.payload->>'terms_hash',
      op.actor_id
    );

    update public.organisation_introducer_agreements
    set
      status='superseded',
      superseded_at=now()
    where id=(op.payload->>'previous_id')::uuid
      and status in ('draft','sent');

  elsif op.action='send' then
    if p_result->>'message_id' is null then
      raise exception 'Delivery receipt required';
    end if;

    update public.organisation_introducer_agreements
    set
      status='sent',
      sent_at=coalesce(sent_at,now()),
      sent_to=coalesce(sent_to,p_result->>'recipient'),
      email_message_id=coalesce(email_message_id,p_result->>'message_id'),
      sent_terms_snapshot=coalesce(sent_terms_snapshot,terms_snapshot)
    where id=op.agreement_id
      and status in ('draft','sent');

    if not found then
      raise exception 'Agreement cannot be sent';
    end if;

  else
    update public.organisation_introducer_agreements
    set
      status='accepted',
      accepted_at=now(),
      accepted_by=op.actor_id,
      accepted_terms_snapshot=terms_snapshot,
      pdf_document_id=p_result->>'pdf_document_id',
      pdf_document_url=p_result->>'pdf_document_url',
      pdf_sha256=p_result->>'pdf_sha256',
      source_revision=p_result->>'source_revision'
    where id=op.agreement_id
      and status='sent';

    if not found then
      raise exception 'Agreement cannot be accepted';
    end if;
  end if;

  update public.introducer_google_agreement_operations
  set
    state='completed',
    result=p_result,
    completed_at=now(),
    lease_until=null
  where id=p_id;

  return op.agreement_id;
end
$function$
;

-- finish_workforce_invitation(p_id uuid, p_request uuid, p_hash text, p_outcome text, p_message text)
CREATE OR REPLACE FUNCTION public.finish_workforce_invitation(p_id uuid, p_request uuid, p_hash text, p_outcome text, p_message text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
begin
  if p_outcome not in ('sent', 'failed', 'unknown') then raise exception 'Invalid delivery outcome'; end if;
  update public.organisation_employee_invites set delivery_status = p_outcome,
    sent_at = case when p_outcome = 'sent' then now() else null end,
    provider_message_id = left(p_message, 500)
  where id = p_id and request_id = p_request and token_hash = p_hash and delivery_status = 'sending';
  return found;
end;
$function$
;

-- fulfil_introducer_acceptance(p_agreement uuid, p_lease uuid, p_action text, p_data jsonb)
CREATE OR REPLACE FUNCTION public.fulfil_introducer_acceptance(p_agreement uuid, p_lease uuid, p_action text, p_data jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  e public.introducer_agreement_acceptances;
  a public.organisation_introducer_agreements;
  channel text;
begin
  select *
  into strict a
  from public.organisation_introducer_agreements
  where id=p_agreement;

  perform 1
  from public.organisation_introducers
  where id=a.introducer_id
  for update;

  select *
  into strict e
  from public.introducer_agreement_acceptances
  where agreement_id=a.id
  for update;

  if p_action='claim' then
    if e.lease_until>now() then
      return null;
    end if;

    update public.introducer_agreement_acceptances
    set lease_id=p_lease,
        lease_until=now()+interval '3 minutes'
    where agreement_id=a.id
    returning * into e;

    return to_jsonb(e);
  end if;

  if e.lease_id is distinct from p_lease
    or e.lease_until<=now()
  then
    raise exception 'Fulfilment lease lost';
  end if;

  if p_action='checkpoint' then
    update public.introducer_agreement_acceptances
    set progress=progress||p_data,
        lease_until=now()+interval '3 minutes'
    where agreement_id=a.id
    returning * into e;

  elsif p_action='archive' then
    if e.archive_state='pending' then

      if p_data->>'pdf_sha256' is distinct from e.progress->>'pdf_hash'
        or p_data->>'pdf_document_id' is distinct from e.progress->>'pdf_id'
        or p_data->>'pdf_document_url' is null
      then
        raise exception 'Archive evidence mismatch';
      end if;

      update public.organisation_introducer_agreements
      set status='accepted',
          accepted_at=e.accepted_at,
          accepted_by=e.id,
          accepted_terms_snapshot=e.terms_snapshot,
          pdf_document_id=p_data->>'pdf_document_id',
          pdf_document_url=p_data->>'pdf_document_url',
          pdf_sha256=p_data->>'pdf_sha256',
          source_revision=p_data->>'source_revision'
      where id=a.id
        and status='sent';

      if not found then
        raise exception 'Agreement unavailable';
      end if;

      update public.introducer_agreement_acceptances
      set archive_state='archived'
      where agreement_id=a.id
      returning * into e;
    end if;

  elsif p_action='claim_email' then
    channel=p_data->>'channel';

    if channel not in ('customer','root')
      or e.archive_state<>'archived'
    then
      raise exception 'Archive required';
    end if;

    if e.deliveries ? channel then
      return null;
    end if;

    update public.introducer_agreement_acceptances
    set deliveries=
      deliveries ||
      jsonb_build_object(
        channel,
        jsonb_build_object('state','started')
      )
    where agreement_id=a.id
    returning * into e;

  elsif p_action='receipt' then
    channel=p_data->>'channel';

    if e.deliveries->channel->>'state' is distinct from 'started' then
      raise exception 'Delivery already recorded';
    end if;

    update public.introducer_agreement_acceptances
    set deliveries=
      jsonb_set(
        deliveries,
        array[channel],
        jsonb_build_object(
          'state',
          case
            when nullif(p_data->>'message_id','') is null
              then 'unconfirmed'
            else 'confirmed'
          end,
          'message_id',
          p_data->>'message_id'
        )
      )
    where agreement_id=a.id
    returning * into e;

  elsif p_action='release' then
    update public.introducer_agreement_acceptances
    set lease_until=null
    where agreement_id=a.id
    returning * into e;

  else
    raise exception 'Unknown fulfilment action';
  end if;

  return to_jsonb(e);
end
$function$
;

-- get_hr_invitation_preview(invite_token uuid)
CREATE OR REPLACE FUNCTION public.get_hr_invitation_preview(invite_token uuid)
 RETURNS TABLE(id uuid, organisation_id uuid, organisation_unit_id uuid, email text, role text, token uuid, status text, expires_at timestamp with time zone, organisation_name text, organisation_code text, organisation_unit_name text, organisation_unit_type text, parent_unit_id uuid)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    i.id,
    i.organisation_id,
    i.organisation_unit_id,
    i.email,
    i.role,
    i.token,
    i.status,
    i.expires_at,
    o.name as organisation_name,
    o.organisation_code,
    ou.name as organisation_unit_name,
    ou.unit_type as organisation_unit_type,
    ou.parent_unit_id
  from public.organisation_hr_invites i
  left join public.organisations o
    on o.id = i.organisation_id
  left join public.organisation_units ou
    on ou.id = i.organisation_unit_id
  where i.token = invite_token
  limit 1;
$function$
;

-- guard_direct_agreement_evidence()
CREATE OR REPLACE FUNCTION public.guard_direct_agreement_evidence()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if TG_OP='DELETE' then
    raise exception 'Agreement evidence cannot be deleted';
  end if;

  if TG_TABLE_NAME<>'introducer_agreement_acceptances'
    or (
      to_jsonb(new)-array['archive_state','progress','deliveries','lease_id','lease_until']
    ) is distinct from (
      to_jsonb(old)-array['archive_state','progress','deliveries','lease_id','lease_until']
    )
  then
    raise exception 'Agreement evidence is immutable';
  end if;

  if not (new.progress @> old.progress)
    or (old.archive_state='archived' and new.archive_state<>'archived')
  then
    raise exception 'Archive evidence is immutable';
  end if;

  return new;
end
$function$
;

-- guard_direct_agreement_operations()
CREATE OR REPLACE FUNCTION public.guard_direct_agreement_operations()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if new.action='accept'
    and new.state not in ('completed','cancelled')
  then
    raise exception 'Customer acceptance required';
  end if;

  if new.state='running'
    and exists(
      select 1
      from public.introducer_agreement_acceptances e
      join public.organisation_introducer_agreements a
        on a.id=e.agreement_id
      where a.introducer_id=new.introducer_id
        and (
          e.archive_state='pending'
          or (
            new.action='send'
            and a.id=new.agreement_id
          )
        )
    )
  then
    raise exception 'Acceptance already recorded; finish fulfilment first';
  end if;

  return new;
end
$function$
;

-- guard_introducer_agreement_return()
CREATE OR REPLACE FUNCTION public.guard_introducer_agreement_return()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if TG_OP='DELETE' then
    raise exception 'Returned evidence cannot be deleted';
  end if;

  if (new.agreement_id,new.returned_at)
       is distinct from
     (old.agreement_id,old.returned_at)
     or old.notification_state<>'started'
     or new.notification_state='started'
  then
    raise exception 'Returned evidence is immutable';
  end if;

  return new;
end
$function$
;

-- guard_introducer_google_history()
CREATE OR REPLACE FUNCTION public.guard_introducer_google_history()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if TG_OP='DELETE' then
    raise exception 'Agreement history cannot be deleted';
  end if;

  if old.status in ('accepted','superseded') or
    (to_jsonb(new)-array[
      'status','sent_at','sent_to','email_message_id','sent_terms_snapshot',
      'accepted_at','accepted_by','accepted_terms_snapshot','pdf_document_id',
      'pdf_document_url','pdf_sha256','source_revision','superseded_at'
    ]) is distinct from
    (to_jsonb(old)-array[
      'status','sent_at','sent_to','email_message_id','sent_terms_snapshot',
      'accepted_at','accepted_by','accepted_terms_snapshot','pdf_document_id',
      'pdf_document_url','pdf_sha256','source_revision','superseded_at'
    ])
  then
    raise exception 'Frozen agreement history cannot be changed';
  end if;

  if old.sent_at is not null and
    (new.sent_at,new.sent_to,new.email_message_id,new.sent_terms_snapshot)
    is distinct from
    (old.sent_at,old.sent_to,old.email_message_id,old.sent_terms_snapshot)
  then
    raise exception 'Sent evidence is immutable';
  end if;

  return new;
end
$function$
;

-- is_explicit_organisation_admin(requested_organisation_id uuid)
CREATE OR REPLACE FUNCTION public.is_explicit_organisation_admin(requested_organisation_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.organisation_members membership
    where membership.user_id = auth.uid()
      and membership.organisation_id = requested_organisation_id
      and membership.role = 'organisation_admin'
  );
$function$
;

-- list_workforce_invitations(p_org uuid, p_search text, p_status text, p_after uuid, p_limit integer, p_cutoff timestamp with time zone, p_eligible_only boolean)
CREATE OR REPLACE FUNCTION public.list_workforce_invitations(p_org uuid, p_search text DEFAULT ''::text, p_status text DEFAULT 'all'::text, p_after uuid DEFAULT NULL::uuid, p_limit integer DEFAULT 50, p_cutoff timestamp with time zone DEFAULT now(), p_eligible_only boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
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
$function$
;

-- merge_organisation_profile(p_organisation_id uuid, p_patch jsonb, p_user_id uuid)
CREATE OR REPLACE FUNCTION public.merge_organisation_profile(p_organisation_id uuid, p_patch jsonb, p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if not exists (
    select 1
    from public.organisation_members m
    where m.organisation_id = p_organisation_id
      and m.user_id = p_user_id
      and lower(m.role::text) in ('owner', 'admin', 'manager')
  ) then
    raise exception 'Insufficient organisation role'
      using errcode = '42501';
  end if;

  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then
    raise exception 'Invalid profile patch'
      using errcode = '22023';
  end if;

  insert into public.organisation_profiles (
    organisation_id,
    profile,
    updated_by
  )
  values (
    p_organisation_id,
    p_patch,
    p_user_id
  )
  on conflict (organisation_id) do update set
    profile = public.organisation_profiles.profile || excluded.profile,
    updated_at = clock_timestamp(),
    updated_by = excluded.updated_by;
end;
$function$
;

-- next_root_commercial_document_number(document_prefix text)
CREATE OR REPLACE FUNCTION public.next_root_commercial_document_number(document_prefix text DEFAULT 'REM'::text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  next_number bigint;
  safe_prefix text;
begin
  next_number :=
    nextval(
      'root_commercial_document_number_seq'
    );

  safe_prefix :=
    upper(
      regexp_replace(
        coalesce(
          document_prefix,
          'DOC'
        ),
        '[^A-Za-z0-9]',
        '',
        'g'
      )
    );

  if safe_prefix = '' then
    safe_prefix := 'DOC';
  end if;

  return
    'RH-' ||
    safe_prefix ||
    '-' ||
    lpad(
      next_number::text,
      6,
      '0'
    );
end;
$function$
;

-- organisation_workforce_context(p_organisation_id uuid)
CREATE OR REPLACE FUNCTION public.organisation_workforce_context(p_organisation_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare result jsonb;
begin
  if auth.uid() is null or not exists (
    select 1 from public.organisation_members
    where organisation_id = p_organisation_id and user_id = auth.uid()
      and role in ('organisation_admin', 'hr_admin')
  ) then
    raise exception 'Organisation access denied' using errcode = '42501';
  end if;
  with roster as (
    select p.organisation_unit_id, p.workforce_status,
      m.id is not null as linked, m.user_id is not null as joined,
      i.id is not null as invited, i.delivery_status
    from public.organisation_people p
    left join public.organisation_members m
      on m.id = p.organisation_member_id and m.organisation_id = p.organisation_id
    left join public.organisation_employee_invites i
      on i.person_id = p.id and i.organisation_id = p.organisation_id
    where p.organisation_id = p_organisation_id
  ), active_roster as (select * from roster where workforce_status = 'active'),
  unit_totals as (select organisation_unit_id, count(*) n from active_roster group by organisation_unit_id)
  select jsonb_build_object(
    'organisationId', p_organisation_id,
    'hasRecordedRoster', exists(select 1 from roster),
    'source', 'organisation_people',
    'completeness', 'not established',
    'activeWorkforceCount', (select count(*) from active_roster),
    'linkedMembershipCount', (select count(*) from active_roster where linked),
    'joinedCount', (select count(*) from active_roster where joined),
    'invitationSentCount', (select count(*) from active_roster where delivery_status = 'sent'),
    'awaitingJoinCount', (select count(*) from active_roster where delivery_status = 'sent' and not joined),
    'notInvitedCount', (select count(*) from active_roster where not invited and not joined),
    'deliveryCounts', (select coalesce(jsonb_object_agg(delivery_status, n), '{}'::jsonb)
      from (select delivery_status, count(*) n from active_roster
        where delivery_status is not null group by delivery_status) d),
    'rootMembershipCount', (select count(*) from public.organisation_members where organisation_id = p_organisation_id),
    'authenticatedMembershipCount', (select count(*) from public.organisation_members where organisation_id = p_organisation_id and user_id is not null),
    'unitCount', (select count(*) from public.organisation_units where organisation_id = p_organisation_id and active),
    'unplacedCount', (select count(*) from active_roster where organisation_unit_id is null),
    'units', (select coalesce(jsonb_agg(jsonb_build_object('unitId', u.id,
      'activeWorkforceCount', coalesce(t.n, 0))), '[]'::jsonb)
      from public.organisation_units u left join unit_totals t on t.organisation_unit_id = u.id
      where u.organisation_id = p_organisation_id and u.active)
  ) into result;
  return result;
end;
$function$
;

-- personal_acquisition_campaign_counts(p_campaign_ids text[])
CREATE OR REPLACE FUNCTION public.personal_acquisition_campaign_counts(p_campaign_ids text[])
 RETURNS TABLE(campaign_id text, capacity_check_viewed bigint, capacity_check_started bigint, capacity_check_completed bigint, signup_started bigint, signup_completed bigint, subscription_started bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select wanted.id,
    count(*) filter (where e.event_name='capacity_check_viewed'),
    count(*) filter (where e.event_name='capacity_check_started'),
    count(*) filter (where e.event_name='capacity_check_completed'),
    count(*) filter (where e.event_name='signup_started'),
    count(distinct e.user_id) filter (where e.event_name='signup_completed'),
    count(distinct e.user_id) filter (where e.event_name='subscription_started')
  from (select distinct unnest(p_campaign_ids) as id where cardinality(p_campaign_ids) between 1 and 25) wanted
  left join public.personal_acquisition_events e on e.campaign_id=wanted.id
  group by wanted.id;
$function$
;

-- personal_acquisition_counts(p_acquisition_ids uuid[])
CREATE OR REPLACE FUNCTION public.personal_acquisition_counts(p_acquisition_ids uuid[])
 RETURNS TABLE(acquisition_id uuid, capacity_check_viewed bigint, capacity_check_started bigint, capacity_check_completed bigint, signup_started bigint, signup_completed bigint, subscription_started bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select wanted.id,
    count(*) filter (where e.event_name='capacity_check_viewed'),
    count(*) filter (where e.event_name='capacity_check_started'),
    count(*) filter (where e.event_name='capacity_check_completed'),
    count(*) filter (where e.event_name='signup_started'),
    count(distinct e.user_id) filter (where e.event_name='signup_completed'),
    count(distinct e.user_id) filter (where e.event_name='subscription_started')
  from (select distinct unnest(p_acquisition_ids) as id where cardinality(p_acquisition_ids) between 1 and 25) wanted
  left join public.personal_acquisition_events e on e.acquisition_id=wanted.id
  group by wanted.id;
$function$
;

-- prepare_introducer_acceptance(p_agreement uuid, p_token_hash text, p_pdf jsonb)
CREATE OR REPLACE FUNCTION public.prepare_introducer_acceptance(p_agreement uuid, p_token_hash text, p_pdf jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  a public.organisation_introducer_agreements;
begin
  select *
  into strict a
  from public.organisation_introducer_agreements
  where id=p_agreement;

  perform 1
  from public.organisation_introducers
  where id=a.introducer_id
  for update;

  select *
  into strict a
  from public.organisation_introducer_agreements
  where id=p_agreement;

  if a.status not in ('draft','sent')
    or exists(
      select 1
      from public.introducer_agreement_acceptances
      where agreement_id=a.id
    )
    or exists(
      select 1
      from public.organisation_introducer_agreements
      where introducer_id=a.introducer_id
        and version>a.version
    )
  then
    raise exception 'Agreement unavailable';
  end if;

  insert into public.introducer_agreement_review_copies(
    agreement_id,
    pdf_base64,
    pdf_sha256,
    source_revision
  )
  values(
    a.id,
    p_pdf->>'pdf_base64',
    p_pdf->>'pdf_sha256',
    p_pdf->>'source_revision'
  )
  on conflict do nothing;

  insert into public.introducer_agreement_invitations(
    token_hash,
    agreement_id
  )
  values(
    p_token_hash,
    a.id
  );
end
$function$
;

-- prepare_personal_referral(p_user_id uuid, p_code text)
CREATE OR REPLACE FUNCTION public.prepare_personal_referral(p_user_id uuid, p_code text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  i public.organisation_introducers%rowtype;
  p public.organisation_introducer_policies%rowtype;
  existing_id uuid;
begin
  if p_user_id is null then raise exception 'Missing user'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));
  select id into existing_id from public.personal_referral_attributions where user_id=p_user_id;
  if found then return existing_id; end if;
  if nullif(trim(p_code), '') is null then return null; end if;
  select * into i from public.organisation_introducers
    where lower(referral_code)=lower(trim(p_code)) for share;
  if not found or i.status <> 'active' or i.introducer_market not in ('personal','both')
    or i.agreement_start_date > (now() at time zone 'UTC')::date
    or i.agreement_end_date < (now() at time zone 'UTC')::date then
    return null;
  end if;
  select * into p from public.organisation_introducer_policies
    where introducer_id=i.id and effective_from<=now()
      and (effective_until is null or effective_until>now())
    order by effective_from desc limit 1;
  if not found then raise exception 'No effective introducer policy'; end if;
  insert into public.personal_referral_attributions(
    user_id,introducer_id,policy_id,referral_code,commission_percent,commission_basis,
    commission_structure,vat_registered,vat_number,vat_rate
  ) values (p_user_id,i.id,p.id,i.referral_code,p.commission_percent,p.commission_basis,
    p.commission_structure,i.vat_registered,case when i.vat_registered then i.vat_number end,
    case when i.vat_registered then 20 else 0 end)
  returning id into existing_id;
  return existing_id;
end $function$
;

-- prevent_introducer_campaign_identity_change()
CREATE OR REPLACE FUNCTION public.prevent_introducer_campaign_identity_change()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin

  if new.introducer_id is distinct from old.introducer_id then
    raise exception
      'A campaign cannot be transferred to another introducer.';
  end if;

  if new.campaign_code is distinct from old.campaign_code then
    raise exception
      'Campaign codes are permanent and cannot be changed.';
  end if;

  return new;

end;
$function$
;

-- prevent_introducer_referral_identity_change()
CREATE OR REPLACE FUNCTION public.prevent_introducer_referral_identity_change()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin

  if new.referral_code is distinct from old.referral_code then
    raise exception
      'Introducer referral codes are permanent and cannot be changed.';
  end if;

  return new;

end;
$function$
;

-- record_personal_referral_payment(p_attribution_id uuid, p_user_id uuid, p_invoice_id text, p_subscription_id text, p_customer_id text, p_amount_minor bigint, p_currency text, p_paid_at timestamp with time zone)
CREATE OR REPLACE FUNCTION public.record_personal_referral_payment(p_attribution_id uuid, p_user_id uuid, p_invoice_id text, p_subscription_id text, p_customer_id text, p_amount_minor bigint, p_currency text, p_paid_at timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  a public.personal_referral_attributions%rowtype;
  i public.organisation_introducers%rowtype;
  p public.organisation_introducer_policies%rowtype;
  r public.organisation_revenue_events%rowtype;
  amount numeric;
  commission numeric;
  vat numeric;
  initial boolean;
begin
  if p_amount_minor is null or p_amount_minor<=0 or p_currency is distinct from 'gbp'
    or nullif(p_invoice_id,'') is null or nullif(p_subscription_id,'') is null
    or nullif(p_customer_id,'') is null or p_paid_at is null then
    raise exception 'Invalid verified payment';
  end if;
  select * into a from public.personal_referral_attributions where id=p_attribution_id for update;
  if not found or a.user_id is distinct from p_user_id then raise exception 'Attribution identity mismatch'; end if;
  select * into r from public.organisation_revenue_events where stripe_invoice_id=p_invoice_id;
  if found then
    if r.personal_attribution_id is distinct from a.id
      or r.stripe_subscription_id is distinct from p_subscription_id then
      raise exception 'Invoice identity mismatch';
    end if;
    return r.id;
  end if;
  amount := p_amount_minor::numeric/100;
  initial := a.first_paid_at is null;
  if initial then
    select * into i from public.organisation_introducers where id=a.introducer_id for share;
    if i.status <> 'active' or i.introducer_market not in ('personal','both')
      or i.agreement_start_date > (p_paid_at at time zone 'UTC')::date
      or i.agreement_end_date < (p_paid_at at time zone 'UTC')::date then
      return null;
    end if;
    if p_paid_at < date_trunc('second',a.created_at) then
      raise exception 'Payment predates referral';
    end if;
    select * into p from public.organisation_introducer_policies
      where introducer_id=i.id and effective_from<=p_paid_at
        and (effective_until is null or effective_until>p_paid_at)
      order by effective_from desc limit 1;
    if not found then raise exception 'No policy covers conversion'; end if;
    update public.personal_referral_attributions set
      policy_id=p.id,commission_percent=p.commission_percent,commission_basis=p.commission_basis,
      commission_structure=p.commission_structure,vat_registered=i.vat_registered,
      vat_number=case when i.vat_registered then i.vat_number end,
      vat_rate=case when i.vat_registered then 20 else 0 end
      where id=a.id returning * into a;
  end if;
  insert into public.organisation_revenue_events(
    personal_attribution_id,event_type,payment_source,currency,gross_amount,
    refunded_amount,net_collected_amount,received_at,stripe_customer_id,
    stripe_subscription_id,stripe_invoice_id,verified_at,notes
  ) values(a.id,'payment_received','stripe_invoice',p_currency,amount,0,amount,p_paid_at,
    p_customer_id,p_subscription_id,p_invoice_id,p_paid_at,
    'Stripe-confirmed Personal subscription payment; refund reconciliation is separate.')
  returning * into r;
  if initial or a.commission_structure='recurring' then
    commission := round(amount*a.commission_percent/100,2);
    vat := round(commission*a.vat_rate/100,2);
    insert into public.organisation_commissions(
      revenue_event_id,personal_attribution_id,introducer_id,organisation_name,
      referral_code,commission_percent,commission_basis,commission_structure,
      commission_event,currency,collected_amount,qualifying_amount,commission_amount,
      vat_registered,vat_rate,vat_amount,total_payable,personal_vat_number_at_conversion,
      status,earned_at,clearance_until,payable_at
    ) values(r.id,a.id,a.introducer_id,'Root Personal subscriber',a.referral_code,
      a.commission_percent,a.commission_basis,a.commission_structure,
      case when initial then 'initial_payment' else 'recurring_payment' end,
      p_currency,amount,amount,commission,a.vat_registered,a.vat_rate,vat,commission+vat,a.vat_number,
      'clearance',p_paid_at,p_paid_at+interval '14 days',p_paid_at+interval '14 days');
  end if;
  if initial then update public.personal_referral_attributions set first_paid_at=p_paid_at where id=a.id; end if;
  return r.id;
end $function$
;

-- redeem_organisation_setup_invite(p_token_hash text, p_admin_name text, p_sickness_days numeric, p_turnover numeric, p_agency_spend numeric, p_overtime_hours numeric, p_vacancies numeric, p_business_events text[], p_business_event_notes text, p_initiatives text[], p_initiative_notes text, p_watch_items text[], p_root_reflection text, p_confidence_label text)
CREATE OR REPLACE FUNCTION public.redeem_organisation_setup_invite(p_token_hash text, p_admin_name text, p_sickness_days numeric, p_turnover numeric, p_agency_spend numeric, p_overtime_hours numeric, p_vacancies numeric, p_business_events text[], p_business_event_notes text, p_initiatives text[], p_initiative_notes text, p_watch_items text[], p_root_reflection text, p_confidence_label text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid;
  v_user_email text;

  v_invite public.organisation_setup_invites%rowtype;
  v_application public.organisation_applications%rowtype;

  v_profile_key uuid;
  v_organisation_id uuid;
  v_membership_id uuid;
  v_review_id uuid;

  v_organisation_code text;
  v_workforce_size integer;

  v_access_path text;

  v_today date := current_date;
  v_trial_end date := current_date + 60;
begin

  /*
   * ==========================================================
   * 1. AUTHENTICATED HUMAN
   * ==========================================================
   */

  v_user_id := auth.uid();

  v_user_email :=
    lower(
      coalesce(
        auth.jwt() ->> 'email',
        ''
      )
    );

  if v_user_id is null then
    raise exception
      'Root authentication is required before this Workplace invitation can be redeemed.';
  end if;


  /*
   * ==========================================================
   * 2. LOCK THE EXACT INVITATION
   * ==========================================================
   */

  select *
  into v_invite
  from public.organisation_setup_invites
  where token_hash = p_token_hash
  for update;

  if not found then
    raise exception
      'Root could not verify this Workplace setup invitation.';
  end if;


  /*
   * ==========================================================
   * 3. INVITATION STATE
   * ==========================================================
   */

  if v_invite.status = 'redeemed' then
    raise exception
      'This Workplace setup invitation has already been used.';
  end if;

  if v_invite.status = 'revoked' then
    raise exception
      'This Workplace setup invitation has been withdrawn.';
  end if;

  if v_invite.status <> 'pending' then
    raise exception
      'This Workplace setup invitation is no longer active.';
  end if;

  if v_invite.expires_at <= now() then
    raise exception
      'This Workplace setup invitation has expired.';
  end if;


  /*
   * ==========================================================
   * 4. VERIFY THE AUTHENTICATED ACCOUNT
   * ==========================================================
   */

  if
    v_user_email = ''
    or
    v_user_email <>
      lower(
        trim(
          v_invite.intended_email
        )
      )
  then
    raise exception
      'The signed-in Root account does not match this Workplace invitation.';
  end if;


  /*
   * ==========================================================
   * 5. LOAD THE APPROVED APPLICATION
   * ==========================================================
   */

  select *
  into v_application
  from public.organisation_applications
  where id = v_invite.application_id;

  if not found then
    raise exception
      'Root could not find the approved Workplace application.';
  end if;

  if v_application.status <> 'approved' then
    raise exception
      'This Workplace application has not been approved for setup.';
  end if;

  v_access_path :=
    lower(
      trim(
        coalesce(
          v_application.access_path,
          'trial'
        )
      )
    );


  /*
   * ==========================================================
   * 6. DIRECT-PAID COMMERCIAL AUTHORITY
   *
   * A paid application must have confirmed payment before
   * organisation access can ever be created.
   * ==========================================================
   */

  if v_access_path = 'paid' then

    if
      coalesce(
        v_application.payment_status,
        ''
      ) <> 'paid'
    then
      raise exception
        'Root Workplace payment has not been confirmed for this membership.';
    end if;

    if v_application.paid_at is null then
      raise exception
        'Root Workplace payment confirmation is incomplete.';
    end if;

  end if;


  /*
   * ==========================================================
   * 7. DEFEND AGAINST DUPLICATE ORGANISATION CREATION
   * ==========================================================
   */

  if v_invite.created_organisation_id is not null then
    raise exception
      'This Workplace invitation has already created an organisation.';
  end if;


  /*
   * ==========================================================
   * 8. PERSONAL ROOT PROFILE
   * ==========================================================
   */

  select profile_key
  into v_profile_key
  from public.profiles
  where user_id = v_user_id
  limit 1;

  if v_profile_key is null then

    v_profile_key :=
      gen_random_uuid();

    insert into public.profiles (
      user_id,
      profile_key,
      name,
      email,
      subscription_status,
      orientation_completed
    )
    values (
      v_user_id,
      v_profile_key,
      trim(
        coalesce(
          p_admin_name,
          ''
        )
      ),
      v_user_email,
      'organisation',
      false
    );

  end if;


  /*
   * ==========================================================
   * 9. ORGANISATION CODE
   * ==========================================================
   */

  v_organisation_code :=
    left(
      upper(
        regexp_replace(
          coalesce(
            v_application.organisation_name,
            'ROOT'
          ),
          '[^A-Za-z0-9]+',
          '-',
          'g'
        )
      ),
      12
    )
    ||
    '-'
    ||
    upper(
      left(
        replace(
          gen_random_uuid()::text,
          '-',
          ''
        ),
        5
      )
    );


  /*
   * ==========================================================
   * 10. WORKFORCE SIZE
   * ==========================================================
   */

  v_workforce_size :=
    case
      when v_application.employee_count = '1-50'
        then 50

      when v_application.employee_count = '51-150'
        then 150

      when v_application.employee_count = '151-500'
        then 500

      when v_application.employee_count = '501-1000'
        then 1000

      when v_application.employee_count = '1000+'
        then 1001

      else null
    end;


  /*
   * ==========================================================
   * 11. CREATE ORGANISATION
   *
   * TRIAL:
   * - 60-day dates
   * - trial status
   *
   * PAID:
   * - no trial dates
   * - active subscription from day one
   * - Stripe identity copied from the paid application
   * ==========================================================
   */

  insert into public.organisations (
    name,
    contact_name,
    contact_email,
    employee_count,
    workforce_size,
    industry,
    organisation_code,

    trial_start,
    trial_end,

    status,
    subscription_status,
    subscription_plan,
    subscription_active,

    stripe_customer_id,
    stripe_subscription_id,
    subscription_activated_at
  )
  values (
    v_application.organisation_name,

    trim(
      coalesce(
        p_admin_name,
        v_application.contact_name
      )
    ),

    v_user_email,

    v_application.employee_count,

    v_workforce_size,

    v_application.industry,

    v_organisation_code,

    case
      when v_access_path = 'paid'
        then null
      else v_today
    end,

    case
      when v_access_path = 'paid'
        then null
      else v_trial_end
    end,

    case
      when v_access_path = 'paid'
        then 'active'
      else 'trial'
    end,

    case
      when v_access_path = 'paid'
        then 'active'
      else 'trial'
    end,

    case
      when v_access_path = 'paid'
        then 'workplace'
      else 'trial'
    end,

    true,

    case
      when v_access_path = 'paid'
        then v_application.stripe_customer_id
      else null
    end,

    case
      when v_access_path = 'paid'
        then v_application.stripe_subscription_id
      else null
    end,

    case
      when v_access_path = 'paid'
        then coalesce(
          v_application.paid_at,
          now()
        )
      else null
    end
  )
  returning id
  into v_organisation_id;


  /*
   * ==========================================================
   * 12. CREATE EXPLICIT ORGANISATION PERMISSION
   * ==========================================================
   */

  insert into public.organisation_members (
    organisation_id,
    user_id,
    profile_key,
    email,
    name,
    department,
    role,
    invited_at,
    activated_at,
    created_at
  )
  values (
    v_organisation_id,

    v_user_id,

    v_profile_key,

    v_user_email,

    trim(
      coalesce(
        p_admin_name,
        ''
      )
    ),

    'People / HR',

    v_invite.intended_role,

    now(),

    now(),

    now()
  )
  returning id
  into v_membership_id;


  /*
   * ==========================================================
   * 13. FIRST ORGANISATION LEARNING REVIEW
   * ==========================================================
   */

  insert into public.organisation_learning_reviews (
    organisation_id,
    created_by,
    review_date,

    sickness_days,
    turnover,
    agency_spend,
    overtime_hours,
    vacancies,

    business_events,
    business_event_notes,

    initiatives,
    initiative_notes,

    watch_items,
    root_reflection,
    confidence_label
  )
  values (
    v_organisation_id,
    v_user_id,
    v_today,

    p_sickness_days,
    p_turnover,
    p_agency_spend,
    p_overtime_hours,
    p_vacancies,

    coalesce(
      p_business_events,
      array[]::text[]
    ),

    nullif(
      trim(
        coalesce(
          p_business_event_notes,
          ''
        )
      ),
      ''
    ),

    coalesce(
      p_initiatives,
      array[]::text[]
    ),

    nullif(
      trim(
        coalesce(
          p_initiative_notes,
          ''
        )
      ),
      ''
    ),

    coalesce(
      p_watch_items,
      array[]::text[]
    ),

    p_root_reflection,

    coalesce(
      p_confidence_label,
      'Emerging'
    )
  )
  returning id
  into v_review_id;


  /*
   * ==========================================================
   * 14. REDEEM THE INVITATION
   * ==========================================================
   */

  update public.organisation_setup_invites
  set
    status =
      'redeemed',

    redeemed_at =
      now(),

    redeemed_by_user_id =
      v_user_id,

    created_organisation_id =
      v_organisation_id

  where id =
    v_invite.id;


  /*
   * ==========================================================
   * 15. ATTACH APPLICATION TO VERIFIED HUMAN
   * ==========================================================
   */

  update public.organisation_applications
  set
    user_id =
      v_user_id

  where id =
    v_application.id;


  /*
   * ==========================================================
   * 16. RESULT
   * ==========================================================
   */

  return jsonb_build_object(
    'success', true,

    'organisation_id',
      v_organisation_id,

    'membership_id',
      v_membership_id,

    'profile_key',
      v_profile_key,

    'review_id',
      v_review_id,

    'role',
      v_invite.intended_role,

    'access_path',
      v_access_path
  );

end;
$function$
;

-- require_direct_agreement_evidence()
CREATE OR REPLACE FUNCTION public.require_direct_agreement_evidence()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if new.status='accepted'
    and old.status<>'accepted'
    and not exists(
      select 1
      from public.introducer_agreement_acceptances
      where agreement_id=new.id
        and id=new.accepted_by
        and accepted_at=new.accepted_at
        and terms_snapshot=new.accepted_terms_snapshot
    )
  then
    raise exception 'Customer acceptance evidence required';
  end if;

  return new;
end
$function$
;

-- set_root_intervention_updated_at()
CREATE OR REPLACE FUNCTION public.set_root_intervention_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$
;

-- transfer_organisation_admin(target_membership_id uuid)
CREATE OR REPLACE FUNCTION public.transfer_organisation_admin(target_membership_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  current_user_id uuid;
  current_membership public.organisation_members%rowtype;
  target_membership public.organisation_members%rowtype;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'You must be signed in.';
  end if;

  select *
  into current_membership
  from public.organisation_members
  where user_id = current_user_id
    and role = 'organisation_admin'
  limit 1;

  if current_membership.id is null then
    raise exception 'Only the current Organisation Admin can transfer this permission.';
  end if;

  select *
  into target_membership
  from public.organisation_members
  where id = target_membership_id
    and organisation_id = current_membership.organisation_id
  limit 1;

  if target_membership.id is null then
    raise exception 'The selected HR colleague could not be found in this organisation.';
  end if;

  if target_membership.user_id is null then
    raise exception 'The selected HR colleague has not activated their Root account.';
  end if;

  if target_membership.role <> 'hr_admin' then
    raise exception 'Organisation Admin permission can only be transferred to an existing HR Admin.';
  end if;

  update public.organisation_members
  set role = 'hr_admin'
  where id = current_membership.id;

  update public.organisation_members
  set role = 'organisation_admin'
  where id = target_membership.id;

  return jsonb_build_object(
    'success', true,
    'organisation_id', current_membership.organisation_id,
    'previous_admin_membership_id', current_membership.id,
    'new_admin_membership_id', target_membership.id
  );
end;
$function$
;

-- workforce_invitation_rows(p_org uuid)
CREATE OR REPLACE FUNCTION public.workforce_invitation_rows(p_org uuid)
 RETURNS TABLE(id uuid, name text, business_email text, structural_placement text, workforce_status text, root_status text, delivery_status text, eligible boolean, sent_at timestamp with time zone, expires_at timestamp with time zone, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
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
$function$
;
