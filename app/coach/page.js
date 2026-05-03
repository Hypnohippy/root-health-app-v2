"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import Nav from "../../components/Nav";

const coachModes = [
  {
    id: "nutrition",
    label: "Nutrition",
    icon: "🥗",
    intro: "Let’s focus on food, digestion, weight, energy and how your body responds.",
  },
  {
    id: "mind",
    label: "Mind & mood",
    icon: "🧠",
    intro: "Let’s look at stress, thoughts, emotions, motivation and daily pressure.",
  },
  {
    id: "trauma",
    label: "Trauma & nervous system",
    icon: "🧩",
    intro: "We’ll go gently here — focusing on safety, regulation and what your system is holding.",
  },
  {
    id: "movement",
    label: "Movement & body",
    icon: "🏃",
    intro: "Let’s focus on movement, pain, strength, recovery and getting your body working with you.",
  },
  {
    id: "lifestyle",
    label: "Lifestyle",
    icon: "🌿",
    intro: "Let’s look at sleep, habits, energy, self-care and the bigger pattern of your health.",
  },
];

function buildWelcome(name, history) {
  const firstName = name || "there";

  if (!history || history.length === 0) {
    return `Welcome back, ${firstName}. I’m Root Coach. Choose what you want help with today, or just start typing.`;
  }

  const latest = history[0];
  const signal = latest.signal || "your body signals";

  return `Welcome back, ${firstName}. Last time we were looking at ${signal}. Choose a focus below, or tell me what you want help with today.`;
}

export default function CoachPage() {
  const [name, setName] = useState("");
  const [history, setHistory] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [coachMode, setCoachMode] = useState("");
  const [thinking, setThinking] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;

      const displayName =
        user?.user_metadata?.full_name ||
        user?.user_metadata?.name ||
        user?.email?.split("@")[0] ||
        "";

      setName(displayName);

      const { data } = await supabase
        .from("body_signals")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      const rows = Array.isArray(data) ? data : [];
      setHistory(rows);

      setMessages([
        {
          role: "coach",
          content: buildWelcome(displayName, rows),
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
        content: `${mode.icon} ${mode.label} mode selected.\n\n${mode.intro}\n\nWhat would you like to work on?`,
      },
    ]);
  };

  const sendMessage = async (text) => {
    const clean = text.trim();
    if (!clean || thinking) return;

    const nextMessages = [...messages, { role: "user", content: clean }];
    setMessages(nextMessages);
    setInput("");
    setThinking(true);

    try {
      const res = await fetch("/api/root-coach", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userName: name,
          message: clean,
          history,
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
        {
          role: "coach",
          content:
            "Something interrupted my response, but I’m still here. Tell me the main thing you want help with right now.",
        },
      ]);
    }

    setThinking(false);
  };

  const latestSignal = history[0]?.signal || "No recent signal yet";

  return (
    <>
      <Nav />

      <main style={styles.page}>
        <section style={styles.shell}>
          <div style={styles.brandMark}>◯</div>

          <h1 style={styles.title}>Root Coach</h1>
          <p style={styles.subtitle}>
            One calm guide for nutrition, mind, trauma patterns, movement, recovery and whole-person self-care.
          </p>

          <div style={styles.contextCard}>
            <p style={styles.contextLabel}>Latest body signal</p>
            <p style={styles.contextValue}>{latestSignal}</p>
          </div>

          <p style={styles.modeTitle}>What do you want help with today?</p>

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
              "What should I focus on today?",
              "Help me make a simple plan",
              "What patterns do you notice?",
            ].map((prompt) => (
              <button key={prompt} style={styles.quickButton} onClick={() => sendMessage(prompt)}>
                {prompt}
              </button>
            ))}
          </div>

          <div style={styles.inputRow}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Root Coach anything..."
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
    background: "linear-gradient(135deg, #F7F5F2 0%, #E6E2DA 100%)",
    padding: "24px",
    display: "flex",
    justifyContent: "center",
  },
  shell: {
    width: "100%",
    maxWidth: "960px",
    background: "rgba(255,255,255,0.86)",
    borderRadius: "34px",
    padding: "34px",
    boxShadow: "0 24px 70px rgba(0,0,0,0.08)",
    textAlign: "center",
  },
  brandMark: {
    fontSize: "40px",
    marginBottom: "8px",
  },
  title: {
    fontSize: "36px",
    margin: "0 0 8px",
    color: "#1A1A1A",
  },
  subtitle: {
    color: "#555",
    fontSize: "16px",
    lineHeight: "1.6",
    maxWidth: "680px",
    margin: "0 auto 22px",
  },
  contextCard: {
    background: "#F7F5F2",
    borderRadius: "22px",
    padding: "16px",
    textAlign: "left",
    marginBottom: "18px",
  },
  contextLabel: {
    margin: "0 0 6px",
    fontSize: "12px",
    color: "#777",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  contextValue: {
    margin: 0,
    fontSize: "18px",
    fontWeight: "700",
    color: "#1A1A1A",
  },
  modeTitle: {
    margin: "8px 0 12px",
    color: "#555",
    fontSize: "14px",
    fontWeight: "600",
  },
  modeGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: "12px",
    marginBottom: "20px",
  },
  modeButton: {
    border: "1px solid #E6E2DA",
    borderRadius: "20px",
    padding: "14px",
    background: "#FFFFFF",
    cursor: "pointer",
    fontSize: "14px",
    color: "#333",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "6px",
    boxShadow: "0 8px 22px rgba(0,0,0,0.04)",
  },
  modeButtonActive: {
    background: "#1A1A1A",
    color: "#FFFFFF",
    border: "1px solid #1A1A1A",
  },
  modeIcon: {
    fontSize: "24px",
  },
  chatPanel: {
    background: "#FFFFFF",
    borderRadius: "26px",
    padding: "22px",
    minHeight: "340px",
    maxHeight: "520px",
    overflowY: "auto",
    boxShadow: "0 12px 32px rgba(0,0,0,0.06)",
    textAlign: "left",
  },
  message: {
    padding: "14px 16px",
    borderRadius: "18px",
    marginBottom: "12px",
    maxWidth: "82%",
  },
  coachMessage: {
    background: "#F3EFE8",
    color: "#222",
  },
  userMessage: {
    background: "#1A1A1A",
    color: "#FFFFFF",
    marginLeft: "auto",
  },
  messageText: {
    margin: 0,
    fontSize: "15px",
    lineHeight: "1.6",
    whiteSpace: "pre-line",
  },
  quickRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    justifyContent: "center",
    marginTop: "18px",
  },
  quickButton: {
    border: "none",
    borderRadius: "999px",
    padding: "10px 14px",
    background: "#E6E2DA",
    color: "#333",
    cursor: "pointer",
    fontSize: "14px",
  },
  inputRow: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: "12px",
    marginTop: "18px",
    alignItems: "stretch",
  },
  input: {
    minHeight: "72px",
    border: "1px solid #E6E2DA",
    borderRadius: "18px",
    padding: "16px",
    fontSize: "15px",
    resize: "vertical",
    outline: "none",
    background: "#FFFFFF",
    color: "#1A1A1A",
    boxShadow: "0 8px 20px rgba(0,0,0,0.05)",
    position: "relative",
    zIndex: 5,
    pointerEvents: "auto",
  },
  sendButton: {
    border: "none",
    borderRadius: "18px",
    padding: "0 24px",
    background: "#1A1A1A",
    color: "#FFFFFF",
    cursor: "pointer",
    fontSize: "15px",
  },
};
