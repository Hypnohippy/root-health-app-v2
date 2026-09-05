const STRUCTURE_FIELDS = new Set(["division", "department", "team", "location"]);
const BLOCKING_ROW_ISSUES = new Set(["invalid_email", "duplicate_email", "duplicate_employee_id", "missing_placement", "ambiguous_manager"]);

export function normaliseWorkforceValue(value) {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function deriveHierarchyFields(columns = [], mappings = {}) {
  return columns
    .map((column) => mappings[column.key]?.field)
    .filter((field, index, fields) => STRUCTURE_FIELDS.has(field) && fields.indexOf(field) === index);
}

export function buildConfirmedWorkforcePlan({ canonicalRows = [], validation = { issues: [] }, hierarchyFields = [], existingUnits = [], existingPeople = [], existingMembers = [] } = {}) {
  const blockedRows = new Set((validation.issues || []).filter((item) => item.row && BLOCKING_ROW_ISSUES.has(item.type)).map((item) => item.row));
  const safeRows = canonicalRows.filter((row) => !blockedRows.has(row.source_row));
  const units = new Map();

  safeRows.forEach((row) => {
    let parentKey = null;
    hierarchyFields.forEach((field) => {
      const name = String(row[field] || "").trim();
      if (!name) return;
      const key = `${parentKey || "root"}|${field}|${normaliseWorkforceValue(name)}`;
      if (!units.has(key)) units.set(key, { key, parentKey, name, unitType: field === "location" ? "site" : field });
      parentKey = key;
    });
    row.__leafUnitKey = parentKey;
  });

  const proposedUnits = [...units.values()];
  const existingByParent = new Map();
  existingUnits.forEach((unit) => {
    const key = `${unit.parent_unit_id || "root"}|${unit.unit_type}|${normaliseWorkforceValue(unit.name)}`;
    existingByParent.set(key, unit);
  });
  const resolvedUnitIds = new Map();
  proposedUnits.forEach((unit) => {
    const parentId = unit.parentKey ? resolvedUnitIds.get(unit.parentKey) : null;
    if (unit.parentKey && !parentId) return;
    const existing = existingByParent.get(`${parentId || "root"}|${unit.unitType}|${normaliseWorkforceValue(unit.name)}`);
    if (existing) {
      unit.existingId = existing.id;
      resolvedUnitIds.set(unit.key, existing.id);
    }
  });

  const uniqueLookup = (records, valueFor) => {
    const grouped = new Map();
    records.forEach((record) => {
      const key = normaliseWorkforceValue(valueFor(record));
      if (key) grouped.set(key, [...(grouped.get(key) || []), record]);
    });
    return grouped;
  };
  const peopleByReference = uniqueLookup(existingPeople, (person) => person.employee_reference_id);
  const peopleByEmail = uniqueLookup(existingPeople, (person) => person.business_email);
  const membersByEmail = uniqueLookup(existingMembers, (member) => member.email);
  const ambiguousRows = new Set();
  let creates = 0;
  let updates = 0;
  const people = safeRows.map((row) => {
    const referenceMatches = row.employee_id ? peopleByReference.get(normaliseWorkforceValue(row.employee_id)) || [] : [];
    const emailMatches = row.email ? peopleByEmail.get(normaliseWorkforceValue(row.email)) || [] : [];
    const matchedIds = new Set([...referenceMatches, ...emailMatches].map((person) => person.id));
    const memberMatches = row.email ? membersByEmail.get(normaliseWorkforceValue(row.email)) || [] : [];
    if (matchedIds.size > 1 || memberMatches.length > 1) {
      ambiguousRows.add(row.source_row);
      return null;
    }
    const existing = referenceMatches[0] || emailMatches[0] || null;
    existing ? updates += 1 : creates += 1;
    return { row, existing, member: memberMatches[0] || null, leafUnitKey: row.__leafUnitKey };
  }).filter(Boolean);

  const excludedRows = canonicalRows.filter((row) => blockedRows.has(row.source_row) || ambiguousRows.has(row.source_row));
  const usedUnitKeys = new Set();
  const unitsByKey = new Map(proposedUnits.map((unit) => [unit.key, unit]));
  people.forEach((item) => {
    let key = item.leafUnitKey;
    while (key) {
      usedUnitKeys.add(key);
      key = unitsByKey.get(key)?.parentKey || null;
    }
  });
  const usableUnits = proposedUnits.filter((unit) => usedUnitKeys.has(unit.key));

  return {
    hierarchyFields,
    units: usableUnits,
    people,
    excludedRows,
    summary: { units: usableUnits.filter((unit) => !unit.existingId).length, people: creates, existingPeople: updates, excluded: excludedRows.length },
  };
}

function assertResult(result, message) {
  if (result?.error) throw new Error(result.error.message || message);
  return result?.data;
}

export function buildWorkforceRpcPayload(plan) {
  return {
    units: plan.units.map(({ key, parentKey, name, unitType, existingId }) => ({ key, parentKey, name, unitType, expectedExistingId: existingId || null })),
    people: plan.people.map(({ row, leafUnitKey, existing, member }) => ({
      leafUnitKey,
      expectedExistingPersonId: existing?.id || null,
      expectedMembershipId: member?.id || null,
      row: {
        source_row: row.source_row,
        name: row.name,
        email: row.email,
        employee_id: row.employee_id,
        job_title: row.job_title,
        location: row.location,
        manager: row.manager,
      },
    })),
  };
}

export async function applyConfirmedWorkforcePlan({ supabase, organisationId, plan }) {
  const payload = buildWorkforceRpcPayload(plan);
  const result = await supabase.rpc("apply_confirmed_workforce_import", {
    requested_organisation_id: organisationId,
    confirmed_units: payload.units,
    confirmed_people: payload.people,
  });
  const data = assertResult(result, "Root could not apply the confirmed workforce import.");
  return { ...data, excludedRows: plan.excludedRows.length };
}
