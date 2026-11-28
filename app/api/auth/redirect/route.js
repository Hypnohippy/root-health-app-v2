import { NextResponse } from "next/server";
import { buildRootAuthRedirectUrl } from "../../../../lib/rootAuthRedirect.server.js";

export const runtime = "nodejs";

export async function GET(request) {
  const flow = new URL(request.url).searchParams.get("flow");
  const redirectTo = buildRootAuthRedirectUrl({
    flow,
    requestOrigin: new URL(request.url).origin,
    vercelEnv: process.env.VERCEL_ENV,
    vercelUrl: process.env.VERCEL_URL,
    gitBranch: process.env.VERCEL_GIT_COMMIT_REF,
    previewBaseUrl: process.env.ROOT_AUTH_PREVIEW_URL,
    customerBaseUrl: process.env.ROOT_INTRODUCER_CUSTOMER_URL,
    customerAllowedOrigins: process.env.ROOT_INTRODUCER_CUSTOMER_ALLOWED_ORIGINS,
    publicSiteUrl: process.env.NEXT_PUBLIC_ROOT_PUBLIC_URL || "https://roothealth.app",
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    previewProjectRef: process.env.PROFESSIONAL_INTRODUCER_DEMO_SUPABASE_PROJECT_REF,
    productionProjectRef: process.env.PROFESSIONAL_INTRODUCER_PRODUCTION_SUPABASE_PROJECT_REF,
  });

  if (!redirectTo) {
    return NextResponse.json(
      { error: "Password setup is not configured for this environment." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    { redirectTo },
    { headers: { "Cache-Control": "no-store" } },
  );
}
