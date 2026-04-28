"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";
import GlassBody from "../components/GlassBody";
import Nav from "../components/Nav";

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

export default function Home() {
  const [selectedSystems, setSelectedSystems] = useState([]);
  const [activeSystemId, setActiveSystemId] = useState(null);
  const [selectedSignal, setSelectedSignal] = useState("");
  const [context, setContext] = useState("");
  const [intensity, setIntensity] = useState(5);
  const [response, setResponse] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedItems = bodySystems.filter((item) => selectedSystems.includes(item.id));
  const current = bodySystems.find((item) => item.id === activeSystemId);

  const selectSystem = (id) => {
    setSelectedSystems((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setActiveSystemId(id);
    setSelectedSignal("");
    setContext("");
    setIntensity(5);
    setResponse("");
  };

  const clearSelections = () => {
    setSelectedSystems([]);
    setActiveSystemId(null);
    setSelectedSignal("");
    setContext("");
    setIntensity(5);
    setResponse("");
  };

  const buildCoachResponse = () => {
    if (selectedItems.length === 0 || !current || !selectedSignal || !context) return "";

    const labels = selectedItems.map((item) => item.label.toLowerCase()).join(", ");

    let message = `You’ve marked ${labels}. Right now, we’re exploring ${current.label.toLowerCase()}, where you’re noticing ${selectedSignal}.`;

    if (selectedSystems.length > 1) {
      message += " Because more than one area is showing up, Root Health will treat this as a connected body pattern rather than a single isolated signal.";
    }

    if (selectedSystems.includes("digestion") && selectedSystems.includes("stress_nerves")) {
      message += " Digestion and stress can sometimes influence each other through the gut–brain connection.";
    }

    if ((selectedSystems.includes("breathing") || selectedSystems.includes("heart_circulation")) && selectedSystems.includes("stress_nerves")) {
      message += " Breathing, heart rhythm and stress can sometimes move together when the nervous system is carrying more load.";
    }

    if (selectedSystems.includes("skin") && selectedSystems.includes("digestion")) {
      message += " Skin and digestion can sometimes be worth observing together, especially around food patterns, stress and inflammation.";
    }

    if (selectedSystems.includes("energy_recovery") && selectedSystems.includes("sleep_rhythm")) {
      message += " Energy and sleep rhythm often give useful clues about recovery and overall system load.";
    }

    if (selectedSystems.includes("reproductive") && selectedSystems.includes("stress_nerves")) {
      message += " Pelvic and reproductive signals can sometimes be influenced by stress, tension, hormones, sleep and emotional load.";
    }

    if (selectedSystems.includes("reproductive") && selectedSystems.includes("bladder_hydration")) {
      message += " Pelvic, reproductive and bladder signals can sometimes overlap, so it is useful to track them carefully and notice timing, irritation and hydration.";
    }

    message += ` You said this tends to show up ${context}, with an intensity of ${intensity}/10.`;

    message += "\n\nA gentle place to begin could be:";

    if (current.id === "digestion") {
      message += "\n• hydration and fibre check\n• notice stress around meals\n• slow eating and allow space after food";
    } else if (current.id === "stress_nerves") {
      message += "\n• slow breathing or grounding\n• reduce stimulation briefly\n• notice what feels mentally heavy today";
    } else if (current.id === "breathing") {
      message += "\n• soften the breath\n• check posture\n• pause for a nervous-system reset";
    } else if (current.id === "heart_circulation") {
      message += "\n• pause and reduce stimulation\n• notice caffeine, stress, sleep and exertion\n• track whether this is new, repeated, or linked to anxiety";
    } else if (current.id === "skin") {
      message += "\n• notice visible changes, products, clothing or irritation\n• check hydration, sleep and stress\n• track whether it spreads, changes colour or becomes painful";
    } else if (current.id === "reproductive") {
      message += "\n• notice irritation, timing, clothing, friction or recent changes\n• track whether it is linked to stress, cycle, sex, products or hydration\n• avoid assuming one cause too quickly";
    } else if (current.id === "bladder_hydration") {
      message += "\n• check hydration and caffeine/alcohol intake\n• notice burning, urgency or colour changes\n• track frequency and timing";
    } else if (current.id === "energy_recovery") {
      message += "\n• check sleep quality\n• reduce load slightly today\n• support with food and hydration";
    } else {
      message += "\n• check sleep, stress and hydration\n• notice recent changes\n• track this for a few days";
    }

    if (
      selectedSignal.includes("blister") ||
      selectedSignal.includes("discharge") ||
      selectedSignal.includes("burning when passing urine") ||
      selectedSignal.includes("swelling") ||
      selectedSignal.includes("colour change")
    ) {
      message += "\n\nBecause this includes a visible or potentially sensitive change, it may be worth monitoring carefully. If it worsens, spreads, is painful, unusual, persistent, or worrying, it’s important to speak with a healthcare professional.";
    }

    if (intensity >= 8) {
      message += "\n\nBecause this feels strong, be gentle with yourself. If it feels severe, unusual, persistent or worrying, it’s important to speak with a healthcare professional.";
    }

    return message;
  };

  const handleExplore = async () => {
    if (selectedItems.length === 0 || !current || !selectedSignal || !context) return;

    setSaving(true);

    const entryToSave = {
      areas: selectedItems.map((item) => item.label),
      system: selectedItems.map((item) => item.system).join(", "),
      signal: selectedSignal,
      context,
      intensity,
    };

    await supabase.from("body_signals").insert([entryToSave]);

    const { data, error } = await supabase
      .from("body_signals")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    let message = buildCoachResponse();

    if (error) {
      message += ` Supabase read error: ${error.message}`;
      setResponse(message);
      setSaving(false);
      return;
    }

    if (data && data.length > 1) {
      const selectedLabels = selectedItems.map((item) => item.label);

      const repeatedAreaCount = data.filter((entry) => {
        if (!Array.isArray(entry.areas)) return false;
        return entry.areas.some((area) => selectedLabels.includes(area));
      }).length;

      const sameSignalCount = data.filter((entry) => entry.signal === selectedSignal).length;
      const highIntensity = data.filter((entry) => Number(entry.intensity) >= 7).length;

      if (repeatedAreaCount >= 3) {
        message += "\n\nI’m noticing a pattern here — one or more of these areas has come up a few times recently. It may be your body gently trying to get your attention rather than this being a one-off moment.";
      }

      if (sameSignalCount >= 3) {
        message += "\n\nThe same signal has also been repeating, which can sometimes help us understand what your system tends to return to under certain conditions.";
      }

      if (highIntensity >= 2) {
        message += "\n\nSome of these signals have been quite strong, so rather than pushing through, it may help to slow things down and support this area with a bit more care.";
      }
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

        <h1 style={styles.title}>Root Health</h1>
        <p style={styles.subtitle}>Tap each place your body is asking for attention today.</p>

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
            <p style={styles.panelTitle}>
              {selectedItems.length > 1 ? "Connected body pattern" : current.label}
            </p>

            <p style={styles.microText}>
              Selected: {selectedItems.map((item) => item.label).join(", ")}
            </p>

            <p style={styles.label}>Which signal should we explore first?</p>
            <div style={styles.choiceRow}>
              {current.signals.map((sig) => (
                <button
                  key={sig}
                  onClick={() => {
                    setSelectedSignal(sig);
                    setContext("");
                    setResponse("");
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
                <p style={styles.label}>When does this tend to show up?</p>
                <div style={styles.choiceRow}>
                  {contextOptions.map((item) => (
                    <button
                      key={item}
                      onClick={() => setContext(item)}
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
                <p style={styles.label}>How strong or concerning is it today?</p>
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
    </main
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
    whiteSpace: "pre-line",
  },
};
