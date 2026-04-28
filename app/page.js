"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";
import GlassBody from "../components/GlassBody";

const bodySystems = [
  {
    id: "stress_nerves",
    label: "Stress & nerves",
    system: "nervous/autonomic",
    signals: [
      "overwhelm",
      "racing thoughts",
      "panic feeling",
      "tension",
      "wired but tired",
      "shaky",
      "numb or detached",
      "hard to settle",
    ],
  },
  {
    id: "heart_circulation",
    label: "Heart & circulation",
    system: "circulatory",
    signals: [
      "racing heart",
      "fluttering",
      "pressure",
      "cold hands/feet",
      "light-headed",
      "low stamina",
      "swelling",
      "colour change",
    ],
  },
  {
    id: "breathing",
    label: "Breathing",
    system: "respiratory",
    signals: [
      "shallow breathing",
      "tight chest",
      "breathlessness",
      "air hunger",
      "cough",
      "wheeze",
      "sighing",
      "chest heaviness",
    ],
  },
  {
    id: "digestion",
    label: "Digestion",
    system: "digestive",
    signals: [
      "bloating",
      "reflux",
      "cramps",
      "constipation",
      "loose bowels",
      "nausea",
      "appetite change",
      "wind/gas",
      "food sensitivity",
    ],
  },
  {
    id: "reproductive",
    label: "Pelvis & reproductive",
    system: "reproductive/pelvic",
    signals: [
      "pelvic discomfort",
      "groin discomfort",
      "genital irritation",
      "burning",
      "itching",
      "discharge/change",
      "swelling",
      "rash or blistering",
      "cycle-related change",
      "sexual discomfort",
    ],
  },
  {
    id: "hormones_balance",
    label: "Hormones & balance",
    system: "endocrine",
    signals: [
      "cravings",
      "energy dips",
      "mood swings",
      "temperature changes",
      "sweats",
      "cycle changes",
      "skin changes",
      "sleep disruption",
      "weight change",
    ],
  },
  {
    id: "bladder_hydration",
    label: "Bladder & hydration",
    system: "urinary/excretory",
    signals: [
      "thirst",
      "frequent urination",
      "burning when passing urine",
      "dark urine",
      "fluid retention",
      "lower back discomfort",
      "urgency",
      "reduced urination",
    ],
  },
  {
    id: "muscles_joints",
    label: "Muscles & joints",
    system: "musculoskeletal",
    signals: [
      "aching",
      "stiffness",
      "sharp pain",
      "deep ache",
      "weakness",
      "cramps",
      "reduced movement",
      "swelling",
      "clicking/grinding",
    ],
  },
  {
    id: "skin",
    label: "Skin",
    system: "skin/barrier",
    signals: [
      "rash",
      "blistering",
      "redness",
      "itching",
      "dryness",
      "spots",
      "sensitivity",
      "swelling",
      "colour change",
      "visible change but no feeling",
      "slow healing",
    ],
  },
  {
    id: "senses",
    label: "Senses",
    system: "sensory",
    signals: [
      "eye strain",
      "blurred vision",
      "light sensitivity",
      "noise sensitivity",
      "dizziness",
      "tingling",
      "numbness",
      "ringing ears",
      "altered smell/taste",
    ],
  },
  {
    id: "energy_recovery",
    label: "Energy & recovery",
    system: "whole-body recovery",
    signals: [
      "fatigue",
      "burnout feeling",
      "heavy body",
      "low motivation",
      "poor recovery",
      "weakness",
      "brain fog",
      "flu-like feeling",
      "generally depleted",
    ],
  },
  {
    id: "sleep_rhythm",
    label: "Sleep rhythm",
    system: "circadian/sleep",
    signals: [
      "poor sleep",
      "waking often",
      "early waking",
      "tired on waking",
      "sleepy daytime",
      "wired at night",
      "restless sleep",
      "night sweats",
    ],
  },
  {
    id: "whole_body",
    label: "Whole body",
    system: "multi-system",
    signals: [
      "generally off",
      "run down",
      "inflamed feeling",
      "unsettled",
      "heavy",
      "shaky",
      "hard to describe",
      "visible change",
      "recurring pattern",
    ],
  },
];

const systemFeelings = {
  heart_circulation: ["pressure", "tight", "fluttering", "pounding", "heavy", "irregular"],
  breathing: ["tight", "restricted", "shallow", "heavy", "effortful"],
  stress_nerves: ["overwhelmed", "tense", "wired", "restless", "on edge"],
  digestion: ["bloated", "cramping", "heavy", "uncomfortable", "sensitive"],
  reproductive: ["irritated", "sensitive", "burning", "uncomfortable", "visible change"],
  bladder_hydration: ["burning", "urgent", "pressure", "uncomfortable"],
  muscles_joints: ["tight", "stiff", "aching", "sharp", "restricted"],
  skin: ["itchy", "burning", "irritated", "sensitive", "visible change"],
  senses: ["strained", "sensitive", "dizzy", "tingling"],
  energy_recovery: ["drained", "heavy", "flat", "low"],
  sleep_rhythm: ["restless", "broken", "light", "unrefreshing"],
};

const feelings = [
  "Surface",
  "Tight / tense",
  "Deep",
  "Burning",
  "Itchy",
  "Sharp",
  "Dull ache",
  "Throbbing",
  "Numb",
  "Moving around",
  "Visible but not painful",
  "Hard to describe",
];

export default function Home() {
  const [selectedSystems, setSelectedSystems] = useState([]);
  const [activeSystemId, setActiveSystemId] = useState(null);
  const [selectedSignal, setSelectedSignal] = useState("");
  const [feeling, setFeeling] = useState("");

  const current = bodySystems.find((item) => item.id === activeSystemId);

  const selectSystem = (id) => {
    setSelectedSystems((prev) =>
      prev.includes(id) ? prev : [...prev, id]
    );
    setActiveSystemId(id);
    setSelectedSignal("");
    setFeeling("");
  };

  return (
    <main style={{ padding: 20 }}>
      <h1>Root Health</h1>

      <GlassBody onSelect={selectSystem} />

      {current && (
        <>
          <h3>{current.label}</h3>

          {current.signals.map((sig) => (
            <button key={sig} onClick={() => setSelectedSignal(sig)}>
              {sig}
            </button>
          ))}

          {selectedSignal &&
            (systemFeelings[current.id] || feelings).map((f) => (
              <button key={f} onClick={() => setFeeling(f)}>
                {f}
              </button>
            ))}
        </>
      )}
    </main>
  );
}
