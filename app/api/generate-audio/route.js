import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function safeFileName(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

export async function POST(request) {
  try {
    const { title, text } = await request.json();

    if (!title || !text) {
      return Response.json(
        { ok: false, error: "Missing title or text." },
        { status: 400 }
      );
    }

  const fileName =
  `${safeFileName(title)}-${Date.now()}.mp3`;

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
