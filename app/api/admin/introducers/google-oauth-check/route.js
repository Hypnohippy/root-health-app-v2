import { rootAgreementAccess } from "../../../../../lib/introducerGoogleAgreementServer.js";
import { ROOT_COMMERCIAL_VERCEL_PROJECT_ID } from "../../../../../lib/professionalIntroducerOnboarding.server.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const reply = (body, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store, private", "X-Content-Type-Options": "nosniff" } });
const oauthErrors = new Set(["invalid_grant", "invalid_client", "unauthorized_client", "invalid_request", "access_denied", "unsupported_grant_type", "temporarily_unavailable", "server_error"]);

export async function GET(request) {
  if (process.env.VERCEL_ENV !== "production" ||
      process.env.VERCEL_PROJECT_ID !== ROOT_COMMERCIAL_VERCEL_PROJECT_ID ||
      process.env.VERCEL_GIT_COMMIT_REF !== "main" ||
      process.env.ROOT_INTRODUCER_ONBOARDING_ENABLED !== "false") {
    return reply({ status: "unavailable" }, 404);
  }
  try { await rootAgreementAccess(request); }
  catch { return reply({ status: "unauthorized" }, 403); }

  const env = process.env;
  const fields = ["GOOGLE_AGREEMENTS_CLIENT_ID", "GOOGLE_AGREEMENTS_CLIENT_SECRET", "GOOGLE_AGREEMENTS_REFRESH_TOKEN"];
  if (fields.some(name => !env[name])) return reply({ status: "missing_credentials" }, 503);
  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      signal: AbortSignal.timeout(9000),
      cache: "no-store",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: env.GOOGLE_AGREEMENTS_CLIENT_ID,
        client_secret: env.GOOGLE_AGREEMENTS_CLIENT_SECRET,
        refresh_token: env.GOOGLE_AGREEMENTS_REFRESH_TOKEN,
      }),
    });
    if (response.ok) {
      // Do not read, return or log the access token; the response is discarded.
      return reply({ status: "authorized", code: response.status });
    }
    let code = "unclassified_oauth_error";
    try {
      const data = await response.json();
      if (typeof data?.error === "string" && oauthErrors.has(data.error)) code = data.error;
    } catch {}
    return reply({ status: "rejected", errorCode: code, httpCode: response.status });
  } catch {
    return reply({ status: "network_or_timeout_error" }, 503);
  }
}
