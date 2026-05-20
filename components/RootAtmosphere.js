export default function RootAtmosphere({ type = "default", children }) {
  const atmosphere = atmospheres[type] || atmospheres.default;

  return (
    <div style={styles.wrap}>
      <div
        style={{
          ...styles.background,
          backgroundImage: `
            linear-gradient(
              rgba(0,0,0,${atmosphere.darkness}),
              rgba(0,0,0,${atmosphere.darkness + 0.06})
            ),
            url(${atmosphere.image})
          `,
        }}
      />

      <div
        style={{
          ...styles.gradient,
          background: atmosphere.gradient,
        }}
      />

      <div style={styles.content}>{children}</div>
    </div>
  );
}

const atmospheres = {
  default: {
    image: "/atmospheres/coach.jpg.png",
    darkness: 0.16,
    gradient:
      "radial-gradient(circle at top left, rgba(255,255,255,0.72), transparent 34%), linear-gradient(180deg, rgba(250,244,234,0.42), rgba(109,114,95,0.28))",
  },

  coach: {
    image: "/atmospheres/coach.jpg.png",
    darkness: 0.14,
    gradient:
      "radial-gradient(circle at 50% 28%, rgba(255,255,255,0.62), transparent 34%), radial-gradient(circle at 70% 82%, rgba(76,91,68,0.24), transparent 38%)",
  },

  grounding: {
    image: "/atmospheres/grounding.jpg.png",
    darkness: 0.18,
    gradient:
      "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.58), transparent 32%), linear-gradient(180deg, rgba(250,244,234,0.46), rgba(82,93,71,0.34))",
  },

  sleep: {
    image: "/atmospheres/sleep.jpg.png",
    darkness: 0.34,
    gradient:
      "radial-gradient(circle at 70% 16%, rgba(255,244,216,0.22), transparent 24%), linear-gradient(180deg, rgba(16,20,28,0.28), rgba(10,12,18,0.58))",
  },

  reflection: {
    image: "/atmospheres/reflection.jpg.png",
    darkness: 0.2,
    gradient:
      "radial-gradient(circle at 22% 18%, rgba(255,255,255,0.46), transparent 28%), linear-gradient(180deg, rgba(246,237,222,0.38), rgba(72,64,56,0.38))",
  },

  body: {
    image: "/atmospheres/grounding.jpg.png",
    darkness: 0.18,
    gradient:
      "radial-gradient(circle at 50% 78%, rgba(76,91,68,0.22), transparent 42%), linear-gradient(180deg, rgba(250,244,234,0.48), rgba(109,114,95,0.38))",
  },

  journal: {
    image: "/atmospheres/reflection.jpg.png",
    darkness: 0.2,
    gradient:
      "radial-gradient(circle at 24% 20%, rgba(255,255,255,0.5), transparent 30%), linear-gradient(180deg, rgba(250,244,234,0.42), rgba(83,70,57,0.34))",
  },
};

const styles = {
  wrap: {
    position: "relative",
    minHeight: "100vh",
    width: "100%",
  },

  background: {
    position: "fixed",
    inset: 0,
    backgroundSize: "cover",
    backgroundPosition: "center",
    transform: "scale(1.04)",
    zIndex: 0,
  },

  gradient: {
    position: "fixed",
    inset: 0,
    zIndex: 1,
    pointerEvents: "none",
  },

  content: {
    position: "relative",
    zIndex: 2,
    minHeight: "100vh",
  },
};
