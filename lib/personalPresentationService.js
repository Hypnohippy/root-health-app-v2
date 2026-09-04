import { buildBodyTrackerPresentationCandidates, classificationSupportedByUserContent } from "./personalSemanticEvidence.js";
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export const PERSONAL_PRESENTATION_POLICY = Object.freeze({
  freshMs: 3 * DAY,
  recentMs: 14 * DAY,
  repeatCooldownMs: 3 * DAY,
  repeatMemoryMs: 14 * DAY,
  minimumEligibleScore: 60,
  maximumReceipts: 100,
});

export const PERSONAL_PRESENTATION_RECEIPT_PREFIX = "root_personal_presentation_receipts_v1";

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function recordTime(record = {}) {
  const value =
    record.completed_at ||
    record.started_at ||
    record.created_at ||
    record.updated_at ||
    null;
  const timestamp = value ? new Date(value).getTime() : 0;
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function sourceIds(records = []) {
  return safeArray(records).map((record) => record?.id).filter(Boolean);
}

function sourceTimestamps(records = []) {
  return safeArray(records)
    .map((record) =>
      record?.completed_at || record?.started_at || record?.created_at || record?.updated_at
    )
    .filter(Boolean);
}

function fingerprint(kind, key, ids = []) {
  return [kind, key, ...[...ids].sort()].join(":");
}

function measuredNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function freshnessScore(timestamp, now, policy) {
  if (!timestamp) return { label: "historical", score: 0, ageMs: null };
  const ageMs = Math.max(0, now - timestamp);
  if (ageMs <= policy.freshMs) return { label: "fresh", score: 30, ageMs };
  if (ageMs <= policy.recentMs) return { label: "recent", score: 15, ageMs };
  return { label: "historical", score: 0, ageMs };
}

function candidate({
  kind,
  key,
  title,
  message,
  records,
  significance,
  change = 0,
  recurrence = 0,
  confidence = "early",
  evidenceOrigin,
  now,
  policy,
  metadata = {},
}) {
  const safeRecords = safeArray(records);
  const ids = sourceIds(safeRecords);
  const timestamps = sourceTimestamps(safeRecords);
  const newest = Math.max(0, ...safeRecords.map(recordTime));
  const freshness = freshnessScore(newest, now, policy);
  const confidenceScore = confidence === "developing" ? 10 : confidence === "established" ? 15 : 0;
  const recurrenceScore = Math.min(15, Math.max(0, recurrence - 1) * 5);
  const changeScore = Math.min(20, Math.abs(Number(change) || 0) * 4);

  return {
    id: fingerprint(kind, key, ids),
    fingerprint: fingerprint(kind, key, ids),
    kind,
    key,
    title,
    message,
    status: recurrence >= 2 ? "developing" : "new",
    confidence,
    evidenceOrigin,
    sourceRecordIds: ids,
    sourceTimestamps: timestamps,
    latestEvidenceAt: newest ? new Date(newest).toISOString() : null,
    score: significance + freshness.score + confidenceScore + recurrenceScore + changeScore,
    scoreBreakdown: {
      significance,
      freshness: freshness.score,
      confidence: confidenceScore,
      recurrence: recurrenceScore,
      change: changeScore,
      novelty: 0,
      repetition: 0,
    },
    freshness: freshness.label,
    metadata,
    provenance: {
      layer: "presentation_candidate",
      derivationType: "deterministic_personal_presentation_policy",
      sourceRecordIds: ids,
      sourceTimestamps: timestamps,
      evidenceOrigin,
    },
  };
}

function measuredInterventionCandidates(outcomes, now, policy) {
  const measured = safeArray(outcomes).filter((outcome) =>
    outcome?.completed === true &&
    measuredNumber(outcome?.before_score) !== null &&
    measuredNumber(outcome?.after_score) !== null
  );
  const attemptsByIntervention = new Map();
  measured.forEach((outcome) => {
    const key = String(outcome?.intervention_name || "Measured intervention").trim().toLowerCase();
    attemptsByIntervention.set(key, (attemptsByIntervention.get(key) || 0) + 1);
  });

  return measured.map((outcome) => {
    const before = measuredNumber(outcome.before_score);
    const after = measuredNumber(outcome.after_score);
    const change = before - after;
    const name = outcome.intervention_name || "Measured intervention";
    const attemptCount = attemptsByIntervention.get(name.trim().toLowerCase()) || 1;
    const direction = change > 0 ? "reduced" : change < 0 ? "increased" : "did not change";
    return candidate({
      kind: "measured_intervention",
      key: outcome.id || `${name}-${outcome.completed_at || outcome.started_at}`,
      title: `${name}: ${before} → ${after}`,
      message: `Your score ${direction} during this measured use. ${
        attemptCount === 1
          ? "This is early evidence, not proof that the intervention caused the change."
          : `Root has ${attemptCount} measured uses to compare, without assuming cause.`
      }`,
      records: [outcome],
      significance: 90,
      change,
      recurrence: attemptCount,
      confidence: attemptCount >= 2 ? "developing" : "early",
      evidenceOrigin: "system_measured",
      now,
      policy,
      metadata: { before, after, change, attemptCount, userObservation: outcome.user_observation || null },
    });
  });
}

function assessmentCandidate(assessments, now, policy) {
  const ordered = [...safeArray(assessments)].sort((a, b) => recordTime(a) - recordTime(b));
  if (ordered.length < 2) return [];
  const first = ordered[0];
  const latest = ordered[ordered.length - 1];
  const fields = ["stress_score", "sleep_score", "recovery_score", "energy_score", "mood_score", "focus_score", "burnout_score"];
  const changes = fields
    .map((field) => [field, measuredNumber(first?.[field]), measuredNumber(latest?.[field])])
    .filter(([, before, after]) => before !== null && after !== null)
    .map(([field, before, after]) => ({ field, before, after, change: before - after }));
  if (!changes.length) return [];
  const strongest = [...changes].sort((a, b) => Math.abs(b.change) - Math.abs(a.change))[0];
  if (!strongest || strongest.change === 0) return [];
  const label = strongest.field.replace(/_score$/, "").replace(/_/g, " ");
  return [candidate({
    kind: "assessment_movement",
    key: `${first.id || "first"}-${latest.id || "latest"}-${strongest.field}`,
    title: `${label}: ${strongest.before} → ${strongest.after}`,
    message: `Your recorded ${label} score ${strongest.change > 0 ? "reduced" : "increased"}. Root will compare this with later check-ins rather than treating one change as a settled trend.`,
    records: [first, latest],
    significance: 70,
    change: strongest.change,
    confidence: "early",
    evidenceOrigin: "system_measured",
    now,
    policy,
    metadata: strongest,
  })];
}

function directEvidenceCandidates({ bodySignals, journalEntries, mindEntries, excludeBodyIds = new Set() }, now, policy) {
  const body = safeArray(bodySignals).filter((record) => !excludeBodyIds.has(record?.id)).slice(0, 3).map((record) => candidate({
    kind: "body_observation",
    key: record.id || `${record.signal}-${record.created_at}`,
    title: record.signal || "Body signal recorded",
    message: `You recorded this body signal${record.context ? ` in the context “${record.context}”` : ""}. One record is not a pattern.`,
    records: [record], significance: 40, confidence: "early", evidenceOrigin: "user_entered", now, policy,
  }));
  const journal = safeArray(journalEntries).slice(0, 3)
    .filter((record) => record?.content)
    .map((record) => candidate({
      kind: "journal_observation",
      key: record.id || record.created_at,
      title: "A reflection you recorded",
      message: `You noted: “${String(record.content).slice(0, 180)}”`,
      records: [record], significance: 35, confidence: "early", evidenceOrigin: "user_entered", now, policy,
    }));
  const mind = safeArray(mindEntries).slice(0, 3)
    .filter((record) => record?.emotion)
    .map((record) => candidate({
      kind: "mind_observation",
      key: record.id || record.created_at,
      title: "An emotional check-in",
      message: `You recorded ${record.emotion}. Root will not call one entry a pattern.`,
      records: [record], significance: 35, confidence: "early", evidenceOrigin: "user_entered", now, policy,
    }));
  return [...body, ...journal, ...mind];
}

function classificationCandidates(journalEntries, now, policy) {
  const grouped = new Map();
  safeArray(journalEntries).forEach((record) => {
    const theme = String(record?.emotional_theme || "").trim();
    if (!theme) return;
    grouped.set(theme, [...(grouped.get(theme) || []), record]);
  });
  return [...grouped.entries()]
    .filter(([theme, records]) => records.length >= 2 && classificationSupportedByUserContent(theme, records))
    .map(([theme, records]) => candidate({
      kind: "classified_theme",
      key: theme.toLowerCase(),
      title: "A reflection theme is beginning to repeat",
      message: `Root has grouped ${records.length} reflections around a ${theme.toLowerCase()} theme. This is Root's classification, not necessarily wording you used.`,
      records,
      significance: 30,
      recurrence: records.length,
      confidence: "developing",
      evidenceOrigin: "system_classification",
      now,
      policy,
      metadata: { theme, occurrenceCount: records.length },
    }));
}

export function buildPersonalPresentationCandidates({ evidence, now = new Date(), policy = PERSONAL_PRESENTATION_POLICY } = {}) {
  const timestamp = now instanceof Date ? now.getTime() : new Date(now).getTime();
  const source = evidence?.source || {};
  const records = (envelope) => safeArray(envelope?.records);
  const bodyTrackerCandidates = buildBodyTrackerPresentationCandidates({
    bodySignals: records(source.bodySignals),
    trackerSubmissions: records(source.trackerSubmissions),
    playbook: records(evidence?.awareness?.playbook),
    now: timestamp,
  });
  const combinedBodyIds = new Set(bodyTrackerCandidates.flatMap((item) => item.metadata?.bodyRecordIds || [item.metadata?.bodyRecordId]).filter(Boolean));
  return [
    ...measuredInterventionCandidates(records(source.interventionOutcomes), timestamp, policy),
    ...assessmentCandidate(records(source.assessments), timestamp, policy),
    ...bodyTrackerCandidates.map((item) => candidate({ ...item, policy })),
    ...directEvidenceCandidates({
      bodySignals: records(source.bodySignals),
      journalEntries: records(source.journalEntries),
      mindEntries: records(source.mindEntries),
      excludeBodyIds: combinedBodyIds,
    }, timestamp, policy),
    ...classificationCandidates(records(source.journalEntries), timestamp, policy),
  ].sort((a, b) => b.score - a.score || String(b.latestEvidenceAt || "").localeCompare(String(a.latestEvidenceAt || "")));
}

export function selectPersonalPresentation({
  candidates = [],
  receipts = [],
  now = new Date(),
  limit = 1,
  policy = PERSONAL_PRESENTATION_POLICY,
} = {}) {
  const timestamp = now instanceof Date ? now.getTime() : new Date(now).getTime();
  const receiptMap = new Map(safeArray(receipts).map((receipt) => [receipt?.fingerprint, receipt]));
  const ranked = safeArray(candidates).map((item) => {
    const receipt = receiptMap.get(item.fingerprint);
    const shownAt = receipt?.shownAt ? new Date(receipt.shownAt).getTime() : 0;
    const shownAge = shownAt ? Math.max(0, timestamp - shownAt) : null;
    const repetitionPenalty = shownAge !== null && shownAge <= policy.repeatCooldownMs
      ? 100
      : shownAge !== null && shownAge <= policy.repeatMemoryMs
      ? 30
      : 0;
    const noveltyScore = receipt ? 0 : 15;
    return {
      ...item,
      score: item.score + noveltyScore - repetitionPenalty,
      scoreBreakdown: {
        ...item.scoreBreakdown,
        novelty: noveltyScore,
        repetition: -repetitionPenalty,
      },
      recentlyShown: repetitionPenalty > 0,
      presentationEligible:
        repetitionPenalty < 100 &&
        item.score + noveltyScore - repetitionPenalty >= policy.minimumEligibleScore,
    };
  }).sort((a, b) => b.score - a.score || String(b.latestEvidenceAt || "").localeCompare(String(a.latestEvidenceAt || "")));
  const selected = ranked.filter((item) => item.presentationEligible).slice(0, Math.max(0, limit));
  return {
    selected,
    ranked,
    suppressed: ranked.filter((item) => !item.presentationEligible),
    emptyReason: selected.length
      ? null
      : ranked.some((item) => item.recentlyShown)
      ? "recently_presented"
      : candidates.length
      ? "no_material_change"
      : "no_material_evidence",
    provenance: { layer: "presentation_selection", sourceEvidenceMutated: false, deterministic: true },
  };
}

export function recordPersonalPresentationReceipts({ receipts = [], presented = [], shownAt = new Date(), policy = PERSONAL_PRESENTATION_POLICY } = {}) {
  const next = new Map(safeArray(receipts).map((receipt) => [receipt?.fingerprint, receipt]));
  safeArray(presented).forEach((item) => {
    if (!item?.fingerprint) return;
    next.set(item.fingerprint, {
      fingerprint: item.fingerprint,
      shownAt: shownAt instanceof Date ? shownAt.toISOString() : new Date(shownAt).toISOString(),
      sourceRecordIds: item.sourceRecordIds || [],
    });
  });
  return [...next.values()]
    .sort((a, b) => new Date(b.shownAt).getTime() - new Date(a.shownAt).getTime())
    .slice(0, policy.maximumReceipts);
}

export function loadPersonalPresentationReceipts(profileKey, storage = null) {
  if (!profileKey) return [];
  const activeStorage = storage || (typeof window !== "undefined" ? window.localStorage : null);
  if (!activeStorage) return [];
  try {
    const value = JSON.parse(activeStorage.getItem(`${PERSONAL_PRESENTATION_RECEIPT_PREFIX}:${profileKey}`) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function savePersonalPresentationReceipts(profileKey, receipts, storage = null) {
  if (!profileKey) return false;
  const activeStorage = storage || (typeof window !== "undefined" ? window.localStorage : null);
  if (!activeStorage) return false;
  try {
    activeStorage.setItem(
      `${PERSONAL_PRESENTATION_RECEIPT_PREFIX}:${profileKey}`,
      JSON.stringify(safeArray(receipts))
    );
    return true;
  } catch {
    return false;
  }
}
