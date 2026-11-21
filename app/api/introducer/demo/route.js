import { NextResponse } from "next/server";
import { authorizeProfessionalIntroducer, professionalDemoErrorResponse } from "../../../../lib/professionalIntroducerDemoAuth.server.js";
import { buildIntroducerEmployeeScenario, buildIntroducerEmployerScenario, listIntroducerDemoEmployees } from "../../../../lib/professionalIntroducerDemoScenario.server.js";
import { createIntroducerDemoAssessment, loadIntroducerDemoState, normalizeIntroducerDemoScores, resetIntroducerDemoCheckins } from "../../../../lib/professionalIntroducerDemoStore.server.js";

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
    const state = await loadIntroducerDemoState({ admin: session.admin, grantId: session.grant.id });
    const requestedEmployeeKey = new URL(request.url).searchParams.get("employeeKey") || "employee-01";
    const selectedEmployee = state.members.find((member) => member.employee_key === requestedEmployeeKey);
    if (!selectedEmployee) return response({ error: "Choose one of the fictional employees in this demonstration." }, 400);
    return response({
      consultantLabel: session.grant.consultantLabel,
      expiresAt: session.grant.expiresAt,
      selectedEmployeeKey: selectedEmployee.employee_key,
      employees: listIntroducerDemoEmployees(state.members, state.assessments),
      employee: buildIntroducerEmployeeScenario({ grantId: session.grant.id, employee: selectedEmployee, assessments: state.assessments }),
      employer: buildIntroducerEmployerScenario({ grantId: session.grant.id, members: state.members, assessments: state.assessments }),
      modes: ["consultant_learning", "client_presentation"],
      fictional: true,
    });
  } catch (error) {
    if (error?.message?.startsWith("The fictional")) return response({ error: error.message }, 503);
    return professionalDemoErrorResponse(error);
  }
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
      if (!normalizeIntroducerDemoScores(body.scores)) return response({ error: "Use a whole-number score from 0 to 10 for each check-in measure." }, 400);
      const employeeKey = String(body.employeeKey || "");
      const result = await createIntroducerDemoAssessment({
        admin: session.admin,
        grantId: session.grant.id,
        employeeKey,
        requestId: body.requestId,
        scores: body.scores,
      });
      if (!result.ok) {
        const status = result.reason === "employee_not_found" ? 400 : 409;
        return response({ error: result.reason === "employee_not_found" ? "Choose one of the fictional employees in this demonstration." : "The check-in request could not be confirmed. Review your answers and try again." }, status);
      }
      const state = await loadIntroducerDemoState({ admin: session.admin, grantId: session.grant.id });
      const employee = state.members.find((member) => member.employee_key === employeeKey);
      return response({
        employee: buildIntroducerEmployeeScenario({ grantId: session.grant.id, employee, assessments: state.assessments }),
        employer: buildIntroducerEmployerScenario({ grantId: session.grant.id, members: state.members, assessments: state.assessments }),
        employees: listIntroducerDemoEmployees(state.members, state.assessments),
        selectedEmployeeKey: employeeKey,
        saved: true,
        replayed: result.replayed,
      });
    }

    if (body.action === "reset_demo") {
      const state = await resetIntroducerDemoCheckins({ admin: session.admin, grantId: session.grant.id });
      const employee = state.members.find((member) => member.employee_key === "employee-01");
      return response({
        employee: buildIntroducerEmployeeScenario({ grantId: session.grant.id, employee, assessments: state.assessments }),
        employer: buildIntroducerEmployerScenario({ grantId: session.grant.id, members: state.members, assessments: state.assessments }),
        employees: listIntroducerDemoEmployees(state.members, state.assessments),
        selectedEmployeeKey: "employee-01",
        reset: true,
      });
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
  } catch (error) {
    if (error?.message?.startsWith("The fictional") || error?.message?.startsWith("The check-in") || error?.message?.startsWith("The demonstration activity")) {
      return response({ error: error.message }, 503);
    }
    return professionalDemoErrorResponse(error);
  }
}
