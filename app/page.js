"use client";

import { useEffect, useState } from "react"; 
import { supabase } from "../lib/supabase";
import RootEnso from "../components/RootEnso";
import { buildRootReflection } from "../lib/rootReflectionEngine";
import { buildLongitudinalMemory } from "../lib/rootLongitudinalEngine";
import { buildRelationalMemory } from "../lib/rootRelationalMemory";
import { buildProactiveCare } from "../lib/rootProactiveCare";
import { buildDailyRhythm } from "../lib/rootDailyRhythm";
import { buildPriorityFeed } from "../lib/rootPriorityFeed";
import Nav from "../components/Nav";
import { buildRootMemoryService } from "../lib/rootMemoryService";

export default function Home() {
  const [latestInsight, setLatestInsight] = useState("");
  const [balanceScore, setBalanceScore] = useState(null);
  const [patternNote, setPatternNote] = useState("");
  const [trendNote, setTrendNote] = useState("");
  const [journey, setJourney] = useState(null);
  const [bodySignals, setBodySignals] = useState([]);
  const [journalEntries, setJournalEntries] = useState([]);
  const [mindEntries, setMindEntries] = useState([]);
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
const [showDeepInsights, setShowDeepInsights] = useState(false);
const [rootGuidance, setRootGuidance] = useState(null);
const [progressMessage, setProgressMessage] = useState("");
const [livingMessage, setLivingMessage] = useState("");
const [memorySummary, setMemorySummary] = useState("");
const [storySummary, setStorySummary] = useState("");
const [memoryDirection, setMemoryDirection] = useState("");
const [rootMemoryNarrative, setRootMemoryNarrative] = useState("");
const [rootHypothesis, setRootHypothesis] = useState("");
const [rootRecognition, setRootRecognition] = useState("");
const [dailyReflection, setDailyReflection] = useState("");
const [rootConfidence, setRootConfidence] = useState("");
const [interventionInsight, setInterventionInsight] = useState("");
const [userName, setUserName] = useState("");
const [latestAssessment, setLatestAssessment] = useState(null);
const [baselineAssessment, setBaselineAssessment] = useState(null);

const visibleFeedCount =  longitudinalMemory?.trajectory === "intensifying" ||
  longitudinalMemory?.nervousSystemLoad === "high"
    ? 1
    : 3;

useEffect(() => {
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
     const memory = buildLongitudinalMemory({
  bodySignals: storedBody,
  journalEntries: storedJournal,
  mindEntries: storedMind,
});

setLongitudinalMemory(memory);
  const relational = buildRelationalMemory({
  bodySignals: storedBody,
  journalEntries: storedJournal,
  mindEntries: storedMind,
});

setRelationalMemory(relational);
const proactive = buildProactiveCare({
  longitudinalMemory: memory,
  relationalMemory: relational,
});

setProactiveCare(proactive);
const rhythm = buildDailyRhythm({
  bodySignals: storedBody,
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

    const safeBody = bodyData || [];
    const safeJournal = journalData || [];
    const safeMind = mindData || [];
    const safeAssessments = assessmentData || [];

const latestSavedAssessment = safeAssessments[0] || null;

const baselineSavedAssessment =
  safeAssessments.find(
    (item) => item.assessment_type === "baseline"
  ) || null;

setLatestAssessment(latestSavedAssessment);
setBaselineAssessment(baselineSavedAssessment);

    setBodySignals(safeBody);
    setJournalEntries(safeJournal);
    setMindEntries(safeMind);

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

    setLatestInsight(
      safeBody.length > 0
        ? `Your body has recently been signalling around ${(safeBody[0].areas || []).join(", ") || "recent patterns"}.`
        : "No recent signals yet."
    );

    setPatternNote(
      memory.trajectoryHeadline || "Patterns are beginning to emerge."
    );

    setTrendNote(
      memory.trajectoryReflection || "Root is learning from your recent signals."
    );

    setBalanceScore(
      safeBody.length > 0
        ? Math.max(20, Math.min(100, 100 - safeBody.length * 2))
        : null
    );

    let guidance = null;

    if (
      memory.topEmotionalTheme &&
      memory.topEmotionalTheme.toLowerCase().includes("panic")
    ) {
      guidance = {
        title: loadedName
  ? `${loadedName}, your nervous system may need safety before reflection.`
  : "Your nervous system may need safety before reflection.",
        why: "Recent emotional patterns suggest your system may be carrying heightened activation.",
        recommendation: "Grounding and slower breathing may help reduce internal threat scanning and support steadier regulation.",
        science: "When the nervous system begins orienting back toward safety, emotional processing often becomes clearer and less overwhelming.",
        action: {
          href: "/mind",
          label: "Begin Panic Reset",
        },
      };
    } else if (
      memory.topEmotionalTheme &&
      memory.topEmotionalTheme.toLowerCase().includes("overthinking")
    ) {
      guidance = {
       title: loadedName
  ? `${loadedName}, your mind may be carrying too much at once.`
  : "Your mind may be carrying too much at once.",
        why: "Recent reflections suggest ongoing cognitive load and emotional looping.",
        recommendation: "Slowing the nervous system first may help thoughts feel less urgent and easier to process.",
        science: "Reducing physiological activation can improve emotional regulation and cognitive flexibility.",
        action: {
          href: "/coach",
          label: "Open Root Coach",
        },
      };
    } else {
      guidance = {
        title: loadedName
  ? `${loadedName}, Root is continuing to learn your patterns gently over time.`
  : "Root is continuing to learn your patterns gently over time.",
        why: "Your recent signals are helping Root understand emotional rhythms, recovery, and behavioural trends.",
        recommendation: "Small consistent check-ins often create more meaningful long-term awareness than intensity alone.",
        science: "Regular reflective practice supports self-awareness, resilience, and nervous-system regulation.",
        action: {
          href: "/body",
          label: "Continue check-in",
        },
      };
    }

    setRootGuidance(guidance);
   const rootMemory = buildRootMemoryService({
  name: loadedName,
  bodySignals: safeBody,
  journalEntries: safeJournal,
  mindEntries: safeMind,
});

setRootRecognition(rootMemory.recognition);
setRootMemoryNarrative(rootMemory.memory);
setInterventionInsight(rootMemory.interventionInsight);
setRootHypothesis(rootMemory.hypothesis);
setDailyReflection(rootMemory.dailyReflection || "");
    const totalCheckIns =
  safeMind.length +
  safeBody.length;

const recurringEmotion =
  mostCommonEmotion || "reflection";

const recurringSignal =
  mostCommonBodySignal || "awareness";

let story = "";
let memoryObservation = "";

if (loadedName) {
  story = `${loadedName}, Root has been learning your wellbeing story. `;

  if (totalCheckIns > 10) {
    story += `You have continued showing up for yourself through ${totalCheckIns} recent check-ins. `;
  }

  story += `${recurringEmotion} has appeared more than once, alongside patterns around ${recurringSignal}. `;

  if (interventionInsight) {
    story += `Root is also beginning to understand which practices may help you recover and regulate more effectively. `;
  }

  if (totalCheckIns >= 20) {
  memoryObservation =
    "Root is beginning to recognise recurring themes rather than isolated moments.";
}
else if (totalCheckIns >= 10) {
  memoryObservation =
    "Patterns are starting to emerge from your recent check-ins.";
}
else {
  memoryObservation =
    "Root is still learning your rhythms and responses.";
}

story += memoryObservation;
}

setStorySummary(story);
    const positiveRecoveryCount = safeMind.filter((entry) => {
  const score = Number(entry.intensity);
  return entry.tool === "Panic Reset Journey" && !Number.isNaN(score) && score > 0;
}).length;

if (loadedName && positiveRecoveryCount >= 3) {
  setMemoryDirection(
    `${loadedName}, Root remembers that recovery has not been instant, but there are signs your system is finding its way back more often.`
  );
} else if (loadedName && safeMind.length >= 5) {
  setMemoryDirection(
    `${loadedName}, Root remembers that you have kept returning to the work, even while the pattern is still becoming clear.`
  );
} else if (loadedName && safeBody.length >= 3) {
  setMemoryDirection(
    `${loadedName}, Root is beginning to remember how your body speaks when pressure builds.`
  );
}
    const interventionCounts = {};
const helpfulInterventions = {};

safeMind.forEach((entry) => {
  if (!entry.tool) return;

  interventionCounts[entry.tool] =
    (interventionCounts[entry.tool] || 0) + 1;

  const score = Number(entry.intensity);

  if (!Number.isNaN(score) && score > 0) {
    helpfulInterventions[entry.tool] =
      (helpfulInterventions[entry.tool] || 0) + 1;
  }
});

const mostUsedIntervention =
  Object.entries(interventionCounts).sort((a, b) => b[1] - a[1])[0];

if (loadedName && mostUsedIntervention) {
  const [toolName, totalUses] = mostUsedIntervention;
  const helpedCount = helpfulInterventions[toolName] || 0;

  if (helpedCount > 0) {
    setInterventionInsight(
      `${loadedName}, ${toolName} has been used ${totalUses} time${totalUses === 1 ? "" : "s"} recently, and ${helpedCount} response${helpedCount === 1 ? "" : "s"} suggested it helped your system settle.`
    );
  } else {
    setInterventionInsight(
      `${loadedName}, ${toolName} has been one of your recent support tools. Root will keep watching whether it helps over time.`
    );
  }
}
    const recentMindEmotion = safeMind[0]?.emotion;
const recentBodySignal = safeBody[0]?.signal;
const recentRecovery = safeMind.find(
  (entry) => entry.tool === "Panic Reset Journey"
);
const emotionCounts = {};
const bodyCounts = {};

safeMind.forEach((entry) => {
  if (!entry.emotion) return;
  emotionCounts[entry.emotion] = (emotionCounts[entry.emotion] || 0) + 1;
});

safeBody.forEach((entry) => {
  if (!entry.signal) return;
  bodyCounts[entry.signal] = (bodyCounts[entry.signal] || 0) + 1;
});

const mostCommonEmotion =
  Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

const mostCommonBodySignal =
  Object.entries(bodyCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

if (loadedName && mostCommonEmotion && mostCommonBodySignal) {
  setMemorySummary(
    `${loadedName}, ${mostCommonEmotion} and ${mostCommonBodySignal} have both appeared more than once recently. Root is beginning to connect this as a possible mind-body pattern.`
  );
} else if (loadedName && mostCommonEmotion) {
  setMemorySummary(
    `${loadedName}, ${mostCommonEmotion} has appeared more than once recently. Root will keep watching whether this changes over time.`
  );
} else if (loadedName && mostCommonBodySignal) {
  setMemorySummary(
    `${loadedName}, ${mostCommonBodySignal} has appeared more than once recently. This may become an important body signal to understand.`
  );
}
       let hypothesis = "";

if (
  loadedName &&
  mostCommonEmotion &&
  mostCommonBodySignal
) {
  hypothesis =
    `${loadedName}, Root wonders whether ${mostCommonBodySignal} may often accompany periods of ${mostCommonEmotion}.`;
}
else if (
  loadedName &&
  mostCommonEmotion
) {
  hypothesis =
    `${loadedName}, Root is beginning to wonder whether ${mostCommonEmotion} may be one of the recurring themes influencing your wellbeing.`;
}
else if (
  loadedName &&
  mostCommonBodySignal
) {
  hypothesis =
    `${loadedName}, Root is beginning to wonder whether ${mostCommonBodySignal} may be an early signal worth paying attention to.`;
}

setRootHypothesis(hypothesis);
let confidence = "";

const evidenceCount =
  (mostCommonEmotion ? 1 : 0) +
  (mostCommonBodySignal ? 1 : 0) +
  positiveRecoveryCount;

if (loadedName && evidenceCount >= 5) {
  confidence =
    "Root is becoming more confident in this pattern, though it will keep watching gently.";
} else if (loadedName && evidenceCount >= 2) {
  confidence =
    "Root has seen this pattern a few times, but it is still learning.";
} else if (loadedName) {
  confidence =
    "Root does not have enough evidence yet. A few more check-ins will help the picture become clearer.";
}

setRootConfidence(confidence);
if (loadedName && recentRecovery?.intensity && Number(recentRecovery.intensity) > 0) {
  setLivingMessage(
    `${loadedName}, your recent recovery response suggests that guided regulation may be helping your system settle.`
  );
} else if (loadedName && recentMindEmotion) {
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

    const recoveryEntries = safeMind.filter(
      (entry) => entry.tool === "Panic Reset Journey"
    );

    const recoveryScores = recoveryEntries
      .map((entry) => Number(entry.intensity))
      .filter((score) => !Number.isNaN(score));

    if (recoveryScores.length >= 2) {
      const average =
        recoveryScores.reduce((sum, score) => sum + score, 0) /
        recoveryScores.length;

      if (average > 1) {
        setProgressMessage(
          `${loadedName}, your recovery responses are showing stronger signs of settling.`
        );
      } else if (average > 0) {
        setProgressMessage(
          `${loadedName}, small signs of recovery are building through repeated practice.`
        );
      } else {
        setProgressMessage(
          `${loadedName}, you are continuing to practise even when regulation feels difficult.`
        );
      }
    }
  };

  load();
}, [journey]);

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
{dailyReflection && (
  <div style={styles.dailyReflectionCard}>
    <p style={styles.dailyReflectionLabel}>
      Today's Root Reflection
    </p>

    <p style={styles.dailyReflectionText}>
      {dailyReflection}
    </p>
  </div>
)}
{rootRecognition && (
  <div style={styles.rootRecognitionCard}>
    <p style={styles.rootRecognitionLabel}>
      What Root noticed
    </p>

    <p style={styles.rootRecognitionText}>
      {rootRecognition}
    </p>
  </div>
)}
{rootMemoryNarrative && (
  <div style={styles.rootMemoryCard}>
    <p style={styles.rootMemoryLabel}>
      Root’s memory of you
    </p>

    <p style={styles.rootMemoryText}>
      {rootMemoryNarrative}
    </p>
  {rootHypothesis && (
  <div style={styles.hypothesisPanel}>
    <p style={styles.hypothesisLabel}>
      Root's current hypothesis
    </p>

    <p style={styles.hypothesisText}>
      {rootHypothesis}
    </p>
    {rootConfidence && (
  <p style={styles.confidenceText}>
    {rootConfidence}
  </p>
)}
  </div>
)}
  </div>
)}
{latestAssessment && (
  <div style={styles.progressPictureCard}>
    <p style={styles.progressPictureLabel}>
      Your progress picture
    </p>

    <h2 style={styles.progressPictureTitle}>
      Root is now tracking your wellbeing scores.
    </h2>

    <div style={styles.progressGrid}>
      <div style={styles.progressMetric}>
        <span>Stress</span>
        <strong>
          {baselineAssessment?.stress_score ?? "—"} → {latestAssessment.stress_score ?? "—"}
        </strong>
      </div>

      <div style={styles.progressMetric}>
        <span>Sleep</span>
        <strong>
          {baselineAssessment?.sleep_score ?? "—"} → {latestAssessment.sleep_score ?? "—"}
        </strong>
      </div>

      <div style={styles.progressMetric}>
        <span>Recovery</span>
        <strong>
          {baselineAssessment?.recovery_score ?? "—"} → {latestAssessment.recovery_score ?? "—"}
        </strong>
      </div>

      <div style={styles.progressMetric}>
        <span>Burnout</span>
        <strong>
          {baselineAssessment?.burnout_score ?? "—"} → {latestAssessment.burnout_score ?? "—"}
        </strong>
      </div>
    </div>

    <a href="/assessment" style={styles.progressPictureButton}>
      Add new check-in →
    </a>
  </div>
)}
{livingMessage && (
  <div style={styles.livingMessageCard}>
    <p style={styles.livingMessageLabel}>Today’s reflection</p>
    <p style={styles.livingMessageText}>{livingMessage}</p>
  </div>
)}
  {rootGuidance && (
  <div style={styles.guidanceCard}>
    <p style={styles.guidanceLabel}>
  {userName
  ? `${userName}, here’s what may help today`
  : "Here’s what may help today"}
</p>
  {progressMessage && (
  <div style={styles.progressCard}>
    <p style={styles.progressLabel}>Your progress</p>
    <p style={styles.progressText}>{progressMessage}</p>
  </div>
)}

    <h2 style={styles.guidanceTitle}>
      {rootGuidance.title}
    </h2>

    <p style={styles.guidanceWhy}>
      {rootGuidance.why}
    </p>

    <div style={styles.guidancePanel}>
      <p style={styles.guidancePanelTitle}>
        Why Root is suggesting this
      </p>

      <p style={styles.guidanceText}>
        {rootGuidance.recommendation}
      </p>

      <p style={styles.guidanceScience}>
        {rootGuidance.science}
      </p>
      {interventionInsight && (
  <p style={styles.guidanceEvidence}>
    {interventionInsight}
  </p>
)}
    </div>

    <a
      href={rootGuidance.action.href}
      style={styles.guidanceButton}
    >
      {rootGuidance.action.label}
    </a>
  </div>
)}
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
<button
  style={styles.deepInsightsButton}
  onClick={() =>
    setShowDeepInsights((prev) => !prev)
  }
>
  {showDeepInsights
    ? "Hide deeper Root insights"
    : "See deeper Root insights"}
</button>
{showDeepInsights && longitudinalMemory && (
  <div style={styles.memoryCard}>
    <p style={styles.memoryLabel}>
      Root has noticed
    </p>

    <h2 style={styles.memoryTitle}>
      {longitudinalMemory.headline}
    </h2>

    <p style={styles.memoryText}>
      {longitudinalMemory.reflection}
    </p>
     
      {longitudinalMemory.trajectoryHeadline && (
  <div style={styles.trajectoryPanel}>
    <p style={styles.trajectoryLabel}>
      Trajectory awareness
    </p>

    <h3 style={styles.trajectoryTitle}>
      {longitudinalMemory.trajectoryHeadline}
    </h3>

    <p style={styles.trajectoryText}>
      {longitudinalMemory.trajectoryReflection}
    </p>
  </div>
)}
   {relationalMemory && (
  <div style={styles.relationshipCard}>
    <p style={styles.relationshipLabel}>
      Root remembers
    </p>

    <h2 style={styles.relationshipTitle}>
      {relationalMemory.headline}
    </h2>

    <div style={styles.relationshipList}>
      {relationalMemory.memories.map((memory, index) => (
        <div
          key={index}
          style={styles.relationshipItem}
        >
          {memory}
        </div>
      ))}
    </div>
  </div>
)}
{proactiveCare && (
  <div style={styles.proactiveCard}>
    <p style={styles.proactiveLabel}>
      Root suggests
    </p>

    <h2 style={styles.proactiveTitle}>
      {proactiveCare.title}
    </h2>

    <p style={styles.proactiveText}>
      {proactiveCare.message}
    </p>

    <a
      href={proactiveCare.action.href}
      style={styles.proactiveButton}
    >
      {proactiveCare.action.label}
    </a>
  </div>
)}
{dailyRhythm && (
  <div style={styles.rhythmCard}>
    <p style={styles.rhythmLabel}>
      Daily rhythm awareness
    </p>

    <h2 style={styles.rhythmTitle}>
      {dailyRhythm.headline}
    </h2>

    <p style={styles.rhythmText}>
      {dailyRhythm.reflection}
    </p>

    {dailyRhythm.strongestPeriod && (
      <div style={styles.rhythmPeriod}>
        Most active period:
        {" "}
        {dailyRhythm.strongestPeriod}
      </div>
    )}
  </div>
)}
 
    {longitudinalMemory.topBodyPattern && (
      <p style={styles.memoryMeta}>
        Body pattern: {longitudinalMemory.topBodyPattern}
      </p>
    )}

    {longitudinalMemory.topEmotionalTheme && (
      <p style={styles.memoryMeta}>
        Emotional theme: {longitudinalMemory.topEmotionalTheme}
      </p>
    )}
  </div>
)}
  {showDeepInsights && priorityFeed.length > 0 && (
  <section style={styles.feedSection}>
    <div style={styles.feedHeader}>
      <p style={styles.feedEyebrow}>
        Today in Root
      </p>

      <h2 style={styles.feedTitle}>
        Your guided support flow
      </h2>
    </div>

    <div style={styles.feedStack}>
      {priorityFeed.slice(0, visibleFeedCount).map((card, index) => (
        <div
          key={`${card.type}-${index}`}
          style={styles.feedCard}
        >
          <p style={styles.feedCardLabel}>
            {card.label}
          </p>

          <h3 style={styles.feedCardTitle}>
            {card.title}
          </h3>

          <p style={styles.feedCardText}>
            {card.text}
          </p>

          <a
            href={card.href}
            style={styles.feedCardButton}
          >
            {card.action}
          </a>
        </div>
      ))}
    </div>
  </section>
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
<footer style={styles.footer}>
  <a href="/privacy" style={styles.footerLink}>Privacy</a>
  <span style={styles.footerDivider}>•</span>
  <a href="/safety" style={styles.footerLink}>Safety</a>
  <span style={styles.footerDivider}>•</span>
  <a href="/terms" style={styles.footerLink}>Terms</a>
</footer>

   <style jsx>{`
  @media (max-width: 768px) {
    main {
      overflow-x: hidden;
    }

    h1 {
      line-height: 1 !important;
    }

    h2 {
      line-height: 1.15 !important;
    }

    p {
      line-height: 1.6 !important;
    }
  }
`}</style>
                  
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
  padding: "120px 20px 40px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  alignItems: "stretch",
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
  display: "none",
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
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
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
  memoryCard: {
  background:
    "linear-gradient(135deg, rgba(255,255,255,0.72), rgba(244,236,222,0.62))",
  border: "1px solid rgba(255,255,255,0.72)",
  borderRadius: "30px",
  padding: "28px",
  marginBottom: "22px",
  backdropFilter: "blur(14px)",
  boxShadow: "0 18px 48px rgba(20,18,15,0.08)",
},

memoryLabel: {
  margin: "0 0 10px",
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  color: "#776C5B",
  fontWeight: "800",
},

memoryTitle: {
  margin: "0 0 12px",
  fontFamily: "Georgia, serif",
  fontSize: "28px",
  fontWeight: "500",
  color: "#2A261F",
},

memoryText: {
  margin: "0 0 14px",
  color: "#4D463B",
  lineHeight: "1.8",
},

memoryMeta: {
  margin: "6px 0 0",
  color: "#6F675B",
  fontSize: "14px",
},
  trajectoryPanel: {
  marginTop: "18px",
  padding: "18px",
  borderRadius: "22px",
  background: "rgba(255,255,255,0.44)",
  border: "1px solid rgba(255,255,255,0.38)",
},

trajectoryLabel: {
  margin: "0 0 8px",
  fontSize: "11px",
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  color: "#6A6459",
  fontWeight: "700",
},

trajectoryTitle: {
  margin: "0 0 10px",
  fontSize: "22px",
  fontFamily: "Georgia, serif",
  color: "#2B261F",
  fontWeight: "500",
},

trajectoryText: {
  margin: 0,
  lineHeight: "1.7",
  color: "#4C463D",
},
  relationshipCard: {
  marginBottom: "24px",
  padding: "28px",
  borderRadius: "30px",
  background:
    "linear-gradient(135deg, rgba(255,255,255,0.62), rgba(240,232,220,0.52))",
  border: "1px solid rgba(255,255,255,0.48)",
  backdropFilter: "blur(16px)",
  boxShadow: "0 18px 50px rgba(20,18,15,0.08)",
},

relationshipLabel: {
  margin: "0 0 10px",
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  color: "#6F675A",
  fontWeight: "800",
},

relationshipTitle: {
  margin: "0 0 18px",
  fontSize: "30px",
  fontFamily: "Georgia, serif",
  color: "#2B261F",
  fontWeight: "500",
},

relationshipList: {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
},

relationshipItem: {
  padding: "16px 18px",
  borderRadius: "18px",
  background: "rgba(255,255,255,0.44)",
  color: "#433D34",
  lineHeight: "1.7",
},
  proactiveCard: {
  marginBottom: "26px",
  padding: "30px",
  borderRadius: "32px",
  background:
    "linear-gradient(135deg, rgba(52,72,52,0.90), rgba(78,102,76,0.86))",
  boxShadow: "0 24px 60px rgba(18,22,18,0.18)",
  color: "#FFF",
},

proactiveLabel: {
  margin: "0 0 10px",
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  color: "rgba(255,255,255,0.72)",
  fontWeight: "800",
},

proactiveTitle: {
  margin: "0 0 14px",
  fontSize: "34px",
  lineHeight: "1.2",
  fontFamily: "Georgia, serif",
  fontWeight: "500",
},

proactiveText: {
  margin: "0 0 22px",
  lineHeight: "1.8",
  color: "rgba(255,255,255,0.88)",
  fontSize: "18px",
},

proactiveButton: {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "14px 22px",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.16)",
  border: "1px solid rgba(255,255,255,0.22)",
  color: "#FFF",
  textDecoration: "none",
  fontWeight: "600",
  backdropFilter: "blur(10px)",
},
  rhythmCard: {
  marginBottom: "26px",
  padding: "28px",
  borderRadius: "30px",
  background:
    "linear-gradient(135deg, rgba(255,248,240,0.72), rgba(236,228,214,0.60))",
  border: "1px solid rgba(255,255,255,0.46)",
  backdropFilter: "blur(14px)",
  boxShadow: "0 20px 48px rgba(20,18,15,0.08)",
},

rhythmLabel: {
  margin: "0 0 10px",
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  color: "#6F665A",
  fontWeight: "800",
},

rhythmTitle: {
  margin: "0 0 14px",
  fontSize: "32px",
  lineHeight: "1.2",
  fontFamily: "Georgia, serif",
  fontWeight: "500",
  color: "#2B261F",
},

rhythmText: {
  margin: "0 0 18px",
  lineHeight: "1.8",
  color: "#4A433A",
  fontSize: "18px",
},

rhythmPeriod: {
  display: "inline-flex",
  alignItems: "center",
  padding: "10px 16px",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.52)",
  color: "#4C453B",
  fontSize: "14px",
  fontWeight: "600",
},
  feedSection: {
  marginBottom: "32px",
},

feedHeader: {
  marginBottom: "18px",
},

feedEyebrow: {
  margin: "0 0 8px",
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  color: "#72695C",
  fontWeight: "800",
},

feedTitle: {
  margin: 0,
  fontSize: "32px",
  lineHeight: "1.15",
  fontFamily: "Georgia, serif",
  color: "#2A261F",
  fontWeight: "500",
},

feedStack: {
  display: "flex",
  flexDirection: "column",
  gap: "18px",
},

feedCard: {
  padding: "18px",
  borderRadius: "28px",
  background:
    "linear-gradient(135deg, rgba(255,255,255,0.72), rgba(242,234,222,0.58))",
  border: "1px solid rgba(255,255,255,0.48)",
  backdropFilter: "blur(14px)",
  boxShadow: "0 18px 48px rgba(20,18,15,0.08)",
},

feedCardLabel: {
  margin: "0 0 10px",
  fontSize: "11px",
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  color: "#6F665A",
  fontWeight: "800",
},

feedCardTitle: {
  margin: "0 0 12px",
  fontSize: "28px",
  lineHeight: "1.2",
  fontFamily: "Georgia, serif",
  color: "#2A261F",
  fontWeight: "500",
},

feedCardText: {
  margin: "0 0 18px",
  lineHeight: "1.8",
  color: "#4C453B",
},

feedCardButton: {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "12px 18px",
  borderRadius: "999px",
  background: "rgba(32,30,26,0.08)",
  color: "#2A261F",
  textDecoration: "none",
  fontWeight: "600",
},
  guidanceCard: {
  maxWidth: "760px",
  marginBottom: "30px",
  padding: "30px",
  borderRadius: "34px",
  background:
    "linear-gradient(135deg, rgba(44,62,43,0.92), rgba(68,88,66,0.88))",
  color: "#FFF",
  boxShadow: "0 24px 70px rgba(0,0,0,0.18)",
},

guidanceLabel: {
  margin: "0 0 12px",
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  color: "rgba(255,255,255,0.72)",
  fontWeight: "800",
},

guidanceTitle: {
  margin: "0 0 18px",
  fontSize: "38px",
  lineHeight: "1.15",
  fontFamily: "Georgia, serif",
  fontWeight: "500",
},

guidanceWhy: {
  margin: "0 0 24px",
  lineHeight: "1.8",
  color: "rgba(255,255,255,0.88)",
  fontSize: "18px",
},

guidancePanel: {
  padding: "22px",
  borderRadius: "24px",
  background: "rgba(255,255,255,0.10)",
  border: "1px solid rgba(255,255,255,0.14)",
  marginBottom: "24px",
},

guidancePanelTitle: {
  margin: "0 0 14px",
  fontSize: "13px",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "rgba(255,255,255,0.68)",
  fontWeight: "700",
},

guidanceText: {
  margin: "0 0 16px",
  lineHeight: "1.8",
  fontSize: "17px",
},

guidanceScience: {
  margin: 0,
  lineHeight: "1.7",
  color: "rgba(255,255,255,0.72)",
  fontSize: "15px",
},

guidanceButton: {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "14px 24px",
  borderRadius: "999px",
  background: "#FFF",
  color: "#243224",
  textDecoration: "none",
  fontWeight: "700",
},
  deepInsightsButton: {
  width: "100%",
  maxWidth: "760px",
  marginBottom: "24px",
  padding: "16px 22px",
  borderRadius: "999px",
  border: "1px solid rgba(255,255,255,0.22)",
  background: "rgba(255,255,255,0.10)",
  color: "#1F281D",
  fontWeight: "700",
  fontSize: "15px",
  cursor: "pointer",
  backdropFilter: "blur(10px)",
},
  progressCard: {
  maxWidth: "760px",
  marginBottom: "26px",
  padding: "24px",
  borderRadius: "30px",
  background: "rgba(255,255,255,0.22)",
  border: "1px solid rgba(255,255,255,0.34)",
  backdropFilter: "blur(16px)",
  boxShadow: "0 16px 42px rgba(20,18,15,0.08)",
},

progressLabel: {
  margin: "0 0 10px",
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  color: "#364131",
  fontWeight: "800",
},

progressText: {
  margin: 0,
  color: "#283128",
  lineHeight: "1.8",
  fontSize: "18px",
},
  livingMessageCard: {
  maxWidth: "760px",
  marginBottom: "24px",
  padding: "26px",
  borderRadius: "30px",
  background: "rgba(255,255,255,0.24)",
  border: "1px solid rgba(255,255,255,0.36)",
  backdropFilter: "blur(18px)",
  boxShadow: "0 18px 48px rgba(20,18,15,0.08)",
},

livingMessageLabel: {
  margin: "0 0 10px",
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  color: "#364131",
  fontWeight: "800",
},

livingMessageText: {
  margin: 0,
  fontSize: "20px",
  lineHeight: "1.8",
  color: "#243224",
},
  memorySummaryCard: {
  maxWidth: "760px",
  marginBottom: "24px",
  padding: "24px",
  borderRadius: "30px",
  background: "rgba(255,255,255,0.20)",
  border: "1px solid rgba(255,255,255,0.34)",
  backdropFilter: "blur(18px)",
  boxShadow: "0 18px 48px rgba(20,18,15,0.08)",
},

memorySummaryLabel: {
  margin: "0 0 10px",
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  color: "#364131",
  fontWeight: "800",
},

memorySummaryText: {
  margin: 0,
  fontSize: "18px",
  lineHeight: "1.8",
  color: "#243224",
},
  interventionInsightCard: {
  maxWidth: "760px",
  marginBottom: "24px",
  padding: "24px",
  borderRadius: "30px",
  background: "rgba(255,255,255,0.22)",
  border: "1px solid rgba(255,255,255,0.34)",
  backdropFilter: "blur(18px)",
  boxShadow: "0 18px 48px rgba(20,18,15,0.08)",
},

interventionInsightLabel: {
  margin: "0 0 10px",
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  color: "#364131",
  fontWeight: "800",
},

interventionInsightText: {
  margin: 0,
  fontSize: "18px",
  lineHeight: "1.8",
  color: "#243224",
},
  guidanceEvidence: {
  margin: "16px 0 0",
  paddingTop: "16px",
  borderTop: "1px solid rgba(255,255,255,0.16)",
  lineHeight: "1.7",
  color: "rgba(255,255,255,0.78)",
  fontSize: "15px",
},
  storyCard: {
  maxWidth: "760px",
  marginBottom: "24px",
  padding: "28px",
  borderRadius: "30px",
  background: "rgba(255,255,255,0.22)",
  border: "1px solid rgba(255,255,255,0.34)",
  backdropFilter: "blur(18px)",
  boxShadow: "0 18px 48px rgba(20,18,15,0.08)",
},

storyLabel: {
  margin: "0 0 12px",
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  color: "#364131",
  fontWeight: "800",
},

storyText: {
  margin: 0,
  fontSize: "18px",
  lineHeight: "1.9",
  color: "#243224",
},
  memoryDirectionCard: {
  maxWidth: "760px",
  marginBottom: "24px",
  padding: "26px",
  borderRadius: "30px",
  background: "rgba(255,255,255,0.22)",
  border: "1px solid rgba(255,255,255,0.34)",
  backdropFilter: "blur(18px)",
  boxShadow: "0 18px 48px rgba(20,18,15,0.08)",
},

memoryDirectionLabel: {
  margin: "0 0 10px",
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  color: "#364131",
  fontWeight: "800",
},

memoryDirectionText: {
  margin: 0,
  fontSize: "18px",
  lineHeight: "1.85",
  color: "#243224",
},
  rootMemoryCard: {
  maxWidth: "760px",
  marginBottom: "24px",
  padding: "28px",
  borderRadius: "30px",
  background: "rgba(255,255,255,0.24)",
  border: "1px solid rgba(255,255,255,0.36)",
  backdropFilter: "blur(18px)",
  boxShadow: "0 18px 48px rgba(20,18,15,0.08)",
},

rootMemoryLabel: {
  margin: "0 0 12px",
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  color: "#364131",
  fontWeight: "800",
},

rootMemoryText: {
  margin: 0,
  fontSize: "18px",
  lineHeight: "1.9",
  color: "#243224",
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
  rootRecognitionCard: {
  maxWidth: "760px",
  marginBottom: "24px",
  padding: "30px",
  borderRadius: "32px",
  background:
    "linear-gradient(135deg, rgba(44,62,43,0.92), rgba(68,88,66,0.86))",
  color: "#FFFFFF",
  boxShadow: "0 24px 70px rgba(0,0,0,0.16)",
},

rootRecognitionLabel: {
  margin: "0 0 12px",
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  color: "rgba(255,255,255,0.72)",
  fontWeight: "800",
},

rootRecognitionText: {
  margin: 0,
  fontSize: "20px",
  lineHeight: "1.85",
  color: "rgba(255,255,255,0.92)",
},
  dailyReflectionCard: {
  maxWidth: "760px",
  marginBottom: "24px",
  padding: "30px",
  borderRadius: "32px",
  background:
    "linear-gradient(135deg, rgba(255,255,255,0.30), rgba(245,236,222,0.26))",
  border: "1px solid rgba(255,255,255,0.38)",
  backdropFilter: "blur(18px)",
  boxShadow: "0 18px 48px rgba(20,18,15,0.08)",
},

dailyReflectionLabel: {
  margin: "0 0 12px",
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  color: "#364131",
  fontWeight: "800",
},

dailyReflectionText: {
  margin: 0,
  fontSize: "20px",
  lineHeight: "1.9",
  color: "#243224",
},
  progressPictureCard: {
  maxWidth: "760px",
  marginBottom: "24px",
  padding: "28px",
  borderRadius: "32px",
  background:
    "linear-gradient(135deg, rgba(255,255,255,0.30), rgba(245,236,222,0.26))",
  border: "1px solid rgba(255,255,255,0.38)",
  backdropFilter: "blur(18px)",
  boxShadow: "0 18px 48px rgba(20,18,15,0.08)",
},

progressPictureLabel: {
  margin: "0 0 12px",
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  color: "#364131",
  fontWeight: "800",
},

progressPictureTitle: {
  margin: "0 0 18px",
  fontFamily: "Georgia, serif",
  fontSize: "30px",
  lineHeight: "1.2",
  color: "#1F281D",
  fontWeight: "500",
},

progressGrid: {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
  gap: "12px",
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
},

progressPictureButton: {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  textDecoration: "none",
  background: "#243224",
  color: "#FFFFFF",
  borderRadius: "999px",
  padding: "13px 18px",
  fontSize: "14px",
  fontWeight: "800",
},
};
