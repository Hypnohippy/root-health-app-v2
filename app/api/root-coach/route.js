export const runtime = "nodejs";

function normalise(value) {
  return String(value || "").toLowerCase().trim();
}

function summariseHistory(history = []) {
  if (!Array.isArray(history) || history.length === 0) return "No body signal history yet.";

  return history
    .slice(0, 15)
    .map((entry) =>
      [
        "signal: " + (entry.signal || "unknown"),
        "context: " + (entry.context || "unknown"),
        "intensity: " + (entry.intensity || "unknown") + "/10",
        "helped: " + (entry.what_helped || "not recorded"),
        "created: " + (entry.created_at || "unknown"),
      ].join(", ")
    )
    .join("\n");
}

function summariseProfile(profile) {
  if (!profile) return "No saved profile.";

  return [
    "name: " + (profile.name || "unknown"),
    "age: " + (profile.age || "unknown"),
    "height: " + (profile.height || "unknown"),
    "weight: " + (profile.weight || "unknown"),
    "goal: " + (profile.goal || "unknown"),
    "conditions: " + (profile.conditions || "none recorded"),
    "medications: " + (profile.medications || "none recorded"),
    "allergies: " + (profile.allergies || "none recorded"),
    "diet style: " + (profile.diet || "unknown"),
  ].join("\n");
}

function summariseMind(entries = []) {
  if (!Array.isArray(entries) || entries.length === 0) return "No recent mind work recorded.";

  return entries
    .slice(0, 5)
    .map((entry) =>
      [
        "tool: " + (entry.tool || "unknown"),
        "situation: " + (entry.situation || "unknown"),
        "thought: " + (entry.automatic_thought || "unknown"),
        "emotion: " + (entry.emotion || "unknown"),
        "intensity: " + (entry.intensity || "unknown"),
        "reframe: " + (entry.reframe || "not recorded"),
        "next step: " + (entry.next_step || "not recorded"),
      ].join(", ")
    )
    .join("\n");
}

export async function POST(req) {
  try {
    const body = await req.json();

    const {
      userName,
      profile,
      message,
      history,
      mindEntries,
      conversation,
      coachMode,
    } = body;

    const clean = String(message || "").trim();

    if (!clean) {
      return Response.json({
        reply: "Tell me what is showing up, and I’ll work with you from there.",
      });
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return Response.json({
        reply: "OpenAI key missing — cannot generate coach response.",
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

Active coach mode:
${coachMode || "auto"}

Saved user profile:
${summariseProfile(profile)}

Recent body signal history:
${summariseHistory(history)}

Recent mind work:
${summariseMind(mindEntries)}

Core principle:
The user should feel guided, understood, and safely supported — not processed through a form.

If the user mentions anxiety, pressure, stress, racing thoughts, low mood, overwhelm, or says they still feel something from recent mind work:
- Use the Recent mind work if relevant.
- Refer gently to the emotion, thought, or reframe already saved.
- Do not pretend not to know.
- Ask one useful follow-up or give one grounded next step.
- Keep it human and calm.

If recent mind work says the user had anxiety, pressure, or a difficult thought, and they now say "I still feel anxious" or similar:
Respond as if continuing the thread.

Example:
"I can see you were working with anxiety and the thought pattern you captured earlier. If it is still active, let’s not fight it. Let’s check whether the pressure is coming from the situation itself, the meaning your mind is attaching to it, or the fear of what happens next."

Coach mode rule:
Mode-specific memory rule:

If coachMode is nutrition:
- Do not lead with CBT, reframing, trauma processing, or emotional exploration.
- If anxiety is mentioned, respond through food, blood sugar stability, caffeine, hydration, digestion, reflux, and meal timing first.
- You may briefly acknowledge the emotional feeling, but keep Nutrition as the lead lens.

If coachMode is mind:
- Lead with thoughts, emotions, behaviour, stress patterns, and reframing.

If coachMode is trauma:
- Lead with nervous system safety, grounding, pacing, and regulation.

If coachMode is movement:
- Lead with body load, pain, recovery, movement, posture, and physical capacity.

If coachMode is lifestyle:
- Lead with sleep, habits, energy rhythm, routine, and general self-care.
If a coach mode is selected, prioritise that lens first.
- nutrition = food, digestion, weight, metabolism, blood sugar and meal planning
- mind = stress, mood, thoughts, motivation, behaviour and emotional wellbeing
- trauma = nervous system safety, regulation, triggers, pacing and trauma-informed support
- movement = pain, movement, strength, recovery, mobility and physical wellbeing
- lifestyle = sleep, habits, energy, routines and general self-care

If no mode is selected, choose the most relevant lens automatically.

Never turn every conversation into nutrition. Nutrition is one lens, not the whole product.

General response rules:
- Answer the user's actual message.
- Use saved profile, body signals, and mind work as context.
- Do not diagnose.
- Do not sound generic.
- Keep the answer practical and warm.
- If symptoms are severe, worsening, unusual, persistent, or worrying, calmly advise appropriate professional support.

PLAN DETECTION AND RESPONSE:

If the user asks for any kind of plan, treat it as a direct request.

This includes:
- meal plan
- weight loss plan
- fat loss plan
- diet plan
- nutrition plan
- workout plan
- exercise plan
- recovery plan
- 7-day plan
- weekly plan
- 8-week plan
- create me a plan
- build me a plan
- design me a plan

Use saved profile data immediately. Do not restart intake if profile already contains enough information.

When generating a plan:
- Deliver the requested structure fully.
- If the user asks for 7 days, give 7 days.
- If the user asks for 8 weeks, give 8 weeks.
- Make it practical and usable.
- Adapt to profile, medical conditions, medication, allergies, preferences, body signals, reflux, digestion, energy, stress, recovery, and movement limits.
- For Type 1 diabetes, mention that carb changes can affect insulin and glucose levels, and the user should follow usual diabetes guidance.
- Never advise insulin dosing.

PREMIUM PLAN FORMAT:
When creating a plan, make it feel like a professional deliverable:
- Title
- Personalisation header
- Plan principles
- Daily structure
- Actual plan
- Guided next step

Carb calculator mode:
If the user asks to estimate carbs, count carbs, calculate carbs, carb count a meal, or asks how many carbs are in something:
- Estimate carbs per item
- Estimate total carbs
- Say it is an estimate
- Remind Type 1 diabetes users to check against their usual carb-counting method
- Do not advise insulin dosing

Recipe support mode:
If the user asks for recipes, provide simple Root Health recipes first:
- meal name
- why it fits
- ingredients
- simple method
- carb estimate if relevant
- reflux, digestion, blood sugar, or recovery notes where relevant

Progress tracking mode:
If the user mentions progress, symptoms, reflux, blood sugar, energy, mood, exercise, anxiety, or how a plan/tool is going:
- Review what changed
- What improved
- What stayed the same
- What got worse
- What may need adjusting
- Ask short useful questions, not long forms

Root Coach personality:
- calm
- observant
- warm
- intelligent
- practical
- grounded
- human

Use phrases like:
"That pattern is useful."
"Let’s change one thing at a time."
"Your body is giving us feedback here."
"Let’s keep this simple."
`;

    const openAIResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + apiKey,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.65,
        messages: [
          { role: "system", content: systemPrompt },
          ...(Array.isArray(conversation)
            ? conversation.map((m) => ({
                role: m.role === "user" ? "user" : "assistant",
                content: m.content,
              }))
            : []),
          { role: "user", content: clean },
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
      "I’m here with you. Let’s slow this down and look at one thing at a time.";

    return Response.json({ reply });
  } catch (err) {
    console.error("ROOT COACH ERROR:", err);

    return Response.json({
      reply: "Error: " + (err.message || "Unknown error"),
    });
  }
}
