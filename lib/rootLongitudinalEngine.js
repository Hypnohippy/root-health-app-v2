function daysAgo(dateValue) {
  if (!dateValue) return null;

  const then = new Date(dateValue).getTime();
  const now = Date.now();

  if (Number.isNaN(then)) return null;

  return Math.floor((now - then) / (1000 * 60 * 60 * 24));
}

function countBy(items = [], getter) {
  const counts = {};

  items.forEach((item) => {
    const value = getter(item);

    if (!value) return;

    counts[value] = (counts[value] || 0) + 1;
  });

  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

export function buildLongitudinalMemory({
  bodySignals = [],
  journalEntries = [],
  mindEntries = [],
}) {
  const recentBody = Array.isArray(bodySignals) ? bodySignals.slice(0, 20) : [];
  const recentJournal = Array.isArray(journalEntries) ? journalEntries.slice(0, 20) : [];
  const recentMind = Array.isArray(mindEntries) ? mindEntries.slice(0, 20) : [];

  const highIntensity = recentBody.filter(
    (entry) => Number(entry.intensity || 0) >= 7
  );

  const bodyAreas = countBy(recentBody, (entry) => {
    if (Array.isArray(entry.areas) && entry.areas.length > 0) {
      return entry.areas[0];
    }

    return entry.signal || null;
  });

  const emotionalThemes = countBy(
    recentJournal,
    (entry) => entry.emotional_theme || null
  );

  const mindTools = countBy(
    recentMind,
    (entry) => entry.tool || null
  );

  const recentDays = recentBody
    .map((entry) => daysAgo(entry.created_at))
    .filter((value) => value !== null);

  const activeRecently = recentDays.some((day) => day <= 3);

  let nervousSystemLoad = "unknown";

  if (highIntensity.length >= 3) {
    nervousSystemLoad = "high";
  } else if (highIntensity.length >= 1 || recentBody.length >= 5) {
    nervousSystemLoad = "moderate";
  } else if (recentBody.length > 0) {
    nervousSystemLoad = "low";
  }

  let headline = "Root is beginning to build your longer pattern map.";
  let reflection =
    "As you add more body check-ins, reflections, and tools, Root will begin noticing what repeats, what softens, and what may need more support.";

  if (nervousSystemLoad === "high") {
    headline = "Your system may have been carrying sustained load recently.";
    reflection =
      "Several stronger body signals have appeared recently. This may be a moment for less pressure, more recovery, and simpler support rather than pushing harder.";
  }

  if (emotionalThemes.length > 0 && bodyAreas.length > 0) {
    headline = `${emotionalThemes[0][0]} and ${bodyAreas[0][0]} may be part of a repeating pattern.`;
    reflection =
      "Root is beginning to notice how emotional themes and body signals may be appearing together. This is not a diagnosis — it is a pattern worth watching gently.";
  }

  if (!activeRecently && recentBody.length > 0) {
    headline = "It may be time for a gentle check-in.";
    reflection =
      "You have some earlier signals saved, but not much recent activity. A short body check may help Root understand how things are now.";
  }

  let trajectory = "building";
let trajectoryHeadline = "Root is still learning your rhythm.";
let trajectoryReflection =
  "As more check-ins build up, Root will begin noticing whether things are softening, intensifying, or repeating.";

const recentIntensities = recentBody
  .slice(0, 5)
  .map((entry) => Number(entry.intensity || 0))
  .filter((value) => value > 0);

const olderIntensities = recentBody
  .slice(5, 10)
  .map((entry) => Number(entry.intensity || 0))
  .filter((value) => value > 0);

const average = (values) =>
  values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : null;

const recentAverage = average(recentIntensities);
const olderAverage = average(olderIntensities);

if (recentAverage !== null && olderAverage !== null) {
  if (recentAverage >= olderAverage + 1.5) {
    trajectory = "intensifying";
    trajectoryHeadline = "Your recent signals seem stronger than before.";
    trajectoryReflection =
      "Root is noticing a possible increase in nervous system or body load. This may be a good moment to reduce pressure and choose gentler support.";
  } else if (recentAverage <= olderAverage - 1.5) {
    trajectory = "softening";
    trajectoryHeadline = "Your recent signals may be softening.";
    trajectoryReflection =
      "Root is noticing that recent intensity may be lower than earlier signals. Small supportive actions may be helping your system settle.";
  } else {
    trajectory = "steady";
    trajectoryHeadline = "Your signals seem fairly steady right now.";
    trajectoryReflection =
      "Root is not seeing a sharp rise or drop yet. Continuing small check-ins will help clarify what is repeating and what is changing.";
  }
}
  return {
  nervousSystemLoad,
  headline,
  reflection,

  trajectory,
  trajectoryHeadline,
  trajectoryReflection,

  topBodyPattern: bodyAreas[0]?.[0] || null,
  topEmotionalTheme: emotionalThemes[0]?.[0] || null,
  mostUsedTool: mindTools[0]?.[0] || null,

  // Full pattern lists for other libraries to reuse
  bodyPatterns: bodyAreas,
  emotionalPatterns: emotionalThemes,
  toolPatterns: mindTools,

  highIntensityCount: highIntensity.length,
  recentActivity: activeRecently,
};
}
