import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const ui = await readFile(new URL("../components/IntroducerDemoAccess.js", import.meta.url), "utf8");
const agreement = await readFile(new URL("../components/IntroducerGoogleAgreement.js", import.meta.url), "utf8");

test("activation panel is lazy and attached to verified agreement card", () => {
  assert.match(agreement, /<IntroducerDemoAccess introducer=\{introducer\}/);
  assert.match(ui, /if \(expanded\)/);
  assert.match(ui, /onClick=\{toggle\}/);
});

test("Root server remains the acceptance and state authority", () => {
  assert.match(ui, /\/api\/admin\/introducers\/onboarding\?/);
  assert.match(ui, /onboarding\?\.agreementReady/);
  assert.match(ui, /onboarding\?\.agreement\?\.verified/);
  assert.match(ui, /send_invitation/);
  assert.match(ui, /replace_invitation/);
  assert.doesNotMatch(ui, /supabase\.from\(/);
  assert.doesNotMatch(ui, /service_role|SUPABASE_SERVICE_ROLE_KEY/);
});

test("activation uses authenticated, confirmed, no-store requests and displays uncertainty", () => {
  assert.match(ui, /supabase\.auth\.getSession\(\)/);
  assert.match(ui, /Authorization: "Bearer " \+ token/);
  assert.match(ui, /cache: "no-store"/);
  assert.match(ui, /window\.confirm\(/);
  assert.match(ui, /activation_uncertain/);
  assert.match(ui, /Do not retry if email delivery becomes uncertain/);
});

test("the operator can inspect status without generating or accepting a new agreement", () => {
  assert.match(ui, /Refresh activation status/);
  assert.doesNotMatch(ui, /google-agreements|accept_introducer_agreement|Generate Agreement/);
});
