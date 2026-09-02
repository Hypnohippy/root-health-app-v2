export const PERSONAL_EVIDENCE_ORIGINS = Object.freeze({
  USER_ENTERED: "user_entered",
  SYSTEM_MEASURED: "system_measured",
  SYSTEM_EVENT: "system_event",
  SYSTEM_CLASSIFICATION: "system_classification",
  DERIVED_SUMMARY: "derived_summary",
  AI_GENERATED_SUMMARY: "ai_generated_summary",
});

const FIELD_ORIGINS = Object.freeze({
  body_signals: {
    areas: "user_entered",
    signal: "user_entered",
    context: "user_entered",
    intensity: "system_measured",
    what_helped: "user_entered",
    system: "system_classification",
  },
  journal_entries: {
    content: "user_entered",
    emotional_theme: "system_classification",
    recommended_coach_mode: "derived_summary",
    recommended_prompt: "derived_summary",
    prompt_type: "system_event",
    title: "system_event",
  },
  mind_entries: {
    situation: "user_entered",
    automatic_thought: "user_entered",
    emotion: "user_entered",
    intensity: "system_measured",
    outcome_score: "system_measured",
    outcome_label: "system_event",
    tool: "system_event",
    thought_theme: "system_classification",
    thought_notice: "derived_summary",
    reframe: "derived_summary",
    next_step: "derived_summary",
  },
  wellbeing_assessments: {
    assessment_type: "system_event",
    stress: "system_measured",
    stress_score: "system_measured",
    sleep: "system_measured",
    sleep_score: "system_measured",
    recovery: "system_measured",
    recovery_score: "system_measured",
    energy: "system_measured",
    energy_score: "system_measured",
    mood: "system_measured",
    mood_score: "system_measured",
    focus: "system_measured",
    focus_score: "system_measured",
    burnout: "system_measured",
    burnout_score: "system_measured",
  },
  intervention_outcomes: {
    before_score: "system_measured",
    after_score: "system_measured",
    improvement_points: "derived_summary",
    user_observation: "user_entered",
    completed: "system_event",
    intervention_name: "system_event",
    intervention_id: "system_event",
    intervention_slug: "system_event",
    intervention_version: "system_event",
  },
  voice_sessions: {
    summary: "ai_generated_summary",
    themes: "ai_generated_summary",
    agreed_actions: "derived_summary",
    emotional_state: "system_classification",
    category: "system_classification",
  },
  playbook_entries: {
    title: "derived_summary",
    category: "system_classification",
  },
});

function evidenceTime(record = {}) {
  return (
    record.completed_at ||
    record.started_at ||
    record.created_at ||
    record.updated_at ||
    null
  );
}

export function getPersonalEvidenceFieldOrigin(table, field) {
  return FIELD_ORIGINS?.[table]?.[field] || PERSONAL_EVIDENCE_ORIGINS.SYSTEM_EVENT;
}

export function attributePersonalEvidenceRecords({ table, records = [] } = {}) {
  return (Array.isArray(records) ? records : []).flatMap((record) =>
    Object.entries(record || {})
      .filter(([, value]) => value !== null && value !== undefined && value !== "")
      .map(([field, value]) => ({
        factId: `${table}:${record?.id || "unknown"}:${field}`,
        field,
        value,
        origin: getPersonalEvidenceFieldOrigin(table, field),
        source: {
          table,
          recordId: record?.id || null,
          profileKey: record?.profile_key || null,
          recordedAt: evidenceTime(record),
        },
      }))
  );
}

export function buildPersonalEvidenceAttribution({
  bodySignals = [],
  journalEntries = [],
  mindEntries = [],
  assessments = [],
  interventionOutcomes = [],
  voiceSessions = [],
  playbookAwareness = [],
} = {}) {
  const bySource = {
    bodySignals: attributePersonalEvidenceRecords({ table: "body_signals", records: bodySignals }),
    journalEntries: attributePersonalEvidenceRecords({ table: "journal_entries", records: journalEntries }),
    mindEntries: attributePersonalEvidenceRecords({ table: "mind_entries", records: mindEntries }),
    assessments: attributePersonalEvidenceRecords({ table: "wellbeing_assessments", records: assessments }),
    interventionOutcomes: attributePersonalEvidenceRecords({ table: "intervention_outcomes", records: interventionOutcomes }),
    voiceSessions: attributePersonalEvidenceRecords({ table: "voice_sessions", records: voiceSessions }),
    playbookAwareness: attributePersonalEvidenceRecords({ table: "playbook_entries", records: playbookAwareness }),
  };

  return {
    version: 1,
    layer: "derived_evidence_attribution",
    sourceRecordsMutated: false,
    bySource,
    facts: Object.values(bySource).flat(),
  };
}

export function buildDerivedObservationProvenance({
  engine,
  records = [],
  origins = [],
  derivationType,
  confidence = "early",
  occurrenceCount = 0,
} = {}) {
  const safeRecords = Array.isArray(records) ? records.filter(Boolean) : [];
  return {
    layer: "derived_observation",
    engine,
    derivationType,
    confidence,
    occurrenceCount,
    sourceRecordIds: safeRecords.map((record) => record?.id).filter(Boolean),
    sourceTimestamps: safeRecords.map(evidenceTime).filter(Boolean),
    evidenceOrigins: [...new Set(origins.filter(Boolean))],
    generatedAt: new Date().toISOString(),
  };
}

