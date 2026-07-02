"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function ReconnectPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function reconnect() {
    setLoading(true);
    setError("");
    setMessage("");

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError("Please enter your email address.");
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("email", cleanEmail)
      .maybeSingle();

    if (profileError || !profile) {
      setError("Root could not find a profile for that email.");
      setLoading(false);
      return;
    }

    const { data: organisation } = await supabase
      .from("organisations")
      .select("*")
      .eq("id", profile.organisation_id)
      .maybeSingle();

    localStorage.setItem("root_profile_key_v1", profile.profile_key);

    localStorage.setItem(
      "root_profile_v1",
      JSON.stringify({
        profile_key: profile.profile_key,
        name: profile.name,
        email: profile.email,
        age: profile.age,
        department: profile.department,
        organisation_id: profile.organisation_id,
        organisation_name: profile.organisation_name,
        subscription_status: profile.subscription_status,
      })
    );

    if (organisation?.id) {
      const orgObject = {
        organisation_id: organisation.id,
        organisation_name: organisation.name,
        organisation_code: organisation.organisation_code,
        role: "member",
        reconnected_at: Date.now(),
      };

      localStorage.setItem("root_organisation_v1", JSON.stringify(orgObject));
      localStorage.setItem("root_hr_org_v1", JSON.stringify(orgObject));
    }

    await supabase
      .from("profiles")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("profile_key", profile.profile_key);

    setMessage("Welcome back. Root has reconnected your profile.");

    setTimeout(() => {
      window.location.href = "/";
    }, 900);
  }

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <p style={styles.kicker}>Root Health</p>

        <h1 style={styles.title}>Welcome back</h1>

        <p style={styles.text}>
          If this browser has forgotten your Root connection, enter your email
          and Root will reconnect your profile.
        </p>

        <label style={styles.label}>Email address</label>

        <input
          style={styles.input}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="e.g. david@company.co.uk"
        />

        {error ? <p style={styles.error}>{error}</p> : null}
        {message ? <p style={styles.success}>{message}</p> : null}

        <button style={styles.button} onClick={reconnect} disabled={loading}>
          {loading ? "Reconnecting..." : "Reconnect Root"}
        </button>

        <button
          style={styles.secondaryButton}
          onClick={() => (window.location.href = "/organisation/join")}
        >
          I have an organisation code
        </button>
      </section>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    padding: "40px",
    background: "#EFE9DE",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontFamily: "Inter, sans-serif",
  },

  card: {
    width: "100%",
    maxWidth: "720px",
    padding: "38px",
    borderRadius: "36px",
    background: "rgba(255,255,255,0.76)",
    border: "1px solid rgba(255,255,255,0.85)",
    boxShadow: "0 28px 90px rgba(20,18,15,0.14)",
  },

  kicker: {
    margin: "0 0 10px",
    textTransform: "uppercase",
    letterSpacing: "0.14em",
    fontSize: "12px",
    fontWeight: "800",
    color: "#776C5B",
  },

  title: {
    margin: "0 0 16px",
    fontSize: "46px",
    lineHeight: "1.05",
    color: "#181818",
    letterSpacing: "-0.04em",
  },

  text: {
    color: "#4D463B",
    lineHeight: "1.8",
    fontSize: "17px",
  },

  label: {
    display: "block",
    marginTop: "18px",
    marginBottom: "8px",
    fontWeight: "800",
    color: "#181818",
  },

  input: {
    width: "100%",
    padding: "14px",
    borderRadius: "16px",
    border: "1px solid rgba(24,24,24,0.16)",
    fontSize: "15px",
    boxSizing: "border-box",
  },

  button: {
    marginTop: "24px",
    width: "100%",
    border: "none",
    borderRadius: "999px",
    padding: "15px 22px",
    background: "#181818",
    color: "#FFFFFF",
    cursor: "pointer",
    fontWeight: "800",
    fontSize: "15px",
  },

  secondaryButton: {
    marginTop: "12px",
    width: "100%",
    border: "1px solid rgba(24,24,24,0.18)",
    borderRadius: "999px",
    padding: "14px 22px",
    background: "rgba(255,255,255,0.68)",
    color: "#181818",
    cursor: "pointer",
    fontWeight: "800",
    fontSize: "14px",
  },

  error: {
    marginTop: "16px",
    color: "#9F1D1D",
    fontWeight: "800",
  },

  success: {
    marginTop: "16px",
    color: "#245C34",
    fontWeight: "800",
  },
};
