import { supabase } from "./supabase";

import {
  ROOT_CONSTRUCT_SCHEMA_VERSION,
  ROOT_SCORE_DIRECTIONS,
  getRootConstruct,
  getConstructMeasurementIdentity,
} from "./rootCore/rootConstructs";

/**
 * Root Measurement Engine
 *
 * This engine manages before-and-after measurement cycles while preserving
 * the warm, human experience presented by Root.
 *
 * Existing pages may continue to provide:
 *
 * startMeasurement({
 *   domain,
 *   constructKey,
 *   constructLabel,
 *   question,
 *   score
 * })
 *
 * Newer pages may provide only:
 *
 * startMeasurement({
 *   constructKey,
 *   score
 * })
 *
 * When the construct exists in Root Core, the engine can automatically
 * resolve its domain, human label, question, score direction and permanent
 * scientific identity.
 *
 * Important:
 * - This file does not diagnose.
 * - This file does not alter the visible user experience.
 * - This file preserves existing database column names.
 * - Additional Root Core identity is stored inside metadata.
 */

export const ROOT_MEASUREMENT_ENGINE_VERSION = "2.0.0";

export const ROOT_MEASUREMENT_PHASES = Object.freeze({
  BEFORE: "before",
  AFTER: "after",
});

export const ROOT_MEASUREMENT_DIRECTIONS = Object.freeze({
  IMPROVED: "improved",
  WORSENED: "worsened",
  UNCHANGED: "unchanged",
});

export const ROOT_MEASUREMENT_CHANGE_LEVELS = Object.freeze({
  MEANINGFUL_IMPROVEMENT: "meaningful_improvement",
  SMALL_IMPROVEMENT: "small_improvement",
  NO_CHANGE: "no_change",
  SMALL_WORSENING: "small_worsening",
  MEANINGFUL_WORSENING: "meaningful_worsening",
});

const DEFAULT_MINIMUM_SCORE = 0;
const DEFAULT_MAXIMUM_SCORE = 10;
const DEFAULT_MEANINGFUL_CHANGE = 2;

/**
 * Creates a browser-safe measurement cycle ID.
 */
function createCycleId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
    /[xy]/g,
    (character) => {
      const random = Math.floor(Math.random() * 16);
      const value =
        character === "x"
          ? random
          : (random & 0x3) | 0x8;

      return value.toString(16);
    }
  );
}

/**
 * Prevents mutable metadata objects being changed after a measurement
 * request has begun.
 */
function cloneMetadata(metadata) {
  if (
    !metadata ||
    typeof metadata !== "object" ||
    Array.isArray(metadata)
  ) {
    return {};
  }

  return { ...metadata };
}

/**
 * Converts values into valid Root scores.
 */
function normaliseScore(
  score,
  {
    minimum = DEFAULT_MINIMUM_SCORE,
    maximum = DEFAULT_MAXIMUM_SCORE,
  } = {}
) {
  const value = Number(score);

  if (!Number.isFinite(value)) {
    throw new Error(
      "Measurement score must be a number."
    );
  }

  if (value < minimum || value > maximum) {
    throw new Error(
      `Measurement score must be between ${minimum} and ${maximum}.`
    );
  }

  return value;
}

/**
 * Root originally used "greater_wellbeing".
 *
 * Root Core now uses "greater_strength".
 *
 * This function supports both so existing pages do not break.
 */
function normaliseScoreDirection(direction) {
  const value =
    typeof direction === "string"
      ? direction.trim().toLowerCase()
      : "";

  if (
    value === ROOT_SCORE_DIRECTIONS.GREATER_STRENGTH ||
    value === "greater_wellbeing" ||
    value === "higher_is_better" ||
    value === "greater_capacity"
  ) {
    return ROOT_SCORE_DIRECTIONS.GREATER_STRENGTH;
  }

  if (
    value === ROOT_SCORE_DIRECTIONS.GREATER_DIFFICULTY ||
    value === "lower_is_better" ||
    value === "greater_burden"
  ) {
    return ROOT_SCORE_DIRECTIONS.GREATER_DIFFICULTY;
  }

  if (
    value === ROOT_SCORE_DIRECTIONS.GREATER_FREQUENCY
  ) {
    return ROOT_SCORE_DIRECTIONS.GREATER_FREQUENCY;
  }

  if (
    value === ROOT_SCORE_DIRECTIONS.GREATER_QUANTITY
  ) {
    return ROOT_SCORE_DIRECTIONS.GREATER_QUANTITY;
  }

  if (
    value === ROOT_SCORE_DIRECTIONS.CONTEXT_DEPENDENT
  ) {
    return ROOT_SCORE_DIRECTIONS.CONTEXT_DEPENDENT;
  }

  return ROOT_SCORE_DIRECTIONS.GREATER_DIFFICULTY;
}

/**
 * Determines whether an increase or decrease normally represents
 * improvement for a construct.
 */
function isHigherScoreBetter(higherScoreMeans) {
  const direction =
    normaliseScoreDirection(higherScoreMeans);

  return (
    direction ===
      ROOT_SCORE_DIRECTIONS.GREATER_STRENGTH ||
    direction ===
      ROOT_SCORE_DIRECTIONS.GREATER_FREQUENCY ||
    direction ===
      ROOT_SCORE_DIRECTIONS.GREATER_QUANTITY
  );
}

/**
 * Resolves a supplied construct against Root Core.
 *
 * Legacy values remain valid when the construct has not yet been
 * registered in rootConstructs.js.
 */
function resolveConstruct({
  domain = null,
  constructKey = null,
  constructId = null,
  constructLabel = null,
  question = null,
  higherScoreMeans = null,
}) {
  const requestedIdentifier =
    constructId || constructKey || null;

  const rootConstruct = requestedIdentifier
    ? getRootConstruct(requestedIdentifier)
    : null;

  const resolvedConstructKey =
    rootConstruct?.id ||
    constructKey ||
    constructId ||
    null;

  const resolvedDomain =
    rootConstruct?.domainId ||
    domain ||
    null;

  const resolvedLabel =
    constructLabel ||
    rootConstruct?.shortTitle ||
    rootConstruct?.title ||
    resolvedConstructKey ||
    null;

  const resolvedQuestion =
    question ||
    rootConstruct?.measurementQuestion ||
    null;

  /*
   * An explicitly supplied direction wins.
   *
   * This matters because some visible measures may intentionally use a
   * difficulty scale even when the underlying construct is a strength.
   *
   * Example:
   * - construct: Physical Energy
   * - visible question: "How drained do you feel?"
   */
  const resolvedHigherScoreMeans =
    normaliseScoreDirection(
      higherScoreMeans ||
        rootConstruct?.higherScoreMeans ||
        ROOT_SCORE_DIRECTIONS.GREATER_DIFFICULTY
    );

  const scientificIdentity = rootConstruct
    ? getConstructMeasurementIdentity(rootConstruct.id)
    : null;

  return {
    rootConstruct,
    constructKey: resolvedConstructKey,
    constructLabel: resolvedLabel,
    domain: resolvedDomain,
    question: resolvedQuestion,
    higherScoreMeans: resolvedHigherScoreMeans,
    scientificIdentity,
  };
}

/**
 * Calculates change between two scores.
 *
 * changeScore:
 * Raw numerical movement.
 *
 * improvementScore:
 * Direction-adjusted movement.
 * Positive always means improvement.
 */
export function calculateMeasurementResult({
  beforeScore,
  afterScore,
  higherScoreMeans =
    ROOT_SCORE_DIRECTIONS.GREATER_DIFFICULTY,
  meaningfulChange = DEFAULT_MEANINGFUL_CHANGE,
  minimum = DEFAULT_MINIMUM_SCORE,
  maximum = DEFAULT_MAXIMUM_SCORE,
}) {
  const before = normaliseScore(beforeScore, {
    minimum,
    maximum,
  });

  const after = normaliseScore(afterScore, {
    minimum,
    maximum,
  });

  const threshold = Math.max(
    0,
    Number(meaningfulChange) ||
      DEFAULT_MEANINGFUL_CHANGE
  );

  const scoreDirection =
    normaliseScoreDirection(higherScoreMeans);

  const changeScore = after - before;

  let improvementScore;

  if (
    scoreDirection ===
    ROOT_SCORE_DIRECTIONS.CONTEXT_DEPENDENT
  ) {
    improvementScore = 0;
  } else if (isHigherScoreBetter(scoreDirection)) {
    improvementScore = after - before;
  } else {
    improvementScore = before - after;
  }

  let direction =
    ROOT_MEASUREMENT_DIRECTIONS.UNCHANGED;

  if (improvementScore > 0) {
    direction =
      ROOT_MEASUREMENT_DIRECTIONS.IMPROVED;
  } else if (improvementScore < 0) {
    direction =
      ROOT_MEASUREMENT_DIRECTIONS.WORSENED;
  }

  let changeLevel =
    ROOT_MEASUREMENT_CHANGE_LEVELS.NO_CHANGE;

  if (improvementScore >= threshold) {
    changeLevel =
      ROOT_MEASUREMENT_CHANGE_LEVELS
        .MEANINGFUL_IMPROVEMENT;
  } else if (improvementScore > 0) {
    changeLevel =
      ROOT_MEASUREMENT_CHANGE_LEVELS
        .SMALL_IMPROVEMENT;
  } else if (improvementScore <= -threshold) {
    changeLevel =
      ROOT_MEASUREMENT_CHANGE_LEVELS
        .MEANINGFUL_WORSENING;
  } else if (improvementScore < 0) {
    changeLevel =
      ROOT_MEASUREMENT_CHANGE_LEVELS
        .SMALL_WORSENING;
  }

  return {
    beforeScore: before,
    afterScore: after,
    changeScore,
    improvementScore,
    absoluteChange: Math.abs(changeScore),
    direction,
    changeLevel,
    meaningfulChangeThreshold: threshold,
    isMeaningfulChange:
      Math.abs(improvementScore) >= threshold,
    higherScoreMeans: scoreDirection,
  };
}

/**
 * Builds a warm, plain-language result.
 *
 * Difficulty constructs:
 * "Stress reduced by 2 points."
 *
 * Strength constructs:
 * "Hope increased by 2 points."
 */
function buildInsight({
  constructLabel,
  interventionLabel,
  beforeScore,
  afterScore,
  improvementScore,
  higherScoreMeans,
}) {
  const safeConstruct =
    constructLabel || "This experience";

  const safeIntervention =
    interventionLabel || "This intervention";

  const lowerConstruct =
    safeConstruct.charAt(0).toLowerCase() +
    safeConstruct.slice(1);

  const higherIsBetter =
    isHigherScoreBetter(higherScoreMeans);

  if (improvementScore > 0) {
    if (higherIsBetter) {
      return `${safeIntervention} was followed by a ${Math.abs(
        improvementScore
      )}-point increase in ${lowerConstruct}: ${beforeScore} → ${afterScore}.`;
    }

    return `${safeIntervention} was followed by a ${Math.abs(
      improvementScore
    )}-point reduction in ${lowerConstruct}: ${beforeScore} → ${afterScore}.`;
  }

  if (improvementScore === 0) {
    return `Root measured no immediate change in ${lowerConstruct} after ${safeIntervention}: ${beforeScore} → ${afterScore}.`;
  }

  if (higherIsBetter) {
    return `${safeConstruct} reduced by ${Math.abs(
      improvementScore
    )} points after ${safeIntervention}: ${beforeScore} → ${afterScore}.`;
  }

  return `${safeConstruct} increased by ${Math.abs(
    improvementScore
  )} points after ${safeIntervention}: ${beforeScore} → ${afterScore}.`;
}

/**
 * Adds stable Root Core identifiers to the metadata column.
 *
 * No new database columns are required.
 */
function buildMeasurementMetadata({
  metadata,
  resolvedConstruct,
  phase,
  sourcePage,
  meaningfulChange = null,
}) {
  const existingMetadata = cloneMetadata(metadata);

  return {
    ...existingMetadata,

    root_core: {
      ...(existingMetadata.root_core &&
      typeof existingMetadata.root_core === "object"
        ? existingMetadata.root_core
        : {}),

      measurementEngineVersion:
        ROOT_MEASUREMENT_ENGINE_VERSION,

      constructSchemaVersion:
        ROOT_CONSTRUCT_SCHEMA_VERSION,

      constructId:
        resolvedConstruct.constructKey,

      constructPermanentId:
        resolvedConstruct.scientificIdentity
          ?.constructPermanentId || null,

      domainId:
        resolvedConstruct.domain,

      constructKind:
        resolvedConstruct.scientificIdentity
          ?.constructKind || null,

      scoreDirection:
        resolvedConstruct.higherScoreMeans,

      phase,

      sourcePage: sourcePage || null,

      meaningfulChange:
        meaningfulChange === null
          ? null
          : Number(meaningfulChange),
    },
  };
}

/**
 * Identifies the user and organisation associated with a measurement.
 */
async function getMeasurementIdentity() {
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
      .select("organisation_id, profile_key")
      .eq("user_id", user.id)
      .maybeSingle();

    /*
     * Measurement should still work for individual users when an
     * organisation membership cannot be resolved.
     */
    if (!membershipError && membership) {
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
 * Retrieves the original before-measurement for a cycle.
 *
 * This allows finishMeasurement() to work without the page having to keep
 * the original score in memory.
 */
async function getBeforeMeasurement(cycleId) {
  if (!cycleId) {
    return null;
  }

  const { data, error } = await supabase
    .from("root_measurements")
    .select("*")
    .eq("cycle_id", cycleId)
    .eq(
      "phase",
      ROOT_MEASUREMENT_PHASES.BEFORE
    )
    .order("created_at", {
      ascending: true,
    })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data || null;
}

/**
 * Starts a before-and-after measurement cycle.
 *
 * Backwards-compatible use:
 *
 * startMeasurement({
 *   domain: "mind",
 *   constructKey: "stress_load",
 *   constructLabel: "Stress",
 *   question: "How overwhelmed do you feel?",
 *   score: 7
 * })
 *
 * Root Core use:
 *
 * startMeasurement({
 *   constructKey: ROOT_CONSTRUCT_IDS.STRESS_LOAD,
 *   score: 7
 * })
 */
export async function startMeasurement({
  domain = null,
  constructKey = null,
  constructId = null,
  constructLabel = null,
  question = null,
  score,
  higherScoreMeans = null,
  interventionKey = null,
  interventionLabel = null,
  sourcePage = null,
  meaningfulChange = DEFAULT_MEANINGFUL_CHANGE,
  metadata = {},
}) {
  const resolvedConstruct = resolveConstruct({
    domain,
    constructKey,
    constructId,
    constructLabel,
    question,
    higherScoreMeans,
  });

  if (!resolvedConstruct.domain) {
    throw new Error(
      "Measurement domain is required."
    );
  }

  if (!resolvedConstruct.constructKey) {
    throw new Error(
      "Measurement construct key is required."
    );
  }

  if (!resolvedConstruct.constructLabel) {
    throw new Error(
      "Measurement construct label is required."
    );
  }

  const normalisedScore =
    normaliseScore(score);

  const cycleId = createCycleId();

  const {
    userId,
    profileKey,
    organisationId,
  } = await getMeasurementIdentity();

  const measurementMetadata =
    buildMeasurementMetadata({
      metadata,
      resolvedConstruct,
      phase: ROOT_MEASUREMENT_PHASES.BEFORE,
      sourcePage,
      meaningfulChange,
    });

  const measurement = {
    cycle_id: cycleId,
    user_id: userId,
    profile_key: profileKey,
    organisation_id: organisationId,

    domain: resolvedConstruct.domain,
    construct_key:
      resolvedConstruct.constructKey,
    construct_label:
      resolvedConstruct.constructLabel,
    measurement_question:
      resolvedConstruct.question || null,

    phase: ROOT_MEASUREMENT_PHASES.BEFORE,
    score: normalisedScore,

    higher_score_means:
      resolvedConstruct.higherScoreMeans,

    intervention_key: interventionKey,
    intervention_label: interventionLabel,

    source_page: sourcePage,

    change_score: null,
    improvement_score: null,
    completed_cycle: false,

    metadata: measurementMetadata,
  };

  const { data, error } = await supabase
    .from("root_measurements")
    .insert([measurement])
    .select()
    .single();

  if (error) {
    throw error;
  }

  return {
    cycleId,
    measurement: data,
    construct:
      resolvedConstruct.rootConstruct || null,
    scientificIdentity:
      resolvedConstruct.scientificIdentity ||
      null,
  };
}

/**
 * Completes a before-and-after measurement cycle.
 *
 * beforeScore is now optional.
 *
 * When omitted, Root retrieves it from the original before-measurement.
 */
export async function finishMeasurement({
  cycleId,
  domain = null,
  constructKey = null,
  constructId = null,
  constructLabel = null,
  question = null,
  beforeScore = null,
  afterScore,
  higherScoreMeans = null,
  interventionKey,
  interventionLabel,
  sourcePage = null,
  meaningfulChange = DEFAULT_MEANINGFUL_CHANGE,
  metadata = {},
}) {
  if (!cycleId) {
    throw new Error(
      "A measurement cycle ID is required."
    );
  }

  if (!interventionKey || !interventionLabel) {
    throw new Error(
      "An intervention is required before completing a measurement cycle."
    );
  }

  let originalMeasurement = null;

  /*
   * Retrieve the original measurement when:
   * - beforeScore was not supplied; or
   * - construct information was not supplied.
   */
  if (
    beforeScore === null ||
    beforeScore === undefined ||
    !constructKey ||
    !domain
  ) {
    originalMeasurement =
      await getBeforeMeasurement(cycleId);
  }

  if (
    (beforeScore === null ||
      beforeScore === undefined) &&
    !originalMeasurement
  ) {
    throw new Error(
      "Root could not find the original before-measurement for this cycle."
    );
  }

  const resolvedBeforeScore =
    beforeScore !== null &&
    beforeScore !== undefined
      ? beforeScore
      : originalMeasurement.score;

  const resolvedConstruct = resolveConstruct({
    domain:
      domain ||
      originalMeasurement?.domain ||
      null,

    constructKey:
      constructKey ||
      originalMeasurement?.construct_key ||
      null,

    constructId,

    constructLabel:
      constructLabel ||
      originalMeasurement?.construct_label ||
      null,

    question:
      question ||
      originalMeasurement
        ?.measurement_question ||
      null,

    higherScoreMeans:
      higherScoreMeans ||
      originalMeasurement
        ?.higher_score_means ||
      null,
  });

  if (!resolvedConstruct.domain) {
    throw new Error(
      "Measurement domain is required."
    );
  }

  if (!resolvedConstruct.constructKey) {
    throw new Error(
      "Measurement construct key is required."
    );
  }

  const result =
    calculateMeasurementResult({
      beforeScore: resolvedBeforeScore,
      afterScore,
      higherScoreMeans:
        resolvedConstruct.higherScoreMeans,
      meaningfulChange,
    });

  const {
    userId,
    profileKey,
    organisationId,
  } = await getMeasurementIdentity();

  const measurementMetadata =
    buildMeasurementMetadata({
      metadata,
      resolvedConstruct,
      phase: ROOT_MEASUREMENT_PHASES.AFTER,
      sourcePage,
      meaningfulChange,
    });

  measurementMetadata.root_core.result = {
    direction: result.direction,
    changeLevel: result.changeLevel,
    absoluteChange: result.absoluteChange,
    isMeaningfulChange:
      result.isMeaningfulChange,
  };

  const measurement = {
    cycle_id: cycleId,
    user_id: userId,
    profile_key: profileKey,
    organisation_id: organisationId,

    domain: resolvedConstruct.domain,
    construct_key:
      resolvedConstruct.constructKey,
    construct_label:
      resolvedConstruct.constructLabel,
    measurement_question:
      resolvedConstruct.question || null,

    phase: ROOT_MEASUREMENT_PHASES.AFTER,
    score: result.afterScore,

    higher_score_means:
      resolvedConstruct.higherScoreMeans,

    intervention_key: interventionKey,
    intervention_label: interventionLabel,

    source_page: sourcePage,

    change_score: result.changeScore,
    improvement_score:
      result.improvementScore,
    completed_cycle: true,

    metadata: measurementMetadata,
  };

  const { data, error } = await supabase
    .from("root_measurements")
    .insert([measurement])
    .select()
    .single();

  if (error) {
    throw error;
  }

  const insight = buildInsight({
    constructLabel:
      resolvedConstruct.constructLabel,
    interventionLabel,
    beforeScore: result.beforeScore,
    afterScore: result.afterScore,
    improvementScore:
      result.improvementScore,
    higherScoreMeans:
      resolvedConstruct.higherScoreMeans,
  });

  return {
    ...result,
    cycleId,
    insight,
    measurement: data,
    beforeMeasurement:
      originalMeasurement || null,
    construct:
      resolvedConstruct.rootConstruct || null,
    scientificIdentity:
      resolvedConstruct.scientificIdentity ||
      null,
  };
}

/**
 * Previews a result without saving anything.
 *
 * Existing calls remain valid.
 */
export function previewMeasurementResult({
  domain = null,
  constructKey = null,
  constructId = null,
  constructLabel = null,
  question = null,
  interventionLabel,
  beforeScore,
  afterScore,
  higherScoreMeans = null,
  meaningfulChange = DEFAULT_MEANINGFUL_CHANGE,
}) {
  const resolvedConstruct = resolveConstruct({
    domain,
    constructKey,
    constructId,
    constructLabel,
    question,
    higherScoreMeans,
  });

  const result =
    calculateMeasurementResult({
      beforeScore,
      afterScore,
      higherScoreMeans:
        resolvedConstruct.higherScoreMeans,
      meaningfulChange,
    });

  return {
    ...result,

    insight: buildInsight({
      constructLabel:
        resolvedConstruct.constructLabel ||
        constructLabel,
      interventionLabel,
      beforeScore: result.beforeScore,
      afterScore: result.afterScore,
      improvementScore:
        result.improvementScore,
      higherScoreMeans:
        resolvedConstruct.higherScoreMeans,
    }),

    construct:
      resolvedConstruct.rootConstruct || null,

    scientificIdentity:
      resolvedConstruct.scientificIdentity ||
      null,
  };
}

/**
 * Retrieves all entries belonging to one measurement cycle.
 */
export async function getMeasurementCycle(
  cycleId
) {
  if (!cycleId) {
    throw new Error(
      "A measurement cycle ID is required."
    );
  }

  const { data, error } = await supabase
    .from("root_measurements")
    .select("*")
    .eq("cycle_id", cycleId)
    .order("created_at", {
      ascending: true,
    });

  if (error) {
    throw error;
  }

  const measurements = data || [];

  const beforeMeasurement =
    measurements.find(
      (item) =>
        item.phase ===
        ROOT_MEASUREMENT_PHASES.BEFORE
    ) || null;

  const afterMeasurement =
    measurements.find(
      (item) =>
        item.phase ===
        ROOT_MEASUREMENT_PHASES.AFTER
    ) || null;

  return {
    cycleId,
    measurements,
    beforeMeasurement,
    afterMeasurement,
    completed:
      Boolean(afterMeasurement?.completed_cycle),
  };
}

/**
 * Returns the most recent completed cycles for the active profile.
 *
 * This can later power:
 * - Insights
 * - Coach memory
 * - intervention effectiveness
 * - progress summaries
 *
 * It does not yet alter any visible page.
 */
export async function getRecentCompletedMeasurements({
  limit = 50,
  constructKey = null,
  interventionKey = null,
} = {}) {
  const safeLimit = Math.min(
    Math.max(Number(limit) || 50, 1),
    250
  );

  const {
    userId,
    profileKey,
  } = await getMeasurementIdentity();

  let query = supabase
    .from("root_measurements")
    .select("*")
    .eq("profile_key", profileKey)
    .eq("completed_cycle", true)
    .eq(
      "phase",
      ROOT_MEASUREMENT_PHASES.AFTER
    )
    .order("created_at", {
      ascending: false,
    })
    .limit(safeLimit);

  if (userId) {
    query = query.eq("user_id", userId);
  }

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

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data || [];
}

/**
 * Summarises how one intervention has performed for one construct.
 *
 * This is deliberately descriptive.
 * It does not claim causation.
 */
export async function getInterventionMeasurementSummary({
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
    await getRecentCompletedMeasurements({
      constructKey,
      interventionKey,
      limit,
    });

  if (!measurements.length) {
    return {
      constructKey,
      interventionKey,
      measurementCount: 0,
      averageImprovement: null,
      improvedCount: 0,
      worsenedCount: 0,
      unchangedCount: 0,
      meaningfulImprovementCount: 0,
      helpfulPattern: false,
    };
  }

  const improvements = measurements
    .map((item) =>
      Number(item.improvement_score)
    )
    .filter(Number.isFinite);

  const totalImprovement =
    improvements.reduce(
      (total, value) => total + value,
      0
    );

  const averageImprovement =
    improvements.length > 0
      ? totalImprovement /
        improvements.length
      : null;

  const improvedCount =
    improvements.filter(
      (value) => value > 0
    ).length;

  const worsenedCount =
    improvements.filter(
      (value) => value < 0
    ).length;

  const unchangedCount =
    improvements.filter(
      (value) => value === 0
    ).length;

  const meaningfulImprovementCount =
    improvements.filter(
      (value) =>
        value >=
        DEFAULT_MEANINGFUL_CHANGE
    ).length;

  return {
    constructKey,
    interventionKey,
    measurementCount:
      measurements.length,

    averageImprovement:
      averageImprovement === null
        ? null
        : Number(
            averageImprovement.toFixed(2)
          ),

    improvedCount,
    worsenedCount,
    unchangedCount,
    meaningfulImprovementCount,

    /*
     * This is a pattern flag, not a claim that the intervention caused
     * the change.
     */
    helpfulPattern:
      improvedCount > worsenedCount &&
      averageImprovement > 0,
  };
}
