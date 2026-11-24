begin;

-- Fictional workforce and check-ins for the isolated professional introducer
-- Preview only. The server derives access_grant_id from the verified grant;
-- clients never receive direct table access. No customer records are copied.
create table public.professional_introducer_demo_members (
  id uuid primary key default gen_random_uuid(),
  access_grant_id uuid not null references public.professional_introducer_demo_access(id) on delete cascade,
  employee_key text not null check (employee_key ~ '^employee-[0-9]{2}$'),
  display_name text not null check (char_length(trim(display_name)) between 1 and 80),
  department text not null check (char_length(trim(department)) between 1 and 80),
  created_at timestamptz not null default now(),
  unique (access_grant_id, employee_key)
);

create table public.professional_introducer_demo_assessments (
  id uuid primary key default gen_random_uuid(),
  access_grant_id uuid not null,
  employee_key text not null,
  assessment_key text not null check (
    (assessment_key like 'seed:%' and char_length(assessment_key) <= 100)
    or assessment_key ~ '^checkin:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  ),
  assessment_type text not null check (assessment_type in ('baseline', 'checkin')),
  stress_score smallint not null check (stress_score between 0 and 10),
  sleep_score smallint not null check (sleep_score between 0 and 10),
  recovery_score smallint not null check (recovery_score between 0 and 10),
  energy_score smallint not null check (energy_score between 0 and 10),
  mood_score smallint not null check (mood_score between 0 and 10),
  focus_score smallint not null check (focus_score between 0 and 10),
  burnout_score smallint not null check (burnout_score between 0 and 10),
  created_at timestamptz not null default now(),
  unique (access_grant_id, assessment_key),
  foreign key (access_grant_id, employee_key)
    references public.professional_introducer_demo_members(access_grant_id, employee_key)
    on delete cascade
);

create index professional_introducer_demo_assessments_member_time_idx
  on public.professional_introducer_demo_assessments(access_grant_id, employee_key, created_at desc);

alter table public.professional_introducer_demo_members enable row level security;
alter table public.professional_introducer_demo_assessments enable row level security;
revoke all on public.professional_introducer_demo_members from public, anon, authenticated;
revoke all on public.professional_introducer_demo_assessments from public, anon, authenticated;
grant select, insert, update, delete on public.professional_introducer_demo_members to service_role;
grant select, insert, update, delete on public.professional_introducer_demo_assessments to service_role;

commit;
