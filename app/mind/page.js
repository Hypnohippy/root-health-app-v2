"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";
import Nav from "../../components/Nav";

const tools = [
  {
    id: "cbt",
    title: "CBT-style reframing",
    subtitle: "Catch the thought, soften the meaning, choose a steadier next step.",
    icon: "🧠",
  },
  {
    id: "calming",
    title: "Hypnotherapy-style calming",
    subtitle: "A gentle reset for the body and mind.",
    icon: "🌙",
  },
  {
    id: "grounding",
    title: "EMDR-informed grounding",
    subtitle: "Orient back to safety and the present moment.",
    icon: "🧩",
  },
  {
    id: "breathwork",
    title: "Breathwork",
    subtitle: "Use the breath to settle the nervous system.",
    icon: "🌬️",
  },
  {
    id: "journal",
    title: "Journaling prompts",
    subtitle: "Reflect without spiralling.",
    icon: "✍️",
  },
  {
    id: "values",
    title: "Values & behaviour change",
    subtitle: "Reconnect with what matters and choose one action.",
    icon: "🌿",
  },
];

function buildReframe({ situation, automaticThought, emotion, intensity }) {
  const feeling = emotion || "this feeling";
  const thought = automaticThought || "the thought that showed up";

  return `A steadier way to hold this might be:

“I notice ${thought}. That may be my mind trying to protect me, but it may not be the whole truth. I can pause, look for more evidence, and choose one small helpful action instead of reacting from ${feeling}.”

This does not mean dismissing what you feel. It means creating a little space around it.`;
}

function buildNextStep({ emotion }) {
  if (!emotion) {
    return "Take one slower breath, then choose one small action that supports you rather than pressures you.";
  }

  return `For the next few minutes, treat ${emotion.toLowerCase()} as information rather than instruction. Slow down, reduce pressure, and choose one small grounded action.`;
}

export default function MindPage() {
  const [activeTool, setActiveTool] = useState(null);
  const [situation, setSituation] = useState("");
  const [automaticThought, setAutomaticThought] = useState("");
  const [emotion, setEmotion] = useState("");
  const [intensity, setIntensity] = useState("5");
  const [reframe, setReframe] = useState("");
  const [nextStep, setNextStep] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const resetTool = () => {
    setSituation("");
    setAutomaticThought("");
    setEmotion("");
    setIntensity("5");
    setReframe("");
    setNextStep("");
    setSaved(false);
  };

  const openTool = (toolId) => {
    setActiveTool(toolId);
    resetTool();
  };

  const generateReframe = () => {
    const generatedReframe = buildReframe({
      situation,
      automaticThought,
      emotion,
      intensity,
    });

    const generatedNextStep = buildNextStep({ emotion });

    setReframe(generatedReframe);
    setNextStep(generatedNextStep);
    setSaved(false);
  };

  const saveEntry = async () => {
    if (!reframe) return;

    setSaving(true);

    const { error } = await supabase.from("mind_entries").insert([
      {
        profile_key: "main",
        tool: "CBT-style reframing",
        situation,
        automatic_thought: automaticThought,
        emotion,
        intensity,
        reframe,
        next_step: nextStep,
      },
    ]);

    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    setSaved(true);
  };

  return (
    <>
      <Nav />

      <main style={styles.page}>
        <section style={styles.shell}>
          <div style={styles.brandMark}>◯</div>

          <h1 style={styles.title}>Mind & Emotions</h1>
          <p style={styles.subtitle}>
            Practical support for calming the nervous system, reframing thoughts,
            and understanding emotional patterns.
          </p>

          {!activeTool && (
            <>
              <div style={styles.grid}>
                {tools.map((tool) => (
                  <button
                    key={tool.id}
                    style={styles.toolCard}
                    onClick={() => openTool(tool.id)}
                  >
                    <span style={styles.icon}>{tool.icon}</span>
                    <strong style={styles.toolTitle}>{tool.title}</strong>
                    <span style={styles.toolSubtitle}>{tool.subtitle}</span>
                  </button>
                ))}
              </div>

              <p style={styles.disclaimer}>
                Root Health offers lifestyle and emotional support. It is not a replacement
                for medical care or therapy.
              </p>
            </>
          )}

          {activeTool === "cbt" && (
            <div style={styles.panel}>
              <button style={styles.backButton} onClick={() => setActiveTool(null)}>
                ← Back to tools
              </button>

              <h2 style={styles.panelTitle}>CBT-style reframing</h2>
              <p style={styles.panelSubtitle}>
                This tool helps you notice the thought underneath the emotion and
                create a steadier response.
              </p>

              <label style={styles.label}>1. What happened?</label>
              <textarea
                style={styles.textarea}
                value={situation}
                onChange={(e) => setSituation(e.target.value)}
                placeholder="Example: I saw an email and immediately felt pressure..."
              />

              <label style={styles.label}>2. What thought showed up?</label>
              <textarea
                style={styles.textarea}
                value={automaticThought}
                onChange={(e) => setAutomaticThought(e.target.value)}
                placeholder="Example: I’m going to mess this up..."
              />

              <label style={styles.label}>3. What emotion was loudest?</label>
              <input
                style={styles.input}
                value={emotion}
                onChange={(e) => setEmotion(e.target.value)}
                placeholder="Example: anxiety, shame, frustration, sadness..."
              />

              <label style={styles.label}>4. How strong was it?</label>
              <div style={styles.scoreRow}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                  <button
                    key={score}
                    onClick={() => setIntensity(String(score))}
                    style={{
                      ...styles.scoreButton,
                      background: intensity === String(score) ? "#1A1A1A" : "#F0EDE7",
                      color: intensity === String(score) ? "#FFFFFF" : "#333333",
                    }}
                  >
                    {score}
                  </button>
                ))}
              </div>

              <button style={styles.mainButton} onClick={generateReframe}>
                Create reframe
              </button>

              {reframe && (
                <div style={styles.resultCard}>
                  <p style={styles.resultLabel}>Root reframe</p>
                  <p style={styles.resultText}>{reframe}</p>

                  <p style={styles.resultLabel}>Next grounded step</p>
                  <p style={styles.resultText}>{nextStep}</p>

                  <button style={styles.saveButton} onClick={saveEntry}>
                    {saving ? "Saving..." : saved ? "Saved ✓" : "Save to Coach memory"}
                  </button>
                </div>
              )}
            </div>
          )}

         {activeTool === "breathwork" && (
  <div style={styles.panel}>
    <button style={styles.backButton} onClick={() => setActiveTool(null)}>
      ← Back to tools
    </button>

    <h2 style={styles.panelTitle}>Breathwork</h2>
    <p style={styles.panelSubtitle}>
      Let’s settle the system first. Follow this simple pattern:
    </p>

    <div style={styles.resultCard}>
      <p style={styles.resultText}>
        Inhale slowly for 4 seconds  
        Hold for 2 seconds  
        Exhale gently for 6 seconds  

        Repeat for 2–3 minutes.

        Let the exhale be longer than the inhale — that’s what helps the body settle.
      </p>
    </div>
  </div>
)}

{activeTool === "grounding" && (
  <div style={styles.panel}>
    <button style={styles.backButton} onClick={() => setActiveTool(null)}>
      ← Back to tools
    </button>

    <h2 style={styles.panelTitle}>Grounding</h2>
    <p style={styles.panelSubtitle}>
      Let’s orient back to the present moment.
    </p>

    <div style={styles.resultCard}>
      <p style={styles.resultText}>
        Look around and name:
        5 things you can see  
        4 things you can feel  
        3 things you can hear  
        2 things you can smell  
        1 thing you can taste  

        There’s no rush — just let your attention land.
      </p>
    </div>
  </div>
)}

{activeTool === "calming" && (
  <div style={styles.panel}>
    <button style={styles.backButton} onClick={() => setActiveTool(null)}>
      ← Back to tools
    </button>

    <h2 style={styles.panelTitle}>Hypnotherapy-style calming</h2>
    <p style={styles.panelSubtitle}>
      A gentle reset for the body and mind.
    </p>

    <div style={styles.resultCard}>
      <p style={styles.resultText}>
        Close your eyes if comfortable.

        Take a slow breath in… and out.

        Imagine a place where your body feels safe and at ease.
        It doesn’t have to be real.

        Stay there for a moment.

        Let your shoulders drop.
        Let your jaw soften.
        Let your breathing slow.

        There’s nothing to do here — just allow your system to settle.
      </p>
    </div>
  </div>
)}

{activeTool === "journal" && (
  <div style={styles.panel}>
    <button style={styles.backButton} onClick={() => setActiveTool(null)}>
      ← Back to tools
    </button>

    <h2 style={styles.panelTitle}>Journaling</h2>
    <p style={styles.panelSubtitle}>
      Write without overthinking — just let it out.
    </p>

    <textarea
      style={styles.textarea}
      placeholder="Start writing whatever is on your mind..."
    />
  </div>
)}

{activeTool === "values" && (
  <div style={styles.panel}>
    <button style={styles.backButton} onClick={() => setActiveTool(null)}>
      ← Back to tools
    </button>

    <h2 style={styles.panelTitle}>Values & behaviour</h2>
    <p style={styles.panelSubtitle}>
      Let’s reconnect with what matters and take one step.
    </p>

    <div style={styles.resultCard}>
      <p style={styles.resultText}>
        What actually matters to you in this situation?

        Not what you “should” do — what matters.

        Now choose one small action that moves you 1% closer to that.
      </p>
    </div>
  </div>
)}       
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
    maxWidth: "960px",
    background: "rgba(255,255,255,0.86)",
    borderRadius: "34px",
    padding: "34px",
    boxShadow: "0 24px 70px rgba(0,0,0,0.08)",
    textAlign: "center",
  },
  brandMark: {
    fontSize: "40px",
    marginBottom: "8px",
  },
  title: {
    fontSize: "36px",
    margin: "0 0 8px",
    color: "#1A1A1A",
  },
  subtitle: {
    color: "#555",
    fontSize: "16px",
    lineHeight: "1.6",
    maxWidth: "680px",
    margin: "0 auto 26px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
    gap: "14px",
    marginTop: "20px",
  },
  toolCard: {
    border: "1px solid #E6E2DA",
    borderRadius: "24px",
    padding: "22px",
    background: "#FFFFFF",
    cursor: "pointer",
    textAlign: "left",
    boxShadow: "0 10px 28px rgba(0,0,0,0.05)",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  icon: {
    fontSize: "28px",
  },
  toolTitle: {
    fontSize: "17px",
    color: "#1A1A1A",
  },
  toolSubtitle: {
    fontSize: "14px",
    color: "#666",
    lineHeight: "1.5",
  },
  disclaimer: {
    marginTop: "24px",
    color: "#777",
    fontSize: "13px",
    lineHeight: "1.5",
  },
  panel: {
    marginTop: "22px",
    background: "#FFFFFF",
    borderRadius: "28px",
    padding: "26px",
    textAlign: "left",
    boxShadow: "0 14px 36px rgba(0,0,0,0.06)",
  },
  backButton: {
    border: "none",
    background: "#F0EDE7",
    borderRadius: "999px",
    padding: "9px 14px",
    cursor: "pointer",
    marginBottom: "18px",
  },
  panelTitle: {
    margin: "0 0 8px",
    fontSize: "26px",
    color: "#1A1A1A",
  },
  panelSubtitle: {
    color: "#666",
    lineHeight: "1.6",
    marginBottom: "22px",
  },
  label: {
    display: "block",
    margin: "18px 0 8px",
    fontSize: "14px",
    fontWeight: "700",
    color: "#333",
  },
  textarea: {
    width: "100%",
    minHeight: "90px",
    border: "1px solid #E6E2DA",
    borderRadius: "18px",
    padding: "14px",
    fontSize: "15px",
    resize: "vertical",
    outline: "none",
    boxSizing: "border-box",
  },
  input: {
    width: "100%",
    border: "1px solid #E6E2DA",
    borderRadius: "18px",
    padding: "14px",
    fontSize: "15px",
    outline: "none",
    boxSizing: "border-box",
  },
  scoreRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
  },
  scoreButton: {
    width: "38px",
    height: "38px",
    borderRadius: "50%",
    border: "none",
    cursor: "pointer",
  },
  mainButton: {
    marginTop: "22px",
    border: "none",
    borderRadius: "16px",
    padding: "14px 22px",
    background: "#1A1A1A",
    color: "#FFFFFF",
    cursor: "pointer",
    fontSize: "15px",
  },
  resultCard: {
    marginTop: "24px",
    background: "#F7F5F2",
    borderRadius: "22px",
    padding: "22px",
  },
  resultLabel: {
    margin: "0 0 8px",
    fontSize: "13px",
    color: "#777",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    fontWeight: "700",
  },
  resultText: {
    whiteSpace: "pre-line",
    lineHeight: "1.65",
    color: "#333",
    marginBottom: "18px",
  },
  saveButton: {
    border: "none",
    borderRadius: "16px",
    padding: "12px 18px",
    background: "#1A1A1A",
    color: "#FFFFFF",
    cursor: "pointer",
    fontSize: "14px",
  },
};
