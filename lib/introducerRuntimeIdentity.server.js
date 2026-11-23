import { introducerDeploymentStatus } from "./introducerRestrictedActions.server.js";

const EXPECTED_INTRODUCER_PROJECT_ID = "prj_5FntyaVgI1tQ7Q3IMKfkSTb2ETut";
const EXPECTED_INTRODUCER_BRANCH = "codex/professional-introducer-demo";
const EXPECTED_INTRODUCER_SUPABASE_REF = "waluyphoafylzcjuskcl";
const EXPECTED_PRODUCTION_SUPABASE_REF = "witkwlgldxjwwxmpcyva";

function supabaseProjectRef(value) {
  try {
    const url = new URL(String(value || ""));
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      url.pathname !== "/" ||
      url.search ||
      url.hash ||
      !url.hostname.endsWith(".supabase.co")
    ) return "";
    return url.hostname.slice(0, -".supabase.co".length);
  } catch {
    return "";
  }
}

/**
 * Temporary, no-data runtime attestation for the SSO-protected introducer
 * Preview. Return only booleans: never return or log environment values.
 * Presence/prefix checks do not prove which Supabase project issued a key.
 */
export function inspectIntroducerRuntimeIdentity(env = process.env) {
  const actualSupabaseRef = supabaseProjectRef(env.NEXT_PUBLIC_SUPABASE_URL);
  const serverKey = typeof env.SUPABASE_SECRET_KEY === "string"
    ? env.SUPABASE_SECRET_KEY
    : "";

  return Object.freeze({
    deploymentProjectMatches: env.VERCEL_PROJECT_ID === EXPECTED_INTRODUCER_PROJECT_ID &&
      env.ROOT_INTRODUCER_VERCEL_PROJECT_ID === EXPECTED_INTRODUCER_PROJECT_ID,
    previewEnvironment: env.VERCEL_ENV === "preview",
    featureBranchMatches: env.VERCEL_GIT_COMMIT_REF === EXPECTED_INTRODUCER_BRANCH,
    introducerModeEnabled: env.ROOT_DEPLOYMENT_MODE === "introducer" &&
      env.NEXT_PUBLIC_ROOT_DEPLOYMENT_MODE === "introducer" &&
      env.PROFESSIONAL_INTRODUCER_DEMO_ENABLED === "true",
    supabaseUrlMatchesIsolatedProject: actualSupabaseRef === EXPECTED_INTRODUCER_SUPABASE_REF &&
      env.ROOT_INTRODUCER_SUPABASE_PROJECT_REF === EXPECTED_INTRODUCER_SUPABASE_REF,
    productionSupabaseReferenceExcluded: Boolean(actualSupabaseRef) &&
      actualSupabaseRef !== EXPECTED_PRODUCTION_SUPABASE_REF &&
      env.ROOT_PRODUCTION_SUPABASE_PROJECT_REF === EXPECTED_PRODUCTION_SUPABASE_REF,
    serverSecretPresent: serverKey.length > 0,
    serverSecretFormatMatches: serverKey.startsWith("sb_secret_") &&
      serverKey.length > "sb_secret_".length &&
      serverKey === serverKey.trim(),
    // Deliberately false: checking presence and key prefix cannot establish
    // which project issued the credential. This diagnostic makes no network
    // request and does not attempt to validate the key.
    serverSecretProjectIdentityVerified: false,
    completeDatabaseCredentialIdentityVerified: false,
    deploymentIdentityStatusMatchesGuard: introducerDeploymentStatus(env) === "introducer_verified",
  });
}

export function runtimeDiagnosticScopeAllowed(checks) {
  return Boolean(
    checks?.deploymentProjectMatches &&
    checks?.previewEnvironment &&
    checks?.featureBranchMatches &&
    checks?.introducerModeEnabled
  );
}

export function runtimeDiagnosticConfigurationPasses(checks) {
  return Boolean(
    runtimeDiagnosticScopeAllowed(checks) &&
    checks?.supabaseUrlMatchesIsolatedProject &&
    checks?.productionSupabaseReferenceExcluded &&
    checks?.serverSecretPresent &&
    checks?.serverSecretFormatMatches &&
    checks?.deploymentIdentityStatusMatchesGuard
  );
}
