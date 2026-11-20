import { createHash } from "node:crypto";
import { DEMO_METRICS, FICTIONAL_EMPLOYEES } from "./professionalIntroducerDemoScenario.server.js";

export const INTRODUCER_DEMO_ORGANISATION = Object.freeze({
  id: "7e700070-0070-4070-8070-000000000070",
  name: "Northstar Studio (fictional)",
  status: "demo",
  industry: "Creative and professional services",
  organisation_type: "private_company",
  employee_count: "24",
  workforce_size: 24,
});

const departments = ["Operations", "Customer teams"];

function stableUuid(value) {
  const hex = createHash("sha256").update(`root-health-pr70-demo:${value}`).digest("hex").slice(0, 32).split("");
  hex[12] = "5";
  hex[16] = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  const raw = hex.join("");
  return `${raw.slice(0, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}-${raw.slice(16, 20)}-${raw.slice(20)}`;
}

function scoresFor(employeeIndex, periodIndex) {
  const base = 3 + (employeeIndex % 5);
  const improvement = Math.floor(periodIndex * 0.7);
  const jitter = (employeeIndex + periodIndex) % 3 - 1;
  return Object.fromEntries(DEMO_METRICS.map(({ field }, metricIndex) => [
    field,
    Math.max(0, Math.min(10, base + ((employeeIndex + metricIndex) % 3 - 1) - improvement + jitter)),
  ]));
}

export function buildIntroducerFictionalOrganisationSeed({ now = new Date() } = {}) {
  const organisation = INTRODUCER_DEMO_ORGANISATION;
  const units = departments.map((name) => ({
    id: stableUuid(`unit:${name}`), organisation_id: organisation.id,
    name, unit_type: "department", active: true,
  }));
  const unitByName = new Map(units.map((unit) => [unit.name, unit.id]));
  const members = FICTIONAL_EMPLOYEES.map((employee) => ({
    id: stableUuid(`member:${employee.employee_key}`),
    organisation_id: organisation.id,
    organisation_unit_id: unitByName.get(employee.department),
    profile_key: `demo-northstar-${employee.employee_key}`,
    email: null,
    name: employee.display_name,
    department: employee.department,
    role: "employee",
    user_id: null,
    activated_at: new Date(now.getTime() - 56 * 86400000).toISOString(),
  }));
  const profiles = members.map((member) => ({
    id: stableUuid(`profile:${member.profile_key}`),
    user_id: null,
    profile_key: member.profile_key,
    name: member.name,
    department: member.department,
    organisation_id: organisation.id,
    organisation_name: organisation.name,
    subscription_status: "demo",
  }));

  // Fixed participation cohorts yield baseline and repeated observations at
  // four historical points. All values are synthetic inputs; the genuine Root
  // organisation engine performs the aggregation and privacy suppression.
  const cohortSizes = [18, 15, 12, 10];
  const daysAgo = [56, 42, 28, 14];
  const assessments = [];
  for (let periodIndex = 0; periodIndex < cohortSizes.length; periodIndex += 1) {
    for (let employeeIndex = 0; employeeIndex < cohortSizes[periodIndex]; employeeIndex += 1) {
      const member = members[employeeIndex];
      const createdAt = new Date(now.getTime() - daysAgo[periodIndex] * 86400000).toISOString();
      assessments.push({
        id: stableUuid(`assessment:${member.profile_key}:${periodIndex}`),
        organisation_id: organisation.id,
        profile_key: member.profile_key,
        user_id: null,
        assessment_type: periodIndex === 0 ? "baseline" : "checkin",
        ...scoresFor(employeeIndex, periodIndex),
        notes: null,
        created_at: createdAt,
      });
    }
  }
  return { organisation, units, members, profiles, assessments };
}

async function assertNoFixtureCollision(admin, seed) {
  const { data: existingOrganisation, error: orgError } = await admin.from("organisations")
    .select("id, name, status").eq("id", seed.organisation.id).maybeSingle();
  if (orgError) throw new Error("The fictional organisation could not be checked.");
  if (existingOrganisation && (existingOrganisation.name !== seed.organisation.name || existingOrganisation.status !== "demo")) {
    throw new Error("The reserved fictional organisation identifier is already in use.");
  }

  const keys = seed.profiles.map((profile) => profile.profile_key);
  const { data: existingProfiles, error: profilesError } = await admin.from("profiles")
    .select("profile_key, user_id, organisation_id").in("profile_key", keys);
  if (profilesError) throw new Error("The fictional workforce profile keys could not be checked.");
  if ((existingProfiles || []).some((profile) => profile.user_id || profile.organisation_id !== seed.organisation.id)) {
    throw new Error("A reserved fictional profile key is associated with a non-demo account or organisation.");
  }

  const { data: existingMembers, error: membersError } = await admin.from("organisation_members")
    .select("profile_key, role, user_id").eq("organisation_id", seed.organisation.id);
  if (membersError) throw new Error("The fictional workforce memberships could not be checked.");
  const expectedKeys = new Set(keys);
  if ((existingMembers || []).some((member) => !expectedKeys.has(member.profile_key) || member.user_id || member.role !== "employee")) {
    throw new Error("The reserved fictional organisation contains an unexpected or real-account membership.");
  }
}

export async function provisionIntroducerFictionalOrganisation({
  admin, grantId, userId, voiceCoachEnabled,
  voiceSessionsPer24hOverride, voiceMaxSessionSecondsOverride,
  now = new Date(),
} = {}) {
  if (!admin || !grantId || !userId) throw new Error("A verified Root admin, existing grant, and user are required.");
  if (voiceSessionsPer24hOverride !== undefined && voiceSessionsPer24hOverride !== null
    && (!Number.isInteger(voiceSessionsPer24hOverride) || voiceSessionsPer24hOverride < 0 || voiceSessionsPer24hOverride > 2147483647)) {
    throw new Error("The Root-set per-introducer session allocation is outside the supported range.");
  }
  if (voiceMaxSessionSecondsOverride !== undefined && voiceMaxSessionSecondsOverride !== null
    && (!Number.isInteger(voiceMaxSessionSecondsOverride) || voiceMaxSessionSecondsOverride < 300 || voiceMaxSessionSecondsOverride > 3600)) {
    throw new Error("The Root-set per-introducer session duration is outside the supported range.");
  }
  const seed = buildIntroducerFictionalOrganisationSeed({ now });
  await assertNoFixtureCollision(admin, seed);

  const { data: authResult, error: authError } = await admin.auth.admin.getUserById(userId);
  if (authError || authResult?.user?.id !== userId || !(authResult.user.email_confirmed_at || authResult.user.confirmed_at)) {
    throw new Error("A verified existing Auth account is required before provisioning.");
  }

  const { data: grant, error: grantError } = await admin.from("professional_introducer_demo_access")
    .select("id, user_id, expires_at, revoked_at, demo_organisation_id")
    .eq("id", grantId).maybeSingle();
  const expiry = new Date(grant?.expires_at).getTime();
  if (grantError || !grant || grant.user_id !== userId || grant.revoked_at || !Number.isFinite(expiry) || expiry <= now.getTime()) {
    throw new Error("The selected introducer grant is missing, expired, revoked, or belongs to another user.");
  }

  const { data: memberships, error: membershipError } = await admin.from("organisation_members")
    .select("id").eq("user_id", userId);
  if (membershipError || memberships?.length) {
    throw new Error("The target account has a real organisation membership and cannot be used for introducer access.");
  }

  const { data: personalProfiles, error: personalProfileError } = await admin.from("profiles")
    .select("id, user_id, profile_key, organisation_id, name, email, orientation_completed")
    .eq("user_id", userId);
  if (personalProfileError || (personalProfiles || []).length > 1 || (personalProfiles || []).some((profile) => profile.organisation_id)) {
    throw new Error("The target account's personal Root profile could not be safely established.");
  }
  let personalProfile = personalProfiles?.[0] || null;
  if (!personalProfile) {
    const { data, error } = await admin.from("profiles").insert({
      id: stableUuid(`introducer-personal:${userId}`),
      user_id: userId,
      profile_key: `introducer-personal-${userId}`,
      name: String(authResult.user.user_metadata?.name || authResult.user.user_metadata?.full_name || "").slice(0, 120),
      email: authResult.user.email,
      orientation_completed: false,
      subscription_status: "introducer_demo",
    }).select("id, user_id, profile_key, organisation_id, name, email, orientation_completed").single();
    if (error || !data) throw new Error("The target account's private Personal Root profile could not be prepared.");
    personalProfile = data;
  }

  // Every object uses deterministic keys and upsert, so retries repair partial
  // provisioning without duplicate organisations, members, profiles, or rows.
  const writes = [
    ["organisations", seed.organisation, "id"],
    ["organisation_units", seed.units, "id"],
    ["profiles", seed.profiles, "profile_key"],
    ["organisation_members", seed.members, "organisation_id,profile_key"],
    ["wellbeing_assessments", seed.assessments, "id"],
  ];
  for (const [table, rows, onConflict] of writes) {
    const { error } = await admin.from(table).upsert(rows, { onConflict });
    if (error) throw new Error(`Root could not prepare the fictional ${table.replaceAll("_", " ")} data.`);
  }

  // Mapping is deliberately last: no grant can pass the readiness gate until
  // the complete fictional organisation and its history have been persisted.
  const hasVoiceAllocationUpdate = typeof voiceCoachEnabled === "boolean" ||
    voiceSessionsPer24hOverride !== undefined || voiceMaxSessionSecondsOverride !== undefined;
  if (hasVoiceAllocationUpdate) {
    const { data: allocationUpdated, error: allocationError } = await admin.rpc("update_professional_introducer_voice_allocation", {
      p_user_id: userId,
      p_grant_id: grantId,
      p_voice_coach_enabled: typeof voiceCoachEnabled === "boolean" ? voiceCoachEnabled : null,
      p_update_sessions_override: voiceSessionsPer24hOverride !== undefined,
      p_sessions_per_24h: voiceSessionsPer24hOverride ?? null,
      p_update_duration_override: voiceMaxSessionSecondsOverride !== undefined,
      p_max_session_seconds: voiceMaxSessionSecondsOverride ?? null,
    });
    if (allocationError || allocationUpdated !== true) {
      throw new Error("Root could not safely update the introducer's Voice allocation.");
    }
  }
  const grantUpdate = { demo_organisation_id: seed.organisation.id };
  const { error: mappingError } = await admin.from("professional_introducer_demo_access")
    .update(grantUpdate)
    .eq("id", grantId).eq("user_id", userId).is("revoked_at", null);
  if (mappingError) throw new Error("Root could not map the prepared fictional organisation to the approved access grant.");

  return {
    organisationId: seed.organisation.id,
    organisationName: seed.organisation.name,
    memberCount: seed.members.length,
    profileCount: seed.profiles.length,
    historicalAssessmentCount: seed.assessments.length,
    distinctBaselineParticipants: seed.assessments.filter((row) => row.assessment_type === "baseline").length,
    personalProfileKey: personalProfile.profile_key,
    mappedGrantId: grantId,
  };
}
