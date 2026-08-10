const OFFICIAL_SOURCE_DOMAINS = [
  "gov.uk",
  "legislation.gov.uk",
  "acas.org.uk",
  "ico.org.uk",
  "equalityhumanrights.com",
  "hse.gov.uk",
];

function safeText(value) {
  return String(value || "").trim();
}

function safeArray(value) {
  return Array.isArray(value)
    ? value
    : [];
}

function extractResponseText(data) {
  const output = safeArray(
    data?.output
  );

  const textParts = [];

  output.forEach((item) => {
    safeArray(item?.content).forEach(
      (contentItem) => {
        if (
          contentItem?.type ===
            "output_text" &&
          typeof contentItem?.text ===
            "string"
        ) {
          textParts.push(
            contentItem.text
          );
        }
      }
    );
  });

  return textParts
    .join("\n")
    .trim();
}

function cleanJsonText(value) {
  return safeText(value)
    .replace(/^```json/i, "")
    .replace(/^```/i, "")
    .replace(/```$/i, "")
    .trim();
}

function isAllowedOfficialUrl(value) {
  try {
    const url = new URL(value);

    const host =
      url.hostname
        .toLowerCase()
        .replace(/^www\./, "");

    return OFFICIAL_SOURCE_DOMAINS.some(
      (domain) =>
        host === domain ||
        host.endsWith(
          `.${domain}`
        )
    );
  } catch {
    return false;
  }
}

function normaliseSources(
  sources
) {
  return safeArray(sources)
    .filter(
      (source) =>
        source &&
        isAllowedOfficialUrl(
          source.url
        )
    )
    .slice(0, 3)
    .map((source) => ({
      title:
        safeText(
          source.title
        ) ||
        "Official guidance",

      organisation:
        safeText(
          source.organisation
        ) ||
        "Official source",

      url:
        safeText(source.url),

      whyRelevant:
        safeText(
          source.whyRelevant
        ),
    }));
}

export async function buildVerifiedRootContext({
  apiKey,
  userMessage = "",
  assistantAnswer = "",
  rootContext = null,
  jurisdiction = "United Kingdom",
} = {}) {
  if (
    !apiKey ||
    !rootContext?.show
  ) {
    return null;
  }

  const detectedAreas =
    safeArray(
      rootContext?.areas
    )
      .map((area) =>
        safeText(area?.label)
      )
      .filter(Boolean);

  const prompt = `
You are Root's quiet professional verification layer.

Your job is NOT to answer the HR leader again.

Ask Root has already answered them.

Your job is to check whether CURRENT authoritative official guidance adds something materially useful to the exact conversation.

JURISDICTION

${jurisdiction}

THE LEADER ASKED

${safeText(userMessage)}

ROOT ANSWERED

${safeText(assistantAnswer)}

ROOT'S INTERNAL CONTEXT SIGNALS

${detectedAreas.join(", ") || "none recorded"}

YOUR PURPOSE

Search current authoritative official sources only.

Do not repeat Root's answer.

Do not produce a generic HR checklist.

Do not create five reflection questions.

Do not manufacture an issue merely because the context detector fired.

Find the single most useful piece of CURRENT official context that:

- verifies something important
- adds something Root did not already say
- identifies something worth checking
- or provides useful reassurance

If the official material adds nothing materially useful beyond Root's answer, return show false.

Never decide whether an employee should be dismissed, disciplined, made redundant, promoted or otherwise subjected to an employment decision.

Never state that something definitely is lawful, unlawful, discriminatory, compliant or non-compliant unless the official source directly establishes that conclusion for the facts supplied.

The human decision remains with the organisation.

STYLE

Warm.
Calm.
Advisory.
Plain English.
Concise.

The card should feel like:

"While we were talking, Root quietly checked something."

Not:

"Here is another answer."

SOURCES

Use only official sources found during this search.

Prefer the exact page dealing with the exact issue rather than a homepage or broad landing page.

Return no more than 3 sources.

Return ONLY valid JSON in this exact shape:

{
  "show": true,
  "eyebrow": "Root checked something for you",
  "title": "One thing worth knowing",
  "summary": "One concise paragraph explaining the useful verified context.",
  "keyPoint": "One particularly useful point the leader may wish to check or keep in mind.",
  "reassurance": "",
  "sources": [
    {
      "title": "Exact official page title",
      "organisation": "Acas",
      "url": "https://...",
      "whyRelevant": "One short sentence explaining why this page is relevant."
    }
  ]
}

If nothing genuinely useful was added by checking the current official guidance, return:

{
  "show": false,
  "eyebrow": "",
  "title": "",
  "summary": "",
  "keyPoint": "",
  "reassurance": "",
  "sources": []
}
`;

  try {
    const response =
      await fetch(
        "https://api.openai.com/v1/responses",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${apiKey}`,
          },

          body: JSON.stringify({
            model:
              "gpt-5-mini",

            store: false,

            tools: [
              {
                type:
                  "web_search",

                filters: {
                  allowed_domains:
                    OFFICIAL_SOURCE_DOMAINS,
                },

                search_context_size:
                  "medium",
              },
            ],

            input: prompt,
          }),
        }
      );

    if (!response.ok) {
      const errorText =
        await response.text();

      console.error(
        "ROOT CONTEXT SOURCE ERROR:",
        response.status,
        errorText
      );

      return null;
    }

    const data =
      await response.json();

    const rawText =
      extractResponseText(
        data
      );

    if (!rawText) {
      return null;
    }

    let parsed;

    try {
      parsed = JSON.parse(
        cleanJsonText(rawText)
      );
    } catch (error) {
      console.error(
        "ROOT CONTEXT SOURCE JSON ERROR:",
        error,
        rawText
      );

      return null;
    }

    const sources =
      normaliseSources(
        parsed?.sources
      );

    if (
      parsed?.show !== true ||
      sources.length === 0
    ) {
      return null;
    }

    return {
      show: true,

      eyebrow:
        safeText(
          parsed?.eyebrow
        ) ||
        "Root checked something for you",

      title:
        safeText(
          parsed?.title
        ) ||
        "One thing worth knowing",

      summary:
        safeText(
          parsed?.summary
        ),

      keyPoint:
        safeText(
          parsed?.keyPoint
        ),

      reassurance:
        safeText(
          parsed?.reassurance
        ),

      sources,

      checkedAt:
        new Date()
          .toISOString(),

      sourceType:
        "current_official_guidance",
    };
  } catch (error) {
    console.error(
      "ROOT CONTEXT SOURCE ENGINE ERROR:",
      error
    );

    return null;
  }
}
