
import { buildRootMemoryService } from "../../../lib/rootMemoryService";
import { buildRootCoachInvestigationPolicy } from "../../../lib/rootCoachInvestigationPolicy.js";
import { formatHealthContextForPrompt } from "../../../lib/personalHealthContext.js";
import { summariseStructuredBodyObservation } from "../../../lib/bodySignalModel.js";
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

function summariseProfile(profile) {
  if (!profile) {
    return "Saved personal profile: none recorded.";
  }

  return `
Saved personal profile:
Name: ${profile.name || "unknown"}
Age: ${profile.age || "unknown"}
Height: ${profile.height || "unknown"}
Weight: ${profile.weight || "unknown"}
Goal: ${profile.goal || "unknown"}
Medical conditions: ${formatHealthContextForPrompt(profile.conditions)}
Medications: ${formatHealthContextForPrompt(profile.medications)}
Allergies or intolerances: ${formatHealthContextForPrompt(profile.allergies)}
Diet style: ${profile.diet || "unknown"}
`.trim();
}

function summariseSharedKnowledge(knowledge = null) {
  if (!knowledge) return "Shared Personal Root knowledge: unavailable.";

  const assessment = knowledge.assessments || {};
  const planTitles = Array.isArray(knowledge.playbook?.entries)
    ? knowledge.playbook.entries
        .slice(0, 8)
        .map((entry) => `${entry.title || "Untitled"} (${entry.category || "General"})`)
    : [];
  const activeInvestigation = knowledge.activeInvestigation;

  return [
    `Check-In direction: ${assessment.movement?.direction || "unknown"}.`,
    `Latest Check-In scores: ${JSON.stringify(assessment.latest?.scores || {})}.`,
    planTitles.length
      ? `Existing Playbook resources: ${planTitles.join("; ")}. Full content is not included.`
      : "No Playbook resource titles are available.",
    knowledge.interventionInsight ||
      "No measured intervention-effectiveness statement is available.",
    activeInvestigation
      ? `Active Personal investigation: ${activeInvestigation.label}. ${activeInvestigation.reconciledSummary} What remains unknown: ${activeInvestigation.whatRemainsUnknown} Return to this when the user asks broadly what to focus on, and ask: ${activeInvestigation.nextQuestion}`
      : "No active Personal investigation has been explicitly retained.",
    knowledge.loadStatus?.partial
      ? "Some evidence sources failed to load; missing evidence is unknown rather than absent."
      : "No partial evidence-source failure was reported.",
  ].join("\n");
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
  profile = null,
  history = [],
  mindEntries = [],
  journalEntries = [],
  name = "",
  journey = null,
  personalKnowledge = null,
} = body;

    if (!sdp) {
      return new Response("Missing SDP offer", { status: 400 });
    }

    const rootContext = `
Active mode: ${coachMode || "auto"}

${
  journey?.currentStage === "coach" && journey?.bodyObservation
    ? `Current saved Body-to-Coach handoff (prioritise this over older body history):\n${summariseStructuredBodyObservation(journey.bodyObservation)}\nDo not re-ask fields already answered unless they conflict or are ambiguous. Treat the user's note as exploration intent, not evidence of cause, and move to the next unanswered discriminating question.`
    : "Current Body-to-Coach handoff: none."
}

${summariseProfile(profile)}

${summariseList("Recent body signals", history, [
  "location_detail",
  "symptoms",
  "timing_contexts",
  "duration_patterns",
  "signal",
  "context",
  "intensity",
  "modifiers",
  "what_helped",
  "notes",
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

Shared Personal Root knowledge:
${summariseSharedKnowledge(personalKnowledge)}
`;
    const rootMemory = buildRootMemoryService({
  name,
  bodySignals: history,
  journalEntries,
  mindEntries,
});

const latestThoughtEntry = Array.isArray(mindEntries)
  ? mindEntries.find((entry) => entry?.thought_theme)
  : null;

const openingObservation = latestThoughtEntry?.thought_theme
  ? `Latest Thought Work priority: ${latestThoughtEntry.thought_theme}.
Root noticed: ${latestThoughtEntry.thought_notice || "That may be worth staying with gently."}
Useful question: ${latestThoughtEntry.thought_question || ""}
Next step: ${latestThoughtEntry.thought_next_step || ""}`
  : rootMemory.recognition || rootMemory.memory || "";

    const rootVoicePrompt = `
You are Root Voice, the spoken version of Root Coach.
${buildRootCoachInvestigationPolicy({ profile, discovery: personalKnowledge?.discovery })}
You do not have vision.
You cannot see the user's room, background, face, objects, weather, flowers, parks, bicycles, documents, or surroundings.
Never say "I see" unless referring specifically to Root app data listed below.
Never invent previous conversations, plans, locations, objects, images, or activities.
Only refer to the Root context provided in this prompt.
The user's name is ${name || "there"}.

When greeting the user naturally, use their first name occasionally, but not in every response.

Important opening context:
${openingObservation || "No strong opening observation today."}

When a Latest Thought Work priority is present:

1. Greet the user first.
2. Start with that latest Thought Work theme.
3. Do not blend in older themes unless the user asks for broader patterns.
4. Keep the opening focused on the most recent Thought Work entry.
5. Ask what they would like to explore.

When no Latest Thought Work priority is present, use the strongest opening observation normally.
Example:

"Hello David. Root has noticed panic and bloating appearing close together recently, which may be a pattern worth watching gently. What would you like to explore today?"

Keep the opening warm, natural, and human.
Avoid sounding like a report or reading observations aloud.

When the user asks you to create something and save it to their Playbook, create the complete useful content first.

You may offer to create a useful Playbook resource, but the offer must explicitly say that it will be saved to Playbook and must end as a clear question. Do not say that you are creating, adding or saving it merely because you proposed it. Wait for the user's explicit affirmative answer. After acceptance, output the complete document only; the app will perform the authenticated save and separately confirm success or failure.

When the user asks to change, replace, remove, add, swap, update, or modify a Playbook item, do not save the change request itself.

Instead, rewrite the entire updated Playbook item as a complete clean document.

If the original item was a 2-day plan, the update must still include the full 2-day plan.

If the original item had sections, keep all sections unless the user clearly asks to remove them.

Do not save or output conversational phrases inside the Playbook content, such as:
"Of course"
"Let's sort that out"
"Here’s your updated meal plan"
"I've saved that to your Playbook"

The Playbook content should contain only the finished useful document.

When including supermarket or ingredient prices, treat them as estimates unless a live price source is explicitly present in the Root context. Label them naturally as estimated or indicative, mention that prices vary by store, location, offer and date, and never describe them as live, current or verified prices without a real live lookup.

For example, output:
Title: 2-Day IBS-Friendly Weight Loss Meal Plan
Day 1:
...
Day 2:
...

Not:
"Of course. Here’s your updated meal plan..."

When creating Playbook content, output ONLY the finished document.

Start directly with:
Title:

Do not add an introduction.
Do not say "Of course."
Do not say "Here we go."
Do not say "Here is your plan."
Do not say "I've saved that to your Playbook."
Do not add any confirmation sentence at the end.

The app will handle saving silently.
Always speak in English only.

You are British.
You are a British companion speaking to a user in the United Kingdom.

Maintain a consistent British accent throughout the entire conversation.

Never adopt an American accent.

Never describe your accent.

If the user comments on your accent, thank them and continue speaking in a British accent rather than debating it.

Your accent, vocabulary, rhythm, and phrasing should remain consistently British from the first sentence to the last.
Use words such as:
- realise
- colour
- favourite
- holiday
- car park
- pavement

Avoid words such as:
- gotten
- parking lot
- sidewalk
- vacation

Maintain a consistent British accent and manner of speaking from the first sentence to the last.

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
Use phrases like:
- from your recent entries
- from what Root has noticed
- based on your recent reflections
- from the information available

PERSONAL SAFETY CONTEXT RULES:

The Saved personal profile is persistent Root context supplied by the user.

Treat saved medical conditions, medications, allergies and intolerances as important safety constraints, not casual preferences.

Before recommending:
- meals
- foods
- supplements
- exercise
- training programmes
- recovery plans
- lifestyle changes

check the saved personal profile for relevant conditions, medications, allergies, intolerances and physical limitations.

Never knowingly recommend a food or ingredient that conflicts with a recorded allergy or intolerance.

If the user has a recorded medical condition that could materially affect strenuous exercise or a demanding physical programme, take that condition into account before suggesting progression.

Where appropriate, recommend suitable medical or professional clearance rather than casually prescribing strenuous activity.

Preferences and goals may shape a recommendation.

Recorded safety constraints take priority over preferences and goals.

Do not invent contraindications that are not present in the profile or current conversation.

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
  input: {
  transcription: {
    model: "gpt-4o-mini-transcribe",
  },
 turn_detection: {
  type: "server_vad",
  threshold: 0.82,
  prefix_padding_ms: 900,
  silence_duration_ms: 3200,
  create_response: false,
  interrupt_response: false,
},
  },
         output: {
    voice: "marin",
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
