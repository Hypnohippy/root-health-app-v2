function safeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function safeArray(value) {
  return Array.isArray(value)
    ? value
    : [];
}

function clampScore(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(100, Math.round(number))
  );
}

function includesAny(text, phrases = []) {
  return phrases.some((phrase) =>
    text.includes(phrase)
  );
}

function countMatches(text, phrases = []) {
  return phrases.reduce(
    (count, phrase) =>
      text.includes(phrase)
        ? count + 1
        : count,
    0
  );
}

function scoreByGroups(
  text,
  groups = []
) {
  let score = 0;
  const reasons = [];

  groups.forEach((group) => {
    const matches = countMatches(
      text,
      group.phrases
    );

    if (matches > 0) {
      score +=
        Math.min(
          group.max || 100,
          matches *
            (group.weight || 10)
        );

      if (group.reason) {
        reasons.push(group.reason);
      }
    }
  });

  return {
    score: clampScore(score),
    reasons: [
      ...new Set(reasons),
    ],
  };
}

const EMPLOYMENT_DECISION_GROUPS = [
  {
    weight: 35,
    max: 70,
    reason:
      "The conversation involves a potentially significant employment decision.",
    phrases: [
      "dismiss",
      "dismissal",
      "terminate employment",
      "termination",
      "fire them",
      "fire him",
      "fire her",
      "sack",
      "redundancy",
      "redundant",
      "disciplinary",
      "discipline",
      "demote",
      "demotion",
      "suspend",
      "suspension",
      "capability process",
      "performance improvement plan",
      "pip",
    ],
  },

  {
    weight: 25,
    max: 50,
    reason:
      "The conversation concerns a formal workplace process.",
    phrases: [
      "grievance",
      "appeal",
      "investigation",
      "formal warning",
      "written warning",
      "final warning",
      "hearing",
      "consultation",
      "selection criteria",
      "selection pool",
      "restructure",
      "restructuring",
      "tupe",
    ],
  },
];

const HEALTH_GROUPS = [
  {
    weight: 30,
    max: 60,
    reason:
      "Health or disability considerations may materially affect the decision.",
    phrases: [
      "depression",
      "anxiety disorder",
      "mental health condition",
      "disability",
      "disabled",
      "long-term condition",
      "long term condition",
      "occupational health",
      "reasonable adjustment",
      "reasonable adjustments",
      "phased return",
      "long-term sickness",
      "long term sickness",
      "sickness absence",
      "medical condition",
      "health condition",
    ],
  },
];

const EQUALITY_GROUPS = [
  {
    weight: 35,
    max: 70,
    reason:
      "Equality or protected-characteristic considerations may be relevant.",
    phrases: [
      "discrimination",
      "discriminate",
      "protected characteristic",
      "pregnancy",
      "maternity",
      "race",
      "religion",
      "sexual orientation",
      "gender reassignment",
      "age discrimination",
      "sex discrimination",
      "victimisation",
      "harassment",
      "sexual harassment",
    ],
  },
];

const PRIVACY_GROUPS = [
  {
    weight: 35,
    max: 70,
    reason:
      "The conversation may involve personal, confidential or health information.",
    phrases: [
      "personal data",
      "health data",
      "medical records",
      "medical information",
      "confidential information",
      "gdpr",
      "data protection",
      "monitor emails",
      "monitor email",
      "monitor teams",
      "teams messages",
      "private messages",
      "employee messages",
      "individual responses",
      "identify the employee",
      "identify employees",
      "who said",
      "who reported",
    ],
  },
];

const SAFEGUARDING_GROUPS = [
  {
    weight: 60,
    max: 100,
    reason:
      "The conversation contains potential safeguarding or immediate-risk language.",
    phrases: [
      "suicide",
      "suicidal",
      "self harm",
      "self-harm",
      "threatened violence",
      "physical danger",
      "risk to life",
      "immediate danger",
      "harm themselves",
      "hurt themselves",
    ],
  },
];

const WHISTLEBLOWING_GROUPS = [
  {
    weight: 45,
    max: 90,
    reason:
      "Speaking-up or whistleblowing protections may be relevant.",
    phrases: [
      "whistleblowing",
      "whistleblower",
      "protected disclosure",
      "reported wrongdoing",
      "raised wrongdoing",
      "reported fraud",
      "reported safety concern",
    ],
  },
];

const POLICY_GROUPS = [
  {
    weight: 20,
    max: 60,
    reason:
      "The proposed action may depend on organisational policy or procedure.",
    phrases: [
      "policy",
      "procedure",
      "company rules",
      "staff handbook",
      "employee handbook",
      "disciplinary procedure",
      "grievance procedure",
      "absence policy",
      "capability policy",
      "redundancy policy",
      "flexible working policy",
    ],
  },
];

const LOW_RISK_INFORMATIONAL_PHRASES = [
  "how many",
  "what percentage",
  "summarise our evidence",
  "summarize our evidence",
  "what does the data show",
  "what is our participation",
  "how many assessments",
  "how many employees",
  "what changed",
  "show me the figures",
];

const DECISION_LANGUAGE = [
  "what should i do",
  "what should we do",
  "what would you do",
  "should i",
  "should we",
  "can i",
  "can we",
    "can a manager",
  "can a leader",
  "can an employer",
  "can hr",
  "can my manager",
  "is a manager allowed",
  "is an employer allowed",
  "is hr allowed",
  "is it okay",
  "is it ok",
  "are we allowed",
  "would it be fair",
  "before we decide",
  "before making a decision",
  "what action should",
];

const HIGH_IMPACT_LANGUAGE = [
  "dismiss",
  "dismissal",
  "redundancy",
  "redundant",
  "disciplinary",
  "demote",
  "suspend",
  "formal action",
  "legal action",
  "grievance",
  "whistleblowing",
  "harassment",
  "discrimination",
    "monitor emails",
  "monitor email",
  "monitor teams",
  "teams messages",
  "private messages",
  "employee messages",
  "read an employee's",
  "read employee messages",
  "access private",
];

function buildDimension(
  text,
  groups
) {
  return scoreByGroups(
    text,
    groups
  );
}

function calculateDecisionIntent(
  text
) {
  const matches =
    countMatches(
      text,
      DECISION_LANGUAGE
    );

  return clampScore(
    matches * 25
  );
}

function calculateImpact(
  text
) {
  const matches =
    countMatches(
      text,
      HIGH_IMPACT_LANGUAGE
    );

  return clampScore(
    matches * 30
  );
}

function calculateEvidenceUncertainty({
  assistantAnswer,
  rootContext,
}) {
  const answer =
    safeText(
      assistantAnswer
    );

  let score = 0;
  const reasons = [];

  const uncertaintyPhrases = [
    "not enough evidence",
    "more context",
    "need more information",
    "cannot conclude",
    "can't conclude",
    "uncertain",
    "not clear",
    "does not yet tell us",
    "before deciding",
    "before any decision",
    "further evidence",
  ];

  const uncertaintyMatches =
    countMatches(
      answer,
      uncertaintyPhrases
    );

  if (
    uncertaintyMatches > 0
  ) {
    score +=
      Math.min(
        60,
        uncertaintyMatches * 15
      );

    reasons.push(
      "Root's answer contains material uncertainty that authoritative context may help clarify."
    );
  }

  if (
    rootContext?.show === true
  ) {
    score += 20;

    reasons.push(
      "Root's existing context engine detected an area where additional professional context may be relevant."
    );
  }
  const authoritativeClaimPhrases = [
  "right to privacy",
  "legal obligation",
  "legal obligations",
  "employment law",
  "data protection",
  "gdpr",
  "not permissible",
  "generally not permissible",
  "not allowed",
  "legally required",
  "must comply",
  "could violate",
  "could breach",
  "breach of",
  "reasonable adjustments",
  "equality act",
  "protected characteristic",
];

const authoritativeClaimMatches =
  countMatches(
    answer,
    authoritativeClaimPhrases
  );

if (authoritativeClaimMatches > 0) {
  score += Math.min(
    60,
    authoritativeClaimMatches * 25
  );

  reasons.push(
    "Root's answer contains legal, regulatory or rights-based language that should be checked against current authoritative guidance."
  );
}

  return {
    score:
      clampScore(score),

    reasons: [
      ...new Set(reasons),
    ],
  };
}

function calculateExistingAnswerCoverage({
  assistantAnswer,
  dimensions,
}) {
  const answer =
    safeText(
      assistantAnswer
    );

  if (!answer) {
    return 0;
  }

  let coverage = 0;

  if (
    dimensions.health.score > 0 &&
    includesAny(
      answer,
      [
        "reasonable adjustment",
        "reasonable adjustments",
        "occupational health",
        "health consideration",
      ]
    )
  ) {
    coverage += 20;
  }

  if (
    dimensions.employment.score > 0 &&
    includesAny(
      answer,
      [
        "fair opportunity",
        "procedure",
        "process",
        "evidence",
        "respond",
      ]
    )
  ) {
    coverage += 20;
  }

  if (
    dimensions.privacy.score > 0 &&
    includesAny(
      answer,
      [
        "privacy",
        "confidential",
        "personal data",
        "aggregated",
        "anonymous",
      ]
    )
  ) {
    coverage += 20;
  }

  if (
    dimensions.equality.score > 0 &&
    includesAny(
      answer,
      [
        "equality",
        "protected characteristic",
        "discrimination",
        "fair treatment",
      ]
    )
  ) {
    coverage += 20;
  }

  return clampScore(
    coverage
  );
}

function calculateVerificationNeed({
  dimensions, 
  decisionIntent,
  organisationalImpact,
  evidenceUncertainty,
  answerCoverage,
  informationalOnly,
}) {
  if (informationalOnly) {
    return 0;
  }

  const domainRisk =
    Math.max(
      dimensions.employment.score,
      dimensions.health.score,
      dimensions.equality.score,
      dimensions.privacy.score,
      dimensions.safeguarding.score,
      dimensions.whistleblowing.score,
      dimensions.policy.score
    );

  const secondaryRisk =
    [
      dimensions.employment.score,
      dimensions.health.score,
      dimensions.equality.score,
      dimensions.privacy.score,
      dimensions.safeguarding.score,
      dimensions.whistleblowing.score,
      dimensions.policy.score,
    ]
      .sort(
        (a, b) =>
          b - a
      )[1] || 0;

  let score =
    domainRisk * 0.45 +
    secondaryRisk * 0.15 +
    decisionIntent * 0.15 +
    organisationalImpact * 0.15 +
    evidenceUncertainty.score *
      0.1;

  /*
    Important:
    Ask Root may already have discussed
    the obvious considerations.

    That does NOT remove the need for
    verification where current official
    guidance could strengthen the answer.

    Coverage only makes verification
    slightly less necessary.
  */

  score -=
    answerCoverage * 0.08;

  return clampScore(score);
}

function determineEvidenceConfidence({
  verificationNeed,
  dimensions,
}) {
  const safeguarding =
    dimensions.safeguarding.score;

  if (safeguarding >= 60) {
    return {
      level: "High priority",
      label:
        "Current authoritative guidance should be checked.",
    };
  }

  if (
    verificationNeed >= 75
  ) {
    return {
      level: "Strong",
      label:
        "Current official guidance is likely to materially strengthen this conversation.",
    };
  }

  if (
    verificationNeed >= 55
  ) {
    return {
      level: "Moderate",
      label:
        "Current official guidance may add useful decision context.",
    };
  }

  return {
    level: "Low",
    label:
      "Additional verification is unlikely to add enough value to interrupt the conversation.",
  };
}

function buildSourceTypes(
  dimensions
) {
  const sourceTypes =
    new Set();

  if (
    dimensions.employment.score > 0 ||
    dimensions.whistleblowing.score > 0
  ) {
    sourceTypes.add(
      "acas"
    );

    sourceTypes.add(
      "legislation"
    );

    sourceTypes.add(
      "government_guidance"
    );
  }

  if (
    dimensions.equality.score > 0 ||
    dimensions.health.score > 0
  ) {
    sourceTypes.add(
      "equality_guidance"
    );

    sourceTypes.add(
      "acas"
    );

    sourceTypes.add(
      "government_guidance"
    );
  }

  if (
    dimensions.privacy.score > 0
  ) {
    sourceTypes.add(
      "ico"
    );

    sourceTypes.add(
      "government_guidance"
    );
  }

  if (
    dimensions.safeguarding.score > 0
  ) {
    sourceTypes.add(
      "safeguarding_guidance"
    );

    sourceTypes.add(
      "government_guidance"
    );
  }

  if (
    dimensions.policy.score > 0
  ) {
    sourceTypes.add(
      "internal_policy"
    );
  }

  return [
    ...sourceTypes,
  ];
}

function buildReasons({
  dimensions,
  evidenceUncertainty,
  decisionIntent,
  organisationalImpact,
}) {
  const reasons = [];

  Object.values(
    dimensions
  ).forEach((dimension) => {
    reasons.push(
      ...safeArray(
        dimension.reasons
      )
    );
  });

  reasons.push(
    ...safeArray(
      evidenceUncertainty.reasons
    )
  );

  if (
    decisionIntent >= 50
  ) {
    reasons.push(
      "The leader appears to be considering or preparing to make a decision rather than asking only for information."
    );
  }

  if (
    organisationalImpact >= 50
  ) {
    reasons.push(
      "The proposed action could materially affect an employee or the organisation."
    );
  }

  return [
    ...new Set(reasons),
  ].slice(0, 6);
}

export function buildRootVerificationDecision({
  userMessage = "",
  assistantAnswer = "",
  conversation = [],
  rootContext = null,
} = {}) {
  const conversationText =
    safeArray(conversation)
      .map((entry) => {
        if (
          typeof entry ===
          "string"
        ) {
          return entry;
        }

        return (
          entry?.content ||
          entry?.message ||
          entry?.text ||
          ""
        );
      })
      .join(" ");

  const text =
    safeText(
      `${conversationText} ${userMessage} ${assistantAnswer}`
    );

  if (!text) {
    return {
      shouldVerify: false,

      verificationNeed: 0,

      evidenceConfidence: {
        level: "Low",
        label:
          "There is no conversation content to verify.",
      },

      dimensions: {},

      reasons: [],

      requestedSourceTypes: [],
    };
  }

  const informationalOnly =
    includesAny(
      safeText(userMessage),
      LOW_RISK_INFORMATIONAL_PHRASES
    ) &&
    !includesAny(
      safeText(userMessage),
      HIGH_IMPACT_LANGUAGE
    );

  const dimensions = {
    employment:
      buildDimension(
        text,
        EMPLOYMENT_DECISION_GROUPS
      ),

    health:
      buildDimension(
        text,
        HEALTH_GROUPS
      ),

    equality:
      buildDimension(
        text,
        EQUALITY_GROUPS
      ),

    privacy:
      buildDimension(
        text,
        PRIVACY_GROUPS
      ),

    safeguarding:
      buildDimension(
        text,
        SAFEGUARDING_GROUPS
      ),

    whistleblowing:
      buildDimension(
        text,
        WHISTLEBLOWING_GROUPS
      ),

    policy:
      buildDimension(
        text,
        POLICY_GROUPS
      ),
  };

  const decisionIntent =
    calculateDecisionIntent(
      safeText(userMessage)
    );

  const organisationalImpact =
    calculateImpact(
      text
    );

  const evidenceUncertainty =
    calculateEvidenceUncertainty({
      assistantAnswer,
      rootContext,
    });

  const answerCoverage =
    calculateExistingAnswerCoverage({
      assistantAnswer,
      dimensions,
    });

  const verificationNeed =
    calculateVerificationNeed({
      dimensions,
      decisionIntent,
      organisationalImpact,
      evidenceUncertainty,
      answerCoverage,
      informationalOnly,
    });

  /*
    Verification threshold.

    This should deliberately be
    reasonably high.

    Root should speak less often,
    but every appearance should matter.
  */

  const shouldVerify =
    verificationNeed >= 55;

  const evidenceConfidence =
    determineEvidenceConfidence({
      verificationNeed,
      dimensions,
    });

  const requestedSourceTypes =
    shouldVerify
      ? buildSourceTypes(
          dimensions
        )
      : [];

  const reasons =
    shouldVerify
      ? buildReasons({
          dimensions,
          evidenceUncertainty,
          decisionIntent,
          organisationalImpact,
        })
      : [];

  return {
    shouldVerify,

    verificationNeed,

    informationalOnly,

    evidenceConfidence,

    decisionIntent,

    organisationalImpact,

    evidenceUncertainty:
      evidenceUncertainty.score,

    existingAnswerCoverage:
      answerCoverage,

    dimensions: {
      employment:
        dimensions.employment.score,

      health:
        dimensions.health.score,

      equality:
        dimensions.equality.score,

      privacy:
        dimensions.privacy.score,

      safeguarding:
        dimensions.safeguarding.score,

      whistleblowing:
        dimensions.whistleblowing.score,

      policy:
        dimensions.policy.score,
    },

    reasons,

    requestedSourceTypes,

    instruction:
      shouldVerify
        ? "Quietly verify the material issue against current authoritative evidence. Add only information that genuinely strengthens the existing answer."
        : "Do not interrupt the conversation with a verification card.",

    principle:
      "Root strengthens human judgement. It does not replace it.",
  };
}
