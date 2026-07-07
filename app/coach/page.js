"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import Nav from "../../components/Nav";
import RootEnso from "../../components/RootEnso";
import RootAtmosphere from "../../components/RootAtmosphere";
import { getCurrentProfileKey } from "../../lib/currentUser";

const signalToCoach = {
  "racing thoughts": "mind",
  "panic feeling": "mind",
  overwhelm: "mind",
  "wired but tired": "mind",
  tension: "trauma",
  "numb or detached": "trauma",
  "hard to settle": "trauma",
  aching: "movement",
  stiffness: "movement",
  "sharp pain": "movement",
  weakness: "movement",
  reflux: "nutrition",
  bloating: "nutrition",
  nausea: "nutrition",
  cravings: "nutrition",
  fatigue: "lifestyle",
  "poor sleep": "lifestyle",
  "sleep disruption": "lifestyle",
  "brain fog": "lifestyle",
};

const coachModes = [
    {
    id: "grounding",
    label: "Grounding",
    icon: "🌬️",
  },
    {
    id: "sleep",
    label: "Sleep wind-down",
    icon: "🌙",
  },
    {
    id: "reflection",
    label: "Reflection",
    icon: "🪞",
  },
  { id: "nutrition", label: "Nutrition", icon: "🥗" },
  { id: "mind", label: "Mind & mood", icon: "🧠" },
  { id: "trauma", label: "Trauma & nervous system", icon: "🧩" },
  { id: "movement", label: "Movement & body", icon: "🏃" },
  { id: "lifestyle", label: "Lifestyle", icon: "🌿" },
];
const modeAtmospheres = {
  grounding: {
    label: "Grounding atmosphere",
    background:
      "linear-gradient(135deg, rgba(226,215,194,0.94), rgba(185,197,189,0.86))",
    orbText: "Settle the system.",
  },
  sleep: {
    label: "Sleep atmosphere",
    background:
      "linear-gradient(135deg, rgba(47,52,58,0.92), rgba(108,103,92,0.82))",
    orbText: "Let the day soften.",
  },
  reflection: {
    label: "Reflection atmosphere",
    background:
      "linear-gradient(135deg, rgba(218,205,184,0.92), rgba(158,142,119,0.72))",
    orbText: "Listen beneath the noise.",
  },
  default: {
    label: "Root atmosphere",
    background:
      "linear-gradient(135deg, rgba(250,244,234,0.82), rgba(255,255,255,0.54))",
    orbText: "Slow down. Speak freely.",
  },
};

function buildWelcome(name, history = [], mindEntries = [], journalEntries = []) {
  const cleanName = String(name || "").trim();
  const greeting = cleanName ? `Welcome back, ${cleanName}.` : "Welcome back.";
  const latestJournal = Array.isArray(journalEntries) ? journalEntries[0] : null;
  const latestMind = Array.isArray(mindEntries) ? mindEntries[0] : null;
  const latestBody = Array.isArray(history) ? history[0] : null;

  if (latestMind?.thought_theme) {
    return (
      `${greeting} Last time, Thought Work explored ${latestMind.thought_theme}.\n\n` +
      `${latestMind.thought_notice || "That may be worth staying with gently."}\n\n` +
      `We can stay with that first, or you can choose another direction.`
    );
  }

  if (latestMind) {
    const emotion = latestMind.emotion || "something emotional";
    return `${greeting} Last time, you were working with ${emotion.toLowerCase()}.\n\nDo you want to continue with that, or focus somewhere else?`;
  }

  if (latestJournal) {
    const theme = latestJournal.emotional_theme || "";
    if (theme && theme !== "general reflection") {
      return `${greeting} Your recent reflection seemed connected to ${theme}.\n\nDo you want to explore that, use a Mind & Mood tool, or focus somewhere else?`;
    }
    return `${greeting} I can see you added a recent reflection.\n\nDo you want to explore it, use a Mind & Mood tool, or focus somewhere else?`;
  }

  if (latestBody) {
    const signal = latestBody.signal || "your body signals";
    return `${greeting} Last time we were looking at ${signal}.\n\nDo you want to explore that, or focus on something else?`;
  }

  return `${greeting} I’m Root Coach. Choose what you want help with today, or just start typing.`;
}
function inferPlaybookMeta(transcript = "", coachMode = "") {
  const text = transcript.toLowerCase();

  if (
    text.includes("ibs") ||
    text.includes("bloating") ||
    text.includes("gut") ||
    text.includes("digest") ||
    text.includes("reflux") ||
    text.includes("constipation")
  ) {
    return {
      title: "Gut Health Plan",
      category: "Gut Health",
    };
  }

  if (
    text.includes("meal") ||
    text.includes("food") ||
    text.includes("nutrition") ||
    text.includes("diet") ||
    text.includes("protein") ||
    text.includes("breakfast") ||
    text.includes("lunch") ||
    text.includes("dinner")
  ) {
    return {
      title: "Nutrition Plan",
      category: "Nutrition",
    };
  }

  if (
    text.includes("sleep") ||
    text.includes("bedtime") ||
    text.includes("wind down") ||
    text.includes("insomnia")
  ) {
    return {
      title: "Sleep Support Plan",
      category: "Sleep",
    };
  }

  if (
    text.includes("stress") ||
    text.includes("anxiety") ||
    text.includes("panic") ||
    text.includes("overwhelm") ||
    text.includes("grounding") ||
    text.includes("breathing")
  ) {
    return {
      title: "Stress & Anxiety Support Plan",
      category: "Stress & Anxiety",
    };
  }

  if (
    text.includes("movement") ||
    text.includes("exercise") ||
    text.includes("stretch") ||
    text.includes("walk") ||
    text.includes("mobility")
  ) {
    return {
      title: "Movement Support Plan",
      category: "Movement",
    };
  }

  if (
    text.includes("recovery") ||
    text.includes("burnout") ||
    text.includes("fatigue") ||
    text.includes("reset")
  ) {
    return {
      title: "Recovery Plan",
      category: "Recovery",
    };
  }

  if (
    text.includes("emotion") ||
    text.includes("mood") ||
    text.includes("mind") ||
    text.includes("confidence") ||
    text.includes("motivation") ||
    text.includes("overthinking")
  ) {
    return {
      title: "Mind & Mood Support Plan",
      category: "Mind & Mood",
    };
  }

  if (
    text.includes("routine") ||
    text.includes("habit") ||
    text.includes("morning") ||
    text.includes("evening") ||
    text.includes("daily")
  ) {
    return {
      title: "Routine Plan",
      category: "Routines",
    };
  }

  if (coachMode === "sleep") {
    return {
      title: "Sleep Support Plan",
      category: "Sleep",
    };
  }

  if (coachMode === "nutrition") {
    return {
      title: "Nutrition Plan",
      category: "Nutrition",
    };
  }

  if (coachMode === "movement") {
    return {
      title: "Movement Support Plan",
      category: "Movement",
    };
  }

  if (coachMode === "mind") {
    return {
      title: "Mind & Mood Support Plan",
      category: "Mind & Mood",
    };
  }

  return {
    title: "Voice Coach Playbook Entry",
    category: "General",
  };
}

export default function CoachPage() {
  const [latestVoiceTranscript, setLatestVoiceTranscript] = useState("");
  const [name, setName] = useState("");
  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState([]);
  const [mindEntries, setMindEntries] = useState([]);
  const [journalEntries, setJournalEntries] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [coachMode, setCoachMode] = useState("");
  const [thinking, setThinking] = useState(false);
  const [voiceState, setVoiceState] = useState("ready");
  const [voiceEnergy, setVoiceEnergy] = useState(0);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [breathMode, setBreathMode] = useState(false);
  const [breathPhase, setBreathPhase] = useState("inhale");
  const [emotionalState, setEmotionalState] = useState("steady");
  const [journey, setJourney] = useState(null);
  const [showJourneyNext, setShowJourneyNext] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [pendingJournalSave, setPendingJournalSave] = useState(null);
   useEffect(() => {
  const checkMobile = () => {
    setIsMobile(window.innerWidth <= 900);
  };

  checkMobile();
  window.addEventListener("resize", checkMobile);

  return () => window.removeEventListener("resize", checkMobile);
}, []);
  const bottomRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const dataChannelRef = useRef(null);
  const audioElementRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const pendingPlaybookSaveRef = useRef(null);
  const latestAssistantTranscriptRef = useRef("");
  useEffect(() => {
  const load = async () => {
  const profileKey = getCurrentProfileKey();

if (!profileKey) return;
  const storedJourney = localStorage.getItem("root_journey_v1");

let parsedJourney = null;

if (storedJourney) {
  try {
    parsedJourney = JSON.parse(storedJourney);
    setJourney(parsedJourney);
  } catch (err) {
    console.log(err);
  }
}
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;

      let displayName =
        user?.user_metadata?.full_name ||
        user?.user_metadata?.name ||
        user?.email?.split("@")[0] ||
        "";

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("profile_key", profileKey)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData);
        if (profileData.name) displayName = profileData.name;
      }

      setName(displayName);

      const { data } = await supabase
        .from("body_signals")
        .select("*")
        .eq("profile_key", profileKey)
        .order("created_at", { ascending: false })
        .limit(20);

      const rows = Array.isArray(data) ? data : [];
      setHistory(rows);

      const { data: mindData } = await supabase
        .from("mind_entries")
        .select("*")
        .eq("profile_key", profileKey)
        .order("created_at", { ascending: false })
        .limit(5);

      const { data: journalData } = await supabase
        .from("journal_entries")
        .select("*")
        .eq("profile_key", profileKey)
        .order("created_at", { ascending: false })
        .limit(5);

      const journalRows = Array.isArray(journalData) ? journalData : [];

      setJournalEntries(journalRows);
      setMindEntries(Array.isArray(mindData) ? mindData : []);

      const pendingCoachContext =
  typeof window !== "undefined"
    ? localStorage.getItem("root_pending_coach_context_v1")
    : null;

if (pendingCoachContext) {
  try {
    const parsedContext = JSON.parse(pendingCoachContext);

    setCoachMode("mind");

    setMessages([
      {
        role: "coach",
        content:
          `You’ve brought something through from Thought Work.\n\n` +
          `Situation: ${parsedContext.situation || "Not recorded"}\n\n` +
          `Thought: ${parsedContext.automaticThought || "Not recorded"}\n\n` +
          `Emotion: ${parsedContext.emotion || "Not recorded"}\n\n` +
          `Intensity: ${parsedContext.intensity || "Not recorded"}/10\n\n` +
          `Root reframe: ${parsedContext.reframe || "Not recorded"}\n\n` +
          `We can talk this through gently from here. What feels most important to explore first?`,
      },
    ]);

    localStorage.removeItem("root_pending_coach_context_v1");
    return;
  } catch (error) {
    console.log("Pending coach context failed:", error);
  }
}
     const baseWelcome = buildWelcome(
  displayName,
  rows,
  Array.isArray(mindData) ? mindData : [],
  journalRows
);

if (
  parsedJourney &&
  parsedJourney.currentStage === "coach"
) {
  const bodyAreas = Array.isArray(parsedJourney.bodyAreas)
    ? parsedJourney.bodyAreas.join(", ")
    : "your body";

  const focus = parsedJourney.focus || "stress";

  setMessages([
    {
      role: "coach",
      content:
        `We’re continuing your Root journey.\n\n` +
        `You mentioned ${focus} and signals around ${bodyAreas}.\n\n` +
        `Let’s gently explore what may be contributing to that pattern.`,
    },
  ]);
} else {
  setMessages([
    {
      role: "coach",
      content: baseWelcome,
    },
  ]);
}
    };

    load();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  const chooseMode = (mode) => {
    setCoachMode(mode.id);
    setMessages((prev) => [
      ...prev,
      {
        role: "coach",
 content:
  mode.id === "grounding"
    ? "🌬️ Grounding mode selected.\n\nLet’s slow everything down. You do not need to explain it perfectly — just tell me what feels most present right now."
    : mode.id === "sleep"
    ? "🌙 Sleep wind-down selected.\n\nLet’s reduce the pressure of the day. You do not need to solve anything now — we’ll help your system settle."
    : mode.id === "reflection"
    ? "🪞 Reflection mode selected.\n\nThis space is for slowing down, reflecting, and understanding what feels important beneath the surface."
    : `${mode.icon} ${mode.label} mode selected.\n\nWhat would you like to work on today?`,      },
    ]);
  };

  const sendMessage = async (text) => {
    const clean = String(text || "").trim();
    if (!clean || thinking) return;
    const lowerClean = clean.toLowerCase();

if (
  pendingJournalSave &&
  ["yes", "yes please", "yeah", "yep", "save it", "record it", "do it"].includes(lowerClean)
) {
  setMessages((prev) => [
    ...prev,
    { role: "user", content: clean },
  ]);

  setInput("");
  await savePendingJournalEntry();
  return;
}

if (
  pendingJournalSave &&
  ["no", "no thanks", "cancel", "don't save", "dont save"].includes(lowerClean)
) {
  setMessages((prev) => [
    ...prev,
    { role: "user", content: clean },
    {
      role: "coach",
      content: "No problem. I haven’t recorded it.",
    },
  ]);

  setPendingJournalSave(null);
  setInput("");
  return;
}

    const nextMessages = [...messages, { role: "user", content: clean }];
    const wantsJournalSave =
  lowerClean.includes("save this to my journal") ||
  lowerClean.includes("save that to my journal") ||
  lowerClean.includes("record this in my journal") ||
  lowerClean.includes("record that in my journal") ||
  lowerClean.includes("add this to my journal") ||
  lowerClean.includes("add that to my journal");

if (wantsJournalSave) {
 let previousUserMessage =
  [...messages]
    .reverse()
    .find(
      (message) =>
        message.role === "user" &&
        !message.content.toLowerCase().includes("save")
    )?.content || "";

if (!previousUserMessage) {
  previousUserMessage = clean
    .replace(/save this to my journal/gi, "")
    .replace(/save that to my journal/gi, "")
    .replace(/record this in my journal/gi, "")
    .replace(/record that in my journal/gi, "")
    .replace(/add this to my journal/gi, "")
    .replace(/add that to my journal/gi, "")
    .trim();
}
  if (!previousUserMessage) {
  setMessages([
    ...nextMessages,
    {
      role: "coach",
      content:
        "I can save that, but I need the words to record. Tell me what you want saved, then say: save that to my journal.",
    },
  ]);
   
  setInput("");
  return;
}

 setPendingJournalSave(previousUserMessage);

  setMessages([
    ...nextMessages,
    {
      role: "coach",
      content: `I can save this to your journal:\n\n"${previousUserMessage}"\n\nShall I record it?`,
    },
  ]);

  setInput("");
  return;
}

    setMessages(nextMessages);
    setInput("");
    setThinking(true);
    setVoiceState("thinking");

    try {
      const res = await fetch("/api/root-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userName: name,
          profile,
          message: clean,
          history,
          mindEntries,
          journalEntries,
          conversation: nextMessages.slice(-10),
          coachMode,
        }),
      });

     const json = await res.json();

const options = Array.isArray(json.reflectiveOptions)
  ? json.reflectiveOptions
  : [];

const escalation = json.coachEscalation || null;
      setEmotionalState(json.emotionalState || "steady");
      setMessages((prev) => [
        ...prev,
       {
  role: "coach",
  content:
    json.reply ||
    "I’m here with you. Let’s slow this down and look at one thing at a time.",
  reflectiveOptions: options,
         coachEscalation: escalation,
},
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: "coach", content: "Something interrupted my response, but I’m still here." },
      ]);
    }
if (journey && journey.currentStage === "coach") {
  setShowJourneyNext(true);

  const updatedJourney = {
    ...journey,
    completedCoach: true,
    currentStage: "journal",
  };

  localStorage.setItem(
    "root_journey_v1",
    JSON.stringify(updatedJourney)
  );

  setJourney(updatedJourney);
}
    setThinking(false);
    setVoiceState("ready");
  };
  const savePendingJournalEntry = async () => {
  if (!pendingJournalSave) return;

  setThinking(true);

  try {
    const res = await fetch("/api/voice-actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
  action: "save_journal",
  title: pending.title,
  category: pending.category,
  content: assistantTranscript,
  profileKey: getCurrentProfileKey(),
}),
    });

    const json = await res.json();

    if (!json.ok) {
      throw new Error(json.error || "Save failed");
    }

    setMessages((prev) => [
      ...prev,
      {
        role: "coach",
        content: "Done. I’ve recorded that in your journal.",
      },
    ]);

    setPendingJournalSave(null);
  } catch (error) {
    setMessages((prev) => [
      ...prev,
      {
        role: "coach",
        content:
          "I tried to save that, but something went wrong. It has not been recorded yet.",
      },
    ]);
  }

  setThinking(false);
};
  const startBreathJourney = () => {
  if (breathMode) return;

  setBreathMode(true);
  setBreathPhase("inhale");

  setTimeout(() => {
    setBreathPhase("exhale");
  }, 4000);

  setTimeout(() => {
    setBreathMode(false);
    setBreathPhase("inhale");
  }, 8000);
};
const startVoiceSession = async () => {
  try {
    setVoiceState("connecting");
    setVoiceTranscript("");

  
    const pc = new RTCPeerConnection();
    peerConnectionRef.current = pc;

    const audioElement = document.createElement("audio");
    audioElement.autoplay = true;
    audioElementRef.current = audioElement;

   pc.ontrack = (event) => {
  const stream = event.streams[0];

  audioElement.srcObject = stream;

  const audioContext = new AudioContext();
  audioContextRef.current = audioContext;

  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 256;

  analyserRef.current = analyser;

  const source = audioContext.createMediaStreamSource(stream);

  source.connect(analyser);

  const dataArray = new Uint8Array(analyser.frequencyBinCount);

  const animate = () => {
    analyser.getByteFrequencyData(dataArray);

    const average =
      dataArray.reduce((sum, value) => sum + value, 0) /
      dataArray.length;

    const normalized = Math.min(average / 90, 1);

    setVoiceEnergy(normalized);

    animationFrameRef.current = requestAnimationFrame(animate);
  };

  animate();
};

    const mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });

    mediaStream.getTracks().forEach((track) => {
      pc.addTrack(track, mediaStream);
    });

    const dc = pc.createDataChannel("oai-events");
    dataChannelRef.current = dc;

  dc.onopen = () => {
  console.log("VOICE CHANNEL OPEN");

  setVoiceState("listening");

  dc.send(
    JSON.stringify({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            text:
              "Begin the session with your opening observation, a warm greeting, and ask what I would like to explore today.",
          },
        ],
      },
    })
  );

  dc.send(
    JSON.stringify({
      type: "response.create",
    })
  );
};

dc.onmessage = async (event) => {
  try {
    const message = JSON.parse(event.data);

    console.log(
      "VOICE EVENT FULL:",
      JSON.stringify(message, null, 2)
    );
 if (
  message.type ===
  "conversation.item.input_audio_transcription.completed"
) {
  const transcript = message.transcript || "";
  const lowerTranscript = transcript.toLowerCase();

  console.log("USER SAID:", transcript);

  const wantsPlaybookSave =
  lowerTranscript.includes("playbook") ||
  lowerTranscript.includes("myplaybook") ||
  lowerTranscript.includes("save it") ||
  lowerTranscript.includes("save this") ||
  lowerTranscript.includes("save that") ||
  lowerTranscript.includes("save the") ||
  lowerTranscript.includes("save my") ||
  lowerTranscript.includes("record it") ||
  lowerTranscript.includes("record this") ||
  lowerTranscript.includes("record that") ||
  lowerTranscript.includes("add it") ||
  lowerTranscript.includes("add this") ||
  lowerTranscript.includes("add that") ||
  lowerTranscript.includes("keep this") ||
  lowerTranscript.includes("store this");
  if (wantsPlaybookSave) {
   pendingPlaybookSaveRef.current =
  inferPlaybookMeta(transcript, coachMode);
    console.log(
      "PLAYBOOK SAVE PENDING:",
      pendingPlaybookSaveRef.current
    );
  }
}

    if (message.type === "input_audio_buffer.speech_started") {
      setVoiceState("listening");
    }

    if (message.type === "response.audio.delta") {
      setVoiceState("speaking");
    }

    if (
      message.type === "response.audio_transcript.delta" ||
      message.type === "response.output_audio_transcript.delta"
    ) {
      setVoiceTranscript(
        (prev) => prev + (message.delta || "")
      );
    }

    if (
  message.type === "response.audio_transcript.done" ||
  message.type === "response.output_audio_transcript.done"
) {
  const assistantTranscript = message.transcript || "";
  console.log(
  "TRANSCRIPT EVENT:",
  message.type,
  assistantTranscript.substring(0, 120)
);

  setVoiceTranscript(assistantTranscript);
  latestAssistantTranscriptRef.current = assistantTranscript;
if (pendingPlaybookSaveRef.current && assistantTranscript.trim()) {
  console.log("PLAYBOOK SAVE BLOCK ENTERED");

  const pending = pendingPlaybookSaveRef.current;
  const lowerAssistant = assistantTranscript.toLowerCase();

  const isAskingForMoreInfo =
    assistantTranscript.trim().endsWith("?") ||
    lowerAssistant.includes("could you tell me") ||
    lowerAssistant.includes("tell me a bit more") ||
    lowerAssistant.includes("so we can tailor") ||
    lowerAssistant.includes("before i create") ||
    lowerAssistant.includes("before creating");

  const hasCompletePlan =
    lowerAssistant.includes("title:") &&
    (
      lowerAssistant.includes("1.") ||
      lowerAssistant.includes("day 1") ||
      lowerAssistant.includes("step 1")
    );

  const isJustConfirmation =
    lowerAssistant.includes("saved to your playbook") ||
    lowerAssistant.includes("i’ve saved") ||
    lowerAssistant.includes("i've saved") ||
    lowerAssistant.includes("done. i’ve recorded that") ||
    lowerAssistant.includes("done. i've recorded that");

  if (
    !isJustConfirmation &&
    !isAskingForMoreInfo &&
    hasCompletePlan &&
    assistantTranscript.trim()
  ) {
    const cleanPlaybookContent = assistantTranscript.includes("Title:")
      ? `Title:${assistantTranscript.split("Title:").pop()}`.trim()
      : assistantTranscript.trim();

    console.log("PLAYBOOK SAVE STARTING");

    await fetch("/api/voice-actions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "save_playbook",
        title: pending.title,
        category: pending.category,
        content: cleanPlaybookContent,
        profileKey: getCurrentProfileKey(),
      }),
    });

    console.log("PLAYBOOK SAVE FINISHED");

    setMessages((prev) => [
      ...prev,
      {
        role: "coach",
        content: "Saved to your Playbook.",
      },
    ]);

    pendingPlaybookSaveRef.current = null;
  } else {
    console.log(
      "PLAYBOOK SAVE WAITING FOR USEFUL CONTENT:",
      assistantTranscript
    );
  }
}
  if (message.type === "response.done") {
  setVoiceState("listening");
}

if (message.type === "error") {
  console.error("Realtime error:", message);
  setVoiceState("ready");
}
} catch (error) {
  console.error("Realtime message parse error:", error);
}
};

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
console.log("VOICE CONTEXT SENT:", {
  bodySignals: history?.length || 0,
  mindEntries: mindEntries?.length || 0,
  journalEntries: journalEntries?.length || 0,
  coachMode,
});
  const sdpResponse = await fetch("/api/realtime-session", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
 body: JSON.stringify({
  sdp: offer.sdp,
  coachMode,
  history,
  mindEntries,
  journalEntries,
  name,
}),
});
    if (!sdpResponse.ok) {
      const errorText = await sdpResponse.text();
      throw new Error(errorText);
    }

    const answerSdp = await sdpResponse.text();

    await pc.setRemoteDescription({
      type: "answer",
      sdp: answerSdp,
    });
   

    setMessages((prev) => [
      ...prev,
      {
        role: "coach",
        content:
          "Voice session started. You can speak naturally — Root Voice is listening.",
      },
    ]);
  } catch (error) {
    console.error("VOICE SESSION ERROR:", error);

    setVoiceState("ready");

    setMessages((prev) => [
      ...prev,
      {
        role: "coach",
        content:
          "I couldn’t start voice mode yet. Check microphone permissions and the realtime session route.",
      },
    ]);
  }
};

const stopVoiceSession = () => {
  try {
    dataChannelRef.current?.close();
    peerConnectionRef.current?.getSenders()?.forEach((sender) => {
      sender.track?.stop();
    });
    peerConnectionRef.current?.close();
  } catch (error) {
    console.error("Stop voice error:", error);
  }
if (animationFrameRef.current) {
  cancelAnimationFrame(animationFrameRef.current);
}

if (audioContextRef.current) {
  audioContextRef.current.close();
}

setVoiceEnergy(0);
  dataChannelRef.current = null;
  peerConnectionRef.current = null;
  audioElementRef.current = null;
  setVoiceState("ready");
};
  const latestSignal = history[0]?.signal || "No recent signal yet";
  const suggestedModeId = signalToCoach[latestSignal];
  const suggestedMode = coachModes.find((mode) => mode.id === suggestedModeId);
  const currentAtmosphere =
  emotionalState === "crisis"
    ? {
        label: "Safety atmosphere",
        background:
          "linear-gradient(135deg, rgba(74,52,52,0.94), rgba(28,24,24,0.92))",
        orbText: "Stay with the next minute only.",
      }
    : emotionalState === "overwhelmed"
    ? {
        label: "Overwhelm atmosphere",
        background:
          "linear-gradient(135deg, rgba(90,84,74,0.92), rgba(52,48,42,0.88))",
        orbText: "Reduce pressure. Slow everything down.",
      }
    : emotionalState === "distressed"
    ? {
        label: "Distress atmosphere",
        background:
          "linear-gradient(135deg, rgba(88,74,68,0.92), rgba(45,40,38,0.88))",
        orbText: "Your system may need safety before solutions.",
      }
    : modeAtmospheres[coachMode] || modeAtmospheres.default;
 return (
  <RootAtmosphere
  type={
    coachMode === "grounding"
      ? "grounding"
      : coachMode === "sleep"
      ? "sleep"
      : coachMode === "reflection"
      ? "reflection"
      : "coach"
  }
>
  <Nav />

  <main style={isMobile ? { ...styles.page, ...styles.pageMobile } : styles.page}>
    <style>{`
  @keyframes rootBreath {
    0% { transform: scale(0.96); opacity: 0.58; }
    50% { transform: scale(1.06); opacity: 0.95; }
    100% { transform: scale(0.96); opacity: 0.58; }
  }

  @keyframes rootPulse {
    0% { transform: scale(0.92); opacity: 0.35; }
    50% { transform: scale(1.14); opacity: 0.8; }
    100% { transform: scale(0.92); opacity: 0.35; }
  }

  @keyframes rootSpeak {
    0% { transform: scale(0.98); filter: brightness(1); }
    50% { transform: scale(1.045); filter: brightness(1.08); }
    100% { transform: scale(0.98); filter: brightness(1); }
  }
`}</style>
        <section style={isMobile ? { ...styles.shell, ...styles.shellMobile } : styles.shell}>
          <div style={styles.glow} />
          <div style={styles.softOrbGlow} />

         <div style={styles.header}>
 
 <div style={styles.ensoLogoWrap}>
  <RootEnso size={128} />
</div> 
  <p style={styles.kicker}>Root Health Intelligence</p>
            <h1 style={styles.title}>Root Coach</h1>
            <p style={styles.subtitle}>
              A calm guide for mind, body, recovery and whole-person wellbeing.
            </p>
          </div>

          <section
style={{
  ...styles.voiceStage,
  ...(isMobile ? styles.voiceStageMobile : {}),
  background: currentAtmosphere.background,
}}
>
            <div style={styles.voiceText}>
              <p style={styles.voiceLabel}>{currentAtmosphere.label}</p>
              <h2 style={styles.voiceTitle}>{currentAtmosphere.orbText}</h2>
              <p style={styles.voiceSubtitle}>
                This is the visual foundation for Root Voice — calm, warm, spacious and ready
                for live conversation.
              </p>
            </div>

          <div style={styles.orbWrap}>
  <button
    aria-label={voiceState === "ready" ? "Start Root Voice" : "End Root Voice"}
    onClick={() => {
      if (voiceState === "ready") {
        startVoiceSession();
      } else {
        stopVoiceSession();
      }
    }}
   style={{
  ...styles.ensoVoiceButton,
  ...(isMobile ? styles.ensoVoiceButtonMobile : {}),
 transform: breathMode
  ? breathPhase === "inhale"
    ? "scale(1.12)"
    : "scale(0.94)"
  : `scale(${1 + voiceEnergy * 0.06})`,  boxShadow: `
    0 0 ${40 + voiceEnergy * 90}px rgba(147,122,78,${0.22 + voiceEnergy * 0.28}),
    0 32px 90px rgba(62,53,41,0.28),
    inset 0 0 80px rgba(255,255,255,0.72)
  `,
  ...(voiceState === "ready" ? styles.ensoIdle : {}),
  ...(voiceState === "connecting" ? styles.ensoConnecting : {}),
  ...(voiceState === "listening" ? styles.ensoListening : {}),
  ...(voiceState === "speaking" ? styles.ensoSpeaking : {}),
  ...(voiceState === "thinking" ? styles.ensoThinking : {}),
}}  >
    <span style={styles.ensoOuterRing} />
    <span style={styles.ensoMiddleRing} />

    <span style={styles.ensoInner}>
    <div style={styles.ensoLogoWrap}>
  <RootEnso size={128} />
</div>
    </span>
  </button>

  <p style={styles.voiceStatus}>
    {breathMode
  ? breathPhase === "inhale"
    ? "Inhale slowly..."
    : breathPhase === "hold"
    ? "Hold gently..."
    : "Exhale softly..."
  : voiceState === "connecting"
  ? "Opening the voice space…"
  : voiceState === "listening"
  ? "Listening… take your time."
  : voiceState === "speaking"
  ? "Root Voice is speaking…"
  : voiceState === "thinking"
  ? "Root Coach is thinking gently…"
  : "Tap the enso to begin."}
</p>

  <p style={styles.voiceHint}>
    {voiceState === "ready"
      ? "A calm spoken conversation with Root Coach."
      : "Tap the enso again to end voice mode."}
  </p>
<button
  style={styles.breathButton}
  onClick={startBreathJourney}
>
  Breath with Root
</button>
   {voiceState !== "ready" && (
  <button
    style={styles.resetVoiceButton}
    onClick={() => {
      stopVoiceSession();

      setTimeout(() => {
        startVoiceSession();
      }, 650);
    }}
  >
    Reset voice
  </button>
)}

{voiceTranscript && (
  <p style={styles.voiceTranscript}>
    {voiceTranscript}
  </p>
)}

</div>
          </section>

          <div style={styles.heroCard}>
            <div>
              <p style={styles.heroLabel}>Current context</p>
              <h2 style={styles.heroTitle}>{latestSignal}</h2>

              {suggestedMode && (
                <p style={styles.heroText}>
                  Suggested focus: {suggestedMode.icon} {suggestedMode.label}
                </p>
              )}
            </div>
          </div>

          <div style={styles.modeGrid}>
            {coachModes.map((mode) => (
              <button
                key={mode.id}
                onClick={() => chooseMode(mode)}
                style={{
                  ...styles.modeButton,
                  ...(coachMode === mode.id ? styles.modeButtonActive : {}),
                }}
              >
                <span style={styles.modeIcon}>{mode.icon}</span>
                <span>{mode.label}</span>
              </button>
            ))}
          </div>

         <div style={isMobile ? { ...styles.chatPanel, ...styles.chatPanelMobile } : styles.chatPanel}>
            {messages.map((message, index) => (
              <div
                key={index}
               style={{
  ...styles.message,
  ...(isMobile ? styles.messageMobile : {}),
  ...(message.role === "user" ? styles.userMessage : styles.coachMessage),
}}
>
                <p style={styles.messageText}>{message.content}</p>
                {Array.isArray(message.reflectiveOptions) &&
  message.reflectiveOptions.length > 0 && (
    <div style={styles.reflectiveOptionsWrap}>
      {message.reflectiveOptions.map((option) => (
        <button
          key={option}
          style={styles.reflectiveOptionButton}
          onClick={() => sendMessage(option)}
        >
          {option}
        </button>
      ))}
    </div>
)}
 {message.coachEscalation && (
  <div style={styles.coachEscalationCard}>
    <p style={styles.coachEscalationTitle}>
      {message.coachEscalation.title}
    </p>

    <div style={styles.coachEscalationButtons}>
      <button
        style={styles.coachEscalationButton}
        onClick={() => {
          setInput(message.coachEscalation.prompt);
        }}
      >
        {message.coachEscalation.textLabel}
      </button>

      <button
        style={styles.coachEscalationButton}
        onClick={() => {
          setCoachMode(
            coachMode ||
              suggestedMode?.id ||
              "reflection"
          );

          setTimeout(() => {
            startVoiceSession();
          }, 250);
        }}
      >
        {message.coachEscalation.voiceLabel}
      </button>
    </div>
  </div>
)} 
              </div>
            ))}

            {thinking && (
              <div style={{ ...styles.message, ...styles.coachMessage }}>
                <p style={styles.messageText}>Root Coach is thinking gently…</p>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
{showJourneyNext && (
  <div style={styles.journeyNextPanel}>
    <p style={styles.journeyNextLabel}>
      Continue your Root journey
    </p>

    <h2 style={styles.journeyNextTitle}>
      Begin noticing the deeper patterns.
    </h2>

    <p style={styles.journeyNextText}>
      Journaling can help Root understand:
      emotional triggers, nervous system load,
      repeated thoughts, and recovery patterns over time.
    </p>

    <a
      href="/journal"
      style={styles.journeyNextButton}
    >
      Continue to Journal →
    </a>
  </div>
)}
          <div style={styles.quickRow}>
            {[
              "What patterns do you notice?",
              "Help me calm my nervous system",
              "What should I focus on today?",
            ].map((prompt) => (
              <button key={prompt} style={styles.quickButton} onClick={() => sendMessage(prompt)}>
                {prompt}
              </button>
            ))}
          </div>

          <div style={isMobile ? { ...styles.inputWrap, ...styles.inputWrapMobile } : styles.inputWrap}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Talk to Root Coach..."
              style={styles.input}
            />

            <button style={styles.sendButton} onClick={() => sendMessage(input)}>
              Send
            </button>
          </div>
        </section>
        </main>
  </RootAtmosphere>
);
}

const styles = {
  page: {
    minHeight: "100vh",
    padding: "28px",
    display: "flex",
    justifyContent: "center",
  },

 shell: {
  position: "relative",
  overflow: "visible",
  width: "100%",
  maxWidth: "1120px",
  background: "rgba(255,255,255,0.34)",
  border: "1px solid rgba(255,255,255,0.52)",
  backdropFilter: "blur(18px)",
  borderRadius: "42px",
  padding: "36px",
  boxShadow: "0 34px 100px rgba(20,18,15,0.18)",
},
  glow: {
    position: "absolute",
    top: "-100px",
    right: "-60px",
    width: "260px",
    height: "260px",
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(0,0,0,0.16), rgba(0,0,0,0.02) 70%)",
  },

  softOrbGlow: {
    position: "absolute",
    left: "50%",
    top: "260px",
    transform: "translateX(-50%)",
    width: "520px",
    height: "520px",
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(147,122,78,0.18), rgba(255,255,255,0) 68%)",
    pointerEvents: "none",
  },

  header: {
    textAlign: "center",
    marginBottom: "26px",
    position: "relative",
    zIndex: 2,
  },

  kicker: {
    margin: "0 0 10px",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.14em",
    color: "#6F675B",
    fontWeight: "800",
  },

  title: {
    margin: "0 0 12px",
    fontSize: "48px",
    color: "#181818",
    letterSpacing: "-0.04em",
  },

  subtitle: {
    maxWidth: "760px",
    margin: "0 auto",
    lineHeight: "1.75",
    color: "#5A554D",
    fontSize: "17px",
  },

  voiceStage: {
    position: "relative",
    zIndex: 2,
    display: "grid",
    gridTemplateColumns: "1fr 360px",
    gap: "28px",
    alignItems: "center",
    background:
      "linear-gradient(135deg, rgba(250,244,234,0.82), rgba(255,255,255,0.54))",
    border: "1px solid rgba(255,255,255,0.5)",
    backdropFilter: "blur(16px)",
    borderRadius: "38px",
    padding: "32px",
    marginBottom: "22px",
    boxShadow: "0 26px 80px rgba(20,18,15,0.16)",
  },

  voiceText: {
    textAlign: "left",
  },

  voiceLabel: {
    margin: "0 0 10px",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.16em",
    color: "#746B5E",
    fontWeight: "800",
  },

  voiceTitle: {
    margin: "0 0 12px",
    fontFamily: "Georgia, serif",
    fontSize: "42px",
    lineHeight: "1.04",
    fontWeight: "500",
    color: "#2A261F",
  },

  voiceSubtitle: {
    margin: 0,
    maxWidth: "560px",
    lineHeight: "1.7",
    color: "#5A554D",
    fontSize: "16px",
  },

 orbWrap: {
  position: "relative",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "420px",
  width: "100%",
},
 ensoVoiceButton: {
  position: "relative",
  width: "280px",
  height: "280px",
  borderRadius: "50%",
  border: "none",
  background:
    "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.98), rgba(232,219,195,0.94) 40%, rgba(109,114,95,0.48) 100%)",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "visible",
  transition: "transform 4s ease-in-out, box-shadow 4s ease-in-out",
  boxShadow:
    "0 0 0 18px rgba(255,255,255,0.14), 0 32px 90px rgba(62,53,41,0.28), inset 0 0 80px rgba(255,255,255,0.72)",
},
  voiceStatus: {
  marginTop: "34px",
  marginBottom: "8px",
  color: "#5C554B",
  fontSize: "15px",
  textAlign: "center",
  lineHeight: "1.6",
  fontWeight: "500",
},
ensoOuterRing: {
  position: "absolute",
  inset: "-36px",
  borderRadius: "50%",
  border: "1px solid rgba(255,255,255,0.32)",
  background:
    "radial-gradient(circle, rgba(255,255,255,0.16), rgba(147,122,78,0.08), transparent 72%)",
  animation: "rootBreath 5.2s ease-in-out infinite",
  zIndex: 1,
},
ensoMiddleRing: {
  position: "absolute",
  inset: "-14px",
  borderRadius: "50%",
  border: "1px solid rgba(111,103,91,0.12)",
  background:
    "radial-gradient(circle, rgba(250,244,234,0.24), rgba(255,255,255,0) 72%)",
  animation: "rootPulse 6.8s ease-in-out infinite",
  zIndex: 2,
},
ensoInner: {
  position: "relative",
  zIndex: 5,
  width: "170px",
  height: "170px",
  borderRadius: "50%",
  overflow: "hidden",
  background:
    "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.92), rgba(234,224,204,0.68))",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backdropFilter: "blur(20px)",
  boxShadow:
    "inset 0 0 46px rgba(255,255,255,0.58), 0 14px 36px rgba(0,0,0,0.10)",
},
  ensoIdle: {
  animation: "rootBreath 5.6s ease-in-out infinite",
},
ensoLogoWrap: {
  width: "132px",
  height: "132px",
  borderRadius: "50%",
  overflow: "hidden",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
},
ensoConnecting: {
  boxShadow:
    "0 0 0 24px rgba(255,255,255,0.2), 0 0 90px rgba(147,122,78,0.38), 0 26px 76px rgba(62,53,41,0.24), inset 0 0 80px rgba(255,255,255,0.68)",
},

ensoListening: {
  boxShadow:
    "0 0 0 26px rgba(255,255,255,0.22), 0 0 95px rgba(109,114,95,0.42), 0 26px 76px rgba(62,53,41,0.24), inset 0 0 80px rgba(255,255,255,0.72)",
},

ensoSpeaking: {
  animation: "rootSpeak 2.4s ease-in-out infinite",
  boxShadow:
    "0 0 0 28px rgba(255,255,255,0.24), 0 0 110px rgba(147,122,78,0.48), 0 28px 82px rgba(62,53,41,0.26), inset 0 0 88px rgba(255,255,255,0.74)",
},

ensoThinking: {
  animation: "rootBreath 3.8s ease-in-out infinite",
  boxShadow:
    "0 0 0 24px rgba(255,255,255,0.2), 0 0 90px rgba(147,122,78,0.42), 0 24px 70px rgba(62,53,41,0.22), inset 0 0 70px rgba(255,255,255,0.65)",
},

voiceHint: {
  margin: "0",
  color: "#746B5E",
  fontSize: "13px",
  textAlign: "center",
  maxWidth: "260px",
  lineHeight: "1.5",
},
  resetVoiceButton: {
  marginTop: "12px",
  border: "1px solid rgba(60,50,38,0.14)",
  borderRadius: "999px",
  padding: "10px 14px",
  background: "rgba(255,255,255,0.56)",
  color: "#3A332A",
  cursor: "pointer",
  fontSize: "13px",
},
  heroCard: {
    background:
      "linear-gradient(135deg, rgba(24,24,24,0.92), rgba(52,48,42,0.92))",
    borderRadius: "32px",
    padding: "28px",
    color: "#FFFFFF",
    marginBottom: "22px",
    boxShadow: "0 24px 70px rgba(0,0,0,0.18)",
  },

  heroLabel: {
    margin: "0 0 10px",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.14em",
    color: "#D8CDBB",
    fontWeight: "800",
  },

  heroTitle: {
    margin: "0 0 8px",
    fontSize: "32px",
    textTransform: "capitalize",
  },

  heroText: {
    margin: 0,
    color: "#E7E0D6",
    lineHeight: "1.7",
  },

  modeGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: "14px",
    marginBottom: "22px",
  },

  modeButton: {
    border: "1px solid rgba(255,255,255,0.8)",
    borderRadius: "24px",
    padding: "18px",
    background: "rgba(255,255,255,0.48)",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
    fontSize: "15px",
    color: "#333",
    backdropFilter: "blur(10px)",
    boxShadow: "0 12px 28px rgba(0,0,0,0.05)",
  },

  modeButtonActive: {
    background: "#181818",
    color: "#FFFFFF",
  },

  modeIcon: {
    fontSize: "28px",
  },

 chatPanel: {
  background: "rgba(255,255,255,0.46)",
  border: "1px solid rgba(255,255,255,0.52)",
  borderRadius: "32px",
  padding: "24px",
  minHeight: "420px",
  maxHeight: "620px",
  overflowY: "auto",
  backdropFilter: "blur(16px)",
  boxShadow: "0 18px 50px rgba(20,18,15,0.12)",
  marginBottom: "20px",
},
  message: {
    padding: "18px 20px",
    borderRadius: "24px",
    marginBottom: "14px",
    maxWidth: "82%",
  },

  coachMessage: {
  background: "rgba(255,255,255,0.62)",
  color: "#1A1A1A",
  border: "1px solid rgba(255,255,255,0.54)",
  backdropFilter: "blur(10px)",
  borderTopLeftRadius: "8px",
},

  userMessage: {
    background: "#181818",
    color: "#FFFFFF",
    marginLeft: "auto",
    borderTopRightRadius: "8px",
  },

  messageText: {
    margin: 0,
    lineHeight: "1.8",
    fontSize: "15px",
    whiteSpace: "pre-line",
  },

  quickRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "12px",
    marginBottom: "20px",
  },

  quickButton: {
    border: "1px solid rgba(255,255,255,0.72)",
    background: "rgba(255,255,255,0.65)",
    borderRadius: "999px",
    padding: "12px 16px",
    cursor: "pointer",
    color: "#333",
    fontSize: "14px",
    backdropFilter: "blur(8px)",
  },

  inputWrap: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: "14px",
    alignItems: "stretch",
  },

  input: {
    minHeight: "84px",
    border: "1px solid rgba(255,255,255,0.8)",
    borderRadius: "24px",
    padding: "18px",
    fontSize: "15px",
    resize: "vertical",
    outline: "none",
    background: "rgba(255,255,255,0.72)",
    color: "#1A1A1A",
    backdropFilter: "blur(10px)",
  },

  sendButton: {
    border: "none",
    borderRadius: "24px",
    padding: "0 28px",
    background: "#181818",
    color: "#FFFFFF",
    cursor: "pointer",
    fontSize: "15px",
    minWidth: "110px",
  },
  reflectiveOptionsWrap: {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px",
  marginTop: "14px",
},

reflectiveOptionButton: {
  border: "1px solid rgba(255,255,255,0.75)",
  background: "rgba(255,255,255,0.62)",
  borderRadius: "999px",
  padding: "10px 14px",
  cursor: "pointer",
  color: "#333",
  fontSize: "13px",
  backdropFilter: "blur(8px)",
},
  coachEscalationCard: {
  marginTop: "18px",
  padding: "18px",
  borderRadius: "24px",
  background: "rgba(255,255,255,0.56)",
  border: "1px solid rgba(255,255,255,0.72)",
  backdropFilter: "blur(12px)",
},

coachEscalationTitle: {
  margin: 0,
  marginBottom: "14px",
  color: "#3A352D",
  fontSize: "14px",
  lineHeight: "1.6",
},

coachEscalationButtons: {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
},

coachEscalationButton: {
  border: "none",
  borderRadius: "999px",
  padding: "12px 16px",
  background: "#2E2A24",
  color: "#FFFFFF",
  cursor: "pointer",
  fontSize: "13px",
},
  journeyNextPanel: {
  marginBottom: "22px",
  padding: "28px",
  borderRadius: "30px",
  background: "rgba(255,255,255,0.58)",
  border: "1px solid rgba(255,255,255,0.72)",
  backdropFilter: "blur(14px)",
  boxShadow: "0 18px 48px rgba(20,18,15,0.08)",
},

journeyNextLabel: {
  margin: "0 0 10px",
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  color: "#776C5B",
  fontWeight: "800",
},

journeyNextTitle: {
  margin: "0 0 12px",
  fontFamily: "Georgia, serif",
  fontSize: "30px",
  fontWeight: "500",
  color: "#2A261F",
},

journeyNextText: {
  margin: "0 0 18px",
  color: "#4D463B",
  lineHeight: "1.8",
},

journeyNextButton: {
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
  pageMobile: {
  padding: "16px",
  alignItems: "stretch",
},

shellMobile: {
  borderRadius: "28px",
  padding: "20px",
},

voiceStageMobile: {
  display: "flex",
  flexDirection: "column",
  gap: "18px",
  padding: "22px",
},

ensoVoiceButtonMobile: {
  width: "220px",
  height: "220px",
},

chatPanelMobile: {
  minHeight: "360px",
  maxHeight: "520px",
  padding: "18px",
},

inputWrapMobile: {
  gridTemplateColumns: "1fr",
  position: "sticky",
  bottom: "12px",
  zIndex: 20,
  background: "rgba(245,238,226,0.82)",
  border: "1px solid rgba(255,255,255,0.55)",
  borderRadius: "28px",
  padding: "12px",
  backdropFilter: "blur(16px)",
  boxShadow: "0 18px 40px rgba(20,18,15,0.16)",
},
messageMobile: {
  maxWidth: "100%",
},
  breathButton: {
  marginTop: "14px",
  border: "1px solid rgba(255,255,255,0.55)",
  background: "rgba(255,255,255,0.44)",
  color: "#2A261F",
  borderRadius: "999px",
  padding: "12px 18px",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: "600",
  backdropFilter: "blur(10px)",
},
};
