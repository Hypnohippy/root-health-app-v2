"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";
import Nav from "../../components/Nav";
import RootEnso from "../../components/RootEnso";

const questions = [
  ["stress_score", "Stress", "0 = calm, 10 = overwhelmed"],
  ["sleep_score", "Sleep", "0 = poor, 10 = excellent"],
  ["recovery_score", "Recovery", "0 = exhausted, 10 = recovered"],
  ["energy_score", "Energy", "0 = drained, 10 = energised"],
  ["mood_score", "Mood", "0 = very low, 10 = positive"],
  ["focus_score", "Focus", "0 = scattered, 10 = clear"],
  ["burnout_score", "Burnout", "0 = none, 10 = severe"],
];

export default function AssessmentPage() {
  const [scores, setScores] = useState({
    stress_score: 5,
    sleep_score: 5,
    recovery_score: 5,
    energy_score: 5,
    mood_score: 5,
    focus_score: 5,
    burnout_score: 5,
  });

  const [assessmentType, setAssessmentType] = useState("checkin");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const saveAssessment = async () => {
    if (saving) return;

    setSaving(true);
    setSaved(false);

    const { error } = await supabase.from("wellbeing_assessments").insert([
      {
        profile_key: "main",
        assessment_type: assessmentType,
        ...scores,
        notes: notes.trim(),
      },
    ]);

    if (error) {
      console.error("ASSESSMENT SAVE ERROR:", error);
      alert(error.message || "Something went wrong saving the assessment.");
    } else {
      setSaved(true);
      setNotes("");
      if (typeof window !== "undefined") {
  const params = new URLSearchParams(window.location.search);
  const fromOrientation = params.get("from") === "orientation";

  if (fromOrientation) {
    localStorage.setItem("root_orientation_complete_v1", "true");

    setTimeout(() => {
      window.location.href = "/body";
    }, 900);
  }
}
    }

    setSaving(false);
  };

  return (
    <main style={styles.page}>
      <Nav />

      <section style={styles.shell}>
        <div style={styles.header}>
          <RootEnso size={84} />

          <p style={styles.kicker}>Root Health</p>

          <h1 style={styles.title}>Wellbeing Assessment</h1>

          <p style={styles.subtitle}>
            A simple 0–10 check-in so Root can track where you started, where you are now,
            and what is changing over time.
          </p>
        </div>

        <section style={styles.card}>
          <label style={styles.label}>Assessment type</label>

          <select
            style={styles.select}
            value={assessmentType}
            onChange={(event) => setAssessmentType(event.target.value)}
          >
            <option value="baseline">Baseline / Start</option>
            <option value="checkin">Check-in</option>
            <option value="final">Final / Review</option>
          </select>

          <div style={styles.questionStack}>
            {questions.map(([key, label, help]) => (
              <div key={key} style={styles.question}>
                <div style={styles.questionTop}>
                  <div>
                    <p style={styles.questionLabel}>{label}</p>
                    <p style={styles.helpText}>{help}</p>
                  </div>

                  <div style={styles.scoreBubble}>{scores[key]}</div>
                </div>

                <input
                  type="range"
                  min="0"
                  max="10"
                  value={scores[key]}
                  onChange={(event) =>
                    setScores((current) => ({
                      ...current,
                      [key]: Number(event.target.value),
                    }))
                  }
                  style={styles.slider}
                />
              </div>
            ))}
          </div>

          <textarea
            style={styles.textarea}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Optional note: what feels most important today?"
          />

          <button
            style={{
              ...styles.saveButton,
              opacity: saving ? 0.7 : 1,
            }}
            onClick={saveAssessment}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Assessment"}
          </button>

          {saved && (
            <p style={styles.savedText}>
              Saved. Root can now use this as part of your progress picture.
            </p>
          )}
        </section>
      </section>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(135deg, #F4EBDD 0%, #E8DDCB 45%, #D8C7AA 100%)",
    padding: "110px 20px 50px",
    fontFamily: "Inter, sans-serif",
  },

  shell: {
    maxWidth: "860px",
    margin: "0 auto",
  },

  header: {
    textAlign: "center",
    marginBottom: "28px",
  },

  kicker: {
    margin: "14px 0 8px",
    fontSize: "12px",
    letterSpacing: "0.16em",
    textTransform: "uppercase",
    fontWeight: "800",
    color: "#6D6254",
  },

  title: {
    margin: "0 0 14px",
    fontFamily: "Georgia, serif",
    fontSize: "clamp(42px, 7vw, 72px)",
    lineHeight: "0.95",
    fontWeight: "500",
    color: "#1F241E",
    letterSpacing: "-0.05em",
  },

  subtitle: {
    maxWidth: "720px",
    margin: "0 auto",
    fontSize: "18px",
    lineHeight: "1.8",
    color: "#4B443A",
  },

  card: {
    padding: "28px",
    borderRadius: "32px",
    background: "rgba(255,255,255,0.38)",
    border: "1px solid rgba(255,255,255,0.48)",
    backdropFilter: "blur(16px)",
    boxShadow: "0 18px 48px rgba(20,18,15,0.08)",
  },

  label: {
    display: "block",
    marginBottom: "10px",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.14em",
    color: "#364131",
    fontWeight: "800",
  },

  select: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid rgba(36,50,36,0.16)",
    borderRadius: "20px",
    padding: "15px 16px",
    background: "rgba(255,255,255,0.72)",
    color: "#1F241E",
    fontSize: "15px",
    outline: "none",
    marginBottom: "22px",
  },

  questionStack: {
    display: "grid",
    gap: "18px",
  },

  question: {
    padding: "18px",
    borderRadius: "24px",
    background: "rgba(255,255,255,0.46)",
    border: "1px solid rgba(255,255,255,0.42)",
  },

  questionTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: "14px",
    alignItems: "center",
    marginBottom: "12px",
  },

  questionLabel: {
    margin: 0,
    fontSize: "20px",
    fontWeight: "800",
    color: "#1F241E",
  },

  helpText: {
    margin: "5px 0 0",
    color: "#6D6254",
    fontSize: "14px",
  },

  scoreBubble: {
    width: "44px",
    height: "44px",
    borderRadius: "50%",
    background: "#243224",
    color: "#FFFFFF",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "900",
    fontSize: "18px",
    flexShrink: 0,
  },

  slider: {
    width: "100%",
  },

  textarea: {
    width: "100%",
    boxSizing: "border-box",
    minHeight: "120px",
    border: "1px solid rgba(36,50,36,0.16)",
    borderRadius: "22px",
    padding: "16px",
    background: "rgba(255,255,255,0.72)",
    color: "#1F241E",
    fontSize: "15px",
    lineHeight: "1.7",
    resize: "vertical",
    outline: "none",
    marginTop: "22px",
  },

  saveButton: {
    marginTop: "18px",
    border: "none",
    borderRadius: "999px",
    padding: "15px 22px",
    background: "#243224",
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: "15px",
    cursor: "pointer",
  },

  savedText: {
    margin: "16px 0 0",
    color: "#364131",
    fontWeight: "800",
  },
};
