import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const routes = [
  "personal-checkout",
  "workplace-checkout",
  "personal-webhook",
  "workplace-webhook",
];

test("Stripe SDK clients are created only inside request-time helpers", async () => {
  for (const route of routes) {
    const source = await readFile(new URL(`../app/api/stripe/${route}/route.js`, import.meta.url), "utf8");
    assert.match(source, /function getStripe\(\)/, `${route} should have a lazy client factory`);
    assert.doesNotMatch(source, /const stripe\s*=\s*new Stripe\(/, `${route} must not construct Stripe at module load`);
    assert.match(source, /new Stripe\(secret\)/, `${route} should preserve the configured secret-key behavior`);
  }
});

test("unconfigured Stripe secrets remain request-time failures without fabricated credentials", async () => {
  const sources = await Promise.all(routes.map((route) => readFile(
    new URL(`../app/api/stripe/${route}/route.js`, import.meta.url), "utf8",
  )));
  for (const source of sources) {
    assert.match(source, /process\.env\.STRIPE_SECRET_KEY/);
    assert.match(source, /Stripe is not configured\./);
  }
});
