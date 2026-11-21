import {
  loadIntroducerOrganisationAdmin,
  performIntroducerOrganisationAdminAction,
  IntroducerOrganisationAdminError,
} from "../../../../lib/introducerOrganisationAdmin.server.js";
import {
  authorizeProfessionalIntroducer,
  professionalDemoErrorResponse,
} from "../../../../lib/professionalIntroducerDemoAuth.server.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store", Vary: "Authorization" },
  });
}

function actionErrorResponse(error) {
  if (error instanceof IntroducerOrganisationAdminError) return json({ error: error.message }, error.status);
  return professionalDemoErrorResponse(error);
}

export async function GET(request) {
  try {
    const session = await authorizeProfessionalIntroducer({ request });
    const state = await loadIntroducerOrganisationAdmin({
      admin: session.admin,
      organisationId: session.grant.demoOrganisationId,
    });
    const search = new URL(request.url).searchParams.get("search")?.trim().slice(0, 100).toLocaleLowerCase() || "";
    const workforceRows = search
      ? state.workforceRows.filter((row) => `${row.name} ${row.structural_placement}`.toLocaleLowerCase().includes(search))
      : state.workforceRows;
    return json({
      organisation: state.organisation,
      units: state.units,
      members: state.members,
      people: [],
      workforceRows,
      invitationCounts: { not_invited: workforceRows.length, sent: 0, joined: 0 },
    });
  } catch (error) {
    return actionErrorResponse(error);
  }
}

export async function POST(request) {
  try {
    const length = Number(request.headers.get("content-length") || 0);
    if (length > 8192) return json({ error: "This demonstration action is too large." }, 413);
    const raw = await request.text();
    if (raw.length > 8192) return json({ error: "This demonstration action is too large." }, 413);
    let body;
    try { body = JSON.parse(raw); } catch { return json({ error: "Send a valid demonstration action." }, 400); }
    const session = await authorizeProfessionalIntroducer({ request });
    const result = await performIntroducerOrganisationAdminAction({
      admin: session.admin,
      organisationId: session.grant.demoOrganisationId,
      actorUserId: session.userId,
      action: body,
    });
    return json(result, result.type === "invitation.preview" ? 200 : 201);
  } catch (error) {
    return actionErrorResponse(error);
  }
}
