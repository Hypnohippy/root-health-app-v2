import {
  buildOrganisationWellbeingReview,
} from "../../../lib/rootOrganisationWellbeing";

export const runtime = "nodejs";

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeText(value, fallback = "not recorded") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function safeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function uniqueValues(values = []) {
  return [
    ...new Set(
      values
        .map((value) => String(value ?? "").trim())
        .filter(Boolean)
    ),
  ];
}

function average(values = []) {
  const numbers = values
    .map((value) => safeNumber(value))
    .filter((value) => value !== null);

  if (numbers.length === 0) return null;

  return numbers.reduce((total, value) => total + value, 0) / numbers.length;
}

function formatAverage(value) {
  if (value === null || value === undefined) return "not available";
  return Number(value).toFixed(1);
}

function getAssessmentValue(assessment, possibleKeys = []) {
  for (const key of possibleKeys) {
    const value = safeNumber(assessment?.[key]);

    if (value !== null) {
      return value;
    }
  }

  return null;
}

function summariseOrganisation(organisation) {
  if (!organisation) {
    return "No organisation record was supplied.";
  }

  return [
    `Organisation name: ${safeText(
      organisation.name || organisation.organisation_name,
      "unknown"
    )}`,
    `Industry or sector: ${safeText(
      organisation.industry || organisation.sector,
      "not recorded"
    )}`,
    `Organisation size: ${safeText(
      organisation.size ||
        organisation.employee_count ||
        organisation.member_count,
      "not recorded"
    )}`,
    `Current programme stage: ${safeText(
      organisation.stage ||
        organisation.programme_stage ||
        organisation.status,
      "not recorded"
    )}`,
    `Programme start date: ${safeText(
      organisation.start_date ||
        organisation.programme_start_date ||
        organisation.created_at,
      "not recorded"
    )}`,
  ].join("\n");
}

function summariseMembers(members = []) {
  const records = safeArray(members);

  if (records.length === 0) {
    return "No organisation membership records were supplied.";
  }

  const activeMembers = records.filter((member) => {
    const status = String(member?.status || "").toLowerCase();

    if (!status) return true;

    return (
      status === "active" ||
      status === "accepted" ||
      status === "member" ||
      status === "joined"
    );
  });

  const roles = uniqueValues(
    records.map(
      (member) =>
        member?.role ||
        member?.job_role ||
        member?.membership_role ||
        member?.department
    )
  );

  const departments = uniqueValues(
    records.map(
      (member) =>
        member?.department ||
        member?.team ||
        member?.business_area ||
        member?.division
    )
  );

  return [
    `Total membership records: ${records.length}`,
    `Active or accepted members: ${activeMembers.length}`,
    `Recorded roles: ${roles.length > 0 ? roles.join(", ") : "not recorded"}`,
    `Recorded departments or teams: ${
      departments.length > 0 ? departments.join(", ") : "not recorded"
    }`,
  ].join("\n");
}

function summariseAssessments(assessments = []) {
  const records = safeArray(assessments);

  if (records.length === 0) {
    return "No wellbeing assessments were supplied.";
  }

  const dimensions = [
    {
      label: "Stress",
      keys: ["stress", "stress_score", "stress_level"],
    },
    {
      label: "Sleep difficulties",
      keys: ["sleep", "sleep_score", "sleep_difficulties"],
    },
    {
      label: "Recovery difficulty",
      keys: ["recovery", "recovery_score", "recovery_difficulty"],
    },
    {
      label: "Energy difficulty",
      keys: ["energy", "energy_score", "energy_difficulty"],
    },
    {
      label: "Mood difficulty",
      keys: ["mood", "mood_score", "mood_difficulty"],
    },
    {
      label: "Focus difficulty",
      keys: ["focus", "focus_score", "focus_difficulty"],
    },
    {
      label: "Burnout",
      keys: ["burnout", "burnout_score", "burnout_level"],
    },
  ];

  const lines = [`Total assessments: ${records.length}`];

  for (const dimension of dimensions) {
    const values = records
      .map((assessment) =>
        getAssessmentValue(assessment, dimension.keys)
      )
      .filter((value) => value !== null);

    if (values.length === 0) continue;

    const dimensionAverage = average(values);
    const highScores = values.filter((value) => value >= 7).length;

    lines.push(
      `${dimension.label}: average ${formatAverage(
        dimensionAverage
      )}/10 across ${values.length} responses; ${highScores} scores were 7 or above.`
    );
  }

  const dates = records
    .map(
      (assessment) =>
        assessment?.created_at ||
        assessment?.completed_at ||
        assessment?.assessment_date
    )
    .filter(Boolean)
    .map((value) => new Date(value))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  if (dates.length > 0) {
    lines.push(
      `Assessment period: ${dates[0].toISOString()} to ${
        dates[dates.length - 1].toISOString()
      }.`
    );
  }

  return lines.join("\n");
}

function summariseMindEntries(entries = []) {
  const records = safeArray(entries);

  if (records.length === 0) {
    return "No Mind & Emotions activity was supplied.";
  }

  const tools = uniqueValues(records.map((entry) => entry?.tool));

  const emotions = uniqueValues(
    records.map(
      (entry) =>
        entry?.emotion ||
        entry?.emotional_theme ||
        entry?.feeling
    )
  );

  const themes = uniqueValues(
    records.map(
      (entry) =>
        entry?.thought_theme ||
        entry?.theme ||
        entry?.automatic_thought
    )
  );

  return [
    `Mind & Emotions interactions: ${records.length}`,
    `Tools used: ${tools.length > 0 ? tools.join(", ") : "not recorded"}`,
    `Recorded emotions: ${
      emotions.length > 0 ? emotions.join(", ") : "not recorded"
    }`,
    `Recorded thought themes: ${
      themes.length > 0 ? themes.join(", ") : "not recorded"
    }`,
  ].join("\n");
}

function summariseJournalEntries(entries = []) {
  const records = safeArray(entries);

  if (records.length === 0) {
    return "No journal activity was supplied.";
  }

  const emotionalThemes = uniqueValues(
    records.map((entry) => entry?.emotional_theme)
  );

  const coachModes = uniqueValues(
    records.map((entry) => entry?.recommended_coach_mode)
  );

  return [
    `Journal reflections: ${records.length}`,
    `Recorded emotional themes: ${
      emotionalThemes.length > 0
        ? emotionalThemes.join(", ")
        : "not recorded"
    }`,
    `Recommended coach modes appearing in the evidence: ${
      coachModes.length > 0 ? coachModes.join(", ") : "not recorded"
    }`,
  ].join("\n");
}

function summariseVoiceSessions(entries = []) {
  const records = safeArray(entries);

  if (records.length === 0) {
    return "No Voice Coach sessions were supplied.";
  }

  const topics = uniqueValues(
    records.map(
      (entry) =>
        entry?.topic ||
        entry?.category ||
        entry?.coach_mode ||
        entry?.mode
    )
  );

  const completedSessions = records.filter((entry) => {
    const status = String(entry?.status || "").toLowerCase();

    if (!status) return true;

    return (
      status === "completed" ||
      status === "saved" ||
      status === "finished"
    );
  });

  return [
    `Voice Coach sessions: ${records.length}`,
    `Completed or saved sessions: ${completedSessions.length}`,
    `Topics or modes recorded: ${
      topics.length > 0 ? topics.join(", ") : "not recorded"
    }`,
  ].join("\n");
}

function buildOrganisationContext({
  organisation,
  members,
  assessments,
  mindEntries,
  journalEntries,
  voiceSessions,
}) {
  const assessmentRecords = safeArray(assessments);
  const memberRecords = safeArray(members);
  const mindRecords = safeArray(mindEntries);
  const journalRecords = safeArray(journalEntries);
  const voiceRecords = safeArray(voiceSessions);

  const totalSupportInteractions =
    mindRecords.length +
    journalRecords.length +
    voiceRecords.length;

  const participantsWithAssessments = uniqueValues(
    assessmentRecords.map(
      (assessment) =>
        assessment?.user_id ||
        assessment?.profile_key ||
        assessment?.member_id
    )
  ).length;

  const participationRate =
    memberRecords.length > 0
      ? (participantsWithAssessments / memberRecords.length) * 100
      : null;

  const contextLines = [
    `Recorded organisation members: ${memberRecords.length}.`,
    `Recorded assessments: ${assessmentRecords.length}.`,
    `Recorded support interactions: ${totalSupportInteractions}.`,
  ];

  if (participationRate !== null) {
    contextLines.push(
      `Estimated assessment participation: ${participationRate.toFixed(
        1
      )}% based on identifiable assessment participants.`
    );
  } else {
    contextLines.push(
      "Assessment participation cannot yet be calculated reliably."
    );
  }

  if (assessmentRecords.length < 5) {
    contextLines.push(
      "The evidence base is still small, so conclusions should remain cautious."
    );
  }

  if (assessmentRecords.length === 0) {
    contextLines.push(
      "There is not yet enough assessment evidence to describe organisational wellbeing patterns."
    );
  }

  return contextLines.join("\n");
}

function normaliseConversation(conversation = []) {
  return safeArray(conversation)
    .filter(
      (message) =>
        message &&
        typeof message.content === "string" &&
        message.content.trim()
    )
    .slice(-16)
    .map((message) => ({
      role: message.role === "user" ? "user" : "assistant",
      content: message.content.trim(),
    }));
}

function detectSafeguardingLanguage(message) {
  const lowerMessage = String(message || "").toLowerCase();

  const phrases = [
    "suicide",
    "suicidal",
    "kill myself",
    "want to die",
    "end my life",
    "self harm",
    "self-harm",
    "hurt myself",
    "immediate danger",
    "risk to life",
    "threatened violence",
    "physical danger",
  ];

  return phrases.some((phrase) => lowerMessage.includes(phrase));
}

export async function POST(request) {
  try {
    const body = await request.json();

    const {
      message,
      conversation,
      organisation,
      members,
      assessments,
      mindEntries,
      journalEntries,
      voiceSessions,
      intent,
      userName,
    } = body || {};

    const cleanMessage = String(message || "").trim();

    if (!cleanMessage) {
      return Response.json(
        {
          reply:
            "Ask me what the organisation evidence supports, what remains uncertain, or what question should come next.",
        },
        { status: 200 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return Response.json(
        {
          reply:
            "The organisation conversation service is not configured because the OpenAI API key is missing.",
        },
        { status: 500 }
      );
    }

    const safeguardingLanguageDetected =
      detectSafeguardingLanguage(cleanMessage);

    const organisationSummary =
      summariseOrganisation(organisation);

    const memberSummary = summariseMembers(members);

    const assessmentSummary =
      summariseAssessments(assessments);

    const mindSummary =
      summariseMindEntries(mindEntries);

    const journalSummary =
      summariseJournalEntries(journalEntries);

    const voiceSummary =
      summariseVoiceSessions(voiceSessions);

    const organisationContext = buildOrganisationContext({
      organisation,
      members,
      assessments,
      mindEntries,
      journalEntries,
      voiceSessions,
    });

        const wellbeingReview =
      buildOrganisationWellbeingReview({
        organisation,
        members,
        assessments,
        mindEntries,
        journalEntries,
        voiceSessions,
      });

    const systemPrompt = `
You are Root Organisation Companion.

Your role is to help organisational leaders understand wellbeing evidence, challenge assumptions and make thoughtful decisions.

You are not a generic HR chatbot.

You are an evidence-led reasoning companion.

CORE PURPOSE

Help the leader distinguish between:

1. What the evidence directly shows.
2. What the evidence may suggest.
3. What the evidence cannot yet tell them.
4. What question or action should come next.

EVIDENCE DISCIPLINE

Never invent facts, trends, causes, teams, employee experiences or organisational conditions.

Use only the evidence supplied in this conversation.

Always separate:

- observation
- interpretation
- uncertainty
- recommendation

An observation must be directly supported by supplied data.

An interpretation must be described cautiously.

Use phrases such as:

- "The evidence currently shows..."
- "One possible interpretation is..."
- "This may indicate..."
- "The data does not yet tell us..."
- "I would be cautious about concluding..."
- "Before acting, I would want to understand..."

Never turn correlation into causation.

Never claim that workload, leadership, culture, management, home life, trauma, discrimination, psychological safety or any other cause is responsible unless the supplied evidence directly supports it.

PRIVACY AND GROUP EVIDENCE

Reason at organisation or cohort level.

Do not identify, profile or speculate about individual employees.

Do not encourage the leader to infer the identity of individuals from small groups.

If the evidence base is small, say that conclusions should remain cautious.

Do not reproduce private journal text, private thoughts or personal employee disclosures.

You may describe aggregated themes only when they appear in the supplied evidence.

Do not expose names, email addresses, profile identifiers or personal medical information.

ROOT'S ORGANISATIONAL REASONING STYLE

Root should help the leader think, not merely report numbers.

Useful responses may include:

- the strongest supported observation
- an alternative explanation
- a challenge to the leader's assumption
- a missing piece of evidence
- a practical next question
- a proportionate next action

Do not overwhelm the leader with every possible interpretation.

Choose the most useful evidence first.

BOARD AND EXECUTIVE COMMUNICATION

If the user asks for a board briefing, executive summary or presentation:

- use clear professional language
- lead with material findings
- state the strength and limitations of the evidence
- distinguish fact from interpretation
- avoid dramatic claims
- give proportionate recommendations
- do not pretend certainty

DECISION SUPPORT

If the user asks what to do next:

Prioritise actions that are:

- proportionate to the strength of the evidence
- low-risk
- measurable
- respectful of employee privacy
- capable of producing further learning

Prefer testing and learning over sweeping intervention when evidence is limited.

Examples:

- investigate whether the pattern is organisation-wide or concentrated
- gather another assessment point
- compare baseline and follow-up evidence
- invite confidential qualitative feedback
- review participation and representation
- test one targeted support intervention
- define what improvement would look like before acting

Do not recommend punitive employee monitoring.

Do not recommend identifying individual employees from aggregated wellbeing evidence.

TONE

Sound:

- calm
- intelligent
- commercially aware
- appropriately challenging
- concise
- trustworthy
- human

Do not sound:

- clinical
- alarmist
- promotional
- overconfident
- like a wellness influencer
- like a generic HR policy bot

Default to two to five short paragraphs.

Use bullet points only when they genuinely improve clarity.

Do not end every response with a question.

Sometimes the strongest ending is a clear judgement such as:

- "The evidence supports attention, but not alarm."
- "There is enough here to investigate, but not enough to assign a cause."
- "The next step should produce better evidence before a larger decision is made."
- "This is a signal worth following, not yet a conclusion."

SAFEGUARDING

If the user describes an immediate risk of suicide, self-harm, violence or danger to an employee:

- stop ordinary organisational analysis
- state that this requires immediate human safeguarding action
- advise the leader to follow their emergency, safeguarding and occupational-health procedures
- advise contacting emergency services where there is immediate danger
- do not attempt to manage the crisis through Root
- remain calm and direct

LEGAL AND MEDICAL BOUNDARIES

Do not provide legal conclusions, diagnoses or medical advice.

You may recommend appropriate HR, safeguarding, occupational-health, clinical or legal support where necessary.

USER

Leader name: ${safeText(userName, "not supplied")}

Current conversation intent: ${safeText(intent, "general evidence discussion")}

SAFEGUARDING LANGUAGE DETECTED IN CURRENT MESSAGE

${safeguardingLanguageDetected ? "Yes" : "No"}

ORGANISATION

${organisationSummary}

MEMBERSHIP AND PARTICIPATION

${memberSummary}

WELLBEING ASSESSMENTS

${assessmentSummary}

MIND AND EMOTIONS ENGAGEMENT

${mindSummary}

JOURNAL ENGAGEMENT

${journalSummary}

VOICE COACH ENGAGEMENT

${voiceSummary}

ROOT ORGANISATION CONTEXT

${organisationContext}

ROOT DETERMINISTIC WELLBEING REVIEW

The following review has already been calculated by Root's deterministic wellbeing engine.

Treat these calculations as the primary reasoning layer.

Do not invent a different confidence level, strongest signal, evidence gap, contradiction or evidence position when Root has already calculated one.

You may explain the review in natural language, but you must preserve its meaning.

EVIDENCE REVIEWED

${JSON.stringify(wellbeingReview.evidenceReviewed, null, 2)}

EVIDENCE CONFIDENCE

${JSON.stringify(wellbeingReview.confidence, null, 2)}

EXECUTIVE HEADLINE

${wellbeingReview.executiveHeadline}

EXECUTIVE SUMMARY

${wellbeingReview.executiveSummary}

ROOT REASONING SUMMARY

${JSON.stringify(wellbeingReview.reasoningSummary, null, 2)}

OBSERVED EVIDENCE

${JSON.stringify(wellbeingReview.observedEvidence, null, 2)}

LONGITUDINAL EVIDENCE

${JSON.stringify(wellbeingReview.longitudinal, null, 2)}

CONTRADICTIONS OR MIXED EVIDENCE

${JSON.stringify(wellbeingReview.contradictions, null, 2)}

EVIDENCE GAPS

${JSON.stringify(wellbeingReview.evidenceGaps, null, 2)}

HIGHEST VALUE NEXT EVIDENCE

${JSON.stringify(wellbeingReview.nextEvidence, null, 2)}

BOARD SUMMARY

${JSON.stringify(wellbeingReview.boardSummary, null, 2)}

ROOT CAUTIONS

${JSON.stringify(wellbeingReview.cautions, null, 2)}

REASONING RULE

Root's deterministic review takes precedence over speculative interpretation.

Where organisation-wide confidence is Low, explicitly distinguish what can be said about the responding sample from what can be concluded about the wider organisation.

Do not describe a score as clinically or organisationally "low", "moderate", "high", "healthy" or "unhealthy" unless the supplied evidence provides a validated threshold for doing so.

Do not claim an effect on productivity, performance, engagement, morale, absence, retention or other business outcomes unless corresponding evidence has been supplied.

Do not recommend a broad intervention merely because one wellbeing dimension is elevated. Where cause remains unknown, prioritise the next evidence needed to understand the pattern before selecting an intervention.

FINAL RESPONSE RULE

Answer the leader's actual question.

Begin with the most useful evidence-led judgement.

Do not repeat all supplied statistics unless they are relevant.

State uncertainty naturally.

Help the leader understand what the evidence supports and what it does not.
`;

    const messages = [
      {
        role: "system",
        content: systemPrompt,
      },
      ...normaliseConversation(conversation),
      {
        role: "user",
        content: cleanMessage,
      },
    ];

    const openAIResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0.35,
          messages,
        }),
      }
    );

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();

      console.error(
        "ORGANISATION COACH OPENAI ERROR:",
        openAIResponse.status,
        errorText
      );

      return Response.json(
        {
          reply:
            "Root could not complete the organisation analysis just now. The evidence has not been changed, so it is safe to try again.",
        },
        { status: 502 }
      );
    }

    const data = await openAIResponse.json();

    const reply =
      data?.choices?.[0]?.message?.content?.trim() ||
      "The evidence is available, but Root could not form a reliable response from it yet.";

    return Response.json(
      {
        reply,
        safeguardingMode: safeguardingLanguageDetected,
        evidenceSummary: {
          members: safeArray(members).length,
          assessments: safeArray(assessments).length,
          mindEntries: safeArray(mindEntries).length,
          journalEntries: safeArray(journalEntries).length,
          voiceSessions: safeArray(voiceSessions).length,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("ORGANISATION COACH ERROR:", error);

    return Response.json(
      {
        reply:
          "Root could not read the organisation evidence correctly. No data has been changed.",
      },
      { status: 500 }
    );
  }
}
