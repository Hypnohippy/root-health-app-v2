import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { corporateEmailUrl } from "../lib/corporateEmailUrl.js";

test("Corporate emails use the configured Preview origin and preserve invitation parameters", () => {
  for (const origin of ["https://preview.example.test", "https://preview.example.test/"]) {
    for (const path of ["/workplace-applications", "/workplace-setup", "/organisation/join"]) {
      assert.equal(corporateEmailUrl(path, origin), "https://preview.example.test" + path);
    }
    const token = "test+/token";
    const link = corporateEmailUrl("/workplace-setup", origin) + "?token=" + encodeURIComponent(token);
    assert.equal(new URL(link).searchParams.get("token"), token);
  }
});

test("missing or malformed site configuration never falls back to production", () => {
  for (const origin of ["", " ", "not-a-url", "javascript:alert(1)", "https://user:pass@example.test",
    "https://example.test/path", "https://example.test?next=other"]) {
    assert.throws(() => corporateEmailUrl("/workplace-setup", origin));
  }
  for (const path of ["https://other.test", "//other.test", "/\\other.test"]) {
    assert.throws(() => corporateEmailUrl(path, "https://preview.example.test"));
  }
});

test("all Corporate email entry points use the helper, not production or request origins", () => {
  for (const file of [
    "app/api/organisation/apply/route.js",
    "app/api/organisation/applications/route.js",
    "app/api/stripe/workplace-webhook/route.js",
    "app/api/organisation/workforce-invitations/route.js",
  ]) {
    const source = fs.readFileSync(file, "utf8");
    assert.match(source, /import \{ corporateEmailUrl \}/);
    assert.match(source, /corporateEmailUrl\("\/(workplace-applications|workplace-setup|organisation\/join)"\)/);
    assert.doesNotMatch(source, /https:\/\/(www\.)?roothealth\.app/);
    assert.doesNotMatch(source, /new URL\(request.url\).origin/);
  }
});
