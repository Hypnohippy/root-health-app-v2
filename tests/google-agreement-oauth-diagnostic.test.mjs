import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("Google OAuth diagnostic is administrator-only and rejects non-production or enabled onboarding", async () => {
  const source = await readFile(new URL("../app/api/admin/introducers/google-oauth-check/route.js", import.meta.url), "utf8");
  assert.match(source, /VERCEL_ENV !== "production"/);
  assert.match(source, /VERCEL_PROJECT_ID !== ROOT_COMMERCIAL_VERCEL_PROJECT_ID/);
  assert.match(source, /VERCEL_GIT_COMMIT_REF !== "main"/);
  assert.match(source, /ROOT_INTRODUCER_ONBOARDING_ENABLED !== "false"/);
  assert.match(source, /await rootAgreementAccess\(request\)/);
  assert.match(source, /oauth2\.googleapis\.com\/token/);
  assert.match(source, /refresh_token/);
  assert.doesNotMatch(source, /sendIntroducerActivation|generateLink|from\(|insert\(|update\(|console\.log|logger|response\.text\(/);
});
