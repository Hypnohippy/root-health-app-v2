/**
 * Root Core — Human Health Constructs
 *
 * Constructs are the specific aspects of life, health, wellbeing and
 * flourishing that Root can understand, support and, where appropriate,
 * measure over time.
 *
 * This file powers the scientific architecture beneath Root.
 * It must never dictate or medicalise the visible user experience.
 *
 * The user experiences:
 * - warm questions
 * - natural conversations
 * - useful reflection
 * - personal support
 *
 * Root Core stores:
 * - stable construct identities
 * - consistent definitions
 * - measurement direction
 * - research and reporting metadata
 *
 * Important:
 * - Permanent IDs must never be reused or renamed.
 * - Construct keys must remain stable once data exists.
 * - New constructs may be added without changing the measurement engine.
 * - A construct does not automatically represent a diagnosis.
 * - Root supports users; it does not diagnose or replace clinical care.
 */

import { ROOT_DOMAIN_IDS, isRootDomain } from "./rootDomains";

export const ROOT_CONSTRUCT_SCHEMA_VERSION = "1.0.0";

export const ROOT_SCORE_DIRECTIONS = Object.freeze({
  GREATER_DIFFICULTY: "greater_difficulty",
  GREATER_STRENGTH: "greater_strength",
  GREATER_FREQUENCY: "greater_frequency",
  GREATER_QUANTITY: "greater_quantity",
  CONTEXT_DEPENDENT: "context_dependent",
});

export const ROOT_CONSTRUCT_KINDS = Object.freeze({
  DIFFICULTY: "difficulty",
  CAPACITY: "capacity",
  EXPERIENCE: "experience",
  BEHAVIOUR: "behaviour",
  RESOURCE: "resource",
  CONTEXT: "context",
  SIGNAL: "signal",
  OUTCOME: "outcome",
});

export const ROOT_MEASUREMENT_APPROACHES = Object.freeze({
  MOMENTARY: "momentary",
  DAILY: "daily",
  WEEKLY: "weekly",
  PERIODIC: "periodic",
  EVENT_BASED: "event_based",
  BEFORE_AFTER: "before_after",
  PASSIVE: "passive",
  CONVERSATIONAL: "conversational",
});

export const ROOT_EVIDENCE_STAGES = Object.freeze({
  FOUNDATIONAL: "foundational",
  ESTABLISHED: "established",
  EMERGING: "emerging",
  EXPLORATORY: "exploratory",
  ROOT_GENERATED: "root_generated",
});

const normaliseArray = (value) =>
  Object.freeze(
    Array.isArray(value)
      ? [...new Set(value.filter(Boolean).map((item) => String(item).trim()))]
      : []
  );

const normaliseObject = (value) =>
  Object.freeze(
    value && typeof value === "object" && !Array.isArray(value)
      ? { ...value }
      : {}
  );

/**
 * Creates and freezes one Root construct definition.
 */
const construct = ({
  id,
  permanentId,
  domainId,
  title,
  shortTitle,
  internalDefinition,
  humanDescription,
  reflectionPrompt,
  measurementQuestion,
  kind,
  higherScoreMeans,
  defaultApproach = ROOT_MEASUREMENT_APPROACHES.CONVERSATIONAL,
  supportedApproaches = [],
  parentConstructId = null,
  relatedConstructIds = [],
  interventionTags = [],
  organisationTags = [],
  researchTags = [],
  aliases = [],
  evidenceStage = ROOT_EVIDENCE_STAGES.FOUNDATIONAL,
  active = true,
  userVisible = true,
  organisationEligible = true,
  researchEligible = true,
  requiresConsent = false,
  clinicalBoundary = false,
  metadata = {},
}) =>
  Object.freeze({
    id,
    permanentId,
    domainId,
    title,
    shortTitle,
    internalDefinition,
    humanDescription,
    reflectionPrompt,
    measurementQuestion,
    kind,
    higherScoreMeans,
    defaultApproach,
    supportedApproaches: normaliseArray([
      defaultApproach,
      ...supportedApproaches,
    ]),
    parentConstructId,
    relatedConstructIds: normaliseArray(relatedConstructIds),
    interventionTags: normaliseArray(interventionTags),
    organisationTags: normaliseArray(organisationTags),
    researchTags: normaliseArray(researchTags),
    aliases: normaliseArray(aliases),
    evidenceStage,
    active,
    userVisible,
    organisationEligible,
    researchEligible,
    requiresConsent,
    clinicalBoundary,
    metadata: normaliseObject(metadata),
  });

export const ROOT_CONSTRUCT_IDS = Object.freeze({
  // Mind
  STRESS_LOAD: "stress_load",
  ANXIETY_INTENSITY: "anxiety_intensity",
  EMOTIONAL_REGULATION: "emotional_regulation",
  MOOD_DIFFICULTY: "mood_difficulty",
  FOCUS_DIFFICULTY: "focus_difficulty",
  HOPE_CAPACITY: "hope_capacity",

  // Sleep
  SLEEP_DIFFICULTY: "sleep_difficulty",
  SLEEP_RESTORATION: "sleep_restoration",
  SLEEP_CONSISTENCY: "sleep_consistency",

  // Nutrition
  NUTRITIONAL_BALANCE: "nutritional_balance",
  HYDRATION_ADEQUACY: "hydration_adequacy",
  EATING_REGULARITY: "eating_regularity",
  FOOD_RELATIONSHIP: "food_relationship",

  // Movement
  MOVEMENT_LEVEL: "movement_level",
  SEDENTARY_LOAD: "sedentary_load",
  MOVEMENT_CONFIDENCE: "movement_confidence",

  // Recovery
  RECOVERY_DIFFICULTY: "recovery_difficulty",
  FATIGUE_LOAD: "fatigue_load",
  RESTORATIVE_CAPACITY: "restorative_capacity",

  // Connection
  SOCIAL_CONNECTION: "social_connection",
  LONELINESS_LOAD: "loneliness_load",
  BELONGING: "belonging",
  RELATIONSHIP_SUPPORT: "relationship_support",

  // Environment
  ENVIRONMENTAL_SUPPORT: "environmental_support",
  ENVIRONMENTAL_STRESS: "environmental_stress",
  NATURE_CONNECTION: "nature_connection",
  DIGITAL_ENVIRONMENT_LOAD: "digital_environment_load",

  // Purpose
  SENSE_OF_PURPOSE: "sense_of_purpose",
  MEANINGFUL_ENGAGEMENT: "meaningful_engagement",
  VALUES_ALIGNMENT: "values_alignment",

  // Health behaviours
  SELF_CARE_CONSISTENCY: "self_care_consistency",
  HELP_SEEKING_CONFIDENCE: "help_seeking_confidence",
  RISKY_SUBSTANCE_LOAD: "risky_substance_load",
  ROUTINE_STABILITY: "routine_stability",

  // Physical health
  BODY_COMFORT: "body_comfort",
  PHYSICAL_ENERGY: "physical_energy",
  PAIN_INTERFERENCE: "pain_interference",
  FUNCTIONAL_CAPACITY: "functional_capacity",

  // Biometrics
  BLOOD_PRESSURE_PATTERN: "blood_pressure_pattern",
  GLUCOSE_PATTERN: "glucose_pattern",
  RESTING_HEART_RATE_PATTERN: "resting_heart_rate_pattern",

  // Medical factors
  TREATMENT_BURDEN: "treatment_burden",
  MEDICATION_ROUTINE_CONFIDENCE: "medication_routine_confidence",
  HEALTHCARE_ACCESS: "healthcare_access",

  // Work
  WORKLOAD_PRESSURE: "workload_pressure",
  WORKPLACE_PSYCHOLOGICAL_SAFETY: "workplace_psychological_safety",
  WORK_AUTONOMY: "work_autonomy",
  WORK_LIFE_INTERACTION: "work_life_interaction",

  // Financial wellbeing
  FINANCIAL_PRESSURE: "financial_pressure",
  FINANCIAL_CONTROL: "financial_control",
  FINANCIAL_CONFIDENCE: "financial_confidence",

  // Life transitions
  CHANGE_LOAD: "change_load",
  UNCERTAINTY_LOAD: "uncertainty_load",
  TRANSITION_ADAPTATION: "transition_adaptation",

  // Personal growth
  DECISION_CONFIDENCE: "decision_confidence",
  SELF_UNDERSTANDING: "self_understanding",
  ADAPTABILITY: "adaptability",
  SOCIAL_CONFIDENCE: "social_confidence",
});

/**
 * The first Root construct registry.
 *
 * This is deliberately expandable rather than exhaustive.
 * Root is not declaring that these are the only things that matter.
 * It is establishing the permanent structure through which further
 * constructs can be added safely.
 */
export const ROOT_CONSTRUCTS = Object.freeze({
  /*
   * MIND AND EMOTIONAL HEALTH
   */

  [ROOT_CONSTRUCT_IDS.STRESS_LOAD]: construct({
    id: ROOT_CONSTRUCT_IDS.STRESS_LOAD,
    permanentId: "ROOT-CON-000001",
    domainId: ROOT_DOMAIN_IDS.MIND,
    title: "Stress Load",
    shortTitle: "Stress",
    internalDefinition:
      "The perceived psychological pressure created by demands, uncertainty, responsibility or threat.",
    humanDescription:
      "How much pressure life feels as though it is placing on you.",
    reflectionPrompt:
      "What feels as though it is carrying the greatest weight today?",
    measurementQuestion:
      "How overwhelming does life feel right now?",
    kind: ROOT_CONSTRUCT_KINDS.DIFFICULTY,
    higherScoreMeans: ROOT_SCORE_DIRECTIONS.GREATER_DIFFICULTY,
    defaultApproach: ROOT_MEASUREMENT_APPROACHES.MOMENTARY,
    supportedApproaches: [
      ROOT_MEASUREMENT_APPROACHES.DAILY,
      ROOT_MEASUREMENT_APPROACHES.WEEKLY,
      ROOT_MEASUREMENT_APPROACHES.BEFORE_AFTER,
      ROOT_MEASUREMENT_APPROACHES.CONVERSATIONAL,
    ],
    relatedConstructIds: [
      ROOT_CONSTRUCT_IDS.RECOVERY_DIFFICULTY,
      ROOT_CONSTRUCT_IDS.SLEEP_DIFFICULTY,
      ROOT_CONSTRUCT_IDS.WORKLOAD_PRESSURE,
    ],
    interventionTags: [
      "breathing",
      "grounding",
      "reflection",
      "movement",
      "planning",
    ],
    organisationTags: ["stress", "pressure", "workforce_risk"],
    researchTags: ["perceived_stress", "psychological_load"],
    aliases: ["stress", "pressure", "overwhelm"],
    evidenceStage: ROOT_EVIDENCE_STAGES.ESTABLISHED,
  }),

  [ROOT_CONSTRUCT_IDS.ANXIETY_INTENSITY]: construct({
    id: ROOT_CONSTRUCT_IDS.ANXIETY_INTENSITY,
    permanentId: "ROOT-CON-000002",
    domainId: ROOT_DOMAIN_IDS.MIND,
    title: "Anxiety Intensity",
    shortTitle: "Anxiety",
    internalDefinition:
      "The current intensity of apprehension, unease, physiological arousal or anticipated threat.",
    humanDescription:
      "How strongly worry or unease is showing up for you.",
    reflectionPrompt:
      "What does your mind or body seem to be preparing for?",
    measurementQuestion:
      "How strong does the anxiety feel right now?",
    kind: ROOT_CONSTRUCT_KINDS.DIFFICULTY,
    higherScoreMeans: ROOT_SCORE_DIRECTIONS.GREATER_DIFFICULTY,
    defaultApproach: ROOT_MEASUREMENT_APPROACHES.MOMENTARY,
    supportedApproaches: [
      ROOT_MEASUREMENT_APPROACHES.EVENT_BASED,
      ROOT_MEASUREMENT_APPROACHES.BEFORE_AFTER,
      ROOT_MEASUREMENT_APPROACHES.CONVERSATIONAL,
    ],
    relatedConstructIds: [
      ROOT_CONSTRUCT_IDS.STRESS_LOAD,
      ROOT_CONSTRUCT_IDS.BODY_COMFORT,
      ROOT_CONSTRUCT_IDS.UNCERTAINTY_LOAD,
    ],
    interventionTags: [
      "grounding",
      "breathing",
      "reassurance",
      "orientation",
      "reflection",
    ],
    organisationTags: ["anxiety", "emotional_pressure"],
    researchTags: ["state_anxiety", "anxiety_intensity"],
    aliases: ["anxiety", "unease", "nervousness"],
    evidenceStage: ROOT_EVIDENCE_STAGES.ESTABLISHED,
    clinicalBoundary: true,
  }),

  [ROOT_CONSTRUCT_IDS.EMOTIONAL_REGULATION]: construct({
    id: ROOT_CONSTRUCT_IDS.EMOTIONAL_REGULATION,
    permanentId: "ROOT-CON-000003",
    domainId: ROOT_DOMAIN_IDS.MIND,
    title: "Emotional Regulation Capacity",
    shortTitle: "Emotional Balance",
    internalDefinition:
      "The perceived ability to recognise, tolerate and respond constructively to emotional experience.",
    humanDescription:
      "How able you feel to stay with emotions without being completely carried away by them.",
    reflectionPrompt:
      "What might help you make a little more room around this feeling?",
    measurementQuestion:
      "How able do you feel to manage your emotions right now?",
    kind: ROOT_CONSTRUCT_KINDS.CAPACITY,
    higherScoreMeans: ROOT_SCORE_DIRECTIONS.GREATER_STRENGTH,
    supportedApproaches: [
      ROOT_MEASUREMENT_APPROACHES.DAILY,
      ROOT_MEASUREMENT_APPROACHES.WEEKLY,
      ROOT_MEASUREMENT_APPROACHES.BEFORE_AFTER,
    ],
    interventionTags: [
      "grounding",
      "acceptance",
      "journalling",
      "breathing",
      "self_compassion",
    ],
    organisationTags: ["emotional_regulation", "coping_capacity"],
    researchTags: ["emotion_regulation", "coping"],
    aliases: ["emotional_control", "emotional_balance"],
    evidenceStage: ROOT_EVIDENCE_STAGES.ESTABLISHED,
  }),

  [ROOT_CONSTRUCT_IDS.MOOD_DIFFICULTY]: construct({
    id: ROOT_CONSTRUCT_IDS.MOOD_DIFFICULTY,
    permanentId: "ROOT-CON-000004",
    domainId: ROOT_DOMAIN_IDS.MIND,
    title: "Mood Difficulty",
    shortTitle: "Mood",
    internalDefinition:
      "The current degree of low, distressed or emotionally uncomfortable mood.",
    humanDescription:
      "How difficult your emotional weather feels today.",
    reflectionPrompt:
      "What has most influenced your mood today?",
    measurementQuestion:
      "How difficult does your mood feel right now?",
    kind: ROOT_CONSTRUCT_KINDS.DIFFICULTY,
    higherScoreMeans: ROOT_SCORE_DIRECTIONS.GREATER_DIFFICULTY,
    defaultApproach: ROOT_MEASUREMENT_APPROACHES.DAILY,
    supportedApproaches: [
      ROOT_MEASUREMENT_APPROACHES.MOMENTARY,
      ROOT_MEASUREMENT_APPROACHES.WEEKLY,
      ROOT_MEASUREMENT_APPROACHES.CONVERSATIONAL,
    ],
    relatedConstructIds: [
      ROOT_CONSTRUCT_IDS.HOPE_CAPACITY,
      ROOT_CONSTRUCT_IDS.SOCIAL_CONNECTION,
      ROOT_CONSTRUCT_IDS.PHYSICAL_ENERGY,
    ],
    interventionTags: [
      "connection",
      "movement",
      "reflection",
      "rest",
      "meaning",
    ],
    organisationTags: ["mood", "emotional_wellbeing"],
    researchTags: ["subjective_mood", "affective_state"],
    aliases: ["low_mood", "emotional_state"],
    evidenceStage: ROOT_EVIDENCE_STAGES.ESTABLISHED,
    clinicalBoundary: true,
  }),

  [ROOT_CONSTRUCT_IDS.FOCUS_DIFFICULTY]: construct({
    id: ROOT_CONSTRUCT_IDS.FOCUS_DIFFICULTY,
    permanentId: "ROOT-CON-000005",
    domainId: ROOT_DOMAIN_IDS.MIND,
    title: "Focus Difficulty",
    shortTitle: "Focus",
    internalDefinition:
      "The perceived difficulty sustaining attention, organising thought or maintaining cognitive direction.",
    humanDescription:
      "How hard it feels to hold your attention where you want it.",
    reflectionPrompt:
      "What is competing most strongly for your attention?",
    measurementQuestion:
      "How scattered does your focus feel right now?",
    kind: ROOT_CONSTRUCT_KINDS.DIFFICULTY,
    higherScoreMeans: ROOT_SCORE_DIRECTIONS.GREATER_DIFFICULTY,
    defaultApproach: ROOT_MEASUREMENT_APPROACHES.MOMENTARY,
    supportedApproaches: [
      ROOT_MEASUREMENT_APPROACHES.DAILY,
      ROOT_MEASUREMENT_APPROACHES.CONVERSATIONAL,
    ],
    relatedConstructIds: [
      ROOT_CONSTRUCT_IDS.SLEEP_DIFFICULTY,
      ROOT_CONSTRUCT_IDS.STRESS_LOAD,
      ROOT_CONSTRUCT_IDS.FATIGUE_LOAD,
    ],
    interventionTags: [
      "task_simplification",
      "grounding",
      "movement",
      "planning",
      "rest",
    ],
    organisationTags: ["focus", "cognitive_load", "productivity_pressure"],
    researchTags: ["attention", "cognitive_function"],
    aliases: ["concentration", "scattered_thinking"],
    evidenceStage: ROOT_EVIDENCE_STAGES.ESTABLISHED,
  }),

  [ROOT_CONSTRUCT_IDS.HOPE_CAPACITY]: construct({
    id: ROOT_CONSTRUCT_IDS.HOPE_CAPACITY,
    permanentId: "ROOT-CON-000006",
    domainId: ROOT_DOMAIN_IDS.MIND,
    title: "Hope Capacity",
    shortTitle: "Hope",
    internalDefinition:
      "The perceived possibility of movement, improvement or meaningful continuation.",
    humanDescription:
      "How possible it feels that something helpful can still happen.",
    reflectionPrompt:
      "What small possibility still feels alive?",
    measurementQuestion:
      "How hopeful do you feel about moving forward?",
    kind: ROOT_CONSTRUCT_KINDS.RESOURCE,
    higherScoreMeans: ROOT_SCORE_DIRECTIONS.GREATER_STRENGTH,
    defaultApproach: ROOT_MEASUREMENT_APPROACHES.WEEKLY,
    supportedApproaches: [
      ROOT_MEASUREMENT_APPROACHES.DAILY,
      ROOT_MEASUREMENT_APPROACHES.CONVERSATIONAL,
    ],
    relatedConstructIds: [
      ROOT_CONSTRUCT_IDS.SENSE_OF_PURPOSE,
      ROOT_CONSTRUCT_IDS.MOOD_DIFFICULTY,
      ROOT_CONSTRUCT_IDS.DECISION_CONFIDENCE,
    ],
    interventionTags: [
      "future_orientation",
      "meaning",
      "strengths",
      "connection",
      "small_steps",
    ],
    organisationTags: ["hope", "future_outlook", "engagement"],
    researchTags: ["hope", "positive_psychology"],
    aliases: ["optimism", "future_belief"],
    evidenceStage: ROOT_EVIDENCE_STAGES.ESTABLISHED,
  }),

  /*
   * SLEEP
   */

  [ROOT_CONSTRUCT_IDS.SLEEP_DIFFICULTY]: construct({
    id: ROOT_CONSTRUCT_IDS.SLEEP_DIFFICULTY,
    permanentId: "ROOT-CON-000007",
    domainId: ROOT_DOMAIN_IDS.SLEEP,
    title: "Sleep Difficulty",
    shortTitle: "Sleep",
    internalDefinition:
      "The perceived difficulty obtaining sufficient, settled or restorative sleep.",
    humanDescription:
      "How difficult sleep has felt recently.",
    reflectionPrompt:
      "What seems to be getting between you and better sleep?",
    measurementQuestion:
      "How difficult has sleep felt?",
    kind: ROOT_CONSTRUCT_KINDS.DIFFICULTY,
    higherScoreMeans: ROOT_SCORE_DIRECTIONS.GREATER_DIFFICULTY,
    defaultApproach: ROOT_MEASUREMENT_APPROACHES.DAILY,
    supportedApproaches: [
      ROOT_MEASUREMENT_APPROACHES.WEEKLY,
      ROOT_MEASUREMENT_APPROACHES.CONVERSATIONAL,
      ROOT_MEASUREMENT_APPROACHES.PASSIVE,
    ],
    relatedConstructIds: [
      ROOT_CONSTRUCT_IDS.RECOVERY_DIFFICULTY,
      ROOT_CONSTRUCT_IDS.FATIGUE_LOAD,
      ROOT_CONSTRUCT_IDS.STRESS_LOAD,
    ],
    interventionTags: [
      "sleep_routine",
      "light_exposure",
      "relaxation",
      "environment",
      "pacing",
    ],
    organisationTags: ["sleep", "recovery", "fatigue_risk"],
    researchTags: ["sleep_quality", "sleep_difficulty"],
    aliases: ["poor_sleep", "sleep_disruption"],
    evidenceStage: ROOT_EVIDENCE_STAGES.ESTABLISHED,
  }),

  [ROOT_CONSTRUCT_IDS.SLEEP_RESTORATION]: construct({
    id: ROOT_CONSTRUCT_IDS.SLEEP_RESTORATION,
    permanentId: "ROOT-CON-000008",
    domainId: ROOT_DOMAIN_IDS.SLEEP,
    title: "Sleep Restoration",
    shortTitle: "Restorative Sleep",
    internalDefinition:
      "The degree to which sleep leaves the individual feeling physically and mentally restored.",
    humanDescription:
      "How refreshed and restored you feel after sleeping.",
    reflectionPrompt:
      "What was different on the nights when sleep helped most?",
    measurementQuestion:
      "How restored did you feel after sleep?",
    kind: ROOT_CONSTRUCT_KINDS.OUTCOME,
    higherScoreMeans: ROOT_SCORE_DIRECTIONS.GREATER_STRENGTH,
    defaultApproach: ROOT_MEASUREMENT_APPROACHES.DAILY,
    supportedApproaches: [
      ROOT_MEASUREMENT_APPROACHES.WEEKLY,
      ROOT_MEASUREMENT_APPROACHES.PASSIVE,
    ],
    relatedConstructIds: [
      ROOT_CONSTRUCT_IDS.PHYSICAL_ENERGY,
      ROOT_CONSTRUCT_IDS.RESTORATIVE_CAPACITY,
    ],
    interventionTags: ["sleep_routine", "recovery", "environment"],
    organisationTags: ["restorative_sleep", "energy"],
    researchTags: ["sleep_restoration", "sleep_satisfaction"],
    aliases: ["refreshed_sleep", "sleep_recovery"],
    evidenceStage: ROOT_EVIDENCE_STAGES.ESTABLISHED,
  }),

  [ROOT_CONSTRUCT_IDS.SLEEP_CONSISTENCY]: construct({
    id: ROOT_CONSTRUCT_IDS.SLEEP_CONSISTENCY,
    permanentId: "ROOT-CON-000009",
    domainId: ROOT_DOMAIN_IDS.SLEEP,
    title: "Sleep Consistency",
    shortTitle: "Sleep Routine",
    internalDefinition:
      "The regularity of sleep timing and sleep-related routines.",
    humanDescription:
      "How steady and predictable your sleep pattern has been.",
    reflectionPrompt:
      "What most often disrupts the rhythm of your sleep?",
    measurementQuestion:
      "How consistent has your sleep routine been?",
    kind: ROOT_CONSTRUCT_KINDS.BEHAVIOUR,
    higherScoreMeans: ROOT_SCORE_DIRECTIONS.GREATER_STRENGTH,
    defaultApproach: ROOT_MEASUREMENT_APPROACHES.WEEKLY,
    supportedApproaches: [
      ROOT_MEASUREMENT_APPROACHES.DAILY,
      ROOT_MEASUREMENT_APPROACHES.PASSIVE,
    ],
    interventionTags: ["routine", "planning", "light_exposure"],
    organisationTags: ["sleep_consistency"],
    researchTags: ["sleep_timing", "sleep_regularity"],
    aliases: ["sleep_regularness", "bedtime_consistency"],
    evidenceStage: ROOT_EVIDENCE_STAGES.ESTABLISHED,
  }),

  /*
   * NUTRITION AND HYDRATION
   */

  [ROOT_CONSTRUCT_IDS.NUTRITIONAL_BALANCE]: construct({
    id: ROOT_CONSTRUCT_IDS.NUTRITIONAL_BALANCE,
    permanentId: "ROOT-CON-000010",
    domainId: ROOT_DOMAIN_IDS.NUTRITION,
    title: "Nutritional Balance",
    shortTitle: "Food Balance",
    internalDefinition:
      "The perceived balance, variety and adequacy of everyday food intake.",
    humanDescription:
      "How well your food choices seem to be supporting you.",
    reflectionPrompt:
      "What food choice has helped you feel most supported recently?",
    measurementQuestion:
      "How balanced has your eating felt?",
    kind: ROOT_CONSTRUCT_KINDS.BEHAVIOUR,
    higherScoreMeans: ROOT_SCORE_DIRECTIONS.GREATER_STRENGTH,
    defaultApproach: ROOT_MEASUREMENT_APPROACHES.WEEKLY,
    supportedApproaches: [
      ROOT_MEASUREMENT_APPROACHES.DAILY,
      ROOT_MEASUREMENT_APPROACHES.CONVERSATIONAL,
    ],
    interventionTags: [
      "meal_planning",
      "food_variety",
      "whole_foods",
      "support",
    ],
    organisationTags: ["nutrition", "healthy_behaviour"],
    researchTags: ["diet_quality", "nutritional_pattern"],
    aliases: ["diet_quality", "healthy_eating"],
    evidenceStage: ROOT_EVIDENCE_STAGES.ESTABLISHED,
  }),

  [ROOT_CONSTRUCT_IDS.HYDRATION_ADEQUACY]: construct({
    id: ROOT_CONSTRUCT_IDS.HYDRATION_ADEQUACY,
    permanentId: "ROOT-CON-000011",
    domainId: ROOT_DOMAIN_IDS.NUTRITION,
    title: "Hydration Adequacy",
    shortTitle: "Hydration",
    internalDefinition:
      "The perceived adequacy and consistency of fluid intake.",
    humanDescription:
      "How well hydrated you feel and how consistently you drink.",
    reflectionPrompt:
      "What makes drinking enough easier or harder for you?",
    measurementQuestion:
      "How well hydrated have you felt?",
    kind: ROOT_CONSTRUCT_KINDS.BEHAVIOUR,
    higherScoreMeans: ROOT_SCORE_DIRECTIONS.GREATER_STRENGTH,
    defaultApproach: ROOT_MEASUREMENT_APPROACHES.DAILY,
    supportedApproaches: [
      ROOT_MEASUREMENT_APPROACHES.WEEKLY,
      ROOT_MEASUREMENT_APPROACHES.CONVERSATIONAL,
    ],
    interventionTags: ["hydration", "reminders", "routine"],
    organisationTags: ["hydration", "energy_support"],
    researchTags: ["fluid_intake", "hydration_behaviour"],
    aliases: ["water_intake", "fluid_intake"],
    evidenceStage: ROOT_EVIDENCE_STAGES.ESTABLISHED,
  }),

  [ROOT_CONSTRUCT_IDS.EATING_REGULARITY]: construct({
    id: ROOT_CONSTRUCT_IDS.EATING_REGULARITY,
    permanentId: "ROOT-CON-000012",
    domainId: ROOT_DOMAIN_IDS.NUTRITION,
    title: "Eating Regularity",
    shortTitle: "Meal Rhythm",
    internalDefinition:
      "The consistency and suitability of meal timing for the individual's needs.",
    humanDescription:
      "How steady and supportive your pattern of eating has been.",
    reflectionPrompt:
      "Where does your eating pattern tend to become disrupted?",
    measurementQuestion:
      "How regular has your eating pattern been?",
    kind: ROOT_CONSTRUCT_KINDS.BEHAVIOUR,
    higherScoreMeans: ROOT_SCORE_DIRECTIONS.GREATER_STRENGTH,
    defaultApproach: ROOT_MEASUREMENT_APPROACHES.WEEKLY,
    supportedApproaches: [ROOT_MEASUREMENT_APPROACHES.DAILY],
    interventionTags: ["meal_planning", "routine", "preparation"],
    organisationTags: ["nutrition_routine"],
    researchTags: ["meal_timing", "eating_pattern"],
    aliases: ["meal_regularness", "meal_timing"],
    evidenceStage: ROOT_EVIDENCE_STAGES.ESTABLISHED,
  }),

  [ROOT_CONSTRUCT_IDS.FOOD_RELATIONSHIP]: construct({
    id: ROOT_CONSTRUCT_IDS.FOOD_RELATIONSHIP,
    permanentId: "ROOT-CON-000013",
    domainId: ROOT_DOMAIN_IDS.NUTRITION,
    title: "Relationship with Food",
    shortTitle: "Food Relationship",
    internalDefinition:
      "The emotional, cognitive and social experience associated with food and eating.",
    humanDescription:
      "How comfortable, pressured or conflicted eating feels.",
    reflectionPrompt:
      "What feelings or situations most influence the way you eat?",
    measurementQuestion:
      "How comfortable has your relationship with food felt?",
    kind: ROOT_CONSTRUCT_KINDS.EXPERIENCE,
    higherScoreMeans: ROOT_SCORE_DIRECTIONS.GREATER_STRENGTH,
    defaultApproach: ROOT_MEASUREMENT_APPROACHES.CONVERSATIONAL,
    supportedApproaches: [
      ROOT_MEASUREMENT_APPROACHES.WEEKLY,
      ROOT_MEASUREMENT_APPROACHES.EVENT_BASED,
    ],
    interventionTags: [
      "mindful_eating",
      "self_compassion",
      "reflection",
      "support",
    ],
    organisationEligible: false,
    organisationTags: [],
    researchTags: ["eating_experience", "food_relationship"],
    aliases: ["emotional_eating", "eating_comfort"],
    evidenceStage: ROOT_EVIDENCE_STAGES.EMERGING,
    requiresConsent: true,
    clinicalBoundary: true,
  }),

  /*
   * MOVEMENT
   */

  [ROOT_CONSTRUCT_IDS.MOVEMENT_LEVEL]: construct({
    id: ROOT_CONSTRUCT_IDS.MOVEMENT_LEVEL,
    permanentId: "ROOT-CON-000014",
    domainId: ROOT_DOMAIN_IDS.MOVEMENT,
    title: "Movement Level",
    shortTitle: "Movement",
    internalDefinition:
      "The amount and frequency of intentional and everyday physical movement.",
    humanDescription:
      "How much opportunity your body has had to move.",
    reflectionPrompt:
      "What kind of movement feels realistic and worthwhile today?",
    measurementQuestion:
      "How active have you been recently?",
    kind: ROOT_CONSTRUCT_KINDS.BEHAVIOUR,
    higherScoreMeans: ROOT_SCORE_DIRECTIONS.GREATER_QUANTITY,
    defaultApproach: ROOT_MEASUREMENT_APPROACHES.DAILY,
    supportedApproaches: [
      ROOT_MEASUREMENT_APPROACHES.WEEKLY,
      ROOT_MEASUREMENT_APPROACHES.PASSIVE,
    ],
    interventionTags: ["walking", "mobility", "exercise", "movement_breaks"],
    organisationTags: ["movement", "activity"],
    researchTags: ["physical_activity", "movement_behaviour"],
    aliases: ["activity_level", "exercise_level"],
    evidenceStage: ROOT_EVIDENCE_STAGES.ESTABLISHED,
  }),

  [ROOT_CONSTRUCT_IDS.SEDENTARY_LOAD]: construct({
    id: ROOT_CONSTRUCT_IDS.SEDENTARY_LOAD,
    permanentId: "ROOT-CON-000015",
    domainId: ROOT_DOMAIN_IDS.MOVEMENT,
    title: "Sedentary Load",
    shortTitle: "Sitting Time",
    internalDefinition:
      "The degree of prolonged sitting or physical inactivity within everyday life.",
    humanDescription:
      "How much of your day has kept you physically still.",
    reflectionPrompt:
      "Where could a small movement break fit naturally?",
    measurementQuestion:
      "How much has prolonged sitting affected your day?",
    kind: ROOT_CONSTRUCT_KINDS.BEHAVIOUR,
    higherScoreMeans: ROOT_SCORE_DIRECTIONS.GREATER_DIFFICULTY,
    defaultApproach: ROOT_MEASUREMENT_APPROACHES.DAILY,
    supportedApproaches: [
      ROOT_MEASUREMENT_APPROACHES.WEEKLY,
      ROOT_MEASUREMENT_APPROACHES.PASSIVE,
    ],
    interventionTags: ["movement_breaks", "walking", "environment"],
    organisationTags: ["sedentary_behaviour", "work_design"],
    researchTags: ["sedentary_time"],
    aliases: ["sitting_time", "inactivity"],
    evidenceStage: ROOT_EVIDENCE_STAGES.ESTABLISHED,
  }),

  [ROOT_CONSTRUCT_IDS.MOVEMENT_CONFIDENCE]: construct({
    id: ROOT_CONSTRUCT_IDS.MOVEMENT_CONFIDENCE,
    permanentId: "ROOT-CON-000016",
    domainId: ROOT_DOMAIN_IDS.MOVEMENT,
    title: "Movement Confidence",
    shortTitle: "Movement Confidence",
    internalDefinition:
      "The perceived confidence and safety associated with beginning or sustaining movement.",
    humanDescription:
      "How confident and comfortable you feel about moving your body.",
    reflectionPrompt:
      "What would make movement feel safer or more achievable?",
    measurementQuestion:
      "How confident do you feel about being physically active?",
    kind: ROOT_CONSTRUCT_KINDS.CAPACITY,
    higherScoreMeans: ROOT_SCORE_DIRECTIONS.GREATER_STRENGTH,
    defaultApproach: ROOT_MEASUREMENT_APPROACHES.WEEKLY,
    supportedApproaches: [
      ROOT_MEASUREMENT_APPROACHES.BEFORE_AFTER,
      ROOT_MEASUREMENT_APPROACHES.CONVERSATIONAL,
    ],
    interventionTags: ["graded_movement", "support", "planning"],
    organisationTags: ["movement_confidence"],
    researchTags: ["exercise_self_efficacy"],
    aliases: ["activity_confidence", "exercise_confidence"],
    evidenceStage: ROOT_EVIDENCE_STAGES.ESTABLISHED,
  }),

  /*
   * RECOVERY
   */

  [ROOT_CONSTRUCT_IDS.RECOVERY_DIFFICULTY]: construct({
    id: ROOT_CONSTRUCT_IDS.RECOVERY_DIFFICULTY,
    permanentId: "ROOT-CON-000017",
    domainId: ROOT_DOMAIN_IDS.RECOVERY,
    title: "Recovery Difficulty",
    shortTitle: "Recovery",
    internalDefinition:
      "The perceived difficulty returning to a settled and restored state after demand.",
    humanDescription:
      "How hard it has been to recover from what life is asking of you.",
    reflectionPrompt:
      "What demand seems to be taking longest to recover from?",
    measurementQuestion:
      "How difficult has recovery felt?",
    kind: ROOT_CONSTRUCT_KINDS.DIFFICULTY,
    higherScoreMeans: ROOT_SCORE_DIRECTIONS.GREATER_DIFFICULTY,
    defaultApproach: ROOT_MEASUREMENT_APPROACHES.DAILY,
    supportedApproaches: [
      ROOT_MEASUREMENT_APPROACHES.WEEKLY,
      ROOT_MEASUREMENT_APPROACHES.CONVERSATIONAL,
    ],
    relatedConstructIds: [
      ROOT_CONSTRUCT_IDS.STRESS_LOAD,
      ROOT_CONSTRUCT_IDS.SLEEP_DIFFICULTY,
      ROOT_CONSTRUCT_IDS.FATIGUE_LOAD,
    ],
    interventionTags: ["rest", "pacing", "sleep", "grounding", "boundaries"],
    organisationTags: ["recovery", "burnout_risk", "sustainable_performance"],
    researchTags: ["recovery", "allostatic_load"],
    aliases: ["poor_recovery", "recovery_load"],
    evidenceStage: ROOT_EVIDENCE_STAGES.ESTABLISHED,
  }),

  [ROOT_CONSTRUCT_IDS.FATIGUE_LOAD]: construct({
    id: ROOT_CONSTRUCT_IDS.FATIGUE_LOAD,
    permanentId: "ROOT-CON-000018",
    domainId: ROOT_DOMAIN_IDS.RECOVERY,
    title: "Fatigue Load",
    shortTitle: "Fatigue",
    internalDefinition:
      "The perceived physical, emotional or cognitive burden of tiredness.",
    humanDescription:
      "How much tiredness is affecting your ability to live as you would like.",
    reflectionPrompt:
      "What type of tiredness is most present: physical, mental or emotional?",
    measurementQuestion:
      "How heavily is fatigue affecting you?",
    kind: ROOT_CONSTRUCT_KINDS.DIFFICULTY,
    higherScoreMeans: ROOT_SCORE_DIRECTIONS.GREATER_DIFFICULTY,
    defaultApproach: ROOT_MEASUREMENT_APPROACHES.DAILY,
    supportedApproaches: [
      ROOT_MEASUREMENT_APPROACHES.MOMENTARY,
      ROOT_MEASUREMENT_APPROACHES.WEEKLY,
    ],
    interventionTags: ["rest", "pacing", "sleep", "nutrition", "movement"],
    organisationTags: ["fatigue", "capacity", "burnout_risk"],
    researchTags: ["fatigue", "energy_depletion"],
    aliases: ["tiredness", "exhaustion"],
    evidenceStage: ROOT_EVIDENCE_STAGES.ESTABLISHED,
    clinicalBoundary: true,
  }),

  [ROOT_CONSTRUCT_IDS.RESTORATIVE_CAPACITY]: construct({
    id: ROOT_CONSTRUCT_IDS.RESTORATIVE_CAPACITY,
    permanentId: "ROOT-CON-000019",
    domainId: ROOT_DOMAIN_IDS.RECOVERY,
    title: "Restorative Capacity",
    shortTitle: "Ability to Recover",
    internalDefinition:
      "The perceived ability to use rest and restorative activity effectively.",
    humanDescription:
      "How able you feel to find things that genuinely replenish you.",
    reflectionPrompt:
      "What restores you rather than merely distracting you?",
    measurementQuestion:
      "How able do you feel to restore your energy?",
    kind: ROOT_CONSTRUCT_KINDS.CAPACITY,
    higherScoreMeans: ROOT_SCORE_DIRECTIONS.GREATER_STRENGTH,
    defaultApproach: ROOT_MEASUREMENT_APPROACHES.WEEKLY,
    supportedApproaches: [
      ROOT_MEASUREMENT_APPROACHES.BEFORE_AFTER,
      ROOT_MEASUREMENT_APPROACHES.CONVERSATIONAL,
    ],
    interventionTags: ["rest", "nature", "connection", "sleep", "pacing"],
    organisationTags: ["recovery_capacity", "resilience"],
    researchTags: ["restoration", "recovery_capacity"],
    aliases: ["recovery_capacity", "restorative_ability"],
    evidenceStage: ROOT_EVIDENCE_STAGES.EMERGING,
  }),

  /*
   * RELATIONSHIPS AND SOCIAL CONNECTION
   */

  [ROOT_CONSTRUCT_IDS.SOCIAL_CONNECTION]: construct({
    id: ROOT_CONSTRUCT_IDS.SOCIAL_CONNECTION,
    permanentId: "ROOT-CON-000020",
    domainId: ROOT_DOMAIN_IDS.CONNECTION,
    title: "Social Connection",
    shortTitle: "Connection",
    internalDefinition:
      "The experienced quality and availability of meaningful interpersonal contact.",
    humanDescription:
      "How connected you feel to people who matter.",
    reflectionPrompt:
      "Who helps you feel most like yourself?",
    measurementQuestion:
      "How connected have you felt to other people?",
    kind: ROOT_CONSTRUCT_KINDS.RESOURCE,
    higherScoreMeans: ROOT_SCORE_DIRECTIONS.GREATER_STRENGTH,
    defaultApproach: ROOT_MEASUREMENT_APPROACHES.WEEKLY,
    supportedApproaches: [
      ROOT_MEASUREMENT_APPROACHES.DAILY,
      ROOT_MEASUREMENT_APPROACHES.CONVERSATIONAL,
    ],
    interventionTags: ["connection", "conversation", "community", "support"],
    organisationTags: ["connection", "team_cohesion", "social_support"],
    researchTags: ["social_connection", "social_support"],
    aliases: ["relationships", "connectedness"],
    evidenceStage: ROOT_EVIDENCE_STAGES.ESTABLISHED,
  }),

  [ROOT_CONSTRUCT_IDS.LONELINESS_LOAD]: construct({
    id: ROOT_CONSTRUCT_IDS.LONELINESS_LOAD,
    permanentId: "ROOT-CON-000021",
    domainId: ROOT_DOMAIN_IDS.CONNECTION,
    title: "Loneliness Load",
    shortTitle: "Loneliness",
    internalDefinition:
      "The distress associated with a gap between desired and experienced connection.",
    humanDescription:
      "How much the absence of meaningful connection is affecting you.",
    reflectionPrompt:
      "What kind of connection feels missing?",
    measurementQuestion:
      "How strongly has loneliness affected you?",
    kind: ROOT_CONSTRUCT_KINDS.DIFFICULTY,
    higherScoreMeans: ROOT_SCORE_DIRECTIONS.GREATER_DIFFICULTY,
    defaultApproach: ROOT_MEASUREMENT_APPROACHES.WEEKLY,
    supportedApproaches: [
      ROOT_MEASUREMENT_APPROACHES.DAILY,
      ROOT_MEASUREMENT_APPROACHES.CONVERSATIONAL,
    ],
    interventionTags: ["connection", "community", "support", "small_contact"],
    organisationTags: ["loneliness", "isolation"],
    researchTags: ["loneliness", "social_isolation"],
    aliases: ["isolation", "social_disconnection"],
    evidenceStage: ROOT_EVIDENCE_STAGES.ESTABLISHED,
    requiresConsent: true,
  }),

  [ROOT_CONSTRUCT_IDS.BELONGING]: construct({
    id: ROOT_CONSTRUCT_IDS.BELONGING,
    permanentId: "ROOT-CON-000022",
    domainId: ROOT_DOMAIN_IDS.CONNECTION,
    title: "Sense of Belonging",
    shortTitle: "Belonging",
    internalDefinition:
      "The perceived experience of acceptance, inclusion and valued membership.",
    humanDescription:
      "How much you feel accepted and that you have a place.",
    reflectionPrompt:
      "Where do you feel most able to belong without pretending?",
    measurementQuestion:
      "How strong has your sense of belonging felt?",
    kind: ROOT_CONSTRUCT_KINDS.RESOURCE,
    higherScoreMeans: ROOT_SCORE_DIRECTIONS.GREATER_STRENGTH,
    defaultApproach: ROOT_MEASUREMENT_APPROACHES.WEEKLY,
    interventionTags: ["community", "identity", "connection", "participation"],
    organisationTags: ["belonging", "inclusion", "culture"],
    researchTags: ["belonging", "social_identity"],
    aliases: ["inclusion", "acceptance"],
    evidenceStage: ROOT_EVIDENCE_STAGES.ESTABLISHED,
  }),

  [ROOT_CONSTRUCT_IDS.RELATIONSHIP_SUPPORT]: construct({
    id: ROOT_CONSTRUCT_IDS.RELATIONSHIP_SUPPORT,
    permanentId: "ROOT-CON-000023",
    domainId: ROOT_DOMAIN_IDS.CONNECTION,
    title: "Relationship Support",
    shortTitle: "Support",
    internalDefinition:
      "The perceived availability and usefulness of practical or emotional support.",
    humanDescription:
      "How supported you feel by the people around you.",
    reflectionPrompt:
      "What support would make the greatest difference today?",
    measurementQuestion:
      "How supported have you felt?",
    kind: ROOT_CONSTRUCT_KINDS.RESOURCE,
    higherScoreMeans: ROOT_SCORE_DIRECTIONS.GREATER_STRENGTH,
    defaultApproach: ROOT_MEASUREMENT_APPROACHES.WEEKLY,
    interventionTags: ["conversation", "asking_for_help", "connection"],
    organisationTags: ["support", "manager_support", "peer_support"],
    researchTags: ["perceived_social_support"],
    aliases: ["social_support", "practical_support"],
    evidenceStage: ROOT_EVIDENCE_STAGES.ESTABLISHED,
  }),

  /*
   * ENVIRONMENT
   */

  [ROOT_CONSTRUCT_IDS.ENVIRONMENTAL_SUPPORT]: construct({
    id: ROOT_CONSTRUCT_IDS.ENVIRONMENTAL_SUPPORT,
    permanentId: "ROOT-CON-000024",
    domainId: ROOT_DOMAIN_IDS.ENVIRONMENT,
    title: "Environmental Support",
    shortTitle: "Supportive Environment",
    internalDefinition:
      "The degree to which physical and social surroundings make healthy action easier.",
    humanDescription:
      "How much your surroundings help you live in the way you want.",
    reflectionPrompt:
      "What small change to your surroundings would make life easier?",
    measurementQuestion:
      "How supportive have your surroundings felt?",
    kind: ROOT_CONSTRUCT_KINDS.CONTEXT,
    higherScoreMeans: ROOT_SCORE_DIRECTIONS.GREATER_STRENGTH,
    defaultApproach: ROOT_MEASUREMENT_APPROACHES.WEEKLY,
    interventionTags: ["environment_design", "planning", "boundaries"],
    organisationTags: ["work_environment", "healthy_design"],
    researchTags: ["environmental_support", "choice_architecture"],
    aliases: ["supportive_surroundings", "healthy_environment"],
    evidenceStage: ROOT_EVIDENCE_STAGES.EMERGING,
  }),

  [ROOT_CONSTRUCT_IDS.ENVIRONMENTAL_STRESS]: construct({
    id: ROOT_CONSTRUCT_IDS.ENVIRONMENTAL_STRESS,
    permanentId: "ROOT-CON-000025",
    domainId: ROOT_DOMAIN_IDS.ENVIRONMENT,
    title: "Environmental Stress",
    shortTitle: "Environmental Pressure",
    internalDefinition:
      "The burden created by noise, crowding, disorder, instability, discomfort or lack of control within surroundings.",
    humanDescription:
      "How much your surroundings are adding to the pressure you feel.",
    reflectionPrompt:
      "Which part of your environment is asking the most from you?",
    measurementQuestion:
      "How stressful have your surroundings felt?",
    kind: ROOT_CONSTRUCT_KINDS.DIFFICULTY,
    higherScoreMeans: ROOT_SCORE_DIRECTIONS.GREATER_DIFFICULTY,
    defaultApproach: ROOT_MEASUREMENT_APPROACHES.MOMENTARY,
    supportedApproaches: [
      ROOT_MEASUREMENT_APPROACHES.WEEKLY,
      ROOT_MEASUREMENT_APPROACHES.CONVERSATIONAL,
    ],
    interventionTags: ["environment_change", "boundaries", "noise_reduction"],
    organisationTags: ["environmental_stress", "workplace_conditions"],
    researchTags: ["environmental_stress", "perceived_control"],
    aliases: ["noise_stress", "environmental_pressure"],
    evidenceStage: ROOT_EVIDENCE_STAGES.ESTABLISHED,
  }),

  [ROOT_CONSTRUCT_IDS.NATURE_CONNECTION]: construct({
    id: ROOT_CONSTRUCT_IDS.NATURE_CONNECTION,
    permanentId: "ROOT-CON-000026",
    domainId: ROOT_DOMAIN_IDS.ENVIRONMENT,
    title: "Nature Connection",
    shortTitle: "Nature",
    internalDefinition:
      "The experienced contact, engagement and psychological connection with natural environments.",
    humanDescription:
      "How connected you feel to the natural world around you.",
    reflectionPrompt:
      "Where could you find even a small moment of nature today?",
    measurementQuestion:
      "How connected have you felt to nature?",
    kind: ROOT_CONSTRUCT_KINDS.RESOURCE,
    higherScoreMeans: ROOT_SCORE_DIRECTIONS.GREATER_STRENGTH,
    defaultApproach: ROOT_MEASUREMENT_APPROACHES.WEEKLY,
    interventionTags: ["nature", "walking", "outdoor_time", "attention"],
    organisationTags: ["nature_access", "restoration"],
    researchTags: ["nature_connection", "green_space"],
    aliases: ["green_space", "outdoor_connection"],
    evidenceStage: ROOT_EVIDENCE_STAGES.ESTABLISHED,
  }),

  [ROOT_CONSTRUCT_IDS.DIGITAL_ENVIRONMENT_LOAD]: construct({
    id: ROOT_CONSTRUCT_IDS.DIGITAL_ENVIRONMENT_LOAD,
    permanentId: "ROOT-CON-000027",
    domainId: ROOT_DOMAIN_IDS.ENVIRONMENT,
    title: "Digital Environment Load",
    shortTitle: "Digital Load",
    internalDefinition:
      "The burden created by notifications, information volume, digital interruption and online demands.",
    humanDescription:
      "How much your digital world is competing for your attention and energy.",
    reflectionPrompt:
      "Which digital demand could be made quieter?",
    measurementQuestion:
      "How overloaded have you felt by your digital environment?",
    kind: ROOT_CONSTRUCT_KINDS.DIFFICULTY,
    higherScoreMeans: ROOT_SCORE_DIRECTIONS.GREATER_DIFFICULTY,
    defaultApproach: ROOT_MEASUREMENT_APPROACHES.DAILY,
    interventionTags: [
      "notification_boundaries",
      "digital_break",
      "focus",
      "environment_design",
    ],
    organisationTags: ["digital_load", "communication_pressure"],
    researchTags: ["digital_overload", "technostress"],
    aliases: ["screen_overload", "notification_load"],
    evidenceStage: ROOT_EVIDENCE_STAGES.EMERGING,
  }),

  /*
   * PURPOSE, MEANING AND VALUES
   */

  [ROOT_CONSTRUCT_IDS.SENSE_OF_PURPOSE]: construct({
    id: ROOT_CONSTRUCT_IDS.SENSE_OF_PURPOSE,
    permanentId: "ROOT-CON-000028",
    domainId: ROOT_DOMAIN_IDS.PURPOSE,
    title: "Sense of Purpose",
    shortTitle: "Purpose",
    internalDefinition:
      "The experienced sense of direction, significance and worthwhile intention.",
    humanDescription:
      "How clearly life feels connected to something that matters.",
    reflectionPrompt:
      "What feels worth showing up for?",
    measurementQuestion:
      "How strong has your sense of purpose felt?",
    kind: ROOT_CONSTRUCT_KINDS.RESOURCE,
    higherScoreMeans: ROOT_SCORE_DIRECTIONS.GREATER_STRENGTH,
    defaultApproach: ROOT_MEASUREMENT_APPROACHES.PERIODIC,
    supportedApproaches: [
      ROOT_MEASUREMENT_APPROACHES.WEEKLY,
      ROOT_MEASUREMENT_APPROACHES.CONVERSATIONAL,
    ],
    interventionTags: ["values", "meaning", "contribution", "reflection"],
    organisationTags: ["purpose", "engagement", "meaningful_work"],
    researchTags: ["purpose_in_life", "meaning"],
    aliases: ["life_direction", "purposefulness"],
    evidenceStage: ROOT_EVIDENCE_STAGES.ESTABLISHED,
  }),

  [ROOT_CONSTRUCT_IDS.MEANINGFUL_ENGAGEMENT]: construct({
    id: ROOT_CONSTRUCT_IDS.MEANINGFUL_ENGAGEMENT,
    permanentId: "ROOT-CON-000029",
    domainId: ROOT_DOMAIN_IDS.PURPOSE,
    title: "Meaningful Engagement",
    shortTitle: "Meaningful Activity",
    internalDefinition:
      "The degree of involvement in activities experienced as worthwhile or significant.",
    humanDescription:
      "How much of your time feels connected to something worthwhile.",
    reflectionPrompt:
      "Which recent activity left you feeling that your effort mattered?",
    measurementQuestion:
      "How meaningfully engaged have you felt?",
    kind: ROOT_CONSTRUCT_KINDS.EXPERIENCE,
    higherScoreMeans: ROOT_SCORE_DIRECTIONS.GREATER_STRENGTH,
    defaultApproach: ROOT_MEASUREMENT_APPROACHES.WEEKLY,
    interventionTags: ["meaning", "strengths", "contribution", "creativity"],
    organisationTags: ["engagement", "meaningful_work"],
    researchTags: ["meaningful_activity", "engagement"],
    aliases: ["fulfilment", "meaningful_work"],
    evidenceStage: ROOT_EVIDENCE_STAGES.ESTABLISHED,
  }),

  [ROOT_CONSTRUCT_IDS.VALUES_ALIGNMENT]: construct({
    id: ROOT_CONSTRUCT_IDS.VALUES_ALIGNMENT,
    permanentId: "ROOT-CON-000030",
    domainId: ROOT_DOMAIN_IDS.PURPOSE,
    title: "Values Alignment",
    shortTitle: "Living by Your Values",
    internalDefinition:
      "The perceived consistency between personal values and everyday choices.",
    humanDescription:
      "How closely your actions feel aligned with what matters to you.",
    reflectionPrompt:
      "Which choice would feel most true to your values?",
    measurementQuestion:
      "How aligned have your choices felt with your values?",
    kind: ROOT_CONSTRUCT_KINDS.EXPERIENCE,
    higherScoreMeans: ROOT_SCORE_DIRECTIONS.GREATER_STRENGTH,
    defaultApproach: ROOT_MEASUREMENT_APPROACHES.PERIODIC,
    supportedApproaches: [
      ROOT_MEASUREMENT_APPROACHES.WEEKLY,
      ROOT_MEASUREMENT_APPROACHES.CONVERSATIONAL,
    ],
    interventionTags: ["values", "decision_support", "reflection"],
    organisationTags: ["values_alignment", "culture_alignment"],
    researchTags: ["values_congruence"],
    aliases: ["authenticity", "value_congruence"],
    evidenceStage: ROOT_EVIDENCE_STAGES.ESTABLISHED,
  }),

  /*
   * HEALTH BEHAVIOURS
   */

  [ROOT_CONSTRUCT_IDS.SELF_CARE_CONSISTENCY]: construct({
    id: ROOT_CONSTRUCT_IDS.SELF_CARE_CONSISTENCY,
    permanentId: "ROOT-CON-000031",
    domainId: ROOT_DOMAIN_IDS.HEALTH_BEHAVIOURS,
    title: "Self-Care Consistency",
    shortTitle: "Self-Care",
    internalDefinition:
      "The consistency of actions intended to maintain or restore personal wellbeing.",
    humanDescription:
      "How regularly you make space for actions that support you.",
    reflectionPrompt:
      "What is the smallest act of care that would count today?",
    measurementQuestion:
      "How consistent has your self-care been?",
    kind: ROOT_CONSTRUCT_KINDS.BEHAVIOUR,
    higherScoreMeans: ROOT_SCORE_DIRECTIONS.GREATER_STRENGTH,
    defaultApproach: ROOT_MEASUREMENT_APPROACHES.WEEKLY,
    interventionTags: ["routine", "small_steps", "planning", "boundaries"],
    organisationTags: ["self_care", "prevention"],
    researchTags: ["self_care_behaviour", "health_behaviour"],
    aliases: ["wellbeing_routine", "self_support"],
    evidenceStage: ROOT_EVIDENCE_STAGES.EMERGING,
  }),

  [ROOT_CONSTRUCT_IDS.HELP_SEEKING_CONFIDENCE]: construct({
    id: ROOT_CONSTRUCT_IDS.HELP_SEEKING_CONFIDENCE,
    permanentId: "ROOT-CON-000032",
    domainId: ROOT_DOMAIN_IDS.HEALTH_BEHAVIOURS,
    title: "Help-Seeking Confidence",
    shortTitle: "Asking for Help",
    internalDefinition:
      "The perceived confidence and practical ability to seek appropriate support.",
    humanDescription:
      "How able you feel to reach out when support would help.",
    reflectionPrompt:
      "Who or what could make the next step feel easier?",
    measurementQuestion:
      "How confident do you feel asking for help?",
    kind: ROOT_CONSTRUCT_KINDS.CAPACITY,
    higherScoreMeans: ROOT_SCORE_DIRECTIONS.GREATER_STRENGTH,
    defaultApproach: ROOT_MEASUREMENT_APPROACHES.PERIODIC,
    supportedApproaches: [
      ROOT_MEASUREMENT_APPROACHES.EVENT_BASED,
      ROOT_MEASUREMENT_APPROACHES.CONVERSATIONAL,
    ],
    interventionTags: ["support_navigation", "conversation", "planning"],
    organisationTags: ["help_seeking", "support_access"],
    researchTags: ["help_seeking", "health_literacy"],
    aliases: ["support_seeking", "asking_for_support"],
    evidenceStage: ROOT_EVIDENCE_STAGES.ESTABLISHED,
  }),

  [ROOT_CONSTRUCT_IDS.RISKY_SUBSTANCE_LOAD]: construct({
    id: ROOT_CONSTRUCT_IDS.RISKY_SUBSTANCE_LOAD,
    permanentId: "ROOT-CON-000033",
    domainId: ROOT_DOMAIN_IDS.HEALTH_BEHAVIOURS,
    title: "Risky Substance Load",
    shortTitle: "Substance Impact",
    internalDefinition:
      "The perceived health or life burden associated with alcohol, nicotine or other substance use.",
    humanDescription:
      "How much substance use may be affecting the life you want to live.",
    reflectionPrompt:
      "What role does this behaviour seem to be playing for you?",
    measurementQuestion:
      "How much is substance use affecting your wellbeing?",
    kind: ROOT_CONSTRUCT_KINDS.DIFFICULTY,
    higherScoreMeans: ROOT_SCORE_DIRECTIONS.GREATER_DIFFICULTY,
    defaultApproach: ROOT_MEASUREMENT_APPROACHES.PERIODIC,
    supportedApproaches: [
      ROOT_MEASUREMENT_APPROACHES.WEEKLY,
      ROOT_MEASUREMENT_APPROACHES.CONVERSATIONAL,
    ],
    interventionTags: [
      "reflection",
      "harm_reduction",
      "professional_support",
      "replacement_behaviour",
    ],
    organisationEligible: false,
    researchTags: ["substance_use", "risk_behaviour"],
    aliases: ["alcohol_impact", "nicotine_impact", "substance_impact"],
    evidenceStage: ROOT_EVIDENCE_STAGES.ESTABLISHED,
    requiresConsent: true,
    clinicalBoundary: true,
  }),

  [ROOT_CONSTRUCT_IDS.ROUTINE_STABILITY]: construct({
    id: ROOT_CONSTRUCT_IDS.ROUTINE_STABILITY,
    permanentId: "ROOT-CON-000034",
    domainId: ROOT_DOMAIN_IDS.HEALTH_BEHAVIOURS,
    title: "Routine Stability",
    shortTitle: "Routine",
    internalDefinition:
      "The consistency and usefulness of everyday patterns that support health and functioning.",
    humanDescription:
      "How steady and supportive your everyday rhythm feels.",
    reflectionPrompt:
      "Which part of your routine gives the rest of the day an anchor?",
    measurementQuestion:
      "How stable have your daily routines felt?",
    kind: ROOT_CONSTRUCT_KINDS.BEHAVIOUR,
    higherScoreMeans: ROOT_SCORE_DIRECTIONS.GREATER_STRENGTH,
    defaultApproach: ROOT_MEASUREMENT_APPROACHES.WEEKLY,
    interventionTags: ["routine", "planning", "small_steps", "environment"],
    organisationTags: ["routine", "work_pattern"],
    researchTags: ["habit_stability", "daily_routine"],
    aliases: ["daily_structure", "habit_consistency"],
    evidenceStage: ROOT_EVIDENCE_STAGES.EMERGING,
  }),

  /*
   * PHYSICAL HEALTH AND BODY EXPERIENCE
   */

  [ROOT_CONSTRUCT_IDS.BODY_COMFORT]: construct({
    id: ROOT_CONSTRUCT_IDS.BODY_COMFORT,
    permanentId: "ROOT-CON-000035",
    domainId: ROOT_DOMAIN_IDS.PHYSICAL_HEALTH,
    title: "Body Comfort",
    shortTitle: "Body Comfort",
    internalDefinition:
      "The perceived level of physical ease, comfort and settled bodily experience.",
    humanDescription:
      "How comfortable and settled your body feels.",
    reflectionPrompt:
      "Where in your body do you notice the greatest need for care?",
    measurementQuestion:
      "How comfortable does your body feel right now?",
    kind: ROOT_CONSTRUCT_KINDS.EXPERIENCE,
    higherScoreMeans: ROOT_SCORE_DIRECTIONS.GREATER_STRENGTH,
    defaultApproach: ROOT_MEASUREMENT_APPROACHES.MOMENTARY,
    supportedApproaches: [
      ROOT_MEASUREMENT_APPROACHES.BEFORE_AFTER,
      ROOT_MEASUREMENT_APPROACHES.CONVERSATIONAL,
    ],
    interventionTags: ["body_scan", "movement", "rest", "breathing"],
    organisationEligible: false,
    researchTags: ["somatic_experience", "body_comfort"],
    aliases: ["physical_comfort", "body_ease"],
    evidenceStage: ROOT_EVIDENCE_STAGES.EMERGING,
    clinicalBoundary: true,
  }),

  [ROOT_CONSTRUCT_IDS.PHYSICAL_ENERGY]: construct({
    id: ROOT_CONSTRUCT_IDS.PHYSICAL_ENERGY,
    permanentId: "ROOT-CON-000036",
    domainId: ROOT_DOMAIN_IDS.PHYSICAL_HEALTH,
    title: "Physical Energy",
    shortTitle: "Energy",
    internalDefinition:
      "The perceived availability of physical energy for everyday activity.",
    humanDescription:
      "How much usable physical energy you feel you have.",
    reflectionPrompt:
      "What seems to be giving or taking the most energy today?",
    measurementQuestion:
      "How energised does your body feel?",
    kind: ROOT_CONSTRUCT_KINDS.RESOURCE,
    higherScoreMeans: ROOT_SCORE_DIRECTIONS.GREATER_STRENGTH,
    defaultApproach: ROOT_MEASUREMENT_APPROACHES.DAILY,
    supportedApproaches: [
      ROOT_MEASUREMENT_APPROACHES.MOMENTARY,
      ROOT_MEASUREMENT_APPROACHES.WEEKLY,
    ],
    interventionTags: ["sleep", "nutrition", "hydration", "movement", "pacing"],
    organisationTags: ["energy", "capacity"],
    researchTags: ["subjective_energy", "vitality"],
    aliases: ["energy_level", "vitality"],
    evidenceStage: ROOT_EVIDENCE_STAGES.ESTABLISHED,
    clinicalBoundary: true,
  }),

  [ROOT_CONSTRUCT_IDS.PAIN_INTERFERENCE]: construct({
    id: ROOT_CONSTRUCT_IDS.PAIN_INTERFERENCE,
    permanentId: "ROOT-CON-000037",
    domainId: ROOT_DOMAIN_IDS.PHYSICAL_HEALTH,
    title: "Pain Interference",
    shortTitle: "Pain Impact",
    internalDefinition:
      "The degree to which pain interferes with activity, mood, sleep or participation.",
    humanDescription:
      "How much pain is getting in the way of the life you want to live.",
    reflectionPrompt:
      "Which part of life is pain affecting most today?",
    measurementQuestion:
      "How much is pain interfering with your day?",
    kind: ROOT_CONSTRUCT_KINDS.DIFFICULTY,
    higherScoreMeans: ROOT_SCORE_DIRECTIONS.GREATER_DIFFICULTY,
    defaultApproach: ROOT_MEASUREMENT_APPROACHES.DAILY,
    supportedApproaches: [
      ROOT_MEASUREMENT_APPROACHES.MOMENTARY,
      ROOT_MEASUREMENT_APPROACHES.WEEKLY,
    ],
    interventionTags: [
      "pacing",
      "movement",
      "relaxation",
      "clinical_support",
    ],
    organisationEligible: false,
    researchTags: ["pain_interference", "functional_impact"],
    aliases: ["pain_impact", "pain_burden"],
    evidenceStage: ROOT_EVIDENCE_STAGES.ESTABLISHED,
    requiresConsent: true,
    clinicalBoundary: true,
  }),

  [ROOT_CONSTRUCT_IDS.FUNCTIONAL_CAPACITY]: construct({
    id: ROOT_CONSTRUCT_IDS.FUNCTIONAL_CAPACITY,
    permanentId: "ROOT-CON-000038",
    domainId: ROOT_DOMAIN_IDS.PHYSICAL_HEALTH,
    title: "Functional Capacity",
    shortTitle: "Daily Ability",
    internalDefinition:
      "The perceived ability to complete desired or necessary everyday activities.",
    humanDescription:
      "How able you feel to do the things your day asks of you.",
    reflectionPrompt:
      "What activity matters most for you to preserve or regain?",
    measurementQuestion:
      "How able have you felt to manage everyday activities?",
    kind: ROOT_CONSTRUCT_KINDS.CAPACITY,
    higherScoreMeans: ROOT_SCORE_DIRECTIONS.GREATER_STRENGTH,
    defaultApproach: ROOT_MEASUREMENT_APPROACHES.WEEKLY,
    interventionTags: ["graded_activity", "support", "pacing", "adaptation"],
    organisationEligible: false,
    researchTags: ["function", "daily_living"],
    aliases: ["daily_function", "physical_function"],
    evidenceStage: ROOT_EVIDENCE_STAGES.ESTABLISHED,
    clinicalBoundary: true,
  }),

  /*
   * BIOMETRICS
   *
   * These constructs describe patterns only.
   * Interpretation must remain within appropriate clinical boundaries.
   */

  [ROOT_CONSTRUCT_IDS.BLOOD_PRESSURE_PATTERN]: construct({
    id: ROOT_CONSTRUCT_IDS.BLOOD_PRESSURE_PATTERN,
    permanentId: "ROOT-CON-000039",
    domainId: ROOT_DOMAIN_IDS.BIOMETRICS,
    title: "Blood Pressure Pattern",
    shortTitle: "Blood Pressure",
    internalDefinition:
      "A recorded pattern of blood pressure readings over time.",
    humanDescription:
      "The pattern shown by your recorded blood pressure readings.",
    reflectionPrompt:
      "What context may help explain changes in your readings?",
    measurementQuestion: null,
    kind: ROOT_CONSTRUCT_KINDS.SIGNAL,
    higherScoreMeans: ROOT_SCORE_DIRECTIONS.CONTEXT_DEPENDENT,
    defaultApproach: ROOT_MEASUREMENT_APPROACHES.PASSIVE,
    supportedApproaches: [ROOT_MEASUREMENT_APPROACHES.PERIODIC],
    interventionTags: ["clinical_review", "lifestyle_context"],
    organisationEligible: false,
    researchTags: ["blood_pressure", "cardiovascular_indicator"],
    aliases: ["bp", "blood_pressure"],
    evidenceStage: ROOT_EVIDENCE_STAGES.ESTABLISHED,
    userVisible: false,
    requiresConsent: true,
    clinicalBoundary: true,
  }),

  [ROOT_CONSTRUCT_IDS.GLUCOSE_PATTERN]: construct({
    id: ROOT_CONSTRUCT_IDS.GLUCOSE_PATTERN,
    permanentId: "ROOT-CON-000040",
    domainId: ROOT_DOMAIN_IDS.BIOMETRICS,
    title: "Glucose Pattern",
    shortTitle: "Glucose",
    internalDefinition:
      "A recorded pattern of glucose readings over time.",
    humanDescription:
      "The pattern shown by your recorded glucose readings.",
    reflectionPrompt:
      "What meals, activity, sleep or treatment context may be relevant?",
    measurementQuestion: null,
    kind: ROOT_CONSTRUCT_KINDS.SIGNAL,
    higherScoreMeans: ROOT_SCORE_DIRECTIONS.CONTEXT_DEPENDENT,
    defaultApproach: ROOT_MEASUREMENT_APPROACHES.PASSIVE,
    supportedApproaches: [ROOT_MEASUREMENT_APPROACHES.PERIODIC],
    interventionTags: ["clinical_review", "nutrition_context", "activity_context"],
    organisationEligible: false,
    researchTags: ["glucose", "metabolic_indicator"],
    aliases: ["blood_glucose", "cgm"],
    evidenceStage: ROOT_EVIDENCE_STAGES.ESTABLISHED,
    userVisible: false,
    requiresConsent: true,
    clinicalBoundary: true,
  }),

  [ROOT_CONSTRUCT_IDS.RESTING_HEART_RATE_PATTERN]: construct({
    id: ROOT_CONSTRUCT_IDS.RESTING_HEART_RATE_PATTERN,
    permanentId: "ROOT-CON-000041",
    domainId: ROOT_DOMAIN_IDS.BIOMETRICS,
    title: "Resting Heart Rate Pattern",
    shortTitle: "Resting Heart Rate",
    internalDefinition:
      "A recorded pattern of resting heart rate observations over time.",
    humanDescription:
      "The pattern shown by your resting heart rate readings.",
    reflectionPrompt:
      "What recent changes in sleep, stress, activity or health may matter?",
    measurementQuestion: null,
    kind: ROOT_CONSTRUCT_KINDS.SIGNAL,
    higherScoreMeans: ROOT_SCORE_DIRECTIONS.CONTEXT_DEPENDENT,
    defaultApproach: ROOT_MEASUREMENT_APPROACHES.PASSIVE,
    interventionTags: ["recovery_context", "activity_context", "clinical_review"],
    organisationEligible: false,
    researchTags: ["resting_heart_rate", "physiological_indicator"],
    aliases: ["rhr", "heart_rate"],
    evidenceStage: ROOT_EVIDENCE_STAGES.ESTABLISHED,
    userVisible: false,
    requiresConsent: true,
    clinicalBoundary: true,
  }),

  /*
   * MEDICAL AND CLINICAL FACTORS
   */

  [ROOT_CONSTRUCT_IDS.TREATMENT_BURDEN]: construct({
    id: ROOT_CONSTRUCT_IDS.TREATMENT_BURDEN,
    permanentId: "ROOT-CON-000042",
    domainId: ROOT_DOMAIN_IDS.MEDICAL_FACTORS,
    title: "Treatment Burden",
    shortTitle: "Treatment Demands",
    internalDefinition:
      "The practical, emotional and cognitive burden associated with managing treatment or healthcare.",
    humanDescription:
      "How much managing your health or treatment is asking of you.",
    reflectionPrompt:
      "Which part of managing your health feels hardest to carry?",
    measurementQuestion:
      "How burdensome has managing treatment or healthcare felt?",
    kind: ROOT_CONSTRUCT_KINDS.DIFFICULTY,
    higherScoreMeans: ROOT_SCORE_DIRECTIONS.GREATER_DIFFICULTY,
    defaultApproach: ROOT_MEASUREMENT_APPROACHES.WEEKLY,
    interventionTags: [
      "planning",
      "support",
      "care_navigation",
      "clinical_conversation",
    ],
    organisationEligible: false,
    researchTags: ["treatment_burden", "self_management"],
    aliases: ["care_burden", "medical_management_load"],
    evidenceStage: ROOT_EVIDENCE_STAGES.ESTABLISHED,
    requiresConsent: true,
    clinicalBoundary: true,
  }),

  [ROOT_CONSTRUCT_IDS.MEDICATION_ROUTINE_CONFIDENCE]: construct({
    id: ROOT_CONSTRUCT_IDS.MEDICATION_ROUTINE_CONFIDENCE,
    permanentId: "ROOT-CON-000043",
    domainId: ROOT_DOMAIN_IDS.MEDICAL_FACTORS,
    title: "Medication Routine Confidence",
    shortTitle: "Medication Routine",
    internalDefinition:
      "The perceived confidence in following an agreed medication routine.",
    humanDescription:
      "How confident you feel managing your agreed medication routine.",
    reflectionPrompt:
      "What would make your medication routine easier to follow?",
    measurementQuestion:
      "How confident do you feel managing your medication routine?",
    kind: ROOT_CONSTRUCT_KINDS.CAPACITY,
    higherScoreMeans: ROOT_SCORE_DIRECTIONS.GREATER_STRENGTH,
    defaultApproach: ROOT_MEASUREMENT_APPROACHES.PERIODIC,
    interventionTags: [
      "routine",
      "reminders",
      "clinical_conversation",
      "pharmacy_support",
    ],
    organisationEligible: false,
    researchTags: ["medication_adherence", "self_management_confidence"],
    aliases: ["medication_confidence", "medicine_routine"],
    evidenceStage: ROOT_EVIDENCE_STAGES.ESTABLISHED,
    requiresConsent: true,
    clinicalBoundary: true,
  }),

  [ROOT_CONSTRUCT_IDS.HEALTHCARE_ACCESS]: construct({
    id: ROOT_CONSTRUCT_IDS.HEALTHCARE_ACCESS,
    permanentId: "ROOT-CON-000044",
    domainId: ROOT_DOMAIN_IDS.MEDICAL_FACTORS,
    title: "Healthcare Access",
    shortTitle: "Access to Care",
    internalDefinition:
      "The perceived ability to obtain timely and appropriate healthcare support.",
    humanDescription:
      "How easy or difficult it is to get the healthcare support you need.",
    reflectionPrompt:
      "What is the biggest barrier between you and the support you need?",
    measurementQuestion:
      "How able have you been to access appropriate healthcare?",
    kind: ROOT_CONSTRUCT_KINDS.RESOURCE,
    higherScoreMeans: ROOT_SCORE_DIRECTIONS.GREATER_STRENGTH,
    defaultApproach: ROOT_MEASUREMENT_APPROACHES.PERIODIC,
    interventionTags: ["care_navigation", "support", "planning"],
    organisationEligible: false,
    researchTags: ["healthcare_access", "health_inequality"],
    aliases: ["access_to_care", "care_availability"],
    evidenceStage: ROOT_EVIDENCE_STAGES.ESTABLISHED,
    requiresConsent: true,
    clinicalBoundary: true,
  }),

  /*
   * WORK AND OCCUPATIONAL WELLBEING
   */

  [ROOT_CONSTRUCT_IDS.WORKLOAD_PRESSURE]: construct({
    id: ROOT_CONSTRUCT_IDS.WORKLOAD_PRESSURE,
    permanentId: "ROOT-CON-000045",
    domainId: ROOT_DOMAIN_IDS.WORK,
    title: "Workload Pressure",
    shortTitle: "Workload",
    internalDefinition:
      "The perceived pressure created by the volume, pace, complexity or urgency of work.",
    humanDescription:
      "How much work is asking of you compared with what feels manageable.",
    reflectionPrompt:
      "Which demand is creating the greatest pressure?",
    measurementQuestion:
      "How overwhelming has your workload felt?",
    kind: ROOT_CONSTRUCT_KINDS.DIFFICULTY,
    higherScoreMeans: ROOT_SCORE_DIRECTIONS.GREATER_DIFFICULTY,
    defaultApproach: ROOT_MEASUREMENT_APPROACHES.WEEKLY,
    supportedApproaches: [
      ROOT_MEASUREMENT_APPROACHES.DAILY,
      ROOT_MEASUREMENT_APPROACHES.CONVERSATIONAL,
    ],
    relatedConstructIds: [
      ROOT_CONSTRUCT_IDS.STRESS_LOAD,
      ROOT_CONSTRUCT_IDS.RECOVERY_DIFFICULTY,
    ],
    interventionTags: [
      "prioritisation",
      "boundaries",
      "manager_conversation",
      "planning",
    ],
    organisationTags: ["workload", "capacity", "burnout_risk"],
    researchTags: ["workload", "job_demand"],
    aliases: ["work_pressure", "job_demand"],
    evidenceStage: ROOT_EVIDENCE_STAGES.ESTABLISHED,
  }),

  [ROOT_CONSTRUCT_IDS.WORKPLACE_PSYCHOLOGICAL_SAFETY]: construct({
    id: ROOT_CONSTRUCT_IDS.WORKPLACE_PSYCHOLOGICAL_SAFETY,
    permanentId: "ROOT-CON-000046",
    domainId: ROOT_DOMAIN_IDS.WORK,
    title: "Workplace Psychological Safety",
    shortTitle: "Psychological Safety",
    internalDefinition:
      "The perceived safety of speaking, questioning, admitting uncertainty or raising concerns at work.",
    humanDescription:
      "How safe it feels to be honest, ask questions and speak up at work.",
    reflectionPrompt:
      "What makes it easier or harder to speak openly?",
    measurementQuestion:
      "How psychologically safe has your workplace felt?",
    kind: ROOT_CONSTRUCT_KINDS.CONTEXT,
    higherScoreMeans: ROOT_SCORE_DIRECTIONS.GREATER_STRENGTH,
    defaultApproach: ROOT_MEASUREMENT_APPROACHES.PERIODIC,
    supportedApproaches: [ROOT_MEASUREMENT_APPROACHES.WEEKLY],
    interventionTags: [
      "leadership",
      "team_conversation",
      "culture",
      "manager_support",
    ],
    organisationTags: ["psychological_safety", "culture", "speak_up"],
    researchTags: ["psychological_safety", "team_climate"],
    aliases: ["speak_up_safety", "workplace_safety"],
    evidenceStage: ROOT_EVIDENCE_STAGES.ESTABLISHED,
  }),

  [ROOT_CONSTRUCT_IDS.WORK_AUTONOMY]: construct({
    id: ROOT_CONSTRUCT_IDS.WORK_AUTONOMY,
    permanentId: "ROOT-CON-000047",
    domainId: ROOT_DOMAIN_IDS.WORK,
    title: "Work Autonomy",
    shortTitle: "Autonomy",
    internalDefinition:
      "The perceived ability to influence how, when or in what order work is completed.",
    humanDescription:
      "How much control and choice you feel you have in your work.",
    reflectionPrompt:
      "Where would a little more choice make the biggest difference?",
    measurementQuestion:
      "How much autonomy have you felt in your work?",
    kind: ROOT_CONSTRUCT_KINDS.RESOURCE,
    higherScoreMeans: ROOT_SCORE_DIRECTIONS.GREATER_STRENGTH,
    defaultApproach: ROOT_MEASUREMENT_APPROACHES.PERIODIC,
    interventionTags: ["role_design", "manager_conversation", "planning"],
    organisationTags: ["autonomy", "job_control"],
    researchTags: ["job_control", "autonomy"],
    aliases: ["job_control", "work_choice"],
    evidenceStage: ROOT_EVIDENCE_STAGES.ESTABLISHED,
  }),

  [ROOT_CONSTRUCT_IDS.WORK_LIFE_INTERACTION]: construct({
    id: ROOT_CONSTRUCT_IDS.WORK_LIFE_INTERACTION,
    permanentId: "ROOT-CON-000048",
    domainId: ROOT_DOMAIN_IDS.WORK,
    title: "Work-Life Interaction",
    shortTitle: "Work-Life Balance",
    internalDefinition:
      "The degree to which work and personal life support or interfere with one another.",
    humanDescription:
      "How work and the rest of your life are affecting each other.",
    reflectionPrompt:
      "Where is work crossing into life more than you would like?",
    measurementQuestion:
      "How difficult has the interaction between work and life felt?",
    kind: ROOT_CONSTRUCT_KINDS.EXPERIENCE,
    higherScoreMeans: ROOT_SCORE_DIRECTIONS.GREATER_DIFFICULTY,
    defaultApproach: ROOT_MEASUREMENT_APPROACHES.WEEKLY,
    interventionTags: ["boundaries", "recovery", "planning", "communication"],
    organisationTags: ["work_life_balance", "work_design"],
    researchTags: ["work_family_conflict", "work_life_interface"],
    aliases: ["work_life_balance", "work_home_interference"],
    evidenceStage: ROOT_EVIDENCE_STAGES.ESTABLISHED,
  }),

  /*
   * FINANCIAL WELLBEING
   */

  [ROOT_CONSTRUCT_IDS.FINANCIAL_PRESSURE]: construct({
    id: ROOT_CONSTRUCT_IDS.FINANCIAL_PRESSURE,
    permanentId: "ROOT-CON-000049",
    domainId: ROOT_DOMAIN_IDS.FINANCIAL_WELLBEING,
    title: "Financial Pressure",
    shortTitle: "Money Pressure",
    internalDefinition:
      "The perceived emotional and practical burden associated with financial demands or insecurity.",
    humanDescription:
      "How much money worries are weighing on you.",
    reflectionPrompt:
      "Which financial uncertainty is taking up the most space?",
    measurementQuestion:
      "How strongly has financial pressure affected you?",
    kind: ROOT_CONSTRUCT_KINDS.DIFFICULTY,
    higherScoreMeans: ROOT_SCORE_DIRECTIONS.GREATER_DIFFICULTY,
    defaultApproach: ROOT_MEASUREMENT_APPROACHES.WEEKLY,
    interventionTags: [
      "planning",
      "support_navigation",
      "prioritisation",
      "conversation",
    ],
    organisationTags: ["financial_wellbeing", "financial_stress"],
    researchTags: ["financial_strain", "economic_stress"],
    aliases: ["money_stress", "financial_strain"],
    evidenceStage: ROOT_EVIDENCE_STAGES.ESTABLISHED,
    requiresConsent: true,
  }),

  [ROOT_CONSTRUCT_IDS.FINANCIAL_CONTROL]: construct({
    id: ROOT_CONSTRUCT_IDS.FINANCIAL_CONTROL,
    permanentId: "ROOT-CON-000050",
    domainId: ROOT_DOMAIN_IDS.FINANCIAL_WELLBEING,
    title: "Financial Control",
    shortTitle: "Financial Control",
    internalDefinition:
      "The perceived ability to understand, plan and influence personal financial circumstances.",
    humanDescription:
      "How much control you feel you have over your financial situation.",
    reflectionPrompt:
      "What one financial action would increase your sense of control?",
    measurementQuestion:
      "How much control do you feel over your finances?",
    kind: ROOT_CONSTRUCT_KINDS.CAPACITY,
    higherScoreMeans: ROOT_SCORE_DIRECTIONS.GREATER_STRENGTH,
    defaultApproach: ROOT_MEASUREMENT_APPROACHES.PERIODIC,
    interventionTags: ["planning", "information", "support_navigation"],
    organisationTags: ["financial_wellbeing", "financial_control"],
    researchTags: ["financial_control", "financial_capability"],
    aliases: ["money_control", "financial_management"],
    evidenceStage: ROOT_EVIDENCE_STAGES.ESTABLISHED,
    requiresConsent: true,
  }),

  [ROOT_CONSTRUCT_IDS.FINANCIAL_CONFIDENCE]: construct({
    id: ROOT_CONSTRUCT_IDS.FINANCIAL_CONFIDENCE,
    permanentId: "ROOT-CON-000051",
    domainId: ROOT_DOMAIN_IDS.FINANCIAL_WELLBEING,
    title: "Financial Confidence",
    shortTitle: "Money Confidence",
    internalDefinition:
      "The perceived confidence to make and act upon financial decisions.",
    humanDescription:
      "How confident you feel making financial choices.",
    reflectionPrompt:
      "What information or support would make the next decision clearer?",
    measurementQuestion:
      "How confident do you feel making financial decisions?",
    kind: ROOT_CONSTRUCT_KINDS.CAPACITY,
    higherScoreMeans: ROOT_SCORE_DIRECTIONS.GREATER_STRENGTH,
    defaultApproach: ROOT_MEASUREMENT_APPROACHES.PERIODIC,
    interventionTags: ["information", "decision_support", "planning"],
    organisationTags: ["financial_confidence"],
    researchTags: ["financial_self_efficacy"],
    aliases: ["money_confidence", "financial_self_efficacy"],
    evidenceStage: ROOT_EVIDENCE_STAGES.ESTABLISHED,
    requiresConsent: true,
  }),

  /*
   * LIFE EVENTS AND TRANSITIONS
   */

  [ROOT_CONSTRUCT_IDS.CHANGE_LOAD]: construct({
    id: ROOT_CONSTRUCT_IDS.CHANGE_LOAD,
    permanentId: "ROOT-CON-000052",
    domainId: ROOT_DOMAIN_IDS.LIFE_TRANSITIONS,
    title: "Change Load",
    shortTitle: "Life Change",
    internalDefinition:
      "The cumulative emotional, practical and cognitive burden associated with change.",
    humanDescription:
      "How much change you are currently having to absorb.",
    reflectionPrompt:
      "Which part of the change feels hardest to carry?",
    measurementQuestion:
      "How heavily is change affecting you?",
    kind: ROOT_CONSTRUCT_KINDS.DIFFICULTY,
    higherScoreMeans: ROOT_SCORE_DIRECTIONS.GREATER_DIFFICULTY,
    defaultApproach: ROOT_MEASUREMENT_APPROACHES.WEEKLY,
    interventionTags: [
      "orientation",
      "planning",
      "support",
      "acceptance",
      "pacing",
    ],
    organisationTags: ["change_load", "organisational_change"],
    researchTags: ["life_change", "transition_stress"],
    aliases: ["transition_load", "change_stress"],
    evidenceStage: ROOT_EVIDENCE_STAGES.ESTABLISHED,
  }),

  [ROOT_CONSTRUCT_IDS.UNCERTAINTY_LOAD]: construct({
    id: ROOT_CONSTRUCT_IDS.UNCERTAINTY_LOAD,
    permanentId: "ROOT-CON-000053",
    domainId: ROOT_DOMAIN_IDS.LIFE_TRANSITIONS,
    title: "Uncertainty Load",
    shortTitle: "Uncertainty",
    internalDefinition:
      "The emotional and cognitive burden created by unclear, unpredictable or unresolved circumstances.",
    humanDescription:
      "How much not knowing is affecting you.",
    reflectionPrompt:
      "What can be known, influenced or accepted today?",
    measurementQuestion:
      "How difficult has uncertainty felt?",
    kind: ROOT_CONSTRUCT_KINDS.DIFFICULTY,
    higherScoreMeans: ROOT_SCORE_DIRECTIONS.GREATER_DIFFICULTY,
    defaultApproach: ROOT_MEASUREMENT_APPROACHES.MOMENTARY,
    supportedApproaches: [
      ROOT_MEASUREMENT_APPROACHES.WEEKLY,
      ROOT_MEASUREMENT_APPROACHES.CONVERSATIONAL,
    ],
    relatedConstructIds: [
      ROOT_CONSTRUCT_IDS.ANXIETY_INTENSITY,
      ROOT_CONSTRUCT_IDS.DECISION_CONFIDENCE,
    ],
    interventionTags: [
      "acceptance",
      "decision_support",
      "grounding",
      "planning",
    ],
    organisationTags: ["uncertainty", "change"],
    researchTags: ["intolerance_of_uncertainty", "uncertainty_stress"],
    aliases: ["not_knowing", "uncertainty_stress"],
    evidenceStage: ROOT_EVIDENCE_STAGES.ESTABLISHED,
  }),

  [ROOT_CONSTRUCT_IDS.TRANSITION_ADAPTATION]: construct({
    id: ROOT_CONSTRUCT_IDS.TRANSITION_ADAPTATION,
    permanentId: "ROOT-CON-000054",
    domainId: ROOT_DOMAIN_IDS.LIFE_TRANSITIONS,
    title: "Transition Adaptation",
    shortTitle: "Adapting to Change",
    internalDefinition:
      "The perceived capacity to adjust practically and emotionally to a life transition.",
    humanDescription:
      "How able you feel to find your footing within change.",
    reflectionPrompt:
      "What is helping you adapt, even slightly?",
    measurementQuestion:
      "How well are you adapting to the change you are experiencing?",
    kind: ROOT_CONSTRUCT_KINDS.CAPACITY,
    higherScoreMeans: ROOT_SCORE_DIRECTIONS.GREATER_STRENGTH,
    defaultApproach: ROOT_MEASUREMENT_APPROACHES.WEEKLY,
    interventionTags: ["support", "meaning", "planning", "acceptance"],
    organisationTags: ["change_adaptation", "transition_support"],
    researchTags: ["adaptation", "transition_adjustment"],
    aliases: ["adjustment", "change_adaptation"],
    evidenceStage: ROOT_EVIDENCE_STAGES.ESTABLISHED,
  }),

  /*
   * PERSONAL GROWTH AND LIFE SKILLS
   */

  [ROOT_CONSTRUCT_IDS.DECISION_CONFIDENCE]: construct({
    id: ROOT_CONSTRUCT_IDS.DECISION_CONFIDENCE,
    permanentId: "ROOT-CON-000055",
    domainId: ROOT_DOMAIN_IDS.PERSONAL_GROWTH,
    title: "Decision Confidence",
    shortTitle: "Decision Confidence",
    internalDefinition:
      "The perceived ability to make a sufficiently informed and values-consistent decision under uncertainty.",
    humanDescription:
      "How confident you feel choosing your next step.",
    reflectionPrompt:
      "Which choice best respects what matters and what is known today?",
    measurementQuestion:
      "How confident do you feel about your next decision?",
    kind: ROOT_CONSTRUCT_KINDS.CAPACITY,
    higherScoreMeans: ROOT_SCORE_DIRECTIONS.GREATER_STRENGTH,
    defaultApproach: ROOT_MEASUREMENT_APPROACHES.EVENT_BASED,
    supportedApproaches: [
      ROOT_MEASUREMENT_APPROACHES.BEFORE_AFTER,
      ROOT_MEASUREMENT_APPROACHES.CONVERSATIONAL,
    ],
    relatedConstructIds: [
      ROOT_CONSTRUCT_IDS.UNCERTAINTY_LOAD,
      ROOT_CONSTRUCT_IDS.VALUES_ALIGNMENT,
    ],
    interventionTags: [
      "decision_support",
      "values",
      "reflection",
      "information",
    ],
    organisationTags: ["decision_confidence", "role_clarity"],
    researchTags: ["decision_self_efficacy", "uncertainty"],
    aliases: ["choice_confidence", "decision_clarity"],
    evidenceStage: ROOT_EVIDENCE_STAGES.EMERGING,
  }),

  [ROOT_CONSTRUCT_IDS.SELF_UNDERSTANDING]: construct({
    id: ROOT_CONSTRUCT_IDS.SELF_UNDERSTANDING,
    permanentId: "ROOT-CON-000056",
    domainId: ROOT_DOMAIN_IDS.PERSONAL_GROWTH,
    title: "Self-Understanding",
    shortTitle: "Knowing Yourself",
    internalDefinition:
      "The perceived understanding of personal patterns, needs, values, strengths and responses.",
    humanDescription:
      "How clearly you understand what is happening within you and why.",
    reflectionPrompt:
      "What pattern are you beginning to recognise?",
    measurementQuestion:
      "How clearly do you understand your current experience?",
    kind: ROOT_CONSTRUCT_KINDS.CAPACITY,
    higherScoreMeans: ROOT_SCORE_DIRECTIONS.GREATER_STRENGTH,
    defaultApproach: ROOT_MEASUREMENT_APPROACHES.CONVERSATIONAL,
    supportedApproaches: [
      ROOT_MEASUREMENT_APPROACHES.WEEKLY,
      ROOT_MEASUREMENT_APPROACHES.PERIODIC,
    ],
    interventionTags: ["journalling", "reflection", "coaching", "pattern_review"],
    organisationEligible: false,
    researchTags: ["self_awareness", "insight"],
    aliases: ["self_awareness", "personal_insight"],
    evidenceStage: ROOT_EVIDENCE_STAGES.ESTABLISHED,
  }),

  [ROOT_CONSTRUCT_IDS.ADAPTABILITY]: construct({
    id: ROOT_CONSTRUCT_IDS.ADAPTABILITY,
    permanentId: "ROOT-CON-000057",
    domainId: ROOT_DOMAIN_IDS.PERSONAL_GROWTH,
    title: "Adaptability",
    shortTitle: "Adaptability",
    internalDefinition:
      "The perceived capacity to adjust thoughts, behaviour or expectations as circumstances change.",
    humanDescription:
      "How able you feel to adjust without losing yourself.",
    reflectionPrompt:
      "What could bend without breaking what matters?",
    measurementQuestion:
      "How adaptable have you felt?",
    kind: ROOT_CONSTRUCT_KINDS.CAPACITY,
    higherScoreMeans: ROOT_SCORE_DIRECTIONS.GREATER_STRENGTH,
    defaultApproach: ROOT_MEASUREMENT_APPROACHES.PERIODIC,
    supportedApproaches: [ROOT_MEASUREMENT_APPROACHES.WEEKLY],
    interventionTags: ["reframing", "acceptance", "planning", "experimentation"],
    organisationTags: ["adaptability", "change_readiness"],
    researchTags: ["adaptability", "psychological_flexibility"],
    aliases: ["flexibility", "adjustment_capacity"],
    evidenceStage: ROOT_EVIDENCE_STAGES.ESTABLISHED,
  }),

  [ROOT_CONSTRUCT_IDS.SOCIAL_CONFIDENCE]: construct({
    id: ROOT_CONSTRUCT_IDS.SOCIAL_CONFIDENCE,
    permanentId: "ROOT-CON-000058",
    domainId: ROOT_DOMAIN_IDS.PERSONAL_GROWTH,
    title: "Social Confidence",
    shortTitle: "Social Confidence",
    internalDefinition:
      "The perceived confidence to communicate, participate and navigate social situations.",
    humanDescription:
      "How confident you feel being yourself around other people.",
    reflectionPrompt:
      "What would make the next social step feel more comfortable?",
    measurementQuestion:
      "How confident have you felt in social situations?",
    kind: ROOT_CONSTRUCT_KINDS.CAPACITY,
    higherScoreMeans: ROOT_SCORE_DIRECTIONS.GREATER_STRENGTH,
    defaultApproach: ROOT_MEASUREMENT_APPROACHES.WEEKLY,
    supportedApproaches: [
      ROOT_MEASUREMENT_APPROACHES.EVENT_BASED,
      ROOT_MEASUREMENT_APPROACHES.BEFORE_AFTER,
    ],
    interventionTags: [
      "graded_exposure",
      "communication",
      "preparation",
      "self_compassion",
    ],
    organisationTags: ["social_confidence", "participation"],
    researchTags: ["social_self_efficacy", "social_participation"],
    aliases: ["interpersonal_confidence", "social_ease"],
    evidenceStage: ROOT_EVIDENCE_STAGES.ESTABLISHED,
  }),
});

export const ROOT_CONSTRUCT_LIST = Object.freeze(
  Object.values(ROOT_CONSTRUCTS)
);

/**
 * Finds a construct using:
 * - construct key
 * - permanent ID
 * - alias
 */
export function getRootConstruct(identifier) {
  if (!identifier || typeof identifier !== "string") {
    return null;
  }

  const normalisedIdentifier = identifier.trim().toLowerCase();

  const directMatch = ROOT_CONSTRUCTS[normalisedIdentifier];

  if (directMatch) {
    return directMatch;
  }

  return (
    ROOT_CONSTRUCT_LIST.find(
      (item) =>
        item.permanentId.toLowerCase() === normalisedIdentifier ||
        item.aliases.some(
          (alias) => alias.toLowerCase() === normalisedIdentifier
        )
    ) || null
  );
}

/**
 * Returns true when the identifier belongs to a recognised construct.
 */
export function isRootConstruct(identifier) {
  return Boolean(getRootConstruct(identifier));
}

/**
 * Returns active constructs for one Root domain.
 */
export function getConstructsByDomain(domainIdentifier, options = {}) {
  const { activeOnly = true, userVisibleOnly = false } = options;

  if (!domainIdentifier || typeof domainIdentifier !== "string") {
    return [];
  }

  const normalisedDomain = domainIdentifier.trim().toLowerCase();

  return ROOT_CONSTRUCT_LIST.filter((item) => {
    const belongsToDomain = item.domainId === normalisedDomain;
    const passesActiveFilter = activeOnly ? item.active : true;
    const passesVisibleFilter = userVisibleOnly ? item.userVisible : true;

    return (
      belongsToDomain &&
      passesActiveFilter &&
      passesVisibleFilter
    );
  });
}

/**
 * Returns constructs suitable for anonymous organisational analysis.
 */
export function getOrganisationEligibleConstructs(domainIdentifier = null) {
  return ROOT_CONSTRUCT_LIST.filter((item) => {
    if (!item.active || !item.organisationEligible) {
      return false;
    }

    if (!domainIdentifier) {
      return true;
    }

    return item.domainId === String(domainIdentifier).trim().toLowerCase();
  });
}

/**
 * Returns constructs suitable for research exports.
 */
export function getResearchEligibleConstructs(domainIdentifier = null) {
  return ROOT_CONSTRUCT_LIST.filter((item) => {
    if (!item.active || !item.researchEligible) {
      return false;
    }

    if (!domainIdentifier) {
      return true;
    }

    return item.domainId === String(domainIdentifier).trim().toLowerCase();
  });
}

/**
 * Returns constructs that may require additional safeguards.
 */
export function getSafeguardedConstructs() {
  return ROOT_CONSTRUCT_LIST.filter(
    (item) => item.requiresConsent || item.clinicalBoundary
  );
}

/**
 * Returns constructs connected to an intervention tag.
 *
 * Example:
 * getConstructsByInterventionTag("grounding")
 */
export function getConstructsByInterventionTag(tag) {
  if (!tag || typeof tag !== "string") {
    return [];
  }

  const normalisedTag = tag.trim().toLowerCase();

  return ROOT_CONSTRUCT_LIST.filter((item) =>
    item.interventionTags.some(
      (interventionTag) =>
        interventionTag.toLowerCase() === normalisedTag
    )
  );
}

/**
 * Returns constructs connected to an organisational insight tag.
 */
export function getConstructsByOrganisationTag(tag) {
  if (!tag || typeof tag !== "string") {
    return [];
  }

  const normalisedTag = tag.trim().toLowerCase();

  return ROOT_CONSTRUCT_LIST.filter(
    (item) =>
      item.organisationEligible &&
      item.organisationTags.some(
        (organisationTag) =>
          organisationTag.toLowerCase() === normalisedTag
      )
  );
}

/**
 * Returns a lightweight construct representation for selectors,
 * user interfaces and other non-research surfaces.
 */
export function getRootConstructOptions({
  domainId = null,
  activeOnly = true,
  userVisibleOnly = true,
} = {}) {
  return ROOT_CONSTRUCT_LIST.filter((item) => {
    if (domainId && item.domainId !== domainId) {
      return false;
    }

    if (activeOnly && !item.active) {
      return false;
    }

    if (userVisibleOnly && !item.userVisible) {
      return false;
    }

    return true;
  }).map((item) => ({
    value: item.id,
    label: item.shortTitle,
    domainId: item.domainId,
    permanentId: item.permanentId,
    question: item.measurementQuestion,
  }));
}

/**
 * Produces the scientific identity used when storing a measurement.
 *
 * Human-facing wording may evolve.
 * These stable identifiers must not.
 */
export function getConstructMeasurementIdentity(identifier) {
  const item = getRootConstruct(identifier);

  if (!item) {
    return null;
  }

  return {
    constructId: item.id,
    constructPermanentId: item.permanentId,
    domainId: item.domainId,
    schemaVersion: ROOT_CONSTRUCT_SCHEMA_VERSION,
    scoreDirection: item.higherScoreMeans,
    constructKind: item.kind,
  };
}

/**
 * Validates the full Root construct registry.
 *
 * Throws when:
 * - a required property is missing
 * - a registry key does not match its construct ID
 * - a permanent ID is duplicated
 * - an unknown domain is referenced
 * - an invalid parent construct is referenced
 * - an invalid related construct is referenced
 */
export function validateRootConstructs() {
  const permanentIds = new Set();

  for (const [registryKey, item] of Object.entries(ROOT_CONSTRUCTS)) {
    const requiredValues = [
      item.id,
      item.permanentId,
      item.domainId,
      item.title,
      item.internalDefinition,
      item.kind,
      item.higherScoreMeans,
    ];

    if (requiredValues.some((value) => !value)) {
      throw new Error(
        `Root construct "${registryKey}" is missing one or more required values.`
      );
    }

    if (registryKey !== item.id) {
      throw new Error(
        `Root construct key "${registryKey}" does not match construct id "${item.id}".`
      );
    }

    if (!isRootDomain(item.domainId)) {
      throw new Error(
        `Root construct "${item.id}" references unknown domain "${item.domainId}".`
      );
    }

    if (permanentIds.has(item.permanentId)) {
      throw new Error(
        `Duplicate Root construct permanentId detected: "${item.permanentId}".`
      );
    }

    if (
      item.parentConstructId &&
      !ROOT_CONSTRUCTS[item.parentConstructId]
    ) {
      throw new Error(
        `Root construct "${item.id}" references unknown parent "${item.parentConstructId}".`
      );
    }

    for (const relatedConstructId of item.relatedConstructIds) {
      if (!ROOT_CONSTRUCTS[relatedConstructId]) {
        throw new Error(
          `Root construct "${item.id}" references unknown related construct "${relatedConstructId}".`
        );
      }
    }

    permanentIds.add(item.permanentId);
  }

  return {
    valid: true,
    schemaVersion: ROOT_CONSTRUCT_SCHEMA_VERSION,
    constructCount: ROOT_CONSTRUCT_LIST.length,
    safeguardedConstructCount: getSafeguardedConstructs().length,
    organisationEligibleCount:
      getOrganisationEligibleConstructs().length,
    researchEligibleCount: getResearchEligibleConstructs().length,
  };
}

export default ROOT_CONSTRUCTS;
