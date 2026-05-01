export const runtime = "nodejs";

function normalise(value) {
  return String(value || "").toLowerCase().trim();
}

function summariseHistory(history = []) {
  if (!Array.isArray(history) || history.length === 0) {
    return "No body signal history yet.";
  }

  return history
    .slice(0, 12)
    .map((entry) => {
      return [
        `signal: ${entry.signal || "unknown"}`,
        `context: ${entry.context || "unknown"}`,
        `intensity: ${entry.intensity || "unknown"}/10`,
        `helped: ${entry.what_helped || "not recorded"}`,
      ].join(", ");
    })
    .join("\n");
}

function fallbackReply(message, history = []) {
  const latest = history?.[0];
  const signal = latest?.signal || "this";
  const intensity = Number(latest?.intensity || 0);

  if (intensity >= 8) {
    return `I’m noticing this has been logged quite strongly around ${signal}.\n\nLet’s not overcomplicate it. For today, reduce load, keep things simple, and avoid repeatedly testing whether it has changed.\n\nIf it feels severe, unusual, worsening, or worrying, it’s worth getting proper medical support.`;
  }

  if (normalise(message).includes("plan")) {
    return `Let’s keep the plan simple:\n\n1. Notice what is most present today.\n2. Choose one small supportive action.\n3. Avoid changing five things at once.\n4. Check back in later and see whether the signal softened, stayed the same, or increased.`;
  }

  return `I hear you. Let’s take this one layer at a time.\n\nYour body signal is information, not failure. The useful question is: what is your system asking for right now — less load, better fuel, safer rhythm, movement, rest, or emotional space?`;
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { userName, message, history, conversation } = body;

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return Response.json({
        reply: fallbackReply(message, history),
      });
    }

    const systemPrompt = `
You are Root Coach, one calm unified health guide.

You combine five internal coaching lenses:
1. Nutrition and digestion
2. Psychology and emotional wellbeing
3. Trauma-informed nervous system support
4. Movement, recovery and physical wellbeing
5. General lifestyle medicine and self-care

The user should experience ONE voice, not multiple coaches.

Your tone:
- calm
- grounded
- intelligent
- warm
- not clinical unless safety requires it
- not overwhelming
- no long essays
- no diagnosis
- no fear language

Use the user's body signal history when relevant.
If symptoms are severe, worsening, unusual, persistent, or worrying, advise getting appropriate professional medical support.

Your role is to hand-hold:
- reflect what you notice
- explain gently
- suggest one or two next steps
- ask one useful follow-up question when helpful

User name: ${userName || "the user"}

Recent body signal history:
${summariseHistory(history)}
`;

    const openAIResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.7,
        messages: [
          { role: "system", content: systemPrompt },
          ...(Array.isArray(conversation)
            ? conversation.map((m) => ({
                role: m.role === "user" ? "user" : "assistant",
                content: m.content,
              }))
            : []),
          { role: "user", content: message },
        ],
      }),
    });

    if (!openAIResponse.ok) {
      return Response.json({
        reply: fallbackReply(message, history),
      });
    }

    const data = await openAIResponse.json();
    const reply =
      data?.choices?.[0]?.message?.content ||
      fallbackReply(message, history);

    return Response.json({ reply });
  } catch (error) {
    return Response.json({
      reply:
        "Something interrupted that, but I’m still here. Tell me the main thing you want support with right now.",
    });
  }
}
