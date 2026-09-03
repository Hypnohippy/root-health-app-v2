const METRIC_DOMAINS = Object.freeze({
  energy: [
    { label: "Explore food and hydration", href: "/coach", route: "nutrition" },
    { label: "Notice workload and recovery", href: "/journal", route: "reflection" },
    { label: "Check body and activity signals", href: "/body", route: "body" },
  ],
  sleep: [
    { label: "Explore sleep routine", href: "/coach", route: "sleep" },
    { label: "Notice evening patterns", href: "/journal", route: "reflection" },
  ],
  stress: [
    { label: "Explore current pressures", href: "/coach", route: "coach" },
    { label: "Reflect on workload and boundaries", href: "/journal", route: "reflection" },
    { label: "Notice physical stress signals", href: "/body", route: "body" },
  ],
});

const MEASUREMENT_PLUMBING = /^(root\s+)?measurement\s*[—–-]\s*(before|after)$/i;

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

export function isMeasurementPlumbing(value = "") {
  return MEASUREMENT_PLUMBING.test(String(value).trim());
}

export function summariseMindOutcomeCoverage({ mindEntries = [], interventionOutcomes = [] } = {}) {
  const uses = safeArray(mindEntries).filter((entry) => !isMeasurementPlumbing(entry?.tool));
  const measured = safeArray(interventionOutcomes).filter((outcome) =>
    outcome?.completed === true &&
    Number.isFinite(Number(outcome?.before_score)) &&
    outcome?.before_score !== null && outcome?.before_score !== "" &&
    Number.isFinite(Number(outcome?.after_score)) &&
    outcome?.after_score !== null && outcome?.after_score !== ""
  );
  return {
    totalMindUses: uses.length,
    completedMeasuredOutcomes: measured.length,
    message: `You have used Mind tools ${uses.length} time${uses.length === 1 ? "" : "s"}. ${measured.length} use${measured.length === 1 ? "" : "s"} currently ${measured.length === 1 ? "has" : "have"} before-and-after measurements, giving Root ${measured.length ? "early outcome evidence to compare" : "no measured outcome evidence yet"}.`,
    provenance: {
      layer: "derived_interpretation",
      sourceRecordIds: [...uses, ...measured].map((record) => record?.id).filter(Boolean),
      sourceRecordsMutated: false,
    },
  };
}

export function buildPersonalInvestigationDiscovery({ knowledge, evidence } = {}) {
  const assessment = knowledge?.assessmentKnowledge;
  const metrics = safeArray(assessment?.movement?.metrics);
  const repeated = new Map(
    safeArray(assessment?.repeatedHighSignals).map((item) => [item.key, item.occurrences])
  );
  const improving = metrics.filter((metric) => Number(metric?.change) <= -2);
  const sourceRecordIds = safeArray(assessment?.provenance?.sourceRecordIds);
  const candidates = metrics
    .filter((metric) =>
      Number(metric?.latest) >= 7 &&
      Number(metric?.change) >= 0 &&
      (repeated.get(metric.key) || 0) >= 2 &&
      improving.filter((other) => other.key !== metric.key).length >= 2
    )
    .map((metric) => {
      const improved = improving.filter((other) => other.key !== metric.key);
      const occurrences = repeated.get(metric.key) || 1;
      const routes = METRIC_DOMAINS[metric.key] || [
        { label: "Explore this with Root Coach", href: "/coach", route: "coach" },
        { label: "Reflect on what may be contributing", href: "/journal", route: "reflection" },
      ];
      return {
        id: `assessment-divergence:${metric.key}:${sourceRecordIds.join(":")}`,
        kind: "persistent_divergence",
        issueKey: metric.key,
        confidence: occurrences >= 2 ? "developing" : "early",
        known: {
          label: "Known",
          statement: `${metric.label} is ${metric.latest}/10 while ${improved.map((item) => item.label.toLowerCase()).join(", ")} improved from the baseline.`,
        },
        emerging: {
          label: "Emerging",
          statement: occurrences >= 2
            ? `${metric.label} has remained high across ${occurrences} check-ins while the wider picture has moved.`
            : "This divergence has appeared once, so Root is not treating it as a stable pattern yet.",
        },
        worthExploring: {
          label: "Worth exploring",
          statement: `That does not tell us why. It may be worth looking at ordinary lifestyle factors around ${metric.label.toLowerCase()}.`,
          routes: routes.slice(0, 3),
        },
        sourceRecordIds,
        provenance: {
          layer: "derived_investigation_candidate",
          sourceTypes: ["wellbeing_assessments"],
          sourceRecordIds,
          sourceRecordsMutated: false,
          persisted: false,
          diagnosticClaim: false,
        },
      };
    });

  const activity = summariseMindOutcomeCoverage({
    mindEntries: evidence?.source?.mindEntries?.records,
    interventionOutcomes: evidence?.source?.interventionOutcomes?.records,
  });

  return {
    candidates,
    primary: candidates[0] || null,
    activity,
    provenance: {
      layer: "derived_personal_discovery",
      engine: "personalInvestigationService",
      persisted: false,
      sourceRecordsMutated: false,
    },
  };
}

export function buildInvestigationPresentationCandidate(discovery) {
  const item = discovery?.primary;
  if (!item) return null;
  return {
    id: item.id,
    fingerprint: item.id,
    kind: "investigation_candidate",
    key: item.issueKey,
    title: `${item.known.label}: ${item.known.statement}`,
    message: `${item.emerging.label}: ${item.emerging.statement} ${item.worthExploring.label}: ${item.worthExploring.statement}`,
    status: item.confidence,
    confidence: item.confidence,
    evidenceOrigin: "system_measured",
    sourceRecordIds: item.sourceRecordIds,
    sourceTimestamps: [],
    latestEvidenceAt: null,
    score: 125,
    scoreBreakdown: { significance: 100, freshness: 0, confidence: 10, recurrence: 0, change: 15, novelty: 0, repetition: 0 },
    metadata: { discovery: item },
    provenance: item.provenance,
  };
}
