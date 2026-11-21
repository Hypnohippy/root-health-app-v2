begin;

-- Isolated introducer Preview only. Existing grants, user and Northstar
-- fictional data are retained. No production commercial records are copied.
do $$ begin
  if to_regclass('public.professional_introducer_demo_access') is null then
    raise exception 'Isolated introducer access baseline is required';
  end if;
  if to_regclass('public.professional_introducer_onboarding') is not null
     or to_regclass('public.professional_introducer_onboarding_events') is not null
     or to_regprocedure('public.activate_professional_introducer_onboarding(uuid,uuid,text)') is not null then
    raise exception 'Introducer onboarding objects already exist; inspect Preview state before applying this migration';
  end if;
  if not exists (select 1 from pg_attribute where attrelid='public.professional_introducer_demo_access'::regclass and attname='demo_organisation_id' and not attisdropped)
     or not exists (select 1 from pg_class where oid='public.professional_introducer_demo_access'::regclass and relrowsecurity) then
    raise exception 'The sanitized Preview baseline must be installed with RLS and organisation mapping';
  end if;
end $$;

alter table public.professional_introducer_demo_access
  add column if not exists commercial_introducer_id uuid;
create unique index if not exists professional_introducer_demo_access_commercial_identity_idx
  on public.professional_introducer_demo_access(commercial_introducer_id)
  where commercial_introducer_id is not null;

create table if not exists public.professional_introducer_onboarding (
  id uuid primary key default gen_random_uuid(),
  commercial_introducer_id uuid not null unique,
  activation_request_id uuid not null unique,
  assertion_jti uuid not null unique,
  signed_assertion text not null check (length(signed_assertion) between 100 and 12000),
  activation_link_ciphertext text,
  contact_email text not null check (length(contact_email) between 3 and 254 and position('@' in contact_email)>1),
  contact_name text not null check (length(trim(contact_name)) between 1 and 200),
  agreement_id uuid not null,
  agreement_version integer not null check (agreement_version > 0),
  accepted_terms_hash text not null check (accepted_terms_hash ~ '^[a-f0-9]{64}$'),
  acceptance_id uuid not null,
  accepted_at timestamptz not null,
  user_id uuid references auth.users(id) on delete restrict,
  access_grant_id uuid references public.professional_introducer_demo_access(id) on delete restrict,
  state text not null default 'preparing' check (state in (
    'preparing','link_prepared','delivery_uncertain','sent','replacement_pending','activated','revoked','replaced','failed'
  )),
  link_prepared_at timestamptz,
  invite_sent_at timestamptz,
  activation_expires_at timestamptz not null,
  activated_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (activation_expires_at > created_at),
  check ((state <> 'activated') or (user_id is not null and access_grant_id is not null and activated_at is not null))
);

create table if not exists public.professional_introducer_onboarding_events (
  id uuid primary key default gen_random_uuid(),
  onboarding_id uuid not null references public.professional_introducer_onboarding(id) on delete restrict,
  event_type text not null check (event_type in (
    'activation_prepared','activation_link_created','activation_delivery_uncertain',
    'activation_sent','activation_completed','activation_replacement_pending','activation_replaced','access_revoked','activation_rejected'
  )),
  actor_user_id uuid references auth.users(id) on delete set null,
  occurred_at timestamptz not null default now(),
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details)='object')
);
create index if not exists professional_introducer_onboarding_events_lookup
  on public.professional_introducer_onboarding_events(onboarding_id, occurred_at desc);

create unique index if not exists professional_introducer_onboarding_auth_user_idx
  on public.professional_introducer_onboarding(user_id) where user_id is not null;

-- Serialize activation retries so two simultaneous browser callbacks cannot
-- create duplicate grants for the same onboarding request.
create function public.activate_professional_introducer_onboarding(
  p_onboarding_id uuid, p_user_id uuid, p_label text
) returns uuid language plpgsql security invoker set search_path=pg_catalog,public as $$
declare row_data public.professional_introducer_onboarding%rowtype; grant_id uuid;
begin
  select * into strict row_data from public.professional_introducer_onboarding
    where id=p_onboarding_id for update;
  if row_data.user_id is distinct from p_user_id or row_data.state not in ('sent','activated')
     or row_data.activation_expires_at<=now()
     or length(trim(coalesce(p_label,''))) not between 1 and 80 then
    raise exception 'Introducer activation is not valid';
  end if;
  if row_data.access_grant_id is not null then return row_data.access_grant_id; end if;
  -- A pending grant is immediately unusable by RLS and server authorization.
  -- Root's signed completion receipt must be accepted before it is activated.
  insert into public.professional_introducer_demo_access(user_id,consultant_label,granted_by,expires_at,revoked_at,revoked_by)
    values(p_user_id,trim(p_label),null,now()+interval '30 days',now(),null) returning id into grant_id;
  update public.professional_introducer_onboarding set access_grant_id=grant_id,updated_at=now()
    where id=p_onboarding_id;
  return grant_id;
end $$;
revoke all on function public.activate_professional_introducer_onboarding(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.activate_professional_introducer_onboarding(uuid,uuid,text) to service_role;

create function public.confirm_professional_introducer_onboarding(
  p_onboarding_id uuid, p_user_id uuid, p_grant_id uuid
) returns boolean language plpgsql security invoker set search_path=pg_catalog,public as $$
declare row_data public.professional_introducer_onboarding%rowtype; changed integer;
begin
  select * into strict row_data from public.professional_introducer_onboarding
    where id=p_onboarding_id for update;
  if row_data.user_id is distinct from p_user_id or row_data.access_grant_id is distinct from p_grant_id
     or row_data.activation_expires_at<=now() then
    raise exception 'Introducer activation is not valid';
  end if;
  if row_data.state='activated' then
    if not exists(select 1 from public.professional_introducer_demo_access g where g.id=p_grant_id
      and g.user_id=p_user_id and g.revoked_at is null and g.expires_at>now()) then
      raise exception 'Confirmed introducer grant is unavailable';
    end if;
    return true;
  end if;
  if row_data.state<>'sent' then raise exception 'Introducer activation is not pending'; end if;
  update public.professional_introducer_demo_access set revoked_at=null,revoked_by=null
    where id=p_grant_id and user_id=p_user_id and revoked_at is not null and revoked_by is null and expires_at>now();
  get diagnostics changed=row_count;
  if changed<>1 then raise exception 'Pending introducer grant could not be activated'; end if;
  update public.professional_introducer_onboarding set state='activated',activated_at=now(),activation_link_ciphertext=null,updated_at=now()
    where id=p_onboarding_id and state='sent';
  return true;
end $$;
revoke all on function public.confirm_professional_introducer_onboarding(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.confirm_professional_introducer_onboarding(uuid,uuid,uuid) to service_role;

create function public.revoke_professional_introducer_onboarding(
  p_onboarding_id uuid, p_introducer_id uuid
) returns boolean language plpgsql security invoker set search_path=pg_catalog,public as $$
declare row_data public.professional_introducer_onboarding%rowtype;
begin
  select * into strict row_data from public.professional_introducer_onboarding
    where id=p_onboarding_id and commercial_introducer_id=p_introducer_id for update;
  if row_data.state='revoked' then return true; end if;
  if row_data.state not in ('link_prepared','sent','delivery_uncertain','activated','replacement_pending') then
    raise exception 'No active introducer access is available to revoke';
  end if;
  if row_data.access_grant_id is not null then
    update public.professional_introducer_demo_access set revoked_at=coalesce(revoked_at,now()),revoked_by=null
      where id=row_data.access_grant_id and user_id=row_data.user_id;
    if not found then raise exception 'Introducer grant could not be revoked'; end if;
  end if;
  update public.professional_introducer_onboarding set state='revoked',revoked_at=coalesce(revoked_at,now()),
    activation_link_ciphertext=null,updated_at=now() where id=p_onboarding_id;
  return true;
end $$;
revoke all on function public.revoke_professional_introducer_onboarding(uuid,uuid) from public,anon,authenticated;
grant execute on function public.revoke_professional_introducer_onboarding(uuid,uuid) to service_role;

alter table public.professional_introducer_onboarding enable row level security;
alter table public.professional_introducer_onboarding_events enable row level security;
revoke all on public.professional_introducer_onboarding, public.professional_introducer_onboarding_events
  from public, anon, authenticated;
grant select, insert, update on public.professional_introducer_onboarding to service_role;
grant select, insert on public.professional_introducer_onboarding_events to service_role;

commit;
