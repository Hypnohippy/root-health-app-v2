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

  return {
    nervousSystemLoad,
    headline,
    reflection,
    topBodyPattern: bodyAreas[0]?.[0] || null,
    topEmotionalTheme: emotionalThemes[0]?.[0] || null,
    mostUsedTool: mindTools[0]?.[0] || null,
    highIntensityCount: highIntensity.length,
    recentActivity: activeRecently,
  };
}
