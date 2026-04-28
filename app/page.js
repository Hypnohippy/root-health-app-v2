"use client";

import Nav from "../components/Nav";

export default function Home() {
  return (
    <>
      <Nav />

      <main style={styles.page}>
        <section style={styles.shell}>
          <div style={styles.brandMark}>◯</div>

          <h1 style={styles.title}>Root Health</h1>
          <p style={styles.subtitle}>
            How are you feeling today?
          </p>

          <div style={styles.grid}>
            <a href="/body" style={styles.systemButton}>
              Start Body Check
            </a>

            <a href="/coach" style={styles.systemButton}>
              Open Root Coach
            </a>
          </div>

          <div style={styles.panel}>
            <p style={styles.panelTitle}>Today’s Insight</p>

            <p style={styles.response}>
              You’ve had a few repeated signals recently. It may be worth gently
              observing patterns around stress, sleep, and digestion.
            </p>

            <p style={styles.microText}>
              System balance: 68%
            </p>
          </div>
        </section>
      </main>
    </>
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
  shell: {
    width: "100%",
    maxWidth: "820px",
    background: "rgba(255,255,255,0.82)",
    borderRadius: "28px",
    padding: "34px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.08)",
    textAlign: "center",
  },
  brandMark: {
    fontSize: "38px",
    color: "#1A1A1A",
    marginBottom: "6px",
  },
  title: {
    fontSize: "34px",
    margin: "0 0 8px",
    color: "#1A1A1A",
  },
  subtitle: {
    color: "#555",
    fontSize: "17px",
    marginBottom: "28px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "14px",
    marginBottom: "24px",
  },
  systemButton: {
    display: "block",
    textAlign: "center",
    border: "none",
    borderRadius: "16px",
    padding: "18px 12px",
    cursor: "pointer",
    fontSize: "15px",
    background: "#1A1A1A",
    color: "#FFFFFF",
    textDecoration: "none",
  },
  panel: {
    marginTop: "18px",
    background: "#FFFFFF",
    borderRadius: "22px",
    padding: "24px",
    boxShadow: "0 12px 28px rgba(0,0,0,0.06)",
  },
  panelTitle: {
    fontSize: "20px",
    fontWeight: "600",
    margin: "0 0 10px",
  },
  microText: {
    color: "#777",
    fontSize: "13px",
    marginTop: "12px",
  },
  response: {
    color: "#333",
    lineHeight: "1.6",
    fontSize: "15px",
  },
};
