"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";
import GlassBody from "../components/GlassBody";

const bodySystems = [
  {
    id: "stress_nerves",
    label: "Stress & nerves",
    system: "nervous/autonomic",
    signals: ["overwhelm", "racing thoughts", "panic feeling", "tension"],
  },
  {
    id: "heart_circulation",
    label: "Heart & circulation",
    system: "circulatory",
    signals: ["racing heart", "fluttering", "pressure"],
  },
  {
    id: "breathing",
    label: "Breathing",
    system: "respiratory",
    signals: ["tight chest", "shallow breathing", "breathlessness"],
  },
  {
    id: "digestion",
    label: "Digestion",
    system: "digestive",
    signals: ["bloating", "cramps", "reflux"],
  },
  {
    id: "reproductive",
    label: "Pelvis & reproductive",
    system: "reproductive",
    signals: ["irritation", "burning", "discomfort"],
  },
  {
    id: "muscles_joints",
    label: "Muscles & joints",
    system: "musculoskeletal",
    signals: ["stiffness", "pain", "tightness"],
  },
  {
    id: "skin",
    label: "Skin",
    system: "skin",
    signals: ["rash", "itching", "redness"],
  },
];

const systemFeelings = {
  heart_circulation: ["pressure", "tight", "fluttering", "pounding", "heavy"],
  breathing: ["tight", "restricted", "shallow", "heavy"],
  stress_nerves: ["overwhelmed", "tense", "wired", "restless"],
  digestion: ["bloated", "cramping", "heavy", "uncomfortable"],
  reproductive: ["irritated", "sensitive", "burning", "uncomfortable"],
  muscles_joints: ["tight", "stiff", "aching", "sharp"],
  skin: ["itchy", "burning", "irritated", "visible change"],
};

export default function Home() {
  const [selectedSystems, setSelectedSystems] = useState([]);
  const [activeSystemId, setActiveSystemId] = useState(null);
  const [selectedSignal, setSelectedSignal] = useState("");
  const [feeling, setFeeling] = useState("");
  const [response, setResponse] = useState("");

  const current = bodySystems.find((s) => s.id === activeSystemId);

  const selectSystem = (id) => {
    setSelectedSystems((prev) =>
      prev.includes(id) ? prev : [...prev, id]
    );
    setActiveSystemId(id);
    setSelectedSignal("");
    setFeeling("");
    setResponse("");
  };

  const clearSelections = () => {
    setSelectedSystems([]);
    setActiveSystemId(null);
    setSelectedSignal("");
    setFeeling("");
    setResponse("");
  };

  return (
    <main style={styles.page}>
      <h1>Root Health</h1>

      <GlassBody
        selectedSystems={selectedSystems}
        onSelect={selectSystem}
        onClear={clearSelections}
      />

      {current && (
        <div style={styles.panel}>
          <h3>{current.label}</h3>

          <p>What are you noticing?</p>
          <div>
            {current.signals.map((sig) => (
              <button
                key={sig}
                onClick={() => setSelectedSignal(sig)}
                style={styles.button}
              >
                {sig}
              </button>
            ))}
          </div>

          {selectedSignal && (
            <>
              <p>How does it feel?</p>
              <div>
                {(systemFeelings[current.id] || []).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFeeling(f)}
                    style={styles.button}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </>
          )}

          {feeling && (
            <p style={{ marginTop: 20 }}>
              You’re noticing <b>{selectedSignal}</b> and it feels{" "}
              <b>{feeling}</b>.
            </p>
          )}
        </div>
      )}
    </main>
  );
}

const styles = {
  page: {
    padding: 20,
    textAlign: "center",
  },
  panel: {
    marginTop: 20,
    padding: 20,
    background: "#fff",
    borderRadius: 12,
  },
  button: {
    margin: 6,
    padding: "8px 12px",
    borderRadius: 8,
    border: "none",
    background: "#eee",
    cursor: "pointer",
  },
};
