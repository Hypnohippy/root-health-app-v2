import { NextResponse } from "next/server";
import { acquisitionEvent } from "../../../../../lib/personalAcquisition";
import { acquisitionAdmin, acquisitionEnabled, captureJourney, journeyFromRequest, signJourney, JOURNEY_COOKIE, JOURNEY_MAX_AGE, recordAcquisitionEvent, correlateSignup } from "../../../../../lib/personalAcquisition.server";

export async function POST(request) {
  // Browser-only event ingress. Cross-origin writes and unbounded bodies are refused.
  if (request.headers.get("origin") !== new URL(request.url).origin) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  if (!acquisitionEnabled()) return NextResponse.json({ available: false }, { status: 503 });
  const raw = await request.text();
  if (raw.length > 4096) return NextResponse.json({ error: "Invalid event." }, { status: 400 });
  let body;
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: "Invalid event." }, { status: 400 }); }
  const allowed = ["capacity_check_viewed", "capacity_check_started", "capacity_check_completed", "signup_started", "signup_completed"];
  if (!allowed.includes(body.eventName)) return NextResponse.json({ error: "Invalid event." }, { status: 400 });
  const previous = journeyFromRequest(request);
  const journey = captureJourney(previous, body.eventName === "capacity_check_viewed" ? body.attribution : {});
  if (!journey) return NextResponse.json({ recorded: false, attributed: false });
  try {
    const admin = acquisitionAdmin();
    if (body.eventName === "signup_completed") {
      const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
      if (!token) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
      const { data, error } = await admin.auth.getUser(token);
      if (error || !data?.user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
      const recorded = await correlateSignup(admin, journey, data.user);
      return NextResponse.json({ recorded });
    }
    await recordAcquisitionEvent(admin, acquisitionEvent(journey, body.eventName));
    const response = NextResponse.json({ recorded: true });
    if (!previous) response.cookies.set(JOURNEY_COOKIE, signJourney(journey), {
      httpOnly: true, secure: new URL(request.url).protocol === "https:", sameSite: "lax", path: "/", maxAge: JOURNEY_MAX_AGE,
    });
    return response;
  } catch { return NextResponse.json({ available: false, error: "Acquisition event storage is unavailable." }, { status: 503 }); }
}
