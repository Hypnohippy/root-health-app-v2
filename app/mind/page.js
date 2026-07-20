"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import Nav from "../../components/Nav";
import RootEnso from "../../components/RootEnso";
import RootAtmosphere from "../../components/RootAtmosphere";
const emotionalStates = [
  {
    id: "overthinking",
    title: "Overthinking",
    description: "The mind is looping, analysing, or unable to settle.",
    atmosphere: "overthinking",
    suggestion: "Slow the mind before trying to solve the problem.",
    pathways: [
  "Externalise thoughts",
  "Interrupt looping",
  "Slow mental pace",
  "Reconnect with the body",
],
  },
  {
    id: "panic",
    title: "Panic / overwhelm",
    description: "The nervous system feels activated or unsafe.",
    atmosphere: "panic",
    suggestion: "Reduce activation before thinking deeply.",
    pathways: [
  "Grounding breath",
  "Orient to the room",
  "Reduce stimulation",
  "Slow the nervous system",
],
    journey: "panic",
  },
  {
    id: "shutdown",
    title: "Shutdown / numbness",
    description: "Everything feels distant, flat, or emotionally disconnected.",
    atmosphere: "shutdown",
    suggestion: "Focus on gentle reconnection, not pressure.",
    pathways: [
  "Gentle body awareness",
  "Reconnect with sensation",
  "Reduce pressure",
  "Small emotional movement",
],
  },
  {
    id: "shame",
    title: "Shame / self-criticism",
    description: "The inner voice has become harsh or heavy.",
    atmosphere: "shame",
    suggestion: "Respond softly rather than attacking yourself.",
    pathways: [
  "Soften inner dialogue",
  "Practice self-compassion",
  "Reconnect with values",
  "Reduce self-attack",
],
  },
  {
    id: "grief",
    title: "Grief / sadness",
    description: "Something emotionally heavy is asking for space.",
    atmosphere: "grief",
    suggestion: "Allow feeling before trying to fix.",
    pathways: [
  "Allow emotional space",
  "Slow the nervous system",
  "Gentle reflection",
  "Emotional grounding",
],
  },
  {
    id: "anger",
    title: "Anger / frustration",
    description: "The body feels tight, reactive, or emotionally charged.",
    atmosphere: "anger",
    suggestion: "Slow the nervous system before responding outwardly.",
    pathways: [
  "Release physical tension",
  "Slow emotional reactivity",
  "Ground before responding",
  "Create emotional space",
],
  },
];
const journeys = {
  panic: {
    title: "Panic Reset",
    description:
      "A gentle guided pathway to help the nervous system slow down and feel safer again.",

    steps: [
      {
        title: "Orient to the room",
        text:
          "Look slowly around you. Notice shapes, light, colours, and objects around you. Let the nervous system realise this moment is different from the fear.",
      },

      {
        title: "Slow the breath",
        text:
          "Breathe in gently for 4 seconds. Exhale slowly for 6 seconds. Longer exhales help calm the nervous system.",
      },

      {
        title: "Ground into the body",
        text:
          "Feel your feet against the floor. Relax your jaw slightly. Allow your shoulders to soften.",
      },

      {
        title: "Reduce mental urgency",
        text:
          "You do not need to solve everything right now. The priority is safety and regulation first.",
      },

      {
        title: "Gentle recovery",
        text:
          "Your nervous system may still feel activated for a little while. That is okay. Recovery often happens gradually.",
      },
    ],
  },
}; 
const calmingTechniques = [
  {
    title: "Safe Place Visualisation",
    audio:
      "https://witkwlgldxjwwxmpcyva.supabase.co/storage/v1/object/public/root-audio/safe-place-visualisation-1781348124095.mp3",
    body: `Close your eyes if comfortable...`,
  },

  {
    title: "Floating Leaves Exercise",
    audio:
      "https://witkwlgldxjwwxmpcyva.supabase.co/storage/v1/object/public/root-audio/floating-leaves-1781348171074.mp3",
    body: `Imagine sitting beside a gentle stream...`,
  },

  {
    title: "Future Self Perspective",
    audio:
      "https://witkwlgldxjwwxmpcyva.supabase.co/storage/v1/object/public/root-audio/future-self-perspective-1781348220955.mp3",
    body: `Imagine yourself six months from now...`,
  },

  {
    title: "Body Scan Relaxation",
    audio:
      "https://witkwlgldxjwwxmpcyva.supabase.co/storage/v1/object/public/root-audio/body-scan-relaxation-1781348251226.mp3",
    body: `Bring your attention to your feet...`,
  },
];const outcomeOptions = [
  { label: "Much better", score: 2 },
  { label: "A little better", score: 1 },
  { label: "No change", score: 0 },
  { label: "Worse", score: -1 },
];

const recoveryScores = {
  Calmer: 2,
  "Slightly calmer": 1,
  Unchanged: 0,
  "Still overwhelmed": -1,
};
const groundingTechniques = [
  {
    title: "5-4-3-2-1 Grounding",
    audio:
      "https://witkwlgldxjwwxmpcyva.supabase.co/storage/v1/object/public/root-audio/grounding-54321-1781350599311.mp3",
    body: `A simple grounding exercise using the senses to help bring attention back to the present moment.`,
  },
  {
    title: "Room Orientation",
    audio:
      "https://witkwlgldxjwwxmpcyva.supabase.co/storage/v1/object/public/root-audio/room-orientation-1781350631246.mp3",
    body: `A gentle exercise to help the nervous system recognise where you are now.`,
  },
  {
    title: "Safe Object Anchor",
    audio:
      "https://witkwlgldxjwwxmpcyva.supabase.co/storage/v1/object/public/root-audio/safe-object-anchor-1781350662306.mp3",
    body: `Use one nearby object as a steady anchor back into the present moment.`,
  },
  {
    title: "Present Moment Anchor",
    audio:
      "https://witkwlgldxjwwxmpcyva.supabase.co/storage/v1/object/public/root-audio/present-moment-anchor-1781350712096.mp3",
    body: `A short present-moment phrase and breath practice to help the system settle.`,
  },
];

const bodyTechniques = [
  {
    title: "Extended Exhale Breathing",
    audio:
      "https://witkwlgldxjwwxmpcyva.supabase.co/storage/v1/object/public/root-audio/extended-exhale-breathing-1781357355630.mp3",
    body: "A breathing exercise designed to slow the nervous system through a longer exhale.",
  },
  {
    title: "Box Breathing",
    audio:
      "https://witkwlgldxjwwxmpcyva.supabase.co/storage/v1/object/public/root-audio/box-breathing-1781357384787.mp3",
    body: "A structured breathing pattern used to create steadiness and calm.",
  },
  {
    title: "Progressive Muscle Relaxation",
    audio:
      "https://witkwlgldxjwwxmpcyva.supabase.co/storage/v1/object/public/root-audio/progressive-muscle-relaxation-1781357417586.mp3",
    body: "A guided exercise exploring the difference between tension and release.",
  },
  {
    title: "Physical Tension Release",
    audio:
      "https://witkwlgldxjwwxmpcyva.supabase.co/storage/v1/object/public/root-audio/physical-tension-release-1781357452960.mp3",
    body: "A gentle body-based exercise for releasing held tension.",
  },
];
const tools = [
  {
    id: "grounding",
    title: "Feel safer",
    subtitle: "Reconnect with the present moment.",
  },
  {
    id: "breathwork",
    title: "Calm my body",
    subtitle: "Reduce physical activation.",
  },
  {
    id: "calming",
    title: "Slow my mind",
    subtitle: "Create mental space and ease.",
  },
  {
    id: "journal",
    title: "Write it out",
    subtitle: "Express what is happening.",
  },
  {
    id: "cbt",
    title: "Challenge the thought",
    subtitle: "Look at the situation differently.",
  },
  {
    id: "values",
    title: "Reconnect with what matters",
    subtitle: "Choose one small values-led action.",
  },
];
function detectThoughtTheme({ situation = "", automaticThought = "", emotion = "" }) {
  const text = `${situation} ${automaticThought} ${emotion}`.toLowerCase();

 if (
  text.includes("affair") ||
  text.includes("cheat") ||
  text.includes("cheating") ||
  text.includes("texting") ||
  text.includes("another man") ||
  text.includes("another woman") ||
  text.includes("betray") ||
  text.includes("betrayal")
) {
  return {
    theme: "Relationship trust",
    notice:
      "The strongest emotion here may not be anger. Anger often appears when something important feels threatened. Underneath it may be fear of loss, betrayal, uncertainty, or being hurt.",
    question:
      "What do you currently know for certain, and what are you assuming might be true?",
    reframe:
      "Fear often wants certainty, especially when something important feels at risk. The thought may be one possible explanation, but it is not yet the same thing as evidence. Before deciding what is true, it may help to separate what you know from what you fear.",
    nextStep:
  "Before reacting, write down two lists: what I know for certain, and what I am afraid might be true. Keep them separate for now.",
  };
}

if (
  text.includes("love") ||
  text.includes("commitment") ||
  text.includes("girlfriend") ||
  text.includes("boyfriend") ||
  text.includes("marriage") ||
  text.includes("future together")
) {
  return {
    theme: "Relationship commitment",
    notice:
      "This may not simply be about danger. It may be about vulnerability, closeness, responsibility, or what commitment asks of you.",
    question:
      "What feels most uncomfortable here: losing freedom, being hurt, feeling responsible for someone else, or not knowing what you truly want?",
    reframe:
      "Anxiety does not always mean something is wrong. Sometimes it appears when something matters. You do not need to decide the whole future in one moment. You may only need to understand what this moment is asking of you.",
    nextStep:
  "Do not decide the whole future today. Write down what feels too much: the relationship, the responsibility, the speed of change, or the fear of being hurt.",
  };
}
  if (
    text.includes("fail") ||
    text.includes("failure") ||
    text.includes("mistake") ||
    text.includes("mess up") ||
    text.includes("not good enough") ||
    text.includes("perfect")
  ) {
    return {
      theme: "Fear of failure",
      notice:
        "This looks like pressure around performance, mistakes, or being enough. The mind may be treating imperfection as danger.",
      question:
        "What would this situation mean about you if it did not go perfectly?",
      reframe:
        "A mistake would not make you unsafe or unworthy. It may simply show where support, practice, or a slower pace is needed.",
    };
  }

  if (
    text.includes("shame") ||
    text.includes("embarrassed") ||
    text.includes("stupid") ||
    text.includes("worthless") ||
    text.includes("idiot")
  ) {
    return {
      theme: "Shame / self-attack",
      notice:
        "Shame often turns pain inward. It can make a difficult moment feel like a statement about who you are.",
      question:
        "If someone you cared about was in this position, what would you want them to understand?",
      reframe:
        "This moment may be painful, but it does not define your worth. The kinder question is not ‘what is wrong with me?’ but ‘what needs care here?’",
    };
  }
  if (
  text.includes("bully") ||
  text.includes("bullied") ||
  text.includes("bullying") ||
  text.includes("harass") ||
  text.includes("harassment") ||
  text.includes("intimidated") ||
  text.includes("picked on") ||
  text.includes("powerless") ||
  text.includes("helpless")
) {
  return {
    theme: "Workplace bullying / feeling powerless",
    notice:
      "This may not simply be about work performance. It may be about feeling trapped between protecting yourself and protecting your livelihood. When people feel powerless, fear and frustration often appear together.",
    question:
      "If losing your job were not a concern, what would you want to say or do differently?",
    reframe:
      "Feeling unable to challenge unfair behaviour does not mean you are weak. It may mean you are trying to balance safety, income, and self-respect at the same time. The challenge is finding a response that protects all three as much as possible.",
    nextStep:
      "Write down what behaviour feels unacceptable, what evidence or examples you have, and what safe support options may be available before reacting alone.",
  };
}

  if (
  text.includes("final warning") ||
  text.includes("warning") ||
  text.includes("sack") ||
  text.includes("sacked") ||
  text.includes("fired") ||
  text.includes("dismissed") ||
  text.includes("lose my job") ||
  text.includes("job security") ||
  text.includes("disciplinary")
) {
  return {
    theme: "Work / job security",
    notice:
      "This sounds less like ordinary work stress and more like threat around security, status, and what happens next. Fear can become very loud when income, identity, or stability feel at risk.",
    question:
      "What do you know for certain about the warning, and what part is your mind filling in about the future?",
    reframe:
      "A final warning is serious, but it is not the same thing as already being dismissed. The useful focus now is not panic, but clarity: what is being asked of you, what support or evidence you need, and what next step protects your position.",
    nextStep:
      "Write down three things: what the warning actually says, what action is expected from you, and who you can speak to for clarity or support before assuming the worst.",
  };
}
  return {
    theme: "Unclear emotional meaning",
    notice:
      "There seems to be more underneath this thought than the thought alone. The emotion may be pointing towards a need, a fear, a boundary, or something that matters.",
    question:
      "What do you think this emotion is trying to protect, express, or ask for?",
    reframe:
      "This thought may be one possible interpretation, not the whole truth. Slowing down gives you room to understand what is really being asked of you.",
  };
}

function buildReframe({ situation, automaticThought, emotion }) {
  const theme = detectThoughtTheme({ situation, automaticThought, emotion });

  return `Root notices

${theme.notice}

A useful question

${theme.question}

A steadier way to hold this might be:

${theme.reframe}`;
}

function buildNextStep({ situation, automaticThought, emotion }) {
  const theme = detectThoughtTheme({
    situation,
    automaticThought,
    emotion,
  });

  if (theme.nextStep) {
    return theme.nextStep;
  }

  if (!emotion) {
    return "Take one slower breath, then choose one small action that supports you rather than pressures you.";
  }

  return `For the next few minutes, treat ${emotion.toLowerCase()} as information rather than instruction. Slow down, reduce pressure, and choose one small grounded action.`;
}
export default function MindPage() {
  const [activeTool, setActiveTool] = useState(null);
  const [activeJourney, setActiveJourney] = useState(null);
  const [journeyStep, setJourneyStep] = useState(0);
  const [journeyComplete, setJourneyComplete] = useState(false);
  const [recoverySavedMessage, setRecoverySavedMessage] = useState("");
  const [showInsights, setShowInsights] = useState(false);
  const [activeState, setActiveState] = useState(null);
  const [baselineScore, setBaselineScore] = useState("");
  const [baselineSaved, setBaselineSaved] = useState(false);
  const [recentStates, setRecentStates] = useState([]);
  const [recoveryEntries, setRecoveryEntries] = useState([]);
  const [speakingText, setSpeakingText] = useState("");
  const [calmingIndex, setCalmingIndex] = useState(0);
  const [groundingIndex, setGroundingIndex] = useState(0);
  const [bodyIndex, setBodyIndex] = useState(0);
  useEffect(() => {
  const loadRecentStates = async () => {
    const { data } = await supabase
      .from("mind_entries")
      .select("emotion")
      .eq("tool", "Emotional check-in")
      .order("created_at", { ascending: false })
      .limit(12);
const { data: recoveryData } = await supabase
  .from("mind_entries")
  .select("*")
  .eq("tool", "Panic Reset Journey")
  .order("created_at", { ascending: false })
  .limit(20);

if (Array.isArray(recoveryData)) {
  setRecoveryEntries(recoveryData);
}
    if (Array.isArray(data)) {
      setRecentStates(
        data
          .map((entry) => entry.emotion)
          .filter(Boolean)
      );
    }
  };

  loadRecentStates();
}, []);

  const [situation, setSituation] = useState("");
  const [automaticThought, setAutomaticThought] = useState("");
  const [emotion, setEmotion] = useState("");
  const [intensity, setIntensity] = useState("5");
  const [reframe, setReframe] = useState("");
  const [nextStep, setNextStep] = useState("");

  const [journalText, setJournalText] = useState("");
  const [valueFocus, setValueFocus] = useState("");
  const [valueAction, setValueAction] = useState("");

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const stopSpeaking = () => {
  if (typeof window === "undefined") return;

  window.speechSynthesis.cancel();
  setSpeakingText("");
};

const speakText = (text) => {
  if (typeof window === "undefined") return;

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.86;
  utterance.pitch = 0.92;
  utterance.volume = 1;

  utterance.onend = () => {
    setSpeakingText("");
  };

  utterance.onerror = () => {
    setSpeakingText("");
  };

  setSpeakingText(text);
  window.speechSynthesis.speak(utterance);
};
  const resetTool = () => {
    setSituation("");
    setAutomaticThought("");
    setEmotion("");
    setIntensity("5");
    setReframe("");
    setNextStep("");
    setJournalText("");
    setValueFocus("");
    setValueAction("");
    setSaved(false);
  };
  const recommendedToolOrder = {
  overthinking: ["cbt", "journal", "breathwork", "grounding", "values", "calming"],
  panic: ["grounding", "breathwork", "calming", "cbt", "journal", "values"],
  shutdown: ["calming", "grounding", "journal", "breathwork", "values", "cbt"],
  shame: ["cbt", "journal", "values", "calming", "grounding", "breathwork"],
  grief: ["journal", "calming", "grounding", "values", "breathwork", "cbt"],
  anger: ["breathwork", "grounding", "journal", "values", "cbt", "calming"],
};
const stateCounts = recentStates.reduce((acc, state) => {
  acc[state] = (acc[state] || 0) + 1;
  return acc;
}, {});

  const recoveryScoresList = recoveryEntries
  .map((entry) => Number(entry.intensity))
  .filter((score) => !Number.isNaN(score));

const averageRecovery =
  recoveryScoresList.length > 0
    ? recoveryScoresList.reduce((sum, score) => sum + score, 0) /
      recoveryScoresList.length
    : null;

let recoveryTrend = "";

if (averageRecovery !== null) {
  if (averageRecovery > 1) {
    recoveryTrend =
      "Root notices Panic Reset is often followed by a stronger sense of settling.";
  } else if (averageRecovery > 0) {
    recoveryTrend =
      "Root notices Panic Reset may be helping your nervous system soften slightly.";
  } else if (averageRecovery === 0) {
    recoveryTrend =
      "Root notices Panic Reset has been neutral so far. Another pathway may support you better.";
  } else {
    recoveryTrend =
      "Root notices Panic Reset may not be enough on its own yet. More direct support may help.";
  }
}
let rootNotice = "";

if ((stateCounts.panic || 0) >= 3) {
  rootNotice =
    "Root notices your nervous system has been moving toward overwhelm recently.";
} else if ((stateCounts.overthinking || 0) >= 3) {
  rootNotice =
    "Root notices periods of overthinking and mental looping appearing repeatedly.";
} else if ((stateCounts.shutdown || 0) >= 3) {
  rootNotice =
    "Root notices moments of emotional shutdown or disconnection appearing recently.";
} else if ((stateCounts.grief || 0) >= 3) {
  rootNotice =
    "Root notices emotionally heavy reflections returning more often recently.";
} else if ((stateCounts.shame || 0) >= 3) {
  rootNotice =
    "Root notices a pattern of self-pressure or self-criticism appearing.";
} else if ((stateCounts.anger || 0) >= 3) {
  rootNotice =
    "Root notices tension and emotional charge appearing repeatedly.";
}
const visibleTools = activeState
  ? [...tools].sort((a, b) => {
      const order = recommendedToolOrder[activeState.id] || [];
      return order.indexOf(a.id) - order.indexOf(b.id);
    })
  : tools;
  const openTool = (toolId) => {
    setActiveTool(toolId);
    resetTool();
  };

  const generateReframe = () => {
const generatedReframe = buildReframe({
  situation,
  automaticThought,
  emotion,
});
    const generatedNextStep = buildNextStep({
  situation,
  automaticThought,
  emotion,
});
 
    setReframe(generatedReframe);
    setNextStep(generatedNextStep);
    setSaved(false);
  };

  const saveEntry = async (entry) => {
    setSaving(true);

    const { error } = await supabase.from("mind_entries").insert([
     {
  profile_key: "main",
  outcome_label: entry.outcome_label || "",
  outcome_score:
    typeof entry.outcome_score === "number" ? entry.outcome_score : null,
  ...entry,
}
    ]);

    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    setSaved(true);
  };

  const saveCbt = async () => {
  if (!reframe) return;

  const themeData = detectThoughtTheme({
    situation,
    automaticThought,
    emotion,
  });

  await saveEntry({
    tool: "CBT-style reframing",
    situation,
    automatic_thought: automaticThought,
    emotion,
    intensity,
    reframe,
    next_step: nextStep,
    thought_theme: themeData.theme,
    thought_notice: themeData.notice,
    thought_question: themeData.question,
    thought_next_step: themeData.nextStep,
  });
};
  const saveSimpleTool = async (toolName, summary, nextStepText) => {
    await saveEntry({
      tool: toolName,
      situation: summary,
      automatic_thought: "",
      emotion: "",
      intensity: "",
      reframe: summary,
      next_step: nextStepText,
    });
  };

  return (
   <RootAtmosphere
 type={
  activeState?.atmosphere
    ? activeState.atmosphere
    : activeTool === "grounding"
    ? "grounding"
    : activeTool === "breathwork"
    ? "sleep"
    : activeTool === "calming"
    ? "sleep"
    : activeTool === "journal"
    ? "reflection"
    : "coach"
}
>
  <Nav />

  <main style={styles.page}>
        <section style={styles.shell}>
          <div style={styles.glow} />

          <div style={styles.header}>
           <RootEnso size={72} />
            <p style={styles.kicker}>Root Mind Library</p>
            <h1 style={styles.title}>Mind & Emotions</h1>
            <p style={styles.subtitle}>
              Guided emotional tools for calming the nervous system, reframing
              thoughts, grounding the body, and choosing steadier action.
            </p>
          </div>

          {recoverySavedMessage && (
  <div style={styles.savedNoticeCard}>
    <p style={styles.savedNoticeLabel}>Recovery outcome saved</p>
    <p style={styles.savedNoticeText}>{recoverySavedMessage}</p>
  </div>
)}
         {!activeTool && !activeJourney && (
  <>
    <div style={styles.stateIntro}>
      <p style={styles.stateKicker}>Emotional check-in</p>
      <h2 style={styles.stateTitle}>What feels strongest right now?</h2>
      <p style={styles.stateSubtitle}>
        Root can gently adapt support based on what your nervous system may need most.
      </p>
    </div>

    <div style={styles.stateGrid}>
      {emotionalStates.map((state) => (
        <button
          key={state.id}
        onClick={() => {
  setActiveState(state);
  setBaselineScore("");
  setBaselineSaved(false);
}}
          style={{
            ...styles.stateCard,
            ...(activeState?.id === state.id ? styles.stateCardActive : {}),
          }}
        >
          <strong style={styles.stateCardTitle}>{state.title}</strong>
          <p style={styles.stateCardText}>{state.description}</p>
        </button>
      ))}
    </div>

    {activeState && (
      <div style={styles.recommendationCard}>
        <p style={styles.recommendationLabel}>Root gently suggests</p>
        <h3 style={styles.recommendationTitle}>{activeState.suggestion}</h3>
        <p style={styles.recommendationText}>
  Before choosing support, give Root a starting measurement. This allows
  Root to compare how this feels before and after an intervention.
</p>

<div style={styles.recoveryCard}>
  <p style={styles.recoveryLabel}>Starting measurement</p>

  <h3 style={styles.recoveryTitle}>
    How intense does {activeState.title.toLowerCase()} feel right now?
  </h3>

  <p style={styles.recommendationText}>
    0 means not present. 10 means as intense as it could be.
  </p>

  <div style={styles.scoreRow}>
    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
      <button
        key={score}
        type="button"
        onClick={() => {
          setBaselineScore(String(score));
          setBaselineSaved(false);
        }}
        style={{
          ...styles.scoreButton,
          background:
            baselineScore === String(score)
              ? "#181818"
              : "rgba(255,255,255,0.7)",
          color:
            baselineScore === String(score)
              ? "#FFFFFF"
              : "#333333",
        }}
      >
        {score}
      </button>
    ))}
  </div>

  <button
    type="button"
    style={styles.mainButton}
    disabled={baselineScore === "" || baselineSaved}
    onClick={async () => {
      const { error } = await supabase.from("mind_entries").insert([
        {
          profile_key: "main",
          tool: "Root Measurement — Before",
          situation: activeState.title,
          automatic_thought: "",
          emotion: activeState.id,
          intensity: baselineScore,
          reframe: activeState.suggestion,
          next_step: activeState.pathways.join(", "),
          outcome_label: "before_intervention",
          outcome_score: Number(baselineScore),
        },
      ]);

      if (error) {
        alert(error.message);
        return;
      }

      setRecentStates((prev) => {
        return [activeState.id, ...prev].slice(0, 12);
      });

      setBaselineSaved(true);
    }}
  >
    {baselineSaved ? "Starting score saved ✓" : "Save starting score"}
  </button>

  {baselineSaved && (
    <p style={styles.outcomeSaved}>
      Root has recorded {activeState.title.toLowerCase()} at{" "}
      {baselineScore} out of 10. Complete an intervention and Root will
      measure the same experience again.
    </p>
  )}
</div>

{baselineSaved && (
  <div style={styles.pathwayList}>
  {activeState.pathways.map((pathway) => (
  <div key={pathway} style={styles.pathwayItem}>
    <span style={styles.pathwayDot} />
    <span>{pathway}</span>
  </div>
))}
  </div>
)}
  {activeState.journey && (
  <button
    style={styles.journeyButton}
    onClick={() => {
  setActiveJourney(journeys[activeState.journey]);
  setJourneyStep(0);
  setJourneyComplete(false);
}}
  >
    Begin {journeys[activeState.journey].title}
  </button>
)}
      </div>
    )}

<button
  style={styles.insightToggle}
  onClick={() => setShowInsights((prev) => !prev)}
>
  {showInsights
    ? "Hide Root insights"
    : "What Root has noticed"}
</button>
{showInsights && recoveryTrend && (
  <div style={styles.trendCard}>
    <p style={styles.trendLabel}>Recovery intelligence</p>
    <p style={styles.trendText}>{recoveryTrend}</p>
  </div>
)}
     {showInsights && rootNotice && (
  <div style={styles.noticeCard}>
    <p style={styles.noticeLabel}>Root notices</p>
    <p style={styles.noticeText}>{rootNotice}</p>
  </div>
)}
  <h2 style={styles.supportTitle}>
  Choose your route through this.
</h2>

<p style={styles.supportSubtitle}>
  Root has made a suggestion, but you are not locked into one technique. If something did not help before, try another route.
</p>
              <div style={styles.supportPanel}>
                {visibleTools.map((tool) => (
                  <button
                    key={tool.id}
                    style={styles.toolCard}
                    onClick={() => openTool(tool.id)}
                  >
                      {activeState && visibleTools.slice(0, 3).some((item) => item.id === tool.id) && (
  <span style={styles.recommendedBadge}>
    Recommended for {activeState.title}
  </span>
)}
                    <span style={styles.icon}>{tool.icon}</span>
                    <strong style={styles.toolTitle}>{tool.title}</strong>
                    <span style={styles.toolSubtitle}>{tool.subtitle}</span>
                  </button>
                ))}
              </div>

             <p style={styles.disclaimer}>
  Root Health offers lifestyle and emotional support. It is not a
  replacement for medical care, therapy, or crisis support.
</p>

  </>
)}

{activeJourney && (
  <div style={styles.journeyCard}>
  <p style={styles.journeyLabel}>
      Guided nervous-system journey
    </p>

    <h2 style={styles.journeyTitle}>
      {activeJourney.title}
    </h2>

    <p style={styles.journeyDescription}>
      {activeJourney.description}
    </p>

    <div style={styles.journeyStepCard}>
      <p style={styles.journeyStepCount}>
        Step {journeyStep + 1} of {activeJourney.steps.length}
      </p>

      <h3 style={styles.journeyStepTitle}>
        {activeJourney.steps[journeyStep].title}
      </h3>

      <p style={styles.journeyStepText}>
        {activeJourney.steps[journeyStep].text}
      </p>
    </div>

    <div style={styles.journeyActions}>
  {journeyStep > 0 && (
    <button
      style={styles.journeySecondary}
      onClick={() => setJourneyStep((prev) => prev - 1)}
    >
      Back
    </button>
  )}

  {journeyStep < activeJourney.steps.length - 1 && (
    <button
      style={styles.journeyPrimary}
      onClick={() => setJourneyStep((prev) => prev + 1)}
    >
      Continue
    </button>
  )}
</div>

       {journeyStep === activeJourney.steps.length - 1 && (
  <div
    style={{
      ...styles.recoveryCard,
      position: "relative",
      zIndex: 30,
    }}
  >
    <p style={styles.recoveryLabel}>After-intervention measurement</p>

<h3 style={styles.recoveryTitle}>
  How intense does {activeState?.title.toLowerCase() || "this experience"} feel now?
</h3>

<p style={styles.recommendationText}>
  Measure the same experience again. 0 means not present. 10 means as
  intense as it could be.
</p>

<div style={styles.scoreRow}>
  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
    <button
      key={score}
      type="button"
      style={styles.scoreButton}
      onClick={async () => {
        const beforeScore = Number(baselineScore);
        const afterScore = Number(score);
        const improvement = beforeScore - afterScore;

        try {
          await saveEntry({
            tool: "Root Measurement — After",
            situation: activeState?.title || "Emotional experience",
            automatic_thought: "",
            emotion: activeState?.id || "panic",
            intensity: String(afterScore),
            reframe: "The user completed the Panic Reset journey.",
            next_step: `Before: ${beforeScore}/10. After: ${afterScore}/10. Improvement: ${improvement} points.`,
          });

          if (improvement > 0) {
            setRecoverySavedMessage(
              `Root measured a ${improvement}-point reduction: ${beforeScore} → ${afterScore}.`
            );
          } else if (improvement === 0) {
            setRecoverySavedMessage(
              `Root measured no immediate change: ${beforeScore} → ${afterScore}.`
            );
          } else {
            setRecoverySavedMessage(
              `Root measured an increase of ${Math.abs(
                improvement
              )} points: ${beforeScore} → ${afterScore}.`
            );
          }
        } catch (err) {
          console.log("Post-intervention measurement failed:", err);
          setRecoverySavedMessage(
            "Root recorded your response but could not confirm the save."
          );
        }

        setTimeout(() => {
          setActiveJourney(null);
          setJourneyStep(0);
          setJourneyComplete(false);
          setActiveState(null);
          setBaselineScore("");
          setBaselineSaved(false);
        }, 2200);
      }}
    >
      {score}
    </button>
  ))}
</div>
  </div>
)}
  </div>
)}
{activeTool && (
            <button style={styles.backButton} onClick={() => setActiveTool(null)}>
              ← Back to tools
            </button>
          )}

          {activeTool === "cbt" && (
            <div style={styles.panel}>
              <p style={styles.kicker}>Thought work</p>
              <h2 style={styles.panelTitle}>CBT-style reframing</h2>
              <p style={styles.panelSubtitle}>
                Notice the thought underneath the emotion, then create a little
                space around it.
              </p>

              <label style={styles.label}>1. What happened?</label>
              <textarea
                style={styles.textarea}
                value={situation}
                onChange={(e) => setSituation(e.target.value)}
                placeholder="Example: I saw an email and immediately felt pressure..."
              />

              <label style={styles.label}>2. What thought showed up?</label>
              <textarea
                style={styles.textarea}
                value={automaticThought}
                onChange={(e) => setAutomaticThought(e.target.value)}
                placeholder="Example: I’m going to mess this up..."
              />

              <label style={styles.label}>3. What emotion was loudest?</label>
              <input
                style={styles.input}
                value={emotion}
                onChange={(e) => setEmotion(e.target.value)}
                placeholder="Example: anxiety, shame, frustration..."
              />

              <label style={styles.label}>4. How strong was it?</label>
              <div style={styles.scoreRow}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                  <button
                    key={score}
                    onClick={() => setIntensity(String(score))}
                    style={{
                      ...styles.scoreButton,
                      background: intensity === String(score) ? "#181818" : "rgba(255,255,255,0.7)",
                      color: intensity === String(score) ? "#FFFFFF" : "#333333",
                    }}
                  >
                    {score}
                  </button>
                ))}
              </div>

              <button style={styles.mainButton} onClick={generateReframe}>
                Create reframe
              </button>

              {reframe && (
                <div style={styles.resultCard}>
                  <p style={styles.resultLabel}>Root reframe</p>
                  <p style={styles.resultText}>{reframe}</p>

                  <p style={styles.resultLabel}>Next grounded step</p>
                  <p style={styles.resultText}>{nextStep}</p>

                  <button style={styles.saveButton} onClick={saveCbt}>
                    {saving ? "Saving..." : saved ? "Saved ✓" : "Save to Coach memory"}
                  </button>
                    <button
  style={styles.talkButton}
  onClick={() => {
    const coachContext = {
      source: "thought_work",
      situation,
      automaticThought,
      emotion,
      intensity,
      reframe,
      nextStep,
      createdAt: Date.now(),
    };

    localStorage.setItem(
      "root_pending_coach_context_v1",
      JSON.stringify(coachContext)
    );

    window.location.href = "/coach";
  }}
>
  Talk this through with Voice Coach →
</button>
                </div>
              )}
            </div>
          )}

          {activeTool === "breathwork" && (
  <ToolExperience
    kicker={`Technique ${bodyIndex + 1} of ${bodyTechniques.length}`}
    title={bodyTechniques[bodyIndex].title}
    subtitle="A body-based pathway to reduce physical activation."
    body={bodyTechniques[bodyIndex].body}
    audio={bodyTechniques[bodyIndex].audio}
    showTechniqueButtons={true}
    onPreviousTechnique={() =>
      setBodyIndex((current) =>
        current === 0 ? bodyTechniques.length - 1 : current - 1
      )
    }
    onNextTechnique={() =>
      setBodyIndex((current) =>
        current === bodyTechniques.length - 1 ? 0 : current + 1
      )
    }
    saveEntry={(entry) =>
      saveEntry({
        ...entry,
        tool: bodyTechniques[bodyIndex].title,
        situation: "The user completed a body regulation intervention.",
        reframe: "The user completed a body regulation intervention.",
        next_step: "Check whether physical activation has reduced.",
      })
    }
  />
)}

{activeTool === "grounding" && (
  <ToolExperience
    kicker={`Technique ${groundingIndex + 1} of ${groundingTechniques.length}`}
    title={groundingTechniques[groundingIndex].title}
    subtitle="A grounding pathway to help the nervous system recognise the present moment."
    body={groundingTechniques[groundingIndex].body}
    audio={groundingTechniques[groundingIndex].audio}
    showTechniqueButtons={true}
    onPreviousTechnique={() =>
      setGroundingIndex((current) =>
        current === 0 ? groundingTechniques.length - 1 : current - 1
      )
    }
    onNextTechnique={() =>
      setGroundingIndex((current) =>
        current === groundingTechniques.length - 1 ? 0 : current + 1
      )
    }
    saveEntry={(entry) =>
      saveEntry({
        ...entry,
        tool: groundingTechniques[groundingIndex].title,
        situation: "The user completed a grounding intervention.",
        reframe: "The user completed a grounding intervention.",
        next_step:
          "Check whether the user feels more present, safer, or less overwhelmed.",
      })
    }
  />
)}
{activeTool === "calming" && (
  <ToolExperience
    kicker={`Technique ${calmingIndex + 1} of ${calmingTechniques.length}`}
    title={calmingTechniques[calmingIndex].title}
    subtitle="A gentle inner reset for the body and mind."
    body={calmingTechniques[calmingIndex].body}
    audio={calmingTechniques[calmingIndex].audio}
    showTechniqueButtons={true}
    onPreviousTechnique={() =>
      setCalmingIndex((current) =>
        current === 0 ? calmingTechniques.length - 1 : current - 1
      )
    }
    onNextTechnique={() =>
      setCalmingIndex((current) =>
        current === calmingTechniques.length - 1 ? 0 : current + 1
      )
    }
    saveEntry={(entry) =>
      saveEntry({
        ...entry,
        tool: calmingTechniques[calmingIndex].title,
        situation: "The user completed a calming intervention.",
        reframe: "The user completed a calming intervention.",
        next_step:
          "Check whether the user feels softer, calmer, safer, or more settled.",
      })
    }
  />
)}{activeTool === "journal" && (
            <div style={styles.panel}>
              <p style={styles.kicker}>Reflection</p>
              <h2 style={styles.panelTitle}>Journaling prompts</h2>
              <p style={styles.panelSubtitle}>
                This is a light bridge into reflection. The full Journal page
                holds the deeper history and patterns.
              </p>

              <label style={styles.label}>What is on your mind?</label>
              <textarea
                style={styles.textarea}
                value={journalText}
                onChange={(e) => setJournalText(e.target.value)}
                placeholder="Write a little, or just a few words..."
              />

              <button
                style={styles.mainButton}
                onClick={() =>
                  saveEntry({
                    tool: "Journaling prompts",
                    situation: journalText,
                    automatic_thought: "",
                    emotion: "",
                    intensity: "",
                    reframe: journalText,
                    next_step:
                      "Reflect on what repeated, what softened, and what needs attention next.",
                  })
                }
              >
                {saving ? "Saving..." : saved ? "Saved ✓" : "Save to Coach memory"}
              </button>
            </div>
          )}

          {activeTool === "values" && (
            <div style={styles.panel}>
              <p style={styles.kicker}>Aligned action</p>
              <h2 style={styles.panelTitle}>Values & behaviour change</h2>
              <p style={styles.panelSubtitle}>
                Reconnect with what matters, then choose one small action that
                moves you towards it.
              </p>

              <label style={styles.label}>What matters here?</label>
              <textarea
                style={styles.textarea}
                value={valueFocus}
                onChange={(e) => setValueFocus(e.target.value)}
                placeholder="Example: honesty, calm, health, family, courage..."
              />

              <label style={styles.label}>What is one small action?</label>
              <textarea
                style={styles.textarea}
                value={valueAction}
                onChange={(e) => setValueAction(e.target.value)}
                placeholder="Example: send the message, take a walk, prepare one meal..."
              />

              <button
                style={styles.mainButton}
                onClick={() =>
                  saveEntry({
                    tool: "Values & behaviour change",
                    situation: valueFocus,
                    automatic_thought: "",
                    emotion: "",
                    intensity: "",
                    reframe: "The user identified this value: " + valueFocus,
                    next_step: valueAction,
                  })
                }
              >
                {saving ? "Saving..." : saved ? "Saved ✓" : "Save to Coach memory"}
              </button>
            </div>
          )}
               </section>
      </main>
    </RootAtmosphere>
  );
}
function OutcomeButtons({ toolName, summary, nextStepText, saveEntry }) {
  const [savedOutcome, setSavedOutcome] = useState("");

  return (
    <div style={styles.outcomeCard}>
      <p style={styles.outcomeLabel}>Did this help?</p>

      <div style={styles.outcomeOptions}>
        {outcomeOptions.map((option) => (
          <button
            key={option.label}
            style={styles.outcomeButton}
            onClick={async () => {
              await saveEntry({
                tool: toolName,
                situation: summary,
                automatic_thought: "",
                emotion: "",
                intensity: "",
                reframe: summary,
                next_step: nextStepText,
                outcome_label: option.label,
                outcome_score: option.score,
              });

              setSavedOutcome(option.label);
            }}
          >
            {option.label}
          </button>
        ))}
      </div>

      {savedOutcome && (
        <p style={styles.outcomeSaved}>
          Saved. Root will remember that this felt: {savedOutcome}.
        </p>
      )}
    </div>
  );
}

function ToolExperience({
  kicker,
  title,
  subtitle,
  body,
  saveEntry,
  showTechniqueButtons = false,
  onPreviousTechnique,
  onNextTechnique,
  audio,
  speakText,
  stopSpeaking,
  speakingText,
}) {
  return (
    <div style={styles.panel}>
      <p style={styles.kicker}>{kicker}</p>
      <h2 style={styles.panelTitle}>{title}</h2>
      <p style={styles.panelSubtitle}>{subtitle}</p>

      <div style={styles.experienceCard}>
        <p style={styles.experienceText}>{body}</p>
      </div>
 {audio ? (
  <div style={styles.audioPlayerCard}>
    <p style={styles.audioLabel}>Guided Audio</p>

    <audio
      controls
      src={audio}
      style={styles.audioPlayer}
    />
  </div>
) : (
  <div style={styles.listenRow}>
    <button
      style={styles.listenButton}
      onClick={() => {
        if (typeof speakText === "function") {
          speakText(`${title}. ${body}`);
        }
      }}
    >
      ▶ Listen
    </button>

    {speakingText && (
      <button
        style={styles.stopButton}
        onClick={stopSpeaking}
      >
        ■ Stop
      </button>
    )}
  </div>
)}
    {showTechniqueButtons && (
  <div style={styles.techniqueBar}>
    <button
      style={styles.techniqueButton}
      onClick={onPreviousTechnique}
    >
      Previous Technique
    </button>

    <button
      style={styles.techniqueButton}
      onClick={onNextTechnique}
    >
      Try Another Technique
    </button>
  </div>
)}

      <OutcomeButtons
        toolName={title}
        summary={body}
        nextStepText="Root will watch whether this support helps over time."
        saveEntry={saveEntry}
      />
    </div>
  );
}
const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    padding: "28px",
  },
supportTitle: {
  margin: "0 0 10px",
  fontSize: "28px",
  fontWeight: "700",
  color: "#FFFFFF",
},

supportSubtitle: {
  margin: "0 0 24px",
  lineHeight: "1.7",
  color: "rgba(255,255,255,0.82)",
},

 shell: {
  position: "relative",
  overflow: "hidden",
  width: "100%",
  maxWidth: "1120px",
  background: "rgba(255,255,255,0.22)",
  border: "1px solid rgba(255,255,255,0.42)",
  backdropFilter: "blur(30px)",
  borderRadius: "42px",
  padding: "38px",
  boxShadow: "0 34px 100px rgba(20,18,15,0.16)",
},
  glow: {
    position: "absolute",
    top: "-110px",
    right: "-70px",
    width: "280px",
    height: "280px",
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(0,0,0,0.14), rgba(0,0,0,0.02) 70%)",
  },

  header: {
    textAlign: "center",
    position: "relative",
    zIndex: 2,
    marginBottom: "28px",
  },

  brandMark: {
    fontSize: "46px",
    marginBottom: "6px",
  },

  kicker: {
  margin: "0 0 10px",
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  color: "rgba(255,255,255,0.82)",
  fontWeight: "800",
  textShadow: "0 2px 14px rgba(0,0,0,0.34)",
},

 title: {
  margin: "0 0 12px",
  fontSize: "48px",
  color: "#FFFFFF",
  letterSpacing: "-0.04em",
  textShadow: "0 3px 24px rgba(0,0,0,0.42)",
},

 subtitle: {
  maxWidth: "760px",
  margin: "0 auto",
  color: "rgba(255,255,255,0.92)",
  lineHeight: "1.75",
  fontSize: "17px",
  textShadow: "0 2px 18px rgba(0,0,0,0.42)",
},
  
  heroCard: {
  background:
    "linear-gradient(135deg, rgba(24,24,24,0.54), rgba(52,48,42,0.40))",
  borderRadius: "34px",
  padding: "32px",
  color: "#FFFFFF",
  marginBottom: "22px",
  boxShadow: "0 24px 70px rgba(0,0,0,0.16)",
  border: "1px solid rgba(255,255,255,0.14)",
  backdropFilter: "blur(18px)",
},
  heroLabel: {
    margin: "0 0 12px",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.14em",
    color: "#D8CDBB",
    fontWeight: "800",
  },

  heroTitle: {
    margin: "0 0 12px",
    fontSize: "30px",
  },

  heroText: {
    margin: 0,
    lineHeight: "1.75",
    color: "#E7E0D6",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "16px",
    marginBottom: "24px",
  },

 toolCard: {
  border: "1px solid rgba(255,255,255,0.34)",
  borderRadius: "30px",
  padding: "26px",
  background: "rgba(255,255,255,0.18)",
  cursor: "pointer",
  textAlign: "left",
  boxShadow: "0 16px 40px rgba(0,0,0,0.08)",
  display: "flex",
  flexDirection: "column",
  gap: "10px",
  backdropFilter: "blur(18px)",
},
  icon: {
    fontSize: "30px",
  },

  toolTitle: {
    fontSize: "18px",
    color: "#FFFFFF",
  },

 toolSubtitle: {
  marginTop: "6px",
  color: "rgba(255,255,255,0.78)",
  lineHeight: "1.6",
  fontSize: "14px",
},
  disclaimer: {
    marginTop: "24px",
    color: "#6F675B",
    fontSize: "13px",
    lineHeight: "1.6",
    textAlign: "center",
  },

  backButton: {
    border: "1px solid rgba(255,255,255,0.72)",
    background: "rgba(255,255,255,0.68)",
    borderRadius: "999px",
    padding: "11px 16px",
    cursor: "pointer",
    marginBottom: "18px",
    color: "#333",
    backdropFilter: "blur(8px)",
  },

  panel: {
  background: "rgba(255,255,255,0.20)",
  border: "1px solid rgba(255,255,255,0.34)",
  borderRadius: "36px",
  padding: "36px",
  textAlign: "left",
  boxShadow: "0 20px 54px rgba(20,18,15,0.10)",
  backdropFilter: "blur(22px)",
},
  panelTitle: {
    margin: "0 0 10px",
    fontSize: "32px",
    color: "#181818",
  },

  panelSubtitle: {
    color: "#5A554D",
    lineHeight: "1.75",
    marginBottom: "24px",
  },

  label: {
    display: "block",
    margin: "20px 0 10px",
    fontSize: "15px",
    fontWeight: "800",
    color: "#2A2722",
  },

  textarea: {
    width: "100%",
    minHeight: "110px",
    border: "1px solid rgba(255,255,255,0.8)",
    borderRadius: "24px",
    padding: "18px",
    fontSize: "15px",
    resize: "vertical",
    outline: "none",
    boxSizing: "border-box",
    lineHeight: "1.75",
    background: "rgba(255,255,255,0.76)",
  },

  input: {
    width: "100%",
    border: "1px solid rgba(255,255,255,0.8)",
    borderRadius: "24px",
    padding: "16px",
    fontSize: "15px",
    outline: "none",
    boxSizing: "border-box",
    background: "rgba(255,255,255,0.76)",
  },

  scoreRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
  },

  scoreButton: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    border: "1px solid rgba(255,255,255,0.75)",
    cursor: "pointer",
  },

  mainButton: {
    marginTop: "22px",
    border: "none",
    borderRadius: "20px",
    padding: "14px 24px",
    background: "#181818",
    color: "#FFFFFF",
    cursor: "pointer",
    fontSize: "15px",
  },

  resultCard: {
    marginTop: "24px",
    background: "rgba(24,24,24,0.08)",
    borderRadius: "28px",
    padding: "24px",
    border: "1px solid rgba(24,24,24,0.08)",
  },

  resultLabel: {
    margin: "0 0 8px",
    fontSize: "12px",
    color: "#6F675B",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    fontWeight: "800",
  },

  resultText: {
    whiteSpace: "pre-line",
    lineHeight: "1.75",
    color: "#333",
    marginBottom: "18px",
  },

  experienceCard: {
  background:
    "linear-gradient(135deg, rgba(24,24,24,0.46), rgba(52,48,42,0.32))",
  color: "#FFFFFF",
  borderRadius: "34px",
  padding: "34px",
  marginTop: "22px",
  marginBottom: "20px",
  boxShadow: "0 20px 56px rgba(0,0,0,0.14)",
  border: "1px solid rgba(255,255,255,0.14)",
  backdropFilter: "blur(18px)",
},
  experienceText: {
    whiteSpace: "pre-line",
    lineHeight: "1.9",
    fontSize: "16px",
    color: "#F2EDE6",
    margin: 0,
  },

  saveButton: {
    border: "none",
    borderRadius: "20px",
    padding: "14px 22px",
    background: "#181818",
    color: "#FFFFFF",
    cursor: "pointer",
    fontSize: "14px",
  },
  stateIntro: {
  textAlign: "center",
  marginBottom: "24px",
},

stateKicker: {
  margin: "0 0 10px",
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  color: "#6F675B",
  fontWeight: "800",
},

stateTitle: {
  margin: "0 0 12px",
  fontSize: "34px",
  color: "#181818",
},

stateSubtitle: {
  margin: "0 auto",
  maxWidth: "720px",
  color: "#5A554D",
  lineHeight: "1.7",
},

stateGrid: {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
  gap: "16px",
  marginBottom: "28px",
},

stateCard: {
  border: "1px solid rgba(255,255,255,0.34)",
  borderRadius: "28px",
  padding: "22px",
  background: "rgba(255,255,255,0.16)",
  backdropFilter: "blur(18px)",
  textAlign: "left",
  cursor: "pointer",
  transition: "all 0.25s ease",
},

stateCardActive: {
  background:
    "linear-gradient(135deg, rgba(24,24,24,0.62), rgba(52,48,42,0.42))",
  color: "#FFFFFF",
  transform: "translateY(-2px)",
},

stateCardTitle: {
  display: "block",
  marginBottom: "10px",
  fontSize: "18px",
},

stateCardText: {
  margin: 0,
  lineHeight: "1.6",
  fontSize: "14px",
},

recommendationCard: {
  marginBottom: "30px",
  borderRadius: "32px",
  padding: "28px",
  background:
    "linear-gradient(135deg, rgba(24,24,24,0.54), rgba(52,48,42,0.36))",
  color: "#FFFFFF",
  boxShadow: "0 20px 60px rgba(0,0,0,0.12)",
},

recommendationLabel: {
  margin: "0 0 10px",
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  color: "#D8CDBB",
  fontWeight: "800",
},

recommendationTitle: {
  margin: "0 0 12px",
  fontSize: "28px",
},

recommendationText: {
  margin: 0,
  lineHeight: "1.8",
  color: "#ECE6DC",
},
  pathwayList: {
  marginTop: "22px",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
},

pathwayItem: {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  fontSize: "15px",
  color: "#F4EEE4",
},

pathwayDot: {
  width: "10px",
  height: "10px",
  borderRadius: "50%",
  background: "#DCC7A1",
  flexShrink: 0,
},
 recommendedBadge: {
  alignSelf: "flex-start",
  borderRadius: "999px",
  padding: "7px 11px",
  background: "rgba(24,24,24,0.72)",
  color: "#FFFFFF",
  fontSize: "11px",
  fontWeight: "800",
  letterSpacing: "0.04em",
},
  noticeCard: {
  marginBottom: "24px",
  borderRadius: "30px",
  padding: "24px",
  background:
    "linear-gradient(135deg, rgba(255,255,255,0.16), rgba(255,255,255,0.08))",
  border: "1px solid rgba(255,255,255,0.24)",
  backdropFilter: "blur(18px)",
  boxShadow: "0 18px 40px rgba(0,0,0,0.10)",
},

noticeLabel: {
  margin: "0 0 10px",
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  color: "#F4E7CF",
  fontWeight: "800",
},

noticeText: {
  margin: 0,
  color: "#FFFFFF",
  lineHeight: "1.8",
  fontSize: "16px",
},
  journeyButton: {
  marginTop: "16px",
  border: "none",
  borderRadius: "999px",
  padding: "12px 18px",
  background: "rgba(24,24,24,0.82)",
  color: "#FFF",
  fontWeight: "700",
  cursor: "pointer",
},

journeyCard: {
  marginBottom: "26px",
  borderRadius: "34px",
  padding: "32px",
  background:
    "linear-gradient(135deg, rgba(255,255,255,0.16), rgba(255,255,255,0.08))",
  border: "1px solid rgba(255,255,255,0.24)",
  backdropFilter: "blur(18px)",
  boxShadow: "0 20px 50px rgba(0,0,0,0.12)",
},

journeyLabel: {
  margin: "0 0 10px",
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  color: "#F4E7CF",
  fontWeight: "800",
},

journeyTitle: {
  margin: "0 0 14px",
  fontSize: "38px",
  lineHeight: "1.1",
  color: "#FFF",
  fontFamily: "Georgia, serif",
},

journeyDescription: {
  margin: "0 0 24px",
  color: "rgba(255,255,255,0.82)",
  lineHeight: "1.8",
},

journeyStepCard: {
  borderRadius: "26px",
  padding: "24px",
  background: "rgba(0,0,0,0.18)",
  marginBottom: "22px",
},

journeyStepCount: {
  margin: "0 0 10px",
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  color: "rgba(255,255,255,0.62)",
},

journeyStepTitle: {
  margin: "0 0 14px",
  fontSize: "28px",
  lineHeight: "1.2",
  color: "#FFF",
  fontFamily: "Georgia, serif",
},

journeyStepText: {
  margin: 0,
  color: "rgba(255,255,255,0.88)",
  lineHeight: "1.9",
  fontSize: "18px",
},

journeyActions: {
  display: "flex",
  gap: "14px",
  flexWrap: "wrap",
},
  

journeyPrimary: {
  border: "none",
  borderRadius: "999px",
  padding: "14px 22px",
  background: "#FFF",
  color: "#111",
  fontWeight: "700",
  cursor: "pointer",
},

journeySecondary: {
  border: "1px solid rgba(255,255,255,0.24)",
  borderRadius: "999px",
  padding: "14px 22px",
  background: "rgba(255,255,255,0.08)",
  color: "#FFF",
  fontWeight: "700",
  cursor: "pointer",
},
  recoveryCard: {
  marginTop: "22px",
  padding: "24px",
  borderRadius: "28px",
  background: "rgba(255,255,255,0.12)",
  border: "1px solid rgba(255,255,255,0.22)",
},

recoveryLabel: {
  margin: "0 0 10px",
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  color: "#F4E7CF",
  fontWeight: "800",
},

recoveryTitle: {
  margin: "0 0 16px",
  color: "#FFFFFF",
  fontSize: "24px",
  fontFamily: "Georgia, serif",
},

recoveryOptions: {
  display: "flex",
  flexWrap: "wrap",
  gap: "12px",
},

recoveryButton: {
  position: "relative",
  zIndex: 40,
  border: "none",
  borderRadius: "999px",
  padding: "12px 16px",
  background: "#FFFFFF",
  color: "#111",
  fontWeight: "700",
  cursor: "pointer",
},
savedNoticeCard: {
  marginBottom: "24px",
  borderRadius: "30px",
  padding: "24px",
  background:
    "linear-gradient(135deg, rgba(255,255,255,0.22), rgba(255,255,255,0.10))",
  border: "1px solid rgba(255,255,255,0.30)",
  backdropFilter: "blur(18px)",
  boxShadow: "0 18px 40px rgba(0,0,0,0.10)",
},

savedNoticeLabel: {
  margin: "0 0 10px",
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  color: "#F4E7CF",
  fontWeight: "800",
},

savedNoticeText: {
  margin: 0,
  color: "#FFFFFF",
  lineHeight: "1.8",
  fontSize: "16px",
},
  trendCard: {
  marginBottom: "24px",
  borderRadius: "30px",
  padding: "24px",
  background:
    "linear-gradient(135deg, rgba(255,255,255,0.18), rgba(255,255,255,0.08))",
  border: "1px solid rgba(255,255,255,0.26)",
  backdropFilter: "blur(18px)",
  boxShadow: "0 18px 40px rgba(0,0,0,0.10)",
},

trendLabel: {
  margin: "0 0 10px",
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  color: "#F4E7CF",
  fontWeight: "800",
},

trendText: {
  margin: 0,
  color: "#FFFFFF",
  lineHeight: "1.8",
  fontSize: "16px",
},
  insightToggle: {
  width: "100%",
  border: "1px solid rgba(255,255,255,0.18)",
  borderRadius: "999px",
  padding: "14px 18px",
  background: "rgba(255,255,255,0.08)",
  color: "#FFFFFF",
  fontWeight: "700",
  fontSize: "15px",
  cursor: "pointer",
  marginBottom: "20px",
  backdropFilter: "blur(10px)",
},
  outcomeCard: {
  marginTop: "22px",
  padding: "22px",
  borderRadius: "28px",
  background: "rgba(255,255,255,0.18)",
  border: "1px solid rgba(255,255,255,0.24)",
  backdropFilter: "blur(18px)",
},

outcomeLabel: {
  margin: "0 0 14px",
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  color: "#F4E7CF",
  fontWeight: "800",
},

outcomeOptions: {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px",
},

outcomeButton: {
  border: "none",
  borderRadius: "999px",
  padding: "12px 15px",
  background: "#FFFFFF",
  color: "#111",
  fontWeight: "800",
  cursor: "pointer",
},

outcomeSaved: {
  margin: "14px 0 0",
  color: "#FFFFFF",
  lineHeight: "1.6",
  fontWeight: "700",
},
supportPanel: {
  marginBottom: "24px",
  padding: "28px",
  borderRadius: "34px",
  background:
    "linear-gradient(135deg, rgba(24,24,24,0.52), rgba(52,48,42,0.34))",
  border: "1px solid rgba(255,255,255,0.18)",
  backdropFilter: "blur(18px)",
  boxShadow: "0 20px 60px rgba(0,0,0,0.12)",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "16px",
},  
  techniqueBar: {
  display: "flex",
  gap: "12px",
  flexWrap: "wrap",
  marginTop: "18px",
  marginBottom: "18px",
},

techniqueButton: {
  border: "none",
  borderRadius: "999px",
  padding: "12px 16px",
  background: "rgba(255,255,255,0.18)",
  color: "#FFFFFF",
  fontWeight: "700",
  cursor: "pointer",
},
  listenRow: {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px",
  marginTop: "16px",
  marginBottom: "18px",
},

listenButton: {
  border: "none",
  borderRadius: "999px",
  padding: "12px 16px",
  background: "#FFFFFF",
  color: "#111111",
  fontWeight: "800",
  cursor: "pointer",
},

stopButton: {
  border: "1px solid rgba(255,255,255,0.22)",
  borderRadius: "999px",
  padding: "12px 16px",
  background: "rgba(255,255,255,0.14)",
  color: "#FFFFFF",
  fontWeight: "800",
  cursor: "pointer",
},
  audioPlayerCard: {
  marginTop: "18px",
  marginBottom: "18px",
  padding: "18px",
  borderRadius: "24px",
  background: "rgba(255,255,255,0.16)",
  border: "1px solid rgba(255,255,255,0.22)",
},

audioLabel: {
  margin: "0 0 10px",
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  color: "#F4E7CF",
  fontWeight: "800",
},

audioPlayer: {
  width: "100%",
},
  talkButton: {
  marginTop: "12px",
  border: "1px solid rgba(24,24,24,0.16)",
  borderRadius: "20px",
  padding: "14px 22px",
  background: "rgba(255,255,255,0.72)",
  color: "#181818",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: "800",
},
};
