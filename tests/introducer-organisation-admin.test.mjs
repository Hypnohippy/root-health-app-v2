import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  loadIntroducerOrganisationAdmin,
  performIntroducerOrganisationAdminAction,
  IntroducerOrganisationAdminError,
} from "../lib/introducerOrganisationAdmin.server.js";

const ORG = "10000000-0000-4000-8000-000000000001";
const OTHER_ORG = "10000000-0000-4000-8000-000000000002";
const UNIT = "20000000-0000-4000-8000-000000000001";
const PERSON = "30000000-0000-4000-8000-000000000001";

function fixture({ status = "demo", members = null } = {}) {
  const tables = {
    organisations: [{ id: ORG, name: "Fictional Root Group", status }, { id: OTHER_ORG, name: "Other Group", status: "demo" }],
    organisation_units: [{ id: UNIT, organisation_id: ORG, name: "People", unit_type: "department", parent_unit_id: null, active: true }],
    organisation_members: members || [{
      id: PERSON, organisation_id: ORG, organisation_unit_id: UNIT, user_id: null,
      profile_key: "fictional-person-1", email: "fictional.person@example.invalid", name: "Fictional Person",
      department: "People", role: "employee", created_at: "2026-01-01T00:00:00Z",
    }],
  };
  let inserted = 0;
  const admin = {
    from(table) {
      let rows = tables[table] || [];
      let filters = [];
      let operation = "read";
      let payload = null;
      const query = {
        select() { return this; },
        eq(field, value) { filters.push((row) => row?.[field] === value); return this; },
        is(field, value) { filters.push((row) => row?.[field] === value); return this; },
        in(field, values) { filters.push((row) => values.includes(row?.[field])); return this; },
        order() { return this; },
        insert(value) { operation = "insert"; payload = value; return this; },
        update(value) { operation = "update"; payload = value; return this; },
        selected() { return rows.filter((row) => filters.every((filter) => filter(row))); },
        async single() {
          if (operation === "insert") {
            inserted += 1;
            const row = { id: "40000000-0000-4000-8000-000000000001", created_at: "2026-01-02T00:00:00Z", ...payload };
            rows.push(row);
            return { data: row, error: null };
          }
          return { data: this.selected()[0] || null, error: null };
        },
        async maybeSingle() {
          if (operation === "update") {
            const row = this.selected()[0];
            if (row) Object.assign(row, payload);
            return { data: row || null, error: null };
          }
          return { data: this.selected()[0] || null, error: null };
        },
        then(resolve, reject) {
          return Promise.resolve({ data: this.selected(), error: null }).then(resolve, reject);
        },
      };
      return query;
    },
  };
  return { admin, tables, get inserted() { return inserted; } };
}

test("genuine employer admin loads only the grant-mapped fictional roster and hides contact routes", async () => {
  const state = await loadIntroducerOrganisationAdmin({ admin: fixture().admin, organisationId: ORG });
  assert.equal(state.organisation.status, "demo");
  assert.equal(state.members.length, 1);
  assert.equal(state.workforceRows[0].name, "Fictional Person");
  assert.equal(state.workforceRows[0].business_email, null);
  assert.equal(state.workforceRows[0].root_status, "not_invited");
});

test("organisation setup changes are confined to the mapped demo organisation", async () => {
  const db = fixture();
  const created = await performIntroducerOrganisationAdminAction({
    admin: db.admin, organisationId: ORG, actorUserId: "introducer-user",
    action: { type: "unit.create", name: "Wellbeing", unitType: "team", parentUnitId: UNIT },
  });
  assert.equal(created.unit.organisation_id, ORG);
  assert.equal(created.unit.created_by, "introducer-user");
  assert.equal(db.tables.organisation_units.length, 2);
  await assert.rejects(
    () => performIntroducerOrganisationAdminAction({ admin: db.admin, organisationId: ORG, actorUserId: "u", action: { type: "unit.create", name: "Cross-org", unitType: "team", parentUnitId: "20000000-0000-4000-8000-000000000099" } }),
    (error) => error instanceof IntroducerOrganisationAdminError && error.status === 403,
  );
});

test("only unlinked fictional rows accept the demonstration organisation roles", async () => {
  const db = fixture();
  const changed = await performIntroducerOrganisationAdminAction({
    admin: db.admin, organisationId: ORG, actorUserId: "introducer-user",
    action: { type: "member.role", memberId: PERSON, role: "organisation_admin" },
  });
  assert.equal(changed.member.role, "organisation_admin");
  await assert.rejects(
    () => performIntroducerOrganisationAdminAction({ admin: db.admin, organisationId: ORG, actorUserId: "u", action: { type: "member.role", memberId: PERSON, role: "root_admin" } }),
    (error) => error instanceof IntroducerOrganisationAdminError && error.status === 400,
  );

  const linked = fixture({ members: [{ id: PERSON, organisation_id: ORG, user_id: "real-user", role: "employee", name: "Not fictional" }] });
  await assert.rejects(() => loadIntroducerOrganisationAdmin({ admin: linked.admin, organisationId: ORG }), (error) => error.status === 503);
  await assert.rejects(() => performIntroducerOrganisationAdminAction({ admin: linked.admin, organisationId: ORG, actorUserId: "u", action: { type: "member.role", memberId: PERSON, role: "organisation_admin" } }), (error) => error.status === 404);
});

test("invitation preview cannot create invitations, users, tokens or email side effects", async () => {
  const db = fixture();
  const result = await performIntroducerOrganisationAdminAction({
    admin: db.admin, organisationId: ORG, actorUserId: "introducer-user",
    action: { type: "invitation.preview", memberIds: [PERSON] },
  });
  assert.equal(result.previewOnly, true);
  assert.equal(db.inserted, 0);
  assert.match(result.message, /No invitation record, account, token or email was created/);
  await assert.rejects(() => performIntroducerOrganisationAdminAction({
    admin: db.admin, organisationId: ORG, actorUserId: "u",
    action: { type: "invitation.preview", memberIds: ["30000000-0000-4000-8000-000000000099"] },
  }), (error) => error.status === 403);
});

test("the real organisation structure route authenticates every action server-side", async () => {
  const route = await readFile(new URL("../app/api/introducer/organisation-structure/route.js", import.meta.url), "utf8");
  assert.match(route, /authorizeProfessionalIntroducer\(\{ request \}\)/);
  assert.match(route, /organisationId: session\.grant\.demoOrganisationId/);
  assert.match(route, /Cache-Control.*no-store/);
  assert.match(route, /Vary: "Authorization"/);
  assert.doesNotMatch(route, /sendMail|sendEmail|createUser|inviteUserByEmail/);
});

test("employer-admin capability is grant-scoped and does not weaken customer organisation_admin checks", async () => {
  const [accessRoute, identity, page, adminActions] = await Promise.all([
    readFile(new URL("../app/api/introducer/access/route.js", import.meta.url), "utf8"),
    readFile(new URL("../lib/rootIdentity.js", import.meta.url), "utf8"),
    readFile(new URL("../app/organisation-structure/page.js", import.meta.url), "utf8"),
    readFile(new URL("../lib/introducerOrganisationAdmin.server.js", import.meta.url), "utf8"),
  ]);
  assert.match(accessRoute, /authorizeProfessionalIntroducer\(\{ request \}\)/);
  assert.match(accessRoute, /organisation\?\.status !== "demo"/);
  assert.match(accessRoute, /employerAdminAvailable: true/);
  assert.match(identity, /role: "hr_admin"/);
  assert.match(identity, /employerAdminAvailable: introducerAccess\.employerAdminAvailable === true/);
  assert.match(page, /const demoAdmin = identity\.introducerDemo\?\.employerAdminAvailable === true/);
  assert.match(page, /activeMembership\.role !== "organisation_admin"/);
  assert.match(page, /<option value="organisation_admin">Organisation Admin<\/option>/);
  assert.match(adminActions, /\.is\("user_id", null\)/);
});
