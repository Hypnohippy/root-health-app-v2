export const PERSONAL_INVESTIGATION_EVENT_TYPE = "root_investigation_event_v1";
export const PERSONAL_INVESTIGATION_SCHEMA_VERSION = "1.0.0";

const ISSUE_DEFINITIONS = Object.freeze([
  { key: "mood", label: "persistent low mood", assessmentKey: "mood", aliases: ["low mood", "mood", "feeling low", "feel low", "sad"] },
  { key: "energy", label: "persistent low energy", assessmentKey: "energy", aliases: ["low energy", "energy", "fatigue", "tired", "exhausted"] },
  { key: "sleep", label: "sleep difficulty", assessmentKey: "sleep", aliases: ["sleep", "insomnia", "rest"] },
  { key: "stress", label: "persistent stress", assessmentKey: "stress", aliases: ["stress", "stressed", "pressure", "overwhelm"] },
  { key: "recovery", label: "recovery difficulty", assessmentKey: "recovery", aliases: ["recovery", "recovering", "switch off"] },
  { key: "focus", label: "focus difficulty", assessmentKey: "focus", aliases: ["focus", "concentration", "concentrate"] },
  { key: "burnout", label: "burnout concern", assessmentKey: "burnout", aliases: ["burnout", "burnt out", "burned out"] },
]);

const START_PATTERNS = [
  /\b(?:want|would like|need) to (?:understand|explore|work out|figure out)\b.*\bwhy\b/i,
  /\b(?:understand|explore|work out|figure out)\b.*\bwhy\b/i,
  /\bwhy\b.*\b(?:keeps? happening|is happening|i keep feeling)\b/i,
];
const ABANDON_PATTERNS = [
  /\b(?:stop|drop|abandon|leave|cancel|end)\b.*\b(?:investigation|exploring|working (?:on|out)|looking into)\b/i,
  /\b(?:don't|dont|do not) want to (?:explore|understand|work out|continue)\b/i,
];
const RESOLVE_PATTERNS = [
  /\b(?:this|that|it) (?:is|feels) (?:resolved|settled|no longer a concern)\b/i,
  /\bi (?:understand|worked out|figured out) (?:it|this|that) now\b/i,
  /\bclose (?:this|the) investigation\b/i,
];
const CHANGE_PATTERNS = [
  /\binstead\b/i,
  /\b(?:change|switch)\b.*\b(?:focus|explore|work on|look at)\b/i,
  /\b(?:focus|explore|work on|look at)\b.*\bnow\b/i,
  /\b(?:stop|drop|leave|abandon)\b.*\b(?:and|then)\b.*\b(?:focus|explore|work on|look at)\b/i,
];
const BROAD_FOCUS_PATTERNS = [
  /\bwhat should i focus on(?: today)?\b/i,
  /\bwhere should i focus(?: today)?\b/i,
  /\bwhat (?:matters|is important) today\b/i,
  /\bwhat should we work on(?: today)?\b/i,
];

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function cleanText(value, max = 500) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function normalise(value) {
  return cleanText(value).toLowerCase();
}

function timestamp(record) {
  return new Date(record?.created_at || record?.started_at || 0).getTime();
}

function issueForText(text = "") {
  const lower = normalise(text);
  return ISSUE_DEFINITIONS
    .map((issue) => ({
      issue,
      index: Math.max(...issue.aliases.map((alias) => lower.lastIndexOf(alias))),
    }))
    .filter((match) => match.index >= 0)
    .sort((first, second) => second.index - first.index)[0]?.issue || null;
}

export function isPersonalInvestigationEvent(record) {
  return record?.prompt_type === PERSONAL_INVESTIGATION_EVENT_TYPE;
}

export function parsePersonalInvestigationEvent(record) {
  if (!isPersonalInvestigationEvent(record)) return null;
  try {
    const parsed = JSON.parse(record?.content || "{}");
    if (parsed?.schemaVersion !== PERSONAL_INVESTIGATION_SCHEMA_VERSION || !parsed?.eventType) return null;
    return {
      ...parsed,
      sourceRecordId: record?.id || null,
      recordedAt: record?.created_at || parsed.recordedAt || null,
      provenance: {
        layer: "source_record_projection",
        table: "journal_entries",
        sourceRecordId: record?.id || null,
      },
    };
  } catch {
    return null;
  }
}

export function detectPersonalInvestigationIntent(message, activeInvestigation = null) {
  const text = cleanText(message, 1000);
  if (!text) return null;

  const issue = issueForText(text);
  const explicitSwitch = Boolean(
    activeInvestigation &&
    issue &&
    issue.key !== activeInvestigation.issueKey &&
    CHANGE_PATTERNS.some((pattern) => pattern.test(text))
  );

  if (explicitSwitch) {
    return {
      eventType: "started",
      investigationId: `investigation:${issue.key}:${Date.now()}`,
      issueKey: issue.key,
      label: issue.label,
      assessmentKey: issue.assessmentKey,
      replacesInvestigationId: activeInvestigation.id,
      userStatement: text,
    };
  }

  if (activeInvestigation && ABANDON_PATTERNS.some((pattern) => pattern.test(text))) {
    return { eventType: "abandoned", investigationId: activeInvestigation.id, issueKey: activeInvestigation.issueKey, label: activeInvestigation.label, userStatement: text };
  }
  if (activeInvestigation && RESOLVE_PATTERNS.some((pattern) => pattern.test(text))) {
    return { eventType: "resolved", investigationId: activeInvestigation.id, issueKey: activeInvestigation.issueKey, label: activeInvestigation.label, userStatement: text };
  }

  const starts = issue && (
    !activeInvestigation &&
    START_PATTERNS.some((pattern) => pattern.test(text))
  );
  if (!starts) return null;

  if (activeInvestigation?.issueKey === issue.key) return null;
  return {
    eventType: "started",
    investigationId: `investigation:${issue.key}:${Date.now()}`,
    issueKey: issue.key,
    label: issue.label,
    assessmentKey: issue.assessmentKey,
    replacesInvestigationId: activeInvestigation?.id || null,
    userStatement: text,
  };
}

export function buildPersonalInvestigationJournalRow({ profileKey, event, recordedAt = new Date().toISOString() } = {}) {
  const allowedEventTypes = new Set(["started", "abandoned", "resolved"]);
  const issue = ISSUE_DEFINITIONS.find((item) => item.key === event?.issueKey);
  if (!profileKey || !allowedEventTypes.has(event?.eventType) || !event?.investigationId || !issue) return null;
  const payload = {
    schemaVersion: PERSONAL_INVESTIGATION_SCHEMA_VERSION,
    eventType: event.eventType,
    investigationId: cleanText(event.investigationId, 180),
    issueKey: cleanText(event.issueKey, 80),
    label: issue.label,
    assessmentKey: issue.assessmentKey,
    replacesInvestigationId: cleanText(event.replacesInvestigationId, 180) || null,
    userStatement: cleanText(event.userStatement, 1000),
    recordedAt,
  };
  return {
    profile_key: profileKey,
    prompt_type: PERSONAL_INVESTIGATION_EVENT_TYPE,
    title: `Root investigation: ${payload.label || payload.issueKey}`,
    content: JSON.stringify(payload),
    emotional_theme: payload.issueKey || "personal investigation",
    recommended_coach_mode: "Investigation",
    recommended_prompt: "Continue the active investigation with one discriminating question.",
  };
}

function scoreFromAssessment(record, issueKey) {
  const candidates = [issueKey, `${issueKey}_score`];
  for (const key of candidates) {
    const value = record?.[key];
    if (value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value))) return Number(value);
  }
  return null;
}

function relevantText(record) {
  return [record?.title, record?.content, record?.emotional_theme, record?.signal, record?.context, record?.emotion, record?.tool]
    .filter(Boolean)
    .join(" ");
}

function buildRelevantEvidence(active, evidence) {
  const issue = ISSUE_DEFINITIONS.find((item) => item.key === active.issueKey);
  const aliases = issue?.aliases || [active.issueKey];
  const crossDomainTerms = {
    mood: ["sensory overload", "overwhelm", "withdraw", "isolat", "low energy"],
    energy: ["fatigue", "depleted", "meal", "hydration", "sleep", "workload"],
    sleep: ["wired", "tension", "stress", "evening", "night"],
    stress: ["tension", "overload", "pressure", "racing thoughts"],
  }[active.issueKey] || [];
  const startedAt = new Date(active.startedAt || 0).getTime();
  const lookback = startedAt - 7 * 24 * 60 * 60 * 1000;
  const assessments = safeArray(evidence?.source?.assessments?.records)
    .filter((record) => scoreFromAssessment(record, active.issueKey) !== null)
    .slice(0, 5)
    .map((record) => ({ id: record.id, type: "check_in", recordedAt: record.created_at, score: scoreFromAssessment(record, active.issueKey), summary: `${active.label} measured ${scoreFromAssessment(record, active.issueKey)}/10` }));

  const selectRecords = (records, type) => safeArray(records)
    .filter((record) => !isPersonalInvestigationEvent(record))
    .filter((record) => timestamp(record) >= lookback)
    .filter((record) => {
      const text = normalise(relevantText(record));
      const supportedCrossDomain = crossDomainTerms.some((term) => text.includes(term));
      return aliases.some((alias) => text.includes(alias)) || supportedCrossDomain;
    })
    .slice(0, 4)
    .map((record) => ({
      id: record.id,
      type,
      recordedAt: record.created_at || record.started_at || null,
      summary: cleanText(type === "journal" ? (record.emotional_theme || record.title || "a reflection") : (record.signal || record.emotion || record.tool || record.context || type), 180),
    }));

  return [
    ...assessments,
    ...selectRecords(evidence?.source?.journalEntries?.records, "journal"),
    ...selectRecords(evidence?.source?.bodySignals?.records, "body"),
    ...selectRecords(evidence?.source?.mindEntries?.records, "mind"),
  ].sort((a, b) => new Date(b.recordedAt || 0) - new Date(a.recordedAt || 0));
}

function nextQuestion(active, relevantEvidence) {
  const questions = {
    mood: [
      "When is the low mood most noticeable, and are there parts of the day when it lifts at all?",
      "What tends to be happening just before the mood becomes heavier or lighter?",
      "Does it feel constant, or does it change with rest, activity, company, or particular situations?",
    ],
    energy: ["When are the energy dips most noticeable, and are they constant or episodic?", "What changes around meals, hydration, workload, rest, or activity when energy is better or worse?"],
    sleep: ["Which part of sleep is most difficult: settling, waking, or feeling restored afterwards?"],
    stress: ["When does the pressure rise most clearly, and what is happening around it?"],
  };
  const options = questions[active.issueKey] || [`When is ${active.label} most noticeable, and what seems different when it eases?`];
  const journalCount = relevantEvidence.filter((item) => item.type === "journal").length;
  return options[Math.min(journalCount, options.length - 1)];
}

export function deriveActivePersonalInvestigation({ journalEntries = [], evidence = null, assessmentKnowledge = null } = {}) {
  const events = safeArray(journalEntries).map(parsePersonalInvestigationEvent).filter(Boolean)
    .sort((a, b) => new Date(a.recordedAt || 0) - new Date(b.recordedAt || 0));
  const states = new Map();
  events.forEach((event) => {
    if (event.eventType === "started") {
      if (event.replacesInvestigationId && states.has(event.replacesInvestigationId)) {
        states.set(event.replacesInvestigationId, { ...states.get(event.replacesInvestigationId), status: "changed", endedAt: event.recordedAt });
      }
      states.set(event.investigationId, { id: event.investigationId, issueKey: event.issueKey, label: event.label, assessmentKey: event.assessmentKey, status: "active", startedAt: event.recordedAt, userStatement: event.userStatement, sourceRecordIds: [event.sourceRecordId].filter(Boolean) });
    } else if (states.has(event.investigationId)) {
      const current = states.get(event.investigationId);
      states.set(event.investigationId, { ...current, status: event.eventType, endedAt: event.recordedAt, sourceRecordIds: [...current.sourceRecordIds, event.sourceRecordId].filter(Boolean) });
    }
  });
  const active = [...states.values()].reverse().find((item) => item.status === "active") || null;
  if (!active) return { active: null, history: [...states.values()], events };

  const relevantEvidence = buildRelevantEvidence(active, evidence);
  const metrics = safeArray(assessmentKnowledge?.movement?.metrics);
  const metric = metrics.find((item) => item.key === active.issueKey) || null;
  const improvingElsewhere = metrics.filter((item) => item.key !== active.issueKey && Number(item.change) <= -2);
  const reconciledSummary = metric && improvingElsewhere.length
    ? `The overall picture has improved in ${improvingElsewhere.map((item) => item.label.toLowerCase()).join(", ")}, while ${metric.label.toLowerCase()} remains ${metric.latest}/10.`
    : metric
      ? `${metric.label} is currently ${metric.latest}/10; Root does not yet know why.`
      : `You asked Root to help understand ${active.label}; the cause remains unknown.`;

  return {
    active: {
      ...active,
      metric,
      relevantEvidence,
      reconciledSummary,
      whatRemainsUnknown: `Root has not established what is driving ${active.label}. The observations so far are associations, not causes.`,
      nextQuestion: nextQuestion(active, relevantEvidence),
      provenance: {
        layer: "derived_active_investigation",
        sourceRecordIds: [...active.sourceRecordIds, ...relevantEvidence.map((item) => item.id)].filter(Boolean),
        sourceRecordsMutated: false,
        diagnosticClaim: false,
      },
    },
    history: [...states.values()],
    events,
  };
}

export function isBroadFocusQuestion(message = "") {
  return BROAD_FOCUS_PATTERNS.some((pattern) => pattern.test(String(message)));
}

export function buildActiveInvestigationFocusReply(active) {
  if (!active) return null;
  const observations = safeArray(active.relevantEvidence)
    .filter((item) => item.type !== "check_in")
    .slice(0, 2)
    .map((item) => `${item.type === "body" ? "a body signal" : item.type === "journal" ? "a reflection" : "a Mind entry"} (${item.summary})`);
  const evidenceLine = observations.length
    ? `Since then, you have also recorded ${observations.join(" and ")}. That may be relevant, but it does not show cause.`
    : "There is not enough related evidence yet to explain the pattern.";
  return `You asked Root to help you understand ${active.label}, so that remains the clearest focus rather than starting a generic topic.\n\n${active.reconciledSummary} ${evidenceLine}\n\n${active.whatRemainsUnknown}\n\n${active.nextQuestion}`;
}
