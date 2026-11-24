import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { handleOrganisationInsights, protectOrganisationSnapshot } from "../lib/organisationInsightsServer.js";

function makeRequest({ token = "valid-token", organisationId = "org-a", includeMembers = false } = {}) {
  return new Request(`https://root.test/api/organisation/insights?organisationId=${encodeURIComponent(organisationId)}${includeMembers ? "&includeMembers=true" : ""}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

function makeAdmin({ user = { id: "user-1" }, authError = null, memberships = [], tableData = {}, calls = [] } = {}) {
  return {
    auth: { getUser: async (token) => ({ data: { user }, error: authError, token }) },
    from(table) {
      const query = { table, filters: [], selected: "" };
      calls.push(query);
      const builder = {
        select(value) { query.selected = value; return this; },
        eq(column, value) { query.filters.push([column, value]); return this; },
        in(column, value) { query.filters.push([column, value]); return this; },
        limit() { return this; },
        order() { return this; },
        maybeSingle() { query.single = true; return this; },
        then(resolve) {
          const orgFilter = query.filters.find(([column]) => column === "organisation_id" || column === "id")?.[1];
          if (table === "organisation_members" && query.filters.some(([column]) => column === "user_id")) {
            const result = memberships.find((row) => query.filters.every(([column, value]) =>
              column === "role" ? value.includes(row.role) : row[column] === value
            )) || null;
            resolve({ data: result, error: null });
            return;
          }
          const data = {
            organisations: { id: "org-a", name: "Fictional Org", workforce_size: 20 },
            organisation_members: [{ id: "member-1", organisation_id: orgFilter, user_id: "user-1", name: "HR Admin", email: "hr@example.test", role: "hr_admin", profile_key: "MUST_NOT_LEAVE_SERVER" }],
            wellbeing_assessments: [{ id: "assessment-1", organisation_id: orgFilter, profile_key: "MUST_NOT_LEAVE_SERVER", stress_score: 9.91 }],
            mind_entries: [{ id: "mind-1", organisation_id: orgFilter, profile_key: "MUST_NOT_LEAVE_SERVER", thought_theme: "work pressure", tool: "breathing" }],
            journal_entries: [{ id: "journal-1", organisation_id: orgFilter, profile_key: "MUST_NOT_LEAVE_SERVER" }],
            voice_sessions: [{ id: "voice-1", organisation_id: orgFilter, profile_key: "MUST_NOT_LEAVE_SERVER" }],
            organisation_units: [],
            organisation_learning_reviews: [],
            ...tableData,
          }[table];
          resolve({ data, error: null });
        },
      };
      return builder;
    },
  };
}

const baseSnapshot = (overrides = {}) => ({
  privacyMinimum: 5,
  baselineSuppressed: false,
  outcomeSuppressed: false,
  baselineScore: 61,
  currentScore: 70,
  supportInteractions: 12,
  participation: {
    invited: 20, joined: 15, baselineCompleted: 8, matchedParticipants: 3,
    baselineOnlyParticipants: 5, followUpCheckins: 4, totalAssessmentInteractions: 12,
    improvingCheckins: 2, stableCheckins: 1, worseningCheckins: 1,
    participationRate: 75, baselineCompletionRate: 40, followUpRate: 38,
    improvedParticipants: 2, stableParticipants: 1, worsenedParticipants: 0,
    departmentsRepresented: 2, participantOutcomesSuppressed: true, checkinOutcomesSuppressed: true,
  },
  metricResults: [{ key: "stress_score", start: 6, current: 4, change: -2, matchedStart: 6, matchedCurrent: 4, matchedParticipantCount: 3 }],
  trendRows: [
    { label: "Baseline", participantCount: 8, stress: 6, burnout: 6, sleep: 5, recovery: 6 },
    { label: "Check-in 1", participantCount: 3, stress: 4, burnout: 5, sleep: 5, recovery: 5 },
  ],
  ...overrides,
});

test("missing or invalid authentication is rejected before any database read", async () => {
  let created = 0;
  const createAdminClient = () => { created += 1; return makeAdmin({ user: null, authError: new Error("invalid") }); };
  const missing = await handleOrganisationInsights(makeRequest({ token: "" }), { createAdminClient });
  assert.equal(missing.status, 401);
  assert.equal(created, 0);
  const invalid = await handleOrganisationInsights(makeRequest(), { createAdminClient });
  assert.equal(invalid.status, 401);
  assert.equal(created, 1);
});

test("non-HR, absent, and cross-organisation memberships are denied before evidence queries", async () => {
  for (const [organisationId, memberships] of [
    ["org-a", []],
    ["org-a", [{ id: "m", user_id: "user-1", organisation_id: "org-a", role: "employee" }]],
    ["org-b", [{ id: "m", user_id: "user-1", organisation_id: "org-a", role: "hr_admin" }]],
  ]) {
    const calls = [];
    const admin = makeAdmin({ memberships, calls });
    const response = await handleOrganisationInsights(makeRequest({ organisationId }), { createAdminClient: () => admin });
    assert.equal(response.status, 403);
    assert.deepEqual(calls.map((call) => call.table), ["organisation_members"]);
  }
});

test("authorised HR response contains tenant aggregates, never raw wellbeing rows or profile keys", async () => {
  const calls = [];
  const admin = makeAdmin({
    calls,
    memberships: [{ id: "m1", user_id: "user-1", organisation_id: "org-a", role: "hr_admin" }],
  });
  const response = await handleOrganisationInsights(makeRequest({ includeMembers: true }), {
    createAdminClient: () => admin,
    createUserClient: () => ({}),
    loadWorkforceContext: async () => ({ organisationId: "org-a", hasRecordedRoster: true, activeWorkforceCount: 20 }),
    buildSnapshot: ({ organisation, members }) => ({ ...baseSnapshot(), organisation, members }),
  });
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.organisationId, "org-a");
  assert.equal(payload.members[0].id, "member-1");
  assert.equal("profile_key" in payload.members[0], false);
  assert.equal("assessments" in payload, false);
  assert.equal("mindEntries" in payload, false);
  assert.equal("journalEntries" in payload, false);
  assert.equal("voiceSessions" in payload, false);
  assert.doesNotMatch(JSON.stringify(payload), /MUST_NOT_LEAVE_SERVER|9\.91/);
  assert.equal(payload.snapshot.metricResults[0].change, null);
  assert.equal(payload.snapshot.participation.matchedParticipants, 3);
  assert.deepEqual(payload.snapshot.trendRows.map((row) => row.label), ["Baseline"]);
  assert.ok(calls.slice(1).every((call) => call.filters.some(([column, value]) =>
    (column === "organisation_id" || (call.table === "organisations" && column === "id")) && value === "org-a"
  )));
});

test("introducer HR access is sourced from the verified demo grant and uses fictional roster context without the customer RPC", async () => {
  const calls = [];
  const fakeRoster = Array.from({ length: 7 }, (_, index) => ({
    id: `fictional-member-${index}`,
    organisation_id: "org-a",
    organisation_unit_id: index < 4 ? "unit-a" : "unit-b",
    user_id: null,
    name: `Fictional Employee ${index}`,
    email: `employee-${index}@fictional.test`,
    role: "employee",
    department: index < 4 ? "Operations" : "Support",
    activated_at: index < 5 ? "2026-11-01T00:00:00.000Z" : null,
    created_at: "2026-10-01T00:00:00.000Z",
    profile_key: `PRIVATE_PROFILE_KEY_${index}`,
  }));
  const admin = makeAdmin({ calls, tableData: {
    organisation_members: fakeRoster,
    organisation_units: [{ id: "unit-a", active: true }, { id: "unit-b", active: true }],
  } });
  let userClientCreated = false;
  let workforceRpcCalled = false;
  let snapshotContext;
  const response = await handleOrganisationInsights(makeRequest({ includeMembers: true }), {
    createAdminClient: () => admin,
    isIntroducerDeployment: () => true,
    authorizeIntroducer: async () => ({ userId: "user-1", grant: { id: "grant-1", demoOrganisationId: "org-a" } }),
    createUserClient: () => { userClientCreated = true; throw new Error("must not create customer RPC client"); },
    loadWorkforceContext: async () => { workforceRpcCalled = true; throw new Error("customer SECURITY DEFINER RPC must not run"); },
    buildSnapshot: ({ organisation }) => {
      snapshotContext = organisation.workforceContext;
      return baseSnapshot();
    },
  });

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.organisationId, "org-a");
  assert.equal(snapshotContext.source, "fictional_demo_roster");
  assert.equal(snapshotContext.activeWorkforceCount, 7);
  assert.equal(snapshotContext.joinedCount, 5);
  assert.equal(snapshotContext.unitCount, 2);
  assert.equal(userClientCreated, false);
  assert.equal(workforceRpcCalled, false);
  assert.equal(payload.members.length, 7);
  assert.equal("email" in payload.members[0], false);
  assert.equal("user_id" in payload.members[0], false);
  assert.equal("profile_key" in payload.members[0], false);
  assert.doesNotMatch(JSON.stringify(payload), /fictional\.test|PRIVATE_PROFILE_KEY/);
  assert.ok(calls.filter((call) => call.table !== "organisation_members" || call.filters.some(([column]) => column === "organisation_id"))
    .every((call) => call.filters.some(([column, value]) =>
      (column === "organisation_id" || (call.table === "organisations" && column === "id")) && value === "org-a"
    )));
});

test("introducer cannot select a different employer or use another account's demo grant", async () => {
  const calls = [];
  const admin = makeAdmin({ calls });
  const response = await handleOrganisationInsights(makeRequest({ organisationId: "org-b" }), {
    createAdminClient: () => admin,
    isIntroducerDeployment: () => true,
    authorizeIntroducer: async () => ({ userId: "user-1", grant: { id: "grant-1", demoOrganisationId: "org-a" } }),
  });
  assert.equal(response.status, 403);
  assert.deepEqual(calls.map((call) => call.table), []);
});

test("aggregate-only reports omit the roster and suppress exact assessment counts below threshold", async () => {
  const admin = makeAdmin({
    memberships: [{ id: "m1", user_id: "user-1", organisation_id: "org-a", role: "organisation_admin" }],
  });
  const response = await handleOrganisationInsights(makeRequest(), {
    createAdminClient: () => admin,
    createUserClient: () => ({}),
    loadWorkforceContext: async () => ({ organisationId: "org-a" }),
    buildSnapshot: () => baseSnapshot({
      participation: { ...baseSnapshot().participation, baselineCompleted: 4 },
    }),
  });
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal("members" in payload, false);
  assert.deepEqual(payload.organisation, { id: "org-a", name: "Fictional Org" });
  assert.equal(payload.assessmentCount, null);
  assert.equal(payload.snapshot.baselineScore, null);
});

test("per-person movement and under-threshold categories remain suppressed", () => {
  const records = [
    ...Array.from({ length: 5 }, (_, index) => ({ profile_key: `p${index}`, thought_theme: "work pressure", tool: "breathing" })),
    ...Array.from({ length: 4 }, (_, index) => ({ profile_key: `q${index}`, thought_theme: "sleep", tool: "private-tool" })),
  ];
  const result = protectOrganisationSnapshot(baseSnapshot(), records);
  assert.equal(result.snapshot.metricResults[0].change, null);
  assert.equal(result.snapshot.metricResults[0].matchedParticipantCount, null);
  assert.deepEqual(result.snapshot.trendRows.map((row) => row.label), ["Baseline"]);
  assert.deepEqual(result.themeCounts, [["Workplace Pressure", 5]]);
  assert.deepEqual(result.toolCounts, [["breathing", 5]]);
});

test("the Org Insights browser route no longer fetches raw wellbeing evidence", async () => {
  const source = await readFile(new URL("../app/org-insights/page.js", import.meta.url), "utf8");
  assert.match(source, /\/api\/organisation\/insights\?organisationId=/);
  assert.match(source, /Authorization: `Bearer \$\{session\.access_token\}`/);
  for (const table of ["wellbeing_assessments", "mind_entries", "journal_entries", "voice_sessions"]) {
    assert.doesNotMatch(source, new RegExp(`from\\([\"']${table}[\"']\\)`));
  }
});

for (const route of ["hr-coach", "launch-kit", "executive-review"]) {
  test(`${route} requests server-authorised aggregates and never fetches personal evidence`, async () => {
    const source = await readFile(new URL(`../app/${route}/page.js`, import.meta.url), "utf8");
    assert.match(source, /\/api\/organisation\/insights\?organisationId=/);
    assert.match(source, /Authorization: `Bearer \$\{[^}]+\}`/);
    for (const table of ["wellbeing_assessments", "mind_entries", "journal_entries", "voice_sessions"]) {
      assert.doesNotMatch(source, new RegExp(`from\\([\"']${table}[\"']\\)`));
    }
  });
}

test("personal Root audio assets follow the configured Supabase project, not the customer source project", async () => {
  const source = await readFile(new URL("../app/mind/page.js", import.meta.url), "utf8");
  assert.match(source, /NEXT_PUBLIC_SUPABASE_URL/);
  assert.match(source, /rootAudioAsset\(/);
  assert.doesNotMatch(source, /witkwlgldxjwwxmpcyva\.supabase\.co/);
});
