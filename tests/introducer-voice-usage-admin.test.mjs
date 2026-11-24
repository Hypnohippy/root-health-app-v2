import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Voice usage reporting and policy controls are Root-authenticated and Preview identity scoped", async () => {
  const route = await readFile(new URL("../app/api/introducer/root-voice-usage/route.js", import.meta.url), "utf8");
  const guard = route.slice(route.indexOf("async function authorize"), route.indexOf("export async function GET"));
  assert.match(guard, /isIntroducerDeployment\(process\.env\)/);
  assert.match(guard, /requireRootAdmin\(request\)/);
  assert.ok(guard.indexOf("isIntroducerDeployment") < guard.indexOf("requireRootAdmin"));
  assert.match(route, /Cache-Control.*no-store/);
  assert.match(route, /calendar_month_Europe_London/);
  assert.match(route, /estimatedReservedCostGbp/);
  assert.match(route, /deniedSessionRequests/);
  assert.match(route, /actualUsageAvailable/);
  assert.match(route, /approachingBudgetLimit/);
  assert.match(route, /userId: row\.user_id/);
  assert.match(route, /grantId: row\.grant_id/);
  assert.doesNotMatch(route, /content|journal|assessment|transcript|service_role_key/i);
});

test("Root-only budget page reads the protected report and distinguishes estimates from provider actuals", async () => {
  const page = await readFile(new URL("../app/introducer/voice-budget/page.js", import.meta.url), "utf8");
  assert.match(page, /supabase\.auth\.getSession/);
  assert.match(page, /\/api\/introducer\/root-voice-usage/);
  assert.match(page, /Authorization: `Bearer \$\{token\}`/);
  assert.match(page, /estimatedBudgetRemainingGbp/);
  assert.match(page, /actualUsageAvailable/);
  assert.match(page, /deniedSessionRequests/);
  assert.match(page, /Prerecorded playback makes no inference requests/);
  assert.doesNotMatch(page, /api\.openai\.com|OPENAI_API_KEY|service_role/i);
});

test("Root policy updates use a strict field allowlist and the serialized database policy RPC", async () => {
  const route = await readFile(new URL("../app/api/introducer/root-voice-usage/route.js", import.meta.url), "utf8");
  const migration = await readFile(new URL("../supabase/migrations/20261119120000_pr70_introducer_voice_entitlement_and_usage.sql", import.meta.url), "utf8");
  assert.match(route, /voicePolicyEnabled/);
  assert.match(route, /monthlyBudgetGbp/);
  assert.match(route, /usdPerGbp/);
  assert.match(route, /fxPeriod/);
  assert.match(route, /fxSource/);
  assert.match(route, /fxSafetyMarginPercent/);
  assert.match(route, /estimatedCostPerMinuteUsd/);
  assert.match(route, /defaultSessionsPer24h/);
  assert.match(route, /defaultMaxSessionSeconds/);
  assert.match(route, /completionGraceSeconds/);
  assert.match(route, /warningBeforeSeconds/);
  assert.match(route, /alertThresholdPercent/);
  assert.match(route, /server_termination_ready/);
  assert.doesNotMatch(route.slice(route.indexOf("const fields =")), /serverTerminationReady/);
  assert.match(route, /update_professional_introducer_voice_policy/);
  assert.match(migration, /create or replace function public\.update_professional_introducer_voice_policy/);
  assert.match(migration, /pg_advisory_xact_lock\(707052, 1\)[\s\S]*update public\.professional_introducer_voice_policy/);
  assert.match(migration, /revoke all on function public\.update_professional_introducer_voice_policy\(boolean, numeric, numeric, date, text, integer, numeric, integer, integer, integer, integer, integer\) from public, anon, authenticated/);
  assert.match(migration, /grant execute on function public\.update_professional_introducer_voice_policy\(boolean, numeric, numeric, date, text, integer, numeric, integer, integer, integer, integer, integer\) to service_role/);
});
