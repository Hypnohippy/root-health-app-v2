"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import Nav from "../../components/Nav";
import RootAtmosphere from "../../components/RootAtmosphere";
import RootEnso from "../../components/RootEnso";

function average(items, key) {
  const values = items
    .map((item) => Number(item[key]))
    .filter((value) => !Number.isNaN(value));

  if (values.length === 0) return null;

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function format(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toFixed(1);
}

function changeText(start, current) {
  if (start === null || current === null) return "No comparison yet";

  const diff = current - start;

  if (diff < 0) return `${Math.abs(diff).toFixed(1)} point improvement`;
  if (diff > 0) return `${diff.toFixed(1)} point increase`;
  return "No change yet";
}

function countBy(items, key) {
  const counts = {};

  items.forEach((item) => {
    const value = item[key];
    if (!value) return;
    counts[value] = (counts[value] || 0) + 1;
  });

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
}

export default function OrgInsightsPage() {
  const [loading, setLoading] = useState(true);
  const [organisation, setOrganisation] = useState(null);
  const [members, setMembers] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [mindEntries, setMindEntries] = useState([]);
  const [journalEntries, setJournalEntries] = useState([]);
  const [voiceSessions, setVoiceSessions] = useState([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);

    const { data: orgs } = await supabase
      .from("organisations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1);

    const org = Array.isArray(orgs) ? orgs[0] : null;
    setOrganisation(org || null);

    const orgId = org?.id || null;

    const { data: memberData } = await supabase
      .from("organisation_members")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: assessmentData } = await supabase
      .from("wellbeing_assessments")
      .select("*")
      .or(orgId ? `organisation_id.eq.${orgId},organisation_id.is.null` : "organisation_id.is.null")
      .order("created_at", { ascending: true });

    const { data: mindData } = await supabase
      .from("mind_entries")
      .select("*")
      .or(orgId ? `organisation_id.eq.${orgId},organisation_id.is.null` : "organisation_id.is.null")
      .order("created_at", { ascending: false })
      .limit(200);

    const { data: journalData } = await supabase
      .from("journal_entries")
      .select("*")
      .or(orgId ? `organisation_id.eq.${orgId},organisation_id.is.null` : "organisation_id.is.null")
      .order("created_at", { ascending: false })
      .limit(200);

    const { data: voiceData } = await supabase
      .from("voice_sessions")
      .select("*")
      .or(orgId ? `organisation_id.eq.${orgId},organisation_id.is.null` : "organisation_id.is.null")
      .order("created_at", { ascending: false })
      .limit(200);

    setMembers(Array.isArray(memberData) ? memberData : []);
    setAssessments(Array.isArray(assessmentData) ? assessmentData : []);
    setMindEntries(Array.isArray(mindData) ? mindData : []);
    setJournalEntries(Array.isArray(journalData) ? journalData : []);
    setVoiceSessions(Array.isArray(voiceData) ? voiceData : []);

    setLoading(false);
  };

  const baseline = assessments.filter((item) => item.assessment_type === "baseline");
  const latest = assessments.length > 0 ? [assessments[assessments.length - 1]] : [];

  const metrics = [
    ["Stress", "stress_score"],
    ["Burnout", "burnout_score"],
    ["Sleep difficulty", "sleep_score"],
    ["Recovery difficulty", "recovery_score"],
    ["Mood difficulty", "mood_score"],
    ["Focus difficulty", "focus_score"],
  ];

  const themeCounts = useMemo(
    () => countBy(mindEntries, "thought_theme"),
    [mindEntries]
  );

  const toolCounts = useMemo(
    () => countBy(mindEntries, "tool"),
    [mindEntries]
  );

  const invited = members.length;
  const activated = members.filter((m) => m.activated_at).length;
  const baselineCompleted = members.filter((m) => m.baseline_completed_at).length;

  const trialStart = organisation?.trial_start
    ? new Date(organisation.trial_start)
    : null;

  const trialEnd = organisation?.trial_end
    ? new Date(organisation.trial_end)
    : null;

  const today = new Date();

  const trialProgress =
    trialStart && trialEnd
      ? Math.min(
          100,
          Math.max(
            0,
            ((today.getTime() - trialStart.getTime()) /
              (trialEnd.getTime() - trialStart.getTime())) *
              100
          )
        )
      : 0;

  return (
    <RootAtmosphere type="coach">
      <Nav />

      <main style={styles.page}>
        <section style={styles.shell}>
          <div style={styles.header}>
            <RootEnso size={90} />

            <p style={styles.kicker}>Root Health</p>

            <h1 style={styles.title}>Organisation Insights</h1>

            <p style={styles.subtitle}>
              Anonymous wellbeing trends, engagement, support usage and early outcome movement for organisational review.
            </p>
          </div>

          {loading ? (
            <p style={styles.loading}>Loading organisation insights...</p>
          ) : (
            <>
              <section style={styles.heroCard}>
                <p style={styles.heroLabel}>Current trial</p>
                <h2 style={styles.heroTitle}>
                  {organisation?.name || "Root Health Trial Company"}
                </h2>

                <p style={styles.heroText}>
                  Trial progress: {Math.round(trialProgress)}%
                </p>

                <div style={styles.progressTrack}>
                  <div
                    style={{
                      ...styles.progressFill,
                      width: `${trialProgress}%`,
                    }}
                  />
                </div>
              </section>

              <section style={styles.cardGrid}>
                <MetricCard title="Employees invited" value={invited || "—"} />
                <MetricCard title="Activated" value={activated || "—"} />
                <MetricCard title="Baselines completed" value={baselineCompleted || "—"} />
                <MetricCard title="Voice sessions" value={voiceSessions.length} />
              </section>

              <section style={styles.panel}>
                <p style={styles.panelLabel}>Outcome movement</p>
                <h2 style={styles.panelTitle}>Wellbeing snapshot</h2>

                <div style={styles.metricRows}>
                  {metrics.map(([label, key]) => {
                    const start = average(baseline, key);
                    const current = average(latest, key);

                    return (
                      <div key={key} style={styles.metricRow}>
                        <strong>{label}</strong>
                        <span>{format(start)} → {format(current)}</span>
                        <em>{changeText(start, current)}</em>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section style={styles.twoColumn}>
                <section style={styles.panel}>
                  <p style={styles.panelLabel}>Anonymous themes</p>
                  <h2 style={styles.panelTitle}>What Root noticed</h2>

                  {themeCounts.length === 0 ? (
                    <p style={styles.empty}>No thought themes recorded yet.</p>
                  ) : (
                    themeCounts.map(([theme, count]) => (
                      <div key={theme} style={styles.listRow}>
                        <span>{theme}</span>
                        <strong>{count}</strong>
                      </div>
                    ))
                  )}
                </section>

                <section style={styles.panel}>
                  <p style={styles.panelLabel}>Support usage</p>
                  <h2 style={styles.panelTitle}>Most used tools</h2>

                  {toolCounts.length === 0 ? (
                    <p style={styles.empty}>No support tools recorded yet.</p>
                  ) : (
                    toolCounts.map(([tool, count]) => (
                      <div key={tool} style={styles.listRow}>
                        <span>{tool}</span>
                        <strong>{count}</strong>
                      </div>
                    ))
                  )}
                </section>
              </section>

              <section style={styles.reportCard}>
                <p style={styles.panelLabel}>Automated report direction</p>
                <h2 style={styles.panelTitle}>Draft executive insight</h2>

                <p style={styles.reportText}>
                  Early organisation data will be summarised here. Root will compare baseline and current scores,
                  highlight engagement, identify anonymous themes, and produce a professional review narrative suitable
                  for HR, wellbeing or clinical leads.
                </p>

                <button style={styles.reportButton}>
                  Generate report soon
                </button>
              </section>

              <p style={styles.privacy}>
                This dashboard should only show anonymous organisation-level trends. Individual user reflections should never be visible to managers.
              </p>
            </>
          )}
        </section>
      </main>
    </RootAtmosphere>
  );
}

function MetricCard({ title, value }) {
  return (
    <div style={styles.metricCard}>
      <p style={styles.metricLabel}>{title}</p>
      <h2 style={styles.metricValue}>{value}</h2>
    </div>
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
    maxWidth: "1180px",
    borderRadius: "42px",
    padding: "38px",
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
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.14em",
    color: "#6F675B",
    fontWeight: "800",
  },

  title: {
    margin: "0 0 12px",
    fontSize: "48px",
    color: "#181818",
    letterSpacing: "-0.04em",
  },

  subtitle: {
    maxWidth: "760px",
    margin: "0 auto",
    lineHeight: "1.75",
    color: "#5A554D",
    fontSize: "17px",
  },

  loading: {
    textAlign: "center",
    color: "#5A554D",
  },

  heroCard: {
    padding: "30px",
    borderRadius: "34px",
    background: "linear-gradient(135deg, rgba(24,24,24,0.92), rgba(52,48,42,0.92))",
    color: "#FFFFFF",
    marginBottom: "22px",
  },

  heroLabel: {
    margin: "0 0 10px",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.14em",
    color: "#D8CDBB",
    fontWeight: "800",
  },

  heroTitle: {
    margin: "0 0 10px",
    fontSize: "34px",
  },

  heroText: {
    margin: "0 0 14px",
    color: "#E7E0D6",
  },

  progressTrack: {
    height: "12px",
    borderRadius: "999px",
    background: "rgba(255,255,255,0.18)",
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    borderRadius: "999px",
    background: "#FFFFFF",
  },

  cardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
    gap: "16px",
    marginBottom: "18px",
  },

  metricCard: {
    padding: "24px",
    borderRadius: "28px",
    background: "rgba(255,255,255,0.58)",
    border: "1px solid rgba(255,255,255,0.72)",
  },

  metricLabel: {
    margin: "0 0 8px",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    color: "#776C5B",
    fontWeight: "800",
  },

  metricValue: {
    margin: 0,
    fontSize: "34px",
    color: "#181818",
  },

  panel: {
    padding: "28px",
    borderRadius: "32px",
    background: "rgba(255,255,255,0.58)",
    border: "1px solid rgba(255,255,255,0.72)",
    marginBottom: "18px",
  },

  panelLabel: {
    margin: "0 0 10px",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.14em",
    color: "#776C5B",
    fontWeight: "800",
  },

  panelTitle: {
    margin: "0 0 18px",
    fontSize: "28px",
    color: "#181818",
  },

  metricRows: {
    display: "grid",
    gap: "10px",
  },

  metricRow: {
    display: "grid",
    gridTemplateColumns: "1.2fr 1fr 1.3fr",
    gap: "12px",
    padding: "14px",
    borderRadius: "18px",
    background: "rgba(255,255,255,0.62)",
    color: "#2A261F",
  },

  twoColumn: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "18px",
  },

  listRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "14px",
    padding: "14px 0",
    borderBottom: "1px solid rgba(24,24,24,0.08)",
    color: "#2A261F",
  },

  empty: {
    color: "#6F675B",
    lineHeight: "1.6",
  },

  reportCard: {
    padding: "30px",
    borderRadius: "34px",
    background: "linear-gradient(135deg, rgba(255,255,255,0.62), rgba(255,255,255,0.34))",
    border: "1px solid rgba(255,255,255,0.72)",
    marginBottom: "18px",
  },

  reportText: {
    lineHeight: "1.8",
    color: "#4D463B",
  },

  reportButton: {
    marginTop: "12px",
    border: "none",
    borderRadius: "999px",
    padding: "14px 20px",
    background: "#181818",
    color: "#FFFFFF",
    cursor: "pointer",
    fontWeight: "800",
  },

  privacy: {
    textAlign: "center",
    fontSize: "13px",
    color: "#6F675B",
    lineHeight: "1.6",
  },
};
