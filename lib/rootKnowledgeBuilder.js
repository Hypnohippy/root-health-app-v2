import { buildLongitudinalMemory } from "./rootLongitudinalEngine";
import { buildRootReflection } from "./rootReflectionEngine";
import { buildRelationalMemory } from "./rootRelationalMemory";
import { buildRootMemoryService } from "./rootMemoryService";
import { buildDailyRhythm } from "./rootDailyRhythm";
import { buildProactiveCare } from "./rootProactiveCare";
import { buildPriorityFeed } from "./rootPriorityFeed";

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
 * Creates a safe copy ordered newest first.
 *
 * The existing engines use index 0 as the latest entry and several of
 * them compare recent records using slice(), so ordering matters.
 */
function newestFirst(items = []) {
  return [...safeArray(items)].sort((a, b) => {
    const aTime = a?.created_at
      ? new Date(a.created_at).getTime()
      : 0;

    const bTime = b?.created_at
      ? new Date(b.created_at).getTime()
      : 0;

    const safeATime = Number.isNaN(aTime) ? 0 : aTime;
    const safeBTime = Number.isNaN(bTime) ? 0 : bTime;

    return safeBTime - safeATime;
  });
}

/**
 * Returns the first valid name supplied to Root.
 */
function cleanName(name) {
  return typeof name === "string" ? name.trim() : "";
}

/**
 * Finds the saved baseline assessment without interpreting its scores.
 *
 * Assessment interpretation remains outside the builder until its
 * research and product rules have been deliberately agreed.
 */
function findBaselineAssessment(assessments = []) {
  return (
    assessments.find(
      (assessment) =>
        assessment?.assessment_type === "baseline"
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
}) {
  const total =
    bodySignals.length +
    journalEntries.length +
    mindEntries.length +
    assessments.length +
    coachSignals.length +
    voiceSessions.length;

  return {
    counts: {
      bodySignals: bodySignals.length,
      journalEntries: journalEntries.length,
      mindEntries: mindEntries.length,
      assessments: assessments.length,
      coachSignals: coachSignals.length,
      voiceSessions: voiceSessions.length,
      total,
    },

    availableSources: {
      body: bodySignals.length > 0,
      journal: journalEntries.length > 0,
      mind: mindEntries.length > 0,
      assessments: assessments.length > 0,
      coach: coachSignals.length > 0,
      voice: voiceSessions.length > 0,
    },

    latest: {
      bodySignal: bodySignals[0] || null,
      journalEntry: journalEntries[0] || null,
      mindEntry: mindEntries[0] || null,
      assessment: assessments[0] || null,
      coachSignal: coachSignals[0] || null,
      voiceSession: voiceSessions[0] || null,
    },

    baselineAssessment:
      findBaselineAssessment(assessments),
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

  /*
   * 1. LONGITUDINAL
   *
   * What is repeating, changing or developing over time?
   */
  const longitudinal = buildLongitudinalMemory({
    bodySignals: orderedBodySignals,
    journalEntries: orderedJournalEntries,
    mindEntries: orderedMindEntries,
  });

  /*
   * 2. RELATIONAL MEMORY
   *
   * What relationships may exist across body, journal and mind evidence?
   */
  const relationalMemory = buildRelationalMemory({
    bodySignals: orderedBodySignals,
    journalEntries: orderedJournalEntries,
    mindEntries: orderedMindEntries,
  });

  /*
   * 3. MEMORY SERVICE
   *
   * What should Root recognise, remember or remain curious about?
   */
  const memory = buildRootMemoryService({
    name: safeName,
    bodySignals: orderedBodySignals,
    journalEntries: orderedJournalEntries,
    mindEntries: orderedMindEntries,
  });

  /*
   * 4. DAILY RHYTHM
   *
   * When do stronger body signals tend to appear?
   */
  const dailyRhythm = buildDailyRhythm({
    bodySignals: orderedBodySignals,
  });

  /*
   * 5. REFLECTION
   *
   * What should Root say now?
   *
   * The real Reflection Engine accepts longitudinal knowledge, so that
   * result is deliberately passed into it here.
   */
  const reflection = buildRootReflection({
    bodySignals: orderedBodySignals,
    journalEntries: orderedJournalEntries,
    mindEntries: orderedMindEntries,
    journey,
    longitudinal,
  });

  /*
   * 6. PROACTIVE CARE
   *
   * What support might be useful before the pattern grows louder?
   */
  const proactiveCare = buildProactiveCare({
    longitudinalMemory: longitudinal,
    relationalMemory,
  });

  /*
   * 7. PRIORITY FEED
   *
   * Which available message deserves attention first?
   */
  const priorityFeed = buildPriorityFeed({
    rootReflection: reflection,
    longitudinalMemory: longitudinal,
    relationalMemory,
    proactiveCare,
    dailyRhythm,
  });

  const evidence = buildEvidenceRecord({
    bodySignals: orderedBodySignals,
    journalEntries: orderedJournalEntries,
    mindEntries: orderedMindEntries,
    assessments: orderedAssessments,
    coachSignals: orderedCoachSignals,
    voiceSessions: orderedVoiceSessions,
  });

  /*
   * The shared object deliberately retains the complete specialist
   * outputs. Pages can consume the relevant sections without rebuilding
   * the same knowledge independently.
   */
  return {
    version: 1,

    generatedAt: new Date().toISOString(),

    scope: "personal",

    person: {
      name: safeName,
      firstName:
        safeName.split(" ")[0] || "",
    },

    evidence,

    understanding: {
      currentState: {
        nervousSystemLoad:
          longitudinal?.nervousSystemLoad || "unknown",

        trajectory:
          longitudinal?.trajectory || "building",

        strongestPeriod:
          dailyRhythm?.strongestPeriod || null,
      },

      patterns: {
        topBodyPattern:
          longitudinal?.topBodyPattern || null,

        topEmotionalTheme:
          longitudinal?.topEmotionalTheme || null,

        mostUsedTool:
          longitudinal?.mostUsedTool || null,

        bodyPatterns:
          longitudinal?.bodyPatterns || [],

        emotionalPatterns:
          longitudinal?.emotionalPatterns || [],

        toolPatterns:
          longitudinal?.toolPatterns || [],

        relationalMemories:
          relationalMemory?.memories || [],
      },

      trajectory: {
        direction:
          longitudinal?.trajectory || "building",

        headline:
          longitudinal?.trajectoryHeadline || "",

        reflection:
          longitudinal?.trajectoryReflection || "",
      },

      rhythm: {
        strongestPeriod:
          dailyRhythm?.strongestPeriod || null,

        averages:
          dailyRhythm?.averages || {},

        headline:
          dailyRhythm?.headline || "",

        reflection:
          dailyRhythm?.reflection || "",
      },

      mostImportantObservation:
        memory?.mostImportantObservation || null,
    },

    reflection,

    longitudinal,

    relationalMemory,

    memory,

    dailyRhythm,

    proactiveCare,

    priorityFeed,
  };
}

export default buildRootKnowledge;
