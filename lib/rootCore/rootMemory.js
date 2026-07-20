import { supabase } from "../supabase";

import {
  something,
} from "./rootMeasurementEngine";
/**
 * Root Core — Memory
 *
 * Root Memory turns completed observations into careful,
 * human-readable patterns.
 *
 * It does not diagnose.
 * It does not claim that an intervention caused a change.
 * It does not overwrite the user's own understanding.
 *
 * It helps Root remember:
 *
 * - what the user has tried
 * - what was followed by improvement
 * - what was followed by worsening
 * - which difficulties frequently appear
 * - whether a construct appears to be improving over time
 * - whether there is enough evidence to mention a pattern
 *
 * Root Memory is descriptive rather than causal.
 */

export const ROOT_MEMORY_SCHEMA_VERSION = "1.0.0";

export const ROOT_MEMORY_PATTERN_TYPES =
  Object.freeze({
    HELPFUL_INTERVENTION:
      "helpful_intervention",

    MIXED_INTERVENTION:
      "mixed_intervention",

    UNHELPFUL_INTERVENTION:
      "unhelpful_intervention",

    CONSTRUCT_IMPROVING:
      "construct_improving",

    CONSTRUCT_WORSENING:
      "construct_worsening",

    CONSTRUCT_STABLE:
      "construct_stable",

    RECURRING_DIFFICULTY:
      "recurring_difficulty",

    RECENT_CHANGE:
      "recent_change",

    INSUFFICIENT_EVIDENCE:
      "insufficient_evidence",
  });

export const ROOT_MEMORY_CONFIDENCE_LEVELS =
  Object.freeze({
    EARLY: "early",
    EMERGING: "emerging",
    REPEATED: "repeated",
    ESTABLISHED: "established",
  });

export const ROOT_MEMORY_DIRECTIONS =
  Object.freeze({
    IMPROVING: "improving",
    WORSENING: "worsening",
    STABLE: "stable",
    MIXED: "mixed",
    UNKNOWN: "unknown",
  });

const DEFAULT_HISTORY_LIMIT = 250;
const DEFAULT_PATTERN_LIMIT = 10;
const DEFAULT_MINIMUM_PATTERN_COUNT = 2;
const DEFAULT_MEANINGFUL_CHANGE = 2;

/**
 * Returns a valid bounded integer.
 */
function normaliseLimit(
  value,
  {
    fallback = DEFAULT_HISTORY_LIMIT,
    minimum = 1,
    maximum = 500,
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
 * Returns a safe trimmed string.
 */
function safeString(value) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

/**
 * Converts a label into natural lowercase text.
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
 * Safely extracts nested metadata.
 */
function readMetadataObject(
  metadata,
  key
) {
  if (
    !metadata ||
    typeof metadata !== "object" ||
    Array.isArray(metadata)
  ) {
    return {};
  }

  const value = metadata[key];

  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return {};
  }

  return value;
}

/**
 * Returns the active user and profile identity.
 */
async function getRootMemoryIdentity() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  const profileKey =
    typeof window !== "undefined"
      ? localStorage.getItem(
          "root_profile_key_v1"
        ) || "main"
      : "main";

  let organisationId = null;

  if (user) {
    const {
      data: membership,
      error: membershipError,
    } = await supabase
      .from("organisation_members")
      .select("organisation_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (
      !membershipError &&
      membership
    ) {
      organisationId =
        membership.organisation_id || null;
    }
  }

  return {
    userId: user?.id || null,
    profileKey,
    organisationId,
  };
}

/**
 * Applies the active profile identity to a query.
 */
function applyIdentityToQuery(
  query,
  {
    userId,
    profileKey,
    organisationId,
  }
) {
  let scopedQuery = query.eq(
    "profile_key",
    profileKey
  );

  if (userId) {
    scopedQuery = scopedQuery.eq(
      "user_id",
      userId
    );
  }

  if (organisationId) {
    scopedQuery = scopedQuery.eq(
      "organisation_id",
      organisationId
    );
  }

  return scopedQuery;
}

/**
 * Returns a confidence label based on repeated observations.
 *
 * These labels represent repetition only.
 * They are not statistical or clinical confidence scores.
 */
export function getMemoryConfidenceLevel(
  observationCount
) {
  const count = Math.max(
    Number(observationCount) || 0,
    0
  );

  if (count >= 10) {
    return ROOT_MEMORY_CONFIDENCE_LEVELS
      .ESTABLISHED;
  }

  if (count >= 5) {
    return ROOT_MEMORY_CONFIDENCE_LEVELS
      .REPEATED;
  }

  if (count >= 3) {
    return ROOT_MEMORY_CONFIDENCE_LEVELS
      .EMERGING;
  }

  return ROOT_MEMORY_CONFIDENCE_LEVELS
    .EARLY;
}

/**
 * Retrieves recent completed after-measurements.
 *
 * Optional filters:
 * - constructKey
 * - interventionKey
 * - sourcePage
 */
export async function getRootMeasurementHistory({
  limit = DEFAULT_HISTORY_LIMIT,
  constructKey = null,
  interventionKey = null,
  sourcePage = null,
  oldestFirst = false,
} = {}) {
  const safeLimit = normaliseLimit(limit);

  const identity =
    await getRootMemoryIdentity();

  let query = supabase
    .from("root_measurements")
    .select("*")
    .eq(
      "phase",
      ROOT_MEASUREMENT_PHASES.AFTER
    )
    .eq("completed_cycle", true)
    .order("created_at", {
      ascending: Boolean(oldestFirst),
    })
    .limit(safeLimit);

  query = applyIdentityToQuery(
    query,
    identity
  );

  if (constructKey) {
    query = query.eq(
      "construct_key",
      constructKey
    );
  }

  if (interventionKey) {
    query = query.eq(
      "intervention_key",
      interventionKey
    );
  }

  if (sourcePage) {
    query = query.eq(
      "source_page",
      sourcePage
    );
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data || [];
}

/**
 * Groups measurements using a supplied key function.
 */
function groupMeasurements(
  measurements,
  keyBuilder
) {
  const groups = new Map();

  measurements.forEach(
    (measurement) => {
      const key = keyBuilder(measurement);

      if (!key) {
        return;
      }

      if (!groups.has(key)) {
        groups.set(key, []);
      }

      groups.get(key).push(measurement);
    }
  );

  return groups;
}

/**
 * Calculates the descriptive result for a collection
 * of completed measurements.
 */
function summariseMeasurements(
  measurements
) {
  const validMeasurements =
    measurements.filter((measurement) =>
      Number.isFinite(
        Number(
          measurement.improvement_score
        )
      )
    );

  const improvementScores =
    validMeasurements.map(
      (measurement) =>
        Number(
          measurement.improvement_score
        )
    );

  const totalImprovement =
    improvementScores.reduce(
      (total, score) => total + score,
      0
    );

  const averageImprovement =
    improvementScores.length
      ? totalImprovement /
        improvementScores.length
      : null;

  const improvedCount =
    improvementScores.filter(
      (score) => score > 0
    ).length;

  const worsenedCount =
    improvementScores.filter(
      (score) => score < 0
    ).length;

  const unchangedCount =
    improvementScores.filter(
      (score) => score === 0
    ).length;

  const meaningfulImprovementCount =
    improvementScores.filter(
      (score) =>
        score >=
        DEFAULT_MEANINGFUL_CHANGE
    ).length;

  const meaningfulWorseningCount =
    improvementScores.filter(
      (score) =>
        score <=
        -DEFAULT_MEANINGFUL_CHANGE
    ).length;

  const helpfulRate =
    improvementScores.length
      ? improvedCount /
        improvementScores.length
      : null;

  const worseningRate =
    improvementScores.length
      ? worsenedCount /
        improvementScores.length
      : null;

  let direction =
    ROOT_MEMORY_DIRECTIONS.UNKNOWN;

  if (improvementScores.length) {
    if (
      improvedCount > worsenedCount &&
      averageImprovement > 0
    ) {
      direction =
        ROOT_MEMORY_DIRECTIONS.IMPROVING;
    } else if (
      worsenedCount > improvedCount &&
      averageImprovement < 0
    ) {
      direction =
        ROOT_MEMORY_DIRECTIONS.WORSENING;
    } else if (
      improvedCount === 0 &&
      worsenedCount === 0
    ) {
      direction =
        ROOT_MEMORY_DIRECTIONS.STABLE;
    } else {
      direction =
        ROOT_MEMORY_DIRECTIONS.MIXED;
    }
  }

  return {
    measurementCount:
      measurements.length,

    scoredMeasurementCount:
      improvementScores.length,

    totalImprovement:
      roundNumber(totalImprovement),

    averageImprovement:
      roundNumber(averageImprovement),

    improvedCount,
    worsenedCount,
    unchangedCount,

    meaningfulImprovementCount,
    meaningfulWorseningCount,

    helpfulRate:
      roundNumber(helpfulRate),

    worseningRate:
      roundNumber(worseningRate),

    direction,

    confidence:
      getMemoryConfidenceLevel(
        improvementScores.length
      ),
  };
}

/**
 * Builds a careful pattern classification.
 */
function classifyInterventionPattern(
  summary
) {
  if (
    summary.scoredMeasurementCount <
    DEFAULT_MINIMUM_PATTERN_COUNT
  ) {
    return ROOT_MEMORY_PATTERN_TYPES
      .INSUFFICIENT_EVIDENCE;
  }

  if (
    summary.improvedCount >
      summary.worsenedCount &&
    summary.averageImprovement > 0
  ) {
    return ROOT_MEMORY_PATTERN_TYPES
      .HELPFUL_INTERVENTION;
  }

  if (
    summary.worsenedCount >
      summary.improvedCount &&
    summary.averageImprovement < 0
  ) {
    return ROOT_MEMORY_PATTERN_TYPES
      .UNHELPFUL_INTERVENTION;
  }

  return ROOT_MEMORY_PATTERN_TYPES
    .MIXED_INTERVENTION;
}

/**
 * Builds warm, non-causal wording for an
 * intervention pattern.
 */
function buildInterventionMemoryText({
  constructLabel,
  interventionLabel,
  summary,
  patternType,
}) {
  const construct =
    lowerFirst(
      constructLabel ||
        "this experience"
    );

  const intervention =
    interventionLabel ||
    "This approach";

  const attempts =
    summary.scoredMeasurementCount;

  if (
    patternType ===
    ROOT_MEMORY_PATTERN_TYPES
      .INSUFFICIENT_EVIDENCE
  ) {
    if (attempts === 1) {
      return `${intervention} has been tried once for ${construct}. Root needs more observations before describing a pattern.`;
    }

    return `Root does not yet have enough completed observations to describe how ${intervention} relates to ${construct}.`;
  }

  if (
    patternType ===
    ROOT_MEMORY_PATTERN_TYPES
      .HELPFUL_INTERVENTION
  ) {
    return `${intervention} was followed by improvement in ${construct} on ${summary.improvedCount} of ${attempts} occasions.`;
  }

  if (
    patternType ===
    ROOT_MEMORY_PATTERN_TYPES
      .UNHELPFUL_INTERVENTION
  ) {
    return `${intervention} was followed by worsening in ${construct} on ${summary.worsenedCount} of ${attempts} occasions.`;
  }

  return `${intervention} has produced a mixed pattern for ${construct}: improvement on ${summary.improvedCount} occasions, worsening on ${summary.worsenedCount}, and no immediate change on ${summary.unchangedCount}.`;
}

/**
 * Returns memory for one intervention and one construct.
 */
export async function getInterventionMemory({
  constructKey,
  interventionKey,
  limit = 100,
}) {
  if (!constructKey) {
    throw new Error(
      "A construct key is required."
    );
  }

  if (!interventionKey) {
    throw new Error(
      "An intervention key is required."
    );
  }

  const measurements =
    await getRootMeasurementHistory({
      constructKey,
      interventionKey,
      limit,
    });

  const summary =
    summariseMeasurements(
      measurements
    );

  const mostRecent =
    measurements[0] || null;

  const patternType =
    classifyInterventionPattern(summary);

  const constructLabel =
    mostRecent?.construct_label ||
    constructKey;

  const interventionLabel =
    mostRecent?.intervention_label ||
    interventionKey;

  return {
    memorySchemaVersion:
      ROOT_MEMORY_SCHEMA_VERSION,

    patternType,

    constructKey,
    constructLabel,

    interventionKey,
    interventionLabel,

    ...summary,

    mostRecentAt:
      mostRecent?.created_at || null,

    text: buildInterventionMemoryText({
      constructLabel,
      interventionLabel,
      summary,
      patternType,
    }),

    /*
     * Root may mention the pattern once there
     * are at least two completed observations.
     */
    mentionable:
      summary.scoredMeasurementCount >=
      DEFAULT_MINIMUM_PATTERN_COUNT,

    /*
     * Root may recommend gently when repeated
     * improvement outweighs worsening.
     */
    recommendable:
      summary.scoredMeasurementCount >= 3 &&
      summary.improvedCount >
        summary.worsenedCount &&
      summary.averageImprovement > 0,

    measurements,
  };
}

/**
 * Finds intervention patterns for one construct.
 *
 * Results are ranked by:
 * 1. average improvement
 * 2. helpful rate
 * 3. number of observations
 */
export async function getHelpfulInterventions({
  constructKey,
  limit = DEFAULT_PATTERN_LIMIT,
  historyLimit = DEFAULT_HISTORY_LIMIT,
  minimumObservations =
    DEFAULT_MINIMUM_PATTERN_COUNT,
} = {}) {
  if (!constructKey) {
    throw new Error(
      "A construct key is required."
    );
  }

  const safePatternLimit =
    normaliseLimit(limit, {
      fallback: DEFAULT_PATTERN_LIMIT,
      maximum: 50,
    });

  const measurements =
    await getRootMeasurementHistory({
      constructKey,
      limit: historyLimit,
    });

  const groups = groupMeasurements(
    measurements,
    (measurement) =>
      measurement.intervention_key ||
      null
  );

  const patterns = Array.from(
    groups.entries()
  )
    .map(
      ([
        interventionKey,
        groupedMeasurements,
      ]) => {
        const summary =
          summariseMeasurements(
            groupedMeasurements
          );

        const mostRecent =
          groupedMeasurements[0] || null;

        const patternType =
          classifyInterventionPattern(
            summary
          );

        return {
          memorySchemaVersion:
            ROOT_MEMORY_SCHEMA_VERSION,

          patternType,

          constructKey,

          constructLabel:
            mostRecent?.construct_label ||
            constructKey,

          interventionKey,

          interventionLabel:
            mostRecent
              ?.intervention_label ||
            interventionKey,

          ...summary,

          mostRecentAt:
            mostRecent?.created_at ||
            null,

          text:
            buildInterventionMemoryText({
              constructLabel:
                mostRecent
                  ?.construct_label ||
                constructKey,

              interventionLabel:
                mostRecent
                  ?.intervention_label ||
                interventionKey,

              summary,
              patternType,
            }),
        };
      }
    )
    .filter(
      (pattern) =>
        pattern.scoredMeasurementCount >=
          minimumObservations &&
        pattern.patternType ===
          ROOT_MEMORY_PATTERN_TYPES
            .HELPFUL_INTERVENTION
    )
    .sort((a, b) => {
      const averageDifference =
        (b.averageImprovement || 0) -
        (a.averageImprovement || 0);

      if (averageDifference !== 0) {
        return averageDifference;
      }

      const helpfulRateDifference =
        (b.helpfulRate || 0) -
        (a.helpfulRate || 0);

      if (
        helpfulRateDifference !== 0
      ) {
        return helpfulRateDifference;
      }

      return (
        b.scoredMeasurementCount -
        a.scoredMeasurementCount
      );
    })
    .slice(0, safePatternLimit);

  return patterns;
}

/**
 * Returns all intervention patterns for a construct,
 * including mixed and worsening patterns.
 */
export async function getConstructInterventionPatterns({
  constructKey,
  limit = 50,
  minimumObservations = 1,
} = {}) {
  if (!constructKey) {
    throw new Error(
      "A construct key is required."
    );
  }

  const measurements =
    await getRootMeasurementHistory({
      constructKey,
      limit,
    });

  const groups = groupMeasurements(
    measurements,
    (measurement) =>
      measurement.intervention_key ||
      null
  );

  return Array.from(groups.entries())
    .map(
      ([
        interventionKey,
        groupedMeasurements,
      ]) => {
        const summary =
          summariseMeasurements(
            groupedMeasurements
          );

        const mostRecent =
          groupedMeasurements[0] || null;

        const patternType =
          classifyInterventionPattern(
            summary
          );

        const constructLabel =
          mostRecent?.construct_label ||
          constructKey;

        const interventionLabel =
          mostRecent
            ?.intervention_label ||
          interventionKey;

        return {
          patternType,

          constructKey,
          constructLabel,

          interventionKey,
          interventionLabel,

          ...summary,

          mostRecentAt:
            mostRecent?.created_at ||
            null,

          text:
            buildInterventionMemoryText({
              constructLabel,
              interventionLabel,
              summary,
              patternType,
            }),
        };
      }
    )
    .filter(
      (pattern) =>
        pattern.scoredMeasurementCount >=
        minimumObservations
    )
    .sort(
      (a, b) =>
        new Date(b.mostRecentAt || 0) -
        new Date(a.mostRecentAt || 0)
    );
}

/**
 * Builds a simple longitudinal trend for one construct.
 *
 * Improvement scores are already direction-adjusted by
 * the measurement engine:
 *
 * positive = improvement
 * negative = worsening
 */
export async function getConstructTrend({
  constructKey,
  limit = 30,
} = {}) {
  if (!constructKey) {
    throw new Error(
      "A construct key is required."
    );
  }

  const measurements =
    await getRootMeasurementHistory({
      constructKey,
      limit,
      oldestFirst: true,
    });

  const scoredMeasurements =
    measurements.filter((measurement) =>
      Number.isFinite(
        Number(
          measurement.improvement_score
        )
      )
    );

  const summary =
    summariseMeasurements(
      scoredMeasurements
    );

  const earliest =
    scoredMeasurements[0] || null;

  const latest =
    scoredMeasurements[
      scoredMeasurements.length - 1
    ] || null;

  const recentWindow =
    scoredMeasurements.slice(-5);

  const earlierWindow =
    scoredMeasurements.slice(
      Math.max(
        scoredMeasurements.length - 10,
        0
      ),
      Math.max(
        scoredMeasurements.length - 5,
        0
      )
    );

  const averageScore = (items) => {
    const scores = items
      .map((item) =>
        Number(item.score)
      )
      .filter(Number.isFinite);

    if (!scores.length) {
      return null;
    }

    return (
      scores.reduce(
        (total, score) =>
          total + score,
        0
      ) / scores.length
    );
  };

  const recentAverage =
    averageScore(recentWindow);

  const earlierAverage =
    averageScore(earlierWindow);

  const higherScoreMeans =
    latest?.higher_score_means || null;

  let longitudinalDirection =
    ROOT_MEMORY_DIRECTIONS.UNKNOWN;

  let longitudinalImprovement = null;

  if (
    recentAverage !== null &&
    earlierAverage !== null
  ) {
    const rawMovement =
      recentAverage -
      earlierAverage;

    const higherIsBetter =
      higherScoreMeans ===
        "greater_strength" ||
      higherScoreMeans ===
        "greater_wellbeing" ||
      higherScoreMeans ===
        "higher_is_better";

    longitudinalImprovement =
      higherIsBetter
        ? rawMovement
        : -rawMovement;

    if (
      longitudinalImprovement > 0.5
    ) {
      longitudinalDirection =
        ROOT_MEMORY_DIRECTIONS
          .IMPROVING;
    } else if (
      longitudinalImprovement < -0.5
    ) {
      longitudinalDirection =
        ROOT_MEMORY_DIRECTIONS
          .WORSENING;
    } else {
      longitudinalDirection =
        ROOT_MEMORY_DIRECTIONS.STABLE;
    }
  }

  const constructLabel =
    latest?.construct_label ||
    earliest?.construct_label ||
    constructKey;

  let text;

  if (
    scoredMeasurements.length < 2
  ) {
    text = `Root does not yet have enough completed observations to describe a trend in ${lowerFirst(
      constructLabel
    )}.`;
  } else if (
    longitudinalDirection ===
    ROOT_MEMORY_DIRECTIONS.IMPROVING
  ) {
    text = `${constructLabel} appears to have been improving across Root's recent observations.`;
  } else if (
    longitudinalDirection ===
    ROOT_MEMORY_DIRECTIONS.WORSENING
  ) {
    text = `${constructLabel} appears to have become more difficult across Root's recent observations.`;
  } else if (
    longitudinalDirection ===
    ROOT_MEMORY_DIRECTIONS.STABLE
  ) {
    text = `${constructLabel} has remained broadly stable across Root's recent observations.`;
  } else {
    text = `${constructLabel} currently shows a mixed pattern.`;
  }

  return {
    memorySchemaVersion:
      ROOT_MEMORY_SCHEMA_VERSION,

    constructKey,
    constructLabel,

    measurementCount:
      scoredMeasurements.length,

    direction:
      longitudinalDirection,

    longitudinalImprovement:
      roundNumber(
        longitudinalImprovement
      ),

    recentAverage:
      roundNumber(recentAverage),

    earlierAverage:
      roundNumber(earlierAverage),

    firstObservedAt:
      earliest?.created_at || null,

    lastObservedAt:
      latest?.created_at || null,

    confidence:
      getMemoryConfidenceLevel(
        scoredMeasurements.length
      ),

    text,

    summary,
    measurements:
      scoredMeasurements,
  };
}

/**
 * Returns the most recent completed observations.
 *
 * This can later power:
 * - "Last time..."
 * - Coach opening context
 * - Insights memory cards
 */
export async function getRecentRootMemories({
  limit = 10,
} = {}) {
  const safeLimit = normaliseLimit(
    limit,
    {
      fallback: 10,
      maximum: 50,
    }
  );

  const measurements =
    await getRootMeasurementHistory({
      limit: safeLimit,
    });

  return measurements.map(
    (measurement) => {
      const improvementScore =
        toNumber(
          measurement
            .improvement_score
        );

      const constructLabel =
        measurement.construct_label ||
        measurement.construct_key ||
        "This experience";

      const interventionLabel =
        measurement
          .intervention_label ||
        "The intervention";

      let direction =
        ROOT_MEMORY_DIRECTIONS.STABLE;

      if (
        improvementScore !== null &&
        improvementScore > 0
      ) {
        direction =
          ROOT_MEMORY_DIRECTIONS
            .IMPROVING;
      } else if (
        improvementScore !== null &&
        improvementScore < 0
      ) {
        direction =
          ROOT_MEMORY_DIRECTIONS
            .WORSENING;
      }

      let text;

      if (
        direction ===
        ROOT_MEMORY_DIRECTIONS
          .IMPROVING
      ) {
        text = `${interventionLabel} was followed by an improvement in ${lowerFirst(
          constructLabel
        )}.`;
      } else if (
        direction ===
        ROOT_MEMORY_DIRECTIONS
          .WORSENING
      ) {
        text = `${interventionLabel} was followed by greater difficulty in ${lowerFirst(
          constructLabel
        )}.`;
      } else {
        text = `${interventionLabel} was followed by no immediate change in ${lowerFirst(
          constructLabel
        )}.`;
      }

      return {
        cycleId:
          measurement.cycle_id,

        constructKey:
          measurement.construct_key,

        constructLabel,

        interventionKey:
          measurement.intervention_key,

        interventionLabel,

        score:
          toNumber(measurement.score),

        changeScore:
          toNumber(
            measurement.change_score
          ),

        improvementScore,

        direction,

        createdAt:
          measurement.created_at,

        sourcePage:
          measurement.source_page ||
          null,

        text,

        rootCoreMetadata:
          readMetadataObject(
            measurement.metadata,
            "root_core"
          ),

        rootMeasureMetadata:
          readMetadataObject(
            measurement.metadata,
            "root_measure"
          ),
      };
    }
  );
}

/**
 * Builds a compact memory bundle for the Root Coach.
 *
 * It deliberately returns structured data rather than an
 * AI prompt. This keeps Root Memory independent of any one
 * model or provider.
 */
export async function buildCoachMemoryContext({
  constructKey,
  recentLimit = 5,
  interventionLimit = 3,
} = {}) {
  if (!constructKey) {
    throw new Error(
      "A construct key is required."
    );
  }

  const [
    trend,
    helpfulInterventions,
    recentMeasurements,
  ] = await Promise.all([
    getConstructTrend({
      constructKey,
      limit: 30,
    }),

    getHelpfulInterventions({
      constructKey,
      limit: interventionLimit,
      historyLimit: 200,
      minimumObservations: 2,
    }),

    getRootMeasurementHistory({
      constructKey,
      limit: recentLimit,
    }),
  ]);

  return {
    memorySchemaVersion:
      ROOT_MEMORY_SCHEMA_VERSION,

    constructKey,

    constructLabel:
      trend.constructLabel,

    trend: {
      direction: trend.direction,
      confidence: trend.confidence,
      text: trend.text,
      recentAverage:
        trend.recentAverage,
      earlierAverage:
        trend.earlierAverage,
    },

    helpfulInterventions:
      helpfulInterventions.map(
        (pattern) => ({
          interventionKey:
            pattern.interventionKey,

          interventionLabel:
            pattern.interventionLabel,

          measurementCount:
            pattern
              .scoredMeasurementCount,

          improvedCount:
            pattern.improvedCount,

          worsenedCount:
            pattern.worsenedCount,

          unchangedCount:
            pattern.unchangedCount,

          averageImprovement:
            pattern.averageImprovement,

          confidence:
            pattern.confidence,

          text: pattern.text,
        })
      ),

    recentMeasurements:
      recentMeasurements.map(
        (measurement) => ({
          cycleId:
            measurement.cycle_id,

          interventionKey:
            measurement
              .intervention_key,

          interventionLabel:
            measurement
              .intervention_label,

          improvementScore:
            toNumber(
              measurement
                .improvement_score
            ),

          score:
            toNumber(
              measurement.score
            ),

          createdAt:
            measurement.created_at,

          sourcePage:
            measurement.source_page ||
            null,
        })
      ),

    safety: {
      descriptiveOnly: true,
      claimsCausation: false,
      diagnostic: false,
      userMayCorrectMemory: true,
    },
  };
}

/**
 * Builds a warm suggested sentence from structured
 * Coach memory.
 *
 * This is suitable for display only when:
 * - the pattern has repeated
 * - the wording remains tentative
 * - Root allows the user to choose differently
 */
export function buildCoachMemorySentence(
  memoryContext
) {
  if (
    !memoryContext ||
    typeof memoryContext !== "object"
  ) {
    return null;
  }

  const bestIntervention =
    memoryContext
      .helpfulInterventions?.[0];

  const constructLabel =
    memoryContext.constructLabel ||
    "this";

  if (bestIntervention) {
    return `Last time ${lowerFirst(
      constructLabel
    )} felt difficult, ${lowerFirst(
      bestIntervention
        .interventionLabel
    )} was one of the approaches most often followed by improvement. Would you like to consider that again?`;
  }

  const trend =
    memoryContext.trend;

  if (
    trend?.direction ===
    ROOT_MEMORY_DIRECTIONS
      .IMPROVING
  ) {
    return `Root has noticed that ${lowerFirst(
      constructLabel
    )} has been improving recently. What do you think may have helped?`;
  }

  if (
    trend?.direction ===
    ROOT_MEMORY_DIRECTIONS
      .WORSENING
  ) {
    return `Root has noticed that ${lowerFirst(
      constructLabel
    )} has felt more difficult recently. Shall we look at what may have changed?`;
  }

  return null;
}

/**
 * Returns a dashboard-ready overview of Root Memory.
 *
 * This can later support:
 * - Root's Memory of You
 * - Insights
 * - Coach
 * - organisation reporting
 */
export async function getRootMemoryOverview({
  historyLimit = DEFAULT_HISTORY_LIMIT,
  patternLimit = 10,
} = {}) {
  const measurements =
    await getRootMeasurementHistory({
      limit: historyLimit,
    });

  const constructGroups =
    groupMeasurements(
      measurements,
      (measurement) =>
        measurement.construct_key ||
        null
    );

  const interventionGroups =
    groupMeasurements(
      measurements,
      (measurement) => {
        if (
          !measurement.construct_key ||
          !measurement.intervention_key
        ) {
          return null;
        }

        return `${measurement.construct_key}::${measurement.intervention_key}`;
      }
    );

  const constructSummaries =
    Array.from(
      constructGroups.entries()
    ).map(
      ([
        constructKey,
        groupedMeasurements,
      ]) => {
        const latest =
          groupedMeasurements[0] ||
          null;

        return {
          constructKey,

          constructLabel:
            latest?.construct_label ||
            constructKey,

          ...summariseMeasurements(
            groupedMeasurements
          ),

          mostRecentAt:
            latest?.created_at ||
            null,
        };
      }
    );

  const interventionPatterns =
    Array.from(
      interventionGroups.values()
    )
      .map((groupedMeasurements) => {
        const latest =
          groupedMeasurements[0] ||
          null;

        const summary =
          summariseMeasurements(
            groupedMeasurements
          );

        const patternType =
          classifyInterventionPattern(
            summary
          );

        return {
          patternType,

          constructKey:
            latest?.construct_key ||
            null,

          constructLabel:
            latest?.construct_label ||
            null,

          interventionKey:
            latest
              ?.intervention_key ||
            null,

          interventionLabel:
            latest
              ?.intervention_label ||
            null,

          ...summary,

          mostRecentAt:
            latest?.created_at ||
            null,

          text:
            buildInterventionMemoryText({
              constructLabel:
                latest
                  ?.construct_label,

              interventionLabel:
                latest
                  ?.intervention_label,

              summary,
              patternType,
            }),
        };
      })
      .sort((a, b) => {
        const averageDifference =
          (b.averageImprovement || 0) -
          (a.averageImprovement || 0);

        if (averageDifference !== 0) {
          return averageDifference;
        }

        return (
          b.scoredMeasurementCount -
          a.scoredMeasurementCount
        );
      })
      .slice(
        0,
        normaliseLimit(
          patternLimit,
          {
            fallback: 10,
            maximum: 50,
          }
        )
      );

  return {
    memorySchemaVersion:
      ROOT_MEMORY_SCHEMA_VERSION,

    generatedAt:
      new Date().toISOString(),

    totalCompletedMeasurements:
      measurements.length,

    constructCount:
      constructGroups.size,

    interventionPatternCount:
      interventionGroups.size,

    constructSummaries,

    interventionPatterns,

    recentMeasurements:
      measurements.slice(0, 10),

    safety: {
      descriptiveOnly: true,
      diagnostic: false,
      causalClaimsAllowed: false,
    },
  };
}

export default {
  getRootMeasurementHistory,
  getInterventionMemory,
  getHelpfulInterventions,
  getConstructInterventionPatterns,
  getConstructTrend,
  getRecentRootMemories,
  buildCoachMemoryContext,
  buildCoachMemorySentence,
  getRootMemoryOverview,
  getMemoryConfidenceLevel,
};
