-- PR #70 isolated introducer database baseline.
-- Derived from the user-supplied authoritative customer schema export:
-- SHA-256 1531B4E360A56F17614EF299AE8AC638AE57F68AA879F343FA0CEE66BC3AF7E0
-- This is a sanitized allowlist, not a replay of the export. It contains no
-- customer rows, source ACLs, source RLS policies, or SECURITY DEFINER code.
-- Apply only to the separately verified introducer Supabase project.

begin;

-- Fail if the migration runner does not have the standard Supabase roles.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon')
     or not exists (select 1 from pg_roles where rolname = 'authenticated')
     or not exists (select 1 from pg_roles where rolname = 'service_role')
     or not exists (select 1 from pg_roles where rolname = 'supabase_admin') then
    raise exception 'Expected Supabase roles are missing; refusing baseline';
  end if;
end $$;

-- Schema-local REVOKEs cannot subtract global table/sequence ACLs or explicit
-- global function grants to named API roles. Refuse rather than altering
-- project-wide table/sequence defaults or named function grants.
do $$
begin
  if exists (
    select 1
    from pg_default_acl d
    cross join lateral aclexplode(d.defaclacl) a
    where d.defaclrole in ('postgres'::regrole, 'supabase_admin'::regrole)
      and d.defaclnamespace = 0
      and (
        (d.defaclobjtype in ('r', 'S') and a.grantee in (0, 'anon'::regrole, 'authenticated'::regrole))
        or (d.defaclobjtype = 'f' and a.grantee in ('anon'::regrole, 'authenticated'::regrole))
      )
  ) then
    raise exception 'Refusing baseline: postgres or supabase_admin has unexpected global API-role defaults; review them before a project-wide change';
  end if;
end $$;

-- Fail closed unless this is the known four-table introducer Preview starting
-- point. This is a compatibility guard, not a substitute for checking the
-- Supabase project reference out of band before applying the migration.
do $$
declare
  missing_tables text[];
  unexpected_tables text[];
  secure_table_count integer;
  public_table_count integer;
  missing_columns text[];
begin
  select array_agg(expected.name order by expected.name) into missing_tables
  from unnest(array[
    'professional_introducer_demo_access',
    'professional_introducer_demo_requests',
    'professional_introducer_demo_members',
    'professional_introducer_demo_assessments'
  ]) as expected(name)
  where to_regclass(format('public.%I', expected.name)) is null;
  if cardinality(missing_tables) > 0 then
    raise exception 'Refusing baseline: expected existing introducer tables are missing: %', missing_tables;
  end if;

  select count(*) into secure_table_count
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'
    and c.relname = any(array[
      'professional_introducer_demo_access',
      'professional_introducer_demo_requests',
      'professional_introducer_demo_members',
      'professional_introducer_demo_assessments'
    ]) and c.relrowsecurity;
  if secure_table_count <> 4 then
    raise exception 'Refusing baseline: all four existing introducer tables must already have RLS enabled';
  end if;

  select count(*) into public_table_count
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p');
  if public_table_count <> 4 then
    raise exception 'Refusing baseline: expected exactly four existing public tables, found %', public_table_count;
  end if;

  select array_agg(expected.table_name || '.' || expected.column_name order by expected.table_name, expected.column_name)
    into missing_columns
  from (values
    ('professional_introducer_demo_access', 'id'),
    ('professional_introducer_demo_access', 'user_id'),
    ('professional_introducer_demo_access', 'consultant_label'),
    ('professional_introducer_demo_access', 'created_at'),
    ('professional_introducer_demo_access', 'expires_at'),
    ('professional_introducer_demo_access', 'revoked_at'),
    ('professional_introducer_demo_requests', 'access_grant_id'),
    ('professional_introducer_demo_requests', 'consultant_user_id'),
    ('professional_introducer_demo_requests', 'organisation_name'),
    ('professional_introducer_demo_requests', 'contact_permission_confirmed'),
    ('professional_introducer_demo_members', 'access_grant_id'),
    ('professional_introducer_demo_members', 'employee_key'),
    ('professional_introducer_demo_members', 'display_name'),
    ('professional_introducer_demo_members', 'department'),
    ('professional_introducer_demo_assessments', 'access_grant_id'),
    ('professional_introducer_demo_assessments', 'employee_key'),
    ('professional_introducer_demo_assessments', 'assessment_key'),
    ('professional_introducer_demo_assessments', 'assessment_type'),
    ('professional_introducer_demo_assessments', 'stress_score'),
    ('professional_introducer_demo_assessments', 'sleep_score'),
    ('professional_introducer_demo_assessments', 'recovery_score'),
    ('professional_introducer_demo_assessments', 'energy_score'),
    ('professional_introducer_demo_assessments', 'mood_score'),
    ('professional_introducer_demo_assessments', 'focus_score'),
    ('professional_introducer_demo_assessments', 'burnout_score')
  ) as expected(table_name, column_name)
  where not exists (
    select 1 from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = expected.table_name
      and c.column_name = expected.column_name
  );
  if cardinality(missing_columns) > 0 then
    raise exception 'Refusing baseline: existing introducer tables do not match the reviewed schema; missing columns: %', missing_columns;
  end if;

  select array_agg(candidate.name order by candidate.name) into unexpected_tables
  from unnest(array[
    'profiles', 'organisations', 'organisation_units', 'organisation_members',
    'organisation_hr_activity', 'organisation_learning_reviews', 'wellbeing_assessments',
    'journal_entries', 'mind_entries', 'body_signals', 'coach_signals', 'voice_sessions',
    'playbook_entries', 'playbook_entry_versions', 'playbook_tracker_entries', 'root_measurements'
  ]) as candidate(name)
  where to_regclass(format('public.%I', candidate.name)) is not null;
  if cardinality(unexpected_tables) > 0 then
    raise exception 'Refusing baseline: customer-derived objects already exist; review destination state first: %', unexpected_tables;
  end if;
end $$;

-- Clear any inherited source-like API exposure in this dedicated project.
-- service_role remains server-only; browser clients use authenticated and anon.
revoke all on schema public from public, anon, authenticated;
grant usage on schema public to authenticated;
grant usage on schema public to service_role;
revoke all on all tables in schema public from public, anon, authenticated;
revoke all on all sequences in schema public from public, anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;
-- This project has an existing SECURITY DEFINER helper that is not present in
-- the customer schema export. Keep it and any trigger dependencies intact,
-- while explicitly removing direct client invocation rights.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke all on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end $$;

-- Harden defaults owned by postgres, the migration role verified by the
-- successful statements before the previous managed-role ACL failure.
alter default privileges for role postgres in schema public
  revoke all on tables from public, anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from public, anon, authenticated;

-- Supabase-managed supabase_admin has schema-scoped default grants that this
-- migration role is not permitted to alter. The Preview's existing
-- ddl_command_end event trigger ensure_rls calls public.rls_auto_enable() to
-- enable RLS on newly created public tables. With no policy, default table
-- grants do not authorize row access; each future table migration must still
-- explicitly enable and verify RLS, revoke unintended grants, and add only
-- reviewed policies. Do not rely on the trigger as a substitute for those
-- per-migration checks (the trigger catches and logs failures).

-- Personal Root. The schema follows the source customer column names where
-- required by existing routes, while omitting operational billing fields.
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text,
  age text,
  height text,
  weight text,
  goal text,
  conditions text,
  medications text,
  allergies text,
  diet text,
  created_at timestamptz not null default now(),
  profile_key text not null unique,
  department text,
  organisation_id uuid,
  organisation_name text,
  subscription_status text default 'introducer',
  last_seen_at timestamptz,
  email text,
  marketing_opt_in boolean not null default false,
  marketing_opt_in_at timestamptz,
  orientation_completed boolean not null default false,
  constraint profiles_personal_not_workforce check (user_id is null or organisation_id is null),
  unique (profile_key, user_id)
);
create unique index profiles_email_unique on public.profiles (lower(email)) where email is not null;
create index profiles_user_id_idx on public.profiles (user_id);

create table public.organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'demo',
  created_at timestamptz not null default now(),
  employee_count text,
  industry text,
  workforce_size integer check (workforce_size is null or workforce_size > 0),
  organisation_type text,
  constraint organisations_introducer_demo_only check (status = 'demo')
);

create table public.organisation_units (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  name text not null,
  unit_type text not null default 'department',
  parent_unit_id uuid references public.organisation_units(id) on delete set null,
  active boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (id, organisation_id)
);
create index organisation_units_organisation_idx on public.organisation_units(organisation_id);

create table public.organisation_members (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  profile_key text not null,
  email text,
  name text,
  department text,
  role text not null default 'employee'
    check (role in ('employee', 'hr_admin', 'organisation_admin')),
  invited_at timestamptz default now(),
  activated_at timestamptz,
  baseline_completed_at timestamptz,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz,
  user_id uuid references auth.users(id) on delete cascade,
  organisation_unit_id uuid references public.organisation_units(id) on delete set null,
  unique (id, organisation_id),
  unique (organisation_id, profile_key)
);
create index organisation_members_org_role_idx on public.organisation_members(organisation_id, role);
create index organisation_members_user_id_idx on public.organisation_members(user_id);

-- Bind an existing, Root-provisioned introducer grant to one fictional HR
-- organisation. The mapping is immutable to the authenticated client and
-- checked for expiry/revocation inside read-only HR RLS policies.
alter table public.professional_introducer_demo_access
  add column if not exists demo_organisation_id uuid;
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.professional_introducer_demo_access'::regclass
      and conname = 'professional_introducer_demo_access_demo_organisation_fk'
  ) then
    alter table public.professional_introducer_demo_access
      add constraint professional_introducer_demo_access_demo_organisation_fk
      foreign key (demo_organisation_id) references public.organisations(id) on delete restrict;
  end if;
end $$;

create table public.organisation_hr_activity (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  membership_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  department text,
  role text,
  action text not null,
  created_at timestamptz not null default now(),
  organisation_unit_id uuid references public.organisation_units(id) on delete set null
);
create index organisation_hr_activity_org_idx on public.organisation_hr_activity(organisation_id, created_at desc);

create table public.organisation_learning_reviews (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  review_date date not null default current_date,
  sickness_days numeric,
  turnover numeric,
  agency_spend numeric,
  overtime_hours numeric,
  vacancies numeric,
  business_events text[] not null default '{}',
  business_event_notes text,
  initiatives text[] not null default '{}',
  initiative_notes text,
  watch_items text[] not null default '{}',
  root_reflection text,
  confidence_label text,
  created_at timestamptz not null default now()
);
create index organisation_learning_reviews_org_idx
  on public.organisation_learning_reviews(organisation_id, review_date desc, created_at desc);

create table public.wellbeing_assessments (
  id uuid primary key default gen_random_uuid(),
  profile_key text not null,
  user_id uuid default auth.uid() references auth.users(id) on delete cascade,
  assessment_type text not null default 'checkin',
  stress_score integer,
  sleep_score integer,
  recovery_score integer,
  energy_score integer,
  mood_score integer,
  focus_score integer,
  burnout_score integer,
  notes text,
  created_at timestamptz not null default now(),
  organisation_id uuid references public.organisations(id),
  constraint assessment_type_allowed check (assessment_type in ('baseline', 'checkin')),
  foreign key (profile_key, user_id) references public.profiles(profile_key, user_id),
  constraint wellbeing_assessment_scores_range check (
    (stress_score is null or stress_score between 0 and 10) and
    (sleep_score is null or sleep_score between 0 and 10) and
    (recovery_score is null or recovery_score between 0 and 10) and
    (energy_score is null or energy_score between 0 and 10) and
    (mood_score is null or mood_score between 0 and 10) and
    (focus_score is null or focus_score between 0 and 10) and
    (burnout_score is null or burnout_score between 0 and 10)
  )
);
create index assessments_profile_created_idx on public.wellbeing_assessments(profile_key, created_at desc);
create index assessments_org_created_idx on public.wellbeing_assessments(organisation_id, created_at desc);

create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  profile_key text not null,
  user_id uuid default auth.uid() references auth.users(id) on delete cascade,
  prompt_type text,
  title text,
  content text,
  emotional_theme text,
  dominant_feeling text,
  recommended_coach_mode text,
  recommended_prompt text,
  created_at timestamptz not null default now(),
  organisation_id uuid references public.organisations(id),
  foreign key (profile_key, user_id) references public.profiles(profile_key, user_id)
);
create index journal_profile_created_idx on public.journal_entries(profile_key, created_at desc);

create table public.mind_entries (
  id uuid primary key default gen_random_uuid(),
  profile_key text not null,
  user_id uuid default auth.uid() references auth.users(id) on delete cascade,
  tool text,
  situation text,
  automatic_thought text,
  emotion text,
  intensity text,
  reframe text,
  next_step text,
  created_at timestamptz not null default now(),
  outcome_score integer,
  outcome_label text,
  thought_theme text,
  thought_notice text,
  thought_question text,
  thought_next_step text,
  organisation_id uuid references public.organisations(id),
  foreign key (profile_key, user_id) references public.profiles(profile_key, user_id)
);
create index mind_profile_created_idx on public.mind_entries(profile_key, created_at desc);

create table public.body_signals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid default auth.uid() references auth.users(id) on delete cascade,
  areas text[],
  signal text,
  depth text,
  system text,
  intensity integer check (intensity is null or intensity between 0 and 10),
  context text,
  what_helped text,
  profile_key text not null,
  symptoms text[],
  timing_contexts text[],
  duration_patterns text[],
  modifiers text[],
  notes text,
  location_detail text,
  supersedes_id uuid,
  record_state text not null default 'active' check (record_state in ('active', 'deleted')),
  unique (id, profile_key),
  foreign key (profile_key, user_id) references public.profiles(profile_key, user_id),
  foreign key (supersedes_id, profile_key)
    references public.body_signals(id, profile_key) on delete restrict
);
create index body_signals_profile_created_idx on public.body_signals(profile_key, created_at desc);

create table public.coach_signals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid default auth.uid() references auth.users(id) on delete cascade,
  profile_key text not null,
  session_key text,
  source text not null check (source in ('text', 'voice')),
  category text not null,
  theme text not null,
  valence text not null check (valence in ('challenge', 'protective', 'neutral')),
  intensity integer check (intensity is null or intensity between 0 and 10),
  confidence numeric(4,3) check (confidence is null or confidence between 0 and 1),
  change_direction text check (change_direction is null or change_direction in ('improving', 'worsening', 'stable', 'new', 'unclear')),
  recommended_mode text,
  intervention text,
  follow_up boolean not null default false,
  include_in_org_insights boolean not null default false,
  foreign key (profile_key, user_id) references public.profiles(profile_key, user_id)
);
create index coach_signals_profile_created_idx on public.coach_signals(profile_key, created_at desc);

create table public.voice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid() references auth.users(id) on delete cascade,
  profile_key text not null,
  category text not null default 'General',
  topic text,
  summary text,
  user_goal text,
  suggested_action text,
  follow_up_prompt text,
  created_at timestamptz not null default now(),
  outcome_rating integer check (outcome_rating is null or outcome_rating between 0 and 10),
  organisation_id uuid references public.organisations(id),
  foreign key (profile_key, user_id) references public.profiles(profile_key, user_id)
);
create index voice_sessions_profile_created_idx on public.voice_sessions(profile_key, created_at desc);

create table public.playbook_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  category text not null default 'General',
  content text not null,
  source text default 'Root',
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  profile_key text not null,
  organisation_id uuid references public.organisations(id),
  item_type text not null default 'static' check (item_type in ('static', 'tracker')),
  tracker_definition jsonb,
  check ((item_type = 'static' and tracker_definition is null) or
         (item_type = 'tracker' and user_id is not null and jsonb_typeof(tracker_definition) = 'object'
          and jsonb_typeof(tracker_definition -> 'fields') = 'array')),
  unique (id, user_id, profile_key),
  foreign key (profile_key, user_id) references public.profiles(profile_key, user_id)
);
create index playbook_entries_owner_idx on public.playbook_entries(user_id, profile_key);

create table public.playbook_entry_versions (
  id uuid primary key default gen_random_uuid(),
  playbook_entry_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_key text not null,
  title text not null,
  category text not null,
  content text not null,
  source text,
  original_created_at timestamptz,
  original_updated_at timestamptz,
  version_created_at timestamptz not null default now(),
  foreign key (profile_key, user_id) references public.profiles(profile_key, user_id),
  foreign key (playbook_entry_id, user_id, profile_key)
    references public.playbook_entries(id, user_id, profile_key) on delete cascade
);
create index playbook_versions_owner_idx on public.playbook_entry_versions(user_id, profile_key, version_created_at desc);

create table public.playbook_tracker_entries (
  id uuid primary key default gen_random_uuid(),
  tracker_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_key text not null,
  answers jsonb not null check (jsonb_typeof(answers) = 'object'),
  created_at timestamptz not null default now(),
  foreign key (profile_key, user_id) references public.profiles(profile_key, user_id),
  foreign key (tracker_id, user_id, profile_key)
    references public.playbook_entries(id, user_id, profile_key) on delete restrict
);
create index playbook_tracker_owner_idx on public.playbook_tracker_entries(user_id, profile_key, created_at desc);

create table public.root_measurements (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_key text not null,
  organisation_id uuid references public.organisations(id),
  domain text not null,
  construct_key text not null,
  construct_label text not null,
  measurement_question text,
  phase text not null check (phase in ('before', 'after')),
  score numeric not null check (score between 0 and 10),
  higher_score_means text not null default 'greater_difficulty'
    check (higher_score_means in ('greater_difficulty', 'greater_wellbeing')),
  intervention_key text,
  intervention_label text,
  source_page text,
  change_score numeric,
  improvement_score numeric,
  completed_cycle boolean not null default false,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  foreign key (profile_key, user_id) references public.profiles(profile_key, user_id)
);
create index root_measurements_owner_idx on public.root_measurements(user_id, profile_key, created_at desc);

-- All application tables are protected. user_id is defaulted from auth.uid(),
-- and a composite FK binds each row to that account's exact provisioned profile.
alter table public.profiles enable row level security;
alter table public.wellbeing_assessments enable row level security;
alter table public.journal_entries enable row level security;
alter table public.mind_entries enable row level security;
alter table public.body_signals enable row level security;
alter table public.coach_signals enable row level security;
alter table public.voice_sessions enable row level security;
alter table public.playbook_entries enable row level security;
alter table public.playbook_entry_versions enable row level security;
alter table public.playbook_tracker_entries enable row level security;
alter table public.root_measurements enable row level security;
alter table public.organisations enable row level security;
alter table public.organisation_units enable row level security;
alter table public.organisation_members enable row level security;
alter table public.organisation_hr_activity enable row level security;
alter table public.organisation_learning_reviews enable row level security;
alter table public.professional_introducer_demo_access enable row level security;
alter table public.professional_introducer_demo_members enable row level security;
alter table public.professional_introducer_demo_assessments enable row level security;
alter table public.professional_introducer_demo_requests enable row level security;

-- The event trigger is helpful but logs-and-continues on errors. Assert every
-- intended table has RLS explicitly, independent of that trigger's behavior.
do $$
declare protected_count integer;
begin
  select count(*) into protected_count
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
    and c.relname = any(array[
      'profiles', 'wellbeing_assessments', 'journal_entries', 'mind_entries',
      'body_signals', 'coach_signals', 'voice_sessions', 'playbook_entries',
      'playbook_entry_versions', 'playbook_tracker_entries', 'root_measurements',
      'organisations', 'organisation_units', 'organisation_members',
      'organisation_hr_activity', 'organisation_learning_reviews',
      'professional_introducer_demo_access', 'professional_introducer_demo_members',
      'professional_introducer_demo_assessments', 'professional_introducer_demo_requests'
    ]);
  if protected_count <> 20 then
    raise exception 'RLS verification failed: expected 20 protected public tables, found %', protected_count;
  end if;
end $$;

-- This migration creates no routines. Explicitly verify that no existing
-- public function remains directly executable by Data API roles after the
-- object-level REVOKE above; future function migrations must include their
-- own per-function REVOKE statements rather than relying on global defaults.
do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and (has_function_privilege('anon', p.oid, 'EXECUTE')
        or has_function_privilege('authenticated', p.oid, 'EXECUTE'))
  ) then
    raise exception 'Function privilege verification failed: a public routine remains executable by an API role';
  end if;
end $$;

-- Remove any inherited policies from the older four-table demo schema before
-- re-establishing its service-only boundary.
do $$
declare p record;
begin
  for p in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public' and tablename in (
      'professional_introducer_demo_access',
      'professional_introducer_demo_members',
      'professional_introducer_demo_assessments',
      'professional_introducer_demo_requests'
    )
  loop
    execute format('drop policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
end $$;

create policy profiles_select_self on public.profiles for select to authenticated
  using (user_id = (select auth.uid()));
create policy profiles_update_self on public.profiles for update to authenticated
  using (user_id = (select auth.uid()) and organisation_id is null)
  with check (user_id = (select auth.uid()) and organisation_id is null);

create policy assessment_select_self on public.wellbeing_assessments for select to authenticated
  using (user_id = (select auth.uid()) and organisation_id is null);
create policy assessment_insert_self on public.wellbeing_assessments for insert to authenticated
  with check (user_id = (select auth.uid()) and organisation_id is null);

create policy journal_select_self on public.journal_entries for select to authenticated
  using (user_id = (select auth.uid()) and organisation_id is null);
create policy journal_insert_self on public.journal_entries for insert to authenticated
  with check (user_id = (select auth.uid()) and organisation_id is null);
create policy journal_update_self on public.journal_entries for update to authenticated
  using (user_id = (select auth.uid()) and organisation_id is null)
  with check (user_id = (select auth.uid()) and organisation_id is null);
create policy journal_delete_self on public.journal_entries for delete to authenticated
  using (user_id = (select auth.uid()) and organisation_id is null);

create policy mind_select_self on public.mind_entries for select to authenticated
  using (user_id = (select auth.uid()) and organisation_id is null);
create policy mind_insert_self on public.mind_entries for insert to authenticated
  with check (user_id = (select auth.uid()) and organisation_id is null);
create policy body_select_self on public.body_signals for select to authenticated
  using (user_id = (select auth.uid()));
create policy body_insert_self on public.body_signals for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy coach_select_self on public.coach_signals for select to authenticated
  using (user_id = (select auth.uid()));
create policy voice_select_self on public.voice_sessions for select to authenticated
  using (user_id = (select auth.uid()) and organisation_id is null);
create policy voice_insert_self on public.voice_sessions for insert to authenticated
  with check (user_id = (select auth.uid()) and organisation_id is null);

create policy playbook_select_self on public.playbook_entries for select to authenticated
  using (organisation_id is null and user_id = (select auth.uid()));
create policy playbook_insert_self on public.playbook_entries for insert to authenticated
  with check (organisation_id is null and user_id = (select auth.uid()));
create policy playbook_update_self on public.playbook_entries for update to authenticated
  using (organisation_id is null and user_id = (select auth.uid()))
  with check (organisation_id is null and user_id = (select auth.uid()));
create policy playbook_delete_self on public.playbook_entries for delete to authenticated
  using (organisation_id is null and user_id = (select auth.uid()));

create policy playbook_versions_self on public.playbook_entry_versions for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy playbook_tracker_self on public.playbook_tracker_entries for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy root_measurements_self on public.root_measurements for all to authenticated
  using (user_id = (select auth.uid()) and organisation_id is null)
  with check (user_id = (select auth.uid()) and organisation_id is null);

-- Fictional workforce tables are service-role-only. The HR server boundary
-- validates membership and expiry, then returns only privacy-suppressed totals.
create policy demo_access_select_self on public.professional_introducer_demo_access for select to authenticated
  using (user_id = (select auth.uid()) and revoked_at is null and expires_at > statement_timestamp());
create policy organisations_select_granted_demo on public.organisations for select to authenticated
  using (exists (select 1 from public.professional_introducer_demo_access g
    where g.user_id = (select auth.uid()) and g.demo_organisation_id = organisations.id
      and g.revoked_at is null and g.expires_at > statement_timestamp()));
create policy units_select_granted_demo on public.organisation_units for select to authenticated
  using (exists (select 1 from public.professional_introducer_demo_access g
    where g.user_id = (select auth.uid()) and g.demo_organisation_id = organisation_id
      and g.revoked_at is null and g.expires_at > statement_timestamp()));
create policy members_select_granted_demo on public.organisation_members for select to authenticated
  using (exists (select 1 from public.professional_introducer_demo_access g
    where g.user_id = (select auth.uid()) and g.demo_organisation_id = organisation_id
      and g.revoked_at is null and g.expires_at > statement_timestamp()));
create policy hr_activity_select_granted_demo on public.organisation_hr_activity for select to authenticated
  using (exists (select 1 from public.professional_introducer_demo_access g
    where g.user_id = (select auth.uid()) and g.demo_organisation_id = organisation_id
      and g.revoked_at is null and g.expires_at > statement_timestamp()));

-- No self-provisioning, account creation, HR role changes, subscriptions,
-- commercial objects, invitations, imports, or integrations are in this allowlist.
grant select on public.profiles to authenticated;
grant update (name, age, height, weight, goal, conditions, medications, allergies, diet,
  last_seen_at, email, marketing_opt_in, marketing_opt_in_at, orientation_completed)
  on public.profiles to authenticated;
grant select, insert on public.wellbeing_assessments to authenticated;
grant select, insert, update, delete on public.journal_entries to authenticated;
grant select, insert on public.mind_entries to authenticated;
grant select, insert on public.body_signals to authenticated;
grant select on public.coach_signals to authenticated;
grant select, insert on public.voice_sessions to authenticated;
grant select, insert, update, delete on public.playbook_entries to authenticated;
grant select, insert, update, delete on public.playbook_entry_versions to authenticated;
grant select, insert, update, delete on public.playbook_tracker_entries to authenticated;
grant select, insert, update, delete on public.root_measurements to authenticated;
grant select on public.professional_introducer_demo_access to authenticated;
grant select on public.organisations, public.organisation_units, public.organisation_members,
  public.organisation_hr_activity to authenticated;

grant select, insert, update, delete on public.profiles, public.wellbeing_assessments,
  public.journal_entries, public.mind_entries, public.body_signals, public.coach_signals,
  public.voice_sessions, public.playbook_entries, public.playbook_entry_versions,
  public.playbook_tracker_entries, public.root_measurements, public.organisations,
  public.organisation_units, public.organisation_members, public.organisation_hr_activity,
  public.organisation_learning_reviews,
  public.professional_introducer_demo_access, public.professional_introducer_demo_members,
  public.professional_introducer_demo_assessments, public.professional_introducer_demo_requests
  to service_role;

-- Existing introducer-only tables remain available to trusted server code only.
revoke insert, update, delete on public.professional_introducer_demo_access,
  public.professional_introducer_demo_members,
  public.professional_introducer_demo_assessments,
  public.professional_introducer_demo_requests from public, anon, authenticated;

commit;
