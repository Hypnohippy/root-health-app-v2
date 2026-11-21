import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";

const connectionString = process.env.PR70_LOCAL_POSTGRES_TEST_URL || "";
const integrationTest = test("two independent PostgreSQL connections enforce shared Voice budgets and claim termination work without duplicates", {
  skip: !connectionString && "Set PR70_LOCAL_POSTGRES_TEST_URL to a disposable local PR70 test database.",
}, async () => {
  const parsed = new URL(connectionString);
  assert.ok(["localhost", "127.0.0.1", "::1"].includes(parsed.hostname), "test is restricted to loopback PostgreSQL");
  assert.match(parsed.pathname, /pr70.*test/i, "database name must clearly identify the disposable PR70 test database");
  const { Pool } = await import("pg");
  const pool = new Pool({ connectionString, max: 2, ssl: false });
  const userA = randomUUID();
  const userB = randomUUID();
  const grantA = randomUUID();
  const grantB = randomUUID();
  const clientA = await pool.connect();
  const clientB = await pool.connect();
  let originalPolicy;
  try {
    const required = await clientA.query(`
      select to_regclass('public.professional_introducer_voice_usage') as usage_table,
             to_regprocedure('public.reserve_professional_introducer_voice_session(uuid,uuid)') as reserve_fn
    `);
    assert.ok(required.rows[0].usage_table && required.rows[0].reserve_fn, "reviewed candidate migration must already be installed in this disposable local test DB");
    originalPolicy = (await clientA.query(`select * from public.professional_introducer_voice_policy where singleton=true`)).rows[0];
    await clientA.query("begin");
    await clientA.query("insert into auth.users(id,aud,role,email,encrypted_password,created_at,updated_at) values ($1,'authenticated','authenticated',$2,'',now(),now()),($3,'authenticated','authenticated',$4,'',now(),now())", [userA, `${userA}@example.test`, userB, `${userB}@example.test`]);
    await clientA.query(`insert into public.professional_introducer_demo_access
      (id,user_id,consultant_label,created_at,expires_at,demo_organisation_id,voice_coach_enabled)
      values ($1,$2,'quota A',now(),now()+interval '1 day',$5,true),($3,$4,'quota B',now(),now()+interval '1 day',$5,true)`,
    [grantA, userA, grantB, userB, randomUUID()]);
    await clientA.query(`update public.professional_introducer_voice_policy
      set enabled=true,server_termination_ready=true,default_max_session_seconds=1800,
          completion_grace_seconds=900,warning_before_seconds=300,
          estimated_cost_per_minute_usd=0.20,monthly_budget_gbp=9.99,usd_per_gbp=1.5,
          fx_period=date_trunc('month',now() at time zone 'Europe/London')::date,
          fx_source='HMRC monthly USD per GBP' where singleton=true`);
    await clientA.query("commit");

    const [a, b] = await Promise.all([
      clientA.query("select * from public.reserve_professional_introducer_voice_session($1,$2)", [userA, grantA]),
      clientB.query("select * from public.reserve_professional_introducer_voice_session($1,$2)", [userB, grantB]),
    ]);
    assert.deepEqual([a.rows[0].allowed, b.rows[0].allowed].sort(), [false, true]);
    const total = await clientA.query(`select count(*)::int as n, sum(reserved_cost_gbp)::numeric(12,6) as cost
      from public.professional_introducer_voice_usage where user_id in ($1,$2)`, [userA, userB]);
    assert.equal(total.rows[0].n, 1);
    assert.ok(Number(total.rows[0].cost) <= 9.99);

    const reservationA = randomUUID();
    const reservationB = randomUUID();
    await clientA.query("update public.professional_introducer_demo_access set revoked_at=now() where id in ($1,$2)", [grantA, grantB]);
    await clientA.query(`insert into public.professional_introducer_voice_usage
      (id,user_id,grant_id,started_at,planned_session_expires_at,session_expires_at,provider_hard_expires_at,reserved_cost_usd,reserved_cost_gbp,
       provider_call_id,termination_status,termination_next_attempt_at)
      values
       ($1,$2,$3,now()-interval '12 minutes',now()-interval '7 minutes',now()-interval '6 minutes',now()-interval '1 minute',0.01,0.01,'rtc_claim_a','scheduled',now()-interval '2 minutes'),
       ($4,$5,$6,now()-interval '11 minutes',now()-interval '6 minutes',now()-interval '5 minutes',now(),0.01,0.01,'rtc_claim_b','scheduled',now()-interval '1 minute')`,
    [reservationA, userA, grantA, reservationB, userB, grantB]);

    // Keep the first row lock open while the second independent connection
    // claims. SKIP LOCKED must give the second worker a different call.
    await clientA.query("begin");
    const firstClaim = await clientA.query("select * from public.claim_due_professional_introducer_voice_terminations(1)");
    assert.equal(firstClaim.rows.length, 1);
    await clientB.query("begin");
    const secondClaim = await clientB.query("select * from public.claim_due_professional_introducer_voice_terminations(1)");
    assert.equal(secondClaim.rows.length, 1);
    assert.notEqual(firstClaim.rows[0].reservation_id, secondClaim.rows[0].reservation_id);
    assert.deepEqual(new Set([firstClaim.rows[0].provider_call_id, secondClaim.rows[0].provider_call_id]), new Set(["rtc_claim_a", "rtc_claim_b"]));
    await clientB.query("commit");
    await clientA.query("commit");
  } finally {
    try {
      await clientA.query("rollback");
      await clientB.query("rollback");
      await clientA.query("begin");
      await clientA.query("delete from public.professional_introducer_voice_usage where user_id in ($1,$2)", [userA, userB]);
      await clientA.query("delete from public.professional_introducer_demo_access where id in ($1,$2)", [grantA, grantB]);
      await clientA.query("delete from auth.users where id in ($1,$2)", [userA, userB]);
      if (originalPolicy) {
        await clientA.query(`update public.professional_introducer_voice_policy set
          enabled=$1,server_termination_ready=$2,monthly_budget_gbp=$3,
          usd_per_gbp=$4,fx_period=$5,fx_source=$6,fx_updated_at=$7,fx_safety_margin_percent=$8,
          estimated_cost_per_minute_usd=$9,default_sessions_per_24h=$10,
          default_max_session_seconds=$11,completion_grace_seconds=$12,warning_before_seconds=$13,
          alert_threshold_percent=$14 where singleton=true`,
        [originalPolicy.enabled, originalPolicy.server_termination_ready, originalPolicy.monthly_budget_gbp,
          originalPolicy.usd_per_gbp, originalPolicy.fx_period, originalPolicy.fx_source, originalPolicy.fx_updated_at,
          originalPolicy.fx_safety_margin_percent, originalPolicy.estimated_cost_per_minute_usd,
          originalPolicy.default_sessions_per_24h, originalPolicy.default_max_session_seconds,
          originalPolicy.completion_grace_seconds, originalPolicy.warning_before_seconds, originalPolicy.alert_threshold_percent]);
      }
      await clientA.query("commit");
    } finally {
      clientA.release();
      clientB.release();
      await pool.end();
    }
  }
});
