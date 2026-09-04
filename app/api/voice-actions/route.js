import { createClient } from "@supabase/supabase-js"; 
import { hasExplicitPlaybookSaveIntent } from "../../../lib/voicePlaybookAction";
import { buildPersonalInvestigationJournalRow } from "../../../lib/personalInvestigationContinuity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authenticatedSupabase(req) {
  const accessToken = req.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");

  if (
    !accessToken ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return null;
  }

  return {
    accessToken,
    client: createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    ),
  };
}

function detectPattern(text = "") {
  const lower = text.toLowerCase();

  if (
    lower.includes("anxious") ||
    lower.includes("anxiety") ||
    lower.includes("panic") ||
    lower.includes("overwhelm")
  ) {
    return {
      emotional_theme: "anxiety",
      recommended_coach_mode: "Mind & mood",
      recommended_prompt:
        "Root has recorded this change and will continue watching the pattern over time.",
    };
  }

  if (
    lower.includes("better") ||
    lower.includes("improved") ||
    lower.includes("positive") ||
    lower.includes("hopeful") ||
    lower.includes("calmer")
  ) {
    return {
      emotional_theme: "positive shift",
      recommended_coach_mode: "Reflection",
      recommended_prompt: "Explore what helped and how to sustain it",
    };
  }

  return {
    emotional_theme: "general reflection",
    recommended_coach_mode: "Lifestyle",
    recommended_prompt: "Guided journaling",
  };
}

export async function POST(req) {
  try {
    const authenticated = authenticatedSupabase(req);

    if (!authenticated) {
      return Response.json(
        { ok: false, error: "You need to be signed in to save this entry." },
        { status: 401 }
      );
    }

    const supabase = authenticated.client;
    const { data: userData, error: userError } =
      await supabase.auth.getUser(authenticated.accessToken);

    if (userError || !userData?.user) {
      return Response.json(
        { ok: false, error: "Root could not verify your account." },
        { status: 401 }
      );
    }

    const body = await req.json();

    const { action, content } = body;

    if (!action || !content) {
      return Response.json(
        { ok: false, error: "Missing action or content." },
        { status: 400 }
      );
    }

    if (action === "save_investigation_event") {
      const profileKey = String(body.profileKey || "").trim();
      const personalResult = await supabase
        .from("profiles")
        .select("profile_key")
        .eq("user_id", userData.user.id)
        .eq("profile_key", profileKey)
        .maybeSingle();

      if (personalResult.error) {
        return Response.json({ ok: false, error: personalResult.error.message }, { status: 500 });
      }
      if (!personalResult.data) {
        return Response.json(
          { ok: false, error: "This Personal investigation does not belong to your Root account." },
          { status: 403 }
        );
      }

      const row = buildPersonalInvestigationJournalRow({
        profileKey,
        event: body.event,
      });
      if (!row) {
        return Response.json({ ok: false, error: "Invalid investigation event." }, { status: 400 });
      }

      const { data: saved, error } = await supabase
        .from("journal_entries")
        .insert([row])
        .select("id, created_at")
        .single();
      if (error || !saved?.id) {
        return Response.json(
          { ok: false, error: error?.message || "Investigation event was not saved." },
          { status: 500 }
        );
      }
      return Response.json({ ok: true, id: saved.id, createdAt: saved.created_at });
    }

    if (action === "save_playbook") {
      if (!hasExplicitPlaybookSaveIntent(body.userIntent)) {
        return Response.json(
          { ok: false, error: "A clear request to save to Playbook is required." },
          { status: 400 }
        );
      }

      const category = body.category || "General";
      const title = body.title || "Voice Coach Playbook Entry";

      const profileKey = String(body.profileKey || "").trim();

      if (!profileKey) {
        return Response.json(
          { ok: false, error: "Root could not find your profile." },
          { status: 400 }
        );
      }

      const personalResult = await supabase
        .from("profiles")
        .select("profile_key")
        .eq("user_id", userData.user.id)
        .eq("profile_key", profileKey)
        .maybeSingle();

      if (personalResult.error) {
        return Response.json(
          { ok: false, error: personalResult.error.message },
          { status: 500 }
        );
      }

      let ownsProfile = Boolean(personalResult.data);

      if (!ownsProfile) {
        const organisationResult = await supabase
          .from("organisation_members")
          .select("profile_key")
          .eq("user_id", userData.user.id)
          .eq("profile_key", profileKey)
          .limit(1)
          .maybeSingle();

        if (organisationResult.error) {
          return Response.json(
            { ok: false, error: organisationResult.error.message },
            { status: 500 }
          );
        }

        ownsProfile = Boolean(organisationResult.data);
      }

      if (!ownsProfile) {
        return Response.json(
          { ok: false, error: "This Playbook does not belong to your Root account." },
          { status: 403 }
        );
      }

const { data: existingEntry, error: lookupError } = await supabase
  .from("playbook_entries")
  .select("id")
  .eq("profile_key", profileKey)
  .eq("title", title)
  .maybeSingle();

if (lookupError) {
  return Response.json(
    { ok: false, error: lookupError.message },
    { status: 500 }
  );
}
  
const { data: savedEntry, error } = existingEntry?.id
  ? await supabase
      .from("playbook_entries")
      .update({
        category,
        content,
        source: "Voice Coach",
      })
      .eq("id", existingEntry.id)
      .eq("profile_key", profileKey)
      .select("id")
      .single()
  : await supabase.from("playbook_entries").insert([
      {
        profile_key: profileKey,
        title,
        category,
        content,
        source: "Voice Coach",
      },
    ])
      .select("id")
      .single();

      if (error || !savedEntry?.id) {
        return Response.json(
          { ok: false, error: error?.message || "Playbook entry was not saved." },
          { status: 500 }
        );
      }

      return Response.json({
        ok: true,
        message: "Playbook entry saved.",
        id: savedEntry.id,
      });
    }

    if (action === "save_journal") {
      const pattern = detectPattern(content);

      const { error } = await supabase.from("journal_entries").insert([
        {
          profile_key: body.profileKey || "main",
          prompt_type: "voice_coach",
          title: "Voice Coach reflection",
          content,
          emotional_theme: pattern.emotional_theme,
          recommended_coach_mode: pattern.recommended_coach_mode,
          recommended_prompt: pattern.recommended_prompt,
        },
      ]);

      if (error) {
        return Response.json(
          { ok: false, error: error.message },
          { status: 500 }
        );
      }

      return Response.json({
        ok: true,
        message: "Journal entry saved.",
      });
    }

    return Response.json(
      { ok: false, error: "Unsupported action." },
      { status: 400 }
    );
  } catch (error) {
    return Response.json(
      { ok: false, error: error?.message || "Voice action failed." },
      { status: 500 }
    );
  }
}
