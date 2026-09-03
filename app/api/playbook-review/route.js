import { createClient } from "@supabase/supabase-js";
import { buildRootHealthEducationPolicy } from "../../../lib/rootHealthEducationPolicy.js";

export const runtime = "nodejs";

function authenticatedSupabase(req) {
  const accessToken = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!accessToken || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null;
  return {
    accessToken,
    client: createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    }),
  };
}

export async function POST(req) {
  try {
    const body = await req.json();

    const { title, category, currentContent, instruction, profileKey } = body;

    if (!currentContent || !instruction) {
      return Response.json(
        { ok: false, error: "Missing playbook content or update instruction." },
        { status: 400 }
      );
    }

    const authenticated = authenticatedSupabase(req);
    if (!authenticated || !profileKey) {
      return Response.json({ ok: false, error: "You need to be signed in to review this entry." }, { status: 401 });
    }
    const { data: userData, error: userError } = await authenticated.client.auth.getUser(authenticated.accessToken);
    if (userError || !userData?.user) {
      return Response.json({ ok: false, error: "Root could not verify your account." }, { status: 401 });
    }

    const personalResult = await authenticated.client
      .from("profiles")
      .select("profile_key, conditions, medications, allergies, diet")
      .eq("user_id", userData.user.id)
      .eq("profile_key", profileKey)
      .maybeSingle();
    if (personalResult.error) {
      return Response.json({ ok: false, error: personalResult.error.message }, { status: 500 });
    }

    let ownsProfile = Boolean(personalResult.data);
    if (!ownsProfile) {
      const organisationResult = await authenticated.client
        .from("organisation_members")
        .select("profile_key")
        .eq("user_id", userData.user.id)
        .eq("profile_key", profileKey)
        .limit(1)
        .maybeSingle();
      if (organisationResult.error) {
        return Response.json({ ok: false, error: organisationResult.error.message }, { status: 500 });
      }
      ownsProfile = Boolean(organisationResult.data);
    }
    if (!ownsProfile) {
      return Response.json({ ok: false, error: "This Playbook does not belong to your Root account." }, { status: 403 });
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return Response.json(
        { ok: false, error: "OpenAI key missing." },
        { status: 500 }
      );
    }

    const prompt = `
You are updating a Root Health Playbook entry.

This is NOT a conversation transcript.
This is a clean living document.

Existing Playbook title:
${title || "Untitled"}

Category:
${category || "General"}

Current Playbook content:
${currentContent}

User requested update:
${instruction}

Rules:
- Return the FULL updated Playbook document.
- Do not return only the change.
- Do not include conversational phrases.
- Do not say "of course", "here you go", or "I've saved that".
- Do not ask the user questions.
- If the document has Day 1 and Day 2, keep Day 1 and Day 2.
- Apply the user's requested change directly and literally.
- If the user asks to remove a word, brand, ingredient, item, section, price, reference, or phrase, remove every relevant occurrence unless they explicitly say otherwise.
- Do not silently reintroduce anything the user asked to remove.
- If the user asks to replace something, replace it consistently throughout the document.
- Preserve all unrelated content unless the requested change genuinely requires modifying it.
- Do not make additional improvements, substitutions, rewrites, or assumptions beyond the user's instruction unless necessary to keep the document coherent.
- When adding or revising supermarket or ingredient prices, treat them as estimates unless a live price source is provided. Label them as estimated or indicative, note that prices vary by store, location, offer and date, and never present them as live, current or verified prices without a real live lookup.
- Keep the result clean, practical, and ready to save.
`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + apiKey,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content: `You rewrite Playbook documents cleanly. Return only the finished updated document.\n${buildRootHealthEducationPolicy({ profile: personalResult.data || {}, generatedContent: true })}`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return Response.json(
        { ok: false, error: errorText },
        { status: 500 }
      );
    }

    const data = await response.json();

    const updatedContent =
      data?.choices?.[0]?.message?.content?.trim() || "";

    return Response.json({
      ok: true,
      updatedContent,
    });
  } catch (error) {
    return Response.json(
      { ok: false, error: error?.message || "Playbook review failed." },
      { status: 500 }
    );
  }
}
