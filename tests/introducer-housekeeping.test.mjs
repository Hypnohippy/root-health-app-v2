import test from "node:test";
import assert from "node:assert/strict";
import {
  INTRODUCER_REMOVAL_DEPENDENCIES,
  archiveIntroducer,
  checkIntroducerRemovalDependencies,
  removeIntroducer,
  restoreIntroducer,
} from "../lib/introducerHousekeeping.server.js";

const id = "11111111-1111-4111-8111-111111111111";
const actor = "22222222-2222-4222-8222-222222222222";

function dependencyCounts(value = 0) {
  return Object.fromEntries(INTRODUCER_REMOVAL_DEPENDENCIES.map(item => [item.table, value]));
}

function fakeRepository(overrides = {}) {
  const events = [];
  const repo = {
    events,
    row: { id, status: "inactive", notes: "[TEST RECORD] synthetic", archived_at: null, archive_requested_at: null, archive_previous_status: null },
    onboarding: null,
    counts: dependencyCounts(0),
    async getIntroducer() { return this.row; },
    async getOnboarding() { return this.onboarding; },
    async markArchivePending({ previousStatus }) { this.row.archive_requested_at = "pending"; this.row.archive_previous_status = previousStatus; this.row.status = "inactive"; },
    async finalizeArchive() { this.row.archived_at = "archived"; this.row.archive_requested_at = null; },
    async restore({ previousStatus }) { this.row.status = previousStatus; this.row.archived_at = null; this.row.archive_requested_at = null; this.row.archive_previous_status = null; },
    async countDependency(dependency) { return this.counts[dependency.table]; },
    async deleteIntroducer() { this.deleted = true; },
    async recordEvent(event) { events.push(event); },
    async recordRemovedEvent(event) { events.push({ ...event, eventType: "removed" }); },
    ...overrides,
  };
  return repo;
}

test("permanent removal dependency check fails closed for missing counts and blocks every legal, referral, finance, or lifecycle dependency", () => {
  assert.equal(checkIntroducerRemovalDependencies({}).allowed, false);
  const clear = dependencyCounts(0);
  assert.equal(checkIntroducerRemovalDependencies(clear).allowed, true);
  for (const item of INTRODUCER_REMOVAL_DEPENDENCIES) {
    const counts = { ...clear, [item.table]: 1 };
    const result = checkIntroducerRemovalDependencies(counts);
    assert.equal(result.allowed, false, item.table);
    assert.equal(result.blockers[0].table, item.table);
  }
});

test("permanent removal requires an inactive explicitly marked test record and records an audit after deletion", async () => {
  const repo = fakeRepository();
  const result = await removeIntroducer({ repository: repo, introducerId: id, actorId: actor });
  assert.equal(result.state, "removed");
  assert.equal(repo.deleted, true);
  assert.deepEqual(repo.events.map(event => event.eventType), ["removed"]);
  for (const mutate of [row => { row.status = "active"; }, row => { row.notes = "real introducer"; }]) {
    const denied = fakeRepository();
    mutate(denied.row);
    await assert.rejects(() => removeIntroducer({ repository: denied, introducerId: id, actorId: actor }), /limited to explicitly marked, inactive/);
    assert.equal(denied.deleted, undefined);
  }
  const dependent = fakeRepository();
  dependent.counts.organisation_commissions = 1;
  await assert.rejects(() => removeIntroducer({ repository: dependent, introducerId: id, actorId: actor }), /Archive this introducer instead/);
  assert.equal(dependent.deleted, undefined);
});

test("archive marks the record inactive before revocation and completes only after confirmed revocation", async () => {
  const repo = fakeRepository();
  repo.row.status = "active";
  repo.onboarding = { state: "activated" };
  const sequence = [];
  repo.markArchivePending = async ({ previousStatus }) => { sequence.push("inactive"); repo.row.status = "inactive"; repo.row.archive_requested_at = "pending"; repo.row.archive_previous_status = previousStatus; };
  repo.finalizeArchive = async () => { sequence.push("finalized"); repo.row.archived_at = "archived"; repo.row.archive_requested_at = null; };
  const result = await archiveIntroducer({ repository: repo, introducerId: id, actorId: actor,
    revokeDemoAccess: async () => { assert.equal(repo.row.status, "inactive"); sequence.push("revoked"); } });
  assert.equal(result.state, "archived");
  assert.deepEqual(sequence, ["inactive", "revoked", "finalized"]);
  assert.deepEqual(repo.events.map(event => event.eventType), ["archive_requested", "archived"]);

  const failed = fakeRepository();
  failed.row.status = "active";
  failed.onboarding = { state: "activated" };
  await assert.rejects(() => archiveIntroducer({ repository: failed, introducerId: id, actorId: actor,
    revokeDemoAccess: async () => { throw new Error("Preview unavailable"); } }), /Archive is pending/);
  assert.equal(failed.row.status, "inactive");
  assert.equal(failed.row.archive_requested_at, "pending");
  assert.equal(failed.row.archived_at, null);
  assert.deepEqual(failed.events.map(event => event.eventType), ["archive_requested"]);
});

test("archive skips unused access, blocks in-flight invitation work, and retries pending revocation", async () => {
  const unused = fakeRepository();
  unused.row.status = "active";
  unused.onboarding = { state: "registered" };
  let calls = 0;
  assert.equal((await archiveIntroducer({ repository: unused, introducerId: id, actorId: actor, revokeDemoAccess: async () => { calls++; } })).state, "archived");
  assert.equal(calls, 0);

  const preparing = fakeRepository();
  preparing.row.status = "active";
  preparing.onboarding = { state: "activation_preparing" };
  await assert.rejects(() => archiveIntroducer({ repository: preparing, introducerId: id, actorId: actor, revokeDemoAccess: async () => {} }), /Archive is pending/);
  assert.equal(preparing.row.status, "inactive");
  assert.equal(preparing.row.archived_at, null);

  const retry = fakeRepository();
  retry.row.status = "inactive";
  retry.row.archive_requested_at = "pending";
  retry.row.archive_previous_status = "active";
  retry.onboarding = { state: "activated" };
  assert.equal((await archiveIntroducer({ repository: retry, introducerId: id, actorId: actor,
    revokeDemoAccess: async () => { calls++; } })).state, "archived");
  assert.equal(calls, 1);
});

test("restore recovers the prior record status but never restores demo access", async () => {
  const repo = fakeRepository();
  repo.row.status = "inactive";
  repo.row.archived_at = "archived";
  repo.row.archive_previous_status = "active";
  repo.onboarding = { state: "revoked" };
  const result = await restoreIntroducer({ repository: repo, introducerId: id, actorId: actor });
  assert.equal(result.state, "active_record_restored");
  assert.equal(result.demoAccessRestored, false);
  assert.equal(repo.row.status, "active");
  assert.equal(repo.onboarding.state, "revoked");
  assert.deepEqual(repo.events.map(event => event.eventType), ["restored"]);
  const pending = fakeRepository();
  pending.row.status = "inactive";
  pending.row.archive_requested_at = "pending";
  pending.row.archive_previous_status = "active";
  await assert.rejects(() => restoreIntroducer({ repository: pending, introducerId: id, actorId: actor }), /not archived/);
  assert.equal(pending.row.status, "inactive");
});

test("housekeeping API keeps destructive actions behind Root authorization and server dependency checks", async () => {
  const fs = await import("node:fs/promises");
  const route = await fs.readFile(new URL("../app/api/admin/introducers/housekeeping/route.js", import.meta.url), "utf8");
  assert.match(route, /rootAgreementAccess\(request\)/);
  assert.match(route, /isIntroducerDeployment\(\)/);
  assert.match(route, /ROOT_COMMERCIAL_VERCEL_PROJECT_ID/);
  assert.match(route, /ROOT_COMMERCIAL_SUPABASE_REF/);
  assert.match(route, /countDependency\(dependency, introducerId\)/);
  assert.match(route, /revokeIntroducerPreviewAccess/);
  assert.match(route, /remove_test_organisation_introducer/);
  assert.match(route, /method|export async function DELETE/);
  const listing = await fs.readFile(new URL("../app/api/admin/introducers/route.js", import.meta.url), "utf8");
  assert.match(listing, /lifecycle === "active"[\s\S]*archived_at/);
  assert.match(listing, /lifecycle === "archived"[\s\S]*archived_at/);
});
