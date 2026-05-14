"use client";

import { useState } from "react";

const heartZones = [
  { id: "upper_chest", label: "Upper chest", top: "18%", left: "34%", width: "30%", height: "16%" },
  { id: "heart_centre", label: "Heart centre", top: "34%", left: "38%", width: "24%", height: "20%" },
  { id: "left_chest", label: "Left chest", top: "38%", left: "20%", width: "20%", height: "22%" },
  { id: "lower_chest", label: "Lower chest", top: "62%", left: "36%", width: "28%", height: "16%" },
  { id: "circulation", label: "Circulation", top: "72%", left: "26%", width: "48%", height: "14%" },
];

const heartSignals = [
  "racing heart",
  "fluttering",
  "tight chest",
  "pressure",
  "breathlessness",
  "cold hands/feet",
  "heavy feeling",
  "light-headed",
];

export default function HeartView({
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
        ← Close
      </button>

      <div style={styles.visualPanel}>
        <div style={styles.imageWrap}>
          <img
            src="/visuals/heart-circulation-system.png"
            alt="Heart and circulation"
            style={styles.image}
          />

          {heartZones.map((zone) => (
            <button
              key={zone.id}
              onClick={() => setSelectedZone(zone.label)}
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
            <div style={styles.zoneLabel}>
              {selectedZone}
            </div>
          )}
        </div>
      </div>

      <div style={styles.content}>
        <p style={styles.kicker}>Heart map</p>

        <h2 style={styles.title}>
          Heart & circulation
        </h2>

        {selectedZone && (
          <>
            <p style={styles.question}>What are you noticing?</p>

            <div style={styles.grid}>
              {heartSignals.map((signal) => (
                <button
                  key={signal}
                  onClick={() => setSelectedSignal(signal)}
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
            <p style={styles.question}>When does this happen?</p>

            <div style={styles.grid}>
              {[
                "under stress",
                "after movement",
                "at night",
                "random",
                "constant",
                "comes and goes",
              ].map((item) => (
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
            <p style={styles.question}>How strong is it?</p>

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
    background: "rgba(255,120,90,0.18)",
    boxShadow: "0 0 26px rgba(255,120,90,0.65)",
  },

  zoneLabel: {
    position: "absolute",
    left: "50%",
    bottom: "10px",
    transform: "translateX(-50%)",
    background: "rgba(20,20,20,0.7)",
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
    maxHeight: "340px",
    overflowY: "auto",
  },

  kicker: {
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    color: "#7A6F61",
    fontWeight: "700",
  },

  title: {
    fontSize: "26px",
    fontFamily: "Georgia, serif",
    color: "#2A261F",
    marginBottom: "10px",
  },

  question: {
    margin: "14px 0 8px",
    fontWeight: "700",
    color: "#4D463B",
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
    fontSize: "13px",
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
