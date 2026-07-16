"use client";

import { useEffect, useState } from "react";
import RootEnso from "../../components/RootEnso";

export default function WelcomePage() {
  const [showWords, setShowWords] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowWords(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <main style={styles.page}>
      <section style={styles.container}>
        <div style={styles.enso}>
          <RootEnso size={110} />
        </div>

        <div
          style={{
            ...styles.content,
            opacity: showWords ? 1 : 0,
            transform: showWords
              ? "translateY(0)"
              : "translateY(12px)",
            transition: "all 1.8s ease",
          }}
        >
          <p style={styles.brand}>ROOT HEALTH</p>

          <h1 style={styles.title}>
            Root will meet you
            <br />
            where you are today.
          </h1>

          <p style={styles.subtitle}>
            There is no perfect place to begin.
            <br />
            Every journey starts with understanding.
          </p>

          <div style={styles.options}>
            <a href="/register" style={styles.primaryCard}>
              <h2>🌱 I'm here for myself</h2>
              <p>
                Understand your wellbeing, recognise your patterns,
                and take your next step with Root.
              </p>
            </a>

            <a href="/organisation/join" style={styles.secondaryCard}>
              <h2>🏢 I'm here through work</h2>
              <p>
                Join your organisation's Root workplace programme
                and begin your wellbeing journey.
              </p>
            </a>
          </div>

          <a href="/login" style={styles.login}>
            Already part of Root? Sign in
          </a>
        </div>
      </section>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(145deg, #EEF2E8 0%, #F8F5EE 55%, #E9EEE3 100%)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "40px 20px",
    color: "#181818",
  },

  container: {
    width: "100%",
    maxWidth: "760px",
    textAlign: "center",
  },

  enso: {
    marginBottom: "36px",
    display: "flex",
    justifyContent: "center",
  },

  content: {
    willChange: "opacity, transform",
  },

  brand: {
    fontSize: "12px",
    letterSpacing: "0.18em",
    fontWeight: "800",
    color: "#6F675B",
    marginBottom: "20px",
  },

  title: {
    fontFamily: "Georgia, serif",
    fontSize: "clamp(42px, 7vw, 72px)",
    lineHeight: "1.05",
    fontWeight: "500",
    letterSpacing: "-0.05em",
    margin: "0 0 24px",
  },

  subtitle: {
    fontSize: "22px",
    lineHeight: "1.7",
    color: "#4D463B",
    marginBottom: "44px",
  },

  options: {
    display: "grid",
    gap: "18px",
  },

  primaryCard: {
    textDecoration: "none",
    textAlign: "left",
    padding: "28px",
    borderRadius: "30px",
    background:
      "linear-gradient(135deg, rgba(44,62,43,0.96), rgba(70,92,65,0.92))",
    color: "#FFFFFF",
    boxShadow: "0 24px 70px rgba(20,18,15,0.16)",
  },

  secondaryCard: {
    textDecoration: "none",
    textAlign: "left",
    padding: "28px",
    borderRadius: "30px",
    background: "rgba(255,255,255,0.65)",
    color: "#181818",
    border: "1px solid rgba(255,255,255,0.8)",
    boxShadow: "0 18px 50px rgba(20,18,15,0.08)",
  },

  login: {
    display: "inline-block",
    marginTop: "34px",
    color: "#4D463B",
    textDecoration: "none",
    fontWeight: "700",
  },
};
