import { loadPersonalRootEvidence } from "./personalEvidenceLoader.js";
import { buildRootKnowledge } from "./rootKnowledgeBuilder.js";
import { buildPersonalPresentationCandidates } from "./personalPresentationService.js";
import {
  buildInvestigationPresentationCandidate,
  buildPersonalInvestigationDiscovery,
} from "./personalInvestigationService.js";
import {
  deriveActivePersonalInvestigation,
  isPersonalInvestigationEvent,
} from "./personalInvestigationContinuity.js";

function records(envelope) {
  return Array.isArray(envelope?.records) ? envelope.records : [];
}

function currentBodyRecords(envelope) {
  return Array.isArray(envelope?.currentRecords)
    ? envelope.currentRecords
    : records(envelope);
}

export function selectLatestMeasuredIntervention(outcomes = []) {
  return (Array.isArray(outcomes) ? outcomes : []).find((outcome) =>
    outcome?.completed === true &&
    outcome?.before_score !== null &&
    outcome?.after_score !== null &&
    Number.isFinite(Number(outcome.before_score)) &&
    Number.isFinite(Number(outcome.after_score))
  ) || null;
}

function buildEvidenceWindow(evidence) {
  const allSources = {
    ...evidence?.source,
    playbook: evidence?.awareness?.playbook,
    voice: evidence?.awareness?.voice,
  };

  const timestamps = Object.values(allSources)
    .flatMap((source) => records(source))
    .map(
      (record) =>
        record?.completed_at ||
        record?.started_at ||
        record?.created_at ||
        record?.updated_at ||
        null
    )
    .filter(Boolean)
    .map((value) => new Date(value).getTime())
    .filter(Number.isFinite)
    .sort((first, second) => first - second);

  return {
    policy: "personal_evidence_policy_v1",
    loadedAt: evidence?.loadedAt || null,
    from: timestamps.length ? new Date(timestamps[0]).toISOString() : null,
    to: timestamps.length
      ? new Date(timestamps[timestamps.length - 1]).toISOString()
      : null,
    limits: Object.fromEntries(
      Object.entries(allSources).map(([key, value]) => [key, value?.limit ?? null])
    ),
    counts: Object.fromEntries(
      Object.entries(allSources).map(([key, value]) => [key, value?.count ?? null])
    ),
    truncatedSources: Object.entries(allSources)
      .filter(([, value]) => value?.truncated === true)
      .map(([key]) => key),
  };
}

function buildSourceRecordIds(evidence) {
  const allSources = {
    ...evidence?.source,
    playbook: evidence?.awareness?.playbook,
    voice: evidence?.awareness?.voice,
  };

  return Object.fromEntries(
    Object.entries(allSources).map(([key, value]) => [
      key,
      records(value).map((record) => record?.id).filter(Boolean),
    ])
  );
}

export function buildPersonalRootKnowledgeFromEvidence({
  evidence,
  journey = null,
  now = () => new Date(),
} = {}) {
  if (!evidence || evidence.scope !== "personal") {
    return {
      ok: false,
      reason: "personal_evidence_missing",
      knowledge: null,
      projections: null,
    };
  }

  const evidenceWindow = buildEvidenceWindow(evidence);
  const personalJournalEntries = records(evidence.source?.journalEntries).filter(
    (entry) => !isPersonalInvestigationEvent(entry)
  );
  const knowledge = buildRootKnowledge({
    name: evidence.profile?.record?.name || "",
    bodySignals: currentBodyRecords(evidence.source?.bodySignals),
    journalEntries: personalJournalEntries,
    mindEntries: records(evidence.source?.mindEntries),
    assessments: records(evidence.source?.assessments),
    voiceSessions: records(evidence.awareness?.voice),
    interventionOutcomes: records(evidence.source?.interventionOutcomes),
    playbookAwareness: records(evidence.awareness?.playbook),
    originalAssessmentBaseline:
      evidence.landmarks?.originalAssessmentBaseline || null,
    evidenceMetadata: {
      version: evidence.version,
      window: evidenceWindow,
      loadStatus: evidence.loadStatus,
      sourceRecordIds: buildSourceRecordIds(evidence),
    },
    journey,
  });

  const generatedAt = now().toISOString();
  const investigationContinuity = deriveActivePersonalInvestigation({
    journalEntries: [
      ...records(evidence.source?.investigationEvents),
      ...records(evidence.source?.journalEntries),
    ].filter(
      (entry, index, all) =>
        all.findIndex((candidate) => candidate?.id === entry?.id) === index
    ),
    evidence,
    assessmentKnowledge: knowledge.assessmentKnowledge,
  });
  const presentationEvidence = {
    ...evidence,
    source: {
      ...evidence.source,
      bodySignals: {
        ...evidence.source?.bodySignals,
        records: currentBodyRecords(evidence.source?.bodySignals),
      },
    },
  };
  const discovery = buildPersonalInvestigationDiscovery({
    knowledge,
    evidence: presentationEvidence,
    activeInvestigation: investigationContinuity.active,
  });
  const investigationCandidate = buildInvestigationPresentationCandidate(discovery);
  const presentationCandidates = buildPersonalPresentationCandidates({
    evidence: {
      ...presentationEvidence,
      source: {
        ...presentationEvidence.source,
        journalEntries: {
          ...evidence.source?.journalEntries,
          records: personalJournalEntries,
        },
      },
    },
    now: new Date(generatedAt),
  });
  if (investigationCandidate) presentationCandidates.unshift(investigationCandidate);
  const projections = {
    home: buildHomeKnowledgeProjection({ evidence, knowledge, generatedAt, presentationCandidates, discovery }),
    insights: buildInsightsKnowledgeProjection({ evidence, knowledge, generatedAt, presentationCandidates, discovery }),
    coach: buildCoachKnowledgeProjection({ evidence, knowledge, generatedAt, discovery }),
  };

  return {
    ok: true,
    reason: evidence.loadStatus?.partial ? "partially_loaded" : "loaded",
    evidence,
    knowledge,
    investigationContinuity,
    projections,
  };
}

function projectionProvenance(page, evidence, knowledge, generatedAt) {
  return {
    layer: "page_projection",
    page,
    generatedAt,
    sourceEvidenceVersion: evidence?.version || null,
    knowledgeEngine: knowledge?.provenance?.engine || null,
    knowledgeEngineVersion: knowledge?.provenance?.engineVersion || null,
    evidenceWindow: knowledge?.provenance?.evidenceWindow || null,
    partialEvidence: evidence?.loadStatus?.partial === true,
  };
}

export function buildHomeKnowledgeProjection({
  evidence,
  knowledge,
  generatedAt = new Date().toISOString(),
  presentationCandidates = [],
  discovery = null,
}) {
  return {
    identity: evidence.identity,
    profile: evidence.profile?.record || null,
    knowledge,
    latestAssessment: evidence.landmarks?.latestAssessment || null,
    originalAssessmentBaseline:
      evidence.landmarks?.originalAssessmentBaseline || null,
    recent: {
      bodySignals: currentBodyRecords(evidence.source?.bodySignals),
      mindEntries: records(evidence.source?.mindEntries),
      journalEntries: records(evidence.source?.journalEntries).filter(
        (entry) => !isPersonalInvestigationEvent(entry)
      ),
    },
    loadStatus: evidence.loadStatus,
    presentationCandidates,
    discovery,
    provenance: projectionProvenance("home", evidence, knowledge, generatedAt),
  };
}

export function buildInsightsKnowledgeProjection({
  evidence,
  knowledge,
  generatedAt = new Date().toISOString(),
  presentationCandidates = [],
  discovery = null,
}) {
  return {
    identity: evidence.identity,
    profile: evidence.profile?.record || null,
    knowledge,
    evidence: {
      bodySignals: currentBodyRecords(evidence.source?.bodySignals),
      mindEntries: records(evidence.source?.mindEntries),
      journalEntries: records(evidence.source?.journalEntries).filter(
        (entry) => !isPersonalInvestigationEvent(entry)
      ),
      assessments: records(evidence.source?.assessments),
      interventionOutcomes: records(evidence.source?.interventionOutcomes),
    },
    assessmentKnowledge: knowledge.assessmentKnowledge,
    interventionKnowledge: knowledge.interventionKnowledge,
    playbookKnowledge: knowledge.playbookKnowledge,
    loadStatus: evidence.loadStatus,
    presentationCandidates,
    discovery,
    provenance: projectionProvenance("insights", evidence, knowledge, generatedAt),
  };
}

function compactAssessmentContext(assessmentKnowledge) {
  const metrics = Array.isArray(assessmentKnowledge?.movement?.metrics)
    ? assessmentKnowledge.movement.metrics
    : [];
  const scores = (position) =>
    Object.fromEntries(
      metrics
        .filter((metric) => metric?.[position] !== null)
        .map((metric) => [metric.key, metric[position]])
    );

  return {
    baseline: assessmentKnowledge?.baseline
      ? {
          id: assessmentKnowledge.baseline.id || null,
          recordedAt: assessmentKnowledge.baseline.created_at || null,
          scores: scores("baseline"),
        }
      : null,
    latest: assessmentKnowledge?.latest
      ? {
          id: assessmentKnowledge.latest.id || null,
          recordedAt: assessmentKnowledge.latest.created_at || null,
          scores: scores("latest"),
        }
      : null,
    movement: assessmentKnowledge?.movement || null,
    repeatedHighSignals: assessmentKnowledge?.repeatedHighSignals || [],
    provenance: assessmentKnowledge?.provenance || null,
    fullHistoryIncluded: false,
  };
}

export function buildCoachKnowledgeProjection({
  evidence,
  knowledge,
  generatedAt = new Date().toISOString(),
  discovery = null,
}) {
  return {
    identity: evidence.identity,
    profile: evidence.profile?.record || null,
    person: knowledge.person,
    currentState: knowledge.understanding?.currentState || null,
    patterns: knowledge.understanding?.patterns || null,
    trajectory: knowledge.understanding?.trajectory || null,
    assessments: compactAssessmentContext(knowledge.assessmentKnowledge),
    playbook: {
      count: knowledge.playbookKnowledge?.count || 0,
      entries: knowledge.playbookKnowledge?.entries || [],
      contentIncluded: false,
    },
    interventions: knowledge.understanding?.interventions || null,
    interventionInsight: knowledge.memory?.interventionInsight || "",
    recentVoiceSummaries: records(evidence.awareness?.voice),
    discovery,
    activeInvestigation: discovery?.activeInvestigation || null,
    promptEvidence: {
      bodySignals: currentBodyRecords(evidence.source?.bodySignals).slice(0, 15),
      mindEntries: records(evidence.source?.mindEntries).slice(0, 5),
      journalEntries: records(evidence.source?.journalEntries)
        .filter((entry) => !isPersonalInvestigationEvent(entry))
        .slice(0, 5),
    },
    loadStatus: evidence.loadStatus,
    provenance: projectionProvenance("coach", evidence, knowledge, generatedAt),
  };
}

export async function loadPersonalRootKnowledge({
  client = null,
  policy,
  journey = null,
  now = () => new Date(),
} = {}) {
  const loadResult = await loadPersonalRootEvidence({ client, policy, now });

  if (!loadResult.ok) {
    return {
      ...loadResult,
      knowledge: null,
      projections: null,
    };
  }

  return buildPersonalRootKnowledgeFromEvidence({
    evidence: loadResult.evidence,
    journey,
    now,
  });
}

export default loadPersonalRootKnowledge;
