const UNIT_TYPES = new Set([
  "department", "region", "country", "division", "business_unit",
  "function", "site", "team", "other",
]);
const FICTIONAL_ROLES = new Set(["employee", "hr_admin", "organisation_admin"]);
const MEMBER_FIELDS = "id, organisation_id, organisation_unit_id, user_id, profile_key, email, name, department, role, activated_at, created_at";
const UNIT_FIELDS = "id, organisation_id, name, unit_type, parent_unit_id, active, created_by, created_at";

export class IntroducerOrganisationAdminError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "IntroducerOrganisationAdminError";
    this.status = status;
  }
}

const failClosed = () => new IntroducerOrganisationAdminError("The fictional employer administration is unavailable.", 503);
const validId = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));

async function assertDemoOrganisation(admin, organisationId) {
  if (!admin || !validId(organisationId)) throw failClosed();
  const { data, error } = await admin.from("organisations")
    .select("id, name, status").eq("id", organisationId).maybeSingle();
  if (error || data?.id !== organisationId || data.status !== "demo") throw failClosed();
  return data;
}

export async function loadIntroducerOrganisationAdmin({ admin, organisationId }) {
  const organisation = await assertDemoOrganisation(admin, organisationId);
  const [unitResult, memberResult] = await Promise.all([
    admin.from("organisation_units").select(UNIT_FIELDS)
      .eq("organisation_id", organisationId).order("name", { ascending: true }),
    admin.from("organisation_members").select(MEMBER_FIELDS)
      .eq("organisation_id", organisationId).order("created_at", { ascending: true }),
  ]);
  if (unitResult.error || memberResult.error || !Array.isArray(unitResult.data) || !Array.isArray(memberResult.data)) {
    throw failClosed();
  }
  if (memberResult.data.some((member) => member.user_id || !FICTIONAL_ROLES.has(member.role))) {
    throw failClosed();
  }
  const units = unitResult.data;
  const members = memberResult.data;
  const unitById = new Map(units.map((unit) => [unit.id, unit]));
  const workforceRows = members.map((member) => ({
    id: member.id,
    name: member.name || "Fictional employee",
    business_email: null,
    structural_placement: unitById.get(member.organisation_unit_id)?.name || member.department || "Not placed in structure",
    root_status: "not_invited",
    eligible: true,
  }));
  return {
    organisation,
    units,
    members,
    workforceRows,
    invitationCounts: { not_invited: workforceRows.length, sent: 0, joined: 0 },
  };
}

export async function performIntroducerOrganisationAdminAction({
  admin, organisationId, actorUserId, action,
} = {}) {
  await assertDemoOrganisation(admin, organisationId);
  if (!actorUserId || typeof action?.type !== "string") throw new IntroducerOrganisationAdminError("Choose a supported demonstration action.");

  if (action.type === "unit.create") {
    const name = String(action.name || "").trim().replace(/\s+/g, " ");
    const unitType = String(action.unitType || "");
    const parentId = action.parentUnitId ? String(action.parentUnitId) : null;
    if (!name || name.length > 80 || /[\u0000-\u001f\u007f]/.test(name) || !UNIT_TYPES.has(unitType)) {
      throw new IntroducerOrganisationAdminError("Enter a valid fictional unit name and type.");
    }
    const { data: existing, error: existingError } = await admin.from("organisation_units")
      .select("id, name, parent_unit_id").eq("organisation_id", organisationId);
    if (existingError || !Array.isArray(existing)) throw failClosed();
    if (existing.some((unit) => unit.parent_unit_id === parentId && unit.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase())) {
      throw new IntroducerOrganisationAdminError("A unit with this name already exists at that level.", 409);
    }
    if (parentId) {
      if (!validId(parentId)) throw new IntroducerOrganisationAdminError("The selected parent unit is not valid.");
      const parent = existing.find((unit) => unit.id === parentId);
      if (!parent) throw new IntroducerOrganisationAdminError("The selected parent is outside this fictional organisation.", 403);
    }
    const { data, error } = await admin.from("organisation_units").insert({
      organisation_id: organisationId,
      name,
      unit_type: unitType,
      parent_unit_id: parentId,
      active: true,
      created_by: actorUserId,
    }).select(UNIT_FIELDS).single();
    if (error || !data) throw failClosed();
    return { type: "unit.created", unit: data };
  }

  if (action.type === "member.role") {
    const memberId = String(action.memberId || "");
    const role = String(action.role || "");
    if (!validId(memberId) || !FICTIONAL_ROLES.has(role)) throw new IntroducerOrganisationAdminError("Choose a valid role for a fictional employee.");
    const { data, error } = await admin.from("organisation_members").update({ role })
      .eq("id", memberId).eq("organisation_id", organisationId).is("user_id", null)
      .select(MEMBER_FIELDS).maybeSingle();
    if (error) throw failClosed();
    if (!data || data.user_id || data.organisation_id !== organisationId) {
      throw new IntroducerOrganisationAdminError("Only an unlinked fictional employee in this organisation can be updated.", 404);
    }
    return { type: "member.role.updated", member: data };
  }

  if (action.type === "invitation.preview") {
    const memberIds = Array.isArray(action.memberIds) ? [...new Set(action.memberIds.map(String))] : [];
    if (!memberIds.length || memberIds.length > 100 || memberIds.some((id) => !validId(id))) {
      throw new IntroducerOrganisationAdminError("Select up to 100 fictional employees to preview.");
    }
    const { data, error } = await admin.from("organisation_members")
      .select("id, organisation_id, name, department, role, user_id")
      .eq("organisation_id", organisationId).is("user_id", null).in("id", memberIds);
    if (error || !Array.isArray(data)) throw failClosed();
    if (data.length !== memberIds.length || data.some((member) => member.organisation_id !== organisationId || member.user_id)) {
      throw new IntroducerOrganisationAdminError("Only fictional employees in the mapped demonstration organisation can be selected.", 403);
    }
    return {
      type: "invitation.preview",
      previewOnly: true,
      recipients: data.map(({ id, name, department, role }) => ({ id, name, department, role })),
      message: "Preview only. No invitation record, account, token or email was created.",
    };
  }

  throw new IntroducerOrganisationAdminError("That demonstration action is not available.");
}
