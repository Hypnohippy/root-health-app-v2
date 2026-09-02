import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPersonalPresentationCandidates,
  loadPersonalPresentationReceipts,
  recordPersonalPresentationReceipts,
  savePersonalPresentationReceipts,
  selectPersonalPresentation,
} from "../lib/personalPresentationService.js";

function envelope(records) {
  return { records };
}

function evidence(overrides = {}) {
  return {
    source: {
      interventionOutcomes: envelope([]),
      assessments: envelope([]),
      bodySignals: envelope([]),
      journalEntries: envelope([]),
      mindEntries: envelope([]),
      ...overrides,
    },
  };
}

const now = new Date("2026-09-03T12:00:00.000Z");

test("a fresh measured 8 to 4 result outranks a weak classified observation", () => {
  const candidates = buildPersonalPresentationCandidates({
    evidence: evidence({
      interventionOutcomes: envelope([{
        id: "outcome-1",
        intervention_name: "Root Calm Reset",
        before_score: 8,
        after_score: 4,
        completed: true,
        completed_at: "2026-09-03T11:00:00.000Z",
      }]),
      journalEntries: envelope([{
        id: "journal-1",
        content: "Pressured",
        emotional_theme: "Guilt & pressure",
        created_at: "2026-09-03T10:00:00.000Z",
      }]),
    }),
    now,
  });
  assert.equal(candidates[0].kind, "measured_intervention");
  assert.equal(candidates[0].title, "Root Calm Reset: 8 → 4");
  assert.match(candidates[0].message, /not proof.*caused/i);
  assert.doesNotMatch(candidates[0].message, /works|is effective|caused the reduction/i);
  assert.equal(candidates.some((item) => item.kind === "classified_theme"), false);
});

test("single classifications are not presentation candidates but remain in source evidence", () => {
  const journal = Object.freeze({
    id: "journal-1",
    content: "Pressured",
    emotional_theme: "Guilt & pressure",
    created_at: "2026-09-03T10:00:00.000Z",
  });
  const sourceEvidence = evidence({ journalEntries: envelope([journal]) });
  const candidates = buildPersonalPresentationCandidates({ evidence: sourceEvidence, now });
  assert.equal(candidates.some((item) => item.kind === "classified_theme"), false);
  assert.strictEqual(sourceEvidence.source.journalEntries.records[0], journal);
  assert.equal(sourceEvidence.source.journalEntries.records[0].emotional_theme, "Guilt & pressure");
});

test("repeated classification becomes developing without user-facing technical suffixes", () => {
  const candidates = buildPersonalPresentationCandidates({
    evidence: evidence({ journalEntries: envelope([
      { id: "j1", content: "Pressured", emotional_theme: "Guilt & pressure", created_at: "2026-09-03T09:00:00.000Z" },
      { id: "j2", content: "Under pressure", emotional_theme: "Guilt & pressure", created_at: "2026-09-03T10:00:00.000Z" },
    ]) }),
    now,
  });
  const theme = candidates.find((item) => item.kind === "classified_theme");
  assert.equal(theme.status, "developing");
  assert.equal(theme.confidence, "developing");
  assert.deepEqual(theme.sourceRecordIds, ["j1", "j2"]);
  assert.doesNotMatch(`${theme.title} ${theme.message}`, /system_classification|Root grouping\)/i);
  assert.match(theme.message, /Root's classification/);
});

test("a recent receipt suppresses the same observation without deleting it", () => {
  const candidates = buildPersonalPresentationCandidates({
    evidence: evidence({ bodySignals: envelope([{
      id: "body-1", signal: "tight chest", created_at: "2026-09-03T10:00:00.000Z",
    }]) }),
    now,
  });
  const first = selectPersonalPresentation({ candidates, receipts: [], now });
  assert.equal(first.selected.length, 1);
  assert.equal(first.selected[0].scoreBreakdown.novelty, 15);
  const receipts = recordPersonalPresentationReceipts({
    presented: first.selected,
    shownAt: "2026-09-03T11:00:00.000Z",
  });
  const repeated = selectPersonalPresentation({ candidates, receipts, now });
  assert.equal(repeated.selected.length, 0);
  assert.equal(repeated.suppressed[0].fingerprint, candidates[0].fingerprint);
  assert.equal(repeated.suppressed[0].scoreBreakdown.repetition, -100);
  assert.equal(repeated.suppressed[0].scoreBreakdown.novelty, 0);
  assert.equal(candidates.length, 1);
});

test("new supporting evidence changes the fingerprint and is not fake repetition", () => {
  const firstCandidates = buildPersonalPresentationCandidates({
    evidence: evidence({ journalEntries: envelope([
      { id: "j1", content: "Pressured", emotional_theme: "Pressure", created_at: "2026-09-03T09:00:00.000Z" },
      { id: "j2", content: "Pressure", emotional_theme: "Pressure", created_at: "2026-09-03T10:00:00.000Z" },
    ]) }), now,
  });
  const firstTheme = firstCandidates.find((item) => item.kind === "classified_theme");
  const receipts = recordPersonalPresentationReceipts({ presented: [firstTheme], shownAt: now });
  const nextCandidates = buildPersonalPresentationCandidates({
    evidence: evidence({ journalEntries: envelope([
      { id: "j1", content: "Pressured", emotional_theme: "Pressure", created_at: "2026-09-03T09:00:00.000Z" },
      { id: "j2", content: "Pressure", emotional_theme: "Pressure", created_at: "2026-09-03T10:00:00.000Z" },
      { id: "j3", content: "Still pressured", emotional_theme: "Pressure", created_at: "2026-09-03T11:30:00.000Z" },
    ]) }), now,
  });
  const nextTheme = nextCandidates.find((item) => item.kind === "classified_theme");
  assert.notEqual(nextTheme.fingerprint, firstTheme.fingerprint);
  const selected = selectPersonalPresentation({ candidates: [nextTheme], receipts, now });
  assert.equal(selected.selected[0].fingerprint, nextTheme.fingerprint);
});

test("stale weak observations are retained but not presentation eligible", () => {
  const candidates = buildPersonalPresentationCandidates({
    evidence: evidence({ bodySignals: envelope([{
      id: "old-body", signal: "headache", created_at: "2026-01-01T10:00:00.000Z",
    }]) }), now,
  });
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].freshness, "historical");
  const selected = selectPersonalPresentation({ candidates, now });
  assert.equal(selected.selected.length, 0);
  assert.equal(selected.suppressed[0].sourceRecordIds[0], "old-body");
});

test("presentation receipts stay in separate browser storage", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
  };
  const receipts = [{ fingerprint: "fact:1", shownAt: now.toISOString(), sourceRecordIds: ["1"] }];
  assert.equal(savePersonalPresentationReceipts("profile-1", receipts, storage), true);
  assert.deepEqual(loadPersonalPresentationReceipts("profile-1", storage), receipts);
  assert.equal(values.size, 1);
});

test("measured worsening is significant but remains non-causal", () => {
  const candidates = buildPersonalPresentationCandidates({
    evidence: evidence({ interventionOutcomes: envelope([{
      id: "worse-1",
      intervention_name: "Grounding",
      before_score: 4,
      after_score: 7,
      completed: true,
      completed_at: "2026-09-03T11:00:00.000Z",
    }]) }),
    now,
  });
  assert.equal(candidates[0].kind, "measured_intervention");
  assert.match(candidates[0].message, /score increased/);
  assert.match(candidates[0].message, /not proof/);
});

test("missing numeric values cannot manufacture measured candidates", () => {
  const candidates = buildPersonalPresentationCandidates({
    evidence: evidence({
      interventionOutcomes: envelope([{
        id: "unmeasured",
        intervention_name: "Reset",
        before_score: 8,
        after_score: null,
        completed: true,
        completed_at: "2026-09-03T11:00:00.000Z",
      }]),
      assessments: envelope([
        { id: "a1", stress_score: 8, created_at: "2026-09-01T11:00:00.000Z" },
        { id: "a2", stress_score: null, created_at: "2026-09-03T11:00:00.000Z" },
      ]),
    }),
    now,
  });
  assert.equal(candidates.some((item) => item.kind === "measured_intervention"), false);
  assert.equal(candidates.some((item) => item.kind === "assessment_movement"), false);
});

test("repeated measured uses strengthen confidence without becoming causal proof", () => {
  const candidates = buildPersonalPresentationCandidates({
    evidence: evidence({ interventionOutcomes: envelope([
      { id: "o1", intervention_name: "Reset", before_score: 8, after_score: 4, completed: true, completed_at: "2026-09-03T10:00:00.000Z" },
      { id: "o2", intervention_name: "Reset", before_score: 7, after_score: 5, completed: true, completed_at: "2026-09-03T11:00:00.000Z" },
    ]) }),
    now,
  });
  const latest = candidates.find((item) => item.key === "o2");
  assert.equal(latest.confidence, "developing");
  assert.equal(latest.metadata.attemptCount, 2);
  assert.match(latest.message, /without assuming cause/);
});
