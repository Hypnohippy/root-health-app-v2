import { requireRootAdmin, createRootAdminClient } from "../../../../lib/rootAdminAuth.js";
import { isIntroducerDeployment } from "../../../../lib/introducerRestrictedActions.server.js";
import { provisionIntroducerFictionalOrganisation } from "../../../../lib/provisionIntroducerFictionalWorkforce.server.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sameOrigin(request) {
  try { return new URL(request.headers.get("origin") || "").origin === new URL(request.url).origin; }
  catch { return false; }
}

export async function POST(request) {
  if (!isIntroducerDeployment()) {
    return Response.json({ error: "This Root-only provisioning operation is unavailable here." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  if (!sameOrigin(request)) {
    return Response.json({ error: "Request origin could not be verified." }, { status: 403, headers: { "Cache-Control": "no-store" } });
  }
  const authorization = await requireRootAdmin(request);
  if (!authorization.authorised) {
    return Response.json({ error: authorization.error }, { status: authorization.status, headers: { "Cache-Control": "no-store" } });
  }
  if (!(authorization.user.email_confirmed_at || authorization.user.confirmed_at)) {
    return Response.json({ error: "A verified Root administrator account is required." }, { status: 403, headers: { "Cache-Control": "no-store" } });
  }

  let body;
  try { body = await request.json(); }
  catch { return Response.json({ error: "Choose an existing approved access grant." }, { status: 400, headers: { "Cache-Control": "no-store" } }); }
  const grantId = String(body?.grantId || "");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(grantId)) {
    return Response.json({ error: "Choose an existing approved access grant." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  const userId = String(body?.userId || "");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) {
    return Response.json({ error: "Choose the existing account attached to that access grant." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  if (Object.hasOwn(body || {}, "voiceCoachEnabled") && typeof body.voiceCoachEnabled !== "boolean") {
    return Response.json({ error: "Voice access must be explicitly enabled or left unchanged." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  if (Object.hasOwn(body || {}, "voiceSessionsPer24hOverride")
    && body.voiceSessionsPer24hOverride !== null
    && (!Number.isInteger(body.voiceSessionsPer24hOverride) || body.voiceSessionsPer24hOverride < 0 || body.voiceSessionsPer24hOverride > 2147483647)) {
    return Response.json({ error: "The per-introducer Voice session allocation must be a non-negative integer or null for the project default." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  if (Object.hasOwn(body || {}, "voiceMaxSessionSecondsOverride")
    && body.voiceMaxSessionSecondsOverride !== null
    && (!Number.isInteger(body.voiceMaxSessionSecondsOverride) || body.voiceMaxSessionSecondsOverride < 300 || body.voiceMaxSessionSecondsOverride > 3600)) {
    return Response.json({ error: "The per-introducer Voice session duration must be between 300 and 3600 seconds or null for the project default." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const result = await provisionIntroducerFictionalOrganisation({
      admin: createRootAdminClient(),
      grantId,
      userId,
      ...(Object.hasOwn(body || {}, "voiceCoachEnabled") ? { voiceCoachEnabled: body.voiceCoachEnabled } : {}),
      ...(Object.hasOwn(body || {}, "voiceSessionsPer24hOverride") ? { voiceSessionsPer24hOverride: body.voiceSessionsPer24hOverride } : {}),
      ...(Object.hasOwn(body || {}, "voiceMaxSessionSecondsOverride") ? { voiceMaxSessionSecondsOverride: body.voiceMaxSessionSecondsOverride } : {}),
    });
    return Response.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store", Vary: "Authorization" } });
  } catch (error) {
    return Response.json({ error: error?.message || "Root could not prepare the fictional demonstration." }, {
      status: 409,
      headers: { "Cache-Control": "no-store", Vary: "Authorization" },
    });
  }
}
