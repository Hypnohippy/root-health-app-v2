begin;

-- Root customer/commercial database only. This is additive and must be
-- applied only after a separately reviewed production migration approval.
do $$
begin
  if to_regclass('public.organisation_introducers') is null
     or to_regclass('public.organisation_introducer_agreements') is null
     or to_regclass('public.introducer_agreement_acceptances') is null
     or to_regclass('auth.users') is null then
    raise exception 'Root commercial introducer and accepted-agreement schema is required';
  end if;
  if to_regclass('public.organisation_introducer_policies') is null
     or to_regclass('public.organisation_applications') is null
     or to_regclass('public.organisation_commissions') is null
     or to_regclass('public.organisation_commercial_documents') is null
     or to_regclass('public.personal_referral_attributions') is null
     or to_regclass('public.organisation_introducer_campaigns') is null
     or to_regclass('public.introducer_google_agreement_operations') is null then
    raise exception 'Root introducer dependency tables required for safe test-record removal are missing';
  end if;
  -- The completion function runs as service_role (SECURITY INVOKER). It locks
  -- the introducer row to serialize with the existing Google-agreement and
  -- acceptance workflows, then reads their immutable evidence without row
  -- locks because those source tables intentionally grant service_role SELECT
  -- only. Fail before creating anything if the lock's real privileges are absent.
  if not has_table_privilege('service_role','public.organisation_introducers','SELECT')
     or not has_table_privilege('service_role','public.organisation_introducers','UPDATE')
     or not has_table_privilege('service_role','public.organisation_introducer_agreements','SELECT')
     or not has_table_privilege('service_role','public.introducer_agreement_acceptances','SELECT') then
    raise exception 'Root service_role privileges do not satisfy onboarding function dependencies';
  end if;
  if not exists (select 1 from pg_class where oid='public.organisation_introducer_agreements'::regclass and relrowsecurity)
     or not exists (select 1 from pg_class where oid='public.introducer_agreement_acceptances'::regclass and relrowsecurity)
     or has_table_privilege('anon','public.organisation_introducer_agreements','SELECT')
     or has_table_privilege('authenticated','public.organisation_introducer_agreements','SELECT')
     or has_table_privilege('anon','public.introducer_agreement_acceptances','SELECT')
     or has_table_privilege('authenticated','public.introducer_agreement_acceptances','SELECT') then
    raise exception 'Root agreement evidence must remain RLS-protected and unavailable to client roles';
  end if;
  if to_regclass('public.organisation_introducer_onboarding') is not null
     or to_regclass('public.organisation_introducer_onboarding_events') is not null
     or to_regclass('public.organisation_introducer_onboarding_receipts') is not null
     or to_regclass('public.organisation_introducer_lifecycle_events') is not null
     or to_regprocedure('public.complete_professional_introducer_onboarding(uuid,uuid,uuid,uuid,text,uuid,integer,uuid,timestamptz,text,text,uuid,uuid,timestamptz,text)') is not null then
    raise exception 'Introducer onboarding objects already exist; inspect before applying this migration';
  end if;
  if to_regprocedure('public.remove_test_organisation_introducer(uuid,uuid)') is not null then
    raise exception 'Test-record removal function already exists; inspect before applying this migration';
  end if;
  if exists (select 1 from pg_attribute where attrelid='public.organisation_introducers'::regclass
      and attname in ('archive_requested_at','archived_at','archived_by','archive_previous_status') and not attisdropped) then
    raise exception 'Introducer archive fields already exist; inspect the live lifecycle state before applying this migration';
  end if;
end $$;

alter table public.organisation_introducers
  add column archive_requested_at timestamptz,
  add column archived_at timestamptz,
  add column archived_by uuid references auth.users(id) on delete set null,
  add column archive_previous_status text,
  add constraint organisation_introducers_archive_previous_status_check
    check (archive_previous_status is null or archive_previous_status in ('active','inactive')),
  add constraint organisation_introducers_archive_completion_check
    check (archived_at is null or archive_requested_at is null);

create table if not exists public.organisation_introducer_onboarding (
  id uuid primary key default gen_random_uuid(),
  introducer_id uuid not null unique references public.organisation_introducers(id) on delete restrict,
  state text not null default 'registered' check (state in (
    'registered','activation_preparing','activation_sent','activation_uncertain',
    'activated','revoked'
  )),
  agreement_id uuid references public.organisation_introducer_agreements(id) on delete restrict,
  agreement_version integer check (agreement_version is null or agreement_version > 0),
  acceptance_id uuid references public.introducer_agreement_acceptances(id) on delete restrict,
  recipient_email text check (recipient_email is null or (length(recipient_email) between 3 and 254 and position('@' in recipient_email)>1)),
  accepted_terms_hash text check (accepted_terms_hash is null or accepted_terms_hash ~ '^[a-f0-9]{64}$'),
  accepted_at timestamptz,
  activation_request_id uuid,
  activation_nonce_hash text check (activation_nonce_hash is null or activation_nonce_hash ~ '^[a-f0-9]{64}$'),
  activation_expires_at timestamptz,
  preview_completion_jti uuid,
  preview_user_id uuid,
  preview_grant_id uuid,
  preview_grant_expires_at timestamptz,
  invite_sent_at timestamptz,
  invite_delivery_id text,
  activation_completed_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((state <> 'activated') or (preview_user_id is not null and preview_grant_id is not null and preview_grant_expires_at is not null and activation_completed_at is not null)),
  check ((state <> 'revoked') or revoked_at is not null)
);

create table if not exists public.organisation_introducer_onboarding_events (
  id uuid primary key default gen_random_uuid(),
  onboarding_id uuid not null references public.organisation_introducer_onboarding(id) on delete restrict,
  introducer_id uuid not null references public.organisation_introducers(id) on delete restrict,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in (
    'registered','activation_preparing','activation_sent','activation_uncertain','activation_replacement_pending',
    'activated','revoked','activation_rejected','activation_receipt_reconciled'
  )),
  agreement_id uuid,
  request_id uuid,
  occurred_at timestamptz not null default now(),
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details)='object')
);
create index if not exists organisation_introducer_onboarding_events_lookup
  on public.organisation_introducer_onboarding_events(introducer_id, occurred_at desc);
create unique index if not exists organisation_introducer_onboarding_request_idx
  on public.organisation_introducer_onboarding(activation_request_id) where activation_request_id is not null;
alter table public.organisation_introducer_onboarding_events drop constraint if exists organisation_introducer_onboarding_events_event_type_check;
alter table public.organisation_introducer_onboarding_events add constraint organisation_introducer_onboarding_events_event_type_check check (event_type in (
  'registered','activation_preparing','activation_sent','activation_uncertain','activation_replacement_pending','activation_replaced',
  'activated','revoked','activation_rejected','activation_receipt_reconciled'
));

-- Receipt IDs are durable one-time replay protection. User and grant IDs are
-- Preview-project identifiers and intentionally have no Root Auth foreign key.
create table if not exists public.organisation_introducer_onboarding_receipts (
  receipt_jti uuid primary key,
  onboarding_id uuid not null references public.organisation_introducer_onboarding(id) on delete restrict,
  introducer_id uuid not null references public.organisation_introducers(id) on delete restrict,
  request_id uuid not null,
  preview_user_id uuid not null,
  preview_grant_id uuid not null,
  receipt_sha256 text not null check (receipt_sha256 ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now()
);
create index if not exists organisation_introducer_onboarding_receipts_lookup
  on public.organisation_introducer_onboarding_receipts(onboarding_id, created_at desc);

-- Archive/remove audit remains after a clean test record is permanently removed.
-- The subject UUID is retained without keeping the introducer's PII or commercial
-- records alive; archive history is not a dependency that prevents test cleanup.
create table public.organisation_introducer_lifecycle_events (
  id uuid primary key default gen_random_uuid(),
  introducer_id uuid references public.organisation_introducers(id) on delete set null,
  introducer_ref uuid not null,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in ('archive_requested','archived','restored','removed')),
  occurred_at timestamptz not null default now(),
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details)='object')
);
create index organisation_introducer_lifecycle_events_lookup
  on public.organisation_introducer_lifecycle_events(introducer_ref, occurred_at desc);

-- Atomic Root-side consume: signature and current agreement are verified by
-- the server first; this function binds those claims to the exact pending row,
-- consumes the receipt JTI once, updates the lifecycle and writes the audit.
create function public.complete_professional_introducer_onboarding(
  p_receipt_jti uuid,
  p_onboarding_id uuid,
  p_introducer_id uuid,
  p_request_id uuid,
  p_nonce_hash text,
  p_agreement_id uuid,
  p_agreement_version integer,
  p_acceptance_id uuid,
  p_accepted_at timestamptz,
  p_terms_hash text,
  p_recipient_email text,
  p_preview_user_id uuid,
  p_preview_grant_id uuid,
  p_preview_grant_expires_at timestamptz,
  p_receipt_sha256 text
) returns boolean
language plpgsql security invoker set search_path=pg_catalog,public as $$
declare row_data public.organisation_introducer_onboarding%rowtype;
  intro_data public.organisation_introducers%rowtype;
  agreement_data public.organisation_introducer_agreements%rowtype;
  acceptance_data public.introducer_agreement_acceptances%rowtype;
begin
  select * into strict intro_data from public.organisation_introducers
    where id=p_introducer_id for update;
  if intro_data.status<>'active' or intro_data.agreement_start_date is null or intro_data.agreement_start_date>current_date
     or (intro_data.agreement_end_date is not null and intro_data.agreement_end_date<current_date) then
    raise exception 'Current commercial introducer agreement period is not valid';
  end if;
  -- Existing agreement writers take the same introducer-row lock first. A
  -- plain read preserves that serialization without requiring UPDATE grants
  -- on the immutable agreement table.
  select * into agreement_data from public.organisation_introducer_agreements
    where introducer_id=p_introducer_id order by version desc limit 1;
  if agreement_data.id is distinct from p_agreement_id or agreement_data.version is distinct from p_agreement_version
     or agreement_data.status<>'accepted' or agreement_data.superseded_at is not null
     or agreement_data.accepted_at is distinct from p_accepted_at or agreement_data.accepted_by is distinct from p_acceptance_id
     or agreement_data.terms_hash is distinct from p_terms_hash
     or agreement_data.accepted_terms_snapshot is distinct from agreement_data.terms_snapshot then
    raise exception 'Current accepted agreement is no longer valid';
  end if;
  select * into acceptance_data from public.introducer_agreement_acceptances
    where agreement_id=p_agreement_id and id=p_acceptance_id;
  if not found or acceptance_data.archive_state<>'archived'
     or acceptance_data.accepted_at is distinct from p_accepted_at
     or acceptance_data.terms_hash is distinct from p_terms_hash
     or lower(acceptance_data.evidence->>'email') is distinct from lower(p_recipient_email)
     or acceptance_data.evidence->>'full_name' is null then
    raise exception 'Archived agreement acceptance evidence is no longer valid';
  end if;
  select * into strict row_data from public.organisation_introducer_onboarding
    where id=p_onboarding_id and introducer_id=p_introducer_id for update;
  if row_data.state not in ('activation_sent','activation_uncertain','activated')
     or row_data.activation_request_id is distinct from p_request_id
     or row_data.activation_nonce_hash is distinct from p_nonce_hash
     or row_data.agreement_id is distinct from p_agreement_id
     or row_data.agreement_version is distinct from p_agreement_version
     or row_data.acceptance_id is distinct from p_acceptance_id
     or row_data.accepted_at is distinct from p_accepted_at
     or row_data.accepted_terms_hash is distinct from p_terms_hash
     or lower(row_data.recipient_email) is distinct from lower(p_recipient_email)
     or row_data.activation_expires_at is null or row_data.activation_expires_at<=now()
     or p_receipt_jti is null or p_preview_user_id is null or p_preview_grant_id is null
     or p_preview_grant_expires_at is null or p_preview_grant_expires_at<=now()
     or p_preview_grant_expires_at>now()+interval '30 days 1 minute'
     or p_receipt_sha256 is null or p_receipt_sha256 !~ '^[a-f0-9]{64}$' then
    raise exception 'Preview activation receipt does not match current Root authorization';
  end if;

  -- A retry may use a newly signed receipt for the same already-completed
  -- request, but every individual JTI is consumed once and exact replays fail.
  if row_data.state='activated' and (
      row_data.preview_user_id is distinct from p_preview_user_id or
      row_data.preview_grant_id is distinct from p_preview_grant_id or
      row_data.preview_grant_expires_at is distinct from p_preview_grant_expires_at) then
    raise exception 'Preview activation receipt conflicts with completed access';
  end if;

  insert into public.organisation_introducer_onboarding_receipts(
    receipt_jti,onboarding_id,introducer_id,request_id,preview_user_id,preview_grant_id,receipt_sha256
  ) values (
    p_receipt_jti,p_onboarding_id,p_introducer_id,p_request_id,p_preview_user_id,p_preview_grant_id,p_receipt_sha256
  );

  if row_data.state='activated' then
    insert into public.organisation_introducer_onboarding_events(
      onboarding_id,introducer_id,actor_id,event_type,agreement_id,request_id,details
    ) values (
      p_onboarding_id,p_introducer_id,null,'activation_receipt_reconciled',p_agreement_id,p_request_id,
      jsonb_build_object('receipt_jti',p_receipt_jti)
    );
    return true;
  end if;

  update public.organisation_introducer_onboarding set
    state='activated',preview_completion_jti=p_receipt_jti,preview_user_id=p_preview_user_id,
    preview_grant_id=p_preview_grant_id,preview_grant_expires_at=p_preview_grant_expires_at,
    activation_completed_at=now(),updated_at=now()
  where id=p_onboarding_id;
  insert into public.organisation_introducer_onboarding_events(
    onboarding_id,introducer_id,actor_id,event_type,agreement_id,request_id,details
  ) values (
    p_onboarding_id,p_introducer_id,null,'activated',p_agreement_id,p_request_id,
    jsonb_build_object('preview_grant_expires_at',p_preview_grant_expires_at,'receipt_jti',p_receipt_jti)
  );
  return true;
end $$;
revoke all on function public.complete_professional_introducer_onboarding(uuid,uuid,uuid,uuid,text,uuid,integer,uuid,timestamptz,text,text,uuid,uuid,timestamptz,text)
  from public,anon,authenticated;
grant execute on function public.complete_professional_introducer_onboarding(uuid,uuid,uuid,uuid,text,uuid,integer,uuid,timestamptz,text,text,uuid,uuid,timestamptz,text)
  to service_role;

-- Atomic, narrowly bounded cleanup for an unused explicitly marked test record.
-- Child policy rows are removed in the same transaction only after every legal,
-- referral, finance, acceptance, onboarding and operational-audit dependency is
-- proven absent. The lifecycle removal audit is retained by immutable UUID.
create function public.remove_test_organisation_introducer(p_introducer_id uuid, p_actor_id uuid)
returns boolean
language plpgsql security definer set search_path=pg_catalog,public as $$
declare intro_data public.organisation_introducers%rowtype; jwt_role text;
begin
  jwt_role := coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'role'
  );
  if jwt_role is distinct from 'service_role' then
    raise exception 'service_role is required for test-record removal';
  end if;
  select * into strict intro_data from public.organisation_introducers
    where id=p_introducer_id for update;
  if intro_data.status <> 'inactive' or btrim(coalesce(intro_data.notes,'')) not like '[TEST RECORD]%' then
    raise exception 'Only inactive explicitly marked test records may be removed';
  end if;
  if p_actor_id is null or not exists(select 1 from auth.users where id=p_actor_id) then
    raise exception 'A verified Root administrator identity is required for the removal audit';
  end if;
  if exists(select 1 from public.organisation_applications where introducer_id=p_introducer_id)
     or exists(select 1 from public.organisation_commissions where introducer_id=p_introducer_id)
     or exists(select 1 from public.organisation_commercial_documents where introducer_id=p_introducer_id)
     or exists(select 1 from public.personal_referral_attributions where introducer_id=p_introducer_id)
     or exists(select 1 from public.organisation_introducer_agreements where introducer_id=p_introducer_id)
     or exists(select 1 from public.introducer_agreement_acceptances a
       join public.organisation_introducer_agreements g on g.id=a.agreement_id where g.introducer_id=p_introducer_id)
     or exists(select 1 from public.organisation_introducer_campaigns where introducer_id=p_introducer_id)
     or exists(select 1 from public.introducer_google_agreement_operations where introducer_id=p_introducer_id)
     or exists(select 1 from public.organisation_introducer_onboarding where introducer_id=p_introducer_id)
     or exists(select 1 from public.organisation_introducer_onboarding_events where introducer_id=p_introducer_id)
     or exists(select 1 from public.organisation_introducer_onboarding_receipts where introducer_id=p_introducer_id) then
    raise exception 'Related legal, referral, financial, acceptance, onboarding or audit records exist; archive this introducer instead';
  end if;

  -- An unused initial policy is configuration, not signed/legal evidence. Its
  -- deletion and the parent deletion are transactional; any unknown FK or race
  -- aborts the statement and rolls both changes back.
  delete from public.organisation_introducer_policies where introducer_id=p_introducer_id;
  insert into public.organisation_introducer_lifecycle_events(
    introducer_id,introducer_ref,actor_id,event_type,details
  ) values (null,p_introducer_id,p_actor_id,'removed','{}'::jsonb);
  delete from public.organisation_introducers where id=p_introducer_id;
  if not found then raise exception 'Test record changed during removal'; end if;
  return true;
end $$;
revoke all on function public.remove_test_organisation_introducer(uuid,uuid) from public,anon,authenticated;
grant execute on function public.remove_test_organisation_introducer(uuid,uuid) to service_role;

alter table public.organisation_introducer_onboarding enable row level security;
alter table public.organisation_introducer_onboarding_events enable row level security;
alter table public.organisation_introducer_onboarding_receipts enable row level security;
alter table public.organisation_introducer_lifecycle_events enable row level security;
revoke all on public.organisation_introducer_onboarding, public.organisation_introducer_onboarding_events
  , public.organisation_introducer_onboarding_receipts, public.organisation_introducer_lifecycle_events
  from public, anon, authenticated;
grant select, insert, update, delete on public.organisation_introducer_onboarding to service_role;
grant select, insert on public.organisation_introducer_onboarding_events to service_role;
grant select, insert on public.organisation_introducer_onboarding_receipts to service_role;
grant select, insert on public.organisation_introducer_lifecycle_events to service_role;

commit;
