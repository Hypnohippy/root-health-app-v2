begin;

-- Root customer/commercial database only. This is additive and must be
-- applied only after a separately reviewed production migration approval.
do $$
begin
  if to_regclass('public.organisation_introducers') is null
     or to_regclass('public.organisation_introducer_agreements') is null
     or to_regclass('public.introducer_agreement_acceptances') is null then
    raise exception 'Root commercial introducer and accepted-agreement schema is required';
  end if;
  if to_regclass('public.organisation_introducer_onboarding') is not null
     or to_regclass('public.organisation_introducer_onboarding_events') is not null
     or to_regclass('public.organisation_introducer_onboarding_receipts') is not null
     or to_regprocedure('public.complete_professional_introducer_onboarding(uuid,uuid,uuid,uuid,text,uuid,integer,uuid,timestamptz,text,text,uuid,uuid,timestamptz,text)') is not null then
    raise exception 'Introducer onboarding objects already exist; inspect before applying this migration';
  end if;
end $$;

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
  select * into agreement_data from public.organisation_introducer_agreements
    where introducer_id=p_introducer_id order by version desc limit 1 for update;
  if agreement_data.id is distinct from p_agreement_id or agreement_data.version is distinct from p_agreement_version
     or agreement_data.status<>'accepted' or agreement_data.superseded_at is not null
     or agreement_data.accepted_at is distinct from p_accepted_at or agreement_data.accepted_by is distinct from p_acceptance_id
     or agreement_data.terms_hash is distinct from p_terms_hash
     or agreement_data.accepted_terms_snapshot is distinct from agreement_data.terms_snapshot then
    raise exception 'Current accepted agreement is no longer valid';
  end if;
  select * into acceptance_data from public.introducer_agreement_acceptances
    where agreement_id=p_agreement_id and id=p_acceptance_id for update;
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

alter table public.organisation_introducer_onboarding enable row level security;
alter table public.organisation_introducer_onboarding_events enable row level security;
alter table public.organisation_introducer_onboarding_receipts enable row level security;
revoke all on public.organisation_introducer_onboarding, public.organisation_introducer_onboarding_events
  , public.organisation_introducer_onboarding_receipts from public, anon, authenticated;
grant select, insert, update, delete on public.organisation_introducer_onboarding to service_role;
grant select, insert on public.organisation_introducer_onboarding_events to service_role;
grant select, insert on public.organisation_introducer_onboarding_receipts to service_role;

commit;
