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
    .map((entry) => {
      return [
        `signal: ${entry.signal || "unknown"}`,
        `context: ${entry.context || "unknown"}`,
        `intensity: ${entry.intensity || "unknown"}/10`,
        `helped: ${entry.what_helped || "not recorded"}`,
        `created: ${entry.created_at || "unknown"}`,
      ].join(", ");
    })
    .join("\n");
}

function detectQuestionType(message) {
  const text = normalise(message);

  if (
    text.includes("weight loss") ||
    text.includes("lose weight") ||
    text.includes("fat loss") ||
    text.includes("nutrition plan") ||
    text.includes("meal plan") ||
    text.includes("diet plan") ||
    text.includes("food") ||
    text.includes("eat") ||
    text.includes("diet") ||
    text.includes("nutrition") ||
    text.includes("reflux") ||
    text.includes("bloating") ||
    text.includes("indigestion")
  ) {
    return "nutrition_digestive";
  }

  if (
    text.includes("stress") ||
    text.includes("anxiety") ||
    text.includes("panic") ||
    text.includes("overwhelm") ||
    text.includes("thoughts")
  ) {
    return "psychological";
  }

  if (
    text.includes("trauma") ||
    text.includes("ptsd") ||
    text.includes("trigger") ||
    text.includes("unsafe") ||
    text.includes("flashback")
  ) {
    return "trauma_nervous_system";
  }

  if (
    text.includes("exercise") ||
    text.includes("movement") ||
    text.includes("pain") ||
    text.includes("aching") ||
    text.includes("stiff") ||
    text.includes("recovery") ||
    text.includes("fitness") ||
    text.includes("strength")
  ) {
    return "physical_recovery";
  }

  if (
    text.includes("plan") ||
    text.includes("routine") ||
    text.includes("what should i do") ||
    text.includes("today")
  ) {
    return "plan";
  }

  return "whole_person";
}

function hasUrgentSafetyLanguage(message) {
  const text = normalise(message);

  return (
    text.includes("chest pain") ||
    text.includes("can't breathe") ||
    text.includes("cannot breathe") ||
    text.includes("severe pain") ||
    text.includes("fainting") ||
    text.includes("blood") ||
    text.includes("suicidal") ||
    text.includes("kill myself") ||
    text.includes("emergency")
  );
}

function fallbackReply(message, history = []) {
  const type = detectQuestionType(message);
  const latest = Array.isArray(history) ? history[0] : null;
  const latestSignal = latest?.signal || null;

  if (hasUrgentSafetyLanguage(message)) {
    return `This sounds like something that may need urgent support. Please seek appropriate medical or emergency help now if you feel unsafe, severely unwell, or at risk.`;
  }

  if (type === "nutrition_digestive") {
    return `Yes — let’s make this practical and gentle.

For weight loss, I’d start with a simple structure rather than a harsh diet:

1. Build each meal around protein first.
2. Add vegetables or fibre to help fullness.
3. Keep carbohydrates steady rather than cutting them aggressively.
4. Reduce grazing by creating clear meal times.
5. Track how your body responds, especially if reflux or digestion has been showing up.

A simple day could look like:

Breakfast: Greek yoghurt or eggs with fruit  
Lunch: chicken, fish, tofu or beans with salad/veg  
Dinner: protein + vegetables + a moderate portion of carbs  
Snack if needed: fruit, yoghurt, nuts, or something protein-based

Because ${latestSignal || "digestion"} has shown up recently, I’d avoid making the plan too aggressive. Weight loss works better when your system feels safe enough to stay consistent.

Would you like this as a 7-day plan, or a simple daily template?`;
  }

  if (type === "psychological") {
    return `Yes. Let’s look at this through stress and emotional load.

Start with one question: what is asking the most from you right now?

A useful first step is not to fix everything, but to reduce pressure slightly:
1. Pause for a few slow breaths.
2. Remove one unnecessary demand.
3. Choose one small action that makes today easier.

What feels heaviest at the moment?`;
  }

  if (type === "trauma_nervous_system") {
    return `Let’s approach this gently.

If this feels trauma-linked, the aim is not to force insight. The first step is helping your system feel safer.

Try this:
1. Look around the room and name five neutral things you can see.
2. Feel your feet or hands against something solid.
3. Remind yourself: “This is now, not then.”

What are you noticing in your body right now?`;
  }

  if (type === "physical_recovery") {
    return `Yes. Let’s treat this as a recovery question.

For today:
1. Reduce load rather than pushing through.
2. Use gentle movement only if it feels safe.
3. Notice whether rest, warmth, posture, or movement changes the signal.

If pain is sharp, worsening, limiting movement, or unusual, it’s worth getting it checked.`;
  }

  if (type === "plan") {
    return `Yes. Let’s keep the plan simple:

1. Pick one main focus.
2. Choose one supportive action.
3. Avoid changing too many things at once.
4. Check back later: better, worse, or the same?

What would you like the plan to focus on — food, stress, movement, sleep, or recovery?`;
  }

  return `Yes. Let’s look at this as a whole-person pattern.

The useful question is: is your system asking for food support, emotional space, nervous system settling, movement, rest, or a simpler routine today?`;
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { userName, message, history, conversation } = body;

    const apiKey = process.env.OPENAI_API_KEY;
    const questionType = detectQuestionType(message);

    if (!apiKey) {
      return Response.json({
        reply: fallbackReply(message, history),
      });
    }

   const systemPrompt = `
You are Root Coach, one calm unified health guide.

You are ONE voice drawing from five internal lenses:
1. Nutrition and digestion
2. Psychology and emotional wellbeing
3. Trauma-informed nervous system support
4. Movement, strength, recovery and physical wellbeing
5. General lifestyle medicine and self-care

User name: ${userName || "the user"}

Detected question type: ${questionType}

Recent body signal history:
${summariseHistory(history)}

Most important rule:
Answer the user's actual question first.

If the user asks for a structured output such as a plan, programme, routine, schedule, meal plan, workout plan, recovery plan, or 8-week plan:

You MUST:
- Fully deliver the requested structure immediately.
- Do not ask if they want the plan.
- Do not summarise instead of delivering it.
- Do not reduce it to general advice.
- Give the actual weeks, stages, meals, routines, or actions requested.

Examples:
- “8-week plan” means give an 8-week plan.
- “meal plan” means give actual meals.
- “routine” means give a daily or weekly routine.
- “workout plan” means give actual sessions.

Body signal history should modify the plan, not block it.

Examples:
- Reflux means smaller meals, avoid late eating, reduce likely triggers, keep digestion calm.
- Fatigue means reduce intensity and simplify the plan.
- Pain means avoid aggressive exercise and include recovery.
- Stress means reduce overwhelm and keep steps manageable.

Use body signal history as context, not as a reason to ignore the question.

Safety:
Only prioritise urgent medical advice if the user describes severe, urgent, dangerous, or alarming symptoms.
If symptoms are severe, worsening, unusual, persistent, or worrying, include a calm safety note, but still answer the user's actual question where appropriate.

Style:
- calm
- intelligent
- practical
- human
- no generic chatbot tone
- no diagnosis
- no long essays unless the user asks for a full plan
- when the user asks for depth, give depth
`;
    const openAIResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
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
    const reply = data?.choices?.[0]?.message?.content || fallbackReply(message, history);

    return Response.json({ reply });
  } catch (error) {
    return Response.json({
      reply:
        "Something interrupted that, but I’m still here. Tell me the main thing you want support with right now.",
    });
  }
}
