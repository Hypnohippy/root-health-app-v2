import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { acceptanceOrigin } from "../lib/introducerAgreementAcceptance.js";
import { agreementTerms, termsHash } from "../lib/introducerGoogleAgreementTerms.js";
import { handleAcceptance } from "../app/api/introducer-agreement/accept/route.js";
import { handleRootIntroducerOnboardingCallback } from "../lib/rootIntroducerOnboardingCallback.server.js";
import {
  INTRODUCER_PREVIEW_BRANCH, INTRODUCER_PREVIEW_PROJECT_ID, INTRODUCER_PREVIEW_SUPABASE_REF,
  ROOT_COMMERCIAL_SUPABASE_REF, ROOT_COMMERCIAL_VERCEL_PROJECT_ID, signOnboardingAssertion,
  signPreviewActivationReceipt, verifiedAcceptedAgreement,
} from "../lib/professionalIntroducerOnboarding.server.js";

const ids = {
  introducer: "11111111-1111-4111-8111-111111111111",
  agreement: "22222222-2222-4222-8222-222222222222",
  acceptance: "33333333-3333-4333-8333-333333333333",
  onboarding: "44444444-4444-4444-8444-444444444444",
  request: "55555555-5555-4555-8555-555555555555",
  user: "66666666-6666-4666-8666-666666666666",
  grant: "77777777-7777-4777-8777-777777777777",
  receipt: "88888888-8888-4888-8888-888888888888",
};
const secret = "test-only-onboarding-secret-that-is-not-a-production-credential";
const now = new Date("2026-11-24T12:00:00.000Z");
const acceptedAt = "2026-11-20T10:00:00.000Z";
const activationExpiresAt = new Date(now.getTime() + 10 * 60_000).toISOString();
const previewOrigin = "https://root-health-introducer-demo-abc123.vercel.app";
const callbackUrl = "https://www.roothealth.app/api/admin/introducers/onboarding";

const introducer = {
  id: ids.introducer, name: "Synthetic Introducer", contact_name: "Synthetic Introducer",
  contact_email: "synthetic-introducer@example.test", introducer_market: "corporate",
  introducer_type: "corporate_introducer", referral_code: "synthetic", vat_registered: false,
  agreement_start_date: "2026-01-01", agreement_end_date: null, status: "active",
};
const policy = { commission_percent: 20, commission_basis: "collected_subscription_revenue", commission_structure: "one_off",
  effective_from: "2026-01-01T00:00:00.000Z", effective_until: null };
const terms = agreementTerms(introducer, [policy], "None");
const termsDigest = termsHash(terms);
const agreementState = {
  introducer, policies: [policy], agreements: [{
    id: ids.agreement, version: 1, status: "accepted", accepted_at: acceptedAt,
    sent_to: introducer.contact_email, terms_snapshot: terms, accepted_terms_snapshot: terms,
    terms_hash: termsDigest,
    acceptance: {
      id: ids.acceptance, accepted_at: acceptedAt, archive_state: "archived", terms_hash: termsDigest,
      terms_snapshot: terms, evidence: { full_name: introducer.contact_name, email: introducer.contact_email },
    },
  }],
};
const rootEnv = {
  ROOT_INTRODUCER_ONBOARDING_ENABLED: "true", VERCEL_ENV: "production",
  VERCEL_PROJECT_ID: ROOT_COMMERCIAL_VERCEL_PROJECT_ID, VERCEL_GIT_COMMIT_REF: "main",
  ROOT_PRODUCTION_SUPABASE_PROJECT_REF: ROOT_COMMERCIAL_SUPABASE_REF,
  NEXT_PUBLIC_SUPABASE_URL: `https://${ROOT_COMMERCIAL_SUPABASE_REF}.supabase.co`,
  SUPABASE_SERVICE_ROLE_KEY: "synthetic-service-role-key",
  ROOT_INTRODUCER_ALLOWED_CALLBACK_ORIGINS: "https://www.roothealth.app",
  ROOT_INTRODUCER_VERCEL_PROJECT_ID: INTRODUCER_PREVIEW_PROJECT_ID,
  ROOT_INTRODUCER_SUPABASE_PROJECT_REF: INTRODUCER_PREVIEW_SUPABASE_REF,
  ROOT_INTRODUCER_HANDOFF_MODE: "preview",
  ROOT_AUTH_PREVIEW_URL: previewOrigin,
  ROOT_INTRODUCER_PREVIEW_ALLOWED_ORIGINS: previewOrigin,
  ROOT_INTRODUCER_ONBOARDING_SHARED_SECRET: secret,
};

function onboardingRow(overrides = {}) {
  return {
    id: ids.onboarding, introducer_id: ids.introducer, state: "activation_sent",
    agreement_id: ids.agreement, agreement_version: 1, acceptance_id: ids.acceptance,
    accepted_at: acceptedAt, accepted_terms_hash: termsDigest, recipient_email: introducer.contact_email,
    activation_request_id: ids.request, activation_nonce_hash: createHash("sha256").update("a".repeat(64)).digest("hex"),
    activation_expires_at: activationExpiresAt,
    preview_grant_expires_at: new Date(now.getTime() + 20 * 86400_000).toISOString(),
    ...overrides,
  };
}

const callbackRequest = body => new Request(callbackUrl, {
  method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
});

test("Production agreement acceptance origin normalizes the apex to canonical www; Preview stays deployment-specific", () => {
  assert.equal(acceptanceOrigin({ VERCEL_ENV: "production", NEXT_PUBLIC_SITE_URL: "https://roothealth.app" }), "https://www.roothealth.app");
  assert.equal(acceptanceOrigin({ VERCEL_ENV: "preview", VERCEL_URL: "preview.example.test", NEXT_PUBLIC_SITE_URL: "https://roothealth.app" }), "https://preview.example.test");
});

test("acceptance invokes activation only after archive fulfillment succeeds and preserves durable acceptance on handoff failure", async () => {
  const accepted = [];
  const activations = [];
  const acceptanceRequest = () => new Request("https://www.roothealth.app/api/introducer-agreement/accept", {
    method: "POST", headers: { origin: "https://www.roothealth.app", "content-type": "application/json" },
    body: JSON.stringify({ action: "accept", token: "synthetic-token", review_hash: "synthetic-review-hash",
      evidence: { full_name: introducer.contact_name, role: "Director", organisation: "Synthetic Introducer",
        email: introducer.contact_email, date: "2026-11-24", confirmed: true, authority: true } }),
  });
  const base = {
    env: { VERCEL_ENV: "production", NEXT_PUBLIC_SITE_URL: "https://roothealth.app" },
    createDatabase: async () => ({ rpc: async () => ({ data: true, error: null }) }),
    reviewInvitation: async () => ({ agreement: { introducer_id: ids.introducer, terms_snapshot: { contact_email: introducer.contact_email, contact_name: introducer.contact_name, introducer_name: introducer.name } }, review: {}, acceptance: null, tokenHash: "synthetic-hash" }),
    buildEvidence: () => ({ full_name: introducer.contact_name, email: introducer.contact_email }),
    recordAcceptance: async (_db, details) => { accepted.push(details); return { error: null }; },
    activate: async details => { activations.push(details); throw new Error("Preview unavailable"); },
  };
  const pending = await handleAcceptance(acceptanceRequest(), { ...base, fulfil: async () => ({ pending: true }) });
  assert.equal(pending.status, 200);
  assert.equal((await pending.json()).accepted, true);
  assert.equal(activations.length, 0, "no invitation before the archived PDF fulfilment confirms completion");

  const archived = await handleAcceptance(acceptanceRequest(), { ...base, fulfil: async () => ({ pending: false }) });
  const body = await archived.json();
  assert.equal(archived.status, 200);
  assert.equal(body.accepted, true, "handoff failure must not undo the durable agreement acceptance");
  assert.equal(body.activationPending, true);
  assert.equal(activations.length, 1);
  assert.equal(activations[0].introducerId, ids.introducer);
  assert.equal(activations[0].action, "automatic_acceptance");
});


test("accepted authorised representative with frozen organisation matches Root onboarding verifier",()=>{
  const representative = structuredClone(agreementState);
  representative.agreements[0].acceptance.evidence = {
    full_name:"Brian Smith", email:introducer.contact_email, role:"Director",
    organisation:introducer.name, authority:true,
    authority_text:"I confirm I am authorised to act for the named organisation.",
    confirmed:true,
  };
  assert.equal(verifiedAcceptedAgreement(representative,ids.introducer,now).contactName,"Brian Smith");
  for(const override of [{authority:false},{organisation:"Wrong organisation"},{authority_text:null},{role:""},{confirmed:false}]) {
    const invalid=structuredClone(representative);
    Object.assign(invalid.agreements[0].acceptance.evidence,override);
    assert.throws(()=>verifiedAcceptedAgreement(invalid,ids.introducer,now),/matching identity and terms/);
  }
});

test("acceptance API rejects the apex after canonical redirect without weakening origin validation", async () => {
  const response = await handleAcceptance(new Request("https://www.roothealth.app/api/introducer-agreement/accept", {
    method: "POST", headers: { origin: "https://roothealth.app", "content-type": "application/json" }, body: "{}",
  }), { env: { VERCEL_ENV: "production", NEXT_PUBLIC_SITE_URL: "https://roothealth.app" } });
  assert.equal(response.status, 403);
});

test("Root verification callback validates the signed assertion against current archived acceptance", async () => {
  const assertion = signOnboardingAssertion({ action: "prepare", introducerId: ids.introducer,
    agreementId: ids.agreement, agreementVersion: 1, acceptanceId: ids.acceptance,
    acceptedAt, acceptedTermsHash: termsDigest, recipientEmail: introducer.contact_email,
    contactName: introducer.contact_name, requestId: ids.request, nonce: "a".repeat(64), activationExpiresAt }, secret, now.getTime());
  const response = await handleRootIntroducerOnboardingCallback(callbackRequest({ action: "verify", assertion }), {
    env: rootEnv, now: () => now, createDatabase: async () => ({}),
    loadState: async () => agreementState, readOnboarding: async () => ({ row: onboardingRow() }),
    verifyAccepted: verifiedAcceptedAgreement,
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).valid, true);
});

test("Root completion callback accepts only the matching short-lived Preview receipt and records it atomically", async () => {
  const row = onboardingRow();
  const grantExpiresAt = row.preview_grant_expires_at;
  const receipt = signPreviewActivationReceipt({
    action: "activation_complete", iss: INTRODUCER_PREVIEW_PROJECT_ID,
    previewVercelProjectId: INTRODUCER_PREVIEW_PROJECT_ID,
    previewSupabaseProjectRef: INTRODUCER_PREVIEW_SUPABASE_REF,
    vercelEnvironment: "preview", gitBranch: INTRODUCER_PREVIEW_BRANCH,
    previewDeploymentOrigin: previewOrigin, aud: callbackUrl, jti: ids.receipt,
    introducerId: ids.introducer, agreementId: ids.agreement, agreementVersion: 1,
    acceptanceId: ids.acceptance, acceptedAt, acceptedTermsHash: termsDigest,
    recipientEmail: introducer.contact_email, verifiedEmail: introducer.contact_email,
    contactName: introducer.contact_name, requestId: ids.request, nonce: "a".repeat(64),
    activationExpiresAt, previewUserId: ids.user, previewOnboardingId: ids.onboarding,
    grantId: ids.grant, grantExpiresAt,
  }, secret, now.getTime());
  const rpcCalls = [];
  const consumedJtis = new Set();
  const response = await handleRootIntroducerOnboardingCallback(callbackRequest({ action: "complete", receipt }), {
    env: rootEnv, now: () => now,
    createDatabase: async () => ({ rpc: async (name, args) => {
      rpcCalls.push({ name, args });
      if (consumedJtis.has(args.p_receipt_jti)) return { data: false, error: null };
      consumedJtis.add(args.p_receipt_jti);
      return { data: true, error: null };
    } }),
    loadState: async () => agreementState, readOnboarding: async () => ({ row }),
    verifyAccepted: verifiedAcceptedAgreement,
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { valid: true, activated: true });
  assert.equal(rpcCalls.length, 1);
  assert.equal(rpcCalls[0].name, "complete_professional_introducer_onboarding");
  assert.equal(rpcCalls[0].args.p_receipt_jti, ids.receipt);
  const replay = await handleRootIntroducerOnboardingCallback(callbackRequest({ action: "complete", receipt }), {
    env: rootEnv, now: () => now,
    createDatabase: async () => ({ rpc: async (_name, args) => ({ data: consumedJtis.has(args.p_receipt_jti) ? false : true, error: null }) }),
    loadState: async () => agreementState, readOnboarding: async () => ({ row }),
    verifyAccepted: verifiedAcceptedAgreement,
  });
  assert.equal(replay.status, 503, "a consumed receipt cannot be reported successful twice");
});

test("callback rejects incorrect origin and invalid signature before accepting activation", async () => {
  const badOrigin = new Request("https://attacker.example/api/admin/introducers/onboarding", {
    method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "verify", assertion: "bad" }),
  });
  const rejectedOrigin = await handleRootIntroducerOnboardingCallback(badOrigin, { env: rootEnv, now: () => now, createDatabase: async () => ({}) });
  assert.notEqual(rejectedOrigin.status, 200);
  const badSignature = await handleRootIntroducerOnboardingCallback(callbackRequest({ action: "verify", assertion: "not.a.valid.signature" }), {
    env: rootEnv, now: () => now, createDatabase: async () => ({}), verifyAccepted: verifiedAcceptedAgreement,
  });
  assert.equal(badSignature.status, 401);
});

test("completion callback rejects expired or invalid receipts without recording activation", async () => {
  const makeReceipt = ({ expiresAt = activationExpiresAt, nonce = "a".repeat(64) } = {}) => signPreviewActivationReceipt({
    action: "activation_complete", iss: INTRODUCER_PREVIEW_PROJECT_ID,
    previewVercelProjectId: INTRODUCER_PREVIEW_PROJECT_ID,
    previewSupabaseProjectRef: INTRODUCER_PREVIEW_SUPABASE_REF,
    vercelEnvironment: "preview", gitBranch: INTRODUCER_PREVIEW_BRANCH,
    previewDeploymentOrigin: previewOrigin, aud: callbackUrl, jti: ids.receipt,
    introducerId: ids.introducer, agreementId: ids.agreement, agreementVersion: 1,
    acceptanceId: ids.acceptance, acceptedAt, acceptedTermsHash: termsDigest,
    recipientEmail: introducer.contact_email, verifiedEmail: introducer.contact_email,
    contactName: introducer.contact_name, requestId: ids.request, nonce,
    activationExpiresAt: expiresAt, previewUserId: ids.user, previewOnboardingId: ids.onboarding,
    grantId: ids.grant, grantExpiresAt: new Date(now.getTime() + 20 * 86400_000).toISOString(),
  }, secret, now.getTime());
  let rpcCount = 0;
  const dependencies = {
    env: rootEnv, now: () => now,
    createDatabase: async () => ({ rpc: async () => { rpcCount++; return { data: true, error: null }; } }),
    loadState: async () => agreementState,
    readOnboarding: async () => ({ row: onboardingRow() }),
    verifyAccepted: verifiedAcceptedAgreement,
  };
  const expired = await handleRootIntroducerOnboardingCallback(callbackRequest({ action: "complete", receipt: makeReceipt({ expiresAt: "2026-11-24T11:59:59.000Z" }) }), dependencies);
  assert.equal(expired.status, 401);
  const malformed = await handleRootIntroducerOnboardingCallback(callbackRequest({ action: "complete", receipt: "not.a.receipt" }), dependencies);
  assert.equal(malformed.status, 401);
  assert.equal(rpcCount, 0);
});

test("admin callback route imports and passes the authoritative archived-agreement verifier", async () => {
  const source = await readFile(new URL("../app/api/admin/introducers/onboarding/route.js", import.meta.url), "utf8");
  assert.match(source, /import\s*\{[^}]*verifiedAcceptedAgreement[^}]*\}\s*from\s*["']\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/lib\/professionalIntroducerOnboarding\.server\.js["']/s);
  assert.match(source, /handleRootIntroducerOnboardingCallback\(request,\s*\{\s*verifyAccepted:\s*verifiedAcceptedAgreement\s*\}\)/);
});
