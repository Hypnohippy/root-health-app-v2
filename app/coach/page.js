"use client";

import { useEffect, useState } from "react";
import Nav from "../../components/Nav";
import { supabase } from "../../lib/supabase";

export default function CoachPage() {
  const [coachMessage, setCoachMessage] = useState("");
  const [topHelp, setTopHelp] = useState([]);

  useEffect(() => {
    const loadCoachInsight = async () => {
      const { data, error } = await supabase
        .from("body_signals")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);

      if (error || !data || data.length === 0) {
        setCoachMessage("Start with a body check and I’ll begin learning what helps you.");
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

      const topSignalEntry = Object.entries(signalCounts).sort((a, b) => b[1] - a[1])[0];
      const topSignal = topSignalEntry ? topSignalEntry[0] : null;

      const rankedHelp = Object.entries(helpCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([key, count]) => {
          const [signal, helped] = key.split("|||");
          return { signal, helped, count };
        });

      setTopHelp(rankedHelp.slice(0, 3));

      if (!topSignal) {
        setCoachMessage("Keep logging signals so I can start learning patterns.");
        return;
      }

      const bestMatch = rankedHelp.find((item) => item.signal === topSignal);

      if (bestMatch) {
        setCoachMessage(
          `When "${topSignal}" shows up, you tend to improve it by "${bestMatch.helped}". Start there — it’s already working for you.`
        );
      } else {
        setCoachMessage(
          `"${topSignal}" has been showing up recently. Let’s keep tracking what helps most.`
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
            Personal guidance based on your patterns.
          </p>

          <div style={styles.panel}>
            <p style={styles.panelTitle}>Coach insight</p>
            <p style={styles.message}>{coachMessage}</p>
          </div>

          {topHelp.length > 0 && (
            <div style={styles.panel}>
              <p style={styles.panelTitle}>What helps you most</p>

              {topHelp.map((item, index) => (
                <div key={index} style={styles.row}>
                  <strong>{index + 1}. {item.helped}</strong>
                  <span>
  {" "}when “{item.signal}” shows up ({item.count} times)
</span>
                </div>
              ))}
            </div>
          )}

          <a href="/body" style={styles.button}>
            Start Body Check
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
    marginBottom: "10px",
  },
  message: {
    fontSize: "15px",
    lineHeight: "1.6",
  },
  row: {
    padding: "10px 0",
    borderBottom: "1px solid #eee",
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
