"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

const money = (value, currency = "GBP") => new Intl.NumberFormat("en-GB", {
  style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 4,
}).format(Number(value || 0));

export default function IntroducerVoiceBudgetPage() {
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadReport() {
      try {
        const { data } = await supabase.auth.getSession();
        const token = data?.session?.access_token;
        if (!token) throw new Error("Sign in with a Root administrator account to view this report.");
        const response = await fetch("/api/introducer/root-voice-usage", {
          cache: "no-store",
          headers: { Authorization: `Bearer ${token}` },
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body?.error || "Voice budget report is unavailable.");
        if (active) setReport(body);
      } catch (loadError) {
        if (active) setError(loadError?.message || "Voice budget report is unavailable.");
      } finally {
        if (active) setLoading(false);
      }
    }
    loadReport();
    return () => { active = false; };
  }, []);

  return (
    <main style={{ maxWidth: 980, margin: "48px auto", padding: 24, color: "#24251f", fontFamily: "Arial, sans-serif" }}>
      <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase" }}>Root only · isolated introducer Preview</p>
      <h1 style={{ fontSize: 32 }}>Demonstration AI budget</h1>
      <p>Calendar-month estimate for authorised live Voice Coach sessions. Prerecorded playback makes no inference requests.</p>
      {loading ? <p>Loading protected report…</p> : error ? <p role="alert">{error}</p> : report ? (
        <>
          <section aria-label="Monthly budget summary" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12, margin: "24px 0" }}>
            {[
              ["Monthly ceiling", money(report.policy.monthly_budget_gbp)],
              ["Estimated reserved", money(report.estimatedReservedCostGbp)],
              ["Estimated remaining", money(report.estimatedBudgetRemainingGbp)],
              ["Provider-reconciled actual", report.actualUsageAvailable ? money(report.actualCostGbp) : "Not available"],
              ["Denied session requests", String(report.deniedSessionRequests)],
              ["Live session starts", String(report.sessionStarts)],
            ].map(([label, value]) => <div key={label} style={{ background: "#f3f1ea", borderRadius: 14, padding: 16 }}><div style={{ fontSize: 12, opacity: .7 }}>{label}</div><strong style={{ display: "block", marginTop: 8, fontSize: 21 }}>{value}</strong></div>)}
          </section>
          <p>FX basis: {report.policy.usd_per_gbp ? `${report.policy.usd_per_gbp} USD per GBP` : "not configured"} · {report.policy.fx_period || "no current month"} · {report.policy.fx_source || "source not set"} · {report.policy.fx_safety_margin_percent}% reservation margin.</p>
          <p>Voice is {report.policy.enabled && report.policy.server_termination_ready ? "policy enabled" : "disabled"}. Reservations are estimates. They do not guarantee a hard £10 provider-billing cap; reconcile against the provider invoice.</p>
          <h2>Per-introducer reservations</h2>
          {report.perIntroducer.length ? <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr><th align="left">User</th><th align="left">Grant</th><th align="right">Starts</th><th align="right">Reserved GBP</th><th align="right">Active</th><th align="right">Termination pending</th></tr></thead><tbody>{report.perIntroducer.map((row) => <tr key={`${row.userId}:${row.grantId}`}><td>{row.userId}</td><td>{row.grantId || "revoked/deleted"}</td><td align="right">{row.sessionStarts}</td><td align="right">{money(row.estimatedReservedCostGbp)}</td><td align="right">{row.activeLeases}</td><td align="right">{row.terminationPending + row.untrackedCallIdPending}</td></tr>)}</tbody></table></div> : <p>No session reservations this month.</p>}
          <h2>Denial reasons</h2>
          {Object.keys(report.denialReasons || {}).length ? <ul>{Object.entries(report.denialReasons).map(([reason, count]) => <li key={reason}>{reason}: {count}</li>)}</ul> : <p>No post-auth reservation denials recorded this month. Requests denied before reservation are not included.</p>}
        </>
      ) : null}
      <footer style={{ marginTop: 48, fontSize: 12, opacity: .72 }}>© 2024–2026 Root Health. All rights reserved.</footer>
    </main>
  );
}
