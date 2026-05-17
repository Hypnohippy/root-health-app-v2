"use client";

import { useState } from "react";

const jointZones = [
  { id: "neck", label: "Neck", top: "8%", left: "42%", width: "16%", height: "10%" },
  { id: "shoulders", label: "Shoulders", top: "16%", left: "24%", width: "52%", height: "10%" },
  { id: "spine", label: "Spine", top: "22%", left: "44%", width: "12%", height: "26%" },
  { id: "hips", label: "Hips", top: "44%", left: "34%", width: "32%", height: "12%" },
  { id: "wrists", label: "Wrists & hands", top: "42%", left: "6%", width: "88%", height: "18%" },
  { id: "knees", label: "Knees", top: "66%", left: "36%", width: "28%", height: "12%" },
  { id: "ankles", label: "Ankles & feet", top: "84%", left: "34%", width: "32%", height: "10%" },
];

const jointSignals = [
  "aching",
  "stiffness",
  "sharp pain",
  "deep ache",
  "weakness",
  "cramps",
  "reduced movement",
  "swelling",
  "clicking/grinding",
];

const contextOptions = [
  "just started",
  "comes and goes",
  "constant",
  "after movement",
  "under stress",
  "after exercise",
  "at night",
  "random",
  "getting worse",
  "improving",
];

const helpOptions = [
  "Rested",
  "Reduced stress",
  "Moved gently",
  "Heat helped",
  "Cold helped",
  "Improved sleep",
  "Nothing yet",
];

export default function JointsView({
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
  const [selectedZone, setSelectedZone] = useState("Spine");

  return (
    <div style={styles.card}>
      <div style={styles.leftPanel}>
        <button onClick={onBack} style={styles.backButton}>
          ← Back to body
        </button>

        <p style={styles.kicker}>Movement map</p>

        <h2 style={styles.title}>Joints & muscles</h2>

        <p style={styles.subtitle}>
          Tap the body area where movement, stiffness, or pain is showing up.
        </p>

        <div style={styles.imageWrap}>
          <img
            src="/visuals/joints-muscles-system.png"
            alt="Joints and muscles"
            style={styles.image}
          />

          {jointZones.map((zone) => (
            <button
              key={zone.id}
              onClick={() => setSelectedZone(zone.label)}
              style={{
                ...styles.zoneButton,
                top: zone.top,
                left: zone.left,
                width: zone.width,
                height: zone.height,
                ...(selectedZone === zone.label
                  ? styles.zoneButtonActive
                  : {}),
              }}
            >
              <span style={styles.zoneButtonLabel}>
                {zone.label}
              </span>
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
            {jointSignals.map((signal) => (
              <button
                key={signal}
                onClick={() => setSelectedSignal(signal)}
                style={{
                  ...styles.choiceButton,
                  ...(selectedSignal === signal
                    ? styles.choiceButtonActive
                    : {}),
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
                  ...(context === item
                    ? styles.choiceButtonActive
                    : {}),
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
                  ...(intensity === score
                    ? styles.scoreButtonActive
                    : {}),
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
            <h3 style={styles.sectionTitle}>What helped?</h3>
          </div>

          <div style={styles.helpGrid}>
            {helpOptions.map((item) => (
              <button
                key={item}
                onClick={() => setWhatHelped(item)}
                style={{
                  ...styles.choiceButton,
                  ...(whatHelped === item
                    ? styles.choiceButtonActive
                    : {}),
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
      "linear-gradient(180deg, rgba(252,246,236,0.98) 0%, rgba(236,224,210,0.95) 100%)",
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
    color: "#8B6B4B",
    fontWeight: "800",
  },

  title: {
    margin: "0",
    fontSize: "44px",
    lineHeight: "1.05",
    fontFamily: "Georgia, serif",
    color: "#3C2F25",
    fontWeight: "500",
  },

  subtitle: {
    margin: "14px 0 10px",
    color: "#5C554B",
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
  },

  zoneButton: {
    position: "absolute",
    border: "1px solid rgba(255,255,255,0.75)",
    background: "rgba(255,255,255,0.16)",
    borderRadius: "20px",
    cursor: "pointer",
    zIndex: 4,
  },

  zoneButtonActive: {
    background: "rgba(170,120,70,0.72)",
  },

  zoneButtonLabel: {
    position: "absolute",
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -50%)",
    color: "#FFFFFF",
    background: "rgba(90,60,30,0.88)",
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
    background: "#6E4A28",
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
    background: "#6E4A28",
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
    gridTemplateColumns: "repeat(3,1fr)",
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
    background: "#6E4A28",
    color: "#FFFFFF",
    borderColor: "#6E4A28",
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
    background: "#6E4A28",
    color: "#FFFFFF",
  },

  saveButton: {
    width: "100%",
    border: "none",
    borderRadius: "999px",
    padding: "18px",
    background: "#6E4A28",
    color: "#FFFFFF",
    cursor: "pointer",
    fontSize: "18px",
    fontWeight: "700",
  },
};
