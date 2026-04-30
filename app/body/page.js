"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";
import GlassBody from "../../components/GlassBody";
import Nav from "../../components/Nav";

const bodySystems = [
  {
    id: "stress_nerves",
    label: "Stress & nerves",
    system: "nervous/autonomic",
    signals: ["overwhelm", "racing thoughts", "panic feeling", "tension", "wired but tired", "shaky", "numb or detached", "hard to settle"],
  },
  {
    id: "heart_circulation",
    label: "Heart & circulation",
    system: "circulatory",
    signals: ["racing heart", "fluttering", "pressure", "cold hands/feet", "light-headed", "low stamina", "swelling", "colour change"],
  },
  {
    id: "breathing",
    label: "Breathing",
    system: "respiratory",
    signals: ["shallow breathing", "tight chest", "breathlessness", "air hunger", "cough", "wheeze", "sighing", "chest heaviness"],
  },
  {
    id: "digestion",
    label: "Digestion",
    system: "digestive",
    signals: ["bloating", "reflux", "cramps", "constipation", "loose bowels", "nausea", "appetite change", "wind/gas", "food sensitivity"],
  },
  {
    id: "reproductive",
    label: "Pelvis & reproductive",
    system: "reproductive/pelvic",
    signals: ["pelvic discomfort", "groin discomfort", "genital irritation", "burning", "itching", "discharge/change", "swelling", "rash or blistering", "cycle-related change", "sexual discomfort"],
  },
  {
    id: "hormones_balance",
    label: "Hormones & balance",
    system: "endocrine",
    signals: ["cravings", "energy dips", "mood swings", "temperature changes", "sweats", "cycle changes", "skin changes", "sleep disruption", "weight change"],
  },
  {
    id: "bladder_hydration",
    label: "Bladder & hydration",
    system: "urinary/excretory",
    signals: ["thirst", "frequent urination", "burning when passing urine", "dark urine", "fluid retention", "lower back discomfort", "urgency", "reduced urination"],
  },
  {
    id: "muscles_joints",
    label: "Muscles & joints",
    system: "musculoskeletal",
    signals: ["aching", "stiffness", "sharp pain", "deep ache", "weakness", "cramps", "reduced movement", "swelling", "clicking/grinding"],
  },
  {
    id: "skin",
    label: "Skin",
    system: "skin/barrier",
    signals: ["rash", "blistering", "redness", "itching", "dryness", "spots", "sensitivity", "swelling", "colour change", "visible change but no feeling", "slow healing"],
  },
  {
    id: "senses",
    label: "Senses",
    system: "sensory",
    signals: ["eye strain", "blurred vision", "light sensitivity", "noise sensitivity", "dizziness", "tingling", "numbness", "ringing ears", "altered smell/taste"],
  },
  {
    id: "energy_recovery",
    label: "Energy & recovery",
    system: "whole-body recovery",
    signals: ["fatigue", "burnout feeling", "heavy body", "low motivation", "poor recovery", "weakness", "brain fog", "flu-like feeling", "generally depleted"],
  },
  {
    id: "sleep_rhythm",
    label: "Sleep rhythm",
    system: "circadian/sleep",
    signals: ["poor sleep", "waking often", "early waking", "tired on waking", "sleepy daytime", "wired at night", "restless sleep", "night sweats"],
  },
  {
    id: "whole_body",
    label: "Whole body",
    system: "multi-system",
    signals: ["generally off", "run down", "inflamed feeling", "unsettled", "heavy", "shaky", "hard to describe", "visible change", "recurring pattern"],
  },
];

const contextOptions = [
  "just started",
  "comes and goes",
  "constant",
  "after eating",
  "under stress",
  "after movement",
  "at night",
  "random",
  "getting worse",
  "improving",
];

const helpOptions = [
  "Drank more water",
  "Ate differently",
  "Rested",
  "Reduced stress",
  "Moved/exercised",
  "Improved sleep",
  "Nothing yet",
];

const signalGuidance = {
  reflux: [
    "Stay upright for a while after eating",
    "Try a smaller, lighter meal next time",
    "Notice if spicy, fatty, acidic foods or late meals make it worse",
  ],
  bloating: [
    "Eat a little slower and notice whether that changes things",
    "Try one simple fibre source rather than lots at once",
    "Notice whether certain foods or stress make it worse",
  ],
  constipation: [
    "Drink water steadily across the day",
    "Add one gentle fibre source like oats, fruit, or veg",
    "A short walk may help movement without forcing anything",
  ],
  "racing heart": [
    "Pause and reduce stimulation for a few minutes",
    "Notice caffeine, tiredness, stress, or exertion today",
    "Track whether it settles or keeps returning",
  ],
  "light-headed": [
    "Sit down and give yourself a moment",
    "Check food, hydration, heat, and sudden movement",
    "If it feels unusual, strong, or repeated, get it checked",
  ],
  aching: [
    "Try gentle movement rather than pushing hard",
    "Notice whether rest, warmth, or stretching helps",
    "Track whether it is improving or spreading",
  ],
};

function normalise(value) {
  return String(value || "").toLowerCase().trim();
}

export default function BodyPage() {
  const [selectedSystems, setSelectedSystems] = useState([]);
  const [activeSystemId, setActiveSystemId] = useState(null);
  const [selectedSignal, setSelectedSignal] = useState("");
  const [context, setContext] = useState("");
  const [intensity, setIntensity] = useState(5);
  const [whatHelped, setWhatHelped] = useState("");
  const [response, setResponse] = useState("");
  const [suggestedHelp, setSuggestedHelp] = useState("");
  const [confidenceScore, setConfidenceScore] = useState(null);
  const [rankedHelp, setRankedHelp] = useState([]);
  const [saving, setSaving] = useState(false);

  const selectedItems = bodySystems.filter((item) => selectedSystems.includes(item.id));
  const current = bodySystems.find((item) => item.id === activeSystemId);

  const resetLearningUI = () => {
    setResponse("");
    setSuggestedHelp("");
    setConfidenceScore(null);
    setRankedHelp([]);
  };

  const selectSystem = (id) => {
    setSelectedSystems((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setActiveSystemId(id);
    setSelectedSignal("");
    setContext("");
    setIntensity(5);
    setWhatHelped("");
    resetLearningUI();
  };

  const clearSelections = () => {
    setSelectedSystems([]);
    setActiveSystemId(null);
    setSelectedSignal("");
    setContext("");
    setIntensity(5);
    setWhatHelped("");
    resetLearningUI();
  };

  const buildBaseResponse = () => {
    const labels = selectedItems.map((item) => item.label.toLowerCase()).join(", ");
    let message = `You’ve marked ${labels}. Right now we’re looking at ${selectedSignal} around ${current.label.toLowerCase()}.`;

    message += ` It is ${context}, sitting around ${intensity}/10.`;

    if (context === "improving") {
      message += `\n\nThis looks like it may be settling. That is useful information — your system may already be responding to something you changed.`;
    } else if (context === "getting worse") {
      message += `\n\nThis looks like it may be building. Rather than pushing through, it is worth slowing down and supporting this area today.`;
    } else if (context === "constant") {
      message += `\n\nBecause this is hanging around, it may be worth looking for what is maintaining it rather than treating it as a one-off.`;
    } else {
      message += `\n\nLet’s read this as information from your body, not something to panic about.`;
    }

    const specific = signalGuidance[normalise(selectedSignal)];

    message += `\n\nA practical next step could be:`;

    if (specific) {
      specific.forEach((item) => {
        message += `\n• ${item}`;
      });
    } else if (current.id === "digestion") {
      message += `\n• Notice food timing, stress, and whether symptoms appear after meals`;
      message += `\n• Keep the next meal simple and easy to digest`;
      message += `\n• Track whether this settles, repeats, or links to a particular trigger`;
    } else if (current.id === "stress_nerves") {
      message += `\n• Take 2–3 slow breaths, with a longer out-breath`;
      message += `\n• Step away from stimulation for a few minutes`;
      message += `\n• Ask what is loading your system right now`;
    } else if (current.id === "breathing") {
      message += `\n• Slow the breath gently rather than forcing deep breaths`;
      message += `\n• Sit or stand a little taller`;
      message += `\n• Notice if stress, posture, or exertion changes it`;
    } else {
      message += `\n• Notice what changed before this appeared`;
      message += `\n• Keep today’s response simple and gentle`;
      message += `\n• Track whether it improves, repeats, or spreads`;
    }

    if (
      intensity >= 8 ||
      selectedSignal.includes("blister") ||
      selectedSignal.includes("discharge") ||
      selectedSignal.includes("burning when passing urine")
    ) {
      message += `\n\nBecause this is strong, sensitive, unusual, or potentially visible, it is worth getting checked if it persists, worsens, or worries you.`;
    }

    return message;
  };

  const handleExplore = async () => {
    if (selectedItems.length === 0 || !current || !selectedSignal || !context) return;

    setSaving(true);
    resetLearningUI();

    const { data: history } = await supabase
      .from("body_signals")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    const helpCounts = {};
    const usefulHistory = Array.isArray(history) ? history : [];

    usefulHistory.forEach((entry) => {
      if (
        normalise(entry.signal) === normalise(selectedSignal) &&
        entry.what_helped &&
        normalise(entry.what_helped) !== "nothing yet"
      ) {
        helpCounts[entry.what_helped] = (helpCounts[entry.what_helped] || 0) + 1;
      }
    });

    const ranked = Object.entries(helpCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    const top = ranked[0];
    let predictedHelp = "";
    let confidence = null;

    if (top) {
      const total = ranked.reduce((sum, [, count]) => sum + count, 0);
      confidence = Math.round((top[1] / total) * 100);
      predictedHelp = top[0];

      setSuggestedHelp(predictedHelp);
      setConfidenceScore(confidence);
      setRankedHelp(ranked);
    }

    const entryToSave = {
      areas: selectedItems.map((item) => item.label),
      system: selectedItems.map((item) => item.system).join(", "),
      signal: selectedSignal,
      context,
      intensity,
      what_helped: whatHelped || "",
    };

    const { error: saveError } = await supabase
      .from("body_signals")
      .insert([entryToSave]);

    if (saveError) {
      setResponse("Something went wrong saving this entry. Please try again.");
      setSaving(false);
      return;
    }

    let message = buildBaseResponse();

    if (predictedHelp) {
      message =
        `Based on your previous entries, "${predictedHelp}" has helped this before${confidence !== null ? ` (${confidence}%)` : ""}.\n\n` +
        message;
    }

    if (whatHelped && whatHelped !== "Nothing yet") {
      message += `\n\nI’ve also saved that "${whatHelped}" helped this time, so Root Health can learn from it.`;
    }

    setResponse(message);
    setSaving(false);
  };

  return (
    <>
      <Nav />

      <main style={styles.page}>
        <section style={styles.shell}>
          <div style={styles.brandMark}>◯</div>

          <h1 style={styles.title}>Body Signals</h1>
          <p style={styles.subtitle}>Tap where your body is asking for attention, then build the picture.</p>

          <GlassBody
            selectedSystems={selectedItems.map((item) => item.label)}
            onSelect={selectSystem}
            onClear={clearSelections}
          />

          <div style={styles.grid}>
            {bodySystems.map((item) => (
              <button
                key={item.id}
                onClick={() => selectSystem(item.id)}
                style={{
                  ...styles.systemButton,
                  background: selectedSystems.includes(item.id) ? "#1A1A1A" : "#F0EDE7",
                  color: selectedSystems.includes(item.id) ? "#FFFFFF" : "#2F2F2F",
                }}
              >
                {item.label}
              </button>
            ))}
          </div>

          {current && (
            <div style={styles.panel}>
              <p style={styles.panelTitle}>{selectedItems.length > 1 ? "Connected body pattern" : current.label}</p>

              <p style={styles.microText}>Selected: {selectedItems.map((item) => item.label).join(", ")}</p>

              <p style={styles.label}>1. What are you noticing?</p>
              <div style={styles.choiceRow}>
                {current.signals.map((sig) => (
                  <button
                    key={sig}
                    onClick={() => {
                      setSelectedSignal(sig);
                      setContext("");
                      setWhatHelped("");
                      resetLearningUI();
                    }}
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
                  <p style={styles.label}>2. When does this show up?</p>
                  <div style={styles.choiceRow}>
                    {contextOptions.map((item) => (
                      <button
                        key={item}
                        onClick={() => {
                          setContext(item);
                          resetLearningUI();
                        }}
                        style={{
                          ...styles.choiceButton,
                          background: context === item ? "#1A1A1A" : "#E6E2DA",
                          color: context === item ? "#FFFFFF" : "#333333",
                        }}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {context && (
                <>
                  <p style={styles.label}>3. How strong is it today?</p>
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

                  <p style={styles.label}>4. What helped, if anything?</p>
                  <div style={styles.choiceRow}>
                    {helpOptions.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setWhatHelped(opt)}
                        style={{
                          ...styles.choiceButton,
                          background: whatHelped === opt ? "#1A1A1A" : "#E6E2DA",
                          color: whatHelped === opt ? "#FFFFFF" : "#333333",
                        }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>

                  <button style={styles.mainButton} onClick={handleExplore}>
                    {saving ? "Saving..." : "Save & reflect"}
                  </button>
                </>
              )}

              {suggestedHelp && (
                <div style={styles.suggestionCard}>
                  <p style={styles.suggestionLabel}>Suggested first step</p>
                  <p style={styles.suggestionMain}>
                    {suggestedHelp}
                    {confidenceScore !== null && (
                      <span style={styles.confidenceBadge}>{confidenceScore}%</span>
                    )}
                  </p>
                  <p style={styles.suggestionSub}>Based on what has helped you before</p>
                </div>
              )}

              {response && <p style={styles.response}>{response}</p>}

              {rankedHelp.length > 0 && (
                <div style={styles.memoryCard}>
                  <p style={styles.panelTitle}>What tends to help this signal</p>
                  {rankedHelp.map(([item, count], index) => (
                    <p key={item} style={styles.memoryLine}>
                      {index + 1}. {item} ({count} {count === 1 ? "time" : "times"})
                    </p>
                  ))}
                </div>
              )}
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
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
  },
  shell: {
    width: "100%",
    maxWidth: "860px",
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
    fontSize: "20px",
    fontWeight: "700",
    margin: "0 0 10px",
    color: "#1A1A1A",
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
    fontWeight: "600",
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
    marginTop: "22px",
    background: "#1A1A1A",
    color: "#FFFFFF",
    border: "none",
    borderRadius: "14px",
    padding: "14px 22px",
    cursor: "pointer",
    fontSize: "15px",
  },
  suggestionCard: {
    background: "linear-gradient(135deg, #E8F5E9 0%, #DFF1E3 100%)",
    borderRadius: "18px",
    padding: "18px",
    marginTop: "22px",
    boxShadow: "0 8px 20px rgba(0,0,0,0.05)",
  },
  suggestionLabel: {
    fontSize: "13px",
    color: "#2e7d32",
    margin: "0 0 6px",
  },
  suggestionMain: {
    fontSize: "22px",
    fontWeight: "700",
    color: "#1A1A1A",
    margin: 0,
  },
  suggestionSub: {
    fontSize: "13px",
    color: "#555",
    marginTop: "6px",
  },
  confidenceBadge: {
    marginLeft: "10px",
    fontSize: "12px",
    background: "#D4EDDA",
    padding: "4px 8px",
    borderRadius: "999px",
    color: "#333",
  },
  response: {
    marginTop: "22px",
    color: "#333",
    lineHeight: "1.65",
    fontSize: "15px",
    whiteSpace: "pre-line",
    textAlign: "left",
  },
  memoryCard: {
    marginTop: "20px",
    background: "#FAFAFA",
    borderRadius: "18px",
    padding: "18px",
    textAlign: "left",
  },
  memoryLine: {
    margin: "6px 0",
    fontSize: "14px",
    color: "#333",
  },
};
