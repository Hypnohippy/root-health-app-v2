import { supabase } from "./supabase";

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
      const value = character === "x" ? random : (random & 0x3) | 0x8;

      return value.toString(16);
    }
  );
}

function normaliseScore(score) {
  const value = Number(score);

  if (!Number.isFinite(value)) {
    throw new Error("Measurement score must be a number.");
  }

  if (value < 0 || value > 10) {
    throw new Error("Measurement score must be between 0 and 10.");
  }

  return value;
}

function calculateResult({
  beforeScore,
  afterScore,
  higherScoreMeans = "greater_difficulty",
}) {
  const before = normaliseScore(beforeScore);
  const after = normaliseScore(afterScore);

  const changeScore = after - before;

  const improvementScore =
    higherScoreMeans === "greater_wellbeing"
      ? after - before
      : before - after;

  let direction = "unchanged";

  if (improvementScore > 0) {
    direction = "improved";
  } else if (improvementScore < 0) {
    direction = "worsened";
  }

  return {
    beforeScore: before,
    afterScore: after,
    changeScore,
    improvementScore,
    absoluteChange: Math.abs(changeScore),
    direction,
  };
}

function buildInsight({
  constructLabel,
  interventionLabel,
  beforeScore,
  afterScore,
  improvementScore,
}) {
  const safeConstruct =
    constructLabel || "This experience";

  const safeIntervention =
    interventionLabel || "This intervention";

  if (improvementScore > 0) {
    return `${safeIntervention} was followed by a ${improvementScore}-point reduction in ${safeConstruct.toLowerCase()}: ${beforeScore} → ${afterScore}.`;
  }

  if (improvementScore === 0) {
    return `Root measured no immediate change in ${safeConstruct.toLowerCase()} after ${safeIntervention}: ${beforeScore} → ${afterScore}.`;
  }

  return `${safeConstruct} increased by ${Math.abs(
    improvementScore
  )} points after ${safeIntervention}: ${beforeScore} → ${afterScore}.`;
}

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
      ? localStorage.getItem("root_profile_key_v1") || "main"
      : "main";

  let organisationId = null;

  if (user) {
    const { data: membership, error: membershipError } =
      await supabase
        .from("organisation_members")
        .select("organisation_id, profile_key")
        .eq("user_id", user.id)
        .maybeSingle();

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

export async function startMeasurement({
  domain,
  constructKey,
  constructLabel,
  question,
  score,
  higherScoreMeans = "greater_difficulty",
  interventionKey = null,
  interventionLabel = null,
  sourcePage = null,
  metadata = {},
}) {
  if (!domain) {
    throw new Error("Measurement domain is required.");
  }

  if (!constructKey) {
    throw new Error("Measurement construct key is required.");
  }

  if (!constructLabel) {
    throw new Error("Measurement construct label is required.");
  }

  const normalisedScore = normaliseScore(score);
  const cycleId = createCycleId();

  const {
    userId,
    profileKey,
    organisationId,
  } = await getMeasurementIdentity();

  const measurement = {
    cycle_id: cycleId,
    user_id: userId,
    profile_key: profileKey,
    organisation_id: organisationId,

    domain,
    construct_key: constructKey,
    construct_label: constructLabel,
    measurement_question: question || null,

    phase: "before",
    score: normalisedScore,

    higher_score_means: higherScoreMeans,

    intervention_key: interventionKey,
    intervention_label: interventionLabel,

    source_page: sourcePage,

    change_score: null,
    improvement_score: null,
    completed_cycle: false,

    metadata,
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
  };
}

export async function finishMeasurement({
  cycleId,
  domain,
  constructKey,
  constructLabel,
  question,
  beforeScore,
  afterScore,
  higherScoreMeans = "greater_difficulty",
  interventionKey,
  interventionLabel,
  sourcePage = null,
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

  const result = calculateResult({
    beforeScore,
    afterScore,
    higherScoreMeans,
  });

  const {
    userId,
    profileKey,
    organisationId,
  } = await getMeasurementIdentity();

  const measurement = {
    cycle_id: cycleId,
    user_id: userId,
    profile_key: profileKey,
    organisation_id: organisationId,

    domain,
    construct_key: constructKey,
    construct_label: constructLabel,
    measurement_question: question || null,

    phase: "after",
    score: result.afterScore,

    higher_score_means: higherScoreMeans,

    intervention_key: interventionKey,
    intervention_label: interventionLabel,

    source_page: sourcePage,

    change_score: result.changeScore,
    improvement_score: result.improvementScore,
    completed_cycle: true,

    metadata,
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
    constructLabel,
    interventionLabel,
    beforeScore: result.beforeScore,
    afterScore: result.afterScore,
    improvementScore: result.improvementScore,
  });

  return {
    ...result,
    cycleId,
    insight,
    measurement: data,
  };
}

export function previewMeasurementResult({
  constructLabel,
  interventionLabel,
  beforeScore,
  afterScore,
  higherScoreMeans = "greater_difficulty",
}) {
  const result = calculateResult({
    beforeScore,
    afterScore,
    higherScoreMeans,
  });

  return {
    ...result,
    insight: buildInsight({
      constructLabel,
      interventionLabel,
      beforeScore: result.beforeScore,
      afterScore: result.afterScore,
      improvementScore: result.improvementScore,
    }),
  };
}
