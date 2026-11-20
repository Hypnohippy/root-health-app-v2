import { getSupabaseServerKeyIfConfigured } from "./supabaseServerKey.server.js";
import { getSupabasePublicKeyIfConfigured } from "./supabasePublicKey.js";
import { createSupabaseKeyCompatibleClient as createClient } from "./supabaseKeyCompatibleClient.js";
import { loadWorkforceContext } from "./organisationWorkforceContext.js";
import { latestOrganisationReviews } from "./organisationLearningHistory.js";
import { buildOrganisationSnapshot, mapChallengeTheme } from "./rootOrganisationEngine.js";
import { authorizeProfessionalIntroducer } from "./professionalIntroducerDemoAuth.server.js";
import { isIntroducerDeployment } from "./introducerRestrictedActions.server.js";

const HR_ROLES = Object.freeze(["organisation_admin", "hr_admin"]);
const PRIVATE_RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Authorization",
};

function json(data, status) {
  return Response.json(data, { status, headers: PRIVATE_RESPONSE_HEADERS });
}

function bearerToken(request) {
  const value = request?.headers?.get?.("authorization") || "";
  return value.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || "";
}

function defaultAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = getSupabaseServerKeyIfConfigured();
  if (!url || !key) throw new Error("The private organisation data service is not configured.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function defaultUserClient(accessToken) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = getSupabasePublicKeyIfConfigured();
  if (!url || !key) throw new Error("The organisation context service is not configured.");
  return createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function rows(query, label) {
  const { data, error } = await query;
  if (error) throw new Error(`Could not load authorised ${label}.`);
  return Array.isArray(data) ? data : [];
}

async function one(query, label) {
  const { data, error } = await query;
  if (error) throw new Error(`Could not load authorised ${label}.`);
  return data || null;
}

function demoWorkforceContext(organisationId, members, units) {
  const roster = (members || []).filter((member) => member.role === "employee");
  const activeUnits = (units || []).filter((unit) => unit.active !== false);
  const byUnit = new Map();
  for (const member of roster) {
    if (member.organisation_unit_id) byUnit.set(member.organisation_unit_id, (byUnit.get(member.organisation_unit_id) || 0) + 1);
  }
  return {
    organisationId,
    hasRecordedRoster: roster.length > 0,
    source: "fictional_demo_roster",
    completeness: "fictional demo roster",
    activeWorkforceCount: roster.length,
    linkedMembershipCount: roster.length,
    joinedCount: roster.filter((member) => Boolean(member.activated_at)).length,
    invitationSentCount: null,
    awaitingJoinCount: null,
    notInvitedCount: null,
    deliveryCounts: null,
    rootMembershipCount: (members || []).length,
    authenticatedMembershipCount: (members || []).filter((member) => Boolean(member.user_id)).length,
    unitCount: activeUnits.length,
    unplacedCount: roster.filter((member) => !member.organisation_unit_id).length,
    units: activeUnits.map((unit) => ({
      unitId: unit.id,
      activeWorkforceCount: byUnit.get(unit.id) || 0,
    })),
  };
}

function thresholdedCategories(records, field, minimum, mapValue = (value) => value) {
  const categories = new Map();
  for (const row of records || []) {
    const raw = String(row?.[field] || "").trim();
    const profile = String(row?.profile_key || "").trim();
    if (!raw || !profile) continue;
    if (raw.toLowerCase() === "unclear emotional meaning" || raw.toLowerCase() === "emotional check-in") continue;
    const category = mapValue(raw);
    if (!category) continue;
    const group = categories.get(category) || { records: 0, profiles: new Set() };
    group.records += 1;
    group.profiles.add(profile);
    categories.set(category, group);
  }
  return [...categories.entries()]
    .filter(([, group]) => group.profiles.size >= minimum)
    .map(([category, group]) => [category, group.records])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
}

/**
 * Release only the existing Root aggregate model. Never serialize source assessment,
 * journal, mind, voice, or profile-key rows to an employer browser.
 */
export function protectOrganisationSnapshot(snapshot, mindEntries = [], { supportParticipants = 0 } = {}) {
  const minimum = Math.max(5, Number(snapshot?.privacyMinimum) || 5);
  const participation = snapshot?.participation || {};
  const baselineSuppressed = snapshot?.baselineSuppressed !== false || Number(participation.baselineCompleted || 0) < minimum;
  const outcomeSuppressed = snapshot?.outcomeSuppressed !== false || Number(participation.matchedParticipants || 0) < minimum;
  const themeCounts = baselineSuppressed
    ? []
    : thresholdedCategories(mindEntries, "thought_theme", minimum, mapChallengeTheme);
  const toolCounts = baselineSuppressed
    ? []
    : thresholdedCategories(mindEntries, "tool", minimum);
  const trendRows = baselineSuppressed
    ? []
    : (snapshot?.trendRows || []).filter((row) => Number(row?.participantCount) >= minimum);

  const metricResults = (snapshot?.metricResults || []).map((metric) => ({
    ...metric,
    start: baselineSuppressed ? null : metric.start,
    current: baselineSuppressed ? null : metric.current,
    change: outcomeSuppressed ? null : metric.change,
    matchedStart: outcomeSuppressed ? null : metric.matchedStart,
    matchedCurrent: outcomeSuppressed ? null : metric.matchedCurrent,
    matchedParticipantCount: outcomeSuppressed ? null : metric.matchedParticipantCount,
  }));

  const narrativeAllowed = !baselineSuppressed && !outcomeSuppressed;
  const safeParticipation = {
    invited: participation.invited ?? null,
    joined: participation.joined ?? null,
    baselineCompleted: participation.baselineCompleted ?? null,
    matchedParticipants: participation.matchedParticipants ?? null,
    baselineOnlyParticipants: participation.baselineOnlyParticipants ?? null,
    followUpCheckins: participation.followUpCheckins ?? null,
    totalAssessmentInteractions: participation.totalAssessmentInteractions ?? null,
    improvingCheckins: outcomeSuppressed ? null : participation.improvingCheckins,
    stableCheckins: outcomeSuppressed ? null : participation.stableCheckins,
    worseningCheckins: outcomeSuppressed ? null : participation.worseningCheckins,
    participationRate: participation.participationRate ?? null,
    baselineCompletionRate: participation.baselineCompletionRate ?? null,
    followUpRate: outcomeSuppressed ? null : participation.followUpRate,
    improvedParticipants: outcomeSuppressed ? null : participation.improvedParticipants,
    stableParticipants: outcomeSuppressed ? null : participation.stableParticipants,
    worsenedParticipants: outcomeSuppressed ? null : participation.worsenedParticipants,
    departmentsRepresented: participation.departmentsRepresented ?? null,
    participantOutcomesSuppressed: outcomeSuppressed || participation.participantOutcomesSuppressed === true,
    checkinOutcomesSuppressed: outcomeSuppressed || participation.checkinOutcomesSuppressed === true,
    privacyMinimum: minimum,
    outcomeSuppressed,
  };

  const allowed = [
    "organisationLearning", "invited", "activated", "baselineCompleted", "engagementScore",
    "workforceParticipation", "privacyMinimum", "baselineSuppressed", "outcomeSuppressed",
    "baselineScore", "currentScore", "mostImproved", "watchArea", "highRiskMetric",
    "movementSummary", "mostCommonTheme", "mappedChallengeCounts", "primaryConcern",
    "recommendedFocus", "confidenceScore", "confidenceLabel", "executiveStatus", "initiative",
    "nextReviewFocus", "workforceNarrative", "executiveEvidence", "organisationMemory",
    "executiveQuestions", "rootHypothesis", "recommendedInsight", "confidenceReasons", "boardCase",
    "boardDecision", "analysisStage", "executiveNarrative", "communication",
  ];
  const safe = Object.fromEntries(allowed.map((key) => [key, snapshot?.[key]]));
  safe.baselineSuppressed = baselineSuppressed;
  safe.outcomeSuppressed = outcomeSuppressed;
  safe.participation = safeParticipation;
  safe.supportInteractions = baselineSuppressed || supportParticipants < minimum ? null : snapshot?.supportInteractions ?? null;
  safe.baselineScore = baselineSuppressed ? null : snapshot?.baselineScore ?? null;
  safe.currentScore = baselineSuppressed ? null : snapshot?.currentScore ?? null;
  safe.metricResults = metricResults;
  safe.trendRows = trendRows;
  safe.assessmentStages = trendRows.map((row) => ({
    assessment_type: row.label === "Baseline" ? "baseline" : "checkin",
    stress_score: row.stress,
    burnout_score: row.burnout,
    sleep_score: row.sleep,
    recovery_score: row.recovery,
    participantCount: row.participantCount,
  }));
  safe.mostImproved = narrativeAllowed ? snapshot?.mostImproved ?? null : null;
  safe.watchArea = narrativeAllowed ? snapshot?.watchArea ?? null : null;
  safe.highRiskMetric = narrativeAllowed ? snapshot?.highRiskMetric ?? null : null;
  safe.movementSummary = narrativeAllowed ? snapshot?.movementSummary ?? null : null;
  safe.mappedChallengeCounts = themeCounts;
  safe.mostCommonTheme = themeCounts[0]?.[0] || (baselineSuppressed ? "Protected until the anonymity threshold is reached" : "No sufficiently represented theme yet");
  safe.primaryConcern = baselineSuppressed ? "Awaiting anonymous workforce baseline" : snapshot?.primaryConcern;
  safe.recommendedFocus = baselineSuppressed ? "Increase baseline participation" : snapshot?.recommendedFocus;
  safe.confidenceScore = baselineSuppressed ? null : snapshot?.confidenceScore ?? null;
  safe.confidenceLabel = baselineSuppressed ? "Evidence Protected" : snapshot?.confidenceLabel;
  for (const key of ["initiative", "nextReviewFocus", "workforceNarrative", "organisationMemory", "executiveQuestions", "rootHypothesis", "recommendedInsight", "confidenceReasons", "boardCase", "boardDecision", "analysisStage", "executiveNarrative", "communication"]) {
    if (!narrativeAllowed) safe[key] = null;
  }
  if (!narrativeAllowed) {
    safe.initiative = {
      key: "participation",
      title: "Build a reliable workforce picture",
      introduction: "Encourage broad participation before drawing conclusions from workforce evidence.",
      reason: "Root applies an anonymity threshold before releasing employee-derived insights.",
      status: "Evidence protected",
      expectedOutcome: "A sufficiently represented workforce baseline can support privacy-protected insight.",
      workshopTitle: "Workforce participation",
      workshopDescription: "Review participation and privacy readiness with your organisation.",
    };
    safe.nextReviewFocus = ["Increase broad participation", `Reach at least ${minimum} baseline participants`];
    safe.workforceNarrative = {
      insight: "Workforce wellbeing evidence remains protected until participation meets the privacy threshold.",
      executiveSummary: "No employee-level evidence is available in this view.",
      watchAreas: [], learning: [], support: [],
    };
    safe.executiveStatus = { dot: "○", label: "Evidence protected", detail: "Aggregate findings will appear when the privacy threshold is met." };
    safe.organisationMemory = [];
    safe.executiveQuestions = [];
    safe.confidenceReasons = [];
  }
  return { snapshot: safe, themeCounts, toolCounts };
}

export async function handleOrganisationInsights(request, dependencies = {}) {
  const token = bearerToken(request);
  if (!token) return json({ error: "Authentication is required." }, 401);
  const requestedOrganisationId = new URL(request.url).searchParams.get("organisationId")?.trim();
  const includeMembers = new URL(request.url).searchParams.get("includeMembers") === "true";
  if (!requestedOrganisationId || requestedOrganisationId.length > 100) return json({ error: "An authorised organisation is required." }, 400);

  let admin;
  try {
    admin = (dependencies.createAdminClient || defaultAdminClient)();
  } catch {
    return json({ error: "Organisation insights are temporarily unavailable." }, 503);
  }

  const { data: userData, error: authError } = await admin.auth.getUser(token);
  const user = userData?.user;
  if (authError || !user?.id) return json({ error: "Authentication is invalid." }, 401);

  const introducerMode = (dependencies.isIntroducerDeployment || isIntroducerDeployment)();
  let organisationId = requestedOrganisationId;
  if (introducerMode) {
    try {
      const access = await (dependencies.authorizeIntroducer || ((candidate) => authorizeProfessionalIntroducer({ request: candidate })))(request);
      if (access?.userId !== user.id || !access?.grant?.demoOrganisationId || access.grant.demoOrganisationId !== requestedOrganisationId) {
        return json({ error: "This account cannot access that fictional employer." }, 403);
      }
      organisationId = access.grant.demoOrganisationId;
    } catch (error) {
      const status = Number.isInteger(error?.status) ? error.status : 403;
      return json({ error: status === 403 ? "This account cannot access that fictional employer." : "Demo sign-in is unavailable." }, status);
    }
  } else {
    const membership = await one(
      admin.from("organisation_members").select("id, organisation_id, user_id, organisation_unit_id, name, email, role, department, activated_at, created_at")
        .eq("user_id", user.id).eq("organisation_id", organisationId).in("role", HR_ROLES).limit(1).maybeSingle(),
      "HR membership",
    ).catch(() => null);
    if (!membership || membership.user_id !== user.id || membership.organisation_id !== organisationId || !HR_ROLES.includes(membership.role)) {
      return json({ error: "This account cannot access HR insights for that organisation." }, 403);
    }
  }

  try {
    const [organisation, members, units, assessments, mindEntries, journalEntries, voiceSessions, reviews] = await Promise.all([
      one(admin.from("organisations").select("*").eq("id", organisationId).maybeSingle(), "organisation"),
      rows(admin.from("organisation_members").select("id, organisation_id, organisation_unit_id, user_id, name, email, role, department, activated_at, created_at").eq("organisation_id", organisationId), "membership"),
      rows(admin.from("organisation_units").select("id, active").eq("organisation_id", organisationId), "organisation unit"),
      rows(admin.from("wellbeing_assessments").select("id, organisation_id, profile_key, assessment_type, created_at, stress_score, burnout_score, sleep_score, recovery_score, mood_score, focus_score").eq("organisation_id", organisationId).order("created_at", { ascending: true }), "assessment"),
      rows(admin.from("mind_entries").select("id, organisation_id, profile_key, thought_theme, tool, created_at").eq("organisation_id", organisationId), "mind"),
      rows(admin.from("journal_entries").select("id, organisation_id, profile_key, created_at").eq("organisation_id", organisationId), "journal"),
      rows(admin.from("voice_sessions").select("id, organisation_id, profile_key, created_at").eq("organisation_id", organisationId), "voice"),
      rows(latestOrganisationReviews(admin, organisationId), "organisation review"),
    ]);
    if (!organisation) return json({ error: "The authorised organisation could not be loaded." }, 404);

    let workforceContext;
    if (introducerMode) {
      workforceContext = demoWorkforceContext(organisationId, members, units);
    } else {
      const userClient = (dependencies.createUserClient || defaultUserClient)(token);
      workforceContext = await (dependencies.loadWorkforceContext || loadWorkforceContext)(userClient, organisationId);
    }
    if (workforceContext?.organisationId !== organisationId) return json({ error: "The authorised workforce context is unavailable." }, 403);
    const snapshotBuilder = dependencies.buildSnapshot || buildOrganisationSnapshot;
    const snapshot = snapshotBuilder({
      organisation: { ...organisation, workforceContext },
      members,
      assessments,
      mindEntries,
      journalEntries,
      voiceSessions,
      organisationReviews: reviews,
    });
    const supportParticipants = new Set([
      ...mindEntries,
      ...journalEntries,
      ...voiceSessions,
    ].map((row) => String(row?.profile_key || "").trim()).filter(Boolean)).size;
    const protectedResult = protectOrganisationSnapshot(snapshot, mindEntries, { supportParticipants });
    const safeMembers = members.map((member) => ({
      id: member.id,
      organisation_id: member.organisation_id,
      organisation_unit_id: member.organisation_unit_id ?? null,
      ...(introducerMode ? {} : { user_id: member.user_id ?? null, email: member.email ?? null }),
      name: member.name ?? null,
      role: member.role,
      department: member.department ?? null,
      activated_at: member.activated_at ?? null,
      created_at: member.created_at ?? null,
    }));
    return json({
      organisationId,
      organisation: { id: organisation.id, name: organisation.name ?? null },
      // Roster access is opt-in for the existing Org Insights directory view.
      // Other employer reports receive aggregate output only.
      ...(includeMembers ? { members: safeMembers } : {}),
      assessmentCount: protectedResult.snapshot.baselineSuppressed
        ? null
        : Number(protectedResult.snapshot.participation?.totalAssessmentInteractions) || 0,
      ...protectedResult,
    }, 200);
  } catch {
    return json({ error: "Root could not prepare privacy-protected organisation insights." }, 503);
  }
}
