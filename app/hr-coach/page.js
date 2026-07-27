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
  const concernMetrics = [
  {
    label: "Stress",
    field: "stress_score",
  },
  {
    label: "Burnout",
    field: "burnout_score",
  },
  {
    label: "Sleep difficulty",
    field: "sleep_score",
  },
  {
    label: "Recovery difficulty",
    field: "recovery_score",
  },
  {
    label: "Mood difficulty",
    field: "mood_score",
  },
  {
    label: "Focus difficulty",
    field: "focus_score",
  },
]
  .map((metric) => {
    const validScores = assessments
      .map((assessment) => Number(assessment?.[metric.field]))
      .filter((score) => Number.isFinite(score));

    const average =
      validScores.length > 0
        ? validScores.reduce((total, score) => total + score, 0) /
          validScores.length
        : null;

    return {
      ...metric,
      average,
      evidenceCount: validScores.length,
    };
  })
  .filter((metric) => metric.average !== null)
  .sort((a, b) => b.average - a.average);

const primaryConcern = concernMetrics[0] || null;
const secondaryConcern = concernMetrics[1] || null;

const baselineParticipation =
  members.length > 0
    ? Math.round((baselineCompleted / members.length) * 100)
    : 0;

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

<section style={styles.rootFocusBox}>
  <p style={styles.focusKicker}>Root&apos;s current starting point</p>

  <h2 style={styles.focusTitle}>
    Here is what Root is bringing to the conversation
  </h2>

  <p style={styles.text}>
    This is not a final conclusion. It is the clearest starting point
    supported by the evidence currently available.
  </p>

  <div style={styles.focusGrid}>
    <div style={styles.focusCard}>
      <span style={styles.focusLabel}>Strongest current signal</span>

      {primaryConcern ? (
        <>
          <strong style={styles.focusValue}>
            {primaryConcern.label}
          </strong>

          <p style={styles.focusText}>
            Average recorded difficulty:{" "}
            <strong>{primaryConcern.average.toFixed(1)} / 10</strong>
          </p>
        </>
      ) : (
        <p style={styles.focusText}>
          Root does not yet have enough assessment evidence to identify
          a leading concern.
        </p>
      )}
    </div>

    <div style={styles.focusCard}>
      <span style={styles.focusLabel}>Another signal to explore</span>

      {secondaryConcern ? (
        <>
          <strong style={styles.focusValue}>
            {secondaryConcern.label}
          </strong>

          <p style={styles.focusText}>
            Average recorded difficulty:{" "}
            <strong>{secondaryConcern.average.toFixed(1)} / 10</strong>
          </p>
        </>
      ) : (
        <p style={styles.focusText}>
          Further evidence will help Root distinguish between different
          organisational pressures.
        </p>
      )}
    </div>

    <div style={styles.focusCard}>
      <span style={styles.focusLabel}>Participation picture</span>

      <strong style={styles.focusValue}>
        {baselineParticipation}%
      </strong>

      <p style={styles.focusText}>
        {baselineCompleted} of {members.length} employees have completed
        a baseline.
      </p>
    </div>

    <div style={styles.focusCard}>
      <span style={styles.focusLabel}>Evidence confidence</span>

      <strong style={styles.focusValue}>{confidence}</strong>

      <p style={styles.focusText}>
        {confidence === "High"
          ? "Root has a stronger evidence base, although findings should still be tested against organisational context."
          : confidence === "Developing"
          ? "Root can identify useful signals, but alternative explanations should remain open."
          : "Root is beginning to form a picture. Early signals should be treated as questions rather than conclusions."}
      </p>
    </div>
  </div>

  <div style={styles.rootQuestion}>
    <strong>Root&apos;s opening question</strong>

    <p>
      {primaryConcern
        ? `The strongest current signal is ${primaryConcern.label.toLowerCase()}. What has been happening inside the organisation that might help explain this?`
        : "What has been happening inside the organisation that Root should understand before interpreting the numbers?"}
    </p>
  </div>
</section>

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

  rootFocusBox: {
  marginTop: "30px",
  padding: "30px",
  borderRadius: "28px",
  background:
    "linear-gradient(145deg, rgba(233,241,230,0.78), rgba(255,255,255,0.46))",
  border: "1px solid rgba(92,120,86,0.2)",
  textAlign: "left",
},

focusKicker: {
  margin: 0,
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.13em",
  fontWeight: "800",
  color: "#62705F",
},

focusTitle: {
  margin: "8px 0 0",
  fontSize: "27px",
  lineHeight: 1.25,
  color: "#181818",
},

focusGrid: {
  marginTop: "24px",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
  gap: "14px",
},

focusCard: {
  padding: "20px",
  borderRadius: "21px",
  background: "rgba(255,255,255,0.56)",
  border: "1px solid rgba(255,255,255,0.78)",
  display: "flex",
  flexDirection: "column",
  gap: "8px",
},

focusLabel: {
  fontSize: "11px",
  textTransform: "uppercase",
  letterSpacing: "0.09em",
  fontWeight: "800",
  color: "#6F675B",
},

focusValue: {
  fontSize: "23px",
  lineHeight: 1.2,
  color: "#20251F",
},

focusText: {
  margin: 0,
  fontSize: "14px",
  lineHeight: 1.6,
  color: "#575047",
},

rootQuestion: {
  marginTop: "18px",
  padding: "19px 21px",
  borderRadius: "20px",
  background: "rgba(45,65,49,0.9)",
  color: "#FFFFFF",
  lineHeight: 1.65,
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
