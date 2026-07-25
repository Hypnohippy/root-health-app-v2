import { buildOrganisationCommunication } from "./rootCommunicationEngine";
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
const ORGANISATION_METRICS = [
  ["Stress", "stress_score"],
  ["Burnout", "burnout_score"],
  ["Sleep difficulty", "sleep_score"],
  ["Recovery difficulty", "recovery_score"],
  ["Mood difficulty", "mood_score"],
  ["Focus difficulty", "focus_score"],
];

function normaliseId(value) {
  if (value === null || value === undefined) return null;

  const normalised = String(value).trim();
  return normalised || null;
}

function getAssessmentTime(assessment) {
  const value =
    assessment?.created_at ||
    assessment?.completed_at ||
    assessment?.updated_at ||
    null;

  if (!value) return 0;

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function sortAssessmentsOldestFirst(items = []) {
  return [...items].sort(
    (first, second) =>
      getAssessmentTime(first) - getAssessmentTime(second)
  );
}

function getActiveOrganisationId(organisation) {
  return normaliseId(
    organisation?.id ||
      organisation?.organisation_id ||
      organisation?.organisationId
  );
}

function assessmentBelongsToOrganisation(
  assessment,
  activeOrganisationId
) {
  const assessmentOrganisationId = normaliseId(
    assessment?.organisation_id
  );

  if (!assessmentOrganisationId) {
    return false;
  }

  if (!activeOrganisationId) {
    return true;
  }

  return assessmentOrganisationId === activeOrganisationId;
}

function buildValidMemberKeys(members = [], activeOrganisationId = null) {
  const keys = new Set();

  members.forEach((member) => {
    const memberOrganisationId = normaliseId(
      member?.organisation_id
    );

    if (
      activeOrganisationId &&
      memberOrganisationId &&
      memberOrganisationId !== activeOrganisationId
    ) {
      return;
    }

    const profileKey = normaliseId(member?.profile_key);

    if (profileKey) {
      keys.add(profileKey);
    }
  });

  return keys;
}

function buildParticipantJourney(profileKey, assessmentRows = []) {
  const orderedAssessments =
    sortAssessmentsOldestFirst(assessmentRows);

  const markedBaseline = orderedAssessments.find(
    (assessment) => assessment?.assessment_type === "baseline"
  );

  /*
   * We currently require a deliberately marked baseline.
   * We do not silently turn the first check-in into a baseline here.
   * That protects the reporting engine from malformed or historic data.
   */
  if (!markedBaseline) {
    return {
      profileKey,
      baseline: null,
      latest: null,
      checkins: [],
      assessmentCount: orderedAssessments.length,
      hasBaseline: false,
      hasFollowUp: false,
      changes: {},
      classification: "invalid",
    };
  }

  const baselineTime = getAssessmentTime(markedBaseline);

  const checkins = orderedAssessments.filter((assessment) => {
    if (assessment?.id === markedBaseline?.id) {
      return false;
    }

    return (
      assessment?.assessment_type !== "baseline" &&
      getAssessmentTime(assessment) >= baselineTime
    );
  });

  const latest =
    checkins.length > 0
      ? checkins[checkins.length - 1]
      : markedBaseline;

  const changes = {};

  ORGANISATION_METRICS.forEach(([, key]) => {
    const start = Number(markedBaseline?.[key]);
    const current = Number(latest?.[key]);

    changes[key] =
      Number.isNaN(start) || Number.isNaN(current)
        ? null
        : current - start;
  });

  const validChanges = Object.values(changes).filter(
    (value) => value !== null
  );

  const averageChange =
    validChanges.length > 0
      ? validChanges.reduce((sum, value) => sum + value, 0) /
        validChanges.length
      : null;

  let classification = "baseline-only";

  if (checkins.length > 0 && averageChange !== null) {
    if (averageChange <= -0.25) {
      classification = "improved";
    } else if (averageChange >= 0.25) {
      classification = "worsened";
    } else {
      classification = "stable";
    }
  }

  return {
    profileKey,
    baseline: markedBaseline,
    latest,
    checkins,
    assessmentCount: orderedAssessments.length,
    hasBaseline: true,
    hasFollowUp: checkins.length > 0,
    changes,
    averageChange,
    classification,
  };
}

export function buildParticipantJourneys({
  organisation = null,
  members = [],
  assessments = [],
} = {}) {
  const activeOrganisationId =
    getActiveOrganisationId(organisation);

  const validMemberKeys = buildValidMemberKeys(
    members,
    activeOrganisationId
  );

  const organisationAssessments = assessments.filter(
    (assessment) =>
      assessmentBelongsToOrganisation(
        assessment,
        activeOrganisationId
      )
  );

  const groupedAssessments = new Map();

  organisationAssessments.forEach((assessment) => {
    const profileKey = normaliseId(assessment?.profile_key);

    if (!profileKey) {
      return;
    }

    /*
     * When membership rows are supplied, only confirmed members
     * may contribute to organisation reporting.
     *
     * When no membership rows are supplied, the assessment remains
     * usable so older calling code does not fail unexpectedly.
     */
    if (
      validMemberKeys.size > 0 &&
      !validMemberKeys.has(profileKey)
    ) {
      return;
    }

    if (!groupedAssessments.has(profileKey)) {
      groupedAssessments.set(profileKey, []);
    }

    groupedAssessments.get(profileKey).push(assessment);
  });

  const journeys = Array.from(groupedAssessments.entries()).map(
    ([profileKey, rows]) =>
      buildParticipantJourney(profileKey, rows)
  );

  const validJourneys = journeys.filter(
    (journey) => journey.hasBaseline
  );

  const matchedJourneys = validJourneys.filter(
    (journey) => journey.hasFollowUp
  );

  const baselineOnlyJourneys = validJourneys.filter(
    (journey) => !journey.hasFollowUp
  );

  const invalidJourneys = journeys.filter(
    (journey) => !journey.hasBaseline
  );

  return {
    activeOrganisationId,
    journeys,
    validJourneys,
    matchedJourneys,
    baselineOnlyJourneys,
    invalidJourneys,
  };
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
    /*
   * Build anonymous participant journeys before calculating
   * any organisation-level result.
   */
  const journeyData = buildParticipantJourneys({
    organisation,
    members,
    assessments,
  });

  const {
    activeOrganisationId,
    validJourneys,
    matchedJourneys,
    baselineOnlyJourneys,
    invalidJourneys,
  } = journeyData;

  /*
   * Each valid participant contributes one baseline and one
   * current position.
   *
   * For baseline-only participants, their current position remains
   * their baseline until they complete a later check-in.
   */
  const baseline = validJourneys
    .map((journey) => journey.baseline)
    .filter(Boolean);

  const latest = validJourneys
    .map((journey) => journey.latest)
    .filter(Boolean);

  const metrics = ORGANISATION_METRICS;

  const metricResults = metrics.map(([label, key]) => {
    const start = average(baseline, key);
    const current = average(latest, key);

    /*
     * Organisational movement must be calculated only from matched
     * participant journeys.
     *
     * This prevents baseline-only participants from creating an
     * artificial impression of no change.
     */
    const matchedStart = average(
      matchedJourneys.map((journey) => journey.baseline),
      key
    );

    const matchedCurrent = average(
      matchedJourneys.map((journey) => journey.latest),
      key
    );

    const change =
      matchedJourneys.length > 0
        ? metricChange(matchedStart, matchedCurrent)
        : null;

    return {
      label,
      key,
      start,
      current,
      change,
      matchedStart,
      matchedCurrent,
      matchedParticipantCount: matchedJourneys.length,
    };
  });

  /*
   * Scope membership statistics to the active organisation.
   * There are no fixed organisations or participant limits.
   */
  const scopedMembers = members.filter((member) => {
    const memberOrganisationId = normaliseId(
      member?.organisation_id
    );

    if (!activeOrganisationId) {
      return true;
    }

    /*
     * Older membership rows may not contain organisation_id when
     * they have already been loaded through an organisation-scoped
     * query. Those rows remain usable.
     */
    if (!memberOrganisationId) {
      return true;
    }

    return memberOrganisationId === activeOrganisationId;
  });

  const invited = scopedMembers.length;

  const activated = scopedMembers.filter(
    (member) => member?.activated_at
  ).length;

  /*
   * Use confirmed assessment journeys as the source of truth for
   * baseline completion rather than relying only on a membership flag.
   */
  const baselineCompleted = validJourneys.length;

    /*
   * Compact participation intelligence for Org Insights.
   *
   * These values contain organisation-level totals only.
   * No profile keys or individual journeys are returned to HR.
   */
  const joined = activated;

  const matchedParticipants = matchedJourneys.length;

  const baselineOnlyParticipants = baselineOnlyJourneys.length;

  const improvedParticipants = matchedJourneys.filter(
    (journey) => journey.classification === "improved"
  ).length;

  const stableParticipants = matchedJourneys.filter(
    (journey) => journey.classification === "stable"
  ).length;

  const worsenedParticipants = matchedJourneys.filter(
    (journey) => journey.classification === "worsened"
  ).length;

  const departmentsRepresented = new Set(
  validJourneys
    .map((journey) => {
      const member = scopedMembers.find(
        (item) =>
          normaliseId(item?.profile_key) ===
          normaliseId(journey?.profileKey)
      );

      return String(
        member?.department || ""
      ).trim();
    })
    .filter(Boolean)
).size;

  const participationRate =
    invited > 0
      ? Math.round((joined / invited) * 100)
      : null;

  const baselineCompletionRate =
    invited > 0
      ? Math.round((baselineCompleted / invited) * 100)
      : null;

  const followUpRate =
    baselineCompleted > 0
      ? Math.round(
          (matchedParticipants / baselineCompleted) * 100
        )
      : null;

  /*
   * Root should not present movement distributions from very
   * small groups as reliable organisational conclusions.
   */
  const privacyMinimum = 5;

  const outcomeSuppressed =
    matchedParticipants < privacyMinimum;

  const participation = {
    invited,
    joined,
    baselineCompleted,
    matchedParticipants,
    baselineOnlyParticipants,
    participationRate,
    baselineCompletionRate,
    followUpRate,
    improvedParticipants,
    stableParticipants,
    worsenedParticipants,
    departmentsRepresented,
    invalidJourneyCount: invalidJourneys.length,
    privacyMinimum,
    outcomeSuppressed,
  };

  const supportInteractions =
    mindEntries.length +
    journalEntries.length +
    voiceSessions.length;

  const baselineScore = scoreFromAssessments(baseline);
  const currentScore = scoreFromAssessments(latest);

  const engagementScore =
    invited > 0
      ? Math.round(
          ((Math.min(activated, invited) +
            Math.min(baselineCompleted, invited)) /
            (invited * 2)) *
            100
        )
      : null;

  /*
   * Build organisation review stages rather than displaying
   * individual employee assessments chronologically.
   */
  const baselineTrendRow =
    baseline.length > 0
      ? {
          label: "Baseline",
          stress: average(baseline, "stress_score"),
          burnout: average(baseline, "burnout_score"),
          sleep: average(baseline, "sleep_score"),
          recovery: average(baseline, "recovery_score"),
          participantCount: baseline.length,
        }
      : null;

  const maximumCheckinCount = validJourneys.reduce(
    (maximum, journey) =>
      Math.max(maximum, journey.checkins.length),
    0
  );

  const checkinTrendRows = Array.from(
    { length: maximumCheckinCount },
    (_, index) => {
      const stageAssessments = validJourneys
        .map((journey) => journey.checkins[index])
        .filter(Boolean);

      if (!stageAssessments.length) {
        return null;
      }

      return {
        label: `Check-in ${index + 1}`,
        stress: average(stageAssessments, "stress_score"),
        burnout: average(stageAssessments, "burnout_score"),
        sleep: average(stageAssessments, "sleep_score"),
        recovery: average(stageAssessments, "recovery_score"),
        participantCount: stageAssessments.length,
      };
    }
  ).filter(Boolean);

  const trendRows = baselineTrendRow
  ? [baselineTrendRow, ...checkinTrendRows]
  : checkinTrendRows;

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

 /*
 * Movement may only be reported when the anonymous reporting
 * threshold has been reached.
 *
 * Current severity may still be shown as an aggregated organisation
 * position, but baseline-to-follow-up movement remains suppressed.
 */
const movementEvidenceAvailable = !outcomeSuppressed;

const calculatedMostImproved = metricResults
  .filter((item) => item.change !== null && item.change < 0)
  .sort((a, b) => a.change - b.change)[0];

const calculatedWatchArea = metricResults
  .filter((item) => item.change !== null && item.change > 0)
  .sort((a, b) => b.change - a.change)[0];

const mostImproved = movementEvidenceAvailable
  ? calculatedMostImproved
  : null;

const watchArea = movementEvidenceAvailable
  ? calculatedWatchArea
  : null;

const highRiskMetric = metricResults
  .filter((item) => item.current !== null)
  .sort((a, b) => b.current - a.current)[0];

const movementSummary = {
  suppressed: outcomeSuppressed,

  suppressionReason: outcomeSuppressed
    ? `Movement results remain suppressed until at least ${privacyMinimum} participants have completed both a baseline and a follow-up check-in.`
    : null,

  biggestImprovement: mostImproved
    ? {
        label: mostImproved.label,
        start: mostImproved.matchedStart,
        current: mostImproved.matchedCurrent,
        change: mostImproved.change,
        summary: `${mostImproved.label} showed the strongest improvement, moving from ${formatMetric(
          mostImproved.matchedStart
        )} to ${formatMetric(mostImproved.matchedCurrent)}.`,
      }
    : null,

  watchArea: watchArea
    ? {
        label: watchArea.label,
        start: watchArea.matchedStart,
        current: watchArea.matchedCurrent,
        change: watchArea.change,
        summary: `${watchArea.label} increased from ${formatMetric(
          watchArea.matchedStart
        )} to ${formatMetric(
          watchArea.matchedCurrent
        )} and should be monitored during the next review period.`,
      }
    : null,

  highestCurrentDifficulty: highRiskMetric
    ? {
        label: highRiskMetric.label,
        current: highRiskMetric.current,
        summary: `${highRiskMetric.label} is currently the highest measured difficulty at ${formatMetric(
          highRiskMetric.current
        )} out of 10.`,
      }
    : null,
};

    /*
   * These values now represent the current organisation average,
   * not the final employee assessment in the database.
   */
  const stressLatest =
    metricResults.find((item) => item.key === "stress_score")
      ?.current ?? null;

  const burnoutLatest =
    metricResults.find((item) => item.key === "burnout_score")
      ?.current ?? null;

  const recoveryLatest =
    metricResults.find((item) => item.key === "recovery_score")
      ?.current ?? null;

  const sleepLatest =
    metricResults.find((item) => item.key === "sleep_score")
      ?.current ?? null;
  const recoveryRiskDetected =
    stressLatest !== null &&
    burnoutLatest !== null &&
    recoveryLatest !== null &&
    stressLatest <= 3 &&
    (burnoutLatest >= 7 || recoveryLatest >= 7);

  const primaryConcern =
  mostCommonTheme !== "No challenge data yet"
    ? mostCommonTheme
    : highRiskMetric?.label || "Workforce wellbeing";

  const recommendedFocus =
  primaryConcern.includes("Workplace")
    ? "Manager awareness and workload conversations"
    : primaryConcern.includes("Burnout")
    ? "Burnout prevention and recovery habits"
    : primaryConcern.includes("Mood")
    ? "Mood support and emotional resilience"
    : primaryConcern.includes("Focus")
    ? "Focus, workload and cognitive recovery"
    : highRiskMetric?.label
    ? `${highRiskMetric.label} improvement`
    : "Maintain support engagement";

  /*
 * Confidence is based on valid organisation participation rather than
 * the raw number of database rows.
 */
const participationEvidence =
  baselineCompleted > 0
    ? Math.min(35, baselineCompleted * 7)
    : 0;

const followUpEvidence =
  matchedParticipants > 0
    ? Math.min(35, matchedParticipants * 7)
    : 0;

const engagementEvidence =
  supportInteractions > 0
    ? Math.min(15, Math.round(supportInteractions * 0.75))
    : 0;

const activationEvidence =
  invited > 0
    ? Math.min(
        15,
        Math.round((activated / invited) * 15)
      )
    : 0;

const confidenceScore = Math.min(
  100,
  participationEvidence +
    followUpEvidence +
    engagementEvidence +
    activationEvidence
);

const confidenceLabel = outcomeSuppressed
  ? matchedParticipants > 0
    ? "Developing"
    : baselineCompleted > 0
    ? "Baseline Confidence"
    : "Early Stage"
  : confidenceScore >= 80
  ? "High Confidence"
  : confidenceScore >= 60
  ? "Established"
  : confidenceScore >= 40
  ? "Developing"
  : "Early Stage";

const analysisStage =
  baselineCompleted === 0
    ? {
        level: 0,
        title: "Awaiting Baseline",
        description:
          "Root does not yet have enough completed baseline assessments to establish an organisation-level wellbeing picture.",
      }
    : matchedParticipants === 0
    ? {
        level: 1,
        title: "Baseline Established",
        description:
          "Root has established the organisation's starting wellbeing profile. Recommendations are based on current severity rather than measured change.",
      }
    : outcomeSuppressed
    ? {
        level: 2,
        title: "Follow-Up Evidence Developing",
        description:
          `Follow-up check-ins have been completed, but movement results remain suppressed until the anonymous reporting threshold of ${privacyMinimum} matched participants is reached.`,
      }
    : matchedParticipants < 10
    ? {
        level: 3,
        title: "Movement Detected",
        description:
          "Root can now compare matched participant follow-ups with the baseline and identify early organisation-level movement.",
      }
    : {
        level: 4,
        title: "Patterns Emerging",
        description:
          "Repeated matched reviews are beginning to reveal reliable organisational wellbeing patterns.",
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

 const primaryConcernLower = String(
  primaryConcern || ""
).toLowerCase();

const highRiskLabelLower = String(
  highRiskMetric?.label || ""
).toLowerCase();

const evidenceIsBaselineOnly =
  analysisStage.level <= 1;

const evidenceIsSuppressed =
  outcomeSuppressed && matchedParticipants > 0;

let initiative;

if (recoveryRiskDetected) {
  initiative = {
    key: "recovery-reset",
    title: "Recovery Reset Month",
    introduction:
      "Root has identified elevated burnout or recovery pressure despite comparatively lower immediate stress. This initiative helps employees rebuild sustainable energy and strengthen recovery habits.",
    reason:
      "The current organisation picture suggests that accumulated strain and reduced recovery deserve early attention.",
    status: "Ready to launch",
    expectedOutcome:
      "Improved recovery, reduced burnout risk and stronger engagement with available support.",
    workshopTitle: "Recovery & Resilience Workshop",
    workshopDescription:
      "A practical workshop helping employees understand accumulated strain, rebuild energy and develop sustainable recovery habits.",
    reportFocus:
      "Recovery behaviours, sustainable performance and manager awareness.",
  };
} else if (
  primaryConcernLower.includes("workplace")
) {
  initiative = {
    key: "workplace-pressure",
    title: "Healthy Pressure & Performance Month",
    introduction:
      "Root has identified workplace pressure as the most visible anonymous workforce theme. This initiative helps employees and managers respond before ordinary pressure becomes sustained strain.",
    reason:
      "Anonymous workforce themes suggest that workload, management expectations or workplace demands deserve closer attention.",
    status: "Ready to prepare",
    expectedOutcome:
      "Healthier workload conversations, improved pressure awareness and earlier support engagement.",
    workshopTitle: "Pressure & Performance Workshop",
    workshopDescription:
      "A practical session exploring workload pressure, sustainable performance and the point at which normal demand becomes harmful.",
    reportFocus:
      "Workplace pressure, workload conversations and manager awareness.",
  };
} else if (
  primaryConcernLower.includes("burnout") ||
  highRiskLabelLower.includes("burnout")
) {
  initiative = {
    key: "burnout-prevention",
    title: "Burnout Prevention Month",
    introduction:
      "Root has identified burnout difficulty as an important current organisational concern. This initiative helps employees and managers recognise accumulated strain and respond earlier.",
    reason:
      "Burnout difficulty is elevated within the current organisation wellbeing picture and deserves focused preventative action.",
    status: "Ready to launch",
    expectedOutcome:
      "Reduced burnout difficulty, earlier support engagement and healthier expectations around sustainable performance.",
    workshopTitle: "Recognising & Preventing Burnout",
    workshopDescription:
      "A practical session helping employees and managers recognise accumulated strain, understand burnout risk and respond before capacity is exhausted.",
    reportFocus:
      "Burnout prevention, accumulated strain and sustainable capacity.",
  };
} else if (
  primaryConcernLower.includes("mood") ||
  highRiskLabelLower.includes("mood")
) {
  initiative = {
    key: "emotional-resilience",
    title: "Emotional Resilience & Mood Month",
    introduction:
      "Root has identified mood difficulty as an important current area for organisational support. This initiative provides practical tools for emotional resilience, early support and healthier conversations.",
    reason:
      "Mood difficulty is currently the strongest measured wellbeing concern and would benefit from targeted, preventative support.",
    status: "Ready to launch",
    expectedOutcome:
      "Improved mood indicators, stronger emotional resilience and earlier engagement with available support.",
    workshopTitle: "Emotional Resilience Workshop",
    workshopDescription:
      "A practical workshop helping employees understand emotional load, respond to difficult periods and build healthier resilience habits.",
    reportFocus:
      "Mood support, emotional resilience and early intervention.",
  };
} else if (
  primaryConcernLower.includes("sleep") ||
  highRiskLabelLower.includes("sleep")
) {
  initiative = {
    key: "sleep-recovery",
    title: "Sleep & Recovery Month",
    introduction:
      "Root has identified sleep difficulty as an important current wellbeing concern. This initiative helps employees understand the relationship between sleep, energy, recovery and performance.",
    reason:
      "Sleep difficulty is elevated and may be affecting energy, concentration, recovery and sustainable performance.",
    status: "Ready to launch",
    expectedOutcome:
      "Improved sleep awareness, healthier recovery habits and reduced fatigue-related difficulty.",
    workshopTitle: "Sleep, Energy & Recovery Workshop",
    workshopDescription:
      "A practical session exploring sleep difficulty, fatigue, recovery and the habits that support sustainable energy.",
    reportFocus:
      "Sleep difficulty, fatigue, recovery and sustainable energy.",
  };
} else if (
  primaryConcernLower.includes("focus") ||
  highRiskLabelLower.includes("focus")
) {
  initiative = {
    key: "focus-recovery",
    title: "Focus & Cognitive Recovery Month",
    introduction:
      "Root has identified focus difficulty as an important current organisational concern. This initiative helps employees reduce cognitive overload, recover attention and work with clearer priorities.",
    reason:
      "Focus difficulty is elevated and may reflect cognitive overload, competing demands or insufficient recovery.",
    status: "Ready to launch",
    expectedOutcome:
      "Improved focus indicators, clearer priorities and healthier cognitive recovery.",
    workshopTitle: "Focus, Overload & Cognitive Recovery",
    workshopDescription:
      "A practical workshop helping employees understand cognitive overload, protect attention and rebuild focus.",
    reportFocus:
      "Focus difficulty, cognitive overload and priority clarity.",
  };
} else if (
  primaryConcernLower.includes("stress") ||
  highRiskLabelLower === "stress"
) {
  initiative = {
    key: "stress-resilience",
    title: "Stress & Resilience Month",
    introduction:
      "Root has identified stress as an important current organisational concern. This initiative helps employees recognise pressure earlier and develop practical resilience habits.",
    reason:
      "Stress is elevated within the current organisation wellbeing picture and deserves targeted support before it becomes sustained strain.",
    status: "Ready to launch",
    expectedOutcome:
      "Reduced stress difficulty, improved pressure awareness and earlier engagement with support.",
    workshopTitle: "Practical Stress & Resilience Workshop",
    workshopDescription:
      "A practical session helping employees understand stress, recognise early warning signs and use effective regulation and recovery strategies.",
    reportFocus:
      "Stress awareness, pressure regulation and emotional resilience.",
  };
} else {
  initiative = {
    key: "wellbeing-foundations",
    title: "Wellbeing Foundations Month",
    introduction:
      evidenceIsBaselineOnly
        ? "Root has established an initial organisational wellbeing picture. This initiative introduces practical support while future check-ins build a clearer understanding of workforce needs."
        : evidenceIsSuppressed
        ? "Root has established an initial wellbeing picture and has begun receiving follow-up check-ins. Movement remains private until the anonymous reporting threshold is reached."
        : "Root has identified a broad opportunity to strengthen wellbeing awareness, practical support and continued participation.",
    reason:
      evidenceIsBaselineOnly
        ? "Root currently has a valid baseline but does not yet have enough follow-up evidence to identify reliable movement."
        : evidenceIsSuppressed
        ? `Follow-up evidence is developing, but movement cannot yet be reported because fewer than ${privacyMinimum} participants have completed matched check-ins.`
        : "No single wellbeing area currently outweighs the wider opportunity to strengthen organisational support.",
    status: "Ready to prepare",
    expectedOutcome:
      "Stronger participation, increased support awareness and a clearer organisation-level wellbeing picture.",
    workshopTitle: "Wellbeing Foundations Workshop",
    workshopDescription:
      "An introductory session helping employees understand stress, recovery, sleep and the practical support available through Root.",
    reportFocus:
      "Participation, wellbeing awareness and reliable organisational measurement.",
  };
}

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

let rootHypothesis;

if (analysisStage.level === 0) {
  rootHypothesis =
    "Root does not yet have enough valid baseline evidence to support an organisation-level explanation.";
} else if (analysisStage.level === 1) {
  rootHypothesis = highRiskMetric?.label
    ? `Root's current hypothesis is that ${highRiskMetric.label.toLowerCase()} deserves early attention. This interpretation is based on current severity within the baseline and is not yet a measured trend.`
    : "Root has established an initial baseline but does not yet have enough evidence to support a stronger explanation.";
} else if (outcomeSuppressed) {
  rootHypothesis = highRiskMetric?.label
    ? `Root's current hypothesis is that ${highRiskMetric.label.toLowerCase()} deserves focused organisational support. Follow-up activity has begun, but movement remains suppressed until the anonymous reporting threshold is reached.`
    : `Root has begun receiving follow-up evidence, but movement remains suppressed until at least ${privacyMinimum} matched participants are available.`;
} else if (recoveryRiskDetected) {
  rootHypothesis =
    "Root suspects that employees may be managing immediate demands without fully recovering from accumulated strain. This interpretation is based on comparatively lower stress alongside elevated burnout or recovery difficulty.";
} else if (
  mostCommonTheme.includes("Workplace") &&
  highRiskMetric?.current >= 6
) {
  rootHypothesis =
    "Root suspects that sustained workload, workplace expectations or management pressure may be contributing to the current organisation wellbeing picture.";
} else if (
  moodMetric?.current !== null &&
  moodMetric?.current >= 6
) {
  rootHypothesis =
    "Root suspects that emotional load or reduced resilience may be contributing to elevated mood difficulty. Continued anonymous review will help establish whether this is sustained and what support produces improvement.";
} else if (
  sleepLatest !== null &&
  sleepLatest >= 7
) {
  rootHypothesis =
    "Root suspects that sleep difficulty may be limiting recovery, concentration and wider wellbeing improvement.";
} else if (
  burnoutLatest !== null &&
  burnoutLatest >= 7
) {
  rootHypothesis =
    "Root suspects that accumulated strain may be continuing even where employees appear to be managing immediate day-to-day pressure.";
} else if (
  focusMetric?.current !== null &&
  focusMetric?.current >= 6
) {
  rootHypothesis =
    "Root suspects that cognitive overload, competing priorities or insufficient recovery may be contributing to focus difficulty.";
} else {
  rootHypothesis =
    "Root has identified a measurable organisation wellbeing picture but does not yet have enough consistent evidence to support a more specific causal explanation.";
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
  analysisStage.level <= 2
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
  matchedParticipants === 0
    ? "Root has detected the organisation's initial wellbeing profile. It has not yet detected a trend because no matched follow-up comparison is available."
    : `Root has received ${matchedParticipants} matched follow-up check-in${
        matchedParticipants === 1 ? "" : "s"
      }, but movement remains suppressed until the anonymous reporting threshold of ${privacyMinimum} participants is reached.`,

        meaning:
          `${
            highRiskMetric?.label || "The highest measured difficulty"
          } deserves attention within the current baseline. Recommendations are based on present severity and organisational risk, not assumed improvement.`,

        watchingNext:
          "Root will watch whether the highest difficulty areas improve, remain elevated or begin affecting other wellbeing measures during the next check-in.",

        typicalNextStep:
          `Organisations at this stage usually establish regular check-ins, communicate available support clearly and consider an early response to the most elevated baseline indicators.`,

       forecast:
  matchedParticipants === 0
    ? "As further check-ins are completed, Root will begin comparing the workforce picture with this baseline. Future reports will then be able to identify genuine movement."
    : `As more matched follow-ups are completed, Root will release organisation-level movement once the anonymous reporting threshold of ${privacyMinimum} participants has been reached.`,

        recommendation:
  `Root recommends preparing and launching ${initiative.title}. This recommendation is based on the current baseline severity, particularly ${
    primaryConcern || highRiskMetric?.label || "the highest measured difficulty"
  }, rather than a claimed trend.`,

  recommendationReason:
  `This recommendation has been selected because ${
    highRiskMetric?.label || "the primary wellbeing concern"
  } is currently the highest measured organisational difficulty. Early intervention provides the greatest opportunity to improve employee wellbeing before elevated pressure becomes an established organisational pattern.`,

  businessImpact:
  `If the current baseline remains unchanged across future review periods, organisations commonly experience reduced engagement, increased presenteeism, lower resilience and reduced discretionary performance. Root is not predicting these outcomes are occurring now; it is identifying where early intervention is most likely to provide measurable organisational value.`,
  
  expectedOutcome:
  `If ${initiative.title} is implemented successfully, Root would expect future review periods to demonstrate reduced ${
    highRiskMetric?.label?.toLowerCase() || "wellbeing difficulty"
  }, stronger recovery, increased support engagement and an improving Workforce Wellbeing Index.`,
  
  boardApproval:
  `Root recommends approval because this initiative directly addresses the highest measured organisational difficulty, provides an opportunity for early intervention and can be reviewed objectively during the next Executive Review.`,

  successMeasures: [
  `Reduce ${
    highRiskMetric?.label || "the highest measured difficulty"
  }.`,
  "Increase employee support engagement.",
  "Maintain participation levels.",
  "Improve the Workforce Wellbeing Index during future review periods.",
],

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
  `Root recommends progressing ${initiative.title} and reviewing its effect during the next reporting period.`,

recommendationReason:
  `This recommendation has been selected because ${
    primaryConcern || highRiskMetric?.label || "the primary wellbeing concern"
  } remains the most important area for organisational attention. Root is considering both current severity and measured movement.`,

businessImpact:
  `If the current pattern remains unchanged, organisations commonly experience reduced engagement, increased presenteeism, lower resilience and reduced discretionary performance. Root is identifying an area of organisational risk, not claiming that all of these outcomes are already occurring.`,

expectedOutcome:
  `If ${initiative.title} is implemented successfully, Root would expect improvement in ${
    highRiskMetric?.label?.toLowerCase() || "the primary wellbeing concern"
  }, stronger recovery indicators, increased support engagement and a healthier Workforce Wellbeing Index.`,

boardApproval:
  `Root recommends approval because this initiative addresses the strongest current organisational concern, is supported by measured workforce evidence and can be evaluated objectively during the next Executive Review.`,

successMeasures: [
  `Improve ${
    highRiskMetric?.label || "the highest measured difficulty"
  }.`,
  "Increase employee support engagement.",
  "Maintain or improve participation levels.",
  "Improve the Workforce Wellbeing Index during future review periods.",
],

closingSummary:
  `${boardCase.executiveSummary} ${boardCase.recommendation}`,
      };

const executiveEvidence =
  supportInteractions > 0
    ? `${supportInteractions} support interactions recorded`
    : `${assessments.length} assessments completed`;

const communication =
  buildOrganisationCommunication(
    {
      organisation,
      participation,
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
      watchArea,
      highRiskMetric,
      movementSummary,
      mostCommonTheme,
      mappedChallengeCounts,
      primaryConcern,
      recommendedFocus,
      confidenceScore,
      confidenceLabel,
      executiveStatus,
      initiative,
      nextReviewFocus,
      analysisStage,
    },
    {
      audience: "executive",
    }
  );

return {
    organisation,
    participation,
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
    watchArea,
    highRiskMetric,
    movementSummary,
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
    communication,
  };
}
    