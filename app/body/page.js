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
export default function Home() {
  const [whatHelped, setWhatHelped] = useState("");
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

  let message = `You’ve marked ${labels}. Right now we’re looking at ${selectedSignal} around ${current.label.toLowerCase()}.`;

  message += ` It feels ${context}, sitting around ${intensity}/10.`;

  // 🧠 CONTEXT AWARE OPENING
  if (context === "improving") {
    message += `\n\nThis looks like it’s settling compared to before. That’s a really good sign — something you’ve done recently may be helping.`;
  } else if (context === "worsening") {
    message += `\n\nThis looks like it’s building a bit. Worth slowing things down slightly and giving this area some support.`;
  } else if (context === "same") {
    message += `\n\nThis seems to be sticking around rather than shifting. That usually means it’s worth looking a little closer at what might be maintaining it.`;
  } else {
    message += `\n\nLet’s just get a sense of this without rushing to fix it.`;
  }

  // 🔁 PATTERN (ONLY IF IT MATTERS)
  if (selectedSystems.length > 1) {
    message += `\n\nBecause a couple of areas are showing up together, this may be more of a connected pattern than a single issue.`;
  }

  // 🎯 ACTIONABLE GUIDANCE (REAL, NOT VAGUE)
  message += `\n\nA simple way to support this today could be:`;

  if (current.id === "digestion") {
    message += `\n• Drink an extra 1–2 glasses of water today\n• Add one simple fibre source (veg, oats, fruit)\n• Eat a little slower and notice how your body responds after meals`;
  } 
  else if (current.id === "stress_nerves") {
    message += `\n• Take 2–3 slow breaths, longer out than in\n• Step away from stimulation for a few minutes\n• Ask “what’s actually loading me right now?”`;
  } 
  else if (current.id === "breathing") {
    message += `\n• Slow your breathing slightly (in for 4, out for 6)\n• Sit or stand a little taller\n• Give yourself a short pause to reset`;
  } 
  else if (current.id === "heart_circulation") {
    message += `\n• Pause and reduce stimulation for a moment\n• Notice caffeine, stress, or tiredness today\n• Keep an eye on whether this settles or repeats`;
  } 
  else if (current.id === "skin") {
    message += `\n• Notice anything new touching your skin (products, clothes)\n• Check hydration and sleep\n• Watch if it spreads or settles`;
  } 
  else if (current.id === "reproductive") {
    message += `\n• Notice any irritation, friction, or recent changes\n• Track timing (cycle, stress, activity)\n• Avoid jumping to conclusions — just observe patterns`;
  } 
  else if (current.id === "bladder_hydration") {
    message += `\n• Drink water steadily through the day\n• Reduce caffeine/alcohol for now\n• Notice frequency, urgency, or discomfort`;
  } 
  else if (current.id === "energy_recovery") {
    message += `\n• Ease your load slightly today if you can\n• Eat something supportive and hydrate\n• Prioritise rest where possible`;
  } 
  else {
    message += `\n• Check sleep, stress, and hydration\n• Notice anything that’s changed recently\n• Give it a little space and observe`;
  }

  // 🟢 POSITIVE CLOSE (IMPORTANT SHIFT)
  if (context === "improving") {
    message += `\n\nIf this keeps moving in this direction, you don’t need to do much more — just keep doing what seems to be working.`;
  } else {
    message += `\n\nWe don’t need to solve this all at once — just noticing and making small adjustments is enough for now.`;
  }

  // ⚠️ SAFETY (ONLY WHEN NEEDED)
  if (
    selectedSignal.includes("blister") ||
    selectedSignal.includes("discharge") ||
    selectedSignal.includes("burning when passing urine") ||
    selectedSignal.includes("swelling") ||
    selectedSignal.includes("colour change") ||
    intensity >= 8
  ) {
    message += `\n\nIf this becomes painful, unusual, or doesn’t settle, it’s worth getting it checked just to be safe.`;
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
      what_helped: whatHelped,
    };

    await supabase.from("body_signals").insert([entryToSave]);

    const { data, error } = await supabase
      .from("body_signals")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    let message = buildCoachResponse();
    // 🔁 LOOK BACK: what helped before
// 🔁 BUILD PERSONAL "WHAT HELPS" PROFILE
const helpCounts = {};

data.forEach((entry) => {
  if (
    entry.signal === selectedSignal &&
    entry.what_helped &&
    entry.what_helped !== ""
  ) {
    helpCounts[entry.what_helped] =
      (helpCounts[entry.what_helped] || 0) + 1;
  }
});

const rankedHelp = Object.entries(helpCounts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 3););
    if (rankedHelp.length > 0) {
  message += `\n\nWhat tends to help you most:`;

  rankedHelp.forEach(([item, count], index) => {
    message += `\n${index + 1}. ${item} (${count} ${
      count === 1 ? "time" : "times"
    })`;
  });
}

if (previous) {
  message += `\n\nLast time this showed up, you noted that "${previous.what_helped}" helped. It might be worth trying that again.`;
}

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

           {response && (
  <>
    <p style={styles.response}>{response}</p>

    <p style={styles.label}>What helped (if anything)?</p>

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
  </>
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
