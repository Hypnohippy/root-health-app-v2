import assert from "node:assert/strict";
import test from "node:test";

import { buildPersonalRootKnowledgeFromEvidence } from "../lib/personalKnowledgeService.js";
import { buildRootMemoryService } from "../lib/rootMemoryService.js";

function envelope(table, records, overrides = {}) {
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
    ...overrides,
  };
}

function evidenceFixture(overrides = {}) {
  const profileKey = "personal-profile-1";
  const baseline = {
    id: "assessment-baseline",
    profile_key: profileKey,
    assessment_type: "baseline",
    stress_score: 8,
    sleep_score: 7,
    created_at: "2025-01-01T00:00:00.000Z",
  };
  const latest = {
    id: "assessment-latest",
    profile_key: profileKey,
    assessment_type: "checkin",
    stress_score: 5,
    sleep_score: 7,
    created_at: "2025-02-01T00:00:00.000Z",
  };
  const playbook = {
    id: "playbook-1",
    profile_key: profileKey,
    title: "Two-day sleep-friendly meal plan",
    category: "Nutrition",
    created_at: "2025-02-02T00:00:00.000Z",
    provenance: {
      origin: "source_record_projection",
      sourceRecordId: "playbook-1",
      omittedFields: ["content"],
    },
  };

  return {
    version: 1,
    scope: "personal",
    loadedAt: "2025-03-01T00:00:00.000Z",
    identity: {
      userId: "user-1",
      profileKey,
      authority: {
        authentication: "supabase_auth_user",
        ownershipRelation: "profiles.user_id",
        browserProfileKeyTrusted: false,
      },
    },
    profile: {
      origin: "source_record",
      record: { id: "profile-1", user_id: "user-1", profile_key: profileKey, name: "Alex" },
    },
    source: {
      assessments: envelope("wellbeing_assessments", [latest, baseline], {
        count: 140,
        limit: 100,
        truncated: true,
      }),
      bodySignals: envelope("body_signals", [
        { id: "body-1", profile_key: profileKey, signal: "tight chest", intensity: 7, created_at: "2025-02-03T00:00:00.000Z" },
      ]),
      mindEntries: envelope("mind_entries", [
        { id: "mind-1", profile_key: profileKey, tool: "Root Calm Reset", emotion: "overthinking", intensity: 8, created_at: "2025-02-04T00:00:00.000Z" },
      ]),
      journalEntries: envelope("journal_entries", [
        { id: "journal-1", profile_key: profileKey, emotional_theme: "pressure", created_at: "2025-02-05T00:00:00.000Z" },
      ]),
      interventionOutcomes: envelope("intervention_outcomes", [
        { id: "outcome-1", profile_key: profileKey, intervention_name: "Root Calm Reset", before_score: 8, after_score: 5, completed: true, started_at: "2025-02-04T00:00:00.000Z", completed_at: "2025-02-04T00:10:00.000Z" },
      ]),
    },
    awareness: {
      playbook: envelope("playbook_entries", [playbook]),
      voice: envelope("voice_sessions", []),
    },
    landmarks: {
      originalAssessmentBaseline: baseline,
      latestAssessment: latest,
    },
    provenance: {
      layer: "source_evidence",
      interpretationApplied: false,
      sourceRecordsMutated: false,
      derivedKnowledgeIncluded: false,
    },
    loadStatus: {
      partial: false,
      sources: {
        profile: "loaded",
        assessments: "loaded",
        bodySignals: "loaded",
        mindEntries: "loaded",
        journalEntries: "loaded",
        interventionOutcomes: "loaded",
        playbook: "loaded",
        voice: "loaded",
      },
    },
    ...overrides,
  };
}

test("Home, Insights and Coach share one authenticated identity and evidence foundation", () => {
  const evidence = evidenceFixture();
  const result = buildPersonalRootKnowledgeFromEvidence({ evidence });

  assert.equal(result.ok, true);
  assert.equal(result.projections.home.identity.profileKey, "personal-profile-1");
  assert.equal(result.projections.insights.identity.profileKey, "personal-profile-1");
  assert.equal(result.projections.coach.identity.profileKey, "personal-profile-1");
  assert.equal(result.projections.home.knowledge, result.knowledge);
  assert.equal(result.projections.insights.knowledge, result.knowledge);
  assert.equal(result.projections.coach.currentState, result.knowledge.understanding.currentState);
});

test("Assessment baseline, latest position, movement and truncation remain explicit", () => {
  const result = buildPersonalRootKnowledgeFromEvidence({ evidence: evidenceFixture() });
  const assessments = result.knowledge.assessmentKnowledge;

  assert.equal(assessments.baseline.id, "assessment-baseline");
  assert.equal(assessments.latest.id, "assessment-latest");
  assert.equal(assessments.movement.direction, "improving");
  assert.deepEqual(result.knowledge.provenance.evidenceWindow.truncatedSources, ["assessments"]);
});

test("Coach receives compact Check-In context and compact Playbook awareness", () => {
  const result = buildPersonalRootKnowledgeFromEvidence({ evidence: evidenceFixture() });
  const coach = result.projections.coach;

  assert.equal(coach.assessments.fullHistoryIncluded, false);
  assert.deepEqual(coach.assessments.baseline.scores, { stress: 8, sleep: 7 });
  assert.deepEqual(coach.assessments.latest.scores, { stress: 5, sleep: 7 });
  assert.equal(coach.playbook.entries[0].title, "Two-day sleep-friendly meal plan");
  assert.equal(coach.playbook.entries[0].content, undefined);
  assert.equal(coach.playbook.contentIncluded, false);
});

test("High Mind intensity records usage but never intervention success", () => {
  const memory = buildRootMemoryService({
    name: "Alex",
    mindEntries: [{ tool: "Root Calm Reset", intensity: 8 }],
    interventionOutcomes: [],
  });

  assert.match(memory.interventionInsight, /Usage alone does not show whether it helped/);
  assert.equal(memory.interventionEffectivenessEvidence, false);
  assert.equal(memory.positiveRecoveryCount, 0);
});

test("One valid improvement produces cautious helpfulness evidence", () => {
  const memory = buildRootMemoryService({
    name: "Alex",
    mindEntries: [{ tool: "Root Calm Reset", intensity: 8 }],
    interventionOutcomes: [
      { intervention_name: "Root Calm Reset", before_score: 8, after_score: 5, completed: true },
    ],
  });

  assert.match(memory.interventionInsight, /may have helped once/);
  assert.equal(memory.interventionEffectivenessEvidence, true);
});

test("Missing after score does not create improvement", () => {
  const memory = buildRootMemoryService({
    name: "Alex",
    mindEntries: [{ tool: "Root Calm Reset", intensity: 8 }],
    interventionOutcomes: [
      { intervention_name: "Root Calm Reset", before_score: 8, after_score: null, completed: true },
    ],
  });

  assert.equal(memory.positiveRecoveryCount, 0);
  assert.equal(memory.interventionEffectivenessEvidence, false);
  assert.doesNotMatch(memory.interventionInsight, /helped once|appeared helpful/);
});

test("Mixed outcomes remain mixed rather than confidently helpful", () => {
  const memory = buildRootMemoryService({
    name: "Alex",
    mindEntries: [{ tool: "Root Calm Reset", intensity: 8 }],
    interventionOutcomes: [
      { intervention_name: "Root Calm Reset", before_score: 8, after_score: 5, completed: true },
      { intervention_name: "Root Calm Reset", before_score: 5, after_score: 7, completed: true },
    ],
  });

  assert.match(memory.interventionInsight, /mixed measured results/);
  assert.doesNotMatch(memory.interventionInsight, /consistently helpful across|reliable pattern/);
});

test("Partial source failure remains distinct from zero records", () => {
  const evidence = evidenceFixture();
  evidence.source.journalEntries = envelope("journal_entries", [], {
    status: "error",
    error: { code: "42501", message: "not permitted" },
  });
  evidence.loadStatus.partial = true;
  evidence.loadStatus.sources.journalEntries = "error";

  const result = buildPersonalRootKnowledgeFromEvidence({ evidence });

  assert.equal(result.reason, "partially_loaded");
  assert.equal(result.projections.coach.loadStatus.partial, true);
  assert.equal(result.projections.coach.loadStatus.sources.journalEntries, "error");
});

test("Pass 2 projections remain Personal-only and do not create Workplace context", () => {
  const result = buildPersonalRootKnowledgeFromEvidence({ evidence: evidenceFixture() });

  assert.equal(result.knowledge.scope, "personal");
  assert.equal(result.projections.home.identity.organisationId, undefined);
  assert.equal(result.projections.insights.identity.activeExperience, undefined);
  assert.equal(result.projections.coach.identity.workplace, undefined);
});
