// No private narrative, identity, individual scores, or small outcome subgroups
// cross this boundary. Each metric requires five distinct contributors.
export function buildOrganisationModelEvidence({ organisation, assessments = [], members = [] }) {
  const keys = ["stress_score", "burnout_score", "sleep_score", "recovery_score", "mood_score", "focus_score"];
  const allowed = new Map();
  for (const member of members) {
    if (!organisation?.id || member.organisation_id !== organisation.id) continue;
    const canonical = member.user_id || member.profile_key;
    for (const key of [member.user_id, member.profile_key].filter(Boolean)) allowed.set(key, canonical);
  }
  const journeys = new Map();
  for (const row of assessments) {
    const identity = allowed.get(row.user_id || row.profile_key);
    if (!organisation?.id || row.organisation_id !== organisation.id || !identity ||
      (row.user_id && row.profile_key && allowed.get(row.profile_key) !== identity) ||
      !Number.isFinite(Date.parse(row.created_at))) continue;
    if (!journeys.has(identity)) journeys.set(identity, []);
    journeys.get(identity).push(row);
  }
  const baselines = [], pairs = [];
  for (const rows of journeys.values()) {
    rows.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    const baseline = rows.find(r => r.assessment_type === "baseline");
    if (!baseline) continue;
    baselines.push(baseline);
    const followup = rows.filter(r => r.assessment_type !== "baseline" &&
      new Date(r.created_at) > new Date(baseline.created_at)).at(-1);
    if (followup) pairs.push([baseline, followup]);
  }
  const valid = value => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 10;
  const mean = values => Math.round(values.reduce((a, b) => a + b, 0) / values.length * 10) / 10;
  const observedEvidence = keys.map(key => {
    const values = baselines.map(r => r[key]).filter(valid);
    return { metric: key, mean: values.length >= 5 ? mean(values) : null,
      contributors: values.length >= 5 ? values.length : "fewer than 5", suppressed: values.length < 5 };
  });
  const longitudinal = keys.map(key => {
    const matched = pairs.filter(pair => pair.every(r => valid(r[key])));
    return { metric: key, change: matched.length >= 5 ? mean(matched.map(([a, b]) => b[key] - a[key])) : null,
      contributors: matched.length >= 5 ? matched.length : "fewer than 5", suppressed: matched.length < 5 };
  });
  const protectedEvidence = baselines.length < 5;
  return {
    evidenceReviewed: { baselineCohort: protectedEvidence ? "fewer than 5" : baselines.length, matchedCohort: pairs.length < 5 ? "fewer than 5" : pairs.length },
    confidence: { status: protectedEvidence ? "Evidence protected" : "Aggregate evidence only" },
    executiveHeadline: protectedEvidence ? "Wellbeing evidence remains protected" : "Recorded aggregate wellbeing evidence",
    executiveSummary: "Workforce membership and invitations are not wellbeing participation. No private narratives or individual outcomes are supplied.",
    observedEvidence, longitudinal, reasoningSummary: [], contradictions: [],
    evidenceGaps: ["Roster completeness is not established."], nextEvidence: [], interventionReadiness: {},
    boardSummary: { observedEvidence, longitudinal }, cautions: ["No causal conclusions; small cohorts are suppressed."],
  };
}
