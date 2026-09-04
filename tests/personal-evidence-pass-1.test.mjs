import assert from "node:assert/strict";
import test from "node:test";

import { resolvePersonalRootContext } from "../lib/personalRootContext.js";
import { loadPersonalRootEvidence } from "../lib/personalEvidenceLoader.js";

function mockClient({ user, profile, tables = {}, errors = {} }) {
  return {
    auth: {
      async getUser() {
        return { data: { user }, error: errors.auth || null };
      },
    },
    from(table) {
      const state = {
        table,
        userId: null,
        profileKey: null,
        assessmentType: null,
        ascending: false,
      };
      const builder = {
        select() {
          return builder;
        },
        eq(column, value) {
          if (column === "user_id") state.userId = value;
          if (column === "profile_key") state.profileKey = value;
          if (column === "assessment_type") state.assessmentType = value;
          return builder;
        },
        order(column, options = {}) {
          state.orderColumn = column;
          state.ascending = options.ascending === true;
          return builder;
        },
        limit(limit) {
          let rows = (tables[table] || [])
            .filter(
              (row) => !state.profileKey || row.profile_key === state.profileKey
            )
            .filter((row) => !state.userId || row.user_id === state.userId)
            .filter(
              (row) =>
                !state.assessmentType ||
                row.assessment_type === state.assessmentType
            );
          if (state.orderColumn) {
            rows = [...rows].sort((first, second) => {
              const difference =
                new Date(first?.[state.orderColumn] || 0).getTime() -
                new Date(second?.[state.orderColumn] || 0).getTime();
              return state.ascending ? difference : -difference;
            });
          }
          rows = rows.slice(0, limit);
          return Promise.resolve({
            data: rows,
            error: errors[table] || null,
            count: (tables[table] || []).length,
          });
        },
        maybeSingle() {
          return Promise.resolve({
            data:
              state.userId === profile?.user_id ? profile : null,
            error: errors.profiles || null,
          });
        },
      };
      return builder;
    },
  };
}

test("Personal identity is resolved from auth user_id, not a browser key", async () => {
  const client = mockClient({
    user: { id: "user-1", email: "person@example.com", user_metadata: {} },
    profile: {
      id: "profile-row-1",
      user_id: "user-1",
      profile_key: "personal-profile-1",
      name: "Person",
      orientation_completed: true,
    },
  });

  const result = await resolvePersonalRootContext({ client });

  assert.equal(result.ok, true);
  assert.equal(result.context.profileKey, "personal-profile-1");
  assert.equal(result.context.authority.browserProfileKeyTrusted, false);
  assert.equal(result.context.profile.id, "profile-row-1");
});

test("Evidence remains source-shaped and retains research provenance", async () => {
  const context = {
    scope: "personal",
    userId: "user-1",
    profileKey: "profile-key-1",
    profile: {
      id: "profile-row-1",
      user_id: "user-1",
      profile_key: "profile-key-1",
    },
  };
  const baseline = {
    id: "assessment-baseline",
    profile_key: "profile-key-1",
    assessment_type: "baseline",
    stress_score: 8,
    created_at: "2025-01-01T10:00:00.000Z",
  };
  const followUp = {
    id: "assessment-follow-up",
    profile_key: "profile-key-1",
    assessment_type: "checkin",
    stress_score: 4,
    created_at: "2025-02-01T10:00:00.000Z",
  };
  const intervention = {
    id: "outcome-1",
    profile_key: "profile-key-1",
    intervention_name: "Root Calm Reset",
    before_score: 8,
    after_score: 4,
    completed: true,
    started_at: "2025-02-01T11:00:00.000Z",
  };
  const client = mockClient({
    user: { id: "user-1", email: "person@example.com", user_metadata: {} },
    profile: context.profile,
    tables: {
      wellbeing_assessments: [followUp, baseline],
      intervention_outcomes: [intervention],
      playbook_entries: [
        {
          id: "playbook-1",
          profile_key: "profile-key-1",
          title: "Sleep plan",
          category: "Sleep",
          content: "Private full plan",
          created_at: "2025-02-02T10:00:00.000Z",
        },
      ],
      voice_sessions: [
        {
          id: "voice-1",
          profile_key: "profile-key-1",
          summary: "Discussed sleep",
          transcript: "Private full transcript",
          created_at: "2025-02-03T10:00:00.000Z",
        },
      ],
    },
  });

  const result = await loadPersonalRootEvidence({
    client,
    now: () => new Date("2025-03-01T00:00:00.000Z"),
  });

  assert.equal(result.ok, true);
  assert.deepEqual(
    result.evidence.source.assessments.records[0],
    followUp
  );
  assert.equal(
    result.evidence.landmarks.originalAssessmentBaseline.id,
    "assessment-baseline"
  );
  assert.equal(
    result.evidence.source.interventionOutcomes.records[0].before_score,
    8
  );
  assert.equal(
    result.evidence.source.interventionOutcomes.records[0].after_score,
    4
  );
  assert.equal(
    result.evidence.awareness.playbook.records[0].content,
    undefined
  );
  assert.equal(
    result.evidence.awareness.voice.records[0].transcript,
    undefined
  );
  assert.equal(result.evidence.provenance.interpretationApplied, false);
});

test("tracker evidence requires authenticated user_id as well as the Personal profile_key", async () => {
  const profile = { id: "profile-1", user_id: "personal-user", profile_key: "colliding-key" };
  const own = { id: "own-entry", tracker_id: "tracker-1", user_id: "personal-user", profile_key: "colliding-key", answers: { symptom: "bloating", intensity: 7 }, created_at: "2026-09-04T09:00:00.000Z" };
  const collision = { id: "other-entry", tracker_id: "tracker-2", user_id: "workplace-user", profile_key: "colliding-key", answers: { symptom: "private workplace observation" }, created_at: "2026-09-04T10:00:00.000Z" };
  const result = await loadPersonalRootEvidence({ client: mockClient({ user: { id: "personal-user", email: "person@example.com", user_metadata: {} }, profile, tables: { playbook_tracker_entries: [collision, own] } }) });
  assert.deepEqual(result.evidence.source.trackerSubmissions.records, [own]);
  assert.equal(result.evidence.identity.userId, "personal-user");
  assert.equal(result.evidence.identity.profileKey, "colliding-key");
});

test("Partial failures are reported and are not represented as no evidence", async () => {
  const client = mockClient({
    user: { id: "user-1", email: "person@example.com", user_metadata: {} },
    profile: {
      id: "profile-row-1",
      user_id: "user-1",
      profile_key: "profile-key-1",
    },
    tables: {},
    errors: {
      journal_entries: { code: "42501", message: "not permitted" },
    },
  });

  const result = await loadPersonalRootEvidence({
    client,
  });

  assert.equal(result.ok, true);
  assert.equal(result.reason, "partially_loaded");
  assert.equal(result.evidence.loadStatus.partial, true);
  assert.equal(result.evidence.source.journalEntries.status, "error");
  assert.equal(result.evidence.source.journalEntries.error.code, "42501");
});

test("The original baseline is retained when the recent assessment window truncates", async () => {
  const client = mockClient({
    user: { id: "user-1", email: "person@example.com", user_metadata: {} },
    profile: {
      id: "profile-row-1",
      user_id: "user-1",
      profile_key: "profile-key-1",
    },
    tables: {
      wellbeing_assessments: [
        {
          id: "baseline-old",
          profile_key: "profile-key-1",
          assessment_type: "baseline",
          stress_score: 9,
          created_at: "2024-01-01T00:00:00.000Z",
        },
        {
          id: "checkin-new",
          profile_key: "profile-key-1",
          assessment_type: "checkin",
          stress_score: 5,
          created_at: "2025-01-01T00:00:00.000Z",
        },
      ],
    },
  });

  const result = await loadPersonalRootEvidence({
    client,
    policy: { assessments: 1 },
  });

  assert.equal(result.evidence.source.assessments.truncated, true);
  assert.equal(
    result.evidence.landmarks.originalAssessmentBaseline.id,
    "baseline-old"
  );
  assert.deepEqual(
    result.evidence.source.assessments.records.map((record) => record.id),
    ["checkin-new", "baseline-old"]
  );
});
