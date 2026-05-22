"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import RootEnso from "../components/RootEnso";
import { buildRootReflection } from "../lib/rootReflectionEngine";
import Nav from "../components/Nav";

export default function Home() {
  const [latestInsight, setLatestInsight] = useState("");
  const [balanceScore, setBalanceScore] = useState(null);
  const [patternNote, setPatternNote] = useState("");
  const [trendNote, setTrendNote] = useState("");
  const [journey, setJourney] = useState(null);
  const [adaptiveGreeting, setAdaptiveGreeting] = useState("Welcome back");
  const [adaptiveTitle, setAdaptiveTitle] = useState(
  "How are you\nfeeling today?"
);
  const [adaptiveSubtitle, setAdaptiveSubtitle] = useState(
  "Listen to your body.\nUnderstand the pattern.\nReturn to balance."
);
  const [primaryAction, setPrimaryAction] = useState({
  href: "/body",
  title: "Start Body Check",
  text: "Scan. Reflect. Release.",
});

const [secondaryAction, setSecondaryAction] = useState({
  href: "/coach",
  title: "Open Root Coach",
  text: "Guidance. Clarity. Support.",
});

const [rootReflection, setRootReflection] = useState(null);  useEffect(() => {
  if (typeof window === "undefined") return;
  const storedJourney = localStorage.getItem("root_journey_v1");

if (storedJourney) {
  try {
    const parsed = JSON.parse(storedJourney);

    setJourney(parsed);

    if (parsed.completedInsights) {
      setAdaptiveGreeting("Welcome back to Root");

      if (parsed.focus === "anxiety") {
        setAdaptiveTitle(
          "Continue gently\nwith your\nnervous system."
        );

        setAdaptiveSubtitle(
          "Root is continuing to notice how stress,\nbody signals, and recovery patterns connect."
        );
      }
        const storedBody =
  JSON.parse(localStorage.getItem("root_body_entries_v1") || "[]");

const storedJournal =
  JSON.parse(localStorage.getItem("root_journal_entries_v1") || "[]");

const storedMind =
  JSON.parse(localStorage.getItem("root_mind_entries_v1") || "[]");

const reflection = buildRootReflection({
  bodySignals: storedBody,
  journalEntries: storedJournal,
  mindEntries: storedMind,
  journey: parsed,
});

setRootReflection(reflection);

if (reflection?.suggestedAction) {
  setPrimaryAction(reflection.suggestedAction);
}

      else if (parsed.focus === "sleep") {
        setAdaptiveTitle(
          "Support your\nrecovery and\nrest."
        );
        if (parsed.focus === "anxiety") {
  setPrimaryAction({
    href: "/coach",
    title: "Settle the system",
    text: "Grounding. Breath. Clarity.",
  });

  setSecondaryAction({
    href: "/journal",
    title: "Track the pattern",
    text: "Notice. Reflect. Understand.",
  });
} else if (parsed.focus === "sleep") {
  setPrimaryAction({
    href: "/coach",
    title: "Sleep wind-down",
    text: "Slow down. Soften. Rest.",
  });

  setSecondaryAction({
    href: "/journal",
    title: "Evening reflection",
    text: "Unload. Release. Recover.",
  });
} else {
  setPrimaryAction({
    href: "/body",
    title: "Continue check-in",
    text: "Listen. Notice. Learn.",
  });

  setSecondaryAction({
    href: "/insights",
    title: "View patterns",
    text: "Signals. Themes. Direction.",
  });
}

        setAdaptiveSubtitle(
          "Root is helping you understand sleep,\nrecovery load, and nervous system balance."
        );
      }

      else {
        setAdaptiveTitle(
          "Your Root\njourney is\ncontinuing."
        );

        setAdaptiveSubtitle(
          "Root is gently learning from your body,\nreflections, and emotional patterns over time."
        );
      }
    }
  } catch (err) {
    console.log(err);
  }
}

  const completed = localStorage.getItem("root_orientation_complete_v1");

  if (!completed) {
    window.location.href = "/orientation";
  }
}, []);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("body_signals")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (!data || data.length === 0) {
        setLatestInsight("No recent signals yet.");
        setPatternNote("Start tracking to begin building your pattern.");
        setTrendNote("Root Coach becomes more accurate over time.");
        setBalanceScore(null);
        return;
      }

      const latestAreas = data[0].areas || [];

      setLatestInsight(
        latestAreas.length > 0
          ? `Your body has recently been signalling around ${latestAreas.join(", ")}.`
          : "Your body has logged a recent signal."
      );

      const score = Math.max(
        20,
        Math.min(100, 100 - data.length * 3)
      );

      setBalanceScore(score);

      setPatternNote(
        "Digestion and stress patterns appear to be recurring this week."
      );

      setTrendNote(
        "Signals have been stronger in the last 24 hours."
      );
    };

    load();
  }, []);

 return (
  <main style={styles.page}>
    <Nav />
   <img
        src="/visuals/root-home-hero.png"
        alt="Root Health"
        style={styles.backgroundImage}
      />

      <div style={styles.overlay} />

      <div style={styles.content}>
        <div style={styles.leftSide}>
          <div style={styles.logoRow}>
            <RootEnso size={72} />

            <div>
              <p style={styles.brand}>ROOT HEALTH</p>
            </div>
          </div>

          <p style={styles.welcome}>
  {adaptiveGreeting}
</p>

         <h1 style={styles.title}>
  {adaptiveTitle.split("\n").map((line, index) => (
    <span key={index}>
      {line}
      <br />
    </span>
  ))}
</h1>
          <p style={styles.subtitle}>
  {adaptiveSubtitle.split("\n").map((line, index) => (
    <span key={index}>
      {line}
      <br />
    </span>
  ))}
</p>

  {rootReflection && (
  <div style={styles.continuityCard}>
    <p style={styles.continuityLabel}>
      Root reflection
    </p>

    <h2 style={styles.continuityTitle}>
      {rootReflection.title}
    </h2>

    <p style={styles.continuityText}>
      {rootReflection.reflection}
    </p>
  </div>
)}     
 <div style={styles.cardStack}>
  <a href={primaryAction.href} style={styles.primaryCard}>
    <div>
      <p style={styles.cardTitle}>
        {primaryAction.title}
      </p>

      <p style={styles.cardText}>
        {primaryAction.text}
      </p>
    </div>

    <span style={styles.arrow}>→</span>
  </a>

  <a href={secondaryAction.href} style={styles.secondaryCard}>
    <div>
      <p style={styles.secondaryTitle}>
        {secondaryAction.title}
      </p>

      <p style={styles.secondaryText}>
        {secondaryAction.text}
      </p>
    </div>

    <span style={styles.secondaryArrow}>→</span>
  </a>
</div>
<footer style={styles.footer}>
  <a href="/privacy" style={styles.footerLink}>Privacy</a>
  <span style={styles.footerDivider}>•</span>
  <a href="/safety" style={styles.footerLink}>Safety</a>
  <span style={styles.footerDivider}>•</span>
  <a href="/terms" style={styles.footerLink}>Terms</a>
</footer>

<div style={styles.insightCard}>
  <div style={styles.insightTop}>
    <p style={styles.insightHeading}>Today’s Insight</p>

    <div style={styles.liveBadge}>
      Live System Balance
    </div>
  </div>
            <div style={styles.insightContent}>
              <div style={styles.scoreSection}>
                <div style={styles.scoreCircle}>
                  <p style={styles.scoreText}>
                    {balanceScore !== null
                      ? `${balanceScore}%`
                      : "—"}
                  </p>
                </div>

                <p style={styles.balanceText}>
                  Moderate Balance
                </p>

                <p style={styles.balanceSub}>
                  Keep listening.
                  <br />
                  You’re on the path.
                </p>
              </div>

              <div style={styles.insightTextArea}>
                <p style={styles.insightText}>
                  {latestInsight}
                </p>

                <div style={styles.divider} />

                <p style={styles.insightText}>
                  {patternNote}
                </p>

                <div style={styles.divider} />

                <p style={styles.insightText}>
                  {trendNote}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

    
                  
    </main>
  );
}

const styles = {
  page: {
    position: "relative",
    minHeight: "100vh",
    overflow: "hidden",
    fontFamily: "Inter, sans-serif",
    background: "#000",
  },

  backgroundImage: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },

  overlay: {
    position: "absolute",
    inset: 0,
background:
  "linear-gradient(to right, rgba(245,236,222,0.96) 0%, rgba(245,236,222,0.88) 42%, rgba(0,0,0,0.18) 100%)",
  },

  content: {
    position: "relative",
    zIndex: 2,
    minHeight: "100vh",
    padding: "120px 54px 120px",
    display: "flex",
    alignItems: "flex-start",
  },

  leftSide: {
    width: "100%",
    maxWidth: "720px",
  },

  logoRow: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    marginBottom: "44px",
  },

  brand: {
    margin: 0,
    fontSize: "14px",
    letterSpacing: "0.18em",
    fontWeight: "700",
    color: "#111",
  },

  welcome: {
    fontSize: "18px",
    color: "#364131",
    marginBottom: "12px",
  },

  title: {
    fontSize: "88px",
    lineHeight: "0.95",
    margin: "0 0 24px",
    fontWeight: "500",
    color: "#111",
    letterSpacing: "-0.06em",
    fontFamily: "Georgia, serif",
  },

  subtitle: {
    fontSize: "24px",
    lineHeight: "1.7",
    color: "#283128",
    marginBottom: "42px",
  },
  

  cardStack: {
    display: "flex",
    flexDirection: "column",
    gap: "18px",
    maxWidth: "520px",
  },

  primaryCard: {
    background:
      "linear-gradient(135deg, rgba(44,62,43,0.96), rgba(56,78,52,0.92))",
    borderRadius: "28px",
    padding: "28px 34px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    textDecoration: "none",
    boxShadow: "0 24px 70px rgba(0,0,0,0.22)",
  },

  cardTitle: {
    color: "#FFF",
    margin: 0,
    fontSize: "32px",
    fontWeight: "600",
  },

  cardText: {
    color: "rgba(255,255,255,0.82)",
    marginTop: "8px",
    fontSize: "20px",
  },

  arrow: {
    color: "#FFF",
    fontSize: "42px",
  },

  secondaryCard: {
    background: "#F7F1E8",
    borderRadius: "28px",
    padding: "28px 34px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    textDecoration: "none",
  },

  secondaryTitle: {
    color: "#111",
    margin: 0,
    fontSize: "30px",
    fontWeight: "600",
  },

  secondaryText: {
    color: "#555",
    marginTop: "8px",
    fontSize: "19px",
  },

  secondaryArrow: {
    color: "#111",
    fontSize: "42px",
  },

 insightCard: {
  marginTop: "34px",
  background: "rgba(255,255,255,0.18)",
  border: "1px solid rgba(255,255,255,0.28)",
  borderRadius: "34px",
  padding: "32px",
  maxWidth: "760px",
  backdropFilter: "blur(18px)",
  WebkitBackdropFilter: "blur(18px)",
  boxShadow: "0 24px 60px rgba(0,0,0,0.14)",
},

  insightTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "26px",
  },

  insightHeading: {
    fontSize: "28px",
    margin: 0,
    color: "#111",
    fontWeight: "600",
  },

  liveBadge: {
    background: "rgba(223,215,198,0.9)",
    padding: "10px 18px",
    borderRadius: "999px",
    fontSize: "14px",
    color: "#444",
  },

  insightContent: {
    display: "grid",
    gridTemplateColumns: "260px 1fr",
    gap: "34px",
  },

  scoreSection: {
    textAlign: "center",
  },

  scoreCircle: {
    width: "180px",
    height: "180px",
    borderRadius: "50%",
    border: "14px solid #556B4D",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 24px",
    background: "#F8F3EA",
  },

  scoreText: {
    fontSize: "52px",
    margin: 0,
    fontWeight: "700",
    color: "#111",
  },

  balanceText: {
    fontSize: "28px",
    marginBottom: "12px",
    color: "#111",
    fontWeight: "600",
  },

  balanceSub: {
    fontSize: "18px",
    color: "#555",
    lineHeight: "1.6",
  },

  insightTextArea: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },

  insightText: {
    fontSize: "22px",
    lineHeight: "1.7",
    color: "#222",
    margin: 0,
  },

  divider: {
    height: "1px",
    background: "rgba(0,0,0,0.08)",
  },

 footer: {
  position: "fixed",
  bottom: "18px",
  left: "50%",
  transform: "translateX(-50%)",
  zIndex: 20,
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "10px 18px",
  borderRadius: "999px",
  background: "rgba(20,20,20,0.28)",
  border: "1px solid rgba(255,255,255,0.18)",
  backdropFilter: "blur(12px)",
},

footerLink: {
  color: "rgba(255,255,255,0.82)",
  textDecoration: "none",
  fontSize: "13px",
  letterSpacing: "0.04em",
},
footerDivider: {
  color: "rgba(255,255,255,0.36)",
  fontSize: "12px",
},
  continuityCard: {
  maxWidth: "720px",
  marginBottom: "28px",
  padding: "26px",
  borderRadius: "30px",
  background: "rgba(255,255,255,0.18)",
  border: "1px solid rgba(255,255,255,0.28)",
  backdropFilter: "blur(18px)",
  WebkitBackdropFilter: "blur(18px)",
  boxShadow: "0 18px 48px rgba(20,18,15,0.10)",
},

continuityLabel: {
  margin: "0 0 12px",
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  color: "#364131",
  fontWeight: "800",
},

continuityText: {
  margin: 0,
  fontSize: "18px",
  lineHeight: "1.8",
  color: "#283128",
},
  continuityTitle: {
  margin: "0 0 14px",
  fontFamily: "Georgia, serif",
  fontSize: "30px",
  lineHeight: "1.3",
  color: "#1F281D",
  fontWeight: "500",
},
};
