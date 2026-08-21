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
        <section style={styles.stateCard}>
          <p style={styles.kicker}>
            ROOT WORKPLACE
          </p>

          <h1 style={styles.stateTitle}>
            Preparing your
            introduction.
          </h1>

          <p style={styles.bodyText}>
            One moment while Root
            verifies this referral.
          </p>
        </section>
      </main>
    );
  }

  if (status === "invalid") {
    return (
      <main style={styles.page}>
        <section style={styles.stateCard}>
          <p style={styles.kicker}>
            ROOT WORKPLACE
          </p>

          <h1 style={styles.stateTitle}>
            This introduction is no
            longer available.
          </h1>

          <p style={styles.bodyText}>
            The referral link may have
            expired or may no longer be
            active.
          </p>

          <button
            type="button"
            style={
              styles.secondaryButton
            }
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
            Most organisations see
            the problem after it has
            already become expensive.
          </h1>

          <p style={styles.heroLead}>
            Root Workplace helps you
            recognise emerging patterns
            earlier — before stress,
            disengagement, absence and
            performance problems become
            harder to reverse.
          </p>

          <div
            style={
              styles.problemStatement
            }
          >
            <strong
              style={
                styles.problemHeading
              }
            >
              You already collect
              signals.
            </strong>

            <p
              style={
                styles.problemText
              }
            >
              Surveys, absence,
              employee conversations,
              manager observations and
              business performance all
              tell part of the story.
              Root helps bring those
              signals together so
              leaders can see what is
              changing, where pressure
              may be building and what
              deserves attention first.
            </p>
          </div>
        </div>

        <div style={styles.visual}>
          <div style={styles.visualHalo}>
            <div
              style={
                styles.visualCircle
              }
            >
              <span
                style={
                  styles.circleLabel
                }
              >
                ROOT
              </span>

              <strong
                style={
                  styles.circleText
                }
              >
                See
                <br />
                Earlier
              </strong>

              <span
                style={
                  styles.circleFoot
                }
              >
                Understand · Act ·
                Measure
              </span>
            </div>
          </div>
        </div>
      </section>

      <section
        style={
          styles.outcomesSection
        }
      >
        <p style={styles.sectionEyebrow}>
          WHAT CHANGES
        </p>

        <h2 style={styles.sectionTitle}>
          Better visibility leads to
          better decisions.
        </h2>

        <div style={styles.outcomeGrid}>
          <Outcome
            number="01"
            title="See what is changing"
            text="Identify emerging organisational patterns before they become headline problems."
          />

          <Outcome
            number="02"
            title="Know where to act"
            text="Focus attention where the evidence suggests it matters rather than relying on instinct alone."
          />

          <Outcome
            number="03"
            title="Measure what changed"
            text="Establish a baseline, follow progress over time and see whether action actually made a difference."
          />
        </div>
      </section>

      <section
        style={
          styles.evidenceSection
        }
      >
        <div style={styles.evidenceCopy}>
          <p
            style={
              styles.sectionEyebrow
            }
          >
            EVIDENCE BEFORE THEATRE
          </p>

          <h2
            style={
              styles.evidenceTitle
            }
          >
            Root is designed to help
            you make sense of what the
            evidence actually supports.
          </h2>

          <p
            style={
              styles.evidenceText
            }
          >
            It gives organisations a
            way to establish a
            baseline, track change over
            time and make proportionate
            decisions from the patterns
            they can actually see.
          </p>

          <p
            style={
              styles.evidenceText
            }
          >
            No inflated certainty.
            No wellbeing theatre.
            No pretending every
            intervention creates a
            measurable return.
          </p>
        </div>

        <div style={styles.evidenceCard}>
          <span
            style={
              styles.evidenceSmall
            }
          >
            ROOT WORKPLACE
          </span>

          <strong
            style={
              styles.evidenceMetric
            }
          >
            Baseline
            <br />
            → Action
            <br />
            → Evidence
          </strong>

          <p
            style={
              styles.evidenceCaption
            }
          >
            Understand what changed
            and what may have
            contributed to it.
          </p>
        </div>
      </section>

      <section style={styles.ctaSection}>
        <div style={styles.ctaCard}>
          <div style={styles.ctaCopy}>
            <p
              style={
                styles.sectionEyebrow
              }
            >
              YOUR ORGANISATION
            </p>

            <h2 style={styles.ctaTitle}>
              See what Root Workplace
              would look like for you.
            </h2>

            <p style={styles.ctaText}>
              Tell Root a little about
              your organisation and
              continue into the
              appropriate Workplace
              membership route.
            </p>

            <div style={styles.reassurance}>
              <span>✓ A few minutes</span>
              <span>✓ No obligation</span>
              <span>
                ✓ Membership shown
                before confirmation
              </span>
            </div>
          </div>

          <div
            style={
              styles.ctaAction
            }
          >
            <button
              type="button"
              style={
                styles.primaryButton
              }
              onClick={
                continueToRoot
              }
            >
              See Root Workplace for
              your organisation
              <span
                style={
                  styles.arrow
                }
              >
                →
              </span>
            </button>

            <p style={styles.smallText}>
              Following an introduction
              does not create an
              account, obligation or
              commission. Commercial
              attribution applies only
              to qualifying business
              completed through Root.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

function Outcome({
  number,
  title,
  text,
}) {
  return (
    <div style={styles.outcomeCard}>
      <span
        style={
          styles.outcomeNumber
        }
      >
        {number}
      </span>

      <strong
        style={
          styles.outcomeTitle
        }
      >
        {title}
      </strong>

      <p
        style={
          styles.outcomeText
        }
      >
        {text}
      </p>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(135deg, #f3f1e6 0%, #faf9f4 45%, #edf2e9 100%)",
    color: "#173326",
    fontFamily:
      "Arial, Helvetica, sans-serif",
    padding:
      "38px 24px 80px",
  },

  stateCard: {
    maxWidth: 760,
    margin: "90px auto",
    padding: "52px",
    borderRadius: 34,
    background:
      "rgba(255,255,255,0.86)",
    border:
      "1px solid rgba(23,51,38,0.08)",
    boxShadow:
      "0 28px 90px rgba(23,51,38,0.08)",
  },

  kicker: {
    margin: "0 0 22px",
    fontSize: 13,
    fontWeight: 800,
    letterSpacing: "0.20em",
    color: "#687b6d",
  },

  stateTitle: {
    margin: "0 0 20px",
    maxWidth: 680,
    fontFamily:
      "Georgia, serif",
    fontSize:
      "clamp(42px, 6vw, 70px)",
    lineHeight: 1,
    fontWeight: 400,
    color: "#12291d",
  },

  bodyText: {
    maxWidth: 640,
    fontSize: 18,
    lineHeight: 1.7,
    color: "#5b6c62",
  },

  hero: {
    width: "100%",
    maxWidth: 1320,
    margin: "0 auto",
    minHeight:
      "calc(100vh - 76px)",
    display: "grid",
    gridTemplateColumns:
      "minmax(0, 1.15fr) minmax(330px, 0.85fr)",
    gap: 72,
    alignItems: "center",
  },

  heroCopy: {
    maxWidth: 800,
  },

  heroTitle: {
    margin: "0 0 28px",
    fontFamily:
      "Georgia, serif",
    fontWeight: 400,
    fontSize:
      "clamp(52px, 6.7vw, 90px)",
    lineHeight: 0.98,
    letterSpacing: "-0.048em",
    color: "#12291d",
  },

  heroLead: {
    maxWidth: 720,
    margin: "0 0 32px",
    fontSize: 21,
    lineHeight: 1.65,
    color: "#506159",
  },

  problemStatement: {
    maxWidth: 720,
    padding: "24px 26px",
    borderRadius: 26,
    background:
      "rgba(255,255,255,0.72)",
    border:
      "1px solid rgba(23,51,38,0.08)",
  },

  problemHeading: {
    display: "block",
    marginBottom: 8,
    fontSize: 17,
    color: "#173326",
  },

  problemText: {
    margin: 0,
    fontSize: 16,
    lineHeight: 1.65,
    color: "#65746b",
  },

  visual: {
    display: "flex",
    justifyContent:
      "center",
    alignItems: "center",
  },

  visualHalo: {
    width:
      "min(450px, 80vw)",
    aspectRatio: "1",
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    background:
      "radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(234,240,229,0.74) 44%, rgba(234,240,229,0) 72%)",
  },

  visualCircle: {
    width: "74%",
    aspectRatio: "1",
    borderRadius: "50%",
    background: "#173326",
    color: "#ffffff",
    display: "flex",
    flexDirection: "column",
    justifyContent:
      "center",
    alignItems: "center",
    textAlign: "center",
    boxShadow:
      "0 36px 90px rgba(23,51,38,0.18)",
  },

  circleLabel: {
    marginBottom: 16,
    fontSize: 11,
    letterSpacing: "0.28em",
    opacity: 0.7,
  },

  circleText: {
    fontFamily:
      "Georgia, serif",
    fontSize:
      "clamp(42px, 5vw, 65px)",
    lineHeight: 0.94,
    fontWeight: 400,
  },

  circleFoot: {
    marginTop: 22,
    fontSize: 11,
    letterSpacing: "0.1em",
    opacity: 0.72,
  },

  outcomesSection: {
    maxWidth: 1320,
    margin: "30px auto 0",
    padding:
      "76px 0 48px",
  },

  sectionEyebrow: {
    margin: "0 0 14px",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.18em",
    color: "#6b7d70",
  },

  sectionTitle: {
    maxWidth: 760,
    margin: "0 0 38px",
    fontFamily:
      "Georgia, serif",
    fontWeight: 400,
    fontSize:
      "clamp(38px, 5vw, 62px)",
    lineHeight: 1.05,
    color: "#173326",
  },

  outcomeGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(3, minmax(0, 1fr))",
    gap: 18,
  },

  outcomeCard: {
    minHeight: 250,
    padding: 28,
    borderRadius: 28,
    background: "#ffffff",
    border:
      "1px solid rgba(23,51,38,0.08)",
    boxShadow:
      "0 18px 50px rgba(23,51,38,0.05)",
  },

  outcomeNumber: {
    display: "block",
    marginBottom: 44,
    fontSize: 12,
    fontWeight: 800,
    color: "#8a978f",
  },

  outcomeTitle: {
    display: "block",
    marginBottom: 12,
    fontFamily:
      "Georgia, serif",
    fontSize: 26,
    fontWeight: 400,
    color: "#173326",
  },

  outcomeText: {
    margin: 0,
    fontSize: 15,
    lineHeight: 1.65,
    color: "#65746b",
  },

  evidenceSection: {
    maxWidth: 1320,
    margin: "40px auto 0",
    padding:
      "54px 58px",
    borderRadius: 36,
    background: "#173326",
    color: "#ffffff",
    display: "grid",
    gridTemplateColumns:
      "minmax(0, 1.2fr) minmax(280px, 0.8fr)",
    gap: 64,
    alignItems: "center",
  },

  evidenceCopy: {
    maxWidth: 760,
  },

  evidenceTitle: {
    margin: "0 0 22px",
    fontFamily:
      "Georgia, serif",
    fontWeight: 400,
    fontSize:
      "clamp(38px, 4.8vw, 60px)",
    lineHeight: 1.03,
  },

  evidenceText: {
    maxWidth: 700,
    fontSize: 17,
    lineHeight: 1.7,
    color:
      "rgba(255,255,255,0.72)",
  },

  evidenceCard: {
    padding: 34,
    borderRadius: 30,
    background:
      "rgba(255,255,255,0.08)",
    border:
      "1px solid rgba(255,255,255,0.12)",
  },

  evidenceSmall: {
    display: "block",
    marginBottom: 24,
    fontSize: 11,
    letterSpacing: "0.18em",
    opacity: 0.65,
  },

  evidenceMetric: {
    display: "block",
    marginBottom: 24,
    fontFamily:
      "Georgia, serif",
    fontWeight: 400,
    fontSize:
      "clamp(34px, 4vw, 52px)",
    lineHeight: 1.1,
  },

  evidenceCaption: {
    margin: 0,
    fontSize: 14,
    lineHeight: 1.55,
    color:
      "rgba(255,255,255,0.68)",
  },

  ctaSection: {
    maxWidth: 1320,
    margin: "44px auto 0",
  },

  ctaCard: {
    padding:
      "48px 52px",
    borderRadius: 36,
    background:
      "rgba(255,255,255,0.88)",
    border:
      "1px solid rgba(23,51,38,0.08)",
    display: "grid",
    gridTemplateColumns:
      "minmax(0, 1.15fr) minmax(320px, 0.85fr)",
    gap: 52,
    alignItems: "center",
    boxShadow:
      "0 24px 70px rgba(23,51,38,0.06)",
  },

  ctaCopy: {
    maxWidth: 700,
  },

  ctaTitle: {
    margin: "0 0 18px",
    fontFamily:
      "Georgia, serif",
    fontSize:
      "clamp(38px, 5vw, 62px)",
    fontWeight: 400,
    lineHeight: 1.03,
    color: "#173326",
  },

  ctaText: {
    margin: "0 0 20px",
    fontSize: 17,
    lineHeight: 1.65,
    color: "#617168",
  },

  reassurance: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px 18px",
    fontSize: 13,
    fontWeight: 700,
    color: "#53645a",
  },

  ctaAction: {
    padding: 26,
    borderRadius: 28,
    background: "#eef2e9",
  },

  primaryButton: {
    width: "100%",
    appearance: "none",
    border: 0,
    borderRadius: 999,
    padding: "18px 24px",
    background: "#173326",
    color: "#ffffff",
    fontSize: 15,
    fontWeight: 800,
    cursor: "pointer",
    lineHeight: 1.4,
  },

  secondaryButton: {
    appearance: "none",
    border:
      "1px solid rgba(23,51,38,0.15)",
    borderRadius: 999,
    padding: "15px 22px",
    background: "#ffffff",
    color: "#173326",
    fontSize: 15,
    fontWeight: 800,
    cursor: "pointer",
  },

  arrow: {
    marginLeft: 12,
  },

  smallText: {
    margin: "14px 0 0",
    fontSize: 12,
    lineHeight: 1.55,
    color: "#718077",
  },
};
