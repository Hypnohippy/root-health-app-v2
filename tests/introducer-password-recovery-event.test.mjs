import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
const page = await readFile(new URL("../app/reset-password/page.js", import.meta.url), "utf8");

test("recovery callback event enables password entry after Supabase consumes one-time URL tokens", () => {
  assert.match(page, /supabase\.auth\.onAuthStateChange\(/);
  assert.match(page, /event !== "PASSWORD_RECOVERY" \|\| !session/);
  assert.match(page, /setLinkType\("recovery"\)/);
  assert.match(page, /setRecoveryReady\(true\)/);
  assert.match(page, /subscription\.unsubscribe\(\)/);
});

test("normal session or SIGNED_IN alone cannot enable password reset", () => {
  assert.match(page, /hashParams\.has\("access_token"\)/);
  assert.match(page, /callbackType === "recovery" \|\| callbackType === "invite"/);
  assert.match(page, /if \(!recoveryReady \|\| !session\)/);
  assert.match(page, /if \(!active \|\| event !== "PASSWORD_RECOVERY" \|\| !session\) return/);
});

test("safe return destination is exact and never arbitrary query input", () => {
  assert.match(page, /next === "\/introducer" \? "\?next=%2Fintroducer" : ""/);
  assert.match(page, /returnToIntroducer/);
  assert.match(page, /supabase\.auth\.updateUser\(\{ password \}\)/);
});
