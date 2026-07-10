
export function average(items, key) {
  const values = items
    .map((item) => Number(item[key]))
    .filter((value) => !Number.isNaN(value));

  if (!values.length) return null;

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function formatMetric(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return Number(value).toFixed(1);
}

export function scoreFromAssessments(items = []) {
  if (!items.length) return null;

  const keys = [
    "stress_score",
    "burnout_score",
    "sleep_score",
    "recovery_score",
    "mood_score",
    "focus_score",
  ];

  const values = keys
    .map((key) => average(items, key))
    .filter((value) => value !== null);

  if (!values.length) return null;

  const averageLoad =
    values.reduce((sum, value) => sum + value, 0) / values.length;

  return Math.round(100 - averageLoad * 10);
}

export function countBy(items = [], key) {
  const counts = {};

  items.forEach((item) => {
    const value = item?.[key];
    if (!value) return;
    counts[value] = (counts[value] || 0) + 1;
  });

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
}

export function mapChallengeTheme(theme = "") {
  const value = String(theme).toLowerCase();

  if (
    value.includes("work") ||
    value.includes("boss") ||
    value.includes("manager") ||
    value.includes("promotion") ||
    value.includes("undervalued") ||
    value.includes("job security")
  ) {
    return "Workplace Pressure";
  }

  if (value.includes("burnout") || value.includes("exhausted")) {
    return "Burnout Risk";
  }

  if (value.includes("anxiety") || value.includes("panic") || value.includes("overwhelm")) {
    return "Anxiety & Overwhelm";
  }

  if (value.includes("relationship") || value.includes("trust")) {
    return "Relationship Stress";
  }

  if (value.includes("shame") || value.includes("self")) {
    return "Self-Criticism";
  }

  return theme || "No challenge data yet";
}

export function buildOrganisationSnapshot({
  organisation = null,
  members = [],
  assessments = [],
  mindEntries = [],
  journalEntries = [],
  voiceSessions = [],
}) {
  const baselineRows = assessments.filter(
    (item) => item.assessment_type === "baseline"
  );

  const baseline =
    baselineRows.length > 0
      ? baselineRows
      : assessments.length > 0
      ? [assessments[0]]
      : [];

  const latest = assessments.length > 0 ? [assessments[assessments.length - 1]] : [];

  const metrics = [
    ["Stress", "stress_score"],
    ["Burnout", "burnout_score"],
    ["Sleep difficulty", "sleep_score"],
    ["Recovery difficulty", "recovery_score"],
    ["Mood difficulty", "mood_score"],
    ["Focus difficulty", "focus_score"],
  ];

  const metricResults = metrics.map(([label, key]) => {
    const start = average(baseline, key);
    const current = average(latest, key);
    const change =
      start === null || current === null ? null : current - start;

    return { label, key, start, current, change };
  });

  const invited = members.length;
  const activated = members.filter((member) => member.activated_at).length;
  const baselineCompleted = members.filter(
    (member) => member.baseline_completed_at
  ).length;

  const supportInteractions =
    mindEntries.length + journalEntries.length + voiceSessions.length;

  const baselineScore = scoreFromAssessments(baseline);
  const currentScore = scoreFromAssessments(latest);

  const engagementScore =
    invited > 0
      ? Math.round(((activated + baselineCompleted) / (invited * 2)) * 100)
      : null;

  const mappedChallengeCounts = countBy(
    [
      ...mindEntries
        .filter((entry) => entry.thought_theme)
        .map((entry) => ({ challenge: mapChallengeTheme(entry.thought_theme) })),

      ...journalEntries
        .filter((entry) => entry.emotional_theme)
        .map((entry) => ({ challenge: mapChallengeTheme(entry.emotional_theme) })),
    ],
    "challenge"
  );

  const mostCommonTheme =
    mappedChallengeCounts[0]?.[0] || "No challenge data yet";

  const mostImproved = metricResults
    .filter((item) => item.change !== null && item.change < 0)
    .sort((a, b) => a.change - b.change)[0];

  const highRiskMetric = metricResults
    .filter((item) => item.current !== null)
    .sort((a, b) => b.current - a.current)[0];

  const latestEntry = assessments.length
    ? assessments[assessments.length - 1]
    : null;

  const stressLatest = latestEntry ? Number(latestEntry.stress_score) : null;
  const burnoutLatest = latestEntry ? Number(latestEntry.burnout_score) : null;
  const recoveryLatest = latestEntry ? Number(latestEntry.recovery_score) : null;

  const recoveryRiskDetected =
    stressLatest !== null &&
    burnoutLatest !== null &&
    recoveryLatest !== null &&
    stressLatest <= 3 &&
    (burnoutLatest >= 7 || recoveryLatest >= 7);

  const primaryConcern = recoveryRiskDetected
    ? "Recovery Risk"
    : mostCommonTheme !== "No challenge data yet"
    ? mostCommonTheme
    : highRiskMetric?.label || "Workforce wellbeing";

  const recommendedFocus = recoveryRiskDetected
    ? "Recovery and resilience activity"
    : primaryConcern.includes("Workplace")
    ? "Manager awareness and workload conversations"
    : highRiskMetric?.label
    ? `${highRiskMetric.label} improvement`
    : "Maintain support engagement";

  const confidenceScore = Math.min(
    100,
    Math.round(assessments.length * 8 + supportInteractions * 0.4 + activated * 5)
  );

  const confidenceLabel =
    confidenceScore >= 80
      ? "High Confidence"
      : confidenceScore >= 60
      ? "Established"
      : confidenceScore >= 40
      ? "Developing"
      : "Early Stage";

  const executiveStatus = recoveryRiskDetected
    ? {
        dot: "🟠",
        label: "Recovery deserves attention",
        detail:
          "Stress appears lower, but burnout or recovery indicators remain elevated. Root recommends focusing on sustainable recovery before increasing pressure.",
      }
    : highRiskMetric?.current >= 8
    ? {
        dot: "🟠",
        label: `${highRiskMetric.label} needs attention`,
        detail: `${highRiskMetric.label} is currently the highest difficulty area.`,
      }
    : {
        dot: "🟢",
        label: "Early picture forming",
        detail:
          "Root is beginning to build an organisation-level wellbeing picture. Continued check-ins will increase confidence.",
      };

  const initiative = recoveryRiskDetected
    ? {
        title: "Recovery Reset Month",
        reason:
          "Recovery and burnout indicators suggest employees may need help rebuilding sustainable energy.",
        expectedOutcome:
          "Improved recovery, reduced burnout risk and stronger support engagement.",
      }
    : {
        title: "Wellbeing Momentum Month",
        reason:
          "Root is building early evidence and participation. The next step is to encourage steady use and regular check-ins.",
        expectedOutcome:
          "Clearer workforce trends, stronger engagement and better evidence for future decisions.",
      };

  const trendRows = assessments.map((entry, index) => ({
    label: entry.assessment_type === "baseline" ? "Baseline" : `Check-in ${index}`,
    stress: Number(entry.stress_score),
    burnout: Number(entry.burnout_score),
    sleep: Number(entry.sleep_score),
    recovery: Number(entry.recovery_score),
  }));

  return {
    organisation,
    invited,
    activated,
    baselineCompleted,
    supportInteractions,
    engagementScore,
    baselineScore,
    currentScore,
    metricResults,
    trendRows,
    mostImproved,
    mostCommonTheme,
    mappedChallengeCounts,
    primaryConcern,
    recommendedFocus,
    confidenceScore,
    confidenceLabel,
    executiveStatus,
    initiative,
  };
}