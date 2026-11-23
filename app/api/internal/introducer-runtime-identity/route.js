import {
  inspectIntroducerRuntimeIdentity,
  runtimeDiagnosticConfigurationPasses,
  runtimeDiagnosticScopeAllowed,
} from "../../../../lib/introducerRuntimeIdentity.server.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * TEMPORARY: remove this route after Preview identity acceptance is complete.
 * The dedicated Vercel project must keep Vercel Authentication enabled for
 * every deployment; that existing SSO gate is the route's internal access
 * control. Do not add a public-domain or protection-bypass exception.
 *
 * This handler only inspects process environment and returns booleans. It
 * does not initialize a Supabase client, call a provider, query data, or log.
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
