import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  PERSONAL_INVESTIGATION_EVENT_TYPE,
  buildActiveInvestigationFocusReply,
  buildPersonalInvestigationJournalRow,
  deriveActivePersonalInvestigation,
  detectPersonalInvestigationIntent,
  isBroadFocusQuestion,
} from "../lib/personalInvestigationContinuity.js";
import { buildPersonalInvestigationDiscovery } from "../lib/personalInvestigationService.js";

function eventRecord(event, id, createdAt) {
  const row = buildPersonalInvestigationJournalRow({ profileKey: "profile-bill", event, recordedAt: createdAt });
  return { ...row, id, created_at: createdAt };
}

const movement = {
  movement: {
    metrics: [
      { key: "stress", label: "Stress", baseline: 8, latest: 2, change: -6 },
      { key: "sleep", label: "Sleep difficulty", baseline: 8, latest: 4, change: -4 },
      { key: "recovery", label: "Recovery difficulty", baseline: 8, latest: 4, change: -4 },
      { key: "mood", label: "Low mood", baseline: 8, latest: 8, change: 0 },
    ],
  },
  repeatedHighSignals: [{ key: "mood", label: "Low mood", occurrences: 2 }],
  provenance: { sourceRecordIds: ["check-1", "check-2"] },
};

test("exact launch journey retains low mood and reconciles wider improvement without causation", () => {
  const start = detectPersonalInvestigationIntent("I constantly have a low mood and want to work out why");
  assert.equal(start.eventType, "started");
  assert.equal(start.issueKey, "mood");
  const startedAt = "2026-09-03T10:00:00.000Z";
  const investigationRecord = eventRecord(start, "investigation-row", startedAt);
  const evidence = {
    source: {
      assessments: { records: [
        { id: "check-2", created_at: "2026-09-03T09:00:00.000Z", stress_score: 2, sleep_score: 4, recovery_score: 4, mood_score: 8 },
        { id: "check-1", created_at: "2026-09-01T09:00:00.000Z", stress_score: 8, sleep_score: 8, recovery_score: 8, mood_score: 8 },
      ] },
      journalEntries: { records: [
        investigationRecord,
        { id: "journal-1", created_at: "2026-09-03T08:00:00.000Z", prompt_type: "guided", title: "Understanding my mood", content: "I don't know why it stays low", emotional_theme: "low mood" },
      ] },
      bodySignals: { records: [
        { id: "body-1", created_at: "2026-09-03T09:30:00.000Z", signal: "sensory overload", context: "busy surroundings" },
      ] },
      mindEntries: { records: [] },
    },
  };
  const result = deriveActivePersonalInvestigation({
    journalEntries: evidence.source.journalEntries.records,
    evidence,
    assessmentKnowledge: movement,
  });
  assert.equal(result.active.issueKey, "mood");
  assert.match(result.active.reconciledSummary, /overall picture has improved/i);
  assert.match(result.active.reconciledSummary, /low mood remains 8\/10/i);
  assert.deepEqual(result.active.relevantEvidence.map((item) => item.id).includes("journal-1"), true);
  assert.deepEqual(result.active.relevantEvidence.map((item) => item.id).includes("body-1"), true);
  const reply = buildActiveInvestigationFocusReply(result.active);
  assert.match(reply, /remains the clearest focus rather than starting a generic topic/i);
  assert.match(reply, /does not show cause/i);
  assert.match(reply, /has not established/i);
  assert.match(reply, /\?$/);
});

test("broad daily-focus prompts are recognised and never need a generic fallback when active", () => {
  assert.equal(isBroadFocusQuestion("What should I focus on today?"), true);
  assert.equal(isBroadFocusQuestion("Can you write a meal plan?"), false);
  const reply = buildActiveInvestigationFocusReply({
    label: "persistent low mood",
    reconciledSummary: "The overall picture improved while low mood remains 8/10.",
    relevantEvidence: [],
    whatRemainsUnknown: "Root has not established why.",
    nextQuestion: "When is it most noticeable?",
  });
  assert.doesNotMatch(reply, /generic wellbeing advice/i);
  assert.match(reply, /persistent low mood/i);
});

test("abandonment closes the same investigation and explicit change replaces it", () => {
  const start = detectPersonalInvestigationIntent("I want to understand why my low mood keeps happening");
  const active = { id: start.investigationId, issueKey: start.issueKey, label: start.label };
  const abandon = detectPersonalInvestigationIntent("I want to stop exploring this investigation", active);
  const abandoned = deriveActivePersonalInvestigation({
    journalEntries: [
      eventRecord(abandon, "event-2", "2026-09-03T11:00:00.000Z"),
      eventRecord(start, "event-1", "2026-09-03T10:00:00.000Z"),
    ],
  });
  assert.equal(abandoned.active, null);
  assert.equal(abandoned.history[0].status, "abandoned");

  const replacement = detectPersonalInvestigationIntent("Instead I want to understand why my sleep is difficult", active);
  assert.equal(replacement.issueKey, "sleep");
  assert.equal(replacement.replacesInvestigationId, active.id);
  const changed = deriveActivePersonalInvestigation({
    journalEntries: [
      eventRecord(replacement, "event-3", "2026-09-03T12:00:00.000Z"),
      eventRecord(start, "event-1", "2026-09-03T10:00:00.000Z"),
    ],
  });
  assert.equal(changed.active.issueKey, "sleep");
  assert.equal(changed.history.find((item) => item.id === active.id).status, "changed");
});

test("curiosity about a second issue does not silently replace the active investigation", () => {
  const active = {
    id: "investigation:mood:existing",
    issueKey: "mood",
    label: "persistent low mood",
  };
  assert.equal(
    detectPersonalInvestigationIntent(
      "I also want to understand why my sleep is bad",
      active
    ),
    null
  );

  const replacement = detectPersonalInvestigationIntent(
    "Instead I want to understand why my sleep is bad",
    active
  );
  assert.equal(replacement.eventType, "started");
  assert.equal(replacement.issueKey, "sleep");
  assert.equal(replacement.replacesInvestigationId, active.id);
});

test("explicit abandonment and resolution continue to close the retained investigation", () => {
  const active = {
    id: "investigation:mood:existing",
    issueKey: "mood",
    label: "persistent low mood",
  };
  assert.equal(
    detectPersonalInvestigationIntent("I want to stop exploring this investigation", active)?.eventType,
    "abandoned"
  );
  assert.equal(
    detectPersonalInvestigationIntent("This is no longer a concern", active)?.eventType,
    "resolved"
  );
});

test("broad focus still returns to mood after non-switching curiosity about sleep", () => {
  const active = {
    id: "investigation:mood:existing",
    issueKey: "mood",
    label: "persistent low mood",
    reconciledSummary: "The wider picture improved while low mood remains elevated.",
    relevantEvidence: [],
    whatRemainsUnknown: "Root has not established why low mood remains elevated.",
    nextQuestion: "When is the low mood most noticeable?",
  };
  assert.equal(
    detectPersonalInvestigationIntent("I also want to understand why my sleep is bad", active),
    null
  );
  assert.equal(isBroadFocusQuestion("What should I focus on today?"), true);
  const reply = buildActiveInvestigationFocusReply(active);
  assert.match(reply, /persistent low mood/i);
  assert.doesNotMatch(reply, /sleep is bad/i);
});

test("competing evidence is explained while the explicit active focus stays primary", () => {
  const active = {
    id: "active-mood",
    issueKey: "mood",
    label: "persistent low mood",
    reconciledSummary: "Low mood remains elevated.",
    nextQuestion: "When does it lift?",
    provenance: { sourceRecordIds: ["active-row"] },
  };
  const energyMovement = structuredClone(movement);
  energyMovement.movement.metrics = [
    ...energyMovement.movement.metrics.filter((metric) => metric.key !== "mood"),
    { key: "energy", label: "Energy difficulty", baseline: 8, latest: 8, change: 0 },
  ];
  energyMovement.repeatedHighSignals = [{ key: "energy", label: "Energy difficulty", occurrences: 3 }];
  const discovery = buildPersonalInvestigationDiscovery({
    knowledge: { assessmentKnowledge: energyMovement },
    evidence: { source: { mindEntries: { records: [] }, interventionOutcomes: { records: [] } } },
    activeInvestigation: active,
  });
  assert.equal(discovery.primary.id, "active-mood");
  assert.equal(discovery.primary.competingPriority.issueKey, "energy");
  assert.match(discovery.primary.emerging.statement, /kept persistent low mood as the active focus/i);
  assert.match(discovery.primary.emerging.statement, /rather than changing direction silently/i);
});

test("persistence row is source-timestamped, profile-scoped and preserves explicit provenance", () => {
  const event = detectPersonalInvestigationIntent("I want to understand why my low energy is constant");
  const row = buildPersonalInvestigationJournalRow({ profileKey: "profile-1", event, recordedAt: "2026-09-03T10:00:00.000Z" });
  assert.equal(row.profile_key, "profile-1");
  assert.equal(row.prompt_type, PERSONAL_INVESTIGATION_EVENT_TYPE);
  const stored = JSON.parse(row.content);
  assert.equal(stored.userStatement, "I want to understand why my low energy is constant");
  assert.equal(stored.recordedAt, "2026-09-03T10:00:00.000Z");
  assert.equal(stored.issueKey, "energy");
});

test("authenticated persistence endpoint verifies profiles.user_id ownership and does not accept Workplace membership", () => {
  const source = fs.readFileSync(new URL("../app/api/voice-actions/route.js", import.meta.url), "utf8");
  const block = source.slice(source.indexOf('action === "save_investigation_event"'), source.indexOf('action === "save_playbook"'));
  assert.match(block, /from\("profiles"\)/);
  assert.match(block, /eq\("user_id", userData\.user\.id\)/);
  assert.match(block, /eq\("profile_key", profileKey\)/);
  assert.doesNotMatch(block, /organisation_members/);
});

test("Coach and Voice receive the derived active investigation and text focus is deterministic", () => {
  const textRoute = fs.readFileSync(new URL("../app/api/root-coach/route.js", import.meta.url), "utf8");
  const voiceRoute = fs.readFileSync(new URL("../app/api/realtime-session/route.js", import.meta.url), "utf8");
  assert.match(textRoute, /isBroadFocusQuestion\(clean\)/);
  assert.match(textRoute, /buildActiveInvestigationFocusReply/);
  assert.match(voiceRoute, /Active Personal investigation/);
  assert.match(voiceRoute, /Return to this when the user asks broadly what to focus on/);
});
