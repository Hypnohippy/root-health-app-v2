"use client";

import { useEffect, useState } from "react";
import RootEnso from "../../components/RootEnso";

export default function WelcomePage() {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const timers = [
  setTimeout(() => setStage(1), 700),
  setTimeout(() => setStage(2), 1700),
  setTimeout(() => setStage(3), 3200),
  setTimeout(() => setStage(4), 4800),
  setTimeout(() => setStage(5), 6600),
];

    return () => timers.forEach(clearTimeout);
  }, []);

  function revealStyle(requiredStage, transform) {
    return {
      opacity: stage >= requiredStage ? 1 : 0,
      transform: stage >= requiredStage ? "translate(0, 0)" : transform,
     transition:
  "opacity 1.7s cubic-bezier(0.22, 1, 0.36, 1), transform 1.7s cubic-bezier(0.22, 1, 0.36, 1)",
      willChange: "opacity, transform",
    };
  }

  return (
    <main style={styles.page}>
      <style jsx global>{`
        @keyframes rootWelcomeBreath {
          0%,
          100% {
            transform: scale(1);
          }

          42% {
            transform: scale(1.075);
          }

          52% {
            transform: scale(1.075);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .root-welcome-enso,
          .root-welcome-reveal {
            animation: none !important;
            transition: none !important;
            transform: none !important;
            opacity: 1 !important;
          }
        }
      `}</style>

      <section style={styles.container}>
        <div
          className="root-welcome-enso"
          style={styles.ensoBreath}
          aria-hidden="true"
        >
          <RootEnso size={118} />
        </div>

        <p
          className="root-welcome-reveal"
          style={{
            ...styles.brand,
            ...revealStyle(1, "translate(0, -14px)"),
          }}
        >
          ROOT HEALTH
        </p>

        <h1
          className="root-welcome-reveal"
          style={{
            ...styles.title,
            ...revealStyle(2, "translate(0, 22px)"),
          }}
        >
          Root will meet you
          <br />
          where you are today.
        </h1>

        <p
          className="root-welcome-reveal"
          style={{
            ...styles.subtitle,
            ...revealStyle(3, "translate(-24px, 0)"),
          }}
        >
          There is no perfect place to begin.
          <br />
          Every journey begins with understanding.
        </p>

        <div style={styles.options}>
          <a
            href="/register"
            className="root-welcome-reveal"
            style={{
              ...styles.primaryCard,
              ...revealStyle(4, "translate(-34px, 12px)"),
            }}
          >
            <div style={styles.cardIcon}>🌱</div>

            <div>
              <h2 style={styles.cardTitle}>For myself</h2>

              <p style={styles.primaryCardText}>
                Understand your wellbeing, recognise your patterns and take
                your next step with Root.
              </p>
            </div>

            <span style={styles.arrow}>→</span>
          </a>

          <a
            href="/organisation/join"
            className="root-welcome-reveal"
            style={{
              ...styles.secondaryCard,
              ...revealStyle(4, "translate(34px, 12px)"),
            }}
          >
            <div style={styles.cardIcon}>🏢</div>

            <div>
              <h2 style={styles.cardTitle}>Through work</h2>

              <p style={styles.secondaryCardText}>
                Join your organisation’s wellbeing programme and begin your
                personal Root journey.
              </p>
            </div>

            <span style={styles.secondaryArrow}>→</span>
          </a>
        </div>

        <a
          href="/login"
          className="root-welcome-reveal"
          style={{
            ...styles.login,
            ...revealStyle(5, "translate(0, 14px)"),
          }}
        >
          Already part of Root? <strong>Sign in</strong>
        </a>

        <p
          className="root-welcome-reveal"
          style={{
            ...styles.quietNote,
            ...revealStyle(5, "translate(0, 10px)"),
          }}
        >
          Take your time. Root is here when you are ready.
        </p>
      </section>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    boxSizing: "border-box",
    background:
      "radial-gradient(circle at 50% 12%, rgba(255,255,255,0.94), transparent 34%), linear-gradient(145deg, #EEF2E8 0%, #F8F5EE 55%, #E9EEE3 100%)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "44px 20px",
    color: "#181818",
    overflowX: "hidden",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
  },

  container: {
    width: "100%",
    maxWidth: "760px",
    textAlign: "center",
  },

  ensoBreath: {
    width: "fit-content",
    margin: "0 auto 24px",
    display: "flex",
    justifyContent: "center",
    transformOrigin: "center",
    animation:
      "rootWelcomeBreath 6.8s cubic-bezier(0.42, 0, 0.58, 1) infinite",
    filter: "drop-shadow(0 16px 28px rgba(54,65,49,0.10))",
  },

  brand: {
    margin: "0 0 18px",
    fontSize: "12px",
    letterSpacing: "0.2em",
    fontWeight: "800",
    color: "#6F675B",
  },

  title: {
    margin: "0 0 22px",
    fontFamily: "Georgia, serif",
    fontSize: "clamp(42px, 7vw, 70px)",
    lineHeight: 1.06,
    fontWeight: "500",
    letterSpacing: "-0.05em",
    color: "#1E251D",
  },

  subtitle: {
    margin: "0 auto 38px",
    fontFamily: "Georgia, serif",
    fontSize: "clamp(18px, 2.8vw, 23px)",
    lineHeight: 1.7,
    color: "#4D5148",
  },

  options: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "16px",
  },

  primaryCard: {
    minHeight: "150px",
    boxSizing: "border-box",
    textDecoration: "none",
    textAlign: "left",
    padding: "26px",
    borderRadius: "30px",
    background:
      "linear-gradient(135deg, rgba(44,62,43,0.97), rgba(70,92,65,0.93))",
    color: "#FFFFFF",
    boxShadow: "0 24px 70px rgba(20,18,15,0.15)",
    display: "grid",
    gridTemplateColumns: "auto 1fr auto",
    alignItems: "center",
    gap: "16px",
  },

  secondaryCard: {
    minHeight: "150px",
    boxSizing: "border-box",
    textDecoration: "none",
    textAlign: "left",
    padding: "26px",
    borderRadius: "30px",
    background: "rgba(255,255,255,0.64)",
    color: "#181818",
    border: "1px solid rgba(255,255,255,0.9)",
    boxShadow: "0 18px 50px rgba(20,18,15,0.08)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    display: "grid",
    gridTemplateColumns: "auto 1fr auto",
    alignItems: "center",
    gap: "16px",
  },

  cardIcon: {
    fontSize: "28px",
    alignSelf: "start",
  },

  cardTitle: {
    margin: "0 0 9px",
    fontFamily: "Georgia, serif",
    fontSize: "26px",
    fontWeight: "500",
  },

  primaryCardText: {
    margin: 0,
    color: "rgba(255,255,255,0.8)",
    lineHeight: 1.65,
    fontSize: "15px",
  },

  secondaryCardText: {
    margin: 0,
    color: "#5A554D",
    lineHeight: 1.65,
    fontSize: "15px",
  },

  arrow: {
    color: "#FFFFFF",
    fontSize: "28px",
  },

  secondaryArrow: {
    color: "#3C4738",
    fontSize: "28px",
  },

  login: {
    display: "inline-block",
    marginTop: "30px",
    color: "#4D5148",
    textDecoration: "none",
    fontSize: "16px",
  },

  quietNote: {
    margin: "15px 0 0",
    color: "#7A766E",
    fontSize: "13px",
    letterSpacing: "0.01em",
  },
};