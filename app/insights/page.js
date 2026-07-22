"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import Nav from "../../components/Nav";
import RootEnso from "../../components/RootEnso";
import RootAtmosphere from "../../components/RootAtmosphere";
import { buildRootReflection } from "../../lib/rootReflectionEngine";
import { getCurrentProfileKey } from "../../lib/currentUser";
import { getInsightsPageModel } from "../../lib/rootCore/rootInsightEngine";
import { getRootMeasurementHistory } from "../../lib/rootCore/rootMemory";

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
  const [measurements, setMeasurements] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [journey, setJourney] = useState(null);
  const [rootReflection, setRootReflection] = useState(null);
  const [rootCoreModel, setRootCoreModel] = useState(null);

 useEffect(() => {
  loadInsights();

  const stored = localStorage.getItem("root_journey_v1");

  if (!stored) return;

  try {
    setJourney(JSON.parse(stored));
  } catch (err) {
    console.log(err);
  }
}, []);
useEffect(() => {
  if (!journey) return;

  setRootReflection(
    buildRootReflection({
      bodySignals,
      journalEntries,
      mindEntries,
      journey,
    })
  );
}, [
  journey,
  bodySignals,
  journalEntries,
  mindEntries,
]);
 const loadInsights = async () => {
  let profileKey = getCurrentProfileKey();

  const activeExperience =
    localStorage.getItem("root_active_experience_v1") ||
    "personal";

  if (activeExperience === "personal") {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error(
        "INSIGHTS USER IDENTITY ERROR:",
        userError
      );
    }

    if (user) {
      const {
        data: personalProfile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("profile_key")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error(
          "INSIGHTS PERSONAL PROFILE ERROR:",
          profileError
        );
      }

      if (personalProfile?.profile_key) {
        profileKey = personalProfile.profile_key;
      }
    }
  }

  if (!profileKey) {
    setLoading(false);
    return;
  }

  console.log(
    "INSIGHTS ACTIVE PROFILE:",
    profileKey
  );

  const {
  data: bodyData,
  error: bodyError,
} = await supabase
  .from("body_signals")
  .select("*")
  .from("body_signals")
.select("*")
.eq("profile_key", profileKey)
.order("created_at", { ascending: false })
.limit(30);

if (bodyError) {
  console.error(
    "INSIGHTS BODY SIGNALS ERROR:",
    bodyError
  );
}

console.log(
  "INSIGHTS BODY SIGNALS:",
  bodyData
);

const {
  data: mindData,
  error: mindError,
} = await supabase
  .from("mind_entries")
  .select("*")
  .eq("profile_key", profileKey)
  .order("created_at", { ascending: false })
  .limit(30);

if (mindError) {
  console.error(
    "INSIGHTS MIND ENTRIES ERROR:",
    mindError
  );
}

console.log(
  "INSIGHTS MIND ENTRIES:",
  mindData
);


const {
  data: journalData,
  error: journalError,
} = await supabase
  .from("journal_entries")
  .select("*")
  .eq("profile_key", profileKey)
  .order("created_at", { ascending: false })
  .limit(30);

if (journalError) {
  console.error(
    "INSIGHTS JOURNAL ENTRIES ERROR:",
    journalError
  );
}

console.log(
  "INSIGHTS JOURNAL ENTRIES:",
  journalData
);

 const {
  data: assessmentData,
  error: assessmentError,
} = await supabase
  .from("wellbeing_assessments")
  .select("*")
  .eq("profile_key", profileKey)
  .order("created_at", { ascending: true })
  .limit(100);

if (assessmentError) {
  console.error(
    "INSIGHTS ASSESSMENT LOAD ERROR:",
    JSON.stringify(
      assessmentError,
      null,
      2
    )
  );
}

setBodySignals(Array.isArray(bodyData) ? bodyData : []);
setMindEntries(Array.isArray(mindData) ? mindData : []);
setJournalEntries(Array.isArray(journalData) ? journalData : []);
setAssessments(
  Array.isArray(assessmentData)
    ? assessmentData
    : []
);

console.log(
  "INSIGHTS WELLBEING HISTORY:",
  assessmentData
);
    try {
  const measurementHistory = await getRootMeasurementHistory({
    limit: 50,
  });
  console.log(
  "INSIGHTS MEASUREMENT HISTORY:",
  measurementHistory
);

  setMeasurements(
    Array.isArray(measurementHistory)
      ? measurementHistory
      : []
  );
} catch (error) {
  console.error("Measurement history could not load:", error);
  setMeasurements([]);
}

try {
  const rootModel = await getInsightsPageModel({
    limit: 1,
    includeRecentlyShown: true,
  });

  setRootCoreModel(rootModel);
} catch (error) {
  console.error("Root Insight Engine could not load:", error);
  setRootCoreModel(null);
}

setLoading(false);
  };

    const measurementSummary = useMemo(() => {
  if (!measurements.length) return null;

  const improved = measurements.filter(
    (m) => Number(m.improvement_score) > 0
  ).length;

  const unchanged = measurements.filter(
    (m) => Number(m.improvement_score) === 0
  ).length;

  const worsened = measurements.filter(
    (m) => Number(m.improvement_score) < 0
  ).length;

  return {
    improved,
    unchanged,
    worsened,
    total: measurements.length,
  };
}, [measurements]);
const wellbeingProgress = useMemo(() => {
  if (assessments.length < 2) {
    return {
      rows: [],
      improved: 0,
      unchanged: 0,
      worsened: 0,
    };
  }

  const first = assessments[0];
  const latest =
    assessments[assessments.length - 1];

  const measures = [
    {
      label: "Stress",
      keys: ["stress", "stress_score"],
    },
    {
      label: "Sleep difficulties",
      keys: ["sleep", "sleep_score"],
    },
    {
      label: "Recovery difficulty",
      keys: ["recovery", "recovery_score"],
    },
    {
      label: "Energy difficulty",
      keys: ["energy", "energy_score"],
    },
    {
      label: "Low mood",
      keys: ["mood", "mood_score"],
    },
    {
      label: "Focus difficulty",
      keys: ["focus", "focus_score"],
    },
    {
      label: "Burnout",
      keys: ["burnout", "burnout_score"],
    },
  ];

  const readScore = (assessment, keys) => {
    for (const key of keys) {
      const value = assessment?.[key];

      if (
        value !== null &&
        value !== undefined &&
        value !== ""
      ) {
        const number = Number(value);

        if (Number.isFinite(number)) {
          return number;
        }
      }
    }

    return null;
  };

  let improved = 0;
  let unchanged = 0;
  let worsened = 0;

  const rows = measures
    .map(({ label, keys }) => {
      const start = readScore(first, keys);
      const current = readScore(latest, keys);

      if (start === null || current === null) {
        return null;
      }

      const difference = current - start;

      if (difference < 0) improved += 1;
      if (difference === 0) unchanged += 1;
      if (difference > 0) worsened += 1;

      const direction =
        difference < 0
          ? "Improved"
          : difference > 0
            ? "Worsened"
            : "Unchanged";

      return [
        label,
        `${start} → ${current}`,
        direction,
      ];
    })
    .filter(Boolean);

  return {
    rows,
    improved,
    unchanged,
    worsened,
  };
}, [assessments]);

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
      <RootAtmosphere type="reflection">
  <Nav />

  <main style={styles.page}>
          <section style={styles.shell}>
            <p>Loading insights...</p>
          </section>
               </main>
      </RootAtmosphere>
    );
  }
  return (
  <RootAtmosphere type="reflection">
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
    
          {journey?.currentStage === "insights" && (
  <div style={styles.journeyReveal}>
    <p style={styles.journeyLabel}>
      Your first Root journey
    </p>

    <h2 style={styles.journeyTitle}>
      Root is beginning to connect the signals from your journey.
    </h2>

    <p style={styles.journeyText}>
      Your body signals, emotional reflections, nervous system patterns,
      and support tools are beginning to form a gentle wellbeing map.
    </p>
  </div>
)}
         {rootReflection && (
  <div style={styles.heroCard}>
    <p style={styles.heroLabel}>
  Root has noticed...
</p>

   <h2 style={styles.heroTitle}>
  {rootReflection.title}
</h2>

<p style={styles.heroConfidence}>
  Based on your recent body signals, reflections and wellbeing check-ins.
</p>


    <p style={styles.heroText}>
      {rootReflection.reflection}
    </p>

    <a
      href={rootReflection.suggestedAction.href}
      style={styles.heroButton}
    >
      {rootReflection.suggestedAction.title} →
    </a>
  </div>
)}

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

            <ProgressCard
  title="Your wellbeing progress"
  assessments={assessments}
  progress={wellbeingProgress}
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
                {journey?.currentStage === "insights" && (
  <div style={styles.completePanel}>
    <p style={styles.completeLabel}>
      Root journey complete
    </p>

    <h2 style={styles.completeTitle}>
      Your Root homepage is ready.
    </h2>

    <p style={styles.completeText}>
      Root will now continue learning gently from:
      your body check-ins,
      emotional reflections,
      nervous system patterns,
      and recovery journey over time.
    </p>

    <a
      href="/"
      style={styles.completeButton}
      onClick={() => {
        const updatedJourney = {
          ...journey,
          completedInsights: true,
          onboardingComplete: true,
          currentStage: "complete",
        };

        localStorage.setItem(
          "root_journey_v1",
          JSON.stringify(updatedJourney)
        );

        localStorage.setItem(
          "root_orientation_complete_v1",
          "true"
        );
      }}
    >
      Enter My Root Homepage →
    </a>
  </div>
)}
        </section>
        </main>
</RootAtmosphere>
);
}

function ProgressCard({
  title,
  assessments,
  progress,
}) {
  if (assessments.length < 2) {
    return (
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>{title}</h2>

        <p style={styles.emptyText}>
          Complete at least two check-ins to see
          your progress.
        </p>
      </div>
    );
  }

  return (
    <div style={styles.card}>
      <h2 style={styles.cardTitle}>{title}</h2>

      <p style={styles.progressSummary}>
        {progress.improved} improved ·{" "}
        {progress.unchanged} unchanged ·{" "}
        {progress.worsened} worsened
      </p>

      {progress.rows.length === 0 ? (
  <p style={styles.emptyText}>
    Root found your check-ins but could not read
    their scores yet.
  </p>
) : (
  progress.rows.map(
  ([label, movement, direction]) => (
    <div key={label} style={styles.progressRow}>
      <span style={styles.progressLabel}>
        {label}
      </span>

      <span style={styles.progressResult}>
        {movement} · {direction}
      </span>
    </div>
  )
)
)}
    </div>
  );
}
function InsightCard({ title, rows, empty }) {
  return (
    <div style={styles.card}>
      <h2 style={styles.cardTitle}>{title}</h2>

      {rows.length === 0 ? (
        <p style={styles.emptyText}>{empty}</p>
      ) : (
        <>
          <p style={styles.insightHeadline}>
            {rows[0][0]}
          </p>

          <p style={styles.insightNarrative}>
            {rows[0][0]} has appeared {rows[0][1]}{" "}
            {rows[0][1] === 1 ? "time" : "times"} recently.
          </p>

          {rows.length > 1 && (
            <p style={styles.insightSecondary}>
              Also noticed:{" "}
              {rows
                .slice(1)
                .map(([label]) => label)
                .join(", ")}.
            </p>
          )}
        </>
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
  background: "rgba(255,255,255,0.24)",
  border: "1px solid rgba(255,255,255,0.42)",
  backdropFilter: "blur(28px)",
  borderRadius: "42px",
  padding: "38px",
  boxShadow: "0 30px 90px rgba(20,18,15,0.16)",
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
   background: "linear-gradient(135deg, rgba(24,24,24,0.54), rgba(42,38,34,0.42))",
    backdropFilter: "blur(18px)",
    border: "1px solid rgba(255,255,255,0.18)",
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
  heroConfidence: {
  margin: "0 0 18px",
  fontSize: "13px",
  color: "rgba(255,255,255,0.68)",
  letterSpacing: "0.02em",
},

  heroSub: {
    margin: 0,
    lineHeight: "1.7",
    opacity: 0.85,
  },
  heroButton: {
  marginTop: "18px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  textDecoration: "none",
  background: "#181818",
  color: "#FFFFFF",
  borderRadius: "999px",
  padding: "14px 20px",
  fontSize: "14px",
  fontWeight: "700",
},

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
    gap: "16px",
    marginBottom: "24px",
  },

  card: {
  background: "rgba(255,255,255,0.22)",
  borderRadius: "28px",
  padding: "24px",
  boxShadow: "0 14px 40px rgba(0,0,0,0.08)",
  border: "1px solid rgba(255,255,255,0.34)",
  backdropFilter: "blur(18px)",
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

  insightHeadline: {
  margin: "4px 0 10px",
  fontSize: "20px",
  fontWeight: "700",
  color: "#1A1A1A",
  textTransform: "capitalize",
},

insightNarrative: {
  margin: "0 0 10px",
  lineHeight: "1.7",
  color: "#555",
},

insightSecondary: {
  margin: 0,
  fontSize: "13px",
  color: "#777",
  lineHeight: "1.6",
},

  progressSummary: {
  margin: "0 0 8px",
  color: "#666",
  fontSize: "12px",
  lineHeight: "1.4",
  fontWeight: "700",
},

progressRow: {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "10px",
  padding: "7px 0",
  borderBottom: "1px solid #F0EDE7",
  color: "#333",
  width: "100%",
  minWidth: 0,
},

progressLabel: {
  minWidth: 0,
  fontSize: "13px",
  lineHeight: "1.35",
},

progressResult: {
  flexShrink: 0,
  color: "#555",
  fontSize: "12px",
  lineHeight: "1.35",
  textAlign: "right",
  whiteSpace: "nowrap",
},

  timelinePanel: {
  background: "rgba(255,255,255,0.20)",
  borderRadius: "34px",
  padding: "30px",
  backdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.34)",
  boxShadow: "0 14px 44px rgba(0,0,0,0.08)",
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
  background: "rgba(255,255,255,0.18)",
  borderRadius: "24px",
  padding: "22px",
  border: "1px solid rgba(255,255,255,0.28)",
  backdropFilter: "blur(14px)",
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
  background: "rgba(255,255,255,0.20)",
  borderRadius: "30px",
  padding: "28px",
  border: "1px solid rgba(255,255,255,0.34)",
  backdropFilter: "blur(18px)",
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
  journeyReveal: {
  marginBottom: "24px",
  background: "rgba(24,24,24,0.44)",
  borderRadius: "34px",
  padding: "32px",
  color: "#FFFFFF",
  border: "1px solid rgba(255,255,255,0.16)",
  backdropFilter: "blur(18px)",
},

journeyLabel: {
  margin: "0 0 10px",
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  color: "rgba(255,255,255,0.72)",
  fontWeight: "800",
},

journeyTitle: {
  margin: "0 0 14px",
  fontFamily: "Georgia, serif",
  fontSize: "34px",
  lineHeight: "1.25",
  fontWeight: "500",
},

journeyText: {
  margin: 0,
  lineHeight: "1.85",
  color: "rgba(255,255,255,0.82)",
},

completePanel: {
  marginTop: "24px",
  background: "rgba(255,255,255,0.56)",
  borderRadius: "34px",
  padding: "30px",
  border: "1px solid rgba(255,255,255,0.72)",
  boxShadow: "0 18px 48px rgba(20,18,15,0.08)",
},

completeLabel: {
  margin: "0 0 10px",
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  color: "#776C5B",
  fontWeight: "800",
},

completeTitle: {
  margin: "0 0 14px",
  fontFamily: "Georgia, serif",
  fontSize: "32px",
  fontWeight: "500",
  color: "#2A261F",
},

completeText: {
  margin: "0 0 20px",
  lineHeight: "1.8",
  color: "#4D463B",
},

completeButton: {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  textDecoration: "none",
  background: "#181818",
  color: "#FFFFFF",
  borderRadius: "999px",
  padding: "14px 22px",
  fontSize: "14px",
  fontWeight: "700",
},
};
