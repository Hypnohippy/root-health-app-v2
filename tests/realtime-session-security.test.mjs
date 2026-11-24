import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  authorizeRealtimeSession,
  confirmRealtimeGrantActive,
  realtimeProviderApiKey,
  reserveRealtimeSessionAllowance,
  RealtimeSessionAccessError,
} from "../lib/realtimeSessionGuard.server.js";

function request(token = "token-a") {
  return { headers: new Headers(token ? { authorization: `Bearer ${token}` } : {}) };
}

const demoEnv = {
  ROOT_DEPLOYMENT_MODE: "introducer",
  VERCEL_ENV: "preview",
  VERCEL_GIT_COMMIT_REF: "codex/professional-introducer-demo",
  VERCEL_PROJECT_ID: "prj_5FntyaVgI1tQ7Q3IMKfkSTb2ETut",
  ROOT_INTRODUCER_VERCEL_PROJECT_ID: "prj_5FntyaVgI1tQ7Q3IMKfkSTb2ETut",
  ROOT_AUTH_PREVIEW_URL: "https://root-health-introducer-demo-preview.vercel.app",
  NEXT_PUBLIC_SUPABASE_URL: "https://waluyphoafylzcjuskcl.supabase.co",
  ROOT_INTRODUCER_SUPABASE_PROJECT_REF: "waluyphoafylzcjuskcl",
  ROOT_PRODUCTION_SUPABASE_PROJECT_REF: "witkwlgldxjwwxmpcyva",
};
const authorizeForDemo = (options) => authorizeRealtimeSession({ ...options, env: demoEnv });

test("introducer Realtime never falls back to a general inherited OpenAI key", () => {
  assert.equal(realtimeProviderApiKey("introducer", { OPENAI_API_KEY: "general-preview-key" }), "");
  assert.equal(realtimeProviderApiKey("introducer", { OPENAI_API_KEY: "general-preview-key", ROOT_INTRODUCER_OPENAI_API_KEY: "dedicated-preview-key" }), "dedicated-preview-key");
  assert.equal(realtimeProviderApiKey("customer", { OPENAI_API_KEY: "customer-key", ROOT_INTRODUCER_OPENAI_API_KEY: "demo-key" }), "customer-key");
  assert.equal(realtimeProviderApiKey("unknown", { OPENAI_API_KEY: "customer-key" }), "");
});

function demoAccess({ voice = true, queryError = null } = {}) {
  const queries = [];
  const admin = {
    from(table) {
      const query = { table, filters: [] };
      queries.push(query);
      const builder = {
        select(columns) { query.columns = columns; return this; },
        eq(column, value) { query.filters.push([column, value]); return this; },
        is(column, value) { query.filters.push([column, value]); return this; },
        gt(column, value) { query.filters.push([column, value]); return this; },
        maybeSingle: async () => ({ data: queryError ? null : { voice_coach_enabled: voice, id: "grant-a" }, error: queryError }),
      };
      return builder;
    },
    rpc: async () => ({ data: [{
      allowed: true,
      denial_reason: null,
      max_session_seconds: 2700,
      planned_session_seconds: 1800,
      completion_grace_seconds: 900,
      warning_before_seconds: 300,
      reserved_cost_usd: 0.4,
      reserved_cost_gbp: 8.8,
      project_budget_used_gbp: 8.8,
      project_monthly_budget_gbp: 10,
      alert_threshold_percent: 80,
      reservation_id: "reservation-a",
    }], error: null }),
  };
  return {
    queries,
    admin,
    demo: {
      userId: "user-a",
      email: "a@example.test",
      user: { id: "user-a", email: "a@example.test" },
      userClient: { from: () => ({}) },
      grant: { id: "grant-a", expiresAt: "2026-12-01T00:00:00Z", demoOrganisationId: "fictional-org" },
      admin,
    },
  };
}

test("Realtime delegates identity, expiry, revocation and organisation mapping to the verified introducer grant", async () => {
  let receivedRequest;
  await assert.rejects(authorizeForDemo({ request: request(""), authorizeDemo: async ({ request: req }) => {
    receivedRequest = req;
    throw Object.assign(new Error("Sign in required"), { status: 401 });
  } }), (error) => error instanceof RealtimeSessionAccessError && error.status === 401);
  assert.ok(receivedRequest);

  await assert.rejects(authorizeForDemo({ request: request(), authorizeDemo: async () => {
    throw Object.assign(new Error("Grant expired or revoked"), { status: 403 });
  } }), /expired or revoked|Grant expired/);
});

test("Realtime requires the explicit Voice Coach entitlement and uses the verified user's bearer client", async () => {
  const disabled = demoAccess({ voice: false });
  await assert.rejects(authorizeForDemo({ request: request(), authorizeDemo: async () => disabled.demo }),
    (error) => error.status === 403 && /not included/.test(error.message));

  const enabled = demoAccess({ voice: true });
  const result = await authorizeForDemo({ request: request(), authorizeDemo: async () => enabled.demo });
  assert.equal(result.user.id, "user-a");
  assert.equal(result.client, enabled.demo.userClient);
  assert.deepEqual(enabled.queries[0].filters, [["id", "grant-a"], ["user_id", "user-a"]]);
});

test("entitlement and grant-query failures fail closed", async () => {
  const failed = demoAccess({ queryError: new Error("schema not migrated") });
  await assert.rejects(authorizeForDemo({ request: request(), authorizeDemo: async () => failed.demo }),
    (error) => error.status === 503);

  let query;
  await assert.rejects(confirmRealtimeGrantActive({
    admin: { from: () => (query = {
      select() { return this; }, eq() { return this; }, is() { return this; }, gt() { return this; },
      maybeSingle: async () => ({ data: null, error: null }),
    }) }, userId: "user-a", grantId: "grant-a",
  }), (error) => error.status === 403);
  assert.ok(query);
});

test("durable usage reservations allow only explicit true, deny exhaustion, and fail closed on RPC error", async () => {
  const calls = [];
  const admin = { rpc: async (name, args) => { calls.push([name, args]); return { data: [{
    allowed: true, max_session_seconds: 3600, planned_session_seconds: 1800,
    completion_grace_seconds: 900, warning_before_seconds: 300, reserved_cost_usd: 12,
    reserved_cost_gbp: 8.8, project_budget_used_gbp: 8.8, project_monthly_budget_gbp: 10, alert_threshold_percent: 80,
    reservation_id: "reservation-a",
  }], error: null }; } };
  assert.deepEqual(await reserveRealtimeSessionAllowance({ admin, userId: "user-a", grantId: "grant-a" }), {
    allowed: true, denialReason: null, maxSessionSeconds: 3600, plannedSessionSeconds: 1800,
    completionGraceSeconds: 900, warningBeforeSeconds: 300, reservedCostUsd: 12,
    reservedCostGbp: 8.8, projectBudgetUsedGbp: 8.8, projectMonthlyBudgetGbp: 10, alertThresholdPercent: 80,
    reservationId: "reservation-a",
  });
  assert.deepEqual(calls[0], ["reserve_professional_introducer_voice_session", { p_user_id: "user-a", p_grant_id: "grant-a" }]);
  assert.equal((await reserveRealtimeSessionAllowance({ admin: { rpc: async () => ({ data: [{
    allowed: false, denial_reason: "project_estimated_budget",
  }], error: null }) }, userId: "user-a", grantId: "grant-a" })).allowed, false);
  await assert.rejects(reserveRealtimeSessionAllowance({ admin: { rpc: async () => ({ data: true, error: null }) }, userId: "user-a", grantId: "grant-a" }),
    (error) => error.status === 503);
  await assert.rejects(reserveRealtimeSessionAllowance({ admin: { rpc: async () => ({ data: null, error: new Error("offline") }) }, userId: "user-a", grantId: "grant-a" }),
    (error) => error.status === 503);
});

test("Realtime route loads only owner-bound Body records, labels Thought Work as user-stated, and reserves before provider call", async () => {
  const route = await readFile(new URL("../app/api/realtime-session/route.js", import.meta.url), "utf8");
  const bodyLookup = route.slice(route.indexOf('from("body_signals")'), route.indexOf("bodyHandoff = data"));
  assert.match(bodyLookup, /\.eq\("id", bodyObservationId\)/);
  assert.match(bodyLookup, /\.eq\("user_id", access\.user\.id\)/);
  assert.match(bodyLookup, /\.eq\("profile_key", personalKnowledge\.identity\.profileKey\)/);
  assert.match(route, /self-reported exploration context, not verified saved evidence/);
  assert.ok(route.indexOf("confirmRealtimeGrantActive") < route.indexOf('fetch("https://api.openai.com/v1/realtime/calls"'));
  assert.ok(route.indexOf("reserveRealtimeSessionAllowance") < route.indexOf('fetch("https://api.openai.com/v1/realtime/calls"'));
  assert.match(route, /expires_at: Math\.floor\(Date\.now\(\) \/ 1000\) \+ introducerMaxSessionSeconds/);
  assert.match(route, /introducerReservation\.maxSessionSeconds > 3600/);
  assert.match(route, /X-Root-Voice-Planned-Seconds/);
  assert.match(route, /X-Root-Voice-Reservation/);
  assert.match(route, /plannedSessionSeconds \+ \(2 \* introducerReservation\.completionGraceSeconds\)/);
  assert.match(route, /introducerReservation\.reservationId/);
  assert.match(route, /70 \* 1024/);
  assert.match(route, /realtimeProviderApiKey\(access\.mode\)/);
  assert.match(route, /!supportedModes\.has\(body\.coachMode\)/);
  assert.match(route, /loadPersonalRootKnowledge\(\{[\s\S]*client: access\.client,[\s\S]*verifiedUser: access\.user/);
  assert.doesNotMatch(route, /body\.(?:profile|personalKnowledge|healthRecords|journalEntries)\b/);
});

test("Preview voice quota SQL defaults off, serializes project budget then user allocation, and supports Root-configured usage", async () => {
  const sql = await readFile(new URL("../supabase/migrations/20261119120000_pr70_introducer_voice_entitlement_and_usage.sql", import.meta.url), "utf8");
  assert.match(sql, /voice_coach_enabled boolean not null default false/);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /revoke all on public\.professional_introducer_voice_usage from public, anon, authenticated/);
  assert.match(sql, /revoke all on function public\.reserve_professional_introducer_voice_session\(uuid, uuid\) from public, anon, authenticated/);
  assert.match(sql, /grant execute on function public\.reserve_professional_introducer_voice_session\(uuid, uuid\) to service_role/);
  assert.match(sql, /professional_introducer_voice_policy/);
  assert.match(sql, /monthly_budget_gbp numeric\(12, 4\) not null default 10/);
  assert.match(sql, /monthly_fx_rate_unconfigured/);
  assert.match(sql, /estimated_cost_per_minute_usd numeric/);
  assert.match(sql, /server_termination_ready boolean not null default false/);
  assert.match(sql, /default_max_session_seconds integer not null default 1800/);
  assert.match(sql, /completion_grace_seconds integer not null default 900/);
  assert.match(sql, /warning_before_seconds integer not null default 300/);
  assert.match(sql, /voice_sessions_per_24h_override integer/);
  assert.match(sql, /voice_max_session_seconds_override integer/);
  assert.match(sql, /security invoker/);
  assert.match(sql, /pg_advisory_xact_lock/);
  assert.ok(sql.indexOf("pg_advisory_xact_lock(707052, 1)") < sql.indexOf("pg_advisory_xact_lock(707053, hashtext(p_user_id::text))"));
  assert.match(sql, /g\.voice_coach_enabled is true/);
  assert.match(sql, /g\.revoked_at is null/);
  assert.match(sql, /g\.expires_at > v_now/);
  assert.match(sql, /session_expires_at > v_now/);
  assert.match(sql, /interval '24 hours'/);
  assert.match(sql, /v_user_limit/);
  assert.match(sql, /v_policy\.default_sessions_per_24h/);
  assert.doesNotMatch(sql, /\) >= 6|global.*session.count.*cap/i);
  assert.match(sql, /provider_hard_expires_at <= started_at \+ interval '1 hour'/);
  assert.doesNotMatch(sql, /drop table|truncate/i);
  const deletedTables = [...sql.matchAll(/delete from public\.([a-z_]+)/gi)].map((match) => match[1]);
  assert.ok(deletedTables.every((name) => ["professional_introducer_voice_usage", "professional_introducer_voice_denials"].includes(name)));
});
