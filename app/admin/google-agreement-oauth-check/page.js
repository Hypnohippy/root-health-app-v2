"use client";
import { useState } from "react";
import { supabase } from "../../../lib/supabase";

const messages = {
  authorized: "Google OAuth refresh succeeded. The credentials currently work.",
  invalid_grant: "Google rejected the refresh token (invalid_grant). A new user-authorised refresh token is needed.",
  invalid_client: "Google rejected the OAuth client identity (invalid_client). Check the configured Client ID and Secret together.",
  unauthorized_client: "This OAuth client is not authorised for the requested grant.",
  invalid_request: "Google rejected the format of the token exchange.",
  access_denied: "Google refused the OAuth authorisation.",
  temporarily_unavailable: "Google temporarily cannot serve this request.",
  server_error: "Google returned an internal server error.",
  missing_credentials: "Required Google credential is missing in Production.",
  network_or_timeout_error: "Google token endpoint could not be reached.",
  unauthorized: "Please sign in with your verified Root administrator account.",
  unavailable: "This diagnostic is unavailable unless Production onboarding is disabled.",
};
export default function GoogleAgreementOAuthCheck() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");
  async function check() {
    if (busy) return;
    setBusy(true);
    setResult("");
    try {
      const { data } = await supabase.auth.getSession();
      const bearer = data?.session?.access_token;
      if (!bearer) { setResult(messages.unauthorized); return; }
      const response = await fetch("/api/admin/introducers/google-oauth-check", {
        cache: "no-store", headers: { Authorization: `Bearer ${bearer}` },
      });
      const body = await response.json();
      setResult(messages[body.errorCode] || messages[body.status] || "Google rejected the token exchange. HTTP " + (body.httpCode || response.status));
    } catch { setResult("Google authorisation check could not be completed."); }
    finally { setBusy(false); }
  }
  return <main style={{minHeight:"100vh",display:"grid",placeItems:"center",background:"#f4f6f0",padding:24,fontFamily:"system-ui,sans-serif",color:"#223228"}}>
    <section style={{maxWidth:620,padding:32,background:"white",borderRadius:22}}>
      <p style={{fontWeight:700,letterSpacing:2,fontSize:12,color:"#60735f"}}>ROOT HEALTH · ADMINISTRATION</p>
      <h1>Google agreement authorisation check</h1>
      <p>This performs one read-only OAuth token refresh against Google, using the credentials already stored on Root's server. No documents, agreements, invitations, accounts or subscriptions are changed.</p>
      <p>The response shows only a safe error category, never the Google credential or token.</p>
      <button onClick={check} disabled={busy} style={{border:0,borderRadius:99,padding:"14px 23px",background:"#223f2b",color:"white",fontWeight:700}}>{busy?"Checking…":"Check Google connection"}</button>
      {result && <p role="status" aria-live="polite" style={{marginTop:24,fontWeight:700}}>{result}</p>}
    </section>
  </main>;
}
