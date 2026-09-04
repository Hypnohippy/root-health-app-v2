import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildPersonalPresentationCandidates } from "../lib/personalPresentationService.js";
import { buildMeaningfulBodyTopics, buildMeaningfulJournalThemes, bodyFieldRole, journalFieldRole, trackerFieldRole } from "../lib/personalSemanticEvidence.js";
import { buildPersonalRootKnowledgeFromEvidence } from "../lib/personalKnowledgeService.js";

const envelope = (table, records = []) => ({ table, records, count: records.length, returned: records.length, limit: 100, truncated: false, status: "loaded", error: null });

function evidence({ body = [], journal = [], trackers = [], playbook = [] } = {}) {
  return {
    version: 1, scope: "personal", loadedAt: "2026-09-04T12:00:00.000Z",
    identity: { userId: "user-1", profileKey: "profile-1" }, profile: { record: { user_id: "user-1", profile_key: "profile-1" } },
    source: { assessments: envelope("wellbeing_assessments"), bodySignals: envelope("body_signals", body), mindEntries: envelope("mind_entries"), journalEntries: envelope("journal_entries", journal), investigationEvents: envelope("journal_entries"), interventionOutcomes: envelope("intervention_outcomes"), trackerSubmissions: envelope("playbook_tracker_entries", trackers) },
    awareness: { playbook: envelope("playbook_entries", playbook), voice: envelope("voice_sessions") }, landmarks: {}, loadStatus: { partial: false, sources: {} },
  };
}

const tracker = { id: "tracker-1", item_type: "tracker", title: "Food and symptom log", tracker_definition: { fields: [{ key: "symptoms", label: "What did you notice?", type: "long_text" }, { key: "duration", label: "Duration", type: "single_choice" }, { key: "intensity", label: "Intensity", type: "scale_1_10" }] } };
const body = { id: "body-1", signal: "Bloating", context: "On waking", intensity: 8, created_at: "2026-09-04T08:00:00.000Z" };
const submission = { id: "track-row-1", tracker_id: "tracker-1", user_id: "user-1", profile_key: "profile-1", answers: { symptoms: "Bloating", duration: "Constant", intensity: 7 }, created_at: "2026-09-04T10:00:00.000Z" };

test("tracker evidence combines with relevant Body evidence for Home without claiming a pattern", () => {
  const source = evidence({ body: [body], trackers: [submission], playbook: [tracker] });
  const candidates = buildPersonalPresentationCandidates({ evidence: source, now: new Date("2026-09-04T12:00:00.000Z") });
  const combined = candidates.find((item) => item.kind === "body_tracker_observation");
  assert.equal(combined.title, "Bloating has been recorded again");
  assert.match(combined.message, /Food and symptom log/);
  assert.match(combined.message, /not yet enough to identify a reliable pattern or cause/);
  assert.notEqual(combined.confidence, "established");
  assert.equal(candidates.some((item) => item.kind === "body_observation" && item.sourceRecordIds.includes("body-1")), false);
});

test("Insights projection exposes latest tracker title, timestamp and compact fields", () => {
  const result = buildPersonalRootKnowledgeFromEvidence({ evidence: evidence({ body: [body], trackers: [submission], playbook: [tracker] }) });
  const activity = result.projections.insights.evidence.latestTrackerActivity;
  assert.equal(activity.title, "Food and symptom log");
  assert.equal(activity.createdAt, "2026-09-04T10:00:00.000Z");
  assert.deepEqual(activity.fields.map((field) => field.value), ["Bloating", "Constant", "7"]);
});

test("field semantics keep lifecycle, timing, course and numeric values out of headline themes", () => {
  for (const field of [{ key: "onset", type: "single_choice" }, { key: "timing_context", type: "short_text" }, { key: "duration", type: "single_choice" }, { key: "intensity", type: "scale_1_10" }, { key: "status", type: "short_text" }]) assert.equal(trackerFieldRole(field), "supporting_metadata");
  assert.equal(bodyFieldRole("timing_contexts"), "supporting_metadata");
  assert.equal(journalFieldRole("emotional_theme"), "supporting_metadata");
  assert.equal(trackerFieldRole({ key: "symptoms", type: "long_text" }), "theme_candidate");
  assert.deepEqual(buildMeaningfulBodyTopics([
    { signal: "Just started", symptoms: ["Bloating"], timing_contexts: ["On waking"], duration_patterns: ["Just started", "Constant"] },
    { signal: "Comes and goes", symptoms: ["Bloating"], duration_patterns: ["Comes and goes"] },
  ]), [["Bloating", 2]]);
});

test("generic classifications do not repeat into themes without corroborating user content", () => {
  const generic = [{ id: "j1", content: "A difficult meeting", emotional_theme: "General reflection" }, { id: "j2", content: "I enjoyed a walk", emotional_theme: "General reflection" }];
  assert.deepEqual(buildMeaningfulJournalThemes(generic), []);
  const meaningful = [{ id: "j3", content: "I felt pressure at work", emotional_theme: "Work pressure" }, { id: "j4", content: "The workload pressure stayed high", emotional_theme: "Work pressure" }];
  assert.deepEqual(buildMeaningfulJournalThemes(meaningful), [["Work pressure", 2]]);
});

test("Insights renders tracker activity and supporting metadata separately from themes", async () => {
  const page = await readFile(new URL("../app/insights/page.js", import.meta.url), "utf8");
  assert.match(page, /Latest Playbook tracker entry/);
  assert.match(page, /SupportingMetadataCard/);
  assert.match(page, /Supporting context recorded with your Body signals/);
});
