import OpenAI from "openai";
import fs from "fs/promises";
import path from "path";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

    const fileName = `${safeFileName(title)}.mp3`;
    const audioDir = path.join(process.cwd(), "public", "audio");
    const filePath = path.join(audioDir, fileName);

    await fs.mkdir(audioDir, { recursive: true });

    const speech = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: text,
      format: "mp3",
    });

    const buffer = Buffer.from(await speech.arrayBuffer());

    await fs.writeFile(filePath, buffer);

    return Response.json({
      ok: true,
      file: `/audio/${fileName}`,
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
