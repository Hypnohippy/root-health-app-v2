const OPENAI_CALL_ID_PATTERN = /^rtc_[A-Za-z0-9_-]{1,180}$/;

export function parseRealtimeCallId(locationHeader) {
  if (typeof locationHeader !== "string" || !locationHeader.trim()) return null;
  try {
    const url = new URL(locationHeader, "https://api.openai.com");
    if (url.origin !== "https://api.openai.com") return null;
    const match = url.pathname.match(/\/v1\/realtime\/calls\/(rtc_[A-Za-z0-9_-]{1,180})\/?$/);
    return match && OPENAI_CALL_ID_PATTERN.test(match[1]) ? match[1] : null;
  } catch {
    return null;
  }
}

export async function hangupRealtimeCall({ callId, apiKey, fetchImpl = fetch } = {}) {
  if (!OPENAI_CALL_ID_PATTERN.test(String(callId || "")) || !apiKey) {
    return { terminated: false, errorCode: "invalid_call_control" };
  }
  try {
    const response = await fetchImpl(`https://api.openai.com/v1/realtime/calls/${encodeURIComponent(callId)}/hangup`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    // A 404 for a call ID returned by the provider means there is no active
    // provider call left to terminate. Other failures remain retryable.
    if (response.ok || response.status === 404) return { terminated: true, errorCode: null };
    return { terminated: false, errorCode: `provider_http_${response.status}` };
  } catch {
    return { terminated: false, errorCode: "provider_network_error" };
  }
}

async function rpc(admin, name, args) {
  const { data, error } = await admin.rpc(name, args);
  if (error) throw new Error("Voice termination queue unavailable.");
  return data;
}

export async function attachRealtimeCallToReservation({ admin, reservationId, userId, grantId, callId } = {}) {
  if (!admin || !reservationId || !userId || !grantId || !OPENAI_CALL_ID_PATTERN.test(String(callId || ""))) {
    throw new Error("Voice call tracking is unavailable.");
  }
  const data = await rpc(admin, "attach_professional_introducer_voice_call", {
    p_reservation_id: reservationId,
    p_user_id: userId,
    p_grant_id: grantId,
    p_provider_call_id: callId,
  });
  const result = Array.isArray(data) ? data[0] : data;
  if (!result || result.attached !== true) throw new Error("Voice call tracking is unavailable.");
  return { terminateNow: result.terminate_now === true };
}

export async function markRealtimeCallTerminated({ admin, reservationId, callId } = {}) {
  const data = await rpc(admin, "complete_professional_introducer_voice_termination", {
    p_reservation_id: reservationId,
    p_provider_call_id: callId,
  });
  return data === true;
}

export async function markRealtimeCallCreationFailed({ admin, reservationId, userId } = {}) {
  if (!admin || !reservationId || !userId) return false;
  const data = await rpc(admin, "mark_professional_introducer_voice_creation_failed", {
    p_reservation_id: reservationId,
    p_user_id: userId,
  });
  return data === true;
}

export async function immediatelyHangupRealtimeCall({ admin, reservationId, callId, apiKey, fetchImpl = fetch, attempts = 3 } = {}) {
  let result = { terminated: false, errorCode: "provider_error" };
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    result = await hangupRealtimeCall({ callId, apiKey, fetchImpl });
    if (result.terminated) {
      if (admin && reservationId) {
        await markRealtimeCallTerminated({ admin, reservationId, callId });
      }
      return result;
    }
    if (attempt + 1 < attempts) await new Promise((resolve) => setTimeout(resolve, [0, 250, 1000][attempt] ?? 1000));
  }
  return result;
}

export async function runDueRealtimeTerminations({
  admin,
  apiKey,
  fetchImpl = fetch,
  limit = 20,
} = {}) {
  if (!admin || !apiKey) throw new Error("Voice termination worker is not configured.");
  const rows = await rpc(admin, "claim_due_professional_introducer_voice_terminations", { p_limit: limit });
  const claimed = Array.isArray(rows) ? rows : [];
  const result = { claimed: claimed.length, terminated: 0, retrying: 0 };

  const processed = await Promise.allSettled(claimed.map(async (row) => {
    const attempt = await hangupRealtimeCall({ callId: row.provider_call_id, apiKey, fetchImpl });
    if (attempt.terminated) {
      await markRealtimeCallTerminated({ admin, reservationId: row.reservation_id, callId: row.provider_call_id });
      return "terminated";
    }
    await rpc(admin, "retry_professional_introducer_voice_termination", {
      p_reservation_id: row.reservation_id,
      p_provider_call_id: row.provider_call_id,
      p_safe_error_code: attempt.errorCode || "provider_error",
    });
    return "retrying";
  }));
  for (const outcome of processed) {
    if (outcome.status === "rejected") throw new Error("Voice termination receipt could not be persisted.");
    result[outcome.value] += 1;
  }
  return result;
}
