"use client";

import RootEnso from "../../../components/RootEnso";

const existingEvidence = [
  "Sickness absence",
  "Employee turnover",
  "Agency spend",
  "Overtime",
  "Vacancies",
  "Engagement surveys",
  "Wellbeing programmes",
  "Organisational events",
];

const rootActions = [
  {
    number: "01",
    title: "Observe",
    text:
      "Root begins with the evidence available today without pretending that an early picture is a final conclusion.",
  },
  {
    number: "02",
    title: "Measure",
    text:
      "Employees establish private personal baselines while Root builds an anonymous organisation-level evidence picture.",
  },
  {
    number: "03",
    title: "Remember",
    text:
      "Root retains organisational context, review periods, initiatives and measured movement so leadership does not begin from zero each time.",
  },
  {
    number: "04",
    title: "Compare",
    text:
      "Repeated evidence allows Root to distinguish a current baseline from genuine improvement, stability or increasing difficulty.",
  },
  {
    number: "05",
    title: "Explain",
    text:
      "Root separates measured facts, interpretation, uncertainty and the questions leadership should consider next.",
  },
  {
    number: "06",
    title: "Recommend",
    text:
      "Root identifies proportionate next actions when the available evidence genuinely supports them.",
  },
];

const pilotStages = [
  {
    period: "Days 1–7",
    title: "Understanding begins",
    text:
      "Your organisation is created, employees are invited and the first anonymous wellbeing baselines begin to form.",
  },
  {
    period: "Days 8–30",
    title: "Patterns begin to emerge",
    text:
      "Repeated check-ins, support engagement and organisational context help Root identify the strongest current signals.",
  },
  {
    period: "Days 31–50",
    title: "Confidence develops",
    text:
      "Root compares repeated evidence, tests its earlier interpretation and identifies what is becoming clearer.",
  },
  {
    period: "Days 51–60",
    title: "Leadership receives the review",
    text:
      "Root prepares an executive understanding of the organisation, including what is known, what remains uncertain and what deserves attention next.",
  },
];

const executiveOutcomes = [
  {
    title: "An organisational baseline",
    text:
      "A clear starting position across the wellbeing dimensions measured during the pilot.",
  },
  {
    title: "Participation evidence",
    text:
      "A transparent view of activation, baseline completion, returning participation and support engagement.",
  },
  {
    title: "An Executive Review",
    text:
      "A board-ready report separating measured facts, interpretation, uncertainty and recommended action.",
  },
  {
    title: "Evidence confidence",
    text:
      "A clear explanation of where Root is confident, where patterns are only emerging and what would increase certainty.",
  },
  {
    title: "Leadership priorities",
    text:
      "The strongest evidence-supported areas for attention during the next organisational review period.",
  },
  {
    title: "A decision based on your evidence",
    text:
      "A genuine basis for deciding whether Root has earned an ongoing place inside your organisation.",
  },
];

const rootBoundaries = [
  "Root will never identify individual employees to managers.",
  "Root will never expose private reflections, coaching conversations or personal health information.",
  "Root will never describe an early baseline as proven improvement or deterioration.",
  "Root will never invent certainty simply to make a recommendation sound stronger.",
  "Root will never claim that one organisational measure caused another without sufficient evidence.",
  "Root will never replace human judgement, leadership responsibility or professional support.",
];

function goBack() {
  window.location.href = "/organisations";
}

function goToPricing() {
  window.location.href = "/organisations/pricing";
}

function goToLogin() {
  window.location.href = "/login";
}

export default function OrganisationPilotPage() {
  return (
    <main style={styles.page}>
      <style>{`
        * {
          box-sizing: border-box;
        }

        html {
          scroll-behavior: smooth;
        }

        body {
          margin: 0;
          background: #f5f1e9;
        }

        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(18px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes breathe {
          0% {
            transform: scale(1);
          }

          50% {
            transform: scale(1.025);
          }

          100% {
            transform: scale(1);
          }
        }

        .pilot-hero-copy {
          animation: fadeUp 0.8s ease both;
        }

        .pilot-hero-visual {
          animation:
            fadeUp 0.8s 0.12s ease both,
            breathe 7s 1s ease-in-out infinite;
        }

        .pilot-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 20px 48px rgba(28, 43, 31, 0.2);
        }

        .pilot-secondary:hover {
          background: rgba(255,255,255,0.82);
        }

        .pilot-card:hover {
          transform: translateY(-4px);
        }

        @media (max-width: 980px) {
          .pilot-hero-grid,
          .pilot-comparison-grid,
          .pilot-split-grid,
          .pilot-end-grid {
            grid-template-columns: 1fr !important;
          }

          .pilot-three-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .pilot-four-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .pilot-hero-visual {
            min-height: 500px !important;
          }
        }

        @media (max-width: 700px) {
          .pilot-nav {
            padding: 15px 18px !important;
          }

          .pilot-nav-centre {
            display: none !important;
          }

          .pilot-hero,
          .pilot-section {
            padding-left: 20px !important;
            padding-right: 20px !important;
          }

          .pilot-three-grid,
          .pilot-four-grid {
            grid-template-columns: 1fr !important;
          }

          .pilot-button-row {
            flex-direction: column !important;
            align-items: stretch !important;
          }

          .pilot-primary,
          .pilot-secondary {
            width: 100% !important;
          }

          .pilot-hero-visual {
            min-height: 410px !important;
          }

          .pilot-circle {
            width: 320px !important;
            height: 320px !important;
          }

          .pilot-floating-one {
            left: 0 !important;
            top: 20px !important;
          }

          .pilot-floating-two {
            right: 0 !important;
            bottom: 18px !important;
          }

          .pilot-footer-inner {
            flex-direction: column !important;
            align-items: flex-start !important;
          }
        }
      `}</style>

      <header style={styles.navShell}>
        <nav className="pilot-nav" style={styles.navigation}>
          <button
            type="button"
            onClick={goBack}
            style={styles.brandButton}
          >
            <RootEnso size={46} />

            <div style={styles.brandCopy}>
              <strong style={styles.brandName}>
                ROOT HEALTH
              </strong>

              <span style={styles.brandDescriptor}>
                Organisation pilot
              </span>
            </div>
          </button>

          <div
            className="pilot-nav-centre"
            style={styles.navCentre}
          >
            <a href="#why-sixty-days" style={styles.navLink}>
              Why sixty days
            </a>

            <a href="#what-you-receive" style={styles.navLink}>
              What you receive
            </a>

            <a href="#root-promise" style={styles.navLink}>
              Our promise
            </a>
          </div>

          <div style={styles.navActions}>
            <button
              type="button"
              onClick={goToLogin}
              style={styles.signInButton}
            >
              Sign in
            </button>

            <button
              type="button"
              onClick={goToPricing}
              className="pilot-primary"
              style={styles.navPrimary}
            >
              Begin pilot
            </button>
          </div>
        </nav>
      </header>

      <section className="pilot-hero" style={styles.hero}>
        <div
          className="pilot-hero-grid"
          style={styles.heroGrid}
        >
          <div
            className="pilot-hero-copy"
            style={styles.heroCopy}
          >
            <p style={styles.eyebrow}>
              THE 60-DAY ORGANISATION PILOT
            </p>

            <h1 style={styles.heroTitle}>
              Your organisation
              <br />
              already has data.
            </h1>

            <p style={styles.heroStatement}>
              The challenge is understanding what it means.
            </p>

            <p style={styles.heroText}>
              Root brings employee wellbeing evidence, business
              measures and organisational context into one
              disciplined learning process—without exposing
              individuals or inventing certainty.
            </p>

            <div
              className="pilot-button-row"
              style={styles.buttonRow}
            >
              <button
                type="button"
                onClick={goToPricing}
                className="pilot-primary"
                style={styles.primaryButton}
              >
                Begin your organisation pilot
                <span style={styles.buttonArrow}>→</span>
              </button>

              <button
                type="button"
                onClick={goBack}
                className="pilot-secondary"
                style={styles.secondaryButton}
              >
                Return to overview
              </button>
            </div>

            <p style={styles.heroNote}>
              Sixty days to establish a baseline, observe repeated
              evidence and prepare a clear executive review.
            </p>
          </div>

          <div
            className="pilot-hero-visual"
            style={styles.heroVisual}
          >
            <div style={styles.heroGlow} />

            <div
              className="pilot-circle"
              style={styles.heroCircle}
            >
              <div style={styles.heroCircleInner}>
                <RootEnso size={130} />

                <p style={styles.visualLabel}>
                  ROOT LEARNS OVER TIME
                </p>

                <strong style={styles.visualTitle}>
                  Baseline
                  <br />
                  to understanding
                </strong>
              </div>
            </div>

            <div
              className="pilot-floating-one"
              style={styles.floatingOne}
            >
              <span style={styles.floatingLabel}>
                Beginning
              </span>

              <strong style={styles.floatingValue}>
                Establish the evidence
              </strong>
            </div>

            <div
              className="pilot-floating-two"
              style={styles.floatingTwo}
            >
              <span style={styles.floatingLabel}>
                Day 60
              </span>

              <strong style={styles.floatingValue}>
                Executive understanding
              </strong>
            </div>
          </div>
        </div>
      </section>

      <section
        className="pilot-section"
        style={styles.dataSection}
      >
        <div style={styles.sectionInner}>
          <div style={styles.centredHeading}>
            <p style={styles.sectionEyebrow}>
              THE EVIDENCE ALREADY EXISTS
            </p>

            <h2 style={styles.sectionTitle}>
              The organisation is not short of numbers.
            </h2>

            <p style={styles.sectionIntroduction}>
              Most organisations already hold important workforce and
              operational measures. Root does not ask leadership to
              ignore them or replace them with another survey score.
            </p>
          </div>

          <div style={styles.evidenceCloud}>
            {existingEvidence.map((item) => (
              <span key={item} style={styles.evidencePill}>
                {item}
              </span>
            ))}
          </div>

          <div style={styles.questionCard}>
            <p style={styles.questionLabel}>
              THE QUESTION ROOT HELPS ANSWER
            </p>

            <p style={styles.questionText}>
              What does the available evidence genuinely support—and
              what would leadership be assuming if it went further?
            </p>
          </div>
        </div>
      </section>

      <section
        className="pilot-section"
        style={styles.comparisonSection}
      >
        <div style={styles.sectionInner}>
          <div
            className="pilot-comparison-grid"
            style={styles.comparisonGrid}
          >
            <article style={styles.stopCard}>
              <p style={styles.comparisonLabel}>
                WHERE MANY PLATFORMS STOP
              </p>

              <div style={styles.comparisonSteps}>
                <div style={styles.comparisonStep}>
                  Employee survey
                </div>

                <div style={styles.downArrow}>↓</div>

                <div style={styles.comparisonStep}>
                  Organisation score
                </div>

                <div style={styles.downArrow}>↓</div>

                <div style={styles.comparisonStep}>
                  Dashboard
                </div>

                <div style={styles.downArrow}>↓</div>

                <div style={styles.comparisonEnd}>
                  Reporting ends
                </div>
              </div>
            </article>

            <article style={styles.continueCard}>
              <p style={styles.comparisonLabelLight}>
                WHERE ROOT CONTINUES
              </p>

              <div style={styles.comparisonSteps}>
                <div style={styles.comparisonStepDark}>
                  Anonymous employee evidence
                </div>

                <div style={styles.downArrowLight}>↓</div>

                <div style={styles.comparisonStepDark}>
                  Organisation business measures
                </div>

                <div style={styles.downArrowLight}>↓</div>

                <div style={styles.comparisonStepDark}>
                  Events and initiatives
                </div>

                <div style={styles.downArrowLight}>↓</div>

                <div style={styles.comparisonStepDark}>
                  Root intelligence
                </div>

                <div style={styles.downArrowLight}>↓</div>

                <div style={styles.comparisonEndDark}>
                  Leadership understanding develops
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section
        className="pilot-section"
        style={styles.actionSection}
      >
        <div style={styles.sectionInner}>
          <div style={styles.centredHeading}>
            <p style={styles.sectionEyebrow}>
              DURING YOUR PILOT
            </p>

            <h2 style={styles.sectionTitle}>
              Root does more than display evidence.
            </h2>

            <p style={styles.sectionIntroduction}>
              It follows a disciplined learning process so that each
              conclusion remains proportionate to the evidence
              available at that point in time.
            </p>
          </div>

          <div
            className="pilot-three-grid"
            style={styles.actionGrid}
          >
            {rootActions.map((action) => (
              <article
                key={action.number}
                className="pilot-card"
                style={styles.actionCard}
              >
                <span style={styles.actionNumber}>
                  {action.number}
                </span>

                <h3 style={styles.actionTitle}>
                  {action.title}
                </h3>

                <p style={styles.actionText}>
                  {action.text}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="why-sixty-days"
        className="pilot-section"
        style={styles.timelineSection}
      >
        <div style={styles.sectionInner}>
          <div style={styles.centredHeading}>
            <p style={styles.sectionEyebrow}>
              WHY SIXTY DAYS?
            </p>

            <h2 style={styles.sectionTitle}>
              Understanding takes time.
            </h2>

            <p style={styles.sectionIntroduction}>
              A baseline tells Root where the organisation begins.
              Repeated participation allows Root to observe whether
              the picture changes, remains stable or becomes more
              difficult.
            </p>
          </div>

          <div
            className="pilot-four-grid"
            style={styles.timelineGrid}
          >
            {pilotStages.map((stage, index) => (
              <article
                key={stage.period}
                className="pilot-card"
                style={styles.timelineCard}
              >
                <div style={styles.timelineTop}>
                  <span style={styles.timelineNumber}>
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <span style={styles.timelinePeriod}>
                    {stage.period}
                  </span>
                </div>

                <h3 style={styles.timelineTitle}>
                  {stage.title}
                </h3>

                <p style={styles.timelineText}>
                  {stage.text}
                </p>
              </article>
            ))}
          </div>

          <div style={styles.timeStatement}>
            <strong style={styles.timeStatementTitle}>
              Root does not promise a miracle in sixty days.
            </strong>

            <p style={styles.timeStatementText}>
              It promises to build the clearest evidence-supported
              understanding available from the organisation&apos;s
              participation, context and measured activity.
            </p>
          </div>
        </div>
      </section>

      <section
        id="what-you-receive"
        className="pilot-section"
        style={styles.outcomeSection}
      >
        <div style={styles.sectionInner}>
          <div style={styles.centredHeading}>
            <p style={styles.sectionEyebrow}>
              AT THE END OF THE PILOT
            </p>

            <h2 style={styles.sectionTitle}>
              You will not receive a sales presentation.
            </h2>

            <p style={styles.sectionIntroduction}>
              You will receive an evidence picture built from activity
              inside your own organisation.
            </p>
          </div>

          <div
            className="pilot-three-grid"
            style={styles.outcomeGrid}
          >
            {executiveOutcomes.map((outcome) => (
              <article
                key={outcome.title}
                className="pilot-card"
                style={styles.outcomeCard}
              >
                <div style={styles.outcomeMark}>✓</div>

                <h3 style={styles.outcomeTitle}>
                  {outcome.title}
                </h3>

                <p style={styles.outcomeText}>
                  {outcome.text}
                </p>
              </article>
            ))}
          </div>

          <div
            className="pilot-end-grid"
            style={styles.endDecision}
          >
            <div>
              <p style={styles.endDecisionLabel}>
                THEN YOU DECIDE
              </p>

              <h3 style={styles.endDecisionTitle}>
                Root must earn the right to continue.
              </h3>
            </div>

            <p style={styles.endDecisionText}>
              Continue because the evidence, executive understanding
              and ongoing organisational learning created real value—
              not because a sales team pressured you into another
              contract.
            </p>
          </div>
        </div>
      </section>

      <section
        id="root-promise"
        className="pilot-section"
        style={styles.promiseSection}
      >
        <div style={styles.sectionInner}>
          <div
            className="pilot-split-grid"
            style={styles.promiseGrid}
          >
            <div style={styles.promiseHeading}>
              <RootEnso size={78} />

              <p style={styles.promiseEyebrow}>
                WHAT ROOT WILL NEVER DO
              </p>

              <h2 style={styles.promiseTitle}>
                Trust is protected by boundaries.
              </h2>

              <p style={styles.promiseIntroduction}>
                Root&apos;s usefulness depends on employees feeling
                safe and leadership receiving conclusions that can be
                defended.
              </p>
            </div>

            <div style={styles.boundaryList}>
              {rootBoundaries.map((boundary) => (
                <div key={boundary} style={styles.boundaryItem}>
                  <span style={styles.boundarySymbol}>
                    —
                  </span>

                  <span>{boundary}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section style={styles.philosophySection}>
        <div style={styles.philosophyInner}>
          <p style={styles.philosophyEyebrow}>
            THE ROOT PHILOSOPHY
          </p>

          <blockquote style={styles.philosophyQuote}>
            We believe organisations make better decisions when
            evidence replaces assumption.
          </blockquote>
        </div>
      </section>

      <section style={styles.finalSection}>
        <div style={styles.finalGlow} />

        <div style={styles.finalInner}>
          <p style={styles.finalEyebrow}>
            BEGIN WITH YOUR OWN EVIDENCE
          </p>

          <h2 style={styles.finalTitle}>
            Let Root earn your trust.
          </h2>

          <p style={styles.finalText}>
            Begin the 60-day organisation pilot, establish your
            evidence baseline and see what Root learns with you.
          </p>

          <button
            type="button"
            onClick={goToPricing}
            className="pilot-primary"
            style={styles.finalButton}
          >
            Begin your organisation pilot
            <span style={styles.buttonArrow}>→</span>
          </button>

          <p style={styles.finalNote}>
            No exaggerated claims. No hidden conclusion. Then you
            decide.
          </p>
        </div>
      </section>

      <footer style={styles.footer}>
        <div
          className="pilot-footer-inner"
          style={styles.footerInner}
        >
          <button
            type="button"
            onClick={goBack}
            style={styles.footerBrandButton}
          >
            <RootEnso size={42} />

            <div>
              <strong style={styles.footerBrandName}>
                Root Health
              </strong>

              <span style={styles.footerBrandText}>
                Evidence-led organisational wellbeing
              </span>
            </div>
          </button>

          <div style={styles.footerLinks}>
            <a href="/organisations" style={styles.footerLink}>
              Organisations
            </a>

            <a href="/privacy" style={styles.footerLink}>
              Privacy
            </a>

            <a href="/safety" style={styles.footerLink}>
              Safety
            </a>

            <a href="/terms" style={styles.footerLink}>
              Terms
            </a>

            <a href="/login" style={styles.footerLink}>
              Sign in
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    margin: 0,
    overflowX: "hidden",
    background: "#F5F1E9",
    color: "#172018",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Arial, sans-serif',
  },

  navShell: {
    position: "sticky",
    top: 0,
    zIndex: 50,
    background: "rgba(245,241,233,0.86)",
    borderBottom: "1px solid rgba(38,52,39,0.08)",
    backdropFilter: "blur(22px)",
  },

  navigation: {
    width: "100%",
    maxWidth: "1240px",
    minHeight: "84px",
    margin: "0 auto",
    padding: "16px 28px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "24px",
  },

  brandButton: {
    border: "none",
    background: "transparent",
    padding: 0,
    display: "flex",
    alignItems: "center",
    gap: "13px",
    color: "#172018",
    cursor: "pointer",
    textAlign: "left",
  },

  brandCopy: {
    display: "grid",
    gap: "3px",
  },

  brandName: {
    fontSize: "13px",
    fontWeight: "900",
    letterSpacing: "0.16em",
  },

  brandDescriptor: {
    color: "#657064",
    fontSize: "11px",
  },

  navCentre: {
    display: "flex",
    alignItems: "center",
    gap: "29px",
  },

  navLink: {
    color: "#354036",
    fontSize: "14px",
    fontWeight: "700",
    textDecoration: "none",
  },

  navActions: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },

  signInButton: {
    border: "none",
    background: "transparent",
    color: "#263329",
    fontWeight: "800",
    cursor: "pointer",
  },

  navPrimary: {
    border: "none",
    borderRadius: "999px",
    padding: "12px 18px",
    background: "#263B2B",
    color: "#FFFFFF",
    fontWeight: "800",
    cursor: "pointer",
    transition: "all 180ms ease",
  },

  hero: {
    padding: "108px 28px 126px",
    background:
      "radial-gradient(circle at 76% 38%, rgba(113,146,108,0.23), transparent 31%), linear-gradient(145deg, #F6F2EA 0%, #E9EFE5 57%, #DEE8DA 100%)",
  },

  heroGrid: {
    width: "100%",
    maxWidth: "1240px",
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "1.07fr 0.93fr",
    gap: "75px",
    alignItems: "center",
  },

  heroCopy: {
    maxWidth: "720px",
  },

  eyebrow: {
    margin: "0 0 22px",
    color: "#53664F",
    fontSize: "12px",
    fontWeight: "900",
    letterSpacing: "0.17em",
  },

  heroTitle: {
    margin: 0,
    color: "#172018",
    fontFamily: "Georgia, serif",
    fontSize: "clamp(56px, 6.8vw, 91px)",
    fontWeight: "500",
    lineHeight: "0.98",
    letterSpacing: "-0.057em",
  },

  heroStatement: {
    margin: "31px 0 0",
    color: "#526D55",
    fontSize: "clamp(25px, 3vw, 38px)",
    fontFamily: "Georgia, serif",
    lineHeight: 1.32,
  },

  heroText: {
    maxWidth: "660px",
    margin: "25px 0 0",
    color: "#566057",
    fontSize: "18px",
    lineHeight: 1.78,
  },

  buttonRow: {
    marginTop: "36px",
    display: "flex",
    alignItems: "center",
    gap: "14px",
  },

  primaryButton: {
    minHeight: "58px",
    border: "none",
    borderRadius: "999px",
    padding: "16px 24px",
    background: "#263B2B",
    color: "#FFFFFF",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "18px",
    fontSize: "15px",
    fontWeight: "900",
    cursor: "pointer",
    transition: "all 180ms ease",
  },

  secondaryButton: {
    minHeight: "58px",
    border: "1px solid rgba(38,59,43,0.16)",
    borderRadius: "999px",
    padding: "16px 23px",
    background: "rgba(255,255,255,0.5)",
    color: "#263B2B",
    fontSize: "15px",
    fontWeight: "800",
    cursor: "pointer",
    transition: "all 180ms ease",
  },

  buttonArrow: {
    fontSize: "21px",
    lineHeight: 1,
  },

  heroNote: {
    margin: "21px 0 0",
    color: "#677168",
    fontSize: "13px",
    lineHeight: 1.6,
  },

  heroVisual: {
    position: "relative",
    minHeight: "590px",
    display: "grid",
    placeItems: "center",
  },

  heroGlow: {
    position: "absolute",
    width: "520px",
    height: "520px",
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(255,255,255,0.94) 0%, rgba(255,255,255,0.14) 58%, transparent 72%)",
  },

  heroCircle: {
    position: "relative",
    width: "420px",
    height: "420px",
    padding: "27px",
    borderRadius: "50%",
    background: "rgba(255,255,255,0.25)",
    border: "1px solid rgba(255,255,255,0.7)",
    boxShadow:
      "0 44px 120px rgba(42,63,43,0.17), inset 0 0 70px rgba(255,255,255,0.4)",
    backdropFilter: "blur(18px)",
  },

  heroCircleInner: {
    width: "100%",
    height: "100%",
    borderRadius: "50%",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    textAlign: "center",
    background:
      "linear-gradient(145deg, rgba(248,245,238,0.9), rgba(225,235,222,0.7))",
    border: "1px solid rgba(255,255,255,0.76)",
  },

  visualLabel: {
    margin: "21px 0 9px",
    color: "#617061",
    fontSize: "10px",
    fontWeight: "900",
    letterSpacing: "0.16em",
  },

  visualTitle: {
    color: "#243125",
    fontFamily: "Georgia, serif",
    fontSize: "28px",
    fontWeight: "500",
    lineHeight: 1.25,
  },

  floatingOne: {
    position: "absolute",
    left: "2px",
    top: "68px",
    padding: "17px 19px",
    borderRadius: "19px",
    background: "rgba(255,255,255,0.75)",
    border: "1px solid rgba(255,255,255,0.9)",
    boxShadow: "0 20px 50px rgba(41,55,40,0.12)",
  },

  floatingTwo: {
    position: "absolute",
    right: "0",
    bottom: "70px",
    padding: "17px 19px",
    borderRadius: "19px",
    background: "rgba(38,59,43,0.93)",
    color: "#FFFFFF",
    border: "1px solid rgba(255,255,255,0.14)",
    boxShadow: "0 20px 50px rgba(41,55,40,0.18)",
  },

  floatingLabel: {
    display: "block",
    marginBottom: "5px",
    fontSize: "10px",
    fontWeight: "900",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    opacity: 0.63,
  },

  floatingValue: {
    fontSize: "14px",
  },

  sectionInner: {
    width: "100%",
    maxWidth: "1180px",
    margin: "0 auto",
  },

  centredHeading: {
    maxWidth: "800px",
    margin: "0 auto",
    textAlign: "center",
  },

  sectionEyebrow: {
    margin: "0 0 18px",
    color: "#647260",
    fontSize: "11px",
    fontWeight: "900",
    letterSpacing: "0.17em",
  },

  sectionTitle: {
    margin: 0,
    color: "#172018",
    fontFamily: "Georgia, serif",
    fontSize: "clamp(42px, 5.4vw, 69px)",
    fontWeight: "500",
    lineHeight: 1.06,
    letterSpacing: "-0.046em",
  },

  sectionIntroduction: {
    maxWidth: "735px",
    margin: "24px auto 0",
    color: "#5D665E",
    fontSize: "18px",
    lineHeight: 1.8,
  },

  dataSection: {
    padding: "112px 28px",
    background: "#F8F5EE",
  },

  evidenceCloud: {
    maxWidth: "920px",
    margin: "55px auto 0",
    display: "flex",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: "12px",
  },

  evidencePill: {
    padding: "14px 19px",
    borderRadius: "999px",
    background: "#E7EEE3",
    border: "1px solid rgba(73,96,72,0.12)",
    color: "#324032",
    fontSize: "14px",
    fontWeight: "800",
  },

  questionCard: {
    maxWidth: "960px",
    margin: "58px auto 0",
    padding: "42px 48px",
    borderRadius: "31px",
    background: "#263B2B",
    color: "#FFFFFF",
    textAlign: "center",
  },

  questionLabel: {
    margin: "0 0 15px",
    color: "rgba(255,255,255,0.55)",
    fontSize: "10px",
    fontWeight: "900",
    letterSpacing: "0.16em",
  },

  questionText: {
    margin: 0,
    fontFamily: "Georgia, serif",
    fontSize: "clamp(28px, 4vw, 45px)",
    fontWeight: "500",
    lineHeight: 1.32,
  },

  comparisonSection: {
    padding: "112px 28px",
    background:
      "linear-gradient(180deg, #E9EFE5 0%, #F4F0E8 100%)",
  },

  comparisonGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "22px",
  },

  stopCard: {
    padding: "42px",
    borderRadius: "31px",
    background: "rgba(255,255,255,0.58)",
    border: "1px solid rgba(255,255,255,0.88)",
  },

  continueCard: {
    padding: "42px",
    borderRadius: "31px",
    background: "#263B2B",
    color: "#FFFFFF",
    boxShadow: "0 30px 80px rgba(38,59,43,0.16)",
  },

  comparisonLabel: {
    margin: "0 0 35px",
    color: "#687568",
    fontSize: "11px",
    fontWeight: "900",
    letterSpacing: "0.15em",
  },

  comparisonLabelLight: {
    margin: "0 0 35px",
    color: "rgba(255,255,255,0.58)",
    fontSize: "11px",
    fontWeight: "900",
    letterSpacing: "0.15em",
  },

  comparisonSteps: {
    display: "grid",
    gap: "11px",
  },

  comparisonStep: {
    padding: "17px 20px",
    borderRadius: "18px",
    background: "#F3F0E8",
    border: "1px solid rgba(42,55,42,0.07)",
    color: "#344035",
    fontWeight: "800",
    textAlign: "center",
  },

  comparisonStepDark: {
    padding: "17px 20px",
    borderRadius: "18px",
    background: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "#FFFFFF",
    fontWeight: "800",
    textAlign: "center",
  },

  downArrow: {
    color: "#8B9588",
    fontSize: "22px",
    textAlign: "center",
  },

  downArrowLight: {
    color: "rgba(255,255,255,0.44)",
    fontSize: "22px",
    textAlign: "center",
  },

  comparisonEnd: {
    padding: "18px 20px",
    borderRadius: "18px",
    background: "#DEDCD5",
    color: "#696B66",
    fontWeight: "900",
    textAlign: "center",
  },

  comparisonEndDark: {
    padding: "18px 20px",
    borderRadius: "18px",
    background: "#C8D9C8",
    color: "#263B2B",
    fontWeight: "900",
    textAlign: "center",
  },

  actionSection: {
    padding: "112px 28px",
    background: "#F8F5EE",
  },

  actionGrid: {
    marginTop: "64px",
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "17px",
  },

  actionCard: {
    minHeight: "280px",
    padding: "29px",
    borderRadius: "27px",
    background:
      "linear-gradient(145deg, rgba(231,238,227,0.92), rgba(255,255,255,0.76))",
    border: "1px solid rgba(73,96,72,0.12)",
    boxShadow: "0 20px 48px rgba(41,55,40,0.06)",
    transition: "transform 180ms ease",
  },

  actionNumber: {
    color: "#6A7767",
    fontSize: "11px",
    fontWeight: "900",
    letterSpacing: "0.15em",
  },

  actionTitle: {
    margin: "48px 0 14px",
    color: "#223024",
    fontFamily: "Georgia, serif",
    fontSize: "30px",
    fontWeight: "500",
  },

  actionText: {
    margin: 0,
    color: "#5D675E",
    fontSize: "15px",
    lineHeight: 1.78,
  },

  timelineSection: {
    padding: "112px 28px",
    background:
      "linear-gradient(180deg, #E6EDE2 0%, #F7F4ED 100%)",
  },

  timelineGrid: {
    marginTop: "64px",
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: "16px",
  },

  timelineCard: {
    minHeight: "315px",
    padding: "28px",
    borderRadius: "27px",
    background: "rgba(255,255,255,0.59)",
    border: "1px solid rgba(255,255,255,0.86)",
    boxShadow: "0 20px 48px rgba(41,55,40,0.06)",
    transition: "transform 180ms ease",
  },

  timelineTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: "14px",
  },

  timelineNumber: {
    color: "#859083",
    fontSize: "12px",
    fontWeight: "900",
  },

  timelinePeriod: {
    color: "#657263",
    fontSize: "11px",
    fontWeight: "900",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },

  timelineTitle: {
    margin: "62px 0 14px",
    color: "#223024",
    fontFamily: "Georgia, serif",
    fontSize: "27px",
    fontWeight: "500",
    lineHeight: 1.2,
  },

  timelineText: {
    margin: 0,
    color: "#5D675E",
    fontSize: "15px",
    lineHeight: 1.78,
  },

  timeStatement: {
    maxWidth: "930px",
    margin: "35px auto 0",
    padding: "35px 39px",
    borderRadius: "27px",
    background: "#263B2B",
    color: "#FFFFFF",
    textAlign: "center",
  },

  timeStatementTitle: {
    display: "block",
    fontFamily: "Georgia, serif",
    fontSize: "28px",
    fontWeight: "500",
  },

  timeStatementText: {
    maxWidth: "730px",
    margin: "16px auto 0",
    color: "rgba(255,255,255,0.72)",
    fontSize: "16px",
    lineHeight: 1.8,
  },

  outcomeSection: {
    padding: "112px 28px",
    background: "#F8F5EE",
  },

  outcomeGrid: {
    marginTop: "64px",
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "17px",
  },

  outcomeCard: {
    minHeight: "275px",
    padding: "29px",
    borderRadius: "27px",
    background: "#FFFFFF",
    border: "1px solid rgba(42,55,42,0.08)",
    boxShadow: "0 19px 48px rgba(41,55,40,0.06)",
    transition: "transform 180ms ease",
  },

  outcomeMark: {
    width: "39px",
    height: "39px",
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    background: "#DDE9D9",
    color: "#345038",
    fontWeight: "900",
  },

  outcomeTitle: {
    margin: "34px 0 13px",
    color: "#223024",
    fontFamily: "Georgia, serif",
    fontSize: "26px",
    fontWeight: "500",
    lineHeight: 1.2,
  },

  outcomeText: {
    margin: 0,
    color: "#5D675E",
    fontSize: "15px",
    lineHeight: 1.78,
  },

  endDecision: {
    marginTop: "30px",
    padding: "42px 45px",
    borderRadius: "29px",
    display: "grid",
    gridTemplateColumns: "0.82fr 1.18fr",
    gap: "50px",
    alignItems: "center",
    background: "#E7EEE3",
    border: "1px solid rgba(73,96,72,0.12)",
  },

  endDecisionLabel: {
    margin: "0 0 11px",
    color: "#647261",
    fontSize: "10px",
    fontWeight: "900",
    letterSpacing: "0.15em",
  },

  endDecisionTitle: {
    margin: 0,
    color: "#223024",
    fontFamily: "Georgia, serif",
    fontSize: "32px",
    fontWeight: "500",
    lineHeight: 1.25,
  },

  endDecisionText: {
    margin: 0,
    color: "#566157",
    fontSize: "17px",
    lineHeight: 1.8,
  },

  promiseSection: {
    padding: "112px 28px",
    background: "#1F3023",
    color: "#FFFFFF",
  },

  promiseGrid: {
    display: "grid",
    gridTemplateColumns: "0.88fr 1.12fr",
    gap: "85px",
    alignItems: "start",
  },

  promiseHeading: {
    maxWidth: "500px",
  },

  promiseEyebrow: {
    margin: "28px 0 17px",
    color: "rgba(255,255,255,0.56)",
    fontSize: "11px",
    fontWeight: "900",
    letterSpacing: "0.17em",
  },

  promiseTitle: {
    margin: 0,
    fontFamily: "Georgia, serif",
    fontSize: "clamp(43px, 5vw, 67px)",
    fontWeight: "500",
    lineHeight: 1.07,
    letterSpacing: "-0.043em",
  },

  promiseIntroduction: {
    margin: "25px 0 0",
    color: "rgba(255,255,255,0.67)",
    fontSize: "17px",
    lineHeight: 1.8,
  },

  boundaryList: {
    display: "grid",
    gap: "13px",
  },

  boundaryItem: {
    padding: "20px 22px",
    borderRadius: "20px",
    display: "grid",
    gridTemplateColumns: "24px 1fr",
    gap: "10px",
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "rgba(255,255,255,0.86)",
    fontSize: "15px",
    lineHeight: 1.65,
  },

  boundarySymbol: {
    color: "#B9CEB8",
    fontWeight: "900",
  },

  philosophySection: {
    padding: "120px 28px",
    background: "#E2EBDD",
  },

  philosophyInner: {
    maxWidth: "980px",
    margin: "0 auto",
    textAlign: "center",
  },

  philosophyEyebrow: {
    margin: "0 0 23px",
    color: "#5D705A",
    fontSize: "11px",
    fontWeight: "900",
    letterSpacing: "0.17em",
  },

  philosophyQuote: {
    margin: 0,
    color: "#172018",
    fontFamily: "Georgia, serif",
    fontSize: "clamp(39px, 5.6vw, 70px)",
    fontWeight: "500",
    lineHeight: 1.15,
    letterSpacing: "-0.042em",
  },

  finalSection: {
    position: "relative",
    padding: "128px 28px",
    background: "#F8F5EE",
    overflow: "hidden",
  },

  finalGlow: {
    position: "absolute",
    width: "680px",
    height: "680px",
    top: "-300px",
    left: "50%",
    transform: "translateX(-50%)",
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(213,228,209,0.9), rgba(255,255,255,0) 70%)",
  },

  finalInner: {
    position: "relative",
    maxWidth: "830px",
    margin: "0 auto",
    textAlign: "center",
  },

  finalEyebrow: {
    margin: "0 0 17px",
    color: "#5C6E59",
    fontSize: "11px",
    fontWeight: "900",
    letterSpacing: "0.17em",
  },

  finalTitle: {
    margin: 0,
    color: "#172018",
    fontFamily: "Georgia, serif",
    fontSize: "clamp(45px, 6vw, 75px)",
    fontWeight: "500",
    lineHeight: 1.06,
    letterSpacing: "-0.048em",
  },

  finalText: {
    maxWidth: "650px",
    margin: "27px auto 0",
    color: "#536054",
    fontSize: "19px",
    lineHeight: 1.75,
  },

  finalButton: {
    minHeight: "62px",
    marginTop: "35px",
    padding: "17px 28px",
    border: "none",
    borderRadius: "999px",
    background: "#263B2B",
    color: "#FFFFFF",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "19px",
    fontSize: "16px",
    fontWeight: "900",
    cursor: "pointer",
    transition: "all 180ms ease",
  },

  finalNote: {
    margin: "19px 0 0",
    color: "#667164",
    fontSize: "13px",
  },

  footer: {
    padding: "38px 28px",
    background: "#17231A",
    color: "#FFFFFF",
  },

  footerInner: {
    width: "100%",
    maxWidth: "1180px",
    margin: "0 auto",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "28px",
  },

  footerBrandButton: {
    border: "none",
    background: "transparent",
    padding: 0,
    display: "flex",
    alignItems: "center",
    gap: "13px",
    color: "#FFFFFF",
    cursor: "pointer",
    textAlign: "left",
  },

  footerBrandName: {
    display: "block",
    fontSize: "15px",
  },

  footerBrandText: {
    display: "block",
    marginTop: "4px",
    color: "rgba(255,255,255,0.5)",
    fontSize: "11px",
  },

  footerLinks: {
    display: "flex",
    flexWrap: "wrap",
    gap: "22px",
  },

  footerLink: {
    color: "rgba(255,255,255,0.68)",
    fontSize: "13px",
    fontWeight: "700",
    textDecoration: "none",
  },
};
