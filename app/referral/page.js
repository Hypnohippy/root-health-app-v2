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
                    "intelligence"
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
          style={styles.evidenceSection}
        >
          <div style={styles.evidenceIntro}>
            <p style={styles.evidenceEyebrow}>
              THE EVIDENCE ISN&apos;T
              THE END OF THE QUESTION
            </p>

            <h2 style={styles.evidenceTitle}>
              Workplace interventions
              can make a difference.
            </h2>

            <p style={styles.evidenceLead}>
              Decades of workplace
              research have already asked
              whether interventions can
              improve important employee
              and organisational outcomes.
            </p>
          </div>

          <div style={styles.evidenceStats}>
            <div style={styles.evidenceStat}>
              <strong style={styles.evidenceNumber}>
                88
              </strong>

              <span style={styles.evidenceStatLabel}>
                SYSTEMATIC REVIEWS
              </span>

              <p style={styles.evidenceStatText}>
                A 2025 review brought
                together workplace health
                evidence published across
                multiple intervention
                categories.
              </p>
            </div>

            <div style={styles.evidenceStat}>
              <strong style={styles.evidenceNumber}>
                339
              </strong>

              <span style={styles.evidenceStatLabel}>
                META-ANALYSED EFFECT
                ESTIMATES
              </span>

              <p style={styles.evidenceStatText}>
                The evidence base is large
                — but outcomes, quality and
                confidence still vary.
              </p>
            </div>

            <div style={styles.evidenceStat}>
              <strong style={styles.evidenceNumber}>
                25,500
              </strong>

              <span style={styles.evidenceStatLabel}>
                PARTICIPANTS
              </span>

              <p style={styles.evidenceStatText}>
                A separate 2025 review
                examined 81 randomised
                trials covering 98 digital
                workplace interventions.
              </p>
            </div>
          </div>

          <div style={styles.evidenceSourceNote}>
            <span style={styles.evidenceSourceDot} />

            <p style={styles.evidenceSourceText}>
              Peer-reviewed systematic
              reviews and meta-analyses of
              workplace health and digital
              mental-health interventions.
            </p>
          </div>

          <div style={styles.evidencePivot}>
            <p style={styles.evidencePivotSmall}>
              THE MORE USEFUL QUESTION
            </p>

            <h3 style={styles.evidenceQuestion}>
              But will they work
              <em style={styles.evidenceHere}>
                {" "}here?
              </em>
            </h3>

            <div style={styles.differenceGrid}>
              <span style={styles.differenceItem}>
                Different people.
              </span>

              <span style={styles.differenceItem}>
                Different pressures.
              </span>

              <span style={styles.differenceItem}>
                Different culture.
              </span>

              <span style={styles.differenceItem}>
                Different starting point.
              </span>
            </div>
          </div>

                    <div style={styles.rootResolution}>
            <p style={styles.rootResolutionEyebrow}>
              ROOT STARTS WITH YOUR ORGANISATION
            </p>

            <h3 style={styles.rootResolutionTitle}>
              So don&apos;t assume. Measure.
            </h3>

                        <div style={styles.measurementLoop}>
              <div style={styles.measurementRow}>
                <div style={styles.measurementStep}>
                  <span style={styles.measurementNumber}>
                    01
                  </span>

                  <strong style={styles.measurementTitle}>
                    BASELINE
                  </strong>

                  <span style={styles.measurementText}>
                    Establish where your
                    organisation is starting.
                  </span>
                </div>

                <span style={styles.measurementArrow}>
                  →
                </span>

                <div style={styles.measurementStep}>
                  <span style={styles.measurementNumber}>
                    02
                  </span>

                  <strong style={styles.measurementTitle}>
                    MEASURE
                  </strong>

                  <span style={styles.measurementText}>
                    Bring workforce and
                    organisational evidence
                    together.
                  </span>
                </div>

                <span style={styles.measurementArrow}>
                  →
                </span>

                <div style={styles.measurementStep}>
                  <span style={styles.measurementNumber}>
                    03
                  </span>

                  <strong style={styles.measurementTitle}>
                    UNDERSTAND
                  </strong>

                  <span style={styles.measurementText}>
                    Explore what the evidence
                    may be telling you.
                  </span>
                </div>
              </div>

              <div style={styles.measurementTurn}>
                <span style={styles.measurementTurnLine} />
                <span style={styles.measurementTurnArrow}>
                  ↓
                </span>
              </div>

              <div style={styles.measurementRow}>
                <div style={styles.measurementStep}>
                  <span style={styles.measurementNumber}>
                    06
                  </span>

                  <strong style={styles.measurementTitle}>
                    RESET
                  </strong>

                  <span style={styles.measurementText}>
                    Establish the new baseline.
                    Move forward with greater
                    understanding.
                  </span>
                </div>

                <span style={styles.measurementArrow}>
                  ←
                </span>

                <div style={styles.measurementStep}>
                  <span style={styles.measurementNumber}>
                    05
                  </span>

                  <strong style={styles.measurementTitle}>
                    LEARN
                  </strong>

                  <span style={styles.measurementText}>
                    Measure what happened
                    after the action.
                  </span>
                </div>

                <span style={styles.measurementArrow}>
                  ←
                </span>

                <div style={styles.measurementStep}>
                  <span style={styles.measurementNumber}>
                    04
                  </span>

                  <strong style={styles.measurementTitle}>
                    ACT
                  </strong>

                  <span style={styles.measurementText}>
                    Choose a proportionate
                    response based on what
                    you know.
                  </span>
                </div>
              </div>

              <div style={styles.measurementReturn}>
                <span style={styles.measurementReturnArrow}>
                  ↺
                </span>

                <span style={styles.measurementReturnText}>
                  NEW BASELINE
                </span>
              </div>
            </div>
            <div style={styles.evidenceClosing}>
              <p style={styles.evidenceClosingSmall}>
                Research can tell you what may work.
              </p>

              <h3 style={styles.evidenceClosingTitle}>
                Your organisation can tell you
                what works here.
              </h3>

              <p style={styles.evidenceClosingAccent}>
                Each cycle becomes evidence
                for the next.
                <br />
                Every new baseline starts stronger.
              </p>
              <button
                type="button"
                style={styles.evidenceButton}
                onClick={() =>
                  scrollToSection("intelligence")
                }
              >
                See how Root understands the evidence →
              </button>
            </div>
          </div>
        </section>
                <section
          id="intelligence"
          style={styles.intelligenceSection}
        >
          <div style={styles.intelligenceIntro}>
            <p style={styles.intelligenceEyebrow}>
              THE EVIDENCE BECOMES USEFUL
            </p>

            <h2 style={styles.intelligenceTitle}>
              Root doesn&apos;t just show you
              the data.
            </h2>

            <p style={styles.intelligenceAccent}>
              It helps you work with it.
            </p>

            <p style={styles.intelligenceLead}>
              Root brings organisational evidence
              and workforce experience together,
              then helps leaders understand what
              the evidence supports, what remains
              uncertain and what may deserve
              attention next.
            </p>
          </div>

          <div style={styles.intelligenceSteps}>
            <div style={styles.intelligenceStep}>
              <span style={styles.intelligenceStepNumber}>
                01
              </span>

              <strong style={styles.intelligenceStepTitle}>
                SEE
              </strong>

              <p style={styles.intelligenceStepText}>
                Bring workforce experience and
                organisational evidence into one
                picture.
              </p>
            </div>

            <div style={styles.intelligenceStep}>
              <span style={styles.intelligenceStepNumber}>
                02
              </span>

              <strong style={styles.intelligenceStepTitle}>
                UNDERSTAND
              </strong>

              <p style={styles.intelligenceStepText}>
                See what the evidence supports —
                and where it is not yet strong
                enough for a conclusion.
              </p>
            </div>

            <div style={styles.intelligenceStep}>
              <span style={styles.intelligenceStepNumber}>
                03
              </span>

              <strong style={styles.intelligenceStepTitle}>
                QUESTION
              </strong>

              <p style={styles.intelligenceStepText}>
                Explore the findings, challenge
                assumptions and ask questions
                no dashboard could anticipate.
              </p>
            </div>

            <div style={styles.intelligenceStep}>
              <span style={styles.intelligenceStepNumber}>
                04
              </span>

              <strong style={styles.intelligenceStepTitle}>
                RESPOND
              </strong>

              <p style={styles.intelligenceStepText}>
                Consider proportionate actions
                based on what the organisation
                actually knows.
              </p>
            </div>

            <div style={styles.intelligenceStep}>
              <span style={styles.intelligenceStepNumber}>
                05
              </span>

              <strong style={styles.intelligenceStepTitle}>
                LEARN
              </strong>

              <p style={styles.intelligenceStepText}>
                Measure what happens next and
                strengthen the evidence behind
                future decisions.
              </p>
            </div>
          </div>

          <div style={styles.coachReveal}>
            <div style={styles.coachRevealHeader}>
              <div>
                <p style={styles.coachEyebrow}>
                  ASK YOUR ORGANISATION
                </p>

                <h3 style={styles.coachTitle}>
                  The dashboard gives you
                  the picture.
                </h3>

                <p style={styles.coachAccent}>
                  HR Coach lets you have a
                  conversation with it.
                </p>
              </div>

              <div style={styles.coachEnso}>
                <span style={styles.coachEnsoText}>
                  ROOT
                </span>
              </div>
            </div>

            <div style={styles.coachQuickActions}>
              <span style={styles.coachQuickAction}>
                💬 Question Root&apos;s findings
              </span>

              <span style={styles.coachQuickAction}>
                📄 Prepare for a board meeting
              </span>

              <span style={styles.coachQuickAction}>
                🧭 Help me decide what to do next
              </span>
            </div>

            <div style={styles.coachConversation}>
              <div style={styles.coachUserSide}>
                <span style={styles.coachSpeaker}>
                  YOU
                </span>

                <p style={styles.coachUserQuestion}>
                  Help me prepare for a
                  board meeting.
                </p>
              </div>

              <div style={styles.coachRootSide}>
                <span style={styles.coachSpeaker}>
                  ROOT
                </span>

                <p style={styles.coachResponseIntro}>
                  For your board meeting,
                  here&apos;s a structured summary
                  based on the current evidence:
                </p>

                <div style={styles.coachFindingGrid}>
                  <div style={styles.coachFinding}>
                    <span style={styles.coachFindingLabel}>
                      EXECUTIVE HEADLINE
                    </span>

                    <p style={styles.coachFindingText}>
                      There is not yet enough
                      wellbeing evidence to form
                      an organisational conclusion.
                    </p>
                  </div>

                  <div style={styles.coachFinding}>
                    <span style={styles.coachFindingLabel}>
                      EVIDENCE POSITION
                    </span>

                    <p style={styles.coachFindingText}>
                      Organisation confidence:
                      None.
                      <br />
                      Participation confidence:
                      Very low.
                    </p>
                  </div>

                  <div style={styles.coachFinding}>
                    <span style={styles.coachFindingLabel}>
                      MATERIAL FINDING
                    </span>

                    <p style={styles.coachFindingText}>
                      No wellbeing assessments
                      are currently available.
                    </p>
                  </div>

                  <div style={styles.coachFinding}>
                    <span style={styles.coachFindingLabel}>
                      RECOMMENDED POSITION
                    </span>

                    <p style={styles.coachFindingText}>
                      Strengthen the evidence base
                      before making broad
                      organisational interventions.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div style={styles.coachPayoff}>
              <p style={styles.coachPayoffSmall}>
                Notice what Root didn&apos;t do.
              </p>

              <h3 style={styles.coachPayoffTitle}>
                It didn&apos;t invent a
                board story.
              </h3>

              <p style={styles.coachPayoffAccent}>
                It told HR what the evidence
                could support.
              </p>

              <p style={styles.coachPayoffBody}>
                When the evidence is incomplete,
                Root says so. As the organisation
                builds stronger evidence over time,
                the conversation becomes richer —
                without giving the AI permission
                to make the missing pieces up.
              </p>
            </div>
          </div>

          <div style={styles.intelligenceBridge}>
            <p style={styles.intelligenceBridgeSmall}>
              UNDERSTAND ISN&apos;T THE END
            </p>

            <h3 style={styles.intelligenceBridgeTitle}>
              What happens when the evidence
              suggests it&apos;s time to act?
            </h3>

            <p style={styles.intelligenceBridgeText}>
              That&apos;s where Root moves from
              organisational intelligence into
              targeted support.
            </p>
          </div>
        </section>
                        {/* ==================================================
            GREEN 4D — FROM EVIDENCE TO ACTION
        ================================================== */}

        <section style={styles.actionSection}>
          <div style={styles.actionIntro}>
            <p style={styles.actionEyebrow}>
              WHEN THE EVIDENCE SUPPORTS ACTION
            </p>

            <h2 style={styles.actionTitle}>
              Root doesn&apos;t stop at telling you
              what may need attention.
            </h2>

            <p style={styles.actionAccent}>
              It helps you decide what to do about it.
            </p>

            <p style={styles.actionLead}>
              Once the evidence is strong enough to
              justify a response, Root helps leaders
              move from understanding the problem to
              choosing an action that fits the
              organisation, the people and the
              evidence available.
            </p>
          </div>

          <div style={styles.actionPath}>
            <div style={styles.actionPathStep}>
              <span style={styles.actionPathNumber}>
                01
              </span>

              <strong style={styles.actionPathTitle}>
                RESPOND
              </strong>

              <p style={styles.actionPathText}>
                Decide whether the evidence supports
                action — and what scale of response
                is proportionate.
              </p>
            </div>

            <span style={styles.actionPathArrow}>
              →
            </span>

            <div style={styles.actionPathStep}>
              <span style={styles.actionPathNumber}>
                02
              </span>

              <strong style={styles.actionPathTitle}>
                TARGET
              </strong>

              <p style={styles.actionPathText}>
                Shape support around the pressures,
                people and conditions your
                organisation is actually seeing.
              </p>
            </div>

            <span style={styles.actionPathArrow}>
              →
            </span>

            <div style={styles.actionPathStep}>
              <span style={styles.actionPathNumber}>
                03
              </span>

              <strong style={styles.actionPathTitle}>
                MEASURE
              </strong>

              <p style={styles.actionPathText}>
                Follow what happens afterwards and
                learn whether the response changed
                anything that matters.
              </p>
            </div>
          </div>

          <div style={styles.interventionQuestion}>
            <p style={styles.interventionQuestionSmall}>
              A DIFFERENT WAY TO CHOOSE SUPPORT
            </p>

            <h3 style={styles.interventionQuestionTitle}>
              What if your next wellbeing programme
              wasn&apos;t chosen from a catalogue?
            </h3>

            <p style={styles.interventionQuestionAccent}>
              What if your organisation helped
              design it?
            </p>
          </div>

          <div style={styles.interventionReveal}>
            <div style={styles.interventionRevealTop}>
              <div style={styles.interventionRevealCopy}>
                <p style={styles.interventionEyebrow}>
                  ROOT RECOMMENDATION
                </p>

                <h3 style={styles.interventionTitle}>
                  Build the response around
                  the evidence.
                </h3>

                <p style={styles.interventionLead}>
                  Root can use the organisation&apos;s
                  current evidence to help leaders
                  explore the type, focus and scale of
                  intervention that may be appropriate.
                </p>
              </div>

              <div style={styles.interventionEnso}>
                <span style={styles.interventionEnsoText}>
                  ROOT
                </span>
              </div>
            </div>

            <div style={styles.interventionEvidenceGrid}>
              <div style={styles.interventionEvidenceCard}>
                <span style={styles.interventionCardLabel}>
                  EVIDENCE SUGGESTS
                </span>

                <strong style={styles.interventionCardTitle}>
                  Sustained pressure
                </strong>

                <p style={styles.interventionCardText}>
                  Workforce experience and
                  organisational measures suggest a
                  pattern worth responding to.
                </p>
              </div>

              <div style={styles.interventionEvidenceCard}>
                <span style={styles.interventionCardLabel}>
                  RESPONSE FOCUS
                </span>

                <strong style={styles.interventionCardTitle}>
                  Manager capability
                </strong>

                <p style={styles.interventionCardText}>
                  Focus support where leaders may have
                  the greatest opportunity to influence
                  the conditions being observed.
                </p>
              </div>

              <div style={styles.interventionEvidenceCard}>
                <span style={styles.interventionCardLabel}>
                  PROPORTIONATE ACTION
                </span>

                <strong style={styles.interventionCardTitle}>
                  Targeted programme
                </strong>

                <p style={styles.interventionCardText}>
                  Begin with a defined group, clear
                  objectives and measures that can be
                  followed over time.
                </p>
              </div>
            </div>

            <div style={styles.interventionProposal}>
              <div>
                <span style={styles.interventionProposalLabel}>
                  POSSIBLE INTERVENTION
                </span>

                <h4 style={styles.interventionProposalTitle}>
                  Pressure-aware manager programme
                </h4>

                <p style={styles.interventionProposalText}>
                  A focused intervention designed
                  around the pattern the organisation
                  is seeing — rather than a generic
                  programme selected in advance.
                </p>
              </div>

              <div style={styles.interventionProposalMeta}>
                <div style={styles.interventionMetaItem}>
                  <span style={styles.interventionMetaLabel}>
                    AUDIENCE
                  </span>

                  <strong style={styles.interventionMetaValue}>
                    People managers
                  </strong>
                </div>

                <div style={styles.interventionMetaItem}>
                  <span style={styles.interventionMetaLabel}>
                    APPROACH
                  </span>

                  <strong style={styles.interventionMetaValue}>
                    Targeted
                  </strong>
                </div>

                <div style={styles.interventionMetaItem}>
                  <span style={styles.interventionMetaLabel}>
                    EVIDENCE
                  </span>

                  <strong style={styles.interventionMetaValue}>
                    Measured
                  </strong>
                </div>
              </div>
            </div>
          </div>

          <div style={styles.afterAction}>
            <p style={styles.afterActionEyebrow}>
              THEN ROOT WATCHES WHAT HAPPENS
            </p>

            <h3 style={styles.afterActionTitle}>
              The intervention isn&apos;t the finish line.
            </h3>

            <p style={styles.afterActionAccent}>
              It becomes part of the evidence.
            </p>

            <div style={styles.afterActionGrid}>
              <div style={styles.afterActionCard}>
                <span style={styles.afterActionNumber}>
                  BEFORE
                </span>

                <strong style={styles.afterActionCardTitle}>
                  Establish the picture.
                </strong>

                <p style={styles.afterActionCardText}>
                  Capture the relevant workforce and
                  organisational baseline before
                  action begins.
                </p>
              </div>

              <div style={styles.afterActionConnector}>
                →
              </div>

              <div style={styles.afterActionCard}>
                <span style={styles.afterActionNumber}>
                  DURING
                </span>

                <strong style={styles.afterActionCardTitle}>
                  Follow the response.
                </strong>

                <p style={styles.afterActionCardText}>
                  Track participation, context and
                  what changes while the intervention
                  is taking place.
                </p>
              </div>

              <div style={styles.afterActionConnector}>
                →
              </div>

              <div style={styles.afterActionCard}>
                <span style={styles.afterActionNumber}>
                  AFTER
                </span>

                <strong style={styles.afterActionCardTitle}>
                  Compare what changed.
                </strong>

                <p style={styles.afterActionCardText}>
                  Return to the measures and see what
                  the evidence now supports.
                </p>
              </div>
            </div>
          </div>

          <div style={styles.actionLoopClose}>
            <div style={styles.actionLoopEnso}>
              <span style={styles.actionLoopGap} />

              <span style={styles.actionLoopEnsoText}>
                ROOT
              </span>
            </div>

            <p style={styles.actionLoopSmall}>
              BASELINE · MEASURE · UNDERSTAND · ACT · LEARN · RESET
            </p>

            <h3 style={styles.actionLoopTitle}>
              You don&apos;t return to the beginning.
            </h3>

            <p style={styles.actionLoopAccent}>
              You return with more evidence.
            </p>

            <p style={styles.actionLoopBody}>
              Every response adds to what the
              organisation knows. Every measurement
              strengthens the next decision. Every
              new baseline begins with a clearer
              understanding of what came before.
            </p>

            <strong style={styles.actionLoopFinal}>
              That&apos;s the Root loop.
            </strong>
          </div>
        </section>
                {/* ==================================================
            GREEN 4E — TRUST / PRIVACY
        ================================================== */}

        <section
          id="privacy"
          style={styles.trustSection}
        >
          <div style={styles.trustIntro}>
            <p style={styles.trustEyebrow}>
              TRUST HAS TO COME FIRST
            </p>

            <h2 style={styles.trustTitle}>
              Root can only be useful
              if people can trust it.
            </h2>

            <p style={styles.trustAccent}>
              Understand the organisation.
              Protect the individual.
            </p>

            <p style={styles.trustLead}>
              Root was designed to help leaders
              understand workforce evidence without
              turning employee experience into
              individual surveillance.
            </p>
          </div>

          <div style={styles.trustGrid}>
            <div style={styles.trustCard}>
              <span style={styles.trustCardNumber}>
                01
              </span>

              <strong style={styles.trustCardTitle}>
                PRIVATE BY DESIGN
              </strong>

              <p style={styles.trustCardText}>
                Organisational insight is built from
                appropriate workforce evidence while
                protecting the privacy of individual
                employees.
              </p>
            </div>

            <div style={styles.trustCard}>
              <span style={styles.trustCardNumber}>
                02
              </span>

              <strong style={styles.trustCardTitle}>
                EVIDENCE BEFORE ASSUMPTION
              </strong>

              <p style={styles.trustCardText}>
                Root distinguishes between what the
                organisation knows, what the evidence
                may suggest and what cannot yet be
                concluded.
              </p>
            </div>

            <div style={styles.trustCard}>
              <span style={styles.trustCardNumber}>
                03
              </span>

              <strong style={styles.trustCardTitle}>
                AI WITH BOUNDARIES
              </strong>

              <p style={styles.trustCardText}>
                AI helps leaders explore the evidence.
                It does not get permission to invent
                organisational facts that are not
                supported by the data.
              </p>
            </div>
          </div>

          <div style={styles.trustGuardrail}>
            <div style={styles.trustEnso}>
              <span style={styles.trustEnsoText}>
                ROOT
              </span>
            </div>

            <p style={styles.trustGuardrailSmall}>
              THE PRINCIPLE
            </p>

            <h3 style={styles.trustGuardrailTitle}>
              Root was built to help organisations
              understand people.
            </h3>

            <p style={styles.trustGuardrailAccent}>
              Not expose them.
            </p>

            <p style={styles.trustGuardrailBody}>
              Individual information should never
              become a shortcut to organisational
              conclusions. Root works at the level
              appropriate to the evidence and keeps
              confidence, participation and
              limitations visible.
            </p>
          </div>

          <div style={styles.trustNext}>
            <p style={styles.trustNextSmall}>
              SO HOW DIFFICULT IS IT TO BEGIN?
            </p>

            <h3 style={styles.trustNextTitle}>
              Start with what you already know.
            </h3>

            <p style={styles.trustNextText}>
              Root doesn&apos;t require a perfect
              organisation or a perfect dataset
              before you can establish the first
              baseline.
            </p>
          </div>
        </section>
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

    evidenceSection: {
    padding: "100px 5vw 110px",
    background:
      "linear-gradient(180deg, #08261c 0%, #061d16 100%)",
    color: "#ffffff",
    overflow: "hidden",
  },

  evidenceIntro: {
    width: "100%",
    maxWidth: 1320,
    margin: "0 auto 58px",
  },

  evidenceEyebrow: {
    margin: "0 0 18px",
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.17em",
    color: "#e2c58d",
  },

  evidenceTitle: {
    maxWidth: 900,
    margin: 0,
    fontFamily: "Georgia, serif",
    fontWeight: 400,
    fontSize:
      "clamp(44px, 5.6vw, 74px)",
    lineHeight: 1,
    letterSpacing: "-0.035em",
    color: "#f8f4ea",
  },

  evidenceLead: {
    maxWidth: 700,
    margin: "25px 0 0",
    fontSize: 17,
    lineHeight: 1.7,
    color:
      "rgba(255,255,255,0.68)",
  },

  evidenceStats: {
    width: "100%",
    maxWidth: 1320,
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns:
      "repeat(3, minmax(0, 1fr))",
    gap: 16,
  },

  evidenceStat: {
    minHeight: 270,
    padding: "30px 28px",
    borderRadius: 28,
    background:
      "rgba(255,255,255,0.055)",
    border:
      "1px solid rgba(231,199,143,0.16)",
    boxShadow:
      "0 26px 70px rgba(0,0,0,0.14)",
  },

  evidenceNumber: {
    display: "block",
    marginBottom: 9,
    fontFamily: "Georgia, serif",
    fontWeight: 400,
    fontSize:
      "clamp(58px, 6vw, 88px)",
    lineHeight: 0.95,
    color: "#e7c78f",
  },

  evidenceStatLabel: {
    display: "block",
    minHeight: 34,
    fontSize: 10,
    fontWeight: 800,
    lineHeight: 1.4,
    letterSpacing: "0.14em",
    color:
      "rgba(255,255,255,0.82)",
  },

  evidenceStatText: {
    maxWidth: 340,
    margin: "24px 0 0",
    fontSize: 14,
    lineHeight: 1.65,
    color:
      "rgba(255,255,255,0.58)",
  },

  evidenceSourceNote: {
    width: "100%",
    maxWidth: 1320,
    margin: "20px auto 0",
    display: "flex",
    alignItems: "center",
    gap: 10,
  },

  evidenceSourceDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "#e7c78f",
    boxShadow:
      "0 0 12px rgba(231,199,143,0.50)",
    flexShrink: 0,
  },

  evidenceSourceText: {
    margin: 0,
    fontSize: 11,
    lineHeight: 1.5,
    color:
      "rgba(255,255,255,0.42)",
  },

  evidencePivot: {
    width: "100%",
    maxWidth: 1040,
    margin: "120px auto 0",
    textAlign: "center",
  },

  evidencePivotSmall: {
    margin: "0 0 18px",
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.18em",
    color:
      "rgba(231,199,143,0.74)",
  },

  evidenceQuestion: {
    margin: 0,
    fontFamily: "Georgia, serif",
    fontWeight: 400,
    fontSize:
      "clamp(52px, 7vw, 96px)",
    lineHeight: 0.98,
    letterSpacing: "-0.045em",
    color: "#ffffff",
  },

  evidenceHere: {
    fontWeight: 400,
    color: "#e7c78f",
  },

  differenceGrid: {
    maxWidth: 830,
    margin: "42px auto 0",
    display: "grid",
    gridTemplateColumns:
      "repeat(4, minmax(0, 1fr))",
    gap: 12,
  },

  differenceItem: {
    padding: "17px 12px",
    borderTop:
      "1px solid rgba(231,199,143,0.24)",
    fontFamily: "Georgia, serif",
    fontSize: 17,
    color:
      "rgba(255,255,255,0.72)",
  },

  rootResolution: {
    width: "100%",
    maxWidth: 1320,
    margin: "120px auto 0",
    padding: "54px 54px 58px",
    borderRadius: 36,
    background:
      "linear-gradient(135deg, rgba(255,255,255,0.96) 0%, rgba(244,240,229,0.98) 100%)",
    color: "#173326",
    boxSizing: "border-box",
    boxShadow:
      "0 32px 90px rgba(0,0,0,0.18)",
  },

  rootResolutionEyebrow: {
    margin: "0 0 14px",
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: "0.17em",
    color: "#6a7b70",
  },

  rootResolutionTitle: {
    margin: 0,
    fontFamily: "Georgia, serif",
    fontWeight: 400,
    fontSize:
      "clamp(44px, 5vw, 68px)",
    lineHeight: 1,
    color: "#173326",
  },

    measurementLoop: {
    width: "100%",
    maxWidth: 1120,
    margin: "42px auto 0",
    position: "relative",
  },

  measurementRow: {
    display: "grid",
    gridTemplateColumns:
      "1fr 54px 1fr 54px 1fr",
    gap: 12,
    alignItems: "center",
  },

  measurementStep: {
    height: 190,
    padding: "25px 26px",
    borderRadius: 24,
    boxSizing: "border-box",
    background:
      "rgba(255,255,255,0.82)",
    border:
      "1px solid rgba(23,51,38,0.09)",
    boxShadow:
      "0 14px 38px rgba(23,51,38,0.055)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-start",
  },

  measurementNumber: {
    marginBottom: 24,
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: "0.08em",
    color: "#9a8d6f",
  },

  measurementTitle: {
    marginBottom: 10,
    fontFamily: "Georgia, serif",
    fontSize: 24,
    lineHeight: 1,
    fontWeight: 400,
    color: "#173326",
  },

  measurementText: {
    maxWidth: 230,
    fontSize: 13,
    lineHeight: 1.55,
    color: "#68786f",
  },

  measurementArrow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "Georgia, serif",
    fontSize: 28,
    lineHeight: 1,
    color: "#ac9b79",
  },

  measurementTurn: {
    width: "100%",
    height: 52,
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingRight: 128,
    boxSizing: "border-box",
    position: "relative",
  },

  measurementTurnLine: {
    position: "absolute",
    top: 0,
    right: 128,
    width: 1,
    height: 26,
    background:
      "rgba(172,155,121,0.38)",
  },

  measurementTurnArrow: {
    marginTop: 22,
    fontFamily: "Georgia, serif",
    fontSize: 25,
    color: "#ac9b79",
  },

  measurementReturn: {
    marginTop: 20,
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 9,
    paddingLeft: 18,
  },

  measurementReturnArrow: {
    fontFamily: "Georgia, serif",
    fontSize: 28,
    color: "#47725e",
  },

  measurementReturnText: {
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: "0.16em",
    color: "#6a7b70",
  },

  evidenceClosing: {
    maxWidth: 900,
    margin: "48px auto 0",
    textAlign: "center",
  },

  evidenceClosingSmall: {
    margin: "0 0 12px",
    fontSize: 15,
    color: "#68786f",
  },

  evidenceClosingTitle: {
    margin: 0,
    fontFamily: "Georgia, serif",
    fontWeight: 400,
    fontSize:
      "clamp(37px, 4.7vw, 60px)",
    lineHeight: 1.04,
    color: "#173326",
  },

  evidenceClosingAccent: {
    margin: "12px 0 0",
    fontFamily: "Georgia, serif",
    fontSize:
    "clamp(25px, 3vw, 37px)",
    color: "#47725e",
  },

  evidenceButton: {
    appearance: "none",
    border: 0,
    borderBottom:
      "1px solid rgba(23,51,38,0.30)",
    padding: "0 0 4px",
    marginTop: 28,
    background: "transparent",
    color: "#173326",
    fontSize: 14,
    fontWeight: 800,
    cursor: "pointer",
  },

    intelligenceSection: {
    padding: "100px 5vw 110px",
    background:
      "radial-gradient(circle at 72% 42%, rgba(58,112,82,0.18) 0%, rgba(6,29,22,0) 34%), linear-gradient(180deg, #061d16 0%, #08261c 55%, #051a14 100%)",
    color: "#ffffff",
    overflow: "hidden",
  },

  intelligenceIntro: {
    width: "100%",
    maxWidth: 1320,
    margin: "0 auto 52px",
  },

  intelligenceEyebrow: {
    margin: "0 0 18px",
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.17em",
    color: "#e7c78f",
  },

  intelligenceTitle: {
    maxWidth: 940,
    margin: 0,
    fontFamily: "Georgia, serif",
    fontWeight: 400,
    fontSize:
      "clamp(46px, 5.8vw, 76px)",
    lineHeight: 0.98,
    letterSpacing: "-0.035em",
    color: "#f8f4ea",
  },

  intelligenceAccent: {
    margin: "12px 0 0",
    fontFamily: "Georgia, serif",
    fontWeight: 400,
    fontSize:
      "clamp(31px, 4vw, 50px)",
    lineHeight: 1.04,
    color: "#e7c78f",
  },

  intelligenceLead: {
    maxWidth: 760,
    margin: "26px 0 0",
    fontSize: 16,
    lineHeight: 1.7,
    color:
      "rgba(255,255,255,0.67)",
  },

  intelligenceSteps: {
    width: "100%",
    maxWidth: 1320,
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns:
      "repeat(5, minmax(0, 1fr))",
    gap: 12,
  },

  intelligenceStep: {
    minHeight: 205,
    padding: "24px 22px",
    borderRadius: 24,
    boxSizing: "border-box",
    background:
      "rgba(255,255,255,0.05)",
    border:
      "1px solid rgba(231,199,143,0.15)",
  },

  intelligenceStepNumber: {
    display: "block",
    marginBottom: 31,
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: "0.12em",
    color: "#b79b69",
  },

  intelligenceStepTitle: {
    display: "block",
    marginBottom: 10,
    fontFamily: "Georgia, serif",
    fontSize: 23,
    fontWeight: 400,
    color: "#f8f4ea",
  },

  intelligenceStepText: {
    margin: 0,
    fontSize: 13,
    lineHeight: 1.6,
    color:
      "rgba(255,255,255,0.58)",
  },

  coachReveal: {
    width: "100%",
    maxWidth: 1320,
    margin: "92px auto 0",
    padding: "54px",
    boxSizing: "border-box",
    borderRadius: 36,
    background:
      "linear-gradient(135deg, #f8f5ed 0%, #eeeadf 100%)",
    color: "#173326",
    boxShadow:
      "0 32px 90px rgba(0,0,0,0.20)",
  },

  coachRevealHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 40,
  },

  coachEyebrow: {
    margin: "0 0 13px",
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: "0.17em",
    color: "#7b735e",
  },

  coachTitle: {
    maxWidth: 700,
    margin: 0,
    fontFamily: "Georgia, serif",
    fontWeight: 400,
    fontSize:
      "clamp(38px, 4.6vw, 60px)",
    lineHeight: 1,
    color: "#173326",
  },

  coachAccent: {
    margin: "9px 0 0",
    fontFamily: "Georgia, serif",
    fontSize:
      "clamp(25px, 3vw, 38px)",
    color: "#47725e",
  },

  coachEnso: {
    width: 96,
    height: 96,
    borderRadius: "50%",
    border:
      "9px solid #204937",
    borderRightColor:
      "rgba(32,73,55,0.26)",
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
  },

  coachEnsoText: {
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: "0.17em",
    color: "#204937",
  },

  coachQuickActions: {
    marginTop: 40,
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
  },

  coachQuickAction: {
    padding: "11px 15px",
    borderRadius: 999,
    background: "#ffffff",
    border:
      "1px solid rgba(23,51,38,0.10)",
    fontSize: 12,
    fontWeight: 700,
    color: "#284b3c",
  },

  coachConversation: {
    marginTop: 28,
    padding: "30px",
    borderRadius: 28,
    background:
      "rgba(255,255,255,0.68)",
    border:
      "1px solid rgba(23,51,38,0.08)",
  },

  coachUserSide: {
    maxWidth: 580,
    marginBottom: 30,
  },

  coachRootSide: {
    width: "100%",
  },

  coachSpeaker: {
    display: "block",
    marginBottom: 8,
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: "0.16em",
    color: "#8b7b5d",
  },

  coachUserQuestion: {
    margin: 0,
    fontFamily: "Georgia, serif",
    fontSize: 25,
    lineHeight: 1.3,
    color: "#173326",
  },

  coachResponseIntro: {
    maxWidth: 720,
    margin: "0 0 22px",
    fontSize: 14,
    lineHeight: 1.65,
    color: "#627268",
  },

  coachFindingGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2, minmax(0, 1fr))",
    gap: 12,
  },

  coachFinding: {
    minHeight: 125,
    padding: "20px",
    boxSizing: "border-box",
    borderRadius: 18,
    background: "#ffffff",
    border:
      "1px solid rgba(23,51,38,0.08)",
  },

  coachFindingLabel: {
    display: "block",
    marginBottom: 11,
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: "0.13em",
    color: "#8b7b5d",
  },

  coachFindingText: {
    margin: 0,
    fontSize: 13,
    lineHeight: 1.55,
    color: "#52675b",
  },

  coachPayoff: {
    maxWidth: 850,
    margin: "50px auto 0",
    textAlign: "center",
  },

  coachPayoffSmall: {
    margin: "0 0 10px",
    fontSize: 14,
    color: "#68786f",
  },

  coachPayoffTitle: {
    margin: 0,
    fontFamily: "Georgia, serif",
    fontWeight: 400,
    fontSize:
      "clamp(36px, 4.5vw, 56px)",
    lineHeight: 1.02,
    color: "#173326",
  },

  coachPayoffAccent: {
    margin: "8px 0 0",
    fontFamily: "Georgia, serif",
    fontSize:
      "clamp(27px, 3.4vw, 42px)",
    color: "#47725e",
  },

  coachPayoffBody: {
    maxWidth: 760,
    margin: "22px auto 0",
    fontSize: 14,
    lineHeight: 1.7,
    color: "#67776e",
  },

  intelligenceBridge: {
    maxWidth: 980,
    margin: "92px auto 0",
    textAlign: "center",
  },

  intelligenceBridgeSmall: {
    margin: "0 0 14px",
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: "0.17em",
    color: "#d7b979",
  },

  intelligenceBridgeTitle: {
    margin: 0,
    fontFamily: "Georgia, serif",
    fontWeight: 400,
    fontSize:
      "clamp(40px, 5vw, 66px)",
    lineHeight: 1,
    color: "#f8f4ea",
  },

  intelligenceBridgeText: {
    maxWidth: 680,
    margin: "19px auto 0",
    fontSize: 16,
    lineHeight: 1.65,
    color:
      "rgba(255,255,255,0.61)",
  },

    actionSection: {
    padding: "110px 5vw 120px",
    background:
      "linear-gradient(180deg, #f5f1e8 0%, #eee9dc 100%)",
    color: "#173326",
    overflow: "hidden",
  },

  actionIntro: {
    width: "100%",
    maxWidth: 1320,
    margin: "0 auto 58px",
  },

  actionEyebrow: {
    margin: "0 0 18px",
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.17em",
    color: "#8f7950",
  },

  actionTitle: {
    maxWidth: 1000,
    margin: 0,
    fontFamily: "Georgia, serif",
    fontWeight: 400,
    fontSize:
      "clamp(45px, 5.7vw, 76px)",
    lineHeight: 0.99,
    letterSpacing: "-0.035em",
    color: "#173326",
  },

  actionAccent: {
    margin: "13px 0 0",
    fontFamily: "Georgia, serif",
    fontWeight: 400,
    fontSize:
      "clamp(30px, 4vw, 50px)",
    lineHeight: 1.05,
    color: "#47725e",
  },

  actionLead: {
    maxWidth: 760,
    margin: "27px 0 0",
    fontSize: 16,
    lineHeight: 1.7,
    color: "#63736a",
  },

  actionPath: {
    width: "100%",
    maxWidth: 1320,
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns:
      "1fr 60px 1fr 60px 1fr",
    gap: 14,
    alignItems: "center",
  },

  actionPathStep: {
    minHeight: 220,
    padding: "28px 27px",
    boxSizing: "border-box",
    borderRadius: 26,
    background: "#ffffff",
    border:
      "1px solid rgba(23,51,38,0.09)",
    boxShadow:
      "0 18px 48px rgba(23,51,38,0.06)",
  },

  actionPathNumber: {
    display: "block",
    marginBottom: 34,
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: "0.12em",
    color: "#9b8358",
  },

  actionPathTitle: {
    display: "block",
    marginBottom: 11,
    fontFamily: "Georgia, serif",
    fontWeight: 400,
    fontSize: 27,
    color: "#173326",
  },

  actionPathText: {
    maxWidth: 300,
    margin: 0,
    fontSize: 13,
    lineHeight: 1.65,
    color: "#65766c",
  },

  actionPathArrow: {
    textAlign: "center",
    fontFamily: "Georgia, serif",
    fontSize: 30,
    color: "#ac9b79",
  },

  interventionQuestion: {
    maxWidth: 1050,
    margin: "125px auto 0",
    textAlign: "center",
  },

  interventionQuestionSmall: {
    margin: "0 0 17px",
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: "0.18em",
    color: "#927d56",
  },

  interventionQuestionTitle: {
    margin: 0,
    fontFamily: "Georgia, serif",
    fontWeight: 400,
    fontSize:
      "clamp(43px, 5.7vw, 74px)",
    lineHeight: 1,
    letterSpacing: "-0.035em",
    color: "#173326",
  },

  interventionQuestionAccent: {
    margin: "14px 0 0",
    fontFamily: "Georgia, serif",
    fontSize:
      "clamp(29px, 3.8vw, 47px)",
    lineHeight: 1.05,
    color: "#47725e",
  },

  interventionReveal: {
    width: "100%",
    maxWidth: 1320,
    margin: "70px auto 0",
    padding: "54px",
    boxSizing: "border-box",
    borderRadius: 38,
    background:
      "radial-gradient(circle at 86% 16%, rgba(66,122,91,0.20) 0%, rgba(6,29,22,0) 27%), linear-gradient(135deg, #061d16 0%, #08261c 100%)",
    color: "#ffffff",
    boxShadow:
      "0 32px 90px rgba(23,51,38,0.18)",
  },

  interventionRevealTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 40,
  },

  interventionRevealCopy: {
    maxWidth: 850,
  },

  interventionEyebrow: {
    margin: "0 0 15px",
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: "0.17em",
    color: "#e7c78f",
  },

  interventionTitle: {
    margin: 0,
    fontFamily: "Georgia, serif",
    fontWeight: 400,
    fontSize:
      "clamp(39px, 4.7vw, 62px)",
    lineHeight: 1,
    color: "#f8f4ea",
  },

  interventionLead: {
    maxWidth: 720,
    margin: "22px 0 0",
    fontSize: 15,
    lineHeight: 1.7,
    color:
      "rgba(255,255,255,0.64)",
  },

  interventionEnso: {
    width: 108,
    height: 108,
    borderRadius: "50%",
    border:
      "10px solid #e7c78f",
    borderRightColor:
      "rgba(231,199,143,0.25)",
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
  },

  interventionEnsoText: {
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: "0.17em",
    color: "#e7c78f",
  },

  interventionEvidenceGrid: {
    marginTop: 48,
    display: "grid",
    gridTemplateColumns:
      "repeat(3, minmax(0, 1fr))",
    gap: 14,
  },

  interventionEvidenceCard: {
    minHeight: 190,
    padding: "25px",
    boxSizing: "border-box",
    borderRadius: 23,
    background:
      "rgba(255,255,255,0.055)",
    border:
      "1px solid rgba(231,199,143,0.16)",
  },

  interventionCardLabel: {
    display: "block",
    marginBottom: 26,
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: "0.14em",
    color: "#d7b979",
  },

  interventionCardTitle: {
    display: "block",
    marginBottom: 10,
    fontFamily: "Georgia, serif",
    fontWeight: 400,
    fontSize: 23,
    color: "#f8f4ea",
  },

  interventionCardText: {
    margin: 0,
    fontSize: 13,
    lineHeight: 1.65,
    color:
      "rgba(255,255,255,0.58)",
  },

  interventionProposal: {
    marginTop: 18,
    padding: "31px",
    borderRadius: 25,
    background:
      "rgba(255,255,255,0.96)",
    color: "#173326",
    display: "grid",
    gridTemplateColumns:
      "minmax(0, 1.5fr) minmax(360px, 1fr)",
    gap: 40,
    alignItems: "center",
  },

  interventionProposalLabel: {
    display: "block",
    marginBottom: 9,
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: "0.15em",
    color: "#927d56",
  },

  interventionProposalTitle: {
    margin: 0,
    fontFamily: "Georgia, serif",
    fontWeight: 400,
    fontSize: 30,
    color: "#173326",
  },

  interventionProposalText: {
    maxWidth: 620,
    margin: "11px 0 0",
    fontSize: 13,
    lineHeight: 1.65,
    color: "#62736a",
  },

  interventionProposalMeta: {
    display: "grid",
    gridTemplateColumns:
      "repeat(3, minmax(0, 1fr))",
    gap: 10,
  },

  interventionMetaItem: {
    paddingLeft: 14,
    borderLeft:
      "1px solid rgba(23,51,38,0.12)",
  },

  interventionMetaLabel: {
    display: "block",
    marginBottom: 7,
    fontSize: 8,
    fontWeight: 800,
    letterSpacing: "0.12em",
    color: "#927d56",
  },

  interventionMetaValue: {
    fontSize: 12,
    color: "#284b3c",
  },

  afterAction: {
    width: "100%",
    maxWidth: 1320,
    margin: "125px auto 0",
  },

  afterActionEyebrow: {
    margin: "0 0 15px",
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: "0.17em",
    color: "#927d56",
  },

  afterActionTitle: {
    maxWidth: 900,
    margin: 0,
    fontFamily: "Georgia, serif",
    fontWeight: 400,
    fontSize:
      "clamp(42px, 5vw, 66px)",
    lineHeight: 1,
    color: "#173326",
  },

  afterActionAccent: {
    margin: "11px 0 0",
    fontFamily: "Georgia, serif",
    fontSize:
      "clamp(28px, 3.6vw, 44px)",
    color: "#47725e",
  },

  afterActionGrid: {
    marginTop: 46,
    display: "grid",
    gridTemplateColumns:
      "1fr 50px 1fr 50px 1fr",
    gap: 12,
    alignItems: "center",
  },

  afterActionCard: {
    minHeight: 205,
    padding: "27px",
    boxSizing: "border-box",
    borderRadius: 25,
    background:
      "rgba(255,255,255,0.78)",
    border:
      "1px solid rgba(23,51,38,0.09)",
  },

  afterActionNumber: {
    display: "block",
    marginBottom: 29,
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: "0.15em",
    color: "#927d56",
  },

  afterActionCardTitle: {
    display: "block",
    marginBottom: 10,
    fontFamily: "Georgia, serif",
    fontWeight: 400,
    fontSize: 24,
    color: "#173326",
  },

  afterActionCardText: {
    margin: 0,
    fontSize: 13,
    lineHeight: 1.65,
    color: "#66766d",
  },

  afterActionConnector: {
    textAlign: "center",
    fontFamily: "Georgia, serif",
    fontSize: 29,
    color: "#ac9b79",
  },

  actionLoopClose: {
    maxWidth: 1000,
    margin: "145px auto 10px",
    textAlign: "center",
  },

  actionLoopEnso: {
    width: 128,
    height: 128,
    margin: "0 auto 32px",
    borderRadius: "50%",
    border:
      "11px solid #214c39",
    borderRightColor:
      "rgba(33,76,57,0.20)",
    position: "relative",
    display: "grid",
    placeItems: "center",
    boxSizing: "border-box",
  },

  actionLoopGap: {
    position: "absolute",
    right: -12,
    top: 35,
    width: 18,
    height: 35,
    background: "#eee9dc",
  },

  actionLoopEnsoText: {
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: "0.18em",
    color: "#214c39",
  },

  actionLoopSmall: {
    margin: "0 0 18px",
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: "0.15em",
    color: "#927d56",
  },

  actionLoopTitle: {
    margin: 0,
    fontFamily: "Georgia, serif",
    fontWeight: 400,
    fontSize:
      "clamp(44px, 5.7vw, 74px)",
    lineHeight: 1,
    letterSpacing: "-0.035em",
    color: "#173326",
  },

  actionLoopAccent: {
    margin: "12px 0 0",
    fontFamily: "Georgia, serif",
    fontSize:
      "clamp(31px, 4vw, 50px)",
    lineHeight: 1.05,
    color: "#47725e",
  },

  actionLoopBody: {
    maxWidth: 750,
    margin: "25px auto 0",
    fontSize: 15,
    lineHeight: 1.75,
    color: "#63736a",
  },

  actionLoopFinal: {
    display: "block",
    marginTop: 31,
    fontFamily: "Georgia, serif",
    fontWeight: 400,
    fontSize:
      "clamp(25px, 3vw, 36px)",
    color: "#173326",
  },

    trustSection: {
    padding: "110px 5vw 120px",
    background:
      "radial-gradient(circle at 78% 26%, rgba(54,108,79,0.18) 0%, rgba(6,29,22,0) 31%), linear-gradient(180deg, #061d16 0%, #08261c 58%, #051a14 100%)",
    color: "#ffffff",
    overflow: "hidden",
  },

  trustIntro: {
    width: "100%",
    maxWidth: 1320,
    margin: "0 auto 58px",
  },

  trustEyebrow: {
    margin: "0 0 18px",
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.17em",
    color: "#e7c78f",
  },

  trustTitle: {
    maxWidth: 980,
    margin: 0,
    fontFamily: "Georgia, serif",
    fontWeight: 400,
    fontSize:
      "clamp(46px, 5.8vw, 76px)",
    lineHeight: 0.99,
    letterSpacing: "-0.035em",
    color: "#f8f4ea",
  },

  trustAccent: {
    margin: "13px 0 0",
    fontFamily: "Georgia, serif",
    fontWeight: 400,
    fontSize:
      "clamp(30px, 4vw, 50px)",
    lineHeight: 1.05,
    color: "#e7c78f",
  },

  trustLead: {
    maxWidth: 760,
    margin: "27px 0 0",
    fontSize: 16,
    lineHeight: 1.7,
    color:
      "rgba(255,255,255,0.64)",
  },

  trustGrid: {
    width: "100%",
    maxWidth: 1320,
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns:
      "repeat(3, minmax(0, 1fr))",
    gap: 14,
  },

  trustCard: {
    minHeight: 235,
    padding: "28px",
    boxSizing: "border-box",
    borderRadius: 26,
    background:
      "rgba(255,255,255,0.055)",
    border:
      "1px solid rgba(231,199,143,0.16)",
  },

  trustCardNumber: {
    display: "block",
    marginBottom: 34,
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: "0.13em",
    color: "#d7b979",
  },

  trustCardTitle: {
    display: "block",
    marginBottom: 13,
    fontFamily: "Georgia, serif",
    fontWeight: 400,
    fontSize: 24,
    color: "#f8f4ea",
  },

  trustCardText: {
    maxWidth: 340,
    margin: 0,
    fontSize: 13,
    lineHeight: 1.7,
    color:
      "rgba(255,255,255,0.58)",
  },

  trustGuardrail: {
    width: "100%",
    maxWidth: 1120,
    margin: "88px auto 0",
    padding: "58px 54px",
    boxSizing: "border-box",
    borderRadius: 36,
    textAlign: "center",
    background:
      "linear-gradient(135deg, #f8f5ed 0%, #eee9df 100%)",
    color: "#173326",
    boxShadow:
      "0 30px 90px rgba(0,0,0,0.18)",
  },

  trustEnso: {
    width: 92,
    height: 92,
    margin: "0 auto 27px",
    borderRadius: "50%",
    border:
      "8px solid #214c39",
    borderRightColor:
      "rgba(33,76,57,0.22)",
    display: "grid",
    placeItems: "center",
  },

  trustEnsoText: {
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: "0.17em",
    color: "#214c39",
  },

  trustGuardrailSmall: {
    margin: "0 0 13px",
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: "0.17em",
    color: "#927d56",
  },

  trustGuardrailTitle: {
    maxWidth: 850,
    margin: "0 auto",
    fontFamily: "Georgia, serif",
    fontWeight: 400,
    fontSize:
      "clamp(38px, 4.8vw, 61px)",
    lineHeight: 1,
    color: "#173326",
  },

  trustGuardrailAccent: {
    margin: "9px 0 0",
    fontFamily: "Georgia, serif",
    fontSize:
      "clamp(29px, 3.7vw, 45px)",
    color: "#47725e",
  },

  trustGuardrailBody: {
    maxWidth: 760,
    margin: "23px auto 0",
    fontSize: 14,
    lineHeight: 1.75,
    color: "#64756b",
  },

  trustNext: {
    maxWidth: 930,
    margin: "100px auto 0",
    textAlign: "center",
  },

  trustNextSmall: {
    margin: "0 0 15px",
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: "0.17em",
    color: "#d7b979",
  },

  trustNextTitle: {
    margin: 0,
    fontFamily: "Georgia, serif",
    fontWeight: 400,
    fontSize:
      "clamp(41px, 5.2vw, 67px)",
    lineHeight: 1,
    color: "#f8f4ea",
  },

  trustNextText: {
    maxWidth: 680,
    margin: "20px auto 0",
    fontSize: 16,
    lineHeight: 1.7,
    color:
      "rgba(255,255,255,0.61)",
  },
};
