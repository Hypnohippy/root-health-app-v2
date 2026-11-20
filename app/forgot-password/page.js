"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendReset() {
    const normalisedEmail = email.trim().toLowerCase();
    if (!normalisedEmail) {
      setMessage("Enter the email address for your Root account.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const redirectResponse = await fetch("/api/auth/redirect?flow=recovery", {
        cache: "no-store",
      });
      const redirectData = await redirectResponse.json().catch(() => ({}));
      if (!redirectResponse.ok || !redirectData.redirectTo) {
        setMessage(
          redirectData.error || "Password recovery is not configured for this site. Please contact Root Health support."
        );
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(
        normalisedEmail,
        { redirectTo: redirectData.redirectTo }
      );

      if (error) {
        setMessage("Root could not send a password link. Check the address or try again later.");
        setLoading(false);
        return;
      }

      setMessage(
        "If an account exists for that email, Root has sent password reset instructions."
      );
      setLoading(false);
    } catch {
      setMessage("Root could not prepare a secure password link. Please try again later.");
      setLoading(false);
    }
  }

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <p style={styles.kicker}>Root Health</p>

        <h1 style={styles.title}>Forgot your password?</h1>

        <p style={styles.text}>
          Enter the email address you use with Root and we'll send you a secure
          password reset link.
        </p>

        <input
          style={styles.input}
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <button
          style={styles.button}
          onClick={sendReset}
          disabled={loading}
        >
          {loading ? "Sending..." : "Send Reset Link"}
        </button>

        {message ? (
          <p style={styles.message}>{message}</p>
        ) : null}

        <button
          style={styles.link}
          onClick={() => (window.location.href = "/login")}
        >
          ← Back to Sign In
        </button>
      </section>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background: "#F4F1EA",
    padding: "24px",
  },

  card: {
    width: "100%",
    maxWidth: "500px",
    padding: "40px",
    borderRadius: "32px",
    background: "rgba(255,255,255,0.75)",
    backdropFilter: "blur(18px)",
    border: "1px solid rgba(255,255,255,0.8)",
  },

  kicker: {
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    fontWeight: "800",
    color: "#68715D",
  },

  title: {
    fontSize: "40px",
    margin: "12px 0",
    color: "#181818",
  },

  text: {
    color: "#555",
    lineHeight: 1.7,
    marginBottom: "22px",
  },

  input: {
    width: "100%",
    padding: "15px",
    borderRadius: "16px",
    border: "1px solid rgba(0,0,0,.15)",
    marginBottom: "20px",
    boxSizing: "border-box",
  },

  button: {
    width: "100%",
    padding: "15px",
    borderRadius: "999px",
    border: "none",
    background: "#181818",
    color: "#fff",
    fontWeight: "700",
    cursor: "pointer",
  },

  message: {
    marginTop: "18px",
    lineHeight: 1.6,
    color: "#4D463B",
  },

  link: {
    marginTop: "20px",
    border: "none",
    background: "transparent",
    color: "#657257",
    cursor: "pointer",
    fontWeight: "700",
  },
};
