"use client";

import { useState } from "react";

const nervousZones = [
  { id: "forehead", label: "Forehead / frontal tension", top: "21%", left: "30%", width: "34%", height: "12%" },
  { id: "temples", label: "Temples / side tension", top: "33%", left: "38%", width: "48%", height: "13%" },
  { id: "eyes", label: "Eyes / sensory overload", top: "43%", left: "24%", width: "38%", height: "13%" },
  { id: "jaw", label: "Jaw / clenching", top: "56%", left: "36%", width: "38%", height: "13%" },
  { id: "neck", label: "Neck / nervous tension", top: "72%", left: "42%", width: "34%", height: "13%" },
];

const nervousSignals = [
  "overwhelm",
  "racing thoughts",
  "panic feeling",
  "tension",
  "wired but tired",
  "shaky",
  "numb or detached",
  "hard to settle",
];

const contextOptions = [
  "just started",
  "comes and goes",
  "constant",
  "under stress",
  "after conflict",
  "after stimulation",
  "at night",
  "random",
  "getting worse",
  "improving",
];

const helpOptions = [
  "Breathing exercises",
  "Reduced stimulation",
  "Rested",
  "Walked outside",
  "Hydrated",
  "Sleep",
  "Nothing yet",
];

export default function NervousSystemView({
  selectedSignal,
  setSelectedSignal,
  context,
  setContext,
  intensity,
  setIntensity,
  whatHelped,
  setWhatHelped,
  saving,
  onBack,
  onSave,
}) {
  const [selectedZone, setSelectedZone] = useState("Temples / side tension");

  return (
    <div style={styles.card}>
      <div style={styles.leftPanel}>
        <button onClick={onBack} style={styles.backButton}>
          ← Back to body
        </button>

        <p style={styles.kicker}>Nervous system map</p>

        <h2 style={styles.title}>Head / nervous system</h2>

        <p style={styles.subtitle}>
          Tap the area that feels overloaded or tense.
        </p>

        <div style={styles.imageWrap}>
          <img
            src="/visuals/nervous-system-visual.png"
            alt="Nervous system visual"
            style={styles.image}
          />

          {nervousZones.map((zone) => (
            <button
              key={zone.id}
              onClick={() => {
                setSelectedZone(zone.label);
              }}
              style={{
                ...styles.zoneButton,
                top: zone.top,
                left: zone.left,
                width: zone.width,
                height: zone.height,
                ...(selectedZone === zone.label ? styles.zoneButtonActive : {}),
              }}
            >
              <span style={styles.zoneButtonLabel}>{zone.label}</span>
            </button>
          ))}

          <div style={styles.exploringPill}>
            Exploring: <strong>{selectedZone}</strong>
          </div>
        </div>
      </div>

      <div style={styles.rightPanel}>
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <span style={styles.stepBadge}>1</span>
            <h3 style={styles.sectionTitle}>What are you noticing?</h3>
          </div>

          <div style={styles.buttonGrid}>
            {nervousSignals.map((signal) => (
              <button
                key={signal}
                onClick={() => setSelectedSignal(signal)}
                style={{
                  ...styles.choiceButton,
                  ...(selectedSignal === signal ? styles.choiceButtonActive : {}),
                }}
              >
                {signal}
              </button>
            ))}
          </div>
        </div>

        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <span style={styles.stepBadge}>2</span>
            <h3 style={styles.sectionTitle}>When does this show up?</h3>
          </div>

          <div style={styles.contextGrid}>
            {contextOptions.map((item) => (
              <button
                key={item}
                onClick={() => setContext(item)}
                style={{
                  ...styles.choiceButton,
                  ...(context === item ? styles.choiceButtonActive : {}),
                }}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <span style={styles.stepBadge}>3</span>
            <h3 style={styles.sectionTitle}>How strong is it today?</h3>
          </div>

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
        </div>

        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <span style={styles.stepBadge}>4</span>
            <h3 style={styles.sectionTitle}>What helped, if anything?</h3>
          </div>

          <div style={styles.helpGrid}>
            {helpOptions.map((item) => (
              <button
                key={item}
                onClick={() => setWhatHelped(item)}
                style={{
                  ...styles.choiceButton,
                  ...(whatHelped === item ? styles.choiceButtonActive : {}),
                }}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={onSave}
          disabled={!selectedSignal || !context || saving}
          style={{
            ...styles.saveButton,
            opacity: !selectedSignal || !context || saving ? 0.55 : 1,
          }}
        >
          {saving ? "Saving..." : "Save & reflect"}
        </button>
      </div>
    </div>
  );
}

const styles = {
  card: {
    width: "100%",
    maxWidth: "92vw",
    maxHeight: "86vh",
    display: "grid",
    gridTemplateColumns: "1fr 1.18fr",
    overflow: "hidden",
    background: "rgba(250,244,234,0.96)",
    borderRadius: "38px",
    backdropFilter: "blur(24px)",
    boxShadow: "0 34px 110px rgba(0,0,0,0.28)",
    border: "1px solid rgba(255,255,255,0.65)",
  },

  leftPanel: {
    position: "relative",
    padding: "26px 30px 28px",
    background:
      "linear-gradient(180deg, rgba(252,246,236,0.98) 0%, rgba(234,222,204,0.95) 100%)",
    overflow: "hidden",
  },

  rightPanel: {
    background: "rgba(255,252,246,0.86)",
    overflowY: "auto",
    padding: "26px 30px 28px",
  },

  backButton: {
    border: "none",
    background: "rgba(255,255,255,0.78)",
    borderRadius: "999px",
    padding: "10px 18px",
    cursor: "pointer",
    fontSize: "15px",
    boxShadow: "0 10px 24px rgba(0,0,0,0.08)",
    marginBottom: "22px",
  },

  kicker: {
    margin: "0 0 8px",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.16em",
    color: "#33452B",
    fontWeight: "800",
  },

  title: {
    margin: "0",
    fontSize: "44px",
    lineHeight: "1.05",
    fontFamily: "Georgia, serif",
    color: "#24351F",
    fontWeight: "500",
  },

  subtitle: {
    margin: "14px 0 10px",
    color: "#4F473B",
    fontSize: "16px",
  },

  imageWrap: {
    position: "relative",
    height: "610px",
    marginTop: "6px",
    borderRadius: "28px",
    overflow: "hidden",
  },

  image: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: "center",
    display: "block",
  },

  zoneButton: {
    position: "absolute",
    border: "1px solid rgba(255,255,255,0.75)",
    background: "rgba(255,255,255,0.16)",
    borderRadius: "999px",
    cursor: "pointer",
    zIndex: 4,
    boxShadow: "0 0 22px rgba(255,220,120,0.18)",
  },

  zoneButtonActive: {
    background: "rgba(37,54,31,0.82)",
    boxShadow: "0 0 30px rgba(255,220,120,0.85)",
  },

  zoneButtonLabel: {
    position: "absolute",
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -50%)",
    color: "#FFFFFF",
    background: "rgba(37,54,31,0.86)",
    padding: "8px 12px",
    borderRadius: "999px",
    fontSize: "12px",
    whiteSpace: "nowrap",
  },

  exploringPill: {
    position: "absolute",
    left: "50%",
    bottom: "22px",
    transform: "translateX(-50%)",
    background: "#26381F",
    color: "#FFFFFF",
    borderRadius: "999px",
    padding: "14px 28px",
    fontSize: "17px",
    zIndex: 6,
    boxShadow: "0 14px 34px rgba(0,0,0,0.22)",
  },

  section: {
    padding: "0 0 22px",
    marginBottom: "22px",
    borderBottom: "1px solid rgba(60,50,38,0.13)",
  },

  sectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "16px",
  },

  stepBadge: {
    width: "34px",
    height: "34px",
    borderRadius: "50%",
    background: "#26381F",
    color: "#FFFFFF",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "800",
    fontSize: "15px",
  },

  sectionTitle: {
    margin: 0,
    fontFamily: "Georgia, serif",
    fontSize: "25px",
    color: "#2A261F",
    fontWeight: "500",
  },

  buttonGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
  },

  contextGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "10px",
  },

  helpGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "10px",
  },

  choiceButton: {
    border: "1px solid rgba(60,50,38,0.16)",
    borderRadius: "18px",
    padding: "14px 16px",
    background: "rgba(255,255,255,0.72)",
    color: "#2A261F",
    cursor: "pointer",
    fontSize: "15px",
    textAlign: "center",
  },

  choiceButtonActive: {
    background: "#26381F",
    color: "#FFFFFF",
    borderColor: "#26381F",
  },

  scoreRow: {
    display: "grid",
    gridTemplateColumns: "repeat(10, 1fr)",
    gap: "8px",
  },

  scoreButton: {
    height: "42px",
    borderRadius: "999px",
    border: "1px solid rgba(60,50,38,0.15)",
    background: "rgba(255,255,255,0.7)",
    cursor: "pointer",
    fontSize: "15px",
  },

  scoreButtonActive: {
    background: "#26381F",
    color: "#FFFFFF",
    borderColor: "#26381F",
  },

  saveButton: {
    width: "100%",
    border: "none",
    borderRadius: "999px",
    padding: "18px",
    background: "#26381F",
    color: "#FFFFFF",
    cursor: "pointer",
    fontSize: "18px",
    fontWeight: "700",
    boxShadow: "0 16px 36px rgba(0,0,0,0.16)",
  },
};
