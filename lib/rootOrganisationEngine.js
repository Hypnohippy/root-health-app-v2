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

  if (
    value.includes("anxiety") ||
    value.includes("panic") ||
    value.includes("overwhelm")
  ) {
    return "Anxiety & Overwhelm";
  }

  if (value.includes("relationship") || value.includes("trust")) {
    return "Relationship Stress";
  }

  if (value.includes("shame") || value.includes("self")) {
    return "Self-Criticism";
  }

  if (value.includes("low mood") || value.includes("emotional heaviness")) {
    return "Low Mood";
  }

  return theme || "No challenge data yet";
}

function metricChange(start, current) {
  if (start === null || current === null) return null;
  return current - start;
}

function buildNarrative({
  currentScore,
  mostImproved,
  highRiskMetric,
  mostCommonTheme,
  supportInteractions,
}) {
  const insight = mostImproved
    ? `${mostImproved.label} is showing the clearest improvement so far. Root will keep watching whether this improvement is sustained over future check-ins.`
    : "Root is still gathering enough follow-up data to identify reliable workforce movement.";

  const executiveSummary = `Current organisation data shows a Workforce Wellbeing Index of ${
    currentScore ?? "—"
  } / 100. ${
    highRiskMetric?.label
      ? `${highRiskMetric.label} is currently the highest difficulty area.`
      : "More assessment data is needed before a primary pressure point can be confirmed."
  } The strongest anonymous workforce theme is ${mostCommonTheme}. Support engagement currently stands at ${supportInteractions} recorded interactions.`;

  const watchAreas = [
  highRiskMetric?.label
    ? `Continue monitoring ${highRiskMetric.label.toLowerCase()} during the next review period.`
    : "Continue monitoring sleep, recovery and burnout consistency.",

  mostCommonTheme !== "No challenge data yet"
    ? `${mostCommonTheme} remains the strongest anonymous workforce theme.`
    : "More anonymous theme data is needed.",
];

const learning = [
  mostCommonTheme.includes("Workplace")
    ? "Stress Management and Workplace Resilience"
    : "Emotional Resilience Foundations",
  "Burnout Prevention and Recovery Habits",
  "Sleep, Energy and Recovery Foundations",
  "Practical Lifestyle Coaching Principles",
];

const support = [
  "Lifestyle Coaching",
  "Wellbeing Workshops",
  "Manager Awareness Training",
  "Resilience Programmes",
];

return {
  insight,
  executiveSummary,
  watchAreas,
  learning,
  support,
};
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
    const change = metricChange(start, current);

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

  const trendRows = assessments.map((entry, index) => ({
    label: entry.assessment_type === "baseline" ? "Baseline" : `Check-in ${index}`,
    stress: Number(entry.stress_score),
    burnout: Number(entry.burnout_score),
    sleep: Number(entry.sleep_score),
    recovery: Number(entry.recovery_score),
  }));

  const mappedChallengeCounts = countBy(
    [
      ...mindEntries
        .filter((entry) => entry.thought_theme)
        .map((entry) => ({
          challenge: mapChallengeTheme(entry.thought_theme),
        })),

      ...journalEntries
        .filter((entry) => entry.emotional_theme)
        .map((entry) => ({
          challenge: mapChallengeTheme(entry.emotional_theme),
        })),
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
const sleepLatest = latestEntry ? Number(latestEntry.sleep_score) : null;

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
    : primaryConcern.includes("Burnout")
    ? "Burnout prevention and recovery habits"
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

      const analysisStage =
  assessments.length <= 1
    ? {
        level: 1,
        title: "Baseline Established",
        description:
          "Root has established the organisation's starting wellbeing profile. Recommendations are based on the current workforce picture rather than measured change.",
      }
    : assessments.length <= 3
    ? {
        level: 2,
        title: "Movement Detected",
        description:
          "Root can now compare the latest wellbeing picture with the baseline and identify early movement.",
      }
    : {
        level: 3,
        title: "Patterns Emerging",
        description:
          "Repeated reviews are beginning to reveal reliable organisational wellbeing patterns.",
      };

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
      key: "recovery-reset",
      title: "Recovery Reset Month",
      introduction:
        "Root has identified elevated burnout or recovery pressure despite comparatively lower stress. This initiative is designed to help employees rebuild sustainable energy and strengthen recovery habits.",
      reason:
        "Current indicators suggest employees may be coping with immediate pressure without yet feeling fully restored.",
      status: "Ready to launch",
      expectedOutcome:
        "Improved recovery, reduced burnout risk and stronger engagement with available support.",
      workshopTitle: "Recovery & Resilience Workshop",
      workshopDescription:
        "A targeted workshop helping employees understand recovery, recognise accumulated strain and develop practical habits for sustainable performance.",
      reportFocus:
        "Recovery behaviours, sustainable performance and manager awareness.",
    }
  : mostCommonTheme.includes("Workplace")
  ? {
      key: "workplace-pressure",
      title: "Healthy Pressure & Performance Month",
      introduction:
        "Root has identified workplace pressure as the most visible anonymous workforce theme. This initiative is designed to help employees and managers respond to pressure before it becomes sustained strain.",
      reason:
        "Anonymous workforce themes suggest workload, management or workplace expectations may deserve closer attention.",
      status: "Ready to prepare",
      expectedOutcome:
        "Improved pressure awareness, healthier workload conversations and earlier support engagement.",
      workshopTitle: "Pressure & Performance Workshop",
      workshopDescription:
        "A practical session exploring sustainable performance, workload pressure and the early signs that normal demand is becoming harmful.",
      reportFocus:
        "Workplace pressure, workload conversations and manager awareness.",
    }
  : {
      key: "wellbeing-momentum",
      title: "Wellbeing Momentum Month",
      introduction:
        "Root is building an early organisational picture. This initiative encourages regular check-ins, support awareness and steady participation while stronger trends develop.",
      reason:
        "Current evidence is still emerging, so the priority is to strengthen participation and establish reliable wellbeing movement.",
      status: "Ready to launch",
      expectedOutcome:
        "Clearer workforce trends, stronger participation and better evidence for future organisational decisions.",
      workshopTitle: "Wellbeing Foundations Workshop",
      workshopDescription:
        "An introductory session helping employees understand stress, recovery, sleep and the practical support available through Root.",
      reportFocus:
        "Participation, wellbeing awareness and reliable baseline development.",
    };

  const nextReviewFocus = [];

  if (mostCommonTheme !== "No challenge data yet") {
    nextReviewFocus.push(`Monitor ${mostCommonTheme.toLowerCase()} trends`);
  }

  if (highRiskMetric?.label) {
    nextReviewFocus.push(`Prioritise ${highRiskMetric.label.toLowerCase()} improvement`);
  }

  if (engagementScore !== null && engagementScore < 60) {
    nextReviewFocus.push("Increase employee participation");
  } else {
    nextReviewFocus.push("Maintain support engagement");
  }

  if (recoveryRiskDetected) {
    nextReviewFocus.push("Promote recovery and resilience activity");
  }

  const workforceNarrative = buildNarrative({
    currentScore,
    mostImproved,
    highRiskMetric,
    mostCommonTheme,
    supportInteractions,
  });

  const organisationMemory = [];

if (assessments.length < 2) {
  organisationMemory.push(
    "Root is establishing the organisation's baseline. Follow-up check-ins will show whether the current picture is improving, stable or becoming more difficult."
  );
}

if (mostCommonTheme !== "No challenge data yet") {
  organisationMemory.push(
    `${mostCommonTheme} is currently the most visible anonymous workforce theme. Root will watch whether it remains consistent across future review periods.`
  );
}

if (highRiskMetric?.label && highRiskMetric?.current !== null) {
  organisationMemory.push(
    `${highRiskMetric.label} is currently the highest measured difficulty area at ${formatMetric(
      highRiskMetric.current
    )} out of 10.`
  );
}

if (mostImproved?.label) {
  organisationMemory.push(
    `${mostImproved.label} is showing the strongest improvement, moving from ${formatMetric(
      mostImproved.start
    )} to ${formatMetric(mostImproved.current)}.`
  );
}

if (recoveryRiskDetected) {
  organisationMemory.push(
    "Root has noticed that immediate stress appears comparatively low while burnout or recovery pressure remains elevated. This pattern will remain a priority for future comparison."
  );
}

if (supportInteractions === 0) {
  organisationMemory.push(
    "No support interactions are currently connected to this organisation. Root cannot yet assess which support routes employees are using."
  );
} else {
  organisationMemory.push(
    `${supportInteractions} anonymous support interactions have been recorded during the current review period.`
  );
}

const executiveQuestions = [];

if (recoveryRiskDetected) {
  executiveQuestions.push(
    "What may be preventing employees from fully recovering even though immediate stress appears comparatively lower?"
  );
}

if (highRiskMetric?.label) {
  executiveQuestions.push(
    `What organisational conditions may be contributing to elevated ${highRiskMetric.label.toLowerCase()}?`
  );
}

if (mostCommonTheme !== "No challenge data yet") {
  executiveQuestions.push(
    `Is ${mostCommonTheme.toLowerCase()} temporary, or is it becoming part of normal working life?`
  );
}

if (supportInteractions === 0) {
  executiveQuestions.push(
    "Are employees aware of the support available, and are there barriers preventing them from using it?"
  );
}

if (executiveQuestions.length === 0) {
  executiveQuestions.push(
    "What additional participation or follow-up data would help leadership understand the workforce picture more confidently?"
  );
}

let rootHypothesis =
  "Root is still establishing the organisation's baseline. Further check-ins and anonymous engagement data are needed before a stronger explanation can be supported.";

if (recoveryRiskDetected) {
  rootHypothesis =
    "Root suspects that employees may be coping with immediate demands without yet recovering from accumulated strain. This interpretation is based on comparatively lower stress alongside elevated burnout or recovery indicators.";
} else if (
  mostCommonTheme.includes("Workplace") &&
  highRiskMetric?.current >= 6
) {
  rootHypothesis =
    "Root suspects that sustained workplace demands, workload expectations or management pressures may be contributing to the current wellbeing picture.";
} else if (sleepLatest !== null && sleepLatest >= 7) {
  rootHypothesis =
    "Root suspects that sleep difficulty may be limiting recovery, concentration and wider wellbeing improvement.";
} else if (burnoutLatest !== null && burnoutLatest >= 7) {
  rootHypothesis =
    "Root suspects that accumulated strain may be continuing even where employees appear to be managing immediate day-to-day pressure.";
}

let recommendedInsight = {
  title: "Building a reliable workforce wellbeing baseline",
  slug: "wellbeing-baseline",
  reason:
    "Root is still gathering follow-up evidence, so the most useful next insight concerns participation, measurement and establishing a trustworthy organisational baseline.",
};

if (mostCommonTheme.includes("Workplace")) {
  recommendedInsight = {
    title: "Why pressure is not always the problem",
    slug: "pressure",
    reason:
      "Workplace pressure is appearing in the anonymous workforce picture, so Root is recommending an insight on sustainable performance and accumulated strain.",
  };
}

if (recoveryRiskDetected || recoveryLatest >= 7) {
  recommendedInsight = {
    title: "Why recovery is not the same as rest",
    slug: "recovery",
    reason:
      "Recovery deserves attention, so Root is recommending an insight on rebuilding energy and recovering from accumulated strain.",
  };
}

if (sleepLatest !== null && sleepLatest >= 7) {
  recommendedInsight = {
    title: "Why sleep is a performance issue, not a private issue",
    slug: "sleep",
    reason:
      "Sleep difficulty is elevated, so Root is recommending an insight on fatigue, performance and organisational recovery.",
  };
}

if (burnoutLatest !== null && burnoutLatest >= 7) {
  recommendedInsight = {
    title: "The burnout myth most organisations miss",
    slug: "burnout",
    reason:
      "Burnout indicators are elevated, so Root is recommending an insight on accumulated strain and the warning signs organisations frequently overlook.",
  };
}

const confidenceReasons = [
  `${assessments.length} wellbeing assessment${
    assessments.length === 1 ? "" : "s"
  } analysed.`,
  `${supportInteractions} anonymous support interaction${
    supportInteractions === 1 ? "" : "s"
  } recorded.`,
  `${activated} employee${activated === 1 ? "" : "s"} activated.`,
];

if (assessments.length < 2) {
  confidenceReasons.push(
    "No follow-up comparison is available yet, so conclusions should be treated as an early indication rather than a confirmed trend."
  );
}

const boardCase = {
  executiveSummary: workforceNarrative.executiveSummary,

  organisationalRisk: recoveryRiskDetected
    ? "Employees may be managing immediate pressure without adequately recovering from accumulated strain."
    : highRiskMetric?.label
    ? `${highRiskMetric.label} is currently the highest measured workforce difficulty.`
    : "Root is still gathering enough evidence to identify a reliable organisational risk pattern.",

  supportingEvidence: [
    `${assessments.length} assessment${assessments.length === 1 ? "" : "s"} analysed`,
    `${supportInteractions} anonymous support interaction${
      supportInteractions === 1 ? "" : "s"
    } recorded`,
    `${activated} activated employee${activated === 1 ? "" : "s"}`,
    `Current Workforce Wellbeing Index: ${currentScore ?? "awaiting data"} / 100`,
  ],

  recommendation: `Approve preparation of the ${initiative.title} and review the resulting workforce movement during the next reporting period.`,

  expectedBenefit: initiative.expectedOutcome,

  costOfInaction: recoveryRiskDetected
    ? "If accumulated strain remains unaddressed, reduced immediate stress may not translate into sustainable recovery, energy or performance."
    : "Without continued participation and targeted support, the organisation may lack sufficient evidence to act early on emerging wellbeing pressures.",

  confidence: confidenceLabel, 

   approvalRequest: `Approve the preparation and internal launch of the ${initiative.title}, supported by the recommended communications and workshop materials.`,

successCriteria: [
  `Reduce ${highRiskMetric?.label || "the primary wellbeing concern"}.`,
  "Increase anonymous support engagement.",
  "Maintain or improve participation levels.",
  "Demonstrate measurable improvement during the next Executive Review.",
],

reviewQuestions: [
  `Has ${
    highRiskMetric?.label || "the primary wellbeing concern"
  } improved since this review?`,
  "Has employee engagement with support increased?",
  "Is the current recommendation delivering measurable organisational benefit?",
],

};

const stressMetric = metricResults.find(
  (item) => item.label === "Stress"
);

const burnoutMetric = metricResults.find(
  (item) => item.label === "Burnout"
);

const sleepMetric = metricResults.find(
  (item) => item.label === "Sleep difficulty"
);

const recoveryMetric = metricResults.find(
  (item) => item.label === "Recovery difficulty"
);

const moodMetric = metricResults.find(
  (item) => item.label === "Mood difficulty"
);

const focusMetric = metricResults.find(
  (item) => item.label === "Focus difficulty"
);

const executiveNarrative =
  analysisStage.level === 1
    ? {
        overview:
          `Root has established the organisation's initial wellbeing baseline. ` +
          `The current Workforce Wellbeing Index is ${currentScore ?? "—"} out of 100.`,

        numbersSuggest:
          `${
            highRiskMetric?.label || "The current wellbeing picture"
          } is presently the highest measured area of difficulty${
            highRiskMetric?.current !== null &&
            highRiskMetric?.current !== undefined
              ? ` at ${formatMetric(highRiskMetric.current)} out of 10`
              : ""
          }. Root is describing the organisation's starting position rather than claiming improvement or deterioration.`,

        stressCommentary:
          `Stress is currently measured at ${formatMetric(
            stressMetric?.current
          )} out of 10. This describes the present baseline and should not yet be interpreted as movement.`,

        burnoutCommentary:
          `Burnout is currently measured at ${formatMetric(
            burnoutMetric?.current
          )} out of 10. ${
            burnoutMetric?.current >= 8
              ? "This is a high-concern result and should remain visible in the organisation's immediate wellbeing priorities."
              : "Future check-ins will show whether this position improves, remains stable or becomes more difficult."
          }`,

        recoverySleepCommentary:
          `Sleep difficulty is currently ${formatMetric(
            sleepMetric?.current
          )} out of 10 and recovery difficulty is ${formatMetric(
            recoveryMetric?.current
          )} out of 10. These are baseline positions rather than established trends.`,

        additionalCommentary:
          `Mood difficulty is currently ${formatMetric(
            moodMetric?.current
          )} out of 10 and focus difficulty is ${formatMetric(
            focusMetric?.current
          )} out of 10. Root will compare these results with future check-ins to identify genuine movement.`,

        detected:
          "Root has detected the organisation's initial wellbeing profile. It has not yet detected a trend because no follow-up comparison is available.",

        meaning:
          `${
            highRiskMetric?.label || "The highest measured difficulty"
          } deserves attention within the current baseline. Recommendations are based on present severity and organisational risk, not assumed improvement.`,

        watchingNext:
          "Root will watch whether the highest difficulty areas improve, remain elevated or begin affecting other wellbeing measures during the next check-in.",

        typicalNextStep:
          `Organisations at this stage usually establish regular check-ins, communicate available support clearly and consider an early response to the most elevated baseline indicators.`,

        forecast:
          "As further check-ins are completed, Root will begin comparing the workforce picture with this baseline. This will allow future reports to identify genuine movement rather than relying on a single measurement.",

        recommendation:
          `Root recommends preparing the ${initiative.title}. This recommendation is based on the current baseline severity, particularly ${
            primaryConcern || highRiskMetric?.label || "the highest measured difficulty"
          }, rather than a claimed trend.`,

        closingSummary:
          `This report establishes the organisation's initial wellbeing baseline. The current Workforce Wellbeing Index is ${
            currentScore ?? "—"
          } out of 100, with ${
            highRiskMetric?.label || "one area"
          } showing the highest measured difficulty. Future Executive Reviews will compare later check-ins with this starting point to identify genuine organisational change.`,
      }
    : {
        overview:
          `Root has compared the latest workforce wellbeing picture with the organisation's baseline. The current Workforce Wellbeing Index is ${currentScore ?? "—"} out of 100.`,

        numbersSuggest:
          mostImproved
            ? `${mostImproved.label} is showing the strongest improvement, moving from ${formatMetric(
                mostImproved.start
              )} to ${formatMetric(mostImproved.current)}.`
            : "No clear improvement has yet been established, although Root can now compare the latest results with the baseline.",

        stressCommentary:
          stressMetric?.change < 0
            ? `Stress improved from ${formatMetric(
                stressMetric.start
              )} to ${formatMetric(stressMetric.current)}.`
            : stressMetric?.change > 0
            ? `Stress increased from ${formatMetric(
                stressMetric.start
              )} to ${formatMetric(stressMetric.current)} and should be watched.`
            : `Stress remains at ${formatMetric(
                stressMetric?.current
              )} out of 10.`,

        burnoutCommentary:
          burnoutMetric?.change < 0
            ? `Burnout improved from ${formatMetric(
                burnoutMetric.start
              )} to ${formatMetric(burnoutMetric.current)}.`
            : burnoutMetric?.change > 0
            ? `Burnout increased from ${formatMetric(
                burnoutMetric.start
              )} to ${formatMetric(burnoutMetric.current)} and deserves attention.`
            : `Burnout remains at ${formatMetric(
                burnoutMetric?.current
              )} out of 10.`,

        recoverySleepCommentary:
          `Sleep difficulty is currently ${formatMetric(
            sleepMetric?.current
          )} out of 10 and recovery difficulty is ${formatMetric(
            recoveryMetric?.current
          )} out of 10. Root will continue comparing both against the baseline.`,

        additionalCommentary:
          `Mood difficulty is currently ${formatMetric(
            moodMetric?.current
          )} out of 10 and focus difficulty is ${formatMetric(
            focusMetric?.current
          )} out of 10.`,

        detected:
          mostImproved
            ? `Root has detected early movement, with ${mostImproved.label.toLowerCase()} showing the clearest improvement.`
            : "Root can now compare results with the baseline, but no clear positive movement has yet been established.",

        meaning:
          `${primaryConcern} remains the most important area for organisational attention. Root's interpretation is based on measured movement as well as current severity.`,

        watchingNext:
          `Root will watch whether current movement is sustained and whether improvements begin to influence recovery, energy, mood and focus.`,

        typicalNextStep:
          `Organisations in this position usually maintain regular check-ins while introducing targeted support around ${recommendedFocus.toLowerCase()}.`,

        forecast:
          "Further check-ins will increase confidence and show whether the current movement is temporary, sustained or developing into a wider organisational pattern.",

        recommendation:
          `Root recommends progressing the ${initiative.title} and reviewing its effect during the next reporting period.`,

        closingSummary:
          `${boardCase.executiveSummary} ${boardCase.recommendation}`,
      };

const executiveEvidence =
    supportInteractions > 0
      ? `${supportInteractions} support interactions recorded`
      : `${assessments.length} assessments completed`;

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
    highRiskMetric,
    mostCommonTheme,
    mappedChallengeCounts,
    primaryConcern,
    recommendedFocus,
    confidenceScore,
    confidenceLabel,
    executiveStatus,
    initiative,
    nextReviewFocus,
    workforceNarrative,
    executiveEvidence,
    organisationMemory,
    executiveQuestions,
    rootHypothesis,
    recommendedInsight,
    confidenceReasons,
    boardCase,
  boardDecision: {
  recommendation: boardCase.recommendation,
  approvalRequest: boardCase.approvalRequest,
  expectedBenefit: boardCase.expectedBenefit,
  successCriteria: boardCase.successCriteria,
  reviewQuestions: boardCase.reviewQuestions,
},
    analysisStage,
    executiveNarrative,
    };
    }