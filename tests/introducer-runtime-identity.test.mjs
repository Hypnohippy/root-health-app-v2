import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { GET, POST } from "../app/api/internal/introducer-runtime-identity/route.js";
import {
  inspectIntroducerRuntimeIdentity,
  runtimeDiagnosticConfigurationPasses,
  runtimeDiagnosticScopeAllowed,
} from "../lib/introducerRuntimeIdentity.server.js";
import { introducerRequestDecision } from "../lib/introducerRestrictedActions.server.js";
import { validateIsolatedSupabaseSecret } from "../lib/introducerRuntimeSecretValidation.server.js";

const EXPECTED_PROJECT_ID = "prj_5FntyaVgI1tQ7Q3IMKfkSTb2ETut";
const EXPECTED_BRANCH = "codex/professional-introducer-demo";
const ISOLATED_REF = "waluyphoafylzcjuskcl";
const PRODUCTION_REF = "witkwlgldxjwwxmpcyva";
const TEST_SECRET = "sb_secret_TEST_ONLY_never_a_real_credential";
const TEST_OPERATOR_TOKEN = "test_operator_token_32_bytes_minimum";

function validEnvironment(overrides = {}) {
  return {
    VERCEL_PROJECT_ID: EXPECTED_PROJECT_ID,
    VERCEL_ENV: "preview",
    VERCEL_GIT_COMMIT_REF: EXPECTED_BRANCH,
    ROOT_DEPLOYMENT_MODE: "introducer",
    NEXT_PUBLIC_ROOT_DEPLOYMENT_MODE: "introducer",
    PROFESSIONAL_INTRODUCER_DEMO_ENABLED: "true",
    ROOT_INTRODUCER_VERCEL_PROJECT_ID: EXPECTED_PROJECT_ID,
    ROOT_INTRODUCER_SUPABASE_PROJECT_REF: ISOLATED_REF,
    ROOT_PRODUCTION_SUPABASE_PROJECT_REF: PRODUCTION_REF,
    ROOT_AUTH_PREVIEW_URL: "https://root-health-introducer-demo-preview.vercel.app",
    NEXT_PUBLIC_SUPABASE_URL: `https://${ISOLATED_REF}.supabase.co`,
    SUPABASE_SECRET_KEY: TEST_SECRET,
    INTRODUCER_RUNTIME_SECRET_CHECK_TOKEN: TEST_OPERATOR_TOKEN,
    ...overrides,
  };
}

async function withEnvironment(values, callback) {
  const before = new Map(Object.keys(values).map((key) => [key, process.env[key]]));
  try {
    for (const [key, value] of Object.entries(values)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    return await callback();
  } finally {
    for (const [key, value] of before) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("runtime identity diagnostic returns only bounded checks for the isolated Preview", () => {
  const result = inspectIntroducerRuntimeIdentity(validEnvironment());
  assert.deepEqual(result, {
    deploymentProjectMatches: true,
    previewEnvironment: true,
    featureBranchMatches: true,
    introducerModeEnabled: true,
    supabaseUrlMatchesIsolatedProject: true,
    productionSupabaseReferenceExcluded: true,
    serverSecretPresent: true,
    serverSecretFormatMatches: true,
    serverSecretProjectIdentityVerified: false,
    completeDatabaseCredentialIdentityVerified: false,
    deploymentIdentityStatusMatchesGuard: true,
  });
  assert.ok(Object.values(result).every((value) => typeof value === "boolean"));
  assert.equal(runtimeDiagnosticScopeAllowed(result), true);
  assert.equal(runtimeDiagnosticConfigurationPasses(result), true);
  assert.equal(introducerRequestDecision("/api/internal/introducer-runtime-identity", validEnvironment()).type, "next");
});

test("deployment, branch, mode and database mismatches fail their bounded checks", () => {
  const cases = [
    [{ VERCEL_PROJECT_ID: "prj_customer" }, "deploymentProjectMatches"],
    [{ VERCEL_ENV: "production" }, "previewEnvironment"],
    [{ VERCEL_GIT_COMMIT_REF: "main" }, "featureBranchMatches"],
    [{ ROOT_DEPLOYMENT_MODE: "customer" }, "introducerModeEnabled"],
    [{ NEXT_PUBLIC_ROOT_DEPLOYMENT_MODE: undefined }, "introducerModeEnabled"],
    [{ PROFESSIONAL_INTRODUCER_DEMO_ENABLED: "false" }, "introducerModeEnabled"],
    [{ NEXT_PUBLIC_SUPABASE_URL: `https://${PRODUCTION_REF}.supabase.co` }, "supabaseUrlMatchesIsolatedProject"],
    [{ ROOT_INTRODUCER_SUPABASE_PROJECT_REF: "other-project" }, "supabaseUrlMatchesIsolatedProject"],
    [{ ROOT_PRODUCTION_SUPABASE_PROJECT_REF: "other-project" }, "productionSupabaseReferenceExcluded"],
    [{ NEXT_PUBLIC_SUPABASE_URL: "https://example.invalid" }, "productionSupabaseReferenceExcluded"],
  ];
  for (const [overrides, failedCheck] of cases) {
    assert.equal(inspectIntroducerRuntimeIdentity(validEnvironment(overrides))[failedCheck], false, failedCheck);
  }
});

test("server key presence and format are reported separately from project identity", () => {
  const missing = inspectIntroducerRuntimeIdentity(validEnvironment({ SUPABASE_SECRET_KEY: undefined }));
  assert.equal(missing.serverSecretPresent, false);
  assert.equal(missing.serverSecretFormatMatches, false);
  assert.equal(missing.serverSecretProjectIdentityVerified, false);

  const wrongFormat = inspectIntroducerRuntimeIdentity(validEnvironment({ SUPABASE_SECRET_KEY: "not-a-secret-key" }));
  assert.equal(wrongFormat.serverSecretPresent, true);
  assert.equal(wrongFormat.serverSecretFormatMatches, false);
  assert.equal(wrongFormat.serverSecretProjectIdentityVerified, false);

  const prefixOnly = inspectIntroducerRuntimeIdentity(validEnvironment({ SUPABASE_SECRET_KEY: "sb_secret_" }));
  assert.equal(prefixOnly.serverSecretPresent, true);
  assert.equal(prefixOnly.serverSecretFormatMatches, false);
});

test("GET response is no-store and emits only booleans, never config values or logs", async () => {
  const env = validEnvironment();
  const logged = [];
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;
  try {
    await withEnvironment(env, async () => {
      console.log = (...args) => logged.push(args);
      console.warn = (...args) => logged.push(args);
      console.error = (...args) => logged.push(args);

      const response = await GET();
      const body = await response.json();
      const serialized = JSON.stringify(body);

      assert.equal(response.status, 200);
      assert.match(response.headers.get("cache-control"), /no-store/);
      assert.equal(response.headers.get("x-content-type-options"), "nosniff");
      assert.ok(Object.values(body).every((value) => typeof value === "boolean"));
      assert.equal(body.serverSecretProjectIdentityVerified, false);
      assert.equal(body.completeDatabaseCredentialIdentityVerified, false);
      for (const value of [TEST_SECRET, TEST_OPERATOR_TOKEN, env.NEXT_PUBLIC_SUPABASE_URL, env.VERCEL_GIT_COMMIT_REF, EXPECTED_PROJECT_ID, ISOLATED_REF]) {
        assert.equal(serialized.includes(value), false);
      }
      assert.deepEqual(logged, []);
    });
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;
  }
});

test("wrong project, non-Preview, wrong branch or wrong mode is hidden with 404", async () => {
  const scopeMismatches = [
    { VERCEL_PROJECT_ID: "prj_customer" },
    { VERCEL_ENV: "production" },
    { VERCEL_GIT_COMMIT_REF: "main" },
    { ROOT_DEPLOYMENT_MODE: "customer" },
  ];
  for (const overrides of scopeMismatches) {
    const env = validEnvironment(overrides);
    await withEnvironment(env, async () => {
      const response = await GET();
      const body = await response.json();
      assert.equal(response.status, 404);
      assert.deepEqual(body, { error: "Not found." });
      assert.match(response.headers.get("cache-control"), /no-store/);
      for (const value of Object.values(env)) {
        if (typeof value === "string" && value) assert.equal(JSON.stringify(body).includes(value), false);
      }
    });
  }
});

test("an isolated Preview with a bad Supabase identity or key returns bounded 503 checks", async () => {
  const failures = [
    { NEXT_PUBLIC_SUPABASE_URL: `https://${PRODUCTION_REF}.supabase.co` },
    { SUPABASE_SECRET_KEY: undefined },
    { SUPABASE_SECRET_KEY: "wrong-key-format" },
  ];
  for (const overrides of failures) {
    const env = validEnvironment(overrides);
    await withEnvironment(env, async () => {
      const response = await GET();
      const body = await response.json();
      assert.equal(response.status, 503);
      assert.ok(Object.values(body).every((value) => typeof value === "boolean"));
      assert.equal(body.serverSecretProjectIdentityVerified, false);
      assert.equal(body.completeDatabaseCredentialIdentityVerified, false);
      assert.equal(JSON.stringify(body).includes(TEST_SECRET), false);
      assert.equal(JSON.stringify(body).includes(env.NEXT_PUBLIC_SUPABASE_URL), false);
    });
  }
});

test("GET stays no-network; temporary route has no direct Supabase client or logging", async () => {
  const source = await readFile(new URL("../app/api/internal/introducer-runtime-identity/route.js", import.meta.url), "utf8");
  assert.match(source, /TEMPORARY/);
  assert.match(source, /Vercel Authentication/);
  assert.match(source, /export async function POST/);
  assert.doesNotMatch(source, /createClient|\.from\s*\(|\.rpc\s*\(|fetch\s*\(|console\.(?:log|warn|error)/);
});

function authorizedRequest() {
  return new Request("https://preview.invalid/api/internal/introducer-runtime-identity", {
    method: "POST",
    headers: { "x-introducer-runtime-secret-check": TEST_OPERATOR_TOKEN },
  });
}

test("authorized POST validates only the hardcoded isolated endpoint and discards schema body", async () => {
  const env = validEnvironment({ INTRODUCER_RUNTIME_SECRET_CHECK_TOKEN: TEST_OPERATOR_TOKEN });
  const logged = [];
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;
  let fetchCount = 0;
  let cancelCount = 0;
  const originalFetch = globalThis.fetch;
  try {
    await withEnvironment(env, async () => {
      console.log = (...args) => logged.push(args);
      console.warn = (...args) => logged.push(args);
      console.error = (...args) => logged.push(args);
      globalThis.fetch = async (url, options) => {
        fetchCount += 1;
        assert.equal(url, `https://${ISOLATED_REF}.supabase.co/rest/v1/`);
        assert.equal(options.method, "GET");
        assert.equal(options.redirect, "manual");
        assert.equal(options.cache, "no-store");
        assert.deepEqual(Object.keys(options.headers), ["apikey"]);
        assert.equal(options.headers.apikey, TEST_SECRET);
        assert.equal(options.headers.Authorization, undefined);
        return {
          status: 200,
          redirected: false,
          body: { cancel: async () => { cancelCount += 1; } },
          async json() { throw new Error("response schema must not be read"); },
          async text() { throw new Error("response schema must not be read"); },
        };
      };

      const response = await POST(authorizedRequest());
      const body = await response.json();
      assert.equal(response.status, 200);
      assert.deepEqual(body, { accepted: true });
      assert.deepEqual(Object.keys(body), ["accepted"]);
      assert.equal(fetchCount, 1);
      assert.equal(cancelCount, 1);
      assert.equal(JSON.stringify(body).includes(TEST_SECRET), false);
      assert.equal(JSON.stringify(body).includes(TEST_OPERATOR_TOKEN), false);
      assert.equal(logged.length, 0);
    });
  } finally {
    globalThis.fetch = originalFetch;
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;
  }
});

test("invalid deployment identity blocks the privileged request before network access", async () => {
  const env = validEnvironment({
    INTRODUCER_RUNTIME_SECRET_CHECK_TOKEN: TEST_OPERATOR_TOKEN,
    VERCEL_PROJECT_ID: "prj_customer",
  });
  const originalFetch = globalThis.fetch;
  let fetchCount = 0;
  try {
    await withEnvironment(env, async () => {
      globalThis.fetch = async () => { fetchCount += 1; throw new Error("must not call network"); };
      const response = await POST(authorizedRequest());
      assert.equal(response.status, 404);
      assert.deepEqual(await response.json(), { error: "Not found." });
      assert.equal(fetchCount, 0);
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("missing or incorrectly formatted Supabase secret fails closed without a request", async () => {
  const originalFetch = globalThis.fetch;
  let fetchCount = 0;
  try {
    for (const key of [undefined, "not-a-supabase-secret"]) {
      const env = validEnvironment({
        INTRODUCER_RUNTIME_SECRET_CHECK_TOKEN: TEST_OPERATOR_TOKEN,
        SUPABASE_SECRET_KEY: key,
      });
      await withEnvironment(env, async () => {
        globalThis.fetch = async () => { fetchCount += 1; };
        const response = await POST(authorizedRequest());
        assert.equal(response.status, 503);
        assert.deepEqual(await response.json(), { accepted: false });
      });
    }
    assert.equal(fetchCount, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("missing, short or incorrect operator token cannot invoke privileged validation", async () => {
  const env = validEnvironment({ INTRODUCER_RUNTIME_SECRET_CHECK_TOKEN: TEST_OPERATOR_TOKEN });
  const originalFetch = globalThis.fetch;
  let fetchCount = 0;
  try {
    await withEnvironment(env, async () => {
      globalThis.fetch = async () => { fetchCount += 1; };
      assert.equal(await validateIsolatedSupabaseSecret(), false);
      for (const token of [undefined, "wrong", `${TEST_OPERATOR_TOKEN}x`]) {
        const request = new Request("https://preview.invalid/api/internal/introducer-runtime-identity", {
          method: "POST",
          headers: token ? { "x-introducer-runtime-secret-check": token } : {},
        });
        const response = await POST(request);
        assert.equal(response.status, 404);
        assert.deepEqual(await response.json(), { error: "Not found." });
      }
    });
    assert.equal(fetchCount, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("redirects and non-success responses are rejected without reading response bodies", async () => {
  const env = validEnvironment();
  let fetchCount = 0;
  let cancelCount = 0;
  const originalFetch = globalThis.fetch;
  try {
    await withEnvironment(env, async () => {
      globalThis.fetch = async () => {
        fetchCount += 1;
        return {
          status: fetchCount === 1 ? 302 : 401,
          redirected: false,
          body: { cancel: async () => { cancelCount += 1; } },
          async text() { throw new Error("body must not be read"); },
        };
      };
      const redirect = await validateIsolatedSupabaseSecret({ request: authorizedRequest() });
      const denied = await validateIsolatedSupabaseSecret({ request: authorizedRequest() });
      assert.equal(redirect, false);
      assert.equal(denied, false);
      assert.equal(fetchCount, 2);
      assert.equal(cancelCount, 2);
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("network errors and timeouts fail closed with no retry", async () => {
  const env = validEnvironment();
  let networkCalls = 0;
  await withEnvironment(env, async () => {
    const networkFailure = await validateIsolatedSupabaseSecret({
      request: authorizedRequest(),
      fetchImpl: async () => {
        networkCalls += 1;
        throw new Error(`private failure ${TEST_SECRET}`);
      },
    });
    assert.equal(networkFailure, false);

    const timeout = await validateIsolatedSupabaseSecret({
      request: authorizedRequest(),
      timeoutMs: 5,
      fetchImpl: (_url, options) => new Promise((_resolve, reject) => {
        networkCalls += 1;
        options.signal.addEventListener("abort", () => reject(new Error("timed out")), { once: true });
      }),
    });
    assert.equal(timeout, false);
  });
  assert.equal(networkCalls, 2);
});

test("a body cancellation that never settles is bounded and aborts the request", async () => {
  const env = validEnvironment();
  let fetchCalls = 0;
  let cancelCalls = 0;
  let requestSignal;
  await withEnvironment(env, async () => {
    const result = await validateIsolatedSupabaseSecret({
      request: authorizedRequest(),
      timeoutMs: 10,
      fetchImpl: async (_url, options) => {
        fetchCalls += 1;
        requestSignal = options.signal;
        return {
          status: 200,
          redirected: false,
          body: {
            cancel() {
              cancelCalls += 1;
              return new Promise(() => {});
            },
          },
        };
      },
    });
    assert.equal(result, false);
  });
  assert.equal(fetchCalls, 1);
  assert.equal(cancelCalls, 1);
  assert.equal(requestSignal.aborted, true);
});

test("production Supabase identity never reaches the network and no row endpoint is used", async () => {
  const env = validEnvironment({ NEXT_PUBLIC_SUPABASE_URL: `https://${PRODUCTION_REF}.supabase.co` });
  let fetchCount = 0;
  await withEnvironment(env, async () => {
    const accepted = await validateIsolatedSupabaseSecret({
      request: authorizedRequest(),
      fetchImpl: async () => { fetchCount += 1; return { status: 200 }; },
    });
    assert.equal(accepted, false);
  });
  assert.equal(fetchCount, 0);

  const helperSource = await readFile(new URL("../lib/introducerRuntimeSecretValidation.server.js", import.meta.url), "utf8");
  assert.match(helperSource, /https:\/\/waluyphoafylzcjuskcl\.supabase\.co\/rest\/v1\//);
  assert.doesNotMatch(helperSource, /witkwlgldxjwwxmpcyva|\/auth\/v1|\/storage\/v1|createClient|supabase\.(?:from|rpc)|\.(?:insert|update|delete)\s*\(/i);
});

test("privileged validation response is bounded and exposes no credential or schema details", async () => {
  const env = validEnvironment({ INTRODUCER_RUNTIME_SECRET_CHECK_TOKEN: TEST_OPERATOR_TOKEN });
  const originalFetch = globalThis.fetch;
  const logged = [];
  const originalLog = console.log;
  let bodyCancelled = false;
  try {
    await withEnvironment(env, async () => {
      console.log = (...args) => logged.push(args);
      globalThis.fetch = async () => ({
        status: 500,
        body: { cancel: async () => { bodyCancelled = true; } },
        async text() { throw new Error("must not read"); },
      });
      const response = await POST(authorizedRequest());
      const serialized = JSON.stringify(await response.json());
      assert.equal(response.status, 502);
      assert.deepEqual(JSON.parse(serialized), { accepted: false });
      assert.equal(serialized.includes(TEST_SECRET), false);
      assert.equal(serialized.includes(TEST_OPERATOR_TOKEN), false);
      assert.equal(serialized.includes("schema"), false);
      assert.equal(bodyCancelled, true);
      assert.deepEqual(logged, []);
    });
  } finally {
    globalThis.fetch = originalFetch;
    console.log = originalLog;
  }
});
