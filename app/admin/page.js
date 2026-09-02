"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../../lib/supabase";

export default function RootGlobalAdminPage() {
  const [
    applications,
    setApplications,
  ] = useState([]);

  const [
    introducers,
    setIntroducers,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    authDiagnostic,
    setAuthDiagnostic,
  ] = useState(null);

  async function getAccessToken() {
    const {
      data,
    } =
      await supabase.auth
        .getSession();

    return (
      data?.session
        ?.access_token ||
      null
    );
  }

  async function loadAdmin() {
    setLoading(true);
    setError("");

    try {
      const token =
        await getAccessToken();

      if (!token) {
        setError(
          "Please sign in with your Root administrator account."
        );

        setLoading(false);
        return;
      }

      const headers = {
        Authorization:
          `Bearer ${token}`,
      };

      const [
        applicationResponse,
        introducerResponse,
      ] =
        await Promise.all([
          fetch(
            "/api/organisation/applications",
            {
              headers,
              cache: "no-store",
            }
          ),

          fetch(
            "/api/admin/introducers",
            {
              headers,
              cache: "no-store",
            }
          ),
        ]);

      const [
        applicationResult,
        introducerResult,
      ] =
        await Promise.all([
          applicationResponse.json(),
          introducerResponse.json(),
        ]);

      if (
        !applicationResponse.ok
      ) {
        throw new Error(
          applicationResult?.error ||
            "Root could not load Workplace applications."
        );
      }

      if (
        !introducerResponse.ok ||
        !introducerResult?.success
      ) {
        throw new Error(
          introducerResult?.error ||
            "Root could not load introducers."
        );
      }

      setApplications(
        applicationResult
          ?.applications ||
          []
      );

      setIntroducers(
        introducerResult
          ?.introducers ||
          []
      );

      setLoading(false);
    } catch (loadError) {
      console.error(
        "ROOT GLOBAL ADMIN LOAD ERROR:",
        loadError
      );

      setError(
        loadError?.message ||
          "Root Global Admin could not load."
      );

      setLoading(false);
    }
  }

  async function loadAuthDiagnostic() {
    try {
      const token = await getAccessToken();
      if (!token) {
        setAuthDiagnostic(null);
        return;
      }

      const response = await fetch(
        "/api/admin/debug-auth",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        }
      );
      const result = await response.json();

      setAuthDiagnostic(
        response.ok && result?.ok
          ? result
          : null
      );
    } catch (diagnosticError) {
      console.error(
        "ROOT ADMIN AUTH DIAGNOSTIC ERROR:",
        diagnosticError
      );
      setAuthDiagnostic(null);
    }
  }

  useEffect(() => {
    loadAdmin();
    loadAuthDiagnostic();
  }, []);

  const summary =
    useMemo(() => {
      const trialApplications =
        applications.filter(
          (application) =>
            String(
              application
                .access_path ||
                "trial"
            )
              .trim()
              .toLowerCase() !==
            "paid"
        );

      const trialsAwaitingReview =
        trialApplications.filter(
          (application) =>
            application.status ===
            "pending"
        ).length;

      const paidMemberships =
        applications.filter(
          (application) =>
            String(
              application
                .access_path ||
                ""
            )
              .trim()
              .toLowerCase() ===
            "paid"
        );

      const paidConfirmed =
        paidMemberships.filter(
          (application) =>
            String(
              application
                .payment_status ||
                ""
            )
              .trim()
              .toLowerCase() ===
            "paid"
        ).length;

      const paidAwaitingPayment =
        paidMemberships.filter(
          (application) =>
            String(
              application
                .payment_status ||
                ""
            )
              .trim()
              .toLowerCase() !==
            "paid"
        ).length;

      const commissionDue =
        introducers.reduce(
          (total, introducer) =>
            total +
            Number(
              introducer
                .commission_due ||
                0
            ),
          0
        );

      const commissionDueCount =
        introducers.reduce(
          (total, introducer) =>
            total +
            Number(
              introducer
                .commission_due_count ||
                0
            ),
          0
        );

      const commissionUpcoming =
        introducers.reduce(
          (total, introducer) =>
            total +
            Number(
              introducer
                .commission_upcoming ||
                0
            ),
          0
        );

      const commissionUpcomingCount =
        introducers.reduce(
          (total, introducer) =>
            total +
            Number(
              introducer
                .commission_upcoming_count ||
                0
            ),
          0
        );

      return {
        trialsAwaitingReview,
        paidConfirmed,
        paidAwaitingPayment,
        commissionDue,
        commissionDueCount,
        commissionUpcoming,
        commissionUpcomingCount,
      };
    }, [
      applications,
      introducers,
    ]);

  const hasAttention =
    summary.trialsAwaitingReview >
      0 ||
    summary.commissionDueCount >
      0 ||
    summary.commissionUpcomingCount >
      0;

  return (
    <main style={styles.page}>
      <section style={styles.shell}>
        <div style={styles.topRow}>
          <div>
            <p style={styles.kicker}>
              ROOT
            </p>

            <h1 style={styles.title}>
              Global Admin
            </h1>

            <p style={styles.intro}>
              One place to run Root,
              see what needs attention
              and reach every operational
              workspace.
            </p>
          </div>

          <button
            type="button"
            style={styles.refreshButton}
            onClick={loadAdmin}
          >
            Refresh
          </button>
        </div>

        {error ? (
          <div style={styles.error}>
            {error}

            {error.includes(
              "sign in"
            ) ? (
              <button
                type="button"
                style={
                  styles.signInButton
                }
                onClick={() => {
                  window.location.href =
                    "/login";
                }}
              >
                Sign in
              </button>
            ) : null}
          </div>
        ) : null}

        {authDiagnostic ? (
          <section style={styles.diagnosticPanel}>
            <p style={styles.sectionKicker}>
              TEMPORARY AUTH DIAGNOSTIC
            </p>
            <dl style={styles.diagnosticGrid}>
              <div>
                <dt style={styles.diagnosticLabel}>Authenticated user ID</dt>
                <dd style={styles.diagnosticValue}>{authDiagnostic.user.id}</dd>
              </div>
              <div>
                <dt style={styles.diagnosticLabel}>Authenticated email</dt>
                <dd style={styles.diagnosticValue}>{authDiagnostic.user.email || "(empty)"}</dd>
              </div>
              <div>
                <dt style={styles.diagnosticLabel}>Runtime allowlist present</dt>
                <dd style={styles.diagnosticValue}>{authDiagnostic.rootAdminEmailPresent ? "Yes" : "No"}</dd>
              </div>
              <div>
                <dt style={styles.diagnosticLabel}>Runtime allowlist</dt>
                <dd style={styles.diagnosticValue}>
                  {authDiagnostic.allowlistEmails.length
                    ? authDiagnostic.allowlistEmails.join(", ")
                    : "(empty)"}
                </dd>
              </div>
              <div>
                <dt style={styles.diagnosticLabel}>Exact match</dt>
                <dd style={styles.diagnosticValue}>{authDiagnostic.matchesAllowlist ? "Yes" : "No"}</dd>
              </div>
              <div>
                <dt style={styles.diagnosticLabel}>Supabase project ref</dt>
                <dd style={styles.diagnosticValue}>{authDiagnostic.supabaseProjectRef || "(unavailable)"}</dd>
              </div>
            </dl>
          </section>
        ) : null}

        {loading ? (
          <div style={styles.loading}>
            Root is checking what
            needs your attention...
          </div>
        ) : null}

        {!loading &&
        !error ? (
          <>
            <section
              style={
                hasAttention
                  ? styles.attentionPanel
                  : styles.clearPanel
              }
            >
              <div
                style={
                  styles.attentionHeading
                }
              >
                <span
                  style={
                    styles.attentionIcon
                  }
                >
                  {hasAttention
                    ? "🔔"
                    : "✓"}
                </span>

                <div>
                  <p
                    style={
                      styles.sectionKicker
                    }
                  >
                    ATTENTION
                  </p>

                  <h2
                    style={
                      styles.attentionTitle
                    }
                  >
                    {hasAttention
                      ? "Root needs you."
                      : "Nothing needs your attention."}
                  </h2>
                </div>
              </div>

              {hasAttention ? (
                <div
                  style={
                    styles.attentionGrid
                  }
                >
                  {summary
                    .trialsAwaitingReview >
                  0 ? (
                    <AttentionItem
                      icon="📋"
                      title={`${summary.trialsAwaitingReview} pilot ${
                        summary.trialsAwaitingReview ===
                        1
                          ? "application"
                          : "applications"
                      } awaiting review`}
                      href="/workplace-applications"
                    />
                  ) : null}

                  {summary
                    .commissionDueCount >
                  0 ? (
                    <AttentionItem
                      icon="💷"
                      title={`${money(
                        summary.commissionDue
                      )} commission due`}
                      subtitle={`${summary.commissionDueCount} ${
                        summary.commissionDueCount ===
                        1
                          ? "payment"
                          : "payments"
                      } ready for settlement`}
                      href="/admin/introducers"
                    />
                  ) : null}

                  {summary
                    .commissionUpcomingCount >
                    0 &&
                  summary
                    .commissionDueCount ===
                    0 ? (
                    <AttentionItem
                      icon="⏳"
                      title={`${money(
                        summary.commissionUpcoming
                      )} commission approaching`}
                      subtitle="Due within the next 7 days"
                      href="/admin/introducers"
                    />
                  ) : null}
                </div>
              ) : (
                <p
                  style={
                    styles.clearText
                  }
                >
                  Applications and
                  introducer payments are
                  currently clear.
                </p>
              )}
            </section>

            <div
              style={
                styles.snapshotGrid
              }
            >
              <Snapshot
                label="Pilot review"
                value={
                  summary
                    .trialsAwaitingReview
                }
                note="Awaiting decision"
              />

              <Snapshot
                label="Paid memberships"
                value={
                  summary.paidConfirmed
                }
                note="Payment confirmed"
              />

              <Snapshot
                label="Awaiting payment"
                value={
                  summary
                    .paidAwaitingPayment
                }
                note="Direct membership"
              />

              <Snapshot
                label="Commission due"
                value={money(
                  summary.commissionDue
                )}
                note="Manual settlement"
              />
            </div>

            <AdminSection
              kicker="ORGANISATIONS"
              title="Workplace operations"
            >
              <AdminCard
                icon="📋"
                title="Applications"
                description="Review complimentary pilots and view direct paid membership history."
                href="/workplace-applications"
                badge={
                  summary
                    .trialsAwaitingReview >
                  0
                    ? `${summary.trialsAwaitingReview} awaiting review`
                    : null
                }
              />

              <AdminCard
                icon="🏢"
                title="Organisation setup"
                description="Open the secure Root Workplace organisation setup journey."
                href="/workplace-setup"
                secondary
              />

              <AdminCard
                icon="💳"
                title="Workplace membership"
                description="View the Root Workplace membership journey and commercial entry point."
                href="/organisations/membership"
              />
            </AdminSection>

            <AdminSection
              kicker="COMMERCIAL"
              title="Revenue & partners"
            >
              <AdminCard
                icon="🤝"
                title="Introducers"
                description="Manage partners, referral codes, campaigns, commission terms and payments."
                href="/admin/introducers"
                badge={
                  summary
                    .commissionDueCount >
                  0
                    ? `${money(
                        summary.commissionDue
                      )} due`
                    : null
                }
              />

              <AdminCard
                icon="🔗"
                title="Referral campaigns"
                description="Create permanent introducer and campaign links from the Introducers workspace."
                href="/admin/introducers"
              />

              <AdminCard
                icon="💰"
                title="Commission ledger"
                description="See earned, outstanding, upcoming and due introducer commission."
                href="/admin/introducers"
              />
            </AdminSection>

            <AdminSection
              kicker="ROOT ENTRY POINTS"
              title="Useful journeys"
            >
              <AdminCard
                icon="🌿"
                title="Workplace pricing"
                description="Open the public Root Workplace pricing journey."
                href="/organisations/pricing"
              />

              <AdminCard
                icon="🌱"
                title="Root welcome"
                description="Open the main Root welcome and personal entry journey."
                href="/organisations/welcome"
              />

              <AdminCard
                icon="👥"
                title="Employee join"
                description="Open the Workplace employee join journey."
                href="/organisation/join"
              />

              <AdminCard
                icon="🔐"
                title="Sign in"
                description="Open the main Root sign-in page."
                href="/login"
              />
            </AdminSection>

            <div style={styles.note}>
              <strong>
                Referral landing pages
              </strong>

              <span>
                Introducer URLs are deliberately
                generated inside the Introducers
                workspace because every valid
                referral page must carry its own
                <code style={styles.code}>
                  ?ref=
                </code>
                attribution and, where relevant,
                its campaign code.
              </span>
            </div>
          </>
        ) : null}
      </section>
    </main>
  );
}

function AdminSection({
  kicker,
  title,
  children,
}) {
  return (
    <section
      style={
        styles.adminSection
      }
    >
      <div
        style={
          styles.sectionHeading
        }
      >
        <p
          style={
            styles.sectionKicker
          }
        >
          {kicker}
        </p>

        <h2
          style={
            styles.sectionTitle
          }
        >
          {title}
        </h2>
      </div>

      <div
        style={
          styles.cardGrid
        }
      >
        {children}
      </div>
    </section>
  );
}

function AdminCard({
  icon,
  title,
  description,
  href,
  badge,
  secondary = false,
}) {
  return (
    <a
      href={href}
      style={{
        ...styles.adminCard,
        ...(secondary
          ? styles.secondaryCard
          : {}),
      }}
    >
      <div
        style={
          styles.cardTop
        }
      >
        <span
          style={
            styles.cardIcon
          }
        >
          {icon}
        </span>

        {badge ? (
          <span
            style={
              styles.badge
            }
          >
            {badge}
          </span>
        ) : null}
      </div>

      <h3
        style={
          styles.cardTitle
        }
      >
        {title}
      </h3>

      <p
        style={
          styles.cardText
        }
      >
        {description}
      </p>

      <span
        style={
          styles.openLink
        }
      >
        Open →
      </span>
    </a>
  );
}

function AttentionItem({
  icon,
  title,
  subtitle,
  href,
}) {
  return (
    <a
      href={href}
      style={
        styles.attentionItem
      }
    >
      <span
        style={
          styles.attentionItemIcon
        }
      >
        {icon}
      </span>

      <div>
        <strong>
          {title}
        </strong>

        {subtitle ? (
          <span
            style={
              styles.attentionSubtitle
            }
          >
            {subtitle}
          </span>
        ) : null}
      </div>

      <span
        style={
          styles.attentionArrow
        }
      >
        →
      </span>
    </a>
  );
}

function Snapshot({
  label,
  value,
  note,
}) {
  return (
    <div
      style={
        styles.snapshot
      }
    >
      <span
        style={
          styles.snapshotLabel
        }
      >
        {label}
      </span>

      <strong
        style={
          styles.snapshotValue
        }
      >
        {value}
      </strong>

      <span
        style={
          styles.snapshotNote
        }
      >
        {note}
      </span>
    </div>
  );
}

function money(value) {
  return Number(
    value || 0
  ).toLocaleString(
    "en-GB",
    {
      style: "currency",
      currency: "GBP",
    }
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    boxSizing: "border-box",
    padding: "50px 24px 90px",
    background:
      "radial-gradient(circle at 18% 0%, rgba(255,255,255,0.9), transparent 30%), linear-gradient(145deg, #EEF2E8 0%, #F8F5EE 54%, #E7EDE2 100%)",
    color: "#172018",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Arial, sans-serif',
  },

  shell: {
    width: "100%",
    maxWidth: "1180px",
    margin: "0 auto",
  },

  topRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "24px",
    flexWrap: "wrap",
  },

  kicker: {
    margin: "0 0 12px",
    color: "#657264",
    fontSize: "11px",
    fontWeight: "900",
    letterSpacing: "0.18em",
  },

  title: {
    margin: 0,
    fontFamily:
      "Georgia, serif",
    fontSize:
      "clamp(52px, 8vw, 82px)",
    fontWeight: "500",
    letterSpacing: "-0.055em",
    lineHeight: 0.98,
  },

  intro: {
    maxWidth: "670px",
    margin: "22px 0 0",
    color: "#5D665E",
    fontSize: "18px",
    lineHeight: 1.7,
  },

  refreshButton: {
    border:
      "1px solid rgba(38,59,43,0.14)",
    borderRadius: "999px",
    padding: "13px 19px",
    background:
      "rgba(255,255,255,0.65)",
    color: "#263B2B",
    cursor: "pointer",
    fontWeight: "800",
  },

  error: {
    marginTop: "28px",
    padding: "18px 20px",
    borderRadius: "20px",
    background: "#F7E4E1",
    color: "#8B2A22",
    fontWeight: "800",
  },

  diagnosticPanel: {
    marginTop: "18px",
    padding: "20px",
    borderRadius: "20px",
    background: "rgba(255,255,255,0.7)",
    border: "1px solid rgba(38,59,43,0.12)",
  },

  diagnosticGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
    margin: "16px 0 0",
  },

  diagnosticLabel: {
    color: "#6D786F",
    fontSize: "10px",
    fontWeight: "900",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },

  diagnosticValue: {
    margin: "6px 0 0",
    color: "#263B2B",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: "12px",
    lineHeight: 1.5,
    overflowWrap: "anywhere",
  },

  signInButton: {
    marginLeft: "16px",
    border: "none",
    borderRadius: "999px",
    padding: "9px 14px",
    background: "#263B2B",
    color: "#FFFFFF",
    cursor: "pointer",
    fontWeight: "800",
  },

  loading: {
    marginTop: "34px",
    padding: "26px",
    borderRadius: "26px",
    background:
      "rgba(255,255,255,0.62)",
    color: "#657264",
  },

  attentionPanel: {
    marginTop: "36px",
    padding: "28px",
    borderRadius: "30px",
    background:
      "linear-gradient(135deg, #FFF0D8 0%, #F7DFC2 100%)",
    border:
      "1px solid rgba(150,91,29,0.14)",
    boxShadow:
      "0 20px 54px rgba(91,57,22,0.09)",
  },

  clearPanel: {
    marginTop: "36px",
    padding: "28px",
    borderRadius: "30px",
    background:
      "rgba(255,255,255,0.64)",
    border:
      "1px solid rgba(255,255,255,0.9)",
  },

  attentionHeading: {
    display: "flex",
    alignItems: "center",
    gap: "17px",
  },

  attentionIcon: {
    width: "54px",
    height: "54px",
    borderRadius: "18px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "rgba(255,255,255,0.72)",
    fontSize: "25px",
  },

  attentionTitle: {
    margin: "4px 0 0",
    fontFamily:
      "Georgia, serif",
    fontSize: "29px",
    fontWeight: "500",
  },

  attentionGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "12px",
    marginTop: "22px",
  },

  attentionItem: {
    textDecoration: "none",
    color: "#263B2B",
    padding: "17px",
    borderRadius: "19px",
    background:
      "rgba(255,255,255,0.68)",
    display: "grid",
    gridTemplateColumns:
      "auto 1fr auto",
    alignItems: "center",
    gap: "12px",
  },

  attentionItemIcon: {
    fontSize: "22px",
  },

  attentionSubtitle: {
    display: "block",
    marginTop: "4px",
    color: "#747068",
    fontSize: "12px",
  },

  attentionArrow: {
    fontSize: "20px",
  },

  clearText: {
    margin:
      "18px 0 0 71px",
    color: "#657264",
  },

  snapshotGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "14px",
    marginTop: "18px",
  },

  snapshot: {
    padding: "22px",
    borderRadius: "24px",
    background:
      "rgba(255,255,255,0.62)",
    border:
      "1px solid rgba(255,255,255,0.9)",
  },

  snapshotLabel: {
    display: "block",
    color: "#6D786F",
    fontSize: "10px",
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
  },

  snapshotValue: {
    display: "block",
    marginTop: "9px",
    fontFamily:
      "Georgia, serif",
    fontSize: "28px",
    fontWeight: "500",
  },

  snapshotNote: {
    display: "block",
    marginTop: "6px",
    color: "#7B817A",
    fontSize: "12px",
  },

  adminSection: {
    marginTop: "58px",
  },

  sectionHeading: {
    marginBottom: "18px",
  },

  sectionKicker: {
    margin: 0,
    color: "#657264",
    fontSize: "10px",
    fontWeight: "900",
    letterSpacing: "0.15em",
  },

  sectionTitle: {
    margin: "7px 0 0",
    fontFamily:
      "Georgia, serif",
    fontSize:
      "clamp(28px, 4vw, 38px)",
    fontWeight: "500",
  },

  cardGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "16px",
  },

  adminCard: {
    minHeight: "210px",
    boxSizing: "border-box",
    padding: "25px",
    borderRadius: "28px",
    background:
      "rgba(255,255,255,0.68)",
    border:
      "1px solid rgba(255,255,255,0.92)",
    textDecoration: "none",
    color: "#172018",
    boxShadow:
      "0 18px 48px rgba(38,59,43,0.065)",
    display: "flex",
    flexDirection: "column",
  },

  secondaryCard: {
    background:
      "rgba(237,241,232,0.82)",
  },

  cardTop: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    gap: "12px",
  },

  cardIcon: {
    fontSize: "29px",
  },

  badge: {
    padding: "7px 10px",
    borderRadius: "999px",
    background: "#FFF0D8",
    color: "#8B5422",
    fontSize: "10px",
    fontWeight: "900",
  },

  cardTitle: {
    margin: "20px 0 8px",
    fontFamily:
      "Georgia, serif",
    fontSize: "25px",
    fontWeight: "500",
  },

  cardText: {
    margin: 0,
    color: "#646D65",
    lineHeight: 1.6,
    fontSize: "14px",
  },

  openLink: {
    marginTop: "auto",
    paddingTop: "22px",
    color: "#263B2B",
    fontWeight: "900",
    fontSize: "13px",
  },

  note: {
    marginTop: "52px",
    padding: "22px 24px",
    borderRadius: "22px",
    background:
      "rgba(38,59,43,0.06)",
    color: "#606960",
    lineHeight: 1.65,
    display: "grid",
    gap: "7px",
  },

  code: {
    margin: "0 4px",
    padding: "2px 5px",
    borderRadius: "5px",
    background:
      "rgba(255,255,255,0.7)",
  },
};
