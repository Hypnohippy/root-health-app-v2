import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildOwnedPlaybookInsert, buildOwnedPlaybookUpdate } from "../lib/personalPlaybookOwnership.js";

test("Personal Playbook inserts always use the server-authenticated user", () => {
  const row = buildOwnedPlaybookInsert({
    authenticatedUserId: "authenticated-user",
    user_id: "browser-attacker",
    profileKey: "owned-profile",
    title: "Plan",
    content: "Content",
  });
  assert.equal(row.user_id, "authenticated-user");
  assert.equal(row.profile_key, "owned-profile");
});

test("Personal Playbook updates retain authenticated ownership", () => {
  const update = buildOwnedPlaybookUpdate({
    authenticatedUserId: "authenticated-user",
    user_id: "browser-attacker",
    content: "Revised content",
  });
  assert.deepEqual(update, { user_id: "authenticated-user", content: "Revised content" });
});

test("the Personal route validates profiles.user_id and never reads browser user_id", async () => {
  const route = await readFile(new URL("../app/api/personal-playbook/route.js", import.meta.url), "utf8");
  assert.match(route, /auth\.getUser\(authenticated\.accessToken\)/);
  assert.match(route, /\.eq\("user_id", userData\.user\.id\)/);
  assert.match(route, /authenticatedUserId: ownership\.userId/);
  assert.doesNotMatch(route, /body\.user_id|body\.userId/);
});

test("Voice create and update persist the authenticated user and scope existing lookup", async () => {
  const route = await readFile(new URL("../app/api/voice-actions/route.js", import.meta.url), "utf8");
  assert.match(route, /\.eq\("user_id", userData\.user\.id\)[\s\S]*?\.eq\("profile_key", profileKey\)/);
  assert.ok((route.match(/user_id: userData\.user\.id/g) || []).length >= 2);
  assert.doesNotMatch(route, /user_id:\s*body\./);
});

test("manual creation and reviewed updates use the authenticated server route", async () => {
  const page = await readFile(new URL("../app/playbook/page.js", import.meta.url), "utf8");
  assert.ok((page.match(/fetch\("\/api\/personal-playbook"/g) || []).length >= 2);
  assert.doesNotMatch(page, /from\("playbook_entries"\)\.insert/);
  assert.doesNotMatch(page, /from\("playbook_entries"\)[\s\S]{0,100}\.update/);
});

test("Text Coach still has no direct database mutation path", async () => {
  const route = await readFile(new URL("../app/api/root-coach/route.js", import.meta.url), "utf8");
  assert.doesNotMatch(route, /from\("playbook_entries"\).*?(?:insert|update)/s);
});
