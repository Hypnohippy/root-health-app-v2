import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authenticatedSupabase(req) {
  const accessToken = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!accessToken || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return null;
  }

  return {
    accessToken,
    client: createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      }
    ),
  };
}

function clean(value, max = 5000) {
  return String(value || "").trim().slice(0, max);
}

export async function POST(req) {
  try {
    const authenticated = authenticatedSupabase(req);
    if (!authenticated) {
      return Response.json({ ok: false, error: "You need to be signed in." }, { status: 401 });
    }

    const { data: userData, error: userError } = await authenticated.client.auth.getUser(authenticated.accessToken);
    if (userError || !userData?.user) {
      return Response.json({ ok: false, error: "Root could not verify your account." }, { status: 401 });
    }

    const body = await req.json();
    const profileKey = clean(body.profileKey, 200);
    if (!profileKey) {
      return Response.json({ ok: false, error: "Root could not find your profile." }, { status: 400 });
    }

    const { data: profileOwner, error: profileError } = await authenticated.client
      .from("profiles")
      .select("profile_key")
      .eq("user_id", userData.user.id)
      .eq("profile_key", profileKey)
      .maybeSingle();

    if (profileError) {
      return Response.json({ ok: false, error: profileError.message }, { status: 500 });
    }
    if (!profileOwner) {
      return Response.json({ ok: false, error: "This Personal Playbook does not belong to your Root account." }, { status: 403 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return Response.json({ ok: false, error: "Root document generation is not configured." }, { status: 500 });
    }

    const title = clean(body.title, 160) || "Voice Coach Playbook Entry";
    const category = clean(body.category, 80) || "General";
    const userIntent = clean(body.userIntent, 4000);
    const offer = clean(body.offer, 4000);
    const sourceContext = clean(body.sourceContext, 6000);
    const profile = body.profile || {};

    const safetyProfile = [
      `Goal: ${clean(profile.goal, 500) || "unknown"}`,
      `Conditions: ${clean(profile.conditions, 1000) || "unknown"}`,
      `Medications: ${clean(profile.medications, 1000) || "unknown"}`,
      `Allergies/intolerances: ${clean(profile.allergies, 1000) || "unknown"}`,
      `Diet style: ${clean(profile.diet, 500) || "unknown"}`,
    ].join("\n");

    const system = `
You create finished Root Personal Playbook documents.
Return ONLY the useful document, starting with "Title:".
Do not include conversational preambles, save confirmations, or questions.

The document must faithfully satisfy the user's request and the offer/context provided.
For meal plans:
- include the requested number of days
- include meals, ingredients and concise written recipe methods when recipes were requested
- include a shopping list when useful
- include budget or supermarket comparisons only as estimated/indicative unless a live verified price source is supplied
- say prices vary by store, location, date and offers
- respect recorded allergies/intolerances and prescribed-diet constraints
- if a medical condition affects food or meal timing, do not prescribe changes to clinical management
- never advise insulin dosing
- do not claim diagnosis, treatment or cure

This content is for reading/saving in Playbook, not for spoken delivery, so it may be structured and detailed.
`.trim();

    const user = `
Requested title: ${title}
Category: ${category}

Explicit user intent:
${userIntent || "Create the agreed Playbook resource."}

Voice Coach offer:
${offer || "None recorded."}

Relevant preceding context:
${sourceContext || "None recorded."}

Saved safety/profile context:
${safetyProfile}
`.trim();

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.45,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      return Response.json({ ok: false, error: "Root could not create the Playbook document: " + detail }, { status: 502 });
    }

    const data = await response.json();
    const content = clean(data?.choices?.[0]?.message?.content, 30000);

    if (!content || !/^Title\s*:/im.test(content)) {
      return Response.json({ ok: false, error: "Root did not produce a complete Playbook document." }, { status: 502 });
    }

    return Response.json({ ok: true, content });
  } catch (error) {
    return Response.json({ ok: false, error: error?.message || "Root could not create the Playbook document." }, { status: 500 });
  }
}
