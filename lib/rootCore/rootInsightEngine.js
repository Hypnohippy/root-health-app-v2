import {
  ROOT_MEMORY_CONFIDENCE_LEVELS,
  ROOT_MEMORY_DIRECTIONS,
  ROOT_MEMORY_PATTERN_TYPES,
  getRootMemoryOverview,
  getConstructTrend,
  getHelpfulInterventions,
  buildCoachMemoryContext,
} from "./rootMemory";

/**
 * Root Core — Insight Engine
 *
 * Root Memory remembers what has happened.
 *
 * The Insight Engine decides:
 *
 * - what appears important now
 * - whether there is enough evidence to mention it
 * - how strongly Root may speak
 * - whether an insight is useful, repetitive or potentially alarming
 * - whether it belongs in Insights, Coach or both
 *
 * The Insight Engine is deliberately conservative.
 *
 * It does not diagnose.
 * It does not claim causation.
 * It does not replace professional judgement.
 * It does not surface every pattern merely because one exists.
 */

export const ROOT_INSIGHT_SCHEMA_VERSION = "1.0.0";

/**
 * Permanent insight types.
 */
export const ROOT_INSIGHT_TYPES = Object.freeze({
  HELPFUL_PATTERN: "helpful_pattern",

  MIXED_PATTERN: "mixed_pattern",

  WORSENING_PATTERN: "worsening_pattern",

  IMPROVING_TREND: "improving_trend",

  WORSENING_TREND: "worsening_trend",

  STABLE_TREND: "stable_trend",

  RECURRING_DIFFICULTY:
    "recurring_difficulty",

  RECENT_POSITIVE_CHANGE:
    "recent_positive_change",

  RECENT_NEGATIVE_CHANGE:
    "recent_negative_change",

  REFLECTION_INVITATION:
    "reflection_invitation",

  INSUFFICIENT_EVIDENCE:
    "insufficient_evidence",
});

/**
 * The purpose of an insight.
 */
export const ROOT_INSIGHT_ROLES = Object.freeze({
  NOTICE: "notice",

  ENCOURAGE: "encourage",

  REFLECT: "reflect",

  RECOMMEND: "recommend",

  CAUTION: "caution",

  CELEBRATE: "celebrate",

  CONTEXT: "context",
});

/**
 * Where an insight may appear.
 */
export const ROOT_INSIGHT_SURFACES =
  Object.freeze({
    INSIGHTS: "insights",

    COACH: "coach",

    HOME: "home",

    CHECK_IN: "check_in",

    PROGRESS: "progress",

    ORGANISATION: "organisation",

    RESEARCH: "research",
  });

/**
 * Relative importance.
 *
 * Priority is used for ordering.
 * It is not a medical risk score.
 */
export const ROOT_INSIGHT_PRIORITIES =
  Object.freeze({
    LOW: "low",

    MEDIUM: "medium",

    HIGH: "high",

    URGENT: "urgent",
  });

/**
 * How confidently Root may phrase an insight.
 */
export const ROOT_INSIGHT_STRENGTHS =
  Object.freeze({
    TENTATIVE: "tentative",

    EMERGING: "emerging",

    REPEATED: "repeated",

    STRONG: "strong",
  });

/**
 * Why an insight may be withheld.
 */
export const ROOT_INSIGHT_SUPPRESSION_REASONS =
  Object.freeze({
    INSUFFICIENT_EVIDENCE:
      "insufficient_evidence",

    LOW_RELEVANCE: "low_relevance",

    RECENTLY_SHOWN: "recently_shown",

    DUPLICATE: "duplicate",

    UNSAFE_WORDING: "unsafe_wording",

    MISSING_DATA: "missing_data",

    SURFACE_NOT_ALLOWED:
      "surface_not_allowed",

    LIMIT_REACHED: "limit_reached",
  });

/**
 * Behaviour settings.
 */
const DEFAULT_INSIGHT_LIMIT = 6;

const DEFAULT_MEMORY_HISTORY_LIMIT = 250;

const DEFAULT_HELPFUL_MINIMUM = 2;

const DEFAULT_RECOMMENDATION_MINIMUM = 3;

const DEFAULT_REPEAT_COOLDOWN_DAYS = 7;

const MAXIMUM_INSIGHT_LIMIT = 20;

const INSIGHT_HISTORY_STORAGE_KEY =
  "root_insight_history_v1";

/**
 * Priority ranking.
 */
const PRIORITY_WEIGHTS = Object.freeze({
  [ROOT_INSIGHT_PRIORITIES.LOW]: 1,

  [ROOT_INSIGHT_PRIORITIES.MEDIUM]: 2,

  [ROOT_INSIGHT_PRIORITIES.HIGH]: 3,

  [ROOT_INSIGHT_PRIORITIES.URGENT]: 4,
});

/**
 * Confidence ranking.
 */
const CONFIDENCE_WEIGHTS = Object.freeze({
  [ROOT_MEMORY_CONFIDENCE_LEVELS.EARLY]: 1,

  [ROOT_MEMORY_CONFIDENCE_LEVELS.EMERGING]:
    2,

  [ROOT_MEMORY_CONFIDENCE_LEVELS.REPEATED]:
    3,

  [ROOT_MEMORY_CONFIDENCE_LEVELS.ESTABLISHED]:
    4,
});

/**
 * Returns a valid bounded integer.
 */
function normaliseLimit(
  value,
  {
    fallback = DEFAULT_INSIGHT_LIMIT,
    minimum = 1,
    maximum = MAXIMUM_INSIGHT_LIMIT,
  } = {}
) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(
    Math.max(Math.floor(parsed), minimum),
    maximum
  );
}

/**
 * Returns a finite number or null.
 */
function toNumber(value) {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

/**
 * Rounds a number to two decimal places.
 */
function roundNumber(value) {
  const parsed = toNumber(value);

  if (parsed === null) {
    return null;
  }

  return Number(parsed.toFixed(2));
}

/**
 * Returns a safe string.
 */
function safeString(value) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

/**
 * Lowercases the first character for natural sentence flow.
 */
function lowerFirst(value) {
  const text = safeString(value);

  if (!text) {
    return "";
  }

  return (
    text.charAt(0).toLowerCase() +
    text.slice(1)
  );
}

/**
 * Returns a valid date or null.
 */
function toDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

/**
 * Calculates elapsed days.
 */
function daysBetween(
  earlier,
  later = new Date()
) {
  const earlierDate = toDate(earlier);
  const laterDate = toDate(later);

  if (!earlierDate || !laterDate) {
    return null;
  }

  const milliseconds =
    laterDate.getTime() -
    earlierDate.getTime();

  return milliseconds /
    (1000 * 60 * 60 * 24);
}

/**
 * Stable, lightweight hash.
 *
 * Used only to identify repeated insights locally.
 */
function createHash(value) {
  const text = String(value || "");

  let hash = 0;

  for (
    let index = 0;
    index < text.length;
    index += 1
  ) {
    hash =
      (hash << 5) -
      hash +
      text.charCodeAt(index);

    hash |= 0;
  }

  return Math.abs(hash).toString(36);
}

/**
 * Creates a stable insight key.
 */
function createInsightKey({
  type,
  constructKey,
  interventionKey = null,
  role = null,
}) {
  return [
    type || "insight",

    constructKey || "general",

    interventionKey || "none",

    role || "notice",
  ].join("::");
}

/**
 * Deep-freezes insight output.
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
 * Maps memory confidence to safe language strength.
 */
export function getInsightStrength(
  confidence
) {
  if (
    confidence ===
    ROOT_MEMORY_CONFIDENCE_LEVELS
      .ESTABLISHED
  ) {
    return ROOT_INSIGHT_STRENGTHS.STRONG;
  }

  if (
    confidence ===
    ROOT_MEMORY_CONFIDENCE_LEVELS.REPEATED
  ) {
    return ROOT_INSIGHT_STRENGTHS.REPEATED;
  }

  if (
    confidence ===
    ROOT_MEMORY_CONFIDENCE_LEVELS.EMERGING
  ) {
    return ROOT_INSIGHT_STRENGTHS.EMERGING;
  }

  return ROOT_INSIGHT_STRENGTHS.TENTATIVE;
}

/**
 * Creates one immutable insight.
 */
function createInsight({
  type,
  role,

  title,
  text,
  coachText = null,

  constructKey = null,
  constructLabel = null,

  interventionKey = null,
  interventionLabel = null,

  priority =
    ROOT_INSIGHT_PRIORITIES.MEDIUM,

  confidence =
    ROOT_MEMORY_CONFIDENCE_LEVELS.EARLY,

  evidenceCount = 0,

  relevanceScore = 0,

  surfaces = [
    ROOT_INSIGHT_SURFACES.INSIGHTS,
  ],

  source = "root_memory",

  sourcePatternType = null,

  observedAt = null,

  expiresAt = null,

  actionable = false,

  recommendationAllowed = false,

  reflectiveQuestion = null,

  metadata = {},
}) {
  const key = createInsightKey({
    type,
    constructKey,
    interventionKey,
    role,
  });

  const insight = {
    insightSchemaVersion:
      ROOT_INSIGHT_SCHEMA_VERSION,

    id: `root-insight-${createHash(key)}`,

    key,

    type,
    role,

    title,
    text,
    coachText,

    constructKey,
    constructLabel,

    interventionKey,
    interventionLabel,

    priority,

    confidence,

    strength:
      getInsightStrength(confidence),

    evidenceCount:
      Number(evidenceCount) || 0,

    relevanceScore:
      roundNumber(relevanceScore) || 0,

    surfaces: [
      ...new Set(
        Array.isArray(surfaces)
          ? surfaces.filter(Boolean)
          : []
      ),
    ],

    source,
    sourcePatternType,

    observedAt,
    expiresAt,

    actionable:
      Boolean(actionable),

    recommendationAllowed:
      Boolean(recommendationAllowed),

    reflectiveQuestion,

    metadata,

    safety: {
      descriptiveOnly: true,

      diagnostic: false,

      claimsCausation: false,

      userMayDisagree: true,

      professionalAdviceReplacement: false,
    },
  };

  return deepFreeze(insight);
}

/**
 * Reads local insight display history.
 *
 * Failure to read localStorage must never break Root.
 */
function readInsightHistory() {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw =
      localStorage.getItem(
        INSIGHT_HISTORY_STORAGE_KEY
      );

    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);

    if (
      !parsed ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      return {};
    }

    return parsed;
  } catch {
    return {};
  }
}

/**
 * Writes local insight display history.
 */
function writeInsightHistory(history) {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    localStorage.setItem(
      INSIGHT_HISTORY_STORAGE_KEY,
      JSON.stringify(history)
    );

    return true;
  } catch {
    return false;
  }
}

/**
 * Records that an insight was shown.
 *
 * Pages may call this after visibly rendering an insight.
 */
export function markInsightAsShown(
  insightOrKey,
  shownAt = new Date().toISOString()
) {
  const key =
    typeof insightOrKey === "string"
      ? insightOrKey
      : insightOrKey?.key;

  if (!key) {
    return false;
  }

  const history = readInsightHistory();

  const previous =
    history[key] &&
    typeof history[key] === "object"
      ? history[key]
      : {};

  history[key] = {
    lastShownAt: shownAt,

    shownCount:
      Number(previous.shownCount || 0) + 1,
  };

  return writeInsightHistory(history);
}

/**
 * Records several rendered insights.
 */
export function markInsightsAsShown(
  insights,
  shownAt = new Date().toISOString()
) {
  if (!Array.isArray(insights)) {
    return false;
  }

  const history = readInsightHistory();

  insights.forEach((insight) => {
    const key = insight?.key;

    if (!key) {
      return;
    }

    const previous =
      history[key] &&
      typeof history[key] === "object"
        ? history[key]
        : {};

    history[key] = {
      lastShownAt: shownAt,

      shownCount:
        Number(previous.shownCount || 0) +
        1,
    };
  });

  return writeInsightHistory(history);
}

/**
 * Clears local display history.
 *
 * Useful for testing or user-controlled memory reset.
 */
export function clearInsightDisplayHistory() {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    localStorage.removeItem(
      INSIGHT_HISTORY_STORAGE_KEY
    );

    return true;
  } catch {
    return false;
  }
}

/**
 * Checks whether an insight was shown too recently.
 */
function wasRecentlyShown(
  insight,
  {
    cooldownDays =
      DEFAULT_REPEAT_COOLDOWN_DAYS,

    now = new Date(),
  } = {}
) {
  const history = readInsightHistory();

  const record =
    history[insight.key];

  if (!record?.lastShownAt) {
    return false;
  }

  const elapsedDays = daysBetween(
    record.lastShownAt,
    now
  );

  if (elapsedDays === null) {
    return false;
  }

  return elapsedDays < cooldownDays;
}

/**
 * Generates conservative wording based on repetition.
 */
function patternOpening(confidence) {
  if (
    confidence ===
    ROOT_MEMORY_CONFIDENCE_LEVELS
      .ESTABLISHED
  ) {
    return "Across repeated observations, Root has noticed";
  }

  if (
    confidence ===
    ROOT_MEMORY_CONFIDENCE_LEVELS.REPEATED
  ) {
    return "Root has repeatedly noticed";
  }

  if (
    confidence ===
    ROOT_MEMORY_CONFIDENCE_LEVELS.EMERGING
  ) {
    return "An emerging pattern suggests";
  }

  return "One early observation suggests";
}

/**
 * Builds an insight from a helpful intervention pattern.
 */
function buildHelpfulPatternInsight(
  pattern
) {
  const constructLabel =
    pattern.constructLabel ||
    pattern.constructKey ||
    "this experience";

  const interventionLabel =
    pattern.interventionLabel ||
    pattern.interventionKey ||
    "this approach";

  const evidenceCount =
    Number(
      pattern.scoredMeasurementCount
    ) || 0;

  const confidence =
    pattern.confidence ||
    ROOT_MEMORY_CONFIDENCE_LEVELS.EARLY;

  const recommendable =
    evidenceCount >=
      DEFAULT_RECOMMENDATION_MINIMUM &&
    Number(pattern.improvedCount || 0) >
      Number(pattern.worsenedCount || 0) &&
    Number(pattern.averageImprovement || 0) >
      0;

  const title =
    evidenceCount >= 5
      ? `${interventionLabel} may be worth remembering`
      : `A possible helpful pattern`;

  const text = `${patternOpening(
    confidence
  )} that ${lowerFirst(
    interventionLabel
  )} has often been followed by improvement in ${lowerFirst(
    constructLabel
  )}. This is a personal pattern, not proof that the approach caused the change.`;

  const coachText = recommendable
    ? `Root has noticed that ${lowerFirst(
        interventionLabel
      )} has been followed by improvement in ${lowerFirst(
        constructLabel
      )} on ${pattern.improvedCount} of ${evidenceCount} recorded occasions. Would revisiting it feel helpful today?`
    : `There may be an emerging connection between ${lowerFirst(
        interventionLabel
      )} and improvement in ${lowerFirst(
        constructLabel
      )}. Would you like to explore whether it feels relevant today?`;

  const relevanceScore =
    30 +
    evidenceCount * 4 +
    Number(
      pattern.averageImprovement || 0
    ) *
      8 +
    Number(pattern.helpfulRate || 0) * 20;

  return createInsight({
    type:
      ROOT_INSIGHT_TYPES.HELPFUL_PATTERN,

    role: recommendable
      ? ROOT_INSIGHT_ROLES.RECOMMEND
      : ROOT_INSIGHT_ROLES.NOTICE,

    title,
    text,
    coachText,

    constructKey:
      pattern.constructKey,

    constructLabel,

    interventionKey:
      pattern.interventionKey,

    interventionLabel,

    priority:
      evidenceCount >= 5
        ? ROOT_INSIGHT_PRIORITIES.HIGH
        : ROOT_INSIGHT_PRIORITIES.MEDIUM,

    confidence,

    evidenceCount,

    relevanceScore,

    surfaces: [
      ROOT_INSIGHT_SURFACES.INSIGHTS,
      ROOT_INSIGHT_SURFACES.COACH,
      ROOT_INSIGHT_SURFACES.PROGRESS,
    ],

    sourcePatternType:
      pattern.patternType,

    observedAt:
      pattern.mostRecentAt || null,

    actionable: true,

    recommendationAllowed:
      recommendable,

    reflectiveQuestion:
      `What do you think made ${lowerFirst(
        interventionLabel
      )} useful on those occasions?`,

    metadata: {
      improvedCount:
        pattern.improvedCount,

      worsenedCount:
        pattern.worsenedCount,

      unchangedCount:
        pattern.unchangedCount,

      averageImprovement:
        pattern.averageImprovement,

      helpfulRate:
        pattern.helpfulRate,
    },
  });
}

/**
 * Builds an insight from a mixed intervention pattern.
 */
function buildMixedPatternInsight(
  pattern
) {
  const constructLabel =
    pattern.constructLabel ||
    pattern.constructKey ||
    "this experience";

  const interventionLabel =
    pattern.interventionLabel ||
    pattern.interventionKey ||
    "this approach";

  const evidenceCount =
    Number(
      pattern.scoredMeasurementCount
    ) || 0;

  const confidence =
    pattern.confidence ||
    ROOT_MEMORY_CONFIDENCE_LEVELS.EARLY;

  const text = `Root has seen mixed results after ${lowerFirst(
    interventionLabel
  )} was used for ${lowerFirst(
    constructLabel
  )}. It was followed by improvement on ${pattern.improvedCount || 0} occasions and greater difficulty on ${pattern.worsenedCount || 0}. Context may matter.`;

  const relevanceScore =
    15 +
    evidenceCount * 2;

  return createInsight({
    type:
      ROOT_INSIGHT_TYPES.MIXED_PATTERN,

    role: ROOT_INSIGHT_ROLES.REFLECT,

    title:
      `${interventionLabel} has shown mixed results`,

    text,

    coachText:
      `Your experience with ${lowerFirst(
        interventionLabel
      )} has varied. Shall we look at what was different on the occasions it appeared to help?`,

    constructKey:
      pattern.constructKey,

    constructLabel,

    interventionKey:
      pattern.interventionKey,

    interventionLabel,

    priority:
      ROOT_INSIGHT_PRIORITIES.LOW,

    confidence,

    evidenceCount,

    relevanceScore,

    surfaces: [
      ROOT_INSIGHT_SURFACES.INSIGHTS,
      ROOT_INSIGHT_SURFACES.COACH,
    ],

    sourcePatternType:
      pattern.patternType,

    observedAt:
      pattern.mostRecentAt || null,

    actionable: true,

    recommendationAllowed: false,

    reflectiveQuestion:
      `What was different when ${lowerFirst(
        interventionLabel
      )} appeared to help?`,

    metadata: {
      improvedCount:
        pattern.improvedCount,

      worsenedCount:
        pattern.worsenedCount,

      unchangedCount:
        pattern.unchangedCount,
    },
  });
}

/**
 * Builds an insight from an apparently unhelpful pattern.
 *
 * Wording remains careful because worsening after an
 * intervention does not establish that it caused the worsening.
 */
function buildWorseningPatternInsight(
  pattern
) {
  const constructLabel =
    pattern.constructLabel ||
    pattern.constructKey ||
    "this experience";

  const interventionLabel =
    pattern.interventionLabel ||
    pattern.interventionKey ||
    "this approach";

  const evidenceCount =
    Number(
      pattern.scoredMeasurementCount
    ) || 0;

  const confidence =
    pattern.confidence ||
    ROOT_MEMORY_CONFIDENCE_LEVELS.EARLY;

  const text = `Root has noticed that ${lowerFirst(
    interventionLabel
  )} has sometimes been followed by greater difficulty in ${lowerFirst(
    constructLabel
  )}. This does not mean the approach caused the change, but the pattern may be worth reviewing.`;

  const relevanceScore =
    25 +
    evidenceCount * 4 +
    Math.abs(
      Number(
        pattern.averageImprovement || 0
      )
    ) *
      6;

  return createInsight({
    type:
      ROOT_INSIGHT_TYPES
        .WORSENING_PATTERN,

    role: ROOT_INSIGHT_ROLES.CAUTION,

    title:
      `A pattern worth reviewing`,

    text,

    coachText:
      `Root has noticed that ${lowerFirst(
        interventionLabel
      )} has been followed by greater difficulty in ${lowerFirst(
        constructLabel
      )} more often than improvement. Would you like to consider a different approach?`,

    constructKey:
      pattern.constructKey,

    constructLabel,

    interventionKey:
      pattern.interventionKey,

    interventionLabel,

    priority:
      evidenceCount >= 5
        ? ROOT_INSIGHT_PRIORITIES.HIGH
        : ROOT_INSIGHT_PRIORITIES.MEDIUM,

    confidence,

    evidenceCount,

    relevanceScore,

    surfaces: [
      ROOT_INSIGHT_SURFACES.INSIGHTS,
      ROOT_INSIGHT_SURFACES.COACH,
    ],

    sourcePatternType:
      pattern.patternType,

    observedAt:
      pattern.mostRecentAt || null,

    actionable: true,

    recommendationAllowed: false,

    reflectiveQuestion:
      `Was anything else happening when ${lowerFirst(
        interventionLabel
      )} was followed by greater difficulty?`,

    metadata: {
      improvedCount:
        pattern.improvedCount,

      worsenedCount:
        pattern.worsenedCount,

      unchangedCount:
        pattern.unchangedCount,

      averageImprovement:
        pattern.averageImprovement,
    },
  });
}

/**
 * Builds a trend insight from a construct summary.
 */
function buildConstructTrendInsight(
  construct
) {
  const constructKey =
    construct.constructKey;

  const constructLabel =
    construct.constructLabel ||
    constructKey ||
    "This area";

  const confidence =
    construct.confidence ||
    ROOT_MEMORY_CONFIDENCE_LEVELS.EARLY;

  const evidenceCount =
    Number(
      construct.scoredMeasurementCount ||
        construct.measurementCount
    ) || 0;

  if (
    construct.direction ===
    ROOT_MEMORY_DIRECTIONS.IMPROVING
  ) {
    return createInsight({
      type:
        ROOT_INSIGHT_TYPES.IMPROVING_TREND,

      role:
        ROOT_INSIGHT_ROLES.CELEBRATE,

      title:
        `${constructLabel} appears to be improving`,

      text:
        `Across Root's recorded observations, ${lowerFirst(
          constructLabel
        )} has more often moved towards improvement than greater difficulty.`,

      coachText:
        `${constructLabel} appears to have been improving. What do you think has contributed most to that change?`,

      constructKey,
      constructLabel,

      priority:
        ROOT_INSIGHT_PRIORITIES.MEDIUM,

      confidence,

      evidenceCount,

      relevanceScore:
        25 +
        evidenceCount * 2 +
        Number(
          construct.averageImprovement || 0
        ) *
          6,

      surfaces: [
        ROOT_INSIGHT_SURFACES.INSIGHTS,
        ROOT_INSIGHT_SURFACES.COACH,
        ROOT_INSIGHT_SURFACES.PROGRESS,
        ROOT_INSIGHT_SURFACES.HOME,
      ],

      observedAt:
        construct.mostRecentAt || null,

      actionable: true,

      recommendationAllowed: false,

      reflectiveQuestion:
        `What has helped ${lowerFirst(
          constructLabel
        )} improve?`,

      metadata: {
        averageImprovement:
          construct.averageImprovement,

        improvedCount:
          construct.improvedCount,

        worsenedCount:
          construct.worsenedCount,
      },
    });
  }

  if (
    construct.direction ===
    ROOT_MEMORY_DIRECTIONS.WORSENING
  ) {
    return createInsight({
      type:
        ROOT_INSIGHT_TYPES.WORSENING_TREND,

      role: ROOT_INSIGHT_ROLES.NOTICE,

      title:
        `${constructLabel} may need attention`,

      text:
        `Root's recent observations suggest that ${lowerFirst(
          constructLabel
        )} has more often moved towards greater difficulty than improvement. This is a pattern to explore, not a diagnosis.`,

      coachText:
        `${constructLabel} appears to have felt more difficult recently. Shall we look gently at what may have changed?`,

      constructKey,
      constructLabel,

      priority:
        evidenceCount >= 5
          ? ROOT_INSIGHT_PRIORITIES.HIGH
          : ROOT_INSIGHT_PRIORITIES.MEDIUM,

      confidence,

      evidenceCount,

      relevanceScore:
        35 +
        evidenceCount * 3 +
        Math.abs(
          Number(
            construct.averageImprovement ||
              0
          )
        ) *
          8,

      surfaces: [
        ROOT_INSIGHT_SURFACES.INSIGHTS,
        ROOT_INSIGHT_SURFACES.COACH,
        ROOT_INSIGHT_SURFACES.PROGRESS,
        ROOT_INSIGHT_SURFACES.HOME,
      ],

      observedAt:
        construct.mostRecentAt || null,

      actionable: true,

      recommendationAllowed: false,

      reflectiveQuestion:
        `What has changed around ${lowerFirst(
          constructLabel
        )} recently?`,

      metadata: {
        averageImprovement:
          construct.averageImprovement,

        improvedCount:
          construct.improvedCount,

        worsenedCount:
          construct.worsenedCount,
      },
    });
  }

  if (
    construct.direction ===
      ROOT_MEMORY_DIRECTIONS.STABLE &&
    evidenceCount >= 3
  ) {
    return createInsight({
      type:
        ROOT_INSIGHT_TYPES.STABLE_TREND,

      role: ROOT_INSIGHT_ROLES.CONTEXT,

      title:
        `${constructLabel} has remained broadly stable`,

      text:
        `Root has not seen a clear movement towards either improvement or greater difficulty in ${lowerFirst(
          constructLabel
        )} across the recorded observations.`,

      coachText:
        `${constructLabel} has remained fairly steady. Does that stability feel reassuring, frustrating or neutral to you?`,

      constructKey,
      constructLabel,

      priority:
        ROOT_INSIGHT_PRIORITIES.LOW,

      confidence,

      evidenceCount,

      relevanceScore:
        10 + evidenceCount,

      surfaces: [
        ROOT_INSIGHT_SURFACES.INSIGHTS,
        ROOT_INSIGHT_SURFACES.PROGRESS,
      ],

      observedAt:
        construct.mostRecentAt || null,

      actionable: false,

      recommendationAllowed: false,

      reflectiveQuestion:
        `How does this stability feel to you?`,
    });
  }

  return null;
}

/**
 * Builds intervention insights from memory patterns.
 */
function buildPatternInsights(
  patterns
) {
  if (!Array.isArray(patterns)) {
    return [];
  }

  return patterns
    .map((pattern) => {
      if (
        pattern.patternType ===
        ROOT_MEMORY_PATTERN_TYPES
          .HELPFUL_INTERVENTION
      ) {
        return buildHelpfulPatternInsight(
          pattern
        );
      }

      if (
        pattern.patternType ===
        ROOT_MEMORY_PATTERN_TYPES
          .MIXED_INTERVENTION
      ) {
        return buildMixedPatternInsight(
          pattern
        );
      }

      if (
        pattern.patternType ===
        ROOT_MEMORY_PATTERN_TYPES
          .UNHELPFUL_INTERVENTION
      ) {
        return buildWorseningPatternInsight(
          pattern
        );
      }

      return null;
    })
    .filter(Boolean);
}

/**
 * Builds trend insights from construct summaries.
 */
function buildTrendInsights(
  constructSummaries
) {
  if (
    !Array.isArray(constructSummaries)
  ) {
    return [];
  }

  return constructSummaries
    .map(buildConstructTrendInsight)
    .filter(Boolean);
}

/**
 * Returns true when an insight is allowed on a surface.
 */
function allowsSurface(
  insight,
  surface
) {
  if (!surface) {
    return true;
  }

  return insight.surfaces.includes(
    surface
  );
}

/**
 * Checks basic wording safety.
 *
 * This is not a complete content-safety system.
 * It protects Root Core from accidental diagnostic
 * or causal language in static insight generation.
 */
function hasUnsafeWording(insight) {
  const combined = [
    insight.title,
    insight.text,
    insight.coachText,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const prohibitedPhrases = [
    "you have depression",
    "you are depressed",
    "you have anxiety",
    "you are anxious because",
    "this caused",
    "will cure",
    "will treat",
    "guaranteed",
    "definitely means",
    "proves that",
  ];

  return prohibitedPhrases.some(
    (phrase) =>
      combined.includes(phrase)
  );
}

/**
 * Removes duplicate insights.
 *
 * When two insights concern the same construct and intervention,
 * the higher scoring one is retained.
 */
function removeDuplicateInsights(
  insights
) {
  const bestByKey = new Map();

  insights.forEach((insight) => {
    const duplicateKey = [
      insight.constructKey || "general",

      insight.interventionKey ||
        "no_intervention",

      insight.type,
    ].join("::");

    const existing =
      bestByKey.get(duplicateKey);

    if (
      !existing ||
      insight.relevanceScore >
        existing.relevanceScore
    ) {
      bestByKey.set(
        duplicateKey,
        insight
      );
    }
  });

  return Array.from(
    bestByKey.values()
  );
}

/**
 * Prevents one construct from dominating the full insight list.
 */
function limitInsightsPerConstruct(
  insights,
  maximumPerConstruct = 2
) {
  const counts = new Map();

  return insights.filter((insight) => {
    const key =
      insight.constructKey || "general";

    const current =
      counts.get(key) || 0;

    if (
      current >= maximumPerConstruct
    ) {
      return false;
    }

    counts.set(key, current + 1);

    return true;
  });
}

/**
 * Calculates the final ranking score.
 */
function calculateFinalScore(
  insight,
  {
    now = new Date(),
  } = {}
) {
  const priorityWeight =
    PRIORITY_WEIGHTS[
      insight.priority
    ] || 1;

  const confidenceWeight =
    CONFIDENCE_WEIGHTS[
      insight.confidence
    ] || 1;

  const ageInDays =
    daysBetween(
      insight.observedAt,
      now
    );

  let recencyScore = 0;

  if (ageInDays !== null) {
    if (ageInDays <= 1) {
      recencyScore = 20;
    } else if (ageInDays <= 7) {
      recencyScore = 14;
    } else if (ageInDays <= 30) {
      recencyScore = 8;
    } else if (ageInDays <= 90) {
      recencyScore = 3;
    }
  }

  const actionScore =
    insight.actionable ? 5 : 0;

  return roundNumber(
    insight.relevanceScore +
      priorityWeight * 8 +
      confidenceWeight * 5 +
      recencyScore +
      actionScore
  );
}

/**
 * Ranks and filters generated insights.
 */
export function rankRootInsights(
  insights,
  {
    surface = null,

    limit = DEFAULT_INSIGHT_LIMIT,

    includeRecentlyShown = false,

    cooldownDays =
      DEFAULT_REPEAT_COOLDOWN_DAYS,

    maximumPerConstruct = 2,

    now = new Date(),
  } = {}
) {
  const safeLimit =
    normaliseLimit(limit);

  const suppressed = [];

  const eligible = [];

  const uniqueInsights =
    removeDuplicateInsights(
      Array.isArray(insights)
        ? insights.filter(Boolean)
        : []
    );

  uniqueInsights.forEach((insight) => {
    if (
      !allowsSurface(insight, surface)
    ) {
      suppressed.push({
        insight,

        reason:
          ROOT_INSIGHT_SUPPRESSION_REASONS
            .SURFACE_NOT_ALLOWED,
      });

      return;
    }

    if (hasUnsafeWording(insight)) {
      suppressed.push({
        insight,

        reason:
          ROOT_INSIGHT_SUPPRESSION_REASONS
            .UNSAFE_WORDING,
      });

      return;
    }

    if (
      !includeRecentlyShown &&
      wasRecentlyShown(insight, {
        cooldownDays,
        now,
      })
    ) {
      suppressed.push({
        insight,

        reason:
          ROOT_INSIGHT_SUPPRESSION_REASONS
            .RECENTLY_SHOWN,
      });

      return;
    }

    const finalScore =
      calculateFinalScore(insight, {
        now,
      });

    eligible.push({
      ...insight,

      finalScore,
    });
  });

  eligible.sort((a, b) => {
    if (
      b.finalScore !== a.finalScore
    ) {
      return (
        b.finalScore -
        a.finalScore
      );
    }

    const bDate =
      toDate(b.observedAt)?.getTime() ||
      0;

    const aDate =
      toDate(a.observedAt)?.getTime() ||
      0;

    return bDate - aDate;
  });

  const balanced =
    limitInsightsPerConstruct(
      eligible,
      maximumPerConstruct
    );

  const selected =
    balanced.slice(0, safeLimit);

  const selectedKeys = new Set(
    selected.map(
      (insight) => insight.key
    )
  );

  balanced.forEach((insight) => {
    if (
      !selectedKeys.has(insight.key)
    ) {
      suppressed.push({
        insight,

        reason:
          ROOT_INSIGHT_SUPPRESSION_REASONS
            .LIMIT_REACHED,
      });
    }
  });

  return {
    insights: selected,

    suppressed,

    generatedCount:
      uniqueInsights.length,

    selectedCount:
      selected.length,

    suppressedCount:
      suppressed.length,
  };
}

/**
 * Creates the complete cross-construct insight set.
 *
 * This is the main function for the Insights page.
 */
export async function buildRootInsights({
  surface =
    ROOT_INSIGHT_SURFACES.INSIGHTS,

  limit = DEFAULT_INSIGHT_LIMIT,

  historyLimit =
    DEFAULT_MEMORY_HISTORY_LIMIT,

  patternLimit = 30,

  includeMixedPatterns = true,

  includeWorseningPatterns = true,

  includeStableTrends = false,

  includeRecentlyShown = false,

  cooldownDays =
    DEFAULT_REPEAT_COOLDOWN_DAYS,

  maximumPerConstruct = 2,
} = {}) {
  const memory =
    await getRootMemoryOverview({
      historyLimit,
      patternLimit,
    });

  let patternInsights =
    buildPatternInsights(
      memory.interventionPatterns
    );

  if (!includeMixedPatterns) {
    patternInsights =
      patternInsights.filter(
        (insight) =>
          insight.type !==
          ROOT_INSIGHT_TYPES.MIXED_PATTERN
      );
  }

  if (!includeWorseningPatterns) {
    patternInsights =
      patternInsights.filter(
        (insight) =>
          insight.type !==
          ROOT_INSIGHT_TYPES
            .WORSENING_PATTERN
      );
  }

  let trendInsights =
    buildTrendInsights(
      memory.constructSummaries
    );

  if (!includeStableTrends) {
    trendInsights =
      trendInsights.filter(
        (insight) =>
          insight.type !==
          ROOT_INSIGHT_TYPES.STABLE_TREND
      );
  }

  const generatedInsights = [
    ...patternInsights,
    ...trendInsights,
  ];

  const ranked =
    rankRootInsights(
      generatedInsights,
      {
        surface,
        limit,

        includeRecentlyShown,

        cooldownDays,

        maximumPerConstruct,
      }
    );

  return {
    insightSchemaVersion:
      ROOT_INSIGHT_SCHEMA_VERSION,

    generatedAt:
      new Date().toISOString(),

    surface,

    insights: ranked.insights,

    suppressed: ranked.suppressed,

    summary: {
      totalCompletedMeasurements:
        memory.totalCompletedMeasurements,

      constructCount:
        memory.constructCount,

      interventionPatternCount:
        memory.interventionPatternCount,

      generatedInsightCount:
        ranked.generatedCount,

      selectedInsightCount:
        ranked.selectedCount,

      suppressedInsightCount:
        ranked.suppressedCount,
    },

    safety: {
      descriptiveOnly: true,

      diagnostic: false,

      claimsCausation: false,

      recommendationRequiresRepetition:
        true,

      userMayCorrectMemory: true,
    },
  };
}

/**
 * Builds insights for a single construct.
 *
 * Useful for:
 * - a Coach conversation
 * - a construct detail panel
 * - a progress card
 */
export async function buildConstructInsights({
  constructKey,

  surface =
    ROOT_INSIGHT_SURFACES.INSIGHTS,

  limit = 4,

  includeRecentlyShown = false,

  cooldownDays =
    DEFAULT_REPEAT_COOLDOWN_DAYS,
} = {}) {
  if (!constructKey) {
    throw new Error(
      "A construct key is required."
    );
  }

  const [
    trend,
    helpfulPatterns,
  ] = await Promise.all([
    getConstructTrend({
      constructKey,
      limit: 30,
    }),

    getHelpfulInterventions({
      constructKey,
      limit: 10,
      historyLimit: 200,
      minimumObservations:
        DEFAULT_HELPFUL_MINIMUM,
    }),
  ]);

  const insights = [];

  const trendInsight =
    buildConstructTrendInsight({
      constructKey:
        trend.constructKey,

      constructLabel:
        trend.constructLabel,

      direction:
        trend.direction,

      confidence:
        trend.confidence,

      measurementCount:
        trend.measurementCount,

      scoredMeasurementCount:
        trend.measurementCount,

      averageImprovement:
        trend.summary
          ?.averageImprovement,

      improvedCount:
        trend.summary?.improvedCount,

      worsenedCount:
        trend.summary?.worsenedCount,

      mostRecentAt:
        trend.lastObservedAt,
    });

  if (trendInsight) {
    insights.push(trendInsight);
  }

  helpfulPatterns.forEach(
    (pattern) => {
      insights.push(
        buildHelpfulPatternInsight(
          pattern
        )
      );
    }
  );

  const ranked =
    rankRootInsights(insights, {
      surface,
      limit,

      includeRecentlyShown,

      cooldownDays,

      maximumPerConstruct: limit,
    });

  return {
    insightSchemaVersion:
      ROOT_INSIGHT_SCHEMA_VERSION,

    constructKey,

    constructLabel:
      trend.constructLabel,

    insights: ranked.insights,

    suppressed: ranked.suppressed,

    trend,

    helpfulPatterns,
  };
}

/**
 * Selects the best insight for the Coach to mention.
 *
 * Root does not have to mention a memory merely
 * because one is available.
 */
export async function getBestCoachInsight({
  constructKey,

  includeRecentlyShown = false,

  cooldownDays =
    DEFAULT_REPEAT_COOLDOWN_DAYS,
} = {}) {
  if (!constructKey) {
    throw new Error(
      "A construct key is required."
    );
  }

  const result =
    await buildConstructInsights({
      constructKey,

      surface:
        ROOT_INSIGHT_SURFACES.COACH,

      limit: 3,

      includeRecentlyShown,

      cooldownDays,
    });

  const best =
    result.insights.find(
      (insight) =>
        Boolean(insight.coachText)
    ) || null;

  if (!best) {
    return null;
  }

  return {
    ...best,

    sentence: best.coachText,
  };
}

/**
 * Builds a structured Coach intelligence bundle.
 *
 * This combines memory with the Insight Engine's
 * decision about what deserves mention.
 */
export async function buildCoachInsightContext({
  constructKey,

  includeRecentlyShown = false,

  cooldownDays =
    DEFAULT_REPEAT_COOLDOWN_DAYS,
} = {}) {
  if (!constructKey) {
    throw new Error(
      "A construct key is required."
    );
  }

  const [
    memoryContext,
    bestInsight,
  ] = await Promise.all([
    buildCoachMemoryContext({
      constructKey,

      recentLimit: 5,

      interventionLimit: 3,
    }),

    getBestCoachInsight({
      constructKey,

      includeRecentlyShown,

      cooldownDays,
    }),
  ]);

  return {
    insightSchemaVersion:
      ROOT_INSIGHT_SCHEMA_VERSION,

    constructKey,

    constructLabel:
      memoryContext.constructLabel,

    shouldMentionMemory:
      Boolean(bestInsight),

    selectedInsight:
      bestInsight,

    suggestedSentence:
      bestInsight?.coachText || null,

    memoryContext,

    coachRules: {
      mentionAtMostOnePattern: true,

      remainTentative: true,

      askPermissionBeforeRecommendation:
        true,

      neverClaimCausation: true,

      neverDiagnose: true,

      allowUserToDisagree: true,

      doNotRepeatRecentlyShown:
        !includeRecentlyShown,
    },
  };
}

/**
 * Returns a display-ready group for the Insights page.
 */
export async function getInsightsPageModel({
  limit = DEFAULT_INSIGHT_LIMIT,

  includeRecentlyShown = false,
} = {}) {
  const result =
    await buildRootInsights({
      surface:
        ROOT_INSIGHT_SURFACES.INSIGHTS,

      limit,

      includeRecentlyShown,

      includeMixedPatterns: true,

      includeWorseningPatterns: true,

      includeStableTrends: false,
    });

  const encouraging =
    result.insights.filter(
      (insight) =>
        insight.role ===
          ROOT_INSIGHT_ROLES
            .CELEBRATE ||
        insight.role ===
          ROOT_INSIGHT_ROLES
            .ENCOURAGE ||
        insight.type ===
          ROOT_INSIGHT_TYPES
            .HELPFUL_PATTERN
    );

  const attention =
    result.insights.filter(
      (insight) =>
        insight.role ===
          ROOT_INSIGHT_ROLES
            .CAUTION ||
        insight.type ===
          ROOT_INSIGHT_TYPES
            .WORSENING_TREND ||
        insight.type ===
          ROOT_INSIGHT_TYPES
            .WORSENING_PATTERN
    );

  const reflective =
    result.insights.filter(
      (insight) =>
        !encouraging.some(
          (item) =>
            item.key === insight.key
        ) &&
        !attention.some(
          (item) =>
            item.key === insight.key
        )
    );

  return {
    insightSchemaVersion:
      ROOT_INSIGHT_SCHEMA_VERSION,

    generatedAt:
      result.generatedAt,

    headline:
      result.insights.length
        ? "What Root noticed"
        : "Root is still learning your patterns",

    introduction:
      result.insights.length
        ? "These observations are based on your recorded experiences. They describe patterns rather than causes."
        : "As you complete more before-and-after reflections, Root will begin to recognise what appears to help you.",

    groups: {
      encouraging,

      attention,

      reflective,
    },

    allInsights:
      result.insights,

    summary:
      result.summary,

    safety:
      result.safety,
  };
}

/**
 * Returns an organisation-safe insight summary.
 *
 * Individual wording and personal identifiers are removed.
 *
 * This function prepares aggregate-shaped data only.
 * It does not itself establish whether a cohort is large
 * enough for safe reporting.
 */
export function buildOrganisationInsightSummary(
  insights,
  {
    minimumEvidenceCount = 3,
  } = {}
) {
  const eligible = (
    Array.isArray(insights)
      ? insights
      : []
  ).filter(
    (insight) =>
      insight.surfaces.includes(
        ROOT_INSIGHT_SURFACES
          .ORGANISATION
      ) &&
      insight.evidenceCount >=
        minimumEvidenceCount
  );

  return eligible.map((insight) => ({
    type: insight.type,

    constructKey:
      insight.constructKey,

    priority:
      insight.priority,

    confidence:
      insight.confidence,

    evidenceCount:
      insight.evidenceCount,

    direction:
      insight.metadata
        ?.averageImprovement > 0
        ? ROOT_MEMORY_DIRECTIONS
            .IMPROVING
        : insight.metadata
              ?.averageImprovement < 0
          ? ROOT_MEMORY_DIRECTIONS
              .WORSENING
          : ROOT_MEMORY_DIRECTIONS
              .STABLE,

    safety: {
      aggregateOnly: true,

      personalTextRemoved: true,

      diagnostic: false,

      causal: false,
    },
  }));
}

/**
 * Validates an insight object.
 */
export function validateRootInsight(
  insight
) {
  const errors = [];

  const warnings = [];

  if (
    !insight ||
    typeof insight !== "object"
  ) {
    return {
      valid: false,

      errors: [
        "Insight must be an object.",
      ],

      warnings,
    };
  }

  if (!insight.key) {
    errors.push(
      "Insight requires a stable key."
    );
  }

  if (!insight.type) {
    errors.push(
      "Insight requires a type."
    );
  }

  if (!insight.title) {
    errors.push(
      "Insight requires a title."
    );
  }

  if (!insight.text) {
    errors.push(
      "Insight requires display text."
    );
  }

  if (
    !Array.isArray(
      insight.surfaces
    ) ||
    !insight.surfaces.length
  ) {
    warnings.push(
      "Insight has no display surfaces."
    );
  }

  if (hasUnsafeWording(insight)) {
    errors.push(
      "Insight contains prohibited diagnostic or causal wording."
    );
  }

  if (
    insight.recommendationAllowed &&
    insight.evidenceCount <
      DEFAULT_RECOMMENDATION_MINIMUM
  ) {
    errors.push(
      "Recommendation requires at least three repeated observations."
    );
  }

  return {
    valid: errors.length === 0,

    errors,

    warnings,
  };
}

/**
 * Validates a complete insight collection.
 */
export function validateRootInsights(
  insights
) {
  const items =
    Array.isArray(insights)
      ? insights
      : [];

  const results =
    items.map((insight) => ({
      key:
        insight?.key || null,

      ...validateRootInsight(insight),
    }));

  const invalid =
    results.filter(
      (result) => !result.valid
    );

  return {
    valid: invalid.length === 0,

    insightCount:
      items.length,

    invalidCount:
      invalid.length,

    results,
  };
}

export default {
  buildRootInsights,

  buildConstructInsights,

  buildCoachInsightContext,

  getBestCoachInsight,

  getInsightsPageModel,

  rankRootInsights,

  markInsightAsShown,

  markInsightsAsShown,

  clearInsightDisplayHistory,

  getInsightStrength,

  buildOrganisationInsightSummary,

  validateRootInsight,

  validateRootInsights,
};
