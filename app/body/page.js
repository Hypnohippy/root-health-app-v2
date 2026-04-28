"use client";

import { useState } from "react";
import Nav from "../../components/Nav";
import GlassBody from "../../components/GlassBody";

const bodySystems = [
  { id: "stress_nerves", label: "Stress & nerves", signals: ["overwhelm", "racing thoughts", "panic feeling", "tension"] },
  { id: "heart_circulation", label: "Heart & circulation", signals: ["racing heart", "fluttering", "pressure"] },
  { id: "breathing", label: "Breathing", signals: ["tight chest", "shallow breathing", "breathlessness"] },
  { id: "digestion", label: "Digestion", signals: ["bloating", "cramps", "reflux"] },
  { id: "reproductive", label: "Pelvis & reproductive", signals: ["irritation", "discomfort", "burning"] },
  { id: "muscles_joints", label: "Muscles & joints", signals: ["aching", "stiffness", "pain"] },
];

const feelings = [
  "tight",
  "sharp",
  "dull",
  "burning",
  "itchy",
  "heavy",
  "numb",
  "hard to describe",
];

export default function BodyPage() {
  const [selectedSystem, setSelectedSystem] = useState(null);
  const [selectedSignal, setSelectedSignal] = useState("");
  const [feeling, setFeeling] = useState("");

  const current = bodySystems.find((b) => b.id === selectedSystem);

  return (
    <>
      <Nav />

      <main style={styles.page}>
        <section style={styles.shell}>
          <h1 style={styles.title}>Body Signals</h1>

          <GlassBody
            selectedSystems={[]}
            onSelect={(id) => {
              setSelectedSystem(id);
              setSelectedSignal("");
              setFeeling("");
            }}
            onClear={() => {
              setSelectedSystem(null);
              setSelectedSignal("");
              setFeeling("");
            }}
          />

          {current && (
            <div style={styles.panel}>
              <p style={styles.panelTitle}>{current.label}</p>

              <p style={styles.label}>What are you noticing?</p>
              <div style={styles.row}>
                {current.signals.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSelectedSignal(s)}
                    style={styles.btn}
                  >
                    {s}
                  </button>
                ))}
              </div>

              {selectedSignal && (
                <>
                  <p style={styles.label}>How does it feel?</p>
                  <div style={styles.row}>
                    {feelings.map((f) => (
                      <button
                        key={f}
                        onClick={() => setFeeling(f)}
                        style={styles.btn}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {feeling && (
                <p style={styles.result}>
                  You selected: {current.label} → {selectedSignal} → {feeling}
                </p>
              )}
            </div>
          )}
        </section>
      </main>
    </>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#F7F5F2",
    display: "flex",
    justifyContent: "center",
    padding: "24px",
  },
  shell: {
    maxWidth: "800px",
    width: "100%",
    textAlign: "center",
  },
  title: {
    fontSize: "28px",
    marginBottom: "20px",
  },
  panel: {
    marginTop: "20px",
    padding: "20px",
    background: "#fff",
    borderRadius: "12px",
  },
  panelTitle: {
    fontSize: "18px",
    marginBottom: "10px",
  },
  label: {
    marginTop: "15px",
  },
  row: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    justifyContent: "center",
    marginTop: "10px",
  },
  btn: {
    padding: "8px 12px",
    border: "none",
    borderRadius: "999px",
    background: "#eee",
    cursor: "pointer",
  },
  result: {
    marginTop: "20px",
    fontWeight: "bold",
  },
};
