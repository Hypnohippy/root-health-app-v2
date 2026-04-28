import { useState } from "react";

function getBodyRegion(rawX, rawY) {
  /*
    The image includes black space around the figure.
    These values map the visible human body inside the image.
  */
  const bodyLeft = 22;
  const bodyRight = 78;
  const bodyTop = 2;
  const bodyBottom = 97;

  const x = ((rawX - bodyLeft) / (bodyRight - bodyLeft)) * 100;
  const y = ((rawY - bodyTop) / (bodyBottom - bodyTop)) * 100;

  // Outside the main body silhouette = skin / outer body awareness
  if (x < 0 || x > 100 || y < 0 || y > 100) {
    return { id: "skin", label: "Skin" };
  }

  // Brain / head
  if (y >= 0 && y < 10) {
    return { id: "stress_nerves", label: "Stress & nerves" };
  }

  // Face / senses
  if (y >= 10 && y < 18) {
    return { id: "senses", label: "Senses" };
  }

  // Neck / upper chest
  if (y >= 18 && y < 24) {
    return { id: "breathing", label: "Breathing" };
  }

  // Heart region first — central chest, slightly user-left/centre
  if (y >= 24 && y < 36 && x >= 38 && x <= 62) {
    return { id: "heart_circulation", label: "Heart & circulation" };
  }

  // Lung fields — wider upper chest
  if (y >= 22 && y < 40 && x >= 18 && x <= 82) {
    return { id: "breathing", label: "Breathing" };
  }

  // Shoulders / arms
  if ((x < 18 || x > 82) && y >= 18 && y < 62) {
    return { id: "muscles_joints", label: "Muscles & joints" };
  }

  // Liver / stomach / upper digestive organs
  if (y >= 36 && y < 50 && x >= 25 && x <= 75) {
    return { id: "digestion", label: "Digestion" };
  }

  // Intestines / lower digestive organs
  if (y >= 50 && y < 64 && x >= 25 && x <= 75) {
    return { id: "digestion", label: "Digestion" };
  }

  // Hormonal / pelvic balance
  if (y >= 64 && y < 72 && x >= 30 && x <= 70) {
    return { id: "hormones_balance", label: "Hormones & balance" };
  }

  // Bladder / hydration — lower central pelvis only
  if (y >= 72 && y < 80 && x >= 38 && x <= 62) {
    return { id: "bladder_hydration", label: "Bladder & hydration" };
  }

  // Legs, knees, feet
  if (y >= 72) {
    return { id: "muscles_joints", label: "Muscles & joints" };
  }

  // Outer torso
  if (x < 25 || x > 75) {
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
