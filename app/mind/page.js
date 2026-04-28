export default function MindPage() {
  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <h1 style={styles.title}>Mind & Emotions</h1>

        <p style={styles.subtitle}>
          Practical support for calming the nervous system, reframing thoughts,
          and understanding emotional patterns.
        </p>

        <div style={styles.grid}>
          <div style={styles.tile}>CBT-style reframing</div>
          <div style={styles.tile}>Hypnotherapy-style calming</div>
          <div style={styles.tile}>EMDR-informed grounding</div>
          <div style={styles.tile}>Breathwork</div>
          <div style={styles.tile}>Journaling prompts</div>
          <div style={styles.tile}>Values & behaviour change</div>
        </div>

        <p style={styles.note}>
          Root Health offers lifestyle and emotional support. It is not a
          replacement for medical care or therapy.
        </p>
      </section>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #F7F5F2 0%, #E6E2DA 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
  },
  card: {
    width: "100%",
    maxWidth: "760px",
    background: "rgba(255,255,255,0.86)",
    borderRadius: "28px",
    padding: "34px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.08)",
    textAlign: "center",
  },
  title: {
    fontSize: "34px",
    margin: "0 0 10px",
    color: "#1A1A1A",
  },
  subtitle: {
    color: "#555",
    fontSize: "17px",
    lineHeight: "1.6",
    marginBottom: "26px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
    gap: "14px",
    marginBottom: "24px",
  },
  tile: {
    background: "#F0EDE7",
    borderRadius: "18px",
    padding: "18px",
    fontSize: "15px",
    color: "#222",
  },
  note: {
    fontSize: "13px",
    color: "#777",
    lineHeight: "1.5",
  },
};
