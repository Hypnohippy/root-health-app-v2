import { useState } from "react";

function getBodyRegion(x, y) {
  // x and y are percentages across the visible image.
  // These values are calibrated for the current glass-human.png image.

  // HEAD / FACE
  if (y >= 3 && y < 15 && x >= 38 && x <= 62) {
    return { id: "stress_nerves", label: "Stress & nerves" };
  }

  if (y >= 12 && y < 20 && x >= 35 && x <= 65) {
    return { id: "senses", label: "Senses" };
  }

  // ARMS / HANDS / SHOULDERS
  if (x < 32 || x > 68) {
    return { id: "muscles_joints", label: "Muscles & joints" };
  }

  // CHEST / LUNGS
  if (y >= 24 && y < 34 && x >= 34 && x <= 66) {
    return { id: "breathing", label: "Breathing" };
  }

  // HEART — slightly lower/central than lungs on this image
  if (y >= 31 && y < 41 && x >= 43 && x <= 58) {
    return { id: "heart_circulation", label: "Heart & circulation" };
  }

  // UPPER ABDOMEN / LIVER / STOMACH
  if (y >= 39 && y < 50 && x >= 34 && x <= 66) {
    return { id: "digestion", label: "Digestion" };
  }

  // LOWER DIGESTION / BOWEL
  if (y >= 50 && y < 61 && x >= 35 && x <= 65) {
    return { id: "digestion", label: "Digestion" };
  }

  // HORMONAL / PELVIS
  if (y >= 61 && y < 68 && x >= 38 && x <= 62) {
    return { id: "hormones_balance", label: "Hormones & balance" };
  }

  // BLADDER — lower centre, not knees
  if (y >= 66 && y < 73 && x >= 43 && x <= 57) {
    return { id: "bladder_hydration", label: "Bladder & hydration" };
  }

  // LEGS / KNEES / FEET
  if (y >= 68) {
    return { id: "muscles_joints", label: "Muscles & joints" };
  }

  // OUTER TORSO SKIN
  if ((x >= 32 && x < 38) || (x > 62 && x <= 68)) {
    return { id: "skin", label: "Skin" };
  }

  return { id: "energy_recovery", label: "Energy & recovery" };
}

export default function GlassBody({ selectedSystems = [], onSelect, onClear = () => {} }) {
  const [markers, setMarkers] = useState([]);

  const handleClick = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();

    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    const clampedX = Math.max(0, Math.min(100, x));
    const clampedY = Math.max(0, Math.min(100, y));

    const region = getBodyRegion(clampedX, clampedY);

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
