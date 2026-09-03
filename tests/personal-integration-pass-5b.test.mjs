import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  buildLifestyleSafetyNotice,
  consumePersonalInvestigationHandoff,
  createPersonalInvestigationHandoff,
  savePersonalInvestigationHandoff,
} from "../lib/personalInvestigationHandoff.js";
import { buildPersonalInvestigationDiscovery } from "../lib/personalInvestigationService.js";

function storage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

const discovery = {
  issueKey: "energy",
  known: { statement: "Energy difficulty remains 8/10." },
  worthExploring: { statement: "It may be worth exploring ordinary lifestyle factors." },
  sourceRecordIds: ["assessment-1", "assessment-2"],
};
const route = {
  destination: "coach",
  route: "nutrition",
  question: "Do you regularly miss meals?",
  safetyNotice: "Keep recorded dietary requirements in place.",
};

test("discovery action carries exact scoped context and Coach consumes it once", () => {
  const store = storage();
  const handoff = createPersonalInvestigationHandoff({ profileKey: "bill", destination: "coach", discovery, route, now: "2026-09-03T10:00:00Z" });
  assert.equal(savePersonalInvestigationHandoff(handoff, store), true);
  const received = consumePersonalInvestigationHandoff({ profileKey: "bill", destination: "coach", storage: store, now: "2026-09-03T10:05:00Z" });
  assert.equal(received.question, route.question);
  assert.equal(received.known, discovery.known.statement);
  assert.deepEqual(received.sourceRecordIds, discovery.sourceRecordIds);
  assert.equal(consumePersonalInvestigationHandoff({ profileKey: "bill", destination: "coach", storage: store }), null);
});

test("handoffs cannot leak to another Personal profile", () => {
  const store = storage();
  savePersonalInvestigationHandoff(createPersonalInvestigationHandoff({ profileKey: "bill", destination: "journal", discovery, route: { ...route, destination: "journal" } }), store);
  assert.equal(consumePersonalInvestigationHandoff({ profileKey: "other-user", destination: "journal", storage: store }), null);
  assert.ok(consumePersonalInvestigationHandoff({ profileKey: "bill", destination: "journal", storage: store }));
});

test("expired or wrong-destination handoffs are rejected", () => {
  const store = storage();
  savePersonalInvestigationHandoff(createPersonalInvestigationHandoff({ profileKey: "bill", destination: "body", discovery, route: { ...route, destination: "body" }, now: "2026-09-03T10:00:00Z", ttlMs: 1000 }), store);
  assert.equal(consumePersonalInvestigationHandoff({ profileKey: "bill", destination: "coach", storage: store, now: "2026-09-03T10:00:01Z" }), null);
});

test("Journal, Body and direct Mind recommendation shapes retain their destinations", () => {
  const journal = createPersonalInvestigationHandoff({ profileKey: "bill", destination: "journal", discovery, route: { ...route, destination: "journal", route: "reflection" } });
  const body = createPersonalInvestigationHandoff({ profileKey: "bill", destination: "body", discovery, route: { ...route, destination: "body", route: "body", body: { systemId: "energy_recovery", signal: "fatigue" } } });
  const mind = createPersonalInvestigationHandoff({ profileKey: "bill", destination: "mind", discovery, route: { ...route, destination: "mind", route: "mind", mind: { stateId: "overthinking", toolId: "grounding", interventionSlug: "root-calm-reset" } } });
  assert.equal(journal.destination, "journal");
  assert.deepEqual(body.body, { systemId: "energy_recovery", signal: "fatigue" });
  assert.deepEqual(mind.mind, { stateId: "overthinking", toolId: "grounding", interventionSlug: "root-calm-reset" });
});

test("profile safety notices appear only for relevant lifestyle routes", () => {
  assert.match(buildLifestyleSafetyNotice({ route: "nutrition", profile: { allergies: "nuts" } }), /allergies or intolerances/i);
  assert.match(buildLifestyleSafetyNotice({ route: "body", profile: { conditions: "heart condition" } }), /before increasing exercise/i);
  assert.equal(buildLifestyleSafetyNotice({ route: "reflection", profile: { allergies: "nuts" } }), "");
  assert.equal(buildLifestyleSafetyNotice({ route: "nutrition", profile: {} }), "");
});

test("persistent high evidence can escalate calmly without diagnosis", () => {
  const result = buildPersonalInvestigationDiscovery({
    knowledge: { assessmentKnowledge: {
      movement: { metrics: [
        { key: "energy", label: "Energy difficulty", latest: 8, change: 0 },
        { key: "stress", label: "Stress", latest: 2, change: -6 },
        { key: "sleep", label: "Sleep difficulty", latest: 3, change: -5 },
      ] },
      repeatedHighSignals: [{ key: "energy", occurrences: 3 }],
      provenance: { sourceRecordIds: ["a1", "a2", "a3"] },
    } },
    evidence: { profile: { record: {} }, source: {} },
  });
  assert.match(result.primary.professionalSupport, /health professional/);
  assert.match(result.primary.professionalSupport, /cannot determine the cause/);
  assert.doesNotMatch(result.primary.professionalSupport, /diagnosis|disease|caused by/i);
});

test("current pages consume the shared handoff rather than a parallel implementation", async () => {
  for (const path of ["../app/coach/page.js", "../app/journal/page.js", "../app/body/page.js", "../app/mind/page.js"]) {
    const source = await readFile(new URL(path, import.meta.url), "utf8");
    assert.match(source, /consumePersonalInvestigationHandoff/);
  }
  const mind = await readFile(new URL("../app/mind/page.js", import.meta.url), "utf8");
  assert.match(mind, /pendingMindRecommendation\?\.interventionSlug/);
  assert.match(mind, /setGroundingIndex/);
});
