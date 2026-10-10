// Neutral marketing identifiers only. Never pass scores, source text or identity here.
export const ACQUISITION_EVENTS = ["capacity_check_viewed", "capacity_check_started", "capacity_check_completed", "signup_started", "signup_completed", "subscription_started"];
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const sources = ["linkedin", "facebook", "instagram", "threads", "x", "tiktok", "reddit", "root", "google", "direct"];
const media = ["social", "search", "organic", "public_response", "content"];
export function neutralAttribution(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) input = {};
  const acquisition_id = UUID.test(input.acquisition_id || "") ? input.acquisition_id.toLowerCase() : null;
  const campaign = String(input.campaign_id || input.utm_campaign || "").toLowerCase();
  const campaign_id = UUID.test(campaign.replace(/^pa-/, "")) ? campaign : null;
  const asset = input.asset_id || input.utm_content;
  return { acquisition_id, campaign_id, asset_id: UUID.test(asset || "") ? asset.toLowerCase() : null,
    source: sources.includes(input.utm_source || input.source) ? input.utm_source || input.source : null,
    medium: media.includes(input.utm_medium || input.medium) ? input.utm_medium || input.medium : null };
}
export function attributed(value) { return Boolean(value?.acquisition_id || value?.campaign_id); }
export function acquisitionEvent(journey, eventName, { userId = null, occurredAt = new Date().toISOString(), subscriptionId = null } = {}) {
  if (!ACQUISITION_EVENTS.includes(eventName)) throw new Error("Unsupported acquisition event.");
  const a = neutralAttribution(journey);
  if (!UUID.test(journey?.session_id || "")) return null;
  if (userId && !UUID.test(userId)) throw new Error("Invalid first-party user.");
  if (["signup_completed", "subscription_started"].includes(eventName) && !userId) return null;
  if (eventName === "subscription_started" && !/^sub_[A-Za-z0-9]+$/.test(subscriptionId || "")) return null;
  return { ...a, event_name: eventName, attribution_session_id: journey.session_id, user_id: userId,
    occurred_at: occurredAt, dedupe_key: eventName === "subscription_started" ? `${eventName}:${subscriptionId}` :
      eventName === "signup_completed" ? `${eventName}:${userId}` : `${eventName}:${journey.session_id}` };
}
