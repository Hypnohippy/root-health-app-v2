import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { authorizeProfessionalIntroducer, ProfessionalDemoAccessError, professionalDemoEnabled } from "../lib/professionalIntroducerDemoAuth.server.js";
import { buildIntroducerDemoSeed, buildIntroducerEmployeeScenario, buildIntroducerEmployerScenario, listIntroducerDemoEmployees } from "../lib/professionalIntroducerDemoScenario.server.js";
import { createIntroducerDemoAssessment, loadIntroducerDemoState, resetIntroducerDemoCheckins } from "../lib/professionalIntroducerDemoStore.server.js";
import { getRootDestination } from "../lib/rootNavigator.js";
import { PGlite } from "@electric-sql/pglite";

function query(result) {
  const filters = [];
  const value = {
    select() { return this; }, eq(key, expected) { filters.push((row) => row?.[key] === expected); return this; }, is() { return this; },
    order() { return this; }, limit() { return this; }, gte() { return this; },
    maybeSingle() {
      const data = Array.isArray(result?.data) ? result.data.filter((row) => filters.every((filter) => filter(row))) : result?.data;
      return Promise.resolve({ ...result, data: Array.isArray(data) ? data[0] || null : data });
    },
    then(resolve, reject) {
      const data = Array.isArray(result?.data) ? result.data.filter((row) => filters.every((filter) => filter(row))) : result?.data;
      return Promise.resolve({ ...result, data }).then(resolve, reject);
    },
  };
  return value;
}

function authFixture({ grant = { id: "grant-1", user_id: "user-1", consultant_label: "Partner", expires_at: "2026-12-01T00:00:00.000Z", revoked_at: null, demo_organisation_id: "fictional-org-1" }, memberships = [], subscriptions = [], emailConfirmed = true, errorTable = null, missingTables = [], orgStatus = "demo", fictionalMemberCount = 6, fictionalBaselineCount = 6 } = {}) {
  const authClientFactory = async () => ({ auth: { getUser: async () => ({ data: { user: { id: "user-1", email: "partner@example.com", email_confirmed_at: emailConfirmed ? "2026-11-17T00:00:00.000Z" : null } }, error: null }) } });
  const data = {
    professional_introducer_demo_access: { data: grant, error: errorTable === "grant" ? new Error("failure") : null },
    personal_subscriptions: { data: subscriptions, error: missingTables.includes("personal_subscriptions") ? Object.assign(new Error("missing relation"), { code: "PGRST205" }) : errorTable === "subscription" ? new Error("failure") : null },
    organisations: { data: { id: "fictional-org-1", status: orgStatus }, error: null },
    organisation_members: {
      data: [
        ...Array.from({ length: fictionalMemberCount }, (_, index) => ({ id: `fictional-member-${index + 1}`, organisation_id: "fictional-org-1", profile_key: `fictional-${index + 1}`, role: "employee", user_id: null })),
        ...memberships.map((membership) => ({ user_id: "user-1", ...membership })),
      ],
      error: missingTables.includes("organisation_members") ? Object.assign(new Error("missing relation"), { code: "PGRST205" }) : errorTable === "membership" ? new Error("failure") : null,
    },
    wellbeing_assessments: { data: Array.from({ length: fictionalBaselineCount }, (_, index) => ({ organisation_id: "fictional-org-1", profile_key: `fictional-${index + 1}`, assessment_type: "baseline" })), error: null },
  };
  const admin = { from(table) { return query(data[table]); } };
  return { authClientFactory, adminClientFactory: async () => admin };
}

const request = (authorization = "Bearer valid-session") => new Request("https://preview.example/introducer", { headers: { authorization } });

test("demo requires verified dedicated Vercel and isolated Supabase identities", () => {
  const preview = { ROOT_DEPLOYMENT_MODE: "introducer", VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: "codex/professional-introducer-demo", VERCEL_PROJECT_ID: "prj_5FntyaVgI1tQ7Q3IMKfkSTb2ETut", ROOT_INTRODUCER_VERCEL_PROJECT_ID: "prj_5FntyaVgI1tQ7Q3IMKfkSTb2ETut", ROOT_AUTH_PREVIEW_URL: "https://root-health-introducer-demo-preview.vercel.app", PROFESSIONAL_INTRODUCER_DEMO_ENABLED: "true", ROOT_INTRODUCER_SUPABASE_PROJECT_REF: "waluyphoafylzcjuskcl", ROOT_PRODUCTION_SUPABASE_PROJECT_REF: "witkwlgldxjwwxmpcyva", NEXT_PUBLIC_SUPABASE_URL: "https://waluyphoafylzcjuskcl.supabase.co" };
  assert.equal(professionalDemoEnabled(preview), true);
  assert.equal(professionalDemoEnabled({ ...preview, VERCEL_ENV: "production" }), true);
  assert.equal(professionalDemoEnabled({ ...preview, ROOT_DEPLOYMENT_MODE: "production" }), false);
  assert.equal(professionalDemoEnabled({ ...preview, PROFESSIONAL_INTRODUCER_DEMO_ENABLED: "false" }), false);
  assert.equal(professionalDemoEnabled({ ...preview, ROOT_DEPLOYMENT_MODE: undefined, VERCEL_GIT_COMMIT_REF: "main", VERCEL_PROJECT_ID: "prj-unrelated" }), false);
  assert.equal(professionalDemoEnabled({ ...preview, VERCEL_PROJECT_ID: "prj-customer-production" }), false);
  assert.equal(professionalDemoEnabled({ ...preview, NEXT_PUBLIC_SUPABASE_URL: "https://witkwlgldxjwwxmpcyva.supabase.co" }), false);
  assert.equal(professionalDemoEnabled({ ...preview, ROOT_PRODUCTION_SUPABASE_PROJECT_REF: "waluyphoafylzcjuskcl" }), false);
});

test("verified invite with unexpired grant and no customer entitlement is authorised", async () => {
  const fixture = authFixture();
  const result = await authorizeProfessionalIntroducer({ request: request(), enabled: true, ...fixture, now: new Date("2026-11-17T12:00:00Z") });
  assert.equal(result.userId, "user-1");
  assert.equal(result.grant.consultantLabel, "Partner");
  assert.equal(result.grant.demoOrganisationId, "fictional-org-1");
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
  await assert.rejects(() => authorizeProfessionalIntroducer({ request: request(), enabled: true, ...authFixture({ subscriptions: [{ user_id: "user-1", subscription_status: "active", subscription_active: true }] }) }), (error) => error.status === 403);
  await assert.rejects(() => authorizeProfessionalIntroducer({ request: request(), enabled: true, ...authFixture({ errorTable: "membership" }) }), (error) => error.status === 503);
});

test("fictional employer access fails closed until Root provisions its mapped organisation and historical baseline", async () => {
  await assert.rejects(() => authorizeProfessionalIntroducer({ request: request(), enabled: true, ...authFixture({ missingTables: ["organisation_members"] }), now: new Date("2026-11-17T12:00:00Z") }), (error) => error.status === 503);
  await assert.rejects(() => authorizeProfessionalIntroducer({ request: request(), enabled: true, ...authFixture({ errorTable: "subscription" }) }), (error) => error.status === 503);
  await assert.rejects(() => authorizeProfessionalIntroducer({ request: request(), enabled: true, ...authFixture({ grant: { id: "grant-1", user_id: "user-1", consultant_label: "Partner", expires_at: "2026-12-01T00:00:00.000Z", revoked_at: null, demo_organisation_id: null } }), now: new Date("2026-11-17T12:00:00Z") }), /still preparing your fictional employer/);
  await assert.rejects(() => authorizeProfessionalIntroducer({ request: request(), enabled: true, ...authFixture({ orgStatus: "active" }) }), /still preparing your fictional employer/);
  await assert.rejects(() => authorizeProfessionalIntroducer({ request: request(), enabled: true, ...authFixture({ fictionalMemberCount: 4, fictionalBaselineCount: 4 }) }), /still preparing your fictional employer/);
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

function provisionFictionalDemoFixture(admin, grantId, now) {
  const seed = buildIntroducerDemoSeed({ grantId, now });
  admin.rows.professional_introducer_demo_members.push(...seed.members);
  admin.rows.professional_introducer_demo_assessments.push(...seed.assessments);
}

test("Root-preprovisioned fictional data persists, affects aggregates, survives reload and resets to its baseline", async () => {
  const admin = new MemoryAdmin();
  const now = new Date("2026-11-17T12:00:00.000Z");
  provisionFictionalDemoFixture(admin, "grant-a", now);
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

  provisionFictionalDemoFixture(admin, "grant-b", now);
  await resetIntroducerDemoCheckins({ admin, grantId: "grant-a", now });
  const resetA = await loadIntroducerDemoState({ admin, grantId: "grant-a", now });
  const unchangedB = await loadIntroducerDemoState({ admin, grantId: "grant-b", now });
  assert.equal(resetA.assessments.length, 23);
  assert.equal(buildIntroducerEmployerScenario({ grantId: "grant-a", ...resetA }).respondents, 18);
  assert.equal(unchangedB.assessments.length, 23);
});

test("opening the demo never creates fictional workforce members or historical assessments", async () => {
  const admin = new MemoryAdmin();
  await assert.rejects(() => loadIntroducerDemoState({ admin, grantId: "grant-unprepared" }), /Root Health has not prepared/);
  assert.equal(admin.rows.professional_introducer_demo_members.length, 0);
  assert.equal(admin.rows.professional_introducer_demo_assessments.length, 0);
});

test("optional OpenAI configuration is checked at request time instead of module import", async () => {
  const route = await readFile(new URL("../app/api/generate-audio/route.js", import.meta.url), "utf8");
  assert.match(route, /function getOpenAIClient\(\)[\s\S]*process\.env\.OPENAI_API_KEY/);
  assert.doesNotMatch(route, /^(?:const|let)\s+openai\s*=\s*new OpenAI/m);
  assert.match(route, /Audio generation is not configured[\s\S]*status:\s*503/);
});

test("check-in validation and employee selection fail closed", async () => {
  const admin = new MemoryAdmin();
  provisionFictionalDemoFixture(admin, "grant-1", new Date("2026-11-17T12:00:00.000Z"));
  const base = { admin, grantId: "grant-1", employeeKey: "employee-01", requestId: "4d4c46b2-35ac-46d3-8f79-0837e5a7f9be" };
  assert.equal((await createIntroducerDemoAssessment({ ...base, scores: { stress: 11 } })).reason, "invalid_scores");
  assert.equal((await createIntroducerDemoAssessment({ ...base, employeeKey: "employee-99", scores: Object.fromEntries(["stress", "sleep", "recovery", "energy", "mood", "focus", "burnout"].map((key) => [key, 5])) })).reason, "employee_not_found");
});

test("a verified introducer grant routes into genuine Root journeys and only its fictional admin capability", () => {
  const identity = {
    introducerDemo: { enabled: true, organisationId: "fictional-org", employerAdminAvailable: true },
    capabilities: { canUseWorkplace: true, canUsePersonal: true },
    personal: { hasProfile: true, orientationCompleted: true },
  };
  assert.equal(getRootDestination(null, "/introducer"), null);
  assert.equal(getRootDestination(identity, "/introducer"), "/choose-experience");
  for (const path of ["/", "/orientation", "/assessment", "/check-in", "/insights", "/coach", "/journal", "/body", "/mind", "/playbook", "/profile"]) {
    assert.equal(getRootDestination(identity, path), null, `${path} should use the real personal route`);
  }
  for (const path of ["/org-insights", "/executive-review", "/launch-kit"]) {
    assert.equal(getRootDestination(identity, path), null, `${path} should use the permitted real employer route`);
  }
  assert.equal(getRootDestination(identity, "/organisation-structure"), null, "only the explicit fictional employer-admin grant opens the isolated structure screen");
  for (const path of ["/hr-coach", "/organisation-learning", "/presentation-support", "/organisations/pricing"]) {
    assert.equal(getRootDestination(identity, path), "/org-insights", `${path} should stay outside the introducer allowlist`);
  }
  assert.equal(getRootDestination({ ...identity, introducerDemo: { ...identity.introducerDemo, employerAdminAvailable: false } }, "/organisation-structure"), "/org-insights");
  assert.equal(getRootDestination(null, "/org-insights"), "/welcome");
  assert.equal(getRootDestination({ capabilities: { canUseWorkplace: false, canUsePersonal: false } }, "/org-insights"), "/");
  for (const path of ["/", "/org-insights", "/organisation-structure"]) {
    assert.equal(getRootDestination(null, path), "/welcome", `${path} denies direct navigation without a currently resolved identity`);
  }
});

test("introducer landing is a branded gateway and experience chooser refreshes grant-backed identity", async () => {
  const [gateway, chooser, identity] = await Promise.all([
    readFile(new URL("../app/introducer/page.js", import.meta.url), "utf8"),
    readFile(new URL("../app/choose-experience/page.js", import.meta.url), "utf8"),
    readFile(new URL("../lib/rootIdentity.js", import.meta.url), "utf8"),
  ]);
  assert.match(gateway, /Professional Introducer Preview/);
  assert.match(gateway, /login\?next=%2Fintroducer/);
  assert.doesNotMatch(gateway, /professional_introducer_demo_members|sample_checkin|employeeKey|range/);
  assert.match(chooser, /getRootIdentity\(\)/);
  assert.match(chooser, /Northstar Studio \(fictional\)/);
  assert.match(chooser, /introducerDemo\?\.expiresAt/);
  assert.match(chooser, /employerAdminAvailable === true/);
  assert.match(identity, /fetch\("\/api\/introducer\/access"/);
  assert.match(identity, /accessResponse\.status !== 404/);
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

test("the launch gateway retains Root Health attribution and has no replacement demo controls", async () => {
  const page = await readFile(new URL("../app/introducer/page.js", import.meta.url), "utf8");
  assert.match(page, /Authorised Root Health Partner Demonstration/);
  assert.match(page, /© 2024–2026 Root Health/);
  assert.match(page, /private Personal Root/);
  assert.match(page, /fictional Northstar Studio/);
  assert.doesNotMatch(page, /sample_checkin|reset_demo|introduction_request|professional_introducer_demo_members|<input type="range"/);
});

test("Voice Coach remains grant-scoped and provider-backed AI is not exposed by the gateway", async () => {
  const access = await readFile(new URL("../app/api/introducer/access/route.js", import.meta.url), "utf8");
  const identity = await readFile(new URL("../lib/rootIdentity.js", import.meta.url), "utf8");
  const gateway = await readFile(new URL("../app/introducer/page.js", import.meta.url), "utf8");
  const coach = await readFile(new URL("../app/coach/page.js", import.meta.url), "utf8");
  const restricted = await readFile(new URL("../lib/introducerRestrictedActions.server.js", import.meta.url), "utf8");
  assert.match(access, /voiceCoachStatus/);
  assert.match(access, /root_authorization_required/);
  assert.match(identity, /voiceCoachStatus: introducerAccess\.voiceCoachStatus/);
  assert.doesNotMatch(gateway, /api\/realtime-session|api\/root-coach|api\/transcribe|openai\.com/i);
  assert.match(coach, /termination_controls_pending/);
  assert.match(coach, /Ask Root Health to authorise it/);
  assert.match(restricted, /"\/api\/root-coach"/);
  assert.match(restricted, /"\/api\/playbook-review"/);
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
