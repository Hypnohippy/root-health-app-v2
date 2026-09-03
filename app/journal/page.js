"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import Nav from "../../components/Nav";
import RootEnso from "../../components/RootEnso";
import RootAtmosphere from "../../components/RootAtmosphere";
import { resolvePersonalRootContext } from "../../lib/personalRootContext";
import { consumePersonalInvestigationHandoff } from "../../lib/personalInvestigationHandoff";
import {
  createRootDictation,
  transcribeRootAudio,
} from "../../lib/rootDictation";
const quickCheckIns = [
  { emoji: "😔", label: "Heavy" },
  { emoji: "⚡", label: "Wired" },
  { emoji: "🌫", label: "Foggy" },
  { emoji: "😤", label: "Pressured" },
  { emoji: "🧠", label: "Racing thoughts" },
  { emoji: "😞", label: "Flat" },
  { emoji: "😌", label: "Calm" },
];

const prompts = [
  { id: "free", title: "Free reflection", subtitle: "Write freely without structure.", icon: "✍️" },
  { id: "guilt", title: "Guilt & self-pressure", subtitle: "Separate responsibility from self-attack.", icon: "🧠" },
  { id: "anxiety", title: "Anxiety & overwhelm", subtitle: "Slow the spiral and ground the system.", icon: "🌬️" },
  { id: "grief", title: "Grief & emotional heaviness", subtitle: "Give difficult feelings somewhere to land.", icon: "🌙" },
  { id: "clarity", title: "Clarity & direction", subtitle: "Untangle what matters and what comes next.", icon: "🌿" },
];

function detectPattern(text = "") {
  const lower = text.toLowerCase();

  // Anxiety
  if (
    lower.includes("anxious") ||
    lower.includes("anxiety") ||
    lower.includes("panic") ||
    lower.includes("overwhelm") ||
    lower.includes("racing")
  ) {
    return {
      emotional_theme: "Anxiety",
      recommended_coach_mode: "Mind & mood",
      recommended_prompt: "Breathwork or CBT-style reframing",
    };
  }

  // Workplace disappointment
  if (
    lower.includes("promotion") ||
    lower.includes("boss") ||
    lower.includes("manager") ||
    lower.includes("work") ||
    lower.includes("undervalued") ||
    lower.includes("unmotivated") ||
    lower.includes("demotivated") ||
    lower.includes("not appreciated")
  ) {
    return {
      emotional_theme: "Workplace disappointment",
      recommended_coach_mode: "Reflection",
      recommended_prompt: "Explore values, boundaries and sustainable next steps",
    };
  }

  // Burnout
  if (
    lower.includes("burnout") ||
    lower.includes("exhausted") ||
    lower.includes("drained") ||
    lower.includes("can't cope") ||
    lower.includes("cant cope")
  ) {
    return {
      emotional_theme: "Burnout risk",
      recommended_coach_mode: "Lifestyle",
      recommended_prompt: "Recovery planning",
    };
  }

  // Guilt
  if (
    lower.includes("guilt") ||
    lower.includes("shame") ||
    lower.includes("pressure") ||
    lower.includes("pressured")
  ) {
    return {
      emotional_theme: "Guilt & pressure",
      recommended_coach_mode: "Mind & mood",
      recommended_prompt: "CBT-style reframing",
    };
  }

  // Genuine grief only
  if (
    lower.includes("bereavement") ||
    lower.includes("funeral") ||
    lower.includes("died") ||
    lower.includes("death") ||
    lower.includes("passed away") ||
    lower.includes("grieving")
  ) {
    return {
      emotional_theme: "Grief",
      recommended_coach_mode: "Reflection",
      recommended_prompt: "Gentle grief reflection",
    };
  }

  // Low mood / low energy
  if (
    lower.includes("flat") ||
    lower.includes("foggy") ||
    lower.includes("tired") ||
    lower.includes("numb")
  ) {
    return {
      emotional_theme: "Low mood",
      recommended_coach_mode: "Lifestyle",
      recommended_prompt: "Recovery and energy review",
    };
  }

  return {
    emotional_theme: "General reflection",
    recommended_coach_mode: "Lifestyle",
    recommended_prompt: "Guided journaling",
  };
}
function getPromptStructure(type) {
  switch (type) {
    case "guilt":
      return {
        heading: "Guilt & self-pressure",
        intro: "Let’s slow this down gently and separate feeling from self-attack.",
        prompts: [
          "What happened?",
          "What part feels genuinely important?",
          "What part may be pressure or fear?",
          "What would you say to someone else in this position?",
        ],
      };

    case "anxiety":
      return {
        heading: "Anxiety & overwhelm",
        intro: "You do not need to solve everything right now. Just reduce the noise a little.",
        prompts: [
          "What feels loudest right now?",
          "What is your mind predicting?",
          "What is actually happening right now?",
          "What would help your nervous system feel safer?",
        ],
      };

    case "grief":
      return {
        heading: "Grief & emotional heaviness",
        intro: "Some feelings need space more than solutions.",
        prompts: [
          "What feels heavy right now?",
          "What are you carrying emotionally?",
          "What do you wish someone understood?",
          "What do you need more of at the moment?",
        ],
      };

    case "clarity":
      return {
        heading: "Clarity & direction",
        intro: "Let’s reconnect with what matters and reduce the mental fog.",
        prompts: [
          "What situation are you trying to understand?",
          "What matters most here?",
          "What feels draining?",
          "What is one honest next step?",
        ],
      };

    default:
      return {
        heading: "Free reflection",
        intro: "Write freely. No structure required.",
        prompts: ["What feels important today?"],
      };
  }
}

export default function JournalPage() {
  const [activePrompt, setActivePrompt] = useState("free");
  const [step, setStep] = useState(0);
  const [responses, setResponses] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [patternResult, setPatternResult] = useState(null);
  const [entries, setEntries] = useState([]);
  const [openEntry, setOpenEntry] = useState(null);
  const [selectedCheckIn, setSelectedCheckIn] = useState(null);
  const [journey, setJourney] = useState(null);
  const [showJourneyInsights, setShowJourneyInsights] = useState(false);
  const [recordingStep, setRecordingStep] = useState(null);
  const [transcribingStep, setTranscribingStep] = useState(null);
  const [dictationError, setDictationError] = useState("");
  const [personalContext, setPersonalContext] = useState(null);
  const [investigationPrompt, setInvestigationPrompt] = useState(null);
  const dictationRef = useRef(null);

  const config = investigationPrompt || getPromptStructure(activePrompt);
  const currentPrompt = config.prompts[step];

 useEffect(() => {
  resolvePersonalRootContext({ client: supabase }).then((result) => {
    if (!result.ok) return;
    setPersonalContext(result.context);
    loadEntries(result.context.profileKey);
    const handoff = consumePersonalInvestigationHandoff({
      profileKey: result.context.profileKey,
      destination: "journal",
    });
    if (handoff) {
      setActivePrompt("investigation_reflection");
      setInvestigationPrompt({
        heading: "Explore what may be affecting your energy",
        intro: handoff.known,
        prompts: [handoff.question],
      });
    }
  });

  const stored = localStorage.getItem("root_journey_v1");

  if (!stored) return;

  try {
    const parsed = JSON.parse(stored);
    setJourney(parsed);
  } catch (err) {
    console.log(err);
  }
}, []);
  

  const loadEntries = async (profileKey) => {
    const { data } = await supabase
      .from("journal_entries")
      .select("*")
      .eq("profile_key", profileKey)
      .order("created_at", { ascending: false })
      .limit(50);

    setEntries(
      Array.isArray(data)
        ? data
            .filter((entry) => entry?.prompt_type !== "root_investigation_event_v1")
            .slice(0, 8)
        : []
    );
  };

  const saveQuickCheckIn = async (checkIn) => {
    setSelectedCheckIn(checkIn);

    const pattern = detectPattern(checkIn.label);

const profileKey = personalContext?.profileKey;

if (!profileKey) {
  alert("Root could not find your profile. Please return to your profile and try again.");
  return;
}

const { error } = await supabase.from("journal_entries").insert([
      {
        profile_key: profileKey,
        prompt_type: "quick_check_in",
        title: "Quick emotional check-in",
        content: checkIn.label,
        emotional_theme: pattern.emotional_theme,
        recommended_coach_mode: pattern.recommended_coach_mode,
        recommended_prompt: pattern.recommended_prompt,
      },
    ]);

    if (error) {
      alert(error.message);
      return;
    }

    setPatternResult(pattern);
   await loadEntries(profileKey);
  };

  const updateResponse = (value) => {
    setResponses((prev) => ({ ...prev, [step]: value }));
  };
 const startVoiceInput = async () => {
  setDictationError("");

  try {
    if (!dictationRef.current) {
      dictationRef.current = createRootDictation();
    }

    const dictation = dictationRef.current;

    if (!dictation.isSupported()) {
      setDictationError(
        "Audio recording is not supported in this browser."
      );
      return;
    }

    await dictation.start();

    setRecordingStep(step);
  } catch (error) {
    console.error(
      "Could not start Journal dictation:",
      error
    );

    setRecordingStep(null);

    setDictationError(
      error?.message ||
        "Root could not start the microphone."
    );
  }
};

const stopVoiceInput = async () => {
  if (!dictationRef.current) return;

  const recordedStep = recordingStep;

  setRecordingStep(null);
  setTranscribingStep(recordedStep);
  setDictationError("");

  try {
    const audioFile =
      await dictationRef.current.stop();

    const transcript =
      await transcribeRootAudio(audioFile);

    setResponses((prev) => {
      const existing =
        prev[recordedStep] || "";

      return {
        ...prev,
        [recordedStep]: existing.trim()
          ? `${existing.trim()}\n\n${transcript}`
          : transcript,
      };
    });
  } catch (error) {
    console.error(
      "Journal dictation failed:",
      error
    );

    setDictationError(
      error?.message ||
        "Root could not transcribe that recording."
    );
  } finally {
    setTranscribingStep(null);
  }
};
  const buildEntry = () => {
    return config.prompts
      .map((prompt, index) => `${prompt}\n${responses[index] || ""}`)
      .join("\n\n");
  };

  const saveJournal = async () => {
    const content = buildEntry();
    if (!content.trim()) return;

    const pattern = detectPattern(content);
const profileKey = personalContext?.profileKey;

if (!profileKey) {
  alert("Root could not find your profile. Please return to your profile and try again.");
  return;
}

setSaving(true);

const { error } = await supabase.from("journal_entries").insert([
      {
        profile_key: profileKey,
        prompt_type: activePrompt,
        title: config.heading,
        content,
        emotional_theme: pattern.emotional_theme,
        recommended_coach_mode: pattern.recommended_coach_mode,
        recommended_prompt: pattern.recommended_prompt,
      },
    ]);

    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    setSaved(true);
    if (journey && journey.currentStage === "journal") {
  const updatedJourney = {
    ...journey,
    completedJournal: true,
    currentStage: "insights",
  };

  localStorage.setItem(
    "root_journey_v1",
    JSON.stringify(updatedJourney)
  );

  setJourney(updatedJourney);
  setShowJourneyInsights(true);
}
    setPatternResult(pattern);
    setResponses({});
    setStep(0);
    await loadEntries(profileKey);
  };

  return (
   <RootAtmosphere type="journal">
  <Nav />

  <main style={styles.page}>
    <section style={styles.shell}>
          <div style={styles.glow} />

          <div style={styles.header}>
           <div style={styles.logoWrap}>
  <RootEnso size={86} />
</div>
    {journey?.currentStage === "journal" && (
  <div style={styles.journeyBanner}>
    <p style={styles.journeyLabel}>
      Continuing your Root journey
    </p>

    <h2 style={styles.journeyTitle}>
      Begin noticing the deeper patterns.
    </h2>

    <p style={styles.journeyText}>
      Try reflecting on:
      what seems to trigger this,
      when it becomes louder,
      what softens it,
      and what your system may be asking for.
    </p>
  </div>
)}
            <p style={styles.kicker}>Root Reflection</p>
            <h1 style={styles.title}>Journal</h1>
            <p style={styles.subtitle}>
              A softer way to unload, notice patterns, and give your mind somewhere safe to land.
            </p>
          </div>

          <div style={styles.checkInPanel}>
            <div>
              <p style={styles.kicker}>Quick check-in</p>
              <h2 style={styles.checkInHeading}>How are you arriving right now?</h2>
            </div>

            <div style={styles.checkInRow}>
              {quickCheckIns.map((item) => (
                <button
                  key={item.label}
                  style={{
                    ...styles.checkInButton,
                    ...(selectedCheckIn?.label === item.label ? styles.checkInButtonActive : {}),
                  }}
                  onClick={() => saveQuickCheckIn(item)}
                >
                  <span style={styles.checkInEmoji}>{item.emoji}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div style={styles.promptGrid}>
            {prompts.map((prompt) => (
              <button
                key={prompt.id}
                onClick={() => {
                  setActivePrompt(prompt.id);
                  setStep(0);
                  setResponses({});
                  setSaved(false);
                  setPatternResult(null);
                }}
                style={{
                  ...styles.promptCard,
                  ...(activePrompt === prompt.id ? styles.promptCardActive : {}),
                }}
              >
                <span style={styles.promptIcon}>{prompt.icon}</span>
                <strong>{prompt.title}</strong>
                <span style={styles.promptSubtitle}>{prompt.subtitle}</span>
              </button>
            ))}
          </div>

          <div style={styles.journeyPanel}>
            <div style={styles.progressRow}>
              {config.prompts.map((_, index) => (
                <div
                  key={index}
                  style={{
                    ...styles.progressDot,
                    opacity: index <= step ? 1 : 0.25,
                  }}
                />
              ))}
            </div>

            <p style={styles.kicker}>Guided reflection</p>
            <h2 style={styles.panelTitle}>{config.heading}</h2>
            <p style={styles.panelIntro}>{config.intro}</p>

            <label style={styles.label}>{currentPrompt}</label>

            <textarea
              style={styles.textarea}
              value={responses[step] || ""}
              onChange={(e) => updateResponse(e.target.value)}
              placeholder="Write a little, or just a few words..."
            />
               <div>
  <button
    type="button"
    style={{
      ...styles.voiceInputButton,
      ...(recordingStep === step
        ? styles.voiceInputButtonActive
        : {}),
      opacity:
        transcribingStep === step
          ? 0.65
          : 1,
    }}
    disabled={transcribingStep !== null}
    onClick={
      recordingStep === step
        ? stopVoiceInput
        : startVoiceInput
    }
  >
    {transcribingStep === step
      ? "Transcribing..."
      : recordingStep === step
      ? "⏹ Stop & transcribe"
      : "🎙️ Speak instead"}
  </button>

  {recordingStep === step && (
    <p
      style={{
        margin: "10px 0 0",
        fontSize: "13px",
        color: "#5A554D",
      }}
    >
      Recording — take your time. Root will continue listening until you press Stop.
    </p>
  )}

  {dictationError && (
    <p
      style={{
        margin: "10px 0 0",
        fontSize: "13px",
        color: "#7A342F",
      }}
    >
      {dictationError}
    </p>
  )}
</div>

            <div style={styles.buttonRow}>
              {step > 0 ? (
                <button style={styles.secondaryButton} onClick={() => setStep(step - 1)}>
                  Back
                </button>
              ) : (
                <span />
              )}

              {step < config.prompts.length - 1 ? (
                <button style={styles.mainButton} onClick={() => setStep(step + 1)}>
                  Continue
                </button>
              ) : (
                <button style={styles.mainButton} onClick={saveJournal}>
                  {saving ? "Saving..." : saved ? "Saved ✓" : "Save reflection"}
                </button>
              )}
            </div>
          </div>

          {patternResult && (
            <div style={styles.insightCard}>
              <p style={styles.kicker}>Pattern noticed</p>
              <h2 style={styles.insightTitle}>{patternResult.emotional_theme}</h2>
              <p style={styles.insightText}>
                Suggested next step: <strong>{patternResult.recommended_coach_mode}</strong> —{" "}
                {patternResult.recommended_prompt}
              </p>
            </div>
          )}
                  {showJourneyInsights && (
  <div style={styles.nextJourneyPanel}>
    <p style={styles.journeyLabel}>
      Root is beginning to notice patterns
    </p>

    <h2 style={styles.nextJourneyTitle}>
      View your Root Insights
    </h2>

    <p style={styles.nextJourneyText}>
      Root is beginning to connect:
      body tension,
      emotional load,
      nervous system stress,
      and recovery patterns across your journey.
    </p>

    <a
      href="/insights"
      style={styles.nextJourneyButton}
    >
      Continue to Insights →
    </a>
  </div>
)}

          <div style={styles.historyPanel}>
            <div style={styles.historyHeader}>
              <div>
                <p style={styles.kicker}>Memory</p>
                <h2 style={styles.historyTitle}>Recent reflections</h2>
              </div>
            </div>

            {entries.length === 0 ? (
              <p style={styles.emptyText}>No reflections saved yet.</p>
            ) : (
              entries.map((entry) => (
                <button
                  key={entry.id}
                  style={styles.entryCard}
                  onClick={() => setOpenEntry(openEntry?.id === entry.id ? null : entry)}
                >
                  <div style={styles.entryTop}>
                    <div>
                      <strong>{entry.title || "Reflection"}</strong>
                      <p style={styles.entryMeta}>
                        {entry.emotional_theme || "general reflection"} ·{" "}
                        {entry.created_at ? new Date(entry.created_at).toLocaleDateString("en-GB") : ""}
                      </p>
                    </div>
                    <span style={styles.entryBadge}>{entry.recommended_coach_mode || "Coach"}</span>
                  </div>

                  <p style={styles.entryNext}>{entry.recommended_prompt}</p>

                  {openEntry?.id === entry.id && (
                    <div style={styles.openEntry}>
                      <p>{entry.content}</p>
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
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
    padding: "112px 28px 28px",
  },
logoWrap: {
  display: "flex",
  justifyContent: "center",
  marginBottom: "10px",
},
  shell: {
    position: "relative",
    overflow: "hidden",
    width: "100%",
    maxWidth: "1120px",
    background: "rgba(255,255,255,0.56)",
    border: "1px solid rgba(255,255,255,0.26)",
    backdropFilter: "blur(28px)",
    borderRadius: "42px",
    padding: "38px",
    boxShadow: "0 34px 100px rgba(38,33,25,0.16)",
  },

  glow: {
    position: "absolute",
    top: "-110px",
    right: "-70px",
    width: "280px",
    height: "280px",
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(0,0,0,0.14), rgba(0,0,0,0.02) 70%)",
  },

  header: {
    textAlign: "center",
    position: "relative",
    zIndex: 2,
    marginBottom: "28px",
  },

  brandMark: {
    fontSize: "46px",
    marginBottom: "6px",
  },

  kicker: {
    margin: "0 0 10px",
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
    maxWidth: "720px",
    margin: "0 auto",
    color: "#5A554D",
    lineHeight: "1.75",
    fontSize: "17px",
  },

  checkInPanel: {
    position: "relative",
    zIndex: 2,
   background: "linear-gradient(135deg, rgba(28,28,28,0.58), rgba(52,48,42,0.52))",
    borderRadius: "34px",
    padding: "30px",
    color: "#FFFFFF",
    marginBottom: "22px",
    boxShadow: "0 24px 70px rgba(0,0,0,0.18)",
  },

  checkInHeading: {
    margin: "0 0 20px",
    fontSize: "28px",
  },

  checkInRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
  },

  checkInButton: {
    border: "1px solid rgba(255,255,255,0.24)",
    borderRadius: "999px",
    padding: "12px 16px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    background: "rgba(255,255,255,0.12)",
    color: "#FFFFFF",
    backdropFilter: "blur(8px)",
  },

  checkInButtonActive: {
    background: "#FFFFFF",
    color: "#181818",
  },

  checkInEmoji: {
    fontSize: "18px",
  },

  promptGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
    gap: "14px",
    marginBottom: "22px",
  },

  promptCard: {
    border: "1px solid rgba(255,255,255,0.72)",
    borderRadius: "26px",
    padding: "22px",
    cursor: "pointer",
    background: "rgba(255,255,255,0.28)",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    textAlign: "left",
    boxShadow: "0 14px 34px rgba(0,0,0,0.06)",
  },

  promptCardActive: {
    background: "#181818",
    color: "#FFFFFF",
  },

  promptIcon: {
    fontSize: "28px",
  },

  promptSubtitle: {
    fontSize: "14px",
    lineHeight: "1.5",
    opacity: 0.78,
  },

  journeyPanel: {
    background: "rgba(255,255,255,0.34)",
    border: "1px solid rgba(255,255,255,0.72)",
    borderRadius: "34px",
    padding: "34px",
    backdropFilter: "blur(12px)",
    boxShadow: "0 18px 48px rgba(43,38,30,0.08)",
  },

  progressRow: {
    display: "flex",
    gap: "8px",
    marginBottom: "26px",
  },

  progressDot: {
    width: "12px",
    height: "12px",
    borderRadius: "999px",
    background: "#181818",
  },

  panelTitle: {
    fontSize: "32px",
    margin: "0 0 10px",
    color: "#181818",
  },

  panelIntro: {
    color: "#5A554D",
    lineHeight: "1.8",
    marginBottom: "28px",
  },

  label: {
    display: "block",
    marginBottom: "14px",
    fontWeight: "800",
    color: "#2A2722",
    fontSize: "18px",
  },

  textarea: {
    width: "100%",
    minHeight: "220px",
    border: "1px solid rgba(255,255,255,0.8)",
    borderRadius: "26px",
    padding: "20px",
    fontSize: "16px",
    resize: "vertical",
    outline: "none",
    boxSizing: "border-box",
    lineHeight: "1.8",
    background: "rgba(255,255,255,0.76)",
  },

  buttonRow: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: "24px",
  },

  mainButton: {
    border: "none",
    borderRadius: "20px",
    padding: "14px 24px",
    background: "#181818",
    color: "#FFFFFF",
    cursor: "pointer",
    fontSize: "15px",
  },

  secondaryButton: {
    border: "none",
    borderRadius: "20px",
    padding: "14px 24px",
    background: "rgba(255,255,255,0.72)",
    color: "#333",
    cursor: "pointer",
    fontSize: "15px",
  },

  insightCard: {
    marginTop: "24px",
    background: "rgba(24,24,24,0.08)",
    borderRadius: "30px",
    padding: "26px",
    border: "1px solid rgba(24,24,24,0.08)",
  },

  insightTitle: {
    margin: "0 0 10px",
    fontSize: "26px",
    color: "#181818",
    textTransform: "capitalize",
  },

  insightText: {
    margin: 0,
    color: "#4F4A43",
    lineHeight: "1.75",
  },

  historyPanel: {
    marginTop: "26px",
    background: "rgba(255,255,255,0.30)",
    borderRadius: "34px",
    padding: "30px",
    boxShadow: "0 18px 48px rgba(43,38,30,0.08)",
    border: "1px solid rgba(255,255,255,0.72)",
  },

  historyHeader: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "18px",
  },

  historyTitle: {
    margin: 0,
    fontSize: "26px",
    color: "#181818",
  },

  emptyText: {
    color: "#777",
  },

  entryCard: {
    width: "100%",
    border: "1px solid rgba(255,255,255,0.72)",
    background: "rgba(255,255,255,0.22)",
    borderRadius: "24px",
    padding: "20px",
    marginBottom: "12px",
    textAlign: "left",
    cursor: "pointer",
  },

  entryTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: "16px",
  },

  entryMeta: {
    color: "#777",
    fontSize: "13px",
    margin: "6px 0",
  },

  entryBadge: {
    background: "#181818",
    color: "#FFFFFF",
    borderRadius: "999px",
    padding: "7px 10px",
    fontSize: "12px",
    height: "fit-content",
  },

  entryNext: {
    color: "#333",
    fontSize: "14px",
    margin: "8px 0 0",
  },

  openEntry: {
    marginTop: "14px",
    paddingTop: "14px",
    borderTop: "1px solid rgba(0,0,0,0.08)",
    color: "#333",
    whiteSpace: "pre-line",
    lineHeight: "1.75",
  },
  journeyBanner: {
  marginBottom: "22px",
  background: "rgba(24,24,24,0.48)",
  borderRadius: "32px",
  padding: "30px",
  color: "#FFFFFF",
  border: "1px solid rgba(255,255,255,0.14)",
  backdropFilter: "blur(16px)",
},

journeyLabel: {
  margin: "0 0 10px",
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  color: "rgba(255,255,255,0.72)",
  fontWeight: "800",
},

journeyTitle: {
  margin: "0 0 12px",
  fontFamily: "Georgia, serif",
  fontSize: "34px",
  fontWeight: "500",
},

journeyText: {
  margin: 0,
  lineHeight: "1.85",
  color: "rgba(255,255,255,0.84)",
},

nextJourneyPanel: {
  marginTop: "24px",
  background: "rgba(255,255,255,0.58)",
  borderRadius: "30px",
  padding: "28px",
  border: "1px solid rgba(255,255,255,0.72)",
  boxShadow: "0 18px 48px rgba(43,38,30,0.08)",
},

nextJourneyTitle: {
  margin: "0 0 12px",
  fontFamily: "Georgia, serif",
  fontSize: "30px",
  fontWeight: "500",
  color: "#2A261F",
},

nextJourneyText: {
  margin: "0 0 18px",
  lineHeight: "1.8",
  color: "#4D463B",
},

nextJourneyButton: {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  textDecoration: "none",
  background: "#181818",
  color: "#FFFFFF",
  borderRadius: "999px",
  padding: "14px 20px",
  fontSize: "14px",
  fontWeight: "700",
},
  voiceInputButton: {
  marginTop: "14px",
  border: "1px solid rgba(24,24,24,0.12)",
  borderRadius: "999px",
  padding: "12px 18px",
  background: "rgba(255,255,255,0.72)",
  color: "#2A2722",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: "700",
},

voiceInputButtonActive: {
  background: "#181818",
  color: "#FFFFFF",
},
};
