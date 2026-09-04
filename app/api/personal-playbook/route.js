import { createClient } from "@supabase/supabase-js";
import { buildOwnedPlaybookInsert, buildOwnedPlaybookUpdate } from "../../../lib/personalPlaybookOwnership.js";
import { validateTrackerAnswers, validateTrackerDefinition } from "../../../lib/playbookTrackerDefinition.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

async function resolveOwnedPersonalProfile(req, body) {
  const authenticated = authenticatedSupabase(req);
  if (!authenticated) return { response: Response.json({ ok: false, error: "You need to be signed in." }, { status: 401 }) };
  const { data: userData, error: userError } = await authenticated.client.auth.getUser(authenticated.accessToken);
  if (userError || !userData?.user) return { response: Response.json({ ok: false, error: "Root could not verify your account." }, { status: 401 }) };
  const profileKey = String(body?.profileKey || "").trim();
  const { data: profile, error } = await authenticated.client
    .from("profiles")
    .select("profile_key")
    .eq("user_id", userData.user.id)
    .eq("profile_key", profileKey)
    .maybeSingle();
  if (error) return { response: Response.json({ ok: false, error: error.message }, { status: 500 }) };
  if (!profile) return { response: Response.json({ ok: false, error: "This Personal Playbook does not belong to your Root account." }, { status: 403 }) };
  return { client: authenticated.client, userId: userData.user.id, profileKey: profile.profile_key };
}

export async function POST(req) {
  try {
    const body = await req.json();
    const ownership = await resolveOwnedPersonalProfile(req, body);
    if (ownership.response) return ownership.response;
    if (body.action === "submit_tracker") {
      const trackerId = String(body.trackerId || "").trim();
      const { data: tracker, error: trackerError } = await ownership.client.from("playbook_entries").select("id, tracker_definition").eq("id", trackerId).eq("user_id", ownership.userId).eq("profile_key", ownership.profileKey).eq("item_type", "tracker").maybeSingle();
      if (trackerError) return Response.json({ ok: false, error: trackerError.message }, { status: 500 });
      if (!tracker) return Response.json({ ok: false, error: "Root could not find an owned tracker." }, { status: 404 });
      const checked = validateTrackerAnswers(tracker.tracker_definition, body.answers);
      if (!checked.ok) return Response.json({ ok: false, error: checked.error }, { status: 400 });
      const { data, error } = await ownership.client.from("playbook_tracker_entries").insert([{ tracker_id: tracker.id, user_id: ownership.userId, profile_key: ownership.profileKey, answers: checked.answers }]).select("id, created_at").single();
      if (error || !data?.id) return Response.json({ ok: false, error: error?.message || "Tracker entry was not saved." }, { status: 500 });
      return Response.json({ ok: true, id: data.id, createdAt: data.created_at });
    }
    const itemType = body.itemType === "tracker" ? "tracker" : "static";
    const trackerCheck = itemType === "tracker" ? validateTrackerDefinition(body.trackerDefinition) : { ok: true, definition: null };
    if (!trackerCheck.ok) return Response.json({ ok: false, error: trackerCheck.error }, { status: 400 });
    const row = buildOwnedPlaybookInsert({
      authenticatedUserId: ownership.userId,
      profileKey: ownership.profileKey,
      title: body.title,
      category: body.category,
      content: body.content,
      source: "Manual",
      itemType,
      trackerDefinition: trackerCheck.definition,
    });
    if (!row.title || (itemType === "static" && !row.content)) return Response.json({ ok: false, error: "Title and content are required." }, { status: 400 });
    const { data, error } = await ownership.client.from("playbook_entries").insert([row]).select("id").single();
    if (error || !data?.id) return Response.json({ ok: false, error: error?.message || "Playbook entry was not saved." }, { status: 500 });
    return Response.json({ ok: true, id: data.id });
  } catch (error) {
    return Response.json({ ok: false, error: error?.message || "Playbook entry was not saved." }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const body = await req.json();
    const ownership = await resolveOwnedPersonalProfile(req, body);
    if (ownership.response) return ownership.response;
    const entryId = String(body.entryId || "").trim();
    if (!entryId || typeof body.content !== "string") return Response.json({ ok: false, error: "Entry and content are required." }, { status: 400 });
    const update = buildOwnedPlaybookUpdate({ authenticatedUserId: ownership.userId, content: body.content });
    const { data, error } = await ownership.client
      .from("playbook_entries")
      .update(update)
      .eq("id", entryId)
      .eq("user_id", ownership.userId)
      .eq("profile_key", ownership.profileKey)
      .select("id")
      .maybeSingle();
    if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
    if (!data?.id) return Response.json({ ok: false, error: "Root could not find an owned Playbook entry to update." }, { status: 404 });
    return Response.json({ ok: true, id: data.id });
  } catch (error) {
    return Response.json({ ok: false, error: error?.message || "Playbook entry was not updated." }, { status: 500 });
  }
}
