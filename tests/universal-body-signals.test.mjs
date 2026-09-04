import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  BODY_SYSTEMS,
  bodySignalDraftToRow,
  bodySignalRowToDraft,
  toggleBodyChoice,
  validateBodySignalDraft,
} from "../lib/bodySignalModel.js";
import {
  buildActiveInvestigationFocusReply,
  buildPersonalInvestigationJournalRow,
  deriveActivePersonalInvestigation,
  detectPersonalInvestigationIntent,
} from "../lib/personalInvestigationContinuity.js";

function draft(system = BODY_SYSTEMS[0]) {
  return { system, locationDetail: system.locations[0], symptoms: [system.symptoms[0]], customSymptom: "", timingContexts: ["Morning"], customTiming: "", durationPatterns: ["A few days"], customDuration: "", intensity: 7, modifiers: ["Not sure"], customModifier: "", notes: "My own description" };
}

test("all Body systems use the universal configurable structure and can reach Save", () => {
  assert.equal(BODY_SYSTEMS.length, 12);
  BODY_SYSTEMS.forEach((system) => {
    assert.ok(system.id && system.label && system.system && system.image && system.accent);
    assert.ok(system.locations.length > 0);
    assert.ok(system.symptoms.length > 0);
    assert.equal(validateBodySignalDraft(draft(system)), true);
  });
  const page = fs.readFileSync(new URL("../app/body/page.js", import.meta.url), "utf8");
  assert.match(page, /<BodySignalCard/);
  assert.doesNotMatch(page, /HeartView|DigestionView|NervousSystemView/);
});

test("a draft hotspot is corrected rather than accumulated", () => {
  const initial = draft(BODY_SYSTEMS[2]);
  const corrected = { ...initial, locationDetail: "Lower chest" };
  const row = bodySignalDraftToRow(corrected, "profile-1");
  assert.deepEqual(row.areas, [BODY_SYSTEMS[2].label]);
  assert.equal(row.location_detail, "Lower chest");
  assert.equal(row.areas.includes("Upper chest"), false);
});

test("a broad hotspot alone is not an authoritative saved location", () => {
  const value = draft(BODY_SYSTEMS[1]);
  value.locationDetail = "";
  assert.equal(validateBodySignalDraft(value), false);
});

test("suggested and custom symptoms, timing, duration and modifiers remain lossless", () => {
  const value = draft(BODY_SYSTEMS[3]);
  value.symptoms = ["Bloating", "Nausea"];
  value.customSymptom = "A sensation Root did not list";
  value.timingContexts = ["Morning", "After eating"];
  value.customTiming = "After a long meeting";
  value.durationPatterns = ["Weeks", "Unchanged"];
  value.customDuration = "More noticeable every third day";
  value.modifiers = ["Hydration", "Not sure"];
  value.customModifier = "A quiet room";
  const row = bodySignalDraftToRow(value, "profile-1");
  assert.deepEqual(row.symptoms, ["Bloating", "Nausea", "A sensation Root did not list"]);
  assert.deepEqual(row.timing_contexts, ["Morning", "After eating", "After a long meeting"]);
  assert.deepEqual(row.duration_patterns, ["Weeks", "Unchanged", "More noticeable every third day"]);
  assert.deepEqual(row.modifiers, ["Hydration", "Not sure", "A quiet room"]);
  assert.equal(row.signal, "Bloating");
  assert.equal(row.context, "Morning");
  assert.equal(row.what_helped, "Hydration");
  assert.equal(row.notes, "My own description");
  assert.equal(Object.hasOwn(row, "depth"), false);
});

test("multiple choices toggle independently and explicit intensity is required", () => {
  assert.deepEqual(toggleBodyChoice(["Morning"], "After eating"), ["Morning", "After eating"]);
  assert.deepEqual(toggleBodyChoice(["Morning", "After eating"], "Morning"), ["After eating"]);
  const value = draft(); value.intensity = null;
  assert.equal(validateBodySignalDraft(value), false);
});

test("legacy Body records still load into an editable draft without inventing structured evidence", () => {
  const legacy = { id: "legacy-1", profile_key: "profile-1", areas: ["Stomach / gut"], system: "digestive", signal: "bloating", context: "after eating", intensity: 7, what_helped: "Rested", depth: "Deep" };
  const loaded = bodySignalRowToDraft(legacy);
  assert.deepEqual(loaded.symptoms, ["bloating"]);
  assert.deepEqual(loaded.timingContexts, ["after eating"]);
  assert.deepEqual(loaded.durationPatterns, []);
  assert.deepEqual(loaded.modifiers, ["Rested"]);
  assert.equal(legacy.depth, "Deep");
});

test("Body history corrections use authenticated profile-scoped update and delete", () => {
  const page = fs.readFileSync(new URL("../app/body/page.js", import.meta.url), "utf8");
  assert.match(page, /resolvePersonalRootContext/);
  assert.match(page, /update\(row\)\.eq\("id", editingId\)\.eq\("profile_key", profileKey\)/);
  assert.match(page, /delete\(\)\.eq\("id", row\.id\)\.eq\("profile_key", profileKey\)\.select\("id"\)/);
  assert.match(page, /!deleted\?\.id/);
  assert.match(page, /window\.confirm/);
});

test("fresh unrelated Body evidence is acknowledged without replacing or causing the active investigation", () => {
  const start = detectPersonalInvestigationIntent("I constantly have a low mood and want to work out why");
  const startedAt = "2026-09-03T10:00:00.000Z";
  const event = { ...buildPersonalInvestigationJournalRow({ profileKey: "profile-bill", event: start, recordedAt: startedAt }), id: "investigation-row", created_at: startedAt };
  const evidence = { source: {
    journalEntries: { records: [event] }, assessments: { records: [] }, mindEntries: { records: [] },
    bodySignals: { records: [
      { id: "old-match", created_at: "2026-09-02T10:00:00.000Z", signal: "overwhelm", intensity: 4 },
      { id: "new-bloating", created_at: "2026-09-03T11:00:00.000Z", areas: ["Stomach / gut"], location_detail: "Middle abdomen", symptoms: ["Bloating"], signal: "Bloating", intensity: 7 },
    ] },
  } };
  const result = deriveActivePersonalInvestigation({ journalEntries: [event], evidence });
  assert.equal(result.active.issueKey, "mood");
  assert.deepEqual(result.active.freshBodyEvidence.map((item) => item.id), ["new-bloating"]);
  const reply = buildActiveInvestigationFocusReply(result.active);
  assert.match(reply, /persistent low mood.*remains the clearest focus/is);
  assert.match(reply, /new Body signal.*Bloating/is);
  assert.match(reply, /does not yet know whether it is related/i);
  assert.doesNotMatch(reply, /bloating (?:caused|causes|explains|is driving) (?:the )?(?:low )?mood/i);
});

test("fresh Body ranking is not simply latest-wins", () => {
  const start = detectPersonalInvestigationIntent("I want to understand why my low mood keeps happening");
  const event = { ...buildPersonalInvestigationJournalRow({ profileKey: "p", event: start, recordedAt: "2026-09-03T10:00:00.000Z" }), id: "event", created_at: "2026-09-03T10:00:00.000Z" };
  const evidence = { source: { journalEntries: { records: [event] }, assessments: { records: [] }, mindEntries: { records: [] }, bodySignals: { records: [
    { id: "newer-weak", created_at: "2026-09-03T12:00:00.000Z", signal: "ache", intensity: 2 },
    { id: "older-strong", created_at: "2026-09-03T11:00:00.000Z", signal: "bloating", intensity: 8 },
  ] } } };
  const result = deriveActivePersonalInvestigation({ journalEntries: [event], evidence });
  assert.equal(result.active.freshBodyEvidence[0].id, "older-strong");
});
