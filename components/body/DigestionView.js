"use client";

import { useState } from "react";

const gutZones = [
  { id: "upper_abdomen", label: "Upper abdomen", top: "18%", left: "34%", width: "32%", height: "18%" },
  { id: "centre_gut", label: "Centre gut", top: "38%", left: "30%", width: "40%", height: "20%" },
  { id: "lower_bowel", label: "Lower bowel", top: "62%", left: "32%", width: "36%", height: "16%" },
  { id: "left_side", label: "Left side", top: "36%", left: "16%", width: "18%", height: "28%" },
  { id: "right_side", label: "Right side", top: "36%", left: "66%", width: "18%", height: "28%" },
];

const digestionSignals = ["bloating", "reflux", "cramps", "constipation", "loose bowels", "nausea", "appetite change", "wind/gas", "food sensitivity"];

const contextOptions = ["just started", "comes and goes", "constant", "after eating", "under stress", "at night", "getting worse", "improving"];

const helpOptions = ["Drank more water", "Ate differently", "Rested", "Reduced stress", "Moved/exercised", "Improved sleep", "Nothing yet"];

export default function DigestionView({
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
  const [selectedZone, setSelectedZone] = useState(null);

  return (
    <div style={styles.overlayCard}>
      <button onClick={onBack} style={styles.backButton}>← Close</button>

      <div style={styles.visualPanel}>
        <div style={styles.imageWrap}>
          <img src="/visuals/digestive-system.png" alt="Digestive system" style={styles.image} />
          <div style={styles.imageGlow} />

          {gutZones.map((zone) => (
            <button
              key={zone.id}
              onClick={() => {
                setSelectedZone(zone.label);
                setSelectedSignal("");
                setContext("");
                setWhatHelped("");
              }}
              style={{
                ...styles.zoneButton,
                top: zone.top,
                left: zone.left,
                width: zone.width,
                height: zone.height,
                ...(selectedZone === zone.label ? styles.zoneButtonActive : {}),
              }}
            />
          ))}

          {selectedZone && <div style={styles.zoneLabel}>{selectedZone}</div>}
        </div>
      </div>

      <div style={styles.content}>
        <p style={styles.kicker}>Digestive map</p>
        <h2 style={styles.title}>Stomach / Gut</h2>

        <p style={styles.subtitle}>
          {!selectedZone ? "Tap the area that feels affected." : `Exploring: ${selectedZone}`}
        </p>

        {selectedZone && (
          <>
            <p style={styles.question}>What are you noticing?</p>
            <div style={styles.grid}>
              {digestionSignals.map((signal) => (
                <button
                  key={signal}
                  onClick={() => {
                    setSelectedSignal(signal);
                    setContext("");
                    setWhatHelped("");
                  }}
                  style={{
                    ...styles.signalButton,
                    ...(selectedSignal === signal ? styles.signalButtonActive : {}),
                  }}
                >
                  {signal}
                </button>
              ))}
            </div>
          </>
        )}

        {selectedSignal && (
          <>
            <p style={styles.question}>When does this show up?</p>
            <div style={styles.grid}>
              {contextOptions.map((item) => (
                <button
                  key={item}
                  onClick={() => setContext(item)}
                  style={{
                    ...styles.signalButton,
                    ...(context === item ? styles.signalButtonActive : {}),
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
            <p style={styles.question}>How strong is it?</p>
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

            <p style={styles.question}>What helped?</p>
            <div style={styles.grid}>
              {helpOptions.map((item) => (
                <button
                  key={item}
                  onClick={() => setWhatHelped(item)}
                  style={{
                    ...styles.signalButton,
                    ...(whatHelped === item ? styles.signalButtonActive : {}),
                  }}
                >
                  {item}
                </button>
              ))}
            </div>

            <button onClick={onSave} style={styles.continueButton}>
              {saving ? "Saving..." : "Save & reflect"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  overlayCard: {
    width: "420px",
    background: "rgba(250,244,234,0.92)",
    borderRadius: "30px",
    padding: "14px",
    backdropFilter: "blur(22px)",
    boxShadow: "0 30px 90px rgba(0,0,0,0.22)",
  },

  backButton: {
    border: "none",
    background: "rgba(255,255,255,0.72)",
    borderRadius: "999px",
    padding: "8px 13px",
    marginBottom: "10px",
    cursor: "pointer",
  },

  visualPanel: {
    borderRadius: "24px",
    background: "linear-gradient(180deg, #F6EFE5 0%, #E7D5C2 100%)",
    padding: "12px",
    boxShadow: "inset 0 0 60px rgba(255,255,255,0.4)",
  },

  imageWrap: {
    position: "relative",
  },

  image: {
    width: "100%",
    maxHeight: "210px",
    objectFit: "contain",
    display: "block",
    position: "relative",
    zIndex: 2,
    filter: "drop-shadow(0 20px 28px rgba(0,0,0,0.16))",
  },

  imageGlow: {
    position: "absolute",
    inset: 0,
    background: "radial-gradient(circle at center, rgba(255,210,140,0.24), transparent 60%)",
    pointerEvents: "none",
    zIndex: 3,
  },

  zoneButton: {
    position: "absolute",
    border: "none",
    background: "transparent",
    borderRadius: "999px",
    cursor: "pointer",
    zIndex: 4,
  },

  zoneButtonActive: {
    background: "rgba(255,210,120,0.24)",
    boxShadow: "0 0 26px rgba(255,210,120,0.72)",
  },

  zoneLabel: {
    position: "absolute",
    left: "50%",
    bottom: "8px",
    transform: "translateX(-50%)",
    background: "rgba(20,20,20,0.72)",
    color: "#FFFFFF",
    padding: "8px 12px",
    borderRadius: "999px",
    fontSize: "12px",
    zIndex: 5,
  },

  content: {
    marginTop: "10px",
    background: "rgba(255,255,255,0.72)",
    borderRadius: "24px",
    padding: "16px",
    maxHeight: "270px",
    overflowY: "auto",
    paddingBottom: "80px",
  },

  kicker: {
    margin: "0 0 5px",
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    color: "#7A6F61",
    fontWeight: "700",
  },

  title: {
    margin: "0 0 6px",
    fontSize: "26px",
    fontFamily: "Georgia, serif",
    color: "#2A261F",
    fontWeight: "500",
  },

  subtitle: {
    margin: "0 0 12px",
    color: "#5C554B",
    lineHeight: "1.5",
    fontSize: "14px",
  },

  question: {
    margin: "14px 0 8px",
    color: "#4D463B",
    fontWeight: "700",
    fontSize: "14px",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "8px",
  },

  signalButton: {
    border: "none",
    borderRadius: "14px",
    padding: "10px",
    background: "rgba(255,255,255,0.86)",
    color: "#2A261F",
    cursor: "pointer",
    textAlign: "left",
    fontSize: "12.5px",
  },

  signalButtonActive: {
    background: "#181818",
    color: "#FFFFFF",
  },

  scoreRow: {
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    gap: "6px",
  },

  scoreButton: {
    height: "32px",
    borderRadius: "999px",
    border: "none",
    background: "rgba(255,255,255,0.86)",
    cursor: "pointer",
    fontSize: "12px",
  },

  scoreButtonActive: {
    background: "#C23B30",
    color: "#FFFFFF",
  },

  continueButton: {
    width: "100%",
    marginTop: "14px",
    border: "none",
    borderRadius: "16px",
    padding: "13px",
    background: "#181818",
    color: "#FFFFFF",
    cursor: "pointer",
    fontSize: "14px",
  },
};
