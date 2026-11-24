import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { authorizeProfessionalIntroducer, ProfessionalDemoAccessError } from "../lib/professionalIntroducerDemoAuth.server.js";
import { getRootDestination } from "../lib/rootNavigator.js";

const ids = {
  user: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  other: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  grant: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  organisation: "7e700070-0070-4070-8070-000000000070",
};

function request(token) {
  return new Request("https://partners.roothealth.example/api/introducer/access", {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}

function fixture({ tokenUserId = ids.user, emailConfirmed = true, grantUserId = ids.user,
  expiresAt = "2026-12-01T00:00:00.000Z", revokedAt = null, grant = true,
  organisationStatus = "demo", memberCount = 6, personalSubscriptions = [], memberships = [] } = {}) {
  const calls = [];
  const user = { id: tokenUserId, email: "synthetic@example.test", email_confirmed_at: emailConfirmed ? "2026-11-20T10:00:00.000Z" : null,
    user_metadata: { role: "root_admin" } };
  const authClientFactory = async () => ({ auth: { getUser: async () => ({ data: { user }, error: null }) } });
  const adminClientFactory = async () => ({ from(table) {
    const filters = [];
    let result;
    const query = {
      select() { return query; },
      eq(key, value) { filters.push([key, value]); return query; },
      order() { return query; },
      limit() { return query; },
      maybeSingle() { return Promise.resolve(resultFor(table, filters, true)); },
      then(resolve, reject) { return Promise.resolve(resultFor(table, filters, false)).then(resolve, reject); },
    };
    function resultFor(name, where, single) {
      calls.push({ table: name, where });
      if (name === "professional_introducer_demo_access") {
        const userFilter = where.find(([key]) => key === "user_id")?.[1];
        result = grant && userFilter === grantUserId ? { id: ids.grant, user_id: grantUserId,
          consultant_label: "Synthetic", expires_at: expiresAt, revoked_at: revokedAt, demo_organisation_id: ids.organisation } : null;
        return { data: result, error: null };
      }
      if (name === "organisations") return { data: { id: ids.organisation, status: organisationStatus }, error: null };
      if (name === "organisation_members" && where.some(([key]) => key === "organisation_id")) {
        return { data: Array.from({ length: memberCount }, (_, index) => ({ role: "employee", user_id: null, profile_key: `fictional-${index}` })), error: null };
      }
      if (name === "wellbeing_assessments") return { data: Array.from({ length: memberCount }, (_, index) => ({ profile_key: `fictional-${index}` })), error: null };
      if (name === "organisation_members") return { data: memberships, error: null };
      if (name === "personal_subscriptions") return { data: personalSubscriptions, error: null };
      return { data: single ? null : [], error: null };
    }
    return query;
  } });
  return { calls, authClientFactory, adminClientFactory };
}

const authorise = (f, token = "synthetic-token", now = new Date("2026-11-24T12:00:00.000Z")) => authorizeProfessionalIntroducer({
  request: request(token), enabled: true, authClientFactory: f.authClientFactory, adminClientFactory: f.adminClientFactory, now,
});

test("public sign-in/setup surfaces work; dashboard routing redirects unauthenticated users", async () => {
  for (const route of ["/login", "/reset-password", "/forgot-password"]) assert.equal(getRootDestination(null, route), null);
  assert.equal(getRootDestination(null, "/introducer"), "/login?next=%2Fintroducer");
  for (const route of ["/", "/assessment", "/journal", "/org-insights", "/organisation-structure", "/choose-experience"]) {
    assert.ok(getRootDestination(null, route), `${route} should not enter a dashboard without identity`);
  }
  assert.equal(getRootDestination(null, "/org-insights"), "/welcome");
  const source = await readFile(new URL("../components/AuthGate.js", import.meta.url), "utf8");
  assert.match(source, /getRootDestination\(\s*identity,\s*pathname/);
  assert.match(source, /router\.replace\(destination\)/);
  assert.match(source, /if \(loading \|\| redirecting\)/);
});

test("missing or invalid sign-in cannot reach the introducer grant lookup", async () => {
  const f = fixture();
  await assert.rejects(() => authorise(f, ""), (error) => error instanceof ProfessionalDemoAccessError && error.status === 401);
  assert.equal(f.calls.length, 0);
  const invalid = fixture({ tokenUserId: null });
  invalid.authClientFactory = async () => ({ auth: { getUser: async () => ({ data: { user: null }, error: new Error("invalid") }) } });
  await assert.rejects(() => authorise(invalid), (error) => error.status === 401);
  assert.equal(invalid.calls.length, 0);
});

test("verified account requires its own live, unexpired, non-revoked Root-issued grant and fictional employer", async () => {
  for (const options of [
    { emailConfirmed: false },
    { grant: false },
    { grantUserId: ids.other },
    { expiresAt: "2026-11-24T11:59:59.000Z" },
    { revokedAt: "2026-11-24T11:00:00.000Z" },
    { organisationStatus: "active" },
    { memberCount: 4 },
  ]) {
    await assert.rejects(() => authorise(fixture(options)), (error) => error instanceof ProfessionalDemoAccessError && [403, 503].includes(error.status), JSON.stringify(options));
  }
  const f = fixture();
  const session = await authorise(f);
  assert.equal(session.userId, ids.user);
  assert.equal(session.grant.id, ids.grant);
  const grantLookup = f.calls.find((call) => call.table === "professional_introducer_demo_access");
  assert.deepEqual(grantLookup.where.find(([key]) => key === "user_id"), ["user_id", ids.user]);
});

test("an Introducer role cannot be supplied by user-editable metadata; it derives from the verified grant", async () => {
  const source = await readFile(new URL("../lib/rootIdentity.js", import.meta.url), "utf8");
  assert.match(source, /role:\s*"hr_admin",\s*source:\s*"verified_introducer_grant"/);
  assert.match(source, /fetch\("\/api\/introducer\/access"/);
  assert.match(source, /access\.userId !== user\.id/);
  const auth = await readFile(new URL("../lib/professionalIntroducerDemoAuth.server.js", import.meta.url), "utf8");
  assert.match(auth, /grant\.user_id !== user\.id/);
  assert.doesNotMatch(auth, /user_metadata\.role|app_metadata\.role/);
});

test("revocation and expiry are rechecked on every protected API request, not trusted from cached identity", async () => {
  const route = await readFile(new URL("../app/api/introducer/demo/route.js", import.meta.url), "utf8");
  assert.match(route, /authorizeProfessionalIntroducer\(\{ request \}\)/);
  for (const options of [{ expiresAt: "2026-11-24T11:00:00.000Z" }, { revokedAt: "2026-11-24T11:00:00.000Z" }]) {
    await assert.rejects(() => authorise(fixture(options)), (error) => error.status === 403);
  }
});

test("activation is bounded to verified single-use invite links and a 30-day grant", async () => {
  const resetPage = await readFile(new URL("../app/reset-password/page.js", import.meta.url), "utf8");
  const activateRoute = await readFile(new URL("../app/api/introducer/activation/complete/route.js", import.meta.url), "utf8");
  const migration = await readFile(new URL("../supabase/migrations/20261121130000_pr70_preview_introducer_onboarding.sql", import.meta.url), "utf8");
  assert.match(resetPage, /verifyOtp\(\{\s*token_hash:\s*tokenHash,\s*type:\s*linkType/);
  assert.match(activateRoute, /email_confirmed_at/);
  assert.match(activateRoute, /activation_expires_at\).*<=Date\.now\(\)/);
  assert.match(migration, /for update/);
  assert.match(migration, /if row_data\.access_grant_id is not null then return row_data\.access_grant_id/);
  assert.match(migration, /now\(\)\+interval '30 days'/);
  assert.match(migration, /revoke all on function public\.activate_professional_introducer_onboarding/);
});

test("personal and workplace data isolation remains owner/grant scoped in the isolated RLS suite", async () => {
  const rls = await readFile(new URL("../tests/introducer-database-rls.test.mjs", import.meta.url), "utf8");
  assert.match(rls, /direct cross-user reads return no records and cross-user writes are rejected/);
  assert.match(rls, /only an unexpired, non-revoked grant can read fictional HR setup/);
  assert.match(rls, /personal evidence cannot be attached to the fictional employer/);
});
