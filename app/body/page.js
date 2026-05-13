"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { supabase } from "../../lib/supabase";
import GlassBody from "../../components/GlassBody";
import RootEnso from "../../components/RootEnso";

const bodySystems = [
  { id: "stress_nerves", label: "Stress & nerves", system: "nervous/autonomic", signals: ["overwhelm", "racing thoughts", "panic feeling", "tension", "wired but tired", "shaky", "numb or detached", "hard to settle"] },
  { id: "heart_circulation", label: "Heart & circulation", system: "circulatory", signals: ["racing heart", "fluttering", "pressure", "cold hands/feet", "light-headed", "low stamina", "swelling", "colour change"] },
  { id: "breathing", label: "Breathing", system: "respiratory", signals: ["shallow breathing", "tight chest", "breathlessness", "air hunger", "cough", "wheeze", "sighing", "chest heaviness"] },
  { id: "digestion", label: "Digestion", system: "digestive", signals: ["bloating", "reflux", "cramps", "constipation", "loose bowels", "nausea", "appetite change", "wind/gas", "food sensitivity"] },
  { id: "reproductive", label: "Pelvis & reproductive", system: "reproductive/pelvic", signals: ["pelvic discomfort", "groin discomfort", "genital irritation", "burning", "itching", "discharge/change", "swelling", "rash or blistering", "cycle-related change", "sexual discomfort"] },
  { id: "hormones_balance", label: "Hormones & balance", system: "endocrine", signals: ["cravings", "energy dips", "mood swings", "temperature changes", "sweats", "cycle changes", "skin changes", "sleep disruption", "weight change"] },
  { id: "bladder_hydration", label: "Bladder & hydration", system: "urinary/excretory", signals: ["thirst", "frequent urination", "burning when passing urine", "dark urine", "fluid retention", "lower back discomfort", "urgency", "reduced urination"] },
  { id: "muscles_joints", label: "Muscles & joints", system: "musculoskeletal", signals: ["aching", "stiffness", "sharp pain", "deep ache", "weakness", "cramps", "reduced movement", "swelling", "clicking/grinding"] },
  { id: "skin", label: "Skin", system: "skin/barrier", signals: ["rash", "blistering", "redness", "itching", "dryness", "spots", "sensitivity", "swelling", "colour change", "visible change but no feeling", "slow healing"] },
  { id: "senses", label: "Senses", system: "sensory", signals: ["eye strain", "blurred vision", "light sensitivity", "noise sensitivity", "dizziness", "tingling", "numbness", "ringing ears", "altered smell/taste"] },
  { id: "energy_recovery", label: "Energy & recovery", system: "whole-body recovery", signals: ["fatigue", "burnout feeling", "heavy body", "low motivation", "poor recovery", "weakness", "brain fog", "flu-like feeling", "generally depleted"] },
  { id: "sleep_rhythm", label: "Sleep rhythm", system: "circadian/sleep", signals: ["poor sleep", "waking often", "early waking", "tired on waking", "sleepy daytime", "wired at night", "restless sleep", "night sweats"] },
  { id: "whole_body", label: "Whole body", system: "multi-system", signals: ["generally off", "run down", "inflamed feeling", "unsettled", "heavy", "shaky", "hard to describe", "visible change", "recurring pattern"] },
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
  const [trendInsight, setTrendInsight] = useState("");
  const [saving, setSaving] = useState(false);

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

    const triedHelps = new Set(
      sameSignalHistory
        .map((entry) => entry.what_helped)
        .filter((item) => item && normalise(item) !== "nothing yet")
    );

    const recentThree = sameSignalHistory.slice(0, 3);
    const recentAverage =
      recentThree.length > 0
        ? recentThree.reduce((sum, entry) => sum + Number(entry.intensity || 0), 0) / recentThree.length
        : 0;

    if (triedHelps.size >= 3 && recentAverage >= 5 && intensity >= 5) {
      trendText =
        "You’ve tried a few different supports and this signal still seems to be hanging around. That may mean it is time to simplify variables rather than keep guessing.";
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

    const ranked = Object.entries(helpCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    const top = ranked[0];
    let predictedHelp = "";
    let confidence = null;

    if (whatHelped && whatHelped !== "Nothing yet") {
      predictedHelp = whatHelped;
      setSuggestedHelp(whatHelped);
      setConfidenceScore(null);
    } else if (top) {
      const total = ranked.reduce((sum, [, count]) => sum + count, 0);
      confidence = Math.round((top[1] / total) * 100);
      predictedHelp = top[0];
      setSuggestedHelp(predictedHelp);
      setConfidenceScore(confidence);
    }

    setRankedHelp(ranked);

    const triedSet = new Set(
      sameSignalHistory
        .map((e) => e.what_helped)
        .filter((v) => v && normalise(v) !== "nothing yet")
    );

    const untriedOptions = helpOptions.filter(
      (opt) => opt !== "Nothing yet" && !triedSet.has(opt)
    );

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

    let message = buildBaseResponse();

    if (trendText) {
      message = `${trendText}\n\n` + message;
    }

    const nothingWorked =
      (!whatHelped || whatHelped === "Nothing yet") &&
      sameSignalHistory.filter(
        (e) => !e.what_helped || e.what_helped === "Nothing yet"
      ).length >= 2;

    const needsEscalation =
      context === "getting worse" &&
      intensity >= 7 &&
      nothingWorked;

    if (needsEscalation) {
      setSuggestedHelp("");
      setConfidenceScore(null);

      let newIdeasText = "";

      if (untriedOptions.length > 0) {
        newIdeasText =
          "\n\nYou haven’t tried:\n" +
          untriedOptions.slice(0, 3).map((opt) => `• ${opt}`).join("\n");
      }

      message =
        `This looks like a pattern where things are not improving.\n\n` +
        `Rather than repeating the same approaches, shift strategy:\n` +
        `• Stop testing fixes for now\n` +
        `• Reduce load on this area\n` +
        `• Observe what changes without interference` +
        newIdeasText +
        `\n\nIf this continues, worsens, or feels unusual, it is worth getting it properly checked.\n\n` +
        message;
    } else if (!nothingWorked && predictedHelp) {
      message = `Suggested focus: "${predictedHelp}".\n\n` + message;
    }

    if (whatHelped && whatHelped !== "Nothing yet") {
      message += `\n\nYou just found something useful: "${whatHelped}". Stay with that today if it feels right — this is the kind of feedback Root Health can learn from.`;
    }

    setResponse(message);
    setSaving(false);
  };

  const activeTitle = current?.label || "Where are you feeling it today?";

  return (
    <main style={styles.page}>
      <img
        src="/visuals/body-signal-bg.png"
        alt=""
        style={styles.backgroundImage}
      />

      <div style={styles.overlay} />

      <div style={styles.topBar}>
        <a href="/" style={styles.backButton}>←</a>
        <RootEnso size={58} />
        <button style={styles.menuButton}>☰</button>
      </div>

      <section style={styles.stage}>
        <div style={styles.bodyArea}>
          <h1 style={styles.title}>{activeTitle}</h1>
          <p style={styles.subtitle}>
            Tap an area, then choose what your body is asking you to notice.
          </p>

          <div style={styles.figureWrap}>
            <GlassBody
              selectedSystems={selectedItems.map((item) => item.label)}
              onSelect={selectSystem}
              onClear={clearSelections}
            />
          </div>

          <p style={styles.tapHint}>
            Tap the area that feels out of balance
          </p>
        </div>

        <div style={styles.sidePanel}>
          {!current && (
            <>
              <p style={styles.panelKicker}>Body map</p>
              <h2 style={styles.panelTitle}>Choose an area</h2>

              <div style={styles.systemGrid}>
                {bodySystems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => selectSystem(item.id)}
                    style={styles.systemButton}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </>
          )}

          {current && (
            <>
              <p style={styles.panelKicker}>Signal exploration</p>
              <h2 style={styles.panelTitle}>{current.label}</h2>

              <p style={styles.question}>What are you noticing?</p>
              <div style={styles.choiceColumn}>
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
                      ...(selectedSignal === sig ? styles.choiceButtonActive : {}),
                    }}
                  >
                    {sig}
                  </button>
                ))}
              </div>

              {selectedSignal && (
                <>
                  <p style={styles.question}>When does this show up?</p>
                  <div style={styles.choiceColumn}>
                    {contextOptions.map((item) => (
                      <button
                        key={item}
                        onClick={() => {
                          setContext(item);
                          resetLearningUI();
                        }}
                        style={{
                          ...styles.choiceButton,
                          ...(context === item ? styles.choiceButtonActive : {}),
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
                          ...(intensity === score ? styles.scoreButtonActive : {}),
                        }}
                      >
                        {score}
                      </button>
                    ))}
                  </div>

                  <p style={styles.question}>What helped, if anything?</p>
                  <div style={styles.choiceColumn}>
                    {helpOptions.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setWhatHelped(opt)}
                        style={{
                          ...styles.choiceButton,
                          ...(whatHelped === opt ? styles.choiceButtonActive : {}),
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
            </>
          )}
        </div>

        {(response || trendInsight || suggestedHelp || rankedHelp.length > 0) && (
          <div style={styles.responsePanel}>
            <p style={styles.panelKicker}>Root response</p>

            {trendInsight && (
              <p style={styles.responseText}>{trendInsight}</p>
            )}

            {suggestedHelp && (
              <div style={styles.suggestionCard}>
                <strong>{suggestedHelp}</strong>
                {confidenceScore !== null && (
                  <span style={styles.confidenceBadge}>{confidenceScore}%</span>
                )}
              </div>
            )}

            {response && <p style={styles.responseText}>{response}</p>}

            {rankedHelp.length > 0 && (
              <div style={styles.memoryCard}>
                <strong>What tends to help</strong>
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
    position: "relative",
    minHeight: "100vh",
    overflow: "hidden",
    background: "#F4EBDD",
    fontFamily: "Inter, sans-serif",
  },

  backgroundImage: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    opacity: 0.9,
  },

  overlay: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(180deg, rgba(250,244,234,0.86), rgba(250,244,234,0.58) 45%, rgba(45,55,42,0.22))",
  },

  topBar: {
    position: "relative",
    zIndex: 4,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "28px 34px 0",
  },

  backButton: {
    width: "46px",
    height: "46px",
    borderRadius: "50%",
    background: "rgba(255,255,255,0.55)",
    color: "#111",
    textDecoration: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "24px",
    backdropFilter: "blur(12px)",
  },

  menuButton: {
    width: "46px",
    height: "46px",
    borderRadius: "50%",
    border: "none",
    background: "rgba(255,255,255,0.55)",
    fontSize: "20px",
    cursor: "pointer",
    backdropFilter: "blur(12px)",
  },

  stage: {
    position: "relative",
    zIndex: 2,
    minHeight: "calc(100vh - 130px)",
    padding: "22px 34px 120px",
    display: "grid",
    gridTemplateColumns: "1fr 390px",
    gap: "28px",
    alignItems: "center",
  },

  bodyArea: {
    textAlign: "center",
    minHeight: "640px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  },

  title: {
    margin: "0 0 12px",
    fontFamily: "Georgia, serif",
    fontWeight: "500",
    fontSize: "46px",
    color: "#2A261F",
  },

  subtitle: {
    margin: "0 auto 18px",
    maxWidth: "520px",
    fontSize: "17px",
    lineHeight: "1.7",
    color: "#5B5448",
  },

  figureWrap: {
    margin: "0 auto",
    width: "min(520px, 80vw)",
    filter: "drop-shadow(0 30px 60px rgba(0,0,0,0.16))",
  },

  tapHint: {
    color: "#F8F1E7",
    marginTop: "-36px",
    textShadow: "0 2px 12px rgba(0,0,0,0.45)",
  },

  sidePanel: {
    maxHeight: "72vh",
    overflowY: "auto",
    background: "rgba(250,244,234,0.82)",
    border: "1px solid rgba(255,255,255,0.72)",
    borderRadius: "34px",
    padding: "28px",
    backdropFilter: "blur(20px)",
    boxShadow: "0 26px 70px rgba(40,34,25,0.18)",
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
    margin: "0 0 22px",
    fontFamily: "Georgia, serif",
    fontSize: "32px",
    fontWeight: "500",
    color: "#2A261F",
  },

  systemGrid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "10px",
  },

  systemButton: {
    border: "none",
    borderRadius: "16px",
    padding: "15px 16px",
    textAlign: "left",
    background: "rgba(255,255,255,0.72)",
    color: "#2F2A22",
    cursor: "pointer",
    fontSize: "15px",
  },

  question: {
    margin: "22px 0 12px",
    color: "#4D463B",
    fontWeight: "700",
  },

  choiceColumn: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
  },

  choiceButton: {
    border: "none",
    borderRadius: "16px",
    padding: "13px 14px",
    textAlign: "left",
    background: "rgba(255,255,255,0.75)",
    color: "#2F2A22",
    cursor: "pointer",
    fontSize: "14px",
  },

  choiceButtonActive: {
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
    background: "rgba(255,255,255,0.75)",
    cursor: "pointer",
  },

  scoreButtonActive: {
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
    background: "rgba(250,244,234,0.86)",
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
};
