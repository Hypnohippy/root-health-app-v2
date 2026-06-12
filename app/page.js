"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import RootEnso from "../components/RootEnso";
import Nav from "../components/Nav";
import { buildRootReflection } from "../lib/rootReflectionEngine";
import { buildLongitudinalMemory } from "../lib/rootLongitudinalEngine";
import { buildRelationalMemory } from "../lib/rootRelationalMemory";
import { buildProactiveCare } from "../lib/rootProactiveCare";
import { buildDailyRhythm } from "../lib/rootDailyRhythm";
import { buildPriorityFeed } from "../lib/rootPriorityFeed";
import { buildRootMemoryService } from "../lib/rootMemoryService";

const progressMetrics = [
  ["stress_score", "Stress"],
  ["sleep_score", "Sleep Difficulties"],
  ["recovery_score", "Recovery Difficulty"],
  ["energy_score", "Low Energy"],
  ["mood_score", "Low Mood"],
  ["focus_score", "Focus Difficulties"],
  ["burnout_score", "Burnout"],
];

function scoreValue(value) {
  if (value === null || value === undefined) return "—";
  return value;
}

function calculateSymptomLoad(assessment) {
  if (!assessment) return null;

  const values = progressMetrics
    .map(([key]) => Number(assessment[key]))
    .filter((value) => !Number.isNaN(value));

  if (values.length === 0) return null;

  return values.reduce((sum, value) => sum + value, 0);
}

function MiniInsightCard({
  id,
  label,
  title,
  summary,
  openCard,
  setOpenCard,
  children,
  dark = false,
}) {
  const isOpen = openCard === id;

  return (
    <section style={dark ? styles.miniCardDark : styles.miniCard}>
      <button
        style={styles.miniCardButton}
        onClick={() => setOpenCard(isOpen ? null : id)}
      >
        <div>
          <p style={dark ? styles.miniLabelDark : styles.miniLabel}>{label}</p>
          <h2 style={dark ? styles.miniTitleDark : styles.miniTitle}>
            {title}
          </h2>
          <p style={dark ? styles.miniSummaryDark : styles.miniSummary}>
            {summary}
          </p>
        </div>

        <span style={dark ? styles.expandIconDark : styles.expandIcon}>
          {isOpen ? "−" : "+"}
        </span>
      </button>

      {isOpen && <div style={styles.expandedContent}>{children}</div>}
    </section>
  );
}

export default function Home() {
  const [journey, setJourney] = useState(null);
  const [userName, setUserName] = useState("");

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

  const [rootReflection, setRootReflection] = useState(null);
  const [longitudinalMemory, setLongitudinalMemory] = useState(null);
  const [relationalMemory, setRelationalMemory] = useState(null);
  const [proactiveCare, setProactiveCare] = useState(null);
  const [dailyRhythm, setDailyRhythm] = useState(null);
  const [priorityFeed, setPriorityFeed] = useState([]);

  const [rootGuidance, setRootGuidance] = useState(null);
  const [rootMemoryNarrative, setRootMemoryNarrative] = useState("");
  const [rootHypothesis, setRootHypothesis] = useState("");
  const [rootConfidence, setRootConfidence] = useState("");
  const [rootRecognition, setRootRecognition] = useState("");
  const [dailyReflection, setDailyReflection] = useState("");
  const [interventionInsight, setInterventionInsight] = useState("");
  const [livingMessage, setLivingMessage] = useState("");

  const [latestAssessment, setLatestAssessment] = useState(null);
  const [baselineAssessment, setBaselineAssessment] = useState(null);

  const [openCard, setOpenCard] = useState(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const completed = localStorage.getItem("root_orientation_complete_v1");

    if (!completed) {
      window.location.href = "/orientation";
      return;
    }

    const storedJourney = localStorage.getItem("root_journey_v1");

    if (storedJourney) {
      try {
        const parsed = JSON.parse(storedJourney);
        setJourney(parsed);

        if (parsed.completedInsights) {
          setAdaptiveGreeting("Welcome back to Root");

          if (parsed.focus === "anxiety") {
            setAdaptiveTitle("Continue gently\nwith your\nnervous system.");
            setAdaptiveSubtitle(
              "Root is continuing to notice how stress,\nbody signals, and recovery patterns connect."
            );
          } else if (parsed.focus === "sleep") {
            setAdaptiveTitle("Support your\nrecovery and\nrest.");
            setAdaptiveSubtitle(
              "Root is helping you understand sleep,\nrecovery load, and nervous system balance."
            );
          } else {
            setAdaptiveTitle("Your Root\njourney is\ncontinuing.");
            setAdaptiveSubtitle(
              "Root is gently learning from your body,\nreflections, and emotional patterns over time."
            );
          }
        }
      } catch (error) {
        console.log(error);
      }
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      let loadedName = "";

      const { data: profile } = await supabase
        .from("profiles")
        .select("name")
        .eq("profile_key", "main")
        .maybeSingle();

      if (profile?.name) {
        const firstName = profile.name.trim().split(" ")[0];
        loadedName = firstName;
        setUserName(firstName);
      }

      const { data: bodyData } = await supabase
        .from("body_signals")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(40);

      const { data: journalData } = await supabase
        .from("journal_entries")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(40);

      const { data: mindData } = await supabase
        .from("mind_entries")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(40);

      const { data: assessmentData } = await supabase
        .from("wellbeing_assessments")
        .select("*")
        .eq("profile_key", "main")
        .order("created_at", { ascending: false })
        .limit(20);

      const safeBody = Array.isArray(bodyData) ? bodyData : [];
      const safeJournal = Array.isArray(journalData) ? journalData : [];
      const safeMind = Array.isArray(mindData) ? mindData : [];
      const safeAssessments = Array.isArray(assessmentData)
        ? assessmentData
        : [];

      const latestSavedAssessment = safeAssessments[0] || null;
      const baselineSavedAssessment =
        safeAssessments.find((item) => item.assessment_type === "baseline") ||
        null;

      setLatestAssessment(latestSavedAssessment);
      setBaselineAssessment(baselineSavedAssessment);

      const reflection = buildRootReflection({
        bodySignals: safeBody,
        journalEntries: safeJournal,
        mindEntries: safeMind,
        journey,
      });

      setRootReflection(reflection);

      const memory = buildLongitudinalMemory({
        bodySignals: safeBody,
        journalEntries: safeJournal,
        mindEntries: safeMind,
      });

      setLongitudinalMemory(memory);

      const relational = buildRelationalMemory({
        bodySignals: safeBody,
        journalEntries: safeJournal,
        mindEntries: safeMind,
      });

      setRelationalMemory(relational);

      const proactive = buildProactiveCare({
        longitudinalMemory: memory,
        relationalMemory: relational,
      });

      setProactiveCare(proactive);

      const rhythm = buildDailyRhythm({
        bodySignals: safeBody,
      });

      setDailyRhythm(rhythm);

      const feed = buildPriorityFeed({
        rootReflection: reflection,
        longitudinalMemory: memory,
        relationalMemory: relational,
        proactiveCare: proactive,
        dailyRhythm: rhythm,
      });

      setPriorityFeed(feed);

      if (reflection?.suggestedAction) {
        setPrimaryAction(reflection.suggestedAction);
      } else if (journey?.focus === "sleep") {
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
        setSecondaryAction({
          href: "/insights",
          title: "View Insights",
          text: "Patterns. Progress. Direction.",
        });
      }

      const rootMemory = buildRootMemoryService({
        name: loadedName,
        bodySignals: safeBody,
        journalEntries: safeJournal,
        mindEntries: safeMind,
      });

      setRootRecognition(rootMemory.recognition || "");
      setRootMemoryNarrative(rootMemory.memory || "");
      setInterventionInsight(rootMemory.interventionInsight || "");
      setRootHypothesis(rootMemory.hypothesis || "");
      setDailyReflection(rootMemory.dailyReflection || "");

      const recentMindEmotion = safeMind[0]?.emotion;
      const recentBodySignal = safeBody[0]?.signal;

      if (loadedName && recentMindEmotion) {
        setLivingMessage(
          `${loadedName}, ${recentMindEmotion} has shown up recently. A gentle next step may help before trying to solve everything at once.`
        );
      } else if (loadedName && recentBodySignal) {
        setLivingMessage(
          `${loadedName}, your body has been signalling around ${recentBodySignal}. It may be worth listening gently rather than pushing through.`
        );
      } else if (loadedName) {
        setLivingMessage(
          `${loadedName}, Root is beginning to learn your patterns. Small check-ins will make this feel more personal over time.`
        );
      }

      const evidenceCount =
        (memory?.topEmotionalTheme ? 1 : 0) +
        (memory?.topBodyPattern ? 1 : 0) +
        safeMind.length +
        safeBody.length;

      if (loadedName && evidenceCount >= 20) {
        setRootConfidence(
          "Root is becoming more confident in this pattern, though it will keep watching gently."
        );
      } else if (loadedName && evidenceCount >= 5) {
        setRootConfidence(
          "Root has seen this pattern a few times, but it is still learning."
        );
      } else if (loadedName) {
        setRootConfidence(
          "Root does not have enough evidence yet. A few more check-ins will help the picture become clearer."
        );
      }

      let guidance = null;

      if (
        memory?.topEmotionalTheme &&
        memory.topEmotionalTheme.toLowerCase().includes("panic")
      ) {
        guidance = {
          title: loadedName
            ? `${loadedName}, your nervous system may need safety before reflection.`
            : "Your nervous system may need safety before reflection.",
          why: "Recent emotional patterns suggest your system may be carrying heightened activation.",
          recommendation:
            "Grounding and slower breathing may help reduce internal threat scanning and support steadier regulation.",
          science:
            "When the nervous system begins orienting back toward safety, emotional processing often becomes clearer and less overwhelming.",
          action: {
            href: "/mind",
            label: "Begin Panic Reset",
          },
        };
      } else {
        guidance = {
          title: loadedName
            ? `${loadedName}, Root is continuing to learn your patterns gently over time.`
            : "Root is continuing to learn your patterns gently over time.",
          why: "Your recent signals are helping Root understand emotional rhythms, recovery, and behavioural trends.",
          recommendation:
            "Small consistent check-ins often create more meaningful long-term awareness than intensity alone.",
          science:
            "Regular reflective practice supports self-awareness, resilience, and nervous-system regulation.",
          action: {
            href: "/body",
            label: "Continue check-in",
          },
        };
      }

      setRootGuidance(guidance);
    };

    load();
  }, [journey]);

  const baselineLoad = useMemo(
    () => calculateSymptomLoad(baselineAssessment),
    [baselineAssessment]
  );

  const latestLoad = useMemo(
    () => calculateSymptomLoad(latestAssessment),
    [latestAssessment]
  );

  const progressSummary = useMemo(() => {
    if (!baselineAssessment || !latestAssessment) {
      return "Complete a Root Check-In to begin seeing your progress picture.";
    }

    if (baselineLoad === null || latestLoad === null) {
      return "Root is collecting enough check-in data to show your progress picture.";
    }

    if (latestLoad < baselineLoad) {
      return "Your overall symptom load has reduced since your first reflection.";
    }

    if (latestLoad > baselineLoad) {
      return "Your overall symptom load is higher than your first reflection. Root may need to support recovery more gently.";
    }

    return "Your overall symptom load is steady. Root will keep watching what changes over time.";
  }, [baselineAssessment, latestAssessment, baselineLoad, latestLoad]);

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
        <section style={styles.leftSide}>
          <div style={styles.logoRow}>
            <RootEnso size={72} />

            <div>
              <p style={styles.brand}>ROOT HEALTH</p>
            </div>
          </div>

          <p style={styles.welcome}>{adaptiveGreeting}</p>

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

          <div style={styles.cardStack}>
            <a href={primaryAction.href} style={styles.primaryCard}>
              <div>
                <p style={styles.cardTitle}>{primaryAction.title}</p>
                <p style={styles.cardText}>{primaryAction.text}</p>
              </div>

              <span style={styles.arrow}>→</span>
            </a>

            <a href={secondaryAction.href} style={styles.secondaryCard}>
              <div>
                <p style={styles.secondaryTitle}>{secondaryAction.title}</p>
                <p style={styles.secondaryText}>{secondaryAction.text}</p>
              </div>

              <span style={styles.secondaryArrow}>→</span>
            </a>
          </div>

          <section style={styles.insightStack}>
            {latestAssessment && (
              <MiniInsightCard
                id="progress"
                label="Progress Picture"
                title={
                  latestLoad !== null && baselineLoad !== null
                    ? `Symptom load ${baselineLoad} → ${latestLoad}`
                    : "Root is tracking your wellbeing scores."
                }
                summary={progressSummary}
                openCard={openCard}
                setOpenCard={setOpenCard}
              >
                <div style={styles.progressGrid}>
                  {progressMetrics.map(([key, label]) => (
                    <div key={key} style={styles.progressMetric}>
                      <span>{label}</span>
                      <strong>
                        {scoreValue(baselineAssessment?.[key])} →{" "}
                        {scoreValue(latestAssessment?.[key])}
                      </strong>
                    </div>
                  ))}
                </div>

                <div style={styles.actionRow}>
                  <a href="/assessment" style={styles.smallButtonDark}>
                    Add new check-in →
                  </a>

                  <a href="/insights" style={styles.smallButtonLight}>
                    View insights →
                  </a>
                </div>
              </MiniInsightCard>
            )}

            {rootRecognition && (
              <MiniInsightCard
                id="recognition"
                label="What Root noticed"
                title="A recent pattern is becoming visible."
                summary={rootRecognition}
                openCard={openCard}
                setOpenCard={setOpenCard}
                dark
              >
                <p style={styles.expandedText}>
  Root will keep watching this gently as more check-ins, reflections, and body signals are added.
</p>
              </MiniInsightCard>
            )}

            {dailyReflection && (
              <MiniInsightCard
                id="daily"
                label="Today’s Root Reflection"
                title="A quiet note from your recent signals."
                summary={dailyReflection}
                openCard={openCard}
                setOpenCard={setOpenCard}
              >
               <p style={styles.expandedText}>
  This reflection is drawn from your recent Root activity. Use it as a gentle prompt rather than a fixed conclusion.
</p>
              </MiniInsightCard>
            )}

            {livingMessage && (
              <MiniInsightCard
                id="living"
                label="Today’s Reflection"
                title="What may matter today."
                summary={livingMessage}
                openCard={openCard}
                setOpenCard={setOpenCard}
              >
                <p style={styles.expandedText}>
  A small next step may be enough today. Root will keep connecting this with your wider pattern over time.
</p>
              </MiniInsightCard>
            )}

            {rootMemoryNarrative && (
              <MiniInsightCard
                id="memory"
                label="Root’s memory of you"
                title="Root is building continuity."
                summary={rootMemoryNarrative}
                openCard={openCard}
                setOpenCard={setOpenCard}
              >
                <p style={styles.expandedText}>{rootMemoryNarrative}</p>

                {rootHypothesis && (
                  <div style={styles.hypothesisPanel}>
                    <p style={styles.hypothesisLabel}>
                      Root’s current hypothesis
                    </p>
                    <p style={styles.hypothesisText}>{rootHypothesis}</p>

                    {rootConfidence && (
                      <p style={styles.confidenceText}>{rootConfidence}</p>
                    )}
                  </div>
                )}
              </MiniInsightCard>
            )}

            {rootGuidance && (
              <MiniInsightCard
                id="guidance"
                label={userName ? `${userName}, here’s what may help today` : "Here’s what may help today"}
                title={rootGuidance.title}
                summary={rootGuidance.why}
                openCard={openCard}
                setOpenCard={setOpenCard}
                dark
              >
                <p style={styles.expandedTextLight}>{rootGuidance.why}</p>

                <div style={styles.guidancePanel}>
                  <p style={styles.guidancePanelTitle}>
                    Why Root is suggesting this
                  </p>

                  <p style={styles.expandedTextLight}>
                    {rootGuidance.recommendation}
                  </p>

                  <p style={styles.guidanceScience}>{rootGuidance.science}</p>

                  {interventionInsight && (
                    <p style={styles.guidanceEvidence}>
                      {interventionInsight}
                    </p>
                  )}
                </div>

                <a href={rootGuidance.action.href} style={styles.whiteButton}>
                  {rootGuidance.action.label}
                </a>
              </MiniInsightCard>
            )}

            {rootReflection && (
              <MiniInsightCard
                id="reflection"
                label="Root Reflection"
                title={rootReflection.title}
                summary={rootReflection.reflection}
                openCard={openCard}
                setOpenCard={setOpenCard}
              >
                <p style={styles.expandedText}>
  Root is using your body signals, mind entries, and journal reflections together to build a clearer picture.
</p>

                {rootReflection?.suggestedAction?.href && (
                  <a
                    href={rootReflection.suggestedAction.href}
                    style={styles.smallButtonDark}
                  >
                    {rootReflection.suggestedAction.title} →
                  </a>
                )}
              </MiniInsightCard>
            )}

            <MiniInsightCard
              id="deep"
              label="Deeper Root Insights"
              title="Open the wider pattern map."
              summary="Body signals, emotional themes, support tools, rhythm, and recent activity live together inside Insights."
              openCard={openCard}
              setOpenCard={setOpenCard}
            >
              {longitudinalMemory && (
                <div style={styles.deepPanel}>
                  <p style={styles.deepLabel}>Root has noticed</p>
                  <h2 style={styles.deepTitle}>{longitudinalMemory.headline}</h2>
                  <p style={styles.expandedText}>{longitudinalMemory.reflection}</p>
                </div>
              )}

              {proactiveCare && (
                <div style={styles.deepPanel}>
                  <p style={styles.deepLabel}>Root suggests</p>
                  <h2 style={styles.deepTitle}>{proactiveCare.title}</h2>
                  <p style={styles.expandedText}>{proactiveCare.message}</p>
                </div>
              )}

              {dailyRhythm && (
                <div style={styles.deepPanel}>
                  <p style={styles.deepLabel}>Daily rhythm awareness</p>
                  <h2 style={styles.deepTitle}>{dailyRhythm.headline}</h2>
                  <p style={styles.expandedText}>{dailyRhythm.reflection}</p>
                </div>
              )}

              {priorityFeed.length > 0 && (
                <div style={styles.deepPanel}>
                  <p style={styles.deepLabel}>Today in Root</p>

                  {priorityFeed.slice(0, 3).map((card, index) => (
                    <div key={`${card.type}-${index}`} style={styles.feedItem}>
                      <strong>{card.title}</strong>
                      <p>{card.text}</p>
                      <a href={card.href}>{card.action} →</a>
                    </div>
                  ))}
                </div>
              )}

              <a href="/insights" style={styles.smallButtonDark}>
                Open Insights →
              </a>
            </MiniInsightCard>
          </section>
        </section>
      </div>

      <footer style={styles.footer}>
        <a href="/privacy" style={styles.footerLink}>
          Privacy
        </a>
        <span style={styles.footerDivider}>•</span>
        <a href="/safety" style={styles.footerLink}>
          Safety
        </a>
        <span style={styles.footerDivider}>•</span>
        <a href="/terms" style={styles.footerLink}>
          Terms
        </a>
      </footer>
    </main>
  );
}

const styles = {
  page: {
    position: "relative",
    minHeight: "100vh",
    overflow: "hidden",
    overflowY: "auto",
    fontFamily: "Inter, sans-serif",
    background: "#000",
  },

  backgroundImage: {
    position: "fixed",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },

  overlay: {
    position: "fixed",
    inset: 0,
    background:
      "linear-gradient(to right, rgba(245,236,222,0.96) 0%, rgba(245,236,222,0.88) 42%, rgba(0,0,0,0.18) 100%)",
  },

  content: {
    position: "relative",
    zIndex: 2,
    minHeight: "100vh",
    padding: "120px 20px 90px",
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
  },

  leftSide: {
    width: "100%",
    maxWidth: "760px",
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
    fontSize: "clamp(48px, 10vw, 88px)",
    lineHeight: "0.95",
    margin: "0 0 24px",
    fontWeight: "500",
    color: "#111",
    letterSpacing: "-0.06em",
    fontFamily: "Georgia, serif",
  },

  subtitle: {
    fontSize: "clamp(16px, 3vw, 24px)",
    lineHeight: "1.7",
    color: "#283128",
    marginBottom: "34px",
  },

  cardStack: {
    display: "flex",
    flexDirection: "column",
    gap: "18px",
    maxWidth: "520px",
    marginBottom: "26px",
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
    boxShadow: "0 18px 48px rgba(20,18,15,0.08)",
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

  insightStack: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    maxWidth: "760px",
  },

  miniCard: {
    borderRadius: "28px",
    background: "rgba(255,255,255,0.28)",
    border: "1px solid rgba(255,255,255,0.36)",
    backdropFilter: "blur(18px)",
    boxShadow: "0 18px 48px rgba(20,18,15,0.08)",
    overflow: "hidden",
  },

  miniCardDark: {
    borderRadius: "28px",
    background:
      "linear-gradient(135deg, rgba(44,62,43,0.92), rgba(68,88,66,0.86))",
    border: "1px solid rgba(255,255,255,0.18)",
    backdropFilter: "blur(18px)",
    boxShadow: "0 24px 70px rgba(0,0,0,0.14)",
    overflow: "hidden",
  },

  miniCardButton: {
    width: "100%",
    border: "none",
    background: "transparent",
    padding: "22px",
    display: "flex",
    justifyContent: "space-between",
    gap: "18px",
    textAlign: "left",
    cursor: "pointer",
  },

  miniLabel: {
    margin: "0 0 8px",
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.14em",
    color: "#364131",
    fontWeight: "800",
  },

  miniLabelDark: {
    margin: "0 0 8px",
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.14em",
    color: "rgba(255,255,255,0.72)",
    fontWeight: "800",
  },

  miniTitle: {
    margin: "0 0 8px",
    color: "#1F281D",
    fontFamily: "Georgia, serif",
    fontSize: "24px",
    fontWeight: "500",
    lineHeight: "1.2",
  },

  miniTitleDark: {
    margin: "0 0 8px",
    color: "#FFFFFF",
    fontFamily: "Georgia, serif",
    fontSize: "24px",
    fontWeight: "500",
    lineHeight: "1.2",
  },

  miniSummary: {
    margin: 0,
    color: "#4B443A",
    lineHeight: "1.65",
    fontSize: "15px",
  },

  miniSummaryDark: {
    margin: 0,
    color: "rgba(255,255,255,0.84)",
    lineHeight: "1.65",
    fontSize: "15px",
  },

  expandIcon: {
    width: "34px",
    height: "34px",
    borderRadius: "50%",
    background: "rgba(36,50,36,0.08)",
    color: "#243224",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "24px",
    flexShrink: 0,
  },

  expandIconDark: {
    width: "34px",
    height: "34px",
    borderRadius: "50%",
    background: "rgba(255,255,255,0.14)",
    color: "#FFFFFF",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "24px",
    flexShrink: 0,
  },

  expandedContent: {
    padding: "0 22px 24px",
  },

  expandedText: {
    margin: 0,
    fontSize: "16px",
    lineHeight: "1.8",
    color: "#283128",
  },

  expandedTextLight: {
    margin: 0,
    fontSize: "16px",
    lineHeight: "1.8",
    color: "rgba(255,255,255,0.86)",
  },

  progressGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))",
    gap: "10px",
    marginBottom: "18px",
  },

  progressMetric: {
    padding: "14px",
    borderRadius: "18px",
    background: "rgba(255,255,255,0.44)",
    border: "1px solid rgba(255,255,255,0.32)",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    color: "#243224",
  },

  actionRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
  },

  smallButtonDark: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    textDecoration: "none",
    background: "#243224",
    color: "#FFFFFF",
    borderRadius: "999px",
    padding: "12px 16px",
    fontSize: "14px",
    fontWeight: "800",
  },

  smallButtonLight: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    textDecoration: "none",
    background: "rgba(255,255,255,0.52)",
    color: "#243224",
    borderRadius: "999px",
    padding: "12px 16px",
    fontSize: "14px",
    fontWeight: "800",
  },

  whiteButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "14px 22px",
    borderRadius: "999px",
    background: "#FFFFFF",
    color: "#243224",
    textDecoration: "none",
    fontWeight: "800",
    marginTop: "16px",
  },

  hypothesisPanel: {
    marginTop: "18px",
    padding: "18px",
    borderRadius: "22px",
    background: "rgba(255,255,255,0.44)",
    border: "1px solid rgba(255,255,255,0.32)",
  },

  hypothesisLabel: {
    margin: "0 0 8px",
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    color: "#6A6459",
    fontWeight: "700",
  },

  hypothesisText: {
    margin: 0,
    lineHeight: "1.7",
    color: "#4C463D",
    fontStyle: "italic",
  },

  confidenceText: {
    margin: "12px 0 0",
    lineHeight: "1.7",
    color: "#6A6459",
    fontSize: "14px",
  },

  guidancePanel: {
    padding: "18px",
    borderRadius: "22px",
    background: "rgba(255,255,255,0.10)",
    border: "1px solid rgba(255,255,255,0.14)",
    marginTop: "18px",
  },

  guidancePanelTitle: {
    margin: "0 0 12px",
    fontSize: "12px",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.68)",
    fontWeight: "700",
  },

  guidanceScience: {
    margin: "14px 0 0",
    lineHeight: "1.7",
    color: "rgba(255,255,255,0.72)",
    fontSize: "15px",
  },

  guidanceEvidence: {
    margin: "16px 0 0",
    paddingTop: "16px",
    borderTop: "1px solid rgba(255,255,255,0.16)",
    lineHeight: "1.7",
    color: "rgba(255,255,255,0.78)",
    fontSize: "15px",
  },

  deepPanel: {
    padding: "18px",
    borderRadius: "22px",
    background: "rgba(255,255,255,0.34)",
    border: "1px solid rgba(255,255,255,0.28)",
    marginBottom: "12px",
  },

  deepLabel: {
    margin: "0 0 8px",
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    color: "#6A6459",
    fontWeight: "800",
  },

  deepTitle: {
    margin: "0 0 10px",
    fontFamily: "Georgia, serif",
    fontSize: "24px",
    fontWeight: "500",
    color: "#2A261F",
  },

  feedItem: {
    padding: "14px 0",
    borderTop: "1px solid rgba(36,50,36,0.10)",
    color: "#2A261F",
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
};
