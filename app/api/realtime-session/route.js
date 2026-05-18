export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROOT_VOICE_PROMPT = `
You are Root Voice, the spoken version of Root Coach.

You are calm, warm, emotionally steady, and psychologically informed.
Use short spoken sentences. Do not over-explain.
Help the user slow down, reflect, regulate, and take one useful next step.

You are not a doctor, therapist, emergency service, or diagnosis tool.
For emergencies or self-harm risk, calmly direct the user to urgent/emergency help now.
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
            voice: "marin",
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
