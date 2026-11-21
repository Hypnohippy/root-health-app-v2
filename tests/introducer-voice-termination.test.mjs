import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  attachRealtimeCallToReservation,
  hangupRealtimeCall,
  immediatelyHangupRealtimeCall,
  parseRealtimeCallId,
  runDueRealtimeTerminations,
} from "../lib/introducerRealtimeTermination.server.js";

test("provider Location is parsed only for an OpenAI Realtime call and call IDs are validated", () => {
  assert.equal(parseRealtimeCallId("https://api.openai.com/v1/realtime/calls/rtc_abc-123"), "rtc_abc-123");
  assert.equal(parseRealtimeCallId("/v1/realtime/calls/rtc_abc"), "rtc_abc");
  assert.equal(parseRealtimeCallId("https://attacker.test/v1/realtime/calls/rtc_abc"), null);
  assert.equal(parseRealtimeCallId("https://api.openai.com/v1/realtime/calls/not-a-call"), null);
  assert.equal(parseRealtimeCallId(null), null);
});

test("hangup uses the server credential and never exposes provider response bodies", async () => {
  let received;
  const result = await hangupRealtimeCall({
    callId: "rtc_private_123",
    apiKey: "server-secret",
    fetchImpl: async (url, init) => {
      received = { url, init };
      return new Response("provider details", { status: 503 });
    },
  });
  assert.deepEqual(result, { terminated: false, errorCode: "provider_http_503" });
  assert.equal(received.url, "https://api.openai.com/v1/realtime/calls/rtc_private_123/hangup");
  assert.equal(received.init.method, "POST");
  assert.equal(received.init.headers.Authorization, "Bearer server-secret");
  assert.deepEqual(await hangupRealtimeCall({ callId: "rtc_private_123", apiKey: "server-secret", fetchImpl: async () => new Response(null, { status: 404 }) }), {
    terminated: true, errorCode: null,
  });
  assert.equal((await hangupRealtimeCall({ callId: "rtc_private_123", apiKey: "", fetchImpl: async () => { throw new Error("must not run"); } })).terminated, false);
});

test("call IDs are durably attached before SDP can be returned and a revoked grant requests immediate termination", async () => {
  const calls = [];
  const admin = { rpc: async (name, args) => {
    calls.push([name, args]);
    return { data: [{ attached: true, terminate_now: true }], error: null };
  } };
  assert.deepEqual(await attachRealtimeCallToReservation({ admin, reservationId: "reservation-a", userId: "user-a", grantId: "grant-a", callId: "rtc_abc" }), { terminateNow: true });
  assert.deepEqual(calls, [["attach_professional_introducer_voice_call", {
    p_reservation_id: "reservation-a", p_user_id: "user-a", p_grant_id: "grant-a", p_provider_call_id: "rtc_abc",
  }]]);
  await assert.rejects(attachRealtimeCallToReservation({ admin, reservationId: "r", userId: "u", grantId: "g", callId: "bad" }), /tracking/);
});

test("worker terminates due calls and persists retry state for provider failures without a live provider request", async () => {
  const rpcCalls = [];
  const admin = { rpc: async (name, args) => {
    rpcCalls.push([name, args]);
    if (name === "claim_due_professional_introducer_voice_terminations") return { data: [
      { reservation_id: "r1", provider_call_id: "rtc_ok", termination_reason: "duration_limit", attempt: 1 },
      { reservation_id: "r2", provider_call_id: "rtc_retry", termination_reason: "grant_inactive", attempt: 2 },
    ], error: null };
    if (name === "complete_professional_introducer_voice_termination") return { data: true, error: null };
    if (name === "retry_professional_introducer_voice_termination") return { data: true, error: null };
    throw new Error(`unexpected RPC ${name}`);
  } };
  const providerCalls = [];
  const result = await runDueRealtimeTerminations({
    admin,
    apiKey: "test-server-key",
    fetchImpl: async (url) => {
      providerCalls.push(url);
      return url.includes("rtc_ok") ? new Response(null, { status: 204 }) : new Response(null, { status: 429 });
    },
  });
  assert.deepEqual(result, { claimed: 2, terminated: 1, retrying: 1 });
  assert.deepEqual(providerCalls, [
    "https://api.openai.com/v1/realtime/calls/rtc_ok/hangup",
    "https://api.openai.com/v1/realtime/calls/rtc_retry/hangup",
  ]);
  assert.equal(rpcCalls[0][0], "claim_due_professional_introducer_voice_terminations");
  assert.deepEqual(rpcCalls.slice(1).map(([name]) => name).sort(), [
    "complete_professional_introducer_voice_termination",
    "retry_professional_introducer_voice_termination",
  ]);
  assert.deepEqual(rpcCalls[2][1], { p_reservation_id: "r2", p_provider_call_id: "rtc_retry", p_safe_error_code: "provider_http_429" });
});

test("immediate failure cleanup retries provider hangup and never relies on browser timers", async () => {
  let calls = 0;
  const result = await immediatelyHangupRealtimeCall({
    callId: "rtc_newly_created", apiKey: "test-key", attempts: 2,
    fetchImpl: async () => { calls += 1; return new Response(null, { status: calls === 1 ? 503 : 204 }); },
  });
  assert.equal(result.terminated, true);
  assert.equal(calls, 2);
});

test("Preview worker is protected, verifies deployment and database identity, and realtime route attaches call ID before returning SDP", async () => {
  const worker = await readFile(new URL("../app/api/introducer/voice-termination/route.js", import.meta.url), "utf8");
  const realtime = await readFile(new URL("../app/api/realtime-session/route.js", import.meta.url), "utf8");
  const extensionRoute = await readFile(new URL("../app/api/introducer/voice-session/extend/route.js", import.meta.url), "utf8");
  const migration = await readFile(new URL("../supabase/migrations/20261119120000_pr70_introducer_voice_entitlement_and_usage.sql", import.meta.url), "utf8");
  const schedule = JSON.parse(await readFile(new URL("../vercel.introducer.json", import.meta.url), "utf8"));
  assert.match(worker, /introducerDeploymentStatus\(env\) !== "introducer_verified"/);
  assert.match(worker, /ROOT_INTRODUCER_VOICE_TERMINATION_ENABLED !== "true"/);
  assert.match(worker, /validCronAuthorization\(request, env\.CRON_SECRET\)/);
  assert.match(worker, /actualRef !== expectedRef/);
  assert.match(worker, /env\.ROOT_INTRODUCER_OPENAI_API_KEY/);
  assert.doesNotMatch(worker, /env\.OPENAI_API_KEY/);
  assert.match(worker, /runDueRealtimeTerminations/);
  assert.ok(realtime.indexOf("attachRealtimeCallToReservation") < realtime.indexOf("return new Response(answer"));
  assert.match(realtime, /response\.headers\.get\("location"\)/);
  assert.match(realtime, /immediatelyHangupRealtimeCall/);
  assert.match(realtime, /markRealtimeCallCreationFailed/);
  assert.match(migration, /provider_call_id_pending/);
  assert.match(migration, /provider_hard_expires_at <= started_at \+ interval '1 hour'/);
  assert.match(migration, /for update skip locked/i);
  assert.match(migration, /u\.session_expires_at <= statement_timestamp\(\)/);
  assert.match(migration, /g\.revoked_at is null/);
  assert.match(migration, /termination_status in \('scheduled','retry','terminating'\)/);
  assert.match(migration, /make_interval\(secs => least\(3600/);
  assert.match(migration, /grant execute on function public\.claim_due_professional_introducer_voice_terminations\(integer\) to service_role/);
  assert.match(migration, /create or replace function public\.extend_professional_introducer_voice_completion/);
  assert.match(migration, /v_usage\.session_expires_at - v_now > interval '60 seconds'/);
  assert.match(migration, /v_usage\.session_expires_at = v_usage\.provider_hard_expires_at/);
  assert.match(migration, /2 \* coalesce\(p_completion_grace_seconds/);
  assert.match(extensionRoute, /authorizeRealtimeSession/);
  assert.match(extensionRoute, /access\.user\.id/);
  assert.match(extensionRoute, /access\.grant\.id/);
  assert.match(extensionRoute, /extend_professional_introducer_voice_completion/);
  assert.match(extensionRoute, /isIntroducerDeployment/);
  assert.doesNotMatch(worker, /NEXT_PUBLIC_.*SERVICE_ROLE|console\.(?:log|error).*callId/i);
  assert.deepEqual(schedule.schedules["introducer-voice-termination"], {
    schedule: "* * * * *", jitter: 1, path: "/api/introducer/voice-termination", requestMethod: "GET",
  });
});

test("introducer Voice uses an advance warning, a bounded completion window, and preserves the customer timer", async () => {
  const coach = await readFile(new URL("../app/coach/page.js", import.meta.url), "utf8");
  assert.match(coach, /X-Root-Voice-Planned-Seconds/);
  assert.match(coach, /Your planned Voice session is nearing its end/);
  assert.match(coach, /finish that action and preserve explicit consent/);
  assert.match(coach, /plannedSeconds \+ graceSeconds/);
  assert.match(coach, /plannedSeconds \+ \(2 \* graceSeconds\)/);
  assert.match(coach, /\/api\/introducer\/voice-session\/extend/);
  assert.match(coach, /pendingPlaybookConflictRef\.current/);
  assert.match(coach, /No further extension is available/);
  assert.match(coach, /Preserve the existing customer deployment behavior/);
  assert.match(coach, /pendingPlaybookSaveRef/);
  assert.match(coach, /pendingPlaybookConflictRef/);
});
