"use client";

import {
  useEffect,
  useState,
} from "react";

import { supabase } from "../../lib/supabase";

export default function WorkplaceApplicationsPage() {
  const [
    applications,
    setApplications,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    approvingId,
    setApprovingId,
  ] = useState(null);

  const [
    error,
    setError,
  ] = useState("");

  const [
    message,
    setMessage,
  ] = useState("");

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

  async function loadApplications() {
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

      const response =
        await fetch(
          "/api/organisation/applications",
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result?.success
      ) {
        setError(
          result?.error ||
          "Root could not load applications."
        );

        setLoading(false);
        return;
      }

      setApplications(
        result.applications ||
        []
      );

      setLoading(false);
    } catch (loadError) {
      console.error(
        "ROOT APPLICATION PAGE LOAD ERROR:",
        loadError
      );

      setError(
        "Root could not load Workplace applications."
      );

      setLoading(false);
    }
  }

  async function approveApplication(
    applicationId
  ) {
    const confirmed =
      window.confirm(
        "Approve this organisation and send the authorised contact their secure Root Workplace setup invitation?"
      );

    if (!confirmed) {
      return;
    }

    setApprovingId(
      applicationId
    );

    setError("");
    setMessage("");

    try {
      const token =
        await getAccessToken();

      if (!token) {
        setError(
          "Please sign in again before approving an application."
        );

        setApprovingId(null);
        return;
      }

      const response =
        await fetch(
          "/api/organisation/applications",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${token}`,
            },

            body:
              JSON.stringify({
                applicationId,
              }),
          }
        );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result?.success
      ) {
        setError(
          result?.error ||
          "Root could not approve this application."
        );

        setApprovingId(null);
        return;
      }

      setMessage(
        `Approved. Root has sent the secure Workplace setup access email to ${result.application.admin_email}.`
      );

      setApprovingId(null);

      await loadApplications();
    } catch (approveError) {
      console.error(
        "ROOT APPLICATION APPROVAL ERROR:",
        approveError
      );

      setError(
        "Root could not approve this application."
      );

      setApprovingId(null);
    }
  }

  useEffect(() => {
    loadApplications();
  }, []);

  const pending =
    applications.filter(
      (application) =>
        application.status ===
        "pending"
    );

  const reviewed =
    applications.filter(
      (application) =>
        application.status !==
        "pending"
    );

  return (
    <main style={styles.page}>
      <section style={styles.shell}>
        <div style={styles.topRow}>
          <div>
            <p style={styles.kicker}>
              ROOT WORKPLACE
            </p>

            <h1 style={styles.title}>
              Applications
            </h1>

            <p style={styles.intro}>
              Review organisations
              applying for a supported
              Root Workplace pilot.
            </p>
          </div>

          <button
            type="button"
            style={styles.refreshButton}
            onClick={
              loadApplications
            }
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

        {message ? (
          <div
            style={
              styles.success
            }
          >
            {message}
          </div>
        ) : null}

        {loading ? (
          <div
            style={
              styles.loadingCard
            }
          >
            Loading applications...
          </div>
        ) : null}

        {!loading ? (
          <>
            <div
              style={
                styles.sectionHeading
              }
            >
              <div>
                <p
                  style={
                    styles.sectionKicker
                  }
                >
                  AWAITING REVIEW
                </p>

                <h2
                  style={
                    styles.sectionTitle
                  }
                >
                  Pending applications
                </h2>
              </div>

              <span
                style={
                  styles.countBadge
                }
              >
                {pending.length}
              </span>
            </div>

            {pending.length ===
            0 ? (
              <div
                style={
                  styles.emptyCard
                }
              >
                No applications are
                currently waiting for
                review.
              </div>
            ) : (
              <div
                style={
                  styles.grid
                }
              >
                {pending.map(
                  (
                    application
                  ) => (
                    <article
                      key={
                        application.id
                      }
                      style={
                        styles.card
                      }
                    >
                      <div
                        style={
                          styles.cardTop
                        }
                      >
                        <span
                          style={
                            styles.pendingBadge
                          }
                        >
                          Pending
                        </span>

                        <span
                          style={
                            styles.date
                          }
                        >
                          {new Date(
                            application.created_at
                          ).toLocaleDateString(
                            "en-GB"
                          )}
                        </span>
                      </div>

                      <h3
                        style={
                          styles.organisationName
                        }
                      >
                        {
                          application.organisation_name
                        }
                      </h3>

                      <div
                        style={
                          styles.details
                        }
                      >
                        <p>
                          <strong>
                            Contact
                          </strong>
                          <br />
                          {
                            application.contact_name
                          }
                        </p>

                        <p>
  <strong>
    Organisation contact
  </strong>
  <br />
  {
    application.contact_email
  }
</p>

<p>
  <strong>
    Root administrator
  </strong>
  <br />
  {
    application.admin_email ||
    application.contact_email
  }
</p>

                        <p>
                          <strong>
                            Employees
                          </strong>
                          <br />
                          {
                            application.employee_count ||
                            "Not supplied"
                          }
                        </p>

                        <p>
                          <strong>
                            Industry
                          </strong>
                          <br />
                          {
                            application.industry ||
                            "Not supplied"
                          }
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={
                          approvingId ===
                          application.id
                        }
                        style={{
                          ...styles.approveButton,

                          ...(approvingId ===
                          application.id
                            ? styles.approveButtonDisabled
                            : {}),
                        }}
                        onClick={() =>
                          approveApplication(
                            application.id
                          )
                        }
                      >
                        {approvingId ===
                        application.id
                          ? "Approving..."
                          : "Approve & send setup invitation"}
                      </button>
                    </article>
                  )
                )}
              </div>
            )}

            <div
              style={{
                ...styles.sectionHeading,
                marginTop:
                  "58px",
              }}
            >
              <div>
                <p
                  style={
                    styles.sectionKicker
                  }
                >
                  HISTORY
                </p>

                <h2
                  style={
                    styles.sectionTitle
                  }
                >
                  Reviewed applications
                </h2>
              </div>

              <span
                style={
                  styles.countBadge
                }
              >
                {reviewed.length}
              </span>
            </div>

            {reviewed.length >
            0 ? (
              <div
                style={
                  styles.reviewedList
                }
              >
                {reviewed.map(
                  (
                    application
                  ) => (
                    <div
                      key={
                        application.id
                      }
                      style={
                        styles.reviewedRow
                      }
                    >
                      <div>
                        <strong>
                          {
                            application.organisation_name
                          }
                        </strong>

                        <span
                          style={
                            styles.reviewedEmail
                          }
                        >
                          {
                            application.contact_email
                          }
                        </span>
                      </div>

                      <span
                        style={
                          styles.approvedBadge
                        }
                      >
                        {
                          application.status
                        }
                      </span>
                    </div>
                  )
                )}
              </div>
            ) : (
              <div
                style={
                  styles.emptyCard
                }
              >
                No reviewed applications
                yet.
              </div>
            )}
          </>
        ) : null}
      </section>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    padding: "48px 24px",
    boxSizing: "border-box",
    background:
      "linear-gradient(145deg, #EEF2E8 0%, #F8F5EE 54%, #E7EDE2 100%)",
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
    justifyContent:
      "space-between",
    alignItems:
      "flex-start",
    gap: "24px",
  },

  kicker: {
    margin: "0 0 12px",
    color: "#657264",
    fontSize: "11px",
    fontWeight: "900",
    letterSpacing: "0.16em",
  },

  title: {
    margin: 0,
    fontFamily:
      "Georgia, serif",
    fontSize:
      "clamp(48px, 7vw, 78px)",
    fontWeight: "500",
    letterSpacing:
      "-0.05em",
  },

  intro: {
    maxWidth: "650px",
    margin:
      "18px 0 0",
    color: "#5D665E",
    fontSize: "18px",
    lineHeight: 1.7,
  },

  refreshButton: {
    border:
      "1px solid rgba(38,59,43,0.14)",
    borderRadius: "999px",
    padding:
      "12px 18px",
    background:
      "rgba(255,255,255,0.62)",
    color: "#263B2B",
    cursor: "pointer",
    fontWeight: "800",
  },

  error: {
    marginTop: "28px",
    padding: "18px 20px",
    borderRadius: "18px",
    background: "#F7E4E1",
    color: "#8B2A22",
    fontWeight: "800",
  },

  success: {
    marginTop: "28px",
    padding: "18px 20px",
    borderRadius: "18px",
    background: "#DDEBDC",
    color: "#31503A",
    fontWeight: "800",
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

  loadingCard: {
    marginTop: "35px",
    padding: "28px",
    borderRadius: "24px",
    background:
      "rgba(255,255,255,0.6)",
  },

  sectionHeading: {
    marginTop: "52px",
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "end",
    gap: "20px",
  },

  sectionKicker: {
    margin: "0 0 8px",
    color: "#657264",
    fontSize: "10px",
    fontWeight: "900",
    letterSpacing: "0.15em",
  },

  sectionTitle: {
    margin: 0,
    fontFamily:
      "Georgia, serif",
    fontSize: "32px",
    fontWeight: "500",
  },

  countBadge: {
    minWidth: "42px",
    height: "42px",
    borderRadius: "999px",
    display: "grid",
    placeItems: "center",
    background: "#263B2B",
    color: "#FFFFFF",
    fontWeight: "900",
  },

  grid: {
    marginTop: "20px",
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "18px",
  },

  card: {
    padding: "27px",
    borderRadius: "28px",
    background:
      "rgba(255,255,255,0.76)",
    border:
      "1px solid rgba(255,255,255,0.9)",
    boxShadow:
      "0 22px 58px rgba(41,55,40,0.08)",
  },

  cardTop: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    gap: "12px",
  },

  pendingBadge: {
    padding: "7px 11px",
    borderRadius: "999px",
    background: "#F0E6C8",
    color: "#725E25",
    fontSize: "11px",
    fontWeight: "900",
  },

  date: {
    color: "#788078",
    fontSize: "12px",
  },

  organisationName: {
    margin: "27px 0 20px",
    fontFamily:
      "Georgia, serif",
    fontSize: "31px",
    fontWeight: "500",
  },

  details: {
    color: "#566157",
    fontSize: "14px",
    lineHeight: 1.6,
  },

  approveButton: {
    width: "100%",
    marginTop: "19px",
    border: "none",
    borderRadius: "999px",
    padding: "14px 18px",
    background: "#263B2B",
    color: "#FFFFFF",
    cursor: "pointer",
    fontWeight: "900",
  },

  approveButtonDisabled: {
    opacity: 0.55,
    cursor: "wait",
  },

  emptyCard: {
    marginTop: "20px",
    padding: "28px",
    borderRadius: "24px",
    background:
      "rgba(255,255,255,0.55)",
    color: "#687168",
  },

  reviewedList: {
    marginTop: "20px",
    display: "grid",
    gap: "10px",
  },

  reviewedRow: {
    padding:
      "17px 19px",
    borderRadius: "18px",
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    gap: "18px",
    background:
      "rgba(255,255,255,0.58)",
  },

  reviewedEmail: {
    display: "block",
    marginTop: "4px",
    color: "#707970",
    fontSize: "12px",
  },

  approvedBadge: {
    padding: "7px 11px",
    borderRadius: "999px",
    background: "#DDEBDC",
    color: "#31503A",
    fontSize: "11px",
    fontWeight: "900",
    textTransform:
      "capitalize",
  },
};
