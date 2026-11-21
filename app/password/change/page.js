"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

export default function ChangePasswordPage() {
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data, error }) => {
      if (!active) return;
      if (error || !data?.user?.email) {
        window.location.replace("/login");
        return;
      }
      setEmail(data.user.email);
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  async function savePassword(event) {
    event.preventDefault();
    setMessage("");
    if (password.length < 8) {
      setMessage("Choose a password with at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setMessage("The new passwords do not match.");
      return;
    }

    setSaving(true);
    try {
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (reauthError) {
        setMessage("Your current password could not be confirmed. Please check it and try again.");
        return;
      }

      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setMessage("Root could not update your password. Please try again.");
        return;
      }

      setCurrentPassword("");
      setPassword("");
      setConfirm("");
      setMessage("Your password has been changed.");
    } catch {
      setMessage("Root could not update your password. Please try again later.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <main style={styles.page}><p>Checking your sign-in…</p></main>;

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <p style={styles.kicker}>Root Health</p>
        <h1 style={styles.title}>Change your password</h1>
        <p style={styles.text}>Confirm your current password, then choose a new one. Root does not save or display password text.</p>
        <form onSubmit={savePassword}>
          <label style={styles.label}>Current password
            <input style={styles.input} type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required />
          </label>
          <label style={styles.label}>New password
            <input style={styles.input} type="password" autoComplete="new-password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required />
          </label>
          <label style={styles.label}>Confirm new password
            <input style={styles.input} type="password" autoComplete="new-password" minLength={8} value={confirm} onChange={(event) => setConfirm(event.target.value)} required />
          </label>
          <button style={styles.button} disabled={saving}>{saving ? "Updating…" : "Change password"}</button>
        </form>
        {message && <p role="status" style={styles.message}>{message}</p>}
        <a style={styles.back} href="/profile">Back to your profile</a>
      </section>
    </main>
  );
}

const styles = {
  page: { minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#F4F1EA", color: "#181818", fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" },
  card: { width: "100%", maxWidth: 500, padding: 36, borderRadius: 28, background: "rgba(255,255,255,.85)", boxShadow: "0 24px 70px rgba(20,18,15,.12)" },
  kicker: { color: "#68715D", fontSize: 12, fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase" },
  title: { fontSize: 34, margin: "12px 0" },
  text: { color: "#5A554D", lineHeight: 1.6, marginBottom: 24 },
  label: { display: "grid", gap: 7, marginBottom: 16, fontSize: 14, fontWeight: 700 },
  input: { width: "100%", boxSizing: "border-box", padding: 13, border: "1px solid #d8d7d1", borderRadius: 12, fontSize: 16 },
  button: { width: "100%", padding: 14, border: 0, borderRadius: 999, background: "#181818", color: "white", fontWeight: 700, cursor: "pointer" },
  message: { color: "#4D463B", lineHeight: 1.5 },
  back: { display: "inline-block", marginTop: 18, color: "#52634A", fontWeight: 700 },
};
