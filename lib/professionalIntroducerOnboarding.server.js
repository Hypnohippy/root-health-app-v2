import { introducerSignerMatchesTerms } from "./introducerSignerIdentity.js";
import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { agreementTerms,termsHash } from "./introducerGoogleAgreementTerms.js";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const INTRODUCER_PREVIEW_PROJECT_ID = "prj_5FntyaVgI1tQ7Q3IMKfkSTb2ETut";
export const INTRODUCER_PREVIEW_SUPABASE_REF = "waluyphoafylzcjuskcl";
export const INTRODUCER_PREVIEW_BRANCH = "codex/professional-introducer-demo";
export const ROOT_COMMERCIAL_VERCEL_PROJECT_ID = "prj_XRyykP2byrJeHZ5hkI3QpGOjF2oO";
export const ROOT_COMMERCIAL_SUPABASE_REF = "witkwlgldxjwwxmpcyva";

/** The customer host is independently pinned and can only be used in the
 * explicit customer handoff mode. */
export function introducerCustomerOrigin(env = process.env) {
  const raw = String(env.ROOT_INTRODUCER_CUSTOMER_URL || "");
  let parsed;
  try { parsed = new URL(raw); } catch { throw new Error("Introducer customer origin is not configured."); }
  const allowlist = parseExactHttpsOrigins(env.ROOT_INTRODUCER_CUSTOMER_ALLOWED_ORIGINS);
  const host = parsed.hostname.toLowerCase();
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.port ||
      parsed.pathname !== "/" || parsed.search || parsed.hash || raw !== parsed.origin ||
      allowlist.size !== 1 || !allowlist.has(parsed.origin) || host === "roothealth.app" || host === "www.roothealth.app" ||
      host.endsWith(".vercel.app")) {
    throw new Error("Introducer customer origin must be an exact allowlisted HTTPS customer domain.");
  }
  return parsed.origin;
}

/** The machine-to-machine API always targets the protected dedicated Preview.
 * Customer access never changes this endpoint, so Vercel Trusted Source/OIDC
 * remains in the request path. */
export function introducerInternalTargetOrigin(env = process.env) {
  if (env.ROOT_INTRODUCER_VERCEL_PROJECT_ID !== INTRODUCER_PREVIEW_PROJECT_ID ||
      env.ROOT_INTRODUCER_SUPABASE_PROJECT_REF !== INTRODUCER_PREVIEW_SUPABASE_REF) {
    throw new Error("Introducer internal target project identity is invalid.");
  }
  if (!["preview", "customer"].includes(env.ROOT_INTRODUCER_HANDOFF_MODE)) {
    throw new Error("Introducer handoff mode is not explicitly configured.");
  }
  const raw = String(env.ROOT_AUTH_PREVIEW_URL || "");
  let url;
  try { url = new URL(raw); } catch { throw new Error("Dedicated introducer Preview URL is not configured."); }
  const origins = parseExactHttpsOrigins(env.ROOT_INTRODUCER_PREVIEW_ALLOWED_ORIGINS);
  if (url.protocol !== "https:" || !url.hostname.startsWith("root-health-introducer-demo-") || !url.hostname.endsWith(".vercel.app") ||
      url.username || url.password || url.pathname !== "/" || url.search || url.hash || raw !== url.origin || !origins.has(url.origin)) {
    throw new Error("Dedicated introducer Preview target is invalid.");
  }
  return url.origin;
}

/** Select only the recipient-facing activation URL. In internal Preview mode,
 * the protected Preview remains the callback; customer mode uses the one
 * separately pinned custom origin. */
export function introducerActivationOrigin(env = process.env) {
  const internalOrigin = introducerInternalTargetOrigin(env);
  return env.ROOT_INTRODUCER_HANDOFF_MODE === "customer"
    ? introducerCustomerOrigin(env)
    : internalOrigin;
}

export function activationRequestOriginAllowed({ requestOrigin, signedActivationOrigin, previewOrigin, previewAllowedOrigins, customerOrigin } = {}) {
  if (typeof requestOrigin !== "string" || requestOrigin !== signedActivationOrigin) return false;
  const previewAllowed = previewAllowedOrigins instanceof Set
    ? previewAllowedOrigins.has(previewOrigin)
    : Array.isArray(previewAllowedOrigins) && previewAllowedOrigins.includes(previewOrigin);
  return (signedActivationOrigin === previewOrigin && previewAllowed) ||
    (typeof customerOrigin === "string" && customerOrigin.length > 0 && signedActivationOrigin === customerOrigin);
}

/** The bridge is opt-in and can only run on the existing Root commercial
 * Production deployment, against its known commercial database. */
export function commercialOnboardingBridgeReady(env = process.env) {
  if (env.ROOT_INTRODUCER_ONBOARDING_ENABLED !== "true" ||
      env.VERCEL_ENV !== "production" ||
      env.ROOT_DEPLOYMENT_MODE === "introducer" ||
      env.VERCEL_PROJECT_ID !== ROOT_COMMERCIAL_VERCEL_PROJECT_ID ||
      env.VERCEL_GIT_COMMIT_REF !== "main" ||
      env.ROOT_PRODUCTION_SUPABASE_PROJECT_REF !== ROOT_COMMERCIAL_SUPABASE_REF) return false;
  try {
    const databaseUrl = new URL(String(env.NEXT_PUBLIC_SUPABASE_URL || ""));
    if (databaseUrl.protocol !== "https:" || databaseUrl.hostname !== `${ROOT_COMMERCIAL_SUPABASE_REF}.supabase.co` ||
        databaseUrl.username || databaseUrl.password || databaseUrl.port || databaseUrl.pathname !== "/" || databaseUrl.search || databaseUrl.hash ||
        String(env.NEXT_PUBLIC_SUPABASE_URL) !== databaseUrl.origin) return false;
    const callbacks = parseExactHttpsOrigins(env.ROOT_INTRODUCER_ALLOWED_CALLBACK_ORIGINS);
    const approved = new Set(["https://roothealth.app", "https://www.roothealth.app"]);
    introducerInternalTargetOrigin(env);
    introducerActivationOrigin(env);
    return callbacks.size > 0 && [...callbacks].every(origin => approved.has(origin));
  } catch {
    return false;
  }
}

/** Summarise the existing authoritative commercial agreement and the separate
 * demo-access lifecycle. Never mark an agreement ready from a UI status alone. */
export function demoAccessSummary(agreementState, onboarding, now = new Date()) {
  const agreements = Array.isArray(agreementState?.agreements) ? agreementState.agreements : [];
  const maxVersion = agreements.reduce((max, item) => Math.max(max, Number(item?.version) || 0), 0);
  const latestItems = agreements.filter(item => Number(item?.version) === maxVersion);
  const latest = maxVersion > 0 && latestItems.length === 1 ? latestItems[0] : null;
  let verified = false;
  try { verifiedAcceptedAgreement(agreementState, agreementState?.introducer?.id, now); verified = true; } catch {}
  let agreementStatus = agreements.length && !latest ? "review_required" : "not_generated";
  if (verified) agreementStatus = "signed_verified";
  else if (latest?.status === "accepted") agreementStatus = latest.acceptance?.archive_state === "archived" ? "signed_review_required" : "signed_archive_pending";
  else if (["draft", "sent", "superseded"].includes(latest?.status)) agreementStatus = latest.status;
  else if (latest) agreementStatus = "review_required";

  const state = onboarding?.state || "registered";
  const activationExpiry = Date.parse(onboarding?.activation_expires_at || "");
  const grantExpiry = Date.parse(onboarding?.preview_grant_expires_at || "");
  const timestamp = new Date(now).getTime();
  let invitationStatus = "not_issued";
  if (state === "revoked") invitationStatus = "revoked";
  else if (state === "activated") invitationStatus = "used";
  else if (["activation_sent", "activation_uncertain", "activation_preparing"].includes(state) && Number.isFinite(activationExpiry) && activationExpiry <= timestamp) invitationStatus = "expired";
  else if (state === "activation_sent") invitationStatus = "sent";
  else if (state === "activation_uncertain") invitationStatus = "delivery_uncertain";
  else if (state === "activation_preparing") invitationStatus = "preparing";

  let accountStatus = "awaiting_activation";
  if (state === "revoked") accountStatus = "revoked";
  else if (state === "activated") accountStatus = Number.isFinite(grantExpiry) && grantExpiry > timestamp ? "active" : "expired";
  return {
    agreement: {
      id: latest?.id || null,
      version: latest?.version || null,
      status: agreementStatus,
      verified,
      acceptedAt: latest?.acceptance?.accepted_at || latest?.accepted_at || null,
    },
    invitationStatus,
    accountStatus,
    invitationExpiresAt: onboarding?.activation_expires_at || null,
    accessExpiresAt: onboarding?.preview_grant_expires_at || null,
  };
}

export function verifiedAcceptedAgreement(state, introducerId, now = new Date()) {
  const intro = state?.introducer;
  const agreements = Array.isArray(state?.agreements) ? state.agreements : [];
  const maximumVersion = agreements.reduce((maximum, item) => Math.max(maximum, Number(item?.version) || 0), 0);
  const latestMatches = agreements.filter((item) => Number(item?.version) === maximumVersion);
  const latest = latestMatches.length === 1 ? latestMatches[0] : null;
  const acceptance = latest?.acceptance;
  const recipient = String(latest?.terms_snapshot?.contact_email || "").trim().toLowerCase();
  const evidenceEmail = String(acceptance?.evidence?.email || "").trim().toLowerCase();
  const evidenceName = String(acceptance?.evidence?.full_name || "").trim();
  const today = new Date(now).toISOString().slice(0, 10);
  const validDateOnly = (value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(`${value}T00:00:00.000Z`)) && new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value;
  const startDateValid = validDateOnly(intro?.agreement_start_date);
  const endDateValid = intro?.agreement_end_date == null || intro.agreement_end_date === "" || validDateOnly(intro.agreement_end_date);
  const startsInFuture = !startDateValid || intro.agreement_start_date > today;
  const hasExpired = !endDateValid || Boolean(intro?.agreement_end_date && intro.agreement_end_date < today);
  const acceptedAt = Date.parse(acceptance?.accepted_at || "");
  let currentTermsMatch=false;
  try { currentTermsMatch=termsHash(agreementTerms(intro,state?.policies || [],latest?.terms_snapshot?.special_terms))===latest?.terms_hash; } catch {}
  if (!intro || intro.id !== introducerId || intro.status !== "active" || startsInFuture || hasExpired ||
      !latest || latest.status !== "accepted" || latest.superseded_at || latest.revoked_at || latest.cancelled_at ||
      !acceptance || acceptance.archive_state !== "archived" || !UUID.test(acceptance.id || "") ||
      !UUID.test(latest.id || "") || !Number.isInteger(latest.version) || latest.version < 1 ||
      !EMAIL.test(recipient) || recipient !== String(intro.contact_email || "").trim().toLowerCase() ||
      recipient !== String(latest.sent_to || "").trim().toLowerCase() || recipient !== evidenceEmail ||
      !evidenceName || !introducerSignerMatchesTerms(latest.terms_snapshot, acceptance.evidence) ||
      !Number.isFinite(acceptedAt) || acceptedAt > new Date(now).getTime() || acceptance.accepted_at !== latest.accepted_at ||
      acceptance.terms_hash !== latest.terms_hash || latest.terms_hash !== termsHash(latest.terms_snapshot) ||
      !currentTermsMatch ||
      termsHash(acceptance.terms_snapshot) !== latest.terms_hash ||
      termsHash(latest.accepted_terms_snapshot) !== latest.terms_hash) {
    throw new Error("A current, archived agreement acceptance with matching identity and terms is required.");
  }
  return {
    introducerId: intro.id,
    agreementId: latest.id,
    agreementVersion: latest.version,
    acceptanceId: acceptance.id,
    acceptedAt: acceptance.accepted_at,
    acceptedTermsHash: latest.terms_hash,
    recipientEmail: recipient,
    contactName: String(acceptance.evidence.full_name || "").trim(),
  };
}

const RECEIPT_DOMAIN = "root-health-introducer-preview-activation.v1";

/** Sign the Preview's proof only after its own Auth user and mapped grant have
 * been verified. The separate domain prevents a Root invitation assertion
 * from being reused as a Preview completion proof. */
export function signPreviewActivationReceipt(payload, secret, now = Date.now()) {
  const bytes = secretBytes(secret);
  const body = { ...payload, iat: Math.floor(now / 1000), exp: Math.floor(now / 1000) + 300 };
  const encoded = Buffer.from(JSON.stringify(body)).toString("base64url");
  const signature = createHmac("sha256", bytes).update(`${RECEIPT_DOMAIN}.${encoded}`).digest("base64url");
  return `${encoded}.${signature}`;
}

export function verifyPreviewActivationReceipt(token, secret, { audience, expectedPreviewOrigin, now = Date.now() } = {}) {
  try {
    const [encoded, signature, extra] = String(token || "").split(".");
    if (!encoded || !signature || extra) return null;
    const expected = createHmac("sha256", secretBytes(secret)).update(`${RECEIPT_DOMAIN}.${encoded}`).digest();
    const actual = Buffer.from(signature, "base64url");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    const issuedAt = Number(payload.iat) * 1000;
    const expiresAt = Number(payload.exp) * 1000;
    const grantExpiry = Date.parse(payload.grantExpiresAt || "");
    const audienceUrl = new URL(String(payload.aud || ""));
    const previewOrigin = new URL(String(payload.previewDeploymentOrigin || ""));
    const activationExpiry = Date.parse(payload.activationExpiresAt || "");
    if (payload.action !== "activation_complete" || payload.iss !== INTRODUCER_PREVIEW_PROJECT_ID ||
        payload.previewVercelProjectId !== INTRODUCER_PREVIEW_PROJECT_ID ||
        payload.previewSupabaseProjectRef !== INTRODUCER_PREVIEW_SUPABASE_REF ||
        payload.vercelEnvironment !== "preview" || payload.gitBranch !== INTRODUCER_PREVIEW_BRANCH ||
        previewOrigin.protocol !== "https:" || previewOrigin.origin !== payload.previewDeploymentOrigin ||
        (expectedPreviewOrigin && payload.previewDeploymentOrigin !== expectedPreviewOrigin) ||
        payload.aud !== audience || audienceUrl.pathname !== "/api/admin/introducers/onboarding" ||
        audienceUrl.search || audienceUrl.hash || audienceUrl.username || audienceUrl.password || audienceUrl.protocol !== "https:" ||
        !UUID.test(payload.jti || "") || !UUID.test(payload.introducerId || "") || !UUID.test(payload.agreementId || "") ||
        !UUID.test(payload.acceptanceId || "") || !UUID.test(payload.requestId || "") || !UUID.test(payload.previewUserId || "") ||
        !UUID.test(payload.previewOnboardingId || "") || !UUID.test(payload.grantId || "") || !/^[a-f0-9]{64}$/.test(payload.nonce || "") ||
        !/^[a-f0-9]{64}$/.test(payload.acceptedTermsHash || "") || !EMAIL.test(payload.verifiedEmail || "") ||
        payload.verifiedEmail !== String(payload.recipientEmail || "").toLowerCase() ||
        !Number.isInteger(payload.agreementVersion) || payload.agreementVersion < 1 ||
        !Number.isFinite(issuedAt) || !Number.isFinite(expiresAt) || issuedAt > now + 30000 || expiresAt <= now ||
        expiresAt - issuedAt > 300000 || !Number.isFinite(grantExpiry) || grantExpiry <= now ||
        !Number.isFinite(activationExpiry) || activationExpiry <= now || activationExpiry > issuedAt + 900000 ||
        grantExpiry > now + 30 * 86400000 + 60000) return null;
    return payload;
  } catch {
    return null;
  }
}

export function parseExactHttpsOrigins(value) {
  const raw = String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
  if (!raw.length) throw new Error("Introducer callback origin allowlist is not configured.");
  const origins = new Set();
  for (const item of raw) {
    let parsed;
    try { parsed = new URL(item); } catch { throw new Error("Introducer callback origin allowlist is invalid."); }
    if (item.includes("*") || parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash || item !== parsed.origin) {
      throw new Error("Introducer callback origins must be exact HTTPS origins without wildcards or paths.");
    }
    origins.add(parsed.origin);
  }
  return origins;
}

export function validateCommercialCallbackUrl(value, allowedOrigins) {
  let parsed;
  try { parsed = new URL(String(value || "")); } catch { throw new Error("Commercial verification callback is not configured."); }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.pathname !== "/api/admin/introducers/onboarding" || parsed.search || parsed.hash ||
      !allowedOrigins?.has(parsed.origin)) {
    throw new Error("Commercial verification callback is outside the exact HTTPS origin allowlist.");
  }
  return parsed;
}

export function validatePreviewActivationLink(value, { previewOrigin, activationOrigin = previewOrigin, previewSupabaseRef } = {}) {
  try {
    const action = new URL(String(value || ""));
    const redirect = new URL(action.searchParams.get("redirect_to") || "");
    const expectedAuthOrigin = `https://${INTRODUCER_PREVIEW_SUPABASE_REF}.supabase.co`;
    const expectedActivationOrigin = new URL(String(activationOrigin || "")).origin;
    const allowedActionParameters = new Set(["token", "type", "redirect_to"]);
    if ([...action.searchParams.keys()].some((key) => !allowedActionParameters.has(key)) ||
        [...allowedActionParameters].some((key) => action.searchParams.getAll(key).length !== 1) ||
        previewSupabaseRef !== INTRODUCER_PREVIEW_SUPABASE_REF || expectedActivationOrigin !== activationOrigin ||
        action.origin !== expectedAuthOrigin || action.pathname !== "/auth/v1/verify" || action.searchParams.get("type") !== "invite" ||
        !action.searchParams.get("token") || redirect.origin !== expectedActivationOrigin || redirect.pathname !== "/reset-password" ||
        redirect.searchParams.get("next") !== "/introducer" || [...redirect.searchParams.keys()].some((key) => key !== "next") ||
        redirect.hash || action.hash || action.username || action.password) return false;
    return true;
  } catch {
    return false;
  }
}

export function validatePreviewDeployment(env = process.env) {
  if (env.ROOT_INTRODUCER_VERCEL_PROJECT_ID !== INTRODUCER_PREVIEW_PROJECT_ID ||
      env.ROOT_INTRODUCER_SUPABASE_PROJECT_REF !== INTRODUCER_PREVIEW_SUPABASE_REF ||
      env.VERCEL_PROJECT_ID !== INTRODUCER_PREVIEW_PROJECT_ID || env.VERCEL_ENV !== "preview" ||
      env.VERCEL_GIT_COMMIT_REF !== INTRODUCER_PREVIEW_BRANCH) {
    throw new Error("The isolated introducer Preview deployment identity could not be verified.");
  }
  const supabaseUrl = new URL(String(env.NEXT_PUBLIC_SUPABASE_URL || ""));
  if (supabaseUrl.hostname !== `${INTRODUCER_PREVIEW_SUPABASE_REF}.supabase.co` || supabaseUrl.protocol !== "https:" ||
      supabaseUrl.username || supabaseUrl.password || supabaseUrl.port || supabaseUrl.pathname !== "/" || supabaseUrl.search || supabaseUrl.hash ||
      String(env.NEXT_PUBLIC_SUPABASE_URL || "") !== supabaseUrl.origin) {
    throw new Error("The isolated introducer Supabase identity could not be verified.");
  }
  return true;
}

export function replacementDisposition(existing, { requestId, now = Date.now() } = {}) {
  if (!existing || existing.access_grant_id || !["sent", "delivery_uncertain", "link_prepared", "replacement_pending"].includes(existing.state)) return "reject";
  const expiresAt=Date.parse(existing.activation_expires_at || "");
  if (!Number.isFinite(expiresAt)) return "reject";
  if (existing.state === "replacement_pending" && existing.activation_request_id === requestId && expiresAt > now) return "resume";
  return expiresAt <= now ? "begin" : "reject";
}

function secretBytes(secret) {
  const value = String(secret || "");
  if (Buffer.byteLength(value) < 32) throw new Error("Introducer onboarding handoff is not configured.");
  return Buffer.from(value, "utf8");
}

export function signOnboardingAssertion(payload, secret, now = Date.now()) {
  const bytes = secretBytes(secret);
  const body = { ...payload, iat: Math.floor(now / 1000), exp: Math.floor(now / 1000) + 15 * 60 };
  const encoded = Buffer.from(JSON.stringify(body)).toString("base64url");
  const signature = createHmac("sha256", bytes).update(`root-introducer-onboarding.v1.${encoded}`).digest("base64url");
  return `${encoded}.${signature}`;
}

export function verifyOnboardingAssertion(token, secret, now = Date.now()) {
  try {
    const [encoded, signature, extra] = String(token || "").split(".");
    if (!encoded || !signature || extra) return null;
    const expected = createHmac("sha256", secretBytes(secret)).update(`root-introducer-onboarding.v1.${encoded}`).digest();
    const actual = Buffer.from(signature, "base64url");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (!UUID.test(payload.introducerId || "") || !UUID.test(payload.agreementId || "") ||
        !UUID.test(payload.acceptanceId || "") || !UUID.test(payload.requestId || "") ||
        !EMAIL.test(payload.recipientEmail || "") || !/^[a-f0-9]{64}$/.test(payload.acceptedTermsHash || "") ||
        !Number.isInteger(payload.agreementVersion) || !payload.activationExpiresAt ||
        new Date(payload.activationExpiresAt).getTime() <= now || new Date(payload.activationExpiresAt).getTime() > payload.exp * 1000 + 999 ||
        payload.exp <= Math.floor(now / 1000) ||
        payload.iat > Math.floor(now / 1000) + 30 || payload.exp - payload.iat > 15 * 60) return null;
    return payload;
  } catch {
    return null;
  }
}

function encryptionKey(secret) {
  return createHmac("sha256", secretBytes(secret)).update("root-introducer-onboarding-link-encryption.v1").digest();
}

export function sealActivationLink(value, secret) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(secret), iv);
  const ciphertext = Buffer.concat([cipher.update(String(value), "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), ciphertext].map((part) => part.toString("base64url")).join(".");
}

export function openActivationLink(value, secret) {
  const [iv, tag, ciphertext, extra] = String(value || "").split(".");
  if (!iv || !tag || !ciphertext || extra) throw new Error("Stored activation link is unavailable.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(secret), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]).toString("utf8");
}
