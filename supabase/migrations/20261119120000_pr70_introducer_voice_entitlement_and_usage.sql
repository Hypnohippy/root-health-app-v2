-- Preview-only, Root-controlled Voice Coach entitlement and configurable usage guard.
-- Target: isolated introducer project waluyphoafylzcjuskcl only.
-- No personal transcripts, prompts, health context, or provider credentials are stored.
begin;

alter table public.professional_introducer_demo_access
  add column if not exists voice_coach_enabled boolean not null default false,
  add column if not exists voice_sessions_per_24h_override integer,
  add column if not exists voice_max_session_seconds_override integer;

alter table public.professional_introducer_demo_access
  add constraint professional_introducer_demo_access_voice_sessions_limit_check
    check (voice_sessions_per_24h_override is null or voice_sessions_per_24h_override >= 0),
  add constraint professional_introducer_demo_access_voice_duration_limit_check
    check (voice_max_session_seconds_override is null or voice_max_session_seconds_override between 300 and 3600);

-- Defaults are intentionally disabled. The £10 calendar-month ceiling is a
-- total-demo initial budget. The FX rate is a Root-maintained monthly input
-- from HMRC's published monthly USD-per-GBP rate, with a safety margin. No
-- reservation is allowed until a current-period rate/source is configured.
-- Estimated/provider usage is not a provider-enforced spend ceiling.
create table if not exists public.professional_introducer_voice_policy (
  singleton boolean primary key default true check (singleton is true),
  enabled boolean not null default false,
  server_termination_ready boolean not null default false,
  monthly_budget_gbp numeric(12, 4) not null default 10 check (monthly_budget_gbp >= 0),
  usd_per_gbp numeric(12, 6),
  fx_period date,
  fx_source text,
  fx_updated_at timestamptz,
  fx_safety_margin_percent integer not null default 10 check (fx_safety_margin_percent between 0 and 100),
  estimated_cost_per_minute_usd numeric(12, 6) not null default 0.20 check (estimated_cost_per_minute_usd > 0),
  default_sessions_per_24h integer not null default 3 check (default_sessions_per_24h >= 0),
  default_max_session_seconds integer not null default 1800 check (default_max_session_seconds between 300 and 3600),
  completion_grace_seconds integer not null default 900 check (completion_grace_seconds between 0 and 3600),
  warning_before_seconds integer not null default 300 check (warning_before_seconds between 0 and 3600),
  alert_threshold_percent integer not null default 80 check (alert_threshold_percent between 1 and 100),
  updated_at timestamptz not null default statement_timestamp()
);

insert into public.professional_introducer_voice_policy(singleton)
values (true)
on conflict (singleton) do nothing;

alter table public.professional_introducer_voice_policy enable row level security;
revoke all on public.professional_introducer_voice_policy from public, anon, authenticated;
grant select, insert, update on public.professional_introducer_voice_policy to service_role;

create table if not exists public.professional_introducer_voice_usage (
  id uuid primary key default gen_random_uuid(),
  -- Keep the minimal termination receipt if an Auth user or grant is removed.
  -- It contains no conversation or health context and is pruned after 30 days.
  user_id uuid not null,
  grant_id uuid references public.professional_introducer_demo_access(id) on delete set null,
  started_at timestamptz not null default statement_timestamp(),
  planned_session_expires_at timestamptz not null,
  session_expires_at timestamptz not null,
  provider_hard_expires_at timestamptz not null,
  completion_extension_used_at timestamptz,
  reserved_cost_usd numeric(14, 6) not null check (reserved_cost_usd >= 0),
  reserved_cost_gbp numeric(14, 6) not null check (reserved_cost_gbp >= 0),
  actual_cost_usd numeric(14, 6),
  actual_cost_gbp numeric(14, 6),
  provider_call_id text unique,
  termination_status text not null default 'awaiting_call_id'
    check (termination_status in ('awaiting_call_id','scheduled','terminating','retry','terminated','creation_failed')),
  termination_reason text,
  termination_attempts integer not null default 0 check (termination_attempts >= 0),
  termination_next_attempt_at timestamptz not null default statement_timestamp(),
  -- Pending marker is an orphan alarm: if the worker dies or the provider
  -- response omits its call ID, this user remains blocked until Root review.
  termination_last_error text default 'provider_call_id_pending',
  terminated_at timestamptz,
  check (session_expires_at > started_at),
  check (planned_session_expires_at > started_at),
  check (planned_session_expires_at <= session_expires_at),
  check (session_expires_at <= provider_hard_expires_at),
  check (provider_hard_expires_at <= started_at + interval '1 hour')
);

create index if not exists professional_introducer_voice_usage_user_started_idx
  on public.professional_introducer_voice_usage (user_id, started_at desc);
create index if not exists professional_introducer_voice_usage_project_started_idx
  on public.professional_introducer_voice_usage (started_at desc);
create index if not exists professional_introducer_voice_usage_lease_idx
  on public.professional_introducer_voice_usage (user_id, session_expires_at);
create index if not exists professional_introducer_voice_usage_termination_idx
  on public.professional_introducer_voice_usage (termination_next_attempt_at, session_expires_at)
  where provider_call_id is not null and terminated_at is null;

create table if not exists public.professional_introducer_voice_denials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  grant_id uuid,
  denial_reason text not null,
  occurred_at timestamptz not null default statement_timestamp()
);
alter table public.professional_introducer_voice_denials enable row level security;
revoke all on public.professional_introducer_voice_denials from public, anon, authenticated;
grant select, insert, delete on public.professional_introducer_voice_denials to service_role;
create index if not exists professional_introducer_voice_denials_time_idx
  on public.professional_introducer_voice_denials (occurred_at desc);

alter table public.professional_introducer_voice_usage enable row level security;
revoke all on public.professional_introducer_voice_usage from public, anon, authenticated;
grant select, insert, update, delete on public.professional_introducer_voice_usage to service_role;

-- Reservation locking order is always project budget, then user allocation.
-- The project lock protects the spend-budget read/insert from concurrent
-- starts by different introducers. There is no platform-wide session-count
-- cap, so the introducer network can grow; the configurable estimated-spend
-- budget is the project safeguard. Per-user defaults and Root-set overrides
-- are independent. The planned duration is followed by a bounded completion
-- window; the total must remain within OpenAI's documented 60-minute session
-- maximum. Voice remains default-off until the Preview worker is verified.
create or replace function public.reserve_professional_introducer_voice_session(
  p_user_id uuid,
  p_grant_id uuid
) returns table (
  allowed boolean,
  denial_reason text,
  max_session_seconds integer,
  reserved_cost_usd numeric,
  reserved_cost_gbp numeric,
  project_budget_used_gbp numeric,
  project_monthly_budget_gbp numeric,
  alert_threshold_percent integer,
  reservation_id uuid,
  planned_session_seconds integer,
  completion_grace_seconds integer,
  warning_before_seconds integer
)
language plpgsql
volatile
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_now timestamptz := statement_timestamp();
  v_policy public.professional_introducer_voice_policy%rowtype;
  v_grant public.professional_introducer_demo_access%rowtype;
  v_max_seconds integer;
  v_planned_seconds integer;
  v_completion_grace_seconds integer;
  v_warning_before_seconds integer;
  v_user_limit integer;
  v_reserve_usd numeric(14, 6);
  v_reserve_gbp numeric(14, 6);
  v_budget_used_gbp numeric(14, 6);
  v_month_start timestamptz;
  v_reservation_id uuid;
begin
  if p_user_id is null or p_grant_id is null then
    return query select false, 'invalid_request'::text, null::integer, null::numeric, null::numeric, null::numeric, null::numeric, null::integer, null::uuid, null::integer, null::integer, null::integer;
    return;
  end if;

  -- Fixed global-before-user ordering prevents deadlocks. Both locks are
  -- transaction scoped and cover the subsequent checks and reservation.
  perform pg_advisory_xact_lock(707052, 1);
  perform pg_advisory_xact_lock(707053, hashtext(p_user_id::text));
  delete from public.professional_introducer_voice_denials d
    where d.occurred_at < v_now - interval '30 days';

  select * into v_policy
  from public.professional_introducer_voice_policy p
  where p.singleton is true;
  if not found or v_policy.enabled is not true or v_policy.monthly_budget_gbp <= 0 then
    insert into public.professional_introducer_voice_denials(user_id, grant_id, denial_reason)
      values (p_user_id, p_grant_id, 'voice_policy_disabled');
    return query select false, 'voice_policy_disabled'::text, null::integer, null::numeric, null::numeric,
      null::numeric, coalesce(v_policy.monthly_budget_gbp, 0)::numeric, coalesce(v_policy.alert_threshold_percent, 80)::integer, null::uuid, null::integer, null::integer, null::integer;
    return;
  end if;
  if v_policy.server_termination_ready is not true then
    insert into public.professional_introducer_voice_denials(user_id, grant_id, denial_reason)
      values (p_user_id, p_grant_id, 'voice_termination_not_ready');
    return query select false, 'voice_termination_not_ready'::text, null::integer, null::numeric, null::numeric,
      null::numeric, v_policy.monthly_budget_gbp, v_policy.alert_threshold_percent, null::uuid, null::integer, null::integer, null::integer;
    return;
  end if;
  v_month_start := date_trunc('month', v_now at time zone 'Europe/London') at time zone 'Europe/London';
  if v_policy.usd_per_gbp is null or v_policy.usd_per_gbp <= 0
    or v_policy.fx_period <> date_trunc('month', v_now at time zone 'Europe/London')::date
    or coalesce(nullif(btrim(v_policy.fx_source), ''), '') = '' then
    insert into public.professional_introducer_voice_denials(user_id, grant_id, denial_reason)
      values (p_user_id, p_grant_id, 'monthly_fx_rate_unconfigured');
    return query select false, 'monthly_fx_rate_unconfigured'::text, null::integer, null::numeric, null::numeric,
      null::numeric, v_policy.monthly_budget_gbp, v_policy.alert_threshold_percent, null::uuid, null::integer, null::integer, null::integer;
    return;
  end if;

  select * into v_grant
  from public.professional_introducer_demo_access g
  where g.id = p_grant_id and g.user_id = p_user_id
    and g.voice_coach_enabled is true and g.revoked_at is null
    and g.expires_at > v_now and g.demo_organisation_id is not null;
  if not found then
    insert into public.professional_introducer_voice_denials(user_id, grant_id, denial_reason)
      values (p_user_id, p_grant_id, 'grant_inactive');
    return query select false, 'grant_inactive'::text, null::integer, null::numeric, null::numeric,
      null::numeric, v_policy.monthly_budget_gbp, v_policy.alert_threshold_percent, null::uuid, null::integer, null::integer, null::integer;
    return;
  end if;

  v_user_limit := coalesce(v_grant.voice_sessions_per_24h_override, v_policy.default_sessions_per_24h);
  v_planned_seconds := coalesce(v_grant.voice_max_session_seconds_override, v_policy.default_max_session_seconds);
  v_completion_grace_seconds := v_policy.completion_grace_seconds;
  v_warning_before_seconds := v_policy.warning_before_seconds;
  v_max_seconds := v_planned_seconds + (2 * v_completion_grace_seconds);
  if v_planned_seconds < 300 or v_max_seconds > 3600 or v_warning_before_seconds >= v_planned_seconds then
    insert into public.professional_introducer_voice_denials(user_id, grant_id, denial_reason)
      values (p_user_id, p_grant_id, 'session_duration_policy_invalid');
    return query select false, 'session_duration_policy_invalid'::text, null::integer, null::numeric, null::numeric,
      null::numeric, v_policy.monthly_budget_gbp, v_policy.alert_threshold_percent, null::uuid, null::integer, null::integer, null::integer;
    return;
  end if;
  if v_user_limit <= 0 then
    insert into public.professional_introducer_voice_denials(user_id, grant_id, denial_reason)
      values (p_user_id, p_grant_id, 'user_allocation_disabled');
    return query select false, 'user_allocation_disabled'::text, v_max_seconds, null::numeric, null::numeric,
      null::numeric, v_policy.monthly_budget_gbp, v_policy.alert_threshold_percent, null::uuid, v_planned_seconds, v_completion_grace_seconds, v_warning_before_seconds;
    return;
  end if;

  delete from public.professional_introducer_voice_usage u
  where u.started_at < v_now - interval '30 days'
    and (u.provider_call_id is null or u.terminated_at is not null);

  if exists (
    select 1 from public.professional_introducer_voice_usage u
    where u.user_id = p_user_id
      and u.termination_status <> 'creation_failed'
      and u.terminated_at is null
      and (u.provider_call_id is not null or u.session_expires_at > v_now
        or (u.termination_status = 'awaiting_call_id' and u.termination_last_error = 'provider_call_id_pending'))
  ) then
    insert into public.professional_introducer_voice_denials(user_id, grant_id, denial_reason)
      values (p_user_id, p_grant_id, 'active_session');
    return query select false, 'active_session'::text, v_max_seconds, null::numeric, null::numeric,
      null::numeric, v_policy.monthly_budget_gbp, v_policy.alert_threshold_percent, null::uuid, v_planned_seconds, v_completion_grace_seconds, v_warning_before_seconds;
    return;
  end if;

  if (select count(*) from public.professional_introducer_voice_usage u
      where u.user_id = p_user_id and u.started_at > v_now - interval '24 hours'
        and u.termination_status <> 'creation_failed') >= v_user_limit then
    insert into public.professional_introducer_voice_denials(user_id, grant_id, denial_reason)
      values (p_user_id, p_grant_id, 'user_daily_limit');
    return query select false, 'user_daily_limit'::text, v_max_seconds, null::numeric, null::numeric,
      null::numeric, v_policy.monthly_budget_gbp, v_policy.alert_threshold_percent, null::uuid, v_planned_seconds, v_completion_grace_seconds, v_warning_before_seconds;
    return;
  end if;

  v_reserve_usd := round((v_max_seconds::numeric / 60) * v_policy.estimated_cost_per_minute_usd, 6);
  v_reserve_gbp := ceil((v_reserve_usd * (1 + v_policy.fx_safety_margin_percent::numeric / 100) / v_policy.usd_per_gbp) * 1000000) / 1000000;
  select coalesce(sum(u.reserved_cost_gbp), 0)::numeric(14, 6) into v_budget_used_gbp
  from public.professional_introducer_voice_usage u
  where u.started_at >= v_month_start;

  if v_budget_used_gbp + v_reserve_gbp > v_policy.monthly_budget_gbp then
    insert into public.professional_introducer_voice_denials(user_id, grant_id, denial_reason)
      values (p_user_id, p_grant_id, 'project_estimated_budget');
    return query select false, 'project_estimated_budget'::text, v_max_seconds, v_reserve_usd, v_reserve_gbp, v_budget_used_gbp,
      v_policy.monthly_budget_gbp, v_policy.alert_threshold_percent, null::uuid, v_planned_seconds, v_completion_grace_seconds, v_warning_before_seconds;
    return;
  end if;

  insert into public.professional_introducer_voice_usage
    (user_id, grant_id, started_at, planned_session_expires_at, session_expires_at, provider_hard_expires_at, reserved_cost_usd, reserved_cost_gbp)
  values (p_user_id, p_grant_id, v_now,
    v_now + make_interval(secs => v_planned_seconds),
    v_now + make_interval(secs => v_planned_seconds + v_completion_grace_seconds),
    v_now + make_interval(secs => v_max_seconds), v_reserve_usd, v_reserve_gbp)
  returning id into v_reservation_id;

  v_budget_used_gbp := v_budget_used_gbp + v_reserve_gbp;
  return query select true, null::text, v_max_seconds, v_reserve_usd, v_reserve_gbp, v_budget_used_gbp,
    v_policy.monthly_budget_gbp, v_policy.alert_threshold_percent, v_reservation_id,
    v_planned_seconds, v_completion_grace_seconds, v_warning_before_seconds;
end;
$$;

revoke all on function public.reserve_professional_introducer_voice_session(uuid, uuid) from public, anon, authenticated;
grant execute on function public.reserve_professional_introducer_voice_session(uuid, uuid) to service_role;

-- Attach the provider's WebRTC call ID before returning SDP to the browser.
-- The minimal receipt survives Auth-user or grant deletion for termination.
create or replace function public.attach_professional_introducer_voice_call(
  p_reservation_id uuid,
  p_user_id uuid,
  p_grant_id uuid,
  p_provider_call_id text
) returns table (attached boolean, terminate_now boolean)
language plpgsql volatile security invoker
set search_path = pg_catalog, public
as $$
declare
  v_active boolean;
begin
  if p_reservation_id is null or p_user_id is null or p_provider_call_id is null
     or p_provider_call_id !~ '^rtc_[A-Za-z0-9_-]{1,180}$' then
    return query select false, true;
    return;
  end if;

  perform pg_advisory_xact_lock(707052, 1);
  perform pg_advisory_xact_lock(707053, hashtext(p_user_id::text));

  select exists (
    select 1 from public.professional_introducer_demo_access g
    where g.id = p_grant_id and g.user_id = p_user_id
      and g.voice_coach_enabled is true and g.revoked_at is null
      and g.expires_at > statement_timestamp() and g.demo_organisation_id is not null
  ) into v_active;

  return query
  update public.professional_introducer_voice_usage u
  set provider_call_id = p_provider_call_id,
      termination_status = case when v_active then 'scheduled' else 'retry' end,
      termination_reason = case when v_active then 'duration_limit' else 'grant_inactive' end,
      termination_next_attempt_at = case when v_active then u.session_expires_at else statement_timestamp() end,
      termination_last_error = null
  where u.id = p_reservation_id and u.user_id = p_user_id
    and u.provider_call_id is null and u.termination_status = 'awaiting_call_id'
  returning true, not v_active;

  if not found then
    return query select false, true;
  end if;
end;
$$;
revoke all on function public.attach_professional_introducer_voice_call(uuid, uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.attach_professional_introducer_voice_call(uuid, uuid, uuid, text) to service_role;

-- A definitive provider rejection releases the active lease but retains the
-- conservative monthly cost reservation. Do not assume an upstream failure is
-- free until provider billing is reconciled. Timeouts/5xx remain orphan-held.
create or replace function public.mark_professional_introducer_voice_creation_failed(
  p_reservation_id uuid,
  p_user_id uuid
) returns boolean
language plpgsql volatile security invoker
set search_path = pg_catalog, public
as $$
begin
  if p_reservation_id is null or p_user_id is null then return false; end if;
  perform pg_advisory_xact_lock(707052, 1);
  perform pg_advisory_xact_lock(707053, hashtext(p_user_id::text));
  update public.professional_introducer_voice_usage u
  set termination_status = 'creation_failed',
      termination_reason = 'provider_rejected',
      termination_last_error = null,
      terminated_at = statement_timestamp()
  where u.id = p_reservation_id and u.user_id = p_user_id
    and u.provider_call_id is null and u.termination_status = 'awaiting_call_id';
  return found;
end;
$$;
revoke all on function public.mark_professional_introducer_voice_creation_failed(uuid, uuid) from public, anon, authenticated;
grant execute on function public.mark_professional_introducer_voice_creation_failed(uuid, uuid) to service_role;

-- A single bounded completion extension may be requested during the final
-- minute of the initial completion window. It is allowed only while the grant
-- and Voice entitlement remain active and while the recorded call is still
-- scheduled. The provider-hard expiry and spend reservation never change.
create or replace function public.extend_professional_introducer_voice_completion(
  p_reservation_id uuid,
  p_user_id uuid,
  p_grant_id uuid
) returns boolean
language plpgsql volatile security invoker
set search_path = pg_catalog, public
as $$
declare
  v_now timestamptz := statement_timestamp();
  v_usage public.professional_introducer_voice_usage%rowtype;
  v_policy public.professional_introducer_voice_policy%rowtype;
begin
  if p_reservation_id is null or p_user_id is null or p_grant_id is null then return false; end if;

  -- Preserve the reservation/admin lock ordering used by all other policy
  -- changes: project budget first, then per-user quota.
  perform pg_advisory_xact_lock(707052, 1);
  perform pg_advisory_xact_lock(707053, hashtext(p_user_id::text));

  select * into v_policy from public.professional_introducer_voice_policy p
  where p.singleton is true;
  if not found or v_policy.enabled is not true or v_policy.server_termination_ready is not true then
    return false;
  end if;
  if not exists (
    select 1 from public.professional_introducer_demo_access g
    where g.id = p_grant_id and g.user_id = p_user_id
      and g.voice_coach_enabled is true and g.revoked_at is null
      and g.expires_at > v_now and g.demo_organisation_id is not null
  ) then return false; end if;

  select * into v_usage from public.professional_introducer_voice_usage u
  where u.id = p_reservation_id and u.user_id = p_user_id and u.grant_id = p_grant_id
  for update;
  if not found or v_usage.provider_call_id is null or v_usage.terminated_at is not null then
    return false;
  end if;
  -- A retry after an ambiguous network response is safe and idempotent.
  if v_usage.completion_extension_used_at is not null then
    return v_usage.session_expires_at = v_usage.provider_hard_expires_at;
  end if;
  if v_usage.termination_status <> 'scheduled'
    or v_usage.session_expires_at <= v_now
    or v_usage.session_expires_at - v_now > interval '60 seconds'
    or v_usage.provider_hard_expires_at <= v_usage.session_expires_at then
    return false;
  end if;

  update public.professional_introducer_voice_usage u
  set session_expires_at = v_usage.provider_hard_expires_at,
      termination_next_attempt_at = v_usage.provider_hard_expires_at,
      completion_extension_used_at = v_now
  where u.id = p_reservation_id and u.user_id = p_user_id and u.grant_id = p_grant_id;
  return found;
end;
$$;
revoke all on function public.extend_professional_introducer_voice_completion(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.extend_professional_introducer_voice_completion(uuid, uuid, uuid) to service_role;

-- A scheduled server worker claims calls after duration expiry or grant
-- revocation. SKIP LOCKED prevents duplicate claims by concurrent workers.
create or replace function public.claim_due_professional_introducer_voice_terminations(p_limit integer default 20)
returns table (reservation_id uuid, provider_call_id text, termination_reason text, attempt integer)
language plpgsql volatile security invoker
set search_path = pg_catalog, public
as $$
begin
  return query
  with due as (
    select u.id
    from public.professional_introducer_voice_usage u
    where u.provider_call_id is not null
      and u.terminated_at is null
      and u.termination_status in ('scheduled','retry','terminating')
      and (
        u.session_expires_at <= statement_timestamp()
        or not exists (
          select 1 from public.professional_introducer_demo_access g
          where g.id = u.grant_id and g.user_id = u.user_id
            and g.voice_coach_enabled is true and g.revoked_at is null
            and g.expires_at > statement_timestamp() and g.demo_organisation_id is not null
        )
      )
      and (
        u.termination_next_attempt_at <= statement_timestamp()
        or not exists (
          select 1 from public.professional_introducer_demo_access g
          where g.id = u.grant_id and g.user_id = u.user_id
            and g.voice_coach_enabled is true and g.revoked_at is null
            and g.expires_at > statement_timestamp() and g.demo_organisation_id is not null
        )
      )
    order by u.termination_next_attempt_at, u.started_at
    for update skip locked
    limit greatest(1, least(coalesce(p_limit, 20), 100))
  )
  update public.professional_introducer_voice_usage u
  set termination_status = 'terminating',
      termination_reason = case
        when u.session_expires_at <= statement_timestamp() then 'duration_limit'
        else 'grant_inactive'
      end,
      termination_attempts = u.termination_attempts + 1,
      termination_next_attempt_at = statement_timestamp() + interval '30 seconds'
  from due
  where u.id = due.id
  returning u.id, u.provider_call_id, u.termination_reason, u.termination_attempts;
end;
$$;
revoke all on function public.claim_due_professional_introducer_voice_terminations(integer) from public, anon, authenticated;
grant execute on function public.claim_due_professional_introducer_voice_terminations(integer) to service_role;

create or replace function public.complete_professional_introducer_voice_termination(p_reservation_id uuid, p_provider_call_id text)
returns boolean language sql volatile security invoker
set search_path = pg_catalog, public
as $$
  with updated as (
    update public.professional_introducer_voice_usage u
    set termination_status = 'terminated', terminated_at = statement_timestamp(), termination_last_error = null
    where u.id = p_reservation_id
      and (u.provider_call_id = p_provider_call_id or (u.provider_call_id is null and u.termination_status = 'awaiting_call_id'))
      and u.terminated_at is null
    returning 1
  ) select exists(select 1 from updated);
$$;
revoke all on function public.complete_professional_introducer_voice_termination(uuid, text) from public, anon, authenticated;
grant execute on function public.complete_professional_introducer_voice_termination(uuid, text) to service_role;

create or replace function public.retry_professional_introducer_voice_termination(
  p_reservation_id uuid, p_provider_call_id text, p_safe_error_code text
) returns boolean language plpgsql volatile security invoker
set search_path = pg_catalog, public
as $$
begin
  if p_safe_error_code is null or p_safe_error_code !~ '^[a-z0-9_-]{1,40}$' then p_safe_error_code := 'provider_error'; end if;
  update public.professional_introducer_voice_usage u
  set termination_status = 'retry',
      termination_next_attempt_at = statement_timestamp() +
        make_interval(secs => least(3600, (30 * power(2, least(u.termination_attempts, 7)))::integer)),
      termination_last_error = p_safe_error_code
  where u.id = p_reservation_id and u.provider_call_id = p_provider_call_id and u.terminated_at is null;
  return found;
end;
$$;
revoke all on function public.retry_professional_introducer_voice_termination(uuid, text, text) from public, anon, authenticated;
grant execute on function public.retry_professional_introducer_voice_termination(uuid, text, text) to service_role;

-- Root-only application APIs use this RPC to change project policy. Taking
-- the same project lock makes budget changes serialize with reservations.
create or replace function public.update_professional_introducer_voice_policy(
  p_enabled boolean default null,
  p_monthly_budget_gbp numeric default null,
  p_usd_per_gbp numeric default null,
  p_fx_period date default null,
  p_fx_source text default null,
  p_fx_safety_margin_percent integer default null,
  p_estimated_cost_per_minute_usd numeric default null,
  p_default_sessions_per_24h integer default null,
  p_default_max_session_seconds integer default null,
  p_completion_grace_seconds integer default null,
  p_warning_before_seconds integer default null,
  p_alert_threshold_percent integer default null
) returns boolean
language plpgsql
volatile
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_policy public.professional_introducer_voice_policy%rowtype;
begin
  if (p_monthly_budget_gbp is not null and p_monthly_budget_gbp < 0)
    or (p_usd_per_gbp is not null and p_usd_per_gbp <= 0)
    or (p_fx_safety_margin_percent is not null and p_fx_safety_margin_percent not between 0 and 100)
    or (p_fx_period is not null and extract(day from p_fx_period) <> 1)
    or (p_fx_source is not null and (length(btrim(p_fx_source)) < 3 or length(p_fx_source) > 300)) then
    return false;
  end if;
  if (p_default_max_session_seconds is not null and p_default_max_session_seconds not between 300 and 3600)
    or (p_completion_grace_seconds is not null and p_completion_grace_seconds not between 0 and 3600)
    or (p_warning_before_seconds is not null and p_warning_before_seconds not between 0 and 3600) then
    return false;
  end if;
  perform pg_advisory_xact_lock(707052, 1);
  select * into v_policy from public.professional_introducer_voice_policy where singleton is true for update;
  if not found
    or ((p_usd_per_gbp is not null or p_fx_period is not null or p_fx_source is not null)
      and (coalesce(p_usd_per_gbp, v_policy.usd_per_gbp) is null
        or coalesce(p_fx_period, v_policy.fx_period) <> date_trunc('month', statement_timestamp() at time zone 'Europe/London')::date
        or coalesce(nullif(btrim(p_fx_source), ''), nullif(btrim(v_policy.fx_source), '')) is null))
    or coalesce(p_default_max_session_seconds, v_policy.default_max_session_seconds)
      + (2 * coalesce(p_completion_grace_seconds, v_policy.completion_grace_seconds)) > 3600
    or coalesce(p_warning_before_seconds, v_policy.warning_before_seconds)
      >= coalesce(p_default_max_session_seconds, v_policy.default_max_session_seconds) then
    return false;
  end if;
  update public.professional_introducer_voice_policy
  set enabled = coalesce(p_enabled, enabled),
      monthly_budget_gbp = coalesce(p_monthly_budget_gbp, monthly_budget_gbp),
      usd_per_gbp = coalesce(p_usd_per_gbp, usd_per_gbp),
      fx_period = coalesce(p_fx_period, fx_period),
      fx_source = coalesce(p_fx_source, fx_source),
      fx_updated_at = case when p_usd_per_gbp is not null or p_fx_period is not null or p_fx_source is not null then statement_timestamp() else fx_updated_at end,
      fx_safety_margin_percent = coalesce(p_fx_safety_margin_percent, fx_safety_margin_percent),
      estimated_cost_per_minute_usd = coalesce(p_estimated_cost_per_minute_usd, estimated_cost_per_minute_usd),
      default_sessions_per_24h = coalesce(p_default_sessions_per_24h, default_sessions_per_24h),
      default_max_session_seconds = coalesce(p_default_max_session_seconds, default_max_session_seconds),
      completion_grace_seconds = coalesce(p_completion_grace_seconds, completion_grace_seconds),
      warning_before_seconds = coalesce(p_warning_before_seconds, warning_before_seconds),
      alert_threshold_percent = coalesce(p_alert_threshold_percent, alert_threshold_percent),
      updated_at = statement_timestamp()
  where singleton is true;
  return found;
end;
$$;
revoke all on function public.update_professional_introducer_voice_policy(boolean, numeric, numeric, date, text, integer, numeric, integer, integer, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.update_professional_introducer_voice_policy(boolean, numeric, numeric, date, text, integer, numeric, integer, integer, integer, integer, integer) to service_role;

-- Allocation edits use the identical project-before-user lock order as starts.
create or replace function public.update_professional_introducer_voice_allocation(
  p_user_id uuid,
  p_grant_id uuid,
  p_voice_coach_enabled boolean default null,
  p_update_sessions_override boolean default false,
  p_sessions_per_24h integer default null,
  p_update_duration_override boolean default false,
  p_max_session_seconds integer default null
) returns boolean
language plpgsql volatile security invoker
set search_path = pg_catalog, public
as $$
begin
  if p_user_id is null or p_grant_id is null
    or (p_update_sessions_override and p_sessions_per_24h is not null and p_sessions_per_24h < 0)
    or (p_update_duration_override and p_max_session_seconds is not null and p_max_session_seconds not between 300 and 3600) then
    return false;
  end if;
  perform pg_advisory_xact_lock(707052, 1);
  perform pg_advisory_xact_lock(707053, hashtext(p_user_id::text));
  update public.professional_introducer_demo_access g
  set voice_coach_enabled = coalesce(p_voice_coach_enabled, g.voice_coach_enabled),
      voice_sessions_per_24h_override = case when p_update_sessions_override then p_sessions_per_24h else g.voice_sessions_per_24h_override end,
      voice_max_session_seconds_override = case when p_update_duration_override then p_max_session_seconds else g.voice_max_session_seconds_override end
  where g.id = p_grant_id and g.user_id = p_user_id and g.revoked_at is null;
  return found;
end;
$$;
revoke all on function public.update_professional_introducer_voice_allocation(uuid, uuid, boolean, boolean, integer, boolean, integer) from public, anon, authenticated;
grant execute on function public.update_professional_introducer_voice_allocation(uuid, uuid, boolean, boolean, integer, boolean, integer) to service_role;

commit;
