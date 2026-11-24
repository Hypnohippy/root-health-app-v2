import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createSupabaseKeyCompatibleClient } from "../lib/supabaseKeyCompatibleClient.js";
import { selectSupabaseAdminKey, selectSupabasePublicKey } from "../lib/supabaseCredentialPolicy.js";

const projectUrl = "https://waluyphoafylzcjuskcl.supabase.co";
const publishableKey = "sb_publishable_test_fixture";
const secretKey = "sb_secret_test_fixture";
const userToken = "eyJhbGciOiJub25lIn0.fixture-user-token";

function captureFetch(body = "[]") {
  const calls = [];
  const fetchImpl = async (input, init = {}) => {
    calls.push({ url: String(input), headers: new Headers(init.headers) });
    return new Response(body, {
      status: 200,
      headers: { "Content-Type": "application/json", "Content-Range": "0-0/1" },
    });
  };
  return { calls, fetchImpl };
}

test("introducer public key selection requires the isolated project's publishable key", () => {
  assert.equal(selectSupabasePublicKey({
    projectRef: "waluyphoafylzcjuskcl",
    publishableKey,
    legacyAnonKey: "legacy-fixture",
  }), publishableKey);
  assert.throws(() => selectSupabasePublicKey({
    projectRef: "waluyphoafylzcjuskcl",
    legacyAnonKey: "legacy-fixture",
  }), /publishable key is not configured/);
  assert.throws(() => selectSupabasePublicKey({
    projectRef: "witkwlgldxjwwxmpcyva",
    introducerMarked: true,
    publishableKey,
    legacyAnonKey: "production-fixture",
  }), /not connected to its isolated Supabase project/);
});

test("customer public-key selection retains the existing legacy anon path", () => {
  assert.equal(selectSupabasePublicKey({
    projectRef: "witkwlgldxjwwxmpcyva",
    publishableKey,
    legacyAnonKey: "customer-anon-fixture",
  }), "customer-anon-fixture");
});

test("introducer server key selection requires sb_secret and never falls back to legacy", () => {
  assert.equal(selectSupabaseAdminKey({
    deployment: "introducer_verified",
    actualProjectRef: "waluyphoafylzcjuskcl",
    secretKey,
    legacyServiceRoleKey: "legacy-fixture",
  }), secretKey);
  assert.throws(() => selectSupabaseAdminKey({
    deployment: "introducer_verified",
    actualProjectRef: "waluyphoafylzcjuskcl",
    legacyServiceRoleKey: "legacy-fixture",
  }), /server secret is not configured/);
  assert.throws(() => selectSupabaseAdminKey({
    deployment: "introducer_verified",
    actualProjectRef: "witkwlgldxjwwxmpcyva",
    secretKey,
  }), /not connected to its isolated Supabase project/);
  assert.throws(() => selectSupabaseAdminKey({ deployment: "misconfigured", secretKey, legacyServiceRoleKey: "legacy-fixture" }), /deployment identity/);
});

test("customer server-key selection preserves its current credential path", () => {
  assert.equal(selectSupabaseAdminKey({ deployment: "customer", actualProjectRef: "witkwlgldxjwwxmpcyva", legacyServiceRoleKey: "customer-service-fixture" }), "customer-service-fixture");
});

test("new secret key is sent in apikey only for REST/admin requests", async () => {
  const { calls, fetchImpl } = captureFetch("{\"users\":[]}");
  const client = createSupabaseKeyCompatibleClient(projectUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  }, undefined, fetchImpl);

  await client.from("profiles").select("id");
  await client.auth.admin.listUsers();

  assert.equal(calls.length, 2);
  for (const call of calls) {
    assert.equal(call.headers.get("apikey"), secretKey);
    assert.equal(call.headers.has("authorization"), false);
  }
});

test("publishable key is apikey-only by default, while a user's bearer JWT is preserved", async () => {
  const anonymousCapture = captureFetch();
  const anonymousClient = createSupabaseKeyCompatibleClient(projectUrl, publishableKey, {}, undefined, anonymousCapture.fetchImpl);
  await anonymousClient.from("profiles").select("id");
  assert.equal(anonymousCapture.calls[0].headers.get("apikey"), publishableKey);
  assert.equal(anonymousCapture.calls[0].headers.has("authorization"), false);

  const userCapture = captureFetch();
  const userClient = createSupabaseKeyCompatibleClient(projectUrl, publishableKey, {
    global: { headers: { Authorization: `Bearer ${userToken}` } },
  }, undefined, userCapture.fetchImpl);
  await userClient.from("profiles").select("id");
  assert.equal(userCapture.calls[0].headers.get("apikey"), publishableKey);
  assert.equal(userCapture.calls[0].headers.get("authorization"), `Bearer ${userToken}`);
});

test("secret keys are rejected if a browser attempts to construct a client", () => {
  const hadWindow = Object.hasOwn(globalThis, "window");
  const originalWindow = globalThis.window;
  globalThis.window = {};
  try {
    assert.throws(() => createSupabaseKeyCompatibleClient(projectUrl, secretKey), /cannot be used in a browser/);
  } finally {
    if (hadWindow) globalThis.window = originalWindow;
    else delete globalThis.window;
  }
});

test("public browser client source does not reference server secret variables", async () => {
  const source = await readFile(new URL("../lib/supabasePublicKey.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY/);
});
