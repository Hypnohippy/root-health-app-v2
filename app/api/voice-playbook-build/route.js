import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clean(value, max = 12000) {
  return String(value || "").trim().slice(0, max);
}

function summarisePersonalKnowledge(knowledge) {
  if (!knowledge || typeof knowledge !== "object") return "No shared Root knowledge supplied.";

  const coach = knowledge?.projections?.coach || {};
  const assessment = knowledge?.assessments || {};
  const trackers = coach?.trackers || knowledge?.trackers || {};
  const memory = knowledge?.memory || knowledge?.relationalMemory || {};

  return [
    `Latest assessment: ${clean(JSON.stringify(assessment?.latest?.scores || {}), 1200) || "none"}`,
    `Direction: ${clean(assessment?.movement?.direction, 120) || "unknown"}`,
    `Coach context: ${clean(JSON.stringify(coach), 3500) || "none"}`,
    `Tracker context: ${clean(JSON.stringify(trackers), 2200) || "none"}`,
    `Memory context: ${clean(JSON.stringify(memory), 2200) || "none"}`,
  ].join("\n");
}

export async function POST(req) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ ok: false, error: "Root document generation is not configured." }, { status: 500 });
    }

    const body = await req.json();
    const title = clean(body?.title, 180) || "Voice Coach Playbook Entry";
    const category = clean(body?.category, 100) || "General";
    const userIntent = clean(body?.userIntent, 5000);
    const profile = body?.profile || {};
    const personalKnowledge = body?.personalKnowledge || null;
    const recentVoiceContext = clean(body?.recentVoiceContext, 5000);

    if (!userIntent) {
      return NextResponse.json({ ok: false, error: "No Playbook request was supplied." }, { status: 400 });
    }

    const system = `
You create finished written Root Personal Playbook resources.

Return only the completed resource, beginning with "Title:".
Do not write a conversational preamble.
Do not claim the resource has been saved.
Do not address the user as if you are speaking aloud.

Preserve the user's natural request rather than requiring template wording.
Use supplied Root context only to personalise where it is relevant and supported.
Do not invent personal facts.

For meal plans, recipes, shopping lists and food budgets:
- include the requested number of days and requested dietary pattern;
- include concise written recipes when recipes were requested;
- include ingredients and a consolidated shopping list when useful;
- supermarket or budget figures must be labelled estimated/indicative unless a verified live price source was supplied;
- state briefly that store, location, offer and date can change prices;
- respect supplied allergies/intolerances, diet and relevant medical constraints;
- do not prescribe medication changes or insulin doses;
- do not diagnose or claim treatment/cure.

The detailed resource is intended for reading in Root Playbook. It does not need to be suitable for spoken delivery.
`.trim();

    const user = `
Requested title: ${title}
Category: ${category}

User's natural request:
${userIntent}

Recent Voice context:
${recentVoiceContext || "None supplied."}

Profile context:
Goal: ${clean(profile?.goal, 500) || "unknown"}
Diet: ${clean(profile?.diet, 500) || "unknown"}
Conditions: ${clean(profile?.conditions, 1200) || "unknown"}
Medications: ${clean(profile?.medications, 1200) || "unknown"}
Allergies/intolerances: ${clean(profile?.allergies, 1200) || "unknown"}

Shared Root knowledge:
${summarisePersonalKnowledge(personalKnowledge)}
`.trim();

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.35,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      return NextResponse.json(
        { ok: false, error: `Root could not build the Playbook resource: ${detail}` },
        { status: 502 }
      );
    }

    const json = await response.json();
    const content = clean(json?.choices?.[0]?.message?.content, 30000);

    if (!content || !/^Title\s*:/im.test(content)) {
      return NextResponse.json(
        { ok: false, error: "Root did not return a complete written Playbook resource." },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, content });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Root could not build the Playbook resource." },
      { status: 500 }
    );
  }
}
