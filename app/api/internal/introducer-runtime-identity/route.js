import {
  inspectIntroducerRuntimeIdentity,
  runtimeDiagnosticConfigurationPasses,
  runtimeDiagnosticScopeAllowed,
} from "../../../../lib/introducerRuntimeIdentity.server.js";
import {
  isRuntimeSecretValidationAuthorized,
  validateIsolatedSupabaseSecret,
} from "../../../../lib/introducerRuntimeSecretValidation.server.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * TEMPORARY: remove this route after Preview identity acceptance is complete.
 * The dedicated Vercel project must keep Vercel Authentication enabled for
 * every deployment as the deployment access gate. The privileged POST also
 * requires a separate application operator token. Do not add a public-domain
 * or protection-bypass exception.
 *
 * GET only inspects process environment. POST performs a temporary, separately
 * authorized key check against the hardcoded isolated Supabase OpenAPI root.
 * It does not initialize a Supabase client, query data, or log.
 */
const headers = {
  "Cache-Control": "no-store, max-age=0",
  "Pragma": "no-cache",
  "X-Content-Type-Options": "nosniff",
};

export async function GET() {
  const checks = inspectIntroducerRuntimeIdentity();

  // Do not disclose diagnostic details unless the request is executing in
  // the one permitted dedicated Preview identity. Vercel SSO protects the
  // deployment before this handler runs.
  if (!runtimeDiagnosticScopeAllowed(checks)) {
    return Response.json({ error: "Not found." }, { status: 404, headers });
  }

  return Response.json(checks, {
    status: runtimeDiagnosticConfigurationPasses(checks) ? 200 : 503,
    headers,
  });
}

/**
 * TEMPORARY: a POST with the temporary operator token can verify the server
 * secret against the isolated project's REST API gateway. Vercel Authentication
 * must remain enabled, and the full runtime identity checks must pass first.
 */
export async function POST(request) {
  const checks = inspectIntroducerRuntimeIdentity();

  if (!runtimeDiagnosticScopeAllowed(checks)) {
    return Response.json({ error: "Not found." }, { status: 404, headers });
  }

  if (!isRuntimeSecretValidationAuthorized(request)) {
    return Response.json({ error: "Not found." }, { status: 404, headers });
  }

  if (!runtimeDiagnosticConfigurationPasses(checks)) {
    return Response.json({ accepted: false }, { status: 503, headers });
  }

  const accepted = await validateIsolatedSupabaseSecret({ request });
  return Response.json({ accepted }, {
    status: accepted ? 200 : 502,
    headers,
  });
}
