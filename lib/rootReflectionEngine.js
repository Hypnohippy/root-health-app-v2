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

  const recentHighBody = bodySignals.filter((entry) => Number(entry.intensity || 0) >= 7);
  const recentSignals = bodySignals.map((entry) => String(entry.signal || "").toLowerCase());
  const recentThemes = journalEntries.map((entry) => String(entry.emotional_theme || "").toLowerCase());
  const topBodyPattern = longitudinal?.topBodyPattern || null;
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
    href: "/body",
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
    recentSignals.includes("reflux") ||
    recentSignals.includes("bloating") ||
    recentSignals.includes("nausea")
  ) {
    tone = "body";
    title = "Digestion may be part of your current pattern.";
    reflection = "Digestive signals have appeared recently. Root can help you explore whether stress, food timing, sleep, or nervous system load may be contributing.";
    suggestedAction = {
      href: "/body",
      title: "Explore digestion",
      text: "Track. Notice. Support.",
    };
  }

 if (
    topEmotionalTheme === "anxiety" ||
    recentThemes.includes("anxiety") ||
    recentSignals.includes("panic feeling") ||
    recentSignals.includes("racing thoughts") ||
    journey?.focus === "anxiety"
  ) {
    tone = "grounding";
    title = "Stress and nervous system signals may be connected.";
    reflection = "Anxiety, pressure, or racing thoughts seem to be part of your recent pattern. Start with settling the body before trying to solve everything mentally.";
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
    title = "There may be emotional weight underneath the surface.";
    reflection = "Your reflections suggest something emotionally important may be asking for space. Journaling or reflection may help you understand it without forcing an answer.";
    suggestedAction = {
      href: "/journal",
      title: "Reflect gently",
      text: "Write. Notice. Soften.",
    };
  }

  if (
    recentSignals.includes("poor sleep") ||
    recentSignals.includes("wired at night") ||
    recentSignals.includes("sleep disruption") ||
    journey?.focus === "sleep"
  ) {
    tone = "sleep";
    title = "Recovery may need attention.";
    reflection = "Sleep or recovery signals seem to be part of the picture. Tonight may be less about solving and more about helping the system come down gently.";
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
  };
}
