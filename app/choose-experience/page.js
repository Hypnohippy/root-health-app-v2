"use client";

import { useEffect, useState } from "react";
import {
  getStoredRootIdentity,
  setActiveExperience,
} from "../../lib/rootIdentity";

export default function ChooseExperiencePage() {
  const [identity, setIdentity] = useState(null);

  useEffect(() => {
    const loaded = getStoredRootIdentity();

    if (!loaded) {
      window.location.href = "/login";
      return;
    }

    if (!loaded.capabilities?.canUseWorkplace) {
      window.location.href = "/";
      return;
    }

    setIdentity(loaded);
  }, []);

  if (!identity) return null;

  function openPersonal() {
    setActiveExperience("personal");
    window.location.href = "/";
  }

  function openWorkplace() {
    setActiveExperience("workplace");
    window.location.href = "/org-insights";
  }

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <p style={styles.kicker}>Root</p>

        <h1 style={styles.title}>
          Welcome back{identity.user?.name ? `, ${identity.user.name}` : ""}
        </h1>

        <p style={styles.intro}>
          You have access to both Root Personal and Root Workplace.
          Choose where you'd like to continue today.
        </p>

        <div style={styles.option}>
          <h2 style={styles.heading}>🌿 Root Personal</h2>

          <p style={styles.text}>
            Continue your own wellbeing journey with coaching,
            journaling, check-ins and insights.
          </p>

          <button
            style={styles.button}
            onClick={openPersonal}
          >
            Continue to Root Personal
          </button>
        </div>

        <div style={styles.option}>
          <h2 style={styles.heading}>🏢 Root Workplace</h2>

          <p style={styles.text}>
            Open your workplace dashboard to support your organisation,
            employees and reporting.
          </p>

          <button
            style={styles.button}
            onClick={openWorkplace}
          >
            Open Root Workplace
          </button>
        </div>
      </section>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: "30px",
    background:
      "linear-gradient(145deg,#eef2e8 0%,#f8f5ee 55%,#e9eee3 100%)",
  },

  card: {
    width: "100%",
    maxWidth: "760px",
    padding: "42px",
    borderRadius: "34px",
    background: "rgba(255,255,255,0.74)",
    backdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.9)",
    boxShadow: "0 30px 90px rgba(0,0,0,.12)",
  },

  kicker: {
    color: "#6A755E",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: ".14em",
    fontSize: "12px",
  },

  title: {
    fontSize: "42px",
    margin: "12px 0",
    color: "#1A1A1A",
  },

  intro: {
    color: "#555",
    lineHeight: 1.7,
    marginBottom: "36px",
  },

  option: {
    marginBottom: "26px",
    padding: "28px",
    borderRadius: "24px",
    background: "rgba(255,255,255,.55)",
    border: "1px solid rgba(0,0,0,.05)",
  },

  heading: {
    margin: 0,
    marginBottom: "12px",
  },

  text: {
    lineHeight: 1.6,
    color: "#555",
    marginBottom: "20px",
  },

  button: {
    border: "none",
    borderRadius: "999px",
    padding: "14px 22px",
    background: "#181818",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
  },
};
