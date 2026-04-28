export default function GlassBody({ selectedSystem, onSelect }) {
  const zones = [
    { id: "stress_nerves", top: "3%", left: "38%", width: "24%", height: "10%" },
    { id: "breathing", top: "20%", left: "34%", width: "32%", height: "10%" },
    { id: "heart_circulation", top: "30%", left: "38%", width: "24%", height: "10%" },
    { id: "digestion", top: "42%", left: "34%", width: "32%", height: "14%" },
    { id: "hormones_balance", top: "58%", left: "36%", width: "28%", height: "10%" },
    { id: "bladder_hydration", top: "68%", left: "38%", width: "24%", height: "10%" },
    { id: "muscles_joints", top: "15%", left: "15%", width: "70%", height: "60%" },
    { id: "energy_recovery", top: "82%", left: "30%", width: "40%", height: "10%" },
  ];

  return (
    <div style={styles.wrap}>
      <img src="/glass-human.png" alt="Glass Human" style={styles.image} />

      {zones.map((zone) => (
        <button
          key={zone.id}
          onClick={() => onSelect(zone.id)}
          style={{
            ...styles.zone,
            top: zone.top,
            left: zone.left,
            width: zone.width,
            height: zone.height,
           boxShadow:
  selectedSystem === zone.id
    ? "0 0 40px rgba(194,59,48,0.35)"
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
    width: "300px",
    margin: "0 auto 30px",
  },
  image: {
    width: "100%",
    display: "block",
    filter: "drop-shadow(0 25px 40px rgba(0,0,0,0.25))",
  },
 zone: {
  position: "absolute",
  borderRadius: "999px",
  cursor: "pointer",
  background: "transparent",
  border: "none",
  transition: "all 0.3s ease",
},
};
