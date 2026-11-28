"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import RootEnso from "../../components/RootEnso";

/**
 * Entry point for named professional introducers. The Root auth gate sends a
 * freshly verified introducer grant to /choose-experience; this page is the
 * safe landing shown before sign-in or when access cannot be established.
 */
export default function ProfessionalIntroducerGateway() {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
    // The local session only selects the next page. /choose-experience
    // verifies current server-issued introducer access before revealing data.
    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (!active) return;
        if (!error && data?.session?.access_token) {
          window.location.replace("/choose-experience");
        } else {
          setChecking(false);
        }
      })
      .catch(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, []);

  if (checking) return (
    <main style={styles.page}>
      <section style={styles.card} aria-live="polite">
        Verifying your Root Health demonstration session…
      </section>
    </main>
  );

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <div style={styles.brand}>
          <RootEnso size={38} />
          <span>Root Health</span>
        </div>
        <p style={styles.kicker}>Professional Introducer Preview</p>
        <h1 style={styles.title}>Your Root Health experience</h1>
        <p style={styles.copy}>
          Sign in with your named invitation to open your private Personal Root
          and the fictional Northstar Studio Workplace experience. Root checks
          your access before showing either experience.
        </p>
        <Link href="/login?next=%2Fintroducer" style={styles.button}>
          Sign in to continue
        </Link>
        <p style={styles.note}>
          Access is personal, time-limited and revocable. If you are already
          signed in and cannot continue, contact Root Health to check your
          demonstration access.
        </p>
      </section>
      <footer style={styles.footer}>© 2024–2026 Root Health</footer>
      <div style={styles.watermark}>Authorised Root Health Partner Demonstration</div>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    boxSizing: "border-box",
    display: "grid",
    placeItems: "center",
    padding: "32px 20px 56px",
    background: "linear-gradient(145deg,#eef2e8 0%,#f8f5ee 55%,#e9eee3 100%)",
    color: "#20231e",
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
  },
  card: {
    width: "min(680px,100%)",
    boxSizing: "border-box",
    padding: "clamp(28px,6vw,52px)",
    borderRadius: "28px",
    background: "rgba(255,255,255,.82)",
    border: "1px solid rgba(255,255,255,.95)",
    boxShadow: "0 24px 70px rgba(32,38,28,.1)",
  },
  brand: { display: "flex", alignItems: "center", gap: 12, fontWeight: 750, fontSize: 18 },
  kicker: { margin: "34px 0 8px", color: "#68785d", fontSize: 12, fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase" },
  title: { margin: 0, color: "#20231e", fontSize: "clamp(32px,6vw,48px)", lineHeight: 1.08, letterSpacing: "-.04em" },
  copy: { maxWidth: 560, margin: "18px 0 26px", color: "#596055", fontSize: 16, lineHeight: 1.7 },
  button: { display: "inline-flex", justifyContent: "center", borderRadius: 999, padding: "13px 20px", background: "#303d2b", color: "#fff", fontWeight: 700, textDecoration: "none" },
  note: { maxWidth: 550, margin: "24px 0 0", color: "#687263", fontSize: 13, lineHeight: 1.6 },
  footer: { position: "absolute", bottom: 18, color: "#687263", fontSize: 12 },
  watermark: { position: "fixed", right: 14, bottom: 10, color: "#59634f", fontSize: 10, opacity: .55, pointerEvents: "none" },
};
