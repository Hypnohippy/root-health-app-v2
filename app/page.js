"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";

const bodySystems = [
  {
    id: "stress_nerves",
    label: "Stress & nerves",
    system: "nervous/autonomic",
    signals: ["overwhelm", "racing thoughts", "tension", "panic feeling", "wired but tired"],
  },
  {
    id: "heart_circulation",
    label: "Heart & circulation",
    system: "circulatory",
    signals: ["racing heart", "cold hands/feet", "pressure", "light-headed", "low stamina"],
  },
  {
    id: "breathing",
    label: "Breathing",
    system: "respiratory",
    signals: ["shallow breathing", "tight chest", "breathlessness", "sighing", "air hunger"],
  },
  {
    id: "digestion",
    label: "Digestion",
    system: "digestive",
    signals: ["bloating", "reflux", "cramps", "constipation", "loose bowels", "appetite change"],
  },
  {
    id: "hormones_balance",
    label: "Hormones & balance",
    system: "endocrine",
    signals: ["cravings", "energy dips", "mood swings", "temperature changes", "cycle changes"],
  },
  {
    id: "bladder_hydration",
    label: "Bladder & hydration",
    system: "urinary/excretory",
    signals: ["thirst", "frequent urination", "dark urine", "fluid retention", "lower back discomfort"],
  },
  {
    id: "muscles_joints",
    label: "Muscles & joints",
    system: "musculoskeletal",
    signals: ["aching", "stiffness", "weakness", "cramps", "reduced movement"],
  },
  {
    id: "skin",
    label: "Skin",
    system: "skin/barrier",
    signals: ["dryness", "itching", "redness", "spots", "sensitivity", "slow healing"],
  },
  {
    id: "senses",
    label: "Senses",
    system: "sensory",
    signals: ["eye strain", "noise sensitivity", "dizziness", "light sensitivity", "tingling"],
  },
  {
    id: "energy_recovery",
    label: "Energy & recovery",
    system: "whole-body recovery",
    signals: ["fatigue", "burnout feeling", "heavy body", "low motivation", "poor recovery"],
  },
  {
    id: "sleep_rhythm",
    label: "Sleep rhythm",
    system: "circadian/sleep",
    signals: ["poor sleep", "waking often", "early waking", "tired on waking", "sleepy daytime"],
  },
  {
    id: "whole_body",
    label: "Whole body",
    system: "multi-system",
    signals: ["generally off", "run down", "inflamed feeling", "unsettled", "hard to describe"],
  },
];

const feelings = ["Surface", "Tight / tense", "Deep", "Moving around", "Hard to describe"];

export default function Home() {
  const [selectedSystem, setSelectedSystem] = useState(null);
  const [selectedSignal, setSelectedSignal] = useState("");
  const [feeling, setFeeling] = useState("");
  const [intensity, setIntensity] = useState(5);
  const [response, setResponse] = useState("");
  const [saving, setSaving] = useState(false);

  const current = bodySystems.find((item) => item.id === selectedSystem);

  const resetDetail = (id) => {
    setSelectedSystem(id);
    setSelectedSignal("");
    setFeeling("");
    setIntensity(5);
    setResponse("");
  };

  const buildCoachResponse = () => {
    if (!current || !selectedSignal || !feeling) return "";

    let message = `You’re noticing ${selectedSignal} around ${current.label.toLowerCase()}.`;

    if (current.id === "digestion") {
      message +=
        " Digestion can sometimes be influenced by stress, sleep, food timing, hydration and the gut–brain connection.";
    } else if (current.id === "stress_nerves") {
      message +=
        " This can sometimes reflect the nervous system carrying more load than usual.";
    } else if (current.id === "skin") {
      message +=
        " Skin can reflect several lifestyle layers, including hydration, sleep, stress, food patterns and environment.";
    } else if (current.id === "breathing" || current.id === "heart_circulation") {
      message +=
        " These signals can sometimes link with stress, breathing habits, sleep, caffeine or physical strain.";
    } else if (current.id === "energy_recovery" || current.id === "sleep_rhythm") {
      message +=
        " Recovery often connects with sleep, stress, nutrition, movement and emotional load.";
    } else {
      message +=
        " This may connect with lifestyle patterns such as stress, sleep, nutrition, movement, hydration or recovery.";
    }

    message += ` You described it as ${feeling.toLowerCase()}, with an intensity of ${intensity}/10.`;

    if (intensity >= 8) {
      message +=
        " Because this feels strong, please treat it with care. If it is severe, unusual, persistent or worrying, it’s important to speak with a healthcare professional.";
    } else {
      message +=
        " We can explore what may be contributing, support it now, or track it over time.";
    }

    return message;
  };

 const handleExplore = async () => {
  if (!current || !selectedSignal || !feeling) return;

  setSaving(true);

  const entryToSave = {
    areas: [current.label],
    system: current.system,
    signal: selectedSignal,
    depth: feeling,
    intensity: intensity,
  };

  await supabase.from("body_signals").insert([entryToSave]);

  const { data, error } = await supabase
    .from("body_signals")
    .select("areas, system, signal, depth, intensity, created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  let message = buildCoachResponse();

 if (error) {
  message += ` Supabase read error: ${error.message}`;
  setResponse(message);
  setSaving(false);
  return;
}
  const recent = data || [];

  const sameSystemCount = recent.filter((entry) => {
    const sameSystem = entry.system === current.system;
    const sameArea =
      Array.isArray(entry.areas) && entry.areas.includes(current.label);

    return sameSystem || sameArea;
  }).length;

  const sameSignalCount = recent.filter(
    (entry) => entry.signal === selectedSignal
  ).length;

  const highIntensityCount = recent.filter(
    (entry) => Number(entry.intensity) >= 7
  ).length;

  if (sameSystemCount >= 3) {
    message += ` I’ve noticed ${current.label.toLowerCase()} has come up ${sameSystemCount} times recently, so this may be worth tracking as a pattern rather than a one-off signal.`;
  }

  if (sameSignalCount >= 3) {
    message += ` The signal "${selectedSignal}" has also repeated, which may help us understand what tends to show up for you.`;
  }

  if (highIntensityCount >= 2) {
    message += ` A few recent signals have been strong, so let’s be gentle and practical with this.`;
  }

  setResponse(message);
  setSaving(false);
};  return (
    <main style={styles.page}>
      <section style={styles.shell}>
        <div style={styles.brandMark}>◯</div>

        <h1 style={styles.title}>Root Health</h1>
        <p style={styles.subtitle}>
          Where is your body asking for attention today?
        </p>

        <div style={styles.grid}>
          {bodySystems.map((item) => (
            <button
              key={item.id}
              onClick={() => resetDetail(item.id)}
              style={{
                ...styles.systemButton,
                background: selectedSystem === item.id ? "#1A1A1A" : "#F0EDE7",
                color: selectedSystem === item.id ? "#FFFFFF" : "#2F2F2F",
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        {current && (
          <div style={styles.panel}>
            <p style={styles.panelTitle}>{current.label}</p>
            <p style={styles.microText}>
              Root Health reads this as a {current.system} signal — shown to you in plain language.
            </p>

            <p style={styles.label}>What are you noticing?</p>
            <div style={styles.choiceRow}>
              {current.signals.map((sig) => (
                <button
                  key={sig}
                  onClick={() => setSelectedSignal(sig)}
                  style={{
                    ...styles.choiceButton,
                    background: selectedSignal === sig ? "#1A1A1A" : "#E6E2DA",
                    color: selectedSignal === sig ? "#FFFFFF" : "#333333",
                  }}
                >
                  {sig}
                </button>
              ))}
            </div>

            {selectedSignal && (
              <>
                <p style={styles.label}>How does it feel?</p>
                <div style={styles.choiceRow}>
                  {feelings.map((item) => (
                    <button
                      key={item}
                      onClick={() => setFeeling(item)}
                      style={{
                        ...styles.choiceButton,
                        background: feeling === item ? "#1A1A1A" : "#E6E2DA",
                        color: feeling === item ? "#FFFFFF" : "#333333",
                      }}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </>
            )}

            {feeling && (
              <>
                <p style={styles.label}>How strong is it today?</p>
                <div style={styles.scoreRow}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                    <button
                      key={score}
                      onClick={() => setIntensity(score)}
                      style={{
                        ...styles.scoreButton,
                        background: intensity === score ? "#C23B30" : "#F0EDE7",
                        color: intensity === score ? "#FFFFFF" : "#333333",
                      }}
                    >
                      {score}
                    </button>
                  ))}
                </div>

                <button style={styles.mainButton} onClick={handleExplore}>
                  {saving ? "Saving..." : "Explore this signal"}
                </button>
              </>
            )}

            {response && <p style={styles.response}>{response}</p>}
          </div>
        )}
      </section>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #F7F5F2 0%, #E6E2DA 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
  },
  shell: {
    width: "100%",
    maxWidth: "820px",
    background: "rgba(255,255,255,0.82)",
    borderRadius: "28px",
    padding: "34px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.08)",
    textAlign: "center",
  },
  brandMark: {
    fontSize: "38px",
    color: "#1A1A1A",
    marginBottom: "6px",
  },
  title: {
    fontSize: "34px",
    margin: "0 0 8px",
    color: "#1A1A1A",
  },
  subtitle: {
    color: "#555",
    fontSize: "17px",
    marginBottom: "28px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: "12px",
    marginBottom: "24px",
  },
  systemButton: {
    border: "none",
    borderRadius: "16px",
    padding: "16px 12px",
    cursor: "pointer",
    fontSize: "15px",
    boxShadow: "0 8px 18px rgba(0,0,0,0.04)",
  },
  panel: {
    marginTop: "18px",
    background: "#FFFFFF",
    borderRadius: "22px",
    padding: "24px",
    boxShadow: "0 12px 28px rgba(0,0,0,0.06)",
  },
  panelTitle: {
    fontSize: "22px",
    fontWeight: "600",
    margin: "0 0 6px",
  },
  microText: {
    color: "#777",
    fontSize: "13px",
    marginBottom: "20px",
  },
  label: {
    marginTop: "22px",
    marginBottom: "10px",
    fontSize: "14px",
    color: "#555",
  },
  choiceRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    justifyContent: "center",
  },
  choiceButton: {
    border: "none",
    borderRadius: "999px",
    padding: "10px 14px",
    cursor: "pointer",
    fontSize: "14px",
  },
  scoreRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    justifyContent: "center",
    marginBottom: "18px",
  },
  scoreButton: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    border: "none",
    cursor: "pointer",
  },
  mainButton: {
    background: "#1A1A1A",
    color: "#FFFFFF",
    border: "none",
    borderRadius: "14px",
    padding: "14px 22px",
    cursor: "pointer",
    fontSize: "15px",
  },
  response: {
    marginTop: "22px",
    color: "#333",
    lineHeight: "1.65",
    fontSize: "15px",
  },
};
