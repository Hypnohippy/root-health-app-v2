/**
 * Root Communication Engine
 *
 * Purpose:
 * Convert Root's structured knowledge into language that is:
 * - truthful;
 * - consistent;
 * - proportionate to the available evidence;
 * - appropriate for the intended audience.
 *
 * This engine:
 * - performs no database queries;
 * - contains no React or interface logic;
 * - does not recalculate wellbeing metrics;
 * - does not invent missing evidence;
 * - does not repair contradictory source data;
 * - gives pages one shared communication object.
 */

const VALID_SCOPES = [
  "personal",
  "organisation",
];

const VALID_AUDIENCES = [
  "employee",
  "manager",
  "hr",
  "executive",
];

const MATURITY_LEVELS = {
  EMERGING: {
    key: "emerging",
    level: 1,
    label: "Emerging Evidence",
  },

  DEVELOPING: {
    key: "developing",
    level: 2,
    label: "Developing Evidence",
  },

  STRENGTHENING: {
    key: "strengthening",
    level: 3,
    label: "Strengthening Evidence",
  },

  ESTABLISHED: {
    key: "established",
    level: 4,
    label: "Established Evidence",
  },

  HIGHLY_ESTABLISHED: {
    key: "highly-established",
    level: 5,
    label: "Highly Established Evidence",
  },
};

function safeObject(value) {
  return value &&
    typeof value === "object" &&
    !Array.isArray(value)
    ? value
    : {};
}

function safeArray(value) {
  return Array.isArray(value)
    ? value
    : [];
}

function safeNumber(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
}

function safeText(value) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function clamp(value, minimum, maximum) {
  return Math.min(
    maximum,
    Math.max(minimum, value)
  );
}

function formatMetric(value) {
  const number = safeNumber(value);

  if (number === null) {
    return "—";
  }

  return number.toFixed(1);
}

function formatIndex(value) {
  const number = safeNumber(value);

  if (number === null) {
    return "—";
  }

  return Math.round(number);
}

function normaliseScope(scope) {
  return VALID_SCOPES.includes(scope)
    ? scope
    : "organisation";
}

function normaliseAudience(audience) {
  return VALID_AUDIENCES.includes(audience)
    ? audience
    : "executive";
}

function hasEstablishedTheme(theme) {
  const value = safeText(theme).toLowerCase();

  if (!value) {
    return false;
  }

  return ![
    "no challenge data yet",
    "not established yet",
    "not established",
    "none",
    "unknown",
  ].includes(value);
}

/**
 * Root should distinguish:
 *
 * 1. Evidence quantity
 *    How much information exists?
 *
 * 2. Evidence quality
 *    Does it contain valid baselines and matched follow-ups?
 *
 * 3. Evidence breadth
 *    How widely does it represent the organisation?
 *
 * 4. Evidence continuity
 *    Has Root observed repeated review stages?
 *
 * 5. Privacy readiness
 *    Is the group large enough for organisational conclusions?
 */
export function buildEvidenceMaturity({
  participation = {},
  supportInteractions = 0,
  trendRows = [],
  analysisStage = null,
} = {}) {
  const safeParticipation =
    safeObject(participation);

  const invited =
    safeNumber(
      safeParticipation.invited
    ) || 0;

  const joined =
    safeNumber(
      safeParticipation.joined
    ) || 0;

  const baselineCompleted =
    safeNumber(
      safeParticipation.baselineCompleted
    ) || 0;

  const matchedParticipants =
    safeNumber(
      safeParticipation.matchedParticipants
    ) || 0;

  const participationRate =
    safeNumber(
      safeParticipation.participationRate
    );

  const baselineCompletionRate =
    safeNumber(
      safeParticipation.baselineCompletionRate
    );

  const followUpRate =
    safeNumber(
      safeParticipation.followUpRate
    );

  const departmentsRepresented =
    safeNumber(
      safeParticipation.departmentsRepresented
    ) || 0;

  const privacyMinimum =
    safeNumber(
      safeParticipation.privacyMinimum
    ) || 5;

  const outcomeSuppressed =
    safeParticipation.outcomeSuppressed === true;

  const supportCount =
    safeNumber(supportInteractions) || 0;

  const reviewStages =
    safeArray(trendRows).length;

  const analysisLevel =
    safeNumber(
      safeObject(analysisStage).level
    ) || 1;

  let score = 0;

  /*
   * Participation breadth: maximum 20 points.
   */
  if (participationRate !== null) {
    score +=
      clamp(participationRate, 0, 100) *
      0.2;
  } else if (invited > 0) {
    score +=
      clamp(
        (joined / invited) * 100,
        0,
        100
      ) * 0.2;
  }

  /*
   * Valid baseline coverage: maximum 20 points.
   */
  if (baselineCompletionRate !== null) {
    score +=
      clamp(
        baselineCompletionRate,
        0,
        100
      ) * 0.2;
  } else if (invited > 0) {
    score +=
      clamp(
        (baselineCompleted / invited) *
          100,
        0,
        100
      ) * 0.2;
  }

  /*
   * Matched follow-up quality: maximum 25 points.
   */
  if (followUpRate !== null) {
    score +=
      clamp(followUpRate, 0, 100) *
      0.25;
  } else if (baselineCompleted > 0) {
    score +=
      clamp(
        (
          matchedParticipants /
          baselineCompleted
        ) * 100,
        0,
        100
      ) * 0.25;
  }

  /*
   * Repeated observation: maximum 15 points.
   */
  score += clamp(
    Math.max(0, reviewStages - 1) * 5,
    0,
    15
  );

  /*
   * Anonymous support evidence: maximum 10 points.
   */
  score += clamp(
    supportCount * 2,
    0,
    10
  );

  /*
   * Organisational breadth: maximum 5 points.
   */
  score += clamp(
    departmentsRepresented * 2,
    0,
    5
  );

  /*
   * Existing analysis stage contributes a maximum
   * of 5 points. It supports maturity but cannot
   * determine maturity by itself.
   */
  score += clamp(
    analysisLevel,
    1,
    5
  );

  /*
   * Organisational movement should not be described
   * as established when the privacy threshold has
   * not been met.
   */
  if (
    outcomeSuppressed ||
    matchedParticipants < privacyMinimum
  ) {
    score = Math.min(score, 59);
  }

  const roundedScore =
    Math.round(
      clamp(score, 0, 100)
    );

  let maturity =
    MATURITY_LEVELS.EMERGING;

  if (roundedScore >= 85) {
    maturity =
      MATURITY_LEVELS.HIGHLY_ESTABLISHED;
  } else if (roundedScore >= 70) {
    maturity =
      MATURITY_LEVELS.ESTABLISHED;
  } else if (roundedScore >= 55) {
    maturity =
      MATURITY_LEVELS.STRENGTHENING;
  } else if (roundedScore >= 30) {
    maturity =
      MATURITY_LEVELS.DEVELOPING;
  }

  /*
   * No matched follow-up means Root has a baseline,
   * not measured organisational movement.
   */
  if (matchedParticipants === 0) {
    maturity =
      baselineCompleted > 0
        ? MATURITY_LEVELS.DEVELOPING
        : MATURITY_LEVELS.EMERGING;
  }

  /*
   * A very small matched group cannot support an
   * established organisation-level conclusion.
   */
  if (
    matchedParticipants > 0 &&
    matchedParticipants <
      privacyMinimum &&
    maturity.level > 3
  ) {
    maturity =
      MATURITY_LEVELS.STRENGTHENING;
  }

  const limitations = [];

  if (invited === 0) {
    limitations.push(
      "No invited employee population is currently available for participation comparison."
    );
  }

  if (baselineCompleted === 0) {
    limitations.push(
      "A valid organisational baseline has not yet been established."
    );
  }

  if (
    baselineCompleted > 0 &&
    matchedParticipants === 0
  ) {
    limitations.push(
      "No matched follow-up comparison is currently available."
    );
  }

  if (
    matchedParticipants > 0 &&
    matchedParticipants <
      privacyMinimum
  ) {
    limitations.push(
      `Matched outcomes remain below Root's privacy threshold of ${privacyMinimum} participants.`
    );
  }

  if (supportCount === 0) {
    limitations.push(
      "No anonymous support interactions are currently available."
    );
  }

  return {
    ...maturity,

    score: roundedScore,

    privacyReady:
      !outcomeSuppressed &&
      matchedParticipants >=
        privacyMinimum,

    basis: {
      invited,
      joined,
      baselineCompleted,
      matchedParticipants,
      participationRate,
      baselineCompletionRate,
      followUpRate,
      departmentsRepresented,
      privacyMinimum,
      outcomeSuppressed,
      supportInteractions:
        supportCount,
      reviewStages,
      analysisLevel,
    },

    limitations,
  };
}

function getMaturityLanguage(maturity) {
  const key =
    safeText(maturity?.key) ||
    "emerging";

  const language = {
    emerging: {
      evidenceLead:
        "Root is beginning to establish the organisation's wellbeing picture.",

      patternLead:
        "The available evidence provides an early indication rather than a confirmed organisational pattern.",

      interpretationLead:
        "Root is treating this as an area to explore, not a settled conclusion.",

      recommendationLead:
        "Root recommends a proportionate early response while further evidence is gathered.",

      forecastLead:
        "Further participation and matched follow-ups are needed before Root can determine whether this pattern is sustained.",
    },

    developing: {
      evidenceLead:
        "Root has established an initial organisational picture and is beginning to compare emerging evidence.",

      patternLead:
        "The evidence is beginning to reveal possible organisational patterns, although they are not yet fully established.",

      interpretationLead:
        "Root considers this a developing interpretation that should be tested through further review periods.",

      recommendationLead:
        "Root recommends a targeted but proportionate response while the evidence continues to develop.",

      forecastLead:
        "Further matched check-ins will show whether the current pattern is temporary, sustained or becoming more widely established.",
    },

    strengthening: {
  evidenceLead:
    "Repeated reviews are beginning to reveal consistent organisational wellbeing patterns.",

  patternLead:
    "Stage 3 reflects how much Root has learned about the organisation over time. It means patterns are becoming visible across repeated reviews, although longer-term understanding is still developing.",

  interpretationLead:
    "The findings in the current review may still carry high confidence where the available evidence is consistent and reliable. Confidence in the current findings is separate from Root's longer-term organisational learning stage.",

  recommendationLead:
    "Root recommends targeted action supported by continued measurement.",

  forecastLead:
    "The next review period should confirm whether the observed movement is sustained and whether the recommended response is having an effect.",
},

established: {
      evidenceLead:
        "Root has repeatedly observed a consistent organisational wellbeing pattern.",

      patternLead:
        "The evidence is sufficiently established to support organisational decision-making.",

      interpretationLead:
        "Root considers this a well-supported interpretation of the current workforce picture.",

      recommendationLead:
        "Root recommends progressing targeted organisational action and evaluating its measured effect.",

      forecastLead:
        "Future reviews should focus on whether the intervention changes the established pattern and improves the wider Workforce Wellbeing Index.",
    },

    "highly-established": {
      evidenceLead:
        "Root has consistently observed this organisational wellbeing pattern across multiple review periods.",

      patternLead:
        "The breadth, continuity and quality of evidence provide a strong basis for organisational action.",

      interpretationLead:
        "Root considers this a highly supported interpretation of the current workforce picture.",

      recommendationLead:
        "Root recommends decisive targeted action with formal outcome measurement.",

      forecastLead:
        "Future reviews should evaluate intervention impact, identify residual risk and determine whether the organisational response should be maintained, expanded or adapted.",
    },
  };

  return (
    language[key] ||
    language.emerging
  );
}

/**
 * Creates one canonical facts object.
 *
 * Pages should read these values rather than selecting
 * different facts independently.
 */
export function buildOrganisationCommunicationFacts(
  snapshot = {}
) {
  const safeSnapshot =
    safeObject(snapshot);

  const movementSummary =
    safeObject(
      safeSnapshot.movementSummary
    );

  const highestCurrentDifficulty =
    safeObject(
      movementSummary
        .highestCurrentDifficulty
    );

  const biggestImprovement =
    safeObject(
      movementSummary
        .biggestImprovement
    );

  const watchArea =
    safeObject(
      movementSummary.watchArea
    );

  const fallbackHighRisk =
    safeObject(
      safeSnapshot.highRiskMetric
    );

  const fallbackImprovement =
    safeObject(
      safeSnapshot.mostImproved
    );

  const fallbackWatchArea =
    safeObject(
      safeSnapshot.watchArea
    );

  const anonymousTheme =
    hasEstablishedTheme(
      safeSnapshot.mostCommonTheme
    )
      ? safeText(
          safeSnapshot.mostCommonTheme
        )
      : null;

  return {
    workforceIndex: {
      baseline:
        safeNumber(
          safeSnapshot.baselineScore
        ),

      current:
        safeNumber(
          safeSnapshot.currentScore
        ),
    },

    highestCurrentDifficulty: {
      label:
        safeText(
          highestCurrentDifficulty.label
        ) ||
        safeText(
          fallbackHighRisk.label
        ) ||
        null,

      current:
        safeNumber(
          highestCurrentDifficulty.current
        ) ??
        safeNumber(
          fallbackHighRisk.current
        ),
    },

    strongestImprovement: {
      label:
        safeText(
          biggestImprovement.label
        ) ||
        safeText(
          fallbackImprovement.label
        ) ||
        null,

      start:
        safeNumber(
          biggestImprovement.start
        ) ??
        safeNumber(
          fallbackImprovement.start
        ),

      current:
        safeNumber(
          biggestImprovement.current
        ) ??
        safeNumber(
          fallbackImprovement.current
        ),

      change:
        safeNumber(
          biggestImprovement.change
        ) ??
        safeNumber(
          fallbackImprovement.change
        ),
    },

    watchArea: {
      label:
        safeText(
          watchArea.label
        ) ||
        safeText(
          fallbackWatchArea.label
        ) ||
        null,

      start:
        safeNumber(
          watchArea.start
        ) ??
        safeNumber(
          fallbackWatchArea.start
        ),

      current:
        safeNumber(
          watchArea.current
        ) ??
        safeNumber(
          fallbackWatchArea.current
        ),

      change:
        safeNumber(
          watchArea.change
        ) ??
        safeNumber(
          fallbackWatchArea.change
        ),
    },

    anonymousTheme,

    primaryConcern:
      safeText(
        safeSnapshot.primaryConcern
      ) ||
      safeText(
        highestCurrentDifficulty.label
      ) ||
      safeText(
        fallbackHighRisk.label
      ) ||
      "Workforce wellbeing",

    recommendedFocus:
      safeText(
        safeSnapshot.recommendedFocus
      ) ||
      "Maintain regular wellbeing review",

    initiative: {
      key:
        safeText(
          safeSnapshot.initiative?.key
        ) ||
        null,

      title:
        safeText(
          safeSnapshot.initiative?.title
        ) ||
        "Targeted wellbeing support",

      reason:
        safeText(
          safeSnapshot.initiative?.reason
        ),

      expectedOutcome:
        safeText(
          safeSnapshot.initiative
            ?.expectedOutcome
        ),
    },

    supportInteractions:
      safeNumber(
        safeSnapshot.supportInteractions
      ) || 0,
  };
}

function buildCurrentPicture({
  facts,
  maturityLanguage,
}) {
  const currentIndex =
    formatIndex(
      facts.workforceIndex.current
    );

  const baselineIndex =
    formatIndex(
      facts.workforceIndex.baseline
    );

  const concern =
    facts.highestCurrentDifficulty;

  const parts = [
    maturityLanguage.evidenceLead,
  ];

  if (currentIndex !== "—") {
    parts.push(
      `The current Workforce Wellbeing Index is ${currentIndex} out of 100${
        baselineIndex !== "—"
          ? `, compared with a baseline of ${baselineIndex}`
          : ""
      }.`
    );
  }

  if (concern.label) {
    parts.push(
      `${concern.label} is currently the highest measured difficulty${
        concern.current !== null
          ? ` at ${formatMetric(
              concern.current
            )} out of 10`
          : ""
      }.`
    );
  }

  return parts.join(" ");
}

function buildMovementCommunication({
  facts,
  maturity,
}) {
  const improvement =
    facts.strongestImprovement;

  const watchArea =
    facts.watchArea;

  const canDescribeMovement =
    maturity.basis
      .matchedParticipants > 0;

  if (!canDescribeMovement) {
    return {
      headline:
        "Movement not established",

      summary:
        "Root has established a current workforce position, but no matched follow-up comparison is yet available.",

      strongestImprovement:
        null,

      watchArea: null,
    };
  }

  const strongestImprovement =
    improvement.label
      ? `${improvement.label} is showing the clearest improvement${
          improvement.start !== null &&
          improvement.current !== null
            ? `, moving from ${formatMetric(
                improvement.start
              )} to ${formatMetric(
                improvement.current
              )}`
            : ""
        }.`
      : null;

  const areaToWatch =
    watchArea.label
      ? `${watchArea.label} has become more difficult${
          watchArea.start !== null &&
          watchArea.current !== null
            ? `, moving from ${formatMetric(
                watchArea.start
              )} to ${formatMetric(
                watchArea.current
              )}`
            : ""
        }, and should remain under review.`
      : null;

  return {
    headline:
      strongestImprovement
        ? "Measured movement detected"
        : "No clear improvement established",

    summary:
      strongestImprovement ||
      "Root can compare the current workforce picture with the baseline, but no clear positive movement has yet been established.",

    strongestImprovement,

    watchArea:
      areaToWatch,
  };
}

function buildThemeCommunication({
  facts,
  maturity,
}) {
  if (!facts.anonymousTheme) {
    return {
      established: false,

      label:
        "Not established yet",

      summary:
        "Root does not yet have enough anonymous reflection evidence to identify a dominant workforce theme.",

      limitation:
        "Measured assessment difficulty and anonymous workforce themes are different evidence sources and should not be presented as the same finding.",
    };
  }

  const wording =
    maturity.level >= 4
      ? `${facts.anonymousTheme} has repeatedly appeared as the strongest anonymous workforce theme.`
      : `${facts.anonymousTheme} is currently the most visible anonymous workforce theme.`;

  return {
    established: true,

    label:
      facts.anonymousTheme,

    summary:
      wording,

    limitation:
      "Anonymous themes describe recurring reflection content and do not represent every employee's experience.",
  };
}

function buildInterpretation({
  facts,
  maturityLanguage,
}) {
  const concern =
    facts.primaryConcern;

  return {
    headline:
      `Current priority: ${concern}`,

    summary:
      `${maturityLanguage.interpretationLead} ${concern} is currently the clearest priority for organisational attention.`,

    evidencePosition:
      maturityLanguage.patternLead,

    whatRootIsWatching:
      facts.watchArea.label
        ? `Root will watch whether ${facts.watchArea.label.toLowerCase()} continues to increase and whether it begins affecting other wellbeing measures.`
        : `Root will watch whether the current priority remains consistent and whether it begins influencing recovery, engagement or wider workforce wellbeing.`,
  };
}

function buildRecommendationCommunication({
  facts,
  maturity,
  maturityLanguage,
}) {
  const initiativeTitle =
    facts.initiative.title;

  const primaryConcern =
    facts.primaryConcern;

  const recommendation =
    maturity.level <= 2
      ? `Prepare ${initiativeTitle} as a proportionate early response while continuing to strengthen participation and follow-up evidence.`
      : `Progress ${initiativeTitle} and evaluate its effect during the next reporting period.`;

  const reason =
    facts.initiative.reason ||
    `${primaryConcern} is currently the clearest area for organisational attention. Root is considering current severity, measured movement and the maturity of available evidence.`;

  const approvalLanguage =
    maturity.level <= 2
      ? `Root recommends approval to prepare the initiative and establish how its effect will be measured before wider implementation.`
      : `Root recommends approval because the initiative addresses the strongest current concern and can be evaluated objectively during future reviews.`;

  return {
    title:
      initiativeTitle,

    action:
      recommendation,

    rationale:
      `${maturityLanguage.recommendationLead} ${reason}`,

    approvalLanguage,

    expectedOutcome:
      facts.initiative.expectedOutcome ||
      `Improvement in ${primaryConcern.toLowerCase()}, stronger support engagement and a healthier Workforce Wellbeing Index.`,

    strength:
      maturity.level >= 4
        ? "strong"
        : maturity.level === 3
        ? "moderate"
        : "proportionate",
  };
}

function buildLimitations({
  maturity,
  themeCommunication,
}) {
  const limitations = [
    ...safeArray(
      maturity.limitations
    ),
  ];

  if (
    !themeCommunication.established
  ) {
    limitations.push(
      "A dominant anonymous workforce theme has not yet been established."
    );
  }

  return Array.from(
    new Set(limitations)
  );
}

/**
 * Builds the organisation-facing communication object.
 *
 * The snapshot remains responsible for calculating facts.
 * This engine is responsible for deciding how those facts
 * should be communicated.
 */
export function buildOrganisationCommunication(
  snapshot = {},
  {
    audience = "executive",
  } = {}
) {
  const safeSnapshot =
    safeObject(snapshot);

  const normalisedAudience =
    normaliseAudience(audience);

  const facts =
    buildOrganisationCommunicationFacts(
      safeSnapshot
    );

  const maturity =
    buildEvidenceMaturity({
      participation:
        safeSnapshot.participation,

      supportInteractions:
        safeSnapshot.supportInteractions,

      trendRows:
        safeSnapshot.trendRows,

      analysisStage:
        safeSnapshot.analysisStage,
    });

  const maturityLanguage =
    getMaturityLanguage(maturity);

  const currentPicture =
    buildCurrentPicture({
      facts,
      maturityLanguage,
    });

  const movement =
    buildMovementCommunication({
      facts,
      maturity,
    });

  const anonymousTheme =
    buildThemeCommunication({
      facts,
      maturity,
    });

  const interpretation =
    buildInterpretation({
      facts,
      maturityLanguage,
    });

  const recommendation =
    buildRecommendationCommunication({
      facts,
      maturity,
      maturityLanguage,
    });

  const limitations =
    buildLimitations({
      maturity,
      themeCommunication:
        anonymousTheme,
    });

  const executiveSummary = [
    currentPicture,
    movement.summary,
    interpretation.summary,
  ]
    .filter(Boolean)
    .join(" ");

  const closingSummary = [
    `The current Workforce Wellbeing Index is ${formatIndex(
      facts.workforceIndex.current
    )} out of 100.`,

    facts.highestCurrentDifficulty
      .label
      ? `${facts.highestCurrentDifficulty.label} is the highest measured difficulty.`
      : null,

    facts.anonymousTheme
      ? `${facts.anonymousTheme} is the strongest anonymous workforce theme.`
      : "A dominant anonymous workforce theme has not yet been established.",

    recommendation.action,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    version: 1,

    generatedAt:
      new Date().toISOString(),

    scope: "organisation",

    audience:
      normalisedAudience,

    facts,

    maturity,

    language: {
      evidenceLead:
        maturityLanguage.evidenceLead,

      patternLead:
        maturityLanguage.patternLead,

      interpretationLead:
        maturityLanguage.interpretationLead,

      recommendationLead:
        maturityLanguage.recommendationLead,

      forecastLead:
        maturityLanguage.forecastLead,
    },

    currentPicture,

    movement,

    anonymousTheme,

    interpretation,

    recommendation,

    forecast: {
      summary:
        maturityLanguage.forecastLead,
    },

    limitations,

    executive: {
      summary:
        executiveSummary,

      closingSummary,

      evidenceStrength:
        `${maturity.label}: ${maturity.score} / 100`,

      recommendation:
        recommendation.action,

      recommendationReason:
        recommendation.rationale,

      boardApproval:
        recommendation.approvalLanguage,

      expectedOutcome:
        recommendation.expectedOutcome,
    },
  };
}

/**
 * Shared public entry point.
 *
 * Personal communication will be connected later.
 * For now, personal knowledge is preserved without
 * inventing a second personal reflection system.
 */
export function buildRootCommunication({
  scope = "organisation",
  audience = "executive",
  knowledge = null,
} = {}) {
  const normalisedScope =
    normaliseScope(scope);

  if (
    normalisedScope ===
    "organisation"
  ) {
    return buildOrganisationCommunication(
      knowledge,
      {
        audience,
      }
    );
  }

  return {
    version: 1,

    generatedAt:
      new Date().toISOString(),

    scope: "personal",

    audience:
      normaliseAudience(audience),

    status:
      "not-connected",

    message:
      "Personal communication remains owned by Root's existing Reflection Engine until the shared personal communication contract is deliberately connected.",

    knowledge:
      safeObject(knowledge),
  };
}

export default buildRootCommunication;