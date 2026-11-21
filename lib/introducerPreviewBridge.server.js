import { randomBytes, randomUUID } from "node:crypto";
import {
  INTRODUCER_PREVIEW_PROJECT_ID,
  INTRODUCER_PREVIEW_SUPABASE_REF,
  parseExactHttpsOrigins,
  signOnboardingAssertion,
} from "./professionalIntroducerOnboarding.server.js";
import { queryResult } from "./introducerGoogleAgreementServer.js";

export function previewInternalUrl(env = process.env) {
  const raw = String(env.ROOT_AUTH_PREVIEW_URL || "").trim();
  let url;
  try { url = new URL(raw); } catch { throw new Error("Dedicated introducer Preview URL is not configured."); }
  const origins = parseExactHttpsOrigins(env.ROOT_INTRODUCER_PREVIEW_ALLOWED_ORIGINS);
  if (url.protocol !== "https:" || !url.hostname.startsWith("root-health-introducer-demo-") ||
      !url.hostname.endsWith(".vercel.app") || url.username || url.password || url.pathname !== "/" ||
      url.search || url.hash || !origins.has(url.origin) ||
      env.ROOT_INTRODUCER_VERCEL_PROJECT_ID !== INTRODUCER_PREVIEW_PROJECT_ID ||
      env.ROOT_INTRODUCER_SUPABASE_PROJECT_REF !== INTRODUCER_PREVIEW_SUPABASE_REF) {
    throw new Error("Dedicated introducer Preview URL is invalid.");
  }
  return `${url.origin}/api/internal/introducer-onboarding`;
}

export async function signedPreviewCall(action, assertion, request, env = process.env, fetcher = fetch) {
  const secret = String(env.ROOT_INTRODUCER_ONBOARDING_SHARED_SECRET || "");
  // Vercel injects this short-lived token only when secure backend OIDC is
  // configured. Forward it to the Preview Trusted Source; never use a bypass token.
  const oidc = request.headers.get("x-vercel-oidc-token");
  if (!oidc) throw new Error("Protected Preview trusted OIDC is unavailable.");
  const signed = signOnboardingAssertion({ action, ...assertion }, secret);
  const response = await fetcher(previewInternalUrl(env), {
    method: "POST",
    redirect: "error",
    signal: AbortSignal.timeout(25000),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${signed}`,
      "x-vercel-trusted-oidc-idp-token": oidc,
    },
    body: JSON.stringify({ action, assertion: signed }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(response.status === 503
    ? "Introducer Preview handoff is not configured."
    : "Introducer Preview did not confirm the requested action.");
  return result;
}

/** Shared Root-admin revocation path used by both the Demo Access panel and archive flow. */
export async function revokeIntroducerPreviewAccess({ db, introducerId, actorId, request, env = process.env, fetcher = fetch }) {
  const row = await queryResult(db.from("organisation_introducer_onboarding")
    .select("id,state,agreement_id,agreement_version,acceptance_id,accepted_at,accepted_terms_hash,recipient_email")
    .eq("introducer_id", introducerId).maybeSingle());
  if (!row) return { state: "not_provisioned" };
  if (row.state === "revoked" || row.state === "registered" || row.state === "failed") return { state: row.state };
  if (!["activation_sent", "activation_uncertain", "activated"].includes(row.state)) {
    throw new Error("Introducer invitation is still being prepared. Retry archive after that operation resolves.");
  }

  const requestId = randomUUID();
  const assertion = {
    introducerId,
    agreementId: row.agreement_id,
    agreementVersion: row.agreement_version,
    acceptanceId: row.acceptance_id,
    acceptedAt: row.accepted_at,
    acceptedTermsHash: row.accepted_terms_hash,
    recipientEmail: row.recipient_email,
    contactName: "Root administrator",
    requestId,
    nonce: randomBytes(32).toString("hex"),
    activationExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  };
  await signedPreviewCall("revoke", assertion, request, env, fetcher);

  const revokedAt = new Date().toISOString();
  await queryResult(db.from("organisation_introducer_onboarding")
    .update({ state: "revoked", revoked_at: revokedAt, revoked_by: actorId, updated_at: revokedAt })
    .eq("id", row.id));
  await queryResult(db.from("organisation_introducer_onboarding_events").insert({
    onboarding_id: row.id,
    introducer_id: introducerId,
    actor_id: actorId,
    event_type: "revoked",
    agreement_id: row.agreement_id,
    request_id: requestId,
    details: {},
  }));
  return { state: "revoked" };
}
