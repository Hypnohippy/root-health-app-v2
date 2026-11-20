import { NextResponse } from "next/server";
import {
  introducerRequestDecision,
  isIntroducerDeployment,
  isUnmeteredIntroducerAiRoute,
} from "./lib/introducerRestrictedActions.server.js";

export function middleware(request) {
  const decision = introducerRequestDecision(request.nextUrl.pathname);
  if (decision.type === "misconfigured") {
    return NextResponse.json(
      { error: "This introducer deployment is not configured with its approved isolated identities." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  if (isIntroducerDeployment(process.env) && isUnmeteredIntroducerAiRoute(request.nextUrl.pathname)) {
    return NextResponse.json(
      { error: "This AI feature is paused in the introducer Preview until it is included in the shared monthly budget controls." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  if (decision.type === "next") return NextResponse.next();

  return NextResponse.json(
    { error: "Professional introducer access cannot perform this Root Health action." },
    {
      status: 403,
      headers: { "Cache-Control": "no-store", "Vary": "Authorization" },
    }
  );
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
