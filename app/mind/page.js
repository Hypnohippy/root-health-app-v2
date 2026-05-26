"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";
import Nav from "../../components/Nav";
import RootEnso from "../../components/RootEnso";
import RootAtmosphere from "../../components/RootAtmosphere";
const emotionalStates = [
  {
    id: "overthinking",
    title: "Overthinking",
    description: "The mind is looping, analysing, or unable to settle.",
    atmosphere: "reflection",
    suggestion: "Slow the mind before trying to solve the problem.",
  },
  {
    id: "panic",
    title: "Panic / overwhelm",
    description: "The nervous system feels activated or unsafe.",
    atmosphere: "grounding",
    suggestion: "Reduce activation before thinking deeply.",
  },
  {
    id: "shutdown",
    title: "Shutdown / numbness",
    description: "Everything feels distant, flat, or emotionally disconnected.",
    atmosphere: "sleep",
    suggestion: "Focus on gentle reconnection, not pressure.",
  },
  {
    id: "shame",
    title: "Shame / self-criticism",
    description: "The inner voice has become harsh or heavy.",
    atmosphere: "coach",
    suggestion: "Respond softly rather than attacking yourself.",
  },
  {
    id: "grief",
    title: "Grief / sadness",
    description: "Something emotionally heavy is asking for space.",
    atmosphere: "reflection",
    suggestion: "Allow feeling before trying to fix.",
  },
  {
    id: "anger",
    title: "Anger / frustration",
    description: "The body feels tight, reactive, or emotionally charged.",
    atmosphere: "coach",
    suggestion: "Slow the nervous system before responding outwardly.",
  },
];

const tools = [
  {
    id: "overthinking",
    title: "Overthinking",
    description: "The mind is looping, analysing, or unable to settle.",
    atmosphere: "reflection",
    suggestion: "Slow the mind before trying to solve the problem.",
  },
  {
    id: "panic",
    title: "Panic / overwhelm",
    description: "The nervous system feels activated or unsafe.",
    atmosphere: "grounding",
    suggestion: "Reduce activation before thinking deeply.",
  },
  {
    id: "shutdown",
    title: "Shutdown / numbness",
    description: "Everything feels distant, flat, or emotionally disconnected.",
    atmosphere: "sleep",
    suggestion: "Focus on gentle reconnection, not pressure.",
  },
  {
    id: "shame",
    title: "Shame / self-criticism",
    description: "The inner voice has become harsh or heavy.",
    atmosphere: "coach",
    suggestion: "Respond softly rather than attacking yourself.",
  },
  {
    id: "grief",
    title: "Grief / sadness",
    description: "Something emotionally heavy is asking for space.",
    atmosphere: "reflection",
    suggestion: "Allow feeling before trying to fix.",
  },
  {
    id: "anger",
    title: "Anger / frustration",
    description: "The body feels tight, reactive, or emotionally charged.",
    atmosphere: "coach",
    suggestion: "Slow the nervous system before responding outwardly.",
  },
];

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
  const [activeState, setActiveState] = useState(null);

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
   <RootAtmosphere
  type={
    activeTool === "grounding"
      ? "grounding"
      : activeTool === "breathwork"
      ? "sleep"
      : activeTool === "calming"
      ? "sleep"
      : activeTool === "journal"
      ? "reflection"
      : "coach"
  }
>
  <Nav />

  <main style={styles.page}>
        <section style={styles.shell}>
          <div style={styles.glow} />

          <div style={styles.header}>
           <RootEnso size={72} />
            <p style={styles.kicker}>Root Mind Library</p>
            <h1 style={styles.title}>Mind & Emotions</h1>
            <p style={styles.subtitle}>
              Guided emotional tools for calming the nervous system, reframing
              thoughts, grounding the body, and choosing steadier action.
            </p>
          </div>

         {!activeTool && (
  <>
    <div style={styles.stateIntro}>
      <p style={styles.stateKicker}>Emotional check-in</p>
      <h2 style={styles.stateTitle}>What feels strongest right now?</h2>
      <p style={styles.stateSubtitle}>
        Root can gently adapt support based on what your nervous system may need most.
      </p>
    </div>

    <div style={styles.stateGrid}>
      {emotionalStates.map((state) => (
        <button
          key={state.id}
          onClick={() => setActiveState(state)}
          style={{
            ...styles.stateCard,
            ...(activeState?.id === state.id ? styles.stateCardActive : {}),
          }}
        >
          <strong style={styles.stateCardTitle}>{state.title}</strong>
          <p style={styles.stateCardText}>{state.description}</p>
        </button>
      ))}
    </div>

    {activeState && (
      <div style={styles.recommendationCard}>
        <p style={styles.recommendationLabel}>Root gently suggests</p>
        <h3 style={styles.recommendationTitle}>{activeState.suggestion}</h3>
        <p style={styles.recommendationText}>
          The goal is not to force change immediately — only to help the nervous system feel slightly safer, steadier, and more supported.
        </p>
      </div>
    )}

    <div style={styles.heroCard}>
      <p style={styles.heroLabel}>Intervention library</p>
      <h2 style={styles.heroTitle}>Choose the support your system needs.</h2>
      <p style={styles.heroText}>
        Start small. Use one tool. Save what helped so Root Coach can understand the pattern over time.
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
      Root Health offers lifestyle and emotional support. It is not a replacement for medical care, therapy, or crisis support.
    </p>
  </>
)}
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
</RootAtmosphere>
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
    display: "flex",
    justifyContent: "center",
    padding: "28px",
  },

 shell: {
  position: "relative",
  overflow: "hidden",
  width: "100%",
  maxWidth: "1120px",
  background: "rgba(255,255,255,0.22)",
  border: "1px solid rgba(255,255,255,0.42)",
  backdropFilter: "blur(30px)",
  borderRadius: "42px",
  padding: "38px",
  boxShadow: "0 34px 100px rgba(20,18,15,0.16)",
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
    "linear-gradient(135deg, rgba(24,24,24,0.54), rgba(52,48,42,0.40))",
  borderRadius: "34px",
  padding: "32px",
  color: "#FFFFFF",
  marginBottom: "22px",
  boxShadow: "0 24px 70px rgba(0,0,0,0.16)",
  border: "1px solid rgba(255,255,255,0.14)",
  backdropFilter: "blur(18px)",
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
  border: "1px solid rgba(255,255,255,0.34)",
  borderRadius: "30px",
  padding: "26px",
  background: "rgba(255,255,255,0.18)",
  cursor: "pointer",
  textAlign: "left",
  boxShadow: "0 16px 40px rgba(0,0,0,0.08)",
  display: "flex",
  flexDirection: "column",
  gap: "10px",
  backdropFilter: "blur(18px)",
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
  background: "rgba(255,255,255,0.20)",
  border: "1px solid rgba(255,255,255,0.34)",
  borderRadius: "36px",
  padding: "36px",
  textAlign: "left",
  boxShadow: "0 20px 54px rgba(20,18,15,0.10)",
  backdropFilter: "blur(22px)",
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
    "linear-gradient(135deg, rgba(24,24,24,0.46), rgba(52,48,42,0.32))",
  color: "#FFFFFF",
  borderRadius: "34px",
  padding: "34px",
  marginTop: "22px",
  marginBottom: "20px",
  boxShadow: "0 20px 56px rgba(0,0,0,0.14)",
  border: "1px solid rgba(255,255,255,0.14)",
  backdropFilter: "blur(18px)",
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
  stateIntro: {
  textAlign: "center",
  marginBottom: "24px",
},

stateKicker: {
  margin: "0 0 10px",
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  color: "#6F675B",
  fontWeight: "800",
},

stateTitle: {
  margin: "0 0 12px",
  fontSize: "34px",
  color: "#181818",
},

stateSubtitle: {
  margin: "0 auto",
  maxWidth: "720px",
  color: "#5A554D",
  lineHeight: "1.7",
},

stateGrid: {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
  gap: "16px",
  marginBottom: "28px",
},

stateCard: {
  border: "1px solid rgba(255,255,255,0.34)",
  borderRadius: "28px",
  padding: "22px",
  background: "rgba(255,255,255,0.16)",
  backdropFilter: "blur(18px)",
  textAlign: "left",
  cursor: "pointer",
  transition: "all 0.25s ease",
},

stateCardActive: {
  background:
    "linear-gradient(135deg, rgba(24,24,24,0.62), rgba(52,48,42,0.42))",
  color: "#FFFFFF",
  transform: "translateY(-2px)",
},

stateCardTitle: {
  display: "block",
  marginBottom: "10px",
  fontSize: "18px",
},

stateCardText: {
  margin: 0,
  lineHeight: "1.6",
  fontSize: "14px",
},

recommendationCard: {
  marginBottom: "30px",
  borderRadius: "32px",
  padding: "28px",
  background:
    "linear-gradient(135deg, rgba(24,24,24,0.54), rgba(52,48,42,0.36))",
  color: "#FFFFFF",
  boxShadow: "0 20px 60px rgba(0,0,0,0.12)",
},

recommendationLabel: {
  margin: "0 0 10px",
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  color: "#D8CDBB",
  fontWeight: "800",
},

recommendationTitle: {
  margin: "0 0 12px",
  fontSize: "28px",
},

recommendationText: {
  margin: 0,
  lineHeight: "1.8",
  color: "#ECE6DC",
},
};
