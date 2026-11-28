import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const gateway = await readFile(new URL("../app/introducer/page.js", import.meta.url), "utf8");
const chooser = await readFile(new URL("../app/choose-experience/page.js", import.meta.url), "utf8");
const identity = await readFile(new URL("../lib/rootIdentity.js", import.meta.url), "utf8");

test("signed-in introducer gateway selects the verified chooser without exposing protected content", () => {
  assert.match(gateway, /^"use client";/);
  assert.match(gateway, /supabase\.auth\.getSession\(\)/);
  assert.match(gateway, /data\?\.session\?\.access_token/);
  assert.match(gateway, /window\.location\.replace\("\/choose-experience"\)/);
  assert.match(gateway, /<Link href="\/login\?next=%2Fintroducer"/);
  assert.doesNotMatch(gateway, /\/api\/admin|service.role|insert\(|update\(/);
});
test("chooser performs fresh verification and is fail-closed", () => {
  assert.match(chooser, /getRootIdentity\(\)/);
  assert.match(chooser, /Access could not be verified/);
  assert.match(identity, /fetch\("\/api\/introducer\/access"/);
  assert.match(identity, /Authorization: `Bearer \$\{session\.access_token\}`/);
});
