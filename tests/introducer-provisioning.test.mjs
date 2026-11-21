import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildIntroducerFictionalOrganisationSeed, provisionIntroducerFictionalOrganisation } from "../lib/provisionIntroducerFictionalWorkforce.server.js";

class Query {
  constructor(admin, table) { this.admin = admin; this.table = table; this.filters = []; this.op = "select"; }
  select() { return this; }
  eq(key, value) { this.filters.push((row) => row?.[key] === value); return this; }
  in(key, values) { const set = new Set(values); this.filters.push((row) => set.has(row?.[key])); return this; }
  is(key, value) { this.filters.push((row) => row?.[key] === value); return this; }
  maybeSingle() { const result = this.execute(); return Promise.resolve({ data: result.rows[0] || null, error: null }); }
  single() { const result = this.execute(); return Promise.resolve({ data: result.rows[0] || null, error: null }); }
  insert(rows) { this.op = "insert"; this.values = Array.isArray(rows) ? rows : [rows]; return this; }
  upsert(rows, { onConflict } = {}) { this.op = "upsert"; this.values = Array.isArray(rows) ? rows : [rows]; this.conflict = String(onConflict || "id").split(","); return this; }
  update(values) { this.op = "update"; this.values = values; return this; }
  execute() {
    const tableRows = this.admin.rows[this.table] || (this.admin.rows[this.table] = []);
    const rows = tableRows.filter((row) => this.filters.every((filter) => filter(row)));
    if (this.op === "insert") {
      for (const value of this.values) tableRows.push({ id: value.id || `row-${++this.admin.sequence}`, ...value });
      return { rows: this.values };
    }
    if (this.op === "upsert") {
      for (const value of this.values) {
        const existing = tableRows.find((row) => this.conflict.every((key) => row[key] === value[key]));
        if (existing) Object.assign(existing, value);
        else tableRows.push({ id: value.id || `row-${++this.admin.sequence}`, ...value });
      }
      return { rows: this.values };
    }
    if (this.op === "update") {
      for (const row of rows) Object.assign(row, this.values);
      return { rows };
    }
    return { rows };
  }
  then(resolve, reject) { return Promise.resolve({ data: this.execute().rows, error: null }).then(resolve, reject); }
}

function fixture({ expiresAt = "2026-12-01T00:00:00.000Z", revokedAt = null } = {}) {
  const admin = {
    sequence: 0,
    rows: {
      organisations: [], organisation_units: [], profiles: [], organisation_members: [],
      wellbeing_assessments: [],
      professional_introducer_demo_access: [{
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", user_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        expires_at: expiresAt, revoked_at: revokedAt, revoked_by: null, demo_organisation_id: null, voice_coach_enabled: false,
      }],
    },
    from(table) { return new Query(this, table); },
    async rpc(name, args) {
      if (name !== "update_professional_introducer_voice_allocation") return { data: null, error: new Error("Unexpected RPC") };
      const grant = this.rows.professional_introducer_demo_access.find((row) => row.id === args.p_grant_id && row.user_id === args.p_user_id);
      if (!grant || grant.revoked_at) return { data: false, error: null };
      if (args.p_voice_coach_enabled !== null) grant.voice_coach_enabled = args.p_voice_coach_enabled;
      if (args.p_update_sessions_override) grant.voice_sessions_per_24h_override = args.p_sessions_per_24h;
      if (args.p_update_duration_override) grant.voice_max_session_seconds_override = args.p_max_session_seconds;
      return { data: true, error: null };
    },
    auth: { admin: { getUserById: async (id) => ({ data: { user: {
      id, email: id === "cccccccc-cccc-4ccc-8ccc-cccccccccccc" ? "second@example.test" : "david@example.test", email_confirmed_at: "2026-11-01T00:00:00.000Z", user_metadata: { name: id === "cccccccc-cccc-4ccc-8ccc-cccccccccccc" ? "Sam" : "David" },
    } }, error: null }) } },
  };
  return admin;
}

test("Root fictional workforce provisioning is synthetic, historically seeded, and idempotent", async () => {
  const now = new Date("2026-11-18T12:00:00.000Z");
  const seed = buildIntroducerFictionalOrganisationSeed({ now });
  assert.equal(seed.members.length, 24);
  assert.equal(seed.profiles.length, 24);
  assert.equal(seed.assessments.length, 55);
  assert.ok(seed.members.every((member) => member.user_id === null && member.role === "employee" && member.email === null));
  assert.ok(seed.profiles.every((profile) => profile.user_id === null && profile.organisation_id === seed.organisation.id));
  assert.ok(seed.assessments.every((row) => row.user_id === null && row.organisation_id === seed.organisation.id));
  assert.deepEqual(buildIntroducerFictionalOrganisationSeed({ now }), seed);

  const admin = fixture();
  const args = { admin, grantId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", userId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", now };
  const first = await provisionIntroducerFictionalOrganisation(args);
  const snapshotAfterFirst = structuredClone(admin.rows);
  const second = await provisionIntroducerFictionalOrganisation({ ...args, now: new Date("2026-11-19T12:00:00.000Z") });
  assert.equal(first.memberCount, 24);
  assert.equal(first.historicalAssessmentCount, 55);
  assert.equal(first.distinctBaselineParticipants, 18);
  assert.equal(first.fixturePreserved,false);
  assert.equal(second.fixturePreserved,true);
  const {fixturePreserved: _firstPreserved,...firstResult}=first;
  const {fixturePreserved: _secondPreserved,...secondResult}=second;
  assert.deepEqual(secondResult, firstResult);
  assert.equal(admin.rows.organisations.length, 1);
  assert.equal(admin.rows.organisation_units.length, 2);
  assert.equal(admin.rows.profiles.length, 25); // one private profile plus 24 fictional profiles
  assert.equal(admin.rows.organisation_members.length, 24);
  assert.equal(admin.rows.wellbeing_assessments.length, 55);
  assert.equal(admin.rows.professional_introducer_demo_access[0].demo_organisation_id, first.organisationId);
  assert.deepEqual(admin.rows.organisations, snapshotAfterFirst.organisations);
  assert.deepEqual(admin.rows.organisation_units, snapshotAfterFirst.organisation_units);
  assert.deepEqual(admin.rows.organisation_members, snapshotAfterFirst.organisation_members);
  assert.deepEqual(admin.rows.wellbeing_assessments, snapshotAfterFirst.wellbeing_assessments,
    "an activation retry must preserve every historical assessment timestamp and value");
  assert.deepEqual(admin.rows.profiles.filter((row) => row.organisation_id), snapshotAfterFirst.profiles.filter((row) => row.organisation_id));
  assert.deepEqual(admin.rows.professional_introducer_demo_access, snapshotAfterFirst.professional_introducer_demo_access,
    "an already-correct grant mapping must not be rewritten");
});

test("two introducers receive distinct private Personal Root profiles while sharing only the fictional workforce", async () => {
  const admin = fixture();
  const secondUserId="cccccccc-cccc-4ccc-8ccc-cccccccccccc";
  admin.rows.professional_introducer_demo_access.push({
    id:"dddddddd-dddd-4ddd-8ddd-dddddddddddd",user_id:secondUserId,consultant_label:"Sam",
    expires_at:"2026-12-01T00:00:00.000Z",revoked_at:null,revoked_by:null,demo_organisation_id:"7e700070-0070-4070-8070-000000000070",voice_coach_enabled:false,
  });
  const now=new Date("2026-11-18T12:00:00.000Z");
  const one=await provisionIntroducerFictionalOrganisation({admin,grantId:"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",userId:"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",now});
  const before=structuredClone(admin.rows);
  const two=await provisionIntroducerFictionalOrganisation({admin,grantId:"dddddddd-dddd-4ddd-8ddd-dddddddddddd",userId:secondUserId,now});
  const personal=admin.rows.profiles.filter((row)=>row.user_id);
  assert.equal(personal.length,2);
  assert.notEqual(personal[0].id,personal[1].id);
  assert.notEqual(personal[0].profile_key,personal[1].profile_key);
  assert.ok(personal.every((row)=>!row.organisation_id));
  assert.equal(admin.rows.wellbeing_assessments.length,before.wellbeing_assessments.length);
  assert.deepEqual(admin.rows.wellbeing_assessments,before.wellbeing_assessments);
  assert.equal(one.organisationId,two.organisationId);
  assert.equal(admin.rows.professional_introducer_demo_access[0].demo_organisation_id,one.organisationId);
  assert.equal(admin.rows.professional_introducer_demo_access[1].demo_organisation_id,one.organisationId);
});

test("a partial or conflicting existing Northstar fixture is held without repairing or rewriting it", async () => {
  const admin=fixture();
  admin.rows.organisations.push({id:"7e700070-0070-4070-8070-000000000070",name:"Northstar Studio (fictional)",status:"demo",industry:"Creative and professional services",organisation_type:"private_company",employee_count:"24",workforce_size:24});
  const before=structuredClone(admin.rows);
  await assert.rejects(()=>provisionIntroducerFictionalOrganisation({admin,grantId:"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",userId:"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",now:new Date("2026-11-18T12:00:00.000Z")}),/partially present/);
  assert.deepEqual(admin.rows,before);
});

test("expired, revoked, mismatched, or real-account memberships prevent provisioning before grant mapping", async () => {
  const args = { grantId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", userId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", now: new Date("2026-11-18T12:00:00.000Z") };
  for (const admin of [
    fixture({ expiresAt: "2026-11-17T00:00:00.000Z" }),
    fixture({ revokedAt: "2026-11-17T00:00:00.000Z" }),
  ]) {
    await assert.rejects(() => provisionIntroducerFictionalOrganisation({ ...args, admin }));
    assert.equal(admin.rows.professional_introducer_demo_access[0].demo_organisation_id, null);
  }
  const mismatched = fixture();
  await assert.rejects(() => provisionIntroducerFictionalOrganisation({ ...args, admin: mismatched, userId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc" }));
  assert.equal(mismatched.rows.professional_introducer_demo_access[0].demo_organisation_id, null);
  const linked = fixture();
  linked.rows.organisation_members.push({ id: "real", user_id: args.userId, organisation_id: "not-demo", profile_key: "real" });
  await assert.rejects(() => provisionIntroducerFictionalOrganisation({ ...args, admin: linked }));
  assert.equal(linked.rows.organisations.length, 0);
  assert.equal(linked.rows.professional_introducer_demo_access[0].demo_organisation_id, null);
});

test("an existing personal profile does not bypass the verified Auth-account check", async () => {
  const admin = fixture();
  admin.rows.profiles.push({
    id: "profile-existing", user_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    profile_key: "private-existing", organisation_id: null,
  });
  admin.auth.admin.getUserById = async (id) => ({ data: { user: {
    id, email: "david@example.test", email_confirmed_at: null, confirmed_at: null,
  } }, error: null });
  await assert.rejects(() => provisionIntroducerFictionalOrganisation({
    admin, grantId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    userId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", now: new Date("2026-11-18T12:00:00.000Z"),
  }), /verified existing Auth account/);
  assert.equal(admin.rows.organisations.length, 0);
  assert.equal(admin.rows.professional_introducer_demo_access[0].demo_organisation_id, null);
});

test("Voice Coach grant can be enabled or revoked only through explicit Root provisioning input", async () => {
  const admin = fixture();
  const args = { admin, grantId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", userId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", now: new Date("2026-11-18T12:00:00.000Z") };
  await provisionIntroducerFictionalOrganisation({ ...args, voiceCoachEnabled: true });
  assert.equal(admin.rows.professional_introducer_demo_access[0].voice_coach_enabled, true);
  await provisionIntroducerFictionalOrganisation(args);
  assert.equal(admin.rows.professional_introducer_demo_access[0].voice_coach_enabled, true, "omission must preserve explicit entitlement");
  await provisionIntroducerFictionalOrganisation({ ...args, voiceCoachEnabled: false });
  assert.equal(admin.rows.professional_introducer_demo_access[0].voice_coach_enabled, false);
});

test("only the Root provisioning path can set, clear, or override each introducer's Voice allocation", async () => {
  const admin = fixture();
  const args = {
    admin,
    grantId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    userId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    now: new Date("2026-11-18T12:00:00.000Z"),
  };
  await provisionIntroducerFictionalOrganisation({
    ...args, voiceSessionsPer24hOverride: 7, voiceMaxSessionSecondsOverride: 600,
  });
  assert.equal(admin.rows.professional_introducer_demo_access[0].voice_coach_enabled, false);
  assert.equal(admin.rows.professional_introducer_demo_access[0].voice_sessions_per_24h_override, 7);
  assert.equal(admin.rows.professional_introducer_demo_access[0].voice_max_session_seconds_override, 600);
  await provisionIntroducerFictionalOrganisation({
    ...args, voiceSessionsPer24hOverride: null, voiceMaxSessionSecondsOverride: null,
  });
  assert.equal(admin.rows.professional_introducer_demo_access[0].voice_sessions_per_24h_override, null);
  assert.equal(admin.rows.professional_introducer_demo_access[0].voice_max_session_seconds_override, null);
  await assert.rejects(() => provisionIntroducerFictionalOrganisation({
    ...args, voiceSessionsPer24hOverride: 2147483648,
  }), /outside the supported range/);
});

test("provisioning endpoint is Root-admin-only and Preview-only; access endpoint uses the verified grant", async () => {
  const provision = await readFile(new URL("../app/api/introducer/root-provision/route.js", import.meta.url), "utf8");
  const access = await readFile(new URL("../app/api/introducer/access/route.js", import.meta.url), "utf8");
  const identity = await readFile(new URL("../lib/rootIdentity.js", import.meta.url), "utf8");
  const launchKit = await readFile(new URL("../app/launch-kit/page.js", import.meta.url), "utf8");
  assert.match(provision, /isIntroducerDeployment\(\)/);
  assert.match(provision, /requireRootAdmin\(request\)/);
  assert.match(provision, /provisionIntroducerFictionalOrganisation/);
  assert.match(provision, /email_confirmed_at/);
  assert.match(provision, /requireRootAdmin\(request\)[\s\S]*voiceCoachEnabled/);
  assert.match(provision, /voiceSessionsPer24hOverride/);
  assert.match(provision, /voiceMaxSessionSecondsOverride/);
  assert.doesNotMatch(provision, /createUser|inviteUserByEmail|personal_subscriptions/);
  assert.match(access, /authorizeProfessionalIntroducer\(\{ request \}\)/);
  assert.match(access, /demoOrganisationId/);
  assert.match(access, /server_termination_ready/);
  assert.match(identity, /fetch\("\/api\/introducer\/access"/);
  assert.match(identity, /source: "verified_introducer_grant"/);
  assert.match(launchKit, /identity\.introducerDemo\?\.enabled/);
  assert.match(launchKit, /identity\.introducerDemo\.organisationId/);
  assert.match(launchKit, /api\/organisation\/insights/);
});
