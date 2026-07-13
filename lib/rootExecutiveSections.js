export function buildExecutiveSections(snapshot) {
  const {
    assessments = [],
    supportInteractions = 0,
    engagementScore = 0,
    confidenceLabel = "Early Stage",
    mostCommonTheme = "No challenge data yet",
    currentScore = null,
    mostImproved = null,
    highRiskMetric = null,
  } = snapshot;

  const memory = [];

  if (mostCommonTheme !== "No challenge data yet") {
    memory.push(
      `${mostCommonTheme} has remained one of the strongest anonymous workforce themes.`
    );
  }

  if (highRiskMetric) {
    memory.push(
      `${highRiskMetric.label} continues to be the highest organisational pressure area.`
    );
  }

  if (!memory.length) {
    memory.push(
      "Root is beginning to build organisational memory as more reviews are completed."
    );
  }

  const questions = [];

  if (highRiskMetric) {
    questions.push(
      `What organisational factors may be contributing to ${highRiskMetric.label.toLowerCase()}?`
    );
  }

  questions.push(
    "What support would create the biggest improvement before the next review?"
  );

  const hypothesis = highRiskMetric
    ? `${highRiskMetric.label} appears to be influencing the current wellbeing picture more than any other measured area.`
    : "Root is still gathering enough evidence to build a reliable organisational hypothesis.";

  const recommendedInsight = {
    title: highRiskMetric
      ? `${highRiskMetric.label} deserves leadership attention`
      : "Building healthy organisations",
    slug: "organisation",
    reason: highRiskMetric
      ? `${highRiskMetric.label} is currently the strongest pressure indicator across the workforce.`
      : "Root recommends continuing data collection before targeted interventions.",
  };

  const confidenceReasons = [
    `${assessments.length} assessments analysed`,
    `${supportInteractions} support interactions recorded`,
    `${engagementScore}% engagement`,
  ];

  const boardCase = {
    title: "Business Case",
    summary:
      highRiskMetric
        ? `${highRiskMetric.label} is currently the strongest organisational wellbeing risk. Addressing it early may reduce future absence, burnout and disengagement.`
        : "Continue collecting evidence before proposing targeted interventions.",
    investment:
      "A focused wellbeing initiative can now be justified using Root's anonymous workforce evidence.",
  };

  return {
    memory,
    questions,
    hypothesis,
    recommendedInsight,
    confidenceReasons,
    boardCase,
  };
}
