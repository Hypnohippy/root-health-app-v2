export const runtime = "nodejs";

export async function POST(req) {
  try {
    const incomingForm = await req.formData();

    const audio = incomingForm.get("audio");

    if (!audio) {
      return Response.json(
        {
          ok: false,
          error: "No audio recording was received.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      typeof audio.arrayBuffer !== "function"
    ) {
      return Response.json(
        {
          ok: false,
          error: "The uploaded recording was invalid.",
        },
        {
          status: 400,
        }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return Response.json(
        {
          ok: false,
          error: "OpenAI key missing.",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * ROOT DICTATION
     *
     * This route is deliberately separate from
     * Voice Coach and HR Coach.
     *
     * It only converts recorded speech into text.
     */

    const openAIForm = new FormData();

    openAIForm.append(
      "file",
      audio,
      audio.name || "root-dictation.webm"
    );

    openAIForm.append(
      "model",
      "gpt-4o-mini-transcribe"
    );

    openAIForm.append(
      "language",
      "en"
    );

    openAIForm.append(
      "prompt",
      [
        "Transcribe natural British English accurately.",
        "Preserve the speaker's meaning and wording.",
        "The recording may contain wellbeing reflections,",
        "journal entries, food names, prices, shopping lists,",
        "medical terms, workplace language,",
        "and instructions for editing a Root Health Playbook.",
        "Do not summarise or rewrite the speaker.",
      ].join(" ")
    );

    const response = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization:
            "Bearer " + apiKey,
        },
        body: openAIForm,
      }
    );

    if (!response.ok) {
      const errorText =
        await response.text();

      console.error(
        "ROOT TRANSCRIPTION ERROR:",
        errorText
      );

      return Response.json(
        {
          ok: false,
          error:
            "Root could not transcribe that recording.",
        },
        {
          status: 500,
        }
      );
    }

    const data = await response.json();

    const text =
      typeof data?.text === "string"
        ? data.text.trim()
        : "";

    if (!text) {
      return Response.json(
        {
          ok: false,
          error:
            "Root could not hear enough speech to create a transcript.",
        },
        {
          status: 422,
        }
      );
    }

    return Response.json({
      ok: true,
      text,
    });
  } catch (error) {
    console.error(
      "ROOT DICTATION ROUTE ERROR:",
      error
    );

    return Response.json(
      {
        ok: false,
        error:
          error?.message ||
          "Root transcription failed.",
      },
      {
        status: 500,
      }
    );
  }
}
