import { buildHROrganisationPrompt } from "../../../lib/hrOrganisationPrompt.js";
import { createDraftOrigin } from '../../../lib/corporateDocumentDraft.js';
import { createCorporateDocumentHandoff } from '../../../lib/corporateDocumentServer.js';
import { chronologicalReviews } from "../../../lib/organisationLearningHistory.js";
import { buildOrganisationModelEvidence } from "../../../lib/organisationModelEvidence.js";

import {
  buildOrganisationBusinessEvidenceReview,
} from "../../../lib/rootOrganisationBusinessEvidence";

import {
  buildRootContext,
} from "../../../lib/rootContextEngine";

import {
  buildVerifiedRootContext,
} from "../../../lib/rootContextSourceEngine";

import {
  buildRootVerificationDecision,
} from "../../../lib/rootVerificationEngine";

import {
  hrCoachAccessResponse,
  loadAuthorisedHRCoachEvidence,
  requireHRCoachOrganisationAccess,
} from "../../../lib/hrCoachServerAuth";

import {
  buildOrganisationContext as buildSharedOrganisationContext,
} from "../../../lib/rootOrganisationContext";

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

function summariseOrganisationReviews(entries = []) {
  const records = safeArray(entries);

  if (records.length === 0) {
    return "No Organisation Learning Reviews were supplied.";
  }

  const ordered = chronologicalReviews(records);

  const latest = ordered[ordered.length - 1];

  const previous =
    ordered.length > 1
      ? ordered[ordered.length - 2]
      : null;

  function describeMeasure(key, label, currency = false) {
    const current = safeNumber(latest?.[key]);
    const previousValue = safeNumber(previous?.[key]);

    if (current === null) {
      return `${label}: not recorded`;
    }

    const formattedCurrent = currency
      ? `£${current.toLocaleString("en-GB")}`
      : current.toLocaleString("en-GB");

    if (previousValue === null) {
      return `${label}: ${formattedCurrent}; first saved organisation review, so no cross-review comparison is available yet.`;
    }

    const formattedPrevious = currency
      ? `£${previousValue.toLocaleString("en-GB")}`
      : previousValue.toLocaleString("en-GB");

    const change = current - previousValue;

    const direction =
      change > 0
        ? "increased"
        : change < 0
        ? "reduced"
        : "remained unchanged";

    return `${label}: ${formattedCurrent}; previous saved review ${formattedPrevious}; ${direction} since that review.`;
  }

  const businessEvents = Array.isArray(latest?.business_events)
    ? latest.business_events
    : [];

  const initiatives = Array.isArray(latest?.initiatives)
    ? latest.initiatives
    : [];

  const watchItems = Array.isArray(latest?.watch_items)
    ? latest.watch_items
    : [];

  return [
    `Organisation Learning Reviews recorded: ${records.length}`,
    describeMeasure("sickness_days", "Sickness days"),
    describeMeasure("turnover", "Employee turnover"),
    describeMeasure("agency_spend", "Agency spend", true),
    describeMeasure("overtime_hours", "Overtime hours"),
    describeMeasure("vacancies", "Current vacancies"),
    `Business events recorded in latest review: ${
      businessEvents.length > 0
        ? businessEvents.join(", ")
        : "none"
    }`,
    `Initiatives recorded in latest review: ${
      initiatives.length > 0
        ? initiatives.join(", ")
        : "none"
    }`,
    `Business event notes: ${latest.business_event_notes || "none"}`,
    `Initiative notes: ${latest.initiative_notes || "none"}`,
    `Observation priorities in latest review: ${
      watchItems.length > 0
        ? watchItems.join(", ")
        : "none"
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
function summariseSharedOrganisationContext(
  context
) {
  if (!context) {
    return [
      "No live organisation structure was supplied.",
      "Do not infer regions, departments, sites, teams or HR responsibilities that are not present elsewhere in the supplied evidence.",
    ].join("\n");
  }

  const structure =
    context?.structure || {};

  const people =
    context?.people || {};

  const responsibilities =
    context?.responsibilities || {};

  const unitSummaries =
    safeArray(
      structure.unitSummaries
    );

  const lines = [
    `Recorded organisation units: ${
      Number(structure.unitCount) || 0
    }.`,

    `Recorded employees: ${
      Number(people.employeeCount) || 0
    }.`,

    `Activated employees: ${
      Number(
        people.activatedEmployeeCount
      ) || 0
    }.`,

    `Employees with completed baselines: ${
      Number(
        people.baselineCompletedCount
      ) || 0
    }.`,

    `Recorded employee participation rate: ${
      Number.isFinite(
        Number(people.participationRate)
      )
        ? `${Number(
            people.participationRate
          )}%`
        : "not available"
    }.`,

    `Recorded HR administrators: ${
      safeArray(
        people.hrAdmins
      ).length
    }.`,

    `Recorded organisation administrators: ${
      safeArray(
        people.organisationAdmins
      ).length
    }.`,
  ];

  if (unitSummaries.length > 0) {
    lines.push(
      "",
      "LIVE ORGANISATION UNITS"
    );

    unitSummaries.forEach(
      (unit) => {
        const path =
          safeArray(unit.path)
            .map((item) =>
              safeText(
                item?.name,
                ""
              )
            )
            .filter(Boolean)
            .join(" → ") ||
          safeText(
            unit.name,
            "Unnamed unit"
          );

        lines.push(
          [
            `Unit: ${path}`,
            `type: ${safeText(
              unit.unit_type,
              "not recorded"
            )}`,
            `employees: ${
              Number(
                unit.employee_count
              ) || 0
            }`,
            `activated employees: ${
              Number(
                unit.activated_employee_count
              ) || 0
            }`,
            `completed baselines: ${
              Number(
                unit.baseline_completed_count
              ) || 0
            }`,
            `participation: ${
              Number.isFinite(
                Number(
                  unit.participation_rate
                )
              )
                ? `${Number(
                    unit.participation_rate
                  )}%`
                : "not available"
            }`,
            `HR users: ${
              Number(
                unit.hr_user_count
              ) || 0
            }`,
          ].join("; ")
        );
      }
    );
  }

  const hrResponsibilities =
    safeArray(
      responsibilities.hr
    );

  if (
    hrResponsibilities.length > 0
  ) {
    lines.push(
      "",
      "HR RESPONSIBILITY COVERAGE"
    );

    hrResponsibilities.forEach(
      (responsibility) => {
        lines.push(
          `- ${safeText(
            responsibility
              ?.responsibility_label,
            "Whole organisation"
          )}`
        );
      }
    );
  }

  lines.push(
    "",
    "PRIVACY RULE",
    "This structure may be used to understand organisational hierarchy, participation and HR coverage.",
    "Do not identify individual employees or expose names, email addresses, profile keys, membership IDs or user IDs."
  );

  return lines.join("\n");
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
  organisation_id: requestedOrganisationId,
  intent,
  userName,
} = body || {};

    let authorised;

    try {
      authorised = await requireHRCoachOrganisationAccess({
        request,
        organisationId: requestedOrganisationId,
      });
    } catch (accessError) {
      return hrCoachAccessResponse(accessError);
    }

    const {
      organisation,
      organisationContext: sharedOrganisationContext,
      members,
      assessments,
      mindEntries,
      journalEntries,
      voiceSessions,
      organisationReviews,
    } = await loadAuthorisedHRCoachEvidence({
      supabase: authorised.supabase,
      organisationId: authorised.organisationId,
      buildSharedContext: buildSharedOrganisationContext,
    });

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
      JSON.stringify({ name: organisation.name, workforce: organisation.workforceContext, organisationActions: organisation.actionContext });

    const memberSummary = JSON.stringify({ rootMembershipCount: organisation.workforceContext?.rootMembershipCount, linkedMembershipCount: organisation.workforceContext?.linkedMembershipCount });

    const assessmentSummary =
      "See the privacy-protected aggregate wellbeing evidence below.";

    const mindSummary =
      "Private Mind narrative is excluded from organisational model inputs.";

    const journalSummary =
      "Private journal narrative is excluded from organisational model inputs.";

    const voiceSummary =
  "Private voice narrative is excluded from organisational model inputs.";

   const organisationLearningSummary =
  summariseOrganisationReviews(
    organisationReviews
  );

   const preResponseRootContext =
  buildRootContext({
    userMessage: cleanMessage,

    conversation:
      normaliseConversation(
        conversation
      ),

    organisationContext:
      { workforce: sharedOrganisationContext.workforce },
  });

  const sharedOrganisationStructure =
  JSON.stringify({ workforce: sharedOrganisationContext.workforce, units: sharedOrganisationContext.structure.units.map(({ id, name, parent_unit_id, unit_type }) => ({ id, name, parent_unit_id, unit_type })) });

const organisationContext = JSON.stringify({ workforce: organisation.workforceContext, membershipCount: members.length });

        const wellbeingReview =
      buildOrganisationModelEvidence({
        organisation,
        members,
        assessments,
        mindEntries,
        journalEntries,
        voiceSessions,
      });

    const businessEvidenceReview =
      buildOrganisationBusinessEvidenceReview({
        organisationReviews,
      });

    const systemPrompt = buildHROrganisationPrompt({ preResponseRootContext, userName, intent, safeguardingLanguageDetected, organisationSummary, memberSummary, assessmentSummary, mindSummary, journalSummary, voiceSummary, organisationLearningSummary, sharedOrganisationStructure, organisationContext, businessEvidenceReview, wellbeingReview, workforceContext: organisation.workforceContext });

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

      const rootContext =
  buildRootContext({
    userMessage: cleanMessage,

    assistantAnswer: reply,

    conversation:
      normaliseConversation(
        conversation
      ),

    organisationContext:
      { workforce: sharedOrganisationContext.workforce },
  });

  const verificationDecision =
  buildRootVerificationDecision({
    userMessage:
      cleanMessage,

    assistantAnswer:
      reply,

    conversation:
      normaliseConversation(
        conversation
      ),

    rootContext,
  });

const verifiedRootContext =
  verificationDecision
    ?.shouldVerify === true
    ? await buildVerifiedRootContext({
        apiKey,

        userMessage:
          cleanMessage,

        assistantAnswer:
          reply,

        rootContext,

        jurisdiction:
          "United Kingdom",
      })
    : null;
       return Response.json(
      {
        reply,
        documentHandoff: createCorporateDocumentHandoff({ evidence: { organisation, members, assessments }, userId: authorised.user.id }),
        draftOrigin: createDraftOrigin(reply, authorised),

        rootContext:
          verifiedRootContext,

        safeguardingMode:
          safeguardingLanguageDetected,

        evidenceStatus: {
          organisationConfidence:
            wellbeingReview?.confidence?.organisation?.label ||
            "Unknown",

          respondentConfidence:
            wellbeingReview?.confidence?.respondents?.label ||
            "Unknown",

          participationConfidence:
            wellbeingReview?.confidence?.participation?.label ||
            "Unknown",

          qualitativeConfidence:
            wellbeingReview?.confidence?.qualitative?.label ||
            "Unknown",

          interventionReadiness:
            wellbeingReview?.interventionReadiness?.level ||
            "Unknown",

          interventionReady:
            wellbeingReview?.interventionReadiness?.ready === true,

          permittedAction:
            wellbeingReview?.interventionReadiness?.permittedAction ||
            "Not available",

          rootPosition:
            wellbeingReview?.interventionReadiness?.rootPosition ||
            "Evidence position not available",
        },

        evidenceSummary: {
          members:
            safeArray(members).length,

          assessments:
            safeArray(assessments).length,

          mindEntries:
            safeArray(mindEntries).length,

          journalEntries:
            safeArray(journalEntries).length,

          voiceSessions:
            safeArray(voiceSessions).length,
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
