import { authorizeProfessionalIntroducer, professionalDemoErrorResponse } from "../../../../lib/professionalIntroducerDemoAuth.server.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const session = await authorizeProfessionalIntroducer({ request });
    const { data: organisation, error } = await session.admin.from("organisations")
      .select("id, name, status").eq("id", session.grant.demoOrganisationId).maybeSingle();
    if (error || organisation?.status !== "demo") {
      return Response.json({ error: "The fictional employer is not available." }, {
        status: error ? 503 : 403,
        headers: { "Cache-Control": "no-store", Vary: "Authorization" },
      });
    }
    const [voiceGrantResult, voicePolicyResult] = await Promise.all([
      session.admin.from("professional_introducer_demo_access")
        .select("voice_coach_enabled")
        .eq("id", session.grant.id)
        .eq("user_id", session.userId)
        .maybeSingle(),
      session.admin.from("professional_introducer_voice_policy")
        .select("enabled,server_termination_ready")
        .eq("singleton", true)
        .maybeSingle(),
    ]);
    const voiceCoachStatus = voiceGrantResult.error || voicePolicyResult.error || !voicePolicyResult.data
      ? "status_unavailable"
      : voicePolicyResult.data.enabled !== true
        ? "policy_paused"
        : voicePolicyResult.data.server_termination_ready !== true
          ? "termination_controls_pending"
          : voiceGrantResult.data?.voice_coach_enabled !== true
            ? "root_authorization_required"
            : "available";
    return Response.json({
      userId: session.userId,
      consultantLabel: session.grant.consultantLabel,
      expiresAt: session.grant.expiresAt,
      organisation: { id: organisation.id, name: organisation.name },
      personalRootAvailable: true,
      workplaceAvailable: true,
      // This is a grant-scoped capability, not an organisation_members role.
      // The dedicated API revalidates the same grant on every admin action.
      employerAdminAvailable: true,
      voiceCoachAvailable: voiceCoachStatus === "available",
      voiceCoachStatus,
    }, { headers: { "Cache-Control": "no-store", Vary: "Authorization" } });
  } catch (error) {
    return professionalDemoErrorResponse(error);
  }
}
