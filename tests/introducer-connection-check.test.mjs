import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("introducer diagnostic is strict Production-only, admin-gated and non-mutating while activation is enabled or disabled", async () => {
  const route = await readFile(new URL("../app/api/admin/introducers/connection-check/route.js", import.meta.url), "utf8");
  assert.match(route, /VERCEL_ENV !== "production"/);
  assert.match(route, /!\["true", "false"\]\.includes\(process\.env\.ROOT_INTRODUCER_ONBOARDING_ENABLED\)/);
  assert.match(route, /await rootAgreementAccess\(request\)/);
  assert.match(route, /VERCEL_PROJECT_ID !== ROOT_COMMERCIAL_VERCEL_PROJECT_ID/);
  assert.match(route, /VERCEL_GIT_COMMIT_REF !== "main"/);
  assert.match(route, /method: "GET"/);
  assert.match(route, /"x-vercel-trusted-oidc-idp-token": token/);
  assert.match(route, /redirect: "manual"/);
  assert.match(route, /response.status === 405/);
  assert.doesNotMatch(route, /method: "POST"|generateLink|mailer|sendIntroducerActivation|insert\(|update\(/);
});

test("diagnostic page uses current Supabase session and sends no user credentials to third parties", async () => {
  const page = await readFile(new URL("../app/admin/introducer-connection-check/page.js", import.meta.url), "utf8");
  assert.match(page, /supabase.auth.getSession\(\)/);
  assert.match(page, /\/api\/admin\/introducers\/connection-check/);
  assert.doesNotMatch(page, /localStorage|console\.log|\/api\/internal\/introducer-onboarding/);
});
