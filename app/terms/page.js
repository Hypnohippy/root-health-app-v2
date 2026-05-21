import Nav from "../../components/Nav";
import RootAtmosphere from "../../components/RootAtmosphere";
import RootEnso from "../../components/RootEnso";

export default function TermsPage() {
  return (
    <RootAtmosphere type="reflection">
      <Nav />

      <main style={styles.page}>
        <section style={styles.shell}>
          <div style={styles.logoWrap}>
            <RootEnso size={82} />
          </div>

          <p style={styles.kicker}>Root Terms</p>
          <h1 style={styles.title}>Terms of Use</h1>

          <p style={styles.lead}>
            Root is designed to support reflection, emotional wellbeing, and
            nervous system awareness. By using the platform, you agree to use it
            responsibly and understand its intended purpose and limitations.
          </p>

          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>Using Root responsibly</h2>
            <p style={styles.text}>
              Root is intended for personal wellbeing, reflection, and emotional
              support. It should not be used as a substitute for medical,
              psychological, psychiatric, or emergency care.
            </p>
          </div>

          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>AI-generated content</h2>
            <p style={styles.text}>
              Some experiences and responses within Root are generated using AI.
              While Root aims to provide thoughtful and supportive guidance,
              responses may occasionally be incomplete, inaccurate, or unsuitable
              for specific situations.
            </p>
          </div>

          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>Health & wellbeing information</h2>
            <p style={styles.text}>
              Content inside Root is educational and reflective in nature and is
              not intended to diagnose, treat, cure, or prevent medical or
              mental health conditions.
            </p>
          </div>

          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>User responsibility</h2>
            <p style={styles.text}>
              Users remain responsible for their own decisions, wellbeing, and
              actions. If you are struggling, in distress, or concerned about
              your safety, seek appropriate human support and professional care.
            </p>
          </div>

          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>Platform evolution</h2>
            <p style={styles.text}>
              Root is an evolving wellbeing platform. Features, experiences, and
              systems may change over time as the platform develops and improves.
            </p>
          </div>

          <div style={styles.notice}>
            <strong>Important:</strong> Root is designed to support a calmer
            relationship with yourself, not replace meaningful human support,
            therapy, or medical care.
          </div>
        </section>
      </main>
    </RootAtmosphere>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    padding: "28px",
  },

  shell: {
    width: "100%",
    maxWidth: "900px",
    background: "rgba(255,255,255,0.22)",
    border: "1px solid rgba(255,255,255,0.34)",
    backdropFilter: "blur(30px)",
    borderRadius: "42px",
    padding: "42px",
    boxShadow: "0 34px 100px rgba(20,18,15,0.14)",
  },

  logoWrap: {
    display: "flex",
    justifyContent: "center",
    marginBottom: "12px",
  },

  kicker: {
    margin: "0 0 10px",
    textAlign: "center",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.14em",
    color: "#6F675B",
    fontWeight: "800",
  },

  title: {
    margin: "0 0 16px",
    textAlign: "center",
    fontSize: "46px",
    color: "#181818",
    letterSpacing: "-0.04em",
  },

  lead: {
    maxWidth: "720px",
    margin: "0 auto 28px",
    textAlign: "center",
    color: "rgba(26,26,26,0.78)",
    lineHeight: "1.8",
    fontSize: "18px",
  },

  card: {
    background: "rgba(255,255,255,0.24)",
    border: "1px solid rgba(255,255,255,0.30)",
    borderRadius: "28px",
    padding: "24px",
    marginBottom: "16px",
    backdropFilter: "blur(18px)",
  },

  sectionTitle: {
    margin: "0 0 10px",
    color: "#181818",
    fontSize: "22px",
  },

  text: {
    margin: 0,
    color: "rgba(26,26,26,0.76)",
    lineHeight: "1.75",
    fontSize: "15px",
  },

  notice: {
    marginTop: "24px",
    background:
      "linear-gradient(135deg, rgba(24,24,24,0.66), rgba(42,38,34,0.52))",
    color: "#FFFFFF",
    borderRadius: "28px",
    padding: "22px",
    lineHeight: "1.7",
    backdropFilter: "blur(18px)",
  },
};
