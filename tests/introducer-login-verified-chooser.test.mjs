import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const login = await readFile(new URL("../components/RootLoginClient.js", import.meta.url), "utf8");
const chooser = await readFile(new URL("../app/choose-experience/page.js", import.meta.url), "utf8");
const identity = await readFile(new URL("../lib/rootIdentity.js", import.meta.url), "utf8");

test("introducer login with exact destination reaches the server-verified chooser", () => {
  assert.match(login, /isIntroducerCustomer && new URLSearchParams\(window\.location\.search\)\.get\("next"\) === "\/introducer"/);
  assert.match(login, /window\.location\.href = "\/choose-experience";/);
  assert.doesNotMatch(login, /window\.location\.href = "\/introducer";/);
});

test("chooser uses fresh verified identity and enforces capability checks", () => {
  assert.match(chooser, /getRootIdentity\(\)/);
  assert.match(chooser, /identity\.capabilities\?\.canUseWorkplace/);
  assert.match(identity, /fetch\("\/api\/introducer\/access"/);
  assert.match(identity, /Authorization: `Bearer \$\{session\.access_token\}`/);
});
