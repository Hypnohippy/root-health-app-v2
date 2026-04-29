"use client";

import { useEffect, useState } from "react";
import Nav from "../components/Nav";
import { supabase } from "../lib/supabase";

export default function Home() {
  const [latestInsight, setLatestInsight] = useState("");
  const [balanceScore, setBalanceScore] = useState(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("body_signals")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      if (!data || data.length === 0) {
        setLatestInsight("No recent signals yet");
        setBalanceScore(null);
        return;
      }

      const latestAreas = data[0].areas || [];
      const averageIntensity =
        data.reduce((sum, item) => sum + Number(item.intensity || 0), 0) /
        data.length;

      const calculatedScore = Math.max(
        0,
        Math.min(100, Math.round(100 - averageIntensity * 10))
      );

      setBalanceScore(calculatedScore);

      setLatestInsight(
        "Your body has recently been signalling around " +
          latestAreas.join(", ")
      );
    };

    load();
  }, []);

  return (
    <>
      <Nav />

      <main style={styles.page}>
        <section style={styles.shell}>
          <div style={styles.brandMark}>◯</div>

          <h1 style={styles.title}>Root Health</h1>
          <p style={styles.subtitle}>How are you feeling today?</p>

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

            <p style={styles.score}>
              {balanceScore !== null ? `${balanceScore}%` : "—"}
            </p>

            <p style={styles.microText}>System balance</p>

            <p style={styles.response}>
              {latestInsight || "No recent signals yet"}
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
  score: {
    fontSize: "48px",
    fontWeight: "700",
    margin: "8px 0 0",
    color: "#1A1A1A",
  },
  microText: {
    color: "#777",
    fontSize: "13px",
    marginTop: "4px",
  },
  response: {
    color: "#333",
    lineHeight: "1.6",
    fontSize: "15px",
    marginTop: "18px",
  },
};
