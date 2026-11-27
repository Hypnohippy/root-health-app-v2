"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";

const button = { padding: "9px 13px", border: "1px solid #cbd5e1", borderRadius: 8, background: "#fff", color: "#17212b", cursor: "pointer", fontSize: 14 };
const formatDate = value => value ? new Date(value).toLocaleString("en-GB") : "Not recorded";
const labels = {
  registered: "Invitation not issued",
  activation_preparing: "Activation being prepared",
  activation_uncertain: "Activation delivery unconfirmed",
  activation_sent: "Activation invitation sent",
  activated: "Account activated",
  revoked: "Access revoked",
  failed: "Activation requires review",
};

export default function IntroducerDemoAccess({ introducer }) {
  const [expanded, setExpanded] = useState(false);
  const [onboarding, setOnboarding] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function api(method, body) {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) throw new Error("Please sign in as the Root administrator again.");
    const response = await fetch(
      "/api/admin/introducers/onboarding?introducerId=" + encodeURIComponent(introducer.id),
      {
        method,
        headers: {
          Authorization: "Bearer " + token,
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
        cache: "no-store",
      }
    );
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 404) throw new Error("Activation is currently disabled. No invitation has been sent.");
      throw new Error(result.error || "Activation status is unavailable.");
    }
    return result;
  }

  async function refresh() {
    setBusy(true);
    setError("");
    try {
      const result = await api("GET");
      setOnboarding(result.onboarding);
    } catch (e) {
      setOnboarding(null);
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function toggle() {
    if (expanded) {
      setExpanded(false);
    } else {
      setExpanded(true);
      void refresh();
    }
  }

  async function act(action) {
    if (!onboarding?.agreementReady || !onboarding?.agreement?.verified) {
      setError("An archived, verified acceptance is required before activation.");
      return;
    }
    const label = action === "replace_invitation" ? "replace the expired" : "send a";
    if (!window.confirm("Send " + label + " private, one-time activation invitation to " + introducer.contact_email + "? Confirm the verified agreement recipient is correct. Do not retry if email delivery becomes uncertain.")) return;
    setBusy(true);
    setError("");
    setMessage("");
    let failure = "";
    try {
      const result = await api("POST", {
        introducerId: introducer.id,
        action,
        requestId: crypto.randomUUID(),
      });
      setMessage(result.message || "Activation request accepted. Verify delivery before continuing.");
    } catch (e) {
      failure = e.message + " Check the inbox and audit before any further attempt.";
    }
    // A follow-up read is authoritative; never assume email arrived from the POST alone.
    await refresh();
    if (failure) setError(failure);
  }

  const state = onboarding?.state || "registered";
  const sendAllowed = onboarding?.agreementReady && onboarding?.agreement?.verified && state === "registered";
  const replaceAllowed = onboarding?.agreementReady && onboarding?.agreement?.verified && onboarding?.canReplace;

  return (
    <section aria-label={"Introducer activation for " + introducer.name}
      style={{ borderTop: "1px solid #dce3e7", marginTop: 16, paddingTop: 14 }}>
      <button type="button" style={button} onClick={toggle} aria-expanded={expanded}>
        {expanded ? "Hide Demo Access" : "Activation / Demo Access"}
      </button>
      {expanded && (
        <div style={{ marginTop: 12, fontSize: 14, overflowWrap: "anywhere" }}>
          {busy && <p role="status">Checking activation status...</p>}
          {error && <p role="alert" style={{ color: "#a32335" }}>{error}</p>}
          {message && <p role="status">{message}</p>}
          {onboarding && (
            <>
              <p><strong>Agreement:</strong> {onboarding.agreementReady && onboarding.agreement?.verified ? "Accepted and verified" : "Not yet verified"}</p>
              <p><strong>Access:</strong> {labels[state] || state}</p>
              {onboarding.invitationStatus && <p><strong>Invitation:</strong> {onboarding.invitationStatus.replaceAll("_", " ")}</p>}
              {onboarding.accountStatus && <p><strong>Account:</strong> {onboarding.accountStatus.replaceAll("_", " ")}</p>}
              {onboarding.invite_sent_at && <p>Invitation sent: {formatDate(onboarding.invite_sent_at)}</p>}
              {onboarding.activation_expires_at && <p>Activation expires: {formatDate(onboarding.activation_expires_at)}</p>}
              {state === "activation_uncertain" && <p role="alert">Delivery is unconfirmed. Check the email and audit events before any replacement.</p>}
              {sendAllowed && <button type="button" style={button} disabled={busy} onClick={() => act("send_invitation")}>Send activation invitation</button>}
              {replaceAllowed && <button type="button" style={button} disabled={busy} onClick={() => act("replace_invitation")}>Replace expired invitation</button>}
              {Array.isArray(onboarding.events) && onboarding.events.length > 0 &&
                <details style={{ marginTop: 12 }}>
                  <summary>Activation audit ({onboarding.events.length})</summary>
                  <ul style={{ paddingLeft: 18 }}>
                    {onboarding.events.map((event, index) => (
                      <li key={(event.request_id || "event") + index}>
                        {event.event_type} — {formatDate(event.occurred_at)}
                      </li>
                    ))}
                  </ul>
                </details>}
            </>
          )}
          <div style={{ marginTop: 12 }}>
            <button type="button" style={button} disabled={busy} onClick={refresh}>Refresh activation status</button>
          </div>
        </div>
      )}
    </section>
  );
}
