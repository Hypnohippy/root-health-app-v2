import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { agreementTerms, termsHash } from "../lib/introducerGoogleAgreementTerms.js";
import { previewInternalUrl, sendIntroducerActivation } from "../lib/introducerActivationHandoff.server.js";
import { INTRODUCER_PREVIEW_PROJECT_ID, INTRODUCER_PREVIEW_SUPABASE_REF, introducerActivationOrigin } from "../lib/professionalIntroducerOnboarding.server.js";

const ids = {
  introducer: "11111111-1111-4111-8111-111111111111",
  agreement: "22222222-2222-4222-8222-222222222222",
  acceptance: "33333333-3333-4333-8333-333333333333",
  onboarding: "44444444-4444-4444-8444-444444444444",
};
const sharedSecret = "synthetic-onboarding-secret-for-unit-tests-only-32-bytes";
const previewOrigin = "https://root-health-introducer-demo-fixture.vercel.app";
const customerOrigin = "https://partners.roothealth.example";
const activationLinkFor = origin => `https://${INTRODUCER_PREVIEW_SUPABASE_REF}.supabase.co/auth/v1/verify?token=synthetic-token&type=invite&redirect_to=${encodeURIComponent(`${origin}/reset-password?next=%2Fintroducer`)}`;
const activationLink = activationLinkFor(previewOrigin);

const introducer = {
  id: ids.introducer,
  name: "Synthetic Introducer",
  contact_name: "Synthetic Introducer",
  contact_email: "synthetic-introducer@example.test",
  introducer_market: "corporate",
  introducer_type: "corporate_introducer",
  referral_code: "synthetic",
  vat_registered: false,
  vat_number: null,
  agreement_start_date: "2026-01-01",
  agreement_end_date: null,
  status: "active",
};
const policy = {
  commission_percent: 20,
  commission_basis: "collected_subscription_revenue",
  commission_structure: "one_off",
  effective_from: "2026-01-01T00:00:00.000Z",
  effective_until: null,
};
const frozenTerms = agreementTerms(introducer, [policy], "None");
const frozenHash = termsHash(frozenTerms);
const acceptedAt = "2026-11-20T10:00:00.000Z";

function agreementState({ archived = true, accepted = true } = {}) {
  const acceptance = {
    id: ids.acceptance,
    accepted_at: acceptedAt,
    evidence: { full_name: introducer.contact_name, email: introducer.contact_email },
    terms_snapshot: frozenTerms,
    terms_hash: frozenHash,
    archive_state: archived ? "archived" : "pending",
  };
  return {
    introducer,
    policies: [policy],
    agreements: [{
      id: ids.agreement,
      version: 1,
      status: accepted ? "accepted" : "sent",
      accepted_at: acceptedAt,
      sent_to: introducer.contact_email,
      terms_snapshot: frozenTerms,
      accepted_terms_snapshot: frozenTerms,
      terms_hash: frozenHash,
      acceptance: accepted ? acceptance : null,
    }],
  };
}

function rootEnv(overrides = {}) {
  const allowed = "https://roothealth.app,https://www.roothealth.app";
  return {
    ROOT_INTRODUCER_ONBOARDING_ENABLED: "true",
    VERCEL_ENV: "production",
    VERCEL_PROJECT_ID: "prj_XRyykP2byrJeHZ5hkI3QpGOjF2oO",
    VERCEL_GIT_COMMIT_REF: "main",
    ROOT_PRODUCTION_SUPABASE_PROJECT_REF: "witkwlgldxjwwxmpcyva",
    NEXT_PUBLIC_SUPABASE_URL: "https://witkwlgldxjwwxmpcyva.supabase.co",
    ROOT_INTRODUCER_ALLOWED_CALLBACK_ORIGINS: allowed,
    ROOT_AUTH_PREVIEW_URL: previewOrigin,
    ROOT_INTRODUCER_PREVIEW_ALLOWED_ORIGINS: previewOrigin,
    ROOT_INTRODUCER_CUSTOMER_URL: customerOrigin,
    ROOT_INTRODUCER_CUSTOMER_ALLOWED_ORIGINS: customerOrigin,
    ROOT_INTRODUCER_HANDOFF_MODE: "preview",
    ROOT_INTRODUCER_VERCEL_PROJECT_ID: INTRODUCER_PREVIEW_PROJECT_ID,
    ROOT_INTRODUCER_SUPABASE_PROJECT_REF: INTRODUCER_PREVIEW_SUPABASE_REF,
    ROOT_INTRODUCER_ONBOARDING_SHARED_SECRET: sharedSecret,
    ...overrides,
  };
}

test("Root always targets the protected Preview API while activation origin follows the explicit mode",()=>{
  assert.equal(previewInternalUrl(rootEnv()),`${previewOrigin}/api/internal/introducer-onboarding`);
  const customerMode=rootEnv({ROOT_INTRODUCER_HANDOFF_MODE:"customer"});
  assert.equal(previewInternalUrl(customerMode),`${previewOrigin}/api/internal/introducer-onboarding`);
  assert.equal(introducerActivationOrigin(rootEnv()),previewOrigin);
  assert.equal(introducerActivationOrigin(customerMode),customerOrigin);
  assert.throws(()=>previewInternalUrl(rootEnv({ROOT_INTRODUCER_HANDOFF_MODE:"unknown"})));
});

function mockRootDb(initialRow = null) {
  let onboarding = initialRow;
  const events = [];
  const from = (table) => {
    let operation = "select";
    let values;
    let selected = false;
    const filters = [];
    const query = {
      select() { selected = true; return query; },
      eq(key, value) { filters.push([key, value]); return query; },
      insert(input) { operation = "insert"; values = input; return query; },
      update(input) { operation = "update"; values = input; return query; },
      single() { return settle(true); },
      maybeSingle() { return settle(false); },
      then(resolve, reject) { return settle(false).then(resolve, reject); },
    };
    function settle(single) {
      try {
        if (table === "organisation_introducer_onboarding") {
          if (operation === "select") return Promise.resolve({ data: onboarding });
          if (operation === "insert") {
            if (onboarding) return Promise.resolve({ data: null, error: new Error("unique introducer") });
            onboarding = { id: ids.onboarding, ...values };
            return Promise.resolve({ data: selected ? { id: onboarding.id } : onboarding, error: null });
          }
          const matches = filters.every(([key, value]) => onboarding?.[key] === value);
          if (!matches) return Promise.resolve({ data: null, error: null });
          onboarding = { ...onboarding, ...values };
          return Promise.resolve({ data: selected ? { id: onboarding.id } : null, error: null });
        }
        if (table === "organisation_introducer_onboarding_events") {
          if (operation === "insert") events.push(values);
          return Promise.resolve({ data: null, error: null });
        }
        throw new Error(`Unexpected table ${table}`);
      } catch (error) { return Promise.reject(error); }
    }
    return query;
  };
  return { db: { from }, get onboarding() { return onboarding; }, events };
}

function request({ oidc = "synthetic-platform-oidc" } = {}) {
  return new Request("https://www.roothealth.app/api/introducer-agreement/accept", {
    method: "POST",
    headers: oidc ? { "x-vercel-oidc-token": oidc } : {},
  });
}

function collaborators({ state = agreementState(), row = null, fetcher, mailer, env = rootEnv() } = {}) {
  const store = mockRootDb(row);
  const calls = { preview: [], mail: [] };
  return {
    db: store.db,
    get onboarding() { return store.onboarding; },
    events: store.events,
    calls,
    env,
    readAgreementState: async () => state,
    readOnboarding: async () => ({ row: store.onboarding, events: [] }),
    fetcher: fetcher || (async (url, options) => {
      calls.preview.push({ url, options });
      const action = JSON.parse(options.body).action;
      const activationOrigin=env.ROOT_INTRODUCER_HANDOFF_MODE==="customer"?customerOrigin:previewOrigin;
      return Response.json(action === "prepare" || action === "replace" ? { actionLink: activationLinkFor(activationOrigin) } : { success: true });
    }),
    mailer: mailer || (async input => { calls.mail.push(input); return { message_id: "synthetic-delivery" }; }),
  };
}

async function run(c, req = request(), action = "automatic_acceptance") {
  return sendIntroducerActivation({
    db: c.db,
    introducerId: ids.introducer,
    request: req,
    action,
    env: c.env,
    fetcher: c.fetcher,
    mailer: c.mailer,
    readAgreementState: c.readAgreementState,
    readOnboarding: c.readOnboarding,
    now: () => new Date("2026-11-24T12:00:00.000Z"),
  });
}

test("verified archived acceptance prepares one Preview identity and sends one activation email", async () => {
  const c = collaborators();
  const result = await run(c);
  assert.equal(result.state, "activation_sent");
  assert.equal(result.alreadyStarted, false);
  assert.equal(c.onboarding.state, "activation_sent");
  assert.equal(c.onboarding.agreement_id, ids.agreement);
  assert.equal(c.onboarding.acceptance_id, ids.acceptance);
  assert.equal(c.onboarding.recipient_email, introducer.contact_email);
  assert.equal(c.onboarding.activation_expires_at, "2026-11-24T12:15:00.000Z");
  assert.equal(c.calls.preview.length, 3);
  assert.equal(JSON.parse(c.calls.preview[0].options.body).action, "preflight");
  assert.equal(new URL(c.calls.preview[0].url).hostname, "root-health-introducer-demo-fixture.vercel.app");
  assert.equal(c.calls.preview.some(call => call.url.includes("witkwlgldxjwwxmpcyva")), false);
  assert.equal(c.calls.mail.length, 1);
  assert.equal(c.calls.mail[0].recipient, introducer.contact_email);
  assert.equal(c.calls.mail[0].actionLink, activationLink);
  const assertion=JSON.parse(Buffer.from(JSON.parse(c.calls.preview[0].options.body).assertion.split(".")[0], "base64url").toString("utf8"));
  assert.equal(assertion.activationOrigin,previewOrigin);
  assert.equal(assertion.customerVercelProjectId,INTRODUCER_PREVIEW_PROJECT_ID);
  assert.equal(assertion.customerSupabaseProjectRef,INTRODUCER_PREVIEW_SUPABASE_REF);
  assert.equal(c.events.some(event => event.actor_id === null && event.event_type === "activation_preparing" && event.details.trigger === "verified_acceptance"), true);
});

test("customer mode binds both internal handoff and activation link to the exact dedicated customer origin",async()=>{
  const c=collaborators({env:rootEnv({ROOT_INTRODUCER_HANDOFF_MODE:"customer"})});
  const result=await run(c);
  assert.equal(result.state,"activation_sent");
  assert.equal(new URL(c.calls.preview[0].url).origin,previewOrigin);
  assert.equal(c.calls.preview[0].options.headers["x-vercel-trusted-oidc-idp-token"],"synthetic-platform-oidc");
  assert.equal(new URL(new URL(c.calls.mail[0].actionLink).searchParams.get("redirect_to")).origin,customerOrigin);
  const assertion=JSON.parse(Buffer.from(JSON.parse(c.calls.preview[0].options.body).assertion.split(".")[0],"base64url").toString("utf8"));
  assert.equal(assertion.activationOrigin,customerOrigin);
});

test("agreement sent or acceptance archive pending cannot prepare Preview identity or send email", async () => {
  for (const state of [agreementState({ accepted: false }), agreementState({ archived: false })]) {
    const c = collaborators({ state });
    await assert.rejects(run(c), /current, archived agreement acceptance/);
    assert.equal(c.onboarding, null);
    assert.equal(c.calls.preview.length, 0);
    assert.equal(c.calls.mail.length, 0);
  }
});

test("repeat acceptance does not resend an invitation already started", async () => {
  const c = collaborators({ row: { id: ids.onboarding, introducer_id: ids.introducer, state: "activation_sent" } });
  const result = await run(c);
  assert.deepEqual(result, { state: "activation_sent", alreadyStarted: true });
  assert.equal(c.calls.preview.length, 0);
  assert.equal(c.calls.mail.length, 0);
});

test("concurrent automatic acceptance requests claim one onboarding row and send at most once", async () => {
  const c = collaborators();
  const results = await Promise.allSettled([run(c), run(c)]);
  assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
  assert.equal(results.filter(result => result.status === "rejected").length, 1);
  assert.equal(c.calls.preview.filter(call => JSON.parse(call.options.body).action === "prepare").length, 1);
  assert.equal(c.calls.mail.length, 1);
  assert.equal(c.onboarding.state, "activation_sent");
});


test("existing invited email is rejected by signed preflight with no Root onboarding write or email", async () => {
  const c = collaborators({fetcher: async (_url,options) => {
    assert.equal(JSON.parse(options.body).action, "preflight");
    return Response.json({code:"existing_account"}, {status:409});
  }});
  await assert.rejects(run(c), /already has an Introducer demo account/);
  assert.equal(c.onboarding,null);
  assert.equal(c.events.length,0);
  assert.equal(c.calls.mail.length,0);
});

test("missing trusted OIDC fails before onboarding state or outbound requests", async () => {
  const c = collaborators();
  await assert.rejects(run(c, request({ oidc: null })), /trusted OIDC/);
  assert.equal(c.onboarding, null);
  assert.equal(c.calls.preview.length, 0);
  assert.equal(c.calls.mail.length, 0);
});

test("Preview prepare uncertainty is recorded and automatic retry does not duplicate", async () => {
  const c = collaborators({ fetcher: async () => Response.json({ error: "synthetic" }, { status: 503 }) });
  await assert.rejects(run(c), /could not confirm activation preparation/);
  assert.equal(c.onboarding, null);
  assert.equal(c.events.length, 0);
  assert.equal(c.calls.mail.length, 0);
  const count = c.calls.preview.length;
  await assert.rejects(run(c), /did not confirm/);
  assert.equal(c.calls.preview.length, count + 1);
});

test("uncertain email delivery is recorded without blind resend", async () => {
  const c = collaborators({ mailer: async () => { throw new Error("synthetic transport failure"); } });
  await assert.rejects(run(c), /delivery is unconfirmed/);
  assert.equal(c.onboarding.state, "activation_uncertain");
  assert.equal(c.events.some(event => event.event_type === "activation_uncertain" && event.details.stage === "email_delivery"), true);
  const previewCalls = c.calls.preview.length;
  await run(c);
  assert.equal(c.calls.preview.length, previewCalls);
  assert.equal(c.calls.mail.length, 0);
});

test("Preview identity or Root bridge mismatch fails closed before writing state", async () => {
  const c = collaborators({ env: rootEnv({ VERCEL_GIT_COMMIT_REF: "codex/professional-introducer-demo" }) });
  await assert.rejects(run(c), /not enabled on this verified Root commercial deployment/);
  assert.equal(c.onboarding, null);
  assert.equal(c.calls.preview.length, 0);
  assert.equal(c.calls.mail.length, 0);
});

test("the public acceptance handler invokes automatic handoff only after durable consent and archived fulfillment", async () => {
  const source = await readFile(new URL("../app/api/introducer-agreement/accept/route.js", import.meta.url), "utf8");
  const handoffSource = await readFile(new URL("../lib/introducerActivationHandoff.server.js", import.meta.url), "utf8");
  assert.match(source, /export async function handleAcceptance\(/);
  assert.match(source, /db\.rpc\('accept_introducer_agreement'/);
  assert.match(source, /if\(!pending\)\s*\{\s*try\s*\{\s*const activation=await activate\(/s);
  assert.match(source, /fulfilAcceptance\(\{db,agreement/);
  assert.match(source, /activationPending=!\['activation_sent','activated'\]\.includes\(activation\.state\)/);
  assert.match(handoffSource, /verifiedAcceptedAgreement\(agreementState, introducerId, timestamp\)/);
});

test("expired uncertain invitation can use the existing explicit replacement path; unexpired invitation cannot", async () => {
  const expired = collaborators({ row: {
    id: ids.onboarding,
    introducer_id: ids.introducer,
    state: "activation_uncertain",
    activation_expires_at: "2026-11-24T11:59:59.000Z",
  } });
  const replaced = await run(expired, request(), "replace_invitation");
  assert.equal(replaced.state, "activation_sent");
  assert.equal(expired.calls.preview.length, 3);
  assert.equal(JSON.parse(expired.calls.preview[0].options.body).action, "preflight");
  assert.equal(JSON.parse(expired.calls.preview[1].options.body).action, "replace");
  assert.equal(expired.calls.mail.length, 1);

  const stillLive = collaborators({ row: {
    id: ids.onboarding,
    introducer_id: ids.introducer,
    state: "activation_uncertain",
    activation_expires_at: "2026-11-24T12:01:00.000Z",
  } });
  await assert.rejects(run(stillLive, request(), "replace_invitation"), /Only an expired/);
  assert.equal(stillLive.calls.preview.length, 0);
  assert.equal(stillLive.calls.mail.length, 0);
});
