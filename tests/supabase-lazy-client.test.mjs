import test from "node:test";
import assert from "node:assert/strict";
import { createLazySupabaseClient } from "../lib/supabase.js";

test("Supabase client construction is deferred until first use", () => {
  let calls = 0;
  const client = createLazySupabaseClient({
    readEnvironment: () => ({ url: "https://preview.example", anonKey: "public-key" }),
    createClientImpl: (url, key) => {
      calls += 1;
      return { auth: { url, key } };
    },
  });

  assert.equal(calls, 0);
  assert.deepEqual(client.auth, { url: "https://preview.example", key: "public-key" });
  assert.equal(calls, 1);
  assert.equal(client.auth.key, "public-key");
  assert.equal(calls, 1);
});

test("missing environment values fail only when a Supabase operation is attempted", () => {
  const client = createLazySupabaseClient({
    readEnvironment: () => ({ url: "", anonKey: undefined }),
    createClientImpl: () => assert.fail("Supabase must not be constructed without configuration"),
  });

  assert.ok(client);
  assert.throws(() => client.auth, /Supabase is not configured/);
});

test("Supabase methods retain the real client as their receiver", () => {
  const expected = { marker: true };
  const client = createLazySupabaseClient({
    readEnvironment: () => ({ url: "preview", anonKey: "public" }),
    createClientImpl: () => ({ getMarker() { return this.marker; }, marker: expected.marker }),
  });

  assert.equal(client.getMarker(), true);
});
