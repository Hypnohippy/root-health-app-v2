import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { neutralAttribution, acquisitionEvent, UUID } from "./personalAcquisition.js";

export const JOURNEY_COOKIE = "root_personal_acquisition";
export const JOURNEY_MAX_AGE = 60 * 60 * 24 * 30;
export const acquisitionEnabled = () => process.env.PERSONAL_ACQUISITION_ENABLED === "true" && (process.env.PERSONAL_ACQUISITION_COOKIE_SECRET || "").length >= 32;
export function acquisitionAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}
export function signJourney(journey, secret = process.env.PERSONAL_ACQUISITION_COOKIE_SECRET) {
  if (!secret || secret.length < 32) throw new Error("Acquisition signing is unavailable.");
  const payload = Buffer.from(JSON.stringify(journey)).toString("base64url");
  return `${payload}.${createHmac("sha256", secret).update(payload).digest("base64url")}`;
}
export function verifyJourney(token, secret = process.env.PERSONAL_ACQUISITION_COOKIE_SECRET, now = Date.now(), allowExpired = false) {
  try {
    if (!secret || secret.length < 32 || typeof token !== "string" || token.length > 1500) return null;
    const [payload, signature, extra] = token.split(".");
    if (extra || !payload || !signature) return null;
    const expected = createHmac("sha256", secret).update(payload).digest();
    const supplied = Buffer.from(signature, "base64url");
    if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;
    const value = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (!UUID.test(value.session_id || "") || !Number.isFinite(value.created_at) || value.created_at > now || (!allowExpired && now - value.created_at > JOURNEY_MAX_AGE * 1000)) return null;
    const a = neutralAttribution(value);
    return { ...a, session_id: value.session_id, created_at: value.created_at };
  } catch { return null; }
}
export function journeyFromRequest(request) {
  const token = request.cookies?.get(JOURNEY_COOKIE)?.value;
  return verifyJourney(token);
}
export function captureJourney(current, input, now = Date.now()) {
  // First touch remains fixed for this journey; unrelated navigation cannot replace it.
  if (current) return current;
  const a = neutralAttribution(input);
  return { ...a, session_id: randomUUID(), created_at: now };
}
export async function recordAcquisitionEvent(admin, row) {
  if (!row) return;
  const { error } = await admin.from("personal_acquisition_events").upsert(row, { onConflict: "dedupe_key", ignoreDuplicates: true });
  if (error) throw error;
}
export async function correlateSignup(admin, journey, user) {
  if (!journey || !user?.email_confirmed_at) return false;
  const { data, error } = await admin.from("personal_acquisition_events").select("occurred_at")
    .eq("attribution_session_id", journey.session_id).eq("event_name", "signup_started").maybeSingle();
  if (error) throw error;
  // An existing-account sign-in is not a new signup. Use auth evidence, never email matching.
  const created = Date.parse(user.created_at), confirmed = Date.parse(user.email_confirmed_at);
  if (!data || !Number.isFinite(created) || !Number.isFinite(confirmed) || confirmed < created || created < Date.parse(data.occurred_at)) return false;
  await recordAcquisitionEvent(admin, acquisitionEvent(journey, "signup_completed", { userId: user.id, occurredAt: user.email_confirmed_at }));
  return true;
}
export function stripeAcquisitionMetadata(journey) {
  if (!journey) return {};
  return { personal_acquisition_journey: signJourney(journey) };
}
export async function recordPaidAcquisitionSubscription({ admin, subscription, invoice }) {
  if (!acquisitionEnabled() || subscription?.metadata?.root_product !== "personal" || subscription.status !== "active" || invoice?.paid !== true || !(invoice.amount_paid > 0)) return false;
  // Stripe retains verified checkout provenance after the browser cookie expires.
  const journey = verifyJourney(subscription.metadata.personal_acquisition_journey, undefined, Date.now(), true);
  const userId = subscription.metadata.user_id;
  if (!journey || !UUID.test(userId || "")) return false;
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data?.user) throw error || new Error("Unknown first-party subscription user.");
  const paid = invoice.status_transitions?.paid_at;
  if (!Number.isFinite(paid)) return false;
  await recordAcquisitionEvent(admin, acquisitionEvent(journey, "subscription_started", {
    userId, subscriptionId: subscription.id, occurredAt: new Date(paid * 1000).toISOString(),
  }));
  return true;
}
