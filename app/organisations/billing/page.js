"use client";

import {
  useEffect,
  useState,
} from "react";

import { supabase } from "../../../lib/supabase";
import Nav from "../../../components/Nav";
import RootAtmosphere from "../../../components/RootAtmosphere";
import RootEnso from "../../../components/RootEnso";

import {
  buildRootTrialStatus,
} from "../../../lib/rootTrialStatus";

export default function OrganisationBillingPage() {
  const [loading, setLoading] =
    useState(true);

  const [organisation, setOrganisation] =
    useState(null);

  const [
    currentMembership,
    setCurrentMembership,
  ] = useState(null);

  const [error, setError] =
    useState("");

  useEffect(() => {
    loadBillingContext();
  }, []);

  async function loadBillingContext() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        window.location.href =
          "/login";

        return;
      }

      const {
        data: membership,
        error: membershipError,
      } = await supabase
        .from("organisation_members")
        .select(
          `
            id,
            organisation_id,
            user_id,
            profile_key,
            email,
            name,
            department,
            role
          `
        )
        .eq(
          "user_id",
          user.id
        )
        .maybeSingle();

      if (
        membershipError ||
        !membership
      ) {
        setError(
          "Root could not find your organisation membership."
        );

        return;
      }

      if (
        ![
          "organisation_admin",
          "hr_admin",
        ].includes(
          membership.role
        )
      ) {
        window.location.href = "/";

        return;
      }

      setCurrentMembership(
        membership
      );

      const {
        data: organisationData,
        error: organisationError,
      } = await supabase
        .from("organisations")
        .select("*")
        .eq(
          "id",
          membership.organisation_id
        )
        .maybeSingle();

      if (
        organisationError ||
        !organisationData
      ) {
        setError(
          "Root could not load your organisation."
        );

        return;
      }

      setOrganisation(
        organisationData
      );
    } catch (loadError) {
      console.error(
        "Root billing page load error:",
        loadError
      );

      setError(
        "Root could not prepare your organisation subscription options."
      );
    } finally {
      setLoading(false);
    }
  }

  const trialStatus =
    buildRootTrialStatus({
      organisation,
    });

  const organisationName =
    organisation?.name ||
    "your organisation";

  const firstName =
    String(
      currentMembership?.name || ""
    )
      .trim()
      .split(" ")[0] ||
    "";

  async function continueWithRoot() {
  try {
    const {
      data: sessionData,
      error: sessionError,
    } =
      await supabase.auth.getSession();

    const accessToken =
      sessionData?.session
        ?.access_token;

    if (
      sessionError ||
      !accessToken
    ) {
      window.alert(
        "Root could not confirm your sign-in. Please sign in again."
      );

      return;
    }

    const response =
      await fetch(
        "/api/stripe/workplace-checkout",
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${accessToken}`,
          },
        }
      );

    const data =
      await response.json();

    if (
      !response.ok ||
      !data?.url
    ) {
      if (
        data?.requiresConversation
      ) {
        window.location.href =
          "/contact";

        return;
      }

      window.alert(
        data?.error ||
          "Root could not open subscription checkout."
      );

      return;
    }

    window.location.href =
      data.url;
  } catch (error) {
    console.error(
      "Root Workplace checkout error:",
      error
    );

    window.alert(
      "Root could not open subscription checkout."
    );
  }
}

  function reviewWithDavid() {
    window.location.href =
      "/contact";
  }

  if (loading) {
    return (
      <RootAtmosphere type="coach">
        <Nav />

        <main style={styles.page}>
          <section style={styles.shell}>
            <div style={styles.loading}>
              <RootEnso size={82} />

              <strong>
                Root is preparing your
                organisation options...
              </strong>
            </div>
          </section>
        </main>
      </RootAtmosphere>
    );
  }

  if (error) {
    return (
      <RootAtmosphere type="coach">
        <Nav />

        <main style={styles.page}>
          <section style={styles.shell}>
            <div style={styles.errorCard}>
              <RootEnso size={82} />

              <p style={styles.eyebrow}>
                Root Workplace
              </p>

              <h1 style={styles.errorTitle}>
                We couldn't prepare this
                page just yet.
              </h1>

              <p style={styles.bodyText}>
                {error}
              </p>

              <button
                type="button"
                style={styles.secondaryButton}
                onClick={() => {
                  window.location.href =
                    "/org-insights";
                }}
              >
                Return to Organisation
                Insights
              </button>
            </div>
          </section>
        </main>
      </RootAtmosphere>
    );
  }

  /*
   * Already subscribed.
   */

  if (trialStatus.isPaid) {
    return (
      <RootAtmosphere type="coach">
        <Nav />

        <main style={styles.page}>
          <section style={styles.shell}>
            <div style={styles.activeCard}>
              <RootEnso size={88} />

              <p style={styles.eyebrow}>
                Root Workplace
              </p>

              <h1 style={styles.title}>
                You're continuing with
                Root.
              </h1>

              <p style={styles.lead}>
                {organisationName} has an
                active Root Workplace
                subscription.
              </p>

              <div style={styles.activeMessage}>
                <span
                  style={
                    styles.successIcon
                  }
                >
                  ✓
                </span>

                <div>
                  <strong>
                    Everything continues
                    normally
                  </strong>

                  <span>
                    Employee participation,
                    Organisation Learning,
                    Ask Root and longitudinal
                    organisation intelligence
                    remain active.
                  </span>
                </div>
              </div>

              <button
                type="button"
                style={styles.primaryButton}
                onClick={() => {
                  window.location.href =
                    "/org-insights";
                }}
              >
                Return to Organisation
                Insights
              </button>
            </div>
          </section>
        </main>
      </RootAtmosphere>
    );
  }

  const trialHasEnded =
    trialStatus.isExpired;

  return (
    <RootAtmosphere type="coach">
      <Nav />

      <main style={styles.page}>
        <section style={styles.shell}>
          <header style={styles.header}>
            <RootEnso size={92} />

            <p style={styles.eyebrow}>
              Root Workplace
            </p>

            <h1 style={styles.title}>
              {trialHasEnded
                ? "Your Root trial has ended."
                : "Continue your Root journey."}
            </h1>

            <p style={styles.lead}>
              {firstName
                ? `${firstName}, `
                : ""}
              over the last{" "}
              {trialStatus.daysElapsed}{" "}
              days, Root has been building
              an evidence-based understanding
              of {organisationName}.
            </p>
          </header>

          <section style={styles.preservationCard}>
            <div
              style={
                styles.preservationIcon
              }
            >
              🍃
            </div>

            <div>
              <strong
                style={
                  styles.preservationTitle
                }
              >
                Your organisation picture is
                safe
              </strong>

              <p
                style={
                  styles.preservationText
                }
              >
                Root has preserved the
                organisation evidence gathered
                during the trial. Nothing needs
                to be rushed and nothing is
                being deleted because the trial
                has ended.
              </p>
            </div>
          </section>

          <div style={styles.choiceIntro}>
            <p style={styles.choiceEyebrow}>
              What happens next
            </p>

            <h2 style={styles.choiceTitle}>
              Choose the route that feels
              right for your organisation.
            </h2>

            <p style={styles.choiceText}>
              Continue immediately, or review
              what Root has learned before
              deciding.
            </p>
          </div>

          <div style={styles.choiceGrid}>
            <section
              style={styles.continueCard}
            >
              <div style={styles.cardTop}>
                <span style={styles.cardIcon}>
                  ✓
                </span>

                <span
                  style={
                    styles.recommendedBadge
                  }
                >
                  Continue seamlessly
                </span>
              </div>

              <div>
                <p style={styles.cardEyebrow}>
                  Continue with Root
                </p>

                <h2 style={styles.cardTitle}>
                  Keep Root working for{" "}
                  {organisationName}
                </h2>

                <p style={styles.cardText}>
                  Move from your trial into a
                  Root Workplace subscription
                  without interrupting the
                  organisation or employee
                  experience.
                </p>
              </div>

              <div style={styles.benefitList}>
                <span>
                  ✓ Organisation Insights
                </span>

                <span>
                  ✓ Organisation Learning
                </span>

                <span>
                  ✓ Executive Review
                </span>

                <span>
                  ✓ Ask Root
                </span>

                <span>
                  ✓ Employee Root access
                </span>

                <span>
                  ✓ Longitudinal organisation
                  memory
                </span>
              </div>

              <button
                type="button"
                style={styles.primaryButton}
                onClick={
                  continueWithRoot
                }
              >
                Continue with Root →
              </button>

              <p style={styles.smallPrint}>
                Your existing organisation
                evidence and employee
                participation continue without
                interruption.
              </p>
            </section>

            <section
              style={styles.reviewCard}
            >
              <div style={styles.cardTop}>
                <span
                  style={
                    styles.conversationIcon
                  }
                >
                  ◇
                </span>
              </div>

              <div>
                <p style={styles.cardEyebrow}>
                  Talk it through first
                </p>

                <h2 style={styles.cardTitle}>
                  Review our findings together
                </h2>

                <p style={styles.cardText}>
                  Every organisation is
                  different. If you'd rather
                  understand what Root has
                  learned before deciding,
                  arrange a conversation with
                  David.
                </p>
              </div>

              <div
                style={
                  styles.conversationDetail
                }
              >
                <strong>
                  A useful conversation, not a
                  sales pitch.
                </strong>

                <span>
                  Review the organisation
                  picture, discuss the evidence,
                  explore what may deserve
                  attention next and decide
                  whether continuing with Root
                  makes sense.
                </span>
              </div>

              <button
                type="button"
                style={
                  styles.secondaryActionButton
                }
                onClick={
                  reviewWithDavid
                }
              >
                Review our findings together →
              </button>

              <p style={styles.smallPrint}>
                No subscription decision is
                required before the
                conversation.
              </p>
            </section>
          </div>

          <section style={styles.footerCard}>
            <div>
              <p style={styles.footerEyebrow}>
                Root's approach
              </p>

              <strong style={styles.footerTitle}>
                The decision remains yours.
              </strong>

              <p style={styles.footerText}>
                Root's role is to help you
                understand the evidence and
                make the right decision for
                your organisation. Your trial
                ending does not erase what has
                been learned.
              </p>
            </div>

            <button
              type="button"
              style={styles.backButton}
              onClick={() => {
                window.location.href =
                  "/org-insights";
              }}
            >
              ← Organisation Insights
            </button>
          </section>
        </section>
      </main>
    </RootAtmosphere>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    padding: "32px 24px 70px",
    display: "flex",
    justifyContent: "center",
  },

  shell: {
    width: "100%",
    maxWidth: "1120px",
  },

  header: {
    maxWidth: "760px",
    margin: "20px auto 30px",
    textAlign: "center",
  },

  eyebrow: {
    margin: "12px 0 8px",
    color: "#6D7766",
    fontSize: "11px",
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: "0.15em",
  },

  title: {
    margin: "0",
    color: "#20231F",
    fontSize: "clamp(38px, 6vw, 58px)",
    lineHeight: "1.05",
    letterSpacing: "-0.045em",
  },

  lead: {
    maxWidth: "680px",
    margin: "18px auto 0",
    color: "#60675C",
    fontSize: "17px",
    lineHeight: "1.75",
  },

  preservationCard: {
    maxWidth: "820px",
    margin: "0 auto 34px",
    padding: "20px 22px",
    display: "flex",
    alignItems: "flex-start",
    gap: "15px",
    borderRadius: "24px",
    background:
      "linear-gradient(145deg, rgba(244,248,239,0.74), rgba(255,255,255,0.46))",
    border:
      "1px solid rgba(112,132,101,0.16)",
    boxShadow:
      "0 16px 44px rgba(36,43,32,0.05)",
  },

  preservationIcon: {
    width: "38px",
    height: "38px",
    flex: "0 0 38px",
    display: "grid",
    placeItems: "center",
    borderRadius: "999px",
    background:
      "rgba(96,126,84,0.10)",
    fontSize: "17px",
  },

  preservationTitle: {
    color: "#394235",
    fontSize: "14px",
  },

  preservationText: {
    margin: "5px 0 0",
    color: "#697064",
    fontSize: "13px",
    lineHeight: "1.65",
  },

  choiceIntro: {
    textAlign: "center",
    marginBottom: "20px",
  },

  choiceEyebrow: {
    margin: "0 0 6px",
    color: "#7A8175",
    fontSize: "10px",
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: "0.15em",
  },

  choiceTitle: {
    margin: 0,
    color: "#292D27",
    fontSize: "27px",
    lineHeight: "1.25",
  },

  choiceText: {
    margin: "9px 0 0",
    color: "#70766C",
    fontSize: "14px",
  },

  choiceGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "18px",
  },

  continueCard: {
    minHeight: "520px",
    padding: "30px",
    borderRadius: "32px",
    display: "flex",
    flexDirection: "column",
    background:
      "linear-gradient(145deg, rgba(250,250,245,0.86), rgba(235,242,229,0.74))",
    border:
      "1px solid rgba(255,255,255,0.82)",
    boxShadow:
      "0 24px 70px rgba(35,42,31,0.10)",
  },

  reviewCard: {
    minHeight: "520px",
    padding: "30px",
    borderRadius: "32px",
    display: "flex",
    flexDirection: "column",
    background:
      "linear-gradient(145deg, rgba(255,255,255,0.74), rgba(244,241,234,0.58))",
    border:
      "1px solid rgba(255,255,255,0.78)",
    boxShadow:
      "0 20px 58px rgba(43,39,33,0.07)",
  },

  cardTop: {
    minHeight: "38px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    marginBottom: "24px",
  },

  cardIcon: {
    width: "36px",
    height: "36px",
    display: "grid",
    placeItems: "center",
    borderRadius: "999px",
    background:
      "rgba(82,121,73,0.12)",
    color: "#597451",
    fontWeight: "900",
  },

  conversationIcon: {
    width: "36px",
    height: "36px",
    display: "grid",
    placeItems: "center",
    borderRadius: "999px",
    background:
      "rgba(118,105,83,0.10)",
    color: "#786C5B",
    fontWeight: "900",
  },

  recommendedBadge: {
    padding: "7px 10px",
    borderRadius: "999px",
    background:
      "rgba(255,255,255,0.54)",
    border:
      "1px solid rgba(96,121,85,0.12)",
    color: "#61715A",
    fontSize: "10px",
    fontWeight: "900",
  },

  cardEyebrow: {
    margin: "0 0 8px",
    color: "#798070",
    fontSize: "10px",
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: "0.13em",
  },

  cardTitle: {
    margin: "0",
    color: "#242822",
    fontSize: "26px",
    lineHeight: "1.22",
    letterSpacing: "-0.025em",
  },

  cardText: {
    margin: "14px 0 0",
    color: "#62695D",
    fontSize: "14px",
    lineHeight: "1.7",
  },

  benefitList: {
    margin: "24px 0",
    padding: "18px",
    display: "grid",
    gap: "9px",
    borderRadius: "20px",
    background:
      "rgba(255,255,255,0.38)",
    color: "#535C4E",
    fontSize: "13px",
    lineHeight: "1.5",
  },

  conversationDetail: {
    margin: "24px 0",
    padding: "18px",
    display: "grid",
    gap: "7px",
    borderRadius: "20px",
    background:
      "rgba(255,255,255,0.38)",
    color: "#616057",
    fontSize: "13px",
    lineHeight: "1.6",
  },

  primaryButton: {
    width: "100%",
    marginTop: "auto",
    padding: "16px 20px",
    border: "none",
    borderRadius: "18px",
    background: "#20251E",
    color: "#FFFFFF",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "900",
  },

  secondaryActionButton: {
    width: "100%",
    marginTop: "auto",
    padding: "16px 20px",
    borderRadius: "18px",
    border:
      "1px solid rgba(45,49,42,0.14)",
    background:
      "rgba(255,255,255,0.56)",
    color: "#343930",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "900",
  },

  smallPrint: {
    margin: "12px 4px 0",
    color: "#81867C",
    fontSize: "10px",
    lineHeight: "1.55",
    textAlign: "center",
  },

  footerCard: {
    marginTop: "22px",
    padding: "24px 26px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "22px",
    flexWrap: "wrap",
    borderRadius: "26px",
    background:
      "rgba(255,255,255,0.38)",
    border:
      "1px solid rgba(255,255,255,0.68)",
  },

  footerEyebrow: {
    margin: "0 0 5px",
    color: "#7C8277",
    fontSize: "9px",
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: "0.14em",
  },

  footerTitle: {
    color: "#343A31",
    fontSize: "15px",
  },

  footerText: {
    maxWidth: "670px",
    margin: "6px 0 0",
    color: "#70766C",
    fontSize: "12px",
    lineHeight: "1.65",
  },

  backButton: {
    padding: "12px 16px",
    borderRadius: "16px",
    border:
      "1px solid rgba(40,45,38,0.12)",
    background:
      "rgba(255,255,255,0.48)",
    color: "#52594D",
    cursor: "pointer",
    fontWeight: "800",
  },

  loading: {
    minHeight: "70vh",
    display: "grid",
    placeItems: "center",
    alignContent: "center",
    gap: "18px",
    color: "#5E6658",
    textAlign: "center",
  },

  errorCard: {
    maxWidth: "620px",
    margin: "80px auto",
    padding: "34px",
    textAlign: "center",
    borderRadius: "30px",
    background:
      "rgba(255,255,255,0.58)",
    border:
      "1px solid rgba(255,255,255,0.76)",
  },

  errorTitle: {
    margin: "8px 0",
    color: "#292D27",
    fontSize: "30px",
  },

  bodyText: {
    color: "#676E62",
    lineHeight: "1.7",
  },

  secondaryButton: {
    marginTop: "16px",
    padding: "13px 18px",
    borderRadius: "16px",
    border:
      "1px solid rgba(45,50,43,0.14)",
    background: "#FFFFFF",
    cursor: "pointer",
    fontWeight: "800",
  },

  activeCard: {
    maxWidth: "700px",
    margin: "70px auto",
    padding: "40px",
    textAlign: "center",
    borderRadius: "34px",
    background:
      "linear-gradient(145deg, rgba(250,250,245,0.82), rgba(235,242,229,0.72))",
    border:
      "1px solid rgba(255,255,255,0.82)",
    boxShadow:
      "0 24px 70px rgba(35,42,31,0.09)",
  },

  activeMessage: {
    margin: "26px 0",
    padding: "20px",
    display: "flex",
    alignItems: "center",
    gap: "14px",
    textAlign: "left",
    borderRadius: "22px",
    background:
      "rgba(255,255,255,0.44)",
    color: "#566051",
  },

  successIcon: {
    width: "36px",
    height: "36px",
    flex: "0 0 36px",
    display: "grid",
    placeItems: "center",
    borderRadius: "999px",
    background:
      "rgba(88,127,77,0.12)",
    color: "#5B7652",
    fontWeight: "900",
  },
};
