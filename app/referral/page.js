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

    function scrollToSection(id) {
    const target =
      document.getElementById(id);

    if (target) {
      target.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }

  return (
    <>
      <main style={styles.page}>
        {/* ==================================================
            GREEN 4A — HERO / COMMERCIAL ENTRY
        ================================================== */}

        <section style={styles.heroShell}>
          <nav style={styles.nav}>
            <button
              type="button"
              style={styles.brandButton}
              onClick={() =>
                window.scrollTo({
                  top: 0,
                  behavior: "smooth",
                })
              }
            >
              <span style={styles.brandEnso}>
                ○
              </span>

              <span style={styles.brandRoot}>
                ROOT
              </span>

              <span style={styles.brandDivider}>
                |
              </span>

              <span style={styles.brandWorkplace}>
                WORKPLACE
              </span>
            </button>

            <div style={styles.navLinks}>
              <button
                type="button"
                style={styles.navLink}
                onClick={() =>
                  scrollToSection(
                    "how-root-works"
                  )
                }
              >
                How it works
              </button>

              <button
                type="button"
                style={styles.navLink}
                onClick={() =>
                  scrollToSection(
                    "evidence"
                  )
                }
              >
                Evidence
              </button>

              <button
                type="button"
                style={styles.navLink}
                onClick={() =>
                  scrollToSection(
                    "privacy"
                  )
                }
              >
                Privacy
              </button>

              <button
                type="button"
                style={styles.navLink}
                onClick={() =>
                  scrollToSection(
                    "pricing"
                  )
                }
              >
                Pricing
              </button>

              <button
                type="button"
                style={styles.talkButton}
                onClick={() =>
                  scrollToSection(
                    "talk"
                  )
                }
              >
                Talk to us
              </button>

              <button
                type="button"
                style={styles.startButton}
                onClick={continueToRoot}
              >
                Start Root
              </button>
            </div>
          </nav>

          <div style={styles.hero}>
            <div style={styles.heroCopy}>
              <p style={styles.heroEyebrow}>
                ORGANISATIONAL HEALTH &
                WORKFORCE INTELLIGENCE
              </p>

              <h1 style={styles.heroTitle}>
                Your organisation is
                already telling you what
                it needs.
              </h1>

              <h2 style={styles.heroAccent}>
                Root helps you see it
                sooner.
              </h2>

              <p style={styles.heroLead}>
                Absence. Engagement.
                Wellbeing. Retention.
                Performance.
              </p>

              <p style={styles.heroBody}>
                Each tells you something.
                Root helps you understand
                the picture between them.
              </p>

              <div style={styles.heroActions}>
                <button
                  type="button"
                  style={styles.primaryHeroButton}
                  onClick={() =>
                    scrollToSection(
                      "how-root-works"
                    )
                  }
                >
                  See how Root works
                  <span style={styles.buttonArrow}>
                    ↓
                  </span>
                </button>

                <button
                  type="button"
                  style={styles.secondaryHeroButton}
                  onClick={() =>
                    scrollToSection(
                      "talk"
                    )
                  }
                >
                  Talk to us
                </button>
              </div>

              <button
                type="button"
                style={styles.pricingTextLink}
                onClick={() =>
                  scrollToSection(
                    "pricing"
                  )
                }
              >
                Already interested?
                See plans & pricing →
              </button>

              <p style={styles.machineDescription}>
                Root Workplace is an
                organisational health and
                workforce intelligence
                platform that helps
                employers understand
                workforce patterns,
                measure change over time
                and evaluate
                organisational action.
              </p>
            </div>

                        <div style={styles.globeStage}>
              <img
                src="/root-workplace-hero-globe-master.png"
                alt="Root Workplace visual showing organisational signals connecting around the Root Enso"
                style={styles.heroGlobeImage}
            />
            </div>
          </div>
        </section>

        {/* ==================================================
            PLACEHOLDERS FOR NEXT GREENS
            These deliberately create the navigation anchors.
        ================================================== */}

                <section
          id="how-root-works"
          style={styles.connectionSection}
        >
          <div style={styles.connectionIntro}>
            <p style={styles.sectionEyebrow}>
              THE CONNECTION PROBLEM
            </p>

            <h2 style={styles.connectionTitle}>
              Most organisations don&apos;t
              have a data problem.
            </h2>

            <p style={styles.connectionAccent}>
              They have a connection
              problem.
            </p>
          </div>

          <div style={styles.signalCards}>
            <SignalCard
              label="ABSENCE"
              value="6.2%"
              movement="↑"
              note="What happened"
            />

            <SignalCard
              label="ENGAGEMENT"
              value="72%"
              movement="↓"
              note="What people said"
            />

            <SignalCard
              label="WELLBEING"
              value="Pressure"
              movement="↑"
              note="What people feel"
            />

            <SignalCard
              label="RETENTION"
              value="94%"
              movement=""
              note="Who stayed"
            />

            <SignalCard
              label="PERFORMANCE"
              value="Stable"
              movement="→"
              note="What changed"
            />
          </div>

          <div style={styles.connectionVisual}>
            <div style={styles.connectionLines}>
              <span style={styles.connectionLine1} />
              <span style={styles.connectionLine2} />
              <span style={styles.connectionLine3} />
              <span style={styles.connectionLine4} />
              <span style={styles.connectionLine5} />

              <div style={styles.connectionEnso}>
                <span style={styles.connectionEnsoInner}>
                  ROOT
                </span>
              </div>
            </div>
          </div>

          <div style={styles.connectionAnswer}>
            <p style={styles.connectionSmall}>
              Each measure tells you
              something.
            </p>

            <h3 style={styles.connectionQuestion}>
              What connects them?
            </h3>

            <p style={styles.connectionBody}>
              Root helps leaders explore
              relationships between
              workforce experience and
              organisational evidence —
              and follow what happens as
              the organisation changes.
            </p>

            <button
              type="button"
              style={styles.connectionLink}
              onClick={() =>
                scrollToSection(
                  "evidence"
                )
              }
            >
              Explore how Root connects
              the picture →
            </button>
          </div>
        </section>
        <section
          id="evidence"
          style={styles.hiddenAnchor}
        />

        <section
          id="privacy"
          style={styles.hiddenAnchor}
        />

        <section
          id="pricing"
          style={styles.hiddenAnchor}
        />

        <section
          id="talk"
          style={styles.hiddenAnchor}
        />
      </main>

      <style jsx global>{`
        html {
          scroll-behavior: smooth;
        }

        body {
          margin: 0;
        }

        @media (max-width: 980px) {
          .root-placeholder {
            display: block;
          }
        }
      `}</style>
    </>
  );
}
function SignalCard({
  label,
  value,
  movement,
  note,
}) {
  return (
    <div style={styles.signalCard}>
      <span style={styles.signalCardLabel}>
        {label}
      </span>

      <div style={styles.signalCardValueRow}>
        <strong style={styles.signalCardValue}>
          {value}
        </strong>

        {movement ? (
          <span style={styles.signalCardMovement}>
            {movement}
          </span>
        ) : null}
      </div>

      <span style={styles.signalCardNote}>
        {note}
      </span>

      <div style={styles.signalMiniChart}>
        <span style={styles.signalDot1} />
        <span style={styles.signalDot2} />
        <span style={styles.signalDot3} />
        <span style={styles.signalDot4} />
        <span style={styles.signalDot5} />
      </div>
    </div>
  );
}
const styles = {
  page: {
    minHeight: "100vh",
    background: "#f5f1e8",
    color: "#173326",
    fontFamily:
      "Arial, Helvetica, sans-serif",
  },

  heroShell: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at 75% 43%, rgba(45,96,70,0.24) 0%, rgba(5,40,29,0) 34%), linear-gradient(135deg, #061d16 0%, #08261c 46%, #041812 100%)",
    color: "#ffffff",
    position: "relative",
    overflow: "hidden",
  },

  nav: {
    width: "calc(100% - 48px)",
    maxWidth: 1480,
    margin: "0 auto",
    minHeight: 84,
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    gap: 24,
    position: "relative",
    zIndex: 20,
  },

  brandButton: {
    appearance: "none",
    border: 0,
    padding: 0,
    background: "transparent",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    gap: 12,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },

  brandEnso: {
    fontFamily: "Georgia, serif",
    fontSize: 41,
    lineHeight: 0.8,
    fontWeight: 300,
  },

  brandRoot: {
    fontSize: 20,
    fontWeight: 500,
    letterSpacing: "0.26em",
  },

  brandDivider: {
    color:
      "rgba(255,255,255,0.35)",
  },

  brandWorkplace: {
    fontSize: 11,
    letterSpacing: "0.2em",
    color:
      "rgba(255,255,255,0.74)",
  },

  navLinks: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    flexWrap: "wrap",
  },

  navLink: {
    appearance: "none",
    border: 0,
    background: "transparent",
    color:
      "rgba(255,255,255,0.82)",
    padding: "10px 12px",
    fontSize: 13,
    cursor: "pointer",
  },

  talkButton: {
    appearance: "none",
    border:
      "1px solid rgba(255,255,255,0.38)",
    background:
      "rgba(255,255,255,0.03)",
    color: "#ffffff",
    borderRadius: 999,
    padding: "11px 18px",
    fontSize: 13,
    cursor: "pointer",
  },

  startButton: {
    appearance: "none",
    border: 0,
    background: "#e7c78f",
    color: "#10261c",
    borderRadius: 999,
    padding: "12px 20px",
    fontSize: 13,
    fontWeight: 800,
    cursor: "pointer",
    boxShadow:
      "0 10px 28px rgba(231,199,143,0.16)",
  },

  hero: {
    width: "calc(100% - 48px)",
    maxWidth: 1480,
    minHeight:
      "calc(100vh - 84px)",
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns:
      "minmax(520px, 1fr) minmax(460px, 0.92fr)",
    gap: 44,
    alignItems: "center",
    position: "relative",
    zIndex: 2,
  },

  heroCopy: {
    padding: "54px 0 78px",
    position: "relative",
    zIndex: 5,
  },

  heroEyebrow: {
    margin: "0 0 22px",
    color: "#dabb85",
    fontSize: 11,
    lineHeight: 1.4,
    fontWeight: 800,
    letterSpacing: "0.13em",
  },

  heroTitle: {
    maxWidth: 670,
    margin: 0,
    fontFamily: "Georgia, serif",
    fontWeight: 400,
    fontSize:
      "clamp(52px, 5.6vw, 86px)",
    lineHeight: 0.98,
    letterSpacing: "-0.04em",
    color: "#f9f7f0",
  },

  heroAccent: {
    margin: "19px 0 15px",
    fontFamily: "Georgia, serif",
    fontWeight: 400,
    fontSize:
      "clamp(27px, 3vw, 42px)",
    lineHeight: 1.1,
    color: "#e7c78f",
  },

  heroLead: {
    margin: "24px 0 5px",
    fontSize: 16,
    lineHeight: 1.6,
    color:
      "rgba(255,255,255,0.82)",
  },

  heroBody: {
    maxWidth: 570,
    margin: 0,
    fontSize: 16,
    lineHeight: 1.65,
    color:
      "rgba(255,255,255,0.72)",
  },

  heroActions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 28,
  },

  primaryHeroButton: {
    appearance: "none",
    border: 0,
    borderRadius: 12,
    padding: "15px 21px",
    background: "#e7c78f",
    color: "#10261c",
    fontWeight: 800,
    fontSize: 14,
    cursor: "pointer",
    boxShadow:
      "0 15px 34px rgba(231,199,143,0.15)",
  },

  secondaryHeroButton: {
    appearance: "none",
    border:
      "1px solid rgba(231,199,143,0.62)",
    borderRadius: 12,
    padding: "14px 22px",
    background:
      "rgba(255,255,255,0.02)",
    color: "#ffffff",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
  },

  buttonArrow: {
    marginLeft: 12,
  },

  pricingTextLink: {
    appearance: "none",
    display: "block",
    border: 0,
    borderBottom:
      "1px solid rgba(231,199,143,0.45)",
    padding:
      "0 0 3px",
    marginTop: 16,
    background: "transparent",
    color: "#e7c78f",
    fontSize: 13,
    cursor: "pointer",
  },

  machineDescription: {
    maxWidth: 610,
    margin: "32px 0 0",
    fontSize: 11,
    lineHeight: 1.55,
    color:
      "rgba(255,255,255,0.57)",
  },

        globeStage: {
    minHeight: 620,
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    overflow: "visible",
  },

  heroGlobeImage: {
    display: "block",
    width: "min(800px, 47vw)",
    maxWidth: "800px",
    height: "auto",
    objectFit: "contain",
    objectPosition: "center",
    transform: "none",
    filter:
      "drop-shadow(0 28px 50px rgba(0,0,0,0.30))",
  },
  
  nextSection: {
    minHeight: 470,
    padding: "90px 7vw",
    background:
      "linear-gradient(180deg, #f8f5ed 0%, #f2eee4 100%)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  },

  sectionEyebrow: {
    margin: "0 0 15px",
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.17em",
    color: "#68796d",
  },

  nextTitle: {
    maxWidth: 700,
    margin: 0,
    fontFamily: "Georgia, serif",
    fontWeight: 400,
    fontSize:
      "clamp(42px, 5.5vw, 72px)",
    lineHeight: 1.04,
    color: "#183426",
  },

  nextAccent: {
    margin: "10px 0 0",
    fontFamily: "Georgia, serif",
    fontSize:
      "clamp(29px, 4vw, 48px)",
    color: "#315f4b",
  },

  hiddenAnchor: {
    height: 1,
    margin: 0,
    padding: 0,
  },

  stateCard: {
    maxWidth: 760,
    margin: "90px auto",
    padding: 52,
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
    fontFamily: "Georgia, serif",
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
    connectionSection: {
    padding: "92px 5vw 100px",
    background:
      "linear-gradient(180deg, #f7f3e9 0%, #f0ecdf 100%)",
    color: "#173326",
    overflow: "hidden",
  },

  connectionIntro: {
    width: "100%",
    maxWidth: 1320,
    margin: "0 auto 46px",
  },

  connectionTitle: {
    maxWidth: 780,
    margin: 0,
    fontFamily: "Georgia, serif",
    fontWeight: 400,
    fontSize:
      "clamp(42px, 5vw, 68px)",
    lineHeight: 1.02,
    letterSpacing: "-0.035em",
    color: "#173326",
  },

  connectionAccent: {
    margin: "10px 0 0",
    fontFamily: "Georgia, serif",
    fontWeight: 400,
    fontSize:
      "clamp(30px, 3.7vw, 48px)",
    lineHeight: 1.08,
    color: "#35604d",
  },

  signalCards: {
    width: "100%",
    maxWidth: 1320,
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns:
      "repeat(5, minmax(0, 1fr))",
    gap: 14,
    position: "relative",
    zIndex: 3,
  },

  signalCard: {
    minHeight: 180,
    padding: "22px 20px",
    borderRadius: 22,
    background:
      "rgba(255,255,255,0.82)",
    border:
      "1px solid rgba(23,51,38,0.09)",
    boxShadow:
      "0 16px 40px rgba(23,51,38,0.055)",
    position: "relative",
  },

  signalCardLabel: {
    display: "block",
    marginBottom: 16,
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: "0.13em",
    color: "#6e7e74",
  },

  signalCardValueRow: {
    display: "flex",
    alignItems: "baseline",
    gap: 9,
  },

  signalCardValue: {
    fontFamily: "Georgia, serif",
    fontWeight: 400,
    fontSize: 34,
    color: "#173326",
  },

  signalCardMovement: {
    fontSize: 23,
    color: "#6d8b71",
  },

  signalCardNote: {
    display: "block",
    marginTop: 7,
    fontSize: 12,
    color: "#7d8a82",
  },

  signalMiniChart: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 18,
    height: 24,
    borderBottom:
      "1px solid rgba(23,51,38,0.10)",
  },

  signalDot1: {
    position: "absolute",
    left: "4%",
    bottom: 5,
    width: 4,
    height: 4,
    borderRadius: "50%",
    background: "#718879",
  },

  signalDot2: {
    position: "absolute",
    left: "25%",
    bottom: 11,
    width: 4,
    height: 4,
    borderRadius: "50%",
    background: "#718879",
  },

  signalDot3: {
    position: "absolute",
    left: "48%",
    bottom: 8,
    width: 4,
    height: 4,
    borderRadius: "50%",
    background: "#718879",
  },

  signalDot4: {
    position: "absolute",
    left: "70%",
    bottom: 16,
    width: 4,
    height: 4,
    borderRadius: "50%",
    background: "#718879",
  },

  signalDot5: {
    position: "absolute",
    right: "3%",
    bottom: 12,
    width: 4,
    height: 4,
    borderRadius: "50%",
    background: "#718879",
  },

  connectionVisual: {
    width: "100%",
    maxWidth: 1320,
    height: 170,
    margin: "0 auto",
    position: "relative",
  },

  connectionLines: {
    position: "absolute",
    inset: 0,
  },

  connectionLine1: {
    position: "absolute",
    top: 0,
    left: "10%",
    width: "40%",
    height: 1,
    background:
      "linear-gradient(90deg, rgba(157,140,99,0.10), rgba(157,140,99,0.52))",
    transform: "rotate(17deg)",
    transformOrigin: "left center",
  },

  connectionLine2: {
    position: "absolute",
    top: 0,
    left: "30%",
    width: "21%",
    height: 1,
    background:
      "rgba(157,140,99,0.42)",
    transform: "rotate(31deg)",
    transformOrigin: "left center",
  },

  connectionLine3: {
    position: "absolute",
    top: 0,
    left: "50%",
    width: 1,
    height: 105,
    background:
      "linear-gradient(180deg, rgba(157,140,99,0.12), rgba(157,140,99,0.50))",
  },

  connectionLine4: {
    position: "absolute",
    top: 0,
    right: "30%",
    width: "21%",
    height: 1,
    background:
      "rgba(157,140,99,0.42)",
    transform: "rotate(-31deg)",
    transformOrigin: "right center",
  },

  connectionLine5: {
    position: "absolute",
    top: 0,
    right: "10%",
    width: "40%",
    height: 1,
    background:
      "linear-gradient(270deg, rgba(157,140,99,0.10), rgba(157,140,99,0.52))",
    transform: "rotate(-17deg)",
    transformOrigin: "right center",
  },

  connectionEnso: {
    position: "absolute",
    left: "50%",
    bottom: 4,
    width: 82,
    height: 82,
    transform: "translateX(-50%)",
    borderRadius: "50%",
    border:
      "8px solid #214535",
    borderRightColor:
      "rgba(33,69,53,0.32)",
    boxShadow:
      "0 13px 32px rgba(23,51,38,0.12)",
    display: "grid",
    placeItems: "center",
    background:
      "rgba(255,255,255,0.52)",
  },

  connectionEnsoInner: {
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: "0.17em",
    color: "#214535",
  },

  connectionAnswer: {
    width: "100%",
    maxWidth: 760,
    margin: "8px auto 0",
    textAlign: "center",
  },

  connectionSmall: {
    margin: 0,
    fontSize: 15,
    color: "#697970",
  },

  connectionQuestion: {
    margin: "7px 0 13px",
    fontFamily: "Georgia, serif",
    fontSize:
      "clamp(38px, 4.5vw, 58px)",
    lineHeight: 1,
    fontWeight: 400,
    color: "#173326",
  },

  connectionBody: {
    maxWidth: 720,
    margin: "0 auto",
    fontSize: 16,
    lineHeight: 1.65,
    color: "#63736a",
  },

  connectionLink: {
    appearance: "none",
    border: 0,
    borderBottom:
      "1px solid rgba(23,51,38,0.30)",
    padding: "0 0 3px",
    marginTop: 20,
    background: "transparent",
    color: "#214c39",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  },
};
