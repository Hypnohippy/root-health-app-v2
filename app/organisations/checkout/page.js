"use client";

import { useEffect, useState } from "react";

import RootEnso from "../../../components/RootEnso";

export default function OrganisationCheckoutPage() {
  const [
    applicationId,
    setApplicationId,
  ] = useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    const params =
      new URLSearchParams(
        window.location.search
      );

    const suppliedApplicationId =
      String(
        params.get(
          "application_id"
        ) || ""
      ).trim();

    setApplicationId(
      suppliedApplicationId
    );
  }, []);

  async function beginCheckout() {
    setError("");

    if (!applicationId) {
      setError(
        "Root could not identify this membership application."
      );

      return;
    }

    try {
      setLoading(true);

      const response =
        await fetch(
          "/api/stripe/workplace-checkout",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              applicationId,
            }),
          }
        );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result?.success ||
        !result?.url
      ) {
        throw new Error(
          result?.error ||
            "Root could not start secure membership billing."
        );
      }

      window.location.href =
        result.url;
    } catch (checkoutError) {
      console.error(
        "ROOT DIRECT MEMBERSHIP CHECKOUT ERROR:",
        checkoutError
      );

      setError(
        checkoutError?.message ||
          "Root could not start secure membership billing."
      );

      setLoading(false);
    }
  }

  const missingApplication =
    !applicationId;

  return (
    <main style={styles.page}>
      <div style={styles.glowOne} />
      <div style={styles.glowTwo} />

      <section style={styles.card}>
        <div style={styles.ensoWrap}>
          <RootEnso size={78} />
        </div>

        <p style={styles.kicker}>
          ROOT WORKPLACE
        </p>

        <h1 style={styles.title}>
          Confirm your membership
        </h1>

        <p style={styles.intro}>
          Your Root Workplace
          application has been
          approved to continue to
          secure membership billing.
        </p>

        <div style={styles.infoCard}>
          <strong style={styles.infoTitle}>
            What happens next
          </strong>

          <p style={styles.infoText}>
            Root will securely open
            Stripe Checkout using the
            workforce level recorded
            on your approved
            application.
          </p>

          <p style={styles.infoText}>
            No organisation access
            or administrator
            permissions are created
            until membership payment
            has been confirmed.
          </p>

          <p style={styles.infoText}>
            Once Stripe confirms your
            subscription, the
            authorised Root
            administrator will
            receive a separate secure
            setup invitation.
          </p>
        </div>

        {missingApplication ? (
          <div style={styles.errorBox}>
            Root could not identify
            the Workplace application
            from this link. Please use
            the membership link sent
            to you by Root.
          </div>
        ) : null}

        {error ? (
          <div style={styles.errorBox}>
            {error}
          </div>
        ) : null}

        <button
          type="button"
          onClick={beginCheckout}
          disabled={
            loading ||
            missingApplication
          }
          style={{
            ...styles.primaryButton,

            opacity:
              loading ||
              missingApplication
                ? 0.55
                : 1,

            cursor:
              loading ||
              missingApplication
                ? "not-allowed"
                : "pointer",
          }}
        >
          {loading
            ? "Opening secure billing..."
            : "Continue to secure billing"}

          {!loading ? (
            <span style={styles.arrow}>
              →
            </span>
          ) : null}
        </button>

        <p style={styles.secureNote}>
          Secure subscription billing
          is processed by Stripe.
          Root does not store your
          payment card details.
        </p>

        <div style={styles.footerLine} />

        <p style={styles.footerText}>
          Root Workplace
          <br />
          Evidence-led organisational
          wellbeing
        </p>
      </section>
    </main>
  );
}

const styles = {
  page: {
    position: "relative",
    minHeight: "100vh",
    margin: 0,
    padding: "56px 22px",
    display: "grid",
    placeItems: "center",
    overflow: "hidden",
    background:
      "linear-gradient(145deg, #F6F2EA 0%, #E6EEE2 100%)",
    color: "#172018",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Arial, sans-serif',
  },

  glowOne: {
    position: "absolute",
    width: "520px",
    height: "520px",
    top: "-180px",
    right: "-170px",
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(128,160,121,0.22), transparent 68%)",
  },

  glowTwo: {
    position: "absolute",
    width: "420px",
    height: "420px",
    bottom: "-170px",
    left: "-150px",
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(255,255,255,0.75), transparent 70%)",
  },

  card: {
    position: "relative",
    zIndex: 2,
    width: "100%",
    maxWidth: "640px",
    padding: "52px",
    borderRadius: "34px",
    background:
      "rgba(255,255,255,0.72)",
    border:
      "1px solid rgba(255,255,255,0.92)",
    boxShadow:
      "0 34px 100px rgba(41,55,40,0.13)",
    backdropFilter:
      "blur(24px)",
    textAlign: "center",
  },

  ensoWrap: {
    display: "grid",
    placeItems: "center",
    marginBottom: "22px",
  },

  kicker: {
    margin: "0 0 15px",
    color: "#647261",
    fontSize: "11px",
    fontWeight: "900",
    letterSpacing: "0.17em",
  },

  title: {
    margin: 0,
    color: "#172018",
    fontFamily: "Georgia, serif",
    fontSize:
      "clamp(42px, 7vw, 62px)",
    fontWeight: "500",
    lineHeight: 1.04,
    letterSpacing: "-0.045em",
  },

  intro: {
    maxWidth: "510px",
    margin: "24px auto 0",
    color: "#5C665D",
    fontSize: "17px",
    lineHeight: 1.8,
  },

  infoCard: {
    marginTop: "32px",
    padding: "28px",
    borderRadius: "24px",
    background:
      "linear-gradient(145deg, rgba(229,237,225,0.92), rgba(255,255,255,0.8))",
    border:
      "1px solid rgba(72,96,72,0.11)",
    textAlign: "left",
  },

  infoTitle: {
    display: "block",
    marginBottom: "14px",
    color: "#27352A",
    fontFamily: "Georgia, serif",
    fontSize: "24px",
    fontWeight: "500",
  },

  infoText: {
    margin: "10px 0 0",
    color: "#59645A",
    fontSize: "14px",
    lineHeight: 1.75,
  },

  errorBox: {
    marginTop: "22px",
    padding: "15px 17px",
    borderRadius: "17px",
    background:
      "rgba(132,62,62,0.08)",
    border:
      "1px solid rgba(132,62,62,0.16)",
    color: "#743F3F",
    fontSize: "14px",
    lineHeight: 1.6,
  },

  primaryButton: {
    width: "100%",
    minHeight: "60px",
    marginTop: "30px",
    border: "none",
    borderRadius: "999px",
    padding: "16px 24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "17px",
    background: "#263B2B",
    color: "#FFFFFF",
    fontSize: "15px",
    fontWeight: "900",
    transition:
      "all 180ms ease",
  },

  arrow: {
    fontSize: "22px",
    lineHeight: 1,
  },

  secureNote: {
    maxWidth: "490px",
    margin: "18px auto 0",
    color: "#747D74",
    fontSize: "12px",
    lineHeight: 1.65,
  },

  footerLine: {
    height: "1px",
    margin: "34px 0 24px",
    background:
      "rgba(42,55,42,0.08)",
  },

  footerText: {
    margin: 0,
    color: "#758075",
    fontSize: "11px",
    lineHeight: 1.7,
  },
};
