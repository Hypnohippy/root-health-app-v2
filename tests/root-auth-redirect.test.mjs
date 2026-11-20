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
