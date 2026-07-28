"use client";

import { requireHRMembership } from "../../lib/authGuard";
import { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import Nav from "../../components/Nav";
import RootAtmosphere from "../../components/RootAtmosphere";
import RootEnso from "../../components/RootEnso";

const conversationStarters = {
  findings: {
    label: "Question Root's findings",
    userMessage: "I want to question Root's findings.",
    rootMessage:
      "Good. Root's current picture should be questioned, not accepted without context. Let us begin with the strongest recorded signal and examine what supports it, what might challenge it, and what Root still does not know.",
  },

  board: {
    label: "Prepare for a board meeting",
    userMessage: "Help me prepare for a board meeting.",
    rootMessage:
      "We can turn the current organisation picture into a clear board-level conversation. We will separate evidence, interpretation, uncertainty and recommended action so that the discussion remains useful and defensible.",
  },

  nextSteps: {
    label: "Decide what to do next",
    userMessage: "Help me decide what the organisation should do next.",
    rootMessage:
      "Let us avoid rushing straight to a solution. We can first identify the strongest signal, test possible explanations and then choose the smallest useful action that would either improve the situation or increase understanding.",
  },

  voice: {
    label: "Start a voice conversation",
    userMessage: "I want to continue this as a voice conversation.",
    rootMessage:
      "The shared voice conversation will use this same organisation context and reasoning layer. Voice connection is not active yet, but this conversation is now ready to become its foundation.",
  },
};

export default function HRCoachPage() {
  const [loading, setLoading] = useState(true);
  const [organisation, setOrganisation] = useState(null);
  const [members, setMembers] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [mindEntries, setMindEntries] = useState([]);
  const [journalEntries, setJournalEntries] = useState([]);
  const [voiceSessions, setVoiceSessions] = useState([]);

  const [conversation, setConversation] = useState([]);
  const [message, setMessage] = useState("");
  const [conversationStarted, setConversationStarted] = useState(false);
  const [isThinking, setIsThinking] = useState(false);

  const conversationEndRef = useRef(null);

  useEffect(() => {
    loadContext();
  }, []);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [conversation]);

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

  async function startConversation(type) {
  const starter = conversationStarters[type];

  if (!starter) return;

  await handleSend({
    preventDefault: () => {},
    starterMessage: starter.userMessage,
    starterIntent: type,
  });
}

  async function handleSend(event) {
  event.preventDefault();

  const cleanMessage = event.starterMessage || message.trim();

  if (!cleanMessage) return;

  setConversationStarted(true);
  setIsThinking(true);

  const userEntry = {
    id: `${Date.now()}-user`,
    role: "user",
    content: cleanMessage,
  };

  const conversationForApi = [
    ...conversation,
    userEntry,
  ];

  setConversation(conversationForApi);
  setMessage("");

  try {
    const response = await fetch(
      "/api/organisation-coach",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: cleanMessage,

          conversation: conversationForApi.map((entry) => ({
  role: entry.role,
  content: entry.content,
})),

          organisation,
          members,
          assessments,
          mindEntries,
          journalEntries,
          voiceSessions,

          intent:
  event.starterIntent ||
  "general_evidence_discussion",
        }),
      }
    );

    const data = await response.json();

    setConversation((current) => [
      ...current,
      {
        id: `${Date.now()}-root`,
        role: "assistant",
        content:
          data.reply ||
          "Root could not produce a response.",
      },
    ]);
    setIsThinking(false);
  } catch (error) {
    console.error(error);

    setConversation((current) => [
      ...current,
      {
        id: `${Date.now()}-error`,
        role: "assistant",
        content:
          "Root couldn't reach the organisation reasoning engine. Please try again.",
      },
    ]);
    setIsThinking(false);
  }
}

  function clearConversation() {
  setConversation([]);
  setConversationStarted(false);
  setMessage("");
  setIsThinking(false);
}

  const activated = members.filter((member) => member.activated_at).length;

  const baselineCompleted = members.filter(
    (member) => member.baseline_completed_at
  ).length;

  const supportInteractions =
    mindEntries.length + journalEntries.length + voiceSessions.length;

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
              onClick={() => {
                window.location.href = "/insights-org";
              }}
              style={styles.backButton}
            >
              ← Organisation Insights
            </button>

            <button
              type="button"
              onClick={() => {
                window.location.href = "/organisation-learning";
              }}
              style={styles.intelligenceButton}
            >
              🧠 Update Organisation Intelligence
            </button>
          </div>

          <RootEnso size={90} />

          <p style={styles.kicker}>Root Workplace</p>

          <h1 style={styles.title}>Ask Root</h1>

          {loading ? (
            <p style={styles.text}>
              Root is reviewing the latest organisation picture...
            </p>
          ) : (
            <>
              <p style={styles.subtitle}>
                I&apos;ve already reviewed{" "}
                {organisation?.name || "your organisation"}.
              </p>

              <p style={styles.text}>
                Good decisions begin with good understanding. Let&apos;s
                explore what Root is noticing together.
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
                <p style={styles.focusKicker}>
                  Root&apos;s current starting point
                </p>

                <h2 style={styles.focusTitle}>
                  Here is what Root is bringing to the conversation
                </h2>

                <p style={styles.text}>
                  This is not a final conclusion. It is the clearest starting
                  point supported by the evidence currently available.
                </p>

                <div style={styles.focusGrid}>
                  <div style={styles.focusCard}>
                    <span style={styles.focusLabel}>
                      Strongest current signal
                    </span>

                    {primaryConcern ? (
                      <>
                        <strong style={styles.focusValue}>
                          {primaryConcern.label}
                        </strong>

                        <p style={styles.focusText}>
                          Average recorded difficulty:{" "}
                          <strong>
                            {primaryConcern.average.toFixed(1)} / 10
                          </strong>
                        </p>
                      </>
                    ) : (
                      <p style={styles.focusText}>
                        Root does not yet have enough assessment evidence to
                        identify a leading concern.
                      </p>
                    )}
                  </div>

                  <div style={styles.focusCard}>
                    <span style={styles.focusLabel}>
                      Another signal to explore
                    </span>

                    {secondaryConcern ? (
                      <>
                        <strong style={styles.focusValue}>
                          {secondaryConcern.label}
                        </strong>

                        <p style={styles.focusText}>
                          Average recorded difficulty:{" "}
                          <strong>
                            {secondaryConcern.average.toFixed(1)} / 10
                          </strong>
                        </p>
                      </>
                    ) : (
                      <p style={styles.focusText}>
                        Further evidence will help Root distinguish between
                        different organisational pressures.
                      </p>
                    )}
                  </div>

                  <div style={styles.focusCard}>
                    <span style={styles.focusLabel}>
                      Participation picture
                    </span>

                    <strong style={styles.focusValue}>
                      {baselineParticipation}%
                    </strong>

                    <p style={styles.focusText}>
                      {baselineCompleted} of {members.length} employees have
                      completed a baseline.
                    </p>
                  </div>

                  <div style={styles.focusCard}>
                    <span style={styles.focusLabel}>
                      Evidence confidence
                    </span>

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

                  <p style={styles.rootQuestionText}>
                    {primaryConcern
                      ? `The strongest current signal is ${primaryConcern.label.toLowerCase()}. What has been happening inside the organisation that might help explain this?`
                      : "What has been happening inside the organisation that Root should understand before interpreting the numbers?"}
                  </p>
                </div>
              </section>

              <section style={styles.insightBox}>
                <h2 style={styles.sectionTitle}>
                  How can Root help you think this through?
                </h2>

                <p style={styles.text}>
                  Root has the latest organisation context ready, but this
                  space is for questions, challenge, planning and conversation
                  — not another report.
                </p>

                <p style={styles.text}>Where would you like us to begin?</p>

                <div style={styles.promptGrid}>
                  <button
                    type="button"
                    onClick={() => startConversation("findings")}
                    style={styles.promptButton}
                  >
                    💬 Question Root&apos;s findings
                  </button>

                  <button
                    type="button"
                    onClick={() => startConversation("board")}
                    style={styles.promptButton}
                  >
                    📄 Prepare for a board meeting
                  </button>

                  <button
                    type="button"
                    onClick={() => startConversation("nextSteps")}
                    style={styles.promptButton}
                  >
                    🧭 Help me decide what to do next
                  </button>

                  <button
                    type="button"
                    onClick={() => startConversation("voice")}
                    style={styles.promptButton}
                  >
                    🎤 Start a voice conversation
                  </button>
                </div>
              </section>

              <section style={styles.conversationSection}>
                <div style={styles.conversationHeader}>
                  <div>
                    <p style={styles.conversationKicker}>
                      Organisation conversation
                    </p>

                    <h2 style={styles.conversationTitle}>
                      Think with Root
                    </h2>
                  </div>

                  {conversation.length > 0 ? (
                    <button
                      type="button"
                      onClick={clearConversation}
                      style={styles.clearButton}
                    >
                      Clear conversation
                    </button>
                  ) : null}
                </div>

                <div style={styles.conversationWindow}>
                  {!conversationStarted || conversation.length === 0 ? (
                    <div style={styles.emptyConversation}>
                      <RootEnso size={58} />

                      <strong style={styles.emptyTitle}>
                        The conversation begins here
                      </strong>

                      <p style={styles.emptyText}>
                        Choose one of the starting points above, or write your
                        own question below.
                      </p>
                    </div>
                  ) : (
                    conversation.map((entry) => {
                      const isUser = entry.role === "user";

                      return (
                        <div
                          key={entry.id}
                          style={{
                            ...styles.messageRow,
                            justifyContent: isUser
                              ? "flex-end"
                              : "flex-start",
                          }}
                        >
                          <div
                            style={{
                              ...styles.messageBubble,
                              ...(isUser
                                ? styles.userMessage
                                : styles.rootMessage),
                            }}
                          >
                            <span style={styles.messageAuthor}>
                              {isUser ? "You" : "Root"}
                            </span>

                            <p style={styles.messageText}>{entry.content}</p>
                          </div>
                        </div>
                      );
                    })
                  )}

                  {isThinking && (
  <div
    style={{
      ...styles.messageRow,
      justifyContent: "flex-start",
    }}
  >
    <div
      style={{
        ...styles.messageBubble,
        ...styles.rootMessage,
      }}
    >
      <span style={styles.messageAuthor}>
        Root
      </span>

      <p style={styles.messageText}>
        Reviewing the organisation evidence...
      </p>
    </div>
  </div>
)}

                  <div ref={conversationEndRef} />
                </div>

                <form onSubmit={handleSend} style={styles.messageForm}>
                  <textarea
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" &&
                        !event.shiftKey &&
                        !event.nativeEvent.isComposing
                      ) {
                        event.preventDefault();
                        handleSend(event);
                      }
                    }}
                    placeholder="Ask Root about the organisation picture..."
                    rows={3}
                    style={styles.messageInput}
                  />

                  <button
                    type="submit"
                    disabled={!message.trim()}
                    style={{
                      ...styles.sendButton,
                      opacity: message.trim() ? 1 : 0.45,
                      cursor: message.trim() ? "pointer" : "not-allowed",
                    }}
                  >
                    Send
                  </button>
                </form>

                <p style={styles.conversationNote}>
                  This conversation interface is active. Root&apos;s live
                  organisation reasoning engine will be connected next.
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

  topButtons: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    marginBottom: "26px",
    flexWrap: "wrap",
  },

  backButton: {
    padding: "10px 18px",
    borderRadius: "999px",
    border: "1px solid rgba(255,255,255,0.5)",
    background: "rgba(255,255,255,0.45)",
    cursor: "pointer",
    fontWeight: 700,
    color: "#181818",
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

  rootQuestionText: {
    margin: "8px 0 0",
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
    color: "#FFFFFF",
    fontWeight: "700",
    lineHeight: 1.4,
  },

  conversationSection: {
    marginTop: "30px",
    padding: "28px",
    borderRadius: "28px",
    background:
      "linear-gradient(145deg, rgba(255,255,255,0.54), rgba(240,244,236,0.4))",
    border: "1px solid rgba(255,255,255,0.72)",
    textAlign: "left",
  },

  conversationHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "16px",
    flexWrap: "wrap",
  },

  conversationKicker: {
    margin: 0,
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    fontWeight: "800",
    color: "#687064",
  },

  conversationTitle: {
    margin: "6px 0 0",
    fontSize: "28px",
    color: "#181818",
  },

  clearButton: {
    padding: "9px 14px",
    borderRadius: "999px",
    border: "1px solid rgba(24,24,24,0.14)",
    background: "rgba(255,255,255,0.5)",
    color: "#4D463B",
    cursor: "pointer",
    fontWeight: "700",
  },

  conversationWindow: {
    marginTop: "22px",
    minHeight: "320px",
    maxHeight: "560px",
    overflowY: "auto",
    padding: "20px",
    borderRadius: "22px",
    background: "rgba(255,255,255,0.48)",
    border: "1px solid rgba(255,255,255,0.82)",
    scrollBehavior: "smooth",
  },

  emptyConversation: {
    minHeight: "278px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    textAlign: "center",
    padding: "20px",
  },

  emptyTitle: {
    marginTop: "14px",
    fontSize: "20px",
    color: "#242823",
  },

  emptyText: {
    maxWidth: "430px",
    margin: "10px 0 0",
    lineHeight: 1.65,
    color: "#625B51",
  },

  messageRow: {
    width: "100%",
    display: "flex",
    marginBottom: "16px",
  },

  messageBubble: {
    maxWidth: "78%",
    padding: "15px 17px",
    borderRadius: "19px",
    boxShadow: "0 10px 28px rgba(38,34,28,0.06)",
  },

  userMessage: {
    background: "#1F2520",
    color: "#FFFFFF",
    borderBottomRightRadius: "6px",
  },

  rootMessage: {
    background: "rgba(236,242,232,0.96)",
    color: "#292E29",
    border: "1px solid rgba(75,102,75,0.14)",
    borderBottomLeftRadius: "6px",
  },

  messageAuthor: {
    display: "block",
    marginBottom: "6px",
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    fontWeight: "800",
    opacity: 0.72,
  },

  messageText: {
    margin: 0,
    whiteSpace: "pre-wrap",
    lineHeight: 1.65,
    fontSize: "15px",
  },

  messageForm: {
    marginTop: "16px",
    display: "flex",
    alignItems: "stretch",
    gap: "12px",
  },

  messageInput: {
    flex: 1,
    minHeight: "82px",
    resize: "vertical",
    padding: "15px 17px",
    borderRadius: "18px",
    border: "1px solid rgba(40,49,40,0.18)",
    background: "rgba(255,255,255,0.72)",
    color: "#181818",
    fontFamily: "inherit",
    fontSize: "16px",
    lineHeight: 1.5,
    outline: "none",
  },

  sendButton: {
    minWidth: "100px",
    padding: "14px 20px", 
    borderRadius: "18px",
    border: "none",
    background: "#263B2B",
    color: "#FFFFFF",
    fontWeight: "800",
  },

  conversationNote: {
    margin: "12px 2px 0",
    fontSize: "12px",
    lineHeight: 1.5,
    color: "#746D63",
  },
};