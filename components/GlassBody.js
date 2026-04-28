import { useState } from "react";

const points = [
  { id: "stress_nerves", label: "Stress & nerves", x: 50, y: 8 },
  { id: "senses", label: "Senses", x: 50, y: 13 },
  { id: "breathing", label: "Breathing", x: 50, y: 27 },
  { id: "heart_circulation", label: "Heart & circulation", x: 52, y: 35 },
  { id: "digestion", label: "Digestion", x: 50, y: 48 },
  { id: "hormones_balance", label: "Hormones & balance", x: 50, y: 61 },
  { id: "bladder_hydration", label: "Bladder & hydration", x: 50, y: 69 },
  { id: "muscles_joints", label: "Muscles & joints", x: 30, y: 45 },
  { id: "skin", label: "Skin", x: 75, y: 42 },
  { id: "energy_recovery", label: "Energy & recovery", x: 50, y: 83 },
];

function getNearestPoint(x, y) {
  let nearest = points[0];
  let nearestDistance = Infinity;

  points.forEach((point) => {
    const dx = point.x - x;
    const dy = point.y - y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < nearestDistance) {
      nearest = point;
      nearestDistance = distance;
    }
  });

  return nearest;
}

export default function GlassBody({ selectedSystem, onSelect }) {
  const [marker, setMarker] = useState({ x: 50, y: 48 });
  const [selectedLabel, setSelectedLabel] = useState("Digestion");

  const handlePointer = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();

    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    const clampedX = Math.max(5, Math.min(95, x));
    const clampedY = Math.max(3, Math.min(97, y));

    const nearest = getNearestPoint(clampedX, clampedY);

    setMarker({ x: clampedX, y: clampedY });
    setSelectedLabel(nearest.label);
    onSelect(nearest.id);
  };

  return (
    <div style={styles.wrap}>
      <div style={styles.instruction}>
        Tap or drag the marker to where you feel it
      </div>

      <div
        style={styles.bodyArea}
        onPointerDown={handlePointer}
        onPointerMove={(event) => {
          if (event.buttons === 1) handlePointer(event);
        }}
      >
        <img src="/glass-human.png" alt="Glass Human" style={styles.image} />

        <div
          style={{
            ...styles.marker,
            left: `${marker.x}%`,
            top: `${marker.y}%`,
          }}
        />

        <div
          style={{
            ...styles.glow,
            left: `${marker.x}%`,
            top: `${marker.y}%`,
          }}
        />
      </div>

      <div style={styles.selectedText}>
        Selected: <strong>{selectedLabel}</strong>
      </div>
    </div>
  );
}

const styles = {
  wrap: {
    width: "320px",
    margin: "0 auto 30px",
    textAlign: "center",
  },
  instruction: {
    fontSize: "13px",
    color: "#666",
    marginBottom: "10px",
  },
  bodyArea: {
    position: "relative",
    width: "100%",
    cursor: "crosshair",
    userSelect: "none",
    touchAction: "none",
  },
  image: {
    width: "100%",
    display: "block",
    filter: "drop-shadow(0 25px 40px rgba(0,0,0,0.25))",
    borderRadius: "18px",
  },
  marker: {
    position: "absolute",
    width: "18px",
    height: "18px",
    marginLeft: "-9px",
    marginTop: "-9px",
    borderRadius: "50%",
    background: "#C23B30",
    border: "2px solid white",
    boxShadow: "0 0 18px rgba(194,59,48,0.8)",
    zIndex: 3,
    pointerEvents: "none",
  },
  glow: {
    position: "absolute",
    width: "70px",
    height: "70px",
    marginLeft: "-35px",
    marginTop: "-35px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(194,59,48,0.25), transparent 70%)",
    zIndex: 2,
    pointerEvents: "none",
  },
  selectedText: {
    marginTop: "10px",
    fontSize: "14px",
    color: "#333",
  },
};
