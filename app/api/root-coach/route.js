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
  function hasEssentialData(message) {
  const text = normalise(message);

  const hasHeight =
    text.includes("ft") ||
    text.includes("cm") ||
    text.includes("height");

  const hasWeight =
    text.includes("kg") ||
    text.includes("st") ||
    text.includes("lbs") ||
    text.includes("weight");

  const hasMedical =
    text.includes("diabetic") ||
    text.includes("diabetes") ||
    text.includes("medication") ||
    text.includes("condition");

  return hasHeight && hasWeight && hasMedical;
}
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
    ? `I can also see ${latest.signal} has shown up recently, so I’ll factor that in.`
    : "";

  return `Yes, I can build that for you — I just need a few basics first so it’s actually tailored to you.

${signalNote}

Start with this:

• Age  
• Height  
• Current weight  
• Any allergies or intolerances?  
• Any medical conditions or medication?

You can answer in one line if you like 👍`;
}
function fallbackReply(message, history = [], userName = "") {
 if (isPersonalPlanRequest(message)) {
  if (!hasEssentialData(message)) {
    return intakeReply(userName, history);
  }
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
    reply: "OpenAI key missing — cannot generate personalised plan.",
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

If the user asks for a personalised plan (meal plan, weight loss, exercise, recovery, etc):

Switch into a guided intake conversation.

Step 1 — Ask essentials only:
- age
- height
- current weight
- allergies or intolerances
- medical conditions or medication

Ask in a simple human way.

Example tone:
"I just need a few basics first: age, height, weight, any allergies, and anything medical I should account for."

IMPORTANT:
- The user may answer in natural language
- Extract whatever information you can from their reply
- Do NOT ask again for information they already gave

Step 2 — If anything is missing:
Ask ONLY for what is missing (not the full list again)

Step 3 — Ask preferences (only once essentials are covered):
- diet style
- foods disliked
- cooking time
- budget
- goal speed

Step 4 — Then generate the full personalised plan

Rules:
- Never repeat the full question list again
- Never ask everything twice
- Never overwhelm the user
- Always move the conversation forward
- If you have enough to proceed, proceed
After generating a plan:

You must guide the next step.

Offer 2–4 clear options such as:
- add simple recipes
- generate a shopping list
- adjust the plan
- simplify meals
- adapt for symptoms (reflux, fatigue, etc)

Keep it natural, not like a menu.

Example tone:
"I can add simple recipes, build a shopping list, or adjust this based on how your body responds — what would you like to do next?"

Rules:
- Do not overwhelm with too many options
- Keep it conversational
- Keep the user moving forward
- Do not end abruptly after giving a plan

Safety:
- Never ignore allergies, medication, or medical conditions
- Adjust the plan accordingly`;

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
  const errorText = await openAIResponse.text();

  return Response.json({
    reply: "AI error: " + errorText,
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
