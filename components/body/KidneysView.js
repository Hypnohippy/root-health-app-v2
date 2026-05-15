"use client";

import { useState } from "react";

const kidneyZones = [
  { id: "kidneys", label: "Kidneys", top: "20%", left: "30%", width: "40%", height: "18%" },
  { id: "lower_back", label: "Lower back", top: "36%", left: "28%", width: "44%", height: "16%" },
  { id: "bladder", label: "Bladder", top: "56%", left: "36%", width: "28%", height: "14%" },
  { id: "hydration", label: "Hydration / fluid balance", top: "76%", left: "28%", width: "44%", height: "14%" },
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
  const [selectedZone, setSelectedZone] = useState(null);

  return (
    <div style={styles.overlayCard}>
      <button onClick={onBack} style={styles.backButton}>
        ← Back to body
      </button>

      <div style={styles.layout}>
        <div style={styles.visualPanel}>
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
                  ...(selectedZone === zone.label
                    ? styles.zoneButtonActive
                    : {}),
                }}
              />
            ))}

            {selectedZone && (
              <div style={styles.zoneLabel}>{selectedZone}</div>
            )}
          </div>
        </div>

        <div style={styles.content}>
          <p style={styles.kicker}>Fluid balance map</p>

          <h2 style={styles.title}>Kidneys & Bladder</h2>

          <p style={styles.subtitle}>
            {!selectedZone
              ? "Tap the kidney or bladder area that feels affected."
              : `Exploring: ${selectedZone}`}
          </p>

          {selectedZone && (
            <>
              <p style={styles.question}>What are you noticing?</p>

              <div style={styles.grid}>
                {kidneySignals.map((signal) => (
                  <button
                    key={signal}
                    onClick={() => {
                      setSelectedSignal(signal);
                      setContext("");
                      setWhatHelped("");
                    }}
                    style={{
                      ...styles.signalButton,
                      ...(selectedSignal === signal
                        ? styles.signalButtonActive
                        : {}),
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
                      ...(context === item
                        ? styles.signalButtonActive
                        : {}),
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

              <p style={styles.question}>What helped, if anything?</p>

              <div style={styles.grid}>
                {helpOptions.map((item) => (
                  <button
                    key={item}
                    onClick={() => setWhatHelped(item)}
                    style={{
                      ...styles.signalButton,
                      ...(whatHelped === item
                        ? styles.signalButtonActive
                        : {}),
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
    </div>
  );
}

const styles = {
  overlayCard: {
    width: "100%",
    maxWidth: "1040px",
    margin: "0 auto",
    background: "rgba(250,244,234,0.9)",
    borderRadius: "38px",
    padding: "24px",
    backdropFilter: "blur(22px)",
    boxShadow: "0 30px 90px rgba(0,0,0,0.22)",
  },

  layout: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "24px",
  },

  backButton: {
    border: "none",
    background: "rgba(255,255,255,0.72)",
    borderRadius: "999px",
    padding: "10px 16px",
    marginBottom: "18px",
    cursor: "pointer",
  },

  visualPanel: {
    borderRadius: "34px",
    background: "linear-gradient(180deg, #F6EFE5 0%, #E7D5C2 100%)",
    padding: "28px",
    boxShadow: "inset 0 0 80px rgba(255,255,255,0.4)",
  },

  imageWrap: {
    position: "relative",
  },

  image: {
    width: "100%",
    display: "block",
    position: "relative",
    zIndex: 2,
    filter: "drop-shadow(0 30px 40px rgba(0,0,0,0.18))",
  },

  imageGlow: {
    position: "absolute",
    inset: 0,
    background:
      "radial-gradient(circle at center, rgba(255,210,140,0.28), transparent 60%)",
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
    boxShadow: "0 0 30px rgba(255,210,120,0.7)",
  },

  zoneLabel: {
    position: "absolute",
    left: "50%",
    bottom: "12px",
    transform: "translateX(-50%)",
    background: "rgba(20,20,20,0.72)",
    color: "#FFFFFF",
    padding: "10px 16px",
    borderRadius: "999px",
    fontSize: "13px",
    zIndex: 5,
  },

  content: {
    background: "rgba(255,255,255,0.72)",
    borderRadius: "30px",
    padding: "26px",
    maxHeight: "62vh",
    overflowY: "auto",
    paddingBottom: "120px",
  },

  kicker: {
    margin: "0 0 8px",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    color: "#7A6F61",
    fontWeight: "700",
  },

  title: {
    margin: "0 0 10px",
    fontSize: "36px",
    fontFamily: "Georgia, serif",
    color: "#2A261F",
    fontWeight: "500",
  },

  subtitle: {
    margin: "0 0 18px",
    color: "#5C554B",
    lineHeight: "1.6",
  },

  question: {
    margin: "22px 0 12px",
    color: "#4D463B",
    fontWeight: "700",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
  },

  signalButton: {
    border: "none",
    borderRadius: "18px",
    padding: "14px",
    background: "rgba(255,255,255,0.86)",
    color: "#2A261F",
    cursor: "pointer",
    textAlign: "left",
    fontSize: "14px",
  },

  signalButtonActive: {
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
    background: "rgba(255,255,255,0.86)",
    cursor: "pointer",
  },

  scoreButtonActive: {
    background: "#C23B30",
    color: "#FFFFFF",
  },

  continueButton: {
    width: "100%",
    marginTop: "22px",
    border: "none",
    borderRadius: "20px",
    padding: "18px",
    background: "#181818",
    color: "#FFFFFF",
    cursor: "pointer",
    fontSize: "15px",
  },
};
