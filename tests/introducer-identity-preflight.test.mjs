import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
const route = await readFile(new URL("../app/api/internal/introducer-onboarding/route.js", import.meta.url), "utf8");

test("signed Preview preflight is read-only and tests exact isolated customer identity", () => {
  assert.match(route,/\["preflight","prepare","replace","sent","revoke"\]/);
  assert.match(route,/assertion\.action!==body\.action/);
  const start = route.indexOf('if(body.action==="preflight")');
  const end = route.indexOf('if(body.action==="prepare" || body.action==="replace")');
  assert.ok(start>0&&end>start);
  const block=route.slice(start,end);
  assert.match(block,/introducerCustomerOrigin\(process\.env\)/);
  assert.match(block,/assertion\.customerVercelProjectId!==INTRODUCER_PREVIEW_PROJECT_ID/);
  assert.match(block,/assertion\.customerSupabaseProjectRef!==INTRODUCER_PREVIEW_SUPABASE_REF/);
  assert.match(block,/db\.auth\.admin\.listUsers/);
  assert.match(block,/code:"existing_account"/);
  assert.doesNotMatch(block,/generateLink|createUser|deleteUser|\.insert\(|\.update\(|mail|actionLink/);
});
