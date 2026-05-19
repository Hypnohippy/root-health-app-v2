export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function summariseList(title, items = [], fields = []) {
  if (!Array.isArray(items) || items.length === 0) return `${title}: none recorded.`;

  return `${title}:\n${items
    .slice(0, 6)
    .map((item) =>
      fields
        .map((field) => `${field}: ${item?.[field] || "unknown"}`)
        .join(", ")
    )
    .join("\n")}`;
}

export async function POST(req) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return new Response("Missing OPENAI_API_KEY", { status: 500 });
    }

    const body = await req.json();

    const {
      sdp,
      coachMode,
      history = [],
      mindEntries = [],
      journalEntries = [],
    } = body;

    if (!sdp) {
      return new Response("Missing SDP offer", { status: 400 });
    }

    const rootContext = `
Active mode: ${coachMode || "auto"}

${summariseList("Recent body signals", history, [
  "signal",
  "context",
  "intensity",
  "what_helped",
])}

${summariseList("Recent mind entries", mindEntries, [
  "emotion",
  "automatic_thought",
  "reframe",
  "next_step",
])}

${summariseList("Recent journal reflections", journalEntries, [
  "title",
  "emotional_theme",
  "recommended_coach_mode",
])}
`;

    const rootVoicePrompt = `
You are Root Voice, the spoken version of Root Coach.

Always speak in English only.
Use British English wording where possible.
Speak calmly, slowly, and naturally.
Use a grounded, warm, emotionally steady tone.

Keep spoken replies short and calm, usually 1–3 sentences unless the user asks for more detail.

You can use this Root platform context when relevant, especially in reflection mode:
${rootContext}

If the user asks about their results, symptoms, sleep, journal, progress, or patterns, use the context above gently.
Do not pretend to know data that is not present.
Use phrases like "from what I can see" or "it looks like".

Do not diagnose.
Do not claim to treat or cure.
You are not a doctor, therapist, emergency service, or diagnosis tool.

If the user mentions self-harm, suicidal intent, severe chest pain, severe breathing difficulty, fainting, stroke-like symptoms, severe allergic reaction, or an emergency, calmly tell them to seek urgent/emergency help now.

Avoid sounding theatrical, overly cheerful, overly polished, or performative.
Sound like a calm, emotionally regulated human being.
`;

    const form = new FormData();

    form.append("sdp", sdp);
    form.append(
      "session",
      JSON.stringify({
        type: "realtime",
        model: "gpt-realtime",
        instructions: rootVoicePrompt,
        audio: {
          output: {
            voice: "cedar",
          },
        },
      })
    );

    const response = await fetch("https://api.openai.com/v1/realtime/calls", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "OpenAI-Safety-Identifier": "root-health-voice-user",
      },
      body: form,
    });

    const answer = await response.text();

    return new Response(answer, {
      status: response.status,
      headers: {
        "Content-Type": "application/sdp",
      },
    });
  } catch (error) {
    return new Response(error?.message || "Realtime session failed", {
      status: 500,
    });
  }
}
