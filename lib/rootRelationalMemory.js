export function buildRelationalMemory({
  bodySignals = [],
  journalEntries = [],
  mindEntries = [],
}) {
  const allText = [
    ...bodySignals.map((e) => `${e.signal || ""} ${e.context || ""} ${e.what_helped || ""}`),
    ...journalEntries.map((e) => `${e.title || ""} ${e.content || ""} ${e.emotional_theme || ""}`),
    ...mindEntries.map((e) => `${e.situation || ""} ${e.emotion || ""} ${e.next_step || ""}`),
  ]
    .join(" ")
    .toLowerCase();

  const remembered = [];

  if (allText.includes("walk") || allText.includes("walking")) {
    remembered.push("Walking may be one of your useful settling tools.");
  }

  if (allText.includes("shoulder") || allText.includes("shoulders")) {
    remembered.push("Pressure may often show up around your shoulders.");
  }

  if (allText.includes("stomach") || allText.includes("gut") || allText.includes("digestion")) {
    remembered.push("Your gut or stomach may be part of your stress pattern.");
  }

  if (allText.includes("sleep") || allText.includes("tired") || allText.includes("wired")) {
    remembered.push("Recovery and sleep seem important in your pattern.");
  }

  if (allText.includes("pressure") || allText.includes("guilt") || allText.includes("shame")) {
    remembered.push("Self-pressure may be something Root should handle gently with you.");
  }

  if (remembered.length === 0) {
    remembered.push("Root is still learning what matters most to you.");
  }

  return {
    headline: "Root is learning what helps you.",
    memories: remembered.slice(0, 3),
  };
}
