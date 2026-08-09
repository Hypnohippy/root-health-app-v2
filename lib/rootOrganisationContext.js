function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normaliseRole(role) {
  return String(role || "")
    .trim()
    .toLowerCase();
}

function buildUnitPath(unitId, unitsById) {
  if (!unitId) return [];

  const path = [];
  const visited = new Set();

  let currentId = unitId;

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);

    const unit = unitsById.get(currentId);

    if (!unit) break;

    path.unshift({
      id: unit.id,
      name: unit.name,
      unit_type: unit.unit_type,
    });

    currentId = unit.parent_unit_id || null;
  }

  return path;
}

function collectDescendantIds(unitId, childrenByParent) {
  const descendants = [];

  function walk(parentId) {
    const children =
      childrenByParent.get(parentId) || [];

    children.forEach((child) => {
      descendants.push(child.id);
      walk(child.id);
    });
  }

  walk(unitId);

  return descendants;
}

function buildUnitTree(units) {
  const childrenByParent = new Map();

  units.forEach((unit) => {
    const parentKey =
      unit.parent_unit_id || "__root__";

    if (!childrenByParent.has(parentKey)) {
      childrenByParent.set(
        parentKey,
        []
      );
    }

    childrenByParent
      .get(parentKey)
      .push(unit);
  });

  function buildChildren(parentId) {
    const key =
      parentId || "__root__";

    return (
      childrenByParent.get(key) || []
    ).map((unit) => ({
      ...unit,
      children: buildChildren(unit.id),
    }));
  }

  return {
    tree: buildChildren(null),
    childrenByParent,
  };
}

function buildMemberContext({
  member,
  unitsById,
}) {
  const organisationUnit =
    member.organisation_unit_id
      ? unitsById.get(
          member.organisation_unit_id
        ) || null
      : null;

  const unitPath =
    buildUnitPath(
      member.organisation_unit_id,
      unitsById
    );

  return {
    ...member,

    role: normaliseRole(
      member.role
    ),

    organisationUnit,

    unitPath,

    unitPathLabel:
      unitPath.length > 0
        ? unitPath
            .map((unit) => unit.name)
            .join(" → ")
        : "Whole organisation",
  };
}

function buildUnitSummary({
  unit,
  members,
  unitsById,
  childrenByParent,
}) {
  const descendantIds =
    collectDescendantIds(
      unit.id,
      childrenByParent
    );

  const includedUnitIds = new Set([
    unit.id,
    ...descendantIds,
  ]);

  const directMembers =
    members.filter(
      (member) =>
        member.organisation_unit_id ===
        unit.id
    );

  const allMembers =
    members.filter((member) =>
      includedUnitIds.has(
        member.organisation_unit_id
      )
    );

  const employees =
    allMembers.filter(
      (member) =>
        member.role === "employee"
    );

  const hrUsers =
    allMembers.filter(
      (member) =>
        member.role === "hr_admin" ||
        member.role ===
          "organisation_admin"
    );

  const directHRUsers =
    directMembers.filter(
      (member) =>
        member.role === "hr_admin" ||
        member.role ===
          "organisation_admin"
    );

  const activatedEmployees =
    employees.filter(
      (member) =>
        Boolean(member.activated_at)
    );

  const baselineEmployees =
    employees.filter(
      (member) =>
        Boolean(
          member.baseline_completed_at
        )
    );

  return {
    ...unit,

    path:
      buildUnitPath(
        unit.id,
        unitsById
      ),

    descendant_unit_ids:
      descendantIds,

    direct_member_count:
      directMembers.length,

    total_member_count:
      allMembers.length,

    employee_count:
      employees.length,

    activated_employee_count:
      activatedEmployees.length,

    baseline_completed_count:
      baselineEmployees.length,

    hr_user_count:
      hrUsers.length,

    direct_hr_users:
      directHRUsers,

    participation_rate:
      employees.length > 0
        ? Math.round(
            (baselineEmployees.length /
              employees.length) *
              100
          )
        : 0,
  };
}

export async function buildOrganisationContext({
  supabase,
  organisationId,
}) {
  if (!supabase) {
    throw new Error(
      "Root Organisation Context requires a Supabase client."
    );
  }

  if (!organisationId) {
    throw new Error(
      "Root Organisation Context requires an organisation ID."
    );
  }

  const [
    organisationResult,
    unitsResult,
    membersResult,
    reviewsResult,
  ] = await Promise.all([
    supabase
      .from("organisations")
      .select("*")
      .eq("id", organisationId)
      .maybeSingle(),

    supabase
      .from("organisation_units")
      .select(
        "id, organisation_id, name, unit_type, parent_unit_id, active, created_by, created_at"
      )
      .eq(
        "organisation_id",
        organisationId
      )
      .eq("active", true)
      .order("created_at", {
        ascending: true,
      }),

    supabase
      .from("organisation_members")
      .select(
        "id, organisation_id, organisation_unit_id, user_id, profile_key, email, name, department, role, invited_at, activated_at, baseline_completed_at, created_at, last_seen_at"
      )
      .eq(
        "organisation_id",
        organisationId
      ),

    supabase
      .from(
        "organisation_learning_reviews"
      )
      .select("*")
      .eq(
        "organisation_id",
        organisationId
      )
      .order("created_at", {
        ascending: false,
      })
      .limit(24),
  ]);

  if (organisationResult.error) {
    throw organisationResult.error;
  }

  if (unitsResult.error) {
    throw unitsResult.error;
  }

  if (membersResult.error) {
    throw membersResult.error;
  }

  if (reviewsResult.error) {
    console.error(
      "Root Organisation Context review load error:",
      reviewsResult.error
    );
  }

  const organisation =
    organisationResult.data || null;

  const units =
    safeArray(unitsResult.data);

  const rawMembers =
    safeArray(membersResult.data);

  const reviews =
    safeArray(reviewsResult.data);

  const unitsById = new Map(
    units.map((unit) => [
      unit.id,
      unit,
    ])
  );

  const {
    tree,
    childrenByParent,
  } = buildUnitTree(units);

  const members =
    rawMembers.map((member) =>
      buildMemberContext({
        member,
        unitsById,
      })
    );

  const unitSummaries =
    units.map((unit) =>
      buildUnitSummary({
        unit,
        members,
        unitsById,
        childrenByParent,
      })
    );

  const employees =
    members.filter(
      (member) =>
        member.role === "employee"
    );

  const hrAdmins =
    members.filter(
      (member) =>
        member.role === "hr_admin"
    );

  const organisationAdmins =
    members.filter(
      (member) =>
        member.role ===
        "organisation_admin"
    );

  const activatedEmployees =
    employees.filter(
      (member) =>
        Boolean(member.activated_at)
    );

  const baselineEmployees =
    employees.filter(
      (member) =>
        Boolean(
          member.baseline_completed_at
        )
    );

  const hrResponsibilities =
    hrAdmins.map((member) => ({
      membership_id: member.id,

      user_id:
        member.user_id || null,

      name:
        member.name ||
        member.email ||
        "HR Administrator",

      email:
        member.email || null,

      organisation_unit_id:
        member.organisation_unit_id ||
        null,

      organisation_unit:
        member.organisationUnit,

      path:
        member.unitPath,

      responsibility_label:
        member.unitPathLabel,
    }));

  return {
    organisation,

    generatedAt:
      new Date().toISOString(),

    structure: {
      units,
      tree,
      unitCount: units.length,
      unitSummaries,
    },

    people: {
      members,

      memberCount:
        members.length,

      employees,

      employeeCount:
        employees.length,

      activatedEmployeeCount:
        activatedEmployees.length,

      baselineCompletedCount:
        baselineEmployees.length,

      participationRate:
        employees.length > 0
          ? Math.round(
              (baselineEmployees.length /
                employees.length) *
                100
            )
          : 0,

      hrAdmins,

      organisationAdmins,
    },

    responsibilities: {
      hr: hrResponsibilities,

      organisationAdmins:
        organisationAdmins.map(
          (member) => ({
            membership_id:
              member.id,

            user_id:
              member.user_id ||
              null,

            name:
              member.name ||
              member.email ||
              "Organisation Admin",

            email:
              member.email ||
              null,

            responsibility_label:
              "Whole organisation",
          })
        ),
    },

    learning: {
      reviews,

      latestReview:
        reviews[0] || null,

      reviewCount:
        reviews.length,
    },
  };
}
