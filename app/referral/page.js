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
              <span
                style={{
                  ...styles.signalLabel,
                  ...styles.signalStress,
                }}
              >
                Stress
              </span>

              <span
                style={{
                  ...styles.signalLabel,
                  ...styles.signalAbsence,
                }}
              >
                Absence
              </span>

              <span
                style={{
                  ...styles.signalLabel,
                  ...styles.signalRecovery,
                }}
              >
                Recovery
              </span>

              <span
                style={{
                  ...styles.signalLabel,
                  ...styles.signalEngagement,
                }}
              >
                Engagement
              </span>

              <span
                style={{
                  ...styles.signalLabel,
                  ...styles.signalPerformance,
                }}
              >
                Performance
              </span>

              <span
                style={{
                  ...styles.signalLabel,
                  ...styles.signalRetention,
                }}
              >
                Retention
              </span>

              <span
                style={{
                  ...styles.signalLabel,
                  ...styles.signalChange,
                }}
              >
                Change
              </span>

              <div style={styles.orbitOuter}>
                <div style={styles.orbitMiddle}>
                  <div style={styles.glassGlobe}>
                    <div style={styles.globeGlow} />

                    <div style={styles.network}>
                      <span style={styles.node1} />
                      <span style={styles.node2} />
                      <span style={styles.node3} />
                      <span style={styles.node4} />
                      <span style={styles.node5} />
                      <span style={styles.node6} />
                      <span style={styles.node7} />
                      <span style={styles.node8} />
                      <span style={styles.node9} />
                      <span style={styles.node10} />

                      <span style={styles.line1} />
                      <span style={styles.line2} />
                      <span style={styles.line3} />
                      <span style={styles.line4} />
                      <span style={styles.line5} />
                      <span style={styles.line6} />

                      <div style={styles.globeEnso}>
                        ROOT
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={styles.globeReflection} />
            </div>
          </div>
        </section>

        {/* ==================================================
            PLACEHOLDERS FOR NEXT GREENS
            These deliberately create the navigation anchors.
        ================================================== */}

        <section
          id="how-root-works"
          style={styles.nextSection}
        >
          <p style={styles.sectionEyebrow}>
            NEXT — GREEN 4B
          </p>

          <h2 style={styles.nextTitle}>
            Most organisations don&apos;t
            have a data problem.
          </h2>

          <p style={styles.nextAccent}>
            They have a connection
            problem.
          </p>
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
      "minmax(420px, 0.9fr) minmax(520px, 1.1fr)",
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
    minHeight: 660,
    position: "relative",
    display: "grid",
    placeItems: "center",
  },

  orbitOuter: {
    width: "min(610px, 45vw)",
    aspectRatio: "1",
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    background:
      "radial-gradient(circle, rgba(221,194,144,0.14) 0%, rgba(9,46,33,0.03) 55%, rgba(0,0,0,0) 72%)",
  },

  orbitMiddle: {
    width: "88%",
    aspectRatio: "1",
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    border:
      "1px solid rgba(226,201,156,0.08)",
    boxShadow:
      "0 0 90px rgba(212,185,133,0.07)",
  },

  glassGlobe: {
    width: "82%",
    aspectRatio: "1",
    borderRadius: "50%",
    position: "relative",
    overflow: "hidden",
    background:
      "radial-gradient(circle at 31% 24%, rgba(255,255,255,0.48) 0%, rgba(255,255,255,0.10) 8%, rgba(103,161,129,0.10) 30%, rgba(5,36,25,0.10) 65%, rgba(4,22,16,0.36) 100%)",
    border:
      "2px solid rgba(255,255,255,0.24)",
    boxShadow:
      "inset -34px -38px 60px rgba(0,0,0,0.30), inset 20px 18px 40px rgba(255,255,255,0.11), 0 35px 90px rgba(0,0,0,0.36), 0 0 80px rgba(213,184,127,0.12)",
    backdropFilter: "blur(2px)",
  },

  globeGlow: {
    position: "absolute",
    width: "44%",
    height: "44%",
    left: "28%",
    top: "28%",
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(235,204,147,0.32) 0%, rgba(226,194,137,0.08) 34%, rgba(0,0,0,0) 70%)",
    filter: "blur(5px)",
  },

  network: {
    position: "absolute",
    inset: "11%",
    borderRadius: "50%",
    border:
      "1px solid rgba(232,205,155,0.11)",
  },

  globeEnso: {
    position: "absolute",
    width: "40%",
    aspectRatio: "1",
    left: "30%",
    top: "30%",
    borderRadius: "50%",
    border:
      "1px solid rgba(233,207,159,0.36)",
    display: "grid",
    placeItems: "center",
    color:
      "rgba(244,226,193,0.72)",
    fontFamily: "Georgia, serif",
    fontSize: 17,
    letterSpacing: "0.26em",
    boxShadow:
      "0 0 42px rgba(231,199,143,0.14)",
  },

  signalLabel: {
    position: "absolute",
    zIndex: 4,
    color:
      "rgba(255,255,255,0.80)",
    fontSize: 12,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },

  signalStress: {
    top: "17%",
    left: "2%",
  },

  signalAbsence: {
    top: "35%",
    left: "0%",
  },

  signalRecovery: {
    bottom: "27%",
    left: "2%",
  },

  signalEngagement: {
    top: "20%",
    right: "0%",
  },

  signalPerformance: {
    top: "39%",
    right: "-2%",
  },

  signalRetention: {
    bottom: "31%",
    right: "0%",
  },

  signalChange: {
    bottom: "13%",
    right: "10%",
  },

  globeReflection: {
    position: "absolute",
    bottom: "9%",
    width: "55%",
    height: 18,
    borderRadius: "50%",
    background:
      "radial-gradient(ellipse, rgba(227,199,146,0.17) 0%, rgba(0,0,0,0) 70%)",
    filter: "blur(8px)",
  },

  node1: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#f0c975",
    left: "18%",
    top: "22%",
    boxShadow:
      "0 0 13px #f0c975",
  },

  node2: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "#ffffff",
    right: "21%",
    top: "26%",
    boxShadow:
      "0 0 11px #ffffff",
  },

  node3: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#e8bd6a",
    left: "31%",
    bottom: "21%",
    boxShadow:
      "0 0 14px #e8bd6a",
  },

  node4: {
    position: "absolute",
    width: 5,
    height: 5,
    borderRadius: "50%",
    background: "#ffffff",
    right: "28%",
    bottom: "24%",
    boxShadow:
      "0 0 10px #ffffff",
  },

  node5: {
    position: "absolute",
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: "#f0c975",
    left: "48%",
    top: "14%",
    boxShadow:
      "0 0 14px #f0c975",
  },

  node6: {
    position: "absolute",
    width: 5,
    height: 5,
    borderRadius: "50%",
    background: "#ffffff",
    left: "23%",
    top: "54%",
    boxShadow:
      "0 0 10px #ffffff",
  },

  node7: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "#e8bd6a",
    right: "17%",
    top: "52%",
    boxShadow:
      "0 0 12px #e8bd6a",
  },

  node8: {
    position: "absolute",
    width: 5,
    height: 5,
    borderRadius: "50%",
    background: "#ffffff",
    left: "45%",
    bottom: "11%",
    boxShadow:
      "0 0 9px #ffffff",
  },

  node9: {
    position: "absolute",
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: "#f0c975",
    left: "10%",
    bottom: "32%",
    boxShadow:
      "0 0 13px #f0c975",
  },

  node10: {
    position: "absolute",
    width: 5,
    height: 5,
    borderRadius: "50%",
    background: "#ffffff",
    right: "12%",
    bottom: "39%",
    boxShadow:
      "0 0 9px #ffffff",
  },

  line1: {
    position: "absolute",
    left: "21%",
    top: "24%",
    width: "47%",
    height: 1,
    background:
      "linear-gradient(90deg, rgba(235,199,131,0.10), rgba(235,199,131,0.55), rgba(235,199,131,0.10))",
    transform: "rotate(8deg)",
    transformOrigin: "left center",
  },

  line2: {
    position: "absolute",
    left: "31%",
    top: "31%",
    width: "42%",
    height: 1,
    background:
      "rgba(240,214,167,0.38)",
    transform: "rotate(56deg)",
    transformOrigin: "left center",
  },

  line3: {
    position: "absolute",
    left: "19%",
    top: "54%",
    width: "55%",
    height: 1,
    background:
      "rgba(240,214,167,0.30)",
    transform: "rotate(-17deg)",
    transformOrigin: "left center",
  },

  line4: {
    position: "absolute",
    left: "45%",
    top: "16%",
    width: "42%",
    height: 1,
    background:
      "rgba(240,214,167,0.34)",
    transform: "rotate(83deg)",
    transformOrigin: "left center",
  },

  line5: {
    position: "absolute",
    left: "27%",
    bottom: "23%",
    width: "46%",
    height: 1,
    background:
      "rgba(240,214,167,0.28)",
    transform: "rotate(-28deg)",
    transformOrigin: "left center",
  },

  line6: {
    position: "absolute",
    right: "12%",
    bottom: "39%",
    width: "51%",
    height: 1,
    background:
      "rgba(240,214,167,0.32)",
    transform: "rotate(153deg)",
    transformOrigin: "right center",
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
};
