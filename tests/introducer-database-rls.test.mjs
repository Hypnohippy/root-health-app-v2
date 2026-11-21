import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const baseline = await readFile(new URL('../supabase/migrations/20261118150000_pr70_introducer_sanitized_baseline.sql', import.meta.url), 'utf8');
const expiringPersonalAccess = await readFile(new URL('../supabase/migrations/20261118153000_pr70_expiring_personal_access.sql', import.meta.url), 'utf8');
const introducerVoiceUsage = await readFile(new URL('../supabase/migrations/20261119120000_pr70_introducer_voice_entitlement_and_usage.sql', import.meta.url), 'utf8');
const existingDemoMigrations = await Promise.all([
  readFile(new URL('../supabase/migrations/20261117061555_professional_introducer_demo.sql', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/migrations/20261117082900_professional_introducer_demo_workforce.sql', import.meta.url), 'utf8'),
]);

test('baseline stops before changes when supabase_admin has unsafe global API defaults', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon nologin;
      create role authenticated nologin;
      create role service_role nologin bypassrls;
      create role supabase_admin nologin;
      alter default privileges for role supabase_admin grant all on tables to anon;
    `);
    await assert.rejects(db.exec(baseline), /unexpected global API-role defaults/i);
    await db.exec('rollback');
    const tables = await db.query(`select count(*)::int as count from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p')`);
    assert.equal(tables.rows[0].count, 0);
  } finally { await db.close(); }
});

test('baseline is compatible with the verified four-table Preview state and preserves all existing demo rows', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon nologin;
      create role authenticated nologin;
      create role service_role nologin bypassrls;
      create role supabase_admin nologin;
      create schema auth;
      create table auth.users (id uuid primary key);
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    `);
    for (const migration of existingDemoMigrations) await db.exec(migration);
    const user = '10000000-0000-4000-8000-000000000001';
    await db.exec(`
      insert into auth.users(id) values ('${user}');
      insert into public.professional_introducer_demo_access(user_id, consultant_label, expires_at)
        values ('${user}', 'Preserved Reviewer', now() + interval '2 days');
      insert into public.professional_introducer_demo_members(access_grant_id, employee_key, display_name, department)
        select id, 'employee-01', 'Fictional Employee', 'Operations'
        from public.professional_introducer_demo_access where user_id = '${user}';
      insert into public.professional_introducer_demo_assessments(
        access_grant_id, employee_key, assessment_key, assessment_type,
        stress_score, sleep_score, recovery_score, energy_score, mood_score, focus_score, burnout_score
      ) select id, 'employee-01', 'seed:baseline-01', 'baseline', 4, 6, 6, 6, 7, 6, 3
        from public.professional_introducer_demo_access where user_id = '${user}';
      insert into public.professional_introducer_demo_requests(
        access_grant_id, consultant_user_id, consultant_label, organisation_name,
        reason_for_interest, desired_next_step
      ) select id, '${user}', 'Preserved Reviewer', 'Example Prospect',
        'Asked for a fictional product walkthrough', 'product_demonstration'
        from public.professional_introducer_demo_access where user_id = '${user}';
    `);
    await db.exec(baseline);
    await db.exec(expiringPersonalAccess);
    await db.exec(introducerVoiceUsage);
    const preserved = await db.query(`
      select
        (select count(*)::int from public.professional_introducer_demo_access) as grants,
        (select count(*)::int from public.professional_introducer_demo_members) as members,
        (select count(*)::int from public.professional_introducer_demo_assessments) as assessments,
        (select count(*)::int from public.professional_introducer_demo_requests) as requests,
        (select demo_organisation_id is null from public.professional_introducer_demo_access limit 1) as grant_unmapped
    `);
    assert.deepEqual(preserved.rows[0], { grants: 1, members: 1, assessments: 1, requests: 1, grant_unmapped: true });
    const enabled = await db.query(`
      select count(*)::int as count from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relname in (
        'professional_introducer_demo_access','professional_introducer_demo_requests',
        'professional_introducer_demo_members','professional_introducer_demo_assessments'
      ) and c.relrowsecurity
    `);
    assert.equal(enabled.rows[0].count, 4);
  } finally { await db.close(); }
});

async function fixture() {
  const db = new PGlite();
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    create role supabase_admin nologin;
    create schema auth;
    create schema other_schema;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to authenticated;
    grant execute on function auth.uid() to authenticated;
    alter default privileges for role supabase_admin in schema public
      grant select, insert, update, delete on tables to anon, authenticated;
    alter default privileges for role supabase_admin in schema public
      grant usage, select on sequences to anon, authenticated;
    alter default privileges for role supabase_admin in schema public
      grant execute on functions to anon, authenticated;
    alter default privileges for role supabase_admin in schema other_schema
      grant select on tables to authenticated;
    alter default privileges for role supabase_admin in schema other_schema
      grant execute on functions to authenticated;
  `);
  for (const migration of existingDemoMigrations) await db.exec(migration);
  await db.exec(`
    create function public.rls_auto_enable() returns trigger
      language plpgsql security definer set search_path = pg_catalog as
      $$ begin new.reason_for_interest := 'trigger dependency preserved'; return new; end $$;
    grant execute on function public.rls_auto_enable() to public, anon, authenticated;
    create trigger rls_auto_enable_preview_fixture
      before insert on public.professional_introducer_demo_requests
      for each row execute function public.rls_auto_enable();
    create function public.unsafe_fixture_rpc() returns text language sql security definer
      as $$ select 'should not be callable'::text $$;
    grant execute on function public.unsafe_fixture_rpc() to public, anon, authenticated;
  `);
  await db.exec(baseline);
  await db.exec(expiringPersonalAccess);
  await db.exec(introducerVoiceUsage);
  await db.exec(`update public.professional_introducer_voice_policy
    set usd_per_gbp=1.5, fx_period=date_trunc('month', now() at time zone 'Europe/London')::date,
      fx_source='HMRC monthly USD per GBP', fx_updated_at=now() where singleton=true;`);
  const userA = '10000000-0000-4000-8000-000000000001';
  const userB = '10000000-0000-4000-8000-000000000002';
  await db.exec(`
    insert into auth.users(id) values ('${userA}'), ('${userB}');
    insert into public.profiles(user_id, profile_key, name)
      values ('${userA}', 'private-a', 'A'), ('${userB}', 'private-b', 'B');
    insert into public.wellbeing_assessments(profile_key, user_id, stress_score)
      values ('private-a', '${userA}', 4), ('private-b', '${userB}', 8);
    insert into public.journal_entries(profile_key, user_id, content)
      values ('private-a', '${userA}', 'private journal A'), ('private-b', '${userB}', 'private journal B');
    insert into public.mind_entries(profile_key, user_id, situation)
      values ('private-a', '${userA}', 'private mind A'), ('private-b', '${userB}', 'private mind B');
    insert into public.organisations(id, name, status)
      values ('20000000-0000-4000-8000-000000000001', 'Fictional demo', 'demo');
    insert into public.organisation_members(organisation_id, profile_key, name, role)
      values ('20000000-0000-4000-8000-000000000001', 'fictional-employee', 'Fictional Employee', 'employee');
    insert into public.organisation_members(organisation_id, profile_key, name, role, user_id)
      values ('20000000-0000-4000-8000-000000000001', 'hr-demo-user', 'Introducer HR', 'hr_admin', '${userA}');
    insert into public.wellbeing_assessments(profile_key, user_id, organisation_id, stress_score)
      values ('fictional-employee', null, '20000000-0000-4000-8000-000000000001', 6);
    insert into public.professional_introducer_demo_access
      (id, user_id, consultant_label, created_at, expires_at, demo_organisation_id)
      values ('40000000-0000-4000-8000-000000000001', '${userA}', 'Internal reviewer', now() - interval '2 days', now() + interval '1 day', '20000000-0000-4000-8000-000000000001');
  `);
  return { db, userA, userB };
}

async function asUser(db, userId, sql) {
  await db.exec('reset role;');
  await db.exec(`select set_config('request.jwt.claim.sub', '${userId}', false); set role authenticated;`);
  try { return await db.query(sql); }
  finally { await db.exec('reset role;'); }
}

test('baseline is a sanitized allowlist with no source policies or definer routines', () => {
  const sql = baseline.split(/\r?\n/).filter(line => !line.trim().startsWith('--')).join('\n');
  assert.match(baseline, /1531B4E360A56F17614EF299AE8AC638AE57F68AA879F343FA0CEE66BC3AF7E0/);
  assert.doesNotMatch(sql, /security\s+definer/i);
  assert.doesNotMatch(sql, /create\s+policy\s+.*using\s*\(\s*true\s*\)/i);
  assert.doesNotMatch(sql, /^\s*(?:insert\s+into|copy\s+public\.)/im);
  assert.doesNotMatch(sql, /create\s+(?:or\s+replace\s+)?function\b/i);
  assert.doesNotMatch(sql, /alter\s+default\s+privileges[^;]*\bfunctions\b/is);
  assert.doesNotMatch(sql, /(?:drop|alter)\s+event\s+trigger|create\s+or\s+replace\s+function\s+public\.rls_auto_enable/i);
  assert.match(sql, /revoke\s+all\s+on\s+function\s+public\.rls_auto_enable\(\)\s+from\s+public,\s*anon,\s*authenticated/i);
  assert.match(sql, /function privilege verification failed/i);
  for (const excluded of ['personal_subscriptions', 'organisation_setup_invites', 'organisation_hr_invites', 'organisation_commercial_documents', 'organisation_commissions', 'consumer_capacity_leads']) {
    assert.doesNotMatch(sql, new RegExp(`create\\s+table\\s+(?:if\\s+not\\s+exists\\s+)?public\\.${excluded}\\b`, 'i'));
  }
});

test('authenticated user reads and appends only their own personal records', async () => {
  const { db, userA } = await fixture();
  try {
    const own = await asUser(db, userA, `select profile_key, stress_score from public.wellbeing_assessments order by stress_score`);
    assert.deepEqual(own.rows, [{ profile_key: 'private-a', stress_score: 4 }]);
    await asUser(db, userA, `insert into public.wellbeing_assessments(profile_key, stress_score) values ('private-a', 2)`);
    const count = await asUser(db, userA, `select count(*)::int as count from public.wellbeing_assessments`);
    assert.equal(count.rows[0].count, 2);
  } finally { await db.close(); }
});

test('personal Direct Supabase access stops immediately on grant expiry or revocation', async () => {
  const { db, userA, userB } = await fixture();
  try {
    const noGrant = await asUser(db, userB, `select profile_key from public.profiles where user_id = '${userB}'`);
    assert.deepEqual(noGrant.rows, []);
    await db.exec(`update public.professional_introducer_demo_access set demo_organisation_id = null where user_id = '${userA}'`);
    assert.deepEqual((await asUser(db, userA, `select profile_key from public.profiles where user_id = '${userA}'`)).rows, [], 'an unassigned grant is not activated for personal use');
    await db.exec(`update public.professional_introducer_demo_access set demo_organisation_id = '20000000-0000-4000-8000-000000000001' where user_id = '${userA}'`);
    assert.deepEqual((await asUser(db, userA, `select profile_key from public.profiles where user_id = '${userA}'`)).rows, [{ profile_key: 'private-a' }], 'Root mapping activates the already-approved grant');
    const helperPrivileges = await db.query(`
      select has_function_privilege('anon','public.professional_introducer_access_active()','execute') as anon_execute,
        has_function_privilege('authenticated','public.professional_introducer_access_active()','execute') as auth_execute
    `);
    assert.deepEqual(helperPrivileges.rows[0], { anon_execute: false, auth_execute: true });

    await db.exec(`update public.professional_introducer_demo_access set expires_at = now() - interval '1 second' where user_id = '${userA}'`);
    for (const query of [
      `select * from public.profiles where user_id = '${userA}'`,
      `select * from public.wellbeing_assessments where user_id = '${userA}'`,
      `select * from public.journal_entries where user_id = '${userA}'`,
      `select * from public.mind_entries where user_id = '${userA}'`,
    ]) assert.deepEqual((await asUser(db, userA, query)).rows, []);
    await assert.rejects(
      asUser(db, userA, `insert into public.wellbeing_assessments(profile_key, user_id, stress_score) values ('private-a', '${userA}', 3)`),
      /row-level security|permission/i,
    );

    await db.exec(`update public.professional_introducer_demo_access set expires_at = now() + interval '1 day', revoked_at = now() where user_id = '${userA}'`);
    assert.deepEqual((await asUser(db, userA, `select * from public.profiles where user_id = '${userA}'`)).rows, []);
    await assert.rejects(
      asUser(db, userA, `insert into public.journal_entries(profile_key, user_id, content) values ('private-a', '${userA}', 'after revoke')`),
      /row-level security|permission/i,
    );
  } finally { await db.close(); }
});

test('Voice Coach entitlement and project policy default off; direct API use is denied and the service reservation returns configured allowance data', async () => {
  const { db, userA } = await fixture();
  const grantId = '40000000-0000-4000-8000-000000000001';
  try {
    const grant = await db.query(`select voice_coach_enabled from public.professional_introducer_demo_access where id='${grantId}'`);
    assert.equal(grant.rows[0].voice_coach_enabled, false);
    const policy = await db.query('select enabled, server_termination_ready, monthly_budget_gbp, default_sessions_per_24h, default_max_session_seconds from public.professional_introducer_voice_policy');
    assert.deepEqual(policy.rows[0], { enabled: false, server_termination_ready: false, monthly_budget_gbp: '10.0000', default_sessions_per_24h: 3, default_max_session_seconds: 1800 });

    await assert.rejects(asUser(db, userA, 'select * from public.professional_introducer_voice_usage'), /permission denied/i);
    await assert.rejects(asUser(db, userA, 'select * from public.professional_introducer_voice_policy'), /permission denied/i);
    await assert.rejects(asUser(db, userA, `select public.reserve_professional_introducer_voice_session('${userA}', '${grantId}')`), /permission denied/i);
    await assert.rejects(asUser(db, userA,
      'select public.update_professional_introducer_voice_policy(p_enabled => true)'), /permission denied/i);

    await db.exec('set role service_role');
    const disabled = await db.query(`select * from public.reserve_professional_introducer_voice_session('${userA}', '${grantId}')`);
    assert.equal(disabled.rows[0].allowed, false);
    assert.equal(disabled.rows[0].denial_reason, 'voice_policy_disabled');
    await db.exec('reset role');

    await db.exec(`update public.professional_introducer_demo_access set voice_coach_enabled=true where id='${grantId}';
      update public.professional_introducer_voice_policy set enabled=true,server_termination_ready=true,
        usd_per_gbp=null,fx_period=null,fx_source=null where singleton=true;
      set role service_role;`);
    const missingFx = await db.query(`select * from public.reserve_professional_introducer_voice_session('${userA}', '${grantId}')`);
    assert.equal(missingFx.rows[0].allowed, false);
    assert.equal(missingFx.rows[0].denial_reason, 'monthly_fx_rate_unconfigured');
    const loggedDenial = await db.query(`select count(*)::int as count from public.professional_introducer_voice_denials
      where user_id='${userA}' and denial_reason='monthly_fx_rate_unconfigured'`);
    assert.equal(loggedDenial.rows[0].count, 1);
    await db.exec('reset role');
    await db.exec('update public.professional_introducer_voice_policy set server_termination_ready=false where singleton=true');

    await db.exec('set role service_role');
    const configured = await db.query(
      `select public.update_professional_introducer_voice_policy(p_enabled => true,
        p_usd_per_gbp => 1.5, p_fx_period => date_trunc('month', now() at time zone 'Europe/London')::date,
        p_fx_source => 'HMRC monthly USD per GBP') as updated`,
    );
    assert.equal(configured.rows[0].updated, true);
    const missingTerminator = await db.query(`select * from public.reserve_professional_introducer_voice_session('${userA}', '${grantId}')`);
    assert.equal(missingTerminator.rows[0].allowed, false);
    assert.equal(missingTerminator.rows[0].denial_reason, 'voice_termination_not_ready');
    await db.exec('reset role');
    // Test-only fixture state models post-worker acceptance. No remote setting
    // is changed and the migration itself leaves this bit false.
    await db.exec('update public.professional_introducer_voice_policy set server_termination_ready=true where singleton=true');
    await db.exec(`update public.professional_introducer_demo_access set voice_coach_enabled=true where id='${grantId}'`);
    await db.exec('set role service_role');
    const first = await db.query(`select * from public.reserve_professional_introducer_voice_session('${userA}', '${grantId}')`);
    const second = await db.query(`select * from public.reserve_professional_introducer_voice_session('${userA}', '${grantId}')`);
    await db.exec('reset role');
    assert.equal(first.rows[0].allowed, true);
    assert.equal(first.rows[0].max_session_seconds, 3600);
    assert.equal(first.rows[0].planned_session_seconds, 1800);
    assert.equal(first.rows[0].completion_grace_seconds, 900);
    assert.equal(first.rows[0].warning_before_seconds, 300);
    assert.equal(Number(first.rows[0].reserved_cost_usd), 12);
    assert.equal(Number(first.rows[0].reserved_cost_gbp), 8.8);
    assert.equal(second.rows[0].allowed, false);
    assert.equal(second.rows[0].denial_reason, 'active_session');
  } finally { await db.close(); }
});

test('concurrent different-user starts serialize against one configurable project spend budget', async () => {
  const { db, userA, userB } = await fixture();
  const grantA = '40000000-0000-4000-8000-000000000001';
  const grantB = '40000000-0000-4000-8000-000000000002';
  try {
    await db.exec(`
      insert into public.professional_introducer_demo_access
        (id, user_id, consultant_label, created_at, expires_at, demo_organisation_id, voice_coach_enabled)
      values ('${grantB}', '${userB}', 'Concurrent B', now(), now() + interval '1 day',
        '20000000-0000-4000-8000-000000000001', true);
      update public.professional_introducer_demo_access set voice_coach_enabled=true where id='${grantA}';
      update public.professional_introducer_voice_policy
        set enabled=true, server_termination_ready=true, monthly_budget_gbp=9.99, default_max_session_seconds=1800,
          completion_grace_seconds=900,warning_before_seconds=300
        where singleton=true;
    `);
    await db.exec('set role service_role');
    const [resultA, resultB] = await Promise.all([
      db.query(`select * from public.reserve_professional_introducer_voice_session('${userA}', '${grantA}')`),
      db.query(`select * from public.reserve_professional_introducer_voice_session('${userB}', '${grantB}')`),
    ]);
    await db.exec('reset role');
    assert.deepEqual([resultA.rows[0].allowed, resultB.rows[0].allowed].sort(), [false, true]);
    const total = await db.query('select count(*)::int as count, sum(reserved_cost_gbp)::numeric(12,6) as reserved from public.professional_introducer_voice_usage');
    assert.equal(total.rows[0].count, 1);
    assert.ok(Number(total.rows[0].reserved) <= 12.99);
  } finally { await db.close(); }
});

test('server termination queue persists provider call IDs, detects revoked/expired grants, retries, and survives user or grant deletion', async () => {
  const { db, userA } = await fixture();
  const grantId = '40000000-0000-4000-8000-000000000001';
  const callId = 'rtc_preview-call_123';
  try {
    await db.exec(`
      update public.professional_introducer_demo_access set voice_coach_enabled=true where id='${grantId}';
      update public.professional_introducer_voice_policy set enabled=true,server_termination_ready=true where singleton=true;
      set role service_role;
    `);
    const reserved = await db.query(`select * from public.reserve_professional_introducer_voice_session('${userA}','${grantId}')`);
    assert.equal(reserved.rows[0].allowed, true);
    const reservationId = reserved.rows[0].reservation_id;
    const attached = await db.query(`select * from public.attach_professional_introducer_voice_call('${reservationId}','${userA}','${grantId}','${callId}')`);
    assert.deepEqual(attached.rows[0], { attached: true, terminate_now: false });
    await db.exec('reset role');

    // Grant revocation makes the call immediately due for the server worker.
    await db.exec(`update public.professional_introducer_demo_access set revoked_at=now() where id='${grantId}'; set role service_role;`);
    const claim = await db.query('select * from public.claim_due_professional_introducer_voice_terminations(20)');
    assert.equal(claim.rows.length, 1);
    assert.equal(claim.rows[0].reservation_id, reservationId);
    assert.equal(claim.rows[0].provider_call_id, callId);
    assert.equal(claim.rows[0].termination_reason, 'grant_inactive');

    await db.query(`select public.retry_professional_introducer_voice_termination('${reservationId}','${callId}','provider_http_503')`);
    await db.exec(`update public.professional_introducer_voice_usage set termination_status='terminating',termination_next_attempt_at=now()-interval '1 second' where id='${reservationId}';`);
    const reclaimed = await db.query('select * from public.claim_due_professional_introducer_voice_terminations(20)');
    assert.equal(reclaimed.rows.length, 1, 'worker crash after claim must leave the row reclaimable');
    assert.equal(reclaimed.rows[0].attempt, 2);

    const completed = await db.query(`select public.complete_professional_introducer_voice_termination('${reservationId}','${callId}') as done`);
    assert.equal(completed.rows[0].done, true);
    await db.exec('reset role');
    await db.exec(`delete from public.professional_introducer_demo_access where id='${grantId}';`);
    await db.exec(`delete from auth.users where id='${userA}';`);
    const receipt = await db.query(`select provider_call_id,grant_id,termination_status,reserved_cost_gbp,actual_cost_gbp from public.professional_introducer_voice_usage where id='${reservationId}'`);
    assert.deepEqual(receipt.rows[0], { provider_call_id: callId, grant_id: null, termination_status: 'terminated', reserved_cost_gbp: '8.800000', actual_cost_gbp: null }, 'confirmed hang-up alone does not imply final provider cost or release the conservative reservation');
    await db.exec('reset role');
  } finally { await db.close(); }
});

test('call creation without a persisted provider ID fails closed until Root can resolve the orphan receipt', async () => {
  const { db, userA } = await fixture();
  const grantId = '40000000-0000-4000-8000-000000000001';
  try {
    await db.exec(`
      update public.professional_introducer_demo_access set voice_coach_enabled=true where id='${grantId}';
      update public.professional_introducer_voice_policy set enabled=true,server_termination_ready=true where singleton=true;
      set role service_role;
    `);
    const reserved = await db.query(`select * from public.reserve_professional_introducer_voice_session('${userA}','${grantId}')`);
    const reservationId = reserved.rows[0].reservation_id;
    const pending = await db.query(`select termination_status,termination_last_error from public.professional_introducer_voice_usage where id='${reservationId}'`);
    assert.deepEqual(pending.rows[0], { termination_status: 'awaiting_call_id', termination_last_error: 'provider_call_id_pending' });
    const secondStart = await db.query(`select * from public.reserve_professional_introducer_voice_session('${userA}','${grantId}')`);
    assert.equal(secondStart.rows[0].allowed, false);
    assert.equal(secondStart.rows[0].denial_reason, 'active_session');

    const released = await db.query(`select public.mark_professional_introducer_voice_creation_failed('${reservationId}','${userA}') as released`);
    assert.equal(released.rows[0].released, true);
    const afterRelease = await db.query(`select termination_status,terminated_at is not null as closed,reserved_cost_usd,reserved_cost_gbp from public.professional_introducer_voice_usage where id='${reservationId}'`);
    assert.deepEqual(afterRelease.rows[0], { termination_status: 'creation_failed', closed: true, reserved_cost_usd: '12.000000', reserved_cost_gbp: '8.800000' });
  } finally { await db.close(); }
});

test('Voice completion extension is owner-bound, one-time, grant-aware and never moves the provider hard expiry', async () => {
  const { db, userA, userB } = await fixture();
  const grantId = '40000000-0000-4000-8000-000000000001';
  const callId = 'rtc_extend_123';
  try {
    await db.exec(`
      update public.professional_introducer_demo_access set voice_coach_enabled=true where id='${grantId}';
      update public.professional_introducer_voice_policy set enabled=true,server_termination_ready=true where singleton=true;
      set role service_role;
    `);
    const reserved = await db.query(`select * from public.reserve_professional_introducer_voice_session('${userA}','${grantId}')`);
    assert.equal(reserved.rows[0].allowed, true);
    const reservationId = reserved.rows[0].reservation_id;
    await db.query(`select * from public.attach_professional_introducer_voice_call('${reservationId}','${userA}','${grantId}','${callId}')`);
    await db.exec(`update public.professional_introducer_voice_usage
      set started_at=started_at-interval '2 minutes',
        planned_session_expires_at=started_at-interval '90 seconds',
        session_expires_at=now()+interval '30 seconds',
        provider_hard_expires_at=started_at+interval '50 minutes',
        termination_next_attempt_at=now()+interval '30 seconds'
      where id='${reservationId}';`);
    const hardExpiryBefore = await db.query(`select provider_hard_expires_at from public.professional_introducer_voice_usage where id='${reservationId}'`);
    const wrongOwner = await db.query(`select public.extend_professional_introducer_voice_completion('${reservationId}','${userB}','${grantId}') as extended`);
    assert.equal(wrongOwner.rows[0].extended, false);
    const extended = await db.query(`select public.extend_professional_introducer_voice_completion('${reservationId}','${userA}','${grantId}') as extended`);
    assert.equal(extended.rows[0].extended, true);
    const after = await db.query(`select session_expires_at,provider_hard_expires_at,completion_extension_used_at from public.professional_introducer_voice_usage where id='${reservationId}'`);
    assert.ok(after.rows[0].completion_extension_used_at);
    assert.equal(Date.parse(after.rows[0].session_expires_at), Date.parse(hardExpiryBefore.rows[0].provider_hard_expires_at));
    assert.equal(Date.parse(after.rows[0].provider_hard_expires_at), Date.parse(hardExpiryBefore.rows[0].provider_hard_expires_at));
    const idempotentRetry = await db.query(`select public.extend_professional_introducer_voice_completion('${reservationId}','${userA}','${grantId}') as extended`);
    assert.equal(idempotentRetry.rows[0].extended, true);
    await db.exec(`update public.professional_introducer_demo_access set revoked_at=now() where id='${grantId}';`);
    const afterRevoke = await db.query(`select public.extend_professional_introducer_voice_completion('${reservationId}','${userA}','${grantId}') as extended`);
    assert.equal(afterRevoke.rows[0].extended, false);
    await db.exec('reset role');
    const privileges = await db.query(`select has_function_privilege('anon','public.extend_professional_introducer_voice_completion(uuid,uuid,uuid)','execute') as anon_execute,
      has_function_privilege('authenticated','public.extend_professional_introducer_voice_completion(uuid,uuid,uuid)','execute') as auth_execute`);
    assert.deepEqual(privileges.rows[0], { anon_execute: false, auth_execute: false });
  } finally { await db.close(); }
});

test('no platform-wide session-count ceiling; per-introducer limits and duration overrides remain configurable', async () => {
  const { db, userA } = await fixture();
  const org = '20000000-0000-4000-8000-000000000001';
  try {
    const ids = Array.from({ length: 7 }, (_, index) =>
      `10000000-0000-4000-8000-${String(index + 10).padStart(12, '0')}`);
    const grantIds = Array.from({ length: 7 }, (_, index) =>
      `40000000-0000-4000-8000-${String(index + 10).padStart(12, '0')}`);
    for (let index = 0; index < ids.length; index += 1) {
      await db.exec(`
        insert into auth.users(id) values ('${ids[index]}');
        insert into public.professional_introducer_demo_access
          (id, user_id, consultant_label, created_at, expires_at, demo_organisation_id, voice_coach_enabled,
           voice_sessions_per_24h_override, voice_max_session_seconds_override)
        values ('${grantIds[index]}', '${ids[index]}', 'Scale ${index}', now(), now() + interval '1 day', '${org}', true,
          2, 600);
      `);
    }
    await db.exec('update public.professional_introducer_voice_policy set enabled=true, server_termination_ready=true, monthly_budget_gbp=1000 where singleton=true; set role service_role;');
    const results = [];
    for (let index = 0; index < ids.length; index += 1) {
      const result = await db.query(`select * from public.reserve_professional_introducer_voice_session('${ids[index]}', '${grantIds[index]}')`);
      results.push(result.rows[0]);
      await db.exec('reset role; set role postgres;');
      await db.exec(`update public.professional_introducer_voice_usage
        set started_at=now()-interval '2 minutes', planned_session_expires_at=now()-interval '2 seconds',
          session_expires_at=now()-interval '1 second'
        where user_id='${ids[index]}'`);
      await db.exec('set role service_role;');
    }
    await db.exec('reset role');
    assert.equal(results.filter((row) => row.allowed).length, 7);
    assert.ok(results.every((row) => row.max_session_seconds === 2400));
    assert.equal(Number(results[0].reserved_cost_usd), 8);

    await db.exec(`update public.professional_introducer_demo_access set voice_sessions_per_24h_override=0 where user_id='${ids[0]}'`);
    await db.exec('set role service_role');
    const denied = await db.query(`select * from public.reserve_professional_introducer_voice_session('${ids[0]}', '${grantIds[0]}')`);
    await db.exec('reset role');
    assert.equal(denied.rows[0].allowed, false);
    assert.equal(denied.rows[0].denial_reason, 'user_allocation_disabled');
    assert.equal(userA, '10000000-0000-4000-8000-000000000001');
  } finally { await db.close(); }
});

test('direct cross-user reads return no records and cross-user writes are rejected', async () => {
  const { db, userA } = await fixture();
  try {
    const leaked = await asUser(db, userA, `select * from public.wellbeing_assessments where profile_key = 'private-b'`);
    assert.deepEqual(leaked.rows, []);
    const journal = await asUser(db, userA, `select content from public.journal_entries where profile_key = 'private-b'`);
    assert.deepEqual(journal.rows, []);
    const mind = await asUser(db, userA, `select situation from public.mind_entries where profile_key = 'private-b'`);
    assert.deepEqual(mind.rows, []);
    await assert.rejects(
      asUser(db, userA, `insert into public.journal_entries(profile_key, content) values ('private-b', 'attempt')`),
      /row-level security|permission|foreign key/i,
    );
    await assert.rejects(
      asUser(db, userA, `insert into public.wellbeing_assessments(profile_key, user_id, stress_score) values ('private-b', '${userA}', 2)`),
      /row-level security|permission|foreign key/i,
    );
    await assert.rejects(
      asUser(db, userA, `update public.profiles set user_id = '10000000-0000-4000-8000-000000000002' where profile_key = 'private-a'`),
      /permission/i,
    );
  } finally { await db.close(); }
});

test('personal evidence cannot be attached to the fictional employer', async () => {
  const { db, userA } = await fixture();
  try {
    await assert.rejects(
      asUser(db, userA, `insert into public.wellbeing_assessments(profile_key, organisation_id, stress_score) values ('private-a', '20000000-0000-4000-8000-000000000001', 3)`),
      /row-level security|permission/i,
    );
    const rawEmployerEvidence = await asUser(db, userA,
      `select * from public.wellbeing_assessments where organisation_id = '20000000-0000-4000-8000-000000000001'`);
    assert.deepEqual(rawEmployerEvidence.rows, []);
  } finally { await db.close(); }
});

test('only an unexpired, non-revoked grant can read fictional HR setup; raw workforce evidence remains hidden', async () => {
  const { db, userA, userB } = await fixture();
  try {
    const orgA = await asUser(db, userA, `select name from public.organisations`);
    assert.deepEqual(orgA.rows, [{ name: 'Fictional demo' }]);
    const membersA = await asUser(db, userA, `select name, role from public.organisation_members order by role`);
    assert.equal(membersA.rows.length, 2);
    const rawEvidence = await asUser(db, userA, `select * from public.wellbeing_assessments where organisation_id is not null`);
    assert.deepEqual(rawEvidence.rows, []);
    const orgB = await asUser(db, userB, `select id from public.organisations`);
    assert.deepEqual(orgB.rows, []);
    await db.exec(`update public.professional_introducer_demo_access set expires_at = now() - interval '1 second' where user_id = '${userA}';`);
    const expired = await asUser(db, userA, `select id from public.organisations`);
    assert.deepEqual(expired.rows, []);
    await db.exec(`update public.professional_introducer_demo_access set expires_at = now() + interval '1 day', revoked_at = now() where user_id = '${userA}';`);
    const revoked = await asUser(db, userA, `select id from public.organisations`);
    assert.deepEqual(revoked.rows, []);
    await db.exec(`set role service_role;`);
    const aggregateSource = await db.query(`select count(*)::int as count from public.wellbeing_assessments`);
    assert.equal(aggregateSource.rows[0].count, 3);
    await db.exec('reset role;');
  } finally { await db.close(); }
});

test('anonymous and authenticated direct access cannot provision, promote, invite, or bill', async () => {
  const { db, userA } = await fixture();
  try {
    await db.exec(`set role anon;`);
    await assert.rejects(db.query('select * from public.profiles'), /permission/i);
    await db.exec('reset role;');
    await db.exec(`select set_config('request.jwt.claim.sub', '${userA}', false); set role authenticated;`);
    for (const sql of [
      `insert into public.profiles(user_id, profile_key) values ('${userA}', 'extra')`,
      `insert into public.organisations(name, status) values ('Attacker org', 'demo')`,
      `update public.organisation_members set role = 'organisation_admin'`,
      `update public.professional_introducer_demo_access set demo_organisation_id = null`,
      `insert into public.organisation_members(organisation_id, profile_key, role) values ('20000000-0000-4000-8000-000000000001', 'new-member', 'hr_admin')`,
      `insert into public.professional_introducer_demo_requests(id) values ('30000000-0000-4000-8000-000000000001')`,
      `select public.unsafe_fixture_rpc()`,
    ]) await assert.rejects(db.query(sql), /permission|function|row-level security/i);
    await db.exec('reset role;');
  } finally { await db.close(); }
});

test('RLS is enabled for every allowlisted table and client access is explicit', async () => {
  const { db } = await fixture();
  try {
    const rls = await db.query(`select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and not c.relrowsecurity order by c.relname`);
    assert.deepEqual(rls.rows, []);
    const grants = await db.query(`select has_table_privilege('authenticated','public.organisation_members','select') as member_read, has_table_privilege('authenticated','public.organisations','insert') as org_insert, has_table_privilege('authenticated','public.professional_introducer_demo_access','select') as grant_read`);
    assert.deepEqual(grants.rows[0], { member_read: true, org_insert: false, grant_read: true });
    const exec = await db.query(`select has_function_privilege('anon','public.unsafe_fixture_rpc()','execute') as anon_exec, has_function_privilege('authenticated','public.unsafe_fixture_rpc()','execute') as auth_exec`);
    assert.deepEqual(exec.rows[0], { anon_exec: false, auth_exec: false });
    await db.exec(`create function public.future_client_rpc() returns integer language sql as $$ select 1 $$;
      revoke all on function public.future_client_rpc() from public, anon, authenticated;`);
    const futureExec = await db.query(`select has_function_privilege('anon','public.future_client_rpc()','execute') as anon_exec, has_function_privilege('authenticated','public.future_client_rpc()','execute') as auth_exec`);
    assert.deepEqual(futureExec.rows[0], { anon_exec: false, auth_exec: false });
    const existingDefiner = await db.query(`
      select has_function_privilege('anon','public.rls_auto_enable()','execute') as anon_exec,
        has_function_privilege('authenticated','public.rls_auto_enable()','execute') as auth_exec,
        (select count(*)::int from pg_trigger where tgname='rls_auto_enable_preview_fixture' and not tgisinternal) as trigger_count
    `);
    assert.deepEqual(existingDefiner.rows[0], { anon_exec: false, auth_exec: false, trigger_count: 1 });

    await db.exec(`grant usage, create on schema public to supabase_admin; set role supabase_admin;
      create table public.future_admin_table(id bigint generated by default as identity primary key);
      create function public.future_admin_rpc() returns integer language sql as $$ select 1 $$;
      insert into public.future_admin_table default values;
      reset role;
      -- Model the already-verified ensure_rls event trigger action for a newly
      -- created public table. PGlite does not execute PostgreSQL event triggers.
      alter table public.future_admin_table enable row level security;`);
    const futureAdminPrivileges = await db.query(`
      select has_table_privilege('anon','public.future_admin_table','select') as anon_select,
        has_table_privilege('authenticated','public.future_admin_table','select') as auth_select,
        has_sequence_privilege('anon','public.future_admin_table_id_seq','usage') as anon_sequence,
        has_sequence_privilege('authenticated','public.future_admin_table_id_seq','usage') as auth_sequence,
        has_function_privilege('anon','public.future_admin_rpc()','execute') as anon_execute,
        has_function_privilege('authenticated','public.future_admin_rpc()','execute') as auth_execute,
        (select relrowsecurity from pg_class where oid='public.future_admin_table'::regclass) as rls_enabled
    `);
    assert.deepEqual(futureAdminPrivileges.rows[0], {
      anon_select: true, auth_select: true,
      anon_sequence: true, auth_sequence: true,
      anon_execute: true, auth_execute: true,
      rls_enabled: true,
    });
    await db.exec(`select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', false); set role authenticated;`);
    const futureRows = await db.query('select * from public.future_admin_table');
    assert.deepEqual(futureRows.rows, [], 'managed default SELECT grant is blocked by RLS without a policy');
    await assert.rejects(db.query('insert into public.future_admin_table default values'), /row-level security|permission/i);
    await db.exec('reset role;');

    const managedDefaults = await db.query(`
      select
        exists (
          select 1 from pg_default_acl d cross join lateral aclexplode(d.defaclacl) a
          where d.defaclrole='supabase_admin'::regrole
            and d.defaclnamespace='public'::regnamespace
            and d.defaclobjtype='r' and a.grantee='authenticated'::regrole
            and a.privilege_type='SELECT'
        ) as managed_table_default_preserved,
        exists (
          select 1 from pg_default_acl d cross join lateral aclexplode(d.defaclacl) a
          where d.defaclrole='supabase_admin'::regrole
            and d.defaclnamespace='public'::regnamespace
            and d.defaclobjtype='S' and a.grantee='authenticated'::regrole
            and a.privilege_type='USAGE'
        ) as managed_sequence_default_preserved,
        exists (
          select 1 from pg_default_acl d cross join lateral aclexplode(d.defaclacl) a
          where d.defaclrole='supabase_admin'::regrole
            and d.defaclnamespace='public'::regnamespace
            and d.defaclobjtype='f' and a.grantee='authenticated'::regrole
            and a.privilege_type='EXECUTE'
        ) as managed_function_default_preserved
    `);
    assert.deepEqual(managedDefaults.rows[0], {
      managed_table_default_preserved: true,
      managed_sequence_default_preserved: true,
      managed_function_default_preserved: true,
    });

    assert.doesNotMatch(baseline, /alter\s+default\s+privileges\s+for\s+role\s+supabase_admin/i);
    const unrelatedSchemaDefaults = await db.query(`
      select
        exists (
          select 1 from pg_default_acl d cross join lateral aclexplode(d.defaclacl) a
          where d.defaclrole='supabase_admin'::regrole
            and d.defaclnamespace='other_schema'::regnamespace
            and d.defaclobjtype='r' and a.grantee='authenticated'::regrole
            and a.privilege_type='SELECT'
        ) as table_default_preserved,
        exists (
          select 1 from pg_default_acl d cross join lateral aclexplode(d.defaclacl) a
          where d.defaclrole='supabase_admin'::regrole
            and d.defaclnamespace='other_schema'::regnamespace
            and d.defaclobjtype='f' and a.grantee='authenticated'::regrole
            and a.privilege_type='EXECUTE'
        ) as function_default_preserved
    `);
    assert.deepEqual(unrelatedSchemaDefaults.rows[0], { table_default_preserved: true, function_default_preserved: true });

    await db.exec(`set role service_role;
      insert into public.professional_introducer_demo_requests(
        access_grant_id, consultant_user_id, consultant_label, organisation_name,
        reason_for_interest, desired_next_step
      ) select id, user_id, 'Internal reviewer', 'Example Prospect', 'Synthetic trigger test record', 'product_demonstration'
        from public.professional_introducer_demo_access limit 1;
      reset role;`);
    const triggerResult = await db.query(`select reason_for_interest from public.professional_introducer_demo_requests order by created_at desc limit 1`);
    assert.equal(triggerResult.rows[0].reason_for_interest, 'trigger dependency preserved');
  } finally { await db.close(); }
});
