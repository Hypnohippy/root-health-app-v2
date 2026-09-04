import { buildLongitudinalMemory } from "./rootLongitudinalEngine.js";
import { buildRootReflection } from "./rootReflectionEngine.js";
import { buildRelationalMemory } from "./rootRelationalMemory.js";
import { buildRootMemoryService } from "./rootMemoryService.js";
import { buildDailyRhythm } from "./rootDailyRhythm.js";
import { buildProactiveCare } from "./rootProactiveCare.js";
import { buildPriorityFeed } from "./rootPriorityFeed.js";
import { buildPersonalEvidenceAttribution } from "./personalEvidenceAttribution.js";

import {
  buildInterventionEvidence,
  chooseIntervention,
} from "./rootInterventionEngine.js";

const ASSESSMENT_METRICS = Object.freeze([
  { key: "stress", label: "Stress", fields: ["stress_score", "stress"] },
  { key: "sleep", label: "Sleep difficulty", fields: ["sleep_score", "sleep"] },
  { key: "recovery", label: "Recovery difficulty", fields: ["recovery_score", "recovery"] },
  { key: "energy", label: "Energy difficulty", fields: ["energy_score", "energy"] },
  { key: "mood", label: "Low mood", fields: ["mood_score", "mood"] },
  { key: "focus", label: "Focus difficulty", fields: ["focus_score", "focus"] },
  { key: "burnout", label: "Burnout", fields: ["burnout_score", "burnout"] },
]);

/**
 * Ensures every engine receives an array.
 *
 * The pages and database remain responsible for loading the evidence.
 * The Knowledge Builder only coordinates the evidence it is given.
 */
function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

/**
 * Returns the most meaningful available date for an evidence record.
 *
 * Intervention outcomes use started_at and completed_at, while Root's
 * other evidence sources generally use created_at.
 */
function getEvidenceTime(item) {
  if (!item || typeof item !== "object") {
    return 0;
  }

  const dateValue =
    item.completed_at ||
    item.started_at ||
    item.created_at ||
    item.updated_at ||
    null;

  if (!dateValue) {
    return 0;
  }

  const time = new Date(dateValue).getTime();

  return Number.isNaN(time) ? 0 : time;
}

/**
 * Creates a safe copy ordered newest first.
 *
 * The existing engines use index 0 as the latest entry and several of
 * them compare recent records using slice(), so ordering matters.
 */
function newestFirst(items = []) {
  return [...safeArray(items)].sort(
    (a, b) =>
      getEvidenceTime(b) -
      getEvidenceTime(a)
  );
}

/**
 * Returns the first valid name supplied to Root.
 */
function cleanName(name) {
  return typeof name === "string"
    ? name.trim()
    : "";
}

/**
 * Finds the saved baseline assessment without interpreting its scores.
 *
 * Assessment interpretation remains outside the builder until its
 * research and product rules have been deliberately agreed.
 */
function findBaselineAssessment(
  assessments = []
) {
  return (
    assessments.find(
      (assessment) =>
        assessment?.assessment_type ===
        "baseline"
    ) || null
  );
}

function readAssessmentScore(assessment, fields) {
  for (const field of fields) {
    const value = assessment?.[field];

    if (value !== null && value !== undefined && value !== "") {
      const number = Number(value);
      if (Number.isFinite(number)) return number;
    }
  }

  return null;
}

export function buildAssessmentKnowledge({
  assessments = [],
  originalBaseline = null,
  evidenceWindow = null,
} = {}) {
  const ordered = newestFirst(assessments);
  const baseline = originalBaseline || findBaselineAssessment(ordered);
  const latest = ordered[0] || null;
  const movementAvailable =
    Boolean(baseline && latest) &&
    (baseline?.id ? baseline.id !== latest?.id : ordered.length > 1);
  const metrics = ASSESSMENT_METRICS.map((definition) => {
    const baselineScore = readAssessmentScore(baseline, definition.fields);
    const latestScore = readAssessmentScore(latest, definition.fields);
    const change =
      movementAvailable && baselineScore !== null && latestScore !== null
        ? latestScore - baselineScore
        : null;

    return {
      key: definition.key,
      label: definition.label,
      baseline: baselineScore,
      latest: latestScore,
      change,
      direction:
        change === null
          ? "unknown"
          : change < 0
          ? "improving"
          : change > 0
          ? "worsening"
          : "unchanged",
    };
  });
  const comparable = metrics.filter((metric) => metric.change !== null);
  const averageChange = comparable.length
    ? Number(
        (
          comparable.reduce((sum, metric) => sum + metric.change, 0) /
          comparable.length
        ).toFixed(2)
      )
    : null;
  const repeatedHighSignals = ASSESSMENT_METRICS.map((definition) => {
    const occurrences = ordered.filter(
      (assessment) => readAssessmentScore(assessment, definition.fields) >= 7
    ).length;
    return occurrences >= 2
      ? { key: definition.key, label: definition.label, occurrences }
      : null;
  }).filter(Boolean);
  const sourceRecordIds = ordered.map((record) => record?.id).filter(Boolean);

  return {
    baseline,
    latest,
    movement: {
      available: movementAvailable,
      averageChange,
      direction:
        averageChange === null
          ? "unknown"
          : averageChange < 0
          ? "improving"
          : averageChange > 0
          ? "worsening"
          : "unchanged",
      metrics,
    },
    repeatedHighSignals,
    provenance: {
      origin: "derived_interpretation",
      engine: "rootKnowledgeBuilder",
      engineVersion: 3,
      sourceTypes: ["wellbeing_assessments"],
      sourceRecordIds,
      evidenceWindow,
      confidence:
        comparable.length >= 5 && ordered.length >= 2
          ? "developing"
          : ordered.length > 0
          ? "early"
          : "none",
    },
  };
}

function buildPlaybookKnowledge(entries = []) {
  const safeEntries = safeArray(entries).map((entry) => ({
    id: entry?.id || null,
    title: entry?.title || "",
    category: entry?.category || "",
    createdAt: entry?.created_at || null,
    updatedAt: entry?.updated_at || null,
    provenance: entry?.provenance || null,
  }));

  return {
    count: safeEntries.length,
    entries: safeEntries,
    categories: [...new Set(safeEntries.map((entry) => entry.category).filter(Boolean))],
    contentIncluded: false,
  };
}

/**
 * Creates a structured description of the evidence supplied to Root.
 *
 * Coach signals, voice sessions and assessments are preserved here,
 * but are not interpreted by specialist engines that do not yet accept
 * those sources.
 */
function buildEvidenceRecord({
  bodySignals,
  journalEntries,
  mindEntries,
  assessments,
  coachSignals,
  voiceSessions,
  interventionOutcomes,
  trackerSubmissions,
}) {
  const total =
    bodySignals.length +
    journalEntries.length +
    mindEntries.length +
    assessments.length +
    coachSignals.length +
    voiceSessions.length +
    interventionOutcomes.length +
    trackerSubmissions.length;

  return {
    counts: {
      bodySignals: bodySignals.length,
      journalEntries:
        journalEntries.length,
      mindEntries: mindEntries.length,
      assessments: assessments.length,
      coachSignals: coachSignals.length,
      voiceSessions: voiceSessions.length,
      interventionOutcomes:
        interventionOutcomes.length,
      trackerSubmissions: trackerSubmissions.length,
      total,
    },

    availableSources: {
      body: bodySignals.length > 0,
      journal:
        journalEntries.length > 0,
      mind: mindEntries.length > 0,
      assessments:
        assessments.length > 0,
      coach: coachSignals.length > 0,
      voice: voiceSessions.length > 0,
      interventions:
        interventionOutcomes.length > 0,
      trackers: trackerSubmissions.length > 0,
    },

    latest: {
      bodySignal:
        bodySignals[0] || null,

      journalEntry:
        journalEntries[0] || null,

      mindEntry:
        mindEntries[0] || null,

      assessment:
        assessments[0] || null,

      coachSignal:
        coachSignals[0] || null,

      voiceSession:
        voiceSessions[0] || null,

      interventionOutcome:
        interventionOutcomes[0] || null,
      trackerSubmission: trackerSubmissions[0] || null,
    },

    baselineAssessment:
      findBaselineAssessment(
        assessments
      ),
  };
}

/**
 * Builds one shared Root Knowledge Object.
 *
 * This function:
 * - performs no database queries;
 * - contains no React or interface logic;
 * - does not mutate the supplied arrays;
 * - does not invent diagnoses or research conclusions;
 * - coordinates the existing specialist engines;
 * - returns one understanding for pages and services to consume.
 */
export function buildRootKnowledge({
  name = "",

  bodySignals = [],

  journalEntries = [],

  mindEntries = [],

  assessments = [],

  coachSignals = [],

  voiceSessions = [],

  interventionOutcomes = [],

  playbookAwareness = [],

  trackerSubmissions = [],

  originalAssessmentBaseline = null,

  evidenceMetadata = null,

  availableInterventions = [],

  interventionTarget = null,

  interventionCategory = null,

  journey = null,
} = {}) {
  const safeName = cleanName(name);

  const orderedBodySignals =
    newestFirst(bodySignals);

  const orderedJournalEntries =
    newestFirst(journalEntries);

  const orderedMindEntries =
    newestFirst(mindEntries);

  const orderedAssessments =
    newestFirst(assessments);

  const orderedCoachSignals =
    newestFirst(coachSignals);

  const orderedVoiceSessions =
    newestFirst(voiceSessions);

  const orderedInterventionOutcomes =
    newestFirst(interventionOutcomes);

  const evidenceAttribution = buildPersonalEvidenceAttribution({
    bodySignals: orderedBodySignals,
    journalEntries: orderedJournalEntries,
    mindEntries: orderedMindEntries,
    assessments: orderedAssessments,
    interventionOutcomes: orderedInterventionOutcomes,
    voiceSessions: orderedVoiceSessions,
    playbookAwareness,
    trackerSubmissions,
  });

  const assessmentKnowledge = buildAssessmentKnowledge({
    assessments: orderedAssessments,
    originalBaseline: originalAssessmentBaseline,
    evidenceWindow: evidenceMetadata?.window || null,
  });

  const playbookKnowledge = buildPlaybookKnowledge(playbookAwareness);
  const trackerKnowledge = {
    totalSubmissions: trackerSubmissions.length,
    latest: newestFirst(trackerSubmissions).slice(0, 10).map((record) => ({ id: record.id, trackerId: record.tracker_id, answers: record.answers, createdAt: record.created_at, provenance: { table: "playbook_tracker_entries", sourceRecordId: record.id, origin: "source_record" } })),
    interpretation: trackerSubmissions.length > 1 ? "Repeated tracker observations are available for cautious comparison; they do not establish cause." : trackerSubmissions.length === 1 ? "One tracker observation is available. It is too early to infer a pattern." : "No tracker observations yet.",
  };

  /*
   * 1. LONGITUDINAL
   *
   * What is repeating, changing or developing over time?
   */
  const longitudinal =
    buildLongitudinalMemory({
      bodySignals:
        orderedBodySignals,

      journalEntries:
        orderedJournalEntries,

      mindEntries:
        orderedMindEntries,

      interventionOutcomes:
        orderedInterventionOutcomes,
      trackerSubmissions: newestFirst(trackerSubmissions),
    });

  /*
   * 2. RELATIONAL MEMORY
   *
   * What relationships may exist across body, journal and mind evidence?
   */
  const relationalMemory =
    buildRelationalMemory({
      bodySignals:
        orderedBodySignals,

      journalEntries:
        orderedJournalEntries,

      mindEntries:
        orderedMindEntries,
    });

  /*
   * 3. MEMORY SERVICE
   *
   * What should Root recognise, remember or remain curious about?
   */
  const memory =
    buildRootMemoryService({
      name: safeName,

      bodySignals:
        orderedBodySignals,

      journalEntries:
        orderedJournalEntries,

      mindEntries:
        orderedMindEntries,

      interventionOutcomes:
        orderedInterventionOutcomes,

      trackerSubmissions:
        newestFirst(trackerSubmissions),
    });

  /*
   * 4. DAILY RHYTHM
   *
   * When do stronger body signals tend to appear?
   */
  const dailyRhythm =
    buildDailyRhythm({
      bodySignals:
        orderedBodySignals,
    });

  /*
   * 5. REFLECTION
   *
   * What should Root say now?
   *
   * The real Reflection Engine accepts longitudinal knowledge, so that
   * result is deliberately passed into it here.
   */
  const reflection =
    buildRootReflection({
      bodySignals:
        orderedBodySignals,

      journalEntries:
        orderedJournalEntries,

      mindEntries:
        orderedMindEntries,

      journey,

      longitudinal,
    });

  /*
   * 6. PROACTIVE CARE
   *
   * What support might be useful before the pattern grows louder?
   */
  const proactiveCare =
    buildProactiveCare({
      longitudinalMemory:
        longitudinal,

      relationalMemory,
    });

  /*
   * 7. PRIORITY FEED
   *
   * Which available message deserves attention first?
   */
  const priorityFeed =
    buildPriorityFeed({
      rootReflection: reflection,

      longitudinalMemory:
        longitudinal,

      relationalMemory,

      proactiveCare,

      dailyRhythm,
    });

  /*
   * 8. INTERVENTION EVIDENCE
   *
   * What has happened when this person has used Root's interventions?
   *
   * This remains deterministic. The Knowledge Builder coordinates
   * the evidence supplied by the page but performs no database query.
   */
  const interventionEvidence =
    buildInterventionEvidence(
      orderedInterventionOutcomes
    );

  /*
   * 9. INTERVENTION RECOMMENDATION
   *
   * Which available intervention is best supported by the person's
   * own measured outcomes?
   *
   * Root remains honest when there is not yet enough evidence.
   */
  const interventionRecommendation =
    chooseIntervention({
      evidence:
        interventionEvidence,

      target:
        interventionTarget,

      category:
        interventionCategory,

      availableInterventions:
        safeArray(
          availableInterventions
        ),
    });

  /*
   * One shared intervention branch for every Root page to consume.
   */
  const interventionKnowledge = {
    evidence:
      interventionEvidence,

    recommendation:
      interventionRecommendation
        ?.recommendation || null,

    confidence:
      interventionRecommendation
        ?.confidence ||
      "insufficient_evidence",

    reason:
      interventionRecommendation
        ?.reason || "",

    summary: {
      totalStarted:
        interventionEvidence
          ?.totalStarted || 0,

      totalCompleted:
        interventionEvidence
          ?.totalCompleted || 0,

      totalIncomplete:
        interventionEvidence
          ?.totalIncomplete || 0,

      completionRate:
        interventionEvidence
          ?.completionRate || 0,

      evidenceAvailable:
        interventionEvidence
          ?.evidenceAvailable === true,
    },

    mostHelpful:
      interventionEvidence
        ?.mostHelpful || null,

    interventions:
      interventionEvidence
        ?.interventions || [],
  };

  const evidence =
    buildEvidenceRecord({
      bodySignals:
        orderedBodySignals,

      journalEntries:
        orderedJournalEntries,

      mindEntries:
        orderedMindEntries,

      assessments:
        orderedAssessments,

      coachSignals:
        orderedCoachSignals,

      voiceSessions:
        orderedVoiceSessions,

      interventionOutcomes:
        orderedInterventionOutcomes,

      trackerSubmissions:
        newestFirst(trackerSubmissions),
    });

  evidence.attribution = evidenceAttribution;

  /*
   * The shared object deliberately retains the complete specialist
   * outputs. Pages can consume the relevant sections without rebuilding
   * the same knowledge independently.
   */
  return {
    version: 3,

    generatedAt:
      new Date().toISOString(),

    scope: "personal",

    provenance: {
      layer: "derived_root_knowledge",
      engine: "rootKnowledgeBuilder",
      engineVersion: 3,
      generatedAt: new Date().toISOString(),
      sourceEvidenceVersion: evidenceMetadata?.version || null,
      evidenceWindow: evidenceMetadata?.window || null,
      loadStatus: evidenceMetadata?.loadStatus || null,
      sourceRecordIds: evidenceMetadata?.sourceRecordIds || null,
      sourceRecordsMutated: false,
    },

    person: {
      name: safeName,

      firstName:
        safeName.split(" ")[0] ||
        "",
    },

    evidence,

    understanding: {
      currentState: {
        nervousSystemLoad:
          longitudinal
            ?.nervousSystemLoad ||
          "unknown",

        trajectory:
          longitudinal
            ?.trajectory ||
          "building",

        strongestPeriod:
          dailyRhythm
            ?.strongestPeriod ||
          null,
      },

      patterns: {
        topBodyPattern:
          longitudinal
            ?.topBodyPattern ||
          null,

        topEmotionalTheme:
          longitudinal
            ?.topEmotionalTheme ||
          null,

        mostUsedTool:
          longitudinal
            ?.mostUsedTool ||
          null,

        bodyPatterns:
          longitudinal
            ?.bodyPatterns || [],

        emotionalPatterns:
          longitudinal
            ?.emotionalPatterns ||
          [],

        toolPatterns:
          longitudinal
            ?.toolPatterns || [],

        relationalMemories:
          relationalMemory
            ?.memories || [],
      },

      trajectory: {
        direction:
          longitudinal
            ?.trajectory ||
          "building",

        headline:
          longitudinal
            ?.trajectoryHeadline ||
          "",

        reflection:
          longitudinal
            ?.trajectoryReflection ||
          "",
      },

      rhythm: {
        strongestPeriod:
          dailyRhythm
            ?.strongestPeriod ||
          null,

        averages:
          dailyRhythm
            ?.averages || {},

        headline:
          dailyRhythm
            ?.headline || "",

        reflection:
          dailyRhythm
            ?.reflection || "",
      },

      interventions: {
        totalStarted:
          interventionKnowledge
            .summary
            .totalStarted,

        totalCompleted:
          interventionKnowledge
            .summary
            .totalCompleted,

        completionRate:
          interventionKnowledge
            .summary
            .completionRate,

        evidenceAvailable:
          interventionKnowledge
            .summary
            .evidenceAvailable,

        mostHelpful:
          interventionKnowledge
            .mostHelpful,

        recommendation:
          interventionKnowledge
            .recommendation,

        confidence:
          interventionKnowledge
            .confidence,

        reason:
          interventionKnowledge
            .reason,
      },

      assessments: assessmentKnowledge,

      playbook: playbookKnowledge,
      trackers: trackerKnowledge,

      mostImportantObservation:
        memory
          ?.mostImportantObservation ||
        null,
    },

    reflection,

    longitudinal,

    relationalMemory,

    memory,

    dailyRhythm,

    proactiveCare,

    priorityFeed,

    interventionKnowledge,

    assessmentKnowledge,

    playbookKnowledge,
    trackerKnowledge,
  };
}

export default buildRootKnowledge;
