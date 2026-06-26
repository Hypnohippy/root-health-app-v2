"use client";

import Nav from "../../components/Nav";
import RootAtmosphere from "../../components/RootAtmosphere";
import RootEnso from "../../components/RootEnso";

export default function HRCoachPage() {
  return (
    <RootAtmosphere type="coach">
      <Nav />

      <main style={styles.page}>
        <section style={styles.card}>

          <RootEnso size={90} />

          <h1 style={styles.title}>
            Ask Root
          </h1>

          <p style={styles.subtitle}>
            Welcome back.
          </p>

          <p style={styles.text}>
            This is where your conversation with Root will begin.
          </p>

          <p style={styles.text}>
            Root will help you understand your organisation,
            explain workforce trends,
            answer questions,
            prepare board reports
            and recommend the next best actions.
          </p>

          <div style={styles.comingSoon}>

            🚧

            <h2>
              Coming Soon
            </h2>

            <p>
              The HR Voice Companion is currently under construction.
            </p>

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
    alignItems: "center",
    padding: "40px",
  },

  card: {
    maxWidth: "760px",
    width: "100%",
    textAlign: "center",
    padding: "50px",
    borderRadius: "30px",
    background: "rgba(255,255,255,0.18)",
    backdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.25)",
  },

  title: {
    fontSize: "40px",
    marginTop: "20px",
    marginBottom: "10px",
  },

  subtitle: {
    fontSize: "20px",
    opacity: 0.8,
  },

  text: {
    marginTop: "20px",
    lineHeight: 1.7,
    fontSize: "17px",
  },

  comingSoon: {
    marginTop: "40px",
    padding: "30px",
    borderRadius: "20px",
    background: "rgba(255,255,255,0.12)",
  },

};
