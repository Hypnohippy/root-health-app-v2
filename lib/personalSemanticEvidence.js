const SUPPORTING_TYPES = new Set(["date", "time", "datetime", "number", "scale_1_10", "yes_no_not_sure"]);
const SUPPORTING_KEYS = /(^|_)(date|time|timing|context|duration|pattern|course|onset|intensity|score|modifier|status|state|category|type|source|label|created|updated|started|completed)($|_)/i;
const STRUCTURAL_JOURNAL_FIELDS = new Set(["emotional_theme", "recommended_coach_mode", "prompt_type", "title"]);

const clean = (value) => String(value ?? "").trim();
const values = (value) => Array.isArray(value) ? value : value === null || value === undefined || value === "" ? [] : [value];
const normal = (value) => clean(value).toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

export function personalEvidenceRecordedAt(record = {}) {
  const value = record.created_at || record.recorded_at || record.submitted_at || record.createdAt || null;
  const timestamp = value ? new Date(value).getTime() : 0;
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function orderPersonalEvidenceChronologically(records = [], direction = "asc") {
  const multiplier = direction === "desc" ? -1 : 1;
  return [...records].sort((first, second) => {
    const timeDifference = personalEvidenceRecordedAt(first) - personalEvidenceRecordedAt(second);
    if (timeDifference) return timeDifference * multiplier;
    return String(first?.id || "").localeCompare(String(second?.id || "")) * multiplier;
  });
}

export function trackerFieldRole(field = {}) {
  if (SUPPORTING_TYPES.has(field.type) || SUPPORTING_KEYS.test(field.key || "")) return "supporting_metadata";
  return "theme_candidate";
}

export function bodyFieldRole(field = "") {
  return ["signal", "symptoms", "notes"].includes(field) ? "theme_candidate" : "supporting_metadata";
}

export function journalFieldRole(field = "") {
  if (field === "content") return "theme_candidate";
  return STRUCTURAL_JOURNAL_FIELDS.has(field) ? "supporting_metadata" : "supporting_metadata";
}

export function classificationSupportedByUserContent(theme, records = []) {
  const words = normal(theme).split(" ").filter((word) => word.length >= 4);
  if (!words.length) return false;
  return records.filter((record) => {
    const content = normal(record?.content);
    return words.some((word) => content.includes(word));
  }).length >= 2;
}

export function buildMeaningfulJournalThemes(records = []) {
  const grouped = new Map();
  for (const record of records) {
    const theme = clean(record?.emotional_theme);
    if (theme) grouped.set(theme, [...(grouped.get(theme) || []), record]);
  }
  return [...grouped.entries()]
    .filter(([theme, rows]) => rows.length >= 2 && classificationSupportedByUserContent(theme, rows))
    .map(([theme, rows]) => [theme, rows.length])
    .sort((a, b) => b[1] - a[1]);
}

export function buildMeaningfulBodyTopics(records = []) {
  const counts = new Map();
  for (const record of records) {
    const supporting = new Set([
      record.context,
      ...values(record.timing_contexts),
      ...values(record.duration_patterns),
      ...values(record.modifiers),
      record.depth,
    ].map(normal).filter(Boolean));
    const topics = [...values(record.symptoms), record.signal]
      .map(clean)
      .filter((topic) => topic && !supporting.has(normal(topic)));
    for (const topic of new Set(topics)) counts.set(topic, (counts.get(topic) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
}

function trackerMap(playbook = []) {
  return new Map((Array.isArray(playbook) ? playbook : []).filter((item) => item?.item_type === "tracker").map((item) => [item.id, item]));
}

export function compactTrackerActivity(submission, playbook = []) {
  if (!submission) return null;
  const tracker = trackerMap(playbook).get(submission.tracker_id);
  const fields = Array.isArray(tracker?.tracker_definition?.fields) ? tracker.tracker_definition.fields : [];
  const fieldMap = new Map(fields.map((field) => [field.key, field]));
  const recordedFields = Object.entries(submission.answers || {}).slice(0, 4).map(([key, value]) => ({
    key,
    label: fieldMap.get(key)?.label || key.replace(/_/g, " "),
    value: values(value).map(clean).filter(Boolean).join(", "),
    role: trackerFieldRole(fieldMap.get(key) || { key }),
  }));
  return {
    id: submission.id,
    trackerId: submission.tracker_id,
    title: tracker?.title || tracker?.tracker_definition?.title || "Playbook tracker",
    createdAt: submission.created_at,
    fields: recordedFields,
    provenance: { table: "playbook_tracker_entries", sourceRecordId: submission.id, origin: "source_record" },
  };
}

function bodyTopics(record = {}) {
  return [record.signal, ...values(record.symptoms)].map(normal).filter(Boolean);
}

function trackerTopicValues(activity) {
  return (activity?.fields || []).filter((field) => field.role === "theme_candidate").map((field) => normal(field.value)).filter(Boolean);
}

export function buildBodyTrackerPresentationCandidates({ bodySignals = [], trackerSubmissions = [], playbook = [], now = new Date() } = {}) {
  const activities = trackerSubmissions.map((row) => compactTrackerActivity(row, playbook)).filter(Boolean);
  const candidates = [];
  const representedTopics = new Set();
  for (const body of bodySignals.slice(0, 5)) {
    const topics = bodyTopics(body);
    if (!topics.length) continue;
    const topicKey = [...topics].sort().join(":");
    if (representedTopics.has(topicKey)) continue;
    const related = activities.filter((activity) => trackerTopicValues(activity).some((value) => topics.some((topic) => value.includes(topic) || topic.includes(value))));
    if (!related.length) continue;
    representedTopics.add(topicKey);
    const relatedBodies = bodySignals.filter((record) => bodyTopics(record).some((value) => topics.some((topic) => value.includes(topic) || topic.includes(value))));
    const relatedTrackers = related.map((activity) => trackerSubmissions.find((row) => row.id === activity.id)).filter(Boolean);
    const records = orderPersonalEvidenceChronologically([...relatedBodies, ...relatedTrackers]);
    const topic = clean(body.signal || body.symptoms?.[0] || "Body signal");
    const earliestRecord = records[0];
    const latestRecord = records[records.length - 1];
    const latestIsBody = relatedBodies.some((record) => record.id === latestRecord?.id);
    const latest = latestIsBody ? null : compactTrackerActivity(latestRecord, playbook);
    const supporting = latest
      ? latest.fields.filter((field) => field.role === "supporting_metadata").map((field) => `${field.label.toLowerCase()} ${field.value}`).slice(0, 2)
      : [];
    const earliestIsBody = relatedBodies.some((record) => record.id === earliestRecord?.id);
    const earliestTracker = earliestIsBody ? null : compactTrackerActivity(earliestRecord, playbook);
    const earliestContext = earliestIsBody && earliestRecord?.context
      ? ` in the context “${earliestRecord.context}”`
      : "";
    candidates.push({
      kind: "body_tracker_observation",
      key: `${body.id}:${latestRecord.id}`,
      title: `${topic} has been recorded again`,
      message: `You first recorded ${topic}${earliestIsBody ? earliestContext || " as a Body signal" : ` in ${earliestTracker?.title || "a Playbook tracker"}`}, and ${latestIsBody ? "a later Body signal" : latest?.title || "a Playbook tracker"} later recorded it${latestIsBody && latestRecord?.context ? ` in the context “${latestRecord.context}”` : supporting.length ? ` with ${supporting.join(" and ")}` : " again"}. Evidence is beginning to accumulate, but there is not yet enough to identify a reliable pattern or cause.`,
      records,
      significance: 65,
      recurrence: records.length,
      confidence: records.length >= 3 ? "developing" : "early",
      evidenceOrigin: "user_entered",
      now,
      metadata: { bodyRecordId: body.id, bodyRecordIds: relatedBodies.map((record) => record.id).filter(Boolean), trackerActivity: orderPersonalEvidenceChronologically(related, "desc")[0], earliestSourceRecordId: earliestRecord?.id || null, evidenceLevel: records.length >= 3 ? "repeated_observation" : "accumulating_observations" },
    });
  }
  return candidates;
}
