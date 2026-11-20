import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { requireRootAdmin } from "../../../lib/rootAdminAuth";

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

function getSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

function safeFileName(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

export async function POST(request) {
  try {
    const admin = await requireRootAdmin(request);
    if (!admin.authorised) {
      return Response.json({ ok: false, error: admin.error }, { status: admin.status });
    }

    const { title, text } = await request.json();

    if (!title || !text) {
      return Response.json(
        { ok: false, error: "Missing title or text." },
        { status: 400 }
      );
    }

    // This optional Root-admin tool must not make builds depend on a provider
    // credential. Missing runtime configuration is reported without exposing it.
    const openai = getOpenAIClient();
    const supabaseAdmin = getSupabaseAdminClient();
    if (!openai || !supabaseAdmin) {
      return Response.json(
        { ok: false, error: "Audio generation is not configured." },
        { status: 503 }
      );
    }

    const fileName = `${safeFileName(title)}-${Date.now()}.mp3`;

    const speech = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: text,
      format: "mp3",
    });

    const buffer = Buffer.from(await speech.arrayBuffer());

    const { error } = await supabaseAdmin.storage
      .from("root-audio")
      .upload(fileName, buffer, {
        contentType: "audio/mpeg",
        upsert: true,
      });

    if (error) {
      throw error;
    }

    const { data } = supabaseAdmin.storage
      .from("root-audio")
      .getPublicUrl(fileName);

    return Response.json({
      ok: true,
      file: data.publicUrl,
      path: fileName,
    });
  } catch (error) {
    console.error("GENERATE AUDIO ERROR:", error);

    return Response.json(
      {
        ok: false,
        error: error.message || "Audio generation failed.",
      },
      { status: 500 }
    );
  }
}
