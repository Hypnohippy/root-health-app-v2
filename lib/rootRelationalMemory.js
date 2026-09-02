export function buildRelationalMemory({
  bodySignals = [],
  journalEntries = [],
  mindEntries = [],
}) {
  const records = [...bodySignals, ...journalEntries, ...mindEntries];
  const directTextByRecord = records.map((entry) => ({
    entry,
    text: [
      entry?.signal,
      entry?.context,
      entry?.what_helped,
      entry?.content,
      entry?.situation,
      entry?.automatic_thought,
      entry?.emotion,
    ].filter(Boolean).join(" ").toLowerCase(),
  }));
  const matchingRecords = (terms) => directTextByRecord.filter(({ text }) =>
    terms.some((term) => text.includes(term))
  );

  const remembered = [];

  if (matchingRecords(["walk", "walking"]).length >= 2) {
    remembered.push("Walking may be one of your useful settling tools.");
  }

  if (matchingRecords(["shoulder", "shoulders"]).length >= 2) {
    remembered.push("Pressure may often show up around your shoulders.");
  }

  if (matchingRecords(["stomach", "gut", "digestion"]).length >= 2) {
    remembered.push("Your gut or stomach may be part of your stress pattern.");
  }

  if (matchingRecords(["sleep", "tired", "wired"]).length >= 2) {
    remembered.push("Recovery and sleep seem important in your pattern.");
  }

  if (matchingRecords(["pressure", "pressured", "guilt", "shame"]).length >= 2) {
    remembered.push("You have used pressure-related language more than once. Root should handle that gently with you.");
  }

  if (remembered.length === 0) {
    remembered.push("Root is still learning what matters most to you.");
  }

  return {
    headline: "Root is learning what helps you.",
    memories: remembered.slice(0, 3),
    provenance: {
      layer: "derived_observation_set",
      engine: "rootRelationalMemory",
      derivationType: "repeated_direct_text_match",
      minimumOccurrences: 2,
      sourceRecordIds: records.map((entry) => entry?.id).filter(Boolean),
      sourceTimestamps: records.map((entry) => entry?.created_at).filter(Boolean),
      evidenceOrigins: ["user_entered"],
    },
  };
}
