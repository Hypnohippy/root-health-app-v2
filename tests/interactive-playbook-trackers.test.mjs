import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { inferControlledTrackerDefinition, isTrackerCreationRequest, validateTrackerAnswers, validateTrackerDefinition } from "../lib/playbookTrackerDefinition.js";
import { persistPersonalPlaybookTracker } from "../lib/voicePlaybookAction.js";

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
