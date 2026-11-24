import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  INTRODUCER_RESTRICTED_ACTIONS,
  UNMETERED_INTRODUCER_AI_ROUTES,
  introducerRequestDecision,
  introducerDeploymentStatus,
  isIntroducerDeployment,
  isUnmeteredIntroducerAiRoute,
  restrictedIntroducerAction,
  shouldBlockIntroducerAction,
} from "../lib/introducerRestrictedActions.server.js";

const introducerEnv = {
  ROOT_DEPLOYMENT_MODE: "introducer",
  VERCEL_ENV: "preview",
  VERCEL_GIT_COMMIT_REF: "codex/professional-introducer-demo",
  VERCEL_PROJECT_ID: "prj_5FntyaVgI1tQ7Q3IMKfkSTb2ETut",
  ROOT_INTRODUCER_VERCEL_PROJECT_ID: "prj_5FntyaVgI1tQ7Q3IMKfkSTb2ETut",
  NEXT_PUBLIC_SUPABASE_URL: "https://waluyphoafylzcjuskcl.supabase.co",
  ROOT_INTRODUCER_SUPABASE_PROJECT_REF: "waluyphoafylzcjuskcl",
  ROOT_PRODUCTION_SUPABASE_PROJECT_REF: "witkwlgldxjwwxmpcyva",
  ROOT_AUTH_PREVIEW_URL: "https://root-health-introducer-demo-preview.vercel.app",
};
const productionEnv = {
  VERCEL_ENV: "production",
  VERCEL_PROJECT_ID: "prj_XRyykP2byrJeHZ5hkI3QpGOjF2oO",
  NEXT_PUBLIC_SUPABASE_URL: "https://witkwlgldxjwwxmpcyva.supabase.co",
};
const introducerProductionEnv = { ...introducerEnv, VERCEL_ENV: "production" };

const prohibitedRoutes = [
  ["/start", "account_creation"],
  ["/personal/join", "account_creation"],
  ["/workplace-setup", "account_creation"],
  ["/api/organisation/apply", "organisation_application"],
  ["/organisation/register", "organisation_application"],
  ["/api/organisation/applications", "organisation_provisioning"],
  ["/workplace-applications", "organisation_provisioning"],
  ["/api/organisation/setup-invite", "administrator_invitation"],
  ["/organisation/hr-join", "administrator_invitation_acceptance"],
  ["/api/organisation/workforce-invitations", "employee_invitation"],
  ["/organisation/join", "employee_invitation_acceptance"],
  ["/api/organisation/workforce-import", "workforce_provisioning"],
  ["/api/capacity-check", "external_email_capture"],
  ["/api/introducer-agreement/accept", "commercial_agreement_service"],
  ["/api/personal/acquisition/aggregate", "customer_acquisition_ops"],
  ["/api/personal/acquisition/event", "customer_acquisition_tracking"],
  ["/api/stripe/personal-checkout", "personal_subscription"],
  ["/api/stripe/workplace-checkout", "workplace_subscription"],
  ["/api/stripe/personal-webhook", "personal_entitlement"],
  ["/api/stripe/workplace-webhook", "workplace_entitlement"],
  ["/api/stripe/unclassified-commercial-action", "commercial_entitlement"],
  ["/api/referral/validate", "referral_entitlement"],
  ["/api/admin/introducers", "root_administration"],
  ["/api/admin/introducers/settlement", "root_administration"],
  ["/api/admin/documents/123/pdf", "root_administration"],
  ["/admin/introducers", "root_administration"],
];

test("every prohibited account, organisation, invitation, entitlement and admin route is denied in introducer deployment", () => {
  for (const [path, expectedAction] of prohibitedRoutes) {
    assert.equal(restrictedIntroducerAction(path), expectedAction, path);
    assert.equal(shouldBlockIntroducerAction(path, introducerEnv), expectedAction, path);
  }
  for (const [path] of prohibitedRoutes) {
    assert.ok(shouldBlockIntroducerAction(path, introducerEnv), path);
  }
});

test("Next proxy applies the server-side policy and emits a non-cacheable 403", async () => {
  const source = await readFile(new URL("../proxy.js", import.meta.url), "utf8");
  assert.match(source, /introducerRequestDecision\(request\.nextUrl\.pathname\)/);
  assert.match(source, /decision\.type === "misconfigured"/);
  assert.match(source, /status: 503/);
  assert.match(source, /decision\.type === "next"/);
  assert.match(source, /isUnmeteredIntroducerAiRoute/);
  assert.match(source, /shared monthly budget controls/);
  assert.match(source, /status: 503/);
  assert.match(source, /status: 403/);
  assert.match(source, /Cache-Control.*no-store/);
  assert.match(source, /matcher:[\s\S]*"\/\(\(\?!_next\/static\|_next\/image\|favicon\.ico\)\.\*\)"/);
  assert.doesNotMatch(source, /request\.method/);
});

test("unmetered AI provider routes fail closed only in introducer Preview while metered Realtime and Production remain available", async () => {
  const source = await readFile(new URL("../proxy.js", import.meta.url), "utf8");
  for (const path of UNMETERED_INTRODUCER_AI_ROUTES) assert.equal(isUnmeteredIntroducerAiRoute(path), true, path);
  assert.equal(isUnmeteredIntroducerAiRoute("/api/realtime-session"), false);
  assert.match(source, /isIntroducerDeployment\(process\.env\)\s*&&\s*isUnmeteredIntroducerAiRoute/);
  for (const path of UNMETERED_INTRODUCER_AI_ROUTES) {
    assert.equal(isIntroducerDeployment(introducerEnv), true, path);
    assert.equal(isIntroducerDeployment(productionEnv), false, path);
  }
});

test("each protected distribution action category is represented by the route policy", () => {
  const covered = new Set(prohibitedRoutes.map(([, action]) => action));
  for (const action of INTRODUCER_RESTRICTED_ACTIONS) {
    assert.ok(covered.has(action), `Missing negative route test for ${action}`);
  }
});

test("introducer mode requires explicit branch, project, isolated database, production identity and protected auth origin", () => {
  assert.equal(introducerDeploymentStatus(introducerEnv), "introducer_verified");
  for (const env of [
    { ...introducerEnv, ROOT_DEPLOYMENT_MODE: undefined },
    { ...introducerEnv, ROOT_DEPLOYMENT_MODE: "production" },
    { ...introducerEnv, VERCEL_ENV: undefined },
    { ...introducerEnv, VERCEL_ENV: "development" },
    { ...introducerEnv, VERCEL_GIT_COMMIT_REF: "main" },
    { ...introducerEnv, ROOT_INTRODUCER_VERCEL_PROJECT_ID: "" },
    { ...introducerEnv, ROOT_INTRODUCER_VERCEL_PROJECT_ID: "another-project" },
    { ...introducerEnv, ROOT_INTRODUCER_SUPABASE_PROJECT_REF: "" },
    { ...introducerEnv, ROOT_INTRODUCER_SUPABASE_PROJECT_REF: "another-project" },
    { ...introducerEnv, ROOT_PRODUCTION_SUPABASE_PROJECT_REF: "" },
    { ...introducerEnv, ROOT_PRODUCTION_SUPABASE_PROJECT_REF: "another-project" },
    { ...introducerEnv, ROOT_AUTH_PREVIEW_URL: "" },
    { ...introducerEnv, ROOT_AUTH_PREVIEW_URL: "https://partners-preview.roothealth.app" },
  ]) assert.equal(introducerDeploymentStatus(env), "misconfigured");

  assert.equal(introducerDeploymentStatus({
    VERCEL_ENV: "preview",
    VERCEL_GIT_COMMIT_REF: "codex/professional-introducer-demo",
  }), "misconfigured");
  assert.equal(isIntroducerDeployment(introducerEnv), true);
  assert.equal(introducerDeploymentStatus({ ...introducerEnv, VERCEL_PROJECT_ID: "prj-customer-production" }), "misconfigured");
  assert.equal(introducerDeploymentStatus({ ...introducerEnv, VERCEL_PROJECT_ID: "prj_XRyykP2byrJeHZ5hkI3QpGOjF2oO" }), "misconfigured");
  assert.equal(introducerDeploymentStatus({ ...introducerEnv, ROOT_INTRODUCER_VERCEL_PROJECT_ID: "prj_XRyykP2byrJeHZ5hkI3QpGOjF2oO" }), "misconfigured");
  assert.equal(introducerDeploymentStatus({ ...introducerEnv, NEXT_PUBLIC_SUPABASE_URL: productionEnv.NEXT_PUBLIC_SUPABASE_URL }), "misconfigured");
  assert.equal(introducerDeploymentStatus({ ...introducerEnv, ROOT_PRODUCTION_SUPABASE_PROJECT_REF: "waluyphoafylzcjuskcl" }), "misconfigured");
  assert.equal(shouldBlockIntroducerAction("/api/stripe/personal-checkout", introducerEnv), "personal_subscription");
});

test("production routes remain available and genuine product routes are not classified as distribution actions", () => {
  for (const [path] of prohibitedRoutes) {
    assert.equal(shouldBlockIntroducerAction(path, productionEnv), null, path);
  }
  for (const path of ["/assessment", "/check-in", "/mind", "/journal", "/introducer", "/api/introducer/demo", "/api/organisation/insights"]) {
    assert.equal(shouldBlockIntroducerAction(path, introducerEnv), null, path);
  }
});

test("dedicated introducer project remains restricted even when Vercel labels its deployment Production", () => {
  assert.equal(introducerDeploymentStatus(introducerProductionEnv), "introducer_verified");
  assert.equal(isIntroducerDeployment(introducerProductionEnv), true);
  for (const [path, action] of prohibitedRoutes) {
    assert.equal(shouldBlockIntroducerAction(path, introducerProductionEnv), action, path);
  }
  assert.equal(isUnmeteredIntroducerAiRoute("/api/root-coach"), true);
  assert.equal(introducerDeploymentStatus({ ...introducerProductionEnv, VERCEL_GIT_COMMIT_REF: "main" }), "misconfigured");
  assert.equal(introducerDeploymentStatus({ ...introducerProductionEnv, NEXT_PUBLIC_SUPABASE_URL: productionEnv.NEXT_PUBLIC_SUPABASE_URL }), "misconfigured");
  assert.equal(introducerDeploymentStatus({ ...introducerProductionEnv, VERCEL_PROJECT_ID: "prj_XRyykP2byrJeHZ5hkI3QpGOjF2oO" }), "misconfigured");
});

test("known Root Health Production preserves customer behavior only with its expected identity", () => {
  assert.equal(introducerDeploymentStatus(productionEnv), "customer");
  assert.equal(isIntroducerDeployment(productionEnv), false);
  for (const [path] of prohibitedRoutes) {
    assert.equal(shouldBlockIntroducerAction(path, productionEnv), null, path);
    assert.deepEqual(introducerRequestDecision(path, productionEnv), { type: "next", status: 200 }, path);
  }
  assert.equal(introducerDeploymentStatus({ ...productionEnv, ROOT_DEPLOYMENT_MODE: "introducer" }), "misconfigured");
  assert.equal(introducerDeploymentStatus({ ...productionEnv, VERCEL_GIT_COMMIT_REF: "codex/professional-introducer-demo" }), "misconfigured");
  assert.equal(introducerDeploymentStatus({ ...productionEnv, NEXT_PUBLIC_SUPABASE_URL: "https://waluyphoafylzcjuskcl.supabase.co" }), "misconfigured");
});

test("unknown Vercel project and missing project identity fail closed while local development remains customer mode", () => {
  assert.equal(introducerDeploymentStatus({ VERCEL_ENV: "preview", VERCEL_PROJECT_ID: "prj-unknown", NEXT_PUBLIC_SUPABASE_URL: productionEnv.NEXT_PUBLIC_SUPABASE_URL }), "misconfigured");
  assert.equal(introducerDeploymentStatus({ VERCEL_ENV: "production", NEXT_PUBLIC_SUPABASE_URL: productionEnv.NEXT_PUBLIC_SUPABASE_URL }), "misconfigured");
  assert.equal(introducerDeploymentStatus({}), "customer");
});

test("normal Production registration, subscription, employer, invitation and product routes retain their existing access path", () => {
  for (const path of [
    "/start", "/login", "/forgot-password", "/api/auth/register",
    "/api/stripe/personal-checkout", "/api/stripe/workplace-checkout",
    "/workplace-applications", "/api/organisation/apply",
    "/api/organisation/setup-invite", "/api/organisation/workforce-invitations",
    "/assessment", "/check-in", "/journal", "/org-insights", "/api/organisation/insights",
  ]) {
    assert.equal(shouldBlockIntroducerAction(path, productionEnv), null, path);
    assert.deepEqual(introducerRequestDecision(path, productionEnv), { type: "next", status: 200 }, path);
  }
  assert.equal(introducerDeploymentStatus(productionEnv), "customer");
});

test("blocked distribution paths are denied without regard to HTTP method or URL query values", () => {
  const path = "/api/organisation/workforce-invitations?role=admin&organisation_id=customer";
  for (const method of ["GET", "POST", "PUT", "PATCH", "DELETE"]) {
    // Middleware policy is path-only; method and caller-supplied query values are never authorization inputs.
    assert.deepEqual(introducerRequestDecision(path.split("?")[0], introducerEnv), {
      type: "blocked", action: "employee_invitation", status: 403,
    }, method);
  }
});

test("Realtime is no longer a blanket middleware block; its endpoint owns grant and quota authorisation", async () => {
  const path = "/api/realtime-session";
  assert.deepEqual(introducerRequestDecision(path, introducerEnv), { type: "next", status: 200 });
  assert.deepEqual(introducerRequestDecision(path, productionEnv), { type: "next", status: 200 });
  const guard = await readFile(new URL("../lib/realtimeSessionGuard.server.js", import.meta.url), "utf8");
  assert.match(guard, /authorizeProfessionalIntroducer/);
  assert.match(guard, /voice_coach_enabled/);
  assert.match(guard, /reserve_professional_introducer_voice_session/);
});

test("genuine Coach UI asks for microphone access only when the server-reported grant includes Voice", async () => {
  const source = await readFile(new URL("../app/coach/page.js", import.meta.url), "utf8");
  assert.match(source, /introducerVoiceUnavailable = identity\?\.introducerDemo\?\.enabled === true && identity\?\.introducerDemo\?\.voiceCoachAvailable !== true/);
  assert.match(source, /disabled=\{introducerVoiceUnavailable\}/);
  assert.match(source, /if \(introducerVoiceUnavailable\) return/);
  assert.match(source, /Live Voice Coach is not enabled for your demonstration account/);
  assert.match(source, /session-safety controls are completed/);
});

test("a selected introducer deployment with missing, malformed or Production-matching identity fails closed", () => {
  for (const env of [
    { ROOT_DEPLOYMENT_MODE: "introducer" },
    { ...introducerEnv, VERCEL_PROJECT_ID: "" },
    { ...introducerEnv, NEXT_PUBLIC_SUPABASE_URL: "not-a-url" },
  ]) assert.equal(introducerDeploymentStatus(env), "misconfigured");
});

test("unrecognised deployment mode does not block Production or local development", () => {
  const env = { VERCEL_ENV: "production", NEXT_PUBLIC_SUPABASE_URL: "https://customer-project.supabase.co" };
  assert.equal(isIntroducerDeployment(env), false);
  assert.equal(shouldBlockIntroducerAction("/api/organisation/workforce-invitations", env), null);
});
