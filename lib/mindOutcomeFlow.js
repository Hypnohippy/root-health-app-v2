export const MIND_OUTCOME_STAGES = Object.freeze({
  INTERVENTION: "intervention",
  POST_SCORE: "post_score",
  QUALITATIVE: "qualitative",
});

export function createMindOutcomeFlow() {
  return {
    stage: MIND_OUTCOME_STAGES.INTERVENTION,
    afterScore: null,
  };
}

export function markMindInterventionFinished(state = createMindOutcomeFlow()) {
  if (state.stage !== MIND_OUTCOME_STAGES.INTERVENTION) return state;
  return { ...state, stage: MIND_OUTCOME_STAGES.POST_SCORE };
}

export function recordMindAfterScore(state, score) {
  const numericScore = Number(score);
  if (
    state?.stage !== MIND_OUTCOME_STAGES.POST_SCORE ||
    !Number.isFinite(numericScore) ||
    numericScore < 0 ||
    numericScore > 10
  ) {
    return state;
  }

  return {
    stage: MIND_OUTCOME_STAGES.QUALITATIVE,
    afterScore: numericScore,
  };
}

