import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
const page = await readFile(new URL("../app/introducer/change-password/page.js", import.meta.url), "utf8");

test("password change requires a real session, current verified user and server-side introducer grant", () => {
  assert.match(page, /supabase\.auth\.getSession\(\)/);
  assert.match(page, /supabase\.auth\.getUser\(\)/);
  assert.match(page, /fetch\("\/api\/introducer\/access"/);
  assert.match(page, /response\.ok/);
  assert.match(page, /access\.userId !== user\.id/);
  assert.match(page, /state === "unavailable"/);
});

test("password is only updated on user submit, with confirmation and Supabase policy enforcement", () => {
  assert.match(page, /onSubmit=\{save\}/);
  assert.match(page, /password !== confirm/);
  assert.match(page, /password\.length < 12/);
  assert.match(page, /supabase\.auth\.updateUser\(\{ password \}\)/);
  assert.match(page, /supabase\.auth\.signOut\(\)/);
  assert.doesNotMatch(page, /auth\.admin|service.role|resetPasswordForEmail/);
});

test("no email, bypass, or data modification on page load", () => {
  assert.match(page, /if \(saving \|\| state !== "ready"\) return/);
  assert.doesNotMatch(page, /createUser\(|inviteUserByEmail|setSession\(/);
});
