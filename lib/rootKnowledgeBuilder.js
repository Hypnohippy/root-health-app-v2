import { buildLongitudinalMemory } from "./rootLongitudinalEngine";
import { buildRootReflection } from "./rootReflectionEngine";
import { buildRelationalMemory } from "./rootRelationalMemory";
import { buildRootMemoryService } from "./rootMemoryService";
import { buildDailyRhythm } from "./rootDailyRhythm";
import { buildProactiveCare } from "./rootProactiveCare";
import { buildPriorityFeed } from "./rootPriorityFeed";

import {
  buildInterventionEvidence,
  chooseIntervention,
} from "./rootInterventionEngine";

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
}) {
  const total =
    bodySignals.length +
    journalEntries.length +
    mindEntries.length +
    assessments.length +
    coachSignals.length +
    voiceSessions.length +
    interventionOutcomes.length;

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
    });

  /*
   * The shared object deliberately retains the complete specialist
   * outputs. Pages can consume the relevant sections without rebuilding
   * the same knowledge independently.
   */
  return {
    version: 2,

    generatedAt:
      new Date().toISOString(),

    scope: "personal",

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
  };
}

export default buildRootKnowledge;