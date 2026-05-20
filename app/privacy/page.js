import Nav from "../../components/Nav";
import RootAtmosphere from "../../components/RootAtmosphere";
import RootEnso from "../../components/RootEnso";

export default function PrivacyPage() {
  return (
    <RootAtmosphere type="coach">
      <Nav />

      <main style={styles.page}>
        <section style={styles.shell}>
          <div style={styles.logoWrap}>
            <RootEnso size={82} />
          </div>

          <p style={styles.kicker}>Root Trust</p>
          <h1 style={styles.title}>Privacy</h1>

          <p style={styles.lead}>
            Root is designed to support reflection and wellbeing, not to exploit
            emotional data for advertising or profiling.
          </p>

          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>What Root may store</h2>
            <p style={styles.text}>
              Root may store profile details, body signals, journal reflections,
              mind tool entries, and coach context so the platform can offer more
              relevant support over time.
            </p>
          </div>

          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>How your data is used</h2>
            <p style={styles.text}>
              Your information is used to personalise your Root experience,
              notice gentle patterns, and support continuity inside the app. It
              is not intended for advertising targeting or emotional profiling.
            </p>
          </div>

          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>AI involvement</h2>
            <p style={styles.text}>
              Some Root features use AI to generate reflections, suggestions, and
              coaching-style responses. AI can be helpful, but it may sometimes
              be incomplete or incorrect. Important health, mental health, or
              safety decisions should involve appropriate human support.
            </p>
          </div>

          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>Your control</h2>
            <p style={styles.text}>
              Root should support autonomy. Future versions will include clearer
              data export and deletion tools. Until then, users should be able to
              request support with data removal where appropriate.
            </p>
          </div>

          <div style={styles.notice}>
            <strong>Important:</strong> Root is a wellbeing and reflection tool.
            It is not a medical device, diagnosis tool, therapy service, or
            crisis service.
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
    border: "1px solid rgba(255,255,255,0.38)",
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
    background: "rgba(255,255,255,0.26)",
    border: "1px solid rgba(255,255,255,0.34)",
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
    background: "linear-gradient(135deg, rgba(24,24,24,0.68), rgba(42,38,34,0.52))",
    color: "#FFFFFF",
    borderRadius: "28px",
    padding: "22px",
    lineHeight: "1.7",
    backdropFilter: "blur(18px)",
  },
};
