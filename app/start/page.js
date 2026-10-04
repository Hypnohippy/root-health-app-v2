"use client";
import { useEffect, useState } from "react";
import RootEnso from "../../components/RootEnso";
import { rememberPersonalReferral, personalReferralUrl } from "../../lib/personalReferralJourney";

export default function PersonalReferralStart() {
  const [state, setState] = useState("loading");
  const [code, setCode] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    const candidate = new URLSearchParams(window.location.search).get("ref") || "";
    if (!candidate.trim()) {
      rememberPersonalReferral("?ref=", localStorage);
      setCode(""); setState("direct");
      return () => controller.abort();
    }
    fetch("/api/referral/validate", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referralCode: candidate, market: "personal" }),
      signal: controller.signal,
    }).then(async response => {
      const result = await response.json();
      if (!response.ok) throw Error("validation");
      if (result.valid) {
        rememberPersonalReferral("?ref=" + encodeURIComponent(result.referralCode), localStorage);
        setCode(result.referralCode); setState("valid");
      } else {
        rememberPersonalReferral("?ref=", localStorage); setState("invalid");
      }
    }).catch(() => { if (!controller.signal.aborted) setState("error"); });
    return () => controller.abort();
  }, []);
  return <main style={{ minHeight: "100vh", color: "#183e36", background: "#f5faf7", fontFamily: "sans-serif" }}>
    <section style={{ padding: "64px 24px", maxWidth: 760, margin: "auto" }}>
      <RootEnso size={78} />
      <h1 style={{ fontSize: 36, lineHeight: 1.2 }}>Root Health, for you</h1>
      <p style={{ fontSize: 20, lineHeight: 1.6 }}>Make a little space to understand how you are feeling, what is taking your energy, and what might help.</p>
      <p style={{ lineHeight: 1.6 }}>Start with a Capacity Check, then explore everyday support for your wellbeing. This is a reflection, not a medical diagnosis.</p>
      {state === "loading" && <p role="status">Checking your invitation...</p>}
      {state === "error" && <p role="alert">We could not check this invitation. Please refresh before continuing.</p>}
      {state === "invalid" && <p>This invitation is not active. You can still explore Root directly.</p>}
      {["direct", "valid", "invalid"].includes(state) && <div style={{ display: "flex", flexWrap: "wrap", gap: 20, marginTop: 28 }}>
        <a href={personalReferralUrl("/capacity-check", code)} style={{ color: "#16634a", fontWeight: 600 }}>Take the Capacity Check</a>
        <a href={personalReferralUrl("/personal/join", code)} style={{ color: "#16634a" }}>Explore personal membership</a>
      </div>}
    </section>
    <img src="/visuals/root-personal-journey.jpg" alt="Root personal wellbeing" style={{ display: "block", width: "100%", maxHeight: 440, objectFit: "cover" }} />
  </main>;
}
