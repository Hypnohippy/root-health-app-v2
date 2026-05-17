"use client";

import { useState } from "react";

const heartZones = [
  { id: "upper_chest", label: "Upper chest", top: "18%", left: "28%", width: "40%", height: "14%" },
  { id: "heart_centre", label: "Heart centre", top: "36%", left: "34%", width: "34%", height: "18%" },
  { id: "left_chest", label: "Left chest", top: "38%", left: "14%", width: "28%", height: "18%" },
  { id: "lower_chest", label: "Lower chest", top: "60%", left: "30%", width: "38%", height: "14%" },
  { id: "circulation", label: "Circulation", top: "76%", left: "24%", width: "52%", height: "13%" },
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

const contextOptions = [
  "just started",
  "comes and goes",
  "constant",
  "under stress",
  "after movement",
  "after caffeine",
  "at night",
  "random",
  "getting worse",
  "improving",
];

const helpOptions = [
  "Rested",
  "Reduced stress",
  "Slowed breathing",
  "Sat upright",
  "Drank water",
  "Avoided caffeine",
  "Nothing yet",
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
  const [selectedZone, setSelectedZone] = useState("Heart centre");

  return (
    <div style={styles.card}>
      <div style={styles.leftPanel}>
        <button onClick={onBack} style={styles.backButton}>
          ← Back to body
        </button>

        <p style={styles.kicker}>Heart map</p>

        <h2 style={styles.title}>Heart & circulation</h2>

        <p style={styles.subtitle}>
          Tap the area that feels active, tight, fluttery or heavy.
        </p>

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
                ...(selectedZone === zone.label ? styles.zoneButtonActive : {}),
              }}
            >
              <span style={styles.zoneButtonLabel}>{zone.label}</span>
            </button>
          ))}

          <div style={styles.exploringPill}>
            Exploring: <strong>{selectedZone}</strong>
          </div>
        </div>
      </div>

      <div style={styles.rightPanel}>
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <span style={styles.stepBadge}>1</span>
            <h3 style={styles.sectionTitle}>What are you noticing?</h3>
          </div>

          <div style={styles.buttonGrid}>
            {heartSignals.map((signal) => (
              <button
                key={signal}
                onClick={() => setSelectedSignal(signal)}
                style={{
                  ...styles.choiceButton,
                  ...(selectedSignal === signal ? styles.choiceButtonActive : {}),
                }}
              >
                {signal}
              </button>
            ))}
          </div>
        </div>

        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <span style={styles.stepBadge}>2</span>
            <h3 style={styles.sectionTitle}>When does this show up?</h3>
          </div>

          <div style={styles.contextGrid}>
            {contextOptions.map((item) => (
              <button
                key={item}
                onClick={() => setContext(item)}
                style={{
                  ...styles.choiceButton,
                  ...(context === item ? styles.choiceButtonActive : {}),
                }}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <span style={styles.stepBadge}>3</span>
            <h3 style={styles.sectionTitle}>How strong is it today?</h3>
          </div>

          <div style={styles.scoreRow}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
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
        </div>

        <div style={
