create table if not exists public.consumer_capacity_leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  marketing_consent boolean not null default false,
  consent_text text not null,
  consented_at timestamptz not null default now(),

  stress_score integer not null check (stress_score between 0 and 10),
  sleep_score integer not null check (sleep_score between 0 and 10),
  recovery_score integer not null check (recovery_score between 0 and 10),
  energy_score integer not null check (energy_score between 0 and 10),
  mood_score integer not null check (mood_score between 0 and 10),
  focus_score integer not null check (focus_score between 0 and 10),
  burnout_score integer not null check (burnout_score between 0 and 10),

  average_load numeric(3,1),
  dominant_signal text,
  dominant_score integer check (dominant_score between 0 and 10),
  result_band text,

  source text default 'direct',
  campaign text,
  medium text,
  referrer text,

  unsubscribed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists consumer_capacity_leads_email_idx
  on public.consumer_capacity_leads (lower(email));

create index if not exists consumer_capacity_leads_created_at_idx
  on public.consumer_capacity_leads (created_at desc);

create index if not exists consumer_capacity_leads_source_idx
  on public.consumer_capacity_leads (source);

alter table public.consumer_capacity_leads enable row level security;

comment on table public.consumer_capacity_leads is
  'Explicitly opted-in private-user acquisition leads captured by the public Root capacity check. Service-role access only by default.';
