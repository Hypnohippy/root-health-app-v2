/**
 * Root Core — Health Domains
 *
 * This file defines Root's permanent, expandable health-domain structure.
 *
 * Domains are broad areas of human health and life.
 * They are intentionally not limited to the traditional six pillars of
 * lifestyle medicine. Root can expand its understanding without requiring
 * changes to the measurement engine.
 *
 * Important:
 * - Domain IDs must never be renamed after data has been stored against them.
 * - New domains may be added.
 * - Constructs within each domain are defined separately.
 * - This file contains structure, not user measurements.
 */

export const ROOT_DOMAIN_SCHEMA_VERSION = "1.0.0";

export const ROOT_DOMAIN_IDS = Object.freeze({
  MIND: "mind",
  SLEEP: "sleep",
  NUTRITION: "nutrition",
  MOVEMENT: "movement",
  RECOVERY: "recovery",
  CONNECTION: "connection",
  ENVIRONMENT: "environment",
  PURPOSE: "purpose",
  HEALTH_BEHAVIOURS: "health_behaviours",
  PHYSICAL_HEALTH: "physical_health",
  BIOMETRICS: "biometrics",
  MEDICAL_FACTORS: "medical_factors",
  WORK: "work",
  FINANCIAL_WELLBEING: "financial_wellbeing",
  LIFE_TRANSITIONS: "life_transitions",
  PERSONAL_GROWTH: "personal_growth",
});

const domain = ({
  id,
  permanentId,
  title,
  shortTitle,
  description,
  icon,
  sortOrder,
  lifestyleMedicineMapping = [],
  aliases = [],
  active = true,
  metadata = {},
}) =>
  Object.freeze({
    id,
    permanentId,
    title,
    shortTitle,
    description,
    icon,
    sortOrder,
    lifestyleMedicineMapping: Object.freeze([...lifestyleMedicineMapping]),
    aliases: Object.freeze([...aliases]),
    active,
    metadata: Object.freeze({ ...metadata }),
  });

/**
 * Root's expandable health-domain registry.
 *
 * The object key and the domain's `id` deliberately match.
 * This makes lookups predictable throughout Root.
 */
export const ROOT_DOMAINS = Object.freeze({
  [ROOT_DOMAIN_IDS.MIND]: domain({
    id: ROOT_DOMAIN_IDS.MIND,
    permanentId: "ROOT-DOM-001",
    title: "Mind and Emotional Health",
    shortTitle: "Mind",
    description:
      "Thoughts, emotions, psychological load, coping, attention, identity, resilience and the ways a person interprets and responds to life.",
    icon: "brain",
    sortOrder: 10,
    lifestyleMedicineMapping: ["stress_management"],
    aliases: [
      "mental_health",
      "emotional_health",
      "psychological_health",
      "mind_and_mood",
    ],
  }),

  [ROOT_DOMAIN_IDS.SLEEP]: domain({
    id: ROOT_DOMAIN_IDS.SLEEP,
    permanentId: "ROOT-DOM-002",
    title: "Sleep",
    shortTitle: "Sleep",
    description:
      "Sleep quality, duration, timing, consistency, restoration, sleep environment and the behaviours or conditions that influence sleep.",
    icon: "moon",
    sortOrder: 20,
    lifestyleMedicineMapping: ["restorative_sleep"],
    aliases: ["sleep_health", "restorative_sleep"],
  }),

  [ROOT_DOMAIN_IDS.NUTRITION]: domain({
    id: ROOT_DOMAIN_IDS.NUTRITION,
    permanentId: "ROOT-DOM-003",
    title: "Nutrition and Hydration",
    shortTitle: "Nutrition",
    description:
      "Food, hydration, eating patterns, dietary quality, access, preparation, nutritional confidence and the physical, emotional and social relationships surrounding food.",
    icon: "utensils",
    sortOrder: 30,
    lifestyleMedicineMapping: ["whole_food_plant_predominant_nutrition"],
    aliases: ["diet", "food", "hydration", "nutrition_and_gut_health"],
  }),

  [ROOT_DOMAIN_IDS.MOVEMENT]: domain({
    id: ROOT_DOMAIN_IDS.MOVEMENT,
    permanentId: "ROOT-DOM-004",
    title: "Movement and Physical Activity",
    shortTitle: "Movement",
    description:
      "Daily movement, structured exercise, strength, mobility, balance, cardiovascular activity, sedentary behaviour and confidence in physical activity.",
    icon: "activity",
    sortOrder: 40,
    lifestyleMedicineMapping: ["physical_activity"],
    aliases: ["exercise", "physical_activity", "mobility"],
  }),

  [ROOT_DOMAIN_IDS.RECOVERY]: domain({
    id: ROOT_DOMAIN_IDS.RECOVERY,
    permanentId: "ROOT-DOM-005",
    title: "Recovery and Restoration",
    shortTitle: "Recovery",
    description:
      "The capacity to recover from physical, emotional, cognitive and social demands through rest, regulation, pacing and restorative activity.",
    icon: "battery-charging",
    sortOrder: 50,
    lifestyleMedicineMapping: ["stress_management", "restorative_sleep"],
    aliases: ["rest", "restoration", "fatigue_management"],
  }),

  [ROOT_DOMAIN_IDS.CONNECTION]: domain({
    id: ROOT_DOMAIN_IDS.CONNECTION,
    permanentId: "ROOT-DOM-006",
    title: "Relationships and Social Connection",
    shortTitle: "Connection",
    description:
      "Relationships, belonging, loneliness, support, communication, intimacy, community participation, social confidence and interpersonal safety.",
    icon: "users",
    sortOrder: 60,
    lifestyleMedicineMapping: ["positive_social_connections"],
    aliases: [
      "relationships",
      "social_health",
      "social_connection",
      "community",
    ],
  }),

  [ROOT_DOMAIN_IDS.ENVIRONMENT]: domain({
    id: ROOT_DOMAIN_IDS.ENVIRONMENT,
    permanentId: "ROOT-DOM-007",
    title: "Environment",
    shortTitle: "Environment",
    description:
      "The physical, digital, cultural and social surroundings that influence health, safety, behaviour, opportunity, comfort and daily decision-making.",
    icon: "leaf",
    sortOrder: 70,
    lifestyleMedicineMapping: [],
    aliases: [
      "physical_environment",
      "social_environment",
      "digital_environment",
      "surroundings",
    ],
  }),

  [ROOT_DOMAIN_IDS.PURPOSE]: domain({
    id: ROOT_DOMAIN_IDS.PURPOSE,
    permanentId: "ROOT-DOM-008",
    title: "Purpose, Meaning and Values",
    shortTitle: "Purpose",
    description:
      "Meaning, hope, values, direction, fulfilment, contribution, spirituality, motivation and the sense that life and effort have significance.",
    icon: "compass",
    sortOrder: 80,
    lifestyleMedicineMapping: ["stress_management"],
    aliases: ["meaning", "values", "hope", "spiritual_wellbeing"],
  }),

  [ROOT_DOMAIN_IDS.HEALTH_BEHAVIOURS]: domain({
    id: ROOT_DOMAIN_IDS.HEALTH_BEHAVIOURS,
    permanentId: "ROOT-DOM-009",
    title: "Health Behaviours",
    shortTitle: "Health Behaviours",
    description:
      "Repeated behaviours that influence health, including substance use, medication routines, preventive actions, self-care, risk reduction and help-seeking.",
    icon: "repeat",
    sortOrder: 90,
    lifestyleMedicineMapping: [
      "avoidance_of_risky_substances",
      "stress_management",
    ],
    aliases: [
      "lifestyle_behaviours",
      "substance_use",
      "preventive_behaviours",
      "self_care",
    ],
  }),

  [ROOT_DOMAIN_IDS.PHYSICAL_HEALTH]: domain({
    id: ROOT_DOMAIN_IDS.PHYSICAL_HEALTH,
    permanentId: "ROOT-DOM-010",
    title: "Physical Health and Body Experience",
    shortTitle: "Body",
    description:
      "Physical symptoms, pain, energy, mobility, body awareness, bodily comfort, functional ability and the lived experience of physical health.",
    icon: "heart-pulse",
    sortOrder: 100,
    lifestyleMedicineMapping: [],
    aliases: ["body", "physical_wellbeing", "body_signals", "symptoms"],
  }),

  [ROOT_DOMAIN_IDS.BIOMETRICS]: domain({
    id: ROOT_DOMAIN_IDS.BIOMETRICS,
    permanentId: "ROOT-DOM-011",
    title: "Biometrics and Health Indicators",
    shortTitle: "Biometrics",
    description:
      "Objective or device-supported indicators such as heart rate, blood pressure, glucose, weight, sleep metrics, activity data and other measurable physiological signals.",
    icon: "chart-line",
    sortOrder: 110,
    lifestyleMedicineMapping: [],
    aliases: ["health_metrics", "wearables", "physiological_data"],
  }),

  [ROOT_DOMAIN_IDS.MEDICAL_FACTORS]: domain({
    id: ROOT_DOMAIN_IDS.MEDICAL_FACTORS,
    permanentId: "ROOT-DOM-012",
    title: "Medical and Clinical Factors",
    shortTitle: "Medical",
    description:
      "Diagnoses, treatments, medicines, clinical care, healthcare access and relevant medical circumstances that may influence health decisions and outcomes.",
    icon: "stethoscope",
    sortOrder: 120,
    lifestyleMedicineMapping: [],
    aliases: ["clinical", "medical", "healthcare"],
    metadata: {
      requiresAdditionalSafeguards: true,
      clinicalBoundaryRequired: true,
    },
  }),

  [ROOT_DOMAIN_IDS.WORK]: domain({
    id: ROOT_DOMAIN_IDS.WORK,
    permanentId: "ROOT-DOM-013",
    title: "Work and Occupational Wellbeing",
    shortTitle: "Work",
    description:
      "Workload, autonomy, relationships, leadership, psychological safety, role clarity, purpose, working conditions, employment security and work-life interaction.",
    icon: "briefcase",
    sortOrder: 130,
    lifestyleMedicineMapping: [
      "stress_management",
      "positive_social_connections",
    ],
    aliases: [
      "occupational_health",
      "workplace_wellbeing",
      "career",
      "employment",
    ],
  }),

  [ROOT_DOMAIN_IDS.FINANCIAL_WELLBEING]: domain({
    id: ROOT_DOMAIN_IDS.FINANCIAL_WELLBEING,
    permanentId: "ROOT-DOM-014",
    title: "Financial Wellbeing",
    shortTitle: "Financial",
    description:
      "Financial security, control, confidence, pressure, access to resources and the ways money influences choices, relationships, opportunity and health.",
    icon: "wallet",
    sortOrder: 140,
    lifestyleMedicineMapping: [],
    aliases: ["money", "financial_health", "financial_stress"],
  }),

  [ROOT_DOMAIN_IDS.LIFE_TRANSITIONS]: domain({
    id: ROOT_DOMAIN_IDS.LIFE_TRANSITIONS,
    permanentId: "ROOT-DOM-015",
    title: "Life Events and Transitions",
    shortTitle: "Life Changes",
    description:
      "Significant changes and experiences including relationships, parenthood, caring, illness, bereavement, relocation, retirement, identity change and major uncertainty.",
    icon: "route",
    sortOrder: 150,
    lifestyleMedicineMapping: [],
    aliases: ["life_events", "transitions", "change", "uncertainty"],
  }),

  [ROOT_DOMAIN_IDS.PERSONAL_GROWTH]: domain({
    id: ROOT_DOMAIN_IDS.PERSONAL_GROWTH,
    permanentId: "ROOT-DOM-016",
    title: "Personal Growth and Life Skills",
    shortTitle: "Growth",
    description:
      "Learning, self-understanding, decision-making, confidence, adaptability, communication, practical capability and the development of skills for navigating life.",
    icon: "sprout",
    sortOrder: 160,
    lifestyleMedicineMapping: [],
    aliases: [
      "self_development",
      "life_skills",
      "learning",
      "personal_development",
    ],
  }),
});

/**
 * Ordered list for navigation, reporting and user interfaces.
 */
export const ROOT_DOMAIN_LIST = Object.freeze(
  Object.values(ROOT_DOMAINS).sort((a, b) => a.sortOrder - b.sortOrder)
);

/**
 * Returns a domain by its permanent domain ID or ordinary domain ID.
 *
 * Examples:
 * getRootDomain("mind")
 * getRootDomain("ROOT-DOM-001")
 */
export function getRootDomain(identifier) {
  if (!identifier || typeof identifier !== "string") {
    return null;
  }

  const normalisedIdentifier = identifier.trim().toLowerCase();

  const directMatch = ROOT_DOMAINS[normalisedIdentifier];

  if (directMatch) {
    return directMatch;
  }

  return (
    ROOT_DOMAIN_LIST.find(
      (item) =>
        item.permanentId.toLowerCase() === normalisedIdentifier ||
        item.aliases.some(
          (alias) => alias.toLowerCase() === normalisedIdentifier
        )
    ) || null
  );
}

/**
 * Returns true when an ID belongs to a recognised Root domain.
 */
export function isRootDomain(identifier) {
  return Boolean(getRootDomain(identifier));
}

/**
 * Returns active Root domains in their intended display order.
 */
export function getActiveRootDomains() {
  return ROOT_DOMAIN_LIST.filter((item) => item.active);
}

/**
 * Returns domains mapped to a recognised lifestyle-medicine pillar.
 *
 * Example:
 * getDomainsByLifestyleMedicinePillar("physical_activity")
 */
export function getDomainsByLifestyleMedicinePillar(pillarId) {
  if (!pillarId || typeof pillarId !== "string") {
    return [];
  }

  const normalisedPillarId = pillarId.trim().toLowerCase();

  return ROOT_DOMAIN_LIST.filter((item) =>
    item.lifestyleMedicineMapping.some(
      (mapping) => mapping.toLowerCase() === normalisedPillarId
    )
  );
}

/**
 * Produces a lightweight version suitable for selectors and navigation.
 */
export function getRootDomainOptions({ activeOnly = true } = {}) {
  const domains = activeOnly ? getActiveRootDomains() : ROOT_DOMAIN_LIST;

  return domains.map((item) => ({
    value: item.id,
    label: item.shortTitle,
    permanentId: item.permanentId,
    icon: item.icon,
  }));
}

/**
 * Validates the domain registry during development or testing.
 *
 * Throws an error when:
 * - an object key does not match its domain ID
 * - permanent IDs are duplicated
 * - sort orders are duplicated
 * - required values are missing
 */
export function validateRootDomains() {
  const permanentIds = new Set();
  const sortOrders = new Set();

  for (const [key, item] of Object.entries(ROOT_DOMAINS)) {
    if (!item.id || !item.permanentId || !item.title) {
      throw new Error(
        `Root domain "${key}" is missing a required id, permanentId or title.`
      );
    }

    if (key !== item.id) {
      throw new Error(
        `Root domain registry key "${key}" does not match domain id "${item.id}".`
      );
    }

    if (permanentIds.has(item.permanentId)) {
      throw new Error(
        `Duplicate Root domain permanentId detected: "${item.permanentId}".`
      );
    }

    if (sortOrders.has(item.sortOrder)) {
      throw new Error(
        `Duplicate Root domain sortOrder detected: "${item.sortOrder}".`
      );
    }

    permanentIds.add(item.permanentId);
    sortOrders.add(item.sortOrder);
  }

  return {
    valid: true,
    schemaVersion: ROOT_DOMAIN_SCHEMA_VERSION,
    domainCount: ROOT_DOMAIN_LIST.length,
  };
}

export default ROOT_DOMAINS;
