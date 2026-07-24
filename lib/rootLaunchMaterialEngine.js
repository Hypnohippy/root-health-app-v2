function cleanText(value, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function formatNumber(value, digits = 1, fallback = "—") {
  const number = Number(value);

  return Number.isFinite(number)
    ? number.toFixed(digits)
    : fallback;
}

function formatIndex(value) {
  const number = Number(value);

  return Number.isFinite(number)
    ? `${Math.round(number)} out of 100`
    : "still developing";
}

function formatDifficulty(value) {
  const number = Number(value);

  return Number.isFinite(number)
    ? `${number.toFixed(1)} out of 10`
    : "awaiting enough data";
}

function list(items = []) {
  return items
    .filter(Boolean)
    .map((item) => `• ${item}`)
    .join("\n");
}

function getOrganisationName(organisation) {
  return cleanText(
    organisation?.name,
    "Your organisation"
  );
}

function getInitiative(initiative = {}) {
  return {
    key: cleanText(
      initiative.key,
      "wellbeing-momentum"
    ),

    title: cleanText(
      initiative.title,
      "Wellbeing Momentum Month"
    ),

    introduction: cleanText(
      initiative.introduction,
      "Root is helping the organisation strengthen wellbeing awareness, participation and practical support."
    ),

    reason: cleanText(
      initiative.reason,
      "Root recommends strengthening participation and establishing a reliable organisational wellbeing picture."
    ),

    status: cleanText(
      initiative.status,
      "Ready to prepare"
    ),

    expectedOutcome: cleanText(
      initiative.expectedOutcome,
      "Stronger participation, clearer workforce insight and improved awareness of available support."
    ),

    workshopTitle: cleanText(
      initiative.workshopTitle,
      "Workplace Wellbeing Workshop"
    ),

    workshopDescription: cleanText(
      initiative.workshopDescription,
      "A practical session supporting employee wellbeing and sustainable performance."
    ),

    reportFocus: cleanText(
      initiative.reportFocus,
      "Workforce wellbeing, participation and practical support."
    ),
  };
}

function getMovementLine(snapshot) {
  const improvement =
    snapshot?.movementSummary?.biggestImprovement?.summary;

  const watchArea =
    snapshot?.movementSummary?.watchArea?.summary;

  if (improvement && watchArea) {
    return `${improvement} At the same time, ${watchArea
      .charAt(0)
      .toLowerCase()}${watchArea.slice(1)}`;
  }

  if (improvement) {
    return improvement;
  }

  if (watchArea) {
    return watchArea;
  }

  return cleanText(
    snapshot?.executiveNarrative?.detected,
    "Root is still gathering enough follow-up evidence to identify reliable workforce movement."
  );
}

function getCurrentPicture(snapshot) {
  const highRiskLabel = cleanText(
    snapshot?.highRiskMetric?.label,
    snapshot?.primaryConcern || "Workforce wellbeing"
  );

  const highRiskValue =
    snapshot?.highRiskMetric?.current;

  const theme = cleanText(
    snapshot?.mostCommonTheme,
    "No challenge data yet"
  );

  const index = formatIndex(
    snapshot?.currentScore
  );

  const participation =
    snapshot?.participation || {};

  const hasFollowUps =
    Number(participation.matchedParticipants || 0) > 0;

  const opening = hasFollowUps
    ? `Root has established the organisation's current wellbeing picture. The current Workforce Wellbeing Index is ${index}.`
    : `Root has established the organisation's initial wellbeing baseline. The current Workforce Wellbeing Index is ${index}.`;

  const concernLine = Number.isFinite(
    Number(highRiskValue)
  )
    ? `${highRiskLabel} is currently the highest measured difficulty at ${formatDifficulty(
        highRiskValue
      )}.`
    : `${highRiskLabel} is currently the strongest area for organisational attention.`;

  const themeLine =
    theme !== "No challenge data yet"
      ? `${theme} is the most visible anonymous workforce theme.`
      : "Anonymous theme data is still developing.";

  return `${opening} ${concernLine} ${themeLine}`;
}

function getEvidenceNote(snapshot) {
  const stageTitle = cleanText(
    snapshot?.analysisStage?.title,
    "Evidence developing"
  );

  const stageDescription = cleanText(
    snapshot?.analysisStage?.description,
    "Root is continuing to build a reliable organisation-level picture."
  );

  const confidence = cleanText(
    snapshot?.confidenceLabel,
    "Early Stage"
  );

  return `${stageTitle}. ${stageDescription} Current evidence confidence: ${confidence}.`;
}

function getParticipationLine(snapshot) {
  const participation =
    snapshot?.participation || {};

  const invited = Number(
    participation.invited ??
      snapshot?.invited ??
      0
  );

  const joined = Number(
    participation.joined ??
      snapshot?.activated ??
      0
  );

  const baselines = Number(
    participation.baselineCompleted ??
      snapshot?.baselineCompleted ??
      0
  );

  const followUps = Number(
    participation.matchedParticipants ??
      0
  );

  return `${invited} employee${
    invited === 1 ? "" : "s"
  } invited, ${joined} joined, ${baselines} baseline${
    baselines === 1 ? "" : "s"
  } completed and ${followUps} matched follow-up${
    followUps === 1 ? "" : "s"
  } available.`;
}

function getManagerActions(
  snapshot,
  initiative
) {
  const actions = [
    `Introduce ${initiative.title} positively and without judgement.`,
    "Encourage participation without pressuring employees to disclose personal information.",
    "Make reasonable space for conversations about workload, energy, recovery and capacity.",
    "Remind employees that their personal Root activity remains private.",
  ];

  const focus = cleanText(
    snapshot?.recommendedFocus
  ).toLowerCase();

  const concern = cleanText(
    snapshot?.primaryConcern
  ).toLowerCase();

  if (
    focus.includes("workload") ||
    concern.includes("workplace")
  ) {
    actions.push(
      "Review whether priorities, deadlines and workload expectations are clear and realistic."
    );

    actions.push(
      "Notice repeated pressure signals and escalate structural concerns rather than treating them as individual weakness."
    );
  } else if (
    focus.includes("recovery") ||
    concern.includes("burnout")
  ) {
    actions.push(
      "Avoid rewarding overwork or treating exhaustion as evidence of commitment."
    );

    actions.push(
      "Encourage sustainable pacing, recovery time and early use of available support."
    );
  } else if (focus.includes("mood")) {
    actions.push(
      "Use calm, non-judgemental check-ins and signpost appropriate support when someone appears to be struggling."
    );
  } else if (focus.includes("focus")) {
    actions.push(
      "Reduce avoidable interruptions and clarify the most important priorities for the team."
    );
  } else {
    actions.push(
      "Lead by example by using the initiative and speaking openly about healthy working practices."
    );
  }

  return actions;
}

function getPosterFocusPoints(
  snapshot,
  initiative
) {
  const concern = cleanText(
    snapshot?.primaryConcern
  ).toLowerCase();

  const focus = cleanText(
    snapshot?.recommendedFocus
  ).toLowerCase();

  const points = [];

  if (concern.includes("mood")) {
    points.push(
      "Practical tools for emotional resilience."
    );
  } else if (concern.includes("burnout")) {
    points.push(
      "Earlier recognition of burnout and accumulated strain."
    );
  } else if (concern.includes("sleep")) {
    points.push(
      "Practical guidance for better sleep and recovery."
    );
  } else if (concern.includes("focus")) {
      points.push(
      "Practical strategies for improving focus and reducing overload."
    );
  } else if (concern.includes("stress")) {
      points.push(
      "Practical strategies for managing pressure more effectively."
    );
  } else {
      points.push(
      "Practical wellbeing guidance for everyday work."
    );
  }

  points.push(
    "Private Root check-ins and confidential wellbeing support."
  );

  points.push(
    `Live ${initiative.workshopTitle}.`
  );

  return points;
}

function buildEmployeeEmail({
  organisationName,
  initiative,
  snapshot,
}) {
  const currentPicture =
    getCurrentPicture(snapshot);

  const movement =
  snapshot?.movementSummary?.suppressed
    ? "Root has begun receiving follow-up check-ins. Movement trends will be reported once enough anonymous evidence is available to protect employee privacy."
    : getMovementLine(snapshot);

  return {
    title: `Employee email — ${initiative.title}`,

    subject: `Introducing ${initiative.title}`,

    content: `Subject: Introducing ${initiative.title}

Hello everyone,

As part of our commitment to employee wellbeing, we are introducing ${initiative.title}.

${initiative.introduction}

Why this initiative now?

Root reviews anonymous organisation-level patterns so that support can respond to what employees are experiencing now. ${currentPicture}

${movement}

What can you expect?

• Practical information connected to the current workforce picture.
• ${initiative.workshopTitle}.
• Opportunities to reflect, check in and use private support through Root Health.
• Clearer conversations about ${cleanText(
      snapshot?.recommendedFocus,
      initiative.reportFocus
     ).toLowerCase()} and encourage earlier support where people need it.

The aim is not to add another demand. It is to make support clearer, encourage earlier action and help create healthier conditions for sustainable performance.

Your privacy

Everything you share personally with Root remains private. ${organisationName} receives anonymous, aggregated organisational insight only and will never see your personal responses, reflections or conversations.

What we hope to achieve

${initiative.expectedOutcome}

Dates, joining details and any local arrangements will be shared by HR.

Thank you for taking part.

${organisationName}
In partnership with Root Health`,
  };
}

function buildManagerBriefing({
  organisationName,
  initiative,
  snapshot,
}) {
  const narrative =
    snapshot?.executiveNarrative || {};

  const managerActions =
    getManagerActions(
      snapshot,
      initiative
    );

  return {
    title: `Manager briefing — ${initiative.title}`,

    subject: `${initiative.title}: Manager briefing`,

    content: `${initiative.title}
Manager Briefing

Organisation
${organisationName}

Purpose

${initiative.introduction}

Current workforce picture

${cleanText(
  narrative.overview,
  getCurrentPicture(snapshot)
)}

What Root has detected

${cleanText(
  narrative.detected,
  getMovementLine(snapshot)
)}

Why this initiative has been recommended

${cleanText(
  narrative.recommendationReason,
  initiative.reason
)}

Root's current interpretation

${cleanText(
  snapshot?.rootHypothesis,
  initiative.reason
)}

What managers need to know

This initiative supports wellbeing and sustainable performance. It is not a process for identifying, diagnosing or assessing individual employees.

Managers will not receive access to personal Root conversations, individual wellbeing scores or private employee information.

Your role

${list(managerActions)}

Suggested introduction to your team

“We are introducing ${initiative.title} because Root's anonymous organisational insight shows that ${cleanText(
      snapshot?.primaryConcern,
      "workforce wellbeing"
    ).toLowerCase()} deserves attention. The aim is to provide practical support around ${cleanText(
      snapshot?.recommendedFocus,
      initiative.reportFocus
    ).toLowerCase()}. Anything you share personally with Root remains private.”

Workshop focus

${initiative.workshopTitle}

${initiative.workshopDescription}

What this initiative is designed to achieve

${cleanText(
  narrative.expectedOutcome,
  initiative.expectedOutcome
)}

What this initiative is not

• It is not a performance-management exercise.
• It is not a diagnostic or medical assessment.
• It does not give managers access to individual employee information.
• Participation must not be used to judge commitment or performance.
• Managers should not make assumptions about the cause of an employee's difficulty.

Evidence position

${getEvidenceNote(snapshot)}

Questions or concerns should be directed to the HR team.`,
  };
}

function buildLaunchPoster({
  organisationName,
  initiative,
  snapshot,
}) {
  const focusPoints =
    getPosterFocusPoints(
      snapshot,
      initiative
    );

  return {
    title: `Launch poster — ${initiative.title}`,

    subject: initiative.title,

    content: `${initiative.title}

A practical wellbeing initiative for everyone at ${organisationName}

WHY NOW?

${initiative.reason}

CURRENT FOCUS

${cleanText(
  snapshot?.primaryConcern,
  "Workforce wellbeing"
)}

WHAT TO EXPECT

${list(focusPoints)}

FEATURED SESSION

${initiative.workshopTitle}

${initiative.workshopDescription}

THE AIM

${initiative.expectedOutcome}

YOUR PRIVACY MATTERS

Everything you share personally with Root belongs to you.

Your employer will never see your individual responses, conversations or personal wellbeing information.

Root provides anonymous, aggregated organisational insight to help create a healthier and more supportive workplace.

DATES & JOINING DETAILS

Add seminar dates, times, location or joining link here before distribution.

${organisationName}
In partnership with Root Health`,
  };
}

function buildLeadershipTalkingPoints({
  organisationName,
  initiative,
  snapshot,
}) {
  const narrative =
    snapshot?.executiveNarrative || {};

  const boardCase =
    snapshot?.boardCase || {};

  const decision =
    snapshot?.boardDecision || {};

  return {
    title: `Leadership talking points — ${initiative.title}`,

    subject: `${initiative.title}: Leadership talking points`,

    content: `${initiative.title}
Leadership Talking Points

Organisation
${organisationName}

1. Executive overview

${cleanText(
  narrative.overview,
  getCurrentPicture(snapshot)
)}

2. What the numbers suggest

${cleanText(
  narrative.numbersSuggest,
  getCurrentPicture(snapshot)
)}

3. What Root has detected

${cleanText(
  narrative.detected,
  getMovementLine(snapshot)
)}

4. What this may mean

${cleanText(
  narrative.meaning,
  snapshot?.rootHypothesis ||
    initiative.reason
)}

5. Evidence and participation

${getParticipationLine(snapshot)}

${getEvidenceNote(snapshot)}

6. Organisational risk

${cleanText(
  boardCase.organisationalRisk,
  initiative.reason
)}

7. Recommended action

${cleanText(
  decision.recommendation,
  boardCase.recommendation ||
    narrative.recommendation ||
    initiative.reason
)}

Approval requested

${cleanText(
  decision.approvalRequest,
  boardCase.approvalRequest ||
    `Approve the preparation and launch of ${initiative.title}.`
)}

8. Expected organisational benefit

${cleanText(
  decision.expectedBenefit,
  boardCase.expectedBenefit ||
    initiative.expectedOutcome
)}

9. Business impact

${cleanText(
  narrative.businessImpact,
  boardCase.costOfInaction
)}

10. Success measures

${list(
  decision.successCriteria ||
    boardCase.successCriteria ||
    narrative.successMeasures || [
      initiative.expectedOutcome,
    ]
)}

11. Questions for the next review

${list(
  decision.reviewQuestions ||
    boardCase.reviewQuestions ||
    snapshot?.executiveQuestions ||
    []
)}

12. Suggested leadership statement

“Employee wellbeing and sustainable performance are organisational responsibilities. ${initiative.title} gives us a practical opportunity to respond to the current evidence, provide targeted support and review whether that action produces measurable improvement.”

13. Privacy position

Leadership and managers will not receive access to individual Root responses, private conversations or personal employee wellbeing information. All organisational reporting remains anonymous and aggregated.`,
  };
}

export function buildLaunchMaterial({
  type,
  organisation,
  initiative,
  snapshot,
}) {
  const organisationName =
    getOrganisationName(organisation);

  const safeInitiative =
    getInitiative(
      initiative ||
        snapshot?.initiative
    );

  const context = {
    organisationName,
    initiative: safeInitiative,
    snapshot: snapshot || {},
  };

  if (type === "manager-briefing") {
    return buildManagerBriefing(
      context
    );
  }

  if (type === "launch-poster") {
    return buildLaunchPoster(
      context
    );
  }

  if (
    type ===
    "leadership-talking-points"
  ) {
    return buildLeadershipTalkingPoints(
      context
    );
  }

  return buildEmployeeEmail(
    context
  );
}
