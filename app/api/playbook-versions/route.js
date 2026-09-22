import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authenticatedSupabase(req) {
  const accessToken = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!accessToken || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null;

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

async function resolveUser(req) {
  const authenticated = authenticatedSupabase(req);
  if (!authenticated) {
    return { response: Response.json({ ok: false, error: "You need to be signed in." }, { status: 401 }) };
  }

  const { data: userData, error } = await authenticated.client.auth.getUser(authenticated.accessToken);
  if (error || !userData?.user) {
    return { response: Response.json({ ok: false, error: "Root could not verify your account." }, { status: 401 }) };
  }

  return { client: authenticated.client, userId: userData.user.id };
}

export async function GET(req) {
  try {
    const auth = await resolveUser(req);
    if (auth.response) return auth.response;

    const url = new URL(req.url);
    const entryId = String(url.searchParams.get("entryId") || "").trim();
    const profileKey = String(url.searchParams.get("profileKey") || "").trim();

    if (!entryId || !profileKey) {
      return Response.json({ ok: false, error: "Entry and profile are required." }, { status: 400 });
    }

    const { data: entry, error: entryError } = await auth.client
      .from("playbook_entries")
      .select("id")
      .eq("id", entryId)
      .eq("user_id", auth.userId)
      .eq("profile_key", profileKey)
      .maybeSingle();

    if (entryError) return Response.json({ ok: false, error: entryError.message }, { status: 500 });
    if (!entry?.id) return Response.json({ ok: false, error: "Playbook entry not found." }, { status: 404 });

    const { data, error } = await auth.client
      .from("playbook_entry_versions")
      .select("id, title, category, version_created_at, original_created_at, original_updated_at")
      .eq("playbook_entry_id", entryId)
      .eq("user_id", auth.userId)
      .eq("profile_key", profileKey)
      .order("version_created_at", { ascending: false });

    if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

    return Response.json({ ok: true, versions: Array.isArray(data) ? data : [] });
  } catch (error) {
    return Response.json({ ok: false, error: error?.message || "Could not load Playbook history." }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const auth = await resolveUser(req);
    if (auth.response) return auth.response;

    const body = await req.json();
    const entryId = String(body.entryId || "").trim();
    const versionId = String(body.versionId || "").trim();
    const profileKey = String(body.profileKey || "").trim();

    if (!entryId || !versionId || !profileKey) {
      return Response.json({ ok: false, error: "Entry, version and profile are required." }, { status: 400 });
    }

    const { data: currentEntry, error: currentError } = await auth.client
      .from("playbook_entries")
      .select("id, title, category, content, source, created_at, updated_at")
      .eq("id", entryId)
      .eq("user_id", auth.userId)
      .eq("profile_key", profileKey)
      .maybeSingle();

    if (currentError) return Response.json({ ok: false, error: currentError.message }, { status: 500 });
    if (!currentEntry?.id) return Response.json({ ok: false, error: "Playbook entry not found." }, { status: 404 });

    const { data: version, error: versionError } = await auth.client
      .from("playbook_entry_versions")
      .select("*")
      .eq("id", versionId)
      .eq("playbook_entry_id", entryId)
      .eq("user_id", auth.userId)
      .eq("profile_key", profileKey)
      .maybeSingle();

    if (versionError) return Response.json({ ok: false, error: versionError.message }, { status: 500 });
    if (!version?.id) return Response.json({ ok: false, error: "Previous version not found." }, { status: 404 });

    const { error: snapshotError } = await auth.client
      .from("playbook_entry_versions")
      .insert([
        {
          playbook_entry_id: currentEntry.id,
          user_id: auth.userId,
          profile_key: profileKey,
          title: currentEntry.title,
          category: currentEntry.category,
          content: currentEntry.content,
          source: currentEntry.source,
          original_created_at: currentEntry.created_at,
          original_updated_at: currentEntry.updated_at,
        },
      ]);

    if (snapshotError) {
      return Response.json({ ok: false, error: snapshotError.message || "Root could not preserve the current version before restore." }, { status: 500 });
    }

    const { data: restored, error: restoreError } = await auth.client
      .from("playbook_entries")
      .update({
        title: version.title,
        category: version.category,
        content: version.content,
        source: version.source || "Restored",
        updated_at: new Date().toISOString(),
      })
      .eq("id", entryId)
      .eq("user_id", auth.userId)
      .eq("profile_key", profileKey)
      .select("*")
      .single();

    if (restoreError || !restored?.id) {
      return Response.json({ ok: false, error: restoreError?.message || "Previous version could not be restored." }, { status: 500 });
    }

    return Response.json({ ok: true, entry: restored });
  } catch (error) {
    return Response.json({ ok: false, error: error?.message || "Could not restore Playbook version." }, { status: 500 });
  }
}
