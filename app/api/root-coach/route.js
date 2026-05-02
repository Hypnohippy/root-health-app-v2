export const runtime = "nodejs";

function normalise(value) {
  return String(value || "").toLowerCase().trim();
}

function summariseHistory(history = []) {
  if (!Array.isArray(history) || history.length === 0) {
    return "No body signal history yet.";
  }

  return history
    .slice(0, 15)
    .map((entry) =>
      [
        `signal: ${entry.signal || "unknown"}`,
        `context: ${entry.context || "unknown"}`,
        `intensity: ${entry.intensity || "unknown"}/10`,
        `helped: ${entry.what_helped || "not recorded"}`,
        `created: ${entry.created_at || "unknown"}`,
      ].join(", ")
    )
    .join("\n");
}

function isPersonalPlanRequest(message) {
  const text = normalise(message);

  return (
    text.includes("meal plan") ||
    text.includes("weight loss plan") ||
    text.includes("fat loss plan") ||
    text.includes("diet plan") ||
    text.includes("workout plan") ||
    text.includes("exercise plan") ||
    text.includes("recovery plan") ||
    text.includes("7 day") ||
    text.includes("8 week") ||
    text.includes("plan")
  );
}

function intakeReply(userName, history = []) {
  const latest = Array.isArray(history) ? history[0] : null;
  const signalNote = latest?.signal
    ? `I can also see ${latest.signal} has shown up recently, so I’ll take that into account.`
    : "";

  return `Yes, I can build that for you — but I need a few details first so it is safe and actually tailored to you.

${signalNote}

Please reply with as much of this as you can:

1. Age
2. Height
3. Current weight
4. Target weight or goal
5. Sex
6. Activity level
7. Medical conditions
8. Medication
9. Allergies or intolerances
10. Dietary style: omnivore, vegetarian, vegan, etc
11. Foods you dislike or avoid
12. Digestion issues, reflux, bloating, IBS, etc
13. Cooking time and ability
14. Budget: low, medium, flexible
15. Goal speed: gentle, moderate, or more aggressive
16. Any history of disordered eating or unsafe dieting

Once you answer, I’ll build the plan around you — not assumptions.`;
}

function fallbackReply(message, history = [], userName = "") {
  if (isPersonalPlanRequest(message)) {
    return intakeReply(userName, history);
  }

  return `I’m here with you. Tell me what you want support with — food, stress, trauma patterns, movement, recovery, or understanding your body signals — and I’ll guide you from there.`;
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { userName, message, history, conversation } = body;

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return Response.json({
        reply: fallbackReply(message, history, userName),
      });
    }

    const systemPrompt = `
You are Root Coach, one calm unified health guide.

You are ONE coach, not five separate coaches. Internally you draw from five lenses:
1. Nutrition and digestion
2. Psychology and emotional wellbeing
3. Trauma-informed nervous system support
4. Movement, strength, recovery and physical wellbeing
5. General lifestyle medicine and self-care

User name: ${userName || "the user"}

Recent body signal history:
${summariseHistory(history)}

Core rule:
Answer the user's real need, but never create unsafe personalised plans from assumptions.

If the user asks for a personalised plan, including:
- meal plan
- weight loss plan
- fat loss plan
- diet plan
- workout plan
- exercise plan
- recovery plan
- 7-day plan
- 8-week plan

You MUST switch into intake mode first.

Ask for:
- age
- height
- current weight
- target weight or goal
- sex
- activity level
- medical conditions
- medication
- allergies or intolerances
- dietary style
- food dislikes
- digestion issues including reflux
- cooking time and ability
- budget
- goal speed
- history of disordered eating or unsafe dieting

Rules for intake mode:
- Do NOT generate the plan yet.
- Do NOT assume allergies, weight, medical conditions, medication or eating disorder risk.
- Ask the intake questions in one calm grouped message.
- Explain briefly that this protects safety and makes the plan tailored.
- Mention relevant body signal history gently, but do not let it replace the user's request.
- Do not loop endlessly. Once the user answers the intake, build the plan.

For general questions:
- Use the relevant internal lens.
- Keep the voice calm, practical and human.
- Give useful guidance, not templates.
- Do not diagnose.
- If symptoms are severe, worsening, unusual, persistent or worrying, advise appropriate medical support.

Tone:
- warm
- intelligent
- calm
- direct
- practical
- never generic
`;

    const openAIResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.6,
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
        reply: fallbackReply(message, history, userName),
      });
    }

    const data = await openAIResponse.json();
    const reply =
      data?.choices?.[0]?.message?.content ||
      fallbackReply(message, history, userName);

    return Response.json({ reply });
  } catch (error) {
    return Response.json({
      reply: fallbackReply("", [], ""),
    });
  }
}
