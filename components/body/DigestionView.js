"use client";

import { useState } from "react";

export default function DigestionView({
  selectedSignal,
  setSelectedSignal,
  onBack,
  onContinue,
}) {
  const [selectedZone, setSelectedZone] = useState(null);

  const digestionSignals = [
    {
    id: "upper_abdomen",
    label: "Upper abdomen",
    top: "18%",
    left: "34%",
    width: "32%",
    height: "18%",
  },
  {
    id: "centre_gut",
    label: "Centre gut",
    top: "38%",
    left: "30%",
    width: "40%",
    height: "20%",
  },
  {
    id: "lower_bowel",
    label: "Lower bowel",
    top: "62%",
    left: "32%",
    width: "36%",
    height: "16%",
  },
  {
    id: "left_side",
    label: "Left side",
    top: "36%",
    left: "16%",
    width: "18%",
    height: "28%",
  },
  {
    id: "right_side",
    label: "Right side",
    top: "36%",
    left: "66%",
    width: "18%",
    height: "28%",
  },
];
    "Bloating",
    "Discomfort",
    "Nausea",
    "Changes in bowel habits",
    "Reflux",
    "Cramping",
    "Food sensitivity",
    "Other",
  ];

  return (
    <div style={styles.wrapper}>
      <button onClick={onBack} style={styles.backButton}>
        ← Back
      </button>

      <div style={styles.visualPanel}>
       <div style={styles.imageWrap}>
  <img
    src="/visuals/digestive-system.png"
    alt="Digestive system"
    style={styles.image}
  />

  <div style={styles.imageGlow} />

  {gutZones.map((zone) => (
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
    />
  ))}

  {selectedZone && (
    <div style={styles.zoneLabel}>
      {selectedZone}
    </div>
  )}
</div>

      <div style={styles.content}>
        <p style={styles.kicker}>Signal exploration</p>

        <h2 style={styles.title}>Stomach / Gut</h2>

       <p style={styles.subtitle}>
  {!selectedZone
    ? "Tap the digestive area that feels affected."
    : `Exploring: ${selectedZone}`}
</p>
        {selectedZone && (
  <div style={styles.grid}>
          {digestionSignals.map((signal) => (
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
            )}
        </div>

        {selectedSignal && (
          <button onClick={onContinue} style={styles.continueButton}>
            Continue
          </button>
        )}
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    width: "100%",
    maxWidth: "460px",
    margin: "0 auto",
  },
imageWrap: {
  position: "relative",
},

imageGlow: {
  position: "absolute",
  inset: 0,
  background:
    "radial-gradient(circle at center, rgba(255,210,140,0.28), transparent 60%)",
  pointerEvents: "none",
},
  backButton: {
    border: "none",
    background: "rgba(255,255,255,0.6)",
    borderRadius: "999px",
    padding: "10px 16px",
    marginBottom: "18px",
    cursor: "pointer",
    backdropFilter: "blur(10px)",
  },

  visualPanel: {
    position: "relative",
    overflow: "hidden",
    borderRadius: "34px",
    background:
      "linear-gradient(180deg, #F6EFE5 0%, #E7D5C2 100%)",
    padding: "28px",
    marginBottom: "20px",
    boxShadow: "0 24px 60px rgba(0,0,0,0.12)",
  },

 image: {
  width: "100%",
  display: "block",
  position: "relative",
  zIndex: 2,
  filter: "drop-shadow(0 30px 40px rgba(0,0,0,0.18))",
},

  content: {
    background: "rgba(255,255,255,0.72)",
    borderRadius: "28px",
    padding: "24px",
    backdropFilter: "blur(18px)",
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

  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
  },

  signalButton: {
    border: "none",
    borderRadius: "18px",
    padding: "16px",
    background: "rgba(255,255,255,0.86)",
    color: "#2A261F",
    cursor: "pointer",
    textAlign: "left",
    fontSize: "14px",
    boxShadow: "0 10px 24px rgba(0,0,0,0.06)",
  },

  signalButtonActive: {
    background: "#181818",
    color: "#FFFFFF",
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
  backdropFilter: "blur(10px)",
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
