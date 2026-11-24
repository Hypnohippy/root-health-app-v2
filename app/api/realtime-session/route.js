
import { buildRootMemoryService } from "../../../lib/rootMemoryService";
import { buildRootCoachInvestigationPolicy } from "../../../lib/rootCoachInvestigationPolicy.js";
import { formatHealthContextForPrompt } from "../../../lib/personalHealthContext.js";
import { summariseStructuredBodyObservation } from "../../../lib/bodySignalModel.js";
import { buildTrackerCoachContext } from "../../../lib/trackerEvidenceContext.js";
import { loadPersonalRootKnowledge } from "../../../lib/personalKnowledgeService.js";
import {
  authorizeRealtimeSession,
  consumeCustomerRealtimeAllowance,
  confirmRealtimeGrantActive,
  reserveRealtimeSessionAllowance,
  realtimeProviderApiKey,
  realtimeSessionAccessResponse,
  RealtimeSessionAccessError,
} from "../../../lib/realtimeSessionGuard.server.js";
import {
  attachRealtimeCallToReservation,
  hangupRealtimeCall,
  immediatelyHangupRealtimeCall,
  markRealtimeCallTerminated,
  markRealtimeCallCreationFailed,
  parseRealtimeCallId,
} from "../../../lib/introducerRealtimeTermination.server.js";
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
    buildTrackerCoachContext(knowledge.trackers),
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
    let access;
    let introducerReservation = null;
    let introducerMaxSessionSeconds = null;
    let introducerPlannedSessionSeconds = null;
    let introducerCompletionGraceSeconds = null;
    let introducerWarningBeforeSeconds = null;
    try {
      access = await authorizeRealtimeSession({ request: req });
    } catch (error) {
      return realtimeSessionAccessResponse(error);
    }

    if (access.mode === "customer" && !consumeCustomerRealtimeAllowance(access.user.id)) {
      return Response.json({ error: "Please wait before starting another Root Voice session." }, { status: 429, headers: { "Cache-Control": "no-store" } });
    }

    const apiKey = realtimeProviderApiKey(access.mode);

    if (!apiKey) {
      return Response.json(
        { error: "Voice is not configured." },
        { status: 503, headers: { "Cache-Control": "no-store" } }
      );
    }

    let body;
    try {
      const requestText = await req.text();
      if (Buffer.byteLength(requestText, "utf8") > 70 * 1024) {
        return Response.json({ error: "The voice request is too large." }, { status: 413, headers: { "Cache-Control": "no-store" } });
      }
      body = JSON.parse(requestText);
    } catch {
      return Response.json({ error: "A valid voice offer is required." }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }

    // The browser may select a supported conversation mode and provide its
    // WebRTC offer. Personal or organisational evidence is always loaded below
    // with the verified user's bearer client and is never accepted from JSON.
    const sdp = typeof body?.sdp === "string" ? body.sdp : "";
    if (!sdp || Buffer.byteLength(sdp, "utf8") > 64 * 1024) {
      return Response.json({ error: "The voice offer is missing or too large." }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }
    const supportedModes = new Set(["auto", "grounding", "sleep", "reflection", "nutrition", "mind", "trauma", "movement", "lifestyle"]);
    if (body?.coachMode && !supportedModes.has(body.coachMode)) {
      return Response.json({ error: "Choose a supported Root Voice mode." }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }
    const coachMode = body?.coachMode || "auto";

    const knowledgeResult = await loadPersonalRootKnowledge({
      client: access.client,
      verifiedUser: access.user,
    });
    if (!knowledgeResult.ok || !knowledgeResult.projections?.coach) {
      return Response.json({ error: "Root could not load your private Personal Root context." }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }
    const personalKnowledge = knowledgeResult.projections.coach;
    const profile = personalKnowledge.profile || null;
    const history = personalKnowledge.promptEvidence?.bodySignals || [];
    const mindEntries = personalKnowledge.promptEvidence?.mindEntries || [];
    const journalEntries = personalKnowledge.promptEvidence?.journalEntries || [];
    const name = profile?.name || "";
    let bodyHandoff = null;
    const bodyObservationId = typeof body?.bodyObservationId === "string" ? body.bodyObservationId.trim() : "";
    if (bodyObservationId) {
      if (!/^[0-9a-f-]{36}$/i.test(bodyObservationId)) {
        return Response.json({ error: "The Body handoff could not be verified." }, { status: 400, headers: { "Cache-Control": "no-store" } });
      }
      const { data, error } = await access.client.from("body_signals").select("*")
        .eq("id", bodyObservationId)
        .eq("user_id", access.user.id)
        .eq("profile_key", personalKnowledge.identity.profileKey)
        .is("organisation_id", null)
        .maybeSingle();
      if (error) return Response.json({ error: "Root could not verify the saved Body handoff." }, { status: 503, headers: { "Cache-Control": "no-store" } });
      if (!data) return Response.json({ error: "The saved Body handoff is unavailable." }, { status: 403, headers: { "Cache-Control": "no-store" } });
      bodyHandoff = data;
    }

    // Thought Work may hand the current unsaved focus into this authenticated
    // conversation. Treat it as the user's stated intent, never as saved
    // clinical evidence or a model instruction.
    const rawMindHandoff = body?.mindHandoff && typeof body.mindHandoff === "object" ? body.mindHandoff : {};
    const mindHandoff = Object.fromEntries(["situation", "automaticThought", "emotion", "intensity", "reframe", "nextStep"]
      .map((key) => [key, typeof rawMindHandoff[key] === "string" ? rawMindHandoff[key].trim().slice(0, 500) : ""])
      .filter(([, value]) => value));

    const rootContext = `
Active mode: ${coachMode || "auto"}

${bodyHandoff
  ? `Current saved Body-to-Coach handoff, loaded from this authenticated user's record (prioritise this over older body history):\n${summariseStructuredBodyObservation(bodyHandoff)}\nDo not re-ask fields already answered unless they conflict or are ambiguous. Treat the user's note as exploration intent, not evidence of cause, and move to the next unanswered discriminating question.`
  : "Current Body-to-Coach handoff: none."}

${Object.keys(mindHandoff).length
  ? `Current user-stated Thought Work handoff (self-reported exploration context, not verified saved evidence):\n${Object.entries(mindHandoff).map(([key, value]) => `${key}: ${value}`).join("\n")}`
  : "Current Thought Work handoff: none."}

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

    // Recheck revocation immediately before reserving durable quota and calling
    // the provider. The RPC also rechecks grant and entitlement atomically.
    if (access.mode === "introducer") {
      await confirmRealtimeGrantActive({ admin: access.admin, userId: access.user.id, grantId: access.grant.id });
      introducerReservation = await reserveRealtimeSessionAllowance({ admin: access.admin, userId: access.user.id, grantId: access.grant.id });
      if (!introducerReservation.allowed) {
        const denialMessages = {
          monthly_fx_rate_unconfigured: "Live Voice Coach is temporarily unavailable while Root updates this month's budget exchange rate. Other available Root features remain usable.",
          grant_inactive: "Your live Voice Coach access has expired or was revoked. Other available Root features remain usable.",
          voice_policy_disabled: "Live Voice Coach is paused for this Preview. Other available Root features remain usable.",
          user_allocation_disabled: "Live Voice Coach is not enabled for your demonstration account. Ask Root Health if you need access.",
          user_daily_limit: "Your live Voice Coach allocation is used for now. You can continue with other available Root features.",
          active_session: "A live Voice Coach session is already open for your account.",
          project_estimated_budget: "Live Voice Coach is paused because the shared monthly demonstration budget is reserved. You can continue with other available Root features.",
          session_duration_policy_invalid: "Live Voice Coach is temporarily unavailable while its session limits are reviewed.",
        };
        return Response.json({ error: denialMessages[introducerReservation.denialReason] || "Live Voice Coach is unavailable under the current demonstration policy." }, { status: 429, headers: { "Cache-Control": "no-store" } });
      }
      if (!Number.isInteger(introducerReservation.maxSessionSeconds)
        || !Number.isInteger(introducerReservation.plannedSessionSeconds)
        || !Number.isInteger(introducerReservation.completionGraceSeconds)
        || !Number.isInteger(introducerReservation.warningBeforeSeconds)
        || introducerReservation.plannedSessionSeconds < 300
        || introducerReservation.completionGraceSeconds < 0
        || introducerReservation.maxSessionSeconds !== introducerReservation.plannedSessionSeconds + (2 * introducerReservation.completionGraceSeconds)
        || introducerReservation.warningBeforeSeconds < 0
        || introducerReservation.warningBeforeSeconds >= introducerReservation.plannedSessionSeconds
        || introducerReservation.maxSessionSeconds > 3600
        || !introducerReservation.reservationId) {
        return Response.json({ error: "Voice session duration controls are unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
      }
      introducerMaxSessionSeconds = introducerReservation.maxSessionSeconds;
      introducerPlannedSessionSeconds = introducerReservation.plannedSessionSeconds;
      introducerCompletionGraceSeconds = introducerReservation.completionGraceSeconds;
      introducerWarningBeforeSeconds = introducerReservation.warningBeforeSeconds;
    }

    form.append("sdp", sdp);
    form.append(
      "session",
      JSON.stringify({
        type: "realtime",
        model: "gpt-realtime",
        instructions: rootVoicePrompt,
        ...(access.mode === "introducer" ? { expires_at: Math.floor(Date.now() / 1000) + introducerMaxSessionSeconds } : {}),
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

    if (!response.ok) {
      if (access.mode === "introducer" && response.status >= 400 && response.status < 500) {
        try {
          await markRealtimeCallCreationFailed({
            admin: access.admin,
            reservationId: introducerReservation.reservationId,
            userId: access.user.id,
          });
        } catch {
          // Keep the reservation held when release cannot be verified.
        }
      }
      return Response.json(
        { error: "Root could not start a voice session. Please try again." },
        { status: 502, headers: { "Cache-Control": "no-store" } }
      );
    }
    if (access.mode === "introducer") {
      const callId = parseRealtimeCallId(response.headers.get("location"));
      if (!callId) {
        // Never hand an untracked SDP session to the browser. The provider's
        // documented Location header is required for server-side hang-up.
        return Response.json({ error: "Root could not establish server-side voice session control." }, { status: 502, headers: { "Cache-Control": "no-store" } });
      }
      let attached;
      try {
        attached = await attachRealtimeCallToReservation({
          admin: access.admin,
          reservationId: introducerReservation.reservationId,
          userId: access.user.id,
          grantId: access.grant.id,
          callId,
        });
      } catch {
        // If durable recording fails after the provider created a call, make
        // an immediate server-side termination attempt and never return SDP.
        try {
          await immediatelyHangupRealtimeCall({ admin: access.admin, reservationId: introducerReservation.reservationId, callId, apiKey });
        } catch {}
        return Response.json({ error: "Root could not safely track the voice session." }, { status: 503, headers: { "Cache-Control": "no-store" } });
      }
      if (attached.terminateNow) {
        const stopped = await hangupRealtimeCall({ callId, apiKey });
        if (stopped.terminated) {
          await markRealtimeCallTerminated({ admin: access.admin, reservationId: introducerReservation.reservationId, callId });
        }
        return Response.json({ error: "Your Voice access has expired or been revoked." }, { status: 403, headers: { "Cache-Control": "no-store" } });
      }
    }
    const answer = await response.text();

    const responseHeaders = {
      "Content-Type": "application/sdp",
      "Cache-Control": "no-store",
    };
    if (access.mode === "introducer") {
      responseHeaders["X-Root-Voice-Planned-Seconds"] = String(introducerPlannedSessionSeconds);
      responseHeaders["X-Root-Voice-Completion-Grace-Seconds"] = String(introducerCompletionGraceSeconds);
      responseHeaders["X-Root-Voice-Warning-Before-Seconds"] = String(introducerWarningBeforeSeconds);
      responseHeaders["X-Root-Voice-Reservation"] = introducerReservation.reservationId;
    }
    return new Response(answer, { status: 200, headers: responseHeaders });
  } catch (error) {
    const response = realtimeSessionAccessResponse(error);
    if (error instanceof RealtimeSessionAccessError) return response;
    return Response.json({ error: "Root could not start a voice session." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
