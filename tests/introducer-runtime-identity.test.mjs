import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { GET } from "../app/api/internal/introducer-runtime-identity/route.js";
import {
  inspectIntroducerRuntimeIdentity,
  runtimeDiagnosticConfigurationPasses,
  runtimeDiagnosticScopeAllowed,
} from "../lib/introducerRuntimeIdentity.server.js";
import { introducerRequestDecision } from "../lib/introducerRestrictedActions.server.js";

const EXPECTED_PROJECT_ID = "prj_5FntyaVgI1tQ7Q3IMKfkSTb2ETut";
const EXPECTED_BRANCH = "codex/professional-introducer-demo";
const ISOLATED_REF = "waluyphoafylzcjuskcl";
const PRODUCTION_REF = "witkwlgldxjwwxmpcyva";
const TEST_SECRET = "sb_secret_TEST_ONLY_never_a_real_credential";

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
      for (const value of [TEST_SECRET, env.NEXT_PUBLIC_SUPABASE_URL, env.VERCEL_GIT_COMMIT_REF, EXPECTED_PROJECT_ID, ISOLATED_REF]) {
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

test("diagnostic handler contains no database/provider access and is explicitly temporary", async () => {
  const source = await readFile(new URL("../app/api/internal/introducer-runtime-identity/route.js", import.meta.url), "utf8");
  assert.match(source, /TEMPORARY/);
  assert.match(source, /Vercel Authentication/);
  assert.doesNotMatch(source, /createClient|\.from\s*\(|\.rpc\s*\(|fetch\s*\(|console\.(?:log|warn|error)/);
});
