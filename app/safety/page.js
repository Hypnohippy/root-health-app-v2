import Nav from "../../components/Nav";
import RootAtmosphere from "../../components/RootAtmosphere";
import RootEnso from "../../components/RootEnso";

export default function SafetyPage() {
  return (
    <RootAtmosphere type="grounding">
      <Nav />

      <main style={styles.page}>
        <section style={styles.shell}>
          <div style={styles.logoWrap}>
            <RootEnso size={82} />
          </div>

          <p style={styles.kicker}>Root Safeguarding</p>
          <h1 style={styles.title}>Safety & Boundaries</h1>

          <p style={styles.lead}>
            Root is designed to support reflection, emotional wellbeing, nervous
            system awareness, and calmer self-understanding. It is not a crisis,
            emergency, or medical service.
          </p>

          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>What Root is</h2>
            <p style={styles.text}>
              Root is a reflective wellbeing platform designed to help users slow
              down, notice patterns, regulate stress, and build a calmer
              relationship with themselves.
            </p>
          </div>

          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>What Root is not</h2>
            <p style={styles.text}>
              Root is not a replacement for therapy, diagnosis, emergency care,
              crisis intervention, or medical treatment. The platform does not
              provide clinical mental health services.
            </p>
          </div>

          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>If you are in crisis</h2>
            <p style={styles.text}>
              If you feel unsafe, at risk of harming yourself, or unable to stay
              safe, please contact emergency services, NHS 111, Samaritans
              (116 123 in the UK), your GP, or a trusted person immediately.
            </p>
          </div>

          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>AI guidance & limitations</h2>
            <p style={styles.text}>
              Some responses inside Root are generated using AI systems. While
              Root aims to provide calm and supportive experiences, AI can
              occasionally be incomplete or inaccurate and should not be relied
              upon for emergency or clinical decisions.
            </p>
          </div>

          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>Emotional autonomy</h2>
            <p style={styles.text}>
              Root is designed to support autonomy, reflection, and emotional
              awareness — not dependency. Users are encouraged to maintain real
              world support, connection, and professional care where appropriate.
            </p>
          </div>

          <div style={styles.notice}>
            <strong>Important:</strong> You deserve human support when things
            feel heavy. Root may support reflection, but it should never replace
            meaningful human care and connection.
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
    background: "rgba(255,255,255,0.20)",
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
