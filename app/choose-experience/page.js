"use client";

import { useEffect, useState } from "react";
import { getRootIdentity, setActiveExperience } from "../../lib/rootIdentity";

export default function ChooseExperiencePage() {
  const [identity, setIdentity] = useState(null);
  const [checking, setChecking] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let active = true;
    getRootIdentity()
      .then((current) => {
        if (!active) return;
        if (!current) {
          setUnavailable(true);
          return;
        }
        if (!current.capabilities?.canUseWorkplace) {
          window.location.replace(current.capabilities?.canUsePersonal ? "/" : "/welcome");
          return;
        }
        setIdentity(current);
      })
      .catch(() => {
        if (active) setUnavailable(true);
      })
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => { active = false; };
  }, []);

  if (checking) return <main style={styles.page}><section style={styles.card} aria-live="polite">Verifying your Root Health access…</section></main>;
  if (unavailable || !identity) {
    return (
      <main style={styles.page}>
        <section style={styles.card}>
          <p style={styles.kicker}>Professional Introducer Preview</p>
          <h1 style={styles.title}>Access could not be verified</h1>
          <p style={styles.intro}>Your Personal Root and Workplace access is protected by your current invitation and grant. If you are already signed in, contact Root Health to check whether access has expired or been revoked.</p>
          <a style={styles.button} href="/login?next=%2Fintroducer">Return to sign in</a>
        </section>
      </main>
    );
  }

  const introducer = identity.introducerDemo?.enabled === true;
  const canUsePersonal = identity.capabilities?.canUsePersonal === true;
  const canUseWorkplace = identity.capabilities?.canUseWorkplace === true;

  function openPersonal() {
    if (!canUsePersonal) return;
    setActiveExperience("personal");
    window.location.assign("/");
  }

  function openWorkplace() {
    if (!canUseWorkplace) return;
    setActiveExperience("workplace");
    window.location.assign("/org-insights");
  }

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <p style={styles.kicker}>{introducer ? "Professional Introducer Preview" : "Root Health"}</p>
        <h1 style={styles.title}>Welcome back{identity.user?.name ? `, ${identity.user.name}` : ""}</h1>
        <p style={styles.intro}>
          {introducer
            ? "Your Personal Root is private to you. Workplace opens the fictional Northstar Studio organisation and its privacy-protected reports."
            : "Choose where you would like to continue today."}
        </p>
        {introducer && identity.introducerDemo?.expiresAt && (
          <p style={styles.expiry}>Demonstration access until {new Date(identity.introducerDemo.expiresAt).toLocaleDateString("en-GB")} · Fictional workforce data</p>
        )}

        <div style={styles.option}>
          <h2 style={styles.heading}>🌿 Root Personal</h2>
          <p style={styles.text}>Continue your own private wellbeing journey with assessments, check-ins, coaching, journaling and progress.</p>
          <button style={styles.button} disabled={!canUsePersonal} onClick={openPersonal}>Open Personal Root</button>
        </div>

        <div style={styles.option}>
          <h2 style={styles.heading}>{introducer ? "🏢 Root Workplace · Northstar Studio (fictional)" : "🏢 Root Workplace"}</h2>
          <p style={styles.text}>{introducer ? "Explore the genuine employer dashboard, reports and privacy-protected fictional workforce insights." : "Open your workplace dashboard, organisation insights and reporting."}</p>
          <button style={styles.button} disabled={!canUseWorkplace} onClick={openWorkplace}>Open Root Workplace</button>
          {introducer && identity.introducerDemo?.employerAdminAvailable === true && (
            <p style={styles.adminLink}><a href="/organisation-structure">Open fictional organisation administration</a></p>
          )}
        </div>
        {introducer && <p style={styles.privacy}>Your Personal Root records are separate from Northstar Studio’s fictional workforce data. Employer views show only permitted aggregates.</p>}
      </section>
      {introducer && <div style={styles.watermark}>Authorised Root Health Partner Demonstration</div>}
    </main>
  );
}

const styles = {
  page: { minHeight: "100vh", boxSizing: "border-box", display: "grid", placeItems: "center", padding: "30px 18px", background: "linear-gradient(145deg,#eef2e8 0%,#f8f5ee 55%,#e9eee3 100%)", color: "#20231e", fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' },
  card: { width: "min(780px,100%)", boxSizing: "border-box", padding: "clamp(26px,5vw,44px)", borderRadius: 30, background: "rgba(255,255,255,.82)", border: "1px solid rgba(255,255,255,.95)", boxShadow: "0 24px 70px rgba(32,38,28,.1)" },
  kicker: { margin: 0, color: "#68785d", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".14em", fontSize: 12 },
  title: { margin: "12px 0", color: "#1a1a1a", fontSize: "clamp(32px,5vw,44px)", letterSpacing: "-.04em" },
  intro: { color: "#555", lineHeight: 1.7, marginBottom: 20 },
  expiry: { color: "#59634f", fontSize: 13, fontWeight: 650 },
  option: { marginTop: 22, padding: "clamp(20px,4vw,28px)", borderRadius: 22, background: "rgba(255,255,255,.65)", border: "1px solid rgba(0,0,0,.06)" },
  heading: { margin: "0 0 10px", fontSize: 20 },
  text: { lineHeight: 1.65, color: "#555", margin: "0 0 18px" },
  button: { display: "inline-flex", border: 0, borderRadius: 999, padding: "13px 20px", background: "#303d2b", color: "#fff", fontWeight: 700, cursor: "pointer", textDecoration: "none" },
  adminLink: { margin: "16px 0 0", fontSize: 14 },
  privacy: { margin: "22px 0 0", color: "#687263", fontSize: 13, lineHeight: 1.6 },
  watermark: { position: "fixed", right: 14, bottom: 10, color: "#59634f", fontSize: 10, opacity: .55, pointerEvents: "none" },
};
