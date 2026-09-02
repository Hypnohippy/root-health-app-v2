export function buildRootReflection({
  bodySignals = [],
  journalEntries = [],
  mindEntries = [],
  journey = null,
  longitudinal = null,
}) {
  const latestBody = Array.isArray(bodySignals) ? bodySignals[0] : null;
  const latestJournal = Array.isArray(journalEntries) ? journalEntries[0] : null;
  const latestMind = Array.isArray(mindEntries) ? mindEntries[0] : null;
  const classifiedPressureEntries = journalEntries.filter((entry) =>
    ["grief", "guilt & pressure"].includes(
      String(entry?.emotional_theme || "").toLowerCase()
    )
  );

  const recentHighBody = bodySignals.filter((entry) => Number(entry.intensity || 0) >= 7);
  const recentSignals = bodySignals.map((entry) => String(entry.signal || "").toLowerCase());
  const recentThemes = journalEntries.map((entry) => String(entry.emotional_theme || "").toLowerCase());
  const countBodyPatterns = (patterns) => recentSignals.filter((signal) =>
    patterns.includes(signal)
  ).length;
  const countClassifiedThemes = (themes) => recentThemes.filter((theme) =>
    themes.includes(theme)
  ).length;
  const topBodyPattern = longitudinal?.topBodyPattern || null;
  const hasBodyPattern = (pattern) =>
  topBodyPattern === pattern ||
  recentSignals.includes(pattern);
  const topEmotionalTheme = longitudinal?.topEmotionalTheme || null;
  const bodyPatterns = longitudinal?.bodyPatterns || [];
  const emotionalPatterns = longitudinal?.emotionalPatterns || [];
  const highIntensityCount =
  longitudinal?.highIntensityCount ??
  bodySignals.filter((entry) => Number(entry.intensity || 0) >= 7).length;

  let tone = "steady";
  let title = "Root is listening for patterns.";
  let reflection = "Keep adding small check-ins. Root becomes more useful as it learns how your body, emotions, habits, and recovery patterns connect.";
  let suggestedAction = {
    href: "/check-in",
    title: "Continue check-in",
    text: "Notice what your system is signalling today.",
  };

  if (highIntensityCount >= 2) {
    tone = "support";
    title = "Your system may be carrying more load than usual.";
    reflection = "Several recent body signals have been stronger. This may be a good moment to reduce pressure, settle the nervous system, and avoid forcing productivity.";
    suggestedAction = {
      href: "/coach",
      title: "Settle with Coach",
      text: "Grounding. Breath. Support.",
    };
  }

  if (
    hasBodyPattern("reflux") ||
    hasBodyPattern("bloating") ||
    hasBodyPattern("nausea")
)
  {
    const digestiveCount = countBodyPatterns(["reflux", "bloating", "nausea"]);
    tone = "body";
    title = digestiveCount >= 2
      ? "Digestive signals have been recorded more than once."
      : "A digestive signal was recorded once.";
    reflection = digestiveCount >= 2
      ? "The repeated records are worth exploring gently, without assuming a cause."
      : "One record is not a pattern. Root can help you explore it without assuming what contributed.";
    suggestedAction = {
      href: "/body",
      title: "Explore digestion",
      text: "Track. Notice. Support.",
    };
  }

 if (
    topEmotionalTheme === "anxiety" ||
recentThemes.includes("anxiety") ||
hasBodyPattern("panic feeling") ||
hasBodyPattern("racing thoughts") ||
journey?.focus === "anxiety"
  ) {
    const anxietyClassificationCount = countClassifiedThemes(["anxiety"]);
    const anxietyBodyCount = countBodyPatterns(["panic feeling", "racing thoughts"]);
    const anxietyEvidenceCount = anxietyClassificationCount + anxietyBodyCount;
    tone = "grounding";
    title = anxietyEvidenceCount >= 2
      ? "Root has more than one anxiety- or activation-related record."
      : anxietyEvidenceCount === 1
      ? "Root has one anxiety- or activation-related record."
      : "Your selected journey focus may benefit from grounding.";
    reflection = anxietyEvidenceCount >= 2
      ? "These records recur, but Root has not established a cause or a fixed pattern. Settling support may be useful before trying to solve everything mentally."
      : anxietyEvidenceCount === 1
      ? "One record is not a recurring pattern. This suggestion is a cautious response to that single record."
      : "This suggestion comes from the journey focus you selected, not from repeated evidence.";
    suggestedAction = {
      href: "/coach",
      title: "Settle the system",
      text: "Grounding. Breath. Clarity.",
    };
  }

  if (
    topEmotionalTheme === "grief" ||
    recentThemes.includes("grief") ||
    recentThemes.includes("guilt & pressure") ||
    journey?.focus === "heavy"
  ) {
    tone = "reflection";
    title = classifiedPressureEntries.length >= 2
      ? "Several reflections have been grouped around emotionally weighty themes."
      : classifiedPressureEntries.length === 1
      ? "Root grouped a reflection under an emotionally weighty theme."
      : "Your selected journey focus may benefit from gentle reflection.";
    reflection = classifiedPressureEntries.length >= 2
      ? "This is a Root classification of repeated entries, not a claim that you used those exact words. Reflection may help clarify what feels important."
      : classifiedPressureEntries.length === 1
      ? "This is Root's classification of one entry, not a repeated pattern or a claim that you used the category wording yourself."
      : "This suggestion comes from the journey focus you selected, not from a repeated evidence pattern.";
    suggestedAction = {
      href: "/journal",
      title: "Reflect in Journal",
      text: "Write. Notice. Soften.",
    };
  }

  if (
    hasBodyPattern("poor sleep") ||
    hasBodyPattern("wired at night") ||
    hasBodyPattern("sleep disruption") ||
    journey?.focus === "sleep"
) {
    const sleepEvidenceCount = countBodyPatterns([
      "poor sleep",
      "wired at night",
      "sleep disruption",
    ]);
      tone = "sleep";
    title = sleepEvidenceCount >= 2
      ? "Sleep or recovery signals have been recorded more than once."
      : sleepEvidenceCount === 1
      ? "A sleep or recovery signal was recorded once."
      : "Your selected journey focus is sleep and recovery.";
    reflection = sleepEvidenceCount >= 2
      ? "The records recur, although Root will not assume why. Tonight may be less about solving and more about helping the system come down gently."
      : sleepEvidenceCount === 1
      ? "One record is not a pattern. A gentle wind-down may still be a useful next step."
      : "This suggestion comes from the journey focus you selected, not from repeated evidence.";
    suggestedAction = {
      href: "/coach",
      title: "Sleep wind-down",
      text: "Slow down. Soften. Rest.",
    };
  }

  if (!latestBody && !latestJournal && !latestMind) {
    tone = "begin";
    title = "Root is ready to begin with you.";
    reflection = "Start with one small body check or reflection. The first few signals help Root understand what kind of support may fit you best.";
    suggestedAction = {
      href: "/orientation",
      title: "Begin Root journey",
      text: "Start guided. Stay gentle.",
    };
  }

  return {
    tone,
    title,
    reflection,
    suggestedAction,
    provenance: {
      layer: "derived_observation",
      engine: "rootReflectionEngine",
      derivationType: "deterministic_rule",
      sourceRecordIds: [...bodySignals, ...journalEntries, ...mindEntries]
        .map((entry) => entry?.id)
        .filter(Boolean),
      sourceTimestamps: [...bodySignals, ...journalEntries, ...mindEntries]
        .map((entry) => entry?.created_at)
        .filter(Boolean),
      evidenceOrigins: ["user_entered", "system_classification", "system_event"],
      occurrenceCount: classifiedPressureEntries.length,
      confidence: classifiedPressureEntries.length >= 2 ? "developing" : "early",
    },
  };
}
