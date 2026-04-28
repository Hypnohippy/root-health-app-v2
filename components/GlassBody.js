import { useState } from "react";

function getBodyRegion(x, y) {

  // HEAD
  if (y < 12) return { id: "stress_nerves", label: "Stress & nerves" };

  // FACE
  if (y < 20) return { id: "senses", label: "Senses" };

  // CHEST TOP (lungs)
  if (y < 28) return { id: "breathing", label: "Breathing" };

  // HEART (very tight centre band)
  if (y >= 28 && y < 34 && x >= 45 && x <= 55) {
    return { id: "heart_circulation", label: "Heart & circulation" };
  }

  // CHEST REMAINDER (lungs again)
  if (y < 36) return { id: "breathing", label: "Breathing" };

  // UPPER ABDOMEN (liver / stomach)
  if (y < 48) return { id: "digestion", label: "Digestion" };

  // LOWER ABDOMEN
  if (y < 52) return { id: "digestion", label: "Digestion" };

  // REPRODUCTIVE (groin)
  if (y < 60 && x >= 38 && x <= 62) {
    return { id: "reproductive", label: "Pelvis & reproductive" };
  }

  // HIPS
  if (y < 62) {
    return { id: "muscles_joints", label: "Hips & joints" };
  }

  // BLADDER (tight centre)
  if (y < 66 && x >= 45 && x <= 55) {
    return { id: "bladder_hydration", label: "Bladder & hydration" };
  }

  // LEGS
  if (y >= 62) {
    return { id: "muscles_joints", label: "Muscles & joints" };
  }

  // OUTSIDE EDGE
  if (x < 35 || x > 65) {
    return { id: "skin", label: "Skin" };
  }

  return { id: "energy_recovery", label: "Energy & recovery" };
}

export default function GlassBody({ selectedSystems = [], onSelect, onClear = () => {} }) {
  const [markers, setMarkers] = useState([]);
  const [lastTap, setLastTap] = useState(null);

  const handleClick = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();

    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    const region = getBodyRegion(x, y);

    setLastTap({
      x: x.toFixed(1),
      y: y.toFixed(1),
      label: region.label,
    });

    setMarkers((prev) => [
      ...prev,
      { id: region.id, label: region.label, x, y },
    ]);

    onSelect(region.id);
  };

  const clearMarkers = () => {
    setMarkers([]);
    setLastTap(null);
    onClear();
  };

  return (
    <div style={styles.wrap}>
      <div style={styles.instruction}>
        Tap each place your body is asking for attention
      </div>

      <div style={styles.bodyArea} onClick={handleClick}>
        <img src="/glass-human.png" alt="Glass Human" style={styles.image} />

        {markers.map((marker, index) => (
          <div key={index}>
            <div style={{ ...styles.glow, left: `${marker.x}%`, top: `${marker.y}%` }} />
            <div style={{ ...styles.marker, left: `${marker.x}%`, top: `${marker.y}%` }}>
              {index + 1}
            </div>
          </div>
        ))}
      </div>

      {lastTap && (
        <div style={styles.debugText}>
          Last tap: x {lastTap.x}, y {lastTap.y} → {lastTap.label}
        </div>
      )}

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
  wrap: { width: "320px", margin: "0 auto 30px", textAlign: "center" },
  instruction: { fontSize: "13px", color: "#666", marginBottom: "10px" },
  bodyArea: { position: "relative", width: "100%", cursor: "pointer" },
  image: { width: "100%", display: "block" },
  marker: {
    position: "absolute",
    width: "22px",
    height: "22px",
    marginLeft: "-11px",
    marginTop: "-11px",
    borderRadius: "50%",
    background: "#C23B30",
    border: "2px solid white",
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
  },
  debugText: { marginTop: "8px", fontSize: "12px", color: "#777" },
  selectedText: { marginTop: "10px" },
  clearButton: {
    marginTop: "10px",
    border: "none",
    background: "#E6E2DA",
    padding: "8px 12px",
    borderRadius: "999px",
    cursor: "pointer",
  },
};
