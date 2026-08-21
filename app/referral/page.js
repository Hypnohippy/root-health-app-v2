"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  useSearchParams,
} from "next/navigation";

export default function ReferralPage() {
  const searchParams =
    useSearchParams();

  const [
    status,
    setStatus,
  ] = useState("loading");

  const [
    referralCode,
    setReferralCode,
  ] = useState("");

  const [
    campaignCode,
    setCampaignCode,
  ] = useState("");

  useEffect(() => {
    async function validateReferral() {
      const ref =
        String(
          searchParams.get("ref") ||
            ""
        )
          .trim()
          .toLowerCase();

      const campaign =
        String(
          searchParams.get(
            "campaign"
          ) || ""
        )
          .trim()
          .toLowerCase();

      if (!ref) {
        setStatus("invalid");
        return;
      }

      try {
        const response =
          await fetch(
            "/api/referral/validate",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  referralCode:
                    ref,

                  campaignCode:
                    campaign,
                }),
            }
          );

        const result =
          await response.json();

        if (
          !response.ok ||
          !result?.success ||
          !result?.valid
        ) {
          setStatus("invalid");
          return;
        }

        setReferralCode(
          result.referralCode
        );

        setCampaignCode(
          result.campaignCode ||
            ""
        );

        setStatus("valid");
      } catch (error) {
        console.error(
          "ROOT REFERRAL PAGE ERROR:",
          error
        );

        setStatus("invalid");
      }
    }

    validateReferral();
  }, [searchParams]);

  function continueToRoot() {
    const params =
      new URLSearchParams();

    params.set(
      "path",
      "paid"
    );

    params.set(
      "ref",
      referralCode
    );

    if (campaignCode) {
      params.set(
        "campaign",
        campaignCode
      );
    }

    window.location.href =
      `/organisation/register?${params.toString()}`;
  }

  if (status === "loading") {
    return (
      <main style={styles.page}>
        <section style={styles.card}>
          <p style={styles.kicker}>
            ROOT WORKPLACE
          </p>

          <h1 style={styles.title}>
            Preparing your Root
            Workplace introduction.
          </h1>

          <p style={styles.text}>
            One moment while Root
            verifies this introduction.
          </p>
        </section>
      </main>
    );
  }

  if (status === "invalid") {
    return (
      <main style={styles.page}>
        <section style={styles.card}>
          <p style={styles.kicker}>
            ROOT WORKPLACE
          </p>

          <h1 style={styles.title}>
            This introduction is no
            longer available.
          </h1>

          <p style={styles.text}>
            The referral link may have
            expired or may no longer be
            active.
          </p>

          <p style={styles.smallText}>
            You can still explore Root
            Workplace through the main
            Root Health website.
          </p>

          <button
            type="button"
            style={styles.secondaryButton}
            onClick={() => {
              window.location.href =
                "/";
            }}
          >
            Return to Root Health
          </button>
        </section>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <section style={styles.hero}>
        <div style={styles.heroCopy}>
          <p style={styles.kicker}>
            ROOT WORKPLACE
          </p>

          <h1 style={styles.heroTitle}>
            Understand what is happening
            before it becomes the problem.
          </h1>

          <p style={styles.heroText}>
            Root Workplace helps
            organisations recognise
            emerging patterns in employee
            wellbeing, understand what
            those patterns may mean and
            turn evidence into earlier,
            more informed action.
          </p>

          <div style={styles.promiseGrid}>
            <Promise
              title="Understand"
              text="See emerging patterns across the organisation without exposing individual employee experiences."
            />

            <Promise
              title="Act"
              text="Turn organisational insight into practical priorities and proportionate action."
            />

            <Promise
              title="Measure"
              text="Establish a baseline and follow what changes over time."
            />
          </div>

          <div style={styles.actionBox}>
            <p style={styles.actionText}>
              Continue to tell Root about
              your organisation and review
              the appropriate Workplace
              membership route.
            </p>

            <button
              type="button"
              style={styles.primaryButton}
              onClick={
                continueToRoot
              }
            >
              Continue to Root Workplace
              <span style={styles.arrow}>
                →
              </span>
            </button>

            <p style={styles.smallText}>
              Following a referral does
              not create an account,
              obligation or commission.
              Commercial attribution is
              only applied to qualifying
              business completed through
              Root.
            </p>
          </div>
        </div>

        <div style={styles.visual}>
          <div style={styles.circle}>
            <div style={styles.circleInner}>
              <span style={styles.circleSmall}>
                ROOT
              </span>

              <strong style={styles.circleText}>
                Understand
                <br />
                Act
                <br />
                Measure
                <br />
                Learn
              </strong>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function Promise({
  title,
  text,
}) {
  return (
    <div style={styles.promise}>
      <strong style={styles.promiseTitle}>
        {title}
      </strong>

      <p style={styles.promiseText}>
        {text}
      </p>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(135deg, #f4f3e9 0%, #f8f7f0 52%, #edf1e7 100%)",
    color: "#183426",
    fontFamily:
      "Arial, Helvetica, sans-serif",
    padding: "42px 24px",
  },

  card: {
    maxWidth: 760,
    margin: "80px auto",
    background:
      "rgba(255,255,255,0.82)",
    border:
      "1px solid rgba(24,52,38,0.10)",
    borderRadius: 34,
    padding: "48px",
    boxShadow:
      "0 30px 90px rgba(24,52,38,0.08)",
  },

  hero: {
    width: "100%",
    maxWidth: 1320,
    margin: "0 auto",
    minHeight: "calc(100vh - 84px)",
    display: "grid",
    gridTemplateColumns:
      "minmax(0, 1.15fr) minmax(340px, 0.85fr)",
    gap: 70,
    alignItems: "center",
  },

  heroCopy: {
    maxWidth: 780,
  },

  kicker: {
    margin: "0 0 20px",
    fontSize: 14,
    fontWeight: 800,
    letterSpacing: "0.18em",
    color: "#5d7063",
  },

  title: {
    margin: "0 0 22px",
    fontFamily: "Georgia, serif",
    fontWeight: 400,
    fontSize: "clamp(42px, 6vw, 72px)",
    lineHeight: 1,
    color: "#14291e",
  },

  heroTitle: {
    margin: "0 0 28px",
    fontFamily: "Georgia, serif",
    fontWeight: 400,
    fontSize:
      "clamp(50px, 6.5vw, 88px)",
    lineHeight: 0.98,
    letterSpacing: "-0.045em",
    color: "#14291e",
  },

  text: {
    fontSize: 19,
    lineHeight: 1.7,
    color: "#526359",
  },

  heroText: {
    maxWidth: 720,
    margin: "0 0 36px",
    fontSize: 20,
    lineHeight: 1.7,
    color: "#526359",
  },

  promiseGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(3, minmax(0, 1fr))",
    gap: 14,
    marginBottom: 34,
  },

  promise: {
    background:
      "rgba(255,255,255,0.72)",
    border:
      "1px solid rgba(24,52,38,0.08)",
    borderRadius: 24,
    padding: 22,
  },

  promiseTitle: {
    display: "block",
    marginBottom: 9,
    fontSize: 16,
  },

  promiseText: {
    margin: 0,
    fontSize: 14,
    lineHeight: 1.55,
    color: "#66766d",
  },

  actionBox: {
    background: "#ffffff",
    borderRadius: 30,
    padding: 26,
    border:
      "1px solid rgba(24,52,38,0.08)",
    boxShadow:
      "0 20px 50px rgba(24,52,38,0.07)",
  },

  actionText: {
    margin: "0 0 18px",
    fontSize: 16,
    lineHeight: 1.6,
    color: "#526359",
  },

  primaryButton: {
    appearance: "none",
    border: 0,
    borderRadius: 999,
    padding: "17px 24px",
    background: "#183426",
    color: "#ffffff",
    fontSize: 16,
    fontWeight: 800,
    cursor: "pointer",
  },

  secondaryButton: {
    appearance: "none",
    border:
      "1px solid rgba(24,52,38,0.15)",
    borderRadius: 999,
    padding: "15px 22px",
    background: "#ffffff",
    color: "#183426",
    fontSize: 15,
    fontWeight: 800,
    cursor: "pointer",
  },

  arrow: {
    marginLeft: 14,
  },

  smallText: {
    margin: "15px 0 0",
    fontSize: 13,
    lineHeight: 1.55,
    color: "#7a877f",
  },

  visual: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },

  circle: {
    width: "min(430px, 78vw)",
    aspectRatio: "1",
    borderRadius: "50%",
    border:
      "1px solid rgba(24,52,38,0.17)",
    display: "grid",
    placeItems: "center",
    background:
      "rgba(255,255,255,0.34)",
    boxShadow:
      "0 40px 100px rgba(24,52,38,0.09)",
  },

  circleInner: {
    width: "72%",
    aspectRatio: "1",
    borderRadius: "50%",
    background: "#183426",
    color: "#ffffff",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    textAlign: "center",
  },

  circleSmall: {
    fontSize: 12,
    letterSpacing: "0.25em",
    marginBottom: 16,
    opacity: 0.72,
  },

  circleText: {
    fontFamily: "Georgia, serif",
    fontWeight: 400,
    fontSize:
      "clamp(27px, 3vw, 42px)",
    lineHeight: 1.15,
  },
};
