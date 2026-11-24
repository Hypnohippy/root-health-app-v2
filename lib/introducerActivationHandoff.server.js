import { randomBytes, randomUUID, createHash } from "node:crypto";
import { loadAgreementState, queryResult } from "./introducerGoogleAgreementServer.js";
import { introducerActivationMailer } from "./introducerAgreementEmail.js";
import {
  INTRODUCER_PREVIEW_PROJECT_ID,
  INTRODUCER_PREVIEW_SUPABASE_REF,
  commercialOnboardingBridgeReady,
  introducerActivationOrigin,
  introducerInternalTargetOrigin,
  signOnboardingAssertion,
  validatePreviewActivationLink,
  verifiedAcceptedAgreement,
} from "./professionalIntroducerOnboarding.server.js";

export class ActivationHandoffError extends Error {
  constructor(message, status = 409) {
    super(message);
    this.name = "ActivationHandoffError";
    this.status = status;
  }
}

export async function loadOnboarding(db, introducerId) {
  const row = await queryResult(db.from("organisation_introducer_onboarding").select("*").eq("introducer_id", introducerId).maybeSingle());
  const events = row ? await queryResult(db.from("organisation_introducer_onboarding_events").select("event_type,agreement_id,request_id,occurred_at,details").eq("onboarding_id", row.id).order("occurred_at", { ascending: false }).limit(50)) : [];
  return { row, events };
}

export function previewInternalUrl(env = process.env) {
  try {
    return `${introducerInternalTargetOrigin(env)}/api/internal/introducer-onboarding`;
  } catch {
    throw new ActivationHandoffError("Dedicated introducer handoff target is invalid.", 503);
  }
}

async function signedPreviewCall(action, assertion, request, env, fetcher) {
  const oidc = request?.headers?.get("x-vercel-oidc-token");
  if (!oidc) throw new ActivationHandoffError("Protected Preview trusted OIDC is unavailable.", 503);
  const signed = signOnboardingAssertion({ action, ...assertion }, String(env.ROOT_INTRODUCER_ONBOARDING_SHARED_SECRET || ""));
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
  if (!response.ok) throw new ActivationHandoffError(response.status === 503 ? "Introducer Preview handoff is not configured." : "Introducer Preview did not confirm the requested action.", 503);
  return result;
}

async function recordEvent(db, { onboardingId, introducerId, actorId, eventType, agreementId, requestId, details = {} }) {
  await queryResult(db.from("organisation_introducer_onboarding_events").insert({
    onboarding_id: onboardingId,
    introducer_id: introducerId,
    actor_id: actorId || null,
    event_type: eventType,
    agreement_id: agreementId,
    request_id: requestId,
    details,
  }));
}

async function markUncertain(db, { onboardingId, introducerId, actorId, agreementId, requestId, stage }) {
  const updatedAt = new Date().toISOString();
  let updated;
  try {
    const { data, error } = await db.from("organisation_introducer_onboarding").update({ state: "activation_uncertain", updated_at: updatedAt })
      .eq("id", onboardingId).eq("activation_request_id", requestId).eq("state", "activation_preparing").select("id").maybeSingle();
    if (error || !data) return;
    updated = data;
  } catch { return; }
  if (!updated) return;
  try {
    await db.from("organisation_introducer_onboarding_events").insert({
      onboarding_id: onboardingId,
      introducer_id: introducerId,
      actor_id: actorId || null,
      event_type: "activation_uncertain",
      agreement_id: agreementId,
      request_id: requestId,
      details: { stage },
    });
  } catch {}
}

/**
 * Issue an activation only after the current Root agreement records prove that
 * acceptance is archived. `automatic_acceptance` is server-internal and
 * idempotently declines if an invitation has already started. The admin
 * controls use this same coordinator for initial sends and expired replacement.
 */
export async function sendIntroducerActivation({
  db,
  introducerId,
  request,
  actorId = null,
  action = "send_invitation",
  requestId: requestedId,
  env = process.env,
  fetcher = fetch,
  mailer,
  now = () => new Date(),
  readAgreementState = loadAgreementState,
  readOnboarding = loadOnboarding,
} = {}) {
  if (!db || !introducerId || !["send_invitation", "replace_invitation", "automatic_acceptance"].includes(action)) {
    throw new ActivationHandoffError("Invalid introducer activation request.", 400);
  }
  if (!commercialOnboardingBridgeReady(env)) throw new ActivationHandoffError("Demo access administration is not enabled on this verified Root commercial deployment.", 503);

  const timestamp = now();
  let agreementState;
  try { agreementState = await readAgreementState(db, introducerId); }
  catch { throw new ActivationHandoffError("Current agreement acceptance could not be verified.", 503); }
  let accepted;
  try { accepted = verifiedAcceptedAgreement(agreementState, introducerId, timestamp); }
  catch { throw new ActivationHandoffError("A current, archived agreement acceptance with matching identity and terms is required.", 409); }
  // Do not create a durable in-progress row when the platform's trusted
  // server-to-server identity is unavailable. The agreement remains accepted
  // and the existing Root administrator action can safely resume the handoff.
  if (!request?.headers?.get("x-vercel-oidc-token")) {
    throw new ActivationHandoffError("Protected Preview trusted OIDC is unavailable.", 503);
  }
  previewInternalUrl(env);

  let row;
  try { ({ row } = await readOnboarding(db, introducerId)); }
  catch { throw new ActivationHandoffError("Onboarding state could not be safely checked.", 503); }

  if (action === "automatic_acceptance" && row && row.state !== "registered") {
    return { state: row.state, alreadyStarted: true };
  }
  if (row?.state === "activated" || row?.state === "revoked") {
    throw new ActivationHandoffError("This onboarding is already activated or revoked.", 409);
  }
  if (action === "send_invitation" && row && row.state !== "registered") {
    throw new ActivationHandoffError("An activation invitation was already started. Refresh its status and use explicit replacement only after expiry.", 409);
  }
  if (action === "replace_invitation" && (!row || !["activation_sent", "activation_uncertain"].includes(row.state) || !row.activation_expires_at || row.activation_expires_at > timestamp.toISOString())) {
    throw new ActivationHandoffError("Only an expired, unactivated invitation can be replaced.", 409);
  }

  const requestId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestedId || "") ? requestedId : randomUUID();
  const nonce = randomBytes(32).toString("hex");
  const expiresAt = new Date(timestamp.getTime() + 15 * 60 * 1000).toISOString();
  const assertion = {
    introducerId,
    agreementId: accepted.agreementId,
    agreementVersion: accepted.agreementVersion,
    acceptanceId: accepted.acceptanceId,
    acceptedAt: accepted.acceptedAt,
    acceptedTermsHash: accepted.acceptedTermsHash,
    recipientEmail: accepted.recipientEmail,
    contactName: accepted.contactName,
    requestId,
    nonce,
    activationExpiresAt: expiresAt,
    activationOrigin: introducerActivationOrigin(env),
    customerVercelProjectId: INTRODUCER_PREVIEW_PROJECT_ID,
    customerSupabaseProjectRef: INTRODUCER_PREVIEW_SUPABASE_REF,
  };
  const secret = String(env.ROOT_INTRODUCER_ONBOARDING_SHARED_SECRET || "");
  const signed = signOnboardingAssertion({ action: action === "replace_invitation" ? "replace" : "prepare", ...assertion }, secret, timestamp.getTime());
  const rowValues = {
    introducer_id: introducerId,
    state: "activation_preparing",
    agreement_id: accepted.agreementId,
    agreement_version: accepted.agreementVersion,
    acceptance_id: accepted.acceptanceId,
    recipient_email: accepted.recipientEmail,
    accepted_terms_hash: accepted.acceptedTermsHash,
    accepted_at: accepted.acceptedAt,
    activation_request_id: requestId,
    activation_nonce_hash: createHash("sha256").update(nonce).digest("hex"),
    activation_expires_at: expiresAt,
    updated_at: timestamp.toISOString(),
  };

  let onboardingId;
  try {
    if (row) {
      const replaceable = action === "replace_invitation" && ["activation_sent", "activation_uncertain"].includes(row.state) && row.activation_expires_at <= timestamp.toISOString();
      if (row.state !== "registered" && !replaceable) {
        if (action === "automatic_acceptance") return { state: row.state, alreadyStarted: true };
        throw new ActivationHandoffError("Onboarding is already in progress; refresh its status before retrying.", 409);
      }
      const { data, error } = await db.from("organisation_introducer_onboarding").update(rowValues).eq("id", row.id).eq("state", row.state).select("id").maybeSingle();
      if (error || !data) throw new ActivationHandoffError("Another operator has started onboarding. Refresh status before retrying.", 409);
      onboardingId = data.id;
    } else {
      const { data, error } = await db.from("organisation_introducer_onboarding").insert(rowValues).select("id").single();
      if (error || !data) throw new ActivationHandoffError("Another operator has started onboarding. Refresh status before retrying.", 409);
      onboardingId = data.id;
    }
    await recordEvent(db, {
      onboardingId, introducerId, actorId,
      eventType: action === "replace_invitation" ? "activation_replaced" : "activation_preparing",
      agreementId: accepted.agreementId,
      requestId,
      details: { agreement_version: accepted.agreementVersion, trigger: action === "automatic_acceptance" ? "verified_acceptance" : "administrator" },
    });
  } catch (error) {
    if (onboardingId) await markUncertain(db, { onboardingId, introducerId, actorId, agreementId: accepted.agreementId, requestId, stage: "root_audit" });
    if (error instanceof ActivationHandoffError) throw error;
    throw new ActivationHandoffError("Onboarding could not be safely started. Refresh status before retrying.", 409);
  }

  let preview;
  try {
    preview = await signedPreviewCall(action === "replace_invitation" ? "replace" : "prepare", assertion, request, env, fetcher);
    const previewOrigin = new URL(String(env.ROOT_AUTH_PREVIEW_URL || "")).origin;
    if (!validatePreviewActivationLink(preview.actionLink, {
      previewOrigin,
      activationOrigin: assertion.activationOrigin,
      previewSupabaseRef: env.ROOT_INTRODUCER_SUPABASE_PROJECT_REF,
    })) {
      throw new Error("Invalid Preview activation link.");
    }
  } catch {
    await markUncertain(db, { onboardingId, introducerId, actorId, agreementId: accepted.agreementId, requestId, stage: "preview_prepare" });
    throw new ActivationHandoffError("Introducer Preview could not confirm activation preparation. Check status before any replacement.", 503);
  }

  let delivery;
  try {
    delivery = await (mailer || introducerActivationMailer(env, fetcher))({
      recipient: accepted.recipientEmail,
      name: accepted.contactName,
      actionLink: preview.actionLink,
      requestId,
    });
  } catch {
    await markUncertain(db, { onboardingId, introducerId, actorId, agreementId: accepted.agreementId, requestId, stage: "email_delivery" });
    throw new ActivationHandoffError("Activation email delivery is unconfirmed. Check delivery before any replacement.", 409);
  }

  const sentAt = new Date().toISOString();
  try {
    const updated = await queryResult(db.from("organisation_introducer_onboarding").update({
      state: "activation_sent",
      invite_sent_at: sentAt,
      invite_delivery_id: delivery?.message_id || null,
      updated_at: sentAt,
    }).eq("id", onboardingId).eq("activation_request_id", requestId).eq("state", "activation_preparing").select("id").maybeSingle());
    if (!updated) throw new Error("Activation state changed concurrently.");
  } catch {
    await markUncertain(db, { onboardingId, introducerId, actorId, agreementId: accepted.agreementId, requestId, stage: "delivery_receipt" });
    throw new ActivationHandoffError("Activation email delivery is unconfirmed. Check delivery before any replacement.", 409);
  }
  try {
    await recordEvent(db, { onboardingId, introducerId, actorId, eventType: "activation_sent", agreementId: accepted.agreementId, requestId,
      details: delivery?.message_id ? { delivery_id: delivery.message_id } : {} });
  } catch {
    // The delivery receipt and sent state are durable. Never downgrade them or
    // resend just because a secondary audit insert failed.
    throw new ActivationHandoffError("Activation delivery is recorded; refresh status before retrying.", 503);
  }

  try { await signedPreviewCall("sent", assertion, request, env, fetcher); }
  catch { /* Root retains its delivery receipt; Preview remains fail-closed until reconciliation. */ }
  return { state: "activation_sent", alreadyStarted: false };
}
