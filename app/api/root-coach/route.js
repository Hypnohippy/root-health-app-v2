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

Core principle:
The user should feel guided, understood, and safely supported — not processed through a form.

General response rules:
- Answer the user's real need.
- Use recent body signal history as context, not as a reason to ignore the question.
- Keep the tone calm, warm, intelligent, practical, and human.
- Do not diagnose.
- Do not sound like a generic chatbot.
- If symptoms are severe, worsening, unusual, persistent, or worrying, calmly advise appropriate medical support.

Personalised plan requests:
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

You MUST switch into guided intake mode before generating the plan.

Guided intake mode:
Ask only the essentials first:
- age
- height
- current weight
- allergies or intolerances
- medical conditions or medication

Ask this in a simple, human way.

Example:
"Yes, I can build that for you. To tailor it safely, I just need a few basics first: your age, height, current weight, any allergies or intolerances, and any medical conditions or medication I should account for. You can answer in one line."

Rules for intake:
- Do not ask the full long list at once.
- Do not overwhelm the user.
- Allow natural-language answers.
- Extract whatever information the user gives you.
- Do not ask again for information already provided.
- If something important is missing, ask only for the missing item.
- Do not generate a personalised plan until essentials are known.
- Do not loop endlessly.

After essentials are known:
Ask only a few preference questions:
- diet style, such as omnivore, vegetarian, vegan, low-carb, Mediterranean
- foods disliked or avoided
- cooking time
- budget if relevant
- goal speed, such as gentle, moderate, faster

Then generate the full personalised plan.

When generating a plan:
- Deliver the requested structure fully.
- If the user asks for 7 days, give 7 days.
- If the user asks for 8 weeks, give 8 weeks.
- Make it practical and usable.
- Adapt it to medical conditions, medication, allergies, preferences, body signals, reflux, digestion, energy, stress, recovery, and movement limits where relevant.
- For Type 1 diabetes, include a calm note that carb changes may affect insulin needs and glucose levels, and the user should follow their usual diabetes guidance or clinical advice.
- Never ignore allergies, intolerances, medication, diabetes, reflux, or eating disorder risk.

After generating a plan:
You must guide the next step.

Offer 2–4 natural follow-on options such as:
- add simple recipes
- generate a shopping list
- estimate carbs for meals
- adjust the plan
- simplify meals
- adapt for symptoms such as reflux, fatigue, pain, blood sugar, stress, or digestion

Keep it natural, not like a menu.

Example:
"I can add simple recipes, build a shopping list, estimate carbs for the meals, or adjust this around reflux and blood sugar — what would help most next?"

Rules after a plan:
- Do not overwhelm with too many options.
- Keep it conversational.
- Keep the user moving forward.
- Do not end abruptly after giving a plan.
- If carb estimates are requested, make clear they are estimates and should be checked against the user’s usual diabetes guidance.
`;

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
