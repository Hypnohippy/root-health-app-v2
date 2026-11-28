"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";

const styles = {
  page: { minHeight: "100vh", padding: "32px 18px", background: "#f4f1ea", display: "grid", placeItems: "center", fontFamily: "-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif", color: "#182018" },
  card: { width: "min(100%,520px)", boxSizing: "border-box", padding: "clamp(24px,5vw,40px)", borderRadius: 24, background: "#fff", boxShadow: "0 18px 55px rgba(20,30,20,.1)" },
  input: { width: "100%", boxSizing: "border-box", padding: 14, marginBottom: 14, borderRadius: 12, border: "1px solid #aeb8ac", fontSize: 16 },
  button: { width: "100%", borderRadius: 999, background: "#303d2b", color: "white", border: 0, padding: 14, fontWeight: 700, fontSize: 15 },
};

export default function IntroducerChangePasswordPage() {
  const [state, setState] = useState("checking");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    async function check() {
      try {
        // A session must actually belong to an authenticated user, not merely
        // exist in local browser storage. The demo grant is checked server-side.
        const { data: { session } = {} } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error("not_signed_in");
        const [{ data: { user } = {}, error }, response] = await Promise.all([
          supabase.auth.getUser(),
          fetch("/api/introducer/access", {
            headers: { Authorization: `Bearer ${session.access_token}` },
            cache: "no-store",
          }),
        ]);
        if (error || !user?.id || !user.email_confirmed_at || !response.ok) {
          throw new Error("not_authorised");
        }
        const access = await response.json();
        if (access.userId !== user.id) throw new Error("not_authorised");
        if (active) {
          setEmail(user.email || "");
          setState("ready");
        }
      } catch {
        if (active) setState("unavailable");
      }
    }
    void check();
    return () => { active = false; };
  }, []);

  async function save(event) {
    event.preventDefault();
    if (saving || state !== "ready") return;
    if (password.length < 12) {
      setMessage("Please use a password with at least 12 characters.");
      return;
    }
    if (password !== confirm) {
      setMessage("The two passwords do not match.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      // Supabase enforces password policy and any configured reauthentication.
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setMessage("Password change was not completed. " + (error.message || "Supabase requires further verification."));
        return;
      }
      setPassword("");
      setConfirm("");
      await supabase.auth.signOut();
      setState("saved");
    } catch {
      setMessage("Password change could not be completed. Your account is unchanged.");
    } finally {
      setSaving(false);
    }
  }

  return <main style={styles.page}><section style={styles.card}>
    <p style={{ fontSize: 12, letterSpacing: ".12em", textTransform: "uppercase" }}>Root Health · Professional Introducer</p>
    <h1>Change your password</h1>
    {state === "checking" && <p role="status">Verifying your signed-in demo account…</p>}
    {state === "unavailable" && <>
      <p role="alert">There is no verified, authorised Introducer session in this browser. You cannot change a password from this page without being securely signed in.</p>
      <Link href="/login?next=%2Fintroducer">Return to Introducer sign in</Link>
    </>}
    {state === "ready" && <>
      <p>Signed in as <strong>{email}</strong>. You can set a new password without requesting another email.</p>
      <form onSubmit={save}>
        <label htmlFor="new-password">New password</label>
        <input style={styles.input} id="new-password" type="password" autoComplete="new-password" minLength={12} value={password} onChange={(e) => setPassword(e.target.value)} required />
        <label htmlFor="confirm-password">Confirm new password</label>
        <input style={styles.input} id="confirm-password" type="password" autoComplete="new-password" minLength={12} value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        <button style={styles.button} disabled={saving} type="submit">{saving ? "Saving…" : "Save new password"}</button>
      </form>
      {message && <p role="alert">{message}</p>}
    </>}
    {state === "saved" && <>
      <p role="status">Your password has been updated. Sign in with the new password to verify access.</p>
      <Link href="/login?next=%2Fintroducer">Continue to Introducer sign in</Link>
    </>}
  </section></main>;
}
