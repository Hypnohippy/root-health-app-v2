"use client";

import { requireHRMembership } from "../../lib/authGuard";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import Nav from "../../components/Nav";
import RootAtmosphere from "../../components/RootAtmosphere";
import RootEnso from "../../components/RootEnso";

export default function HRCoachPage() {
  const [loading, setLoading] = useState(true);
  const [organisation, setOrganisation] = useState(null);
  const [members, setMembers] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [mindEntries, setMindEntries] = useState([]);
  const [journalEntries, setJournalEntries] = useState([]);
  const [voiceSessions, setVoiceSessions] = useState([]);

  useEffect(() => {
    loadContext();
  }, []);

  async function loadContext() {
    setLoading(true);

const access = await requireHRMembership();

if (!access.allowed) {
  window.location.href = access.redirectTo;
  return;
}

const membership = access.membership;
const orgId = membership.organisation_id;

localStorage.setItem(
  "root_hr_org_v1",
  JSON.stringify({
    organisation_id: membership.organisation_id,
    role: membership.role,
  })
);

localStorage.setItem("root_profile_key_v1", membership.profile_key);

const { data: org, error: orgError } = await supabase
  .from("organisations")
  .select("*")
  .eq("id", orgId)
  .maybeSingle();

if (orgError || !org) {
  setOrganisation(null);
  setLoading(false);
  return;
}

setOrganisation(org);

    const { data: memberData } = await supabase
      .from("organisation_members")
      .select("*")
      .eq("organisation_id", orgId);

    const { data: assessmentData } = await supabase
      .from("wellbeing_assessments")
      .select("*")
      .eq("organisation_id", orgId)
      .order("created_at", { ascending: true });

    const { data: mindData } = await supabase
      .from("mind_entries")
      .select("*")
      .eq("organisation_id", orgId)
      .limit(200);

    const { data: journalData } = await supabase
      .from("journal_entries")
      .select("*")
      .eq("organisation_id", orgId)
      .limit(200);

    const { data: voiceData } = await supabase
      .from("voice_sessions")
      .select("*")
      .eq("organisation_id", orgId)
      .limit(200);

    setMembers(Array.isArray(memberData) ? memberData : []);
    setAssessments(Array.isArray(assessmentData) ? assessmentData : []);
    setMindEntries(Array.isArray(mindData) ? mindData : []);
    setJournalEntries(Array.isArray(journalData) ? journalData : []);
    setVoiceSessions(Array.isArray(voiceData) ? voiceData : []);

    setLoading(false);
  }

  const activated = members.filter((m) => m.activated_at).length;
  const baselineCompleted = members.filter((m) => m.baseline_completed_at).length;
  const supportInteractions =
    mindEntries.length + journalEntries.length + voiceSessions.length;

  const latestAssessment =
    assessments.length > 0 ? assessments[assessments.length - 1] : null;

  const highestConcern = latestAssessment
    ? [
        ["Stress", latestAssessment.stress_score],
        ["Burnout", latestAssessment.burnout_score],
        ["Sleep difficulty", latestAssessment.sleep_score],
        ["Recovery difficulty", latestAssessment.recovery_score],
        ["Mood difficulty", latestAssessment.mood_score],
        ["Focus difficulty", latestAssessment.focus_score],
      ].sort((a, b) => Number(b[1]) - Number(a[1]))[0]
    : null;

  const confidence =
    assessments.length >= 20
      ? "High"
      : assessments.length >= 8
      ? "Developing"
      : "Early Stage";

  return (
    <RootAtmosphere type="coach">
      <Nav />

      <main style={styles.page}>
        <section style={styles.card}>
          <div style={styles.topButtons}>
  <button
    type="button"
    onClick={() => (window.location.href = "/insights-org")}
    style={styles.backButton}
  >
    ← Organisation Insights
  </button>

  <button
    type="button"
    onClick={() => (window.location.href = "/organisation-learning")}
    style={styles.intelligenceButton}
  >
    🧠 Update Organisation Intelligence
  </button>
</div>

<RootEnso size={90} />

          <p style={styles.kicker}>Root Workplace</p>

          <h1 style={styles.title}>Ask Root</h1>

          {loading ? (
            <p style={styles.text}>Root is reviewing the latest organisation picture...</p>
          ) : (
            <>
              <p style={styles.subtitle}>
                I've already reviewed {organisation?.name || "your organisation"}.
              </p>

              <p style={styles.text}>
                Good decisions begin with good understanding. Let's explore what
                Root is noticing together.
              </p>

              <div style={styles.snapshotGrid}>
                <div style={styles.snapshotCard}>
                  <span>Employees</span>
                  <strong>{members.length}</strong>
                </div>

                <div style={styles.snapshotCard}>
                  <span>Activated</span>
                  <strong>{activated}</strong>
                </div>

                <div style={styles.snapshotCard}>
                  <span>Baselines</span>
                  <strong>{baselineCompleted}</strong>
                </div>

                <div style={styles.snapshotCard}>
                  <span>Assessments</span>
                  <strong>{assessments.length}</strong>
                </div>

                <div style={styles.snapshotCard}>
                  <span>Support interactions</span>
                  <strong>{supportInteractions}</strong>
                </div>

                <div style={styles.snapshotCard}>
                  <span>Confidence</span>
                  <strong>{confidence}</strong>
                </div>
              </div>

              <section style={styles.insightBox}>
                <h2 style={styles.sectionTitle}>How can Root help you think this through?</h2>

                <p style={styles.text}>
  Root has the latest organisation context ready, but this space is for questions,
  challenge, planning and conversation — not another report.
</p>
                <p style={styles.text}>
                  Where would you like us to begin?
                </p>

                <div style={styles.promptGrid}>
                 <button style={styles.promptButton}>💬 Question Root's findings</button>
<button style={styles.promptButton}>📄 Prepare for a board meeting</button>
<button style={styles.promptButton}>🧭 Help me decide what to do next</button>
<button style={styles.promptButton}>🎤 Start a voice conversation</button>
                </div>
              </section>

              <section style={styles.comingSoon}>
                <h2>Conversation layer coming next</h2>
                <p>
                  Soon this page will become the HR voice and text companion:
                  a place to question Root's findings, prepare reports, build
                  initiatives and save the conversation into documents or calendars.
                </p>
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
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "40px",
  },

  card: {
    maxWidth: "900px",
    width: "100%",
    textAlign: "center",
    padding: "50px",
    borderRadius: "34px",
    background: "rgba(255,255,255,0.22)",
    backdropFilter: "blur(22px)",
    border: "1px solid rgba(255,255,255,0.32)",
    boxShadow: "0 34px 100px rgba(20,18,15,0.16)",
  },

  kicker: {
    marginTop: "14px",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.14em",
    fontWeight: "800",
    color: "#6F675B",
  },

  title: {
    fontSize: "46px",
    margin: "8px 0 10px",
    color: "#181818",
  },

  subtitle: {
    fontSize: "22px",
    fontWeight: "700",
    color: "#181818",
  },

  text: {
    marginTop: "16px",
    lineHeight: 1.7,
    fontSize: "17px",
    color: "#4D463B",
  },

  snapshotGrid: {
    marginTop: "34px",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: "14px",
  },

  snapshotCard: {
    padding: "20px",
    borderRadius: "22px",
    background: "rgba(255,255,255,0.48)",
    border: "1px solid rgba(255,255,255,0.72)",
    display: "grid",
    gap: "8px",
  },

  insightBox: {
    marginTop: "30px",
    padding: "28px",
    borderRadius: "28px",
    background: "rgba(255,255,255,0.38)",
    border: "1px solid rgba(255,255,255,0.62)",
  },

  sectionTitle: {
    marginTop: 0,
    fontSize: "26px",
    color: "#181818",
  },

  promptGrid: {
    marginTop: "24px",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "14px",
  },

  promptButton: {
    padding: "16px 18px",
    borderRadius: "18px",
    border: "none",
    cursor: "pointer",
    background: "#181818",
    color: "#fff",
    fontWeight: "700",
  },

  comingSoon: {
    marginTop: "30px",
    padding: "24px",
    borderRadius: "24px",
    background: "rgba(220,230,205,0.42)",
    color: "#181818",
  },
  backButton: {
  marginBottom: "24px",
  padding: "10px 18px",
  borderRadius: "999px",
  border: "1px solid rgba(255,255,255,0.5)",
  background: "rgba(255,255,255,0.45)",
  cursor: "pointer",
  fontWeight: 700,
  color: "#181818",
},
topButtons: {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  marginBottom: "26px",
  flexWrap: "wrap",
},

intelligenceButton: {
  padding: "10px 18px",
  borderRadius: "999px",
  border: "1px solid rgba(72,119,84,0.25)",
  background: "rgba(72,119,84,0.12)",
  cursor: "pointer",
  fontWeight: 700,
  color: "#29533A",
},
};
