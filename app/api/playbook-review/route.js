export const runtime = "nodejs";

export async function POST(req) {
  try {
    const body = await req.json();

    const { title, category, currentContent, instruction } = body;

    if (!currentContent || !instruction) {
      return Response.json(
        { ok: false, error: "Missing playbook content or update instruction." },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return Response.json(
        { ok: false, error: "OpenAI key missing." },
        { status: 500 }
      );
    }

    const prompt = `
You are updating a Root Health Playbook entry.

This is NOT a conversation transcript.
This is a clean living document.

Existing Playbook title:
${title || "Untitled"}

Category:
${category || "General"}

Current Playbook content:
${currentContent}

User requested update:
${instruction}

Rules:
- Return the FULL updated Playbook document.
- Do not return only the change.
- Do not include conversational phrases.
- Do not say "of course", "here you go", or "I've saved that".
- Do not ask the user questions.
- If the document has Day 1 and Day 2, keep Day 1 and Day 2.
- Apply the user's requested change directly and literally.
- If the user asks to remove a word, brand, ingredient, item, section, price, reference, or phrase, remove every relevant occurrence unless they explicitly say otherwise.
- Do not silently reintroduce anything the user asked to remove.
- If the user asks to replace something, replace it consistently throughout the document.
- Preserve all unrelated content unless the requested change genuinely requires modifying it.
- Do not make additional improvements, substitutions, rewrites, or assumptions beyond the user's instruction unless necessary to keep the document coherent.
- Keep the result clean, practical, and ready to save.
`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + apiKey,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content:
              "You rewrite Playbook documents cleanly. Return only the finished updated document.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return Response.json(
        { ok: false, error: errorText },
        { status: 500 }
      );
    }

    const data = await response.json();

    const updatedContent =
      data?.choices?.[0]?.message?.content?.trim() || "";

    return Response.json({
      ok: true,
      updatedContent,
    });
  } catch (error) {
    return Response.json(
      { ok: false, error: error?.message || "Playbook review failed." },
      { status: 500 }
    );
  }
}
