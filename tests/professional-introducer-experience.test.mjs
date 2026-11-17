import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { authorizeProfessionalIntroducer, ProfessionalDemoAccessError, professionalDemoEnabled } from "../lib/professionalIntroducerDemoAuth.server.js";
import { buildIntroducerEmployeeScenario, buildIntroducerEmployerScenario } from "../lib/professionalIntroducerDemoScenario.server.js";
import { getRootDestination } from "../lib/rootNavigator.js";
import { PGlite } from "@electric-sql/pglite";

function query(result) {
  const value = {
    select() { return this; }, eq() { return this; }, is() { return this; },
    order() { return this; }, limit() { return this; }, gte() { return this; },
    maybeSingle() { return Promise.resolve(result); },
    then(resolve, reject) { return Promise.resolve(result).then(resolve, reject); },
  };
  return value;
}

function authFixture({ grant = { id: "grant-1", user_id: "user-1", consultant_label: "Partner", expires_at: "2026-12-01T00:00:00.000Z", revoked_at: null }, memberships = [], subscriptions = [], emailConfirmed = true, errorTable = null } = {}) {
  const authClientFactory = async () => ({ auth: { getUser: async () => ({ data: { user: { id: "user-1", email: "partner@example.com", email_confirmed_at: emailConfirmed ? "2026-11-17T00:00:00.000Z" : null } }, error: null }) } });
  const data = {
    professional_introducer_demo_access: { data: grant, error: errorTable === "grant" ? new Error("failure") : null },
    organisation_members: { data: memberships, error: errorTable === "membership" ? new Error("failure") : null },
    personal_subscriptions: { data: subscriptions, error: errorTable === "subscription" ? new Error("failure") : null },
  };
  const admin = { from(table) { return query(data[table]); } };
  return { authClientFactory, adminClientFactory: async () => admin };
}

const request = (authorization = "Bearer valid-session") => new Request("https://preview.example/introducer", { headers: { authorization } });

test("demo is gated to an explicitly enabled Vercel Preview", () => {
  const preview = { VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: "codex/professional-introducer-demo", PROFESSIONAL_INTRODUCER_DEMO_ENABLED: "true", PROFESSIONAL_INTRODUCER_DEMO_SUPABASE_PROJECT_REF: "preview123", PROFESSIONAL_INTRODUCER_PRODUCTION_SUPABASE_PROJECT_REF: "prod456", NEXT_PUBLIC_SUPABASE_URL: "https://preview123.supabase.co" };
  assert.equal(professionalDemoEnabled(preview), true);
  assert.equal(professionalDemoEnabled({ ...preview, VERCEL_ENV: "production" }), false);
  assert.equal(professionalDemoEnabled({ ...preview, PROFESSIONAL_INTRODUCER_DEMO_ENABLED: "false" }), false);
  assert.equal(professionalDemoEnabled({ ...preview, VERCEL_GIT_COMMIT_REF: "main" }), false);
  assert.equal(professionalDemoEnabled({ ...preview, NEXT_PUBLIC_SUPABASE_URL: "https://prod456.supabase.co" }), false);
  assert.equal(professionalDemoEnabled({ ...preview, PROFESSIONAL_INTRODUCER_DEMO_SUPABASE_PROJECT_REF: "prod456" }), false);
});

test("verified invite with unexpired grant and no customer entitlement is authorised", async () => {
  const fixture = authFixture();
  const result = await authorizeProfessionalIntroducer({ request: request(), enabled: true, ...fixture, now: new Date("2026-11-17T12:00:00Z") });
  assert.equal(result.userId, "user-1");
  assert.equal(result.grant.consultantLabel, "Partner");
});

test("missing bearer, unverified email, missing grant, expiry and revoked grants fail closed", async () => {
  await assert.rejects(() => authorizeProfessionalIntroducer({ request: request(""), enabled: true, ...authFixture() }), (error) => error.status === 401);
  await assert.rejects(() => authorizeProfessionalIntroducer({ request: request(), enabled: true, ...authFixture({ emailConfirmed: false }) }), (error) => error.status === 403);
  await assert.rejects(() => authorizeProfessionalIntroducer({ request: request(), enabled: true, ...authFixture({ grant: null }) }), (error) => error.status === 403);
  await assert.rejects(() => authorizeProfessionalIntroducer({ request: request(), enabled: true, ...authFixture({ grant: { id: "g", user_id: "user-1", revoked_at: "2026-11-17T00:00:00Z", expires_at: "2026-12-01T00:00:00Z" } }) }), (error) => error.status === 403);
  await assert.rejects(() => authorizeProfessionalIntroducer({ request: request(), enabled: true, ...authFixture({ grant: { id: "g", expires_at: "2026-11-01T00:00:00Z" } }), now: new Date("2026-11-17T12:00:00Z") }), (error) => error.status === 403);
  await assert.rejects(() => authorizeProfessionalIntroducer({ request: request(), enabled: false, ...authFixture() }), ProfessionalDemoAccessError);
});

test("any real organisation membership or active personal subscription blocks demo access", async () => {
  await assert.rejects(() => authorizeProfessionalIntroducer({ request: request(), enabled: true, ...authFixture({ memberships: [{ id: "real-membership" }] }) }), (error) => error.status === 403);
  await assert.rejects(() => authorizeProfessionalIntroducer({ request: request(), enabled: true, ...authFixture({ subscriptions: [{ user_id: "user-1" }] }) }), (error) => error.status === 403);
  await assert.rejects(() => authorizeProfessionalIntroducer({ request: request(), enabled: true, ...authFixture({ errorTable: "membership" }) }), (error) => error.status === 503);
});

test("employee scenario uses fictional evidence through the existing personal projection engine", () => {
  const result = buildIntroducerEmployeeScenario();
  assert.equal(result.label, "Alex Morgan — fictional employee");
  assert.equal(result.measures.length, 7);
  assert.match(result.evidenceLabel, /not saved/i);
  assert.ok(result.currentState);
  assert.equal(JSON.stringify(result).includes("knowledge"), false);
  const changed = buildIntroducerEmployeeScenario({ scores: { stress: 2, sleep: 2, recovery: 2, energy: 2, mood: 2, focus: 2, burnout: 2 } });
  assert.equal(changed.measures[0].value, 2);
});

test("employer scenario uses existing aggregate engine and exposes no employee identities", () => {
  const result = buildIntroducerEmployerScenario();
  assert.equal(result.organisationSize, 24);
  assert.equal(result.respondents, 18);
  assert.ok(result.privacyNote);
  assert.ok(Array.isArray(result.cautions));
  assert.equal(JSON.stringify(result).includes("fictional-profile"), false);
  assert.equal(JSON.stringify(result).includes("demo-member"), false);
});

test("introducer shell is reachable but ordinary private routes remain gated", () => {
  assert.equal(getRootDestination(null, "/introducer"), null);
  assert.equal(getRootDestination(null, "/org-insights"), "/welcome");
  assert.equal(getRootDestination({ capabilities: { canUseWorkplace: false, canUsePersonal: false } }, "/org-insights"), "/");
});

test("login next destination is exact and route never accepts an arbitrary redirect", async () => {
  const login = await readFile(new URL("../app/login/page.js", import.meta.url), "utf8");
  assert.match(login, /get\("next"\) === "\/introducer"/);
  assert.doesNotMatch(login, /location\.href\s*=\s*new URLSearchParams\(window\.location\.search\)\.get/);
});

test("demo API has no client-supplied organisation selector, sends or check-in persistence", async () => {
  const route = await readFile(new URL("../app/api/introducer/demo/route.js", import.meta.url), "utf8");
  assert.match(route, /buildIntroducerEmployeeScenario\(\{ scores \}\)/);
  assert.match(route, /saved: false/);
  assert.match(route, /sameOrigin\(request\)/);
  assert.doesNotMatch(route, /sendEmail|Gmail|sendUpdates|organisation_id:\s*body/i);
  const migration = await readFile(new URL("../supabase/migrations/20261117061555_professional_introducer_demo.sql", import.meta.url), "utf8");
  assert.match(migration, /enable row level security/gi);
  assert.match(migration, /revoke all on public\.professional_introducer_demo_access from public, anon, authenticated/i);
  assert.match(migration, /grant select, insert on public\.professional_introducer_demo_requests to service_role/i);
  assert.match(migration, /contact_permission_confirmed/);
});

test("introduction capture requires explicit permission for contact details and does not send mail", async () => {
  const route = await readFile(new URL("../app/api/introducer/demo/route.js", import.meta.url), "utf8");
  assert.match(route, /if \(hasContact && !permission\)/);
  assert.match(route, /action !== "introduction_request"/);
  assert.match(route, /No message has been sent/);
  assert.match(route, /professional_introducer_demo_requests.*insert/s);
  assert.doesNotMatch(route, /nodemailer|sendMail|fetch\("https:/i);
});

test("expiry polling, watermark, copyright and client presentation controls are present", async () => {
  const page = await readFile(new URL("../app/introducer/page.js", import.meta.url), "utf8");
  assert.match(page, /setInterval\(\(\) => load\(token\), 30000\)/);
  assert.match(page, /Authorised Root Health Partner Demonstration/);
  assert.match(page, /© 2024–\{new Date\(\)\.getFullYear\(\)\}/);
  assert.match(page, /client_presentation/);
  assert.match(page, /Fictional demonstration data/);
});

test("demo migration applies with RLS and grants only the server role", async () => {
  const db = new PGlite();
  try {
    await db.exec("create role anon; create role authenticated; create role service_role; create schema auth; create table auth.users (id uuid primary key);");
    await db.exec(await readFile(new URL("../supabase/migrations/20261117061555_professional_introducer_demo.sql", import.meta.url), "utf8"));
    const { rows } = await db.query(`
      select c.relname, c.relrowsecurity,
        has_table_privilege('anon', c.oid, 'select') as anon_read,
        has_table_privilege('authenticated', c.oid, 'insert') as authenticated_insert,
        has_table_privilege('service_role', c.oid, 'insert') as service_insert
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname='public' and c.relname in ('professional_introducer_demo_access','professional_introducer_demo_requests')
      order by c.relname;
    `);
    assert.equal(rows.length, 2);
    for (const row of rows) {
      assert.equal(row.relrowsecurity, true);
      assert.equal(row.anon_read, false);
      assert.equal(row.authenticated_insert, false);
      assert.equal(row.service_insert, true);
    }
    await db.exec("insert into auth.users (id) values ('11111111-1111-4111-8111-111111111111');");
    await db.exec("insert into public.professional_introducer_demo_access (user_id, consultant_label, expires_at) values ('11111111-1111-4111-8111-111111111111','Partner',now() + interval '1 day');");
    await assert.rejects(() => db.exec("insert into public.professional_introducer_demo_access (user_id, consultant_label, expires_at) values ('11111111-1111-4111-8111-111111111111','Partner',now() + interval '31 days');"), /check constraint/i);
    await assert.rejects(() => db.exec("insert into public.professional_introducer_demo_requests (access_grant_id, consultant_user_id, consultant_label, organisation_name, contact_name, reason_for_interest, desired_next_step) select id,'11111111-1111-4111-8111-111111111111','Partner','Example Co','A Contact','Asked for an introduction','introductory_call' from public.professional_introducer_demo_access;"), /check constraint/i);
  } finally { await db.close(); }
});
