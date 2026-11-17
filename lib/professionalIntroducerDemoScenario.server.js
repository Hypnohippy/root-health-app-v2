import { buildPersonalRootKnowledgeFromEvidence } from "./personalKnowledgeService.js";
import { buildOrganisationSnapshot } from "./rootOrganisationEngine.js";

export const DEMO_METRICS = Object.freeze([
  { key: "stress", field: "stress_score", label: "Stress", scale: "0 = calm, 10 = overwhelmed" },
  { key: "sleep", field: "sleep_score", label: "Sleep difficulties", scale: "0 = sleeping well, 10 = severe difficulties" },
  { key: "recovery", field: "recovery_score", label: "Recovery difficulty", scale: "0 = well recovered, 10 = exhausted" },
  { key: "energy", field: "energy_score", label: "Low energy", scale: "0 = energised, 10 = completely drained" },
  { key: "mood", field: "mood_score", label: "Low mood", scale: "0 = positive, 10 = very low" },
  { key: "focus", field: "focus_score", label: "Focus difficulties", scale: "0 = clear focus, 10 = unable to focus" },
  { key: "burnout", field: "burnout_score", label: "Burnout", scale: "0 = none, 10 = severe" },
]);

const FICTIONAL_EMPLOYEES = Object.freeze([
  ["employee-01", "Alex Morgan", "Operations"], ["employee-02", "Jamie Patel", "Operations"],
  ["employee-03", "Casey Reed", "Operations"], ["employee-04", "Taylor Brooks", "Operations"],
  ["employee-05", "Morgan Ellis", "Operations"], ["employee-06", "Riley Shah", "Operations"],
  ["employee-07", "Jordan Bell", "Operations"], ["employee-08", "Sam Carter", "Operations"],
  ["employee-09", "Avery Kim", "Operations"], ["employee-10", "Robin Hayes", "Operations"],
  ["employee-11", "Drew Singh", "Operations"], ["employee-12", "Cameron Price", "Operations"],
  ["employee-13", "Quinn Foster", "Customer teams"], ["employee-14", "Harper Lane", "Customer teams"],
  ["employee-15", "Rowan Cole", "Customer teams"], ["employee-16", "Skyler Ward", "Customer teams"],
  ["employee-17", "Emery Ross", "Customer teams"], ["employee-18", "Finley Gray", "Customer teams"],
  ["employee-19", "Dakota James", "Customer teams"], ["employee-20", "Reese Miller", "Customer teams"],
  ["employee-21", "Parker Chen", "Customer teams"], ["employee-22", "Kendall Young", "Customer teams"],
  ["employee-23", "Sage Turner", "Customer teams"], ["employee-24", "Micah Lewis", "Customer teams"],
].map(([employee_key, display_name, department]) => Object.freeze({ employee_key, display_name, department })));

const at = (now, daysAgo) => new Date(now.getTime() - daysAgo * 86400000).toISOString();
const scoreSet = (value, offset = 0) => Object.fromEntries(DEMO_METRICS.map(({ field }, index) => [field, Math.max(0, Math.min(10, value + ((index + offset) % 3) - 1))]));

export function buildIntroducerDemoSeed({ grantId, now = new Date() } = {}) {
  if (!grantId) throw new Error("A verified demo access grant is required to prepare demo data.");
  const members = FICTIONAL_EMPLOYEES.map((member) => ({ ...member, access_grant_id: grantId }));
  const assessments = [];
  for (let index = 0; index < 18; index += 1) {
    const member = FICTIONAL_EMPLOYEES[index];
    const base = 3 + (index % 5);
    assessments.push({
      access_grant_id: grantId,
      employee_key: member.employee_key,
      assessment_key: `seed:${member.employee_key}:baseline`,
      assessment_type: "baseline",
      ...scoreSet(base, index),
      created_at: at(now, 28 - (index % 5)),
    });
  }
  // A few fictional repeat assessments make the shared longitudinal engine
  // demonstrate change over time without fabricating any real-world records.
  for (const index of [0, 1, 2, 3, 4]) {
    const member = FICTIONAL_EMPLOYEES[index];
    assessments.push({
      access_grant_id: grantId,
      employee_key: member.employee_key,
      assessment_key: `seed:${member.employee_key}:follow-up`,
      assessment_type: "checkin",
      ...scoreSet(2 + (index % 5), index + 1),
      created_at: at(now, 14 - (index % 3)),
    });
  }
  return { members, assessments };
}

function assessmentForEngine(row, grantId) {
  return {
    ...row,
    id: row.assessment_key,
    profile_key: `${grantId}:${row.employee_key}`,
  };
}

function source(table, records) {
  return { table, origin: "fictional_demo_store", records, count: records.length, returned: records.length, limit: 100, truncated: false, status: "loaded", error: null };
}

export function buildIntroducerEmployeeScenario({ grantId, employee, assessments = [] } = {}) {
  if (!grantId || !employee?.employee_key) throw new Error("A fictional employee from this access grant is required.");
  const employeeAssessments = assessments
    .filter((row) => row.employee_key === employee.employee_key)
    .map((row) => assessmentForEngine(row, grantId))
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const profileKey = `${grantId}:${employee.employee_key}`;
  const latest = employeeAssessments.at(-1) || null;
  const baseline = employeeAssessments.find((row) => row.assessment_type === "baseline") || null;
  const evidence = {
    version: 1,
    scope: "personal",
    loadedAt: new Date().toISOString(),
    identity: { userId: `fictional:${employee.employee_key}`, profileKey, authority: { authentication: "fictional_demo", ownershipRelation: "fictional_scenario", browserProfileKeyTrusted: false } },
    profile: { origin: "fictional_demo_store", record: { id: employee.employee_key, user_id: `fictional:${employee.employee_key}`, profile_key: profileKey, name: employee.display_name } },
    source: {
      assessments: source("professional_introducer_demo_assessments", employeeAssessments),
      bodySignals: source("body_signals", []), mindEntries: source("mind_entries", []),
      journalEntries: source("journal_entries", []), interventionOutcomes: source("intervention_outcomes", []),
      investigationEvents: source("journal_entries", []), trackerSubmissions: source("tracker_submissions", []),
    },
    awareness: { playbook: source("playbook_entries", []), voice: source("voice_sessions", []) },
    landmarks: { originalAssessmentBaseline: baseline, latestAssessment: latest },
    loadStatus: { partial: false, sources: { profile: "loaded", assessments: "loaded" } },
  };
  const result = buildPersonalRootKnowledgeFromEvidence({ evidence });
  if (!result.ok) throw new Error("The fictional employee evidence could not be processed.");
  const current = result.projections.coach.currentState;
  const movement = result.knowledge.assessmentKnowledge?.movement;
  return {
    employeeKey: employee.employee_key,
    label: `${employee.display_name} — fictional employee`,
    measures: DEMO_METRICS.map(({ key, field, label, scale }) => ({ key, label, scale, value: Number(latest?.[field] ?? 5) })),
    history: employeeAssessments.map((row) => ({
      assessmentType: row.assessment_type,
      createdAt: row.created_at,
      measures: DEMO_METRICS.map(({ key, field }) => ({ key, value: Number(row[field]) })),
    })),
    currentState: typeof current === "string" ? current : (current?.summary || current?.description || "Your reflection is saved. As you return, Root can use changes over time as context while leaving room for uncertainty."),
    movement: movement ? { direction: movement.direction, description: movement.description || null, metrics: movement.metrics } : null,
    coachPrompt: result.projections.coach.interventionInsight || "Root treats self-reported measures as one input, not a diagnosis.",
    evidenceLabel: "Saved only in this isolated fictional demonstration; processed by Root’s existing personal insight engine.",
  };
}

export function buildIntroducerEmployerScenario({ grantId, members = [], assessments = [] } = {}) {
  const organisationId = `fictional-northstar-${grantId}`;
  const profileKey = (employeeKey) => `${grantId}:${employeeKey}`;
  const aggregateMembers = members.map((member) => ({
    id: member.employee_key,
    organisation_id: organisationId,
    profile_key: profileKey(member.employee_key),
    role: "employee",
    department: member.department,
    activated_at: member.created_at || new Date().toISOString(),
  }));
  const aggregateAssessments = assessments.map((row) => ({
    ...assessmentForEngine(row, grantId),
    organisation_id: organisationId,
  }));
  const snapshot = buildOrganisationSnapshot({
    organisation: { id: organisationId, name: "Northstar Studio (fictional)", employee_count: aggregateMembers.length },
    members: aggregateMembers,
    assessments: aggregateAssessments,
  });
  const trendRows = Array.isArray(snapshot.trendRows) ? snapshot.trendRows
    .filter((row) => row.label === "Baseline" || row.participantCount >= snapshot.privacyMinimum)
    .map((row) => ({
    label: row.label,
    participants: row.participantCount,
    stress: row.stress,
    sleep: row.sleep,
    recovery: row.recovery,
    burnout: row.burnout,
  })) : [];
  const observations = Array.isArray(snapshot.metricResults)
    ? snapshot.metricResults.filter((metric) => metric.current !== null && metric.current !== undefined).map((metric) => ({
        label: metric.label,
        summary: `${metric.label} average: ${Number(metric.current).toFixed(1)} / 10${metric.change === null || metric.change === undefined ? "" : `; matched movement ${Number(metric.change) > 0 ? "+" : ""}${Number(metric.change).toFixed(1)}`}.`,
        direction: metric.change === null || metric.change === undefined ? "baseline" : metric.change < 0 ? "improving" : metric.change > 0 ? "worsening" : "stable",
      }))
    : [];
  return {
    label: "Northstar Studio — fictional employer",
    organisationSize: aggregateMembers.length,
    participation: Number.isFinite(snapshot.participation.baselineCompletionRate) ? snapshot.participation.baselineCompletionRate / 100 : null,
    respondents: snapshot.baselineCompleted,
    assessmentWindow: trendRows,
    confidence: { label: snapshot.confidenceLabel },
    wellbeingIndex: snapshot.currentScore,
    baselineSuppressed: snapshot.baselineSuppressed,
    outcomeSuppressed: snapshot.outcomeSuppressed,
    headline: snapshot.baselineSuppressed
      ? `Workforce measures are protected until at least ${snapshot.privacyMinimum} distinct employees complete a baseline.`
      : `Workforce Wellbeing Index: ${snapshot.currentScore ?? "—"} / 100`,
    summary: snapshot.workforceNarrative.executiveSummary,
    observations,
    cautions: [
      "At least five distinct baseline participants are required before employee-derived wellbeing measures are shown.",
      "Movement requires at least five matched participants with a baseline and follow-up.",
      "Higher assessment scores represent greater self-reported difficulty; results do not establish a cause or diagnosis.",
      "This fictional demonstration has no department-level or employee-level result view.",
    ],
    privacyNote: "This is the existing Root organisation snapshot with its five-participant baseline and matched-movement gates. Only whole-workforce aggregates are returned; no employee identities or individual outcomes are included.",
  };
}

export function listIntroducerDemoEmployees(members = [], assessments = []) {
  return members.map((member) => ({
    employeeKey: member.employee_key,
    label: member.display_name,
    hasHistory: assessments.some((row) => row.employee_key === member.employee_key),
  }));
}
