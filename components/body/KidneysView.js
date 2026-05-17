"use client";

import { useState } from "react";

const kidneyZones = [
  { id: "kidneys", label: "Kidneys", top: "20%", left: "30%", width: "40%", height: "18%" },
  { id: "lower_back", label: "Lower back", top: "38%", left: "26%", width: "48%", height: "16%" },
  { id: "bladder", label: "Bladder", top: "58%", left: "36%", width: "28%", height: "14%" },
  { id: "hydration", label: "Fluid balance", top: "76%", left: "24%", width: "52%", height: "14%" },
];

const kidneySignals = [
  "frequent urination",
  "burning",
  "dark urine",
  "fluid retention",
  "lower back discomfort",
  "thirst",
  "urgency",
  "reduced urination",
  "fatigue",
];

const contextOptions = [
  "just started",
  "comes and goes",
  "constant",
  "after dehydration",
  "under stress",
  "after exercise",
  "at night",
  "random",
  "getting worse",
  "improving",
];

const helpOptions = [
  "Drank more water",
  "Rested",
  "Reduced stress",
  "Electrolytes helped",
  "Improved sleep",
  "Ate differently",
  "Nothing yet",
];

export default function KidneysView({
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
  const [selectedZone, setSelectedZone] = useState("Kidneys");

  return (
    <div style={styles.card}>
      <div style={styles.leftPanel}>
        <button onClick={onBack} style={styles.backButton}>
          ← Back to body
        </button>

        <p style={styles.kicker}>Fluid balance map</p>

        <h2 style={styles.title}>Kidneys & bladder</h2>

        <p style={styles.subtitle}>
          Tap the area that feels strained, depleted or irritated.
        </p>

        <div style={styles.imageWrap}>
          <img
            src="/visuals/kidneys-bladder-system.png"
            alt="Kidneys and bladder"
            style={styles.image}
          />

          <div style={styles.imageGlow} />

          {kidneyZones.map((zone) => (
            <button
              key={zone.id}
              onClick={() => setSelectedZone(zone.label)}
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
            {kidneySignals.map((signal) => (
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
            {[1,2,3,4,5,6,7,8,9,10].map((score) => (
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
    maxHeight: "92vh",
    display: "grid",
    gridTemplateColumns: "1fr 1.18fr",
    overflowY: "auto",
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
      "linear-gradient(180deg, rgba(248,250,252,0.98) 0%, rgba(214,226,239,0.95) 100%)",
    overflow: "hidden",
  },

  rightPanel: {
    background: "rgba(255,252,246,0.86)",
    overflowY: "scroll",
    maxHeight: "86vh",
    padding: "26px 30px 28px",
  },

  backButton: {
    border: "none",
    background: "rgba(255,255,255,0.78)",
    borderRadius: "999px",
    padding: "10px 18px",
    cursor: "pointer",
    fontSize: "15px",
    marginBottom: "22px",
  },

  kicker: {
    margin: "0 0 8px",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.16em",
    color: "#44607A",
    fontWeight: "800",
  },

  title: {
    margin: "0",
    fontSize: "44px",
    lineHeight: "1.05",
    fontFamily: "Georgia, serif",
    color: "#203447",
    fontWeight: "500",
  },

  subtitle: {
    margin: "14px 0 10px",
    color: "#4F5B67",
    fontSize: "16px",
  },

  imageWrap: {
    position: "relative",
    height: "620px",
    marginTop: "6px",
    borderRadius: "28px",
    overflow: "hidden",
  },

  image: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    objectPosition: "center top",
    display: "block",
    position: "relative",
    zIndex: 2,
  },

  imageGlow: {
    position: "absolute",
    inset: 0,
    background:
      "radial-gradient(circle at center, rgba(120,190,255,0.22), transparent 62%)",
    pointerEvents: "none",
    zIndex: 1,
  },

  zoneButton: {
    position: "absolute",
    border: "1px solid rgba(255,255,255,0.75)",
    background: "rgba(255,255,255,0.16)",
    borderRadius: "999px",
    cursor: "pointer",
    zIndex: 4,
  },

  zoneButtonActive: {
    background: "rgba(50,120,190,0.78)",
  },

  zoneButtonLabel: {
    position: "absolute",
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -50%)",
    color: "#FFFFFF",
    background: "rgba(40,90,150,0.9)",
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
    background: "#2F5E88",
    color: "#FFFFFF",
    borderRadius: "999px",
    padding: "14px 28px",
    fontSize: "17px",
    zIndex: 6,
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
    background: "#2F5E88",
    color: "#FFFFFF",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "800",
  },

  sectionTitle: {
    margin: 0,
    fontFamily: "Georgia, serif",
    fontSize: "25px",
    color: "#2A261F",
  },

  buttonGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
  },

  contextGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4,1fr)",
    gap: "10px",
  },

  helpGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3,1fr)",
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
    background: "#2F5E88",
    color: "#FFFFFF",
    borderColor: "#2F5E88",
  },

  scoreRow: {
    display: "grid",
    gridTemplateColumns: "repeat(10,1fr)",
    gap: "8px",
  },

  scoreButton: {
    height: "42px",
    borderRadius: "999px",
    border: "1px solid rgba(60,50,38,0.15)",
    background: "rgba(255,255,255,0.7)",
    cursor: "pointer",
  },

  scoreButtonActive: {
    background: "#2F5E88",
    color: "#FFFFFF",
  },

  saveButton: {
    width: "100%",
    border: "none",
    borderRadius: "999px",
    padding: "18px",
    background: "#2F5E88",
    color: "#FFFFFF",
    cursor: "pointer",
    fontSize: "18px",
    fontWeight: "700",
  },
};
