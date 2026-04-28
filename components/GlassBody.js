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

export default function GlassBody({ selectedSystems = [], onSelect, onClear = () => {} }) {
  const [markers, setMarkers] = useState([]);

  const handleClick = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();

    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    const clampedX = Math.max(5, Math.min(95, x));
    const clampedY = Math.max(3, Math.min(97, y));

    const nearest = getNearestPoint(clampedX, clampedY);

    setMarkers((prev) => [
      ...prev,
      {
        id: nearest.id,
        label: nearest.label,
        x: clampedX,
        y: clampedY,
      },
    ]);

    onSelect(nearest.id);
  };

  const clearMarkers = () => {
    setMarkers([]);
    onClear();
  };

  return (
    <div style={styles.wrap}>
      <div style={styles.instruction}>Tap each place your body is asking for attention</div>

      <div style={styles.bodyArea} onClick={handleClick}>
        <img src="/glass-human.png" alt="Glass Human" style={styles.image} />

        {markers.map((marker, index) => (
          <div key={`${marker.id}-${index}`}>
            <div
              style={{
                ...styles.glow,
                left: `${marker.x}%`,
                top: `${marker.y}%`,
              }}
            />
            <div
              style={{
                ...styles.marker,
                left: `${marker.x}%`,
                top: `${marker.y}%`,
              }}
            >
              {index + 1}
            </div>
          </div>
        ))}
      </div>

      {selectedSystems.length > 0 && (
        <>
          <div style={styles.selectedText}>
            Selected: <strong>{selectedSystems.join(", ")}</strong>
          </div>

          <button style={styles.clearButton} onClick={clearMarkers}>
            Clear selections
          </button>
        </>
      )}
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
    cursor: "pointer",
    userSelect: "none",
    touchAction: "manipulation",
  },
  image: {
    width: "100%",
    display: "block",
    filter: "drop-shadow(0 25px 40px rgba(0,0,0,0.25))",
    borderRadius: "18px",
  },
  marker: {
    position: "absolute",
    width: "22px",
    height: "22px",
    marginLeft: "-11px",
    marginTop: "-11px",
    borderRadius: "50%",
    background: "#C23B30",
    border: "2px solid white",
    boxShadow: "0 0 25px rgba(194,59,48,0.9)",
    zIndex: 3,
    pointerEvents: "none",
    color: "#fff",
    fontSize: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  glow: {
    position: "absolute",
    width: "90px",
    height: "90px",
    marginLeft: "-45px",
    marginTop: "-45px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(194,59,48,0.35), transparent 70%)",
    zIndex: 2,
    pointerEvents: "none",
  },
  selectedText: {
    marginTop: "10px",
    fontSize: "14px",
    color: "#333",
  },
  clearButton: {
    marginTop: "10px",
    border: "none",
    background: "#E6E2DA",
    padding: "8px 12px",
    borderRadius: "999px",
    cursor: "pointer",
  },
};
