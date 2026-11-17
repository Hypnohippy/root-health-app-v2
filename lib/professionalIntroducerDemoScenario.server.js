import { buildPersonalRootKnowledgeFromEvidence } from "./personalKnowledgeService.js";
import { buildOrganisationWellbeingReview } from "./rootOrganisationWellbeing.js";

const METRICS = ["stress", "sleep", "recovery", "energy", "mood", "focus", "burnout"];
const at = (daysAgo) => new Date(Date.now() - daysAgo * 86400000).toISOString();
const source = (table, records) => ({
  table, origin: "fictional_demo_scenario", records, count: records.length,
  returned: records.length, limit: 100, truncated: false, status: "loaded", error: null,
});

export function buildIntroducerEmployeeScenario({ scores = null } = {}) {
  const profileKey = "demo-profile-a17";
  const baseline = Object.fromEntries(METRICS.map((metric) => [`${metric}_score`, 7]));
  const latest = Object.fromEntries(METRICS.map((metric) => [`${metric}_score`, Number(scores?.[metric] ?? 5)]));
  const evidence = {
    version: 1,
    scope: "personal",
    loadedAt: at(0),
    identity: { userId: "fictional-employee-01", profileKey, authority: { authentication: "fictional_demo", ownershipRelation: "fictional_scenario", browserProfileKeyTrusted: false } },
    profile: { origin: "fictional_demo_scenario", record: { id: "demo-profile-a17", user_id: "fictional-employee-01", profile_key: profileKey, name: "Alex Morgan" } },
    source: {
      assessments: source("wellbeing_assessments", [
        { id: "demo-assessment-baseline", profile_key: profileKey, assessment_type: "baseline", ...baseline, created_at: at(21) },
        { id: "demo-assessment-latest", profile_key: profileKey, assessment_type: "checkin", ...latest, created_at: at(0) },
      ]),
      bodySignals: source("body_signals", [{ id: "demo-body-01", profile_key: profileKey, signal: "Tension after a demanding afternoon", intensity: 5, created_at: at(2) }]),
      mindEntries: source("mind_entries", [{ id: "demo-mind-01", profile_key: profileKey, tool: "Root Calm Reset", emotion: "overthinking", intensity: 6, created_at: at(3) }]),
      journalEntries: source("journal_entries", [{ id: "demo-journal-01", profile_key: profileKey, emotional_theme: "Workload and recovery", created_at: at(4) }]),
      interventionOutcomes: source("intervention_outcomes", []),
      investigationEvents: source("journal_entries", []),
      trackerSubmissions: source("tracker_submissions", []),
    },
    awareness: { playbook: source("playbook_entries", []), voice: source("voice_sessions", []) },
    landmarks: {
      originalAssessmentBaseline: { id: "demo-assessment-baseline", created_at: at(21), ...baseline },
      latestAssessment: { id: "demo-assessment-latest", created_at: at(0), ...latest },
    },
    loadStatus: { partial: false, sources: { profile: "loaded", assessments: "loaded", bodySignals: "loaded", mindEntries: "loaded", journalEntries: "loaded" } },
  };
  const result = buildPersonalRootKnowledgeFromEvidence({ evidence });
  if (!result.ok) throw new Error("The fictional employee scenario could not be prepared.");
  const current = result.projections.coach.currentState;
  const movement = result.knowledge.assessmentKnowledge?.movement;
  return {
    label: "Alex Morgan — fictional employee",
    measures: METRICS.map((key) => ({ key, label: key[0].toUpperCase() + key.slice(1), value: latest[`${key}_score`] })),
    currentState: typeof current === "string" ? current : (current?.summary || current?.description || "Root uses changes over time as context, while leaving room for uncertainty."),
    movement: movement ? { direction: movement.direction, description: movement.description || null, metrics: movement.metrics } : null,
    coachPrompt: result.projections.coach.interventionInsight || "Root uses check-ins as one input and avoids treating a single score as a diagnosis.",
    recentSignals: ["Body signal: tension after a demanding afternoon", "Mind tool: Root Calm Reset", "Reflection: workload and recovery"],
    evidenceLabel: "Fictional scenario processed by Root’s existing personal insight engine; check-in changes are not saved.",
  };
}

export function buildIntroducerEmployerScenario() {
  const members = Array.from({ length: 24 }, (_, index) => ({
    id: `demo-member-${index + 1}`, organisation_id: "fictional-northstar", role: "employee",
    department: index < 12 ? "Operations" : "Customer teams",
  }));
  const assessments = Array.from({ length: 18 }, (_, index) => {
    const date = at(7 + (index % 4) * 7);
    const value = 3 + (index % 5);
    return {
      id: `demo-assessment-${index + 1}`, profile_key: `fictional-profile-${index + 1}`,
      stress_score: value, sleep_score: value + (index % 2), recovery_score: value,
      energy_score: value, mood_score: value, focus_score: value, burnout_score: value,
      created_at: date,
    };
  });
  const review = buildOrganisationWellbeingReview({
    organisation: { name: "Northstar Studio (fictional)", size: 24 }, members, assessments,
    mindEntries: Array.from({ length: 12 }, (_, index) => ({ id: `demo-mind-${index + 1}`, created_at: at(index + 1), tool: "Root Calm Reset" })),
    journalEntries: Array.from({ length: 9 }, (_, index) => ({ id: `demo-reflection-${index + 1}`, created_at: at(index + 1) })),
  });
  return {
    label: "Northstar Studio — fictional employer",
    organisationSize: 24,
    participation: review.evidenceReviewed.participationRate,
    respondents: review.evidenceReviewed.estimatedAssessmentParticipants,
    assessmentWindow: review.evidenceReviewed.assessmentWindow,
    confidence: review.confidence.organisation,
    headline: review.executiveHeadline,
    summary: review.executiveSummary,
    observations: Array.isArray(review.observations) ? review.observations.map((item) => ({ label: item.label, summary: item.summary, direction: item.direction })).filter((item) => item.label || item.summary).slice(0, 5) : [],
    cautions: review.cautions,
    privacyNote: "Only organisation-level aggregates are shown. No fictional employee is identifiable and no small-group breakdown is exposed.",
  };
}
