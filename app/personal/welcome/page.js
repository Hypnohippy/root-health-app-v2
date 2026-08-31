"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { getRootIdentity } from "../../../lib/rootIdentity";

export default function PersonalWelcomePage() {
  const [destination, setDestination] = useState("/");
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("Confirming your membership...");

  useEffect(() => {
    async function prepareRoot() {
      const { data } = await supabase.auth.getSession();

      if (!data?.session) {
        window.location.href = "/personal/join";
        return;
      }

      const sessionId = new URLSearchParams(window.location.search).get("session_id");
      const response = await fetch(
        `/api/stripe/personal-checkout?session_id=${encodeURIComponent(sessionId || "")}`,
        { headers: { Authorization: `Bearer ${data.session.access_token}` } }
      );

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        setMessage(result?.error || "Root could not confirm your membership yet.");
        return;
      }

      const identity = await getRootIdentity();
      setDestination(identity?.personal?.orientationCompleted ? "/" : "/orientation");
      setMessage("Your payment is complete. Your Root account is ready, with your identity and any existing Workplace history kept intact.");
      setReady(true);
    }

    prepareRoot();
  }, []);

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <p style={styles.kicker}>ROOT PERSONAL</p>
        <h1 style={styles.title}>Welcome to Root.</h1>
        <p style={styles.copy}>{message}</p>
        <button
          type="button"
          style={styles.button}
          disabled={!ready}
          onClick={() => {
            window.location.href = destination;
          }}
        >
          {ready ? "Continue to Root" : "Preparing your Root..."}
        </button>
      </section>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    padding: "24px",
    display: "grid",
    placeItems: "center",
    background: "linear-gradient(145deg, #eef2e8 0%, #f8f5ee 55%, #e9eee3 100%)",
    color: "#203326",
  },
  card: {
    width: "min(100%, 560px)",
    padding: "48px",
    border: "1px solid rgba(47, 72, 50, 0.12)",
    borderRadius: "34px",
    background: "rgba(255,255,255,0.68)",
    boxShadow: "0 30px 80px rgba(42, 65, 45, 0.12)",
    textAlign: "center",
  },
  kicker: {
    margin: "0 0 12px",
    color: "#5d795f",
    fontSize: "10px",
    fontWeight: 800,
    letterSpacing: "0.18em",
  },
  title: {
    margin: "0 0 18px",
    fontFamily: "Georgia, serif",
    fontSize: "clamp(40px, 8vw, 62px)",
    fontWeight: 400,
    letterSpacing: "-0.045em",
  },
  copy: {
    margin: "0 auto 30px",
    maxWidth: "440px",
    color: "#687168",
    lineHeight: 1.7,
  },
  button: {
    width: "100%",
    padding: "16px 22px",
    border: 0,
    borderRadius: "999px",
    background: "#355f3f",
    color: "white",
    cursor: "pointer",
    fontWeight: 800,
  },
};
