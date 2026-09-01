export function buildPriorityFeed({
  rootReflection = null,
  longitudinalMemory = null,
  relationalMemory = null,
  proactiveCare = null,
  dailyRhythm = null,
}) {
  const cards = [];

  if (
    longitudinalMemory?.trajectory === "intensifying" ||
    longitudinalMemory?.nervousSystemLoad === "high"
  ) {
    cards.push({
      type: "support",
      label: "Root suggests",
      title: proactiveCare?.title || "Reduce pressure today.",
      text:
        proactiveCare?.message ||
        "Your system may need simpler support before things become louder.",
      href: proactiveCare?.action?.href || "/coach",
      action: proactiveCare?.action?.label || "Start support",
      priority: 100,
    });
  }

  if (rootReflection) {
    cards.push({
      type: "reflection",
      label: "Root reflection",
      title: rootReflection.title,
      text: rootReflection.reflection,
      href: rootReflection.suggestedAction?.href || "/body",
      action: rootReflection.suggestedAction?.title || "Continue",
      priority: 80,
    });
  }

  if (dailyRhythm?.strongestPeriod) {
    cards.push({
      type: "rhythm",
      label: "Daily rhythm",
      title: dailyRhythm.headline,
      text: dailyRhythm.reflection,
      href: "/check-in",
      action: "Check in gently",
      priority: 70,
    });
  }

  if (relationalMemory?.memories?.length > 0) {
    cards.push({
      type: "relationship",
      label: "Root remembers",
      title: relationalMemory.headline,
      text: relationalMemory.memories.join(" "),
      href: "/journal",
      action: "Reflect in Journal",
      priority: 60,
    });
  }

  if (longitudinalMemory) {
    cards.push({
      type: "memory",
      label: "Root has noticed",
      title: longitudinalMemory.headline,
      text: longitudinalMemory.reflection,
      href: "/insights",
      action: "View patterns",
      priority: 50,
    });
  }

  if (cards.length === 0) {
    cards.push({
      type: "begin",
      label: "Begin gently",
      title: "Root is ready to begin with you.",
      text: "Start with one small check-in. Root will guide from there.",
      href: "/orientation",
      action: "Begin Root journey",
      priority: 10,
    });
  }

  return cards.sort((a, b) => b.priority - a.priority);
}
