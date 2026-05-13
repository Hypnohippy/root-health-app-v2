"use client";

export default function DigestionView({
  selectedSignal,
  setSelectedSignal,
  onBack,
  onContinue,
}) {
  const digestionSignals = [
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
        <img
          src="/visuals/digestive-system.png"
          alt="Digestive system"
          style={styles.image}
        />
      </div>

      <div style={styles.content}>
        <p style={styles.kicker}>Signal exploration</p>

        <h2 style={styles.title}>Stomach / Gut</h2>

        <p style={styles.subtitle}>
          What are you noticing right now?
        </p>

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
