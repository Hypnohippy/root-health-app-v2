"use client";

import RootEnso from "../../../components/RootEnso";

const membershipBenefits = [
  {
    number: "01",
    title: "Root Intelligence",
    text:
      "Continuous organisational learning that brings anonymous wellbeing evidence, business measures, organisational events and repeated reviews into one clearer picture.",
  },
  {
    number: "02",
    title: "Employee Wellbeing Platform",
    text:
      "Every employee receives the complete personal Root experience, including assessments, check-ins, Mind, Journal, practical interventions and Voice Coach.",
  },
  {
    number: "03",
    title: "Organisation Insights",
    text:
      "HR receives anonymous participation, evidence depth, workforce direction, business context and confidence signals without seeing individual employee data.",
  },
  {
    number: "04",
    title: "Ask Root",
    text:
      "Leadership can question Root's findings, test assumptions, prepare for board conversations and explore what the available evidence genuinely supports.",
  },
  {
    number: "05",
    title: "Executive Reviews",
    text:
      "Board-ready organisational reporting that separates measured facts, interpretation, uncertainty, recommendations and appropriate next actions.",
  },
  {
    number: "06",
    title: "Evidence-Led Recommendations",
    text:
      "Root identifies proportionate organisational responses and development opportunities that reflect the strongest current workforce evidence.",
  },
  {
    number: "07",
    title: "Launch Materials",
    text:
      "Employee communications, manager briefings, leadership talking points and launch materials help HR move from recommendation to practical action.",
  },
  {
    number: "08",
    title: "Outcome Measurement",
    text:
      "Root measures what happened before and after interventions so recommendations become more useful and organisational learning becomes stronger over time.",
  },
];

const pricingBands = [
  {
    workforce: "Up to 50 employees",
    price: "£695",
    description:
      "For smaller organisations that want the complete Root Workplace platform without compromising access or capability.",
  },
  {
    workforce: "51–150 employees",
    price: "£1,295",
    description:
      "For growing organisations that need continuous employee support, organisational learning and executive reporting.",
  },
  {
    workforce: "151–500 employees",
    price: "£2,495",
    description:
      "For organisations requiring wider workforce coverage, stronger participation evidence and ongoing leadership intelligence.",
  },
  {
    workforce: "501–1,000 employees",
    price: "£4,495",
    description:
      "For larger organisations using Root across a substantial workforce, multiple teams or a wider organisational programme.",
  },
  {
    workforce: "More than 1,000 employees",
    price: "Bespoke",
    description:
      "For enterprise, multi-site or more complex organisational requirements. Membership begins from £6,000 per month.",
  },
];

const membershipSteps = [
  {
    number: "01",
    title: "Tell us about your organisation",
    text:
      "Complete the direct membership application so Root can confirm the organisation, workforce size and authorised administrator.",
  },
  {
    number: "02",
    title: "Confirm membership",
    text:
      "For standard workforce bands, Root connects the approved application to secure subscription billing. Enterprise arrangements are handled directly.",
  },
  {
    number: "03",
    title: "Set up Root",
    text:
      "The authorised administrator receives a secure invitation to create the organisation and complete its first Organisation Learning Review.",
  },
  {
    number: "04",
    title: "Invite employees",
    text:
      "Employees join privately, complete orientation and establish their personal wellbeing baseline.",
  },
  {
    number: "05",
    title: "Evidence develops",
    text:
      "Root tracks workforce reach, baseline depth, repeated check-ins and anonymous support activity alongside organisational context.",
  },
  {
    number: "06",
    title: "Root keeps learning",
    text:
      "Organisation Insights, Ask Root and executive reviews become more useful as participation, continuity and business evidence develop over time.",
  },
];

const optionalSupport = [
  {
    title: "Wellbeing Workshops",
    text:
      "Practical sessions designed around the strongest evidence-supported workforce theme.",
  },
  {
    title: "Manager Development",
    text:
      "Training and awareness programmes that help managers recognise pressure, respond appropriately and support sustainable performance.",
  },
  {
    title: "Leadership Programmes",
    text:
      "Focused development for leadership teams exploring organisational conditions, workforce evidence and proportionate action.",
  },
  {
    title: "Specialist Briefings",
    text:
      "Evidence-led sessions for boards, executives and senior people leaders who need a clear understanding of the organisation picture.",
  },
  {
    title: "Bespoke Consultancy",
    text:
      "Additional support for organisational design, wellbeing strategy, implementation and evidence-informed programme development.",
  },
  {
    title: "Research and Evaluation",
    text:
      "Bespoke measurement, outcome review and research support where an organisation requires a more formal evidence programme.",
  },
];

const leadershipQuestions = [
  "What is happening?",
  "Why might it be happening?",
  "What should we do next?",
  "Did it help?",
];

const membershipPrinciples = [
  "The same complete Root Workplace platform is included at every workforce level.",
  "Pricing is based on the workforce covered by Root, not the number of people who happen to sign in during a particular month.",
  "Standard memberships are billed monthly at the workforce level selected for the organisation.",
  "There are no Bronze, Silver or Gold feature tiers.",
  "Human-delivered workshops, consultancy and development programmes remain optional.",
  "Root will not recommend additional support simply to create a sale.",
];

const participationCommitments = [
  "Nominate an internal Root lead.",
  "Invite the workforce covered by the membership.",
  "Communicate Root's purpose and privacy promise clearly.",
  "Encourage baseline and follow-up participation.",
  "Complete Organisation Learning Reviews as business context changes.",
  "Use the evidence to support proportionate leadership decisions.",
];

function goHome() {
  window.location.href = "/organisations";
}

function goToLogin() {
  window.location.href = "/login";
}

function goToPricing() {
  document.getElementById("membership")?.scrollIntoView({
    behavior: "smooth",
  });
}

function beginApplication() {
  const sourceParams =
    new URLSearchParams(window.location.search);

  const destinationParams =
    new URLSearchParams();

  destinationParams.set("path", "paid");

  const referralCode =
    String(
      sourceParams.get("ref") || ""
    ).trim();

  const campaignCode =
    String(
      sourceParams.get("campaign") || ""
    ).trim();

  if (referralCode) {
    destinationParams.set(
      "ref",
      referralCode
    );
  }

  if (campaignCode) {
    destinationParams.set(
      "campaign",
      campaignCode
    );
  }

  window.location.href =
    `/organisation/register?${destinationParams.toString()}`;
}

export default function OrganisationMembershipPage() {
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

        @keyframes membershipFadeUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes membershipBreathe {
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

        .membership-hero-copy {
          animation: membershipFadeUp 0.8s ease both;
        }

        .membership-hero-visual {
          animation:
            membershipFadeUp 0.8s 0.14s ease both,
            membershipBreathe 7s 1s ease-in-out infinite;
        }

        .membership-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 20px 52px rgba(28, 43, 31, 0.2);
        }

        .membership-secondary:hover {
          background: rgba(255,255,255,0.84);
        }

        .membership-card:hover {
          transform: translateY(-4px);
        }

        @media (max-width: 980px) {
          .membership-hero-grid,
          .membership-split-grid,
          .membership-founder-grid {
            grid-template-columns: 1fr !important;
          }

          .membership-four-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .membership-three-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .membership-price-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .membership-hero-visual {
            min-height: 500px !important;
          }
        }

        @media (max-width: 700px) {
          .membership-nav {
            padding: 15px 18px !important;
          }

          .membership-nav-centre {
            display: none !important;
          }

          .membership-hero,
          .membership-section {
            padding-left: 20px !important;
            padding-right: 20px !important;
          }

          .membership-four-grid,
          .membership-three-grid,
          .membership-price-grid {
            grid-template-columns: 1fr !important;
          }

          .membership-button-row {
            flex-direction: column !important;
            align-items: stretch !important;
          }

          .membership-primary,
          .membership-secondary {
            width: 100% !important;
          }

          .membership-hero-visual {
            min-height: 410px !important;
          }

          .membership-circle {
            width: 320px !important;
            height: 320px !important;
          }

          .membership-floating-one {
            left: 0 !important;
            top: 14px !important;
          }

          .membership-floating-two {
            right: 0 !important;
            bottom: 12px !important;
          }

          .membership-footer-inner {
            flex-direction: column !important;
            align-items: flex-start !important;
          }

          .membership-principle-row {
            grid-template-columns: 26px 1fr !important;
          }
        }
      `}</style>

      <header style={styles.navShell}>
        <nav
          className="membership-nav"
          style={styles.navigation}
        >
          <button
            type="button"
            onClick={goHome}
            style={styles.brandButton}
          >
            <RootEnso size={46} />

            <div style={styles.brandCopy}>
              <strong style={styles.brandName}>
                ROOT HEALTH
              </strong>

              <span style={styles.brandDescriptor}>
                Workplace membership
              </span>
            </div>
          </button>

          <div
            className="membership-nav-centre"
            style={styles.navCentre}
          >
            <a href="#included" style={styles.navLink}>
              Everything included
            </a>

            <a href="#membership" style={styles.navLink}>
              Membership
            </a>

            <a href="#start" style={styles.navLink}>
              How it starts
            </a>

            <a href="#founder" style={styles.navLink}>
              Founder&apos;s note
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
              onClick={beginApplication}
              className="membership-primary"
              style={styles.navPrimary}
            >
              Begin membership
            </button>
          </div>
        </nav>
      </header>

      <section
        className="membership-hero"
        style={styles.hero}
      >
        <div
          className="membership-hero-grid"
          style={styles.heroGrid}
        >
          <div
            className="membership-hero-copy"
            style={styles.heroCopy}
          >
            <p style={styles.eyebrow}>
              ROOT WORKPLACE MEMBERSHIP
            </p>

            <h1 style={styles.heroTitle}>
              One platform.
              <br />
              One philosophy.
              <br />
              <span style={styles.heroAccent}>
                One membership.
              </span>
            </h1>

            <p style={styles.heroStatement}>
              Give your people private support while giving
              leadership a clearer view of what the organisation
              may need.
            </p>

            <p style={styles.heroText}>
              Root combines employee wellbeing support,
              organisational intelligence, executive reporting,
              Ask Root, recommendations, launch materials and
              outcome measurement in one connected system.
              Pricing changes with workforce size — not with the
              capabilities you receive.
            </p>

            <div
              className="membership-button-row"
              style={styles.buttonRow}
            >
              <button
                type="button"
                onClick={beginApplication}
                className="membership-primary"
                style={styles.primaryButton}
              >
                Begin Root Workplace membership
                <span style={styles.buttonArrow}>
                  →
                </span>
              </button>

              <button
                type="button"
                onClick={goToPricing}
                className="membership-secondary"
                style={styles.secondaryButton}
              >
                View membership pricing
              </button>
            </div>

            <p style={styles.heroNote}>
              Direct Root Workplace membership. Standard
              workforce bands are billed monthly. Enterprise
              arrangements are agreed directly with Root.
            </p>
          </div>

          <div
            className="membership-hero-visual"
            style={styles.heroVisual}
          >
            <div style={styles.heroGlow} />

            <div
              className="membership-circle"
              style={styles.heroCircle}
            >
              <div style={styles.heroCircleInner}>
                <RootEnso size={132} />

                <p style={styles.visualLabel}>
                  THE COMPLETE ROOT ENSO
                </p>

                <strong style={styles.visualTitle}>
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

            <div
              className="membership-floating-one"
              style={styles.floatingOne}
            >
              <span style={styles.floatingLabel}>
                One membership
              </span>

              <strong style={styles.floatingValue}>
                Everything included
              </strong>
            </div>

            <div
              className="membership-floating-two"
              style={styles.floatingTwo}
            >
              <span style={styles.floatingLabel}>
                Pricing principle
              </span>

              <strong style={styles.floatingValue}>
                Scale, not features
              </strong>
            </div>
          </div>
        </div>
      </section>

      <section
        id="included"
        className="membership-section"
        style={styles.includedSection}
      >
        <div style={styles.sectionInner}>
          <div style={styles.centredHeading}>
            <p style={styles.sectionEyebrow}>
              EVERYTHING INCLUDED
            </p>

            <h2 style={styles.sectionTitle}>
              Root does not hide its intelligence behind packages.
            </h2>

            <p style={styles.sectionIntroduction}>
              There is no Bronze, Silver or Gold version of Root.
              Every organisation receives the same connected
              system for employee support, organisational
              understanding, evidence-led action and continuous
              learning.
            </p>
          </div>

          <div
            className="membership-four-grid"
            style={styles.benefitGrid}
          >
            {membershipBenefits.map((benefit) => (
              <article
                key={benefit.number}
                className="membership-card"
                style={styles.benefitCard}
              >
                <span style={styles.benefitNumber}>
                  {benefit.number}
                </span>

                <h3 style={styles.benefitTitle}>
                  {benefit.title}
                </h3>

                <p style={styles.benefitText}>
                  {benefit.text}
                </p>
              </article>
            ))}
          </div>

          <div style={styles.completePlatformCard}>
            <div>
              <p style={styles.completePlatformLabel}>
                ONE COMPLETE PLATFORM
              </p>

              <h3 style={styles.completePlatformTitle}>
                No essential capability is held back.
              </h3>
            </div>

            <p style={styles.completePlatformText}>
              Root&apos;s value comes from the way its personal,
              organisational and intervention evidence works
              together. Splitting that intelligence into
              disconnected packages would weaken the system
              organisations are joining.
            </p>
          </div>
        </div>
      </section>

      <section
        id="membership"
        className="membership-section"
        style={styles.pricingSection}
      >
        <div style={styles.sectionInner}>
          <div style={styles.centredHeading}>
            <p style={styles.sectionEyebrow}>
              MEMBERSHIP PRICING
            </p>

            <h2 style={styles.sectionTitle}>
              Simple pricing for continuous organisational intelligence.
            </h2>

            <p style={styles.sectionIntroduction}>
              Pricing reflects the size of the workforce Root
              supports, while every membership includes the
              complete Root Workplace platform.
            </p>
          </div>

          <div
            className="membership-price-grid"
            style={styles.pricingGrid}
          >
            {pricingBands.map((band, index) => (
              <article
                key={band.workforce}
                className="membership-card"
                style={{
                  ...styles.priceCard,
                  ...(index === 2
                    ? styles.priceCardFeatured
                    : {}),
                }}
              >
                {index === 2 ? (
                  <div style={styles.featuredTag}>
                    Growing organisations
                  </div>
                ) : null}

                <p style={styles.workforceLabel}>
                  {band.workforce}
                </p>

                <div style={styles.priceRow}>
                  <strong style={styles.price}>
                    {band.price}
                  </strong>

                  {band.price !== "Bespoke" ? (
                    <span style={styles.pricePeriod}>
                      per month
                    </span>
                  ) : null}
                </div>

                <p style={styles.priceDescription}>
                  {band.description}
                </p>

                <div style={styles.priceDivider} />

                <p style={styles.priceIncluded}>
                  Complete Root Workplace membership
                </p>
              </article>
            ))}
          </div>

          <div style={styles.vatNote}>
            <strong>
              All prices are shown excluding VAT.
            </strong>

            <span>
              Standard Root Workplace membership is normally
              agreed on a 12-month basis and billed monthly.
              Organisations with more than 1,000 employees are
              arranged directly with Root.
            </span>
          </div>

          <div style={styles.principlesPanel}>
            <div style={styles.principlesHeading}>
              <p style={styles.principlesLabel}>
                CLEAR COMMERCIAL PRINCIPLES
              </p>

              <h3 style={styles.principlesTitle}>
                Straightforward by design.
              </h3>
            </div>

            <div style={styles.principleList}>
              {membershipPrinciples.map((principle) => (
                <div
                  key={principle}
                  className="membership-principle-row"
                  style={styles.principleRow}
                >
                  <span style={styles.principleCheck}>
                    ✓
                  </span>

                  <span>{principle}</span>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              marginTop: "38px",
              textAlign: "center",
            }}
          >
            <button
              type="button"
              onClick={beginApplication}
              className="membership-primary"
              style={styles.primaryButton}
            >
              Begin membership application
              <span style={styles.buttonArrow}>
                →
              </span>
            </button>
          </div>
        </div>
      </section>

      <section
        id="start"
        className="membership-section"
        style={styles.pilotSection}
      >
        <div style={styles.sectionInner}>
          <div style={styles.centredHeading}>
            <p style={styles.sectionEyebrow}>
              HOW MEMBERSHIP STARTS
            </p>

            <h2 style={styles.sectionTitle}>
              From application to organisation learning.
            </h2>

            <p style={styles.sectionIntroduction}>
              Root keeps the commercial setup separate from
              employee privacy. The organisation establishes the
              membership; employees then join Root privately and
              build the anonymous evidence base over time.
            </p>
          </div>

          <div
            className="membership-three-grid"
            style={styles.pilotGrid}
          >
            {membershipSteps.map((step) => (
              <article
                key={step.number}
                className="membership-card"
                style={styles.pilotCard}
              >
                <span style={styles.pilotNumber}>
                  {step.number}
                </span>

                <h3 style={styles.pilotTitle}>
                  {step.title}
                </h3>

                <p style={styles.pilotText}>
                  {step.text}
                </p>
              </article>
            ))}
          </div>

          <div style={styles.earnTrustCard}>
            <div style={styles.earnTrustSymbol}>
              <RootEnso size={70} />
            </div>

            <div>
              <p style={styles.earnTrustLabel}>
                EVIDENCE BEFORE ASSUMPTION
              </p>

              <h3 style={styles.earnTrustTitle}>
                Root becomes more useful as participation grows.
              </h3>

              <p style={styles.earnTrustText}>
                Workforce reach, baseline depth and repeated
                participation determine how much anonymous
                organisation-level evidence Root can responsibly
                release. Root shows leadership what the evidence
                supports — and what remains uncertain.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        className="membership-section"
        style={styles.qualificationSection}
      >
        <div style={styles.sectionInner}>
          <div
            className="membership-split-grid"
            style={styles.qualificationGrid}
          >
            <div>
              <p style={styles.sectionEyebrow}>
                PARTICIPATION MATTERS
              </p>

              <h2 style={styles.qualificationTitle}>
                Buying Root creates access. Participation creates learning.
              </h2>

              <p style={styles.qualificationText}>
                Root can only build a useful organisational
                picture when employees understand the privacy
                promise, join voluntarily and continue
                contributing over time. HR therefore has an
                important role in helping the workforce understand
                why participation matters.
              </p>
            </div>

            <div style={styles.commitmentCard}>
              <p style={styles.commitmentLabel}>
                ROOT WORKPLACE ORGANISATIONS SUPPORT
              </p>

              {participationCommitments.map((item) => (
                <div
                  key={item}
                  style={styles.commitmentItem}
                >
                  <span style={styles.commitmentMark}>
                    —
                  </span>

                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        className="membership-section"
        style={styles.optionalSection}
      >
        <div style={styles.sectionInner}>
          <div style={styles.centredHeading}>
            <p style={styles.sectionEyebrow}>
              EXTEND YOUR IMPACT
            </p>

            <h2 style={styles.sectionTitle}>
              Human-delivered support remains optional.
            </h2>

            <p style={styles.sectionIntroduction}>
              Root may identify a development opportunity,
              recommend an appropriate response and prepare the
              enquiry. The organisation decides whether to proceed.
            </p>
          </div>

          <div
            className="membership-three-grid"
            style={styles.optionalGrid}
          >
            {optionalSupport.map((support) => (
              <article
                key={support.title}
                className="membership-card"
                style={styles.optionalCard}
              >
                <h3 style={styles.optionalTitle}>
                  {support.title}
                </h3>

                <p style={styles.optionalText}>
                  {support.text}
                </p>
              </article>
            ))}
          </div>

          <div style={styles.optionalPromise}>
            <strong>
              Root does not use organisational concern as a sales
              opportunity.
            </strong>

            <p>
              Additional support is suggested only when the
              evidence makes it relevant. Workshops, leadership
              programmes, manager development and consultancy are
              priced separately and commissioned only with the
              organisation&apos;s approval.
            </p>
          </div>
        </div>
      </section>

      <section style={styles.questionsSection}>
        <div style={styles.questionsInner}>
          <p style={styles.questionsEyebrow}>
            THE COMPLETE ROOT ENSO
          </p>

          <h2 style={styles.questionsTitle}>
            Leadership eventually asks four questions.
          </h2>

          <div
            className="membership-four-grid"
            style={styles.questionsGrid}
          >
            {leadershipQuestions.map((question, index) => (
              <div
                key={question}
                style={styles.questionCard}
              >
                <span style={styles.questionNumber}>
                  {String(index + 1).padStart(2, "0")}
                </span>

                <strong style={styles.questionText}>
                  {question}
                </strong>
              </div>
            ))}
          </div>

          <p style={styles.questionsStatement}>
            Root helps organisations answer those questions with
            evidence rather than assumption.
          </p>
        </div>
      </section>

      <section
        id="founder"
        className="membership-section"
        style={styles.founderSection}
      >
        <div style={styles.sectionInner}>
          <div
            className="membership-founder-grid"
            style={styles.founderGrid}
          >
            <div style={styles.founderIdentity}>
              <RootEnso size={92} />

              <p style={styles.founderKicker}>
                A NOTE FROM THE FOUNDER
              </p>

              <h2 style={styles.founderHeading}>
                Root was not created because the world needed
                another wellbeing platform.
              </h2>
            </div>

            <div style={styles.founderLetter}>
              <p>
                It was created because organisations were
                collecting more workforce data than ever before,
                yet still struggled to understand where to invest,
                what to change and how to know whether an action
                had genuinely helped.
              </p>

              <p>
                Root brings employee support, organisational
                context, executive reasoning, practical
                recommendations and outcome measurement into one
                continuous learning system.
              </p>

              <p>
                It protects the individual while helping
                leadership understand the wider organisation. It
                explains what the evidence supports, acknowledges
                what remains uncertain and shortens the journey
                from a wellbeing concern to an appropriate
                organisational response.
              </p>

              <p>
                Membership should earn its place by becoming more
                useful as your organisation learns. Root is
                designed to support that learning continuously,
                not simply produce another dashboard.
              </p>

              <div style={styles.founderSignature}>
                <strong>David Prince</strong>

                <span>
                  Founder, Root Health
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section style={styles.finalSection}>
        <div style={styles.finalGlow} />

        <div style={styles.finalInner}>
          <p style={styles.finalEyebrow}>
            READY TO BEGIN
          </p>

          <h2 style={styles.finalTitle}>
            Start building a clearer organisation picture.
          </h2>

          <p style={styles.finalText}>
            Begin your Root Workplace membership application.
            Root will confirm the organisation, workforce level
            and authorised administrator before secure membership
            setup continues.
          </p>

          <button
            type="button"
            onClick={beginApplication}
            className="membership-primary"
            style={styles.finalButton}
          >
            Begin Root Workplace membership
            <span style={styles.buttonArrow}>
              →
            </span>
          </button>

          <p style={styles.finalNote}>
            Complete platform. Monthly membership. Evidence-led
            organisational learning.
          </p>
        </div>
      </section>

      <footer style={styles.footer}>
        <div
          className="membership-footer-inner"
          style={styles.footerInner}
        >
          <button
            type="button"
            onClick={goHome}
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
            <a
              href="/organisations"
              style={styles.footerLink}
            >
              Organisations
            </a>

            <a
              href="#membership"
              style={styles.footerLink}
            >
              Membership pricing
            </a>

            <a
              href="/privacy"
              style={styles.footerLink}
            >
              Privacy
            </a>

            <a
              href="/safety"
              style={styles.footerLink}
            >
              Safety
            </a>

            <a
              href="/terms"
              style={styles.footerLink}
            >
              Terms
            </a>

            <a
              href="/login"
              style={styles.footerLink}
            >
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
    gap: "26px",
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
      "radial-gradient(circle at 77% 37%, rgba(113,146,108,0.23), transparent 31%), linear-gradient(145deg, #F6F2EA 0%, #E9EFE5 57%, #DEE8DA 100%)",
  },

  heroGrid: {
    width: "100%",
    maxWidth: "1240px",
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "1.08fr 0.92fr",
    gap: "74px",
    alignItems: "center",
  },

  heroCopy: {
    maxWidth: "730px",
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
    fontSize: "clamp(55px, 6.8vw, 91px)",
    fontWeight: "500",
    lineHeight: "0.98",
    letterSpacing: "-0.057em",
  },

  heroAccent: {
    color: "#526D55",
  },

  heroStatement: {
    margin: "31px 0 0",
    color: "#29372B",
    fontSize: "clamp(24px, 2.7vw, 35px)",
    fontFamily: "Georgia, serif",
    lineHeight: 1.35,
  },

  heroText: {
    maxWidth: "670px",
    margin: "24px 0 0",
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
    maxWidth: "650px",
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
    margin: "19px 0 8px",
    color: "#617061",
    fontSize: "10px",
    fontWeight: "900",
    letterSpacing: "0.16em",
  },

  visualTitle: {
    color: "#243125",
    fontFamily: "Georgia, serif",
    fontSize: "27px",
    fontWeight: "500",
    lineHeight: 1.23,
  },

  floatingOne: {
    position: "absolute",
    left: "0",
    top: "69px",
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
    maxWidth: "820px",
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
    maxWidth: "750px",
    margin: "24px auto 0",
    color: "#5D665E",
    fontSize: "18px",
    lineHeight: 1.8,
  },

  includedSection: {
    padding: "112px 28px",
    background: "#F8F5EE",
  },

  benefitGrid: {
    marginTop: "64px",
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: "16px",
  },

  benefitCard: {
    minHeight: "310px",
    padding: "28px",
    borderRadius: "27px",
    background:
      "linear-gradient(145deg, rgba(231,238,227,0.92), rgba(255,255,255,0.76))",
    border: "1px solid rgba(73,96,72,0.12)",
    boxShadow: "0 20px 48px rgba(41,55,40,0.06)",
    transition: "transform 180ms ease",
  },

  benefitNumber: {
    color: "#6A7767",
    fontSize: "11px",
    fontWeight: "900",
    letterSpacing: "0.15em",
  },

  benefitTitle: {
    margin: "53px 0 14px",
    color: "#223024",
    fontFamily: "Georgia, serif",
    fontSize: "28px",
    fontWeight: "500",
    lineHeight: 1.2,
  },

  benefitText: {
    margin: 0,
    color: "#5D675E",
    fontSize: "15px",
    lineHeight: 1.78,
  },

  completePlatformCard: {
    marginTop: "29px",
    padding: "40px 44px",
    borderRadius: "29px",
    display: "grid",
    gridTemplateColumns: "0.82fr 1.18fr",
    gap: "50px",
    alignItems: "center",
    background: "#263B2B",
    color: "#FFFFFF",
  },

  completePlatformLabel: {
    margin: "0 0 11px",
    color: "rgba(255,255,255,0.55)",
    fontSize: "10px",
    fontWeight: "900",
    letterSpacing: "0.15em",
  },

  completePlatformTitle: {
    margin: 0,
    fontFamily: "Georgia, serif",
    fontSize: "32px",
    fontWeight: "500",
    lineHeight: 1.25,
  },

  completePlatformText: {
    margin: 0,
    color: "rgba(255,255,255,0.72)",
    fontSize: "17px",
    lineHeight: 1.8,
  },

  pricingSection: {
    padding: "112px 28px",
    background:
      "linear-gradient(180deg, #E6EDE2 0%, #F6F2EA 100%)",
  },

  pricingGrid: {
    marginTop: "64px",
    display: "grid",
    gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
    gap: "15px",
    alignItems: "stretch",
  },

  priceCard: {
    position: "relative",
    minHeight: "370px",
    padding: "28px",
    borderRadius: "27px",
    background: "rgba(255,255,255,0.62)",
    border: "1px solid rgba(255,255,255,0.9)",
    boxShadow: "0 20px 48px rgba(41,55,40,0.06)",
    transition: "transform 180ms ease",
  },

  priceCardFeatured: {
    background: "#263B2B",
    color: "#FFFFFF",
    transform: "translateY(-10px)",
    boxShadow: "0 32px 80px rgba(38,59,43,0.18)",
  },

  featuredTag: {
    position: "absolute",
    top: "-14px",
    left: "24px",
    padding: "8px 13px",
    borderRadius: "999px",
    background: "#C7D9C4",
    color: "#263B2B",
    fontSize: "10px",
    fontWeight: "900",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },

  workforceLabel: {
    minHeight: "38px",
    margin: 0,
    color: "inherit",
    fontSize: "12px",
    fontWeight: "900",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    opacity: 0.7,
  },

  priceRow: {
    marginTop: "29px",
    display: "grid",
    gap: "7px",
  },

  price: {
    fontFamily: "Georgia, serif",
    fontSize: "39px",
    fontWeight: "500",
    lineHeight: 1,
  },

  pricePeriod: {
    fontSize: "12px",
    fontWeight: "700",
    opacity: 0.62,
  },

  priceDescription: {
    minHeight: "116px",
    margin: "28px 0 0",
    color: "inherit",
    fontSize: "14px",
    lineHeight: 1.7,
    opacity: 0.72,
  },

  priceDivider: {
    margin: "24px 0 20px",
    height: "1px",
    background: "currentColor",
    opacity: 0.12,
  },

  priceIncluded: {
    margin: 0,
    color: "inherit",
    fontSize: "12px",
    fontWeight: "900",
    lineHeight: 1.5,
    opacity: 0.78,
  },

  vatNote: {
    maxWidth: "890px",
    margin: "35px auto 0",
    display: "grid",
    gap: "7px",
    textAlign: "center",
    color: "#5D675E",
    fontSize: "14px",
    lineHeight: 1.7,
  },

  principlesPanel: {
    marginTop: "57px",
    padding: "42px",
    borderRadius: "30px",
    display: "grid",
    gridTemplateColumns: "0.7fr 1.3fr",
    gap: "60px",
    background: "#F8F5EE",
    border: "1px solid rgba(73,96,72,0.1)",
  },

  principlesHeading: {
    paddingTop: "6px",
  },

  principlesLabel: {
    margin: "0 0 13px",
    color: "#647261",
    fontSize: "10px",
    fontWeight: "900",
    letterSpacing: "0.15em",
  },

  principlesTitle: {
    margin: 0,
    color: "#223024",
    fontFamily: "Georgia, serif",
    fontSize: "34px",
    fontWeight: "500",
    lineHeight: 1.25,
  },

  principleList: {
    display: "grid",
    gap: "11px",
  },

  principleRow: {
    padding: "17px 19px",
    borderRadius: "18px",
    display: "grid",
    gridTemplateColumns: "29px 1fr",
    gap: "9px",
    background: "#FFFFFF",
    border: "1px solid rgba(42,55,42,0.07)",
    color: "#4F5A50",
    fontSize: "14px",
    lineHeight: 1.65,
  },

  principleCheck: {
    color: "#416347",
    fontWeight: "900",
  },

  pilotSection: {
    padding: "112px 28px",
    background: "#F8F5EE",
  },

  pilotGrid: {
    marginTop: "64px",
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "17px",
  },

  pilotCard: {
    minHeight: "278px",
    padding: "29px",
    borderRadius: "27px",
    background:
      "linear-gradient(145deg, rgba(231,238,227,0.92), rgba(255,255,255,0.78))",
    border: "1px solid rgba(73,96,72,0.12)",
    boxShadow: "0 20px 48px rgba(41,55,40,0.06)",
    transition: "transform 180ms ease",
  },

  pilotNumber: {
    color: "#6A7767",
    fontSize: "11px",
    fontWeight: "900",
    letterSpacing: "0.15em",
  },

  pilotTitle: {
    margin: "46px 0 14px",
    color: "#223024",
    fontFamily: "Georgia, serif",
    fontSize: "29px",
    fontWeight: "500",
    lineHeight: 1.2,
  },

  pilotText: {
    margin: 0,
    color: "#5D675E",
    fontSize: "15px",
    lineHeight: 1.78,
  },

  earnTrustCard: {
    marginTop: "31px",
    padding: "38px 43px",
    borderRadius: "29px",
    display: "grid",
    gridTemplateColumns: "100px 1fr",
    gap: "25px",
    alignItems: "center",
    background: "#263B2B",
    color: "#FFFFFF",
  },

  earnTrustSymbol: {
    display: "grid",
    placeItems: "center",
  },

  earnTrustLabel: {
    margin: "0 0 10px",
    color: "rgba(255,255,255,0.55)",
    fontSize: "10px",
    fontWeight: "900",
    letterSpacing: "0.15em",
  },

  earnTrustTitle: {
    margin: 0,
    fontFamily: "Georgia, serif",
    fontSize: "31px",
    fontWeight: "500",
    lineHeight: 1.25,
  },

  earnTrustText: {
    margin: "14px 0 0",
    color: "rgba(255,255,255,0.72)",
    fontSize: "16px",
    lineHeight: 1.8,
  },

  qualificationSection: {
    padding: "108px 28px",
    background:
      "linear-gradient(180deg, #E7EEE3 0%, #F7F4ED 100%)",
  },

  qualificationGrid: {
    display: "grid",
    gridTemplateColumns: "0.87fr 1.13fr",
    gap: "78px",
    alignItems: "start",
  },

  qualificationTitle: {
    maxWidth: "520px",
    margin: 0,
    color: "#172018",
    fontFamily: "Georgia, serif",
    fontSize: "clamp(42px, 5vw, 66px)",
    fontWeight: "500",
    lineHeight: 1.06,
    letterSpacing: "-0.045em",
  },

  qualificationText: {
    maxWidth: "560px",
    margin: "25px 0 0",
    color: "#5D665E",
    fontSize: "18px",
    lineHeight: 1.8,
  },

  commitmentCard: {
    padding: "36px",
    borderRadius: "29px",
    background: "rgba(255,255,255,0.7)",
    border: "1px solid rgba(255,255,255,0.9)",
    boxShadow: "0 25px 65px rgba(41,55,40,0.08)",
  },

  commitmentLabel: {
    margin: "0 0 23px",
    color: "#647261",
    fontSize: "10px",
    fontWeight: "900",
    letterSpacing: "0.15em",
  },

  commitmentItem: {
    padding: "16px 0",
    display: "grid",
    gridTemplateColumns: "24px 1fr",
    gap: "9px",
    borderTop: "1px solid rgba(42,55,42,0.08)",
    color: "#4E594F",
    fontSize: "15px",
    lineHeight: 1.65,
  },

  commitmentMark: {
    color: "#4D6B50",
    fontWeight: "900",
  },

  optionalSection: {
    padding: "112px 28px",
    background: "#F8F5EE",
  },

  optionalGrid: {
    marginTop: "64px",
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "17px",
  },

  optionalCard: {
    minHeight: "235px",
    padding: "29px",
    borderRadius: "27px",
    background: "#FFFFFF",
    border: "1px solid rgba(42,55,42,0.08)",
    boxShadow: "0 19px 48px rgba(41,55,40,0.06)",
    transition: "transform 180ms ease",
  },

  optionalTitle: {
    margin: 0,
    color: "#223024",
    fontFamily: "Georgia, serif",
    fontSize: "27px",
    fontWeight: "500",
    lineHeight: 1.2,
  },

  optionalText: {
    margin: "18px 0 0",
    color: "#5D675E",
    fontSize: "15px",
    lineHeight: 1.78,
  },

  optionalPromise: {
    maxWidth: "940px",
    margin: "31px auto 0",
    padding: "34px 38px",
    borderRadius: "27px",
    background: "#E7EEE3",
    border: "1px solid rgba(73,96,72,0.12)",
    textAlign: "center",
    color: "#465347",
    fontSize: "16px",
    lineHeight: 1.8,
  },

  questionsSection: {
    padding: "118px 28px",
    background: "#1F3023",
    color: "#FFFFFF",
  },

  questionsInner: {
    width: "100%",
    maxWidth: "1180px",
    margin: "0 auto",
    textAlign: "center",
  },

  questionsEyebrow: {
    margin: "0 0 18px",
    color: "rgba(255,255,255,0.56)",
    fontSize: "11px",
    fontWeight: "900",
    letterSpacing: "0.17em",
  },

  questionsTitle: {
    maxWidth: "850px",
    margin: "0 auto",
    fontFamily: "Georgia, serif",
    fontSize: "clamp(43px, 5vw, 67px)",
    fontWeight: "500",
    lineHeight: 1.08,
    letterSpacing: "-0.045em",
  },

  questionsGrid: {
    marginTop: "62px",
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: "16px",
  },

  questionCard: {
    minHeight: "205px",
    padding: "27px",
    borderRadius: "25px",
    display: "grid",
    alignContent: "space-between",
    textAlign: "left",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)",
  },

  questionNumber: {
    color: "rgba(255,255,255,0.4)",
    fontSize: "11px",
    fontWeight: "900",
    letterSpacing: "0.15em",
  },

  questionText: {
    fontFamily: "Georgia, serif",
    fontSize: "25px",
    fontWeight: "500",
    lineHeight: 1.25,
  },

  questionsStatement: {
    maxWidth: "820px",
    margin: "49px auto 0",
    color: "rgba(255,255,255,0.67)",
    fontSize: "18px",
    lineHeight: 1.8,
  },

  founderSection: {
    padding: "120px 28px",
    background:
      "linear-gradient(180deg, #F6F2EA 0%, #E8EEE4 100%)",
  },

  founderGrid: {
    display: "grid",
    gridTemplateColumns: "0.85fr 1.15fr",
    gap: "83px",
    alignItems: "start",
  },

  founderIdentity: {
    position: "sticky",
    top: "128px",
  },

  founderKicker: {
    margin: "28px 0 18px",
    color: "#647261",
    fontSize: "11px",
    fontWeight: "900",
    letterSpacing: "0.16em",
  },

  founderHeading: {
    maxWidth: "520px",
    margin: 0,
    color: "#172018",
    fontFamily: "Georgia, serif",
    fontSize: "clamp(40px, 4.7vw, 61px)",
    fontWeight: "500",
    lineHeight: 1.08,
    letterSpacing: "-0.04em",
  },

  founderLetter: {
    padding: "45px",
    borderRadius: "31px",
    background: "rgba(255,255,255,0.68)",
    border: "1px solid rgba(255,255,255,0.9)",
    boxShadow: "0 28px 75px rgba(41,55,40,0.08)",
    color: "#4D584E",
    fontSize: "17px",
    lineHeight: 1.86,
  },

  founderSignature: {
    marginTop: "31px",
    paddingTop: "25px",
    borderTop: "1px solid rgba(42,55,42,0.09)",
    display: "grid",
    gap: "4px",
    color: "#253327",
  },

  finalSection: {
    position: "relative",
    overflow: "hidden",
    padding: "120px 28px",
    background: "#263B2B",
    color: "#FFFFFF",
  },

  finalGlow: {
    position: "absolute",
    width: "650px",
    height: "650px",
    right: "-180px",
    top: "-220px",
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(173,201,166,0.25), transparent 68%)",
  },

  finalInner: {
    position: "relative",
    zIndex: 2,
    width: "100%",
    maxWidth: "900px",
    margin: "0 auto",
    textAlign: "center",
  },

  finalEyebrow: {
    margin: "0 0 19px",
    color: "rgba(255,255,255,0.55)",
    fontSize: "11px",
    fontWeight: "900",
    letterSpacing: "0.17em",
  },

  finalTitle: {
    margin: 0,
    fontFamily: "Georgia, serif",
    fontSize: "clamp(48px, 6vw, 78px)",
    fontWeight: "500",
    lineHeight: 1.03,
    letterSpacing: "-0.05em",
  },

  finalText: {
    maxWidth: "760px",
    margin: "28px auto 0",
    color: "rgba(255,255,255,0.72)",
    fontSize: "18px",
    lineHeight: 1.8,
  },

  finalButton: {
    marginTop: "38px",
    minHeight: "61px",
    border: "none",
    borderRadius: "999px",
    padding: "17px 27px",
    background: "#FFFFFF",
    color: "#263B2B",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "19px",
    fontSize: "15px",
    fontWeight: "900",
    cursor: "pointer",
    transition: "all 180ms ease",
  },

  finalNote: {
    margin: "20px 0 0",
    color: "rgba(255,255,255,0.5)",
    fontSize: "13px",
  },

  footer: {
    padding: "31px 28px",
    background: "#172219",
  },

  footerInner: {
    width: "100%",
    maxWidth: "1180px",
    margin: "0 auto",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "26px",
  },

  footerBrandButton: {
    border: "none",
    background: "transparent",
    padding: 0,
    display: "flex",
    alignItems: "center",
    gap: "12px",
    color: "#FFFFFF",
    cursor: "pointer",
    textAlign: "left",
  },

  footerBrandName: {
    display: "block",
    fontSize: "13px",
    fontWeight: "900",
  },

  footerBrandText: {
    display: "block",
    marginTop: "3px",
    color: "rgba(255,255,255,0.48)",
    fontSize: "11px",
  },

  footerLinks: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "19px",
  },

  footerLink: {
    color: "rgba(255,255,255,0.65)",
    fontSize: "12px",
    fontWeight: "700",
    textDecoration: "none",
  },
};
