import { resolvePersonalRootContext } from "./personalRootContext.js";
import { collapseBodySignalSupersession } from "./bodySignalModel.js";

export const PERSONAL_EVIDENCE_POLICY = Object.freeze({
  assessments: 100,
  bodySignals: 100,
  mindEntries: 100,
  journalEntries: 100,
  investigationEvents: 100,
  interventionOutcomes: 100,
  trackerSubmissions: 100,
  playbookAwareness: 50,
  voiceSessionSummaries: 20,
});

const RAW_SOURCES = Object.freeze([
  {
    key: "assessments",
    table: "wellbeing_assessments",
    orderColumn: "created_at",
  },
  {
    key: "bodySignals",
    table: "body_signals",
    orderColumn: "created_at",
  },
  {
    key: "mindEntries",
    table: "mind_entries",
    orderColumn: "created_at",
  },
  {
    key: "journalEntries",
    table: "journal_entries",
    orderColumn: "created_at",
  },
  {
    key: "investigationEvents",
    table: "journal_entries",
    orderColumn: "created_at",
    filter: { column: "prompt_type", value: "root_investigation_event_v1" },
  },
  {
    key: "interventionOutcomes",
    table: "intervention_outcomes",
    orderColumn: "started_at",
  },
  {
    key: "trackerSubmissions",
    table: "playbook_tracker_entries",
    orderColumn: "created_at",
    requireAuthenticatedUser: true,
  },
]);

const VOICE_SUMMARY_FIELDS = Object.freeze([
  "id",
  "profile_key",
  "created_at",
  "updated_at",
  "started_at",
  "completed_at",
  "session_type",
  "mode",
  "category",
  "emotional_state",
  "summary",
  "themes",
  "agreed_actions",
  "saved_artifact_ids",
]);

function positiveLimit(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0
    ? Math.floor(parsed)
    : fallback;
}

function sourceEnvelope({
  table,
  records,
  count,
  limit,
  error,
}) {
  const safeRecords = Array.isArray(records) ? records : [];

  return {
    table,
    origin: "source_record",
    records: safeRecords,
    count: typeof count === "number" ? count : null,
    returned: safeRecords.length,
    limit,
    truncated:
      typeof count === "number" && count > safeRecords.length,
    status: error ? "error" : "loaded",
    error: error
      ? {
          code: error.code || null,
          message: error.message || "Evidence query failed.",
        }
      : null,
  };
}

async function loadRawSource(client, personalContext, definition, limit) {
  let query = client
    .from(definition.table)
    .select("*", { count: "exact" })
    .eq("profile_key", personalContext.profileKey);
  if (definition.requireAuthenticatedUser) {
    query = query.eq("user_id", personalContext.userId);
  }
  if (definition.filter) {
    query = query.eq(definition.filter.column, definition.filter.value);
  }
  const { data, error, count } = await query
    .order(definition.orderColumn, { ascending: false })
    .limit(limit);

  return [
    definition.key,
    sourceEnvelope({
      table: definition.table,
      records: data,
      count,
      limit,
      error,
    }),
  ];
}

async function loadOriginalAssessmentBaseline(client, profileKey) {
  const { data, error } = await client
    .from("wellbeing_assessments")
    .select("*")
    .eq("profile_key", profileKey)
    .eq("assessment_type", "baseline")
    .order("created_at", { ascending: true })
    .limit(1);

  return {
    record: Array.isArray(data) ? data[0] || null : null,
    error,
  };
}

function compactPlaybookEntry(entry) {
  return {
    id: entry?.id || null,
    profile_key: entry?.profile_key || null,
    title: entry?.title || "",
    category: entry?.category || "",
    item_type: entry?.item_type || "static",
    tracker_definition: entry?.item_type === "tracker" ? entry?.tracker_definition || null : null,
    created_at: entry?.created_at || null,
    updated_at: entry?.updated_at || null,
    provenance: {
      origin: "source_record_projection",
      table: "playbook_entries",
      sourceRecordId: entry?.id || null,
      omittedFields: ["content"],
    },
  };
}

function compactVoiceSession(session) {
  const summary = {};

  VOICE_SUMMARY_FIELDS.forEach((field) => {
    if (session?.[field] !== undefined) {
      summary[field] = session[field];
    }
  });

  return {
    ...summary,
    provenance: {
      origin: "source_record_projection",
      table: "voice_sessions",
      sourceRecordId: session?.id || null,
      transcriptIncluded: false,
    },
  };
}

async function loadProjectedSource({
  client,
  table,
  profileKey,
  limit,
  projector,
}) {
  const { data, error, count } = await client
    .from(table)
    .select("*", { count: "exact" })
    .eq("profile_key", profileKey)
    .order("created_at", { ascending: false })
    .limit(limit);

  return sourceEnvelope({
    table,
    records: error ? [] : (data || []).map(projector),
    count,
    limit,
    error,
  });
}

function findOriginalBaseline(assessmentRecords) {
  const baselines = assessmentRecords
    .filter((record) => record?.assessment_type === "baseline")
    .sort(
      (first, second) =>
        new Date(first?.created_at || 0).getTime() -
        new Date(second?.created_at || 0).getTime()
    );

  return baselines[0] || null;
}

/**
 * Load Personal evidence without interpreting or rewriting it.
 *
 * Raw clinical/wellbeing source rows remain under source. Compact
 * Playbook and Voice awareness is explicitly marked as a projection.
 * Root Knowledge belongs in a later derived branch and must not replace
 * or be written over these records.
 */
export async function loadPersonalRootEvidence({
  client = null,
  policy = PERSONAL_EVIDENCE_POLICY,
  now = () => new Date(),
} = {}) {
  const activeClient =
    client || (await import("./supabase.js")).supabase;
  const resolution = await resolvePersonalRootContext({
    client: activeClient,
  });

  if (!resolution.ok) {
    return {
      ok: false,
      reason: resolution.reason,
      error: resolution.error,
      evidence: null,
    };
  }

  const personalContext = resolution.context;

  const rawResults = await Promise.all(
    RAW_SOURCES.map((definition) =>
      loadRawSource(
        activeClient,
        personalContext,
        definition,
        positiveLimit(
          policy?.[definition.key],
          PERSONAL_EVIDENCE_POLICY[definition.key]
        )
      )
    )
  );

  const [playbook, voice, baselineResult] = await Promise.all([
    loadProjectedSource({
      client: activeClient,
      table: "playbook_entries",
      profileKey: personalContext.profileKey,
      limit: positiveLimit(
        policy?.playbookAwareness,
        PERSONAL_EVIDENCE_POLICY.playbookAwareness
      ),
      projector: compactPlaybookEntry,
    }),
    loadProjectedSource({
      client: activeClient,
      table: "voice_sessions",
      profileKey: personalContext.profileKey,
      limit: positiveLimit(
        policy?.voiceSessionSummaries,
        PERSONAL_EVIDENCE_POLICY.voiceSessionSummaries
      ),
      projector: compactVoiceSession,
    }),
    loadOriginalAssessmentBaseline(
      activeClient,
      personalContext.profileKey
    ),
  ]);

  const source = Object.fromEntries(rawResults);
  source.bodySignals.currentRecords = collapseBodySignalSupersession(
    source.bodySignals.records
  );
  source.bodySignals.projection = {
    type: "append_only_supersession_collapse",
    sourceRecordsPreserved: true,
  };
  const baselineAlreadyLoaded = findOriginalBaseline(
    source.assessments.records
  );
  const originalBaseline =
    baselineResult.record || baselineAlreadyLoaded;

  if (
    baselineResult.error &&
    source.assessments.status !== "error"
  ) {
    source.assessments.status = "error";
    source.assessments.error = {
      code: baselineResult.error.code || null,
      message:
        baselineResult.error.message ||
        "Original baseline query failed.",
    };
  }

  if (
    originalBaseline &&
    !source.assessments.records.some(
      (record) => record?.id === originalBaseline.id
    )
  ) {
    source.assessments.records.push(originalBaseline);
    source.assessments.returned = source.assessments.records.length;
  }
  const statuses = {
    profile: "loaded",
    ...Object.fromEntries(
      Object.entries(source).map(([key, value]) => [key, value.status])
    ),
    playbook: playbook.status,
    voice: voice.status,
  };
  const partial = Object.values(statuses).includes("error");

  return {
    ok: true,
    reason: partial ? "partially_loaded" : "loaded",
    error: null,
    evidence: {
      version: 1,
      scope: "personal",
      loadedAt: now().toISOString(),
      identity: {
        userId: personalContext.userId,
        profileKey: personalContext.profileKey,
        authority: personalContext.authority || {
          authentication: "supabase_auth_user",
          ownershipRelation: "profiles.user_id",
          browserProfileKeyTrusted: false,
        },
      },
      profile: {
        origin: "source_record",
        record: personalContext.profile,
      },
      source,
      awareness: {
        playbook,
        voice,
      },
      landmarks: {
        originalAssessmentBaseline: originalBaseline,
        latestAssessment: source.assessments.records[0] || null,
      },
      provenance: {
        layer: "source_evidence",
        interpretationApplied: false,
        sourceRecordsMutated: false,
        derivedKnowledgeIncluded: false,
      },
      loadStatus: {
        partial,
        sources: statuses,
      },
    },
  };
}

export default loadPersonalRootEvidence;
