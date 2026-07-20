/**
 * Root Core — Measure Registry
 *
 * Constructs define what Root understands.
 * Measures define how Root observes those constructs.
 *
 * A measure is not a user's recorded answer.
 *
 * It is the permanent definition of:
 * - what Root asks
 * - which construct the question observes
 * - how the answer is scored
 * - which direction represents improvement
 * - whether the measure may contribute to progress and research
 *
 * Recorded answers are handled separately by:
 *
 *   rootMeasurementEngine.js
 *
 * Root remains non-diagnostic.
 * These measures support reflection, longitudinal understanding and
 * learning about what appears to help each individual.
 */

import {
  ROOT_CONSTRUCT_IDS,
  ROOT_SCORE_DIRECTIONS,
  getRootConstruct,
  getConstructMeasurementIdentity,
} from "./rootConstructs";

export const ROOT_MEASURE_SCHEMA_VERSION = "1.0.0";

/**
 * Permanent measure identifiers.
 *
 * These IDs may eventually appear in:
 * - database records
 * - exports
 * - organisation reports
 * - longitudinal models
 * - research datasets
 *
 * Never rename or reuse an ID after it has been stored.
 */
export const ROOT_MEASURE_IDS = Object.freeze({
  /*
   * Existing Root check-in
   */
  CHECKIN_STRESS: "checkin_stress",

  CHECKIN_SLEEP_DIFFICULTY:
    "checkin_sleep_difficulty",

  CHECKIN_RECOVERY_DIFFICULTY:
    "checkin_recovery_difficulty",

  CHECKIN_ENERGY_DIFFICULTY:
    "checkin_energy_difficulty",

  CHECKIN_MOOD_DIFFICULTY:
    "checkin_mood_difficulty",

  CHECKIN_FOCUS_DIFFICULTY:
    "checkin_focus_difficulty",

  CHECKIN_BURNOUT_LOAD:
    "checkin_burnout_load",

  /*
   * Human capacities
   */
  HOPE_CAPACITY: "hope_capacity",

  PURPOSE_STRENGTH: "purpose_strength",

  BELONGING_STRENGTH:
    "belonging_strength",

  MEANINGFUL_ENGAGEMENT:
    "meaningful_engagement",

  DECISION_CONFIDENCE:
    "decision_confidence",

  SELF_UNDERSTANDING:
    "self_understanding",
});

/**
 * The format of the observation.
 */
export const ROOT_MEASURE_TYPES = Object.freeze({
  NUMERIC_SCALE: "numeric_scale",
  BINARY: "binary",
  CATEGORY: "category",
  COUNT: "count",
  DURATION: "duration",
  QUANTITY: "quantity",
  TEXT_SIGNAL: "text_signal",
  BODY_SIGNAL: "body_signal",
  PASSIVE_SIGNAL: "passive_signal",
  COMPOSITE: "composite",
});

/**
 * Where the observation originated.
 */
export const ROOT_MEASURE_SOURCES = Object.freeze({
  CHECK_IN: "check_in",
  ASSESSMENT: "assessment",
  COACH: "coach",
  JOURNAL: "journal",
  MIND: "mind",
  BODY: "body",
  PLAYBOOK: "playbook",
  INTERVENTION: "intervention",
  USER_ENTRY: "user_entry",
  DEVICE: "device",
  IMPORT: "import",
  RESEARCH: "research",
});

/**
 * The measure's role within Root.
 */
export const ROOT_MEASURE_ROLES = Object.freeze({
  PRIMARY: "primary",
  SUPPORTING: "supporting",
  CONTEXTUAL: "contextual",
  OUTCOME: "outcome",
  SAFETY: "safety",
  RESEARCH_ONLY: "research_only",
});

/**
 * Suggested measurement frequency.
 *
 * This is guidance for Root.
 * It must never become pressure placed on the user.
 */
export const ROOT_MEASURE_CADENCES = Object.freeze({
  MOMENTARY: "momentary",
  DAILY: "daily",
  WEEKLY: "weekly",
  MONTHLY: "monthly",
  PERIODIC: "periodic",
  EVENT_BASED: "event_based",
  BEFORE_AFTER: "before_after",
  CONTINUOUS: "continuous",
  USER_LED: "user_led",
});

/**
 * How Root obtains the observation.
 */
export const ROOT_MEASURE_APPROACHES = Object.freeze({
  DIRECT: "direct",
  REFLECTIVE: "reflective",
  CONVERSATIONAL: "conversational",
  OBSERVATIONAL: "observational",
  PASSIVE: "passive",
  IMPORTED: "imported",
  COMPOSITE: "composite",
});

/**
 * How change should normally be interpreted.
 */
export const ROOT_CHANGE_DIRECTIONS = Object.freeze({
  LOWER_IS_BETTER: "lower_is_better",
  HIGHER_IS_BETTER: "higher_is_better",
  TARGET_RANGE: "target_range",
  CONTEXT_DEPENDENT: "context_dependent",
  NO_DIRECTION: "no_direction",
});

/**
 * How a raw response is converted into a stored score.
 */
export const ROOT_SCORING_METHODS = Object.freeze({
  DIRECT: "direct",
  REVERSED: "reversed",
  NORMALISED: "normalised",
  CATEGORISED: "categorised",
  COMPOSITE_MEAN: "composite_mean",
  COMPOSITE_SUM: "composite_sum",
  SIGNAL_ONLY: "signal_only",
  HUMAN_REVIEW: "human_review",
});

/**
 * Used later for privacy, exports and access controls.
 */
export const ROOT_DATA_SENSITIVITY = Object.freeze({
  STANDARD: "standard",
  PERSONAL: "personal",
  SENSITIVE: "sensitive",
  HIGHLY_SENSITIVE: "highly_sensitive",
});

/**
 * Safely reads a score direction from rootConstructs.js.
 *
 * The fallback protects Root if the construct registry uses a compatible
 * string but does not expose every constant directly.
 */
function scoreDirection(key, fallback) {
  return ROOT_SCORE_DIRECTIONS?.[key] || fallback;
}

const GREATER_DIFFICULTY = scoreDirection(
  "GREATER_DIFFICULTY",
  "greater_difficulty"
);

const GREATER_STRENGTH = scoreDirection(
  "GREATER_STRENGTH",
  "greater_strength"
);

/**
 * Finds the first valid construct ID.
 *
 * This supports small naming differences while the Root Core registry
 * continues to mature.
 */
function constructId(...possibleIds) {
  const matchedId = possibleIds.find(
    (value) =>
      typeof value === "string" &&
      value.trim().length > 0
  );

  return matchedId || null;
}

/**
 * Recursively freezes registry data.
 *
 * Measure definitions must not be mutated at runtime because their permanent
 * identity may later be used in reports and longitudinal comparisons.
 */
function deepFreeze(value) {
  if (
    !value ||
    typeof value !== "object" ||
    Object.isFrozen(value)
  ) {
    return value;
  }

  Object.freeze(value);

  Object.values(value).forEach((child) => {
    deepFreeze(child);
  });

  return value;
}

/**
 * Builds one permanent measure definition.
 */
function measure({
  id,
  permanentId,
  constructId: linkedConstructId,

  title,
  userLabel,
  question,
  description,

  type = ROOT_MEASURE_TYPES.NUMERIC_SCALE,
  source,
  role = ROOT_MEASURE_ROLES.PRIMARY,
  cadence = ROOT_MEASURE_CADENCES.USER_LED,
  approach = ROOT_MEASURE_APPROACHES.DIRECT,

  minimum = null,
  maximum = null,
  step = null,
  anchors = null,
  unit = null,

  scoreDirection: linkedScoreDirection,
  changeDirection,
  scoringMethod = ROOT_SCORING_METHODS.DIRECT,
  meaningfulChange = null,
  targetRange = null,

  timeWindow = null,
  contextualFields = [],

  interventionEligible = true,
  progressEligible = true,
  organisationEligible = true,
  researchEligible = true,

  userVisible = true,
  requiresConsent = false,
  clinicalBoundary = false,

  sensitivity =
    ROOT_DATA_SENSITIVITY.PERSONAL,

  active = true,
  metadata = {},
}) {
  if (!id) {
    throw new Error(
      "Every Root measure requires an ID."
    );
  }

  if (!permanentId) {
    throw new Error(
      `Root measure "${id}" requires a permanent ID.`
    );
  }

  if (!linkedConstructId) {
    throw new Error(
      `Root measure "${id}" requires a construct ID.`
    );
  }

  if (!title) {
    throw new Error(
      `Root measure "${id}" requires a title.`
    );
  }

  if (!question) {
    throw new Error(
      `Root measure "${id}" requires a question.`
    );
  }

  if (!linkedScoreDirection) {
    throw new Error(
      `Root measure "${id}" requires a score direction.`
    );
  }

  return deepFreeze({
    id,
    permanentId,
    constructId: linkedConstructId,

    title,
    userLabel: userLabel || title,
    question,
    description: description || null,

    type,
    source,
    role,
    cadence,
    approach,

    scale: {
      minimum,
      maximum,
      step,
      anchors,
      unit,
    },

    scoring: {
      scoreDirection: linkedScoreDirection,
      changeDirection,
      scoringMethod,
      meaningfulChange,
      targetRange,
    },

    timeWindow,

    contextualFields: [
      ...new Set(
        Array.isArray(contextualFields)
          ? contextualFields.filter(Boolean)
          : []
      ),
    ],

    eligibility: {
      intervention: interventionEligible,
      progress: progressEligible,
      organisation: organisationEligible,
      research: researchEligible,
    },

    governance: {
      userVisible,
      requiresConsent,
      clinicalBoundary,
      sensitivity,
    },

    active,
    metadata,
  });
}

/**
 * Shared scale anchors.
 */
const DIFFICULTY_ANCHORS = Object.freeze({
  0: "No difficulty",
  2: "Slight",
  5: "Noticeable",
  7: "High",
  10: "Severe",
});

const STRENGTH_ANCHORS = Object.freeze({
  0: "Not present",
  2: "A little",
  5: "Moderate",
  7: "Strong",
  10: "Very strong",
});

/**
 * Permanent Root Measure Registry
 */
export const ROOT_MEASURES = Object.freeze({
  /*
   * ================================================================
   * ROOT CHECK-IN
   * ================================================================
   */

  [ROOT_MEASURE_IDS.CHECKIN_STRESS]: measure({
    id: ROOT_MEASURE_IDS.CHECKIN_STRESS,
    permanentId: "ROOT-MEA-000001",

    constructId: constructId(
      ROOT_CONSTRUCT_IDS?.STRESS_LOAD,
      ROOT_CONSTRUCT_IDS?.STRESS,
      "stress_load"
    ),

    title: "Root Check-In Stress",
    userLabel: "Stress",

    question:
      "How overwhelmed do you feel?",

    description:
      "A direct user rating of current perceived stress load.",

    source: ROOT_MEASURE_SOURCES.CHECK_IN,
    cadence: ROOT_MEASURE_CADENCES.DAILY,
    approach:
      ROOT_MEASURE_APPROACHES.DIRECT,

    minimum: 0,
    maximum: 10,
    step: 1,

    anchors: {
      0: "Calm",
      5: "Under pressure",
      10: "Overwhelmed",
    },

    scoreDirection: GREATER_DIFFICULTY,

    changeDirection:
      ROOT_CHANGE_DIRECTIONS
        .LOWER_IS_BETTER,

    meaningfulChange: 2,
    timeWindow: "right_now",

    contextualFields: [
      "context",
      "recent_demand",
      "what_helped",
    ],
  }),

  [ROOT_MEASURE_IDS
    .CHECKIN_SLEEP_DIFFICULTY]: measure({
    id:
      ROOT_MEASURE_IDS
        .CHECKIN_SLEEP_DIFFICULTY,

    permanentId: "ROOT-MEA-000002",

    constructId: constructId(
      ROOT_CONSTRUCT_IDS?.SLEEP_DIFFICULTY,
      ROOT_CONSTRUCT_IDS?.SLEEP_QUALITY,
      ROOT_CONSTRUCT_IDS?.SLEEP,
      "sleep_difficulty"
    ),

    title:
      "Root Check-In Sleep Difficulty",

    userLabel: "Sleep Difficulties",

    question:
      "How difficult has sleep felt?",

    description:
      "A direct rating of recent difficulty falling asleep, remaining asleep or feeling restored by sleep.",

    source: ROOT_MEASURE_SOURCES.CHECK_IN,
    cadence: ROOT_MEASURE_CADENCES.DAILY,
    approach:
      ROOT_MEASURE_APPROACHES.DIRECT,

    minimum: 0,
    maximum: 10,
    step: 1,

    anchors: {
      0: "Good",
      5: "Disrupted",
      10: "Very poor",
    },

    scoreDirection: GREATER_DIFFICULTY,

    changeDirection:
      ROOT_CHANGE_DIRECTIONS
        .LOWER_IS_BETTER,

    meaningfulChange: 2,
    timeWindow: "recent_sleep",

    contextualFields: [
      "sleep_duration",
      "sleep_disruption",
      "bedtime",
      "wake_time",
      "what_helped",
    ],
  }),

  [ROOT_MEASURE_IDS
    .CHECKIN_RECOVERY_DIFFICULTY]: measure({
    id:
      ROOT_MEASURE_IDS
        .CHECKIN_RECOVERY_DIFFICULTY,

    permanentId: "ROOT-MEA-000003",

    constructId: constructId(
      ROOT_CONSTRUCT_IDS
        ?.RECOVERY_DIFFICULTY,
      ROOT_CONSTRUCT_IDS
        ?.RECOVERY_CAPACITY,
      ROOT_CONSTRUCT_IDS?.RECOVERY,
      "recovery_difficulty"
    ),

    title:
      "Root Check-In Recovery Difficulty",

    userLabel: "Recovery Difficulty",

    question:
      "How difficult does recovery feel?",

    description:
      "A direct rating of how physically and emotionally recovered the user currently feels.",

    source: ROOT_MEASURE_SOURCES.CHECK_IN,
    cadence: ROOT_MEASURE_CADENCES.DAILY,
    approach:
      ROOT_MEASURE_APPROACHES.DIRECT,

    minimum: 0,
    maximum: 10,
    step: 1,

    anchors: {
      0: "Recovered",
      5: "Still recovering",
      10: "Exhausted",
    },

    scoreDirection: GREATER_DIFFICULTY,

    changeDirection:
      ROOT_CHANGE_DIRECTIONS
        .LOWER_IS_BETTER,

    meaningfulChange: 2,
    timeWindow: "right_now",

    contextualFields: [
      "recent_activity",
      "rest",
      "sleep",
      "physical_load",
      "emotional_load",
      "what_helped",
    ],
  }),

  [ROOT_MEASURE_IDS
    .CHECKIN_ENERGY_DIFFICULTY]: measure({
    id:
      ROOT_MEASURE_IDS
        .CHECKIN_ENERGY_DIFFICULTY,

    permanentId: "ROOT-MEA-000004",

    constructId: constructId(
      ROOT_CONSTRUCT_IDS?.PHYSICAL_ENERGY,
      ROOT_CONSTRUCT_IDS?.ENERGY,
      ROOT_CONSTRUCT_IDS?.ENERGY_CAPACITY,
      "physical_energy"
    ),

    title:
      "Root Check-In Energy Difficulty",

    userLabel: "Energy",

    question:
      "How drained do you feel?",

    description:
      "A difficulty-framed observation of current energy. Although the underlying construct is a human capacity, the visible Root check-in records depletion.",

    source: ROOT_MEASURE_SOURCES.CHECK_IN,
    cadence: ROOT_MEASURE_CADENCES.DAILY,
    approach:
      ROOT_MEASURE_APPROACHES.DIRECT,

    minimum: 0,
    maximum: 10,
    step: 1,

    anchors: {
      0: "Energised",
      5: "Low energy",
      10: "Drained",
    },

    /*
     * This measure is intentionally difficulty-scored even where the
     * underlying construct represents energy as a strength.
     */
    scoreDirection: GREATER_DIFFICULTY,

    changeDirection:
      ROOT_CHANGE_DIRECTIONS
        .LOWER_IS_BETTER,

    meaningfulChange: 2,
    timeWindow: "right_now",

    contextualFields: [
      "sleep",
      "nutrition",
      "movement",
      "workload",
      "illness",
      "what_helped",
    ],

    metadata: {
      framing:
        "difficulty_measure_of_strength_construct",
    },
  }),

  [ROOT_MEASURE_IDS
    .CHECKIN_MOOD_DIFFICULTY]: measure({
    id:
      ROOT_MEASURE_IDS
        .CHECKIN_MOOD_DIFFICULTY,

    permanentId: "ROOT-MEA-000005",

    constructId: constructId(
      ROOT_CONSTRUCT_IDS?.MOOD_DIFFICULTY,
      ROOT_CONSTRUCT_IDS?.MOOD,
      ROOT_CONSTRUCT_IDS
        ?.EMOTIONAL_WELLBEING,
      "mood"
    ),

    title:
      "Root Check-In Mood Difficulty",

    userLabel: "Mood",

    question:
      "How low does your mood feel?",

    description:
      "A direct, non-diagnostic rating of current low mood or emotional heaviness.",

    source: ROOT_MEASURE_SOURCES.CHECK_IN,
    cadence: ROOT_MEASURE_CADENCES.DAILY,
    approach:
      ROOT_MEASURE_APPROACHES.DIRECT,

    minimum: 0,
    maximum: 10,
    step: 1,

    anchors: {
      0: "Positive",
      5: "Low",
      10: "Very low",
    },

    scoreDirection: GREATER_DIFFICULTY,

    changeDirection:
      ROOT_CHANGE_DIRECTIONS
        .LOWER_IS_BETTER,

    meaningfulChange: 2,
    timeWindow: "right_now",

    contextualFields: [
      "dominant_feeling",
      "recent_event",
      "social_context",
      "what_helped",
    ],

    clinicalBoundary: true,
    sensitivity:
      ROOT_DATA_SENSITIVITY.SENSITIVE,
  }),

  [ROOT_MEASURE_IDS
    .CHECKIN_FOCUS_DIFFICULTY]: measure({
    id:
      ROOT_MEASURE_IDS
        .CHECKIN_FOCUS_DIFFICULTY,

    permanentId: "ROOT-MEA-000006",

    constructId: constructId(
      ROOT_CONSTRUCT_IDS?.FOCUS_DIFFICULTY,
      ROOT_CONSTRUCT_IDS?.FOCUS,
      ROOT_CONSTRUCT_IDS
        ?.COGNITIVE_FOCUS,
      "focus"
    ),

    title:
      "Root Check-In Focus Difficulty",

    userLabel: "Focus",

    question:
      "How scattered does your focus feel?",

    description:
      "A direct rating of current difficulty maintaining attention and mental clarity.",

    source: ROOT_MEASURE_SOURCES.CHECK_IN,
    cadence: ROOT_MEASURE_CADENCES.DAILY,
    approach:
      ROOT_MEASURE_APPROACHES.DIRECT,

    minimum: 0,
    maximum: 10,
    step: 1,

    anchors: {
      0: "Clear",
      5: "Distracted",
      10: "Scattered",
    },

    scoreDirection: GREATER_DIFFICULTY,

    changeDirection:
      ROOT_CHANGE_DIRECTIONS
        .LOWER_IS_BETTER,

    meaningfulChange: 2,
    timeWindow: "right_now",

    contextualFields: [
      "task",
      "interruptions",
      "sleep",
      "stress",
      "environment",
      "what_helped",
    ],
  }),

  [ROOT_MEASURE_IDS
    .CHECKIN_BURNOUT_LOAD]: measure({
    id:
      ROOT_MEASURE_IDS
        .CHECKIN_BURNOUT_LOAD,

    permanentId: "ROOT-MEA-000007",

    constructId: constructId(
      ROOT_CONSTRUCT_IDS?.BURNOUT_LOAD,
      ROOT_CONSTRUCT_IDS?.BURNOUT,
      ROOT_CONSTRUCT_IDS
        ?.OCCUPATIONAL_BURNOUT,
      "burnout_load"
    ),

    title: "Root Check-In Burnout Load",

    userLabel: "Burnout",

    question:
      "How severe does burnout feel?",

    description:
      "A reflective, non-diagnostic rating of perceived burnout load, depletion and reduced capacity.",

    source: ROOT_MEASURE_SOURCES.CHECK_IN,
    cadence: ROOT_MEASURE_CADENCES.WEEKLY,
    approach:
      ROOT_MEASURE_APPROACHES.REFLECTIVE,

    minimum: 0,
    maximum: 10,
    step: 1,

    anchors: {
      0: "None",
      5: "Noticeable",
      10: "Severe",
    },

    scoreDirection: GREATER_DIFFICULTY,

    changeDirection:
      ROOT_CHANGE_DIRECTIONS
        .LOWER_IS_BETTER,

    meaningfulChange: 2,
    timeWindow: "recent_days",

    contextualFields: [
      "workload",
      "control",
      "recognition",
      "relationships",
      "recovery",
      "purpose",
      "what_helped",
    ],

    clinicalBoundary: true,
    sensitivity:
      ROOT_DATA_SENSITIVITY.SENSITIVE,
  }),

  /*
   * ================================================================
   * HUMAN CAPACITIES
   * ================================================================
   */

  [ROOT_MEASURE_IDS.HOPE_CAPACITY]: measure({
    id: ROOT_MEASURE_IDS.HOPE_CAPACITY,
    permanentId: "ROOT-MEA-000008",

    constructId: constructId(
      ROOT_CONSTRUCT_IDS?.HOPE_CAPACITY,
      ROOT_CONSTRUCT_IDS?.HOPE,
      "hope"
    ),

    title: "Hope Capacity",
    userLabel: "Hope",

    question:
      "How much hope can you feel right now?",

    description:
      "A reflective rating of the user's felt capacity to imagine that something worthwhile remains possible.",

    source:
      ROOT_MEASURE_SOURCES.ASSESSMENT,

    cadence: ROOT_MEASURE_CADENCES.WEEKLY,
    approach:
      ROOT_MEASURE_APPROACHES.REFLECTIVE,

    minimum: 0,
    maximum: 10,
    step: 1,
    anchors: STRENGTH_ANCHORS,

    scoreDirection: GREATER_STRENGTH,

    changeDirection:
      ROOT_CHANGE_DIRECTIONS
        .HIGHER_IS_BETTER,

    meaningfulChange: 2,
    timeWindow: "right_now",

    contextualFields: [
      "future_outlook",
      "support",
      "recent_change",
      "what_strengthened_hope",
    ],

    sensitivity:
      ROOT_DATA_SENSITIVITY.SENSITIVE,

    clinicalBoundary: true,
  }),

  [ROOT_MEASURE_IDS.PURPOSE_STRENGTH]: measure({
    id: ROOT_MEASURE_IDS.PURPOSE_STRENGTH,
    permanentId: "ROOT-MEA-000009",

    constructId: constructId(
      ROOT_CONSTRUCT_IDS?.PURPOSE_STRENGTH,
      ROOT_CONSTRUCT_IDS?.PURPOSE,
      "purpose"
    ),

    title: "Purpose Strength",
    userLabel: "Purpose",

    question:
      "How connected do you feel to a sense of purpose?",

    description:
      "A reflective rating of connection to direction, contribution and reasons for continuing to engage with life.",

    source:
      ROOT_MEASURE_SOURCES.ASSESSMENT,

    cadence:
      ROOT_MEASURE_CADENCES.PERIODIC,

    approach:
      ROOT_MEASURE_APPROACHES.REFLECTIVE,

    minimum: 0,
    maximum: 10,
    step: 1,
    anchors: STRENGTH_ANCHORS,

    scoreDirection: GREATER_STRENGTH,

    changeDirection:
      ROOT_CHANGE_DIRECTIONS
        .HIGHER_IS_BETTER,

    meaningfulChange: 2,
    timeWindow: "recent_weeks",

    contextualFields: [
      "values",
      "contribution",
      "responsibility",
      "direction",
      "what_feels_worthwhile",
    ],
  }),

  [ROOT_MEASURE_IDS
    .BELONGING_STRENGTH]: measure({
    id:
      ROOT_MEASURE_IDS
        .BELONGING_STRENGTH,

    permanentId: "ROOT-MEA-000010",

    constructId: constructId(
      ROOT_CONSTRUCT_IDS
        ?.BELONGING_STRENGTH,
      ROOT_CONSTRUCT_IDS?.BELONGING,
      ROOT_CONSTRUCT_IDS
        ?.SOCIAL_BELONGING,
      "belonging"
    ),

    title: "Belonging Strength",
    userLabel: "Belonging",

    question:
      "How strongly do you feel that you belong?",

    description:
      "A reflective rating of felt connection, acceptance and having a place among other people.",

    source:
      ROOT_MEASURE_SOURCES.ASSESSMENT,

    cadence: ROOT_MEASURE_CADENCES.WEEKLY,
    approach:
      ROOT_MEASURE_APPROACHES.REFLECTIVE,

    minimum: 0,
    maximum: 10,
    step: 1,
    anchors: STRENGTH_ANCHORS,

    scoreDirection: GREATER_STRENGTH,

    changeDirection:
      ROOT_CHANGE_DIRECTIONS
        .HIGHER_IS_BETTER,

    meaningfulChange: 2,
    timeWindow: "recent_days",

    contextualFields: [
      "relationships",
      "community",
      "workplace",
      "family",
      "isolation",
      "where_belonging_was_felt",
    ],

    sensitivity:
      ROOT_DATA_SENSITIVITY.SENSITIVE,
  }),

  [ROOT_MEASURE_IDS
    .MEANINGFUL_ENGAGEMENT]: measure({
    id:
      ROOT_MEASURE_IDS
        .MEANINGFUL_ENGAGEMENT,

    permanentId: "ROOT-MEA-000011",

    constructId: constructId(
      ROOT_CONSTRUCT_IDS
        ?.MEANINGFUL_ENGAGEMENT,
      ROOT_CONSTRUCT_IDS?.MEANING,
      "meaning"
    ),

    title: "Meaningful Engagement",
    userLabel: "Meaning",

    question:
      "How meaningful has life felt recently?",

    description:
      "A reflective rating of whether recent experiences, responsibilities and relationships have felt significant or worthwhile.",

    source:
      ROOT_MEASURE_SOURCES.ASSESSMENT,

    cadence: ROOT_MEASURE_CADENCES.WEEKLY,
    approach:
      ROOT_MEASURE_APPROACHES.REFLECTIVE,

    minimum: 0,
    maximum: 10,
    step: 1,
    anchors: STRENGTH_ANCHORS,

    scoreDirection: GREATER_STRENGTH,

    changeDirection:
      ROOT_CHANGE_DIRECTIONS
        .HIGHER_IS_BETTER,

    meaningfulChange: 2,
    timeWindow: "recent_week",

    contextualFields: [
      "activities",
      "relationships",
      "contribution",
      "values",
      "moments_that_mattered",
    ],
  }),

  [ROOT_MEASURE_IDS
    .DECISION_CONFIDENCE]: measure({
    id:
      ROOT_MEASURE_IDS
        .DECISION_CONFIDENCE,

    permanentId: "ROOT-MEA-000012",

    constructId: constructId(
      ROOT_CONSTRUCT_IDS
        ?.DECISION_CONFIDENCE,
      ROOT_CONSTRUCT_IDS
        ?.CONFIDENCE_IN_DECISIONS,
      "decision_confidence"
    ),

    title: "Decision Confidence",
    userLabel: "Decision Confidence",

    question:
      "How confident do you feel about your next step?",

    description:
      "A direct rating of confidence in a current decision, direction or next action.",

    source: ROOT_MEASURE_SOURCES.COACH,

    cadence:
      ROOT_MEASURE_CADENCES.EVENT_BASED,

    approach:
      ROOT_MEASURE_APPROACHES.CONVERSATIONAL,

    minimum: 0,
    maximum: 10,
    step: 1,
    anchors: STRENGTH_ANCHORS,

    scoreDirection: GREATER_STRENGTH,

    changeDirection:
      ROOT_CHANGE_DIRECTIONS
        .HIGHER_IS_BETTER,

    meaningfulChange: 2,
    timeWindow: "right_now",

    contextualFields: [
      "decision",
      "available_options",
      "uncertainty",
      "values",
      "next_step",
    ],
  }),

  [ROOT_MEASURE_IDS
    .SELF_UNDERSTANDING]: measure({
    id:
      ROOT_MEASURE_IDS
        .SELF_UNDERSTANDING,

    permanentId: "ROOT-MEA-000013",

    constructId: constructId(
      ROOT_CONSTRUCT_IDS
        ?.SELF_UNDERSTANDING,
      ROOT_CONSTRUCT_IDS
        ?.SELF_AWARENESS,
      "self_understanding"
    ),

    title: "Self-Understanding",
    userLabel: "Self-Understanding",

    question:
      "How clearly do you understand what is happening within you?",

    description:
      "A reflective rating of the user's felt clarity about their emotions, needs, patterns and current experience.",

    source: ROOT_MEASURE_SOURCES.COACH,

    cadence:
      ROOT_MEASURE_CADENCES.EVENT_BASED,

    approach:
      ROOT_MEASURE_APPROACHES.CONVERSATIONAL,

    minimum: 0,
    maximum: 10,
    step: 1,
    anchors: STRENGTH_ANCHORS,

    scoreDirection: GREATER_STRENGTH,

    changeDirection:
      ROOT_CHANGE_DIRECTIONS
        .HIGHER_IS_BETTER,

    meaningfulChange: 2,
    timeWindow: "right_now",

    contextualFields: [
      "emotion",
      "need",
      "pattern",
      "trigger",
      "body_signal",
      "new_realisation",
    ],

    sensitivity:
      ROOT_DATA_SENSITIVITY.SENSITIVE,
  }),
});

/**
 * Returns one measure by its permanent registry ID.
 */
export function getRootMeasure(measureId) {
  if (
    typeof measureId !== "string" ||
    !measureId.trim()
  ) {
    return null;
  }

  return ROOT_MEASURES[measureId] || null;
}

/**
 * Returns every registered measure.
 */
export function listRootMeasures({
  activeOnly = true,
  userVisibleOnly = false,
} = {}) {
  return Object.values(ROOT_MEASURES).filter(
    (registeredMeasure) => {
      if (
        activeOnly &&
        !registeredMeasure.active
      ) {
        return false;
      }

      if (
        userVisibleOnly &&
        !registeredMeasure.governance
          .userVisible
      ) {
        return false;
      }

      return true;
    }
  );
}

/**
 * Returns every measure linked to one construct.
 */
export function getMeasuresForConstruct(
  linkedConstructId,
  {
    activeOnly = true,
  } = {}
) {
  if (
    typeof linkedConstructId !== "string" ||
    !linkedConstructId.trim()
  ) {
    return [];
  }

  return listRootMeasures({
    activeOnly,
  }).filter(
    (registeredMeasure) =>
      registeredMeasure.constructId ===
      linkedConstructId
  );
}

/**
 * Returns measures originating from one Root area.
 */
export function getMeasuresBySource(
  source,
  {
    activeOnly = true,
  } = {}
) {
  if (
    typeof source !== "string" ||
    !source.trim()
  ) {
    return [];
  }

  return listRootMeasures({
    activeOnly,
  }).filter(
    (registeredMeasure) =>
      registeredMeasure.source === source
  );
}

/**
 * Returns Root's existing seven check-in definitions in display order.
 */
export function getRootCheckInMeasures() {
  const orderedIds = [
    ROOT_MEASURE_IDS.CHECKIN_STRESS,

    ROOT_MEASURE_IDS
      .CHECKIN_SLEEP_DIFFICULTY,

    ROOT_MEASURE_IDS
      .CHECKIN_RECOVERY_DIFFICULTY,

    ROOT_MEASURE_IDS
      .CHECKIN_ENERGY_DIFFICULTY,

    ROOT_MEASURE_IDS
      .CHECKIN_MOOD_DIFFICULTY,

    ROOT_MEASURE_IDS
      .CHECKIN_FOCUS_DIFFICULTY,

    ROOT_MEASURE_IDS
      .CHECKIN_BURNOUT_LOAD,
  ];

  return orderedIds
    .map(getRootMeasure)
    .filter(Boolean);
}

/**
 * Returns Root's first group of positive human-capacity measures.
 */
export function getHumanCapacityMeasures() {
  const orderedIds = [
    ROOT_MEASURE_IDS.HOPE_CAPACITY,
    ROOT_MEASURE_IDS.PURPOSE_STRENGTH,

    ROOT_MEASURE_IDS
      .BELONGING_STRENGTH,

    ROOT_MEASURE_IDS
      .MEANINGFUL_ENGAGEMENT,

    ROOT_MEASURE_IDS
      .DECISION_CONFIDENCE,

    ROOT_MEASURE_IDS
      .SELF_UNDERSTANDING,
  ];

  return orderedIds
    .map(getRootMeasure)
    .filter(Boolean);
}

/**
 * Builds the exact construct and scoring information required by
 * rootMeasurementEngine.js.
 *
 * This allows a page to supply:
 *
 *   measureId
 *   score
 *
 * instead of repeatedly defining:
 *
 *   domain
 *   constructKey
 *   constructLabel
 *   question
 *   higherScoreMeans
 *   meaningfulChange
 */
export function getMeasureEngineIdentity(
  measureId
) {
  const registeredMeasure =
    getRootMeasure(measureId);

  if (!registeredMeasure) {
    return null;
  }

  const linkedConstruct = getRootConstruct(
    registeredMeasure.constructId
  );

  const constructIdentity =
    typeof getConstructMeasurementIdentity ===
    "function"
      ? getConstructMeasurementIdentity(
          registeredMeasure.constructId
        )
      : null;

  return {
    measureId: registeredMeasure.id,

    measurePermanentId:
      registeredMeasure.permanentId,

    measureSchemaVersion:
      ROOT_MEASURE_SCHEMA_VERSION,

    constructKey:
      registeredMeasure.constructId,

    constructLabel:
      linkedConstruct?.shortTitle ||
      linkedConstruct?.title ||
      registeredMeasure.userLabel,

    domain:
      linkedConstruct?.domainId ||
      constructIdentity?.domainId ||
      null,

    question: registeredMeasure.question,

    higherScoreMeans:
      registeredMeasure.scoring
        .scoreDirection,

    meaningfulChange:
      registeredMeasure.scoring
        .meaningfulChange,

    minimum:
      registeredMeasure.scale.minimum,

    maximum:
      registeredMeasure.scale.maximum,

    source:
      registeredMeasure.source,

    metadata: {
      root_measure: {
        measureId:
          registeredMeasure.id,

        measurePermanentId:
          registeredMeasure.permanentId,

        measureSchemaVersion:
          ROOT_MEASURE_SCHEMA_VERSION,

        constructId:
          registeredMeasure.constructId,

        source:
          registeredMeasure.source,

        role:
          registeredMeasure.role,

        cadence:
          registeredMeasure.cadence,

        approach:
          registeredMeasure.approach,

        changeDirection:
          registeredMeasure.scoring
            .changeDirection,

        scoringMethod:
          registeredMeasure.scoring
            .scoringMethod,

        timeWindow:
          registeredMeasure.timeWindow,
      },
    },
  };
}

/**
 * Builds a ready-to-use startMeasurement payload.
 *
 * Example:
 *
 * const payload = buildStartMeasurementInput({
 *   measureId: ROOT_MEASURE_IDS.CHECKIN_STRESS,
 *   score: 7,
 *   sourcePage: "check-in"
 * });
 *
 * await startMeasurement(payload);
 */
export function buildStartMeasurementInput({
  measureId,
  score,
  sourcePage = null,
  interventionKey = null,
  interventionLabel = null,
  metadata = {},
}) {
  const identity =
    getMeasureEngineIdentity(measureId);

  if (!identity) {
    throw new Error(
      `Unknown Root measure: ${measureId}`
    );
  }

  return {
    domain: identity.domain,
    constructKey: identity.constructKey,
    constructLabel:
      identity.constructLabel,
    question: identity.question,
    score,

    higherScoreMeans:
      identity.higherScoreMeans,

    meaningfulChange:
      identity.meaningfulChange,

    interventionKey,
    interventionLabel,
    sourcePage,

    metadata: {
      ...metadata,

      root_measure: {
        ...identity.metadata.root_measure,

        ...(metadata.root_measure &&
        typeof metadata.root_measure ===
          "object"
          ? metadata.root_measure
          : {}),
      },
    },
  };
}

/**
 * Builds a ready-to-use finishMeasurement payload.
 *
 * beforeScore remains optional because the expanded measurement engine can
 * retrieve the original before-measurement using cycleId.
 */
export function buildFinishMeasurementInput({
  measureId,
  cycleId,
  beforeScore = null,
  afterScore,
  interventionKey,
  interventionLabel,
  sourcePage = null,
  metadata = {},
}) {
  const identity =
    getMeasureEngineIdentity(measureId);

  if (!identity) {
    throw new Error(
      `Unknown Root measure: ${measureId}`
    );
  }

  return {
    cycleId,

    domain: identity.domain,
    constructKey: identity.constructKey,
    constructLabel:
      identity.constructLabel,
    question: identity.question,

    beforeScore,
    afterScore,

    higherScoreMeans:
      identity.higherScoreMeans,

    meaningfulChange:
      identity.meaningfulChange,

    interventionKey,
    interventionLabel,
    sourcePage,

    metadata: {
      ...metadata,

      root_measure: {
        ...identity.metadata.root_measure,

        ...(metadata.root_measure &&
        typeof metadata.root_measure ===
          "object"
          ? metadata.root_measure
          : {}),
      },
    },
  };
}

/**
 * Checks the integrity of the registry.
 *
 * This does not throw automatically during production.
 * It returns a report that may be logged or used in development tests.
 */
export function validateRootMeasures() {
  const measures = Object.values(
    ROOT_MEASURES
  );

  const errors = [];
  const warnings = [];

  const seenIds = new Set();
  const seenPermanentIds = new Set();

  measures.forEach((registeredMeasure) => {
    if (seenIds.has(registeredMeasure.id)) {
      errors.push(
        `Duplicate measure ID: ${registeredMeasure.id}`
      );
    }

    seenIds.add(registeredMeasure.id);

    if (
      seenPermanentIds.has(
        registeredMeasure.permanentId
      )
    ) {
      errors.push(
        `Duplicate permanent measure ID: ${registeredMeasure.permanentId}`
      );
    }

    seenPermanentIds.add(
      registeredMeasure.permanentId
    );

    const linkedConstruct = getRootConstruct(
      registeredMeasure.constructId
    );

    if (!linkedConstruct) {
      warnings.push(
        `Measure "${registeredMeasure.id}" references construct "${registeredMeasure.constructId}", but that construct could not be resolved.`
      );
    }

    if (
      registeredMeasure.type ===
        ROOT_MEASURE_TYPES.NUMERIC_SCALE &&
      (!Number.isFinite(
        registeredMeasure.scale.minimum
      ) ||
        !Number.isFinite(
          registeredMeasure.scale.maximum
        ))
    ) {
      errors.push(
        `Numeric measure "${registeredMeasure.id}" requires a valid minimum and maximum.`
      );
    }

    if (
      Number.isFinite(
        registeredMeasure.scale.minimum
      ) &&
      Number.isFinite(
        registeredMeasure.scale.maximum
      ) &&
      registeredMeasure.scale.minimum >=
        registeredMeasure.scale.maximum
    ) {
      errors.push(
        `Measure "${registeredMeasure.id}" has an invalid scale range.`
      );
    }
  });

  return {
    valid: errors.length === 0,
    measureCount: measures.length,
    errors,
    warnings,
  };
}

export default ROOT_MEASURES;
