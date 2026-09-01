import { NextResponse } from "next/server";
import { createRootAdminClient, requireRootAdmin } from "../../../../lib/rootAdminAuth";

const FIELDS = [
  "slug", "title", "category", "target", "description", "script",
  "audio_url", "video_url", "status", "version",
];

function safeRow(input = {}) {
  return Object.fromEntries(FIELDS.filter((field) => field in input).map((field) => [field, input[field]]));
}

async function authorised(request) {
  const admin = await requireRootAdmin(request);
  if (!admin.authorised) {
    return { response: NextResponse.json({ ok: false, error: admin.error }, { status: admin.status }) };
  }
  return { supabase: createRootAdminClient() };
}

export async function GET(request) {
  try {
    const auth = await authorised(request);
    if (auth.response) return auth.response;
    const { data, error } = await auth.supabase
      .from("root_interventions")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ ok: true, interventions: data || [] });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await authorised(request);
    if (auth.response) return auth.response;
    const body = await request.json();

    if (body.action === "delete" && body.id) {
      const { error } = await auth.supabase.from("root_interventions").delete().eq("id", body.id);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (body.action !== "save") {
      return NextResponse.json({ ok: false, error: "Unsupported intervention action." }, { status: 400 });
    }

    const row = safeRow(body.intervention);
    const query = body.id
      ? auth.supabase.from("root_interventions").update(row).eq("id", body.id)
      : auth.supabase.from("root_interventions").insert(row);
    const { data, error } = await query.select("*").single();
    if (error) throw error;
    return NextResponse.json({ ok: true, intervention: data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
