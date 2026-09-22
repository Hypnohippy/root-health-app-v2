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

const conflictResolution = String(body.conflictResolution || "").trim().toLowerCase();

const { data: existingRows, error: lookupError } = await supabase
  .from("playbook_entries")
  .select("id, title, category, content, source, created_at, updated_at")
  .eq("user_id", userData.user.id)
  .eq("profile_key", profileKey)
  .eq("title", title)
  .order("updated_at", { ascending: false, nullsFirst: false })
  .order("created_at", { ascending: false })
  .limit(1);

if (lookupError) {
  return Response.json(
    { ok: false, error: lookupError.message },
    { status: 500 }
  );
}

const existingEntry = Array.isArray(existingRows) ? existingRows[0] || null : null;

if (existingEntry?.id && !["new", "overwrite"].includes(conflictResolution)) {
  return Response.json(
    {
      ok: false,
      conflict: true,
      error: "A Playbook entry with this title already exists.",
      existingEntry: {
        id: existingEntry.id,
        title: existingEntry.title,
        category: existingEntry.category,
        createdAt: existingEntry.created_at,
        updatedAt: existingEntry.updated_at,
      },
    },
    { status: 409 }
  );
}

let savedEntry = null;
let error = null;

if (existingEntry?.id && conflictResolution === "overwrite") {
  const { error: versionError } = await supabase
    .from("playbook_entry_versions")
    .insert([
      {
        playbook_entry_id: existingEntry.id,
        user_id: userData.user.id,
        profile_key: profileKey,
        title: existingEntry.title,
        category: existingEntry.category,
        content: existingEntry.content,
        source: existingEntry.source,
        original_created_at: existingEntry.created_at,
        original_updated_at: existingEntry.updated_at,
      },
    ]);

  if (versionError) {
    return Response.json(
      { ok: false, error: versionError.message || "Root could not preserve the previous Playbook version." },
      { status: 500 }
    );
  }

  const updateResult = await supabase
    .from("playbook_entries")
    .update({
      user_id: userData.user.id,
      category,
      content,
      source: "Voice Coach",
      updated_at: new Date().toISOString(),
    })
    .eq("id", existingEntry.id)
    .eq("profile_key", profileKey)
    .select("id, updated_at")
    .single();

  savedEntry = updateResult.data;
  error = updateResult.error;
} else {
  const insertResult = await supabase
    .from("playbook_entries")
    .insert([
      {
        user_id: userData.user.id,
        profile_key: profileKey,
        title,
        category,
        content,
        source: "Voice Coach",
      },
    ])
    .select("id, created_at, updated_at")
    .single();

  savedEntry = insertResult.data;
  error = insertResult.error;
}

if (error || !savedEntry?.id) {
  return Response.json(
    { ok: false, error: error?.message || "Playbook entry was not saved." },
    { status: 500 }
  );
}

return Response.json({
  ok: true,
  message:
    existingEntry?.id && conflictResolution === "overwrite"
      ? "Playbook entry updated. Previous version preserved."
      : "Playbook entry saved.",
  id: savedEntry.id,
  mode: existingEntry?.id && conflictResolution === "overwrite" ? "overwrite" : "new",
  updatedAt: savedEntry.updated_at || savedEntry.created_at || null,
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
