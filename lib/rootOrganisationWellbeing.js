const DIMENSION_DEFINITIONS = [
  {
    key: "stress",
    label: "Stress",
    keys: [
      "stress",
      "stress_score",
      "stress_level",
    ],
  },
  {
    key: "sleep",
    label: "Sleep difficulties",
    keys: [
      "sleep",
      "sleep_score",
      "sleep_difficulties",
    ],
  },
  {
    key: "recovery",
    label: "Recovery difficulty",
    keys: [
      "recovery",
      "recovery_score",
      "recovery_difficulty",
    ],
  },
  {
    key: "energy",
    label: "Energy difficulty",
    keys: [
      "energy",
      "energy_score",
      "energy_difficulty",
    ],
  },
  {
    key: "mood",
    label: "Mood difficulty",
    keys: [
      "mood",
      "mood_score",
      "mood_difficulty",
    ],
  },
  {
    key: "focus",
    label: "Focus difficulty",
    keys: [
      "focus",
      "focus_score",
      "focus_difficulty",
    ],
  },
  {
    key: "burnout",
    label: "Burnout",
    keys: [
      "burnout",
      "burnout_score",
      "burnout_level",
    ],
  },
];

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeNumber(value) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
}

function safeText(value, fallback = "") {
  const text = String(value ?? "").trim();

  return text || fallback;
}

function uniqueValues(values = []) {
  return [
    ...new Set(
      safeArray(values)
        .map((value) =>
          String(value ?? "").trim()
        )
        .filter(Boolean)
    ),
  ];
}

function round(value, decimalPlaces = 1) {
  if (!Number.isFinite(value)) {
    return null;
  }

  const multiplier =
    10 ** decimalPlaces;

  return (
    Math.round(value * multiplier) /
    multiplier
  );
}

function average(values = []) {
  const numbers = safeArray(values)
    .map((value) => safeNumber(value))
    .filter((value) => value !== null);

  if (numbers.length === 0) {
    return null;
  }

  return (
    numbers.reduce(
      (total, value) => total + value,
      0
    ) / numbers.length
  );
}

function parseDate(value) {
  if (!value) {
    return null;
  }

  if (
    value instanceof Date &&
    !Number.isNaN(value.getTime())
  ) {
    return value;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

function getRecordDate(record) {
  return parseDate(
    record?.created_at ||
      record?.completed_at ||
      record?.assessment_date ||
      record?.updated_at
  );
}

function getParticipantIdentifier(record) {
  return safeText(
    record?.user_id ||
      record?.profile_key ||
      record?.member_id ||
      record?.profile_id
  );
}

function getAssessmentValue(
  assessment,
  possibleKeys = []
) {
  for (const key of possibleKeys) {
    const value = safeNumber(
      assessment?.[key]
    );

    if (value !== null) {
      return value;
    }
  }

  return null;
}

function getOrganisationName(organisation) {
  return safeText(
    organisation?.name ||
      organisation?.organisation_name,
    "Unknown organisation"
  );
}

function parseOrganisationSize(
  organisation,
  memberCount
) {
  const directCandidates = [
    organisation?.employee_count,
    organisation?.member_count,
    organisation?.workforce_size,
    organisation?.number_of_employees,
  ];

  for (const candidate of directCandidates) {
    const number = safeNumber(candidate);

    if (number !== null && number > 0) {
      return {
        minimum: number,
        maximum: number,
        estimated: number,
        source: "organisation record",
        raw: candidate,
      };
    }
  }

  const rawSize = safeText(
    organisation?.size ||
      organisation?.organisation_size
  );

  if (rawSize) {
    const numbers = rawSize
      .replace(/,/g, "")
      .match(/\d+/g)
      ?.map(Number)
      .filter(Number.isFinite);

    if (numbers?.length === 1) {
      return {
        minimum: numbers[0],
        maximum: numbers[0],
        estimated: numbers[0],
        source: "organisation size label",
        raw: rawSize,
      };
    }

    if (numbers?.length >= 2) {
      const minimum = Math.min(
        numbers[0],
        numbers[1]
      );

      const maximum = Math.max(
        numbers[0],
        numbers[1]
      );

      return {
        minimum,
        maximum,
        estimated:
          (minimum + maximum) / 2,
        source: "organisation size range",
        raw: rawSize,
      };
    }
  }

  if (memberCount > 0) {
    return {
      minimum: memberCount,
      maximum: memberCount,
      estimated: memberCount,
      source: "recorded membership",
      raw: memberCount,
    };
  }

  return {
    minimum: null,
    maximum: null,
    estimated: null,
    source: "not available",
    raw: null,
  };
}

function buildAssessmentWindow(
  assessments
) {
  const dates = safeArray(assessments)
    .map(getRecordDate)
    .filter(Boolean)
    .sort(
      (first, second) =>
        first.getTime() -
        second.getTime()
    );

  if (dates.length === 0) {
    return {
      first: null,
      last: null,
      days: null,
    };
  }

  const first = dates[0];
  const last = dates[dates.length - 1];

  const difference =
    last.getTime() - first.getTime();

  return {
    first: first.toISOString(),
    last: last.toISOString(),
    days:
      Math.floor(
        difference / 86400000
      ) + 1,
  };
}

function buildDimensionObservations(
  assessments
) {
  const records = safeArray(assessments);

  return DIMENSION_DEFINITIONS.map(
    (definition) => {
      const values = records
        .map((assessment) =>
          getAssessmentValue(
            assessment,
            definition.keys
          )
        )
        .filter((value) => value !== null);

      if (values.length === 0) {
        return {
          key: definition.key,
          label: definition.label,
          average: null,
          minimum: null,
          maximum: null,
          responses: 0,
          highScores: 0,
          highScoreRate: null,
          severeScores: 0,
          severeScoreRate: null,
          available: false,
        };
      }

      const highScores = values.filter(
        (value) => value >= 7
      ).length;

      const severeScores = values.filter(
        (value) => value >= 9
      ).length;

      return {
        key: definition.key,
        label: definition.label,

        average: round(
          average(values),
          1
        ),

        minimum: Math.min(...values),
        maximum: Math.max(...values),

        responses: values.length,

        highScores,

        highScoreRate: round(
          (highScores / values.length) *
            100,
          1
        ),

        severeScores,

        severeScoreRate: round(
          (severeScores / values.length) *
            100,
          1
        ),

        available: true,
      };
    }
  );
}

function buildParticipantHistory(
  assessments
) {
  const participantRecords = new Map();

  safeArray(assessments).forEach(
    (assessment) => {
      const participantId =
        getParticipantIdentifier(
          assessment
        );

      const date =
        getRecordDate(assessment);

      if (!participantId || !date) {
        return;
      }

      if (
        !participantRecords.has(
          participantId
        )
      ) {
        participantRecords.set(
          participantId,
          []
        );
      }

      participantRecords
        .get(participantId)
        .push({
          assessment,
          date,
        });
    }
  );

  participantRecords.forEach(
    (records) => {
      records.sort(
        (first, second) =>
          first.date.getTime() -
          second.date.getTime()
      );
    }
  );

  return participantRecords;
}

function buildLongitudinalEvidence(
  assessments
) {
  const participantHistory =
    buildParticipantHistory(assessments);

  const repeatParticipants = [
    ...participantHistory.values(),
  ].filter(
    (records) => records.length >= 2
  );

  const dimensions =
    DIMENSION_DEFINITIONS.map(
      (definition) => {
        const changes = [];

        repeatParticipants.forEach(
          (records) => {
            const firstAssessment =
              records[0]?.assessment;

            const lastAssessment =
              records[
                records.length - 1
              ]?.assessment;

            const firstValue =
              getAssessmentValue(
                firstAssessment,
                definition.keys
              );

            const lastValue =
              getAssessmentValue(
                lastAssessment,
                definition.keys
              );

            if (
              firstValue === null ||
              lastValue === null
            ) {
              return;
            }

            changes.push(
              lastValue - firstValue
            );
          }
        );

        if (changes.length === 0) {
          return {
            key: definition.key,
            label: definition.label,
            participants: 0,
            averageChange: null,
            improving: 0,
            worsening: 0,
            unchanged: 0,
            direction: "insufficient evidence",
          };
        }

        const improving =
          changes.filter(
            (change) => change < 0
          ).length;

        const worsening =
          changes.filter(
            (change) => change > 0
          ).length;

        const unchanged =
          changes.filter(
            (change) => change === 0
          ).length;

        let direction = "mixed";

        if (
          improving >
            worsening + unchanged &&
          improving >=
            changes.length * 0.6
        ) {
          direction = "improving";
        }

        if (
          worsening >
            improving + unchanged &&
          worsening >=
            changes.length * 0.6
        ) {
          direction = "worsening";
        }

        if (
          unchanged === changes.length
        ) {
          direction = "unchanged";
        }

        return {
          key: definition.key,
          label: definition.label,

          participants: changes.length,

          averageChange: round(
            average(changes),
            1
          ),

          improving,
          worsening,
          unchanged,
          direction,
        };
      }
    );

  return {
    identifiableParticipants:
      participantHistory.size,

    repeatParticipants:
      repeatParticipants.length,

    dimensions,
  };
}

function countDepartments(members) {
  return uniqueValues(
    safeArray(members).map(
      (member) =>
        member?.department ||
        member?.team ||
        member?.business_area ||
        member?.division
    )
  ).length;
}

function calculateParticipation({
  members,
  assessments,
  organisationSize,
}) {
  const assessmentRecords =
    safeArray(assessments);

  const identifiableParticipants =
    uniqueValues(
      assessmentRecords.map(
        getParticipantIdentifier
      )
    ).length;

  const participantCount =
    identifiableParticipants > 0
      ? identifiableParticipants
      : assessmentRecords.length;

  const denominator =
    organisationSize?.estimated ||
    safeArray(members).length ||
    null;

  const rate =
    denominator &&
    denominator > 0
      ? round(
          (participantCount /
            denominator) *
            100,
          1
        )
      : null;

  return {
    participantCount,
    identifiableParticipants,
    denominator,
    rate,

    denominatorSource:
      organisationSize?.estimated
        ? organisationSize.source
        : safeArray(members).length > 0
          ? "recorded membership"
          : "not available",

    participantCountMethod:
      identifiableParticipants > 0
        ? "unique identifiable participants"
        : "assessment record count",
  };
}

function participationConfidence(
  participation
) {
  const rate = participation?.rate;

  if (rate === null) {
    return {
      label: "Unknown",
      score: 0.2,
      reason:
        "The workforce denominator is not available, so participation cannot be calculated reliably.",
    };
  }

  if (rate >= 60) {
    return {
      label: "High",
      score: 0.9,
      reason:
        `${rate}% of the estimated workforce is represented in the assessment evidence.`,
    };
  }

  if (rate >= 30) {
    return {
      label: "Moderate",
      score: 0.68,
      reason:
        `${rate}% of the estimated workforce is represented, providing useful but incomplete coverage.`,
    };
  }

  if (rate >= 10) {
    return {
      label: "Low",
      score: 0.42,
      reason:
        `${rate}% of the estimated workforce is represented, so organisation-wide conclusions should remain cautious.`,
    };
  }

  return {
    label: "Very low",
    score: 0.22,
    reason:
      `Only ${rate}% of the estimated workforce is represented in the assessment evidence.`,
  };
}

function respondentConfidence({
  assessments,
  observations,
  longitudinal,
}) {
  const assessmentCount =
    safeArray(assessments).length;

  const availableDimensions =
    safeArray(observations).filter(
      (observation) =>
        observation.available
    ).length;

  const completeDimensionCoverage =
    availableDimensions >= 6;

  const repeatParticipants =
    longitudinal?.repeatParticipants || 0;

  let score = 0;

  if (assessmentCount >= 30) {
    score += 0.5;
  } else if (assessmentCount >= 15) {
    score += 0.4;
  } else if (assessmentCount >= 5) {
    score += 0.28;
  } else if (assessmentCount > 0) {
    score += 0.14;
  }

  if (completeDimensionCoverage) {
    score += 0.22;
  } else if (availableDimensions >= 3) {
    score += 0.12;
  }

  if (repeatParticipants >= 10) {
    score += 0.22;
  } else if (repeatParticipants >= 3) {
    score += 0.12;
  }

  score = Math.min(score, 1);

  if (score >= 0.76) {
    return {
      label: "High",
      score: round(score, 2),
      reason:
        "The responding sample contains substantial assessment coverage and repeat evidence.",
    };
  }

  if (score >= 0.48) {
    return {
      label: "Moderate",
      score: round(score, 2),
      reason:
        "The responding sample provides useful evidence, although its depth or longitudinal coverage remains incomplete.",
    };
  }

  if (score > 0) {
    return {
      label: "Low",
      score: round(score, 2),
      reason:
        "The responding sample is small or lacks sufficient repeat evidence for strong conclusions.",
    };
  }

  return {
    label: "None",
    score: 0,
    reason:
      "No usable wellbeing assessment evidence was supplied.",
  };
}

function qualitativeConfidence({
  mindEntries,
  journalEntries,
  voiceSessions,
}) {
  const mindCount =
    safeArray(mindEntries).length;

  const journalCount =
    safeArray(journalEntries).length;

  const voiceCount =
    safeArray(voiceSessions).length;

  const total =
    mindCount +
    journalCount +
    voiceCount;

  const sourceTypes = [
    mindCount,
    journalCount,
    voiceCount,
  ].filter((count) => count > 0).length;

  if (total >= 30 && sourceTypes >= 2) {
    return {
      label: "High",
      score: 0.85,
      reason:
        `${total} aggregated support interactions are available across ${sourceTypes} evidence sources.`,
    };
  }

  if (total >= 10) {
    return {
      label: "Moderate",
      score: 0.62,
      reason:
        `${total} aggregated support interactions provide some contextual evidence.`,
    };
  }

  if (total > 0) {
    return {
      label: "Low",
      score: 0.35,
      reason:
        `Only ${total} aggregated support interactions are currently available.`,
    };
  }

  return {
    label: "None",
    score: 0,
    reason:
      "No aggregated Mind, Journal or Voice Coach evidence is currently available.",
  };
}

function organisationConfidence({
  participation,
  respondents,
  assessmentCount,
}) {
  if (assessmentCount === 0) {
    return {
      label: "None",
      score: 0,
      reason:
        "No wellbeing assessments were supplied.",
    };
  }

  const score = round(
    participation.score * 0.7 +
      respondents.score * 0.3,
    2
  );

  if (
    participation.label === "High" &&
    respondents.label !== "Low"
  ) {
    return {
      label: "High",
      score,
      reason:
        "Participation is broad and the responding evidence has useful depth.",
    };
  }

  if (
    participation.label ===
      "Moderate" &&
    respondents.score >= 0.48
  ) {
    return {
      label: "Moderate",
      score,
      reason:
        "The evidence provides meaningful coverage, although it does not fully represent the organisation.",
    };
  }

  if (
    participation.label ===
      "Unknown"
  ) {
    return {
      label: "Low",
      score,
      reason:
        "Organisation-wide confidence is limited because participation cannot be calculated reliably.",
    };
  }

  return {
    label: "Low",
    score,
    reason:
      "The evidence may describe the responding employees, but it should not yet be generalised across the organisation.",
  };
}

function buildStrongestSignal(
  observations
) {
  const available = safeArray(
    observations
  ).filter(
    (observation) =>
      observation.available &&
      Number.isFinite(
        observation.average
      )
  );

  if (available.length === 0) {
    return null;
  }

  return [...available].sort(
    (first, second) => {
      if (
        second.average !== first.average
      ) {
        return (
          second.average -
          first.average
        );
      }

      return (
        second.highScoreRate -
        first.highScoreRate
      );
    }
  )[0];
}

function buildObservedEvidence(
  observations
) {
  const evidence = [];

  safeArray(observations)
    .filter(
      (observation) =>
        observation.available
    )
    .forEach((observation) => {
      evidence.push({
        type: "assessment_dimension",

        dimension:
          observation.label,

        statement:
          `${observation.label} averaged ${observation.average}/10 across ${observation.responses} responses; ${observation.highScores} of ${observation.responses} responses were 7 or above.`,

        average:
          observation.average,

        responses:
          observation.responses,

        highScores:
          observation.highScores,

        highScoreRate:
          observation.highScoreRate,
      });
    });

  return evidence;
}

function buildContradictions({
  observations,
  longitudinal,
}) {
  const contradictions = [];

  const longitudinalDimensions =
    safeArray(
      longitudinal?.dimensions
    ).filter(
      (dimension) =>
        dimension.participants >= 3 &&
        [
          "improving",
          "worsening",
        ].includes(
          dimension.direction
        )
    );

  const improving =
    longitudinalDimensions.filter(
      (dimension) =>
        dimension.direction ===
        "improving"
    );

  const worsening =
    longitudinalDimensions.filter(
      (dimension) =>
        dimension.direction ===
        "worsening"
    );

  if (
    improving.length > 0 &&
    worsening.length > 0
  ) {
    contradictions.push({
      type: "mixed_longitudinal_pattern",

      statement:
        `${improving
          .map(
            (dimension) =>
              dimension.label
          )
          .join(", ")} ${
          improving.length === 1
            ? "is"
            : "are"
        } improving while ${worsening
          .map(
            (dimension) =>
              dimension.label
          )
          .join(", ")} ${
          worsening.length === 1
            ? "is"
            : "are"
        } worsening.`,

      caution:
        "The wellbeing picture is mixed and should not be reduced to a single improving or worsening headline.",
    });
  }

  safeArray(observations)
    .filter(
      (observation) =>
        observation.available &&
        observation.responses >= 5
    )
    .forEach((observation) => {
      if (
        observation.average < 5 &&
        observation.highScoreRate >= 25
      ) {
        contradictions.push({
          type:
            "average_masks_high_scores",

          dimension:
            observation.label,

          statement:
            `${observation.label} has an average below 5/10, but ${observation.highScores} of ${observation.responses} responses were 7 or above.`,

          caution:
            "The average may conceal a smaller group reporting meaningful difficulty.",
        });
      }
    });

  return contradictions;
}

function buildEvidenceGaps({
  organisationSize,
  participation,
  assessments,
  members,
  mindEntries,
  journalEntries,
  voiceSessions,
  longitudinal,
}) {
  const gaps = [];

  const assessmentCount =
    safeArray(assessments).length;

  if (assessmentCount === 0) {
    gaps.push({
      key: "no_assessments",
      priority: "High",
      statement:
        "No wellbeing assessments are available.",
    });
  }

  if (
    organisationSize.estimated === null
  ) {
    gaps.push({
      key:
        "unknown_workforce_denominator",
      priority: "High",
      statement:
        "The workforce denominator is not available, so participation cannot be calculated reliably.",
    });
  }

  if (
    participation.rate !== null &&
    participation.rate < 10
  ) {
    gaps.push({
      key: "very_low_participation",
      priority: "High",
      statement:
        `Assessment participation is ${participation.rate}%, which is too low for reliable organisation-wide conclusions.`,
    });
  } else if (
    participation.rate !== null &&
    participation.rate < 30
  ) {
    gaps.push({
      key: "limited_participation",
      priority: "Medium",
      statement:
        `Assessment participation is ${participation.rate}%, so representation remains limited.`,
    });
  }

  if (
    participation.identifiableParticipants ===
      0 &&
    assessmentCount > 0
  ) {
    gaps.push({
      key:
        "unidentifiable_participation",
      priority: "Medium",
      statement:
        "Unique assessment participants cannot be identified, so repeat participation and representation may be overstated.",
    });
  }

  if (
    safeArray(members).length > 0 &&
    countDepartments(members) === 0
  ) {
    gaps.push({
      key: "no_department_data",
      priority: "Medium",
      statement:
        "No department or team information is available for cohort comparison.",
    });
  }

  if (
    longitudinal.repeatParticipants === 0 &&
    assessmentCount > 0
  ) {
    gaps.push({
      key: "no_repeat_assessments",
      priority: "High",
      statement:
        "No identifiable repeat assessments are available, so change over time cannot be assessed.",
    });
  }

  if (
    safeArray(journalEntries).length ===
    0
  ) {
    gaps.push({
      key: "no_journal_evidence",
      priority: "Low",
      statement:
        "No aggregated journal evidence is available.",
    });
  }

  if (
    safeArray(mindEntries).length === 0
  ) {
    gaps.push({
      key: "no_mind_evidence",
      priority: "Low",
      statement:
        "No aggregated Mind & Emotions evidence is available.",
    });
  }

  if (
    safeArray(voiceSessions).length ===
    0
  ) {
    gaps.push({
      key: "no_voice_evidence",
      priority: "Low",
      statement:
        "No aggregated Voice Coach evidence is available.",
    });
  }

  return gaps;
}

function buildNextEvidence({
  evidenceGaps,
  participation,
  longitudinal,
  members,
  assessments,
  mindEntries,
  journalEntries,
  voiceSessions,
}) {
  const recommendations = [];
  const gapKeys = new Set(
    safeArray(evidenceGaps).map(
      (gap) => gap.key
    )
  );

  if (
    gapKeys.has("no_assessments")
  ) {
    recommendations.push({
      priority: 1,
      title:
        "Establish an assessment baseline",

      action:
        "Invite employees to complete the same wellbeing assessment within a defined baseline window.",

      purpose:
        "Create the first consistent source of measurable wellbeing evidence.",
    });
  }

  if (
    gapKeys.has(
      "very_low_participation"
    ) ||
    gapKeys.has(
      "limited_participation"
    )
  ) {
    recommendations.push({
      priority: 1,
      title:
        "Increase representative participation",

      action:
        "Review which parts of the workforce are represented and improve participation without pressuring or identifying individual employees.",

      purpose:
        "Increase confidence that the evidence reflects more than a small self-selecting group.",
    });
  }

  if (
    gapKeys.has(
      "unknown_workforce_denominator"
    )
  ) {
    recommendations.push({
      priority: 1,
      title:
        "Confirm the workforce denominator",

      action:
        "Record the current workforce or eligible cohort size used for the wellbeing programme.",

      purpose:
        "Allow Root to calculate participation and organisation-wide evidence confidence accurately.",
    });
  }

  if (
    gapKeys.has(
      "no_repeat_assessments"
    ) &&
    safeArray(assessments).length > 0
  ) {
    recommendations.push({
      priority: 2,
      title:
        "Collect a follow-up assessment",

      action:
        "Repeat the same assessment after an agreed review period using identifiers that permit anonymous longitudinal comparison.",

      purpose:
        "Distinguish a one-time snapshot from meaningful change over time.",
    });
  }

  if (
    countDepartments(members) > 1
  ) {
    recommendations.push({
      priority: 2,
      title:
        "Compare sufficiently large cohorts",

      action:
        "Compare departments or teams only where group sizes are large enough to protect anonymity.",

      purpose:
        "Understand whether the observed pattern is organisation-wide or concentrated.",
    });
  } else if (
    safeArray(members).length > 0
  ) {
    recommendations.push({
      priority: 3,
      title:
        "Improve cohort information",

      action:
        "Record non-identifying department, role or business-area information where appropriate and privacy-safe.",

      purpose:
        "Enable future cohort comparison without profiling individuals.",
    });
  }

  const qualitativeTotal =
    safeArray(mindEntries).length +
    safeArray(journalEntries).length +
    safeArray(voiceSessions).length;

  if (
    qualitativeTotal === 0 &&
    safeArray(assessments).length > 0
  ) {
    recommendations.push({
      priority: 2,
      title:
        "Gather confidential qualitative context",

      action:
        "Invite optional confidential feedback about what may sit behind the reported scores without asking employees to disclose private medical information.",

      purpose:
        "Explore possible explanations without treating assessment correlations as causes.",
    });
  }

  if (
    longitudinal.repeatParticipants >=
    3
  ) {
    recommendations.push({
      priority: 3,
      title:
        "Continue longitudinal measurement",

      action:
        "Maintain the same measures and review changes against the current baseline.",

      purpose:
        "Build stronger evidence about trajectory and the effect of any tested action.",
    });
  }

  return recommendations
    .sort(
      (first, second) =>
        first.priority -
        second.priority
    )
    .map(
      ({
        priority,
        ...recommendation
      }) => recommendation
    );
}

function buildConfidenceReasons({
  participation,
  respondents,
  qualitative,
  organisation,
}) {
  return [
    {
      area: "Participation",
      level: participation.label,
      reason: participation.reason,
    },
    {
      area: "Responding sample",
      level: respondents.label,
      reason: respondents.reason,
    },
    {
      area: "Qualitative context",
      level: qualitative.label,
      reason: qualitative.reason,
    },
    {
      area: "Organisation-wide evidence",
      level: organisation.label,
      reason: organisation.reason,
    },
  ];
}

function buildExecutiveOutputs({
  observations,
  confidence,
  evidenceGaps,
  contradictions,
  longitudinal,
  participation,
}) {
  const availableObservations =
    safeArray(observations).filter(
      (observation) =>
        observation.available &&
        Number.isFinite(
          observation.average
        )
    );

  const strongestSignal =
    buildStrongestSignal(
      availableObservations
    );

  const highPriorityGaps =
    safeArray(evidenceGaps).filter(
      (gap) =>
        gap.priority === "High"
    );

  const meaningfulLongitudinal =
    safeArray(
      longitudinal?.dimensions
    ).filter(
      (dimension) =>
        dimension.participants >= 3 &&
        [
          "improving",
          "worsening",
          "mixed",
          "unchanged",
        ].includes(
          dimension.direction
        )
    );

  const worseningDimensions =
    meaningfulLongitudinal.filter(
      (dimension) =>
        dimension.direction ===
        "worsening"
    );

  const improvingDimensions =
    meaningfulLongitudinal.filter(
      (dimension) =>
        dimension.direction ===
        "improving"
    );

  let executiveHeadline =
    "The evidence is still developing and should be treated as an emerging organisational picture.";

  if (
    confidence?.organisation?.label ===
    "None"
  ) {
    executiveHeadline =
      "There is not yet enough wellbeing evidence to form an organisational conclusion.";
  } else if (
    participation?.rate !== null &&
    participation.rate < 10
  ) {
    executiveHeadline =
      "Participation is currently too low for reliable organisation-wide conclusions.";
  } else if (
    contradictions.length > 0
  ) {
    executiveHeadline =
      "The wellbeing evidence is mixed and should not be reduced to a single headline.";
  } else if (
    worseningDimensions.length > 0 &&
    improvingDimensions.length === 0
  ) {
    executiveHeadline =
      `${worseningDimensions
        .map(
          (dimension) =>
            dimension.label
        )
        .join(", ")} ${
        worseningDimensions.length === 1
          ? "is"
          : "are"
      } worsening among employees with repeat assessment evidence.`;
  } else if (
    improvingDimensions.length > 0 &&
    worseningDimensions.length === 0
  ) {
    executiveHeadline =
      `${improvingDimensions
        .map(
          (dimension) =>
            dimension.label
        )
        .join(", ")} ${
        improvingDimensions.length === 1
          ? "is"
          : "are"
      } improving among employees with repeat assessment evidence.`;
  } else if (
    strongestSignal &&
    strongestSignal.average >= 7
  ) {
    executiveHeadline =
      `${strongestSignal.label} is the strongest current wellbeing signal and warrants attention.`;
  } else if (
    strongestSignal &&
    strongestSignal.average >= 5
  ) {
    executiveHeadline =
      `${strongestSignal.label} is the strongest current reported difficulty, although the evidence does not support alarm.`;
  } else if (
    confidence?.organisation?.label ===
      "High" ||
    confidence?.organisation?.label ===
      "Moderate"
  ) {
    executiveHeadline =
      "The evidence supports continued attention and measurement, but not a sweeping organisational conclusion.";
  }

  const summaryParts = [];

  if (strongestSignal) {
    summaryParts.push(
      `${strongestSignal.label} has the highest current average at ${strongestSignal.average}/10 across ${strongestSignal.responses} responses.`
    );
  } else {
    summaryParts.push(
      "No assessment dimension currently has enough usable evidence to identify a strongest signal."
    );
  }

  summaryParts.push(
    `Organisation-wide evidence confidence is ${String(
      confidence?.organisation?.label ||
        "unknown"
    ).toLowerCase()}.`
  );

  if (participation?.rate !== null) {
    summaryParts.push(
      `${participation.rate}% of the estimated eligible workforce is represented in the assessment evidence.`
    );
  } else {
    summaryParts.push(
      "Participation cannot yet be calculated reliably because the workforce denominator is incomplete."
    );
  }

  if (contradictions.length > 0) {
    summaryParts.push(
      `${contradictions.length} mixed or potentially misleading evidence pattern${
        contradictions.length === 1
          ? " was"
          : "s were"
      } detected.`
    );
  }

  if (highPriorityGaps.length > 0) {
    summaryParts.push(
      `The highest-priority evidence gap is: ${highPriorityGaps[0].statement}`
    );
  }

  const executiveSummary =
    summaryParts.join(" ");

  const materialFindings =
    availableObservations
      .filter(
        (observation) =>
          observation.average >= 5 ||
          observation.highScoreRate >= 25
      )
      .sort(
        (first, second) => {
          if (
            second.average !==
            first.average
          ) {
            return (
              second.average -
              first.average
            );
          }

          return (
            second.highScoreRate -
            first.highScoreRate
          );
        }
      )
      .slice(0, 3)
      .map((observation) => ({
        dimension:
          observation.label,

        average:
          observation.average,

        responses:
          observation.responses,

        highScoreRate:
          observation.highScoreRate,

        statement:
          `${observation.label} averaged ${observation.average}/10; ${observation.highScoreRate}% of recorded responses were 7 or above.`,
      }));

  const boardSummary = {
    headline: executiveHeadline,

    evidencePosition: {
      organisationConfidence:
        confidence?.organisation?.label ||
        "Unknown",

      respondentConfidence:
        confidence?.respondents?.label ||
        "Unknown",

      participationConfidence:
        confidence?.participation?.label ||
        "Unknown",

      participationRate:
        participation?.rate ?? null,
    },

    materialFindings,

    evidenceLimitations:
      safeArray(evidenceGaps)
        .slice(0, 3)
        .map(
          (gap) => gap.statement
        ),

    mixedEvidence:
      safeArray(contradictions)
        .slice(0, 3)
        .map(
          (contradiction) =>
            contradiction.statement
        ),

    recommendedPosition:
      highPriorityGaps.length > 0
        ? "Improve the evidence base before making a broad organisational intervention."
        : contradictions.length > 0
          ? "Investigate the mixed evidence before presenting a single organisational conclusion."
          : strongestSignal
            ? `Continue measuring ${strongestSignal.label.toLowerCase()} and test a proportionate response with a defined review point.`
            : "Continue gathering consistent evidence before making a larger decision.",

    caution:
      "This summary describes the available aggregated evidence. It does not establish cause and must not be used to identify individual employees.",
  };

  return {
    executiveHeadline,
    executiveSummary,
    boardSummary,
  };
}

function buildReasoningSummary({
  observations,
  confidence,
  evidenceGaps,
  contradictions,
}) {
  const strongestSignal =
    buildStrongestSignal(
      observations
    );

  const highestPriorityGap =
    safeArray(evidenceGaps).find(
      (gap) =>
        gap.priority === "High"
    ) ||
    safeArray(evidenceGaps)[0] ||
    null;

  let priority =
    "Continue gathering consistent evidence before making a larger organisational decision.";

  if (
    confidence.organisation.label ===
      "None" ||
    confidence.organisation.label ===
      "Low"
  ) {
    priority =
      "Increase evidence confidence before selecting a broad organisational intervention.";
  }

  if (
    contradictions.length > 0
  ) {
    priority =
      "Investigate the mixed evidence before reducing it to a single organisational conclusion.";
  }

  return {
    strongestSignal:
      strongestSignal
        ? {
            dimension:
              strongestSignal.label,

            average:
              strongestSignal.average,

            responses:
              strongestSignal.responses,

            highScores:
              strongestSignal.highScores,

            statement:
              `${strongestSignal.label} is the highest current assessment average at ${strongestSignal.average}/10, based on ${strongestSignal.responses} responses.`,
          }
        : null,

    greatestUncertainty:
      highestPriorityGap
        ? highestPriorityGap.statement
        : "No major evidence gap was detected by the current rules.",

    priority,

    organisationConfidence:
      confidence.organisation.label,

    respondentConfidence:
      confidence.respondents.label,
  };
}

export function buildOrganisationWellbeingReview({
  organisation = null,
  members = [],
  assessments = [],
  mindEntries = [],
  journalEntries = [],
  voiceSessions = [],
} = {}) {
  const memberRecords =
    safeArray(members);

  const assessmentRecords =
    safeArray(assessments);

  const mindRecords =
    safeArray(mindEntries);

  const journalRecords =
    safeArray(journalEntries);

  const voiceRecords =
    safeArray(voiceSessions);

  const organisationSize =
    parseOrganisationSize(
      organisation,
      memberRecords.length
    );

  const participation =
    calculateParticipation({
      members: memberRecords,
      assessments:
        assessmentRecords,
      organisationSize,
    });

  const assessmentWindow =
    buildAssessmentWindow(
      assessmentRecords
    );

  const observations =
    buildDimensionObservations(
      assessmentRecords
    );

  const longitudinal =
    buildLongitudinalEvidence(
      assessmentRecords
    );

  const participationAssessment =
    participationConfidence(
      participation
    );

  const respondentAssessment =
    respondentConfidence({
      assessments:
        assessmentRecords,
      observations,
      longitudinal,
    });

  const qualitativeAssessment =
    qualitativeConfidence({
      mindEntries: mindRecords,
      journalEntries:
        journalRecords,
      voiceSessions:
        voiceRecords,
    });

  const organisationAssessment =
    organisationConfidence({
      participation:
        participationAssessment,
      respondents:
        respondentAssessment,
      assessmentCount:
        assessmentRecords.length,
    });

  const confidence = {
    organisation:
      organisationAssessment,

    respondents:
      respondentAssessment,

    participation:
      participationAssessment,

    qualitative:
      qualitativeAssessment,

    reasons:
      buildConfidenceReasons({
        participation:
          participationAssessment,

        respondents:
          respondentAssessment,

        qualitative:
          qualitativeAssessment,

        organisation:
          organisationAssessment,
      }),
  };

  const observedEvidence =
    buildObservedEvidence(
      observations
    );

  const contradictions =
    buildContradictions({
      observations,
      longitudinal,
    });

  const evidenceGaps =
    buildEvidenceGaps({
      organisationSize,
      participation,
      assessments:
        assessmentRecords,
      members: memberRecords,
      mindEntries: mindRecords,
      journalEntries:
        journalRecords,
      voiceSessions:
        voiceRecords,
      longitudinal,
    });

  const nextEvidence =
    buildNextEvidence({
      evidenceGaps,
      participation,
      longitudinal,
      members: memberRecords,
      assessments:
        assessmentRecords,
      mindEntries: mindRecords,
      journalEntries:
        journalRecords,
      voiceSessions:
        voiceRecords,
    });

  const reasoningSummary =
    buildReasoningSummary({
      observations,
      confidence,
      evidenceGaps,
      contradictions,
    });

      const executiveOutputs =
    buildExecutiveOutputs({
      observations,
      confidence,
      evidenceGaps,
      contradictions,
      longitudinal,
      participation,
    });

  return {
    organisation: {
      name:
        getOrganisationName(
          organisation
        ),

      size: organisationSize,

      recordedMembers:
        memberRecords.length,

      recordedDepartments:
        countDepartments(
          memberRecords
        ),
    },

    evidenceReviewed: {
      members:
        memberRecords.length,

      assessments:
        assessmentRecords.length,

      identifiableAssessmentParticipants:
        participation.identifiableParticipants,

      estimatedAssessmentParticipants:
        participation.participantCount,

      mindEntries:
        mindRecords.length,

      journalEntries:
        journalRecords.length,

      voiceSessions:
        voiceRecords.length,

      totalSupportInteractions:
        mindRecords.length +
        journalRecords.length +
        voiceRecords.length,

      participationRate:
        participation.rate,

      participationDenominator:
        participation.denominator,

      participationDenominatorSource:
        participation.denominatorSource,

      participantCountMethod:
        participation.participantCountMethod,

      assessmentWindow,
    },

    confidence,

    observations,

    observedEvidence,

    longitudinal,

    contradictions,

    evidenceGaps,

    nextEvidence,

       reasoningSummary,

    executiveHeadline:
      executiveOutputs.executiveHeadline,

    executiveSummary:
      executiveOutputs.executiveSummary,

    boardSummary:
      executiveOutputs.boardSummary,

    cautions: [
      "Higher assessment scores represent greater reported difficulty.",
      "Assessment evidence describes reported experience and does not establish a cause.",
      "Small or self-selecting samples should not be generalised across the organisation.",
      "Averages may conceal smaller groups reporting substantially greater difficulty.",
      "Aggregated wellbeing evidence must not be used to identify or profile individual employees.",
      "Recommendations support organisational judgement and do not replace HR, safeguarding, occupational-health, clinical or legal advice.",
    ],

    generatedAt:
      new Date().toISOString(),
  };
}

export {
  DIMENSION_DEFINITIONS,
};
