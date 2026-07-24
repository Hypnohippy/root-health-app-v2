"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import Nav from "../../components/Nav";
import RootAtmosphere from "../../components/RootAtmosphere";
import RootEnso from "../../components/RootEnso";
import { buildOrganisationSnapshot } from "../../lib/rootOrganisationEngine";
import { buildLaunchMaterial } from "../../lib/rootLaunchMaterialEngine";

const MATERIALS = [
  {
    key: "employee-email",
    label: "Employee Email",
    icon: "✉️",
  },
  {
    key: "manager-briefing",
    label: "Manager Briefing",
    icon: "👥",
  },
  {
    key: "launch-poster",
    label: "Launch Poster",
    icon: "📄",
  },
  {
    key: "leadership-talking-points",
    label: "Leadership Talking Points",
    icon: "🎤",
  },
];


export default function LaunchKitPage() {
  const [loading, setLoading] = useState(true);
  const [organisation, setOrganisation] = useState(null);
  const [snapshot, setSnapshot] = useState(null);

  const [selectedType, setSelectedType] =
    useState("employee-email");

  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const requestedType = params.get("type");

    if (
      requestedType &&
      MATERIALS.some((item) => item.key === requestedType)
    ) {
      setSelectedType(requestedType);
    }

    loadLaunchKit();
  }, []);

  async function loadLaunchKit() {
    setLoading(true);
    setErrorMessage("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        window.location.href = "/login";
        return;
      }

      const { data: membership, error: membershipError } =
        await supabase
          .from("organisation_members")
          .select(
            "id, organisation_id, profile_key, email, name, department, role"
          )
          .eq("user_id", user.id)
          .maybeSingle();

      if (membershipError || !membership) {
        await supabase.auth.signOut();
        window.location.href = "/login";
        return;
      }

      const allowedRoles = [
        "hr_admin",
        "organisation_admin",
      ];

      if (!allowedRoles.includes(membership.role)) {
        window.location.href = "/";
        return;
      }

      const organisationId = membership.organisation_id;

      const [
        organisationResult,
        membersResult,
        assessmentsResult,
        mindResult,
        journalResult,
        voiceResult,
      ] = await Promise.all([
        supabase
          .from("organisations")
          .select("*")
          .eq("id", organisationId)
          .maybeSingle(),

        supabase
          .from("organisation_members")
          .select("*")
          .eq("organisation_id", organisationId),

        supabase
          .from("wellbeing_assessments")
          .select("*")
          .eq("organisation_id", organisationId)
          .order("created_at", { ascending: true }),

        supabase
          .from("mind_entries")
          .select("*")
          .eq("organisation_id", organisationId)
          .order("created_at", { ascending: false })
          .limit(200),

        supabase
          .from("journal_entries")
          .select("*")
          .eq("organisation_id", organisationId)
          .order("created_at", { ascending: false })
          .limit(200),

        supabase
          .from("voice_sessions")
          .select("*")
          .eq("organisation_id", organisationId)
          .order("created_at", { ascending: false })
          .limit(200),
      ]);

      if (organisationResult.error) {
        throw organisationResult.error;
      }

      const loadedOrganisation =
        organisationResult.data || null;

      const organisationSnapshot =
        buildOrganisationSnapshot({
          organisation: loadedOrganisation,

          members: Array.isArray(membersResult.data)
            ? membersResult.data
            : [],

          assessments: Array.isArray(assessmentsResult.data)
            ? assessmentsResult.data
            : [],

          mindEntries: Array.isArray(mindResult.data)
            ? mindResult.data
            : [],

          journalEntries: Array.isArray(journalResult.data)
            ? journalResult.data
            : [],

          voiceSessions: Array.isArray(voiceResult.data)
            ? voiceResult.data
            : [],
        });

      setOrganisation(loadedOrganisation);
      setSnapshot(organisationSnapshot);
    } catch (error) {
      console.error("Launch Kit load error:", error);

      setErrorMessage(
        "Root could not prepare the Launch Kit. Please return to Organisation Insights and try again."
      );
    } finally {
      setLoading(false);
    }
  }

  const material = useMemo(() => {
    if (!snapshot) return null;

    return buildLaunchMaterial({
      type: selectedType,
      organisation,
      initiative: snapshot.initiative,
      snapshot,
    });
  }, [selectedType, organisation, snapshot]);

  async function copyMaterial() {
    if (!material?.content) return;

    try {
      await navigator.clipboard.writeText(material.content);

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch (error) {
      console.error("Copy failed:", error);

      alert(
        "The material could not be copied automatically. Please select the text and copy it manually."
      );
    }
  }

  function downloadMaterial() {
    if (!material?.content) return;

    const fileName = `${selectedType}-${
      snapshot?.initiative?.key || "root-launch-kit"
    }.txt`;

    const blob = new Blob([material.content], {
      type: "text/plain;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = fileName;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

  function printMaterial() {
    if (!material?.content) return;

    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      alert(
        "Your browser blocked the print window. Please allow pop-ups and try again."
      );

      return;
    }

    const safeTitle = material.title.replaceAll("<", "&lt;");
    const safeContent = material.content
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>${safeTitle}</title>

          <style>
            body {
              margin: 0;
              padding: 48px;
              font-family: Arial, Helvetica, sans-serif;
              color: #181818;
              background: #ffffff;
            }

            .document {
              max-width: 820px;
              margin: 0 auto;
            }

            .brand {
              margin-bottom: 28px;
              font-size: 12px;
              font-weight: 800;
              letter-spacing: 0.14em;
              text-transform: uppercase;
              color: #756c5e;
            }

            pre {
              white-space: pre-wrap;
              overflow-wrap: anywhere;
              font-family: Arial, Helvetica, sans-serif;
              font-size: 15px;
              line-height: 1.75;
            }
          </style>
        </head>

        <body>
          <div class="document">
            <div class="brand">Root Health Launch Kit</div>
            <pre>${safeContent}</pre>
          </div>

          <script>
            window.onload = function () {
              window.print();
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  }

  return (
    <RootAtmosphere type="coach">
      <Nav />

      <main style={styles.page}>
        <section style={styles.shell}>
          <header style={styles.header}>
            <RootEnso size={86} />

            <p style={styles.kicker}>Root Health</p>

            <h1 style={styles.title}>Launch Kit</h1>

            <p style={styles.subtitle}>
              Practical internal materials prepared around Root&apos;s
              recommended organisational initiative.
            </p>
          </header>

          {loading ? (
            <section style={styles.loadingCard}>
              <p style={styles.loading}>
                Preparing your organisation&apos;s Launch Kit...
              </p>
            </section>
          ) : errorMessage ? (
            <section style={styles.errorCard}>
              <h2 style={styles.errorTitle}>
                Launch Kit unavailable
              </h2>

              <p style={styles.errorText}>{errorMessage}</p>

              <button
                type="button"
                style={styles.primaryButton}
                onClick={() => {
                  window.location.href = "/org-insights";
                }}
              >
                Return to Organisation Insights
              </button>
            </section>
          ) : (
            <>
              <section style={styles.initiativeCard}>
                <div>
                  <p style={styles.panelLabel}>
                    Recommended Initiative
                  </p>

                  <h2 style={styles.initiativeTitle}>
                    {snapshot?.initiative?.title ||
                      "Wellbeing Initiative"}
                  </h2>

                  <p style={styles.initiativeText}>
                    {snapshot?.initiative?.introduction}
                  </p>
                </div>

                <div style={styles.initiativeMeta}>
                  <span style={styles.statusBadge}>
                    {snapshot?.initiative?.status ||
                      "Ready to prepare"}
                  </span>

                  <span style={styles.confidenceBadge}>
                    Evidence:{" "}
                    {snapshot?.confidenceLabel || "Early Stage"}
                  </span>
                </div>
              </section>

              <section style={styles.workspace}>
                <aside style={styles.materialMenu}>
                  <p style={styles.menuLabel}>Launch materials</p>

                  <div style={styles.materialList}>
                    {MATERIALS.map((item) => {
                      const selected =
                        selectedType === item.key;

                      return (
                        <button
                          key={item.key}
                          type="button"
                          style={{
                            ...styles.materialButton,
                            ...(selected
                              ? styles.materialButtonSelected
                              : {}),
                          }}
                          onClick={() => {
                            setSelectedType(item.key);

                            const params =
                              new URLSearchParams(
                                window.location.search
                              );

                            params.set("type", item.key);

                            window.history.replaceState(
                              {},
                              "",
                              `${window.location.pathname}?${params.toString()}`
                            );
                          }}
                        >
                          <span style={styles.materialIcon}>
                            {item.icon}
                          </span>

                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    style={styles.backButton}
                    onClick={() => {
                      window.location.href = "/org-insights";
                    }}
                  >
                    ← Organisation Insights
                  </button>
                </aside>

                <section style={styles.documentPanel}>
                  <div style={styles.documentHeader}>
                    <div>
                      <p style={styles.panelLabel}>
                        Prepared Material
                      </p>

                      <h2 style={styles.documentTitle}>
                        {material?.title}
                      </h2>

                      {material?.subject && (
                        <p style={styles.documentSubject}>
                          {material.subject}
                        </p>
                      )}
                    </div>

                    <div style={styles.actionButtons}>
                      <button
                        type="button"
                        style={styles.secondaryButton}
                        onClick={copyMaterial}
                      >
                        {copied ? "✓ Copied" : "Copy"}
                      </button>

                      <button
                        type="button"
                        style={styles.secondaryButton}
                        onClick={downloadMaterial}
                      >
                        Download
                      </button>

                      <button
                        type="button"
                        style={styles.primaryButton}
                        onClick={printMaterial}
                      >
                        Print
                      </button>
                    </div>
                  </div>

                  <div style={styles.documentBody}>
                    <pre style={styles.documentText}>
                      {material?.content}
                    </pre>
                  </div>

                  <div style={styles.documentFooter}>
                    <strong>Root reminder</strong>

                    <span>
                      Review names, dates and internal contact details
                      before distributing this material.
                    </span>
                  </div>
                </section>
              </section>
            </>
          )}
        </section>
      </main>
    </RootAtmosphere>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    padding: "28px",
    display: "flex",
    justifyContent: "center",
  },

  shell: {
    width: "100%",
    maxWidth: "1220px",
    padding: "38px",
    borderRadius: "42px",
    background: "rgba(255,255,255,0.34)",
    border: "1px solid rgba(255,255,255,0.52)",
    backdropFilter: "blur(22px)",
    boxShadow: "0 34px 100px rgba(20,18,15,0.18)",
  },

  header: {
    textAlign: "center",
    marginBottom: "28px",
  },

  kicker: {
    margin: "10px 0",
    color: "#6F675B",
    fontSize: "12px",
    fontWeight: "800",
    letterSpacing: "0.14em",
    textTransform: "uppercase",
  },

  title: {
    margin: "0 0 12px",
    color: "#181818",
    fontSize: "48px",
    letterSpacing: "-0.04em",
  },

  subtitle: {
    maxWidth: "720px",
    margin: "0 auto",
    color: "#5A554D",
    fontSize: "17px",
    lineHeight: "1.7",
  },

  loadingCard: {
    padding: "40px",
    borderRadius: "30px",
    background: "rgba(255,255,255,0.58)",
    textAlign: "center",
  },

  loading: {
    margin: 0,
    color: "#5A554D",
  },

  errorCard: {
    padding: "36px",
    borderRadius: "30px",
    background: "rgba(255,255,255,0.64)",
    textAlign: "center",
  },

  errorTitle: {
    margin: "0 0 12px",
    color: "#181818",
    fontSize: "28px",
  },

  errorText: {
    margin: "0 auto 22px",
    maxWidth: "620px",
    color: "#5A554D",
    lineHeight: "1.7",
  },

  initiativeCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: "22px",
    padding: "28px",
    marginBottom: "20px",
    borderRadius: "32px",
    color: "#FFFFFF",
    background:
      "linear-gradient(135deg, rgba(24,24,24,0.95), rgba(60,55,48,0.94))",
  },

  panelLabel: {
    margin: "0 0 10px",
    color: "#776C5B",
    fontSize: "12px",
    fontWeight: "800",
    letterSpacing: "0.14em",
    textTransform: "uppercase",
  },

  initiativeTitle: {
    margin: "0 0 12px",
    fontSize: "32px",
  },

  initiativeText: {
    maxWidth: "760px",
    margin: 0,
    color: "#E8E1D7",
    lineHeight: "1.7",
  },

  initiativeMeta: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "10px",
  },

  statusBadge: {
    padding: "9px 13px",
    borderRadius: "999px",
    background: "rgba(255,255,255,0.14)",
    border: "1px solid rgba(255,255,255,0.18)",
    fontSize: "13px",
    fontWeight: "800",
  },

  confidenceBadge: {
    color: "#D8CDBB",
    fontSize: "13px",
  },

  workspace: {
    display: "grid",
    gridTemplateColumns: "260px minmax(0, 1fr)",
    gap: "18px",
    alignItems: "start",
  },

  materialMenu: {
    padding: "20px",
    borderRadius: "28px",
    background: "rgba(255,255,255,0.54)",
    border: "1px solid rgba(255,255,255,0.72)",
  },

  menuLabel: {
    margin: "0 0 14px",
    color: "#776C5B",
    fontSize: "12px",
    fontWeight: "800",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
  },

  materialList: {
    display: "grid",
    gap: "10px",
  },

  materialButton: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "14px",
    borderRadius: "16px",
    border: "1px solid rgba(24,24,24,0.08)",
    background: "rgba(255,255,255,0.38)",
    color: "#2A261F",
    fontSize: "14px",
    fontWeight: "700",
    textAlign: "left",
    cursor: "pointer",
  },

  materialButtonSelected: {
    background: "#181818",
    color: "#FFFFFF",
    borderColor: "#181818",
  },

  materialIcon: {
    fontSize: "18px",
  },

  backButton: {
    width: "100%",
    marginTop: "18px",
    padding: "13px",
    borderRadius: "15px",
    border: "1px solid rgba(24,24,24,0.1)",
    background: "transparent",
    color: "#5A554D",
    fontWeight: "700",
    cursor: "pointer",
  },

  documentPanel: {
    overflow: "hidden",
    borderRadius: "32px",
    background: "rgba(255,255,255,0.68)",
    border: "1px solid rgba(255,255,255,0.8)",
  },

  documentHeader: {
    display: "flex",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "20px",
    padding: "26px",
    borderBottom: "1px solid rgba(24,24,24,0.08)",
  },

  documentTitle: {
    margin: "0 0 8px",
    color: "#181818",
    fontSize: "27px",
  },

  documentSubject: {
    margin: 0,
    color: "#6F675B",
    fontSize: "14px",
  },

  actionButtons: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    alignItems: "flex-start",
  },

  primaryButton: {
    padding: "12px 17px",
    borderRadius: "14px",
    border: "1px solid #181818",
    background: "#181818",
    color: "#FFFFFF",
    fontWeight: "800",
    cursor: "pointer",
  },

  secondaryButton: {
    padding: "12px 17px",
    borderRadius: "14px",
    border: "1px solid rgba(24,24,24,0.12)",
    background: "rgba(255,255,255,0.72)",
    color: "#181818",
    fontWeight: "800",
    cursor: "pointer",
  },

  documentBody: {
    padding: "30px",
  },

  documentText: {
    margin: 0,
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    color: "#2A261F",
    fontSize: "15px",
    lineHeight: "1.8",
  },

  documentFooter: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    padding: "18px 26px",
    borderTop: "1px solid rgba(24,24,24,0.08)",
    color: "#6F675B",
    fontSize: "13px",
  },
};
