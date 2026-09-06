import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildConfirmedWorkforcePlan, buildWorkforceRpcPayload, deriveHierarchyFields, validateHierarchyFields } from "../lib/workforceImportApply.js";
import { requireOrganisationAdmin } from "../lib/organisationAdminServerAuth.js";

const migrationPath = new URL("../supabase/migrations/20260905_create_organisation_people.sql", import.meta.url);
const routePath = new URL("../app/api/organisation/workforce-import/route.js", import.meta.url);
const applyPath = new URL("../lib/workforceImportApply.js", import.meta.url);
const pagePath = new URL("../app/organisation-structure/page.js", import.meta.url);

function authClient({ userId = "user-1", memberships = [] } = {}) {
  const chain = {
    select() { return this; }, eq(field, value) { this.filters = { ...(this.filters || {}), [field]: value }; return this; },
    limit() { return Promise.resolve({ data: memberships.filter((membership) => Object.entries(this.filters || {}).every(([field, value]) => membership[field] === value)), error: null }); },
  };
  return { auth: { getUser: async () => ({ data: { user: { id: userId } }, error: null }) }, from: () => chain };
}

test("organisation_people migration preserves lifecycle and import provenance", async () => {
  const sql = await readFile(migrationPath, "utf8");
  assert.match(sql, /workforce_status text not null default 'active'/);
  assert.match(sql, /'inactive', 'leaver'/);
  assert.match(sql, /last_confirmed_at timestamptz/);
  assert.match(sql, /source text not null default 'manual'/);
  assert.doesNotMatch(sql, /on delete cascade/i);
});

test("same-organisation foreign keys bind unit, membership and manager", async () => {
  const sql = await readFile(migrationPath, "utf8");
  assert.match(sql, /foreign key \(organisation_unit_id, organisation_id\)/);
  assert.match(sql, /foreign key \(organisation_member_id, organisation_id\)/);
  assert.match(sql, /foreign key \(manager_person_id, organisation_id\)/);
});

test("database uniqueness is organisation-scoped and supports idempotency", async () => {
  const sql = await readFile(migrationPath, "utf8");
  assert.match(sql, /\(organisation_id, employee_reference_normalized\)/);
  assert.match(sql, /\(organisation_id, business_email_normalized\)/);
  assert.match(sql, /\(organisation_id, organisation_member_id\)/);
});

test("RLS grants only explicit organisation_admin membership and provides no delete policy", async () => {
  const sql = await readFile(migrationPath, "utf8");
  assert.match(sql, /membership\.role = 'organisation_admin'/);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /for select to authenticated/);
  assert.match(sql, /for insert to authenticated/);
  assert.match(sql, /for update to authenticated/);
  assert.doesNotMatch(sql, /for delete/i);
});

test("server authorisation uses exact user, organisation and organisation_admin role", async () => {
  const client = authClient({ memberships: [{ id: "m1", user_id: "user-1", organisation_id: "org-a", role: "organisation_admin" }] });
  const request = { headers: new Headers({ Authorization: "Bearer token" }) };
  const result = await requireOrganisationAdmin({ request, organisationId: "org-a", createClientForToken: async () => client });
  assert.equal(result.organisationId, "org-a");
  assert.deepEqual(client.from().filters, { user_id: "user-1", organisation_id: "org-a", role: "organisation_admin" });
});

test("missing or non-admin organisation membership fails closed", async () => {
  const request = { headers: new Headers({ Authorization: "Bearer token" }) };
  await assert.rejects(() => requireOrganisationAdmin({ request, organisationId: "org-b", createClientForToken: async () => authClient() }), (error) => error.status === 403);
  await assert.rejects(() => requireOrganisationAdmin({ request: { headers: new Headers() }, organisationId: "org-a" }), (error) => error.status === 401);
});

test("organisation_admin in A cannot confirm B and browser role claims are irrelevant", async () => {
  const request = { headers: new Headers({ Authorization: "Bearer token" }), role: "organisation_admin" };
  const client = authClient({ memberships: [{ id: "m1", user_id: "user-1", organisation_id: "org-a", role: "organisation_admin" }] });
  await assert.rejects(() => requireOrganisationAdmin({ request, organisationId: "org-b", createClientForToken: async () => client }), (error) => error.status === 403);
});

test("hierarchy follows the employer-reviewed spreadsheet order, not a fixed Root shape", () => {
  const columns = [{ key: "a" }, { key: "b" }, { key: "c" }];
  const fields = deriveHierarchyFields(columns, { a: { field: "location" }, b: { field: "division" }, c: { field: "team" } });
  const plan = buildConfirmedWorkforcePlan({ canonicalRows: [{ source_row: 2, email: "a@example.com", location: "UK", division: "North", team: "Field" }], validation: { issues: [] }, hierarchyFields: fields });
  assert.deepEqual(fields, ["location", "division", "team"]);
  assert.deepEqual(plan.units.map((unit) => unit.unitType), ["site", "division", "team"]);
  assert.equal(plan.units[1].parentKey, plan.units[0].key);
});

test("reviewed hierarchy can place shared locations above departments and teams", () => {
  const rows = [
    { source_row: 2, name: "A", email: "a@example.test", location: "London", department: "Sales", team: "Corporate" },
    { source_row: 3, name: "B", email: "b@example.test", location: "London", department: "People", team: "Operations" },
  ];
  const plan = buildConfirmedWorkforcePlan({ canonicalRows: rows, validation: { issues: [] }, hierarchyFields: ["location", "department", "team"] });
  assert.equal(plan.units.filter((unit) => unit.unitType === "site" && unit.name === "London").length, 1);
  assert.deepEqual(plan.units.slice(0, 3).map((unit) => unit.unitType), ["site", "department", "team"]);
});

test("excluded hierarchy dimensions remain workforce information but do not create units", () => {
  const row = { source_row: 2, name: "A", email: "a@example.test", department: "Sales", team: "Corporate", location: "London" };
  const plan = buildConfirmedWorkforcePlan({ canonicalRows: [row], validation: { issues: [] }, hierarchyFields: ["department", "team"] });
  const payload = buildWorkforceRpcPayload(plan);
  assert.deepEqual(payload.hierarchyFields, ["department", "team"]);
  assert.deepEqual(payload.units.map((unit) => unit.unitType), ["department", "team"]);
  assert.equal(payload.people[0].row.location, "London");
});

test("server hierarchy validation rejects unknown, duplicate and unpopulated dimensions", () => {
  const rows = [{ department: "Sales", location: "London", team: "" }];
  assert.equal(validateHierarchyFields(["location", "department"], rows, ["department", "location", "team"]), true);
  assert.equal(validateHierarchyFields(["location", "department"], rows, ["department"]), false);
  assert.equal(validateHierarchyFields(["department"], rows, ["department", "department"]), false);
  assert.equal(validateHierarchyFields(["department"], rows, ["department", "role"]), false);
  assert.equal(validateHierarchyFields(["department", "department"], rows), false);
  assert.equal(validateHierarchyFields(["department", "role"], rows), false);
  assert.equal(validateHierarchyFields(["team"], rows), false);
  assert.equal(validateHierarchyFields([], rows), false);
});

test("an identical retry reuses existing units and people", () => {
  const row = { source_row: 2, name: "Asha", email: "asha@example.com", employee_id: "E-1", department: "Operations" };
  const first = buildConfirmedWorkforcePlan({ canonicalRows: [row], validation: { issues: [] }, hierarchyFields: ["department"] });
  const second = buildConfirmedWorkforcePlan({ canonicalRows: [row], validation: { issues: [] }, hierarchyFields: ["department"], existingUnits: [{ id: "u1", parent_unit_id: null, name: "Operations", unit_type: "department" }], existingPeople: [{ id: "p1", employee_reference_id: "E-1", business_email: "asha@example.com" }] });
  assert.equal(first.summary.units, 1);
  assert.equal(second.summary.units, 0);
  assert.equal(second.summary.people, 0);
  assert.equal(second.summary.existingPeople, 1);
});

test("ambiguous existing-person matches are excluded rather than guessed", () => {
  const plan = buildConfirmedWorkforcePlan({
    canonicalRows: [{ source_row: 2, name: "Asha", email: "asha@example.com", employee_id: "E-1", department: "Operations" }],
    validation: { issues: [] }, hierarchyFields: ["department"],
    existingPeople: [{ id: "p1", employee_reference_id: "E-1", business_email: "other@example.com" }, { id: "p2", employee_reference_id: "E-2", business_email: "asha@example.com" }],
  });
  assert.equal(plan.people.length, 0);
  assert.equal(plan.summary.excluded, 1);
  assert.equal(plan.units.length, 0);
});

test("application writes remain organisation-scoped and never import Root roles", async () => {
  const route = await readFile(routePath, "utf8");
  const apply = await readFile(applyPath, "utf8");
  assert.match(route, /requireOrganisationAdmin/);
  assert.match(route, /expected_plan_fingerprint/);
  assert.match(route, /\.eq\("organisation_id", organisationId\)/);
  assert.match(apply, /\.rpc\("apply_confirmed_workforce_import"/);
  assert.doesNotMatch(apply, /role\s*:/);
  assert.doesNotMatch(apply, /department\s*:/);
});

test("the confirmed mutation is one atomic RPC with transaction lock and fail-fast exceptions", async () => {
  const sql = await readFile(migrationPath, "utf8");
  const apply = await readFile(applyPath, "utf8");
  assert.match(sql, /apply_confirmed_workforce_import/);
  assert.match(sql, /pg_advisory_xact_lock/);
  assert.match(sql, /raise exception/);
  assert.doesNotMatch(sql, /exception\s+when/i);
  assert.equal((apply.match(/\.rpc\("apply_confirmed_workforce_import"/g) || []).length, 1);
  assert.doesNotMatch(apply, /\.from\("organisation_(units|people|members)"\)/);
});

test("RPC independently rejects unauthenticated, non-admin and cross-organisation authority", async () => {
  const sql = await readFile(migrationPath, "utf8");
  assert.match(sql, /actor_id uuid := auth\.uid\(\)/);
  assert.match(sql, /is_explicit_organisation_admin\(requested_organisation_id\)/);
  assert.match(sql, /membership\.organisation_id = requested_organisation_id/);
  assert.match(sql, /membership\.role = 'organisation_admin'/);
  assert.match(sql, /grant execute on function public\.apply_confirmed_workforce_import[^\n]+ to authenticated/);
});

test("RPC preserves role and legacy department while aligning only the exact membership unit", async () => {
  const sql = await readFile(migrationPath, "utf8");
  const membershipUpdate = sql.match(/update public\.organisation_members[\s\S]*?if found then aligned_members/)?.[0] || "";
  assert.match(membershipUpdate, /set organisation_unit_id = leaf_unit_id/);
  assert.match(membershipUpdate, /organisation_id = requested_organisation_id/);
  assert.doesNotMatch(membershipUpdate, /role\s*=/);
  assert.doesNotMatch(membershipUpdate, /department\s*=/);
  assert.doesNotMatch(sql, /insert into public\.organisation_members/);
});

test("manager resolution is restricted to people in the same confirmed organisation import", async () => {
  const sql = await readFile(migrationPath, "utf8");
  assert.match(sql, /from pg_temp\.root_import_people candidate/);
  assert.match(sql, /organisation_id = requested_organisation_id/);
  assert.match(sql, /Manager reference is ambiguous or invalid/);
  assert.match(sql, /Manager relationship crossed the organisation boundary/);
});

test("only the exact server-rebuilt plan reaches the RPC", async () => {
  const route = await readFile(routePath, "utf8");
  const payload = buildWorkforceRpcPayload({ units: [{ key: "u", parentKey: null, name: "People", unitType: "department", existingId: "browser-irrelevant" }], people: [{ leafUnitKey: "u", existing: { id: "not-authority" }, member: { role: "organisation_admin" }, row: { source_row: 2, name: "A", email: "a@example.com", employee_id: "1", job_title: "CEO", location: "UK", manager: "" } }] });
  assert.equal(payload.units[0].expectedExistingId, "browser-irrelevant");
  assert.equal(Object.hasOwn(payload.people[0], "existing"), false);
  assert.equal(Object.hasOwn(payload.people[0], "member"), false);
  assert.equal(payload.people[0].expectedExistingPersonId, "not-authority");
  assert.deepEqual(payload.hierarchyFields, []);
  assert.match(route, /buildConfirmedWorkforcePlan/);
  assert.match(route, /validateHierarchyFields\(hierarchyFields, canonicalRows, mappedHierarchyFields\)/);
  assert.match(route, /planFingerprint\(plan\)/);
  assert.match(route, /applyConfirmedWorkforcePlan\(\{ supabase: access\.supabase, organisationId, plan \}\)/);
});

test("hierarchy order is part of the exact plan fingerprint payload", () => {
  const base = { units: [], people: [] };
  const first = JSON.stringify(buildWorkforceRpcPayload({ ...base, hierarchyFields: ["location", "department"] }));
  const second = JSON.stringify(buildWorkforceRpcPayload({ ...base, hierarchyFields: ["department", "location"] }));
  assert.notEqual(first, second);
});

test("live Structure & People reads organisation_people while retaining membership data", async () => {
  const page = await readFile(pagePath, "utf8");
  assert.match(page, /from\("organisation_people"\)/);
  assert.match(page, /from\("organisation_members"\)/);
  assert.match(page, /linkedMember\?\.role/);
  assert.match(page, /"Not invited"/);
});
