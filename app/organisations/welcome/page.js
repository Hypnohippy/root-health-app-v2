"use client";

import {
  useEffect,
  useState,
} from "react";

import RootEnso from "../../../components/RootEnso";
import { supabase } from "../../../lib/supabase";

import {
  buildRootTrialStatus,
} from "../../../lib/rootTrialStatus";

export default function OrganisationWelcomePage() {
  const [stage, setStage] =
    useState(0);

  const [loading, setLoading] =
    useState(true);

  const [organisation, setOrganisation] =
    useState(null);

  const [membership, setMembership] =
    useState(null);

  const [error, setError] =
    useState("");

  useEffect(() => {
    const timers = [
      setTimeout(
        () => setStage(1),
        700
      ),

      setTimeout(
        () => setStage(2),
        1700
      ),

      setTimeout(
        () => setStage(3),
        3000
      ),

      setTimeout(
        () => setStage(4),
        4400
      ),

      setTimeout(
        () => setStage(5),
        5800
      ),
    ];

    return () =>
      timers.forEach(
        clearTimeout
      );
  }, []);

  useEffect(() => {
    let cancelled = false;

    let refreshTimer = null;

    async function loadContext({
      quiet = false,
    } = {}) {
      if (!quiet) {
        setLoading(true);
      }

      try {
        const {
          data: {
            user,
          },
          error: authError,
        } =
          await supabase.auth.getUser();

        if (
          authError ||
          !user
        ) {
          window.location.href =
            "/login";

          return;
        }

        const {
          data: membershipData,
          error: membershipError,
        } =
          await supabase
            .from(
              "organisation_members"
            )
            .select(
              `
                id,
                organisation_id,
                user_id,
                email,
                name,
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
          !membershipData
        ) {
          throw new Error(
            "Root could not find your organisation membership."
          );
        }

        const {
          data: organisationData,
          error: organisationError,
        } =
          await supabase
            .from(
              "organisations"
            )
            .select("*")
            .eq(
              "id",
              membershipData
                .organisation_id
            )
            .maybeSingle();

        if (
          organisationError ||
          !organisationData
        ) {
          throw new Error(
            "Root could not load your organisation."
          );
        }

        if (cancelled) {
          return;
        }

        setMembership(
          membershipData
        );

        setOrganisation(
          organisationData
        );

        setError("");
      } catch (loadError) {
        console.error(
          "Root Workplace welcome error:",
          loadError
        );

        if (
          !cancelled &&
          !quiet
        ) {
          setError(
            loadError?.message ||
              "Root could not confirm your organisation membership just yet."
          );
        }
      } finally {
        if (
          !cancelled &&
          !quiet
        ) {
          setLoading(false);
        }
      }
    }

    loadContext();

    /*
     * Once Stripe Checkout returns,
     * Root quietly re-checks the
     * organisation while the webhook
     * confirms the subscription.
     */

    refreshTimer =
      window.setInterval(
        () => {
          loadContext({
            quiet: true,
          });
        },
        3000
      );

    return () => {
      cancelled = true;

      if (refreshTimer) {
        window.clearInterval(
          refreshTimer
        );
      }
    };
  }, []);

  function revealStyle(
    requiredStage,
    transform
  ) {
    return {
      opacity:
        stage >= requiredStage
          ? 1
          : 0,

      transform:
        stage >= requiredStage
          ? "translate(0, 0)"
          : transform,

      transition:
        "opacity 1.7s cubic-bezier(0.22, 1, 0.36, 1), transform 1.7s cubic-bezier(0.22, 1, 0.36, 1)",

      willChange:
        "opacity, transform",
    };
  }

  const trialStatus =
    buildRootTrialStatus({
      organisation,
    });

  const isActive =
    trialStatus?.isPaid === true;

  const organisationName =
    organisation?.name ||
    "your organisation";

  const firstName =
    String(
      membership?.name || ""
    )
      .trim()
      .split(" ")[0] ||
    "";

  if (loading) {
    return (
      <main style={styles.page}>
        <section
          style={
            styles.loadingContainer
          }
        >
          <div
            className="root-workplace-enso"
            style={
              styles.ensoBreath
            }
          >
            <RootEnso size={118} />
          </div>

          <p style={styles.loadingText}>
            Root is preparing your
            organisation...
          </p>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main style={styles.page}>
        <section
          style={
            styles.errorContainer
          }
        >
          <RootEnso size={110} />

          <p style={styles.brand}>
            ROOT WORKPLACE
          </p>

          <h1
            style={
              styles.errorTitle
            }
          >
            Root couldn't confirm
            everything just yet.
          </h1>

          <p
            style={
              styles.errorText
            }
          >
            {error}
          </p>

          <a
            href="/organisations/billing"
            style={
              styles.errorButton
            }
          >
            Return to membership →
          </a>
        </section>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <style jsx global>{`
        @keyframes rootWorkplaceBreath {
          0%,
          100% {
            transform: scale(1);
          }

          42% {
            transform: scale(1.075);
          }

          52% {
            transform: scale(1.075);
          }
        }

        @keyframes rootStatusPulse {
          0%,
          100% {
            opacity: 0.55;
            transform: scale(1);
          }

          50% {
            opacity: 1;
            transform: scale(1.15);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .root-workplace-enso,
          .root-workplace-reveal,
          .root-status-pulse {
            animation: none !important;
            transition: none !important;
            transform: none !important;
            opacity: 1 !important;
          }
        }
      `}</style>

      <section style={styles.container}>
        <div
          className="root-workplace-enso"
          style={
            styles.ensoBreath
          }
          aria-hidden="true"
        >
          <RootEnso size={118} />
        </div>

        <p
          className="root-workplace-reveal"
          style={{
            ...styles.brand,

            ...revealStyle(
              1,
              "translate(0, -14px)"
            ),
          }}
        >
          ROOT WORKPLACE
        </p>

        <h1
          className="root-workplace-reveal"
          style={{
            ...styles.title,

            ...revealStyle(
              2,
              "translate(0, 22px)"
            ),
          }}
        >
          {isActive
            ? `Welcome, ${organisationName}.`
            : `Thank you, ${organisationName}.`}
        </h1>

        <p
          className="root-workplace-reveal"
          style={{
            ...styles.subtitle,

            ...revealStyle(
              3,
              "translate(-24px, 0)"
            ),
          }}
        >
          {isActive ? (
            <>
              Your organisation continues
              from here.
              <br />
              Nothing has been lost.
              Nothing needs to restart.
            </>
          ) : (
            <>
              {firstName
                ? `${firstName}, `
                : ""}
              your checkout is complete.
              <br />
              Root is quietly confirming
              your membership with Stripe.
            </>
          )}
        </p>

        <div
          className="root-workplace-reveal"
          style={{
            ...styles.statusCard,

            ...(isActive
              ? styles.statusCardActive
              : {}),

            ...revealStyle(
              4,
              "translate(0, 24px)"
            ),
          }}
        >
          <div
            className={
              isActive
                ? ""
                : "root-status-pulse"
            }
            style={{
              ...styles.statusIcon,

              ...(isActive
                ? styles.statusIconActive
                : styles.statusIconWaiting),
            }}
          >
            {isActive
              ? "✓"
              : "○"}
          </div>

          <div
            style={
              styles.statusContent
            }
          >
            <strong
              style={
                styles.statusTitle
              }
            >
              {isActive
                ? "Root Workplace is active"
                : "Activation is being confirmed"}
            </strong>

            <p
              style={
                styles.statusText
              }
            >
              {isActive
                ? "Root has recognised your continuing membership. Your existing organisation evidence, learning and employee participation remain in place."
                : "You do not need to make another payment or repeat checkout. Root is waiting for Stripe's secure confirmation before changing the organisation's membership status."}
            </p>
          </div>
        </div>

        <div
          style={
            styles.options
          }
        >
          <a
            href="/org-insights"
            className="root-workplace-reveal"
            style={{
              ...styles.primaryCard,

              ...revealStyle(
                5,
                "translate(-34px, 12px)"
              ),
            }}
          >
            <div
              style={
                styles.cardIcon
              }
            >
              🏢
            </div>

            <div>
              <h2
                style={
                  styles.cardTitle
                }
              >
                Continue to Root
              </h2>

              <p
                style={
                  styles.primaryCardText
                }
              >
                Return to Organisation
                Insights and continue from
                the organisation picture
                Root has already built.
              </p>
            </div>

            <span
              style={
                styles.arrow
              }
            >
              →
            </span>
          </a>

          <a
            href="/organisations/billing"
            className="root-workplace-reveal"
            style={{
              ...styles.secondaryCard,

              ...revealStyle(
                5,
                "translate(34px, 12px)"
              ),
            }}
          >
            <div
              style={
                styles.cardIcon
              }
            >
              ✓
            </div>

            <div>
              <h2
                style={
                  styles.cardTitle
                }
              >
                Membership
              </h2>

              <p
                style={
                  styles.secondaryCardText
                }
              >
                Review your Root Workplace
                membership and organisation
                subscription status.
              </p>
            </div>

            <span
              style={
                styles.secondaryArrow
              }
            >
              →
            </span>
          </a>
        </div>

        <p
          className="root-workplace-reveal"
          style={{
            ...styles.quietNote,

            ...revealStyle(
              5,
              "translate(0, 10px)"
            ),
          }}
        >
          {isActive
            ? "Welcome back. Root already remembers where you left off."
            : "You can stay here while Root confirms everything in the background."}
        </p>
      </section>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    boxSizing: "border-box",

    background:
      "radial-gradient(circle at 50% 12%, rgba(255,255,255,0.94), transparent 34%), linear-gradient(145deg, #EEF2E8 0%, #F8F5EE 55%, #E9EEE3 100%)",

    display: "flex",
    justifyContent: "center",
    alignItems: "center",

    padding: "44px 20px",

    color: "#181818",

    overflowX: "hidden",

    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
  },

  container: {
    width: "100%",
    maxWidth: "760px",
    textAlign: "center",
  },

  loadingContainer: {
    width: "100%",
    maxWidth: "620px",
    textAlign: "center",
  },

  loadingText: {
    margin: "18px 0 0",

    fontFamily:
      "Georgia, serif",

    color: "#656A60",

    fontSize: "18px",
  },

  ensoBreath: {
    width: "fit-content",

    margin:
      "0 auto 24px",

    display: "flex",

    justifyContent:
      "center",

    transformOrigin:
      "center",

    animation:
      "rootWorkplaceBreath 6.8s cubic-bezier(0.42, 0, 0.58, 1) infinite",

    filter:
      "drop-shadow(0 16px 28px rgba(54,65,49,0.10))",
  },

  brand: {
    margin:
      "0 0 18px",

    fontSize: "12px",

    letterSpacing:
      "0.2em",

    fontWeight: "800",

    color: "#6F675B",
  },

  title: {
    margin:
      "0 0 22px",

    fontFamily:
      "Georgia, serif",

    fontSize:
      "clamp(42px, 7vw, 70px)",

    lineHeight: 1.06,

    fontWeight: "500",

    letterSpacing:
      "-0.05em",

    color: "#1E251D",
  },

  subtitle: {
    margin:
      "0 auto 34px",

    fontFamily:
      "Georgia, serif",

    fontSize:
      "clamp(18px, 2.8vw, 23px)",

    lineHeight: 1.7,

    color: "#4D5148",
  },

  statusCard: {
    margin:
      "0 auto 20px",

    padding: "22px 24px",

    boxSizing:
      "border-box",

    textAlign: "left",

    display: "flex",

    alignItems:
      "flex-start",

    gap: "16px",

    borderRadius:
      "26px",

    background:
      "rgba(255,255,255,0.58)",

    border:
      "1px solid rgba(255,255,255,0.88)",

    boxShadow:
      "0 18px 50px rgba(20,18,15,0.07)",

    backdropFilter:
      "blur(16px)",

    WebkitBackdropFilter:
      "blur(16px)",
  },

  statusCardActive: {
    background:
      "linear-gradient(135deg, rgba(242,247,237,0.88), rgba(255,255,255,0.60))",

    border:
      "1px solid rgba(105,130,94,0.16)",
  },

  statusIcon: {
    width: "40px",

    height: "40px",

    flex:
      "0 0 40px",

    display: "grid",

    placeItems:
      "center",

    borderRadius:
      "999px",

    fontWeight: "900",

    fontSize: "17px",
  },

  statusIconWaiting: {
    background:
      "rgba(108,116,96,0.10)",

    color: "#68705F",

    animation:
      "rootStatusPulse 2.2s ease-in-out infinite",
  },

  statusIconActive: {
    background:
      "rgba(79,113,70,0.13)",

    color: "#526D4B",
  },

  statusContent: {
    display: "grid",

    gap: "5px",
  },

  statusTitle: {
    color: "#343D30",

    fontSize: "15px",
  },

  statusText: {
    margin: 0,

    color: "#676E63",

    fontSize: "13px",

    lineHeight: 1.65,
  },

  options: {
    display: "grid",

    gridTemplateColumns:
      "repeat(auto-fit, minmax(280px, 1fr))",

    gap: "16px",
  },

  primaryCard: {
    minHeight:
      "150px",

    boxSizing:
      "border-box",

    textDecoration:
      "none",

    textAlign: "left",

    padding: "26px",

    borderRadius:
      "30px",

    background:
      "linear-gradient(135deg, rgba(44,62,43,0.97), rgba(70,92,65,0.93))",

    color: "#FFFFFF",

    boxShadow:
      "0 24px 70px rgba(20,18,15,0.15)",

    display: "grid",

    gridTemplateColumns:
      "auto 1fr auto",

    alignItems:
      "center",

    gap: "16px",
  },

  secondaryCard: {
    minHeight:
      "150px",

    boxSizing:
      "border-box",

    textDecoration:
      "none",

    textAlign: "left",

    padding: "26px",

    borderRadius:
      "30px",

    background:
      "rgba(255,255,255,0.64)",

    color: "#181818",

    border:
      "1px solid rgba(255,255,255,0.9)",

    boxShadow:
      "0 18px 50px rgba(20,18,15,0.08)",

    backdropFilter:
      "blur(16px)",

    WebkitBackdropFilter:
      "blur(16px)",

    display: "grid",

    gridTemplateColumns:
      "auto 1fr auto",

    alignItems:
      "center",

    gap: "16px",
  },

  cardIcon: {
    fontSize: "28px",

    alignSelf: "start",
  },

  cardTitle: {
    margin:
      "0 0 9px",

    fontFamily:
      "Georgia, serif",

    fontSize: "26px",

    fontWeight: "500",
  },

  primaryCardText: {
    margin: 0,

    color:
      "rgba(255,255,255,0.8)",

    lineHeight: 1.65,

    fontSize: "15px",
  },

  secondaryCardText: {
    margin: 0,

    color: "#5A554D",

    lineHeight: 1.65,

    fontSize: "15px",
  },

  arrow: {
    color: "#FFFFFF",

    fontSize: "28px",
  },

  secondaryArrow: {
    color: "#3C4738",

    fontSize: "28px",
  },

  quietNote: {
    margin:
      "20px 0 0",

    color: "#7A766E",

    fontSize: "13px",

    letterSpacing:
      "0.01em",
  },

  errorContainer: {
    width: "100%",

    maxWidth: "620px",

    textAlign: "center",
  },

  errorTitle: {
    margin:
      "0 0 16px",

    fontFamily:
      "Georgia, serif",

    fontSize:
      "clamp(36px, 6vw, 54px)",

    lineHeight: 1.1,

    fontWeight: "500",

    letterSpacing:
      "-0.04em",

    color: "#1E251D",
  },

  errorText: {
    margin:
      "0 auto 24px",

    color: "#676D63",

    lineHeight: 1.7,

    fontSize: "15px",
  },

  errorButton: {
    display:
      "inline-block",

    padding:
      "14px 18px",

    borderRadius:
      "18px",

    textDecoration:
      "none",

    background:
      "#273124",

    color: "#FFFFFF",

    fontWeight: "800",
  },
};
