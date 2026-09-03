import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPersonalInvestigationDiscovery,
  isMeasurementPlumbing,
  summariseMindOutcomeCoverage,
} from "../lib/personalInvestigationService.js";

function assessmentKnowledge({ energyOccurrences = 2 } = {}) {
  return {
    movement: {
      metrics: [
        { key: "stress", label: "Stress", baseline: 8, latest: 2, change: -6 },
        { key: "sleep", label: "Sleep difficulty", baseline: 8, latest: 4, change: -4 },
        { key: "recovery", label: "Recovery difficulty", baseline: 8, latest: 5, change: -3 },
        { key: "energy", label: "Energy difficulty", baseline: 8, latest: 8, change: 0 },
      ],
    },
    repeatedHighSignals: energyOccurrences >= 2
      ? [{ key: "energy", label: "Energy difficulty", occurrences: energyOccurrences }]
      : [],
    provenance: { sourceRecordIds: ["baseline-1", "followup-1"] },
  };
}

function evidence({ mindEntries = [], outcomes = [] } = {}) {
  return {
    source: {
      mindEntries: { records: mindEntries },
      interventionOutcomes: { records: outcomes },
    },
  };
}

test("persistent divergence creates a cautious Personal investigation candidate", () => {
  const discovery = buildPersonalInvestigationDiscovery({
    knowledge: { assessmentKnowledge: assessmentKnowledge() },
    evidence: evidence(),
  });
  assert.equal(discovery.primary.issueKey, "energy");
  assert.match(discovery.primary.known.statement, /8\/10/);
  assert.match(discovery.primary.emerging.statement, /across 2 check-ins/);
  assert.match(discovery.primary.worthExploring.statement, /does not tell us why/i);
  assert.equal(discovery.primary.worthExploring.routes.length, 3);
  assert.deepEqual(discovery.primary.sourceRecordIds, ["baseline-1", "followup-1"]);
  assert.equal(discovery.primary.provenance.persisted, false);
  assert.equal(discovery.primary.provenance.diagnosticClaim, false);
});

test("one weak event does not create false persistence or divergence", () => {
  const knowledge = assessmentKnowledge({ energyOccurrences: 1 });
  knowledge.movement.metrics.find((metric) => metric.key === "sleep").change = -1;
  knowledge.movement.metrics.find((metric) => metric.key === "recovery").change = 0;
  const discovery = buildPersonalInvestigationDiscovery({ knowledge: { assessmentKnowledge: knowledge }, evidence: evidence() });
  assert.equal(discovery.primary, null);
});

test("Known, Emerging and Worth exploring remain distinct attributed layers", () => {
  const item = buildPersonalInvestigationDiscovery({
    knowledge: { assessmentKnowledge: assessmentKnowledge() }, evidence: evidence(),
  }).primary;
  assert.equal(item.known.label, "Known");
  assert.equal(item.emerging.label, "Emerging");
  assert.equal(item.worthExploring.label, "Worth exploring");
  assert.notEqual(item.known.statement, item.worthExploring.statement);
});

test("measurement plumbing is excluded and 17 uses / 3 outcomes are accurate", () => {
  const mindEntries = Array.from({ length: 17 }, (_, index) => ({ id: `mind-${index}`, tool: "Grounding" }));
  mindEntries.push({ id: "before", tool: "Root Measurement — Before" });
  mindEntries.push({ id: "after", tool: "Root Measurement - After" });
  const outcomes = Array.from({ length: 3 }, (_, index) => ({
    id: `outcome-${index}`, completed: true, before_score: 8, after_score: 5,
  }));
  outcomes.push({ id: "unmeasured", completed: true, before_score: 8, after_score: null });
  const summary = summariseMindOutcomeCoverage({ mindEntries, interventionOutcomes: outcomes });
  assert.equal(summary.totalMindUses, 17);
  assert.equal(summary.completedMeasuredOutcomes, 3);
  assert.match(summary.message, /used Mind tools 17 times/);
  assert.match(summary.message, /3 uses currently have before-and-after measurements/);
  assert.equal(isMeasurementPlumbing("Root Measurement — Before"), true);
  assert.doesNotMatch(summary.message, /Root Measurement/);
});

test("measured outcomes are represented separately from raw usage and no evidence is mutated", () => {
  const rows = Object.freeze([{ id: "mind-1", tool: "Reset" }]);
  const outcomes = Object.freeze([{ id: "outcome-1", completed: true, before_score: 8, after_score: 4 }]);
  const summary = summariseMindOutcomeCoverage({ mindEntries: rows, interventionOutcomes: outcomes });
  assert.equal(summary.totalMindUses, 1);
  assert.equal(summary.completedMeasuredOutcomes, 1);
  assert.deepEqual(summary.provenance.sourceRecordIds, ["mind-1", "outcome-1"]);
  assert.equal(summary.provenance.sourceRecordsMutated, false);
  assert.equal(outcomes[0].after_score, 4);
});

test("Discovery routes into existing Personal journeys without claiming diagnosis", () => {
  const item = buildPersonalInvestigationDiscovery({
    knowledge: { assessmentKnowledge: assessmentKnowledge() }, evidence: evidence(),
  }).primary;
  assert.deepEqual(item.worthExploring.routes.map((route) => route.href), ["/coach", "/journal", "/body"]);
  const language = `${item.known.statement} ${item.emerging.statement} ${item.worthExploring.statement}`;
  assert.doesNotMatch(language, /diagnos|caused by|proves|disease/i);
});
