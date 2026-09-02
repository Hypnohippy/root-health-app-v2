export function buildRootMemoryService({
  name = "",
  bodySignals = [],
  journalEntries = [],
  mindEntries = [],
  interventionOutcomes = [],
}) {
  const firstName = name?.trim()?.split(" ")?.[0] || "";

  const emotionCounts = {};
  const bodyCounts = {};
  const interventionCounts = {};

  mindEntries.forEach((entry) => {
    if (entry.emotion) {
      emotionCounts[entry.emotion] = (emotionCounts[entry.emotion] || 0) + 1;
    }

    if (entry.tool) {
      interventionCounts[entry.tool] =
        (interventionCounts[entry.tool] || 0) + 1;

    }
  });

  bodySignals.forEach((entry) => {
    const signal =
      entry.signal || entry.area || entry.body_area || entry.areas?.[0];

    if (!signal) return;

    bodyCounts[signal] = (bodyCounts[signal] || 0) + 1;
  });

  const mostCommonEmotion =
    Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "";

  const mostCommonBodySignal =
    Object.entries(bodyCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "";

  const mostUsedIntervention =
    Object.entries(interventionCounts).sort((a, b) => b[1] - a[1])[0];

  const measuredOutcomes = Array.isArray(interventionOutcomes)
    ? interventionOutcomes.filter((outcome) => {
        if (
          outcome?.before_score === null ||
          outcome?.before_score === undefined ||
          outcome?.before_score === "" ||
          outcome?.after_score === null ||
          outcome?.after_score === undefined ||
          outcome?.after_score === ""
        ) {
          return false;
        }

        const before = Number(outcome?.before_score);
        const after = Number(outcome?.after_score);
        return (
          outcome?.completed === true &&
          Number.isFinite(before) &&
          Number.isFinite(after)
        );
      })
    : [];
  const positiveRecoveryCount = measuredOutcomes.filter(
    (outcome) => Number(outcome.before_score) > Number(outcome.after_score)
  ).length;
const latestThoughtThemeEntry = Array.isArray(mindEntries)
  ? mindEntries.find((entry) => entry.thought_theme)
  : null;
const latestThoughtTheme = latestThoughtThemeEntry?.thought_theme || "";
const latestThoughtNotice = latestThoughtThemeEntry?.thought_notice || "";
 let recognition = "";

if (firstName && latestThoughtTheme) {
  recognition =
    `${firstName}, last time Thought Work explored ${latestThoughtTheme}. ` +
    `${latestThoughtNotice || "That may be worth staying with gently."}`;}
else if (firstName && positiveRecoveryCount >= 3) {
  recognition = `${firstName}, Root noticed something worth recognising. Recovery has not been instant, but there are signs your system is finding its way back more often.`;  } else if (firstName && mostCommonEmotion && mostCommonBodySignal) {
    recognition = `${firstName}, Root has noticed ${mostCommonEmotion} and ${mostCommonBodySignal} appearing close together recently. This may be a pattern worth watching gently.`;
  } else if (firstName && mostCommonBodySignal) {
    recognition = `${firstName}, Root is beginning to notice how your body speaks when pressure builds, especially around ${mostCommonBodySignal}.`;
  }

  let memory = "";

  if (firstName) {
    if (mostCommonEmotion && mostCommonBodySignal) {
      memory = `${firstName}, when life has felt emotionally demanding recently, ${mostCommonEmotion} has often appeared close to ${mostCommonBodySignal}.

Root is not certain what this means yet, but it has noticed the combination enough times to remember it.`;
    } else if (mostCommonEmotion) {
      memory = `${firstName}, Root has noticed that ${mostCommonEmotion} has appeared more than once recently.

This does not define the whole story, but it may be one emotional thread worth watching gently.`;
    } else if (mostCommonBodySignal) {
      memory = `${firstName}, Root has noticed your body speaking through ${mostCommonBodySignal} more than once recently.

This may become one of the signals worth listening to rather than pushing past.`;
    } else {
      memory = `${firstName}, Root is still gathering the story.

Every check-in helps Root understand a little more about what life feels like from your side of the screen.`;
    }
  }

  let interventionInsight = "";

  let interventionEffectivenessEvidence = false;

  if (firstName && mostUsedIntervention) {
    const [toolName, totalUses] = mostUsedIntervention;
    const toolOutcomes = measuredOutcomes.filter(
      (outcome) =>
        String(outcome?.intervention_name || "").trim().toLowerCase() ===
        String(toolName).trim().toLowerCase()
    );
    const improved = toolOutcomes.filter(
      (outcome) => Number(outcome.before_score) > Number(outcome.after_score)
    ).length;
    const worsened = toolOutcomes.filter(
      (outcome) => Number(outcome.before_score) < Number(outcome.after_score)
    ).length;

    if (improved === 1 && toolOutcomes.length === 1) {
      interventionEffectivenessEvidence = true;
      interventionInsight = `${toolName} may have helped once in a measured attempt. Root will keep watching before treating that as a reliable pattern.`;
    } else if (improved >= 2 && worsened === 0) {
      interventionEffectivenessEvidence = true;
      interventionInsight = `${toolName} has appeared helpful across ${improved} measured attempts. This is a developing personal pattern, not proof of cause.`;
    } else if (improved > 0 && worsened > 0) {
      interventionEffectivenessEvidence = true;
      interventionInsight = `${toolName} has had mixed measured results so far. Root will not assume it is consistently helpful.`;
    } else {
      interventionInsight = `${toolName} has been used ${totalUses} time${
        totalUses === 1 ? "" : "s"
      } recently. Usage alone does not show whether it helped.`;
    }
  }

  let hypothesis = "";

  if (firstName && mostCommonEmotion && mostCommonBodySignal) {
    hypothesis = `${firstName}, Root is curious whether ${mostCommonEmotion} may arrive before ${mostCommonBodySignal} becomes more noticeable.

It will keep watching this gently without turning it into a fixed conclusion.`;
  } else if (firstName && mostCommonEmotion) {
    hypothesis = `${firstName}, Root is curious whether ${mostCommonEmotion} is becoming one of the emotional threads in your recent wellbeing story.

A few more check-ins may help the picture become clearer.`;
  } else if (firstName && mostCommonBodySignal) {
    hypothesis = `${firstName}, Root is curious whether ${mostCommonBodySignal} may be one of the early signals your body uses when pressure starts to build.

Root will keep watching this gently over time.`;
  }

  let dailyReflection = "";

  if (positiveRecoveryCount >= 3) {
    dailyReflection = `${firstName}, Root noticed signs of improvement recently.

Some of your recent check-ins suggest that symptoms which once felt louder may be beginning to soften.

Before looking for the next problem to solve, it may be worth pausing to recognise that change.`;
  } else if (mostCommonEmotion && mostCommonBodySignal) {
    dailyReflection = `${firstName}, Root has noticed ${mostCommonEmotion} and ${mostCommonBodySignal} appearing close together recently.

Root cannot know exactly why, but the pattern has appeared often enough to be worth paying attention to.

You do not need to solve it today. Simply noticing it may be enough.`;
  } else {
    dailyReflection = `${firstName}, Root is still gathering the story.

Every check-in helps Root understand a little more about what life feels like from your side of the screen.`;
  }

  const memoryData = {
    firstName,
    recognition,
    memory,
    interventionInsight,
    hypothesis,
    dailyReflection,
    mostCommonEmotion,
    mostCommonBodySignal,
    positiveRecoveryCount,
    interventionEffectivenessEvidence,
  };

  return {
    ...memoryData,
    mostImportantObservation: getMostImportantObservation(memoryData),
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
      title: memory.interventionEffectivenessEvidence
        ? "Something that may be helping"
        : "A tool you have tried",
      message: memory.interventionInsight,
      confidence: memory.interventionEffectivenessEvidence
        ? "early"
        : "usage_only",
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
