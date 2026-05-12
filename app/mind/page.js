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

function buildReframe({ automaticThought, emotion }) {
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

  const [journalText, setJournalText] = useState("");
  const [valueFocus, setValueFocus] = useState("");
  const [valueAction, setValueAction] = useState("");

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const resetTool = () => {
    setSituation("");
    setAutomaticThought("");
    setEmotion("");
    setIntensity("5");
    setReframe("");
    setNextStep("");
    setJournalText("");
    setValueFocus("");
    setValueAction("");
    setSaved(false);
  };

  const openTool = (toolId) => {
    setActiveTool(toolId);
    resetTool();
  };

  const generateReframe = () => {
    const generatedReframe = buildReframe({
      automaticThought,
      emotion,
    });

    const generatedNextStep = buildNextStep({ emotion });

    setReframe(generatedReframe);
    setNextStep(generatedNextStep);
    setSaved(false);
  };

  const saveEntry = async (entry) => {
    setSaving(true);

    const { error } = await supabase.from("mind_entries").insert([
      {
        profile_key: "main",
        ...entry,
      },
    ]);

    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    setSaved(true);
  };

  const saveCbt = async () => {
    if (!reframe) return;

    await saveEntry({
      tool: "CBT-style reframing",
      situation,
      automatic_thought: automaticThought,
      emotion,
      intensity,
      reframe,
      next_step: nextStep,
    });
  };

  const saveSimpleTool = async (toolName, summary, nextStepText) => {
    await saveEntry({
      tool: toolName,
      situation: summary,
      automatic_thought: "",
      emotion: "",
      intensity: "",
      reframe: summary,
      next_step: nextStepText,
    });
  };

  return (
    <>
      <Nav />

      <main style={styles.page}>
        <section style={styles.shell}>
          <div style={styles.glow} />

          <div style={styles.header}>
            <div style={styles.brandMark}>◯</div>
            <p style={styles.kicker}>Root Mind Library</p>
            <h1 style={styles.title}>Mind & Emotions</h1>
            <p style={styles.subtitle}>
              Guided emotional tools for calming the nervous system, reframing
              thoughts, grounding the body, and choosing steadier action.
            </p>
          </div>

          {!activeTool && (
            <>
              <div style={styles.heroCard}>
                <p style={styles.heroLabel}>Intervention library</p>
                <h2 style={styles.heroTitle}>Choose the support your system needs.</h2>
                <p style={styles.heroText}>
                  Start small. Use one tool. Save what helped so Root Coach can
                  understand the pattern over time.
                </p>
              </div>

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
                Root Health offers lifestyle and emotional support. It is not a
                replacement for medical care, therapy, or crisis support.
              </p>
            </>
          )}

          {activeTool && (
            <button style={styles.backButton} onClick={() => setActiveTool(null)}>
              ← Back to tools
            </button>
          )}

          {activeTool === "cbt" && (
            <div style={styles.panel}>
              <p style={styles.kicker}>Thought work</p>
              <h2 style={styles.panelTitle}>CBT-style reframing</h2>
              <p style={styles.panelSubtitle}>
                Notice the thought underneath the emotion, then create a little
                space around it.
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
                placeholder="Example: anxiety, shame, frustration..."
              />

              <label style={styles.label}>4. How strong was it?</label>
              <div style={styles.scoreRow}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                  <button
                    key={score}
                    onClick={() => setIntensity(String(score))}
                    style={{
                      ...styles.scoreButton,
                      background: intensity === String(score) ? "#181818" : "rgba(255,255,255,0.7)",
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

                  <button style={styles.saveButton} onClick={saveCbt}>
                    {saving ? "Saving..." : saved ? "Saved ✓" : "Save to Coach memory"}
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTool === "breathwork" && (
            <ToolExperience
              kicker="Body regulation"
              title="Breathwork"
              subtitle="A short breath pattern to settle activation."
              body={`Inhale slowly for 4 seconds
Hold for 2 seconds
Exhale gently for 6 seconds

Repeat for 2–3 minutes.

Let the exhale be longer than the inhale. That is the signal to the body that it can begin to settle.`}
              saving={saving}
              saved={saved}
              onSave={() =>
                saveSimpleTool(
                  "Breathwork",
                  "The user completed a 4-2-6 breathing reset.",
                  "Check whether the body feels slightly calmer, slower, or less activated."
                )
              }
            />
          )}

          {activeTool === "grounding" && (
            <ToolExperience
              kicker="Present moment"
              title="EMDR-informed grounding"
              subtitle="A simple orientation exercise for safety and presence."
              body={`Look around and name:

5 things you can see
4 things you can feel
3 things you can hear
2 things you can smell
1 thing you can taste

There is no rush. Let your attention land on what is here now.`}
              saving={saving}
              saved={saved}
              onSave={() =>
                saveSimpleTool(
                  "EMDR-informed grounding",
                  "The user completed a 5-4-3-2-1 grounding exercise.",
                  "Check whether the user feels more present, safer, or less overwhelmed."
                )
              }
            />
          )}

          {activeTool === "calming" && (
            <ToolExperience
              kicker="Calming journey"
              title="Hypnotherapy-style calming"
              subtitle="A gentle inner reset for the body and mind."
              body={`Close your eyes if comfortable.

Take a slow breath in… and out.

Imagine a place where your body feels safe and at ease. It does not have to be real.

Let the image arrive slowly.

Let your shoulders drop.
Let your jaw soften.
Let your breathing slow.

There is nothing to force here. Just allow your system to settle a little more with each out-breath.`}
              saving={saving}
              saved={saved}
              onSave={() =>
                saveSimpleTool(
                  "Hypnotherapy-style calming",
                  "The user completed a gentle calming visualisation.",
                  "Check whether the user feels softer, calmer, safer, or more settled."
                )
              }
            />
          )}

          {activeTool === "journal" && (
            <div style={styles.panel}>
              <p style={styles.kicker}>Reflection</p>
              <h2 style={styles.panelTitle}>Journaling prompts</h2>
              <p style={styles.panelSubtitle}>
                This is a light bridge into reflection. The full Journal page
                holds the deeper history and patterns.
              </p>

              <label style={styles.label}>What is on your mind?</label>
              <textarea
                style={styles.textarea}
                value={journalText}
                onChange={(e) => setJournalText(e.target.value)}
                placeholder="Write a little, or just a few words..."
              />

              <button
                style={styles.mainButton}
                onClick={() =>
                  saveEntry({
                    tool: "Journaling prompts",
                    situation: journalText,
                    automatic_thought: "",
                    emotion: "",
                    intensity: "",
                    reframe: journalText,
                    next_step:
                      "Reflect on what repeated, what softened, and what needs attention next.",
                  })
                }
              >
                {saving ? "Saving..." : saved ? "Saved ✓" : "Save to Coach memory"}
              </button>
            </div>
          )}

          {activeTool === "values" && (
            <div style={styles.panel}>
              <p style={styles.kicker}>Aligned action</p>
              <h2 style={styles.panelTitle}>Values & behaviour change</h2>
              <p style={styles.panelSubtitle}>
                Reconnect with what matters, then choose one small action that
                moves you towards it.
              </p>

              <label style={styles.label}>What matters here?</label>
              <textarea
                style={styles.textarea}
                value={valueFocus}
                onChange={(e) => setValueFocus(e.target.value)}
                placeholder="Example: honesty, calm, health, family, courage..."
              />

              <label style={styles.label}>What is one small action?</label>
              <textarea
                style={styles.textarea}
                value={valueAction}
                onChange={(e) => setValueAction(e.target.value)}
                placeholder="Example: send the message, take a walk, prepare one meal..."
              />

              <button
                style={styles.mainButton}
                onClick={() =>
                  saveEntry({
                    tool: "Values & behaviour change",
                    situation: valueFocus,
                    automatic_thought: "",
                    emotion: "",
                    intensity: "",
                    reframe: "The user identified this value: " + valueFocus,
                    next_step: valueAction,
                  })
                }
              >
                {saving ? "Saving..." : saved ? "Saved ✓" : "Save to Coach memory"}
              </button>
            </div>
          )}
        </section>
      </main>
    </>
  );
}

function ToolExperience({ kicker, title, subtitle, body, saving, saved, onSave }) {
  return (
    <div style={styles.panel}>
      <p style={styles.kicker}>{kicker}</p>
      <h2 style={styles.panelTitle}>{title}</h2>
      <p style={styles.panelSubtitle}>{subtitle}</p>

      <div style={styles.experienceCard}>
        <p style={styles.experienceText}>{body}</p>
      </div>

      <button style={styles.saveButton} onClick={onSave}>
        {saving ? "Saving..." : saved ? "Saved ✓" : "Save to Coach memory"}
      </button>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top left, rgba(255,255,255,0.95), transparent 32%), linear-gradient(135deg, #D8CDBB 0%, #F6F1E9 38%, #B9C5BD 100%)",
    display: "flex",
    justifyContent: "center",
    padding: "28px",
  },

  shell: {
    position: "relative",
    overflow: "hidden",
    width: "100%",
    maxWidth: "1120px",
    background: "rgba(255,255,255,0.56)",
    border: "1px solid rgba(255,255,255,0.72)",
    backdropFilter: "blur(22px)",
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
    maxWidth: "760px",
    margin: "0 auto",
    color: "#5A554D",
    lineHeight: "1.75",
    fontSize: "17px",
  },

  heroCard: {
    background:
      "linear-gradient(135deg, rgba(24,24,24,0.92), rgba(52,48,42,0.92))",
    borderRadius: "34px",
    padding: "30px",
    color: "#FFFFFF",
    marginBottom: "22px",
    boxShadow: "0 24px 70px rgba(0,0,0,0.18)",
  },

  heroLabel: {
    margin: "0 0 12px",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.14em",
    color: "#D8CDBB",
    fontWeight: "800",
  },

  heroTitle: {
    margin: "0 0 12px",
    fontSize: "30px",
  },

  heroText: {
    margin: 0,
    lineHeight: "1.75",
    color: "#E7E0D6",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "16px",
    marginBottom: "24px",
  },

  toolCard: {
    border: "1px solid rgba(255,255,255,0.72)",
    borderRadius: "28px",
    padding: "24px",
    background: "rgba(255,255,255,0.68)",
    cursor: "pointer",
    textAlign: "left",
    boxShadow: "0 14px 34px rgba(0,0,0,0.06)",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    backdropFilter: "blur(10px)",
  },

  icon: {
    fontSize: "30px",
  },

  toolTitle: {
    fontSize: "18px",
    color: "#181818",
  },

  toolSubtitle: {
    fontSize: "14px",
    color: "#5A554D",
    lineHeight: "1.55",
  },

  disclaimer: {
    marginTop: "24px",
    color: "#6F675B",
    fontSize: "13px",
    lineHeight: "1.6",
    textAlign: "center",
  },

  backButton: {
    border: "1px solid rgba(255,255,255,0.72)",
    background: "rgba(255,255,255,0.68)",
    borderRadius: "999px",
    padding: "11px 16px",
    cursor: "pointer",
    marginBottom: "18px",
    color: "#333",
    backdropFilter: "blur(8px)",
  },

  panel: {
    background: "rgba(255,255,255,0.78)",
    border: "1px solid rgba(255,255,255,0.72)",
    borderRadius: "34px",
    padding: "34px",
    textAlign: "left",
    boxShadow: "0 18px 48px rgba(43,38,30,0.08)",
    backdropFilter: "blur(12px)",
  },

  panelTitle: {
    margin: "0 0 10px",
    fontSize: "32px",
    color: "#181818",
  },

  panelSubtitle: {
    color: "#5A554D",
    lineHeight: "1.75",
    marginBottom: "24px",
  },

  label: {
    display: "block",
    margin: "20px 0 10px",
    fontSize: "15px",
    fontWeight: "800",
    color: "#2A2722",
  },

  textarea: {
    width: "100%",
    minHeight: "110px",
    border: "1px solid rgba(255,255,255,0.8)",
    borderRadius: "24px",
    padding: "18px",
    fontSize: "15px",
    resize: "vertical",
    outline: "none",
    boxSizing: "border-box",
    lineHeight: "1.75",
    background: "rgba(255,255,255,0.76)",
  },

  input: {
    width: "100%",
    border: "1px solid rgba(255,255,255,0.8)",
    borderRadius: "24px",
    padding: "16px",
    fontSize: "15px",
    outline: "none",
    boxSizing: "border-box",
    background: "rgba(255,255,255,0.76)",
  },

  scoreRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
  },

  scoreButton: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    border: "1px solid rgba(255,255,255,0.75)",
    cursor: "pointer",
  },

  mainButton: {
    marginTop: "22px",
    border: "none",
    borderRadius: "20px",
    padding: "14px 24px",
    background: "#181818",
    color: "#FFFFFF",
    cursor: "pointer",
    fontSize: "15px",
  },

  resultCard: {
    marginTop: "24px",
    background: "rgba(24,24,24,0.08)",
    borderRadius: "28px",
    padding: "24px",
    border: "1px solid rgba(24,24,24,0.08)",
  },

  resultLabel: {
    margin: "0 0 8px",
    fontSize: "12px",
    color: "#6F675B",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    fontWeight: "800",
  },

  resultText: {
    whiteSpace: "pre-line",
    lineHeight: "1.75",
    color: "#333",
    marginBottom: "18px",
  },

  experienceCard: {
    background:
      "linear-gradient(135deg, rgba(24,24,24,0.92), rgba(52,48,42,0.92))",
    color: "#FFFFFF",
    borderRadius: "30px",
    padding: "30px",
    marginTop: "22px",
    marginBottom: "20px",
    boxShadow: "0 20px 56px rgba(0,0,0,0.16)",
  },

  experienceText: {
    whiteSpace: "pre-line",
    lineHeight: "1.9",
    fontSize: "16px",
    color: "#F2EDE6",
    margin: 0,
  },

  saveButton: {
    border: "none",
    borderRadius: "20px",
    padding: "14px 22px",
    background: "#181818",
    color: "#FFFFFF",
    cursor: "pointer",
    fontSize: "14px",
  },
};
