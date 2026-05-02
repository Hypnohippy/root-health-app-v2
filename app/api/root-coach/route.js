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

  if (text.includes("food") || text.includes("eat") || text.includes("diet") || text.includes("nutrition") || text.includes("reflux") || text.includes("bloating") || text.includes("indigestion")) {
    return "nutrition_digestive";
  }

  if (text.includes("stress") || text.includes("anxiety") || text.includes("panic") || text.includes("overwhelm") || text.includes("thoughts")) {
    return "psychological";
  }

  if (text.includes("trauma") || text.includes("ptsd") || text.includes("trigger") || text.includes("unsafe") || text.includes("flashback")) {
    return "trauma_nervous_system";
  }

  if (text.includes("exercise") || text.includes("movement") || text.includes("pain") || text.includes("aching") || text.includes("stiff") || text.includes("recovery")) {
    return "physical_recovery";
  }

  if (text.includes("plan") || text.includes("routine") || text.includes("what should i do") || text.includes("today")) {
    return "plan";
  }

  return "whole_person";
}

function fallbackReply(message, history = []) {
  const latest = Array.isArray(history) ? history[0] : null;
  const signal = latest?.signal || "your current signal";
  const intensity = Number(latest?.intensity || 0);
  const type = detectQuestionType(message);

  if (intensity >= 8) {
    return `I’m noticing ${signal} has been logged at a high level.\n\nFor now, keep this simple: reduce load, avoid repeatedly testing it, and notice whether it settles, spreads, worsens, or changes.\n\nIf it feels severe, unusual, persistent, or worrying, it’s worth getting proper medical support.`;
  }

  if (type === "nutrition_digestive") {
    return `Looking at this through the nutrition and digestion lens, I’d keep the next step simple.\n\nTry not to change everything at once. Notice meal timing, portion size, stress around eating, and whether certain foods seem to trigger the signal.\n\nOne useful question: did this show up before eating, after eating, or during a stressful period?`;
  }

  if (type === "psychological") {
    return `Looking at this through the stress and emotional load lens, your system may be asking for less pressure rather than more effort.\n\nA useful first step is to pause and ask: “What is loading me right now?”\n\nThen choose one small reduction — less stimulation, slower breathing, or stepping away for a few minutes.`;
  }

  if (type === "trauma_nervous_system") {
    return `Let’s treat this gently. If this feels connected to trauma or old threat patterns, the first aim is not to force insight — it is to help your system feel safer.\n\nStart with orientation: look around the room, feel your feet, soften your breathing, and remind yourself that this is now, not then.`;
  }

  if (type === "physical_recovery") {
    return `Looking at this through the movement and recovery lens, I’d avoid pushing through today.\n\nReduce load, use gentle movement only if it feels safe, and notice whether rest, warmth, posture, or avoiding certain movement changes the signal.`;
  }

  if (type === "plan") {
    return `Let’s make this simple for today:\n\n1. Pick one signal to focus on.\n2. Choose one supportive action.\n3. Avoid changing too many things at once.\n4. Check back later: better, worse, or the same?\n\nWhat feels like the main signal today?`;
  }

  return `I hear you. Let’s look at this as a whole-person pattern rather than one isolated symptom.\n\nThe useful question is: is your system asking for food support, emotional space, nervous system settling, movement, rest, or a simpler routine today?`;
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

You are not five separate coaches. You are ONE voice that can draw on five internal lenses:

1. Nutrition and digestion
2. Psychology and emotional wellbeing
3. Trauma-informed nervous system support
4. Movement, strength, recovery and physical wellbeing
5. General lifestyle medicine and self-care

The user should feel guided, not assessed.

Current question type detected: ${questionType}

User name: ${userName || "the user"}

Recent body signal history:
${summariseHistory(history)}

Response rules:
- Answer the user's actual question directly.
- Use their recent body signal history if relevant.
- Do not give generic wellness advice unless the question is general.
- Keep answers calm, human and practical.
- Give 1 to 3 clear next steps maximum.
- Ask one useful follow-up question only if it helps.
- Do not diagnose.
- Do not over-medicalise.
- If symptoms are severe, worsening, unusual, persistent, or worrying, advise appropriate medical support.
- If the user asks about food, digestion, reflux or bloating, use the nutrition/digestion lens.
- If the user asks about anxiety, stress, mood or overwhelm, use the psychological lens.
- If the user asks about trauma, PTSD, triggers or feeling unsafe, use the trauma-informed nervous system lens.
- If the user asks about pain, movement, exercise, strength or recovery, use the physical recovery lens.
- If the user asks for a plan, create a small practical plan.
- Never sound like a form, tracker, or generic chatbot.
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
