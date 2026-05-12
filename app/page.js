"use client";

import { useEffect, useState } from "react";
import Nav from "../components/Nav";
import { supabase } from "../lib/supabase";
import RootEnso from "../components/RootEnso";

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
        setLatestInsight("No recent signals yet.");
        setPatternNote("Start a body check to begin building your pattern.");
        setTrendNote("Root Coach will become more useful as your map grows.");
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
        latestAreas.length > 0
          ? "Your body has recently been signalling around " + latestAreas.join(", ") + "."
          : "Your body has logged a recent signal."
      );

      if (top && top[1] >= 3) {
        setPatternNote(
          `${top[0]} has appeared ${top[1]} times recently. That may be a developing pattern.`
        );
      } else {
        setPatternNote(
          "No strong repeated pattern yet. Keep tracking and the map will sharpen."
        );
      }

      if (last24h.length >= 2) {
        if (avg24 > avg7 + 0.5) {
          setTrendNote(
            "Signals have been stronger in the last 24 hours, suggesting increased system load."
          );
        } else if (avg24 < avg7 - 0.5) {
          setTrendNote(
            "Signals appear to be easing compared with earlier in the week."
          );
        } else {
          setTrendNote(
            "Signals are relatively stable with no clear upward or downward trend."
          );
        }
      } else {
        setTrendNote("Not enough recent data yet to assess short-term trend.");
      }
    };

    load();
  }, []);

  return (
    <>
      <Nav />

      <main style={styles.page}>
        <div style={styles.backgroundOrbOne} />
        <div style={styles.backgroundOrbTwo} />

        <section style={styles.shell}>
          <div style={styles.leftPanel}>
            <div style={styles.logoWrap}>
              <RootEnso size={92} />
            </div>

            <p style={styles.kicker}>Root Health</p>

            <h1 style={styles.title}>
              Notice the pattern.
              <br />
              Return to yourself.
            </h1>

            <p style={styles.subtitle}>
              A calm intelligence layer for body signals, emotional reflection,
              guided coaching and whole-person self-care.
            </p>

            <div style={styles.actionGrid}>
              <a href="/body" style={styles.primaryButton}>
                Start Body Check
              </a>

              <a href="/coach" style={styles.secondaryButton}>
                Open Root Coach
              </a>
            </div>

            <div style={styles.pathRow}>
              <a href="/mind" style={styles.pathPill}>Mind</a>
              <a href="/journal" style={styles.pathPill}>Journal</a>
              <a href="/insights" style={styles.pathPill}>Insights</a>
              <a href="/profile" style={styles.pathPill}>Profile</a>
            </div>
          </div>

          <div style={styles.rightPanel}>
            <div style={styles.imageCard}>
              <div style={styles.sunGlow} />
              <div style={styles.mountainOne} />
              <div style={styles.mountainTwo} />
              <div style={styles.ground} />
              <div style={styles.treeTrunk} />
              <div style={styles.treeCanopy} />
              <div style={styles.treeCanopySmall} />
              <div style={styles.humanFigure} />
            </div>

            <div style={styles.insightCard}>
              <div style={styles.insightTop}>
                <div>
                  <p style={styles.panelTitle}>Today’s insight</p>
                  <p style={styles.microText}>System balance</p>
                </div>

                <p style={styles.score}>
                  {balanceScore !== null ? `${balanceScore}%` : "—"}
                </p>
              </div>

              <p style={styles.response}>{latestInsight}</p>
              <p style={styles.pattern}>{patternNote}</p>
              <p style={styles.trend}>{trendNote}</p>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    position: "relative",
    overflow: "hidden",
    background:
      "radial-gradient(circle at top left, rgba(255,255,255,0.96), transparent 30%), linear-gradient(135deg, #D8CDBB 0%, #F6F1E9 38%, #B9C5BD 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "32px",
  },

  backgroundOrbOne: {
    position: "absolute",
    top: "-160px",
    right: "-120px",
    width: "420px",
    height: "420px",
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(255,255,255,0.55), rgba(255,255,255,0.04) 68%)",
  },

  backgroundOrbTwo: {
    position: "absolute",
    bottom: "-180px",
    left: "-130px",
    width: "420px",
    height: "420px",
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(68,84,72,0.18), rgba(68,84,72,0.02) 70%)",
  },

  shell: {
    position: "relative",
    zIndex: 2,
    width: "100%",
    maxWidth: "1180px",
    minHeight: "680px",
    display: "grid",
    gridTemplateColumns: "1.02fr 0.98fr",
    gap: "24px",
    background: "rgba(255,255,255,0.54)",
    border: "1px solid rgba(255,255,255,0.72)",
    backdropFilter: "blur(24px)",
    borderRadius: "46px",
    padding: "28px",
    boxShadow: "0 38px 110px rgba(38,33,25,0.18)",
  },

  leftPanel: {
    borderRadius: "38px",
    padding: "48px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    background:
      "linear-gradient(135deg, rgba(255,255,255,0.70), rgba(255,255,255,0.36))",
    border: "1px solid rgba(255,255,255,0.72)",
  },

  logoWrap: {
    display: "flex",
    marginBottom: "18px",
  },

  kicker: {
    margin: "0 0 14px",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.16em",
    color: "#6F675B",
    fontWeight: "800",
  },

  title: {
    margin: "0 0 20px",
    fontSize: "58px",
    lineHeight: "1.02",
    letterSpacing: "-0.06em",
    color: "#171717",
  },

  subtitle: {
    margin: "0 0 32px",
    maxWidth: "560px",
    color: "#514C44",
    fontSize: "18px",
    lineHeight: "1.75",
  },

  actionGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "14px",
    maxWidth: "470px",
  },

  primaryButton: {
    display: "block",
    textAlign: "center",
    borderRadius: "999px",
    padding: "16px 18px",
    background: "#181818",
    color: "#FFFFFF",
    textDecoration: "none",
    fontSize: "15px",
    boxShadow: "0 14px 34px rgba(0,0,0,0.18)",
  },

  secondaryButton: {
    display: "block",
    textAlign: "center",
    borderRadius: "999px",
    padding: "16px 18px",
    background: "rgba(255,255,255,0.72)",
    color: "#181818",
    textDecoration: "none",
    fontSize: "15px",
    border: "1px solid rgba(255,255,255,0.86)",
  },

  pathRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    marginTop: "24px",
  },

  pathPill: {
    borderRadius: "999px",
    padding: "10px 13px",
    background: "rgba(255,255,255,0.52)",
    border: "1px solid rgba(255,255,255,0.72)",
    color: "#4D473F",
    textDecoration: "none",
    fontSize: "13px",
  },

  rightPanel: {
    display: "grid",
    gridTemplateRows: "1fr auto",
    gap: "18px",
  },

  imageCard: {
    position: "relative",
    overflow: "hidden",
    minHeight: "420px",
    borderRadius: "38px",
    background:
      "linear-gradient(180deg, #EED7B1 0%, #C8D2C3 48%, #6D7D68 100%)",
    border: "1px solid rgba(255,255,255,0.72)",
    boxShadow: "inset 0 0 80px rgba(255,255,255,0.22)",
  },

  sunGlow: {
    position: "absolute",
    top: "44px",
    right: "70px",
    width: "126px",
    height: "126px",
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(255,243,204,0.96), rgba(255,209,128,0.28) 55%, transparent 72%)",
  },

  mountainOne: {
    position: "absolute",
    left: "-40px",
    bottom: "108px",
    width: "70%",
    height: "220px",
    background: "rgba(77,92,75,0.54)",
    clipPath: "polygon(0 100%, 45% 18%, 100% 100%)",
  },

  mountainTwo: {
    position: "absolute",
    right: "-80px",
    bottom: "94px",
    width: "78%",
    height: "250px",
    background: "rgba(45,65,55,0.44)",
    clipPath: "polygon(0 100%, 55% 8%, 100% 100%)",
  },

  ground: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "150px",
    background:
      "linear-gradient(180deg, rgba(81,93,68,0.18), rgba(33,47,38,0.84))",
  },

  treeTrunk: {
    position: "absolute",
    left: "50%",
    bottom: "82px",
    width: "18px",
    height: "132px",
    background: "#3B2D22",
    borderRadius: "999px",
    transform: "translateX(-50%)",
  },

  treeCanopy: {
    position: "absolute",
    left: "50%",
    bottom: "174px",
    width: "220px",
    height: "180px",
    borderRadius: "48% 52% 50% 50%",
    background:
      "radial-gradient(circle at 35% 35%, #7D8B64, #344936 72%)",
    transform: "translateX(-50%)",
    boxShadow: "0 18px 60px rgba(0,0,0,0.18)",
  },

  treeCanopySmall: {
    position: "absolute",
    left: "43%",
    bottom: "236px",
    width: "130px",
    height: "100px",
    borderRadius: "50%",
    background:
      "radial-gradient(circle at 35% 35%, #A0A977, #485A3D 76%)",
  },

  humanFigure: {
    position: "absolute",
    left: "50%",
    bottom: "54px",
    width: "38px",
    height: "72px",
    borderRadius: "999px 999px 12px 12px",
    background: "rgba(20,20,20,0.82)",
    transform: "translateX(-50%)",
    boxShadow: "0 18px 40px rgba(0,0,0,0.25)",
  },

  insightCard: {
    borderRadius: "34px",
    padding: "28px",
    background: "rgba(24,24,24,0.92)",
    color: "#FFFFFF",
    boxShadow: "0 24px 70px rgba(0,0,0,0.18)",
  },

  insightTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: "18px",
    alignItems: "flex-start",
  },

  panelTitle: {
    margin: "0 0 6px",
    color: "#D8CDBB",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.14em",
    fontWeight: "800",
  },

  score: {
    fontSize: "54px",
    fontWeight: "800",
    margin: 0,
    lineHeight: "1",
  },

  microText: {
    color: "#E7E0D6",
    fontSize: "13px",
    margin: 0,
  },

  response: {
    color: "#FFFFFF",
    lineHeight: "1.7",
    fontSize: "15px",
    marginTop: "18px",
  },

  pattern: {
    marginTop: "12px",
    color: "#E7E0D6",
    fontSize: "14px",
    lineHeight: "1.65",
  },

  trend: {
    marginTop: "12px",
    color: "#D8CDBB",
    fontSize: "14px",
    lineHeight: "1.65",
    fontStyle: "italic",
  },
};
