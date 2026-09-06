import { createHash } from "node:crypto";
import { organisationAdminErrorResponse, requireOrganisationAdmin } from "../../../../lib/organisationAdminServerAuth";
import { applyConfirmedWorkforcePlan, buildConfirmedWorkforcePlan, buildWorkforceRpcPayload, validateHierarchyFields } from "../../../../lib/workforceImportApply";
import { validateWorkforcePreview } from "../../../../lib/workforceImportPreview";

export const runtime = "nodejs";

function safeArray(value, limit) {
  return Array.isArray(value) ? value.slice(0, limit) : [];
}

function planFingerprint(plan) {
  return createHash("sha256").update(JSON.stringify(buildWorkforceRpcPayload(plan))).digest("hex");
}

export async function POST(request) {
  try {
    const body = await request.json();
    const organisationId = String(body?.organisation_id || "").trim();
    const access = await requireOrganisationAdmin({ request, organisationId });
    const canonicalRows = safeArray(body?.canonical_rows, 5000);
    const hierarchyFields = Array.isArray(body?.hierarchy_fields) ? body.hierarchy_fields : [];
    const mappedHierarchyFields = Array.isArray(body?.mapped_hierarchy_fields) ? body.mapped_hierarchy_fields : [];
    if (!canonicalRows.length || hierarchyFields.length > 4 || mappedHierarchyFields.length > 4 || !validateHierarchyFields(hierarchyFields, canonicalRows, mappedHierarchyFields)) {
      return Response.json({ error: "A valid reviewed organisation hierarchy is required." }, { status: 400 });
    }

    const [unitsResult, peopleResult, membersResult] = await Promise.all([
      access.supabase.from("organisation_units").select("id, organisation_id, parent_unit_id, name, unit_type").eq("organisation_id", organisationId),
      access.supabase.from("organisation_people").select("id, organisation_id, organisation_member_id, organisation_unit_id, employee_reference_id, business_email, name").eq("organisation_id", organisationId),
      access.supabase.from("organisation_members").select("id, organisation_id, organisation_unit_id, email, name, role").eq("organisation_id", organisationId),
    ]);
    if (unitsResult.error || peopleResult.error || membersResult.error) throw new Error("Root could not load the current workforce safely.");

    const validation = validateWorkforcePreview({ rows: canonicalRows, columns: [], mappings: {}, existingMembers: membersResult.data || [] });
    const plan = buildConfirmedWorkforcePlan({ canonicalRows, validation, hierarchyFields, existingUnits: unitsResult.data || [], existingPeople: peopleResult.data || [], existingMembers: membersResult.data || [] });

    if (body?.action === "plan") {
      return Response.json({ summary: plan.summary, excluded_rows: plan.excludedRows.map((row) => row.source_row), plan_fingerprint: planFingerprint(plan) });
    }
    if (body?.action !== "apply" || body?.confirmed !== true) return Response.json({ error: "Explicit Organisation Administrator confirmation is required." }, { status: 400 });
    if (body?.expected_plan_fingerprint !== planFingerprint(plan)) {
      return Response.json({ error: "The live organisation changed after review. Please review the final changes again." }, { status: 409 });
    }

    const result = await applyConfirmedWorkforcePlan({ supabase: access.supabase, organisationId, plan });
    return Response.json({ ok: true, result });
  } catch (error) {
    return organisationAdminErrorResponse(error);
  }
}
