import { NextResponse } from "next/server";
import { authorizeProfessionalIntroducer, professionalDemoErrorResponse } from "../../../../lib/professionalIntroducerDemoAuth.server.js";
import { buildIntroducerEmployeeScenario, buildIntroducerEmployerScenario } from "../../../../lib/professionalIntroducerDemoScenario.server.js";

export const runtime = "nodejs";

function sameOrigin(request) {
  try { return new URL(request.headers.get("origin") || "").origin === new URL(request.url).origin; }
  catch { return false; }
}

function response(data, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store", "Vary": "Authorization" } });
}

export async function GET(request) {
  try {
    const session = await authorizeProfessionalIntroducer({ request });
    return response({
      consultantLabel: session.grant.consultantLabel,
      expiresAt: session.grant.expiresAt,
      employee: buildIntroducerEmployeeScenario(),
      employer: buildIntroducerEmployerScenario(),
      modes: ["consultant_learning", "client_presentation"],
      fictional: true,
    });
  } catch (error) { return professionalDemoErrorResponse(error); }
}

export async function POST(request) {
  try {
    if (!sameOrigin(request)) return response({ error: "Request origin could not be verified." }, 403);
    const raw = await request.text();
    if (raw.length > 4096) return response({ error: "The request is too large." }, 413);
    let body;
    try { body = JSON.parse(raw); } catch { return response({ error: "Request could not be read." }, 400); }

    const session = await authorizeProfessionalIntroducer({ request });
    if (body.action === "sample_checkin") {
      const scores = body.scores;
      const keys = ["stress", "sleep", "recovery", "energy", "mood", "focus", "burnout"];
      if (!scores || keys.some((key) => !Number.isInteger(scores[key]) || scores[key] < 0 || scores[key] > 10)) {
        return response({ error: "Use a whole-number score from 0 to 10 for each check-in measure." }, 400);
      }
      return response({ employee: buildIntroducerEmployeeScenario({ scores }), saved: false });
    }

    if (body.action !== "introduction_request") return response({ error: "Choose a supported demonstration action." }, 400);
    const organisationName = String(body.organisationName || "").trim();
    const contactName = String(body.contactName || "").trim();
    const contactEmail = String(body.contactEmail || "").trim().toLowerCase();
    const reason = String(body.reason || "").trim();
    const nextStep = String(body.desiredNextStep || "");
    const permission = body.contactPermissionConfirmed === true;
    const allowedSteps = ["introductory_call", "product_demonstration", "send_information", "follow_up_with_consultant"];
    if (organisationName.length < 2 || organisationName.length > 160 || reason.length < 10 || reason.length > 800 || !allowedSteps.includes(nextStep)) {
      return response({ error: "Complete the organisation, reason and next-step fields." }, 400);
    }
    const hasContact = Boolean(contactName || contactEmail);
    if (contactName.length > 120 || contactEmail.length > 254 || (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail))) {
      return response({ error: "Check the contact details." }, 400);
    }
    if (hasContact && !permission) return response({ error: "Confirm that the contact has agreed to their details being shared." }, 400);

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count, error: rateError } = await session.admin.from("professional_introducer_demo_requests")
      .select("id", { count: "exact", head: true }).eq("consultant_user_id", session.userId).gte("created_at", since);
    if (rateError) return response({ error: "Introduction requests are temporarily unavailable." }, 503);
    if ((count || 0) >= 5) return response({ error: "The daily demonstration request limit has been reached." }, 429);

    const { error } = await session.admin.from("professional_introducer_demo_requests").insert({
      access_grant_id: session.grant.id,
      consultant_user_id: session.userId,
      consultant_label: session.grant.consultantLabel,
      organisation_name: organisationName,
      contact_name: contactName || null,
      contact_email: contactEmail || null,
      reason_for_interest: reason,
      desired_next_step: nextStep,
      contact_permission_confirmed: hasContact ? permission : false,
    });
    if (error) return response({ error: "Root could not record this introduction request." }, 503);
    return response({ received: true, message: "Introduction request recorded for Root Health follow-up. No message has been sent." }, 201);
  } catch (error) { return professionalDemoErrorResponse(error); }
}
