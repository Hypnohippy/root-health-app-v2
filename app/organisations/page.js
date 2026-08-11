"use client";

import RootEnso from "../../components/RootEnso";
import RootSolarSystem from "../../components/RootSolarSystem";

const evidenceSteps = [
  {
    number: "01",
    title: "Employees use Root",
    text:
      "Employees privately reflect, complete short check-ins and access practical wellbeing support.",
  },
  {
    number: "02",
    title: "Anonymous evidence develops",
    text:
      "Root builds an organisation-level picture without exposing individual conversations, reflections or health information.",
  },
  {
    number: "03",
    title: "Business context is added",
    text:
      "HR can add absence, turnover, vacancies, overtime, agency spend and important organisational events.",
  },
  {
    number: "04",
    title: "Root explains what the evidence supports",
    text:
      "Root separates measured facts, emerging patterns, uncertainty and the questions leadership should consider next.",
  },
];

const pilotStages = [
  {
    period: "Week 1",
    title: "Establish the baseline",
    text:
      "Set up the organisation, invite employees and begin building the first anonymous wellbeing picture.",
  },
  {
    period: "Weeks 2–7",
    title: "Root learns",
    text:
      "Continued check-ins, support engagement and organisation context help Root identify what is changing and what remains uncertain.",
  },
  {
    period: "Week 8",
    title: "Review the evidence",
    text:
      "Leadership receives an executive review showing what Root knows, what it suspects and what should happen next.",
  },
  {
    period: "Your decision",
    title: "Continue because the evidence earned it",
    text:
      "You decide whether Root has created enough value to remain part of your organisation.",
  },
];

const platformAreas = [
  {
    label: "For employees",
    title: "Private personal support",
    text:
      "Every employee receives their own Root experience for check-ins, reflection, coaching, practical interventions and personal wellbeing insight.",
  },
  {
    label: "For HR",
    title: "Organisation intelligence",
    text:
      "HR sees anonymous participation, wellbeing patterns, support engagement, business measures and developing evidence confidence.",
  },
  {
    label: "For leadership",
    title: "Clear executive decisions",
    text:
      "Root prepares board-ready reviews and explains what the evidence supports without inventing certainty or exposing individuals.",
  },
];

function goToPilot() {
  window.location.href = "/organisations/pilot";
}

function goToLogin() {
  window.location.href = "/login";
}

export default function OrganisationsPage() {
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
          background: #f4efe6;
        }

        @keyframes rootFloat {
          0% {
            transform: translateY(0px);
          }

          50% {
            transform: translateY(-10px);
          }

          100% {
            transform: translateY(0px);
          }
        }

        @keyframes rootFadeUp {
          from {
            opacity: 0;
            transform: translateY(18px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .root-public-nav {
          position: sticky;
          top: 0;
          z-index: 50;
        }

        .root-hero-copy {
          animation: rootFadeUp 0.8s ease both;
        }

        .root-hero-visual {
          animation:
            rootFadeUp 0.8s 0.15s ease both,
            rootFloat 7s 1s ease-in-out infinite;
        }

        .root-primary-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 20px 48px rgba(28, 43, 31, 0.2);
        }

        .root-secondary-button:hover {
          background: rgba(255,255,255,0.82);
        }

        .root-text-link:hover {
          opacity: 0.62;
        }

        .root-evidence-card:hover,
        .root-platform-card:hover,
        .root-pilot-card:hover {
          transform: translateY(-4px);
        }

        @media (max-width: 940px) {
          .root-hero-grid {
            grid-template-columns: 1fr !important;
          }

          .root-hero-copy {
            max-width: 760px !important;
          }

          .root-hero-visual {
            min-height: 480px !important;
          }

          .root-three-grid {
            grid-template-columns: 1fr !important;
          }

          .root-four-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .root-split-grid {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 680px) {
          .root-navigation {
            padding: 15px 18px !important;
          }

          .root-nav-links {
            display: none !important;
          }

          .root-hero {
            padding: 72px 20px 82px !important;
          }

          .root-section {
            padding: 78px 20px !important;
          }

          .root-four-grid {
            grid-template-columns: 1fr !important;
          }

          .root-button-row {
            flex-direction: column !important;
            align-items: stretch !important;
          }

          .root-primary-button,
          .root-secondary-button {
            width: 100% !important;
          }

          .root-hero-visual {
            min-height: 400px !important;
          }

          .root-flow-arrow {
            display: none !important;
          }

          .root-footer-inner {
            flex-direction: column !important;
            align-items: flex-start !important;
          }
        }
      `}</style>

      <header className="root-public-nav" style={styles.navShell}>
        <nav className="root-navigation" style={styles.navigation}>
          <a href="/organisations" style={styles.brandLink}>
            <RootEnso size={48} />

            <div>
              <div style={styles.brandName}>ROOT HEALTH</div>
              <div style={styles.brandDescriptor}>
                Organisational intelligence
              </div>
            </div>
          </a>

          <div className="root-nav-links" style={styles.navLinks}>
            <a href="#why-root" style={styles.navLink}>
              Why Root
            </a>

            <a href="#how-it-works" style={styles.navLink}>
              How it works
            </a>

            <a href="#pilot" style={styles.navLink}>
              60-day pilot
            </a>
          </div>

          <div style={styles.navActions}>
            <button
              type="button"
              onClick={goToLogin}
              className="root-text-link"
              style={styles.signInButton}
            >
              Sign in
            </button>

            <button
              type="button"
              onClick={goToPilot}
              className="root-primary-button"
              style={styles.navPrimaryButton}
            >
              Start pilot
            </button>
          </div>
        </nav>
      </header>

      <section className="root-hero" style={styles.hero}>
        <div
          className="root-hero-grid"
          style={styles.heroGrid}
        >
          <div className="root-hero-copy" style={styles.heroCopy}>
            <p style={styles.eyebrow}>
              WORKFORCE WELLBEING, UNDERSTOOD
            </p>

           <h1 style={styles.heroTitle}>
  What if your wellbeing data
  <br />
  could finally answer...
  <br />
  <span style={styles.heroTitleAccent}>
    what&apos;s really happening?
  </span>
</h1>

<p style={styles.heroIntroduction}>
  Root helps leaders make better wellbeing decisions using
  evidence instead of assumptions.
</p>

<p style={styles.heroSupportingText}>
  Employees receive private, practical support. Leadership
  receives anonymous organisational intelligence that becomes
  clearer over time.
  <br />
  <br />
  <strong>Evidence first. Better decisions follow.</strong>
</p>

            <div
              className="root-button-row"
              style={styles.buttonRow}
            >
              <button
                type="button"
                onClick={goToPilot}
                className="root-primary-button"
                style={styles.primaryButton}
              >
                Start your 60-day pilot
                <span style={styles.buttonArrow}>→</span>
              </button>

              <button
                type="button"
                onClick={goToLogin}
                className="root-secondary-button"
                style={styles.secondaryButton}
              >
                Existing customer sign in
              </button>
            </div>

            <p style={styles.heroTrustLine}>
              No exaggerated promises. No organisation-wide conclusions
              before the evidence supports them.
            </p>
          </div>

          <div
  className="root-hero-visual"
  style={styles.heroVisual}
>
  <RootSolarSystem />
</div>
        </div>
      </section>

       <section className="root-section" style={styles.directorSection}>
  <div style={styles.sectionInner}>
    <div style={styles.centredHeading}>
      <p style={styles.sectionEyebrow}>
        WHY DIRECTORS CHOOSE ROOT
      </p>

      <h2 style={styles.sectionTitle}>
        You probably already have enough data.
      </h2>

      <p style={styles.sectionIntroduction}>
        The challenge is knowing what you can trust, what still
        needs more evidence and what leadership should do next.
      </p>
    </div>

    <div className="root-four-grid" style={styles.directorGrid}>
      <article style={styles.directorCard}>
        <span style={styles.directorTick}>✓</span>

        <h3 style={styles.directorCardTitle}>
          Know what the evidence supports
        </h3>

        <p style={styles.directorCardText}>
          Root separates measured facts from emerging patterns
          so leadership does not over-read incomplete evidence.
        </p>
      </article>

      <article style={styles.directorCard}>
        <span style={styles.directorTick}>✓</span>

        <h3 style={styles.directorCardTitle}>
          See where confidence is still developing
        </h3>

        <p style={styles.directorCardText}>
          Participation, repeated evidence and organisational
          context are considered before stronger conclusions are made.
        </p>
      </article>

      <article style={styles.directorCard}>
        <span style={styles.directorTick}>✓</span>

        <h3 style={styles.directorCardTitle}>
          Understand what deserves attention
        </h3>

        <p style={styles.directorCardText}>
          Root identifies the areas that warrant leadership
          attention without reducing the organisation to one headline.
        </p>
      </article>

      <article style={styles.directorCard}>
        <span style={styles.directorTick}>✓</span>

        <h3 style={styles.directorCardTitle}>
          Know what should happen next
        </h3>

        <p style={styles.directorCardText}>
          Root turns evidence into clearer questions,
          proportionate next steps and stronger executive decisions.
        </p>
      </article>
    </div>
  </div>
</section>

      <section
        id="why-root"
        className="root-section"
        style={styles.problemSection}
      >
        <div style={styles.sectionInner}>
          <div
            className="root-split-grid"
            style={styles.problemGrid}
          >
            <div>
              <p style={styles.sectionEyebrow}>
                WHY ROOT EXISTS
              </p>

              <h2 style={styles.sectionTitleLarge}>
                Most organisations already collect data.
              </h2>
            </div>

            <div style={styles.problemCopy}>
              <p style={styles.largeBodyText}>
                Absence. Turnover. Engagement surveys. Overtime.
                Vacancies. Wellbeing programmes.
              </p>

              <p style={styles.largeBodyTextMuted}>
                The difficulty is not finding another number. It is
                understanding what the evidence means, what it does not
                mean and where leadership attention will create the most
                useful next step.
              </p>
            </div>
          </div>

          <div style={styles.statementCard}>
            <div style={styles.statementMark}>“</div>

            <p style={styles.statementText}>
              Root does not reduce employee wellbeing to a single
              headline. It builds a clearer organisation picture over
              time.
            </p>
          </div>
        </div>
      </section>

      <section
        id="how-it-works"
        className="root-section"
        style={styles.howSection}
      >
        <div style={styles.sectionInner}>
          <div style={styles.centredHeading}>
            <p style={styles.sectionEyebrow}>
              HOW ROOT WORKS
            </p>

            <h2 style={styles.sectionTitle}>
              Evidence first. Intelligence second.
            </h2>

            <p style={styles.sectionIntroduction}>
              Root keeps personal employee support separate from
              anonymous organisational insight, while allowing both to
              contribute safely to a more useful evidence picture.
            </p>
          </div>

          <div
            className="root-four-grid"
            style={styles.evidenceGrid}
          >
            {evidenceSteps.map((step, index) => (
              <article
                key={step.number}
                className="root-evidence-card"
                style={styles.evidenceCard}
              >
                <div style={styles.stepTopLine}>
                  <span style={styles.stepNumber}>
                    {step.number}
                  </span>

                  {index < evidenceSteps.length - 1 ? (
                    <span
                      className="root-flow-arrow"
                      style={styles.flowArrow}
                    >
                      →
                    </span>
                  ) : null}
                </div>

                <h3 style={styles.cardHeading}>
                  {step.title}
                </h3>

                <p style={styles.cardBody}>
                  {step.text}
                </p>
              </article>
            ))}
          </div>

          <div
            className="root-three-grid"
            style={styles.platformGrid}
          >
            {platformAreas.map((area) => (
              <article
                key={area.label}
                className="root-platform-card"
                style={styles.platformCard}
              >
                <p style={styles.platformLabel}>
                  {area.label}
                </p>

                <h3 style={styles.platformTitle}>
                  {area.title}
                </h3>

                <p style={styles.platformText}>
                  {area.text}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section style={styles.trustSection}>
        <div style={styles.trustInner}>
          <div style={styles.trustSymbol}>
            <RootEnso size={76} />
          </div>

          <p style={styles.trustEyebrow}>
            THE ROOT TRUST PROMISE
          </p>

          <h2 style={styles.trustTitle}>
            We do not ask you to buy Root because of what we say.
          </h2>

          <p style={styles.trustStatement}>
            We ask you to judge Root by what it discovers inside your
            own organisation.
          </p>

          <p style={styles.trustBody}>
            During the pilot, Root will measure, observe and explain
            what the available evidence supports. It will distinguish
            what is known from what is emerging and what still needs to
            be learned.
          </p>
        </div>
      </section>

      <section
        id="pilot"
        className="root-section"
        style={styles.pilotSection}
      >
        <div style={styles.sectionInner}>
          <div style={styles.centredHeading}>
            <p style={styles.sectionEyebrow}>
              THE 60-DAY ORGANISATION PILOT
            </p>

            <h2 style={styles.sectionTitle}>
              Let the evidence earn your trust.
            </h2>

            <p style={styles.sectionIntroduction}>
              Root begins with a baseline, develops its understanding
              through repeated evidence and ends the pilot with a clear
              executive review.
            </p>
          </div>

          <div
            className="root-four-grid"
            style={styles.pilotGrid}
          >
            {pilotStages.map((stage) => (
              <article
                key={stage.period}
                className="root-pilot-card"
                style={styles.pilotCard}
              >
                <p style={styles.pilotPeriod}>
                  {stage.period}
                </p>

                <h3 style={styles.pilotTitle}>
                  {stage.title}
                </h3>

                <p style={styles.pilotText}>
                  {stage.text}
                </p>
              </article>
            ))}
          </div>

          <div style={styles.pilotPromise}>
            <div>
              <p style={styles.pilotPromiseLabel}>
                AT THE END OF THE PILOT
              </p>

              <h3 style={styles.pilotPromiseTitle}>
                You will have more than a dashboard.
              </h3>
            </div>

            <p style={styles.pilotPromiseText}>
              You will have an organisational baseline, participation
              evidence, executive reporting and a clearer understanding
              of what deserves attention next.
            </p>
          </div>
        </div>
      </section>

      <section style={styles.finalSection}>
        <div style={styles.finalGlow} />

        <div style={styles.finalInner}>
          <p style={styles.finalEyebrow}>
            ROOT WORKPLACE
          </p>

          <h2 style={styles.finalTitle}>
         Every organisation has a story.
         <br />
          Most never get to read it.
         </h2>

          <p style={styles.finalText}>
        Root helps you understand yours.
         <br />
         <br />
        Begin your 60-day organisation pilot and let the evidence
        earn your trust.
        </p>

          <button
            type="button"
            onClick={goToPilot}
            className="root-primary-button"
            style={styles.finalButton}
          >
            Start your 60-day pilot
            <span style={styles.buttonArrow}>→</span>
          </button>

          <p style={styles.finalNote}>
            No pressure. No exaggerated claims. Just evidence.
          </p>
        </div>
      </section>

      <footer style={styles.footer}>
        <div
          className="root-footer-inner"
          style={styles.footerInner}
        >
          <div style={styles.footerBrand}>
            <RootEnso size={42} />

            <div>
              <strong style={styles.footerBrandName}>
                Root Health
              </strong>

              <span style={styles.footerBrandText}>
                Evidence-led organisational wellbeing
              </span>
            </div>
          </div>

          <div style={styles.footerLinks}>
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
    background: "#F4EFE6",
    color: "#172018",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Arial, sans-serif',
  },

  navShell: {
    background: "rgba(244,239,230,0.84)",
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

  brandLink: {
    display: "flex",
    alignItems: "center",
    gap: "13px",
    color: "#172018",
    textDecoration: "none",
  },

  brandName: {
    fontSize: "13px",
    fontWeight: "900",
    letterSpacing: "0.16em",
  },

  brandDescriptor: {
    marginTop: "3px",
    color: "#657064",
    fontSize: "11px",
  },

  navLinks: {
    display: "flex",
    alignItems: "center",
    gap: "30px",
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

  navPrimaryButton: {
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
    position: "relative",
    padding: "108px 28px 126px",
    background:
      "radial-gradient(circle at 78% 38%, rgba(121,151,115,0.25), transparent 31%), linear-gradient(145deg, #F5F0E7 0%, #E8EEE4 56%, #DDE8DA 100%)",
  },

  heroGrid: {
    width: "100%",
    maxWidth: "1240px",
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "1.08fr 0.92fr",
    alignItems: "center",
    gap: "76px",
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
    fontSize: "clamp(56px, 7vw, 94px)",
    fontWeight: "500",
    lineHeight: "0.97",
    letterSpacing: "-0.058em",
  },

  heroTitleAccent: {
    color: "#526D55",
  },

  heroIntroduction: {
    maxWidth: "670px",
    margin: "34px 0 0",
    color: "#263329",
    fontSize: "clamp(22px, 2.3vw, 31px)",
    lineHeight: 1.42,
    letterSpacing: "-0.018em",
  },

  heroSupportingText: {
    maxWidth: "650px",
    margin: "23px 0 0",
    color: "#566057",
    fontSize: "17px",
    lineHeight: 1.75,
  },

  buttonRow: {
    marginTop: "36px",
    display: "flex",
    alignItems: "center",
    gap: "14px",
  },

  primaryButton: {
    minHeight: "58px",
    padding: "16px 23px",
    border: "none",
    borderRadius: "999px",
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
    padding: "16px 23px",
    border: "1px solid rgba(38,59,43,0.16)",
    borderRadius: "999px",
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

  heroTrustLine: {
    margin: "22px 0 0",
    color: "#677168",
    fontSize: "13px",
    lineHeight: 1.6,
  },

  heroVisual: {
    position: "relative",
    minHeight: "600px",
    display: "grid",
    placeItems: "center",
  },

  heroGlow: {
    position: "absolute",
    width: "520px",
    height: "520px",
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.14) 58%, transparent 72%)",
    filter: "blur(4px)",
  },

  heroCircleOuter: {
    position: "relative",
    width: "430px",
    height: "430px",
    borderRadius: "50%",
    padding: "25px",
    background: "rgba(255,255,255,0.24)",
    border: "1px solid rgba(255,255,255,0.66)",
    boxShadow:
      "0 44px 120px rgba(42,63,43,0.18), inset 0 0 70px rgba(255,255,255,0.38)",
    backdropFilter: "blur(18px)",
  },

  heroCircleMiddle: {
    width: "100%",
    height: "100%",
    borderRadius: "50%",
    padding: "21px",
    border: "1px solid rgba(67,97,69,0.16)",
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
      "linear-gradient(145deg, rgba(247,244,236,0.86), rgba(225,235,222,0.68))",
    border: "1px solid rgba(255,255,255,0.72)",
  },

  visualKicker: {
    margin: "22px 0 9px",
    color: "#617061",
    fontSize: "10px",
    fontWeight: "900",
    letterSpacing: "0.16em",
  },

  visualTitle: {
    color: "#243125",
    fontFamily: "Georgia, serif",
    fontSize: "26px",
    fontWeight: "500",
    lineHeight: 1.25,
  },

  floatingCardOne: {
    position: "absolute",
    top: "70px",
    left: "-5px",
    padding: "17px 19px",
    borderRadius: "19px",
    background: "rgba(255,255,255,0.72)",
    border: "1px solid rgba(255,255,255,0.88)",
    boxShadow: "0 20px 50px rgba(41,55,40,0.12)",
    backdropFilter: "blur(15px)",
  },

  floatingCardTwo: {
    position: "absolute",
    right: "-5px",
    top: "236px",
    padding: "17px 19px",
    borderRadius: "19px",
    background: "rgba(38,59,43,0.91)",
    color: "#FFFFFF",
    border: "1px solid rgba(255,255,255,0.15)",
    boxShadow: "0 20px 50px rgba(41,55,40,0.18)",
  },

  floatingCardThree: {
    position: "absolute",
    bottom: "65px",
    left: "44px",
    padding: "17px 19px",
    borderRadius: "19px",
    background: "rgba(245,239,229,0.84)",
    border: "1px solid rgba(255,255,255,0.76)",
    boxShadow: "0 20px 50px rgba(41,55,40,0.12)",
    backdropFilter: "blur(15px)",
  },

  floatingLabel: {
    display: "block",
    marginBottom: "5px",
    fontSize: "10px",
    fontWeight: "900",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    opacity: 0.64,
  },

  floatingValue: {
    fontSize: "14px",
  },

  directorSection: {
  padding: "104px 28px",
  background: "#EEF3EA",
},

directorGrid: {
  marginTop: "58px",
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "16px",
},

directorCard: {
  minHeight: "265px",
  padding: "28px",
  borderRadius: "26px",
  background: "rgba(255,255,255,0.62)",
  border: "1px solid rgba(72,96,70,0.10)",
  boxShadow: "0 20px 48px rgba(41,55,40,0.06)",
},

directorTick: {
  display: "grid",
  placeItems: "center",
  width: "38px",
  height: "38px",
  borderRadius: "999px",
  background: "rgba(82,109,85,0.11)",
  color: "#526D55",
  fontWeight: "900",
  fontSize: "16px",
},

directorCardTitle: {
  margin: "34px 0 12px",
  color: "#223024",
  fontFamily: "Georgia, serif",
  fontSize: "24px",
  fontWeight: "500",
  lineHeight: 1.25,
},

directorCardText: {
  margin: 0,
  color: "#606860",
  fontSize: "14px",
  lineHeight: 1.75,
},

  problemSection: {
    padding: "116px 28px",
    background: "#F8F5EE",
  },

  sectionInner: {
    width: "100%",
    maxWidth: "1180px",
    margin: "0 auto",
  },

  problemGrid: {
    display: "grid",
    gridTemplateColumns: "0.92fr 1.08fr",
    gap: "80px",
    alignItems: "start",
  },

  sectionEyebrow: {
    margin: "0 0 18px",
    color: "#647260",
    fontSize: "11px",
    fontWeight: "900",
    letterSpacing: "0.17em",
  },

  sectionTitleLarge: {
    maxWidth: "520px",
    margin: 0,
    color: "#172018",
    fontFamily: "Georgia, serif",
    fontSize: "clamp(43px, 5vw, 67px)",
    fontWeight: "500",
    lineHeight: 1.05,
    letterSpacing: "-0.045em",
  },

  problemCopy: {
    paddingTop: "32px",
  },

  largeBodyText: {
    margin: 0,
    color: "#29342A",
    fontSize: "27px",
    lineHeight: 1.5,
  },

  largeBodyTextMuted: {
    margin: "24px 0 0",
    color: "#626961",
    fontSize: "18px",
    lineHeight: 1.8,
  },

  statementCard: {
    position: "relative",
    marginTop: "76px",
    padding: "43px 50px",
    borderRadius: "30px",
    background: "#263B2B",
    color: "#FFFFFF",
    overflow: "hidden",
  },

  statementMark: {
    position: "absolute",
    top: "-45px",
    right: "28px",
    color: "rgba(255,255,255,0.08)",
    fontFamily: "Georgia, serif",
    fontSize: "190px",
  },

  statementText: {
    position: "relative",
    maxWidth: "900px",
    margin: 0,
    fontFamily: "Georgia, serif",
    fontSize: "clamp(28px, 4vw, 45px)",
    fontWeight: "500",
    lineHeight: 1.32,
  },

  howSection: {
    padding: "116px 28px",
    background:
      "linear-gradient(180deg, #E9EFE5 0%, #F3F0E8 100%)",
  },

  centredHeading: {
    maxWidth: "790px",
    margin: "0 auto",
    textAlign: "center",
  },

  sectionTitle: {
    margin: 0,
    color: "#172018",
    fontFamily: "Georgia, serif",
    fontSize: "clamp(42px, 5.5vw, 70px)",
    fontWeight: "500",
    lineHeight: 1.05,
    letterSpacing: "-0.046em",
  },

  sectionIntroduction: {
    maxWidth: "720px",
    margin: "24px auto 0",
    color: "#5D665E",
    fontSize: "18px",
    lineHeight: 1.8,
  },

  evidenceGrid: {
    marginTop: "66px",
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: "16px",
  },

  evidenceCard: {
    minHeight: "290px",
    padding: "26px",
    borderRadius: "26px",
    background: "rgba(255,255,255,0.5)",
    border: "1px solid rgba(255,255,255,0.82)",
    boxShadow: "0 22px 54px rgba(41,55,40,0.07)",
    transition: "transform 180ms ease",
  },

  stepTopLine: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  stepNumber: {
    color: "#6A7767",
    fontSize: "12px",
    fontWeight: "900",
    letterSpacing: "0.13em",
  },

  flowArrow: {
    color: "#8B9588",
    fontSize: "23px",
  },

  cardHeading: {
    margin: "60px 0 13px",
    color: "#233025",
    fontFamily: "Georgia, serif",
    fontSize: "25px",
    fontWeight: "500",
    lineHeight: 1.22,
  },

  cardBody: {
    margin: 0,
    color: "#626A62",
    fontSize: "15px",
    lineHeight: 1.75,
  },

  platformGrid: {
    marginTop: "26px",
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "18px",
  },

  platformCard: {
    padding: "31px",
    borderRadius: "27px",
    background: "#F8F5EE",
    border: "1px solid rgba(41,55,40,0.08)",
    transition: "transform 180ms ease",
  },

  platformLabel: {
    margin: "0 0 19px",
    color: "#6B7967",
    fontSize: "11px",
    fontWeight: "900",
    letterSpacing: "0.13em",
    textTransform: "uppercase",
  },

  platformTitle: {
    margin: 0,
    color: "#223024",
    fontFamily: "Georgia, serif",
    fontSize: "29px",
    fontWeight: "500",
  },

  platformText: {
    margin: "16px 0 0",
    color: "#606860",
    fontSize: "15px",
    lineHeight: 1.8,
  },

  trustSection: {
    padding: "122px 28px",
    background: "#1F3023",
    color: "#FFFFFF",
  },

  trustInner: {
    maxWidth: "860px",
    margin: "0 auto",
    textAlign: "center",
  },

  trustSymbol: {
    marginBottom: "31px",
    display: "flex",
    justifyContent: "center",
  },

  trustEyebrow: {
    margin: "0 0 18px",
    color: "rgba(255,255,255,0.58)",
    fontSize: "11px",
    fontWeight: "900",
    letterSpacing: "0.17em",
  },

  trustTitle: {
    margin: 0,
    fontFamily: "Georgia, serif",
    fontSize: "clamp(40px, 5.4vw, 68px)",
    fontWeight: "500",
    lineHeight: 1.08,
    letterSpacing: "-0.042em",
  },

  trustStatement: {
    margin: "35px 0 0",
    color: "#C9D9C8",
    fontSize: "clamp(23px, 3vw, 34px)",
    lineHeight: 1.45,
  },

  trustBody: {
    maxWidth: "710px",
    margin: "28px auto 0",
    color: "rgba(255,255,255,0.68)",
    fontSize: "17px",
    lineHeight: 1.85,
  },

  pilotSection: {
    padding: "116px 28px",
    background: "#F8F5EE",
  },

  pilotGrid: {
    marginTop: "66px",
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: "16px",
  },

  pilotCard: {
    minHeight: "290px",
    padding: "29px",
    borderRadius: "27px",
    background:
      "linear-gradient(145deg, rgba(231,238,227,0.9), rgba(255,255,255,0.72))",
    border: "1px solid rgba(73,96,72,0.12)",
    boxShadow: "0 20px 48px rgba(41,55,40,0.06)",
    transition: "transform 180ms ease",
  },

  pilotPeriod: {
    margin: 0,
    color: "#60705E",
    fontSize: "11px",
    fontWeight: "900",
    letterSpacing: "0.14em",
    textTransform: "uppercase",
  },

  pilotTitle: {
    margin: "46px 0 14px",
    color: "#223024",
    fontFamily: "Georgia, serif",
    fontSize: "27px",
    fontWeight: "500",
    lineHeight: 1.2,
  },

  pilotText: {
    margin: 0,
    color: "#5D675E",
    fontSize: "15px",
    lineHeight: 1.78,
  },

  pilotPromise: {
    marginTop: "28px",
    padding: "38px 42px",
    borderRadius: "29px",
    display: "grid",
    gridTemplateColumns: "0.8fr 1.2fr",
    gap: "50px",
    alignItems: "center",
    background: "#E8EEE4",
    border: "1px solid rgba(75,96,73,0.12)",
  },

  pilotPromiseLabel: {
    margin: "0 0 11px",
    color: "#687664",
    fontSize: "10px",
    fontWeight: "900",
    letterSpacing: "0.14em",
  },

  pilotPromiseTitle: {
    margin: 0,
    color: "#223024",
    fontFamily: "Georgia, serif",
    fontSize: "31px",
    fontWeight: "500",
    lineHeight: 1.25,
  },

  pilotPromiseText: {
    margin: 0,
    color: "#566157",
    fontSize: "17px",
    lineHeight: 1.8,
  },

  finalSection: {
    position: "relative",
    padding: "132px 28px",
    background: "#DDE8D9",
    overflow: "hidden",
  },

  finalGlow: {
    position: "absolute",
    width: "680px",
    height: "680px",
    top: "-280px",
    left: "50%",
    transform: "translateX(-50%)",
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(255,255,255,0.68), rgba(255,255,255,0) 70%)",
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
    fontSize: "clamp(44px, 6vw, 74px)",
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

  footerBrand: {
    display: "flex",
    alignItems: "center",
    gap: "13px",
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
