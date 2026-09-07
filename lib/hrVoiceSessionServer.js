import { requireHRCoachOrganisationAccess, loadAuthorisedHRCoachEvidence, hrCoachAccessResponse } from "./hrCoachServerAuth.js";
import { buildOrganisationContext } from "./rootOrganisationContext.js";
import { buildHRRealtimeSession } from "./hrRealtimeSession.js";

export function createHRVoiceSessionHandler({
  authorise = requireHRCoachOrganisationAccess,
  loadEvidence = loadAuthorisedHRCoachEvidence,
  buildSharedContext = buildOrganisationContext,
  fetchImpl = fetch,
  getApiKey = () => process.env.OPENAI_API_KEY,
} = {}) {
  return async function POST(request) {
    try {
      const body = await request.json().catch(() => ({}));
      let access;
      try {
        access = await authorise({ request, organisationId: body?.organisation_id });
      } catch (error) {
        return hrCoachAccessResponse(error);
      }
      const apiKey = getApiKey();
      if (!apiKey) return Response.json({ ok: false, error: "Voice is not configured." }, { status: 500 });
      // Never accept browser evidence, roles, model instructions or private narratives.
      const evidence = await loadEvidence({ supabase: access.supabase,
        organisationId: access.organisationId, buildSharedContext });
      const session = buildHRRealtimeSession(evidence);
      const response = await fetchImpl("https://api.openai.com/v1/realtime/client_secrets", {
        method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ session }),
      });
      const data = await response.json();
      if (!response.ok || !data?.value) {
        return Response.json({ ok: false, error: "Could not create the voice session." }, { status: 502 });
      }
      return Response.json({ ok: true, clientSecret: data.value, expiresAt: data.expires_at },
        { headers: { "Cache-Control": "no-store" } });
    } catch {
      // Do not return upstream payloads, context, credentials or private records.
      return Response.json({ ok: false, error: "Could not load authorised context or start voice. Please try again." }, { status: 500 });
    }
  };
}
