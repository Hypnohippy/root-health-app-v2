export default function RootLogo({ size = 84, breathe = true }) {
  return (
    <div
      style={{
        ...styles.wrap,
        width: size,
        height: size,
      }}
    >
      <style>{`
        @keyframes rootLogoBreath {
          0% { transform: scale(0.96); opacity: 0.72; }
          50% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(0.96); opacity: 0.72; }
        }

        @keyframes rootLogoPulse {
          0% { transform: scale(0.94); opacity: 0.28; }
          50% { transform: scale(1.12); opacity: 0.58; }
          100% { transform: scale(0.94); opacity: 0.28; }
        }
      `}</style>

      <span
        style={{
          ...styles.outerRing,
          animation: breathe
            ? "rootLogoBreath 5.8s ease-in-out infinite"
            : "none",
        }}
      />

      <span
        style={{
          ...styles.middleRing,
          animation: breathe
            ? "rootLogoPulse 7.2s ease-in-out infinite"
            : "none",
        }}
      />

      <span style={styles.innerOrb}>
        <img
          src="/root-logo.png"
          alt="Root Health"
          style={styles.image}
        />
      </span>
    </div>
  );
}

const styles = {
  wrap: {
    position: "relative",
    borderRadius: "50%",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },

  outerRing: {
    position: "absolute",
    inset: "-12%",
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(255,255,255,0.28), rgba(147,122,78,0.10), transparent 72%)",
    border: "1px solid rgba(255,255,255,0.32)",
  },

  middleRing: {
    position: "absolute",
    inset: "-4%",
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(250,244,234,0.24), rgba(255,255,255,0) 72%)",
    border: "1px solid rgba(111,103,91,0.12)",
  },

  innerOrb: {
    position: "relative",
    zIndex: 5,
    width: "78%",
    height: "78%",
    borderRadius: "50%",
    overflow: "hidden",
    background:
      "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.98), rgba(232,219,195,0.88) 44%, rgba(109,114,95,0.28) 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow:
      "inset 0 0 38px rgba(255,255,255,0.58), 0 14px 36px rgba(0,0,0,0.10)",
  },

 image: {
  width: "125%",
  height: "125%",
  objectFit: "cover",
  objectPosition: "center 18%",
  borderRadius: "50%",
  display: "block",
},
};
