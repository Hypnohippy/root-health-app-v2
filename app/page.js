"use client";

import { useState } from "react";

export default function Home() {
  const [selectedAreas, setSelectedAreas] = useState([]);
  const [signal, setSignal] = useState("");
  const [depth, setDepth] = useState("");
  const [response, setResponse] = useState("");

  const areas = ["Head", "Chest", "Gut", "Skin", "Energy"];

  const signals = [
    "Tension",
    "Discomfort",
    "Pain",
    "Irritation",
    "Fatigue",
    "Other",
  ];

  const depths = ["Surface", "Tight / Tense", "Deep", "Hard to describe"];

  const toggleArea = (area) => {
    setSelectedAreas((prev) =>
      prev.includes(area)
        ? prev.filter((a) => a !== area)
        : [...prev, area]
    );
  };

 const generateResponse = () => {
  if (selectedAreas.length === 0) return;

  let areasText = selectedAreas.join(", ");

  let message = `You're noticing something in ${areasText}.`;

  // 🧠 CONNECTION LOGIC
  const has = (area) => selectedAreas.includes(area);

  if (has("Gut") && has("Head")) {
    message +=
      " There may be a connection between digestion and mental state — these can sometimes influence each other.";
  } else if (has("Chest") && has("Head")) {
    message +=
      " This combination can sometimes reflect stress or tension patterns in the body.";
  } else if (has("Skin") && has("Gut")) {
    message +=
      " Skin and digestion can sometimes be linked through inflammation or dietary patterns.";
  } else if (selectedAreas.length > 1) {
    message +=
      " These areas may be connected through broader lifestyle patterns like stress, sleep, or nutrition.";
  }

  // 🧠 SIGNAL INTERPRETATION
  if (signal) {
    message += ` You're describing it as ${signal.toLowerCase()}.`;

    if (signal === "Tension") {
      message +=
        " This can sometimes build with stress or lack of recovery.";
    }

    if (signal === "Fatigue") {
      message +=
        " Fatigue can often reflect sleep, nutrition, or overall load on the system.";
    }

    if (signal === "Irritation") {
      message +=
        " Irritation may reflect sensitivity, inflammation, or environmental factors.";
    }
  }

  // 🧠 DEPTH INTERPRETATION
  if (depth) {
    message += ` It feels more ${depth.toLowerCase()}.`;

    if (depth === "Tight / Tense") {
      message +=
        " This often points toward muscular or stress-related holding patterns.";
    }

    if (depth === "Surface") {
      message +=
        " Surface sensations often relate to skin or environmental interactions.";
    }

    if (depth === "Deep") {
      message +=
        " Deeper sensations may reflect internal or longer-standing patterns.";
    }
  }

  // 🌿 FINAL GUIDANCE
  message +=
    " Would you like to explore what may be influencing this, support it now, or track it over time?";

  setResponse(message);
};
  return (
    <main style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Root Health</h1>

        <p style={styles.subtitle}>
          Where is your body asking for attention?
        </p>

        {/* STEP 1 — AREAS */}
        <div style={styles.section}>
          <p style={styles.label}>Select area</p>
          <div style={styles.row}>
            {areas.map((area) => (
              <button
                key={area}
                onClick={() => toggleArea(area)}
                style={{
                  ...styles.button,
                  background: selectedAreas.includes(area)
                    ? "#1A1A1A"
                    : "#E6E2DA",
                  color: selectedAreas.includes(area)
                    ? "#fff"
                    : "#333",
                }}
              >
                {area}
              </button>
            ))}
          </div>
        </div>

        {/* STEP 2 — SIGNAL */}
        {selectedAreas.length > 0 && (
          <div style={styles.section}>
            <p style={styles.label}>What are you noticing?</p>
            <div style={styles.row}>
              {signals.map((s) => (
                <button
                  key={s}
                  onClick={() => setSignal(s)}
                  style={{
                    ...styles.button,
                    background: signal === s ? "#1A1A1A" : "#E6E2DA",
                    color: signal === s ? "#fff" : "#333",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 3 — DEPTH */}
        {signal && (
          <div style={styles.section}>
            <p style={styles.label}>How does it feel?</p>
            <div style={styles.row}>
              {depths.map((d) => (
                <button
                  key={d}
                  onClick={() => setDepth(d)}
                  style={{
                    ...styles.button,
                    background: depth === d ? "#1A1A1A" : "#E6E2DA",
                    color: depth === d ? "#fff" : "#333",
                  }}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ANALYZE */}
        {depth && (
          <button style={styles.mainButton} onClick={generateResponse}>
            Explore
          </button>
        )}

        {/* RESPONSE */}
        {response && <p style={styles.response}>{response}</p>}
      </div>
    </main>
  );
}

const styles = {
  container: {
    background: "#F7F5F2",
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    background: "#FFFFFF",
    padding: "40px",
    borderRadius: "16px",
    width: "450px",
    textAlign: "center",
    boxShadow: "0 10px 30px rgba(0,0,0,0.05)",
  },
  title: {
    fontSize: "28px",
    marginBottom: "10px",
  },
  subtitle: {
    color: "#555",
    marginBottom: "20px",
  },
  section: {
    marginBottom: "20px",
  },
  label: {
    marginBottom: "10px",
    fontSize: "14px",
    color: "#666",
  },
  row: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    justifyContent: "center",
  },
  button: {
    padding: "10px 14px",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    fontSize: "14px",
  },
  mainButton: {
    padding: "12px 20px",
    background: "#1A1A1A",
    color: "white",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    marginTop: "10px",
  },
  response: {
    marginTop: "20px",
    color: "#333",
    lineHeight: "1.5",
  },
};
