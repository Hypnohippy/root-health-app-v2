function safeText(value) {
  return String(value || "")
    .trim();
}

function safeLower(value) {
  return safeText(value)
    .toLowerCase();
}

function safeArray(value) {
  return Array.isArray(value)
    ? value
    : [];
}

function percentageText(value) {
  if (
    value === null ||
    value === undefined ||
    Number.isNaN(Number(value))
  ) {
    return null;
  }

  return `${Math.round(Number(value))}%`;
}

function numberText(value) {
  if (
    value === null ||
    value === undefined ||
    Number.isNaN(Number(value))
  ) {
    return null;
  }

  return Number(value);
}

function findMetric(
  context,
  metricId
) {
  return (
    context
      ?.wellbeing
      ?.metrics
      ?.find(
        (metric) =>
          metric.id ===
          metricId
      ) ||
    null
  );
}

function detectConcern(
  statement = ""
) {
  const text =
    safeLower(statement);

  if (
    text.includes(
      "particip"
    ) ||
    text.includes(
      "assessment"
    ) ||
    text.includes(
      "response rate"
    ) ||
    text.includes(
      "engage"
    ) ||
    text.includes(
      "people didn't"
    ) ||
    text.includes(
      "people did not"
    )
  ) {
    return {
      type:
        "participation",

      metricId:
        null,
    };
  }

  if (
    text.includes(
      "burnout"
    )
  ) {
    return {
      type:
        "metric",

      metricId:
        "burnout",
    };
  }

  if (
    text.includes(
      "stress"
    )
  ) {
    return {
      type:
        "metric",

      metricId:
        "stress",
    };
  }

  if (
    text.includes(
      "sleep"
    )
  ) {
    return {
      type:
        "metric",

      metricId:
        "sleep",
    };
  }

  if (
    text.includes(
      "recovery"
    )
  ) {
    return {
      type:
        "metric",

      metricId:
        "recovery",
    };
  }

  if (
    text.includes(
      "mood"
    )
  ) {
    return {
      type:
        "metric",

      metricId:
        "mood",
    };
  }

  if (
    text.includes(
      "focus"
    )
  ) {
    return {
      type:
        "metric",

      metricId:
        "focus",
    };
  }

  if (
    text.includes(
      "price"
    ) ||
    text.includes(
      "cost"
    ) ||
    text.includes(
      "expensive"
    ) ||
    text.includes(
      "budget"
    )
  ) {
    return {
      type:
        "cost",

      metricId:
        null,
    };
  }

  if (
    text.includes(
      "privacy"
    ) ||
    text.includes(
      "confidential"
    ) ||
    text.includes(
      "personal data"
    )
  ) {
    return {
      type:
        "privacy",

      metricId:
        null,
    };
  }

  if (
    text.includes(
      "trust"
    )
  ) {
    return {
      type:
        "trust",

      metricId:
        null,
    };
  }

  if (
    text.includes(
      "manager"
    )
  ) {
    return {
      type:
        "managers",

      metricId:
        null,
    };
  }

  if (
    text.includes(
      "approval"
    ) ||
    text.includes(
      "board"
    ) ||
    text.includes(
      "sign off"
    ) ||
    text.includes(
      "sign-off"
    ) ||
    text.includes(
      "boss"
    )
  ) {
    return {
      type:
        "approval",

      metricId:
        null,
    };
  }

  if (
    text.includes(
      "wait"
    ) ||
    text.includes(
      "later"
    ) ||
    text.includes(
      "think about it"
    ) ||
    text.includes(
      "think about"
    )
  ) {
    return {
      type:
        "wait",

      metricId:
        null,
    };
  }

  if (
    text.includes(
      "worked"
    ) ||
    text.includes(
      "success"
    ) ||
    text.includes(
      "failed"
    ) ||
    text.includes(
      "failure"
    ) ||
    text.includes(
      "value"
    )
  ) {
    return {
      type:
        "value",

      metricId:
        null,
    };
  }

  return {
    type:
      "general",

    metricId:
      null,
  };
}

function buildParticipationReasoning(
  context,
  statement
) {
  const participation =
    context
      ?.participation ||
    {};

  const baseline =
    numberText(
      participation
        .baselineParticipants
    );

  const repeat =
    numberText(
      participation
        .repeatParticipants
    );

  const missing =
    numberText(
      participation
        .missingFollowUps
    );

  const repeatRate =
    percentageText(
      participation
        .repeatRateFromBaseline
    );

  const denominator =
    numberText(
      participation
        .workforceDenominator
    );

  const evidence = [];

  if (
    baseline !== null
  ) {
    evidence.push(
      `${baseline} employee${
        baseline === 1
          ? ""
          : "s"
      } established a baseline.`
    );
  }

  if (
    repeat !== null
  ) {
    evidence.push(
      `${repeat} currently contribute repeat assessment evidence.`
    );
  }

  if (
    repeatRate
  ) {
    evidence.push(
      `That represents ${repeatRate} of the original baseline group.`
    );
  }

  if (
    missing !== null &&
    missing > 0
  ) {
    evidence.push(
      `${missing} original baseline participant${
        missing === 1
          ? " is"
          : "s are"
      } not yet represented in the repeat comparison.`
    );
  }

  if (
    denominator !== null
  ) {
    evidence.push(
      `The current workforce denominator available to Root is ${denominator}.`
    );
  }

  const interpretation =
    repeat === 0
      ? "Root has a starting position but not yet evidence of change. It would be incorrect to call the programme successful or unsuccessful from baseline evidence alone."
      : participation
          ?.repeatRateFromBaseline !==
            null &&
        participation
          .repeatRateFromBaseline <
          40
      ? "The current longitudinal evidence is informative but incomplete. Root should reduce confidence rather than treat missing follow-up evidence as programme failure."
      : participation
          ?.repeatRateFromBaseline !==
            null &&
        participation
          .repeatRateFromBaseline <
          70
      ? "Root can begin interpreting movement among repeat participants, but a stronger follow-up rate would make organisation-wide conclusions more defensible."
      : "Repeat participation is now strong enough to support a more useful longitudinal interpretation, although wider context and consistency still matter.";

  const notMeaning =
    repeat === 0
      ? "This does not mean nothing happened. It means Root cannot yet measure change responsibly."
      : "This does not mean the organisation improved, and it does not mean the programme failed. It means the confidence of any organisation-wide conclusion must match the strength of the repeat evidence.";

  const answer =
    baseline !== null &&
    repeat !== null
      ? `You are right to challenge participation. Root currently has ${baseline} baseline participant${
          baseline === 1
            ? ""
            : "s"
        } and ${repeat} with repeat evidence${
          repeatRate
            ? `, so ${repeatRate} of the original group is represented longitudinally`
            : ""
        }. That means I would not ask you to accept an organisation-wide success claim from the current evidence. But I would not describe the programme as having failed either. The more accurate conclusion is that Root has some longitudinal evidence, while confidence is still limited by the number of people who have returned.`
      : "You are right to question representation. Root should only make a conclusion that the available participation evidence can defend.";

  return {
    detectedConcern:
      "participation",

    originalStatement:
      statement,

    evidence,

    interpretation,

    doesNotMean:
      notMeaning,

    suggestedResponse:
      answer,

    questionBack:
      "What do you think most affected people returning for the follow-up — awareness, confidence in using Root, competing priorities, trust, or something else?",

    permission:
      "Would it be useful if I separated what the participation figures prove from what they do not yet prove?",

    commercialImplication:
      repeat !== null &&
      baseline !== null &&
      repeat < baseline
        ? "The clearest next opportunity is to strengthen repeat participation so the organisation's next decision rests on a larger longitudinal evidence base."
        : "Participation itself does not currently appear to be the main limitation.",

    confidence:
      context
        ?.rootIntelligence
        ?.confidenceLabel ||
      "Developing",

    supportingFacts: [
      baseline !== null
        ? {
            label:
              "Baseline participants",
            value:
              baseline,
          }
        : null,

      repeat !== null
        ? {
            label:
              "Repeat participants",
            value:
              repeat,
          }
        : null,

      repeatRate
        ? {
            label:
              "Repeat rate",
            value:
              repeatRate,
          }
        : null,

      missing !== null
        ? {
            label:
              "Missing follow-ups",
            value:
              missing,
          }
        : null,
    ].filter(Boolean),
  };
}

function buildMetricReasoning(
  context,
  statement,
  metricId
) {
  const metric =
    findMetric(
      context,
      metricId
    );

  if (!metric) {
    return buildGeneralReasoning(
      context,
      statement
    );
  }

  const participation =
    context
      ?.participation ||
    {};

  const repeatCount =
    numberText(
      metric.repeatCount
    );

  const improved =
    numberText(
      metric.repeatImproved
    );

  const worsened =
    numberText(
      metric.repeatWorsened
    );

  const unchanged =
    numberText(
      metric.repeatUnchanged
    );

  const improvedRate =
    percentageText(
      metric.repeatImprovedRate
    );

  const start =
    numberText(
      metric.repeatStartAverage
    );

  const current =
    numberText(
      metric.repeatCurrentAverage
    );

  const movement =
    numberText(
      metric.repeatMovement
    );

  const baselineParticipants =
    numberText(
      participation
        .baselineParticipants
    );

  const missingFollowUps =
    numberText(
      participation
        .missingFollowUps
    );

  const evidence = [];

  if (
    repeatCount !== null
  ) {
    evidence.push(
      `${repeatCount} repeat participant${
        repeatCount === 1
          ? ""
          : "s"
      } currently contribute to the ${metric.label.toLowerCase()} longitudinal comparison.`
    );
  }

  if (
    improved !== null &&
    worsened !== null &&
    unchanged !== null
  ) {
    evidence.push(
      `${improved} improved, ${worsened} worsened and ${unchanged} remained unchanged among repeat participants.`
    );
  }

  if (
    improvedRate
  ) {
    evidence.push(
      `${improvedRate} of the current repeat ${metric.label.toLowerCase()} group improved.`
    );
  }

  if (
    start !== null &&
    current !== null
  ) {
    evidence.push(
      `The repeat-participant average moved from ${start.toFixed(
        1
      )} to ${current.toFixed(
        1
      )}.`
    );
  }

  if (
    baselineParticipants !==
      null &&
    repeatCount !== null &&
    baselineParticipants >
      repeatCount
  ) {
    evidence.push(
      `${baselineParticipants - repeatCount} baseline participant${
        baselineParticipants -
          repeatCount ===
        1
          ? " is"
          : "s are"
      } not currently represented in this repeat metric comparison.`
    );
  }

  const direction =
    metric.direction;

  let interpretation;

  if (
    repeatCount === 0
  ) {
    interpretation =
      `Root does not currently have repeat ${metric.label.toLowerCase()} evidence, so change cannot be measured responsibly.`;
  } else if (
    direction ===
    "improving"
  ) {
    interpretation =
      `${metric.label} is showing a positive direction among current repeat participants. That is useful longitudinal evidence, but the strength of any organisation-wide claim still depends on repeat participation and wider evidence confidence.`;
  } else if (
    direction ===
    "worsening"
  ) {
    interpretation =
      `${metric.label} is worsening among current repeat participants. Root should treat that as a genuine area for attention while still checking organisational context before deciding why the change occurred.`;
  } else if (
    direction ===
    "stable"
  ) {
    interpretation =
      `${metric.label} is broadly stable among the current repeat group. Stability is not the same as proof that nothing changed elsewhere in the organisation, particularly if repeat participation is incomplete.`;
  } else {
    interpretation =
      `Root does not yet have sufficient longitudinal ${metric.label.toLowerCase()} evidence for a strong change conclusion.`;
  }

  const doesNotMean =
    direction ===
    "improving"
      ? `This does not yet prove that the whole workforce improved on ${metric.label.toLowerCase()}.`
      : direction ===
        "worsening"
      ? `This does not prove Root caused the deterioration, or that the pattern is organisation-wide.`
      : direction ===
        "stable"
      ? `This does not automatically mean the programme had no effect.`
      : `This does not support a success or failure claim yet.`;

  let suggestedResponse;

  if (
    repeatCount > 0 &&
    baselineParticipants !==
      null &&
    repeatCount <
      baselineParticipants
  ) {
    suggestedResponse =
      `I think you are right to challenge the ${metric.label.toLowerCase()} headline. The important thing is what sits underneath it. We currently have ${repeatCount} repeat participant${
        repeatCount === 1
          ? ""
          : "s"
      } contributing to this comparison from an original baseline group of ${baselineParticipants}. ${
        improved !== null &&
        improved > 0
          ? `${improved} of those repeat participants improved`
          : `The repeat group currently shows a ${direction} direction`
      }${
        improvedRate
          ? `, which is ${improvedRate} of the repeat group`
          : ""
      }. So I would not describe the current evidence as organisation-wide proof, but I also would not reduce it to the headline alone.`;
  } else if (
    repeatCount > 0
  ) {
    suggestedResponse =
      `The headline is worth challenging, but the more useful evidence is the repeat-participant movement underneath it. Root currently has ${repeatCount} repeat ${metric.label.toLowerCase()} participant${
        repeatCount === 1
          ? ""
          : "s"
      } and the direction is ${direction}. That is the evidence I would use rather than making a judgement from one headline percentage.`;
  } else {
    suggestedResponse =
      `I would be cautious about making a strong claim from the ${metric.label.toLowerCase()} figure at this stage. Root does not yet have enough repeat evidence to say confidently that the organisation improved or failed to improve.`;
  }

  const questionBack =
    direction ===
    "improving"
      ? `If we increased repeat participation and the same ${metric.label.toLowerCase()} direction remained, would that resolve the concern you have about the current headline?`
      : direction ===
        "worsening"
      ? `What was happening operationally during the period when ${metric.label.toLowerCase()} moved in the wrong direction?`
      : `Would your interpretation change if the repeat-participant evidence and the organisation-wide headline were telling slightly different stories?`;

  return {
    detectedConcern:
      metric.id,

    metric,

    originalStatement:
      statement,

    evidence,

    interpretation,

    doesNotMean,

    suggestedResponse,

    questionBack,

    permission:
      `Can I unpack the ${metric.label.toLowerCase()} number using your own repeat-participant evidence?`,

    commercialImplication:
      repeatCount > 0 &&
      baselineParticipants !==
        null &&
      repeatCount <
        baselineParticipants
        ? `The most useful next step is to increase repeat participation and test whether the current ${metric.label.toLowerCase()} direction survives a larger sample.`
        : `The next decision should be based on whether the current ${metric.label.toLowerCase()} direction is consistent with the wider Root evidence.`,

    confidence:
      context
        ?.rootIntelligence
        ?.confidenceLabel ||
      "Developing",

    supportingFacts: [
      repeatCount !== null
        ? {
            label:
              "Repeat participants",
            value:
              repeatCount,
          }
        : null,

      improved !== null
        ? {
            label:
              "Improved",
            value:
              improved,
          }
        : null,

      worsened !== null
        ? {
            label:
              "Worsened",
            value:
              worsened,
          }
        : null,

      unchanged !== null
        ? {
            label:
              "Unchanged",
            value:
              unchanged,
          }
        : null,

      improvedRate
        ? {
            label:
              "Improved rate",
            value:
              improvedRate,
          }
        : null,

      start !== null
        ? {
            label:
              "Repeat start average",
            value:
              start.toFixed(
                1
              ),
          }
        : null,

      current !== null
        ? {
            label:
              "Repeat current average",
            value:
              current.toFixed(
                1
              ),
          }
        : null,

      movement !== null
        ? {
            label:
              "Movement",
            value:
              movement > 0
                ? `+${movement.toFixed(
                    1
                  )}`
                : movement.toFixed(
                    1
                  ),
          }
        : null,

      missingFollowUps !==
        null
        ? {
            label:
              "Missing follow-ups",
            value:
              missingFollowUps,
          }
        : null,
    ].filter(Boolean),
  };
}

function buildCostReasoning(
  context,
  statement
) {
  const strongestPositive =
    context
      ?.meetingIntelligence
      ?.strongestDefensiblePositive;

  const confidence =
    context
      ?.rootIntelligence
      ?.confidenceLabel ||
    "Developing";

  const opportunities =
    safeArray(
      context
        ?.meetingIntelligence
        ?.commercialOpportunities
    );

  return {
    detectedConcern:
      "cost",

    originalStatement:
      statement,

    evidence: [
      strongestPositive ||
        "Root should only defend commercial value using evidence that the organisation has actually generated.",

      `Current evidence confidence is ${confidence}.`,

      opportunities[0]
        ?.reason ||
        "The next value discussion should be tied to the organisation's actual evidence and unresolved needs.",
    ],

    interpretation:
      "A cost objection may be about price, but it may also be about uncertainty, internal approval or whether the evidence is strong enough to defend the decision.",

    doesNotMean:
      "The word 'cost' does not automatically mean the subscription is unaffordable.",

    permission:
      "Can I ask one question before I try to answer the price point?",

    suggestedResponse:
      "I would rather understand what sits behind the cost concern than defend the number. If Root has not demonstrated enough value, that is one conversation. If the evidence is useful but difficult to justify internally, that is a different problem.",

    questionBack:
      "Is the concern the amount itself, or whether you feel you have enough evidence to justify continuing internally?",

    commercialImplication:
      "Do not close on price until the underlying objection has been identified.",

    confidence,

    supportingFacts: [],
  };
}

function buildPrivacyReasoning(
  context,
  statement
) {
  return {
    detectedConcern:
      "privacy",

    originalStatement:
      statement,

    evidence: [
      "Root's organisation layer is designed around anonymous organisational evidence rather than exposing private employee conversations or reflections.",

      "The individual support layer and organisation evidence layer have different purposes and visibility.",
    ],

    interpretation:
      "Privacy is a governance question, not an objection to talk past. The concern should be made specific before answering it.",

    doesNotMean:
      "A privacy concern does not automatically mean employees distrust Root.",

    permission:
      "Absolutely. Can I explain what the organisation can and cannot see?",

    suggestedResponse:
      "The employee side is private. Leadership receives organisation-level patterns and evidence rather than access to an individual's private reflections, conversations or personal wellbeing journey.",

    questionBack:
      "What particular information are you concerned the organisation might be able to see?",

    commercialImplication:
      "If the concern remains, offer a focused privacy and governance walkthrough rather than relying on reassurance.",

    confidence:
      "High",

    supportingFacts: [],
  };
}

function buildTrustReasoning(
  context,
  statement
) {
  const participation =
    context
      ?.participation ||
    {};

  return {
    detectedConcern:
      "trust",

    originalStatement:
      statement,

    evidence: [
      participation
        ?.repeatParticipants !==
        undefined
        ? `${participation.repeatParticipants} people currently contribute repeat assessment evidence.`
        : "Root has participation evidence but cannot infer motive from non-participation alone.",

      "Root does not record 'did not participate' as proof of distrust.",
    ],

    interpretation:
      "Trust could explain lower engagement, but awareness, timing, communication, confidence, workload and competing priorities could also explain it.",

    doesNotMean:
      "Low participation is not evidence that employees do not trust Root.",

    permission:
      "Would it be useful if we separated the engagement pattern from the possible reasons behind it?",

    suggestedResponse:
      "Trust may be part of the explanation, but I would not tell you that without evidence. What Root can show is the participation pattern. The reason behind that pattern still needs to be explored.",

    questionBack:
      "What were employees told about Root, anonymity and what their employer would be able to see?",

    commercialImplication:
      "If communication or understanding appears weak, a short trust and 'how Root works' session may be the most proportionate next step.",

    confidence:
      context
        ?.rootIntelligence
        ?.confidenceLabel ||
      "Developing",

    supportingFacts: [],
  };
}

function buildManagerReasoning(
  context,
  statement
) {
  const engagement =
    context
      ?.engagement ||
    {};

  return {
    detectedConcern:
      "managers",

    originalStatement:
      statement,

    evidence: [
      `${engagement.supportInteractions || 0} support interaction${
        engagement.supportInteractions ===
        1
          ? ""
          : "s"
      } are currently represented in Root's employee support evidence.`,

      context
        ?.rootIntelligence
        ?.primaryConcern
        ? `${context.rootIntelligence.primaryConcern} is currently Root's strongest organisational concern.`
        : "Manager engagement should be interpreted separately from employee wellbeing outcomes.",
    ],

    interpretation:
      "Manager adoption may affect communication and participation without proving that the employee programme itself failed.",

    doesNotMean:
      "Low manager engagement does not automatically invalidate employee evidence.",

    permission:
      "Can we separate manager adoption from employee outcomes for a moment?",

    suggestedResponse:
      "That is worth understanding. If managers were unclear about their role, the issue may be programme adoption rather than the usefulness of Root itself. I would want to know what managers were expected to do before deciding what their activity means.",

    questionBack:
      "How were managers introduced to Root, and what did the organisation expect from them during the pilot?",

    commercialImplication:
      "A manager briefing may be appropriate if manager understanding is limiting participation or implementation.",

    confidence:
      context
        ?.rootIntelligence
        ?.confidenceLabel ||
      "Developing",

    supportingFacts: [],
  };
}

function buildApprovalReasoning(
  context,
  statement
) {
  return {
    detectedConcern:
      "approval",

    originalStatement:
      statement,

    evidence: [
      context
        ?.meetingIntelligence
        ?.executiveHeadline
        ?.headline ||
        "Root has an executive evidence picture available for the decision.",

      context
        ?.meetingIntelligence
        ?.strongestDefensiblePositive ||
        "Root should present only the strongest defensible evidence to the next decision-maker.",
    ],

    interpretation:
      "The buyer may no longer need persuasion; they may need internal decision support.",

    doesNotMean:
      "Needing another person's approval is not the same as rejecting Root.",

    permission:
      "Would it help if we prepared for the conversation you now have to have internally?",

    suggestedResponse:
      "Rather than send you away with a generic brochure, I would rather make sure you have the evidence and interpretation the next decision-maker is likely to ask for.",

    questionBack:
      "Who needs to approve it, and what do you think their first challenge will be?",

    commercialImplication:
      "Prepare a concise executive decision record using this organisation's own evidence and today's unresolved questions.",

    confidence:
      context
        ?.rootIntelligence
        ?.confidenceLabel ||
      "Developing",

    supportingFacts: [],
  };
}

function buildWaitReasoning(
  context,
  statement
) {
  const warnings =
    safeArray(
      context
        ?.meetingIntelligence
        ?.evidenceWarnings
    );

  const genuinelyNeedsMoreEvidence =
    warnings.some(
      (warning) =>
        warning.severity ===
        "high"
    );

  return {
    detectedConcern:
      "wait",

    originalStatement:
      statement,

    evidence: warnings
      .slice(0, 3)
      .map(
        (warning) =>
          warning.text
      ),

    interpretation:
      genuinelyNeedsMoreEvidence
        ? "There are genuine evidence limitations, so waiting may be rational if the organisation agrees exactly what additional evidence it needs."
        : "The current evidence does not show an obvious reason that waiting alone would materially improve the decision.",

    doesNotMean:
      "Waiting only adds value if something specific will be measured, learned or resolved during that period.",

    permission:
      "Can I ask what you expect to know later that we do not know today?",

    suggestedResponse:
      genuinelyNeedsMoreEvidence
        ? "I can see a legitimate case for gathering more evidence. What I would avoid is simply moving the same decision into the future. If we wait, let's be precise about what additional evidence we expect to have."
        : "I am completely comfortable with waiting if it improves the decision. My question is what new evidence the waiting period is expected to produce.",

    questionBack:
      "What specific piece of evidence would make you comfortable making the decision?",

    commercialImplication:
      "If waiting is agreed, define the evidence threshold and next review date rather than leaving the decision open-ended.",

    confidence:
      context
        ?.rootIntelligence
        ?.confidenceLabel ||
      "Developing",

    supportingFacts: [],
  };
}

function buildValueReasoning(
  context,
  statement
) {
  const headline =
    context
      ?.meetingIntelligence
      ?.executiveHeadline;

  const positive =
    context
      ?.meetingIntelligence
      ?.strongestDefensiblePositive;

  const concern =
    context
      ?.meetingIntelligence
      ?.strongestDefensibleConcern;

  return {
    detectedConcern:
      "value",

    originalStatement:
      statement,

    evidence: [
      headline?.detail,

      positive,

      concern,
    ].filter(Boolean),

    interpretation:
      "Whether Root 'worked' should be judged from the complete evidence picture: participation, repeat movement, support engagement, organisational context and evidence confidence — not one isolated headline.",

    doesNotMean:
      "A mixed evidence picture does not equal failure, and a positive signal does not automatically equal proven organisation-wide success.",

    permission:
      "Can I answer that using the complete organisation picture rather than one score?",

    suggestedResponse:
      headline?.headline
        ? `The most accurate answer is: ${headline.headline} ${headline.detail || ""}`
        : "I would not give you a yes-or-no answer that the evidence cannot defend. Root's job is to tell you what changed, what remains uncertain and whether continuing is likely to improve the quality of the decision.",

    questionBack:
      "What evidence would you personally need to see before you would describe the pilot as successful?",

    commercialImplication:
      "Tie the continuation decision to the organisation's own definition of value and the evidence Root can currently defend.",

    confidence:
      context
        ?.rootIntelligence
        ?.confidenceLabel ||
      "Developing",

    supportingFacts: [],
  };
}

function buildGeneralReasoning(
  context,
  statement
) {
  const warnings =
    safeArray(
      context
        ?.meetingIntelligence
        ?.evidenceWarnings
    );

  const questions =
    safeArray(
      context
        ?.meetingIntelligence
        ?.likelyQuestions
    );

  const headline =
    context
      ?.meetingIntelligence
      ?.executiveHeadline;

  return {
    detectedConcern:
      "general",

    originalStatement:
      statement,

    evidence: [
      headline?.detail,

      ...warnings
        .slice(0, 2)
        .map(
          (warning) =>
            warning.text
        ),
    ].filter(Boolean),

    interpretation:
      "The Director's point does not map cleanly to one evidence category yet. Root should clarify the concern before trying to answer it.",

    doesNotMean:
      "Root should not force an unfamiliar concern into a canned objection category.",

    permission:
      "Can I make sure I understand exactly what worries you about that?",

    suggestedResponse:
      "I don't want to give you a polished answer to the wrong question. Let me make sure I understand what you mean first.",

    questionBack:
      questions[0]
        ?.question ||
      "What part of that matters most to your decision about continuing?",

    commercialImplication:
      "Clarify first. Reason second. Close only after the real concern is understood.",

    confidence:
      context
        ?.rootIntelligence
        ?.confidenceLabel ||
      "Developing",

    supportingFacts: [],
  };
}

function buildMeetingCloseFrame({
  context,
  history = [],
} = {}) {
  const items =
    safeArray(history);

  const unresolved =
    items.filter(
      (item) =>
        item?.resolved ===
        false
    );

  const resolved =
    items.filter(
      (item) =>
        item?.resolved ===
        true
    );

  const confidence =
    context
      ?.rootIntelligence
      ?.confidenceLabel ||
    "Developing";

  if (
    unresolved.length > 0
  ) {
    return {
      readyToClose:
        false,

      status:
        "unresolved",

      headline:
        "Do not close yet.",

      reason:
        `${unresolved.length} concern${
          unresolved.length ===
          1
            ? " remains"
            : "s remain"
        } unresolved.`,

      suggestedNextQuestion:
        unresolved[
          unresolved.length -
            1
        ]?.reasoning
          ?.questionBack ||
        "What still needs to be true before you would feel comfortable making the decision?",

      confidence,
    };
  }

  if (
    resolved.length === 0
  ) {
    return {
      readyToClose:
        false,

      status:
        "not_enough_conversation",

      headline:
        "The decision has not been earned yet.",

      reason:
        "Root has not recorded enough of the Director's concerns to frame a personalised close.",

      suggestedNextQuestion:
        "Before we decide what happens next, what is the one thing you would still want to be comfortable with?",

      confidence,
    };
  }

  const concernLabels =
    resolved
      .map(
        (item) =>
          item
            ?.reasoning
            ?.detectedConcern
      )
      .filter(Boolean);

  return {
    readyToClose:
      true,

    status:
      "ready",

    headline:
      "You have earned the right to ask.",

    reason:
      `${resolved.length} concern${
        resolved.length ===
        1
          ? " has"
          : "s have"
      } been explored and marked resolved.`,

    personalisedFrame:
      concernLabels.length
        ? `The conversation centred on ${concernLabels.join(
            ", "
          )}. Those concerns have been explored against the organisation's own evidence.`
        : "The Director's concerns have been explored against the organisation's own evidence.",

    suggestedClose:
      "From everything we've discussed, it sounds as though we've dealt with the concerns that were holding the decision back. Shall we continue?",

    silenceReminder:
      "The next person to speak takes the windows home.",

    confidence,
  };
}

export function buildRootExecutiveReasoning({
  context = null,
  statement = "",
  meetingHistory = [],
} = {}) {
  const safeStatement =
    safeText(statement);

  const detected =
    detectConcern(
      safeStatement
    );

  let reasoning;

  switch (
    detected.type
  ) {
    case "participation":
      reasoning =
        buildParticipationReasoning(
          context,
          safeStatement
        );
      break;

    case "metric":
      reasoning =
        buildMetricReasoning(
          context,
          safeStatement,
          detected.metricId
        );
      break;

    case "cost":
      reasoning =
        buildCostReasoning(
          context,
          safeStatement
        );
      break;

    case "privacy":
      reasoning =
        buildPrivacyReasoning(
          context,
          safeStatement
        );
      break;

    case "trust":
      reasoning =
        buildTrustReasoning(
          context,
          safeStatement
        );
      break;

    case "managers":
      reasoning =
        buildManagerReasoning(
          context,
          safeStatement
        );
      break;

    case "approval":
      reasoning =
        buildApprovalReasoning(
          context,
          safeStatement
        );
      break;

    case "wait":
      reasoning =
        buildWaitReasoning(
          context,
          safeStatement
        );
      break;

    case "value":
      reasoning =
        buildValueReasoning(
          context,
          safeStatement
        );
      break;

    default:
      reasoning =
        buildGeneralReasoning(
          context,
          safeStatement
        );
      break;
  }

  return {
    generatedAt:
      new Date()
        .toISOString(),

    reasoning,

    closeFrame:
      buildMeetingCloseFrame({
        context,
        history:
          meetingHistory,
      }),
  };
}

export function buildRootMeetingCloseFrame({
  context = null,
  meetingHistory = [],
} = {}) {
  return buildMeetingCloseFrame({
    context,
    history:
      meetingHistory,
  });
}
