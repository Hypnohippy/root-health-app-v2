begin;
-- Marketing occurrences only. No lead/email/health data or introducer attribution.
create table public.personal_acquisition_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null check (event_name in ('capacity_check_viewed','capacity_check_started','capacity_check_completed','signup_started','signup_completed','subscription_started')),
  acquisition_id uuid,
  campaign_id text check (campaign_id ~ '^(pa-)?[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'),
  asset_id uuid,
  attribution_session_id uuid not null,
  user_id uuid references auth.users(id) on delete set null,
  occurred_at timestamptz not null default now(),
  dedupe_key text not null unique check (length(dedupe_key) between 1 and 180),
  source text check (source in ('linkedin','facebook','instagram','threads','x','tiktok','reddit','root','google','direct')),
  medium text check (medium in ('social','search','organic','public_response','content'))
);
create index personal_acquisition_events_acquisition_idx on public.personal_acquisition_events(acquisition_id, event_name);
create index personal_acquisition_events_campaign_idx on public.personal_acquisition_events(campaign_id, event_name);
create index personal_acquisition_events_session_idx on public.personal_acquisition_events(attribution_session_id, event_name);
alter table public.personal_acquisition_events enable row level security;
revoke all on public.personal_acquisition_events from public, anon, authenticated;
grant select, insert on public.personal_acquisition_events to service_role;
-- Explicitly exclude row-level data from the Ops contract, including internal user IDs.
create function public.personal_acquisition_counts(p_acquisition_ids uuid[])
returns table (acquisition_id uuid, capacity_check_viewed bigint, capacity_check_started bigint, capacity_check_completed bigint,
  signup_started bigint, signup_completed bigint, subscription_started bigint)
language sql stable security invoker set search_path = public, pg_temp as $$
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
$$;
revoke all on function public.personal_acquisition_counts(uuid[]) from public, anon, authenticated;
grant execute on function public.personal_acquisition_counts(uuid[]) to service_role;
create function public.personal_acquisition_campaign_counts(p_campaign_ids text[])
returns table (campaign_id text, capacity_check_viewed bigint, capacity_check_started bigint, capacity_check_completed bigint,
  signup_started bigint, signup_completed bigint, subscription_started bigint)
language sql stable security invoker set search_path = public, pg_temp as $$
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
$$;
revoke all on function public.personal_acquisition_campaign_counts(text[]) from public, anon, authenticated;
grant execute on function public.personal_acquisition_campaign_counts(text[]) to service_role;
commit;
