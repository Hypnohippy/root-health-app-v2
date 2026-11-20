import { createClient } from "@supabase/supabase-js";
import { introducerDeploymentStatus } from "./introducerRestrictedActions.server.js";
import { authorizeProfessionalIntroducer } from "./professionalIntroducerDemoAuth.server.js";

export class RealtimeSessionAccessError extends Error {
  constructor(message, status = 403) {
    super(message);
    this.name = "RealtimeSessionAccessError";
    this.status = status;
  }
}

/** Use a separate provider credential for introducer Preview. An inherited
 * general Preview/Production OpenAI key must never be an implicit fallback. */
export function realtimeProviderApiKey(mode, env = process.env) {
  if (mode === "introducer") return String(env.ROOT_INTRODUCER_OPENAI_API_KEY || "").trim();
  if (mode === "customer") return String(env.OPENAI_API_KEY || "").trim();
  return "";
}

const customerAttempts = new Map();
const CUSTOMER_RATE_WINDOW_MS = 60 * 60 * 1000;
const CUSTOMER_MAX_SESSIONS = 10;
const CUSTOMER_MIN_INTERVAL_MS = 30 * 1000;

export function consumeCustomerRealtimeAllowance(userId, now = Date.now()) {
  const key = String(userId || "");
  if (!key) return false;
  const recent = (customerAttempts.get(key) || []).filter((at) => now - at < CUSTOMER_RATE_WINDOW_MS);
  if (recent.length >= CUSTOMER_MAX_SESSIONS || (recent.length && now - recent.at(-1) < CUSTOMER_MIN_INTERVAL_MS)) {
    customerAttempts.set(key, recent);
    return false;
  }
  recent.push(now);
  customerAttempts.set(key, recent);
  if (customerAttempts.size > 5000) {
    for (const [user, timestamps] of customerAttempts) {
      if (!timestamps.some((at) => now - at < CUSTOMER_RATE_WINDOW_MS)) customerAttempts.delete(user);
      if (customerAttempts.size <= 4000) break;
    }
  }
  return true;
}

async function authorizeCustomerRealtimeSession(request) {
  const token = request?.headers?.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || "";
  if (!token) throw new RealtimeSessionAccessError("Sign in to use Root Voice.", 401);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new RealtimeSessionAccessError("Voice authentication is unavailable.", 503);
  const client = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data: authData, error: authError } = await client.auth.getUser(token);
  const user = authData?.user;
  if (authError || !user?.id) throw new RealtimeSessionAccessError("Sign in to use Root Voice.", 401);
  const [subscription, membership] = await Promise.all([
    client.from("personal_subscriptions").select("user_id").eq("user_id", user.id)
      .eq("subscription_status", "active").eq("subscription_active", true).limit(1),
    client.from("organisation_members").select("id").eq("user_id", user.id).limit(1),
  ]);
  if (subscription.error || membership.error) throw new RealtimeSessionAccessError("Root could not verify Voice access.", 503);
  if (!(subscription.data?.length || membership.data?.length)) {
    throw new RealtimeSessionAccessError("An active Root Personal subscription or organisation membership is required.", 403);
  }
  return { mode: "customer", client, user, userId: user.id, grant: null, admin: null };
}

/**
 * Voice is a separate Root-controlled capability on the demo grant. The
 * regular introducer grant is necessary but never sufficient for provider
 * access. The read is service-role-only and happens on every session request.
 */
export async function authorizeRealtimeSession({
  request,
  authorizeDemo = authorizeProfessionalIntroducer,
  env = process.env,
} = {}) {
  const deployment = introducerDeploymentStatus(env);
  if (deployment === "misconfigured") throw new RealtimeSessionAccessError("Voice access is unavailable in this deployment.", 503);
  if (deployment === "customer") return authorizeCustomerRealtimeSession(request);
  let demo;
  try {
    demo = await authorizeDemo({ request });
  } catch (error) {
    throw new RealtimeSessionAccessError(
      error?.message || "Sign in with your active invited Root Health account.",
      error?.status || 403,
    );
  }

  const { data: grant, error } = await demo.admin
    .from("professional_introducer_demo_access")
    .select("voice_coach_enabled")
    .eq("id", demo.grant.id)
    .eq("user_id", demo.userId)
    .maybeSingle();
  if (error) throw new RealtimeSessionAccessError("Voice access could not be verified.", 503);
  if (grant?.voice_coach_enabled !== true) {
    throw new RealtimeSessionAccessError("Root Voice is not included in this demonstration grant.", 403);
  }

  return {
    mode: "introducer",
    client: demo.userClient,
    admin: demo.admin,
    user: demo.user,
    grant: demo.grant,
  };
}

/** Reserve quota atomically in the isolated Preview database. Any RPC error is
 * fail-closed. The SQL function is service_role-only and checks the grant again
 * in the same transaction as the reservation. */
export async function reserveRealtimeSessionAllowance({ admin, userId, grantId } = {}) {
  if (!admin || !userId || !grantId) {
    throw new RealtimeSessionAccessError("Voice usage controls are unavailable.", 503);
  }
  const { data, error } = await admin.rpc("reserve_professional_introducer_voice_session", {
    p_user_id: userId,
    p_grant_id: grantId,
  });
  if (error) throw new RealtimeSessionAccessError("Voice usage controls are unavailable.", 503);
  const reservation = Array.isArray(data) ? data[0] : data;
  if (!reservation || typeof reservation.allowed !== "boolean") {
    throw new RealtimeSessionAccessError("Voice usage controls are unavailable.", 503);
  }
  return {
    allowed: reservation.allowed,
    denialReason: reservation.denial_reason || null,
    maxSessionSeconds: Number.isInteger(reservation.max_session_seconds)
      ? reservation.max_session_seconds
      : null,
    plannedSessionSeconds: Number.isInteger(reservation.planned_session_seconds)
      ? reservation.planned_session_seconds
      : null,
    completionGraceSeconds: Number.isInteger(reservation.completion_grace_seconds)
      ? reservation.completion_grace_seconds
      : null,
    warningBeforeSeconds: Number.isInteger(reservation.warning_before_seconds)
      ? reservation.warning_before_seconds
      : null,
    reservedCostUsd: reservation.reserved_cost_usd == null
      ? null
      : Number(reservation.reserved_cost_usd),
    reservedCostGbp: reservation.reserved_cost_gbp == null
      ? null
      : Number(reservation.reserved_cost_gbp),
    projectBudgetUsedGbp: reservation.project_budget_used_gbp == null
      ? null
      : Number(reservation.project_budget_used_gbp),
    projectMonthlyBudgetGbp: reservation.project_monthly_budget_gbp == null
      ? null
      : Number(reservation.project_monthly_budget_gbp),
    alertThresholdPercent: Number.isInteger(reservation.alert_threshold_percent)
      ? reservation.alert_threshold_percent
      : null,
    reservationId: typeof reservation.reservation_id === "string" ? reservation.reservation_id : null,
  };
}

export async function confirmRealtimeGrantActive({ admin, userId, grantId } = {}) {
  const { data, error } = await admin
    .from("professional_introducer_demo_access")
    .select("id")
    .eq("id", grantId)
    .eq("user_id", userId)
    .eq("voice_coach_enabled", true)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (error) throw new RealtimeSessionAccessError("Voice access could not be verified.", 503);
  if (!data?.id) throw new RealtimeSessionAccessError("Your Voice access has expired or been revoked.", 403);
  return true;
}

export function realtimeSessionAccessResponse(error) {
  const status = error instanceof RealtimeSessionAccessError ? error.status : 500;
  const message = error instanceof RealtimeSessionAccessError
    ? error.message
    : "Root could not verify Voice access.";
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}
