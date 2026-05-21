"use client";

import { useState } from "react";
import Nav from "../../components/Nav";
import RootAtmosphere from "../../components/RootAtmosphere";
import RootEnso from "../../components/RootEnso";

const states = [
  {
    id: "overwhelmed",
    label: "Overwhelmed",
    subtitle: "Too much is happening at once.",
    icon: "🌊",
    atmosphere: "grounding",
    message:
      "Your system may need less pressure before deeper reflection. Let’s settle first, then understand.",
    path: [
      { label: "Begin grounding", href: "/coach?mode=grounding" },
      { label: "Use breathwork", href: "/mind" },
      { label: "Talk with Coach", href: "/coach" },
    ],
  },
  {
    id: "wired",
    label: "Tired but wired",
    subtitle: "Exhausted, but unable to switch off.",
    icon: "🌙",
    atmosphere: "sleep",
    message:
      "This may be a night for reducing stimulation, not solving everything. Let the system come down gradually.",
    path: [
      { label: "Sleep wind-down", href: "/coach?mode=sleep" },
      { label: "Calming tool", href: "/mind" },
      { label: "Reflect later", href: "/journal" },
    ],
  },
  {
    id: "heavy",
    label: "Emotionally heavy",
    subtitle: "Something feels weighty or unresolved.",
    icon: "🪨",
    atmosphere: "reflection",
    message:
      "Some feelings need space before answers. Reflection may help you hear what is underneath.",
    path: [
      { label: "Start reflection", href: "/coach?mode=reflection" },
      { label: "Open Journal", href: "/journal" },
      { label: "View Insights", href: "/insights" },
    ],
  },
  {
    id: "thoughts",
    label: "Stuck in thought loops",
    subtitle: "The mind keeps circling the same thing.",
    icon: "🧠",
    atmosphere: "coach",
    message:
      "This may be a good moment to soften the meaning, not fight the thought. One small reframe can create space.",
    path: [
      { label: "Mind tools", href: "/mind" },
      { label: "Talk with Coach", href: "/coach" },
      { label: "Journal it out", href: "/journal" },
    ],
  },
  {
    id: "tense",
    label: "Physically tense",
    subtitle: "Your body feels tight, strained, or activated.",
    icon: "🫁",
    atmosphere: "grounding",
    message:
      "Your body may be giving useful feedback. Start with where you feel it, then choose one gentle next step.",
    path: [
      { label: "Body check", href: "/body" },
      { label: "Grounding", href: "/coach?mode=grounding" },
      { label: "Mind tools", href: "/mind" },
    ],
  },
  {
    id: "clarity",
    label: "Looking for clarity",
    subtitle: "You want to understand what matters next.",
    icon: "🪞",
    atmosphere: "reflection",
    message:
      "Clarity often arrives when the pressure drops. Let’s look at the pattern without forcing an answer.",
    path: [
      { label: "Reflection mode", href: "/coach?mode=reflection" },
      { label: "Journal", href: "/journal" },
      { label: "Insights", href: "/insights" },
    ],
  },
  {
    id: "flat",
    label: "Flat or disconnected",
    subtitle: "Low energy, distant, or hard to engage.",
    icon: "🌫️",
    atmosphere: "coach",
    message:
      "This does not need to be pushed through. Start small and reduce the demand on yourself.",
    path: [
      { label: "Talk with Coach", href: "/coach" },
      { label: "Body check", href: "/body" },
      { label: "Gentle journal", href: "/journal" },
    ],
  },
  {
    id: "checking",
    label: "Just checking in",
    subtitle: "Nothing urgent — you want to stay connected.",
    icon: "🌿",
    atmosphere: "coach",
    message:
      "A simple check-in is enough. Root works best when small signals are noticed before they become loud.",
    path: [
      { label: "Body check", href: "/body" },
      { label: "View Insights", href: "/insights" },
      { label: "Open Coach", href: "/coach" },
    ],
  },
];

export default function OrientationPage() {
  const [selected, setSelected] = useState(states[0]);
  const atmosphere = selected?.atmosphere || "coach";
  useEffect(() => {
  if (typeof window === "undefined") return;

  const completed = localStorage.getItem("root_orientation_complete_v1");

  if (!completed) {
    window.location.href = "/orientation";
  }
}, []);

  return (
    <RootAtmosphere type={atmosphere}>
      <Nav />

      <main style={styles.page}>
        <section style={styles.shell}>
          <div style={styles.logoWrap}>
            <RootEnso size={86} />
          </div>

          <p style={styles.kicker}>Root Orientation</p>

          <h1 style={styles.title}>What feels closest today?</h1>

          <p style={styles.subtitle}>
            You do not need to know which tool to use. Start with how your system
            feels, and Root will suggest a gentle path.
          </p>

          <div style={styles.layout}>
            <div style={styles.stateGrid}>
              {states.map((state) => (
                <button
                  key={state.id}
                  style={{
                    ...styles.stateCard,
                    ...(selected.id === state.id ? styles.stateCardActive : {}),
                  }}
                  onClick={() => setSelected(state)}
                >
                  <span style={styles.stateIcon}>{state.icon}</span>

                  <span style={styles.stateText}>
                    <strong>{state.label}</strong>
                    <small>{state.subtitle}</small>
                  </span>
                </button>
              ))}
            </div>

            <div style={styles.pathPanel}>
              <p style={styles.kicker}>Suggested pathway</p>

              <h2 style={styles.pathTitle}>{selected.label}</h2>

              <p style={styles.pathMessage}>{selected.message}</p>

              <div style={styles.pathSteps}>
                {selected.path.map((step, index) => (
                  <a
  key={step.href + step.label}
  href={step.href}
  style={styles.pathStep}
  onClick={() => {
    localStorage.setItem("root_orientation_complete_v1", "true");
  }}
>
                    <span style={styles.stepNumber}>{index + 1}</span>
                    <span>{step.label}</span>
                    <span style={styles.stepArrow}>→</span>
                  </a>
                ))}
              </div>

              <p style={styles.helperText}>
                This is not a diagnosis or assessment. It is simply a calmer way
                to choose where to begin.
              </p>
            </div>
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
    padding: "120px 28px 42px",
  },

  shell: {
    width: "100%",
    maxWidth: "1120px",
    background: "rgba(255,255,255,0.22)",
    border: "1px solid rgba(255,255,255,0.36)",
    backdropFilter: "blur(30px)",
    WebkitBackdropFilter: "blur(30px)",
    borderRadius: "42px",
    padding: "42px",
    boxShadow: "0 34px 100px rgba(20,18,15,0.14)",
  },

  logoWrap: {
    display: "flex",
    justifyContent: "center",
    marginBottom: "12px",
  },

  kicker: {
    margin: "0 0 10px",
    textAlign: "center",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.14em",
    color: "#6F675B",
    fontWeight: "800",
  },

  title: {
    margin: "0 0 14px",
    textAlign: "center",
    fontSize: "48px",
    color: "#181818",
    letterSpacing: "-0.04em",
    fontFamily: "Georgia, serif",
    fontWeight: "500",
  },

  subtitle: {
    maxWidth: "740px",
    margin: "0 auto 34px",
    textAlign: "center",
    color: "rgba(26,26,26,0.78)",
    lineHeight: "1.8",
    fontSize: "18px",
  },

  layout: {
    display: "grid",
    gridTemplateColumns: "1.1fr 0.9fr",
    gap: "22px",
    alignItems: "start",
  },

  stateGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
    gap: "14px",
  },

  stateCard: {
    border: "1px solid rgba(255,255,255,0.34)",
    background: "rgba(255,255,255,0.20)",
    borderRadius: "28px",
    padding: "18px",
    cursor: "pointer",
    textAlign: "left",
    display: "flex",
    gap: "14px",
    alignItems: "center",
    backdropFilter: "blur(18px)",
    WebkitBackdropFilter: "blur(18px)",
    boxShadow: "0 14px 36px rgba(0,0,0,0.07)",
  },

  stateCardActive: {
    background: "linear-gradient(135deg, rgba(24,24,24,0.66), rgba(42,38,34,0.50))",
    color: "#FFFFFF",
    border: "1px solid rgba(255,255,255,0.22)",
  },

  stateIcon: {
    fontSize: "30px",
    width: "44px",
    height: "44px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(255,255,255,0.22)",
    flexShrink: 0,
  },

  stateText: {
    display: "flex",
    flexDirection: "column",
    gap: "5px",
    lineHeight: "1.35",
  },

  pathPanel: {
    background: "linear-gradient(135deg, rgba(24,24,24,0.58), rgba(42,38,34,0.42))",
    color: "#FFFFFF",
    border: "1px solid rgba(255,255,255,0.18)",
    borderRadius: "34px",
    padding: "30px",
    backdropFilter: "blur(18px)",
    WebkitBackdropFilter: "blur(18px)",
    boxShadow: "0 24px 70px rgba(0,0,0,0.16)",
  },

  pathTitle: {
    margin: "0 0 14px",
    fontSize: "34px",
    fontFamily: "Georgia, serif",
    fontWeight: "500",
  },

  pathMessage: {
    margin: "0 0 22px",
    lineHeight: "1.75",
    color: "rgba(255,255,255,0.86)",
    fontSize: "16px",
  },

  pathSteps: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },

  pathStep: {
    color: "#FFFFFF",
    textDecoration: "none",
    background: "rgba(255,255,255,0.14)",
    border: "1px solid rgba(255,255,255,0.18)",
    borderRadius: "22px",
    padding: "15px 16px",
    display: "grid",
    gridTemplateColumns: "34px 1fr auto",
    alignItems: "center",
    gap: "12px",
  },

  stepNumber: {
    width: "30px",
    height: "30px",
    borderRadius: "50%",
    background: "rgba(255,255,255,0.22)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "13px",
    fontWeight: "800",
  },

  stepArrow: {
    opacity: 0.8,
    fontSize: "20px",
  },

  helperText: {
    margin: "22px 0 0",
    color: "rgba(255,255,255,0.70)",
    lineHeight: "1.6",
    fontSize: "13px",
  },
};
