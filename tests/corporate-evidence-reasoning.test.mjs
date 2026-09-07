import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { buildCorporateEvidenceContract } from "../lib/corporateEvidenceContract.js";
import { buildOrganisationModelEvidence } from "../lib/organisationModelEvidence.js";
import { buildHRRealtimeSession } from "../lib/hrRealtimeSession.js";
import { buildHROrganisationPrompt } from "../lib/hrOrganisationPrompt.js";

const workforce = { organisationId: "org", hasRecordedRoster: true, completeness: "not established",
  activeWorkforceCount: 15, joinedCount: 5, rootMembershipCount: 8,
  invitationSentCount: 7, awaitingJoinCount: 3, notInvitedCount: 4,
  deliveryCounts: { sent: 7, sending: 1, failed: 1, unknown: 1 } };
const examples = buildCorporateEvidenceContract(workforce).questionExamples;

// These test the actual model-input contract, not sampled model output.
for (const [question, field, expected] of [
  ["How many employees do we have?", "activeWorkforceCount", 15],
  ["How many staff are recorded?", "activeWorkforceCount", 15],
  ["How many have joined?", "joinedCount", 5],
  ["And how many people have actually joined?", "joinedCount", 5],
  ["How many haven't joined?", "notJoinedCount", 10],
  ["How many haven't been invited?", "notInvitedCount", 4],
  ["How many invitations have been sent?", "invitationSentCount", 7],
]) {
  test(`${question} selects its own fact without invented limitations`, () => {
    const contract = buildCorporateEvidenceContract(workforce);
    const guidance = contract.questionExamples.find(e => e.question === question);
    assert.equal(guidance.field, field);
    const fact = contract.facts[guidance.field];
    assert.equal(fact.value, expected);
    assert.match(fact.confidence, /fact/);
    assert.equal(fact.limitation, null);
  });
}

test("conversational 'those' preserves workforce versus invitation cohort and clarifies real ambiguity", () => {
  const contract = buildCorporateEvidenceContract(workforce);
  const variants = examples.filter(e => e.question === "And how many of those have joined?");
  assert.equal(contract.facts[variants.find(e => e.antecedent === "recorded workforce").field].value, 5);
  assert.equal(contract.facts[variants.find(e => e.antecedent === "successfully sent invitations").field].value, 4);
  assert.equal(variants.find(e => e.antecedent.startsWith("unclear")).field, null);
});

test("memberships and delivery counts remain separate from joined workforce", () => {
  const { facts } = buildCorporateEvidenceContract(workforce);
  assert.equal(facts.rootMembershipCount.value, 8);
  assert.equal(facts.joinedCount.value, 5);
  assert.deepEqual(facts.deliveryCounts.value, workforce.deliveryCounts);
  assert.match(facts.notInvitedCount.definition, /failed, unknown and sending records are not/);
});

test("zero is a fact; missing or inconsistent aggregates are unknown for an explicit reason", () => {
  assert.equal(buildCorporateEvidenceContract({ joinedCount: 0 }).facts.joinedCount.confidence, "recorded fact");
  const missing = buildCorporateEvidenceContract({});
  assert.equal(missing.facts.joinedCount.value, null);
  assert.match(missing.facts.joinedCount.limitation, /not supplied/);
  const inconsistent = buildCorporateEvidenceContract({ activeWorkforceCount: 1, joinedCount: 5 });
  assert.equal(inconsistent.facts.notJoinedCount.value, null);
  assert.match(inconsistent.facts.notJoinedCount.limitation, /missing or inconsistent/);
  assert.doesNotMatch(inconsistent.facts.notJoinedCount.limitation, /role|duplicate|department/);
});

test("roster incompleteness limits company-wide extrapolation, not confidence in the recorded count", () => {
  const contract = buildCorporateEvidenceContract(workforce);
  assert.equal(contract.rosterCompleteness, "not established");
  assert.equal(contract.facts.joinedCount.limitation, null);
  assert.match(contract.factualConfidence, /not the accuracy of the recorded count/);
  assert.match(contract.factualConfidence, /only when material/);
});

function evidence(count, matchedCount = count) {
  return {
    organisation: { id: "org", name: "Company", workforceContext: workforce },
    organisationContext: { workforce, structure: { units: [] } },
    members: Array.from({ length: count }, (_, i) => ({ organisation_id: "org", profile_key: `p${i}` })),
    assessments: Array.from({ length: count }, (_, i) => [
      { id: `b${i}`, organisation_id: "org", profile_key: `p${i}`, created_at: "2026-09-01", assessment_type: "baseline", stress_score: 5 },
      ...(i < matchedCount ? [{ id: `f${i}`, organisation_id: "org", profile_key: `p${i}`, created_at: "2026-09-02", assessment_type: "checkin", stress_score: 7 }] : []),
    ]).flat(), organisationReviews: [],
  };
}

test("Is participation good? requires a real comparison and the correct denominator", () => {
  const guidance = examples.find(e => e.question === "Is participation good?").answerStyle;
  assert.match(guidance, /joining versus wellbeing/);
  assert.match(guidance, /numerator and denominator/);
  assert.match(guidance, /supplied target, benchmark or comparison/);
  assert.match(guidance, /do not invent/);
});

test("Does this mean stress is getting worse? uses released change and its actual matched cohort", () => {
  const review = buildOrganisationModelEvidence(evidence(8, 5));
  const contract = buildCorporateEvidenceContract(workforce, review);
  assert.equal(review.longitudinal[0].change, 2);
  assert.equal(contract.matchedMetricCohorts[0].contributors, 5);
  assert.equal(contract.metricCohorts[0].contributors, 8);
  assert.match(examples.find(e => e.question === "Does this mean stress is getting worse?").answerStyle, /measured cohort, not automatically the whole company/);
});

test("suppressed movement cannot be promoted into a stress trend or expose small exact cohorts", () => {
  const review = buildOrganisationModelEvidence(evidence(8, 4));
  const contract = buildCorporateEvidenceContract(workforce, review);
  assert.equal(review.longitudinal[0].change, null);
  assert.equal(contract.matchedMetricCohorts[0].contributors, "fewer than 5");
  assert.match(examples.find(e => e.question.startsWith("Does this mean")).answerStyle, /Suppressed movement cannot establish a trend/);
});

test("a protected wellbeing cohort does not attach uncertainty to known join facts", () => {
  const review = buildOrganisationModelEvidence(evidence(1));
  const contract = buildCorporateEvidenceContract(workforce, review);
  assert.equal(contract.wellbeingConfidence.status, "Evidence protected");
  assert.equal(contract.facts.joinedCount.value, 5);
  assert.equal(contract.facts.joinedCount.confidence, "recorded fact");
  assert.equal(contract.facts.joinedCount.limitation, null);
});

test("larger released evidence retains its actual support without inventing statistical confidence", () => {
  const review = buildOrganisationModelEvidence(evidence(40));
  const contract = buildCorporateEvidenceContract({ ...workforce, activeWorkforceCount: 50 }, review);
  assert.equal(review.longitudinal[0].change, 2);
  assert.equal(contract.matchedMetricCohorts[0].contributors, 40);
  assert.equal(contract.matchedMetricCohorts[0].suppressed, false);
  assert.doesNotMatch(JSON.stringify(contract.wellbeingConfidence), /statistically significant|representative|must wait/i);
  assert.match(contract.questionExamples.find(e => e.question === "Should we do something about it?").answerStyle, /action when supported/);
});

test("Should we do something about it? allows supported action without a blanket wait-for-more-data rule", () => {
  const guidance = examples.find(e => e.question === "Should we do something about it?").answerStyle;
  assert.match(guidance, /Recommend proportionate action when supported/);
  assert.match(guidance, /do not always demand more data/);
  assert.match(guidance, /actual confidence, coverage and contributor counts/);
  assert.match(guidance, /privacy release threshold alone proves neither/);
});

test("metric-specific missing values cannot borrow another metric's stronger cohort", () => {
  const input = evidence(10);
  input.assessments.filter(r => r.assessment_type === "checkin").slice(0, 6).forEach(r => { r.stress_score = null; });
  const review = buildOrganisationModelEvidence(input);
  assert.equal(review.evidenceReviewed.matchedCohort, 10);
  assert.equal(review.longitudinal[0].contributors, "fewer than 5");
  assert.equal(review.longitudinal[0].change, null);
});

test("Text and Realtime receive identical definitions and confidence rules without changing transport", async () => {
  const input = evidence(5);
  const review = buildOrganisationModelEvidence(input);
  const serialised = JSON.stringify(buildCorporateEvidenceContract(workforce, review), null, 2);
  const typedPrompt = buildHROrganisationPrompt({ workforceContext: workforce, wellbeingReview: review });
  const realtime = buildHRRealtimeSession(input);
  assert.ok(typedPrompt.includes(serialised));
  assert.ok(realtime.instructions.includes(serialised));
  for (const prompt of [typedPrompt, realtime.instructions]) {
    assert.match(prompt, /Never manufacture uncertainty/);
    assert.match(prompt, /answer the requested fact first and stop/);
    assert.match(prompt, /Never invent multiple-role\/unit duplication/);
    assert.doesNotMatch(prompt, /Never begin by listing statistics/);
  }
  assert.equal(realtime.audio.input.turn_detection.create_response, true);
  const route = await readFile(new URL("../app/api/organisation-coach/route.js", import.meta.url), "utf8");
  assert.match(route, /workforceContext: organisation.workforceContext/);
});
