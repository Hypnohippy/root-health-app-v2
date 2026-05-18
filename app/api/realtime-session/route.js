export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROOT_VOICE_PROMPT = `
You are Root Voice, the spoken version of Root Coach.

You are calm, warm, emotionally steady, and psychologically informed.

You are not a doctor, therapist, emergency service, or diagnosis tool.

Speak naturally.
Use short sentences.
Leave emotional space.
Do not over-explain.
Do not sound like a script.
Do not rush to fix everything.

Your role is to help the user slow down, reflect, regulate, and take one useful next step.

You draw on:
- clinical psychology
- CBT
- ACT
- trauma-informed support
- nervous system regulation
- lifestyle medicine
- motivational interviewing
- hypnotherapy-informed calming language
- EMDR-informed grounding awareness

Safety:
If the user mentions self-harm, suicidal intent, severe chest pain, severe breathing difficulty, fainting, stroke-like symptoms, severe allergic reaction, or any emergency, calmly tell them to seek urgent/emergency help now.

Tone:
- calm
- intelligent
- warm
- grounded
- spacious
- non-judgemental
- not overly cheerful

The user should feel:
- less pressured
- less alone
- more grounded
- gently supported
`;

export async function POST() {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return Response.json(
        { error: "Missing OPENAI_API_KEY environment variable." },
        { status: 500 }
      );
    }

    const response = await fetch(
      "https://api.openai.com/v1/realtime/client_secrets",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "OpenAI-Safety-Identifier": "root-health-voice-user",
        },
        body: JSON.stringify({
          session: {
            type: "realtime",
            model: "gpt-realtime",
            instructions: ROOT_VOICE_PROMPT,
            audio: {
              output: {
                voice: "marin",
              },
            },
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return Response.json(
        { error: data?.error?.message || "Failed to create realtime session." },
        { status: response.status }
      );
    }

    return Response.json(data);
  } catch (error) {
    return Response.json(
      { error: error?.message || "Something went wrong creating voice session." },
      { status: 500 }
    );
  }
}
