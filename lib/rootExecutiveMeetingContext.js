const DAY_IN_MS =
  24 * 60 * 60 * 1000;

const SCORE_FIELDS = [
  {
    key: "stress_score",
    id: "stress",
    label: "Stress",
  },
  {
    key: "burnout_score",
    id: "burnout",
    label: "Burnout",
  },
  {
    key: "sleep_score",
    id: "sleep",
    label: "Sleep difficulty",
  },
  {
    key: "recovery_score",
    id: "recovery",
    label: "Recovery difficulty",
  },
  {
    key: "energy_score",
    id: "energy",
    label: "Energy difficulty",
  },
  {
    key: "mood_score",
    id: "mood",
    label: "Mood difficulty",
  },
  {
    key: "focus_score",
    id: "focus",
    label: "Focus difficulty",
  },
];

function safeNumber(value) {
  const number =
    Number(value);

  return Number.isFinite(number)
    ? number
    : null;
}

function safeArray(value) {
  return Array.isArray(value)
    ? value
    : [];
}

function safeDate(value) {
  if (!value) return null;

  const date =
    new Date(value);

  return Number.isNaN(
    date.getTime()
  )
    ? null
    : date;
}

function round1(value) {
  const number =
    safeNumber(value);

  if (number === null) {
    return null;
  }

  return Math.round(
    number * 10
  ) / 10;
}

function average(
  items = [],
  key
) {
  const values =
    safeArray(items)
      .map((item) =>
        safeNumber(
          item?.[key]
        )
      )
      .filter(
        (value) =>
          value !== null
      );

  if (!values.length) {
    return null;
  }

  return (
    values.reduce(
      (sum, value) =>
        sum + value,
      0
    ) / values.length
  );
}

function percentage(
  numerator,
  denominator
) {
  const top =
    safeNumber(numerator);

  const bottom =
    safeNumber(denominator);

  if (
    top === null ||
    bottom === null ||
    bottom <= 0
  ) {
    return null;
  }

  return Math.round(
    (top / bottom) * 100
  );
}

function uniqueBy(
  items = [],
  selector
) {
  const seen =
    new Set();

  const result = [];

  safeArray(items)
    .forEach((item) => {
      const value =
        selector(item);

      if (!value) return;

      if (
        seen.has(value)
      ) {
        return;
      }

      seen.add(value);

      result.push(item);
    });

  return result;
}

function personKey(item) {
  return (
    item?.user_id ||
    item?.profile_key ||
    item?.membership_id ||
    item?.employee_id ||
    item?.email ||
    null
  );
}

function assessmentPersonKey(
  item
) {
  return (
    item?.user_id ||
    item?.profile_key ||
    item?.membership_id ||
    item?.employee_id ||
    item?.email ||
    null
  );
}

function dateAscending(
  a,
  b
) {
  const first =
    safeDate(
      a?.created_at
    )?.getTime() || 0;

  const second =
    safeDate(
      b?.created_at
    )?.getTime() || 0;

  return first - second;
}

function dateDescending(
  a,
  b
) {
  return dateAscending(
    b,
    a
  );
}

function buildParticipantHistory(
  assessments = []
) {
  const grouped = {};

  safeArray(assessments)
    .slice()
    .sort(dateAscending)
    .forEach((assessment) => {
      const key =
        assessmentPersonKey(
          assessment
        );

      if (!key) {
        return;
      }

      if (!grouped[key]) {
        grouped[key] = [];
      }

      grouped[key].push(
        assessment
      );
    });

  return grouped;
}

function buildParticipation({
  members = [],
  assessments = [],
  organisation = null,
  snapshot = null,
} = {}) {
  const employeeMembers =
    safeArray(members)
      .filter(
        (member) =>
          member?.role ===
          "employee"
      );

  const knownEmployeeCount =
    employeeMembers.length;

  const workforceSize =
    safeNumber(
      organisation
        ?.workforce_size
    );

  const denominator =
    workforceSize ||
    knownEmployeeCount ||
    null;

  const histories =
    buildParticipantHistory(
      assessments
    );

  const participantKeys =
    Object.keys(
      histories
    );

  const baselineParticipantKeys =
    participantKeys.filter(
      (key) =>
        histories[key]
          .some(
            (assessment) =>
              String(
                assessment
                  ?.assessment_type ||
                  ""
              ).toLowerCase() ===
              "baseline"
          )
    );

  /*
   * Some older Root records may not
   * have assessment_type populated.
   * In that case, a person's first
   * assessment still establishes
   * their starting position.
   */

  const inferredBaselineKeys =
    participantKeys.filter(
      (key) =>
        histories[key].length >
        0
    );

  const baselineKeys =
    baselineParticipantKeys
      .length
      ? baselineParticipantKeys
      : inferredBaselineKeys;

  const repeatKeys =
    participantKeys.filter(
      (key) =>
        histories[key].length >=
        2
    );

  const followUpKeys =
    participantKeys.filter(
      (key) =>
        histories[key]
          .some(
            (assessment) =>
              String(
                assessment
                  ?.assessment_type ||
                  ""
              ).toLowerCase() !==
              "baseline"
          )
    );

  const latestParticipantKeys =
    followUpKeys.length
      ? followUpKeys
      : repeatKeys;

  const baselineParticipants =
    baselineKeys.length;

  const followUpParticipants =
    latestParticipantKeys
      .length;

  const repeatParticipants =
    repeatKeys.length;

  const missingFollowUps =
    Math.max(
      0,
      baselineParticipants -
        repeatParticipants
    );

  const baselineParticipationRate =
    percentage(
      baselineParticipants,
      denominator
    );

  const followUpParticipationRate =
    percentage(
      followUpParticipants,
      denominator
    );

  const repeatRateFromBaseline =
    percentage(
      repeatParticipants,
      baselineParticipants
    );

  const snapshotBaseline =
    safeNumber(
      snapshot
        ?.baselineCompleted
    );

  return {
    workforceDenominator:
      denominator,

    workforceDenominatorSource:
      workforceSize
        ? "organisation_workforce_size"
        : knownEmployeeCount
        ? "known_employee_members"
        : "unknown",

    knownEmployeeCount,

    baselineParticipants:
      snapshotBaseline !==
        null &&
      snapshotBaseline >
        baselineParticipants
        ? snapshotBaseline
        : baselineParticipants,

    followUpParticipants,

    repeatParticipants,

    missingFollowUps,

    baselineParticipationRate,

    followUpParticipationRate,

    repeatRateFromBaseline,

    totalAssessmentRecords:
      safeArray(
        assessments
      ).length,

    peopleWithAnyAssessment:
      participantKeys.length,

    participationInterpretation:
      buildParticipationInterpretation(
        {
          denominator,
          baselineParticipants:
            snapshotBaseline !==
              null &&
            snapshotBaseline >
              baselineParticipants
              ? snapshotBaseline
              : baselineParticipants,
          followUpParticipants,
          repeatParticipants,
          missingFollowUps,
          repeatRateFromBaseline,
        }
      ),
  };
}

function buildParticipationInterpretation({
  denominator,
  baselineParticipants,
  followUpParticipants,
  repeatParticipants,
  missingFollowUps,
  repeatRateFromBaseline,
}) {
  if (
    !baselineParticipants
  ) {
    return {
      status: "insufficient",
      headline:
        "Root does not yet have an employee baseline.",
      meaning:
        "No organisation-wide outcome should be claimed until a starting position has been established.",
    };
  }

  if (
    repeatParticipants === 0
  ) {
    return {
      status: "baseline_only",
      headline:
        `${baselineParticipants} employee${
          baselineParticipants ===
          1
            ? ""
            : "s"
        } established a starting position, but Root has no repeat assessment evidence yet.`,
      meaning:
        "The organisation has a baseline, not evidence of change.",
    };
  }

  if (
    repeatRateFromBaseline !==
      null &&
    repeatRateFromBaseline <
      40
  ) {
    return {
      status:
        "low_repeat_participation",

      headline:
        `${repeatParticipants} of ${baselineParticipants} baseline participants have repeat evidence.`,

      meaning:
        `The direction among repeat participants may be useful, but ${missingFollowUps} original participants are not yet represented in the longitudinal comparison. Root should lower confidence rather than interpret the missing follow-up evidence as success or failure.`,
    };
  }

  if (
    repeatRateFromBaseline !==
      null &&
    repeatRateFromBaseline <
      70
  ) {
    return {
      status:
        "developing_repeat_participation",

      headline:
        `${repeatParticipants} of ${baselineParticipants} baseline participants currently contribute repeat evidence.`,

      meaning:
        "Root can begin interpreting direction of travel, but stronger repeat participation would make organisation-wide conclusions more defensible.",
    };
  }

  return {
    status:
      "stronger_repeat_participation",

    headline:
      `${repeatParticipants} of ${baselineParticipants} baseline participants currently contribute repeat evidence.`,

    meaning:
      denominator
        ? "Repeat participation is strong enough to support a more useful longitudinal interpretation, subject to the wider evidence and organisational context."
        : "Repeat participation is relatively strong, although Root still lacks a reliable workforce denominator for an organisation-wide participation rate.",
  };
}

function buildMetricEvidence(
  assessments = []
) {
  const histories =
    buildParticipantHistory(
      assessments
    );

  const participantKeys =
    Object.keys(
      histories
    );

  return SCORE_FIELDS.map(
    (field) => {
      const allAverage =
        average(
          assessments,
          field.key
        );

      const highConcernCount =
        safeArray(
          assessments
        ).filter(
          (item) => {
            const score =
              safeNumber(
                item?.[
                  field.key
                ]
              );

            return (
              score !== null &&
              score >= 7
            );
          }
        ).length;

      const repeatChanges =
        [];

      participantKeys
        .forEach((key) => {
          const history =
            histories[key];

          if (
            history.length < 2
          ) {
            return;
          }

          const first =
            safeNumber(
              history[0]?.[
                field.key
              ]
            );

          const last =
            safeNumber(
              history[
                history.length -
                  1
              ]?.[
                field.key
              ]
            );

          if (
            first === null ||
            last === null
          ) {
            return;
          }

          repeatChanges.push({
            first,
            last,
            change:
              last - first,
          });
        });

      const repeatCount =
        repeatChanges.length;

      const improvedCount =
        repeatChanges.filter(
          (item) =>
            item.change < 0
        ).length;

      const worsenedCount =
        repeatChanges.filter(
          (item) =>
            item.change > 0
        ).length;

      const unchangedCount =
        repeatChanges.filter(
          (item) =>
            item.change === 0
        ).length;

      const averageRepeatStart =
        repeatCount
          ? repeatChanges.reduce(
              (
                sum,
                item
              ) =>
                sum +
                item.first,
              0
            ) / repeatCount
          : null;

      const averageRepeatCurrent =
        repeatCount
          ? repeatChanges.reduce(
              (
                sum,
                item
              ) =>
                sum +
                item.last,
              0
            ) / repeatCount
          : null;

      const repeatMovement =
        averageRepeatStart !==
          null &&
        averageRepeatCurrent !==
          null
          ? averageRepeatCurrent -
            averageRepeatStart
          : null;

      return {
        id:
          field.id,

        label:
          field.label,

        overallAverage:
          round1(
            allAverage
          ),

        highConcernCount,

        highConcernRate:
          percentage(
            highConcernCount,
            safeArray(
              assessments
            ).length
          ),

        repeatCount,

        repeatImproved:
          improvedCount,

        repeatWorsened:
          worsenedCount,

        repeatUnchanged:
          unchangedCount,

        repeatImprovedRate:
          percentage(
            improvedCount,
            repeatCount
          ),

        repeatWorsenedRate:
          percentage(
            worsenedCount,
            repeatCount
          ),

        repeatStartAverage:
          round1(
            averageRepeatStart
          ),

        repeatCurrentAverage:
          round1(
            averageRepeatCurrent
          ),

        repeatMovement:
          round1(
            repeatMovement
          ),

        direction:
          repeatMovement ===
          null
            ? "unknown"
            : repeatMovement <
              -0.25
            ? "improving"
            : repeatMovement >
              0.25
            ? "worsening"
            : "stable",
      };
    }
  );
}

function buildEngagement({
  members = [],
  mindEntries = [],
  journalEntries = [],
  voiceSessions = [],
} = {}) {
  const employees =
    safeArray(members)
      .filter(
        (member) =>
          member?.role ===
          "employee"
      );

  const sources = [
    ...safeArray(
      mindEntries
    ),
    ...safeArray(
      journalEntries
    ),
    ...safeArray(
      voiceSessions
    ),
  ];

  const activePeople =
    uniqueBy(
      sources,
      personKey
    );

  return {
    knownEmployees:
      employees.length,

    mindInteractions:
      safeArray(
        mindEntries
      ).length,

    journalInteractions:
      safeArray(
        journalEntries
      ).length,

    voiceInteractions:
      safeArray(
        voiceSessions
      ).length,

    supportInteractions:
      sources.length,

    knownPeopleUsingSupport:
      activePeople.length,

    supportReachRate:
      percentage(
        activePeople.length,
        employees.length
      ),
  };
}

function buildOrganisationLearning(
  reviews = []
) {
  const ordered =
    safeArray(reviews)
      .slice()
      .sort(
        dateDescending
      );

  const latest =
    ordered[0] ||
    null;

  const previous =
    ordered[1] ||
    null;

  const latestDate =
    safeDate(
      latest?.created_at
    );

  const ageDays =
    latestDate
      ? Math.max(
          0,
          Math.floor(
            (Date.now() -
              latestDate.getTime()) /
              DAY_IN_MS
          )
        )
      : null;

  return {
    reviewCount:
      ordered.length,

    latestReview:
      latest,

    previousReview:
      previous,

    latestReviewAgeDays:
      ageDays,

    hasCurrentContext:
      ageDays !== null &&
      ageDays <= 14,
  };
}

function buildLikelyQuestions({
  participation,
  metrics,
  snapshot,
  organisationLearning,
}) {
  const questions = [];

  const repeatRate =
    participation
      ?.repeatRateFromBaseline;

  if (
    repeatRate !== null &&
    repeatRate < 70
  ) {
    questions.push({
      key:
        "participation",

      priority:
        repeatRate < 40
          ? 100
          : 85,

      question:
        "Are enough employees represented in the follow-up evidence?",

      why:
        `${participation.repeatParticipants} of ${participation.baselineParticipants} baseline participants currently have repeat evidence.`,

      evidenceNeeded:
        "Repeat participation, original baseline size and whether longitudinal responders show a consistent direction.",
    });
  }

  const stableMetric =
    safeArray(metrics)
      .find(
        (metric) =>
          metric.direction ===
          "stable" &&
          metric.repeatCount >
            0
      );

  if (stableMetric) {
    questions.push({
      key:
        "headline_unchanged",

      priority: 82,

      question:
        `Why has ${stableMetric.label.toLowerCase()} not moved more?`,

      why:
        `${stableMetric.repeatCount} repeat participants currently contribute to the longitudinal ${stableMetric.label.toLowerCase()} comparison.`,

      evidenceNeeded:
        "Repeat responder movement, participation changes and whether the compared populations are equivalent.",
    });
  }

  const worsening =
    safeArray(metrics)
      .filter(
        (metric) =>
          metric.direction ===
          "worsening"
      )
      .sort(
        (a, b) =>
          (b.repeatMovement ||
            0) -
          (a.repeatMovement ||
            0)
      )[0];

  if (worsening) {
    questions.push({
      key:
        "worsening_metric",

      priority: 95,

      question:
        `Why is ${worsening.label.toLowerCase()} getting worse?`,

      why:
        `${worsening.label} has worsened by ${Math.abs(
          worsening.repeatMovement
        ).toFixed(
          1
        )} points among current repeat participants.`,

      evidenceNeeded:
        "Organisation context, timing, interventions and whether other indicators moved in the same direction.",
    });
  }

  if (
    organisationLearning
      ?.reviewCount === 0
  ) {
    questions.push({
      key:
        "missing_context",

      priority: 75,

      question:
        "Could something else happening in the business explain these results?",

      why:
        "Root does not yet have a completed Organisation Learning Review for this period.",

      evidenceNeeded:
        "Business events, workload changes, leadership changes, seasonal effects and interventions.",
    });
  }

  if (
    snapshot
      ?.confidenceLabel &&
    String(
      snapshot
        .confidenceLabel
    ).toLowerCase() !==
      "high"
  ) {
    questions.push({
      key:
        "confidence",

      priority: 80,

      question:
        "How confident should we actually be in these conclusions?",

      why:
        `Root currently describes evidence confidence as ${snapshot.confidenceLabel}.`,

      evidenceNeeded:
        "Participation, repeated evidence, business context and consistency across evidence sources.",
    });
  }

  return questions
    .sort(
      (a, b) =>
        b.priority -
        a.priority
    )
    .slice(0, 6);
}

function buildEvidenceWarnings({
  participation,
  organisationLearning,
  metrics,
  snapshot,
}) {
  const warnings = [];

  if (
    participation
      ?.workforceDenominatorSource ===
      "unknown"
  ) {
    warnings.push({
      key:
        "missing_workforce_denominator",

      severity:
        "high",

      text:
        "Root does not have a reliable workforce denominator, so organisation-wide participation percentages should not be presented as precise.",
    });
  }

  if (
    participation
      ?.repeatParticipants ===
      0 &&
    participation
      ?.baselineParticipants >
      0
  ) {
    warnings.push({
      key:
        "no_repeat_evidence",

      severity:
        "high",

      text:
        "Root has baseline evidence but no repeat participant evidence. Change over time cannot yet be claimed.",
    });
  }

  if (
    participation
      ?.repeatRateFromBaseline !==
      null &&
    participation
      .repeatRateFromBaseline <
      40
  ) {
    warnings.push({
      key:
        "low_repeat_rate",

      severity:
        "high",

      text:
        `Only ${participation.repeatParticipants} of ${participation.baselineParticipants} baseline participants currently contribute repeat evidence. Any organisation-wide change claim should remain cautious.`,
    });
  }

  if (
    organisationLearning
      ?.latestReviewAgeDays !==
      null &&
    organisationLearning
      .latestReviewAgeDays >
      30
  ) {
    warnings.push({
      key:
        "stale_business_context",

      severity:
        "medium",

      text:
        `The latest Organisation Learning Review is ${organisationLearning.latestReviewAgeDays} days old. Recent business context may be missing from the interpretation.`,
    });
  }

  const conflictingMetrics =
    safeArray(metrics)
      .filter(
        (metric) =>
          metric.direction ===
            "improving" ||
          metric.direction ===
            "worsening"
      );

  const hasImprovement =
    conflictingMetrics
      .some(
        (metric) =>
          metric.direction ===
          "improving"
      );

  const hasWorsening =
    conflictingMetrics
      .some(
        (metric) =>
          metric.direction ===
          "worsening"
      );

  if (
    hasImprovement &&
    hasWorsening
  ) {
    warnings.push({
      key:
        "mixed_direction",

      severity:
        "medium",

      text:
        "Some wellbeing indicators are improving while others are worsening. A single organisation-wide success or failure headline would oversimplify the current evidence.",
    });
  }

  if (
    snapshot
      ?.confidenceLabel &&
    [
      "low",
      "emerging",
      "developing",
    ].includes(
      String(
        snapshot
          .confidenceLabel
      ).toLowerCase()
    )
  ) {
    warnings.push({
      key:
        "confidence_limit",

      severity:
        "medium",

      text:
        `Root currently describes the evidence confidence as ${snapshot.confidenceLabel}. The meeting should distinguish measured facts from emerging interpretation.`,
    });
  }

  return warnings;
}

function buildCommercialOpportunities({
  participation,
  engagement,
  snapshot,
  organisationLearning,
}) {
  const opportunities = [];

  if (
    participation
      ?.repeatRateFromBaseline !==
      null &&
    participation
      .repeatRateFromBaseline <
      70
  ) {
    opportunities.push({
      key:
        "reengagement",

      title:
        "Strengthen repeat participation",

      reason:
        `Only ${participation.repeatParticipants} of ${participation.baselineParticipants} baseline participants currently contribute repeat evidence.`,

      possibleResponse:
        "Employee re-engagement or a short 'getting more from Root' session may help the organisation strengthen the next evidence period.",

      evidenceBasis:
        "participation",
    });
  }

  if (
    engagement
      ?.knownEmployees >
      0 &&
    engagement
      ?.supportReachRate !==
      null &&
    engagement
      .supportReachRate <
      50
  ) {
    opportunities.push({
      key:
        "support_awareness",

      title:
        "Increase awareness of Root support",

      reason:
        `Root can currently identify support activity from approximately ${engagement.supportReachRate}% of known employee members.`,

      possibleResponse:
        "A practical employee introduction may help employees understand when and how to use Root.",

      evidenceBasis:
        "support_engagement",
    });
  }

  if (
    organisationLearning
      ?.reviewCount === 0
  ) {
    opportunities.push({
      key:
        "executive_context",

      title:
        "Add current business context",

      reason:
        "The workforce evidence does not yet have a completed Organisation Learning Review alongside it.",

      possibleResponse:
        "Complete Organisation Learning before making stronger claims about what may be influencing the workforce picture.",

      evidenceBasis:
        "organisation_context",
    });
  }

  if (
    snapshot
      ?.primaryConcern &&
    snapshot
      .primaryConcern !==
      "No challenge data yet"
  ) {
    opportunities.push({
      key:
        "targeted_intervention",

      title:
        `Explore ${snapshot.primaryConcern}`,

      reason:
        `${snapshot.primaryConcern} is currently Root's strongest measured organisational concern.`,

      possibleResponse:
        snapshot
          ?.initiative
          ?.title
          ? `Root has already identified ${snapshot.initiative.title} as a proportionate response worth considering.`
          : "Root can help identify a proportionate intervention once the evidence and organisational context are reviewed together.",

      evidenceBasis:
        "current_priority",
    });
  }

  return opportunities;
}

function buildExecutiveHeadline({
  participation,
  metrics,
  snapshot,
}) {
  const improving =
    safeArray(metrics)
      .filter(
        (metric) =>
          metric.direction ===
          "improving"
      );

  const worsening =
    safeArray(metrics)
      .filter(
        (metric) =>
          metric.direction ===
          "worsening"
      );

  if (
    participation
      ?.baselineParticipants ===
      0
  ) {
    return {
      tone:
        "insufficient",

      headline:
        "Root does not yet have enough evidence for an executive outcome conversation.",

      detail:
        "A workforce baseline needs to be established before success, failure or movement can be interpreted responsibly.",
    };
  }

  if (
    participation
      ?.repeatParticipants ===
      0
  ) {
    return {
      tone:
        "baseline",

      headline:
        "Root has established a starting position, but not evidence of change.",

      detail:
        `${participation.baselineParticipants} baseline participants are represented, but no repeat participant evidence is currently available.`,
    };
  }

  if (
    improving.length >
      0 &&
    worsening.length >
      0
  ) {
    return {
      tone:
        "mixed",

      headline:
        "The organisation picture is mixed rather than simply positive or negative.",

      detail:
        `${improving
          .map(
            (item) =>
              item.label
          )
          .join(
            ", "
          )} ${
          improving.length ===
          1
            ? "is"
            : "are"
        } improving among repeat participants, while ${worsening
          .map(
            (item) =>
              item.label
          )
          .join(
            ", "
          )} ${
          worsening.length ===
          1
            ? "is"
            : "are"
        } moving in the opposite direction.`,
    };
  }

  if (
    improving.length > 0
  ) {
    return {
      tone:
        "positive",

      headline:
        "Repeat-participant evidence is showing a more positive direction.",

      detail:
        `The strongest improving areas currently include ${improving
          .slice(0, 3)
          .map(
            (item) =>
              item.label
          )
          .join(
            ", "
          )}. Root should still apply the current evidence confidence before extending this conclusion to the whole workforce.`,
    };
  }

  if (
    worsening.length > 0
  ) {
    return {
      tone:
        "watch",

      headline:
        "Current repeat evidence contains areas that need attention.",

      detail:
        `The strongest worsening areas currently include ${worsening
          .slice(0, 3)
          .map(
            (item) =>
              item.label
          )
          .join(
            ", "
          )}. Root should examine participation and business context before deciding why.`,
    };
  }

  return {
    tone:
      "developing",

    headline:
      snapshot
        ?.executiveStatus ||
      "Root is still developing the executive picture.",

    detail:
      "The available evidence does not yet support a stronger success or failure conclusion.",
  };
}

export function buildRootExecutiveMeetingContext({
  organisation = null,
  members = [],
  assessments = [],
  mindEntries = [],
  journalEntries = [],
  voiceSessions = [],
  organisationReviews = [],
  snapshot = null,
  trialStatus = null,
} = {}) {
  const participation =
    buildParticipation({
      organisation,
      members,
      assessments,
      snapshot,
    });

  const wellbeing =
    buildMetricEvidence(
      assessments
    );

  const engagement =
    buildEngagement({
      members,
      mindEntries,
      journalEntries,
      voiceSessions,
    });

  const organisationLearning =
    buildOrganisationLearning(
      organisationReviews
    );

  const likelyQuestions =
    buildLikelyQuestions({
      participation,
      metrics:
        wellbeing,
      snapshot,
      organisationLearning,
    });

  const evidenceWarnings =
    buildEvidenceWarnings({
      participation,
      organisationLearning,
      metrics:
        wellbeing,
      snapshot,
    });

  const commercialOpportunities =
    buildCommercialOpportunities({
      participation,
      engagement,
      snapshot,
      organisationLearning,
    });

  const executiveHeadline =
    buildExecutiveHeadline({
      participation,
      metrics:
        wellbeing,
      snapshot,
    });

  const strongestImprovement =
    wellbeing
      .filter(
        (metric) =>
          metric.direction ===
          "improving"
      )
      .sort(
        (a, b) =>
          (a.repeatMovement ||
            0) -
          (b.repeatMovement ||
            0)
      )[0] || null;

  const strongestDeterioration =
    wellbeing
      .filter(
        (metric) =>
          metric.direction ===
          "worsening"
      )
      .sort(
        (a, b) =>
          (b.repeatMovement ||
            0) -
          (a.repeatMovement ||
            0)
      )[0] || null;

  return {
    generatedAt:
      new Date()
        .toISOString(),

    organisation: {
      id:
        organisation?.id ||
        null,

      name:
        organisation?.name ||
        "Unknown organisation",

      workforceSize:
        safeNumber(
          organisation
            ?.workforce_size
        ),

      subscriptionStatus:
        organisation
          ?.subscription_status ||
        null,

      subscriptionActive:
        organisation
          ?.subscription_active ===
        true,

      trialStart:
        organisation
          ?.trial_start ||
        null,

      trialEnd:
        organisation
          ?.trial_end ||
        null,
    },

    commercial: {
      trial:
        trialStatus ||
        null,

      subscriptionStatus:
        organisation
          ?.subscription_status ||
        null,

      subscriptionActive:
        organisation
          ?.subscription_active ===
        true,

      stripeCustomerId:
        organisation
          ?.stripe_customer_id ||
        null,

      stripeSubscriptionId:
        organisation
          ?.stripe_subscription_id ||
        null,
    },

    participation,

    wellbeing: {
      metrics:
        wellbeing,

      strongestImprovement,

      strongestDeterioration,
    },

    engagement,

    organisationLearning,

    rootIntelligence: {
      confidenceScore:
        snapshot
          ?.confidenceScore ??
        null,

      confidenceLabel:
        snapshot
          ?.confidenceLabel ||
        "Developing",

      primaryConcern:
        snapshot
          ?.primaryConcern ||
        null,

      recommendedFocus:
        snapshot
          ?.recommendedFocus ||
        null,

      mostImproved:
        snapshot
          ?.mostImproved ||
        null,

      highRiskMetric:
        snapshot
          ?.highRiskMetric ||
        null,

      mostCommonTheme:
        snapshot
          ?.mostCommonTheme ||
        null,

      rootHypothesis:
        snapshot
          ?.rootHypothesis ||
        null,

      nextReviewFocus:
        snapshot
          ?.nextReviewFocus ||
        null,

      executiveQuestions:
        safeArray(
          snapshot
            ?.executiveQuestions
        ),

      confidenceReasons:
        safeArray(
          snapshot
            ?.confidenceReasons
        ),

      executiveEvidence:
        snapshot
          ?.executiveEvidence ||
        null,

      boardCase:
        snapshot
          ?.boardCase ||
        null,

      initiative:
        snapshot
          ?.initiative ||
        null,
    },

    meetingIntelligence: {
      executiveHeadline,

      likelyQuestions,

      evidenceWarnings,

      commercialOpportunities,

      strongestDefensiblePositive:
        strongestImprovement
          ? `${strongestImprovement.label} is currently showing the strongest positive longitudinal movement among repeat participants.`
          : "Root does not yet have a strong repeat-participant improvement signal.",

      strongestDefensibleConcern:
        strongestDeterioration
          ? `${strongestDeterioration.label} is currently showing the strongest negative longitudinal movement among repeat participants.`
          : snapshot
              ?.primaryConcern ||
            "No single worsening longitudinal signal currently dominates the evidence.",

      caution:
        participation
          ?.participationInterpretation
          ?.meaning ||
        "Interpret the available evidence according to its current confidence.",
    },

    rawCounts: {
      members:
        safeArray(
          members
        ).length,

      assessments:
        safeArray(
          assessments
        ).length,

      mindEntries:
        safeArray(
          mindEntries
        ).length,

      journalEntries:
        safeArray(
          journalEntries
        ).length,

      voiceSessions:
        safeArray(
          voiceSessions
        ).length,

      organisationReviews:
        safeArray(
          organisationReviews
        ).length,
    },
  };
}
