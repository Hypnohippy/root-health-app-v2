"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import Nav from "../../components/Nav";

const prompts = [
  { id: "free", title: "Free reflection", subtitle: "Write freely without structure.", icon: "✍️" },
  { id: "guilt", title: "Guilt & self-pressure", subtitle: "Separate responsibility from self-attack.", icon: "🧠" },
  { id: "anxiety", title: "Anxiety & overwhelm", subtitle: "Slow the spiral and ground the system.", icon: "🌬️" },
  { id: "grief", title: "Grief & emotional heaviness", subtitle: "Give difficult feelings somewhere to land.", icon: "🌙" },
  { id: "clarity", title: "Clarity & direction", subtitle: "Untangle what matters and what comes next.", icon: "🌿" },
];

function detectPattern(text = "") {
  const lower = text.toLowerCase();

  if (lower.includes("anxious") || lower.includes("anxiety") || lower.includes("panic") || lower.includes("overwhelm")) {
    return { emotional_theme: "anxiety", recommended_coach_mode: "Mind & mood", recommended_prompt: "Breathwork or CBT-style reframing" };
  }

  if (lower.includes("guilt") || lower.includes("shame") || lower.includes("pressure")) {
    return { emotional_theme: "guilt & pressure", recommended_coach_mode: "Mind & mood", recommended_prompt: "CBT-style reframing" };
  }

  if (lower.includes("grief") || lower.includes("loss") || lower.includes("heavy")) {
    return { emotional_theme: "grief", recommended_coach_mode: "Mind & mood", recommended_prompt: "Guided journaling" };
  }

  return { emotional_theme: "general reflection", recommended_coach_mode: "Lifestyle", recommended_prompt: "Guided journaling" };
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

  const config = getPromptStructure(activePrompt);
  const currentPrompt = config.prompts[step];

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    const { data } = await supabase
      .from("journal_entries")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(8);

    setEntries(Array.isArray(data) ? data : []);
  };

  const updateResponse = (value) => {
    setResponses((prev) => ({ ...prev, [step]: value }));
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
    setSaving(true);

    const { error } = await supabase.from("journal_entries").insert([
      {
        profile_key: "main",
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
    setPatternResult(pattern);
    setResponses({});
    setStep(0);
    await loadEntries();
  };

  return (
    <>
      <Nav />

      <main style={styles.page}>
        <section style={styles.shell}>
          <div style={styles.brandMark}>◯</div>
          <h1 style={styles.title}>Journal</h1>
          <p style={styles.subtitle}>
            Slow things down. Reflect gently. Notice what your mind and body may be carrying.
          </p>

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
                  background: activePrompt === prompt.id ? "#1A1A1A" : "#FFFFFF",
                  color: activePrompt === prompt.id ? "#FFFFFF" : "#1A1A1A",
                }}
              >
                <span style={styles.promptIcon}>{prompt.icon}</span>
                <strong>{prompt.title}</strong>
                <span style={{ ...styles.promptSubtitle, color: activePrompt === prompt.id ? "#E5E5E5" : "#666" }}>
                  {prompt.subtitle}
                </span>
              </button>
            ))}
          </div>

          <div style={styles.panel}>
            <div style={styles.progressRow}>
              {config.prompts.map((_, index) => (
                <div key={index} style={{ ...styles.progressDot, opacity: index <= step ? 1 : 0.25 }} />
              ))}
            </div>

            <h2 style={styles.panelTitle}>{config.heading}</h2>
            <p style={styles.panelIntro}>{config.intro}</p>

            <label style={styles.label}>{currentPrompt}</label>
            <textarea
              style={styles.textarea}
              value={responses[step] || ""}
              onChange={(e) => updateResponse(e.target.value)}
              placeholder="Write whatever comes up..."
            />

            <div style={styles.buttonRow}>
              {step > 0 && (
                <button style={styles.secondaryButton} onClick={() => setStep(step - 1)}>
                  Back
                </button>
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
              <p style={styles.insightLabel}>Pattern noticed</p>
              <p style={styles.insightText}>
                This reflection seems connected to <strong>{patternResult.emotional_theme}</strong>.
              </p>
              <p style={styles.insightText}>
                Suggested next step: <strong>{patternResult.recommended_coach_mode}</strong> — {patternResult.recommended_prompt}
              </p>
            </div>
          )}

          <div style={styles.historyPanel}>
            <h2 style={styles.historyTitle}>Recent reflections</h2>

            {entries.length === 0 ? (
              <p style={styles.emptyText}>No reflections saved yet.</p>
            ) : (
              entries.map((entry) => (
                <button key={entry.id} style={styles.entryCard} onClick={() => setOpenEntry(openEntry?.id === entry.id ? null : entry)}>
                  <div>
                    <strong>{entry.title || "Reflection"}</strong>
                    <p style={styles.entryMeta}>
                      {entry.emotional_theme || "general reflection"} ·{" "}
                      {entry.created_at ? new Date(entry.created_at).toLocaleDateString("en-GB") : ""}
                    </p>
                  </div>

                  <p style={styles.entryNext}>
                    {entry.recommended_coach_mode} — {entry.recommended_prompt}
                  </p>

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
    maxWidth: "920px",
    background: "rgba(255,255,255,0.88)",
    borderRadius: "34px",
    padding: "34px",
    boxShadow: "0 24px 70px rgba(0,0,0,0.08)",
  },
  brandMark: { textAlign: "center", fontSize: "42px", marginBottom: "8px" },
  title: { textAlign: "center", fontSize: "38px", marginBottom: "10px", color: "#1A1A1A" },
  subtitle: { textAlign: "center", maxWidth: "700px", margin: "0 auto 30px", color: "#666", lineHeight: "1.7" },
  promptGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", marginBottom: "28px" },
  promptCard: { border: "1px solid #E7E2D9", borderRadius: "24px", padding: "20px", cursor: "pointer", display: "flex", flexDirection: "column", gap: "8px", textAlign: "left" },
  promptIcon: { fontSize: "28px" },
  promptSubtitle: { fontSize: "14px", lineHeight: "1.5" },
  panel: { background: "#FFFFFF", borderRadius: "28px", padding: "34px", boxShadow: "0 12px 34px rgba(0,0,0,0.05)" },
  progressRow: { display: "flex", gap: "8px", marginBottom: "26px" },
  progressDot: { width: "12px", height: "12px", borderRadius: "999px", background: "#1A1A1A", transition: "0.3s ease" },
  panelTitle: { fontSize: "30px", marginBottom: "10px", color: "#1A1A1A" },
  panelIntro: { color: "#666", lineHeight: "1.8", marginBottom: "28px" },
  label: { display: "block", marginBottom: "14px", fontWeight: "700", color: "#333", fontSize: "18px" },
  textarea: { width: "100%", minHeight: "220px", border: "1px solid #E6E2DA", borderRadius: "22px", padding: "18px", fontSize: "16px", resize: "vertical", outline: "none", boxSizing: "border-box", lineHeight: "1.8" },
  buttonRow: { display: "flex", justifyContent: "space-between", marginTop: "24px" },
  mainButton: { border: "none", borderRadius: "18px", padding: "14px 24px", background: "#1A1A1A", color: "#FFFFFF", cursor: "pointer", fontSize: "15px" },
  secondaryButton: { border: "none", borderRadius: "18px", padding: "14px 24px", background: "#EDE9E1", color: "#333", cursor: "pointer", fontSize: "15px" },
  insightCard: { marginTop: "26px", background: "#F7F5F2", borderRadius: "24px", padding: "24px", border: "1px solid #E6E2DA" },
  insightLabel: { fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#777", marginBottom: "12px", fontWeight: "700" },
  insightText: { color: "#333", lineHeight: "1.8", marginBottom: "10px" },
  historyPanel: { marginTop: "28px", background: "#FFFFFF", borderRadius: "28px", padding: "26px", boxShadow: "0 12px 34px rgba(0,0,0,0.05)" },
  historyTitle: { fontSize: "24px", marginBottom: "16px", color: "#1A1A1A" },
  emptyText: { color: "#777" },
  entryCard: { width: "100%", border: "1px solid #E6E2DA", background: "#FDFCFB", borderRadius: "20px", padding: "18px", marginBottom: "12px", textAlign: "left", cursor: "pointer" },
  entryMeta: { color: "#777", fontSize: "13px", margin: "6px 0" },
  entryNext: { color: "#333", fontSize: "14px", margin: "8px 0 0" },
  openEntry: { marginTop: "14px", paddingTop: "14px", borderTop: "1px solid #E6E2DA", color: "#333", whiteSpace: "pre-line", lineHeight: "1.7" },
};
