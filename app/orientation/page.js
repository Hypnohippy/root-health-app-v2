"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";
import Nav from "../../components/Nav";
import RootAtmosphere from "../../components/RootAtmosphere";
import RootEnso from "../../components/RootEnso";

const journeys = [
  {
    id: "anxiety",
    title: "Anxiety or overwhelm",
    subtitle: "Pressure, racing thoughts, stress, panic, or nervous system overload.",
    icon: "🌊",
    atmosphere: "grounding",
    explanation:
      "Anxiety often shows up in the body before the mind fully understands it. We’ll begin by gently exploring where your system may be carrying the pressure.",
  },

  {
    id: "sleep",
    title: "Sleep and recovery",
    subtitle: "Tired but wired, restless nights, difficulty switching off.",
    icon: "🌙",
    atmosphere: "sleep",
    explanation:
      "Sleep difficulties are often connected to nervous system load, stress patterns, overstimulation, and recovery capacity. We’ll begin with the body first.",
  },

  {
    id: "body",
    title: "Physical symptoms and stress",
    subtitle: "Tension, pain, digestive discomfort, fatigue, tightness or strain.",
    icon: "🫁",
    atmosphere: "body",
    explanation:
      "The body often carries stress patterns long before we consciously recognise them. We’ll begin by noticing where your system seems to be speaking the loudest.",
  },

  {
    id: "thoughts",
    title: "Thought loops and overthinking",
    subtitle: "Repeating thoughts, pressure, rumination, worry loops.",
    icon: "🧠",
    atmosphere: "coach",
    explanation:
      "Thought loops often become stronger when the nervous system is overloaded. Before trying to force clarity, we’ll first explore how the body is responding.",
  },

  {
    id: "heavy",
    title: "Emotional heaviness",
    subtitle: "Sadness, grief, emotional pressure, exhaustion or emotional overload.",
    icon: "🪨",
    atmosphere: "reflection",
    explanation:
      "Heavy emotions can affect sleep, tension, digestion, energy, and recovery. We’ll begin gently by listening to how your system seems to be carrying this.",
  },

  {
    id: "patterns",
    title: "Understanding patterns",
    subtitle: "You want to understand what may be connected beneath the surface.",
    icon: "🪞",
    atmosphere: "reflection",
    explanation:
      "Root works best when small signals are connected over time. We’ll begin by understanding how your body may already be responding to your current stress load.",
  },
];

export default function OrientationPage() {
  const [selected, setSelected] = useState(null);

  const atmosphere = selected?.atmosphere || "coach";

  const beginJourney = async () => {
  if (!selected) return;

  localStorage.setItem(
    "root_journey_v1",
    JSON.stringify({
      focus: selected.id,
      title: selected.title,
      startedAt: Date.now(),
      nextStep: "body",
    })
  );

  const profileKey = localStorage.getItem("root_profile_key_v1");

  if (profileKey) {
    const { error } = await supabase
      .from("profiles")
      .update({
        orientation_completed: true,
      })
      .eq("profile_key", profileKey);

    if (error) {
      console.error("Orientation completion error:", error);
    }
  }

  window.location.href = "/assessment?from=orientation";
};

  return (
    <RootAtmosphere type={atmosphere}>
      <Nav />

      <main style={styles.page}>
        <section style={styles.shell}>
          <div style={styles.logoWrap}>
            <RootEnso size={92} />
          </div>

          {!selected && (
            <>
              <p style={styles.kicker}>Welcome to Root</p>

              <h1 style={styles.title}>
                A calmer relationship with yourself.
              </h1>

              <p style={styles.subtitle}>
                Root helps you explore how stress, emotions, nervous system load,
                habits, sleep, and body symptoms may be connected.
              </p>

              <p style={styles.subtitleSmall}>
                We’ll guide you step by step.
              </p>

              <div style={styles.cardGrid}>
                {journeys.map((journey) => (
                  <button
                    key={journey.id}
                    style={styles.card}
                    onClick={() => setSelected(journey)}
                  >
                    <span style={styles.cardIcon}>{journey.icon}</span>

                    <div>
                      <strong style={styles.cardTitle}>
                        {journey.title}
                      </strong>

                      <p style={styles.cardText}>
                        {journey.subtitle}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {selected && (
            <div style={styles.selectedPanel}>
              <p style={styles.kicker}>Your Root Journey</p>

              <h2 style={styles.selectedTitle}>
                {selected.title}
              </h2>

              <p style={styles.selectedText}>
                {selected.explanation}
              </p>

              <div style={styles.flowCard}>
                <div style={styles.flowStep}>
                  <span style={styles.flowNumber}>1</span>

                  <div>
                    <strong>Body Exploration</strong>

                    <p>
                      We’ll begin by exploring where this seems to appear in your body.
                    </p>
                  </div>
                </div>

                <div style={styles.flowStep}>
                  <span style={styles.flowNumber}>2</span>

                  <div>
                    <strong>Pattern Understanding</strong>

                    <p>
                      Root will help connect possible emotional, lifestyle, nervous system,
                      and behavioural patterns.
                    </p>
                  </div>
                </div>

                <div style={styles.flowStep}>
                  <span style={styles.flowNumber}>3</span>

                  <div>
                    <strong>Guided Support</strong>

                    <p>
                      You’ll be guided toward the most relevant coach modes, tools,
                      reflections, and next steps.
                    </p>
                  </div>
                </div>
              </div>

              <button style={styles.beginButton} onClick={beginJourney}>
                Begin Root Check-In
              </button>

              <button
                style={styles.backButton}
                onClick={() => setSelected(null)}
              >
                ← Choose something different
              </button>
            </div>
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
    padding: "120px 28px 42px",
  },

  shell: {
    width: "100%",
    maxWidth: "1120px",
    background: "rgba(255,255,255,0.22)",
    border: "1px solid rgba(255,255,255,0.34)",
    backdropFilter: "blur(30px)",
    WebkitBackdropFilter: "blur(30px)",
    borderRadius: "42px",
    padding: "42px",
    boxShadow: "0 34px 100px rgba(20,18,15,0.14)",
  },

  logoWrap: {
    display: "flex",
    justifyContent: "center",
    marginBottom: "14px",
  },

  kicker: {
    margin: "0 0 10px",
    textAlign: "center",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.14em",
    color: "rgba(255,255,255,0.82)",
    fontWeight: "800",
  },

  title: {
    margin: "0 0 18px",
    textAlign: "center",
    fontSize: "52px",
    lineHeight: "1.1",
    color: "#FFFFFF",
    fontFamily: "Georgia, serif",
    fontWeight: "500",
    letterSpacing: "-0.04em",
  },

  subtitle: {
    maxWidth: "760px",
    margin: "0 auto 10px",
    textAlign: "center",
    color: "rgba(255,255,255,0.84)",
    lineHeight: "1.85",
    fontSize: "18px",
  },

  subtitleSmall: {
    textAlign: "center",
    color: "rgba(255,255,255,0.66)",
    marginBottom: "34px",
    fontSize: "15px",
  },

  cardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "16px",
  },

  card: {
    border: "1px solid rgba(255,255,255,0.28)",
    background: "rgba(255,255,255,0.14)",
    borderRadius: "28px",
    padding: "22px",
    display: "flex",
    gap: "16px",
    alignItems: "flex-start",
    textAlign: "left",
    cursor: "pointer",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    color: "#FFFFFF",
  },

  cardIcon: {
    fontSize: "32px",
    flexShrink: 0,
  },

  cardTitle: {
    display: "block",
    marginBottom: "8px",
    fontSize: "18px",
  },

  cardText: {
    margin: 0,
    lineHeight: "1.65",
    color: "rgba(255,255,255,0.76)",
    fontSize: "14px",
  },

  selectedPanel: {
    maxWidth: "820px",
    margin: "0 auto",
    background: "rgba(20,20,20,0.32)",
    border: "1px solid rgba(255,255,255,0.18)",
    borderRadius: "36px",
    padding: "38px",
    color: "#FFFFFF",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
  },

  selectedTitle: {
    margin: "0 0 18px",
    fontSize: "42px",
    textAlign: "center",
    fontFamily: "Georgia, serif",
    fontWeight: "500",
  },

  selectedText: {
    margin: "0 auto 28px",
    maxWidth: "680px",
    textAlign: "center",
    lineHeight: "1.9",
    color: "rgba(255,255,255,0.84)",
    fontSize: "17px",
  },

  flowCard: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    marginBottom: "30px",
  },

  flowStep: {
    display: "flex",
    gap: "16px",
    alignItems: "flex-start",
    background: "rgba(255,255,255,0.10)",
    border: "1px solid rgba(255,255,255,0.14)",
    borderRadius: "24px",
    padding: "18px",
  },

  flowNumber: {
    width: "34px",
    height: "34px",
    borderRadius: "50%",
    background: "rgba(255,255,255,0.18)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "700",
    flexShrink: 0,
  },

  beginButton: {
    width: "100%",
    border: "none",
    borderRadius: "999px",
    padding: "18px",
    background: "#FFFFFF",
    color: "#181818",
    fontSize: "16px",
    cursor: "pointer",
    marginBottom: "16px",
    fontWeight: "700",
  },

  backButton: {
    width: "100%",
    border: "1px solid rgba(255,255,255,0.18)",
    borderRadius: "999px",
    padding: "14px",
    background: "rgba(255,255,255,0.10)",
    color: "#FFFFFF",
    fontSize: "14px",
    cursor: "pointer",
  },
};
