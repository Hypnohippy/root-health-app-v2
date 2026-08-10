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

function includesAny(text, terms = []) {
  return terms.some((term) =>
    text.includes(term)
  );
}

function scoreSignals({
  text,
  signals,
}) {
  let score = 0;

  signals.forEach((signal) => {
    if (
      includesAny(
        text,
        signal.terms
      )
    ) {
      score +=
        signal.weight || 1;
    }
  });

  return score;
}

const CONTEXT_AREAS = [
  {
    key: "dismissal",
    label: "Employment considerations",
    icon: "⚖️",

    signals: [
      {
        weight: 3,
        terms: [
          "dismiss",
          "dismissal",
          "terminate employment",
          "termination",
          "sack",
          "fire them",
          "fire him",
          "fire her",
        ],
      },

      {
        weight: 2,
        terms: [
          "capability",
          "conduct",
          "gross misconduct",
          "performance procedure",
          "disciplinary",
        ],
      },
    ],

    reflectionQuestions: [
      "What evidence supports the concern?",
      "Has the employee had a fair opportunity to understand and respond to it?",
      "Have relevant organisational procedures been followed?",
      "Are there health, disability, equality or adjustment considerations that should be explored?",
      "Would the proposed approach be consistent with comparable situations?",
    ],
  },

  {
    key: "redundancy",
    label: "Redundancy considerations",
    icon: "⚖️",

    signals: [
      {
        weight: 3,
        terms: [
          "redundancy",
          "redundant",
          "role at risk",
          "roles at risk",
          "selection pool",
          "selection criteria",
          "restructure",
          "restructuring",
        ],
      },
    ],

    reflectionQuestions: [
      "What organisational evidence supports the proposed change?",
      "How will any selection criteria be defined and applied consistently?",
      "What consultation may be appropriate before decisions are made?",
      "Have reasonable alternatives been considered?",
      "Could the proposed approach affect particular groups differently?",
    ],
  },

  {
    key: "discrimination",
    label: "Equality considerations",
    icon: "⚖️",

    signals: [
      {
        weight: 3,
        terms: [
          "discrimination",
          "discriminate",
          "protected characteristic",
          "race",
          "religion",
          "sex discrimination",
          "sexual orientation",
          "gender reassignment",
          "pregnancy",
          "maternity",
          "age discrimination",
          "marriage",
          "civil partnership",
        ],
      },

      {
        weight: 2,
        terms: [
          "treat differently",
          "treated differently",
          "because of their age",
          "because of her age",
          "because of his age",
        ],
      },
    ],

    reflectionQuestions: [
      "Could this decision affect someone because of a protected characteristic?",
      "Is the same approach being applied consistently to comparable situations?",
      "Could apparently neutral criteria disadvantage a particular group?",
      "What evidence supports the proposed distinction?",
      "Would additional HR or legal review strengthen confidence before acting?",
    ],
  },

  {
    key: "disability_adjustments",
    label: "Health and adjustment considerations",
    icon: "❤️",

    signals: [
      {
        weight: 3,
        terms: [
          "reasonable adjustment",
          "reasonable adjustments",
          "disability",
          "disabled employee",
          "long term condition",
          "long-term condition",
          "mental health condition",
        ],
      },

      {
        weight: 2,
        terms: [
          "depression",
          "anxiety disorder",
          "autism",
          "adhd",
          "occupational health",
          "return to work",
          "phased return",
        ],
      },
    ],

    reflectionQuestions: [
      "Has the employee been given an opportunity to explain what support may help?",
      "Could reasonable adjustments remove or reduce the difficulty?",
      "Would occupational-health or specialist input add useful evidence?",
      "Are assumptions being made about capability because of a health condition?",
      "Has the organisation documented what has been explored and why?",
    ],
  },

  {
    key: "absence_capability",
    label: "Absence and capability considerations",
    icon: "🍃",

    signals: [
      {
        weight: 3,
        terms: [
          "sickness absence",
          "long term absence",
          "long-term absence",
          "absence management",
          "capability process",
          "medical capability",
        ],
      },

      {
        weight: 2,
        terms: [
          "too much sick leave",
          "keeps going off sick",
          "attendance problem",
          "attendance issue",
        ],
      },
    ],

    reflectionQuestions: [
      "What does the attendance evidence actually show?",
      "Is there relevant medical or occupational-health evidence?",
      "Could disability or reasonable-adjustment considerations apply?",
      "Has support been explored before formal capability action?",
      "Is the proposed response proportionate to the evidence available?",
    ],
  },

  {
    key: "disciplinary_grievance",
    label: "Fair-process considerations",
    icon: "⚖️",

    signals: [
      {
        weight: 3,
        terms: [
          "disciplinary",
          "grievance",
          "misconduct",
          "gross misconduct",
          "investigation meeting",
          "disciplinary hearing",
          "appeal",
        ],
      },
    ],

    reflectionQuestions: [
      "What facts have been established and what remains uncertain?",
      "Has the individual had an opportunity to respond?",
      "Are investigation and decision-making responsibilities appropriately separated?",
      "Has relevant organisational procedure been followed consistently?",
      "Is the proposed response proportionate to the evidence?",
    ],
  },

  {
    key: "bullying_harassment",
    label: "Dignity-at-work considerations",
    icon: "❤️",

    signals: [
      {
        weight: 3,
        terms: [
          "bullying",
          "harassment",
          "sexual harassment",
          "victimisation",
          "hostile environment",
          "intimidation",
        ],
      },
    ],

    reflectionQuestions: [
      "What has actually been reported and by whom?",
      "What evidence should be gathered before conclusions are formed?",
      "How can all parties be treated fairly while the concern is examined?",
      "Are confidentiality and protection from retaliation being considered?",
      "Does the matter require formal escalation under organisational procedure?",
    ],
  },

  {
    key: "whistleblowing",
    label: "Speaking-up considerations",
    icon: "⚖️",

    signals: [
      {
        weight: 3,
        terms: [
          "whistleblowing",
          "whistleblower",
          "protected disclosure",
          "reported wrongdoing",
          "raised wrongdoing",
        ],
      },
    ],

    reflectionQuestions: [
      "Could the concern amount to a protected disclosure?",
      "Who needs to know about the concern and who does not?",
      "How will the person raising the concern be protected from retaliation?",
      "What independent investigation or escalation may be appropriate?",
      "Are employment and organisational procedures being considered separately from the underlying allegation?",
    ],
  },

  {
    key: "privacy",
    label: "Privacy considerations",
    icon: "🛡️",

    signals: [
      {
        weight: 3,
        terms: [
          "medical information",
          "medical records",
          "health information",
          "health data",
          "personal data",
          "gdpr",
          "data protection",
          "confidential information",
        ],
      },

      {
        weight: 3,
        terms: [
          "identify the employees",
          "identify employees",
          "who said",
          "who reported",
          "show me individual",
          "individual responses",
          "individual wellbeing",
        ],
      },
    ],

    reflectionQuestions: [
      "Is individual information genuinely necessary for the purpose being considered?",
      "Could the same objective be achieved using anonymous or aggregated evidence?",
      "Who genuinely needs access to the information?",
      "Has the purpose for using the information been made clear?",
      "Could disclosure undermine employee trust or Root's privacy commitments?",
    ],
  },

  {
    key: "flexible_working",
    label: "Working-arrangement considerations",
    icon: "🍃",

    signals: [
      {
        weight: 3,
        terms: [
          "flexible working",
          "work from home request",
          "working from home request",
          "change my hours",
          "change their hours",
          "compressed hours",
          "part time request",
          "part-time request",
        ],
      },
    ],

    reflectionQuestions: [
      "What exactly is being requested?",
      "What evidence supports any operational concerns?",
      "Have alternatives or modifications been explored?",
      "Could health, disability or caring circumstances also be relevant?",
      "Would documenting the reasoning improve fairness and consistency?",
    ],
  },

  {
    key: "performance",
    label: "Performance considerations",
    icon: "🍃",

    signals: [
      {
        weight: 2,
        terms: [
          "performance improvement plan",
          "pip",
          "poor performance",
          "underperforming",
          "performance issue",
          "performance problem",
        ],
      },

      {
        weight: 1,
        terms: [
          "targets",
          "objectives",
          "performance review",
        ],
      },
    ],

    reflectionQuestions: [
      "What objective evidence demonstrates the performance concern?",
      "Were expectations clear and achievable?",
      "Has appropriate support or feedback already been provided?",
      "Could health, workload, management or organisational conditions be contributing?",
      "What would a fair opportunity to improve look like?",
    ],
  },
];

const HUMAN_DECISION_PATTERNS = [
  "who should we dismiss",
  "who should i dismiss",
  "who should we fire",
  "who should i fire",
  "who should be made redundant",
  "who should we make redundant",
  "which employee should",
  "which person should",
  "who should lose their job",
  "choose who",
];

function humanDecisionBoundary(text) {
  const matched =
    HUMAN_DECISION_PATTERNS.find(
      (pattern) =>
        text.includes(pattern)
    );

  if (!matched) {
    return {
      triggered: false,
      message: "",
    };
  }

  return {
    triggered: true,

    message:
      "Root can help examine the evidence, identify relevant considerations and compare possible approaches, but the employment decision itself must remain with the organisation and the people responsible for it.",
  };
}

function buildOrganisationSummary(
  organisationContext
) {
  if (!organisationContext) {
    return null;
  }

  const unitSummaries =
    safeArray(
      organisationContext?.structure
        ?.unitSummaries
    );

  return {
    organisationName:
      organisationContext
        ?.organisation?.name ||
      null,

    unitCount:
      Number(
        organisationContext
          ?.structure?.unitCount || 0
      ),

    employeeCount:
      Number(
        organisationContext
          ?.people?.employeeCount || 0
      ),

    activatedEmployeeCount:
      Number(
        organisationContext
          ?.people
          ?.activatedEmployeeCount || 0
      ),

    baselineCompletedCount:
      Number(
        organisationContext
          ?.people
          ?.baselineCompletedCount || 0
      ),

    participationRate:
      Number(
        organisationContext
          ?.people
          ?.participationRate || 0
      ),

    hrAdministratorCount:
      safeArray(
        organisationContext
          ?.people?.hrAdmins
      ).length,

    organisationAdministratorCount:
      safeArray(
        organisationContext
          ?.people
          ?.organisationAdmins
      ).length,

    units:
      unitSummaries.map(
        (unit) => ({
          id:
            unit.id || null,

          name:
            unit.name ||
            "Organisational unit",

          unitType:
            unit.unit_type ||
            "other",

          employeeCount:
            Number(
              unit.employee_count || 0
            ),

          hrUserCount:
            Number(
              unit.hr_user_count || 0
            ),

          participationRate:
            Number(
              unit.participation_rate ||
                0
            ),

          descendantUnitCount:
            safeArray(
              unit.descendant_unit_ids
            ).length,
        })
      ),
  };
}

export function buildRootContext({
  userMessage = "",
  assistantAnswer = "",
  conversation = [],
  organisationContext = null,
} = {}) {
  const conversationText =
    safeArray(conversation)
      .map((item) => {
        if (
          typeof item === "string"
        ) {
          return item;
        }

        return (
          item?.content ||
          item?.message ||
          item?.text ||
          ""
        );
      })
      .join(" ");

  const combinedText =
    safeText(
      `${conversationText} ${userMessage} ${assistantAnswer}`
    );

  if (!combinedText) {
    return {
      show: false,

      areas: [],

      humanDecisionBoundary: {
        triggered: false,
        message: "",
      },

      organisation:
        buildOrganisationSummary(
          organisationContext
        ),
    };
  }

  const matchedAreas =
    CONTEXT_AREAS
      .map((area) => {
        const score =
          scoreSignals({
            text: combinedText,
            signals:
              area.signals,
          });

        return {
          key:
            area.key,

          label:
            area.label,

          icon:
            area.icon,

          score,

          reflectionQuestions:
            area.reflectionQuestions,
        };
      })
      .filter(
        (area) =>
          area.score >= 2
      )
      .sort(
        (a, b) =>
          b.score - a.score
      )
      .slice(0, 3);

  const boundary =
    humanDecisionBoundary(
      combinedText
    );

  const show =
    matchedAreas.length > 0 ||
    boundary.triggered;

  return {
    show,

    tone:
      "warm_advisory",

    title:
      "Root noticed something that may help",

    introduction:
      "There may be some additional context worth considering before you decide what to do next.",

    areas:
      matchedAreas,

    humanDecisionBoundary:
      boundary,

    organisation:
      buildOrganisationSummary(
        organisationContext
      ),

    sourceRequest:
      show
        ? {
            required: true,

            current: true,

            jurisdiction:
              "resolve_from_organisation_or_user",

            authoritativeOnly:
              true,

            preferredSourceTypes: [
              "legislation",
              "government_guidance",
              "acas",
              "ico",
              "hse",
              "equality_guidance",
            ],

            areaKeys:
              matchedAreas.map(
                (area) =>
                  area.key
              ),
          }
        : {
            required: false,
          },
  };
}
