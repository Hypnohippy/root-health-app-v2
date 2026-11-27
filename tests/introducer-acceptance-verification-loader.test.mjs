import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const loader = await readFile(new URL("../lib/introducerGoogleAgreementServer.js", import.meta.url), "utf8");
const verifier = await readFile(new URL("../lib/professionalIntroducerOnboarding.server.js", import.meta.url), "utf8");

test("agreement loader selects the authoritative introducer status", () => {
  assert.match(loader, /select\('id,name,status,contact_name,contact_email,introducer_market/);
  assert.match(verifier, /intro\.status !== "active"/);
});

test("agreement loader includes the accepted frozen terms and recorded hash", () => {
  assert.match(loader, /select\('agreement_id,id,accepted_at,evidence,archive_state,deliveries,terms_snapshot,terms_hash'\)/);
  assert.match(verifier, /acceptance\.terms_hash !== latest\.terms_hash/);
  assert.match(verifier, /termsHash\(acceptance\.terms_snapshot\) !== latest\.terms_hash/);
});

test("do not bypass verified acceptance requirements", () => {
  assert.match(verifier, /acceptance\.archive_state !== "archived"/);
  assert.match(verifier, /termsHash\(latest\.accepted_terms_snapshot\) !== latest\.terms_hash/);
  assert.match(verifier, /recipient !== evidenceEmail/);
  assert.match(verifier, /!currentTermsMatch/);
});
