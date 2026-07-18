/**
 * Root Coach Intelligence
 *
 * Converts completed coaching exchanges into privacy-conscious,
 * structured wellbeing signals.
 *
 * This file does not store coaching transcripts.
 *
 * Exports:
 * - buildCoachSignals()
 * - saveCoachSignals()
 */

const ALLOWED_CATEGORIES = new Set([
  "stress",
  "anxiety",
  "sleep",
  "recovery",
  "energy",
  "mood",
  "focus",
  "burnout",
  "relationships",
  "work",
  "confidence",
  "grief",
  "trauma",
  "habits",
  "physical_wellbeing",
  "general",
]);

const ALLOWED_VALENCES = new Set([
  "positive",
  "neutral",
  "negative",
  "mixed",
]);

const ALLOWED_CHANGE_DIRECTIONS = new Set([
  "improving",
  "worsening",
  "stable",
  "unclear",
]);

const ALLOWED_MODES = new Set([
  "reflective",
  "supportive",
  "grounding",
  "practical",
  "exploratory",
  "motivational",
  "educational",
  "trauma_informed",
  "crisis_support",
  "general",
]);

const ALLOWED_SOURCES = new Set([
  "text",
  "voice",
  "journal",
  "check_in",
  "playbook",
  "other",
]);

/**
 * Keep numbers safely inside the required range.
 */
function clampNumber(value, minimum, maximum, fallback) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Math.min(maximum, Math.max(minimum, number));
}

/**
 * Clean generated text and enforce a maximum length.
 */
function cleanText(value, maximumLength = 240) {
  if (typeof value !== "string") {
    return null;
  }

  const cleaned = value
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maximumLength);

  return cleaned || null;
}

/**
 * Convert a generated label into a consistent database-safe value.
 */
function normaliseLabel(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function cleanCategory(value) {
  const category = normaliseLabel(value);

  return ALLOWED_CATEGORIES.has(category) ? category : "general";
}

function cleanValence(value) {
  const valence = normaliseLabel(value);

  return ALLOWED_VALENCES.has(valence) ? valence : "neutral";
}

function cleanChangeDirection(value) {
  const direction = normaliseLabel(value);

  return ALLOWED_CHANGE_DIRECTIONS.has(direction)
    ? direction
    : "unclear";
}

function cleanRecommendedMode(value) {
  const mode = normaliseLabel(value);

  return ALLOWED_MODES.has(mode) ? mode : "general";
}

function cleanSource(value) {
  const source = normaliseLabel(value);

  return ALLOWED_SOURCES.has(source) ? source : "text";
}

/**
 * Avoid sending an unnecessarily large conversation to the
 * intelligence model.
 */
function prepareConversation(messages = [], limit = 12) {
  if (!Array.isArray(messages)) {
    return [];
  }

  return messages
    .filter((message) => {
      return (
        message &&
        typeof message.content === "string" &&
        ["user", "assistant"].includes(message.role)
      );
    })
    .slice(-limit)
    .map((message) => ({
      role: message.role,
      content: message.content.trim().slice(0, 2500),
    }))
    .filter((message) => message.content.length > 0);
}

/**
 * Remove incomplete, unsafe or low-confidence model output.
 */
function validateSignals(rawSignals) {
  if (!Array.isArray(rawSignals)) {
    return [];
  }

  return rawSignals
    .slice(0, 8)
    .map((signal) => {
      if (!signal || typeof signal !== "object") {
        return null;
      }

      const confidence = clampNumber(
        signal.confidence,
        0,
        1,
        0
      );

      /*
       * Root should not store uncertain interpretations as facts.
       */
      if (confidence < 0.65) {
        return null;
      }

      const theme = cleanText(signal.theme, 120);

      if (!theme) {
        return null;
      }

      return {
        category: cleanCategory(signal.category),
        theme,
        valence: cleanValence(signal.valence),

        /*
         * Intensity uses Root's existing principle:
         * 0 = little or no difficulty
         * 10 = severe difficulty
         */
        intensity: Math.round(
          clampNumber(signal.intensity, 0, 10, 5)
        ),

        confidence,

        change_direction: cleanChangeDirection(
          signal.change_direction
        ),

        recommended_mode: cleanRecommendedMode(
          signal.recommended_mode
        ),

        intervention: cleanText(signal.intervention, 180),
        follow_up: cleanText(signal.follow_up, 180),
      };
    })
    .filter(Boolean);
}

/**
 * Extract structured coaching signals.
 *
 * Required:
 * - openai: the existing OpenAI client used by the coach route
 *
 * Supply either:
 * - messages
 *
 * or:
 * - userMessage and assistantReply
 *
 * This function never throws into the coaching route.
 * It returns [] when extraction is not possible.
 */
export async function buildCoachSignals({
  openai,
  messages = [],
  userMessage = "",
  assistantReply = "",
  source = "text",
} = {}) {
  try {
    if (!openai?.chat?.completions?.create) {
      console.warn(
        "ROOT COACH INTELLIGENCE: OpenAI client missing."
      );

      return [];
    }

    let conversation = prepareConversation(messages);

    /*
     * This fallback allows the route to pass only the latest
     * user message and Root reply.
     */
    if (conversation.length === 0) {
      conversation = prepareConversation([
        {
          role: "user",
          content: userMessage,
        },
        {
          role: "assistant",
          content: assistantReply,
        },
      ]);
    }

    if (conversation.length === 0) {
      return [];
    }

    const intelligencePrompt = `
You are the private structured-signal layer for Root Health,
a trauma-informed wellbeing coaching platform.

Your task is to identify useful wellbeing signals supported by
the supplied coaching exchange.

You are not writing a summary of the conversation.

PRIVACY RULES

- Do not quote the user.
- Do not reproduce the conversation.
- Do not include names, employers, locations, contact details,
  family-member names or identifying details.
- Do not retain unnecessary personal circumstances.
- Describe themes generally and anonymously.
- Do not make medical or psychiatric diagnoses.
- Do not infer protected personal characteristics.
- Do not invent facts.
- Only include signals supported by clear evidence.
- Exclude weak or speculative interpretations.

PURPOSE

The signals may help Root:

- personalise future coaching;
- notice whether the person appears to be improving;
- recommend an appropriate coaching approach;
- understand which interventions may have helped;
- create anonymous aggregated wellbeing evidence.

Return no more than 8 signals.

ALLOWED CATEGORIES

stress
anxiety
sleep
recovery
energy
mood
focus
burnout
relationships
work
confidence
grief
trauma
habits
physical_wellbeing
general

VALENCE

positive
neutral
negative
mixed

CHANGE DIRECTION

improving
worsening
stable
unclear

RECOMMENDED MODE

reflective
supportive
grounding
practical
exploratory
motivational
educational
trauma_informed
crisis_support
general

INTENSITY

Use an integer from 0 to 10.

0 means little or no current difficulty.
10 means very severe current difficulty.

CONFIDENCE

Use a decimal from 0 to 1.

Only return a signal when confidence is at least 0.65.

FIELD RULES

category:
One allowed category.

theme:
A short anonymous wellbeing theme.
Do not write a conversation summary.

valence:
The emotional or wellbeing direction of the signal.

intensity:
The apparent current level of difficulty.

confidence:
How clearly the conversation supports the signal.

change_direction:
Whether there is evidence of improvement, worsening,
stability or no clear direction.

recommended_mode:
The coaching approach that may be most appropriate next.

intervention:
A short intervention or action discussed or attempted.
Use null when none is evident.

follow_up:
A short useful point Root could revisit later.
Use null when none is evident.

Return valid JSON only, using this exact structure:

{
  "signals": [
    {
      "category": "stress",
      "theme": "difficulty switching off after sustained pressure",
      "valence": "negative",
      "intensity": 7,
      "confidence": 0.88,
      "change_direction": "unclear",
      "recommended_mode": "grounding",
      "intervention": "brief paced breathing",
      "follow_up": "ask whether the breathing exercise reduced tension"
    }
  ]
}

When there are no sufficiently supported signals, return:

{
  "signals": []
}
`.trim();

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.1,

      response_format: {
        type: "json_object",
      },

      messages: [
        {
          role: "system",
          content: intelligencePrompt,
        },
        {
          role: "user",
          content: JSON.stringify({
            source: cleanSource(source),
            conversation,
          }),
        },
      ],
    });

    const content =
      response?.choices?.[0]?.message?.content;

    if (!content) {
      return [];
    }

    let parsed;

    try {
      parsed = JSON.parse(content);
    } catch (parseError) {
      console.error(
        "ROOT COACH INTELLIGENCE JSON ERROR:",
        parseError
      );

      return [];
    }

    return validateSignals(parsed?.signals);
  } catch (error) {
    /*
     * Coach Intelligence must never prevent the user from
     * receiving the actual coaching response.
     */
    console.error(
      "ROOT COACH INTELLIGENCE BUILD ERROR:",
      error
    );

    return [];
  }
}

/**
 * Save validated signals to Supabase.
 *
 * The Supabase client is passed in by the calling route so this
 * works with the route's existing authenticated/server client.
 *
 * This function stores structured signals only.
 * It does not store the conversation.
 */
export async function saveCoachSignals({
  supabase,
  profileKey,
  sessionKey = null,
  source = "text",
  signals = [],
  includeInOrganisationInsights = false,
} = {}) {
  try {
    if (!supabase?.from) {
      console.warn(
        "ROOT COACH INTELLIGENCE: Supabase client missing."
      );

      return {
        success: false,
        saved: 0,
        reason: "supabase_missing",
      };
    }

    const safeProfileKey = cleanText(profileKey, 200);

    if (!safeProfileKey) {
      console.warn(
        "ROOT COACH INTELLIGENCE: profileKey missing."
      );

      return {
        success: false,
        saved: 0,
        reason: "profile_key_missing",
      };
    }

    const validatedSignals = validateSignals(signals);

    if (validatedSignals.length === 0) {
      return {
        success: true,
        saved: 0,
        reason: "no_signals",
      };
    }

    const safeSessionKey = cleanText(sessionKey, 200);
    const safeSource = cleanSource(source);

    const rows = validatedSignals.map((signal) => ({
      profile_key: safeProfileKey,
      session_key: safeSessionKey,
      source: safeSource,

      category: signal.category,
      theme: signal.theme,
      valence: signal.valence,

      intensity: signal.intensity,
      confidence: signal.confidence,

      change_direction: signal.change_direction,
      recommended_mode: signal.recommended_mode,

      intervention: signal.intervention,
      follow_up: signal.follow_up,

      /*
       * Privacy-first default.
       *
       * Organisation inclusion must be deliberately enabled by
       * the calling code after the correct consent and anonymous
       * aggregation rules are in place.
       */
      include_in_org_insights:
        includeInOrganisationInsights === true,
    }));

    const { error } = await supabase
      .from("coach_signals")
      .insert(rows);

    if (error) {
      console.error(
        "ROOT COACH INTELLIGENCE SAVE ERROR:",
        error
      );

      return {
        success: false,
        saved: 0,
        reason: "database_error",
        error,
      };
    }

    return {
      success: true,
      saved: rows.length,
      reason: "saved",
    };
  } catch (error) {
    /*
     * Signal storage must never break the coaching experience.
     */
    console.error(
      "ROOT COACH INTELLIGENCE SAVE EXCEPTION:",
      error
    );

    return {
      success: false,
      saved: 0,
      reason: "unexpected_error",
      error,
    };
  }
}

/**
 * Optional single-call helper.
 *
 * We may use this later, but keeping it here means the Coach API
 * can build and save signals through one clean function.
 */
export async function processCoachIntelligence({
  openai,
  supabase,
  profileKey,
  sessionKey = null,
  source = "text",
  messages = [],
  userMessage = "",
  assistantReply = "",
  includeInOrganisationInsights = false,
} = {}) {
  const signals = await buildCoachSignals({
    openai,
    messages,
    userMessage,
    assistantReply,
    source,
  });

  const saveResult = await saveCoachSignals({
    supabase,
    profileKey,
    sessionKey,
    source,
    signals,
    includeInOrganisationInsights,
  });

  return {
    signals,
    saveResult,
  };
}
