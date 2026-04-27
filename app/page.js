"use client";

import { useState } from "react";

export default function Home() {
  const [response, setResponse] = useState("");
  const [selectedAreas, setSelectedAreas] = useState([]);

  const areas = ["Head", "Chest", "Gut", "Skin", "Energy"];

  const toggleArea = (area) => {
    setSelectedAreas((prev) =>
      prev.includes(area)
        ? prev.filter((a) => a !== area)
        : [...prev, area]
    );
  };

  const handleAnalyze = () => {
    if (selectedAreas.length === 0) return;

    setResponse(
      `You're noticing signals in: ${selectedAreas.join(
        ", "
      )}. These areas can sometimes be connected through stress, sleep, or lifestyle patterns. Would you like to explore what might be linking them or calm this now?`
    );
  };

  return (
    <main style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Root Health</h1>

        <p style={styles.subtitle}>
          Where is your body asking for attention?
        </p>

        {/* Body Area Buttons */}
        <div style={styles.areaContainer}>
          {areas.map((area) => (
            <button
              key={area}
              onClick={() => toggleArea(area)}
              style={{
                ...styles.areaButton,
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

        {/* Analyze Button */}
        <button style={styles.mainButton} onClick={handleAnalyze}>
          Explore
        </button>

        {/* Coach Response */}
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
    width: "420px",
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
  areaContainer: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    justifyContent: "center",
    marginBottom: "20px",
  },
  areaButton: {
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
    marginBottom: "20px",
  },
  response: {
    marginTop: "20px",
    color: "#333",
    lineHeight: "1.5",
  },
};
