export default function GlassBody({ selectedSystem, onSelect }) {
  const zones = [
    { id: "stress_nerves", label: "Mind", top: "7%", left: "42%", width: "16%", height: "11%" },
    { id: "breathing", label: "Breath", top: "25%", left: "36%", width: "28%", height: "10%" },
    { id: "heart_circulation", label: "Heart", top: "36%", left: "38%", width: "24%", height: "10%" },
    { id: "digestion", label: "Gut", top: "48%", left: "35%", width: "30%", height: "14%" },
    { id: "hormones_balance", label: "Balance", top: "61%", left: "37%", width: "26%", height: "9%" },
    { id: "bladder_hydration", label: "Hydration", top: "70%", left: "39%", width: "22%", height: "8%" },
    { id: "muscles_joints", label: "Body", top: "20%", left: "20%", width: "60%", height: "68%" },
    { id: "skin", label: "Skin", top: "15%", left: "18%", width: "64%", height: "76%" },
    { id: "senses", label: "Senses", top: "10%", left: "34%", width: "32%", height: "14%" },
    { id: "energy_recovery", label: "Energy", top: "82%", left: "32%", width: "36%", height: "8%" },
  ];

  return (
    <div style={styles.wrap}>
      <div style={styles.glow}></div>

      <svg viewBox="0 0 220 520" style={styles.bodySvg}>
        <defs>
          <linearGradient id="glassGradient" x1="0" x2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
            <stop offset="50%" stopColor="#dfe9ec" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.45" />
          </linearGradient>
        </defs>

        <circle cx="110" cy="55" r="42" fill="url(#glassGradient)" stroke="#cfd8d8" strokeWidth="2" />
        <path
          d="M80 105 C62 145 55 205 65 270 C75 340 68 420 54 500
             M140 105 C158 145 165 205 155 270 C145 340 152 420 166 500
             M80 105 C96 120 124 120 140 105
             M65 270 C90 290 130 290 155 270"
          fill="none"
          stroke="#cfd8d8"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M65 135 C35 190 30 265 42 340"
          fill="none"
          stroke="#cfd8d8"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M155 135 C185 190 190 265 178 340"
          fill="none"
          stroke="#cfd8d8"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>

      {zones.map((zone) => (
        <button
          key={zone.id}
          onClick={() => onSelect(zone.id)}
          title={zone.label}
          style={{
            ...styles.zone,
            top: zone.top,
            left: zone.left,
            width: zone.width,
            height: zone.height,
           background:
  selectedSystem === zone.id
    ? "rgba(194,59,48,0.18)"
    : "transparent",
border:
  selectedSystem === zone.id
    ? "1px solid rgba(194,59,48,0.4)"
    : "none",
          }}
        />
      ))}
    </div>
  );
}

const styles = {
  wrap: {
    position: "relative",
    width: "240px",
    height: "520px",
    margin: "0 auto 26px",
  },
  glow: {
    position: "absolute",
    inset: "70px 25px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(255,255,255,0.85), rgba(230,226,218,0.15), transparent 70%)",
    filter: "blur(10px)",
  },
  bodySvg: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    filter: "drop-shadow(0 18px 28px rgba(0,0,0,0.10))",
  },
 zone: {
  position: "absolute",
  borderRadius: "999px",
  cursor: "pointer",
  background: "transparent",
  border: "none",
  opacity: 0.15,
  transition: "all 0.3s ease",
},
};
