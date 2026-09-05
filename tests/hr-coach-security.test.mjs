import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  HRCoachAccessError,
  loadAuthorisedHRCoachEvidence,
  requireHRCoachOrganisationAccess,
} from "../lib/hrCoachServerAuth.js";

function request(token = "") {
  return {
    headers: new Headers(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function authClient({ user = { id: "user-1" }, userError = null, memberships = [], queryError = null } = {}) {
  const filters = [];
  const builder = {
    select() { return this; },
    eq(column, value) { filters.push([column, value]); return this; },
    in(column, values) { filters.push([column, values]); return this; },
    limit() { return this; },
    then(resolve) {
      let rows = memberships;
      for (const [column, value] of filters) {
        rows = column === "role"
          ? rows.filter((row) => value.includes(row.role))
          : rows.filter((row) => row[column] === value);
      }
      resolve({ data: rows, error: queryError });
    },
  };
  return {
    auth: { getUser: async () => ({ data: { user }, error: userError }) },
    from: () => builder,
  };
}

async function access(options = {}) {
  const client = authClient(options);
  return requireHRCoachOrganisationAccess({
    request: request(options.token ?? "valid-token"),
    organisationId: options.organisationId ?? "org-a",
    createClientForToken: () => client,
  });
}

async function rejectsStatus(promise, status) {
  await assert.rejects(promise, (error) => {
    assert.ok(error instanceof HRCoachAccessError);
    assert.equal(error.status, status);
    return true;
  });
}

test("HR Coach rejects missing and invalid bearer authentication", async () => {
  await rejectsStatus(access({ token: "" }), 401);
  await rejectsStatus(access({ user: null, userError: new Error("invalid") }), 401);
});

test("HR Coach rejects absent, employee, and unit-admin memberships", async () => {
  await rejectsStatus(access({ memberships: [] }), 403);
  await rejectsStatus(access({ memberships: [{ user_id: "user-1", organisation_id: "org-a", role: "employee" }] }), 403);
  await rejectsStatus(access({ memberships: [{ user_id: "user-1", organisation_id: "org-a", role: "unit_admin" }] }), 403);
});

test("matching HR and organisation administrators are allowed", async () => {
  for (const role of ["hr_admin", "organisation_admin"]) {
    const result = await access({ memberships: [{ id: role, user_id: "user-1", organisation_id: "org-a", role }] });
    assert.equal(result.membership.role, role);
    assert.equal(result.organisationId, "org-a");
  }
});

test("membership in organisation A never authorises organisation B", async () => {
  const memberships = [{ user_id: "user-1", organisation_id: "org-a", role: "hr_admin" }];
  await rejectsStatus(access({ organisationId: "org-b", memberships }), 403);
  await rejectsStatus(access({ organisationId: "org-b", memberships: [...memberships, { user_id: "user-1", organisation_id: "org-b", role: "employee" }] }), 403);
});

test("an explicit HR/admin membership in each organisation authorises each independently", async () => {
  const memberships = [
    { user_id: "user-1", organisation_id: "org-a", role: "hr_admin" },
    { user_id: "user-1", organisation_id: "org-b", role: "organisation_admin" },
  ];
  assert.equal((await access({ organisationId: "org-a", memberships })).organisationId, "org-a");
  assert.equal((await access({ organisationId: "org-b", memberships })).organisationId, "org-b");
});

test("browser-supplied roles cannot influence the server membership decision", async () => {
  await rejectsStatus(access({ memberships: [{ user_id: "attacker", organisation_id: "org-a", role: "organisation_admin" }] }), 403);
});

function evidenceClient() {
  const calls = [];
  const dataByTable = {
    organisations: { id: "org-a", name: "A" },
    organisation_members: [{ id: "member-a" }],
    wellbeing_assessments: [{ id: "assessment-a" }],
    mind_entries: [{ id: "mind-a" }],
    journal_entries: [{ id: "journal-a" }],
    voice_sessions: [{ id: "voice-a" }],
    organisation_learning_reviews: [{ id: "review-a" }],
  };
  return {
    calls,
    from(table) {
      const call = { table, filters: [] };
      calls.push(call);
      const builder = {
        select() { return this; },
        eq(column, value) { call.filters.push([column, value]); return this; },
        order() { return this; },
        limit() { return this; },
        maybeSingle() { call.single = true; return this; },
        then(resolve) { resolve({ data: dataByTable[table], error: null }); },
      };
      return builder;
    },
  };
}

test("all server evidence queries use the authorised organisation id", async () => {
  const supabase = evidenceClient();
  const result = await loadAuthorisedHRCoachEvidence({
    supabase,
    organisationId: "org-a",
    buildSharedContext: async ({ organisationId }) => ({ organisationId }),
  });
  assert.equal(result.organisation.id, "org-a");
  assert.ok(supabase.calls.length >= 7);
  for (const call of supabase.calls) {
    assert.ok(call.filters.some(([column, value]) =>
      (column === "organisation_id" || (call.table === "organisations" && column === "id")) && value === "org-a"
    ));
  }
});

test("the Coach client sends token and organisation id, not raw evidence authority", async () => {
  const source = await readFile(new URL("../app/hr-coach/page.js", import.meta.url), "utf8");
  assert.match(source, /Authorization: `Bearer \$\{hrApiAccess\?\.accessToken/);
  assert.match(source, /organisation_id: hrApiAccess\?\.organisationId/);
  assert.doesNotMatch(source, /body: JSON\.stringify\(\{[\s\S]{0,900}\b(?:members|assessments|mindEntries|journalEntries|voiceSessions|organisationReviews),/);
});

test("the reasoning route ignores browser evidence and loads authorised evidence", async () => {
  const source = await readFile(new URL("../app/api/organisation-coach/route.js", import.meta.url), "utf8");
  assert.match(source, /requireHRCoachOrganisationAccess/);
  assert.match(source, /loadAuthorisedHRCoachEvidence/);
  assert.doesNotMatch(source, /const \{[\s\S]{0,300}organisation,[\s\S]{0,300}members,[\s\S]{0,300}= body/);
});

test("Voice authorisation occurs before requesting an OpenAI client secret", async () => {
  const source = await readFile(new URL("../app/api/hr-voice-session/route.js", import.meta.url), "utf8");
  const accessIndex = source.indexOf("await requireHRCoachOrganisationAccess");
  const openAIIndex = source.indexOf("https://api.openai.com/v1/realtime/client_secrets");
  assert.ok(accessIndex >= 0);
  assert.ok(openAIIndex > accessIndex);
});

test("ordinary organisation membership still grants Personal access but not HR Coach", async () => {
  const identity = await readFile(new URL("../lib/rootIdentity.js", import.meta.url), "utf8");
  assert.match(identity, /const canUsePersonal\s*=\s*Boolean\(activePersonalSubscription\) \|\|\s*hasOrganisationAccess/);
  assert.match(identity, /membership\.role ===\s*"hr_admin" \|\|\s*membership\.role ===\s*"organisation_admin"/);
});
