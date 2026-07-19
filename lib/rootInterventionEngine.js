import { supabase } from "./supabase";

/**
 * ROOT INTERVENTION ENGINE
 *
 * Provides one consistent measurement pathway for every
 * intervention used across Root Health.
 *
 * Root's scoring principle:
 *
 * 0 = little or no current difficulty
 * 10 = the greatest current difficulty
 *
 * Every intervention follows the same loop:
 *
 * 1. Record the difficulty before the intervention.
 * 2. Complete or abandon the intervention.
 * 3. Record the difficulty afterwards.
 * 4. Calculate change.
 * 5. Store the result.
 * 6. Use repeated outcomes to improve future recommendations.
 */

const INTERVENTION_TABLE = "intervention_outcomes";

const ALLOWED_SOURCES = new Set([
  "mind",
  "body",
  "coach",
  "journal",
  "playbook",
  "check_in",
  "orientation",
  "other",
]);

const ALLOWED_CATEGORIES = new Set([
  "grounding",
  "breathing",
  "calming",
  "body_regulation",
  "thought_work",
  "journaling",
  "values",
  "movement",
  "sleep",
  "recovery",
  "routine",
  "social_support",
  "education",
  "other",
]);

function cleanText(value, maximumLength = 500) {
  if (typeof value !== "string") {
    return null;
  }

  const cleaned = value
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maximumLength);

  return cleaned || null;
}

function normaliseLabel(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normaliseSource(value) {
  const source = normaliseLabel(value);

  return ALLOWED_SOURCES.has(source) ? source : "other";
}

function normaliseCategory(value) {
  const category = normaliseLabel(value);

  return ALLOWED_CATEGORIES.has(category)
    ? category
    : "other";
}

/**
 * Root always uses whole-number scores from 0 to 10.
 */
export function normaliseDifficultyScore(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return null;
  }

  return Math.round(
    Math.min(10, Math.max(0, number))
  );
}

/**
 * Positive change means the difficulty reduced.
 *
 * Example:
 *
 * Before: 8
 * After: 5
 * Improvement: +3
 *
 * Before: 5
 * After: 7
 * Change: -2
 */
export function calculateInterventionChange(
  beforeScore,
  afterScore
) {
  const before = normaliseDifficultyScore(beforeScore);
  const after = normaliseDifficultyScore(afterScore);

  if (before === null || after === null) {
    return null;
  }

  return before - after;
}

export function describeInterventionChange(
  beforeScore,
  afterScore
) {
  const before = normaliseDifficultyScore(beforeScore);
  const after = normaliseDifficultyScore(afterScore);
  const change = calculateInterventionChange(
    before,
    after
  );

  if (
    before === null ||
    after === null ||
    change === null
  ) {
    return {
      direction: "unknown",
      change: null,
      headline: "Root needs both scores.",
      message:
        "Record how difficult this felt before and after the intervention so Root can measure what changed.",
    };
  }

  if (change >= 4) {
    return {
      direction: "strong_improvement",
      change,
      headline: "This appears to have helped significantly.",
      message: `Your difficulty reduced from ${before} to ${after}, an improvement of ${change} points.`,
    };
  }

  if (change >= 2) {
    return {
      direction: "improvement",
      change,
      headline: "This appears to have helped.",
      message: `Your difficulty reduced from ${before} to ${after}, an improvement of ${change} points.`,
    };
  }

  if (change === 1) {
    return {
      direction: "small_improvement",
      change,
      headline: "There was a small shift.",
      message: `Your difficulty reduced from ${before} to ${after}. Root will remember this alongside future attempts.`,
    };
  }

  if (change === 0) {
    return {
      direction: "no_change",
      change,
      headline: "There was no measured change this time.",
      message: `Your difficulty remained at ${after}. That does not mean the intervention failed; it may not have been the right tool, timing or context.`,
    };
  }

  return {
    direction: "worsening",
    change,
    headline: "This did not appear to help this time.",
    message: `Your difficulty increased from ${before} to ${after}. Root will avoid treating this intervention as helpful based on this attempt.`,
  };
}

/**
 * Begin an intervention.
 *
 * This creates the first half of the measurement record.
 */
export async function startIntervention({
  profileKey,
  organisationId = null,
  source = "mind",
  emotionalState = null,
  target,
  interventionCategory,
  interventionName,
  beforeScore,
  context = null,
} = {}) {
  try {
    const safeProfileKey = cleanText(profileKey, 200);
    const safeTarget = cleanText(target, 160);
    const safeInterventionName = cleanText(
      interventionName,
      200
    );

    const safeBeforeScore =
      normaliseDifficultyScore(beforeScore);

    if (!safeProfileKey) {
      return {
        success: false,
        reason: "profile_key_missing",
        record: null,
      };
    }

    if (!safeTarget) {
      return {
        success: false,
        reason: "target_missing",
        record: null,
      };
    }

    if (!safeInterventionName) {
      return {
        success: false,
        reason: "intervention_name_missing",
        record: null,
      };
    }

    if (safeBeforeScore === null) {
      return {
        success: false,
        reason: "before_score_missing",
        record: null,
      };
    }

    const row = {
      profile_key: safeProfileKey,
      organisation_id:
        cleanText(organisationId, 200),
      source: normaliseSource(source),
      emotional_state: cleanText(
        emotionalState,
        120
      ),
      target: safeTarget,
      intervention_category:
        normaliseCategory(interventionCategory),
      intervention_name: safeInterventionName,
      before_score: safeBeforeScore,
      after_score: null,
      completed: false,
      context: cleanText(context, 1000),
      user_observation: null,
      started_at: new Date().toISOString(),
      completed_at: null,
    };

    const { data, error } = await supabase
      .from(INTERVENTION_TABLE)
      .insert(row)
      .select("*")
      .single();

    if (error) {
      console.error(
        "ROOT INTERVENTION START ERROR:",
        error
      );

      return {
        success: false,
        reason: "database_error",
        error,
        record: null,
      };
    }

    return {
      success: true,
      reason: "started",
      record: data,
    };
  } catch (error) {
    console.error(
      "ROOT INTERVENTION START EXCEPTION:",
      error
    );

    return {
      success: false,
      reason: "unexpected_error",
      error,
      record: null,
    };
  }
}

/**
 * Complete an intervention and record the second score.
 */
export async function completeIntervention({
  interventionId,
  profileKey,
  afterScore,
  userObservation = null,
} = {}) {
  try {
    const safeId = cleanText(interventionId, 200);
    const safeProfileKey = cleanText(profileKey, 200);
    const safeAfterScore =
      normaliseDifficultyScore(afterScore);

    if (!safeId) {
      return {
        success: false,
        reason: "intervention_id_missing",
        record: null,
      };
    }

    if (!safeProfileKey) {
      return {
        success: false,
        reason: "profile_key_missing",
        record: null,
      };
    }

    if (safeAfterScore === null) {
      return {
        success: false,
        reason: "after_score_missing",
        record: null,
      };
    }

    const { data, error } = await supabase
      .from(INTERVENTION_TABLE)
      .update({
        after_score: safeAfterScore,
        completed: true,
        user_observation: cleanText(
          userObservation,
          1000
        ),
        completed_at: new Date().toISOString(),
      })
      .eq("id", safeId)
      .eq("profile_key", safeProfileKey)
      .select("*")
      .single();

    if (error) {
      console.error(
        "ROOT INTERVENTION COMPLETE ERROR:",
        error
      );

      return {
        success: false,
        reason: "database_error",
        error,
        record: null,
      };
    }

    const result = describeInterventionChange(
      data.before_score,
      data.after_score
    );

    return {
      success: true,
      reason: "completed",
      record: data,
      result,
    };
  } catch (error) {
    console.error(
      "ROOT INTERVENTION COMPLETE EXCEPTION:",
      error
    );

    return {
      success: false,
      reason: "unexpected_error",
      error,
      record: null,
    };
  }
}

/**
 * Mark an intervention as abandoned without inventing an
 * after score.
 *
 * Abandonment is still valuable evidence because Root can learn
 * which interventions people begin but do not complete.
 */
export async function abandonIntervention({
  interventionId,
  profileKey,
  userObservation = null,
} = {}) {
  try {
    const safeId = cleanText(interventionId, 200);
    const safeProfileKey = cleanText(profileKey, 200);

    if (!safeId || !safeProfileKey) {
      return {
        success: false,
        reason: "required_value_missing",
        record: null,
      };
    }

    const { data, error } = await supabase
      .from(INTERVENTION_TABLE)
      .update({
        completed: false,
        user_observation: cleanText(
          userObservation,
          1000
        ),
        completed_at: new Date().toISOString(),
      })
      .eq("id", safeId)
      .eq("profile_key", safeProfileKey)
      .select("*")
      .single();

    if (error) {
      console.error(
        "ROOT INTERVENTION ABANDON ERROR:",
        error
      );

      return {
        success: false,
        reason: "database_error",
        error,
        record: null,
      };
    }

    return {
      success: true,
      reason: "abandoned",
      record: data,
    };
  } catch (error) {
    console.error(
      "ROOT INTERVENTION ABANDON EXCEPTION:",
      error
    );

    return {
      success: false,
      reason: "unexpected_error",
      error,
      record: null,
    };
  }
}

/**
 * Retrieve completed and incomplete intervention history.
 */
export async function getInterventionHistory({
  profileKey,
  limit = 100,
  completedOnly = false,
} = {}) {
  try {
    const safeProfileKey = cleanText(profileKey, 200);

    if (!safeProfileKey) {
      return {
        success: false,
        reason: "profile_key_missing",
        records: [],
      };
    }

    const safeLimit = Math.min(
      500,
      Math.max(1, Number(limit) || 100)
    );

    let query = supabase
      .from(INTERVENTION_TABLE)
      .select("*")
      .eq("profile_key", safeProfileKey)
      .order("started_at", {
        ascending: false,
      })
      .limit(safeLimit);

    if (completedOnly) {
      query = query
        .eq("completed", true)
        .not("after_score", "is", null);
    }

    const { data, error } = await query;

    if (error) {
      console.error(
        "ROOT INTERVENTION HISTORY ERROR:",
        error
      );

      return {
        success: false,
        reason: "database_error",
        error,
        records: [],
      };
    }

    return {
      success: true,
      reason: "loaded",
      records: data || [],
    };
  } catch (error) {
    console.error(
      "ROOT INTERVENTION HISTORY EXCEPTION:",
      error
    );

    return {
      success: false,
      reason: "unexpected_error",
      error,
      records: [],
    };
  }
}

/**
 * Convert raw intervention rows into useful evidence.
 *
 * This is intentionally deterministic. Root should calculate
 * the evidence before using AI to explain it.
 */
export function buildInterventionEvidence(
  records = []
) {
  const safeRecords = Array.isArray(records)
    ? records
    : [];

  const completedRecords = safeRecords.filter(
    (record) =>
      record?.completed === true &&
      normaliseDifficultyScore(
        record.before_score
      ) !== null &&
      normaliseDifficultyScore(
        record.after_score
      ) !== null
  );

  const grouped = new Map();

  completedRecords.forEach((record) => {
    const name =
      cleanText(record.intervention_name, 200) ||
      "Unnamed intervention";

    const category =
      normaliseCategory(
        record.intervention_category
      );

    const change = calculateInterventionChange(
      record.before_score,
      record.after_score
    );

    const key = `${category}::${name}`;

    if (!grouped.has(key)) {
      grouped.set(key, {
        interventionName: name,
        interventionCategory: category,
        attempts: 0,
        totalChange: 0,
        improvedAttempts: 0,
        unchangedAttempts: 0,
        worsenedAttempts: 0,
        strongestImprovement: null,
        latestCompletedAt: null,
        targets: {},
      });
    }

    const group = grouped.get(key);

    group.attempts += 1;
    group.totalChange += change;

    if (change > 0) {
      group.improvedAttempts += 1;
    } else if (change === 0) {
      group.unchangedAttempts += 1;
    } else {
      group.worsenedAttempts += 1;
    }

    if (
      group.strongestImprovement === null ||
      change > group.strongestImprovement
    ) {
      group.strongestImprovement = change;
    }

    const target =
      cleanText(record.target, 160) ||
      "general difficulty";

    group.targets[target] =
      (group.targets[target] || 0) + 1;

    const completedAt =
      record.completed_at ||
      record.created_at ||
      null;

    if (
      completedAt &&
      (!group.latestCompletedAt ||
        new Date(completedAt) >
          new Date(group.latestCompletedAt))
    ) {
      group.latestCompletedAt = completedAt;
    }
  });

  const interventions = Array.from(
    grouped.values()
  )
    .map((group) => {
      const averageImprovement =
        group.attempts > 0
          ? Number(
              (
                group.totalChange /
                group.attempts
              ).toFixed(2)
            )
          : 0;

      const improvementRate =
        group.attempts > 0
          ? Number(
              (
                (group.improvedAttempts /
                  group.attempts) *
                100
              ).toFixed(1)
            )
          : 0;

      const primaryTarget =
        Object.entries(group.targets).sort(
          (a, b) => b[1] - a[1]
        )[0]?.[0] || null;

      let evidenceStrength = "early";

      if (group.attempts >= 10) {
        evidenceStrength = "established";
      } else if (group.attempts >= 5) {
        evidenceStrength = "developing";
      }

      return {
        ...group,
        averageImprovement,
        improvementRate,
        primaryTarget,
        evidenceStrength,
      };
    })
    .sort((a, b) => {
      if (
        b.averageImprovement !==
        a.averageImprovement
      ) {
        return (
          b.averageImprovement -
          a.averageImprovement
        );
      }

      return b.attempts - a.attempts;
    });

  const incompleteRecords = safeRecords.filter(
    (record) => record?.completed !== true
  );

  return {
    totalStarted: safeRecords.length,
    totalCompleted: completedRecords.length,
    totalIncomplete: incompleteRecords.length,
    completionRate:
      safeRecords.length > 0
        ? Number(
            (
              (completedRecords.length /
                safeRecords.length) *
              100
            ).toFixed(1)
          )
        : 0,
    interventions,
    mostHelpful: interventions[0] || null,
    evidenceAvailable:
      completedRecords.length > 0,
  };
}

/**
 * Select an intervention using personal evidence.
 *
 * This does not diagnose and does not claim certainty.
 * It ranks past outcomes for the requested target/category.
 */
export function chooseIntervention({
  evidence,
  target = null,
  category = null,
  availableInterventions = [],
} = {}) {
  const interventions =
    evidence?.interventions || [];

  const safeTarget = cleanText(
    target,
    160
  )?.toLowerCase();

  const safeCategory = category
    ? normaliseCategory(category)
    : null;

  const availableNames = new Set(
    (availableInterventions || [])
      .map((item) =>
        typeof item === "string"
          ? item
          : item?.name || item?.title
      )
      .filter(Boolean)
      .map((name) => name.toLowerCase())
  );

  const candidates = interventions.filter(
    (item) => {
      const categoryMatches =
        !safeCategory ||
        item.interventionCategory ===
          safeCategory;

      const targetMatches =
        !safeTarget ||
        item.primaryTarget
          ?.toLowerCase()
          .includes(safeTarget) ||
        safeTarget.includes(
          item.primaryTarget?.toLowerCase() || ""
        );

      const available =
        availableNames.size === 0 ||
        availableNames.has(
          item.interventionName.toLowerCase()
        );

      return (
        categoryMatches &&
        targetMatches &&
        available
      );
    }
  );

  const recommended =
    candidates.find(
      (item) =>
        item.averageImprovement > 0 &&
        item.improvementRate >= 50
    ) || null;

  if (!recommended) {
    return {
      recommendation: null,
      confidence: "insufficient_evidence",
      reason:
        "Root does not yet have enough personal outcome evidence to choose one intervention confidently.",
    };
  }

  const confidence =
    recommended.attempts >= 10 &&
    recommended.improvementRate >= 70
      ? "strong"
      : recommended.attempts >= 5
      ? "developing"
      : "early";

  return {
    recommendation: recommended,
    confidence,
    reason:
      recommended.attempts === 1
        ? `${recommended.interventionName} helped during its first measured use. Root will continue learning before treating this as a reliable pattern.`
        : `${recommended.interventionName} has reduced difficulty by an average of ${recommended.averageImprovement} points across ${recommended.attempts} measured attempts.`,
  };
}

/**
 * Convenience helper for pages and the Knowledge Builder.
 */
export async function buildInterventionKnowledge({
  profileKey,
  limit = 250,
} = {}) {
  const historyResult =
    await getInterventionHistory({
      profileKey,
      limit,
      completedOnly: false,
    });

  if (!historyResult.success) {
    return {
      history: [],
      evidence: buildInterventionEvidence([]),
      error: historyResult.error || null,
    };
  }

  return {
    history: historyResult.records,
    evidence: buildInterventionEvidence(
      historyResult.records
    ),
    error: null,
  };
}
