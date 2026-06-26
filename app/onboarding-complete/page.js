"use client";

import Nav from "../../components/Nav";
import RootAtmosphere from "../../components/RootAtmosphere";
import RootEnso from "../../components/RootEnso";

export default function OnboardingCompletePage() {
  return (
    <RootAtmosphere type="coach">
      <Nav />

      <main style={styles.page}>
        <section style={styles.card}>
          <RootEnso size={90} />

          <h1 style={styles.title}>Your Root journey has begun</h1>

          <p style={styles.text}>
            Your first wellbeing picture has been saved.
          </p>

          <p style={styles.text}>
            Root can now begin helping you notice patterns in your body,
            mind, recovery and daily life.
          </p>

          <button
            style={styles.button}
            onClick={() => (window.location.href = "/body")}
          >
            Continue to Body Signals
          </button>
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
    padding: "32px",
  },

  card: {
    width: "100%",
    maxWidth: "720px",
    textAlign: "center",
    padding: "46px",
    borderRadius: "34px",
    background: "rgba(255,255,255,0.24)",
    border: "1px solid rgba(255,255,255,0.34)",
    backdropFilter: "blur(24px)",
    boxShadow: "0 34px 100px rgba(20,18,15,0.16)",
  },

  title: {
    margin: "22px 0 16px",
    fontSize: "38px",
    color: "#181818",
  },

  text: {
    fontSize: "17px",
    lineHeight: "1.8",
    color: "#4D463B",
  },

  button: {
    marginTop: "26px",
    padding: "15px 24px",
    borderRadius: "999px",
    border: "none",
    background: "#181818",
    color: "#fff",
    cursor: "pointer",
    fontWeight: "800",
  },
};
