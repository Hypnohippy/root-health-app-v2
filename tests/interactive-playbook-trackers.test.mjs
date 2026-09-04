import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { inferControlledTrackerDefinition, isTrackerCreationRequest, validateTrackerAnswers, validateTrackerDefinition } from "../lib/playbookTrackerDefinition.js";
import { persistPersonalPlaybookTracker } from "../lib/voicePlaybookAction.js";
import { buildPersonalRootKnowledgeFromEvidence } from "../lib/personalKnowledgeService.js";
import { buildTrackerCoachContext } from "../lib/trackerEvidenceContext.js";

test("controlled definitions accept supported fields and reject arbitrary types", () => {
  const definition = inferControlledTrackerDefinition("create a food log in my playbook");
  assert.equal(validateTrackerDefinition(definition).ok, true);
  assert.equal(validateTrackerDefinition({ title: "Bad", fields: [{ key: "x", label: "X", type: "html" }] }).ok, false);
  assert.equal(isTrackerCreationRequest("mention a tracker"), false);
  assert.equal(isTrackerCreationRequest("create a food tracker in my Playbook"), true);
});

test("answer validation keeps typed source evidence losslessly", () => {
  const definition = inferControlledTrackerDefinition("create a food log in my playbook");
  const result = validateTrackerAnswers(definition, { date: "2026-09-04", food: "Eggs and toast", symptoms: "Bloating", intensity: 7, notes: "After waking" });
  assert.equal(result.ok, true);
  assert.deepEqual(result.answers, { date: "2026-09-04", food: "Eggs and toast", symptoms: "Bloating", intensity: 7, notes: "After waking" });
  assert.equal(validateTrackerAnswers(definition, { food: "Tea" }).ok, false);
});

test("Coach tracker persistence waits for authenticated API success", async () => {
  let body;
  const result = await persistPersonalPlaybookTracker({ accessToken: "token", profileKey: "owned", userIntent: "Create a sleep tracker and save it to my Playbook", fetchImpl: async (_url, init) => { body = JSON.parse(init.body); return { ok: true, json: async () => ({ ok: true, id: "tracker-1" }) }; } });
  assert.equal(result.ok, true);
  assert.equal(body.profileKey, "owned");
  assert.equal(body.itemType, "tracker");
  assert.equal(body.user_id, undefined);
});

test("failed persistence cannot produce success", async () => {
  const result = await persistPersonalPlaybookTracker({ accessToken: "token", profileKey: "owned", userIntent: "Create a tracker and save it to my Playbook", fetchImpl: async () => ({ ok: false, status: 500, json: async () => ({ ok: false, error: "denied" }) }) });
  assert.deepEqual(result, { ok: false, error: "denied" });
});

test("authenticated endpoint owns parent and child and does not trust browser user_id", async () => {
  const route = await readFile(new URL("../app/api/personal-playbook/route.js", import.meta.url), "utf8");
  assert.match(route, /user_id: ownership\.userId/);
  assert.match(route, /eq\("user_id", ownership\.userId\)/);
  assert.doesNotMatch(route, /user_id:\s*body\./);
  assert.match(route, /validateTrackerAnswers/);
});

test("Playbook renders interactive forms and timestamped history while static formatter remains", async () => {
  const page = await readFile(new URL("../app/playbook/page.js", import.meta.url), "utf8");
  const tracker = await readFile(new URL("../components/playbook/PlaybookTracker.js", import.meta.url), "utf8");
  assert.match(page, /entry\.item_type === "tracker"/);
  assert.match(page, /<PlaybookTracker/);
  assert.match(page, /<PlaybookContent/);
  assert.match(tracker, /playbook_tracker_entries/);
  assert.match(tracker, /created_at/);
});

test("tracker submissions remain separate source evidence with user-entered answers", async () => {
  const loader = await readFile(new URL("../lib/personalEvidenceLoader.js", import.meta.url), "utf8");
  const attribution = await readFile(new URL("../lib/personalEvidenceAttribution.js", import.meta.url), "utf8");
  assert.match(loader, /key: "trackerSubmissions"[\s\S]*table: "playbook_tracker_entries"/);
  assert.match(attribution, /playbook_tracker_entries:[\s\S]*answers: "user_entered"/);
});

test("recent timestamped answers reach bounded Coach context as separate records", () => {
  const records = [
    { id: "submission-2", tracker_id: "food-log", user_id: "user-1", profile_key: "profile-1", answers: { symptom: "bloating", intensity: 7 }, created_at: "2026-09-04T10:00:00.000Z" },
    { id: "submission-1", tracker_id: "food-log", user_id: "user-1", profile_key: "profile-1", answers: { symptom: "bloating", intensity: 4 }, created_at: "2026-09-03T10:00:00.000Z" },
  ];
  const envelope = (table, entries) => ({ table, records: entries, count: entries.length, returned: entries.length, limit: 100, truncated: false, status: "loaded", error: null });
  const evidence = { version: 1, scope: "personal", loadedAt: "2026-09-04T11:00:00.000Z", identity: { userId: "user-1", profileKey: "profile-1" }, profile: { record: { user_id: "user-1", profile_key: "profile-1" } }, source: { assessments: envelope("wellbeing_assessments", []), bodySignals: envelope("body_signals", []), mindEntries: envelope("mind_entries", []), journalEntries: envelope("journal_entries", []), investigationEvents: envelope("journal_entries", []), interventionOutcomes: envelope("intervention_outcomes", []), trackerSubmissions: envelope("playbook_tracker_entries", records) }, awareness: { playbook: envelope("playbook_entries", []), voice: envelope("voice_sessions", []) }, landmarks: {}, loadStatus: { partial: false, sources: {} } };
  const result = buildPersonalRootKnowledgeFromEvidence({ evidence });
  assert.deepEqual(result.projections.coach.trackers.recent.map((entry) => entry.id), ["submission-2", "submission-1"]);
  const context = buildTrackerCoachContext(result.projections.coach.trackers);
  assert.match(context, /bloating/);
  assert.match(context, /"intensity":7/);
  assert.match(context, /2026-09-04T10:00:00.000Z/);
  assert.match(context, /distinct source records/);
  assert.match(context, /never present .* as a cause/);
});

test("Coach tracker context is capped rather than dumping unlimited history", () => {
  const recent = Array.from({ length: 15 }, (_, index) => ({ id: `row-${index}`, trackerId: "tracker", answers: { value: index }, createdAt: `2026-09-${String(index + 1).padStart(2, "0")}T10:00:00.000Z` }));
  const context = buildTrackerCoachContext({ recent });
  assert.match(context, /row-9/);
  assert.doesNotMatch(context, /row-10/);
});

test("Text and Voice Coach use the same tracker evidence context boundary", async () => {
  const textRoute = await readFile(new URL("../app/api/root-coach/route.js", import.meta.url), "utf8");
  const voiceRoute = await readFile(new URL("../app/api/realtime-session/route.js", import.meta.url), "utf8");
  assert.match(textRoute, /buildTrackerCoachContext\(knowledge\.trackers\)/);
  assert.match(voiceRoute, /buildTrackerCoachContext\(knowledge\.trackers\)/);
});
