import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { authorizeProfessionalIntroducer, ProfessionalDemoAccessError, professionalDemoEnabled } from "../lib/professionalIntroducerDemoAuth.server.js";
import { buildIntroducerDemoSeed, buildIntroducerEmployeeScenario, buildIntroducerEmployerScenario, listIntroducerDemoEmployees } from "../lib/professionalIntroducerDemoScenario.server.js";
import { createIntroducerDemoAssessment, loadIntroducerDemoState, resetIntroducerDemoCheckins } from "../lib/professionalIntroducerDemoStore.server.js";
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

function authFixture({ grant = { id: "grant-1", user_id: "user-1", consultant_label: "Partner", expires_at: "2026-12-01T00:00:00.000Z", revoked_at: null }, memberships = [], subscriptions = [], emailConfirmed = true, errorTable = null, missingTables = [] } = {}) {
  const authClientFactory = async () => ({ auth: { getUser: async () => ({ data: { user: { id: "user-1", email: "partner@example.com", email_confirmed_at: emailConfirmed ? "2026-11-17T00:00:00.000Z" : null } }, error: null }) } });
  const data = {
    professional_introducer_demo_access: { data: grant, error: errorTable === "grant" ? new Error("failure") : null },
    organisation_members: { data: memberships, error: missingTables.includes("organisation_members") ? Object.assign(new Error("missing relation"), { code: "PGRST205" }) : errorTable === "membership" ? new Error("failure") : null },
    personal_subscriptions: { data: subscriptions, error: missingTables.includes("personal_subscriptions") ? Object.assign(new Error("missing relation"), { code: "PGRST205" }) : errorTable === "subscription" ? new Error("failure") : null },
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

test("fresh isolated Preview may omit production customer tables while other query failures remain closed", async () => {
  const result = await authorizeProfessionalIntroducer({ request: request(), enabled: true, ...authFixture({ missingTables: ["organisation_members", "personal_subscriptions"] }), now: new Date("2026-11-17T12:00:00Z") });
  assert.equal(result.grant.id, "grant-1");
  await assert.rejects(() => authorizeProfessionalIntroducer({ request: request(), enabled: true, ...authFixture({ errorTable: "subscription" }) }), (error) => error.status === 503);
});

test("employee scenario uses fictional evidence through the existing personal projection engine", () => {
  const seed = buildIntroducerDemoSeed({ grantId: "grant-1", now: new Date("2026-11-17T12:00:00.000Z") });
  const result = buildIntroducerEmployeeScenario({ grantId: "grant-1", employee: seed.members[0], assessments: seed.assessments });
  assert.equal(result.label, "Alex Morgan — fictional employee");
  assert.equal(result.measures.length, 7);
  assert.match(result.evidenceLabel, /saved only in this isolated fictional demonstration/i);
  assert.ok(result.currentState);
  assert.equal(result.history.length, 2);
  assert.equal(result.history[0].assessmentType, "baseline");
  assert.equal(result.history[1].assessmentType, "checkin");
  assert.equal(JSON.stringify(result).includes("knowledge"), false);
});

test("employer scenario uses existing aggregate engine and exposes no employee identities", () => {
  const seed = buildIntroducerDemoSeed({ grantId: "grant-1", now: new Date("2026-11-17T12:00:00.000Z") });
  const result = buildIntroducerEmployerScenario({ grantId: "grant-1", ...seed });
  assert.equal(result.organisationSize, 24);
  assert.equal(result.respondents, 18);
  assert.equal(result.baselineSuppressed, false);
  assert.equal(result.outcomeSuppressed, false);
  assert.ok(Number.isFinite(result.wellbeingIndex));
  assert.ok(result.assessmentWindow.some((row) => row.label === "Baseline" && row.participants === 18));
  assert.ok(result.assessmentWindow.some((row) => row.participants >= 5));
  assert.ok(result.privacyNote);
  assert.ok(Array.isArray(result.cautions));
  assert.equal(JSON.stringify(result).includes("employee-01"), false);
  assert.equal(JSON.stringify(result).includes("Alex Morgan"), false);
});

test("employer projections retain the real five-person privacy gates", () => {
  const seed = buildIntroducerDemoSeed({ grantId: "grant-privacy", now: new Date("2026-11-17T12:00:00.000Z") });
  const fourPerson = buildIntroducerEmployerScenario({
    grantId: "grant-privacy",
    members: seed.members,
    assessments: seed.assessments.filter((row) => row.assessment_type === "baseline" && Number(row.employee_key.slice(-2)) <= 4),
  });
  assert.equal(fourPerson.baselineSuppressed, true);
  assert.equal(fourPerson.wellbeingIndex, null);
  assert.deepEqual(fourPerson.observations, []);
  assert.deepEqual(fourPerson.assessmentWindow, []);

  const fivePerson = buildIntroducerEmployerScenario({
    grantId: "grant-privacy",
    members: seed.members,
    assessments: seed.assessments.filter((row) => row.assessment_type === "baseline" && Number(row.employee_key.slice(-2)) <= 5),
  });
  assert.equal(fivePerson.baselineSuppressed, false);
  assert.ok(Number.isFinite(fivePerson.wellbeingIndex));

  const fourMatched = buildIntroducerEmployerScenario({
    grantId: "grant-privacy",
    members: seed.members,
    assessments: seed.assessments.filter((row) => Number(row.employee_key.slice(-2)) <= 4),
  });
  assert.equal(fourMatched.outcomeSuppressed, true);
  assert.equal(fourMatched.assessmentWindow.some((row) => row.label.startsWith("Check-in")), false);
});

class MemoryQuery {
  constructor(admin, table) { this.admin = admin; this.table = table; this.filters = []; this.op = "select"; this.insertRows = []; this.options = {}; this.countMode = false; }
  select(_columns, options = {}) { if (options.count) this.countMode = true; return this; }
  eq(key, value) { this.filters.push((row) => row[key] === value); return this; }
  gte(key, value) { this.filters.push((row) => String(row[key]) >= String(value)); return this; }
  like(key, pattern) { const prefix = pattern.endsWith("%") ? pattern.slice(0, -1) : pattern; this.filters.push((row) => String(row[key]).startsWith(prefix)); return this; }
  order(key, { ascending = true } = {}) { this.orderKey = key; this.ascending = ascending; return this; }
  upsert(rows, options = {}) { this.op = "upsert"; this.insertRows = Array.isArray(rows) ? rows : [rows]; this.options = options; return this; }
  insert(row) { this.op = "insert"; this.insertRows = [row]; return this; }
  delete() { this.op = "delete"; return this; }
  async execute(single = null) {
    const rows = this.admin.rows[this.table];
    if (this.op === "upsert") {
      const fields = String(this.options.onConflict || "").split(",");
      for (const row of this.insertRows) {
        const existing = rows.find((item) => fields.length && fields.every((field) => item[field] === row[field]));
        if (!existing) rows.push({ id: `row-${++this.admin.sequence}`, ...row });
        else if (!this.options.ignoreDuplicates) Object.assign(existing, row);
      }
      return { data: null, error: null };
    }
    const matched = rows.filter((row) => this.filters.every((filter) => filter(row)));
    if (this.op === "delete") {
      this.admin.rows[this.table] = rows.filter((row) => !this.filters.every((filter) => filter(row)));
      return { data: matched, error: null };
    }
    if (this.op === "insert") {
      const row = this.insertRows[0];
      if (rows.some((item) => item.access_grant_id === row.access_grant_id && item.assessment_key === row.assessment_key)) {
        return { data: null, error: Object.assign(new Error("duplicate"), { code: "23505" }) };
      }
      const inserted = { id: `row-${++this.admin.sequence}`, ...row };
      rows.push(inserted);
      if (single === "single") return { data: inserted, error: null };
      return { data: [inserted], error: null };
    }
    const result = [...matched];
    if (this.orderKey) result.sort((a, b) => String(a[this.orderKey]).localeCompare(String(b[this.orderKey])) * (this.ascending ? 1 : -1));
    if (this.countMode) return { count: result.length, data: null, error: null };
    if (single === "maybeSingle") return { data: result[0] || null, error: null };
    if (single === "single") return result.length === 1 ? { data: result[0], error: null } : { data: null, error: new Error("not a single row") };
    return { data: result, error: null };
  }
  maybeSingle() { return this.execute("maybeSingle"); }
  single() { return this.execute("single"); }
  then(resolve, reject) { return this.execute().then(resolve, reject); }
}

class MemoryAdmin {
  constructor() { this.rows = { professional_introducer_demo_members: [], professional_introducer_demo_assessments: [] }; this.sequence = 0; }
  from(table) { return new MemoryQuery(this, table); }
}

test("grant-scoped fictional data persists, affects real aggregates, survives reload and resets to its seed", async () => {
  const admin = new MemoryAdmin();
  const now = new Date("2026-11-17T12:00:00.000Z");
  const initial = await loadIntroducerDemoState({ admin, grantId: "grant-a", now });
  assert.equal(initial.members.length, 24);
  assert.equal(initial.assessments.length, 23);
  assert.equal(listIntroducerDemoEmployees(initial.members, initial.assessments).filter((item) => item.hasHistory).length, 18);
  const initialEmployer = buildIntroducerEmployerScenario({ grantId: "grant-a", ...initial });
  assert.equal(initialEmployer.respondents, 18);

  const saved = await createIntroducerDemoAssessment({
    admin, grantId: "grant-a", employeeKey: "employee-19", requestId: "4d4c46b2-35ac-46d3-8f79-0837e5a7f9be",
    scores: { stress: 2, sleep: 3, recovery: 2, energy: 3, mood: 2, focus: 3, burnout: 1 }, now,
  });
  assert.equal(saved.ok, true);
  assert.equal(saved.assessment.assessment_type, "baseline");
  const refreshed = await loadIntroducerDemoState({ admin, grantId: "grant-a", now });
  assert.equal(refreshed.assessments.length, 24);
  const refreshedEmployer = buildIntroducerEmployerScenario({ grantId: "grant-a", ...refreshed });
  assert.equal(refreshedEmployer.respondents, 19);
  assert.notEqual(refreshedEmployer.participation, initialEmployer.participation);
  assert.notEqual(refreshedEmployer.wellbeingIndex, initialEmployer.wellbeingIndex);
  assert.equal(refreshedEmployer.outcomeSuppressed, false);

  const followUp = await createIntroducerDemoAssessment({
    admin, grantId: "grant-a", employeeKey: "employee-19", requestId: "5d4c46b2-35ac-46d3-8f79-0837e5a7f9be",
    scores: { stress: 7, sleep: 8, recovery: 7, energy: 8, mood: 7, focus: 8, burnout: 7 },
    now: new Date(now.getTime() + 7 * 86400000),
  });
  assert.equal(followUp.assessment.assessment_type, "checkin");
  const afterFollowUp = await loadIntroducerDemoState({ admin, grantId: "grant-a", now });
  const afterFollowUpEmployer = buildIntroducerEmployerScenario({ grantId: "grant-a", ...afterFollowUp });
  assert.equal(afterFollowUpEmployer.respondents, 19);
  assert.equal(afterFollowUpEmployer.outcomeSuppressed, false);
  assert.equal(afterFollowUpEmployer.assessmentWindow.some((row) => row.label === "Check-in 2" && row.participants < 5), false);

  const employeeView = buildIntroducerEmployeeScenario({ grantId: "grant-a", employee: afterFollowUp.members[18], assessments: afterFollowUp.assessments });
  assert.equal(employeeView.history.length, 2);
  assert.equal(employeeView.history[0].assessmentType, "baseline");
  assert.equal(employeeView.history[1].assessmentType, "checkin");
  assert.equal(employeeView.measures[0].value, 7);

  const replay = await createIntroducerDemoAssessment({
    admin, grantId: "grant-a", employeeKey: "employee-19", requestId: "4d4c46b2-35ac-46d3-8f79-0837e5a7f9be",
    scores: { stress: 9, sleep: 9, recovery: 9, energy: 9, mood: 9, focus: 9, burnout: 9 }, now,
  });
  assert.equal(replay.replayed, true);
  assert.equal((await loadIntroducerDemoState({ admin, grantId: "grant-a", now })).assessments.length, 25);

  await loadIntroducerDemoState({ admin, grantId: "grant-b", now });
  await resetIntroducerDemoCheckins({ admin, grantId: "grant-a", now });
  const resetA = await loadIntroducerDemoState({ admin, grantId: "grant-a", now });
  const unchangedB = await loadIntroducerDemoState({ admin, grantId: "grant-b", now });
  assert.equal(resetA.assessments.length, 23);
  assert.equal(buildIntroducerEmployerScenario({ grantId: "grant-a", ...resetA }).respondents, 18);
  assert.equal(unchangedB.assessments.length, 23);
});

test("check-in validation and employee selection fail closed", async () => {
  const admin = new MemoryAdmin();
  const base = { admin, grantId: "grant-1", employeeKey: "employee-01", requestId: "4d4c46b2-35ac-46d3-8f79-0837e5a7f9be" };
  assert.equal((await createIntroducerDemoAssessment({ ...base, scores: { stress: 11 } })).reason, "invalid_scores");
  assert.equal((await createIntroducerDemoAssessment({ ...base, employeeKey: "employee-99", scores: Object.fromEntries(["stress", "sleep", "recovery", "energy", "mood", "focus", "burnout"].map((key) => [key, 5])) })).reason, "employee_not_found");
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

test("demo API persists only grant-scoped fictional check-ins and has no send path", async () => {
  const route = await readFile(new URL("../app/api/introducer/demo/route.js", import.meta.url), "utf8");
  assert.match(route, /createIntroducerDemoAssessment/);
  assert.match(route, /saved: true/);
  assert.match(route, /action === "reset_demo"/);
  assert.match(route, /sameOrigin\(request\)/);
  assert.doesNotMatch(route, /sendEmail|Gmail|sendUpdates|organisation_id:\s*body|SUPABASE_SERVICE_ROLE_KEY.{0,80}NEXT_PUBLIC/i);
  const migration = await readFile(new URL("../supabase/migrations/20261117061555_professional_introducer_demo.sql", import.meta.url), "utf8");
  assert.match(migration, /enable row level security/gi);
  assert.match(migration, /revoke all on public\.professional_introducer_demo_access from public, anon, authenticated/i);
  assert.match(migration, /grant select, insert on public\.professional_introducer_demo_requests to service_role/i);
  assert.match(migration, /contact_permission_confirmed/);
  const workforceMigration = await readFile(new URL("../supabase/migrations/20261117082900_professional_introducer_demo_workforce.sql", import.meta.url), "utf8");
  assert.match(workforceMigration, /revoke all on public\.professional_introducer_demo_members from public, anon, authenticated/i);
  assert.match(workforceMigration, /revoke all on public\.professional_introducer_demo_assessments from public, anon, authenticated/i);
  assert.match(workforceMigration, /references public\.professional_introducer_demo_members\(access_grant_id, employee_key\)/i);
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
  assert.match(page, /setInterval\(\(\) => load\(token, selectedEmployeeKey\), 30000\)/);
  assert.match(page, /Authorised Root Health Partner Demonstration/);
  assert.match(page, /© 2024–\{new Date\(\)\.getFullYear\(\)\}/);
  assert.match(page, /client_presentation/);
  assert.match(page, /Fictional demonstration data/);
  assert.match(page, /Reset only this access grant/);
  assert.match(page, /selectEmployee/);
  assert.match(page, /Personal experience · not enabled here/);
  assert.match(page, /Do not enter real wellbeing information in this Preview/);
  assert.match(page, /five-participant baseline gate/);
  assert.doesNotMatch(page, /window\.confirm|window\.alert/);
});

test("demo migration applies with RLS and grants only the server role", async () => {
  const db = new PGlite();
  try {
    await db.exec("create role anon; create role authenticated; create role service_role; create schema auth; create table auth.users (id uuid primary key);");
    await db.exec(await readFile(new URL("../supabase/migrations/20261117061555_professional_introducer_demo.sql", import.meta.url), "utf8"));
    await db.exec(await readFile(new URL("../supabase/migrations/20261117082900_professional_introducer_demo_workforce.sql", import.meta.url), "utf8"));
    const { rows } = await db.query(`
      select c.relname, c.relrowsecurity,
        has_table_privilege('anon', c.oid, 'select') as anon_read,
        has_table_privilege('authenticated', c.oid, 'insert') as authenticated_insert,
        has_table_privilege('service_role', c.oid, 'insert') as service_insert
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname='public' and c.relname in ('professional_introducer_demo_access','professional_introducer_demo_requests','professional_introducer_demo_members','professional_introducer_demo_assessments')
      order by c.relname;
    `);
    assert.equal(rows.length, 4);
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
    const { rows: grantRows } = await db.query("select id from professional_introducer_demo_access limit 1");
    const grantId = grantRows[0].id;
    await db.query("insert into professional_introducer_demo_members (access_grant_id, employee_key, display_name, department) values ($1,'employee-01','Fictional Person','Operations')", [grantId]);
    await db.query("insert into professional_introducer_demo_assessments (access_grant_id, employee_key, assessment_key, assessment_type, stress_score, sleep_score, recovery_score, energy_score, mood_score, focus_score, burnout_score) values ($1,'employee-01','seed:employee-01:baseline','baseline',1,2,3,4,5,6,7)", [grantId]);
    await assert.rejects(() => db.query("insert into professional_introducer_demo_assessments (access_grant_id, employee_key, assessment_key, assessment_type, stress_score, sleep_score, recovery_score, energy_score, mood_score, focus_score, burnout_score) values ($1,'employee-02','checkin:4d4c46b2-35ac-46d3-8f79-0837e5a7f9be','checkin',1,2,3,4,5,6,7)", [grantId]), /foreign key/i);
    await assert.rejects(() => db.query("insert into professional_introducer_demo_assessments (access_grant_id, employee_key, assessment_key, assessment_type, stress_score, sleep_score, recovery_score, energy_score, mood_score, focus_score, burnout_score) values ($1,'employee-01','checkin:4d4c46b2-35ac-46d3-8f79-0837e5a7f9be','checkin',11,2,3,4,5,6,7)", [grantId]), /check constraint/i);
  } finally { await db.close(); }
});
