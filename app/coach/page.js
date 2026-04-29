"use client";

import { useEffect, useState } from "react";
import Nav from "../../components/Nav";
import { supabase } from "../../lib/supabase";

export default function CoachPage() {
  const [coachMessage, setCoachMessage] = useState("Loading your coach insight...");
  const [topHelp, setTopHelp] = useState([]);

  useEffect(() => {
    const loadCoachInsight = async () => {
      const { data, error } = await supabase
        .from("body_signals")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);

      if (error) {
        setCoachMessage("I couldn’t read your recent patterns yet.");
        return;
      }

      if (!data || data.length === 0) {
        setCoachMessage("Start with a body check, and I’ll begin learning what tends to help you.");
        return;
      }

      const signalCounts = {};
      const helpCounts = {};

      data.forEach((entry) => {
        if (entry.signal) {
          signalCounts[entry.signal] = (signalCounts[entry.signal] || 0) + 1;
        }

        if (entry.signal && entry.what_helped) {
          const key = `${entry.signal}|||${entry.what_helped}`;
          helpCounts[key] = (helpCounts[key] || 0) + 1;
        }
      });

      const topSignal = Object.entries(signalCounts).sort((a, b) => b[1] - a[1])[0];

      const rankedHelp = Object.entries(helpCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([key, count]) => {
          const [signal, helped] = key.split("|||");
          return { signal, helped, count };
        });

      setTopHelp(rankedHelp);

      if (topSignal) {
       const bestMatch = rankedHelp.find(
  (item) => item.signal === topSignal[0]
);

if (bestMatch) {
  setCoachMessage(
    `When "${topSignal[0]}" shows up, you tend to improve it by "${bestMatch.helped}". Start there — it’s already working for you.`
  );
} else {
  setCoachMessage(
    `I’m noticing that "${topSignal[0]}" has shown up ${topSignal[1]} times recently. Let’s keep tracking what helps most.`
  );
}
    };

    loadCoachInsight();
  }, []);

  return (
    <>
      <Nav />

      <main style={styles.page}>
        <section style={styles.card}>
          <div style={styles.brandMark}>◯</div>

          <h1 style={styles.title}>Root Coach</h1>

          <p style={styles.subtitle}>
            Personal guidance based on your recent body signals and what has helped before.
          </p>

          <div style={styles.panel}>
            <p style={styles.panelTitle}>Coach insight</p>
            <p style={styles.message}>{coachMessage}</p>
          </div>

          {topHelp.length > 0 && (
            <div style={styles.panel}>
              <p style={styles.panelTitle}>What seems to help you</p>

              {topHelp.map((item, index) => (
                <div key={`${item.signal}-${item.helped}`} style={styles.row}>
                  <strong>{index + 1}. {item.helped}</strong>
                  <span>
                    helped when “{item.signal}” showed up ({item.count} {item.count === 1 ? "time" : "times"})
                  </span>
                </div>
              ))}
            </div>
          )}

          <a href="/body" style={styles.button}>
            Start a body check
          </a>
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
  card: {
    width: "100%",
    maxWidth: "820px",
    background: "rgba(255,255,255,0.86)",
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
    lineHeight: "1.6",
    marginBottom: "24px",
  },
  panel: {
    background: "#FFFFFF",
    borderRadius: "22px",
    padding: "24px",
    marginTop: "18px",
    boxShadow: "0 12px 28px rgba(0,0,0,0.06)",
    textAlign: "left",
  },
  panelTitle: {
    fontSize: "18px",
    fontWeight: "700",
    margin: "0 0 10px",
    color: "#1A1A1A",
  },
  message: {
    color: "#333",
    lineHeight: "1.65",
    fontSize: "15px",
    margin: 0,
  },
  row: {
    display: "grid",
    gap: "4px",
    padding: "12px 0",
    borderBottom: "1px solid #eee",
    color: "#333",
    fontSize: "14px",
  },
  button: {
    display: "inline-block",
    marginTop: "22px",
    background: "#1A1A1A",
    color: "#FFFFFF",
    textDecoration: "none",
    borderRadius: "14px",
    padding: "14px 22px",
    fontSize: "15px",
  },
};
