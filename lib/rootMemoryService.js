export function buildRootMemoryService({
  name = "",
  bodySignals = [],
  journalEntries = [],
  mindEntries = [],
}) {
  const firstName = name?.trim()?.split(" ")?.[0] || "";

  const emotionCounts = {};
  const bodyCounts = {};
  const interventionCounts = {};
  const helpfulInterventions = {};

  mindEntries.forEach((entry) => {
    if (entry.emotion) {
      emotionCounts[entry.emotion] =
        (emotionCounts[entry.emotion] || 0) + 1;
    }

    if (entry.tool) {
      interventionCounts[entry.tool] =
        (interventionCounts[entry.tool] || 0) + 1;

      const score = Number(entry.intensity);

      if (!Number.isNaN(score) && score > 0) {
        helpfulInterventions[entry.tool] =
          (helpfulInterventions[entry.tool] || 0) + 1;
      }
    }
  });

  bodySignals.forEach((entry) => {
    const signal =
      entry.signal ||
      entry.area ||
      entry.body_area ||
      entry.areas?.[0];

    if (!signal) return;

    bodyCounts[signal] = (bodyCounts[signal] || 0) + 1;
  });

  const mostCommonEmotion =
    Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "";

  const mostCommonBodySignal =
    Object.entries(bodyCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "";

  const mostUsedIntervention =
    Object.entries(interventionCounts).sort((a, b) => b[1] - a[1])[0];

  const positiveRecoveryCount = mindEntries.filter((entry) => {
    const score = Number(entry.intensity);
    return !Number.isNaN(score) && score > 0;
  }).length;

  let recognition = "";

  if (firstName && positiveRecoveryCount >= 3) {
    recognition = `${firstName}, Root noticed something worth recognising. Recovery has not been instant, but there are signs your system is finding its way back more often.`;
  } else if (firstName && mostCommonEmotion && mostCommonBodySignal) {
    recognition = `${firstName}, Root is beginning to connect ${mostCommonEmotion} with ${mostCommonBodySignal}. This may be one of the patterns worth watching gently.`;
  } else if (firstName && mostCommonBodySignal) {
    recognition = `${firstName}, Root is beginning to notice how your body speaks when pressure builds, especially around ${mostCommonBodySignal}.`;
  }

  let memory = "";

  if (firstName) {
    memory = `${firstName}, Root is beginning to build a memory of your journey. `;

    if (mostCommonEmotion) {
      memory += `${mostCommonEmotion} has appeared more than once recently. `;
    }

    if (mostCommonBodySignal) {
      memory += `${mostCommonBodySignal} may be becoming an important body signal. `;
    }

    memory +=
      "These observations are still forming, but the picture is becoming clearer over time.";
  }

  let interventionInsight = "";

  if (firstName && mostUsedIntervention) {
    const [toolName, totalUses] = mostUsedIntervention;
    const helpedCount = helpfulInterventions[toolName] || 0;

    if (helpedCount > 0) {
      interventionInsight = `${toolName} has been used ${totalUses} time${
        totalUses === 1 ? "" : "s"
      } recently, and ${helpedCount} response${
        helpedCount === 1 ? "" : "s"
      } suggested it helped your system settle.`;
    } else {
      interventionInsight = `${toolName} has been one of your recent support tools. Root will keep watching whether it helps over time.`;
    }
  }

  let hypothesis = "";

  if (firstName && mostCommonEmotion && mostCommonBodySignal) {
    hypothesis = `${firstName}, Root wonders whether ${mostCommonBodySignal} may often accompany periods of ${mostCommonEmotion}.`;
  } else if (firstName && mostCommonEmotion) {
    hypothesis = `${firstName}, Root is beginning to wonder whether ${mostCommonEmotion} may be one of the recurring themes influencing your wellbeing.`;
  } else if (firstName && mostCommonBodySignal) {
    hypothesis = `${firstName}, Root is beginning to wonder whether ${mostCommonBodySignal} may be an early signal worth paying attention to.`;
  }

  const memory = {
    firstName,
    recognition,
    memory,
    interventionInsight,
    hypothesis,
    mostCommonEmotion,
    mostCommonBodySignal,
    positiveRecoveryCount,
  };

  return {
    ...memory,
    mostImportantObservation: getMostImportantObservation(memory),
  };
}

export function getMostImportantObservation(memory = {}) {
  if (memory.recognition) {
    return {
      type: "recognition",
      title: "Something worth recognising",
      message: memory.recognition,
      confidence: "high",
    };
  }

  if (memory.interventionInsight) {
    return {
      type: "intervention",
      title: "Something that may be helping",
      message: memory.interventionInsight,
      confidence: "medium",
    };
  }

  if (memory.hypothesis) {
    return {
      type: "hypothesis",
      title: "Something Root is wondering",
      message: memory.hypothesis,
      confidence: "early",
    };
  }

  if (memory.memory) {
    return {
      type: "memory",
      title: "Root is still learning",
      message: memory.memory,
      confidence: "forming",
    };
  }

  return null;
}
