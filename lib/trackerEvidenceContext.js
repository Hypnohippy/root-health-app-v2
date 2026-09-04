export function buildTrackerCoachContext(trackers = null, { limit = 10 } = {}) {
  const recent = Array.isArray(trackers?.recent) ? trackers.recent.slice(0, limit) : [];
  if (!recent.length) return "No Playbook tracker submissions are available.";

  const lines = recent.map((entry) => {
    const recorded = entry?.createdAt || "timestamp unavailable";
    return `${recorded}: ${JSON.stringify(entry?.answers || {})} [tracker ${entry?.trackerId || "unknown"}; source record ${entry?.id || "unknown"}]`;
  });

  return `Recent user-recorded Playbook tracker submissions (newest first; distinct source records):\n${lines.join("\n")}\nDescribe these as what the user recorded. Multiple entries may support a cautious pattern or association; never present an isolated entry or association as a cause.`;
}
