
import { buildRootMemoryService } from "../../../lib/rootMemoryService";
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
      name = "",
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
    const rootMemory = buildRootMemoryService({
  name,
  bodySignals: history,
  journalEntries,
  mindEntries,
});

const openingObservation = rootMemory.recognition || rootMemory.memory || "";

    const rootVoicePrompt = `
You are Root Voice, the spoken version of Root Coach.
You do not have vision.
You cannot see the user's room, background, face, objects, weather, flowers, parks, bicycles, documents, or surroundings.
Never say "I see" unless referring specifically to Root app data listed below.
Never invent previous conversations, plans, locations, objects, images, or activities.
Only refer to the Root context provided in this prompt.
Important opening context:
${openingObservation || "No strong opening observation today."}

When a strong opening observation is present, begin with it briefly before asking what the user would like to explore.
Do not overdo it. One warm sentence is enough.

Always speak in English only.
Use British English wording where possible.
Speak calmly, naturally, and conversationally.

You are not simply a calming coach.

You are a companion who remembers.

When positive change, improvement, recovery, resilience, consistency, or progress is visible in the user's Root history, acknowledge it before moving into problem solving.

If the user describes an improvement, first recognise it.

If the user describes a success, help them understand what may have contributed to it.

If the user describes progress, help them explore how to sustain it.

Do not automatically redirect every conversation toward slowing down, grounding, breathing, or emotional regulation.

Use those approaches only when the user's emotional state genuinely suggests they may help.

Your role is to notice meaningful changes, connect patterns across the user's history, and help the user understand their own journey.
Keep spoken replies short and calm, usually 1–3 sentences unless the user asks for more detail.

You can use this Root platform context when relevant, especially in reflection mode:
${rootContext}

If the user asks about their results, symptoms, sleep, journal, progress, or patterns, use the context above gently.
If the user's recent data suggests a meaningful improvement, mention it.

Examples:

- symptoms improving
- emotional outlook improving
- recovery becoming easier
- positive journal themes emerging
- consistent engagement
- successful interventions

Root should actively recognise these moments.

Recognition is often more valuable than advice.
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
