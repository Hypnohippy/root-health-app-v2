export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROOT_VOICE_PROMPT = `
You are Root Voice, the spoken version of Root Coach.

Always speak in English only.
Use British English wording where possible.
Speak calmly, slowly, and naturally.
Use a grounded, warm, emotionally steady tone.

Keep spoken replies short:
- usually 1 to 3 sentences
- no long lectures
- no long lists
- no over-explaining

You help the user slow down, reflect, regulate, and take one useful next step.

Do not diagnose.
Do not claim to treat or cure.
You are not a doctor, therapist, emergency service, or diagnosis tool.

If the user mentions self-harm, suicidal intent, severe chest pain, severe breathing difficulty, fainting, stroke-like symptoms, severe allergic reaction, or an emergency, calmly tell them to seek urgent/emergency help now.

Avoid sounding theatrical, overly cheerful, overly polished, or performative.
Sound like a calm, emotionally regulated human being.
`;
export async function POST(req) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    const sdp = await req.text();

    if (!apiKey) {
      return new Response("Missing OPENAI_API_KEY", { status: 500 });
    }

    if (!sdp) {
      return new Response("Missing SDP offer", { status: 400 });
    }

    const form = new FormData();

    form.append("sdp", sdp);
    form.append(
      "session",
      JSON.stringify({
        type: "realtime",
        model: "gpt-realtime",
        instructions: ROOT_VOICE_PROMPT,
        audio: {
          output: {
        voice: "sage",
          },
        },
      })
    );

    const response = await fetch("https://api.openai.com/v1/realtime/calls", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "OpenAI-Safety-Identifier": "root-health-voice-user",
      },
      body: form,
    });

    const answer = await response.text();

    return new Response(answer, {
      status: response.status,
      headers: {
        "Content-Type": "application/sdp",
      },
    });
  } catch (error) {
    return new Response(error?.message || "Realtime session failed", {
      status: 500,
    });
  }
}
