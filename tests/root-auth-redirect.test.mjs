import test from "node:test";
import assert from "node:assert/strict";
import { buildRootAuthRedirectUrl } from "../lib/rootAuthRedirect.server.js";

const preview = {
  flow: "recovery",
  requestOrigin: "https://untrusted-deployment.vercel.app",
  vercelEnv: "preview",
  gitBranch: "codex/professional-introducer-demo",
  previewBaseUrl: "https://partners-preview.roothealth.app",
  supabaseUrl: "https://preview123.supabase.co",
  previewProjectRef: "preview123",
  productionProjectRef: "prod456",
};

test("introducer Preview uses only its configured stable HTTPS callback", () => {
  assert.equal(
    buildRootAuthRedirectUrl(preview),
    "https://partners-preview.roothealth.app/reset-password?next=%2Fintroducer",
  );
});

test("introducer Preview fails closed when its stable URL is missing or unsafe", () => {
  assert.equal(buildRootAuthRedirectUrl({ ...preview, previewBaseUrl: "" }), null);
  assert.equal(
    buildRootAuthRedirectUrl({ ...preview, previewBaseUrl: "https://roothealth.app" }),
    null,
  );
  assert.equal(
    buildRootAuthRedirectUrl({ ...preview, previewBaseUrl: "http://partners-preview.roothealth.app" }),
    null,
  );
  assert.equal(buildRootAuthRedirectUrl({ ...preview, previewProjectRef: "prod456" }), null);
  assert.equal(buildRootAuthRedirectUrl({ ...preview, supabaseUrl: "https://prod456.supabase.co" }), null);
});

test("Production recovery uses the configured canonical Root site, not the request Host", () => {
  assert.equal(
    buildRootAuthRedirectUrl({
      flow: "recovery",
      requestOrigin: "https://attacker.invalid",
      vercelEnv: "production",
      publicSiteUrl: "https://roothealth.app",
    }),
    "https://roothealth.app/reset-password",
  );
});

test("only supported auth flows produce a redirect", () => {
  assert.equal(buildRootAuthRedirectUrl({ ...preview, flow: "anything" }), null);
});

test("non-branch local development preserves its current origin", () => {
  assert.equal(
    buildRootAuthRedirectUrl({ flow: "recovery", requestOrigin: "http://localhost:3000" }),
    "http://localhost:3000/reset-password",
  );
});

test("other Vercel Preview deployments use their platform URL, not the request Host", () => {
  assert.equal(
    buildRootAuthRedirectUrl({
      flow: "recovery",
      requestOrigin: "https://attacker.invalid",
      vercelEnv: "preview",
      vercelUrl: "other-preview.vercel.app",
    }),
    "https://other-preview.vercel.app/reset-password",
  );
});

test("approved introducer customer domain receives recovery and invite callbacks, not the protected Preview URL", () => {
  for (const flow of ["recovery", "invite"]) {
    assert.equal(buildRootAuthRedirectUrl({
      ...preview,
      flow,
      previewBaseUrl: "https://root-health-introducer-demo-h6xpnv8po.vercel.app",
      customerBaseUrl: "https://introducers.roothealth.app",
      customerAllowedOrigins: "https://introducers.roothealth.app",
    }), "https://introducers.roothealth.app/reset-password?next=%2Fintroducer");
  }
});

test("customer recovery host must be exact, independently allowlisted, and never caller-controlled", () => {
  const valid = { ...preview, customerBaseUrl: "https://introducers.roothealth.app",
    customerAllowedOrigins: "https://introducers.roothealth.app" };
  assert.equal(buildRootAuthRedirectUrl({ ...valid, requestOrigin: "https://attacker.invalid" }),
    "https://introducers.roothealth.app/reset-password?next=%2Fintroducer");
  for (const bad of [
    { customerBaseUrl: "https://attacker.invalid" },
    { customerAllowedOrigins: "https://attacker.invalid" },
    { customerBaseUrl: "http://introducers.roothealth.app" },
    { customerBaseUrl: "" },
    { customerAllowedOrigins: "" },
  ]) assert.equal(buildRootAuthRedirectUrl({ ...valid, ...bad }), null);
});
