import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pagePath = new URL("../app/organisation-structure/page.js", import.meta.url);
const learningPath = new URL("../app/organisation-learning/page.js", import.meta.url);
const navigatorPath = new URL("../lib/rootNavigator.js", import.meta.url);
const navPath = new URL("../components/Nav.js", import.meta.url);

test("Organisation Structure & People preserves the organisation_admin boundary", async () => {
  const source = await readFile(pagePath, "utf8");

  assert.match(source, /activeMembership\.role !== "organisation_admin"/);
  assert.match(source, /membership\?\.role !== "organisation_admin"/);
  assert.doesNotMatch(source, /department\s*===\s*["']HR/);
});

test("the page uses the existing organisation structure tables and ownership fields", async () => {
  const source = await readFile(pagePath, "utf8");

  assert.match(source, /from\("organisation_units"\)/);
  assert.match(source, /from\("organisation_members"\)/);
  assert.match(source, /\.eq\("organisation_id", organisationId\)/);
  assert.match(source, /organisation_unit_id/);
  assert.match(source, /parent_unit_id/);
  assert.match(source, /created_by: user\.id/);
});

test("the additive page exposes the approved setup actions and keeps final confirmation disabled", async () => {
  const source = await readFile(pagePath, "utf8");

  assert.match(source, />Add people</);
  assert.match(source, />Upload staff spreadsheet</);
  assert.match(source, /setShowWorkforceImport\(true\)/);
  assert.match(source, />Build structure</);
  assert.match(source, /This is where you add your people and organise them into the right departments and teams\./);
});

test("Organisation Learning links organisation admins to the new route", async () => {
  const source = await readFile(learningPath, "utf8");

  assert.match(source, /membership\?\.role === "organisation_admin"/);
  assert.match(source, /router\.push\("\/organisation-structure"\)/);
  assert.match(source, /Organisation Structure &amp; People/);
});

test("the shared navigator recognises the new page as a Workplace route", async () => {
  const source = await readFile(navigatorPath, "utf8");
  assert.match(source, /"\/organisation-structure"/);
});

test("Workplace navigation exposes Structure & People only to the active organisation admin", async () => {
  const source = await readFile(navPath, "utf8");

  assert.match(source, /identity\?\.workplace\?\.activeOrganisation/);
  assert.match(source, /activeWorkplaceMembership\?\.role === "organisation_admin"/);
  assert.match(source, /href: "\/organisation-structure"/);
  assert.match(source, /label: "Structure & People"/);
});

test("the structure page links visibly back to Organisation Learning", async () => {
  const source = await readFile(pagePath, "utf8");

  assert.match(source, /href="\/organisation-learning"/);
  assert.match(source, /← Back to Organisation Learning/);
});

test("the expanded Workplace navigation collapses before narrow desktop widths", async () => {
  const source = await readFile(navPath, "utf8");

  assert.match(source, /@media \(max-width: 960px\)/);
  assert.match(source, /@media \(min-width: 961px\)/);
});
