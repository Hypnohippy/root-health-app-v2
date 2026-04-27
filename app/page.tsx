"use client";

import { useState } from "react";

export default function Home() {
  const [response, setResponse] = useState("");

  const handleCheckIn = () => {
    setResponse(
      "Good to see you. How are you arriving today? You can journal, explore your body signals, or talk to me."
    );
  };

  return (
    <main style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Root Health</h1>

        <p style={styles.subtitle}>
          A system that listens, learns, and guides you.
        </p>

        <div style={styles.coachBox}>
          <p style={styles.coachText}>
            Welcome. I'm here with you.
          </p>

          <button style={styles.button} onClick={handleCheckIn}>
            Check in
          </button>

          {response && <p style={styles.response}>{response}</p>}
        </div>
      </div>
    </main>
  );
}

const styles = {
  container: {
    background: "#F7F5F2",
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  card: {
    background: "#FFFFFF",
    padding: "40px",
    borderRadius: "16px",
    width: "400px",
    textAlign: "center",
    boxShadow: "0 10px 30px rgba(0,0,0,0.05)"
  },
  title: {
    fontSize: "28px",
    marginBottom: "10px"
  },
  subtitle: {
    color: "#555",
    marginBottom: "30px"
  },
  coachBox: {
    marginTop: "20px"
  },
  coachText: {
    marginBottom: "20px"
  },
  button: {
    padding: "10px 20px",
    background: "#1A1A1A",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer"
  },
  response: {
    marginTop: "20px",
    color: "#333"
  }
};
