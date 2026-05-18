"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import Nav from "../../components/Nav";
import RootEnso from "../../components/RootEnso";

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
  { id: "nutrition", label: "Nutrition", icon: "🥗" },
  { id: "mind", label: "Mind & mood", icon: "🧠" },
  { id: "trauma", label: "Trauma & nervous system", icon: "🧩" },
  { id: "movement", label: "Movement & body", icon: "🏃" },
  { id: "lifestyle", label: "Lifestyle", icon: "🌿" },
];

function buildWelcome(name, history = [], mindEntries = [], journalEntries = []) {
  const cleanName = String(name || "").trim();
  const greeting = cleanName ? `Welcome back, ${cleanName}.` : "Welcome back.";
  const latestJournal = Array.isArray(journalEntries) ? journalEntries[0] : null;
  const latestMind = Array.isArray(mindEntries) ? mindEntries[0] : null;
  const latestBody = Array.isArray(history) ? history[0] : null;

  if (latestJournal) {
    const theme = latestJournal.emotional_theme || "";
    if (theme && theme !== "general reflection") {
      return `${greeting} Your recent reflection seemed connected to ${theme}.\n\nDo you want to explore that, use a Mind & Mood tool, or focus somewhere else?`;
    }
    return `${greeting} I can see you added a recent reflection.\n\nDo you want to explore it, use a Mind & Mood tool, or focus somewhere else?`;
  }

  if (latestMind) {
    const emotion = latestMind.emotion || "something emotional";
    return `${greeting} Last time, you were working with ${emotion.toLowerCase()}.\n\nDo you want to continue with that, or focus somewhere else?`;
  }

  if (latestBody) {
    const signal = latestBody.signal || "your body signals";
    return `${greeting} Last time we were looking at ${signal}.\n\nDo you want to explore that, or focus on something else?`;
  }

  return `${greeting} I’m Root Coach. Choose what you want help with today, or just start typing.`;
}

export default function CoachPage() {
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

  const bottomRef = useRef(null);
const peerConnectionRef = useRef(null);
const dataChannelRef = useRef(null);
const audioElementRef = useRef(null);
  const audioContextRef = useRef(null);
const analyserRef = useRef(null);
const animationFrameRef = useRef(null);
  useEffect(() => {
    const load = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      const [voiceEnergy, setVoiceEnergy] = useState(0);

      let displayName =
        user?.user_metadata?.full_name ||
        user?.user_metadata?.name ||
        user?.email?.split("@")[0] ||
        "";

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("profile_key", "main")
        .maybeSingle();

      if (profileData) {
        setProfile(profileData);
        if (profileData.name) displayName = profileData.name;
      }

      setName(displayName);

      const { data } = await supabase
        .from("body_signals")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      const rows = Array.isArray(data) ? data : [];
      setHistory(rows);

      const { data: mindData } = await supabase
        .from("mind_entries")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);

      const { data: journalData } = await supabase
        .from("journal_entries")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);

      const journalRows = Array.isArray(journalData) ? journalData : [];

      setJournalEntries(journalRows);
      setMindEntries(Array.isArray(mindData) ? mindData : []);

      setMessages([
        {
          role: "coach",
          content: buildWelcome(
            displayName,
            rows,
            Array.isArray(mindData) ? mindData : [],
            journalRows
          ),
        },
      ]);
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
        content: `${mode.icon} ${mode.label} mode selected.\n\nWhat would you like to work on today?`,
      },
    ]);
  };

  const sendMessage = async (text) => {
    const clean = String(text || "").trim();
    if (!clean || thinking) return;

    const nextMessages = [...messages, { role: "user", content: clean }];

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

      setMessages((prev) => [
        ...prev,
        {
          role: "coach",
          content:
            json.reply ||
            "I’m here with you. Let’s slow this down and look at one thing at a time.",
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: "coach", content: "Something interrupted my response, but I’m still here." },
      ]);
    }

    setThinking(false);
    setVoiceState("ready");
  };
const startVoiceSession = async () => {
  try {
    setVoiceState("connecting");

  
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
      setVoiceState("listening");

      dc.send(
        JSON.stringify({
          type: "response.create",
          response: {
            instructions:
              "Greet the user briefly and warmly. Keep it calm and natural. Ask what they would like to talk through.",
          },
        })
      );
    };

    dc.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        if (message.type === "input_audio_buffer.speech_started") {
          setVoiceState("listening");
        }

        if (message.type === "response.audio.delta") {
          setVoiceState("speaking");
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

   const sdpResponse = await fetch("/api/realtime-session", {
  method: "POST",
  body: offer.sdp,
  headers: {
    "Content-Type": "application/sdp",
  },
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

  return (
    <>
      <Nav />

      <main style={styles.page}>
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
        <section style={styles.shell}>
          <div style={styles.glow} />
          <div style={styles.softOrbGlow} />

          <div style={styles.header}>
            <RootEnso size={128} />
            <p style={styles.kicker}>Root Health Intelligence</p>
            <h1 style={styles.title}>Root Coach</h1>
            <p style={styles.subtitle}>
              A calm guide for mind, body, recovery and whole-person wellbeing.
            </p>
          </div>

          <section style={styles.voiceStage}>
            <div style={styles.voiceText}>
              <p style={styles.voiceLabel}>Voice space</p>
              <h2 style={styles.voiceTitle}>Slow down. Speak freely.</h2>
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
  transform: `scale(${1 + voiceEnergy * 0.06})`,
  boxShadow: `
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
      <RootEnso size={128} />
    </span>
  </button>

  <p style={styles.voiceStatus}>
    {voiceState === "connecting"
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

          <div style={styles.chatPanel}>
            {messages.map((message, index) => (
              <div
                key={index}
                style={{
                  ...styles.message,
                  ...(message.role === "user" ? styles.userMessage : styles.coachMessage),
                }}
              >
                <p style={styles.messageText}>{message.content}</p>
              </div>
            ))}

            {thinking && (
              <div style={{ ...styles.message, ...styles.coachMessage }}>
                <p style={styles.messageText}>Root Coach is thinking gently…</p>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

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

          <div style={styles.inputWrap}>
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
    </>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top left, rgba(255,255,255,0.95), transparent 32%), linear-gradient(135deg, #D8CDBB 0%, #F6F1E9 38%, #B9C5BD 100%)",
    padding: "28px",
    display: "flex",
    justifyContent: "center",
  },

  shell: {
    position: "relative",
    overflow: "hidden",
    width: "100%",
    maxWidth: "1120px",
    background: "rgba(255,255,255,0.56)",
    border: "1px solid rgba(255,255,255,0.72)",
    backdropFilter: "blur(22px)",
    borderRadius: "42px",
    padding: "36px",
    boxShadow: "0 34px 100px rgba(38,33,25,0.16)",
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
    border: "1px solid rgba(255,255,255,0.74)",
    borderRadius: "38px",
    padding: "32px",
    marginBottom: "22px",
    boxShadow: "0 26px 80px rgba(42,36,28,0.13)",
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
  transition: "all 0.45s ease",
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
  background: "rgba(255,255,255,0.38)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backdropFilter: "blur(18px)",
  boxShadow:
    "inset 0 0 42px rgba(255,255,255,0.52), 0 12px 34px rgba(0,0,0,0.08)",
},
ensoIdle: {
  animation: "rootBreath 5.6s ease-in-out infinite",
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
    background: "rgba(255,255,255,0.62)",
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
    background: "rgba(255,255,255,0.68)",
    borderRadius: "32px",
    padding: "24px",
    minHeight: "420px",
    maxHeight: "620px",
    overflowY: "auto",
    backdropFilter: "blur(12px)",
    boxShadow: "0 18px 50px rgba(0,0,0,0.08)",
    marginBottom: "20px",
  },

  message: {
    padding: "18px 20px",
    borderRadius: "24px",
    marginBottom: "14px",
    maxWidth: "82%",
  },

  coachMessage: {
    background: "rgba(243,239,232,0.95)",
    color: "#1A1A1A",
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
};
