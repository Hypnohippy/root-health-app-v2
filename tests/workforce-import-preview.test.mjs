import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  buildSourceColumns,
  buildWorkforcePreview,
  createCanonicalWorkforceRows,
  proposeWorkforceMappings,
  validateWorkforcePreview,
} from "../lib/workforceImportPreview.js";

const componentPath = new URL("../components/workplace/WorkforceImportPreview.js", import.meta.url);
const pagePath = new URL("../app/organisation-structure/page.js", import.meta.url);

function sampleInput() {
  const headings = ["Worker Name", "Business Email", "Division", "Cost Centre", "Reports To", "Employee Number", "Office"];
  const rows = [
    ["Asha Reed", "asha@example.com", "Operations", "Logistics", "manager@example.com", "E-101", "London"],
    ["Morgan Lee", "manager@example.com", "Operations", "Leadership", "", "E-102", "London"],
  ];
  const columns = buildSourceColumns(headings, rows);
  const mappings = proposeWorkforceMappings(columns);
  return { headings, rows, columns, mappings };
}

test("adaptive headings map into neutral canonical workforce fields", () => {
  const { columns, mappings } = sampleInput();
  const byHeading = Object.fromEntries(columns.map((column) => [column.heading, mappings[column.key]]));

  assert.equal(byHeading["Worker Name"].field, "name");
  assert.equal(byHeading["Business Email"].field, "email");
  assert.equal(byHeading.Division.field, "division");
  assert.equal(byHeading["Cost Centre"].field, "team");
  assert.equal(byHeading["Reports To"].field, "manager");
  assert.equal(byHeading["Employee Number"].field, "employee_id");
  assert.equal(byHeading.Office.field, "location");
});

test("mapping changes are lossless and ignored columns can be deliberately excluded", () => {
  const columns = buildSourceColumns(["Person", "Unneeded Payroll Note"], [["Sam", "private note"]]);
  const mappings = {
    column_0: { field: "name", reviewed: true, confidence: "high" },
    column_1: { field: "ignore", reviewed: true, confidence: "high" },
  };
  const rows = createCanonicalWorkforceRows([["Sam", "private note"]], columns, mappings);
  const validation = validateWorkforcePreview({ rows, columns, mappings });

  assert.equal(rows[0].name, "Sam");
  assert.equal(Object.values(rows[0]).includes("private note"), false);
  assert.equal(validation.issues.some((item) => item.field === "column_1"), false);
});

test("preview reports invalid and duplicate identity, placement, manager and existing-member issues", () => {
  const headings = ["Name", "Email", "Department", "Manager", "Employee ID"];
  const sourceRows = [
    ["Alex One", "alex@example.com", "", "Two Alexes", "REF-1"],
    ["Two Alexes", "alex@example.com", "Finance", "", "REF-1"],
    ["Two Alexes", "not-an-email", "Finance", "", "REF-3"],
  ];
  const columns = buildSourceColumns(headings, sourceRows);
  const mappings = proposeWorkforceMappings(columns);
  const preview = buildWorkforcePreview({
    rows: sourceRows,
    columns,
    mappings,
    existingMembers: [{ email: "alex@example.com" }],
  });
  const types = new Set(preview.validation.issues.map((item) => item.type));

  for (const type of ["invalid_email", "duplicate_email", "duplicate_employee_id", "missing_placement", "ambiguous_manager", "existing_member"]) {
    assert.equal(types.has(type), true, `expected ${type}`);
  }
  assert.equal(preview.summary.people, 3);
  assert.equal(preview.summary.departments, 1);
});

test("preview hierarchy remains proposed data and does not write live organisation tables", async () => {
  const component = await readFile(componentPath, "utf8");
  const page = await readFile(pagePath, "utf8");

  assert.match(component, /accept="\.xlsx,\.csv"/);
  assert.match(component, /await import\("xlsx"\)/);
  assert.match(component, /Preview only — no live changes/);
  assert.match(component, /Confirm structure &amp; prepare invitations · Coming next/);
  assert.doesNotMatch(component, /supabase|organisation_members"\)\.insert|organisation_units"\)\.insert/);
  assert.match(page, /activeMembership\.role !== "organisation_admin"/);
});

test("spreadsheet labels never become Root authorisation roles", () => {
  const columns = buildSourceColumns(
    ["Job Title", "Department", "Name", "Email"],
    [["HR Administrator", "HR", "Taylor", "taylor@example.com"]]
  );
  const mappings = proposeWorkforceMappings(columns);
  const rows = createCanonicalWorkforceRows(
    [["HR Administrator", "HR", "Taylor", "taylor@example.com"]],
    columns,
    mappings
  );

  assert.equal(rows[0].job_title, "HR Administrator");
  assert.equal(rows[0].department, "HR");
  assert.equal(Object.hasOwn(rows[0], "role"), false);
});

test("future repeat-upload comparison inputs retain stable employee and source provenance", () => {
  const { rows, columns, mappings } = sampleInput();
  const preview = buildWorkforcePreview({ rows, columns, mappings });

  assert.equal(preview.canonicalRows[0].employee_id, "E-101");
  assert.equal(preview.canonicalRows[0].source_row, 2);
  assert.equal(columns[0].heading, "Worker Name");
  assert.equal(mappings.column_0.suggestedField, "name");
});
