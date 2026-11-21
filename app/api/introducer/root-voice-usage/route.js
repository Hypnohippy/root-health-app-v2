import { createRootAdminClient, requireRootAdmin } from "../../../../lib/rootAdminAuth.js";
import { isIntroducerDeployment } from "../../../../lib/introducerRestrictedActions.server.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

function londonMonthKey(value) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", year: "numeric", month: "2-digit" }).formatToParts(new Date(value));
  return `${parts.find((part) => part.type === "year")?.value}-${parts.find((part) => part.type === "month")?.value}`;
}

async function authorize(request) {
  if (!isIntroducerDeployment(process.env)) {
    return { response: Response.json({ error: "Voice usage reporting is only available in the verified introducer Preview." }, { status: 404, headers: noStore }) };
  }
  const root = await requireRootAdmin(request);
  if (!root.authorised) {
    return { response: Response.json({ error: root.error }, { status: root.status, headers: noStore }) };
  }
  return { admin: createRootAdminClient() };
}

export async function GET(request) {
  const access = await authorize(request);
  if (access.response) return access.response;

  const now = new Date();
  const londonParts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", year: "numeric", month: "2-digit" }).formatToParts(now);
  const monthKey = `${londonParts.find((part) => part.type === "year")?.value}-${londonParts.find((part) => part.type === "month")?.value}`;
  const monthStart = new Date(`${monthKey}-01T00:00:00.000Z`);
  monthStart.setUTCDate(monthStart.getUTCDate() - 1);
  const since = monthStart.toISOString();
  const [policyResult, usageResult, denialResult] = await Promise.all([
    access.admin.from("professional_introducer_voice_policy")
      .select("enabled,server_termination_ready,monthly_budget_gbp,usd_per_gbp,fx_period,fx_source,fx_updated_at,fx_safety_margin_percent,estimated_cost_per_minute_usd,default_sessions_per_24h,default_max_session_seconds,completion_grace_seconds,warning_before_seconds,alert_threshold_percent,updated_at")
      .eq("singleton", true).maybeSingle(),
    access.admin.from("professional_introducer_voice_usage")
      .select("user_id,grant_id,started_at,reserved_cost_usd,reserved_cost_gbp,actual_cost_usd,actual_cost_gbp,session_expires_at,provider_call_id,termination_status,termination_attempts,termination_last_error,termination_next_attempt_at,terminated_at")
      .gte("started_at", since),
    access.admin.from("professional_introducer_voice_denials")
      .select("user_id,grant_id,denial_reason,occurred_at")
      .gte("occurred_at", since),
  ]);
  if (policyResult.error || usageResult.error || denialResult.error || !policyResult.data) {
    return Response.json({ error: "Voice usage reporting is unavailable." }, { status: 503, headers: noStore });
  }

  const policy = policyResult.data;
  const perIntroducer = new Map();
  let reservedCostGbp = 0;
  let reservedCostUsd = 0;
  let actualCostGbp = 0;
  let actualCostUsd = 0;
  let actualUsageAvailable = false;
  const monthlyUsageRows = (usageResult.data || []).filter((row) => londonMonthKey(row.started_at) === monthKey);
  for (const row of monthlyUsageRows) {
    const key = `${row.user_id}:${row.grant_id}`;
    const current = perIntroducer.get(key) || {
      userId: row.user_id,
      grantId: row.grant_id,
      sessionStarts: 0,
      estimatedReservedCostUsd: 0,
      estimatedReservedCostGbp: 0,
      actualCostUsd: 0,
      actualCostGbp: 0,
      activeLeases: 0,
      terminationPending: 0,
      untrackedCallIdPending: 0,
      terminationRetries: 0,
      lastTerminationError: null,
    };
    const cost = Number(row.reserved_cost_usd || 0);
    const costGbp = Number(row.reserved_cost_gbp || 0);
    current.sessionStarts += 1;
    current.estimatedReservedCostUsd += cost;
    current.estimatedReservedCostGbp += costGbp;
    if (row.actual_cost_usd != null || row.actual_cost_gbp != null) {
      actualUsageAvailable = true;
      current.actualCostUsd += Number(row.actual_cost_usd || 0);
      current.actualCostGbp += Number(row.actual_cost_gbp || 0);
      actualCostUsd += Number(row.actual_cost_usd || 0);
      actualCostGbp += Number(row.actual_cost_gbp || 0);
    }
    if (!row.terminated_at && Date.parse(row.session_expires_at) > Date.now()) current.activeLeases += 1;
    if (row.termination_status === "scheduled" || row.termination_status === "terminating" || row.termination_status === "retry") current.terminationPending += 1;
    if (row.termination_status === "awaiting_call_id" && row.termination_last_error === "provider_call_id_pending" && !row.terminated_at) current.untrackedCallIdPending += 1;
    current.terminationRetries += Number(row.termination_attempts || 0);
    if (row.termination_last_error) current.lastTerminationError = row.termination_last_error;
    reservedCostUsd += cost;
    reservedCostGbp += costGbp;
    perIntroducer.set(key, current);
  }

  const monthlyBudgetGbp = Number(policy.monthly_budget_gbp);
  const usedPercent = monthlyBudgetGbp > 0 ? (reservedCostGbp / monthlyBudgetGbp) * 100 : 0;
  const denials = (denialResult?.data || []).filter((row) => {
    const rowMonthKey = londonMonthKey(row.occurred_at);
    return rowMonthKey === monthKey;
  });
  return Response.json({
    policy,
    window: "calendar_month_Europe_London",
    month: monthKey,
    estimatedReservedCostGbp: Number(reservedCostGbp.toFixed(6)),
    estimatedBudgetRemainingGbp: Number(Math.max(0, monthlyBudgetGbp - reservedCostGbp).toFixed(6)),
    estimatedReservedCostUsd: Number(reservedCostUsd.toFixed(6)),
    actualCostGbp: actualUsageAvailable ? Number(actualCostGbp.toFixed(6)) : null,
    actualCostUsd: actualUsageAvailable ? Number(actualCostUsd.toFixed(6)) : null,
    actualUsageAvailable,
    estimatedBudgetUsedPercent: Number(usedPercent.toFixed(2)),
    approachingBudgetLimit: monthlyBudgetGbp > 0 && usedPercent >= Number(policy.alert_threshold_percent),
    deniedSessionRequests: denials.length,
    denialReasons: denials.reduce((counts, row) => ({ ...counts, [row.denial_reason]: (counts[row.denial_reason] || 0) + 1 }), {}),
    pendingTerminationCount: monthlyUsageRows.filter((row) => !row.terminated_at && row.provider_call_id).length,
    untrackedCallIdPendingCount: monthlyUsageRows.filter((row) => row.termination_status === "awaiting_call_id" && row.termination_last_error === "provider_call_id_pending" && !row.terminated_at).length,
    terminationFailureCount: monthlyUsageRows.filter((row) => Boolean(row.termination_last_error) && !row.terminated_at).length,
    sessionStarts: monthlyUsageRows.length,
    perIntroducer: [...perIntroducer.values()].map((entry) => ({
      ...entry,
      estimatedReservedCostUsd: Number(entry.estimatedReservedCostUsd.toFixed(6)),
      estimatedReservedCostGbp: Number(entry.estimatedReservedCostGbp.toFixed(6)),
      actualCostUsd: Number(entry.actualCostUsd.toFixed(6)),
      actualCostGbp: Number(entry.actualCostGbp.toFixed(6)),
    })),
    note: "Reservations are estimated. Actual provider costs are null unless independently reconciled and recorded; this endpoint does not claim the GBP cap guarantees actual provider spend.",
  }, { headers: noStore });
}

export async function PATCH(request) {
  const access = await authorize(request);
  if (access.response) return access.response;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "A valid policy update is required." }, { status: 400, headers: noStore });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return Response.json({ error: "A valid policy update is required." }, { status: 400, headers: noStore });
  }

  const fields = {
    enabled: ["voicePolicyEnabled", (value) => typeof value === "boolean"],
    monthly_budget_gbp: ["monthlyBudgetGbp", (value) => Number.isFinite(value) && value >= 0 && value < 100000000],
    usd_per_gbp: ["usdPerGbp", (value) => Number.isFinite(value) && value > 0 && value < 100000],
    fx_period: ["fxPeriod", (value) => typeof value === "string" && /^\d{4}-\d{2}-01$/.test(value)],
    fx_source: ["fxSource", (value) => typeof value === "string" && value.trim().length >= 3 && value.trim().length <= 300],
    fx_safety_margin_percent: ["fxSafetyMarginPercent", (value) => Number.isInteger(value) && value >= 0 && value <= 100],
    estimated_cost_per_minute_usd: ["estimatedCostPerMinuteUsd", (value) => Number.isFinite(value) && value > 0 && value < 1000000],
    default_sessions_per_24h: ["defaultSessionsPer24h", (value) => Number.isInteger(value) && value >= 0 && value <= 2147483647],
    default_max_session_seconds: ["defaultMaxSessionSeconds", (value) => Number.isInteger(value) && value >= 300 && value <= 3600],
    completion_grace_seconds: ["completionGraceSeconds", (value) => Number.isInteger(value) && value >= 0 && value <= 3600],
    warning_before_seconds: ["warningBeforeSeconds", (value) => Number.isInteger(value) && value >= 0 && value <= 3600],
    alert_threshold_percent: ["alertThresholdPercent", (value) => Number.isInteger(value) && value >= 1 && value <= 100],
  };
  const args = {};
  for (const [column, [key, valid]] of Object.entries(fields)) {
    if (!Object.hasOwn(body, key)) continue;
    if (!valid(body[key])) {
      return Response.json({ error: `Invalid ${key}.` }, { status: 400, headers: noStore });
    }
    args[`p_${column}`] = body[key];
  }
  if (Object.keys(args).length === 0) {
    return Response.json({ error: "Provide at least one supported policy setting." }, { status: 400, headers: noStore });
  }

  const { data, error } = await access.admin.rpc("update_professional_introducer_voice_policy", args);
  if (error || data !== true) {
    return Response.json({ error: "The Voice Coach policy could not be updated." }, { status: 503, headers: noStore });
  }
  return GET(request);
}
