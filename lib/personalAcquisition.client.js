// Attribution stays in a signed HttpOnly cookie; this client sends event names only.
let pending = Promise.resolve();
const recorded = new Set();
export function trackPersonalAcquisition(eventName, { capture = false, accessToken = null } = {}) {
  const key = `${eventName}:${accessToken ? "authenticated" : "anonymous"}`;
  if (recorded.has(key)) return pending;
  recorded.add(key);
  pending = pending.then(async () => {
    const params = capture ? new URLSearchParams(window.location.search) : null;
    const attribution = params ? Object.fromEntries(["acquisition_id", "asset_id", "utm_source", "utm_medium", "utm_campaign", "utm_content"].map(key => [key, params.get(key)])) : undefined;
    try {
      const response = await fetch("/api/personal/acquisition/event", {
        method: "POST", credentials: "same-origin", keepalive: true, signal: AbortSignal.timeout(3000),
        headers: { "Content-Type": "application/json", ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
        body: JSON.stringify({ eventName, ...(attribution ? { attribution } : {}) }),
      });
      if (!response.ok) recorded.delete(key);
    } catch { recorded.delete(key); }
  });
  return pending;
}
