"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";
import Nav from "../../components/Nav";

const prompts = [
  {
    id: "free",
    title: "Free reflection",
    subtitle: "Write freely without structure.",
    icon: "✍️",
  },
  {
    id: "guilt",
    title: "Guilt & self-pressure",
    subtitle: "Separate responsibility from self-attack.",
    icon: "🧠",
  },
  {
    id: "anxiety",
    title: "Anxiety & overwhelm",
    subtitle: "Slow the spiral and ground the system.",
    icon: "🌬️",
  },
  {
    id: "grief",
    title: "Grief & emotional heaviness",
    subtitle: "Give difficult feelings somewhere to land.",
    icon: "🌙",
  },
  {
    id: "clarity",
    title: "Clarity & direction",
    subtitle: "Untangle what matters and what comes next.",
    icon: "🌿",
  },
];
function detectPattern(text = "") {
  const lower = text.toLowerCase();

  if (
    lower.includes("anxious") ||
    lower.includes("anxiety") ||
    lower.includes("panic") ||
    lower.includes("overwhelm")
  ) {
    return {
      emotional_theme: "anxiety",
      dominant_feeling: "anxious",
      recommended_coach_mode: "Mind & mood",
      recommended_prompt: "Breathwork or CBT-style reframing",
    };
  }

  if (
    lower.includes("guilt") ||
    lower.includes("shame") ||
    lower.includes("pressure") ||
    lower.includes("self critical")
  ) {
    return {
      emotional_theme: "guilt & pressure",
      dominant_feeling: "guilt",
      recommended_coach_mode: "Mind & mood",
      recommended_prompt: "CBT-style reframing",
    };
  }

  if (
    lower.includes("grief") ||
    lower.includes("loss") ||
    lower.includes("sad") ||
    lower.includes("heavy")
  ) {
    return {
      emotional_theme: "grief",
      dominant_feeling: "sadness",
      recommended_coach_mode: "Mind & mood",
      recommended_prompt: "Journaling reflection",
    };
  }

  return {
    emotional_theme: "general reflection",
    dominant_feeling: "reflection",
    recommended_coach_mode: "Lifestyle",
    recommended_prompt: "Guided journaling",
  };
}
function getPromptStructure(type) {
  switch (type) {
    case "guilt":
      return {
        heading: "Guilt & self-pressure",
        intro:
          "This is not about attacking yourself. Let’s slow the situation down and separate feeling from fact.",
        prompts: [
          "What happened?",
          "What part feels genuinely important?",
          "What part may be self-pressure or fear?",
          "What would you say to someone else in this position?",
        ],
      };

    case "anxiety":
      return {
        heading: "Anxiety & overwhelm",
        intro:
          "You do not need to solve everything right now. Let’s reduce the noise first.",
        prompts: [
          "What feels loudest right now?",
          "What is your mind predicting?",
          "What is actually happening in this moment?",
          "What would help your nervous system feel 5% safer?",
        ],
      };

    case "grief":
      return {
        heading: "Grief & emotional heaviness",
        intro:
          "Some feelings don’t need fixing immediately. This space is for letting them exist safely.",
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
        intro:
          "Let’s reduce the mental fog and reconnect with what matters.",
        prompts: [
          "What situation are you trying to understand?",
          "What matters most here?",
          "What is draining your energy?",
          "What is one small next step that feels honest?",
        ],
      };

    default:
      return {
        heading: "Free reflection",
        intro:
          "Write freely. No structure required. Just let your thoughts land somewhere.",
        prompts: [],
      };
  }
}

export default function JournalPage() {
  const [activePrompt, setActivePrompt] = useState("free");
  const [responses, setResponses] = useState({});
  const [freeText, setFreeText] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
const [patternResult, setPatternResult] = useState(null);
  const config = getPromptStructure(activePrompt);

  const updateResponse = (index, value) => {
    setResponses((prev) => ({
      ...prev,
      [index]: value,
    }));
  };

  const buildEntry = () => {
    if (activePrompt === "free") {
      return freeText;
    }

    return config.prompts
      .map((prompt, index) => {
        return `${prompt}\n${responses[index] || ""}`;
      })
      .join("\n\n");
  };

  const saveJournal = async () => {
    const content = buildEntry();
const pattern = detectPattern(content);
    if (!content.trim()) return;

    setSaving(true);

    const { error } = await supabase.from("journal_entries").insert([
     {
  profile_key: "main",
  prompt_type: activePrompt,
  title: config.heading,
  content,
  emotional_theme: pattern.emotional_theme,
  dominant_feeling: pattern.dominant_feeling,
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
    setPatternResult(pattern);
  };

  return (
    <>
      <Nav />

      <main style={styles.page}>
        <section style={styles.shell}>
          <div style={styles.brandMark}>◯</div>

          <h1 style={styles.title}>Journal</h1>

          <p style={styles.subtitle}>
            A space to reflect, process, slow things down, and understand what
            your mind and body are carrying.
          </p>

          <div style={styles.promptGrid}>
            {prompts.map((prompt) => (
              <button
                key={prompt.id}
                onClick={() => {
                  setActivePrompt(prompt.id);
                  setSaved(false);
                }}
                style={{
                  ...styles.promptCard,
                  background:
                    activePrompt === prompt.id ? "#1A1A1A" : "#FFFFFF",
                  color:
                    activePrompt === prompt.id ? "#FFFFFF" : "#1A1A1A",
                }}
              >
                <span style={styles.promptIcon}>{prompt.icon}</span>

                <strong>{prompt.title}</strong>

                <span
                  style={{
                    ...styles.promptSubtitle,
                    color:
                      activePrompt === prompt.id ? "#E5E5E5" : "#666",
                  }}
                >
                  {prompt.subtitle}
                </span>
              </button>
            ))}
          </div>

          <div style={styles.panel}>
            <h2 style={styles.panelTitle}>{config.heading}</h2>

            <p style={styles.panelIntro}>{config.intro}</p>

            {activePrompt === "free" ? (
              <textarea
                style={styles.bigTextarea}
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                placeholder="Write whatever feels important..."
              />
            ) : (
              <>
                {config.prompts.map((prompt, index) => (
                  <div key={index} style={styles.questionBlock}>
                    <label style={styles.label}>{prompt}</label>

                    <textarea
                      style={styles.textarea}
                      value={responses[index] || ""}
                      onChange={(e) =>
                        updateResponse(index, e.target.value)
                      }
                      placeholder="Write whatever comes up..."
                    />
                  </div>
                ))}
              </>
            )}

            <button style={styles.saveButton} onClick={saveJournal}>
              {saving
                ? "Saving..."
                : saved
                ? "Saved to Coach memory ✓"
                : "Save reflection"}
            </button>
          </div>
{patternResult && (
  <div style={styles.insightCard}>
    <p style={styles.insightLabel}>Pattern noticed</p>

    <p style={styles.insightText}>
      This reflection seems connected to{" "}
      <strong>{patternResult.emotional_theme}</strong>.
    </p>

    <p style={styles.insightText}>
      Suggested next step:
      <strong>
        {" "}
        {patternResult.recommended_coach_mode}
      </strong>{" "}
      — {patternResult.recommended_prompt}
    </p>
  </div>
)}
          <p style={styles.disclaimer}>
            Root Health offers emotional and lifestyle support. It is not a
            replacement for therapy, crisis support, or medical care.
          </p>
        </section>
      </main>
    </>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #F7F5F2 0%, #E6E2DA 100%)",
    display: "flex",
    justifyContent: "center",
    padding: "24px",
  },

  shell: {
    width: "100%",
    maxWidth: "1000px",
    background: "rgba(255,255,255,0.88)",
    borderRadius: "34px",
    padding: "34px",
    boxShadow: "0 24px 70px rgba(0,0,0,0.08)",
  },

  brandMark: {
    textAlign: "center",
    fontSize: "42px",
    marginBottom: "8px",
  },

  title: {
    textAlign: "center",
    fontSize: "38px",
    marginBottom: "10px",
    color: "#1A1A1A",
  },

  subtitle: {
    textAlign: "center",
    maxWidth: "720px",
    margin: "0 auto 30px",
    color: "#666",
    lineHeight: "1.7",
    fontSize: "16px",
  },

  promptGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "14px",
    marginBottom: "28px",
  },

  promptCard: {
    border: "1px solid #E7E2D9",
    borderRadius: "24px",
    padding: "20px",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    textAlign: "left",
  },

  promptIcon: {
    fontSize: "28px",
  },

  promptSubtitle: {
    fontSize: "14px",
    lineHeight: "1.5",
  },

  panel: {
    background: "#FFFFFF",
    borderRadius: "28px",
    padding: "28px",
    boxShadow: "0 12px 34px rgba(0,0,0,0.05)",
  },

  panelTitle: {
    marginBottom: "8px",
    fontSize: "28px",
    color: "#1A1A1A",
  },

  panelIntro: {
    color: "#666",
    lineHeight: "1.7",
    marginBottom: "24px",
  },

  questionBlock: {
    marginBottom: "22px",
  },

  label: {
    display: "block",
    marginBottom: "10px",
    fontWeight: "700",
    color: "#333",
  },

  textarea: {
    width: "100%",
    minHeight: "110px",
    border: "1px solid #E6E2DA",
    borderRadius: "18px",
    padding: "16px",
    fontSize: "15px",
    resize: "vertical",
    outline: "none",
    boxSizing: "border-box",
    lineHeight: "1.6",
  },

  bigTextarea: {
    width: "100%",
    minHeight: "320px",
    border: "1px solid #E6E2DA",
    borderRadius: "22px",
    padding: "18px",
    fontSize: "15px",
    resize: "vertical",
    outline: "none",
    boxSizing: "border-box",
    lineHeight: "1.7",
  },

  saveButton: {
    marginTop: "10px",
    border: "none",
    borderRadius: "18px",
    padding: "14px 22px",
    background: "#1A1A1A",
    color: "#FFFFFF",
    cursor: "pointer",
    fontSize: "15px",
  },

  disclaimer: {
    marginTop: "28px",
    textAlign: "center",
    color: "#777",
    fontSize: "13px",
    lineHeight: "1.6",
  },
  insightCard: {
  marginTop: "24px",
  background: "#F7F5F2",
  borderRadius: "22px",
  padding: "22px",
  border: "1px solid #E6E2DA",
},

insightLabel: {
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "#777",
  marginBottom: "10px",
  fontWeight: "700",
},

insightText: {
  color: "#333",
  lineHeight: "1.7",
  marginBottom: "10px",
},
};
