// Shared evidence definitions and worked examples, not a response router.
// Both Text and Realtime still reason directly over this contract.
export function buildCorporateEvidenceContract(workforce = {}, wellbeing = {}) {
  const definitions = {
    activeWorkforceCount: "Recorded active workforce people: employees/staff/workforce, not total company headcount unless completeness is established.",
    joinedCount: "Recorded active workforce people linked to an authenticated Root membership: joined/joined Root/authenticated workforce.",
    rootMembershipCount: "Root membership records in this organisation; not workforce size, invitation delivery or joined workforce.",
    invitationSentCount: "Active workforce invitation records whose current delivery_status is sent.",
    awaitingJoinCount: "Successfully sent invitations for active workforce people who have not joined.",
    notInvitedCount: "Active workforce people with no invitation record who have not joined; failed, unknown and sending records are not not-invited.",
    deliveryCounts: "Separate counts by current invitation delivery status; do not substitute these for join counts.",
  };
  const facts = Object.fromEntries(Object.entries(definitions).map(([field, definition]) => {
    const value = workforce?.[field];
    const known = field === "deliveryCounts"
      ? value !== null && typeof value === "object" && !Array.isArray(value)
      : Number.isSafeInteger(value) && value >= 0;
    return [field, { definition, value: known ? value : null, confidence: known ? "recorded fact" : "unknown",
      limitation: known ? null : `${field} was not supplied as a valid aggregate.` }];
  }));
  function difference(name, total, part, definition) {
    const a = facts[total].value, b = facts[part].value;
    const known = a !== null && b !== null && a >= b;
    facts[name] = { definition, value: known ? a - b : null, confidence: known ? "derived fact" : "unknown",
      calculation: `${total} - ${part}`, limitation: known ? null : "Required aggregates are missing or inconsistent; do not guess a cause." };
  }
  difference("notJoinedCount", "activeWorkforceCount", "joinedCount", "Recorded active workforce who have not joined, including those never invited; not the same as awaitingJoinCount.");
  difference("joinedAmongSentInvitations", "invitationSentCount", "awaitingJoinCount", "Joined people within the currently successfully sent invitation cohort only.");
  return {
    facts,
    evidenceAuthority: "Current authorised organisation evidence always overrides factual claims made by Root earlier in the conversation. Previous assistant dialogue is conversational memory, not authoritative organisational evidence. Correct conflicting earlier claims using the current supplied evidence; do not carry them forward as facts. Current means the authorised session snapshot, not an assumed live refresh.",
    participationAuthority: {
      hasRecordedRoster: workforce?.hasRecordedRoster === true,
      recordedRosterDenominator: workforce?.hasRecordedRoster === true ? facts.activeWorkforceCount.value : null,
      rule: "When hasRecordedRoster is true, participation calculations must use activeWorkforceCount as the recorded workforce denominator, never a legacy estimate or Root membership count. Unknown roster completeness does not permit replacing that denominator. A missing or zero denominator cannot support a percentage. Without a recorded roster, use only an explicitly supplied authorised denominator; do not recover one from earlier dialogue. Keep joining and wellbeing participation numerators distinct and identify the measured cohort.",
    },
    suppressionAuthority: "Never reconstruct, infer or calculate a suppressed contributor count from percentages, prior dialogue, totals, differences or other evidence. Fewer than 5 remains fewer than 5. Do not calculate or repeat an exact participation percentage when its contributor numerator is suppressed, even if an earlier assistant supplied a percentage or exact count.",
    longitudinalAuthority: "Baseline/current levels are not trends. Improving, worsening and other measured directional language require a released matched longitudinal change for that metric, with suppressed false, a numeric change and at least five valid matched contributors. Use the metric's scoring direction and measured cohort; zero change does not support improving or worsening. Suppressed or absent matched change cannot establish a trend, regardless of baseline levels or earlier assistant claims.",
    learningAuthority: "Organisation Learning observations may be described as reported/contextual evidence with attribution. They must not be presented as measured wellbeing change unless released matched measurement evidence independently supports that change. Keep reported observations separate from measured longitudinal findings.",
    rosterCompleteness: workforce?.completeness || "not supplied",
    factualConfidence: "A known count is exact for its defined recorded cohort. Unknown roster completeness limits whole-company claims, not the accuracy of the recorded count. Mention it only when material to the question.",
    identityDiscipline: "Roles, departments, teams and units are placement/access attributes, not evidence of duplicate people. Never invent multiple-role/unit duplication to qualify a count. Only discuss duplication when supplied evidence explicitly establishes it. joinedCount already counts authenticated workforce people, not role or unit assignments.",
    questionExamples: [
      { question: "How many employees do we have?", field: "activeWorkforceCount", scope: "recorded active workforce" },
      { question: "How many staff are recorded?", field: "activeWorkforceCount" },
      { question: "How many have joined?", field: "joinedCount", answerStyle: "State the joined count first: N recorded workforce people have joined Root. Stop unless a real, relevant qualification changes its meaning." },
      { question: "And how many people have actually joined?", field: "joinedCount" },
      { question: "How many haven't joined?", field: "notJoinedCount" },
      { question: "How many haven't been invited?", field: "notInvitedCount" },
      { question: "How many invitations have been sent?", field: "invitationSentCount" },
      { question: "And how many of those have joined?", antecedent: "recorded workforce", field: "joinedCount" },
      { question: "And how many of those have joined?", antecedent: "successfully sent invitations", field: "joinedAmongSentInvitations" },
      { question: "And how many of those have joined?", antecedent: "unclear or an unmeasured subgroup", field: null, answerStyle: "Clarify the cohort; do not substitute the whole roster or invent a subgroup count." },
      { question: "Is participation good?", answerStyle: "Identify joining versus wellbeing participation. State any supported rate with its actual numerator and denominator. A judgement of good needs a supplied target, benchmark or comparison; do not invent one." },
      { question: "Does this mean stress is getting worse?", answerStyle: "Use the stress metric's released matched change and contributor count. An increase supports worsening in that measured cohort, not automatically the whole company or a cause. Suppressed movement cannot establish a trend. Explain only the actual limitation." },
      { question: "Should we do something about it?", answerStyle: "Resolve the preceding signal, then synthesise Learning, workforce, participation and released wellbeing evidence. Recommend proportionate action when supported; do not always demand more data. Qualify limited evidence using actual confidence, coverage and contributor counts. A privacy release threshold alone proves neither representativeness nor a need to intervene." },
    ],
    wellbeingConfidence: wellbeing.confidence || {},
    wellbeingEvidenceReviewed: wellbeing.evidenceReviewed || {},
    metricCohorts: (wellbeing.observedEvidence || []).map(({ metric, contributors, suppressed }) => ({ metric, contributors, suppressed })),
    matchedMetricCohorts: (wellbeing.longitudinal || []).map(({ metric, contributors, suppressed }) => ({ metric, contributors, suppressed })),
  };
}
