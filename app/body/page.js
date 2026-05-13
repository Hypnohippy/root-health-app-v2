"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { supabase } from "../../lib/supabase";
import RootEnso from "../../components/RootEnso";
import DigestionView from "../../components/body/DigestionView";
const bodySystems = [
  { id: "stress_nerves", label: "Head / nervous system", system: "nervous/autonomic", signals: ["overwhelm", "racing thoughts", "panic feeling", "tension", "wired but tired", "shaky", "numb or detached", "hard to settle"] },
  { id: "heart_circulation", label: "Heart & circulation", system: "circulatory", signals: ["racing heart", "fluttering", "pressure", "cold hands/feet", "light-headed", "low stamina", "swelling", "colour change"] },
  { id: "breathing", label: "Chest & breathing", system: "respiratory", signals: ["shallow breathing", "tight chest", "breathlessness", "air hunger", "cough", "wheeze", "sighing", "chest heaviness"] },
  { id: "digestion", label: "Stomach / gut", system: "digestive", signals: ["bloating", "reflux", "cramps", "constipation", "loose bowels", "nausea", "appetite change", "wind/gas", "food sensitivity"] },
  { id: "reproductive", label: "Pelvis & reproductive", system: "reproductive/pelvic", signals: ["pelvic discomfort", "groin discomfort", "genital irritation", "burning", "itching", "discharge/change", "swelling", "rash or blistering", "cycle-related change", "sexual discomfort"] },
  { id: "hormones_balance", label: "Hormones & balance", system: "endocrine", signals: ["cravings", "energy dips", "mood swings", "temperature changes", "sweats", "cycle changes", "skin changes", "sleep disruption", "weight change"] },
  { id: "bladder_hydration", label: "Bladder & hydration", system: "urinary/excretory", signals: ["thirst", "frequent urination", "burning when passing urine", "dark urine", "fluid retention", "lower back discomfort", "urgency", "reduced urination"] },
  { id: "muscles_joints", label: "Muscles & joints", system: "musculoskeletal", signals: ["aching", "stiffness", "sharp pain", "deep ache", "weakness", "cramps", "reduced movement", "swelling", "clicking/grinding"] },
  { id: "skin", label: "Skin / dermis", system: "skin/barrier", signals: ["rash", "blistering", "redness", "itching", "dryness", "spots", "sensitivity", "swelling", "colour change", "visible change but no feeling", "slow healing"] },
  { id: "senses", label: "Senses", system: "sensory", signals: ["eye strain", "blurred vision", "light sensitivity", "noise sensitivity", "dizziness", "tingling", "numbness", "ringing ears", "altered smell/taste"] },
  { id: "energy_recovery", label: "Whole body energy", system: "whole-body recovery", signals: ["fatigue", "burnout feeling", "heavy body", "low motivation", "poor recovery", "weakness", "brain fog", "flu-like feeling", "generally depleted"] },
  { id: "sleep_rhythm", label: "Sleep rhythm", system: "circadian/sleep", signals: ["poor sleep", "waking often", "early waking", "tired on waking", "sleepy daytime", "wired at night", "restless sleep", "night sweats"] },
];

const bodyZones = [
  { id: "stress_nerves", top: "7%", left: "42%", width: "16%", height: "12%" },
  { id: "senses", top: "10%", left: "39%", width: "22%", height: "10%" },
  { id: "breathing", top: "24%", left: "33%", width: "34%", height: "12%" },
  { id: "heart_circulation", top: "25%", left: "48%", width: "16%", height: "10%" },
  { id: "digestion", top: "39%", left: "38%", width: "24%", height: "14%" },
  { id: "hormones_balance", top: "45%", left: "37%", width: "26%", height: "16%" },
  { id: "bladder_hydration", top: "54%", left: "40%", width: "20%", height: "9%" },
  { id: "reproductive", top: "59%", left: "38%", width: "24%", height: "9%" },
  { id: "muscles_joints", top: "24%", left: "18%", width: "64%", height: "68%" },
  { id: "skin", top: "20%", left: "24%", width: "52%", height: "72%" },
  { id: "energy_recovery", top: "18%", left: "28%", width: "44%", height: "74%" },
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
  reflux: ["Stay upright for a while after eating", "Try a smaller, lighter meal next time", "Notice if spicy, fatty, acidic foods or late meals make it worse"],
  bloating: ["Eat a little slower and notice whether that changes things", "Try one simple fibre source rather than lots at once", "Notice whether certain foods or stress make it worse"],
  constipation: ["Drink water steadily across the day", "Add one gentle fibre source like oats, fruit, or veg", "A short walk may help movement without forcing anything"],
  "racing heart": ["Pause and reduce stimulation for a few minutes", "Notice caffeine, tiredness, stress, or exertion today", "Track whether it settles or keeps returning"],
  "light-headed": ["Sit down and give yourself a moment", "Check food, hydration, heat, and sudden movement", "If it feels unusual, strong, or repeated, get it checked"],
  aching: ["Try gentle movement rather than pushing hard", "Notice whether rest, warmth, or stretching helps", "Track whether it is improving or spreading"],
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
  const [trendInsight, setTrendInsight] = useState("");
  const [saving, setSaving] = useState(false);
  const [journeyStep, setJourneyStep] = useState("body");

  const selectedItems = bodySystems.filter((item) => selectedSystems.includes(item.id));
  const current = bodySystems.find((item) => item.id === activeSystemId);

  const resetLearningUI = () => {
    setResponse("");
    setSuggestedHelp("");
    setConfidenceScore(null);
    setRankedHelp([]);
    setTrendInsight("");
  };

 const selectSystem = (id) => {
  setSelectedSystems((prev) => (prev.includes(id) ? prev : [...prev, id]));
  setActiveSystemId(id);
  setSelectedSignal("");
  setContext("");
  setIntensity(5);
  setWhatHelped("");
  resetLearningUI();

  if (id === "digestion") {
    setJourneyStep("digestion");
  } else {
    setJourneyStep("signals");
  }
};
  const clearSelections = () => {
    setSelectedSystems([]);
    setActiveSystemId(null);
    setSelectedSignal("");
    setContext("");
    setIntensity(5);
    setWhatHelped("");
    setJourneyStep("body");
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

    const usefulHistory = Array.isArray(history) ? history : [];
    const sameSignalHistory = usefulHistory.filter(
      (entry) => normalise(entry.signal) === normalise(selectedSignal)
    );

    const lastEntry = sameSignalHistory[0];
    const lastIntensity = lastEntry ? Number(lastEntry.intensity || 0) : null;

    let trendText = "";

    if (!lastEntry) {
      trendText = "This is the first time this signal has appeared in your recent history.";
    } else if (intensity <= lastIntensity - 2) {
      trendText = `This looks like it has eased since last time (${lastIntensity}/10 → ${intensity}/10).`;
    } else if (intensity >= lastIntensity + 2) {
      trendText = `This looks stronger than last time (${lastIntensity}/10 → ${intensity}/10). It may be worth slowing down and watching it more closely.`;
    } else {
      trendText = `This is roughly similar to last time (${lastIntensity}/10 → ${intensity}/10).`;
    }

    setTrendInsight(trendText);

    const helpCounts = {};
    sameSignalHistory.forEach((entry) => {
      if (entry.what_helped && normalise(entry.what_helped) !== "nothing yet") {
        helpCounts[entry.what_helped] = (helpCounts[entry.what_helped] || 0) + 1;
      }
    });

    if (whatHelped && whatHelped !== "Nothing yet") {
      helpCounts[whatHelped] = (helpCounts[whatHelped] || 0) + 1;
    }

    const ranked = Object.entries(helpCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const top = ranked[0];

    if (whatHelped && whatHelped !== "Nothing yet") {
      setSuggestedHelp(whatHelped);
      setConfidenceScore(null);
    } else if (top) {
      const total = ranked.reduce((sum, [, count]) => sum + count, 0);
      setSuggestedHelp(top[0]);
      setConfidenceScore(Math.round((top[1] / total) * 100));
    }

    setRankedHelp(ranked);

    const entryToSave = {
      areas: selectedItems.map((item) => item.label),
      system: selectedItems.map((item) => item.system).join(", "),
      signal: selectedSignal,
      context,
      intensity,
      what_helped: whatHelped || "",
    };

    const { error: saveError } = await supabase.from("body_signals").insert([entryToSave]);

    if (saveError) {
      setResponse("Something went wrong saving this entry. Please try again.");
      setSaving(false);
      return;
    }

    let message = trendText ? `${trendText}\n\n${buildBaseResponse()}` : buildBaseResponse();

    if (whatHelped && whatHelped !== "Nothing yet") {
      message += `\n\nYou just found something useful: "${whatHelped}". Stay with that today if it feels right — this is the kind of feedback Root Health can learn from.`;
    }

    setResponse(message);
    setSaving(false);
  };

  return (
    <main style={styles.page}>
      <div style={styles.backgroundWash} />

      <header style={styles.topBar}>
        <a href="/" style={styles.iconButton}>←</a>
        <RootEnso size={58} />
        <button style={styles.iconButton}>☰</button>
      </header>

      <section style={styles.stage}>
    {journeyStep === "digestion" && current?.id === "digestion" && (
  <div style={styles.journeyPanel}>
    <DigestionView
      selectedSignal={selectedSignal}
      setSelectedSignal={setSelectedSignal}
      onBack={() => {
        setJourneyStep("body");
        clearSelections();
      }}
      onContinue={() => setJourneyStep("signals")}
    />
  </div>
)}
       {journeyStep !== "digestion" && (
  <div style={styles.bodyPanel}>
          <h1 style={styles.title}>
            {current ? current.label : "Where are you feeling it today?"}
          </h1>

          <div style={styles.bodyImageWrap}>
            <img
              src="/visuals/body-map-human.png"
              alt="Root Health body map"
              style={styles.bodyImage}
            />

            {bodyZones.map((zone) => (
              <button
                key={zone.id}
                aria-label={zone.id}
                onClick={() => selectSystem(zone.id)}
                style={{
                  ...styles.hitZone,
                  top: zone.top,
                  left: zone.left,
                  width: zone.width,
                  height: zone.height,
                }}
              />
            ))}

            {current && (
              <div style={styles.activeGlow}>
                {current.label}
              </div>
            )}
          </div>

          {!current && (
            <p style={styles.tapHint}>Tap the area that feels out of balance</p>
          )}

          {current && (
            <button style={styles.clearButton} onClick={clearSelections}>
              Start again
            </button>
          )}
        </div>
)}
     
         {current && journeyStep !== "digestion" && (
  <div style={styles.explorePanel}>
            <p style={styles.panelKicker}>Signal exploration</p>
            <h2 style={styles.panelTitle}>{current.label}</h2>

            <p style={styles.question}>What are you noticing?</p>

            <div style={styles.choiceGrid}>
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
                    ...(selectedSignal === sig ? styles.choiceActive : {}),
                  }}
                >
                  {sig}
                </button>
              ))}
            </div>

            {selectedSignal && (
              <>
                <p style={styles.question}>When does this show up?</p>
                <div style={styles.choiceGrid}>
                  {contextOptions.map((item) => (
                    <button
                      key={item}
                      onClick={() => {
                        setContext(item);
                        resetLearningUI();
                      }}
                      style={{
                        ...styles.choiceButton,
                        ...(context === item ? styles.choiceActive : {}),
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
                <p style={styles.question}>How strong is it today?</p>

                <div style={styles.scoreRow}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                    <button
                      key={score}
                      onClick={() => setIntensity(score)}
                      style={{
                        ...styles.scoreButton,
                        ...(intensity === score ? styles.scoreActive : {}),
                      }}
                    >
                      {score}
                    </button>
                  ))}
                </div>

                <p style={styles.question}>What helped, if anything?</p>

                <div style={styles.choiceGrid}>
                  {helpOptions.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setWhatHelped(opt)}
                      style={{
                        ...styles.choiceButton,
                        ...(whatHelped === opt ? styles.choiceActive : {}),
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>

                <button style={styles.continueButton} onClick={handleExplore}>
                  {saving ? "Saving..." : "Save & reflect"}
                </button>
              </>
            )}
          </div>
        )}

        {(response || trendInsight || suggestedHelp || rankedHelp.length > 0) && (
          <div style={styles.responsePanel}>
            <p style={styles.panelKicker}>Root response</p>

            {suggestedHelp && (
              <div style={styles.suggestionCard}>
                Suggested focus: {suggestedHelp}
                {confidenceScore !== null && (
                  <span style={styles.confidenceBadge}>{confidenceScore}%</span>
                )}
              </div>
            )}

            {response && <p style={styles.responseText}>{response}</p>}

            {rankedHelp.length > 0 && (
              <div style={styles.memoryCard}>
                <strong>What tends to help this signal</strong>
                {rankedHelp.map(([item, count], index) => (
                  <p key={item}>
                    {index + 1}. {item} ({count} {count === 1 ? "time" : "times"})
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <nav style={styles.bottomNav}>
        <a href="/" style={styles.navItem}>Home</a>
        <a href="/coach" style={styles.navItem}>Coach</a>
        <a href="/body" style={styles.activeNav}>Body</a>
        <a href="/journal" style={styles.navItem}>Journal</a>
        <a href="/profile" style={styles.navItem}>You</a>
      </nav>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    position: "relative",
    overflow: "hidden",
    background: "#F3EBDD",
    fontFamily: "Inter, sans-serif",
  },

  backgroundWash: {
    position: "absolute",
    inset: 0,
    background:
      "radial-gradient(circle at 50% 80%, rgba(76,91,68,0.24), transparent 40%), linear-gradient(180deg, #FAF4EA 0%, #E7DCCB 60%, #6D725F 100%)",
  },

  topBar: {
    position: "relative",
    zIndex: 4,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "26px 32px 0",
  },

  iconButton: {
    width: "46px",
    height: "46px",
    borderRadius: "50%",
    border: "none",
    background: "rgba(255,255,255,0.64)",
    color: "#111",
    textDecoration: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "22px",
    backdropFilter: "blur(14px)",
  },

  stage: {
    position: "relative",
    zIndex: 2,
    display: "grid",
    gridTemplateColumns: "1fr 390px",
    gap: "28px",
    minHeight: "calc(100vh - 120px)",
    padding: "20px 34px 124px",
    alignItems: "center",
  },

  bodyPanel: {
    textAlign: "center",
  },

  title: {
    margin: "0 0 18px",
    fontFamily: "Georgia, serif",
    fontSize: "44px",
    fontWeight: "500",
    color: "#2A261F",
  },

  bodyImageWrap: {
    position: "relative",
    width: "min(540px, 82vw)",
    margin: "0 auto",
  },

  bodyImage: {
    width: "100%",
    display: "block",
    filter: "drop-shadow(0 32px 70px rgba(0,0,0,0.18))",
  },

  hitZone: {
    position: "absolute",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    borderRadius: "999px",
    zIndex: 4,
  },

  activeGlow: {
    position: "absolute",
    left: "50%",
    bottom: "8%",
    transform: "translateX(-50%)",
    background: "rgba(24,24,24,0.7)",
    color: "#FFFFFF",
    borderRadius: "999px",
    padding: "10px 16px",
    backdropFilter: "blur(10px)",
    fontSize: "14px",
  },

  tapHint: {
    marginTop: "-34px",
    color: "#FFFFFF",
    textShadow: "0 2px 14px rgba(0,0,0,0.42)",
    fontSize: "16px",
  },

  clearButton: {
    marginTop: "12px",
    border: "none",
    borderRadius: "999px",
    padding: "10px 16px",
    background: "rgba(255,255,255,0.72)",
    cursor: "pointer",
  },

  explorePanel: {
    maxHeight: "72vh",
    overflowY: "auto",
    background: "rgba(250,244,234,0.86)",
    border: "1px solid rgba(255,255,255,0.74)",
    borderRadius: "34px",
    padding: "28px",
    backdropFilter: "blur(20px)",
    boxShadow: "0 28px 80px rgba(45,38,28,0.2)",
  },

  panelKicker: {
    margin: "0 0 8px",
    fontSize: "12px",
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: "#776C5B",
    fontWeight: "800",
  },

  panelTitle: {
    margin: "0 0 20px",
    fontFamily: "Georgia, serif",
    fontSize: "32px",
    fontWeight: "500",
    color: "#2A261F",
  },

  question: {
    margin: "22px 0 12px",
    color: "#4D463B",
    fontWeight: "700",
  },

  choiceGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
  },

  choiceButton: {
    border: "none",
    borderRadius: "16px",
    padding: "13px 14px",
    textAlign: "left",
    background: "rgba(255,255,255,0.76)",
    color: "#2F2A22",
    cursor: "pointer",
    fontSize: "14px",
  },

  choiceActive: {
    background: "#181818",
    color: "#FFFFFF",
  },

  scoreRow: {
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    gap: "8px",
  },

  scoreButton: {
    height: "38px",
    borderRadius: "999px",
    border: "none",
    background: "rgba(255,255,255,0.76)",
    cursor: "pointer",
  },

  scoreActive: {
    background: "#C23B30",
    color: "#FFFFFF",
  },

  continueButton: {
    width: "100%",
    marginTop: "24px",
    border: "none",
    borderRadius: "18px",
    padding: "16px",
    background: "#181818",
    color: "#FFFFFF",
    cursor: "pointer",
    fontSize: "15px",
  },

  responsePanel: {
    gridColumn: "1 / -1",
    background: "rgba(250,244,234,0.9)",
    borderRadius: "34px",
    padding: "30px",
    backdropFilter: "blur(20px)",
    boxShadow: "0 24px 70px rgba(40,34,25,0.18)",
    maxWidth: "1000px",
    margin: "0 auto",
  },

  responseText: {
    whiteSpace: "pre-line",
    lineHeight: "1.75",
    color: "#2F2A22",
    fontSize: "16px",
  },

  suggestionCard: {
    display: "inline-flex",
    gap: "12px",
    alignItems: "center",
    background: "rgba(48,70,45,0.12)",
    borderRadius: "999px",
    padding: "12px 16px",
    color: "#273C25",
    marginBottom: "12px",
  },

  confidenceBadge: {
    marginLeft: "8px",
    background: "#FFFFFF",
    borderRadius: "999px",
    padding: "4px 8px",
    fontSize: "12px",
  },

  memoryCard: {
    marginTop: "18px",
    paddingTop: "18px",
    borderTop: "1px solid rgba(0,0,0,0.1)",
  },

  bottomNav: {
    position: "fixed",
    left: "50%",
    bottom: "24px",
    transform: "translateX(-50%)",
    zIndex: 8,
    width: "92%",
    maxWidth: "920px",
    background: "rgba(250,244,234,0.88)",
    borderRadius: "30px",
    padding: "12px",
    backdropFilter: "blur(18px)",
    display: "flex",
    justifyContent: "space-around",
    boxShadow: "0 24px 60px rgba(0,0,0,0.20)",
  },

  activeNav: {
    background: "#181818",
    color: "#FFFFFF",
    borderRadius: "18px",
    padding: "12px 18px",
    textDecoration: "none",
  },

  navItem: {
    color: "#2A261F",
    textDecoration: "none",
    padding: "12px 12px",
  },
  journeyPanel: {
  gridColumn: "1 / -1",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  minHeight: "70vh",
},
};
