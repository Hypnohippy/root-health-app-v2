import { introducerDeploymentStatus } from "./introducerRestrictedActions.server.js";
import { selectSupabaseAdminKey } from "./supabaseCredentialPolicy.js";

function projectRef(url) {
  try {
    const hostname = new URL(String(url || "")).hostname;
    return hostname.endsWith(".supabase.co")
      ? hostname.slice(0, -".supabase.co".length)
      : "";
  } catch {
    return "";
  }
}

/** Production keeps its established legacy credential path. A positively
 * verified introducer deployment requires a new-format secret and never falls
 * back to the legacy service-role value. */
export function getSupabaseServerKey(env = process.env) {
  const deployment = introducerDeploymentStatus(env);
  return selectSupabaseAdminKey({
    deployment,
    actualProjectRef: projectRef(env.NEXT_PUBLIC_SUPABASE_URL),
    secretKey: env.SUPABASE_SECRET_KEY,
    legacyServiceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
  });
}

// Route modules may be evaluated during a credential-free static build. Keep
// that import safe while ensuring an actual client creation still fails closed.
export function getSupabaseServerKeyIfConfigured(env = process.env) {
  try {
    return getSupabaseServerKey(env);
  } catch {
    return "";
  }
}
