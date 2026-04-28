import { useState } from "react";

function getBodyRegion(x, y) {
  /*
    x and y are direct percentages across the displayed image.
    This version is calibrated from the actual glass-human.png image.
  */

  // Brain / top of head
  if (y >= 3 && y < 10 && x >= 38 && x <= 62) {
    return { id: "stress_nerves", label: "Stress & nerves" };
  }

  // Face / eyes / senses
  if (y >= 10 && y < 19 && x >= 36 && x <= 64) {
    return { id: "senses", label: "Senses" };
  }

  // Neck
  if (y >= 19 && y < 24 && x >= 42 && x <= 58) {
    return { id: "breathing", label: "Breathing" };
  }

  // Arms / outer shoulders
  if ((x < 30 || x > 70) && y >= 20 && y < 76) {
    return { id: "muscles_joints", label: "Muscles & joints" };
  }

  // Heart — narrower and higher so liver does not become heart
  if (y >= 27 && y < 36 && x >= 43 && x <= 58) {
    return { id: "heart_circulation", label: "Heart & circulation" };
  }

  // Lungs / breathing — chest area around the heart
  if (y >= 24 && y < 38 && x >= 32 && x <= 68) {
    return { id: "breathing", label: "Breathing" };
  }

  // Liver / stomach / upper digestion
  if (y >= 36 && y < 50 && x >= 32 && x <= 68) {
    return { id: "digestion", label: "Digestion" };
  }

  // Bowels / lower digestion
  if (y >= 50 && y < 58 && x >= 34 && x <= 66) {
    return { id: "digestion", label: "Digestion" };
  }

  // Pelvis centre — bladder / hydration
  if (y >= 58 && y < 70 && x >= 42 && x <= 58) {
    return { id: "bladder_hydration", label: "Bladder & hydration" };
  }

  // Pelvis wider — hormones / balance
  if (y >= 58 && y < 70 && x >= 34 && x <= 66) {
    return { id: "hormones_balance", label: "Hormones & balance" };
  }

  // Thighs, knees, calves, feet
  if (y >= 58) {
    return { id: "muscles_joints", label: "Muscles & joints" };
  }

  // Outer torso / surface
  if ((x >= 30 && x < 34) || (x > 66 && x <= 70)) {
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

    const clampedX = Math.max(0, Math.min(100, x));
    const clampedY = Math.max(0, Math.min(100, y));

    const region = getBodyRegion(clampedX, clampedY);

    setLastTap({
      x: clampedX.toFixed(1),
      y: clampedY.toFixed(1),
      label: region.label,
    });

    setMarkers((prev) => [
      ...prev,
      {
        id: region.id,
        label: region.label,
        x: clampedX,
        y: clampedY,
      },
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
  debugText: {
    marginTop: "8px",
    fontSize: "12px",
    color: "#777",
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
