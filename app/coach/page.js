"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import Nav from "../../components/Nav";

function normalise(value) {
  return String(value || "").toLowerCase().trim();
}

function buildWelcome(name, history) {
  const firstName = name || "there";

  if (!history || history.length === 0) {
    return `Welcome back, ${firstName}. I’m Root Coach. We’ll take this gently — tell me what feels most important today, and I’ll help you make sense of it.`;
  }

  const latest = history[0];
  const signal = latest.signal || "your body signals";
  const helped = latest.what_helped && latest.what_helped !== "Nothing yet"
    ? latest.what_helped
    : null;

  if (helped) {
    return `Welcome back, ${firstName}. Last time we were looking at ${signal}, and you noted that "${helped}" helped. How did that feel afterwards?`;
  }

  return `Welcome back, ${firstName}. Last time we were looking at ${signal}. Where are we at with that today — better, worse, or still asking for attention?`;
}

export default function CoachPage() {
  const [name, setName] = useState("");
  const [history, setHistory] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
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
          conversation: nextMessages.slice(-8),
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
  const repeatedSignal =
    history.length > 0
      ? Object.entries(
          history.reduce((acc, item) => {
            if (item.signal) acc[item.signal] = (acc[item.signal] || 0) + 1;
            return acc;
          }, {})
        ).sort((a, b) => b[1] - a[1])[0]
      : null;

  return (
    <>
      <Nav />

      <main style={styles.page}>
        <section style={styles.shell}>
          <div style={styles.brandMark}>◯</div>

          <h1 style={styles.title}>Root Coach</h1>
          <p style={styles.subtitle}>
            One calm guide for body signals, food, stress, movement, recovery and self-care.
          </p>

          <div style={styles.contextGrid}>
            <div style={styles.contextCard}>
              <p style={styles.contextLabel}>Latest signal</p>
              <p style={styles.contextValue}>{latestSignal}</p>
            </div>

            <div style={styles.contextCard}>
              <p style={styles.contextLabel}>Pattern focus</p>
              <p style={styles.contextValue}>
                {repeatedSignal ? `${repeatedSignal[0]} (${repeatedSignal[1]})` : "Still learning"}
              </p>
            </div>
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
              "Why might this be repeating?",
              "Help me make a simple plan",
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
              placeholder="Ask Root Coach anything about your signals, self-care, food, stress, movement or recovery..."
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
    maxWidth: "920px",
    background: "rgba(255,255,255,0.82)",
    borderRadius: "32px",
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
    maxWidth: "620px",
    margin: "0 auto 26px",
  },
  contextGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "14px",
    marginBottom: "20px",
  },
  contextCard: {
    background: "#F7F5F2",
    borderRadius: "22px",
    padding: "18px",
    textAlign: "left",
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
  chatPanel: {
    background: "#FFFFFF",
    borderRadius: "26px",
    padding: "22px",
    minHeight: "360px",
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
