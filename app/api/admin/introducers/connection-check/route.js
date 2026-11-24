import { rootAgreementAccess } from "../../../../../lib/introducerGoogleAgreementServer.js";
import { previewInternalUrl } from "../../../../../lib/introducerActivationHandoff.server.js";
import { ROOT_COMMERCIAL_VERCEL_PROJECT_ID } from "../../../../../lib/professionalIntroducerOnboarding.server.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const reply = (body, status = 200) => Response.json(body, {
  status,
  headers: { "Cache-Control": "no-store, private", "X-Content-Type-Options": "nosniff" },
});

/** Non-mutating OIDC check: never changes the onboarding kill switch or uses an invite assertion. */
export async function GET(request) {
  if (process.env.VERCEL_ENV !== "production" ||
      process.env.VERCEL_PROJECT_ID !== ROOT_COMMERCIAL_VERCEL_PROJECT_ID ||
      process.env.VERCEL_GIT_COMMIT_REF !== "main" ||
      process.env.ROOT_INTRODUCER_ONBOARDING_ENABLED !== "false") {
    return reply({ connected: false, reason: "Unavailable on this deployment." }, 404);
  }
  try { await rootAgreementAccess(request); }
  catch { return reply({ connected: false, reason: "Verified Root administrator required." }, 403); }

  const token = request.headers.get("x-vercel-oidc-token");
  if (!token) return reply({ connected: false, reason: "Vercel OIDC token unavailable." }, 503);
  let target;
  try { target = previewInternalUrl(process.env); }
  catch { return reply({ connected: false, reason: "Protected Preview address is not configured." }, 503); }

  // The target has only POST, so a 405 proves the request reached Next.js
  // through Vercel Deployment Protection; a 302 is Vercel Authentication, not success.
  try {
    const response = await fetch(target, {
      method: "GET",
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
      headers: { "x-vercel-trusted-oidc-idp-token": token, Accept: "application/json" },
    });
    if (response.status === 405) return reply({ connected: true, reason: "Trusted Source accepted by protected Introducer Preview." });
    return reply({ connected: false, reason: "Protected connection not yet verified.", upstreamStatus: response.status }, 503);
  } catch {
    return reply({ connected: false, reason: "Protected Preview could not be reached." }, 503);
  }
}
