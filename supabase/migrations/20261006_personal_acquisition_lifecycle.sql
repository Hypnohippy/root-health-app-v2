create table if not exists public.personal_acquisition_contacts (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email)),
  user_id uuid unique references auth.users(id) on delete set null,
  latest_capacity_lead_id uuid references public.consumer_capacity_leads(id) on delete set null,

  marketing_consent boolean not null default false,
  consented_at timestamptz,
  source text,
  campaign text,
  medium text,

  capacity_check_completed_at timestamptz,
  signup_at timestamptz,
  checkout_started_at timestamptz,
  selected_plan text check (selected_plan is null or selected_plan in ('monthly','annual')),
  stripe_checkout_session_id text,

  subscriber_at timestamptz,
  subscription_status text,
  subscription_updated_at timestamptz,

  unsubscribed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists personal_acquisition_contacts_user_idx
  on public.personal_acquisition_contacts (user_id)
  where user_id is not null;

create index if not exists personal_acquisition_contacts_status_idx
  on public.personal_acquisition_contacts (subscription_status, updated_at desc);

alter table public.personal_acquisition_contacts enable row level security;

revoke all on table public.personal_acquisition_contacts from public, anon, authenticated;
grant select, insert, update, delete on table public.personal_acquisition_contacts to service_role;

comment on table public.personal_acquisition_contacts is
  'Service-only, non-clinical Personal acquisition lifecycle. Links explicit Capacity Check consent to account, checkout and subscription state without copying wellbeing scores.';

create or replace function public.sync_personal_acquisition_from_capacity_lead()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
begin
  v_email := lower(trim(new.email));

  if v_email is null or v_email = '' then
    return new;
  end if;

  insert into public.personal_acquisition_contacts (
    email,
    latest_capacity_lead_id,
    marketing_consent,
    consented_at,
    source,
    campaign,
    medium,
    capacity_check_completed_at,
    created_at,
    updated_at
  )
  values (
    v_email,
    new.id,
    new.marketing_consent and new.unsubscribed_at is null,
    new.consented_at,
    nullif(trim(new.source), ''),
    nullif(trim(new.campaign), ''),
    nullif(trim(new.medium), ''),
    new.created_at,
    new.created_at,
    now()
  )
  on conflict (email) do update
  set
    latest_capacity_lead_id = excluded.latest_capacity_lead_id,
    marketing_consent = case
      when personal_acquisition_contacts.unsubscribed_at is not null then false
      else excluded.marketing_consent
    end,
    consented_at = coalesce(personal_acquisition_contacts.consented_at, excluded.consented_at),
    source = coalesce(excluded.source, personal_acquisition_contacts.source),
    campaign = coalesce(excluded.campaign, personal_acquisition_contacts.campaign),
    medium = coalesce(excluded.medium, personal_acquisition_contacts.medium),
    capacity_check_completed_at = greatest(
      coalesce(personal_acquisition_contacts.capacity_check_completed_at, '-infinity'::timestamptz),
      excluded.capacity_check_completed_at
    ),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists trg_sync_personal_acquisition_from_capacity_lead
  on public.consumer_capacity_leads;

create trigger trg_sync_personal_acquisition_from_capacity_lead
after insert on public.consumer_capacity_leads
for each row execute function public.sync_personal_acquisition_from_capacity_lead();

revoke all on function public.sync_personal_acquisition_from_capacity_lead()
  from public, anon, authenticated;

create or replace function public.record_personal_acquisition_checkout(
  p_user_id uuid,
  p_email text,
  p_signup_at timestamptz,
  p_plan text,
  p_checkout_session_id text,
  p_checkout_started_at timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_id uuid;
begin
  if p_user_id is null then
    raise exception 'personal_acquisition_user_required';
  end if;

  if v_email = '' then
    raise exception 'personal_acquisition_email_required';
  end if;

  if p_plan not in ('monthly', 'annual') then
    raise exception 'personal_acquisition_invalid_plan';
  end if;

  select id
    into v_id
    from public.personal_acquisition_contacts
   where user_id = p_user_id
   for update;

  if v_id is null then
    select id
      into v_id
      from public.personal_acquisition_contacts
     where email = v_email
     for update;
  end if;

  if v_id is null then
    insert into public.personal_acquisition_contacts (
      email,
      user_id,
      signup_at,
      checkout_started_at,
      selected_plan,
      stripe_checkout_session_id,
      created_at,
      updated_at
    )
    values (
      v_email,
      p_user_id,
      p_signup_at,
      p_checkout_started_at,
      p_plan,
      nullif(trim(p_checkout_session_id), ''),
      now(),
      now()
    )
    returning id into v_id;
  else
    update public.personal_acquisition_contacts
       set user_id = coalesce(user_id, p_user_id),
           signup_at = coalesce(signup_at, p_signup_at),
           checkout_started_at = greatest(
             coalesce(checkout_started_at, '-infinity'::timestamptz),
             p_checkout_started_at
           ),
           selected_plan = p_plan,
           stripe_checkout_session_id = coalesce(
             nullif(trim(p_checkout_session_id), ''),
             stripe_checkout_session_id
           ),
           updated_at = now()
     where id = v_id;
  end if;

  return v_id;
end;
$$;

revoke all on function public.record_personal_acquisition_checkout(
  uuid,text,timestamptz,text,text,timestamptz
) from public, anon, authenticated;
grant execute on function public.record_personal_acquisition_checkout(
  uuid,text,timestamptz,text,text,timestamptz
) to service_role;

create or replace function public.record_personal_acquisition_subscription(
  p_user_id uuid,
  p_email text,
  p_plan text,
  p_status text,
  p_active boolean,
  p_activated_at timestamptz,
  p_updated_at timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_id uuid;
begin
  if p_user_id is null then
    raise exception 'personal_acquisition_user_required';
  end if;

  if v_email = '' then
    raise exception 'personal_acquisition_email_required';
  end if;

  select id
    into v_id
    from public.personal_acquisition_contacts
   where user_id = p_user_id
   for update;

  if v_id is null then
    select id
      into v_id
      from public.personal_acquisition_contacts
     where email = v_email
     for update;
  end if;

  if v_id is null then
    insert into public.personal_acquisition_contacts (
      email,
      user_id,
      selected_plan,
      subscriber_at,
      subscription_status,
      subscription_updated_at,
      created_at,
      updated_at
    )
    values (
      v_email,
      p_user_id,
      case when p_plan in ('monthly','annual') then p_plan else null end,
      case when p_active then p_activated_at else null end,
      nullif(lower(trim(coalesce(p_status, ''))), ''),
      p_updated_at,
      now(),
      now()
    )
    returning id into v_id;
  else
    update public.personal_acquisition_contacts
       set user_id = coalesce(user_id, p_user_id),
           selected_plan = case
             when p_plan in ('monthly','annual') then p_plan
             else selected_plan
           end,
           subscriber_at = case
             when p_active then coalesce(subscriber_at, p_activated_at, p_updated_at)
             else subscriber_at
           end,
           subscription_status = nullif(lower(trim(coalesce(p_status, ''))), ''),
           subscription_updated_at = p_updated_at,
           updated_at = now()
     where id = v_id;
  end if;

  return v_id;
end;
$$;

revoke all on function public.record_personal_acquisition_subscription(
  uuid,text,text,text,boolean,timestamptz,timestamptz
) from public, anon, authenticated;
grant execute on function public.record_personal_acquisition_subscription(
  uuid,text,text,text,boolean,timestamptz,timestamptz
) to service_role;
