"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import Nav from "../../components/Nav";
import RootEnso from "../../components/RootEnso";
function countBy(items, key) {
  const counts = {};

  items.forEach((item) => {
    const value = item?.[key] || "Unknown";
    counts[value] = (counts[value] || 0) + 1;
  });

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
}

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
}

export default function InsightsPage() {
  const [loading, setLoading] = useState(true);
  const [bodySignals, setBodySignals] = useState([]);
  const [mindEntries, setMindEntries] = useState([]);
  const [journalEntries, setJournalEntries] = useState([]);

  useEffect(() => {
    loadInsights();
  }, []);

  const loadInsights = async () => {
    const { data: bodyData } = await supabase
      .from("body_signals")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);

    const { data: mindData } = await supabase
      .from("mind_entries")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);

    const { data: journalData } = await supabase
      .from("journal_entries")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);

    setBodySignals(Array.isArray(bodyData) ? bodyData : []);
    setMindEntries(Array.isArray(mindData) ? mindData : []);
    setJournalEntries(Array.isArray(journalData) ? journalData : []);
    setLoading(false);
  };

  const insights = useMemo(() => {
    const commonSignals = countBy(bodySignals, "signal");
    const commonContexts = countBy(bodySignals, "context");
    const emotionalThemes = countBy(journalEntries, "emotional_theme");
    const recommendedModes = countBy(journalEntries, "recommended_coach_mode");
    const toolsUsed = countBy(mindEntries, "tool");

    const recentBody = bodySignals[0];
    const recentJournal = journalEntries[0];
    const recentMind = mindEntries[0];

    let mainObservation = "Start adding body signals, journal reflections, and tools to build your pattern map.";

    if (emotionalThemes.length > 0 && commonSignals.length > 0) {
      mainObservation = `${emotionalThemes[0][0]} and ${commonSignals[0][0]} have both shown up recently. That may be worth watching as a mind-body pattern.`;
    } else if (emotionalThemes.length > 0) {
      mainObservation = `${emotionalThemes[0][0]} has appeared in your recent reflections. This may be a useful place to focus next.`;
    } else if (commonSignals.length > 0) {
      mainObservation = `${commonSignals[0][0]} has appeared in your recent body signals. Tracking when it shows up may help reveal the pattern.`;
    }

    let suggestedFocus = "Use Coach to explore what feels most relevant today.";

    if (recommendedModes.length > 0) {
      suggestedFocus = `${recommendedModes[0][0]} may be the most useful coach mode right now.`;
    } else if (toolsUsed.length > 0) {
      suggestedFocus = `${toolsUsed[0][0]} has been used recently. It may be worth checking whether it helped.`;
    }

    return {
      commonSignals,
      commonContexts,
      emotionalThemes,
      recommendedModes,
      toolsUsed,
      recentBody,
      recentJournal,
      recentMind,
      mainObservation,
      suggestedFocus,
    };
  }, [bodySignals, mindEntries, journalEntries]);

  if (loading) {
    return (
      <>
        <Nav />
        <main style={styles.page}>
          <section style={styles.shell}>
            <p>Loading insights...</p>
          </section>
        </main>
      </>
    );
  }

  return (
    <>
      <Nav />

      <main style={styles.page}>
        <section style={styles.shell}>
          <div style={styles.logoWrap}>
  <RootEnso size={86} />
</div>

          <h1 style={styles.title}>Insights</h1>

          <p style={styles.subtitle}>
            A gentle pattern map built from your body signals, mind tools, and journal reflections.
          </p>

          <div style={styles.heroCard}>
            <p style={styles.kicker}>Current pattern</p>
            <h2 style={styles.heroText}>{insights.mainObservation}</h2>
            <p style={styles.heroSub}>{insights.suggestedFocus}</p>
          </div>

          <div style={styles.grid}>
            <InsightCard
              title="Body signals"
              empty="No body signals yet."
              rows={insights.commonSignals}
            />

            <InsightCard
              title="When they show up"
              empty="No context patterns yet."
              rows={insights.commonContexts}
            />

            <InsightCard
              title="Emotional themes"
              empty="No journal themes yet."
              rows={insights.emotionalThemes}
            />

            <InsightCard
              title="Tools used"
              empty="No mind tools used yet."
              rows={insights.toolsUsed}
            />
          </div>

          <div style={styles.timelinePanel}>
            <h2 style={styles.sectionTitle}>Recent activity</h2>

            <div style={styles.timelineGrid}>
              <RecentCard
                label="Latest body signal"
                title={insights.recentBody?.signal || "None yet"}
                meta={
                  insights.recentBody
                    ? `${insights.recentBody.context || "context unknown"} · ${insights.recentBody.intensity || "?"}/10 · ${formatDate(insights.recentBody.created_at)}`
                    : "Log a body signal to begin."
                }
              />

              <RecentCard
                label="Latest mind tool"
                title={insights.recentMind?.tool || "None yet"}
                meta={
                  insights.recentMind
                    ? `${insights.recentMind.emotion || "saved tool"} · ${formatDate(insights.recentMind.created_at)}`
                    : "Use a Mind & Emotions tool to build memory."
                }
              />

              <RecentCard
                label="Latest reflection"
                title={insights.recentJournal?.title || "None yet"}
                meta={
                  insights.recentJournal
                    ? `${insights.recentJournal.emotional_theme || "general reflection"} · ${formatDate(insights.recentJournal.created_at)}`
                    : "Add a journal reflection to see themes."
                }
              />
            </div>
          </div>

          <div style={styles.coachCard}>
            <p style={styles.kicker}>Suggested next step</p>
            <h2 style={styles.coachTitle}>Take this into Coach</h2>
            <p style={styles.coachText}>
              Ask Root Coach: “What patterns do you notice recently?” It can now use your body signals,
              mind tools, and journal reflections together.
            </p>
          </div>
        </section>
      </main>
    </>
  );
}

function InsightCard({ title, rows, empty }) {
  return (
    <div style={styles.card}>
      <h2 style={styles.cardTitle}>{title}</h2>

      {rows.length === 0 ? (
        <p style={styles.emptyText}>{empty}</p>
      ) : (
        rows.map(([label, count]) => (
          <div key={label} style={styles.row}>
            <span>{label}</span>
            <strong>{count}</strong>
          </div>
        ))
      )}
    </div>
  );
}

function RecentCard({ label, title, meta }) {
  return (
    <div style={styles.recentCard}>
      <p style={styles.kicker}>{label}</p>
      <h3 style={styles.recentTitle}>{title}</h3>
      <p style={styles.recentMeta}>{meta}</p>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #F7F5F2 0%, #E6E2DA 100%)",
    display: "flex",
    justifyContent: "center",
    padding: "24px",
  },
logoWrap: {
  display: "flex",
  justifyContent: "center",
  marginBottom: "10px",
},
  shell: {
    width: "100%",
    maxWidth: "1080px",
    background: "rgba(255,255,255,0.88)",
    borderRadius: "34px",
    padding: "34px",
    boxShadow: "0 24px 70px rgba(0,0,0,0.08)",
  },

  brandMark: {
    textAlign: "center",
    fontSize: "42px",
    marginBottom: "8px",
  },

  title: {
    textAlign: "center",
    fontSize: "38px",
    marginBottom: "10px",
    color: "#1A1A1A",
  },

  subtitle: {
    textAlign: "center",
    maxWidth: "720px",
    margin: "0 auto 30px",
    color: "#666",
    lineHeight: "1.7",
  },

  heroCard: {
    background: "#1A1A1A",
    color: "#FFFFFF",
    borderRadius: "30px",
    padding: "30px",
    marginBottom: "24px",
    boxShadow: "0 18px 50px rgba(0,0,0,0.12)",
  },

  kicker: {
    margin: "0 0 10px",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    opacity: 0.7,
    fontWeight: "700",
  },

  heroText: {
    margin: "0 0 12px",
    fontSize: "28px",
    lineHeight: "1.35",
  },

  heroSub: {
    margin: 0,
    lineHeight: "1.7",
    opacity: 0.85,
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
    gap: "16px",
    marginBottom: "24px",
  },

  card: {
    background: "#FFFFFF",
    borderRadius: "26px",
    padding: "24px",
    boxShadow: "0 12px 34px rgba(0,0,0,0.05)",
    border: "1px solid #EEE8DF",
  },

  cardTitle: {
    fontSize: "20px",
    margin: "0 0 16px",
    color: "#1A1A1A",
  },

  row: {
    display: "flex",
    justifyContent: "space-between",
    gap: "14px",
    padding: "10px 0",
    borderBottom: "1px solid #F0EDE7",
    color: "#333",
    textTransform: "capitalize",
  },

  emptyText: {
    color: "#777",
    lineHeight: "1.6",
  },

  timelinePanel: {
    background: "#FFFFFF",
    borderRadius: "30px",
    padding: "28px",
    boxShadow: "0 12px 34px rgba(0,0,0,0.05)",
    marginBottom: "24px",
  },

  sectionTitle: {
    margin: "0 0 18px",
    fontSize: "24px",
    color: "#1A1A1A",
  },

  timelineGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "14px",
  },

  recentCard: {
    background: "#F7F5F2",
    borderRadius: "22px",
    padding: "20px",
    border: "1px solid #E6E2DA",
  },

  recentTitle: {
    margin: "0 0 8px",
    color: "#1A1A1A",
    textTransform: "capitalize",
  },

  recentMeta: {
    margin: 0,
    color: "#666",
    lineHeight: "1.6",
  },

  coachCard: {
    background: "#F7F5F2",
    borderRadius: "28px",
    padding: "26px",
    border: "1px solid #E6E2DA",
  },

  coachTitle: {
    margin: "0 0 10px",
    fontSize: "24px",
    color: "#1A1A1A",
  },

  coachText: {
    margin: 0,
    color: "#555",
    lineHeight: "1.7",
  },
};
