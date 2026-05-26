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
    darkness: 0.06,
    gradient:
      "radial-gradient(circle at top left, rgba(255,255,255,0.72), transparent 34%), linear-gradient(180deg, rgba(250,244,234,0.42), rgba(109,114,95,0.28))",
  },

  coach: {
    image: "/atmospheres/coach.jpg.png",
    darkness: 0.06,
    gradient:
      "radial-gradient(circle at 50% 28%, rgba(255,255,255,0.18), transparent 34%), radial-gradient(circle at 70% 82%, rgba(76,91,68,0.24), transparent 38%)",
  },

  grounding: {
    image: "/atmospheres/grounding.jpg.png",
    darkness: 0.06,
    gradient:
      "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.58), transparent 32%), linear-gradient(180deg, rgba(250,244,234,0.46), rgba(82,93,71,0.34))",
  },

  sleep: {
    image: "/atmospheres/sleep.jpg.png",
    darkness: 0.16,
    gradient:
      "radial-gradient(circle at 70% 16%, rgba(255,244,216,0.22), transparent 24%), linear-gradient(180deg, rgba(16,20,28,0.28), rgba(10,12,18,0.58))",
  },

  reflection: {
    image: "/atmospheres/reflection.jpg.png",
    darkness: 0.06,
    gradient:
      "radial-gradient(circle at 22% 18%, rgba(255,255,255,0.46), transparent 28%), linear-gradient(180deg, rgba(246,237,222,0.38), rgba(72,64,56,0.38))",
  },
  panic: {
  image: "/atmospheres/grounding.jpg.png",
  darkness: 0.22,
  gradient:
    "radial-gradient(circle at 50% 28%, rgba(255,244,216,0.18), transparent 28%), linear-gradient(180deg, rgba(32,38,34,0.36), rgba(10,12,10,0.58))",
},

overthinking: {
  image: "/atmospheres/reflection.jpg.png",
  darkness: 0.1,
  gradient:
    "radial-gradient(circle at 26% 18%, rgba(255,255,255,0.52), transparent 30%), linear-gradient(180deg, rgba(235,239,232,0.42), rgba(92,102,92,0.30))",
},

shutdown: {
  image: "/atmospheres/sleep.jpg.png",
  darkness: 0.2,
  gradient:
    "radial-gradient(circle at 70% 18%, rgba(255,244,216,0.18), transparent 26%), linear-gradient(180deg, rgba(22,24,30,0.32), rgba(8,10,14,0.62))",
},

shame: {
  image: "/atmospheres/coach.jpg.png",
  darkness: 0.12,
  gradient:
    "radial-gradient(circle at 42% 24%, rgba(255,235,205,0.34), transparent 32%), linear-gradient(180deg, rgba(244,224,198,0.34), rgba(80,64,50,0.38))",
},

grief: {
  image: "/atmospheres/reflection.jpg.png",
  darkness: 0.18,
  gradient:
    "radial-gradient(circle at 24% 20%, rgba(255,255,255,0.34), transparent 28%), linear-gradient(180deg, rgba(210,205,198,0.28), rgba(52,54,58,0.48))",
},

anger: {
  image: "/atmospheres/grounding.jpg.png",
  darkness: 0.18,
  gradient:
    "radial-gradient(circle at 50% 22%, rgba(255,220,180,0.18), transparent 26%), linear-gradient(180deg, rgba(74,56,44,0.34), rgba(28,26,22,0.52))",
},
  body: {
    image: "/atmospheres/grounding.jpg.png",
    darkness: 0.18,
    gradient:
      "radial-gradient(circle at 50% 78%, rgba(76,91,68,0.22), transparent 42%), linear-gradient(180deg, rgba(250,244,234,0.16), rgba(109,114,95,0.38))",
  },

  journal: {
    image: "/atmospheres/reflection.jpg.png",
    darkness: 0.2,
    gradient:
      "radial-gradient(circle at 24% 20%, rgba(255,255,255,0.5), transparent 30%), linear-gradient(180deg, rgba(250,244,234,0.42), rgba(83,70,57,0.34))",
  },
};

if (typeof window !== "undefined") {
  const existing = document.getElementById("root-atmosphere-animations");

  if (!existing) {
    const style = document.createElement("style");

    style.id = "root-atmosphere-animations";

    style.innerHTML = `
      @keyframes rootAtmosphereFloat {
        0% {
          transform: scale(1.04) translateY(0px);
        }

        50% {
          transform: scale(1.06) translateY(-8px);
        }

        100% {
          transform: scale(1.04) translateY(0px);
        }
      }

      @keyframes rootGradientBreath {
        0% {
          opacity: 0.92;
        }

        50% {
          opacity: 1;
        }

        100% {
          opacity: 0.92;
        }
      }
    `;

    document.head.appendChild(style);
  }
}
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
  transition:
    "background-image 1.2s ease, transform 6s ease, filter 1.4s ease",
  animation: "rootAtmosphereFloat 18s ease-in-out infinite",
  willChange: "transform, filter",
},
  gradient: {
  position: "fixed",
  inset: 0,
  zIndex: 1,
  pointerEvents: "none",
  transition: "background 1.2s ease, opacity 1.2s ease",
  animation: "rootGradientBreath 14s ease-in-out infinite",
  mixBlendMode: "soft-light",
},

  content: {
    position: "relative",
    zIndex: 2,
    minHeight: "100vh",
  },
};
