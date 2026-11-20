import { timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { introducerDeploymentStatus } from "../../../../lib/introducerRestrictedActions.server.js";
import { runDueRealtimeTerminations } from "../../../../lib/introducerRealtimeTermination.server.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function validCronAuthorization(request, secret) {
  if (!secret) return false;
  const provided = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1] || "";
  const left = Buffer.from(provided);
  const right = Buffer.from(secret);
  return left.length === right.length && timingSafeEqual(left, right);
}

function createPreviewAdminClient(env) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  const expectedRef = String(env.ROOT_INTRODUCER_SUPABASE_PROJECT_REF || "").trim();
  let actualRef = "";
  try {
    actualRef = new URL(url).hostname.replace(/\.supabase\.co$/, "");
  } catch {}
  if (!url || !key || !expectedRef || actualRef !== expectedRef) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function GET(request) {
  const env = process.env;
  if (introducerDeploymentStatus(env) !== "introducer_verified") {
    return Response.json({ error: "Not found." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  if (env.ROOT_INTRODUCER_VOICE_TERMINATION_ENABLED !== "true") {
    return Response.json({ error: "Voice termination is not enabled for this Preview." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  if (!validCronAuthorization(request, env.CRON_SECRET)) {
    return Response.json({ error: "Unauthorized." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  const admin = createPreviewAdminClient(env);
  if (!admin || !env.ROOT_INTRODUCER_OPENAI_API_KEY) {
    return Response.json({ error: "Voice termination is not configured." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  try {
    const summary = await runDueRealtimeTerminations({ admin, apiKey: env.ROOT_INTRODUCER_OPENAI_API_KEY, limit: 20 });
    return Response.json(summary, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Voice termination worker failed; due calls remain queued for retry." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
