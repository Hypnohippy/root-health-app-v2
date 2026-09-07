import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { loadWorkforceContext, workforceDenominator } from "../lib/organisationWorkforceContext.js";
import { latestOrganisationReviews, chronologicalReviews } from "../lib/organisationLearningHistory.js";
import { buildOrganisationModelEvidence } from "../lib/organisationModelEvidence.js";
import { buildOrganisationSnapshot } from "../lib/rootOrganisationEngine.js";
import { buildRootExecutiveMeetingContext } from "../lib/rootExecutiveMeetingContext.js";
import { buildOrganisationBusinessEvidenceReview } from "../lib/rootOrganisationBusinessEvidence.js";
import { buildOrganisationWellbeingReview } from "../lib/rootOrganisationWellbeing.js";
import { buildOrganisationContext } from "../lib/rootOrganisationContext.js";
import { buildLaunchMaterial } from "../lib/rootLaunchMaterialEngine.js";

const workforceContext = { organisationId: "org-a", hasRecordedRoster: true, activeWorkforceCount: 15,
  rootMembershipCount: 5, authenticatedMembershipCount: 5, linkedMembershipCount: 5, joinedCount: 5,
  invitationSentCount: 3, unitCount: 2, units: [], completeness: "not established" };
const organisation = { id: "org-a", workforce_size: 100, employee_count: 100, workforceContext };
function evidence(count, followups = count) {
  const members = Array.from({ length: count }, (_, i) => ({ id: `m${i}`, organisation_id: "org-a", user_id: `u${i}`, profile_key: `p${i}`, role: "employee" }));
  const assessments = members.flatMap((member, i) => {
    const base = { id: `b${i}`, organisation_id: "org-a", profile_key: member.profile_key, assessment_type: "baseline", created_at: "2026-08-01", stress_score: 7, burnout_score: 7, sleep_score: 7, recovery_score: 7, mood_score: 7, focus_score: 7, narrative: "PRIVATE_SENTINEL" };
    return i < followups ? [base, { ...base, id: `f${i}`, assessment_type: "checkin", created_at: "2026-08-02", stress_score: 4 }] : [base];
  });
  return { organisation, members, assessments };
}

test("15 recorded people override both 100 legacy estimate and five memberships in every engine", () => {
  const input = evidence(5);
  assert.equal(workforceDenominator(organisation).value, 15);
  const snapshot = buildOrganisationSnapshot(input);
  assert.equal(snapshot.workforceParticipation.workforceSize, 15);
  assert.equal(snapshot.workforceParticipation.joined, 5);
  assert.equal(snapshot.workforceParticipation.membershipDenominator, 5);
  assert.equal(buildRootExecutiveMeetingContext({ ...input, snapshot }).organisation.workforceSize, 15);
  assert.equal(buildOrganisationWellbeingReview(input).organisation.size.estimated, 15);
});

test("a recorded zero-active roster never falls back to the legacy estimate", () => {
  const empty = { ...organisation, workforceContext: { ...workforceContext, activeWorkforceCount: 0 } };
  assert.equal(workforceDenominator(empty).value, 0);
  assert.equal(buildOrganisationSnapshot({ organisation: empty }).workforceParticipation.reachRate, null);
});

test("no roster uses an explicitly labelled estimate, never membership headcount", () => {
  assert.match(workforceDenominator({ workforce_size: 100 }).source, /legacy.*no recorded roster/);
  assert.equal(workforceDenominator({}).value, null);
});

test("aggregate loader scopes the RPC and distinguishes all denominators", async () => {
  const result = await loadWorkforceContext({ rpc: async (name, args) => {
    assert.equal(name, "organisation_workforce_context");
    assert.deepEqual(args, { p_organisation_id: "org-a" });
    return { data: workforceContext };
  } }, "org-a");
  assert.equal(result.denominators.recordedActiveWorkforce, 15);
  assert.equal(result.denominators.rootMemberships, 5);
});

test("aggregate errors, missing migration and cross-organisation results fail closed", async () => {
  for (const result of [{ error: { code: "42501" } }, { error: { code: "42883" } }, { data: null }, { data: { ...workforceContext, organisationId: "org-b" } }]) {
    await assert.rejects(loadWorkforceContext({ rpc: async () => result }, "org-a"));
  }
});

test("SQL aggregate contract authenticates explicit same-org roles without identity grants", async () => {
  const sql = await readFile(new URL("../supabase/migrations/20260907_organisation_workforce_context.sql", import.meta.url), "utf8");
  assert.match(sql, /auth.uid\(\) is null/);
  assert.match(sql, /organisation_id = p_organisation_id and user_id = auth.uid\(\)/);
  assert.match(sql, /role in \('organisation_admin', 'hr_admin'\)/);
  assert.match(sql, /errcode = '42501'/);
  assert.match(sql, /m.organisation_id = p.organisation_id/);
  assert.match(sql, /i.organisation_id = p.organisation_id/);
  assert.match(sql, /revoke all[\s\S]*from public, anon, authenticated/);
  assert.doesNotMatch(sql, /grant select|create policy|alter table|business_email|token_hash|recipient_email/);
});

test("latest history query sorts before limiting to 24 with deterministic ties", async () => {
  const calls = [];
  const chain = { select() { return this; }, eq(...args) { calls.push(["eq", ...args]); return this; }, order(...args) { calls.push(["order", ...args]); return this; }, limit(n) { calls.push(["limit", n]); return { data: [] }; } };
  await latestOrganisationReviews({ from: () => chain }, "org-a");
  assert.deepEqual(calls.map(c => c[1]), ["organisation_id", "review_date", "created_at", "id", 24]);
  assert.ok(calls.filter(c => c[0] === "order").every(c => c[2].ascending === false));
});

test("same-day reviews retain newest notes and comparisons consistently", () => {
  const reviews = [{ id: "b", review_date: "2026-09-01", created_at: "2026-09-01T12:00:00Z", sickness_days: 2, business_event_notes: "Office move", initiative_notes: "New rota" }, { id: "a", review_date: "2026-09-01", created_at: "2026-09-01T10:00:00Z", sickness_days: 4 }];
  assert.equal(chronologicalReviews(reviews).at(-1).id, "b");
  const business = buildOrganisationBusinessEvidenceReview({ organisationReviews: reviews });
  assert.equal(business.businessEventNotes, "Office move");
  assert.equal(business.initiativeNotes, "New rota");
  const snapshot = buildOrganisationSnapshot({ organisation, organisationReviews: reviews });
  assert.equal(snapshot.organisationLearning.latestReview.id, "b");
  assert.equal(snapshot.organisationLearning.businessEventNotes, "Office move");
});

test("under-five cohorts cannot put scores, narratives or identities into model evidence", () => {
  const result = buildOrganisationModelEvidence(evidence(4));
  assert.ok(result.observedEvidence.every(m => m.mean === null));
  assert.ok(result.longitudinal.every(m => m.change === null));
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE_SENTINEL|profile_key|user_id|"narrative":/);
  assert.equal(result.evidenceReviewed.baselineCohort, "fewer than 5");
});

test("five baselines release aggregate metrics but four matched participants do not release movement", () => {
  const result = buildOrganisationModelEvidence(evidence(5, 4));
  assert.equal(result.observedEvidence[0].mean, 7);
  assert.equal(result.longitudinal[0].change, null);
});

test("five matched contributors release numeric movement without individual outcome categories", () => {
  const result = buildOrganisationModelEvidence(evidence(5));
  assert.equal(result.longitudinal[0].change, -3);
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE_SENTINEL|improvedParticipants|p0|u0/);
});

test("duplicates and alternative identity keys cannot inflate the privacy cohort", () => {
  const input = evidence(4);
  input.assessments.push(...input.assessments.map(r => ({ ...r, user_id: input.members.find(m => m.profile_key === r.profile_key).user_id })));
  const result = buildOrganisationModelEvidence(input);
  assert.equal(result.observedEvidence[0].mean, null);
});

test("foreign, unlinked, malformed and conflicting identities never count towards release", () => {
  const input = evidence(4);
  const fifth = evidence(5).assessments.at(-2);
  input.assessments.push(fifth, { ...fifth, organisation_id: "org-b" }, { ...fifth, profile_key: "p0", user_id: "u1" }, { ...fifth, profile_key: "p0", created_at: "invalid" });
  assert.equal(buildOrganisationModelEvidence(input).observedEvidence[0].mean, null);
});

test("each metric independently requires five valid numbers", () => {
  const input = evidence(5);
  input.assessments[0].stress_score = null;
  const result = buildOrganisationModelEvidence(input);
  assert.equal(result.observedEvidence[0].mean, null);
  assert.equal(result.observedEvidence[1].mean, 7);
  assert.equal(result.longitudinal[0].change, null);
});

test("Insights payload suppresses all three participant outcomes below the matched threshold", () => {
  const snapshot = buildOrganisationSnapshot(evidence(4));
  for (const field of ["improvedParticipants", "stableParticipants", "worsenedParticipants"]) assert.equal(snapshot.participation[field], null);
});

test("a small outcome subgroup suppresses complementary participant categories too", () => {
  const input = evidence(6);
  input.assessments[1].stress_score = 7;
  const snapshot = buildOrganisationSnapshot(input);
  assert.equal(snapshot.participation.participantOutcomesSuppressed, true);
  assert.equal(snapshot.participation.stableParticipants, null);
  assert.equal(snapshot.participation.improvedParticipants, null);
  assert.equal(snapshot.participation.improvingCheckins, null);
  assert.equal(snapshot.participation.stableCheckins, null);
});

test("undated reviews have the same priority locally as the database nulls-last query", () => {
  const reviews = [{ id: "undated", created_at: "2026-09-07" }, { id: "dated", review_date: "2026-09-01", created_at: "2026-09-01" }];
  assert.equal(chronologicalReviews(reviews).at(-1).id, "dated");
});

test("shared structure uses aggregate staffing and preserves membership denominators", async () => {
  const units = [{ id: "root", name: "Root", active: true, parent_unit_id: null }, { id: "child", name: "Child", active: true, parent_unit_id: "root" }];
  const data = { organisations: organisation, organisation_members: evidence(5).members, organisation_units: units, organisation_learning_reviews: [] };
  const client = {
    rpc: async () => ({ data: { ...workforceContext, units: [{ unitId: "root", activeWorkforceCount: 5 }, { unitId: "child", activeWorkforceCount: 10 }] } }),
    from(table) {
      return { select() { return this; }, eq() { return this; }, order() { return this; }, limit() { return this; }, maybeSingle() { return this; }, then(resolve) { resolve({ data: data[table] }); } };
    },
  };
  const context = await buildOrganisationContext({ supabase: client, organisationId: "org-a" });
  assert.equal(context.people.employeeCount, 15);
  assert.equal(context.people.employeeMembershipCount, 5);
  assert.equal(context.structure.unitSummaries.find(u => u.id === "root").recorded_workforce_count, 15);
  assert.equal(context.structure.unitSummaries.find(u => u.id === "child").employee_count, 10);
});

test("launch materials describe invitation delivery separately from recorded workforce", () => {
  const snapshot = buildOrganisationSnapshot(evidence(5));
  const material = buildLaunchMaterial({ type: "leadership-talking-points", organisation, snapshot });
  const text = JSON.stringify(material);
  assert.match(text, /15 recorded active workforce; 3 invitations sent; 5 linked Root memberships joined/);
  assert.doesNotMatch(text, /5 employees invited/);
});

test("all six review consumers use the shared loader; no raw wellbeing logging", async () => {
  for (const file of ["lib/hrCoachServerAuth.js", "lib/rootOrganisationContext.js", "app/hr-coach/page.js", "app/org-insights/page.js", "app/founder/companion/page.js", "app/organisation-learning/page.js", "app/executive-review/page.js", "app/launch-kit/page.js"]) {
    const source = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    assert.match(source, /latestOrganisationReviews\(supabase,/);
    assert.doesNotMatch(source, /console.log\([^\n]*assessment/i);
  }
});

test("Ask Root uses only the protected model evidence builder and excludes raw support selects", async () => {
  const source = await readFile(new URL("../app/api/organisation-coach/route.js", import.meta.url), "utf8");
  assert.match(source, /buildOrganisationModelEvidence\(\{/);
  assert.doesNotMatch(source, /buildOrganisationWellbeingReview|automatic_thought|summariseAssessments/);
  const loader = await readFile(new URL("../lib/hrCoachServerAuth.js", import.meta.url), "utf8");
  assert.doesNotMatch(loader, /from\("(?:wellbeing_assessments|mind_entries|journal_entries|voice_sessions)"\).select\("\*"\)/);
});
