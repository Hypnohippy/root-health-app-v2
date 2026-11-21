import { authorizeRealtimeSession, realtimeSessionAccessResponse, RealtimeSessionAccessError } from "../../../../../lib/realtimeSessionGuard.server.js";
import { isIntroducerDeployment } from "../../../../../lib/introducerRestrictedActions.server.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store", Vary: "Authorization" };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request) {
  if (!isIntroducerDeployment(process.env)) {
    return Response.json({ error: "Voice completion extension is available only in the verified introducer Preview." }, { status: 404, headers: noStore });
  }

  let access;
  try {
    access = await authorizeRealtimeSession({ request });
  } catch (error) {
    return realtimeSessionAccessResponse(error);
  }
  if (access.mode !== "introducer") {
    return realtimeSessionAccessResponse(new RealtimeSessionAccessError("Voice completion extension is unavailable.", 403));
  }

  let body;
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw, "utf8") > 1024) {
      return Response.json({ error: "The completion request is too large." }, { status: 413, headers: noStore });
    }
    body = JSON.parse(raw);
  } catch {
    return Response.json({ error: "A valid Voice reservation is required." }, { status: 400, headers: noStore });
  }
  const reservationId = typeof body?.reservationId === "string" ? body.reservationId.trim() : "";
  if (!uuidPattern.test(reservationId)) {
    return Response.json({ error: "A valid Voice reservation is required." }, { status: 400, headers: noStore });
  }

  const { data, error } = await access.admin.rpc("extend_professional_introducer_voice_completion", {
    p_reservation_id: reservationId,
    p_user_id: access.user.id,
    p_grant_id: access.grant.id,
  });
  if (error) return Response.json({ error: "Voice completion could not be verified." }, { status: 503, headers: noStore });
  if (data !== true) return Response.json({ error: "This Voice session cannot be extended." }, { status: 409, headers: noStore });
  return Response.json({ extended: true }, { headers: noStore });
}
