"use client";

import { useEffect, useState } from "react";
import Nav from "../components/Nav";
import { supabase } from "../lib/supabase";

export default function Home() {
  const [latestInsight, setLatestInsight] = useState("");
  const [balanceScore, setBalanceScore] = useState(null);
  const [patternNote, setPatternNote] = useState("");
  const [trendNote, setTrendNote] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("body_signals")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (!data || data.length === 0) {
        setLatestInsight("No recent signals yet");
        setPatternNote("Start a body check to begin building your pattern.");
        setTrendNote("");
        setBalanceScore(null);
        return;
      }

      const now = new Date();

      const last24h = data.filter((d) => {
        const t = new Date(d.created_at);
        return now - t <= 24 * 60 * 60 * 1000;
      });

      const last7d = data.filter((d) => {
        const t = new Date(d.created_at);
        return now - t <= 7 * 24 * 60 * 60 * 1000;
      });

      const avg = (arr) =>
        arr.length === 0
          ? 0
          : arr.reduce((s, i) => s + Number(i.intensity || 0), 0) / arr.length;

      const avg24 = avg(last24h);
      const avg7 = avg(last7d);

      const areaCounts = {};
      data.forEach((entry) => {
        const areas = Array.isArray(entry.areas) ? entry.areas : [];
        areas.forEach((a) => {
          areaCounts[a] = (areaCounts[a] || 0) + 1;
        });
      });

      const sorted = Object.entries(areaCounts).sort((a, b) => b[1] - a[1]);
      const top = sorted[0];

      const repetitionPenalty = top && top[1] >= 3 ? 10 : 0;
      const frequencyPenalty = data.length >= 6 ? 5 : 0;
      const intensityPenalty = avg7 * 8;

      const score = Math.max(
        0,
        Math.min(
          100,
          Math.round(100 - intensityPenalty - repetitionPenalty - frequencyPenalty)
        )
      );

      setBalanceScore(score);

      const latestAreas = data[0].areas || [];
      setLatestInsight(
        "Your body has recently been signalling around " +
          latestAreas.join(", ")
      );

      if (top && top[1] >= 3) {
        setPatternNote(
          `${top[0]} has appeared ${top[1]} times recently, so this may be a developing pattern.`
        );
      } else {
        setPatternNote(
          "No strong repeated pattern yet. Keep tracking and patterns will emerge."
        );
      }

      if (last24h.length >= 2) {
        if (avg24 > avg7 + 0.5) {
          setTrendNote(
            "Signals have been stronger in the last 24 hours, suggesting an increase in system load."
          );
        } else if (avg24 < avg7 - 0.5) {
          setTrendNote(
            "Signals appear to be easing compared to earlier in the week."
          );
        } else {
          setTrendNote(
            "Signals are relatively stable with no clear upward or downward trend."
          );
        }
      } else {
        setTrendNote("Not enough recent data to assess short-term trend.");
      }
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

            <p style={styles.response}>{latestInsight}</p>

            <p style={styles.pattern}>{patternNote}</p>

            <p style={styles.trend}>{trendNote}</p>
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
  pattern: {
    marginTop: "12px",
    color: "#555",
    fontSize: "14px",
  },
  trend: {
    marginTop: "12px",
    color: "#444",
    fontSize: "14px",
    fontStyle: "italic",
  },
};
