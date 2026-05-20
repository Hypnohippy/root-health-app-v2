export default function RootAtmosphere({ type = "default", children }) {
  const atmosphere = atmospheres[type] || atmospheres.default;

  return (
    <div style={styles.wrap}>
      <div
        style={{
          ...styles.background,
          backgroundImage: atmosphere.image,
        }}
      />

      <div
        style={{
          ...styles.gradient,
          background: atmosphere.gradient,
        }}
      />

      <div style={styles.blurLayer} />

      <div style={styles.content}>
        {children}
      </div>
    </div>
  );
}

const atmospheres = {
  default: {
    image:
      "linear-gradient(135deg, #D8CDBB 0%, #F6F1E9 42%, #B9C5BD 100%)",
    gradient:
      "radial-gradient(circle at top left, rgba(255,255,255,0.92), transparent 34%), linear-gradient(180deg, rgba(250,244,234,0.72), rgba(109,114,95,0.32))",
  },

  coach: {
    image:
      "linear-gradient(135deg, #D8CDBB 0%, #F6F1E9 38%, #B9C5BD 100%)",
    gradient:
      "radial-gradient(circle at 50% 28%, rgba(255,255,255,0.72), transparent 34%), radial-gradient(circle at 70% 82%, rgba(76,91,68,0.28), transparent 38%)",
  },

  grounding: {
    image:
      "linear-gradient(135deg, #D9CFB9 0%, #BFCBBC 48%, #7D876F 100%)",
    gradient:
      "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.66), transparent 32%), linear-gradient(180deg, rgba(250,244,234,0.6), rgba(82,93,71,0.35))",
  },

  sleep: {
    image:
      "linear-gradient(135deg, #222831 0%, #4D4A48 48%, #8B806E 100%)",
    gradient:
      "radial-gradient(circle at 70% 16%, rgba(255,244,216,0.28), transparent 24%), linear-gradient(180deg, rgba(16,20,28,0.26), rgba(10,12,18,0.52))",
  },

  reflection: {
    image:
      "linear-gradient(135deg, #D8C7AA 0%, #B9AA91 42%, #756C61 100%)",
    gradient:
      "radial-gradient(circle at 22% 18%, rgba(255,255,255,0.54), transparent 28%), linear-gradient(180deg, rgba(246,237,222,0.55), rgba(72,64,56,0.35))",
  },

  body: {
    image:
      "linear-gradient(135deg, #E8DCCB 0%, #C8B89D 44%, #6D725F 100%)",
    gradient:
      "radial-gradient(circle at 50% 78%, rgba(76,91,68,0.24), transparent 42%), linear-gradient(180deg, rgba(250,244,234,0.72), rgba(109,114,95,0.42))",
  },

  journal: {
    image:
      "linear-gradient(135deg, #E7D8C0 0%, #C6B18F 45%, #746657 100%)",
    gradient:
      "radial-gradient(circle at 24% 20%, rgba(255,255,255,0.58), transparent 30%), linear-gradient(180deg, rgba(250,244,234,0.62), rgba(83,70,57,0.34))",
  },
};

const styles = {
  wrap: {
    position: "relative",
    minHeight: "100vh",
    overflow: "hidden",
  },

  background: {
    position: "absolute",
    inset: 0,
    backgroundSize: "cover",
    backgroundPosition: "center",
    transform: "scale(1.04)",
  },

  gradient: {
    position: "absolute",
    inset: 0,
  },

  blurLayer: {
    position: "absolute",
    inset: 0,
    backdropFilter: "blur(0px)",
    pointerEvents: "none",
  },

  content: {
    position: "relative",
    zIndex: 2,
    minHeight: "100vh",
  },
};
