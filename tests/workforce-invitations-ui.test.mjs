import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../app/organisation-structure/page.js", import.meta.url), "utf8");

function paginationHarness(rpc) {
  const state = {};
  const body = source.slice(source.indexOf("  async function refreshInvitations("), source.indexOf("  async function sendInvitations("));
  const build = new Function("organisation", "workforceSearch", "supabase", "invitationRequest", "setInvitationLoading", "setInvitationLoadError", "setWorkforceRows", "setInvitationCounts", "setInvitationPage", `${body}; return refreshInvitations;`);
  const set = (key) => (value) => { state[key] = value; };
  return { state, refresh: build({ id: "org" }, "", { rpc }, { current: 0 }, set("loading"), set("error"), set("rows"), set("counts"), set("page")) };
}

test("workforce presentation has five separate accessible columns and named checkboxes", () => {
  const headings = [...source.matchAll(/<th scope="col"[^>]*>(.*?)<\/th>/g)].map((match) => match[1].replace(/<[^>]+>/g, ""));
  assert.deepEqual(headings, ["Select", "Person", "Business email", "Organisational placement", "Invitation status"]);
  assert.match(source, /aria-label=\{`Select \$\{person.name/);
  assert.match(source, /<th scope="row" className="workforcePerson"/);
  assert.match(source, /workforceStatus.*person.root_status/);
});

test("responsive list stays bounded and provides focus styling and mobile field labels", () => {
  assert.match(source, /\.workforceTableViewport\{max-height:540px;overflow:auto/);
  assert.match(source, /@media\(max-width:640px\)/);
  assert.match(source, /content:attr\(data-label\)/);
  assert.match(source, /\.workforcePanel input:focus-visible/);
  assert.match(source, /aria-busy=\{invitationLoading\}/);
});

test("action bar preserves page-scoped selection, eligibility and existing send callback", () => {
  assert.match(source, /setSelectedPeople\(new Set\(workforceRows.filter\(\(person\) => person.eligible\).map\(\(person\) => person.id\)\)\)/);
  assert.match(source, /disabled=\{!person.eligible\} checked=\{selectedPeople.has\(person.id\)\}/);
  assert.match(source, /onClick=\{sendInvitations\} disabled=\{sendingInvitations \|\| selectedPeople.size === 0\}/);
  assert.match(source, /Send invitations \(\$\{selectedPeople.size\}\)/);
  assert.match(source, /aria-label="Manual invitation option"/);
  assert.match(source, /onClick=\{copyJoinLink\} disabled=\{!organisation\?\.organisation_code\}/);
});

test("pagination requests one bounded cursor page and replaces displayed rows", async () => {
  const calls = [];
  const { refresh, state } = paginationHarness(async (name, args) => {
    calls.push({ name, args });
    return { data: { rows: [{ id: args.p_after || "first" }], total: 201, next_cursor: "next", counts: { joined: 2 } } };
  });
  const cutoff = "2026-09-07T00:00:00.000Z";
  await refresh("Operations", [], cutoff);
  await refresh("Operations", ["cursor-1"], cutoff);
  assert.equal(calls[1].name, "list_workforce_invitations");
  assert.deepEqual(calls[1].args, { p_org: "org", p_search: "Operations", p_status: "all", p_after: "cursor-1", p_limit: 100, p_cutoff: cutoff, p_eligible_only: false });
  assert.deepEqual(state.rows, [{ id: "cursor-1" }]);
  assert.deepEqual(state.page.trail, ["cursor-1"]);
  assert.equal(state.loading, false);
  await refresh("New search");
  assert.equal(calls[2].args.p_after, null);
  assert.deepEqual(state.page.trail, []);
});

test("stale search responses cannot replace the latest displayed results", async () => {
  const pending = [];
  const { refresh, state } = paginationHarness(() => new Promise((resolve) => pending.push(resolve)));
  const older = refresh("Old");
  const newer = refresh("New");
  pending[1]({ data: { rows: [{ id: "new" }] } });
  await newer;
  pending[0]({ data: { rows: [{ id: "old" }] } });
  await older;
  assert.deepEqual(state.rows, [{ id: "new" }]);
  assert.equal(state.loading, false);
});

test("failed list reads expose a retry message and release loading state", async () => {
  const { refresh, state } = paginationHarness(async () => ({ error: new Error("Read failed") }));
  await refresh();
  assert.match(state.error, /try again/);
  assert.equal(state.loading, false);
  assert.equal(state.rows, undefined);
});
