"use client";

import { useState } from "react";
import { supabase } from "../../../lib/supabase";

export default function IntroducerConnectionCheckPage() {
  const [working, setWorking] = useState(false);
  const [result, setResult] = useState("");

  async function check() {
    if (working) return;
    setWorking(true);
    setResult("");
    try {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (!token) { setResult("Please sign in with your Root administrator account first."); return; }
      const response = await fetch("/api/admin/introducers/connection-check", {
        method: "GET", cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await response.json();
      setResult(body.connected === true
        ? "Connection verified: Root Production can reach protected Introducer Preview using its trusted Vercel identity."
        : (body.reason || "Connection could not be verified."));
    } catch {
      setResult("Connection check could not be completed.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f4f6f0", padding: 24, color: "#1e2920", fontFamily: "system-ui, sans-serif" }}>
      <section style={{ maxWidth: 610, padding: 36, background: "white", borderRadius: 22, boxShadow: "0 12px 45px #172b1914" }}>
        <p style={{ letterSpacing: 2, color: "#62735e", fontWeight: 700, fontSize: 12 }}>ROOT HEALTH · ADMINISTRATION</p>
        <h1>Introducer connection check</h1>
        <p>This safe, read-only check verifies whether Root Health Production can reach the protected Introducer Preview using Vercel Trusted Sources.</p>
        <p>No agreements, emails, users, grants, or subscriber data are changed. Automatic onboarding must remain off.</p>
        <button onClick={check} disabled={working} style={{ background: "#1c3727", color: "white", border: 0, padding: "13px 23px", borderRadius: 999, fontWeight: 700, cursor: working ? "wait" : "pointer" }}>
          {working ? "Checking secure connection…" : "Check secure connection"}
        </button>
        {result && <p role="status" aria-live="polite" style={{ marginTop: 24, fontWeight: 650 }}>{result}</p>}
      </section>
    </main>
  );
}
