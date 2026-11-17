import { DEMO_METRICS, buildIntroducerDemoSeed } from "./professionalIntroducerDemoScenario.server.js";

const MEMBERS_TABLE = "professional_introducer_demo_members";
const ASSESSMENTS_TABLE = "professional_introducer_demo_assessments";
const SCORE_FIELDS = DEMO_METRICS.map(({ field }) => field);
const ASSESSMENT_FIELDS = `id, access_grant_id, employee_key, assessment_key, assessment_type, ${SCORE_FIELDS.join(", ")}, created_at`;

function fail(message) { throw new Error(message); }

export function normalizeIntroducerDemoScores(scores) {
  if (!scores || typeof scores !== "object" || Array.isArray(scores)) return null;
  const normalized = {};
  for (const { key, field } of DEMO_METRICS) {
    const value = scores[key];
    if (!Number.isInteger(value) || value < 0 || value > 10) return null;
    normalized[field] = value;
  }
  return normalized;
}

export async function loadIntroducerDemoState({ admin, grantId, now = new Date() } = {}) {
  if (!admin || !grantId) fail("The authorised demonstration scope is unavailable.");
  const seed = buildIntroducerDemoSeed({ grantId, now });
  const { error: memberSeedError } = await admin.from(MEMBERS_TABLE).upsert(seed.members, {
    onConflict: "access_grant_id,employee_key", ignoreDuplicates: true,
  });
  if (memberSeedError) fail("The fictional workforce could not be loaded.");
  const { error: assessmentSeedError } = await admin.from(ASSESSMENTS_TABLE).upsert(seed.assessments, {
    onConflict: "access_grant_id,assessment_key", ignoreDuplicates: true,
  });
  if (assessmentSeedError) fail("The fictional check-in history could not be loaded.");

  const [{ data: members, error: membersError }, { data: assessments, error: assessmentsError }] = await Promise.all([
    admin.from(MEMBERS_TABLE).select("employee_key, display_name, department").eq("access_grant_id", grantId).order("employee_key"),
    admin.from(ASSESSMENTS_TABLE).select(ASSESSMENT_FIELDS).eq("access_grant_id", grantId).order("created_at"),
  ]);
  if (membersError || assessmentsError || !Array.isArray(members) || !Array.isArray(assessments)) {
    fail("The fictional demonstration data could not be read.");
  }
  return { members, assessments };
}

export async function createIntroducerDemoAssessment({ admin, grantId, employeeKey, requestId, scores, now = new Date() } = {}) {
  if (!admin || !grantId || !employeeKey || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(requestId || ""))) {
    return { ok: false, reason: "invalid_request" };
  }
  const normalized = normalizeIntroducerDemoScores(scores);
  if (!normalized) return { ok: false, reason: "invalid_scores" };

  const state = await loadIntroducerDemoState({ admin, grantId, now });
  if (!state.members.some((member) => member.employee_key === employeeKey)) return { ok: false, reason: "employee_not_found" };
  const assessmentKey = `checkin:${requestId.toLowerCase()}`;
  const { data: existing, error: existingError } = await admin.from(ASSESSMENTS_TABLE)
    .select(ASSESSMENT_FIELDS).eq("access_grant_id", grantId).eq("assessment_key", assessmentKey).maybeSingle();
  if (existingError) fail("The previous check-in could not be confirmed.");
  if (existing) {
    if (existing.employee_key !== employeeKey) return { ok: false, reason: "request_id_conflict" };
    return { ok: true, assessment: existing, replayed: true };
  }

  const hasBaseline = state.assessments.some((item) => item.employee_key === employeeKey && item.assessment_type === "baseline");
  const row = {
    access_grant_id: grantId,
    employee_key: employeeKey,
    assessment_key: assessmentKey,
    assessment_type: hasBaseline ? "checkin" : "baseline",
    ...normalized,
    created_at: now.toISOString(),
  };
  const { data: inserted, error: insertError } = await admin.from(ASSESSMENTS_TABLE)
    .insert(row).select(ASSESSMENT_FIELDS).single();
  if (!insertError && inserted) return { ok: true, assessment: inserted, replayed: false };

  // A network response can be lost after the database accepted the insert.
  // Re-read only this grant-scoped idempotency key; never create a second row.
  const { data: recovered, error: recoveryError } = await admin.from(ASSESSMENTS_TABLE)
    .select(ASSESSMENT_FIELDS).eq("access_grant_id", grantId).eq("assessment_key", assessmentKey).maybeSingle();
  if (!recoveryError && recovered?.employee_key === employeeKey) return { ok: true, assessment: recovered, replayed: true };
  fail("The check-in could not be confirmed. Retry using the same request key.");
}

export async function resetIntroducerDemoCheckins({ admin, grantId, now = new Date() } = {}) {
  if (!admin || !grantId) fail("The authorised demonstration scope is unavailable.");
  const { error } = await admin.from(ASSESSMENTS_TABLE).delete()
    .eq("access_grant_id", grantId).like("assessment_key", "checkin:%");
  if (error) fail("The fictional check-ins could not be reset.");
  return loadIntroducerDemoState({ admin, grantId, now });
}
