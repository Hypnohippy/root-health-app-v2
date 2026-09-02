import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPersonalEvidenceAttribution,
  PERSONAL_EVIDENCE_ORIGINS,
} from "../lib/personalEvidenceAttribution.js";
import { buildPersonalRootKnowledgeFromEvidence } from "../lib/personalKnowledgeService.js";
import { buildLongitudinalMemory } from "../lib/rootLongitudinalEngine.js";
import { buildRootMemoryService } from "../lib/rootMemoryService.js";
import { buildRootReflection } from "../lib/rootReflectionEngine.js";
import { buildRelationalMemory } from "../lib/rootRelationalMemory.js";

function envelope(table, records) {
  return {
    table,
    origin: "source_record",
    records,
    count: records.length,
    returned: records.length,
    limit: 100,
    truncated: false,
    status: "loaded",
    error: null,
  };
}

function personalEvidence(journalEntries = []) {
  const profileKey = "bill-profile";
  return {
    version: 1,
    scope: "personal",
    loadedAt: "2026-09-02T12:00:00.000Z",
    identity: {
      userId: "bill-user",
      profileKey,
      authority: {
        authentication: "supabase_auth_user",
        ownershipRelation: "profiles.user_id",
        browserProfileKeyTrusted: false,
      },
    },
    profile: {
      origin: "source_record",
      record: { id: "bill", user_id: "bill-user", profile_key: profileKey, name: "Bill" },
    },
    source: {
      assessments: envelope("wellbeing_assessments", []),
      bodySignals: envelope("body_signals", []),
      mindEntries: envelope("mind_entries", []),
      journalEntries: envelope("journal_entries", journalEntries),
      interventionOutcomes: envelope("intervention_outcomes", []),
    },
    awareness: {
      playbook: envelope("playbook_entries", []),
      voice: envelope("voice_sessions", []),
    },
    landmarks: { originalAssessmentBaseline: null, latestAssessment: null },
    provenance: { layer: "source_evidence", sourceRecordsMutated: false },
    loadStatus: { partial: false, sources: {} },
  };
}

test("Pressured remains user evidence while Guilt & pressure is a system classification", () => {
  const attribution = buildPersonalEvidenceAttribution({
    journalEntries: [{
      id: "journal-1",
      profile_key: "bill-profile",
      content: "Pressured",
      emotional_theme: "Guilt & pressure",
      created_at: "2026-09-01T10:00:00.000Z",
    }],
  });
  const facts = attribution.bySource.journalEntries;
  assert.equal(facts.find((fact) => fact.field === "content")?.origin, PERSONAL_EVIDENCE_ORIGINS.USER_ENTERED);
  assert.equal(facts.find((fact) => fact.field === "emotional_theme")?.origin, PERSONAL_EVIDENCE_ORIGINS.SYSTEM_CLASSIFICATION);
  assert.equal(facts.find((fact) => fact.field === "emotional_theme")?.source.recordId, "journal-1");
});

test("one classified Journal entry is labelled as classification, not recurrence or user wording", () => {
  const reflection = buildRootReflection({
    journalEntries: [{
      id: "journal-1",
      content: "Pressured",
      emotional_theme: "Guilt & pressure",
      created_at: "2026-09-01T10:00:00.000Z",
    }],
  });
  const text = `${reflection.title} ${reflection.reflection}`;
  assert.match(text, /Root grouped|Root's classification/);
  assert.match(text, /one entry|not a repeated pattern/);
  assert.doesNotMatch(text, /you reported guilt|guilt has been showing up|repeating pattern/i);
  assert.equal(reflection.provenance.occurrenceCount, 1);
  assert.deepEqual(reflection.provenance.sourceRecordIds, ["journal-1"]);
});

test("recurrence requires at least two occurrences", () => {
  const single = buildLongitudinalMemory({
    bodySignals: [{ id: "body-1", signal: "tight chest" }],
    journalEntries: [{ id: "journal-1", emotional_theme: "Guilt & pressure" }],
  });
  assert.doesNotMatch(`${single.headline} ${single.reflection}`, /repeating pattern|more than once/i);

  const repeated = buildLongitudinalMemory({
    bodySignals: [
      { id: "b1", signal: "tight chest", created_at: new Date().toISOString() },
      { id: "b2", signal: "tight chest", created_at: new Date().toISOString() },
    ],
    journalEntries: [{ id: "j1", emotional_theme: "Guilt & pressure" }, { id: "j2", emotional_theme: "Guilt & pressure" }],
  });
  assert.match(repeated.headline, /more than once|several entries/i);
  assert.match(repeated.reflection, /does not yet have enough evidence to say that they occur together/i);
});

test("relational memory requires repeated direct evidence and ignores classification-only keywords", () => {
  const classificationOnly = buildRelationalMemory({
    journalEntries: [{ id: "j1", content: "Fine", emotional_theme: "Guilt & pressure" }],
  });
  assert.doesNotMatch(classificationOnly.memories.join(" "), /self-pressure|pressure-related/i);

  const repeatedDirect = buildRelationalMemory({
    journalEntries: [{ id: "j1", content: "Pressured" }, { id: "j2", content: "Pressure today" }],
  });
  assert.match(repeatedDirect.memories.join(" "), /pressure-related language more than once/i);
});

test("Mind classification language remains early and explicitly attributed", () => {
  const memory = buildRootMemoryService({
    name: "Bill",
    mindEntries: [{
      id: "mind-1",
      thought_theme: "Unclear emotional meaning",
      thought_notice: "There may be more underneath this thought.",
    }],
  });
  assert.match(memory.recognition, /Thought Work grouped the entry/);
  assert.match(memory.recognition, /Root's interpretation was/);
  assert.equal(memory.mostImportantObservation.confidence, "early");
});

test("shared Personal Knowledge retains immutable source rows and exposes attributed facts", () => {
  const row = Object.freeze({
    id: "journal-1",
    profile_key: "bill-profile",
    content: "Pressured",
    emotional_theme: "Guilt & pressure",
    created_at: "2026-09-01T10:00:00.000Z",
  });
  const evidence = personalEvidence([row]);
  const result = buildPersonalRootKnowledgeFromEvidence({ evidence });
  assert.equal(result.ok, true);
  assert.strictEqual(evidence.source.journalEntries.records[0], row);
  assert.equal(result.knowledge.evidence.attribution.sourceRecordsMutated, false);
  const themeFact = result.knowledge.evidence.attribution.bySource.journalEntries
    .find((fact) => fact.field === "emotional_theme");
  assert.equal(themeFact.origin, "system_classification");
  assert.equal(themeFact.source.recordId, "journal-1");
  assert.equal(themeFact.source.recordedAt, "2026-09-01T10:00:00.000Z");
  assert.equal(result.projections.home.identity.userId, "bill-user");
  assert.equal(result.projections.home.identity.profileKey, "bill-profile");
});

test("numeric intervention measurement and qualitative observation remain separate origins", () => {
  const attribution = buildPersonalEvidenceAttribution({
    interventionOutcomes: [{
      id: "outcome-1",
      before_score: 8,
      after_score: 4,
      improvement_points: 4,
      user_observation: "Much better",
      completed: true,
    }],
  });
  const facts = attribution.bySource.interventionOutcomes;
  assert.equal(facts.find((fact) => fact.field === "before_score")?.origin, "system_measured");
  assert.equal(facts.find((fact) => fact.field === "after_score")?.origin, "system_measured");
  assert.equal(facts.find((fact) => fact.field === "user_observation")?.origin, "user_entered");
  assert.equal(facts.find((fact) => fact.field === "improvement_points")?.origin, "derived_summary");
});
