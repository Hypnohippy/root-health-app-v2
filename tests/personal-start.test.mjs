import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { rememberPersonalReferral, personalReferralUrl } from "../lib/personalReferralJourney.js";

const source = fs.readFileSync("app/start/page.js", "utf8");
// Execute the page's actual effect with isolated browser dependencies.
const effect = source.match(/useEffect\(\(\) => \{([\s\S]*?)\n  \}, \[\]\);/)[1];
async function start(search, valid = false, stored = "") {
  const values = new Map(stored ? [["root_personal_referral_code", stored]] : []);
  const result = { state: "loading", code: "", calls: [] };
  const storage = {
    getItem: key => values.get(key),
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  };
  vm.runInNewContext(`(() => {${effect}})()`, {
    window: { location: { search } }, localStorage: storage,
    URLSearchParams, AbortController, encodeURIComponent, rememberPersonalReferral,
    setState: value => { result.state = value; },
    setCode: value => { result.code = value; },
    fetch: async (url, options) => {
      result.calls.push({ url, body: JSON.parse(options.body) });
      return { ok: true, json: async () => ({ valid, referralCode: "test-personal" }) };
    },
  });
  await new Promise(resolve => setImmediate(resolve));
  result.stored = storage.getItem("root_personal_referral_code") || "";
  result.links = ["/capacity-check", "/personal/join"].map(path => personalReferralUrl(path, result.code));
  assert.match(source, /\["direct", "valid", "invalid"\]\.includes\(state\)/);
  return result;
}

test("no-ref start skips validation and offers direct onward links", async () => {
  for (const search of ["", "?ref=", "?ref=%20"]) {
    const result = await start(search);
    assert.equal(result.state, "direct");
    assert.equal(result.calls.length, 0);
    assert.deepEqual(result.links, ["/capacity-check", "/personal/join"]);
  }
});
test("no-ref start clears stale stored referral", async () => {
  const result = await start("", false, "old-referral");
  assert.equal(result.stored, "");
  assert.equal(result.code, "");
  assert.equal(result.calls.length, 0);
});
test("valid start referral is validated and retained in onward links", async () => {
  const result = await start("?ref=test-personal", true);
  assert.equal(result.state, "valid");
  assert.equal(result.stored, "test-personal");
  assert.deepEqual(result.calls, [{ url: "/api/referral/validate", body: { referralCode: "test-personal", market: "personal" } }]);
  assert.deepEqual(result.links, ["/capacity-check?ref=test-personal", "/personal/join?ref=test-personal"]);
});
test("invalid start referral clears stale code and permits direct exploration", async () => {
  const result = await start("?ref=invalid", false, "old-referral");
  assert.equal(result.state, "invalid");
  assert.equal(result.stored, "");
  assert.deepEqual(result.links, ["/capacity-check", "/personal/join"]);
});
