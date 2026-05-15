"use client";

import { useState } from "react";

const lungZones = [
  { id: "upper_chest", label: "Upper chest", top: "24%", left: "18%", width: "28%", height: "18%" },
  { id: "airways", label: "Airways", top: "18%", left: "42%", width: "20%", height: "24%" },
  { id: "left_lung", label: "Left lung", top: "40%", left: "18%", width: "28%", height: "32%" },
  { id: "right_lung", label: "Right lung", top: "40%", left: "56%", width: "28%", height: "32%" },
  { id: "lower_lungs", label: "Lower lungs", top: "68%", left: "22%", width: "26%", height: "16%" },
  { id: "diaphragm", label: "Diaphragm", top: "72%", left: "52%", width: "32%", height: "16%" },
];

const lungSignals = [
  "shallow breathing",
  "tight chest",
  "breathlessness",
  "air hunger",
  "cough",
  "wheeze",
  "sighing",
  "chest heaviness",
];

export default function LungsView({
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
          <img
            src="/visuals/lungs-breathing-system.png"
            alt="Lungs and breathing"
            style={styles.image}
          />

          {lungZones.map((zone) => (
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
                ...(selectedZone === zone.label ? styles.zoneActive : {}),
              }}
            />
          ))}

          {selectedZone && (
            <div style={styles.zoneLabel}>{selectedZone}</div>
          )}
        </div>
      </div>

      <div style={styles.content}>
        <p style={styles.kicker}>Breathing map</p>
        <h2 style={styles.title}>Lungs & breathing</h2>

        {!selectedZone && (
          <p style={styles.subtitle}>Tap the breathing area that feels affected.</p>
        )}

        {selectedZone && (
          <>
            <p style={styles.subtitle}>Exploring: {selectedZone}</p>
            <p style={styles.question}>What are you noticing?</p>

            <div style={styles.grid}>
              {lungSignals.map((signal) => (
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
              {[
                "under stress",
                "after movement",
                "at night",
                "random",
                "constant",
                "comes and goes",
                "getting worse",
                "improving",
              ].map((item) => (
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

            <p style={styles.question}>What helped?</p>

            <div style={styles.grid}>
              {[
                "Slowed breathing",
                "Rested",
                "Sat upright",
                "Reduced stress",
                "Fresh air",
                "Nothing yet",
              ].map((item) => (
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
    width: "430px",
    background: "rgba(250,244,234,0.94)",
    borderRadius: "30px",
    padding: "14px",
    backdropFilter: "blur(22px)",
    boxShadow: "0 30px 90px rgba(0,0,0,0.24)",
  },

  backButton: {
    border: "none",
    background: "rgba(255,255,255,0.72)",
    borderRadius: "999px",
    padding: "8px 14px",
    marginBottom: "10px",
    cursor: "pointer",
  },

  visualPanel: {
    borderRadius: "24px",
    background: "linear-gradient(180deg, #F8EEE7 0%, #E8D0C2 100%)",
    padding: "12px",
  },

  imageWrap: {
    position: "relative",
  },

  image: {
    width: "100%",
    maxHeight: "210px",
    objectFit: "contain",
    display: "block",
    borderRadius: "20px",
  },

  zoneButton: {
    position: "absolute",
    border: "none",
    background: "transparent",
    borderRadius: "999px",
    cursor: "pointer",
  },

  zoneActive: {
    background: "rgba(255,190,90,0.2)",
    boxShadow: "0 0 26px rgba(255,190,90,0.7)",
  },

  zoneLabel: {
    position: "absolute",
    left: "50%",
    bottom: "8px",
    transform: "translateX(-50%)",
    background: "rgba(20,20,20,0.72)",
    color: "#FFF",
    borderRadius: "999px",
    padding: "8px 12px",
    fontSize: "12px",
  },

  content: {
    marginTop: "10px",
    background: "rgba(255,255,255,0.76)",
    borderRadius: "24px",
    padding: "16px",
    maxHeight: "270px",
    overflowY: "auto",
  },

  kicker: {
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    color: "#7A6F61",
    fontWeight: "700",
    margin: "0 0 5px",
  },

  title: {
    fontSize: "26px",
    fontFamily: "Georgia, serif",
    color: "#2A261F",
    margin: "0 0 6px",
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
    fontWeight: "700",
    color: "#4D463B",
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
    textAlign: "left",
    cursor: "pointer",
    fontSize: "12.5px",
  },

  signalButtonActive: {
    background: "#181818",
    color: "#FFFFFF",
  },

  scoreRow: {
    display: "grid",
    gridTemplateColumns: "repeat(5,1fr)",
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
    color: "#FFF",
  },

  continueButton: {
    width: "100%",
    marginTop: "14px",
    border: "none",
    borderRadius: "16px",
    padding: "13px",
    background: "#181818",
    color: "#FFF",
    cursor: "pointer",
  },
};
