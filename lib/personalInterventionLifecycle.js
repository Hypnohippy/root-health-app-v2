function cleanValue(value) {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : null;
}

export function buildMindInterventionStart({
  personalContext,
  emotionalState,
  beforeScore,
  category,
  technique,
} = {}) {
  return {
    profileKey: personalContext?.profileKey || null,
    organisationId: null,
    source: "mind",
    emotionalState: cleanValue(emotionalState?.id),
    target:
      cleanValue(technique?.target) ||
      cleanValue(emotionalState?.title) ||
      cleanValue(emotionalState?.id),
    interventionCategory:
      cleanValue(technique?.category) || cleanValue(category) || "other",
    interventionName: cleanValue(technique?.title),
    beforeScore,
    context: cleanValue(
      emotionalState?.title
        ? `Mind support for ${emotionalState.title}`
        : "Mind support"
    ),
    interventionId: cleanValue(technique?.id),
    interventionSlug: cleanValue(technique?.slug),
    interventionVersion:
      technique?.version === null || technique?.version === undefined
        ? null
        : String(technique.version),
  };
}

function techniqueKey(payload = {}) {
  return [
    payload.interventionId || "legacy",
    payload.interventionSlug || "legacy",
    payload.interventionVersion || "unversioned",
    payload.interventionCategory || "other",
    payload.interventionName || "unnamed",
  ].join("::");
}

/**
 * Owns one in-progress Mind attempt. Keeping this outside React state makes
 * audio replay and component rerenders idempotent while still allowing a new
 * historical record after the previous attempt has ended.
 */
export function createPersonalInterventionLifecycle({
  start,
  complete,
  abandon,
} = {}) {
  let activeAttempt = null;
  let pendingStart = null;

  async function begin(payload) {
    const key = techniqueKey(payload);

    if (activeAttempt?.key === key) {
      return activeAttempt.result;
    }

    if (pendingStart?.key === key) {
      return pendingStart.promise;
    }

    if (pendingStart) {
      await pendingStart.promise;
      if (activeAttempt?.key === key) {
        return activeAttempt.result;
      }
    }

    if (activeAttempt) {
      await abandonActive("Changed to another technique before completion.");
    }

    const promise = Promise.resolve(start(payload)).then((result) => {
      if (result?.success && result?.record?.id) {
        activeAttempt = { key, payload, result };
      }
      return result;
    }).finally(() => {
      pendingStart = null;
    });

    pendingStart = { key, promise };
    return promise;
  }

  async function completeActive({ afterScore = null, userObservation = null } = {}) {
    if (!activeAttempt) {
      return { success: false, reason: "attempt_not_started", record: null };
    }

    const attempt = activeAttempt;
    const result = await complete({
      interventionId: attempt.result.record.id,
      profileKey: attempt.payload.profileKey,
      afterScore,
      userObservation,
    });

    if (result?.success) {
      activeAttempt = null;
    }

    return result;
  }

  async function abandonActive(userObservation = null) {
    if (pendingStart) {
      await pendingStart.promise;
    }

    if (!activeAttempt) {
      return { success: true, reason: "no_active_attempt", record: null };
    }

    const attempt = activeAttempt;
    const result = await abandon({
      interventionId: attempt.result.record.id,
      profileKey: attempt.payload.profileKey,
      userObservation,
    });

    if (result?.success) {
      activeAttempt = null;
    }

    return result;
  }

  return {
    begin,
    completeActive,
    abandonActive,
    getActive: () => activeAttempt,
  };
}
