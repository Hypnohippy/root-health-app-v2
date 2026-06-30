import { createClient } from "@supabase/supabase-js"; 

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

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
    const body = await req.json();

    const { action, content } = body;

    if (!action || !content) {
      return Response.json(
        { ok: false, error: "Missing action or content." },
        { status: 400 }
      );
    }

    if (action === "save_playbook") {
      const category = body.category || "General";
      const title = body.title || "Voice Coach Playbook Entry";

      const profileKey = body.profileKey || "main";

const { data: existingEntry } = await supabase
  .from("playbook_entries")
  .select("id")
  .eq("profile_key", profileKey)
  .eq("category", category)
  .order("created_at", { ascending: false })
  .limit(1)
  .maybeSingle();
  
const { error } = existingEntry?.id
  ? await supabase
      .from("playbook_entries")
      .update({
        content,
        source: "Voice Coach",
      })
      .eq("id", existingEntry.id)
      .eq("profile_key", profileKey)
  : await supabase.from("playbook_entries").insert([
      {
        profile_key: profileKey,
        title,
        category,
        content,
        source: "Voice Coach",
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
        message: "Playbook entry saved.",
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
