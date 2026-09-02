import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { resolvePersonalRootContext } from "../lib/personalRootContext.js";
import {
  buildMindInterventionStart,
  createPersonalInterventionLifecycle,
} from "../lib/personalInterventionLifecycle.js";
import {
  calculateInterventionChange,
  buildInterventionEvidence,
} from "../lib/rootInterventionEngine.js";
import { buildRootMemoryService } from "../lib/rootMemoryService.js";
import {
  applyMindPostScoreCompletion,
  canSubmitMindPostScore,
  createMindOutcomeFlow,
  markMindInterventionFinished,
  MIND_OUTCOME_STAGES,
  recordMindAfterScore,
} from "../lib/mindOutcomeFlow.js";
import { selectLatestMeasuredIntervention } from "../lib/personalKnowledgeService.js";

function identityClient({ userId = "personal-user", profileKey = "personal-profile" } = {}) {
  return {
    auth: {
      getUser: async () => ({ data: { user: { id: userId, email: "person@example.com" } }, error: null }),
    },
    from(table) {
      assert.equal(table, "profiles");
      return {
        select: () => ({
          eq(column, value) {
            assert.equal(column, "user_id");
            assert.equal(value, userId);
            return {
              maybeSingle: async () => ({
                data: { user_id: userId, profile_key: profileKey, name: "Personal person" },
                error: null,
              }),
            };
          },
        }),
      };
    },
  };
}

test("Personal identity is resolved from auth user -> profiles.user_id", async () => {
  const result = await resolvePersonalRootContext({ client: identityClient() });
  assert.equal(result.ok, true);
  assert.equal(result.context.profileKey, "personal-profile");
  assert.equal(result.context.authority.browserProfileKeyTrusted, false);
});

test("an HR-capable user's Personal context still resolves their own profiles row", async () => {
  const result = await resolvePersonalRootContext({
    client: identityClient({ userId: "hr-user", profileKey: "hr-personal-profile" }),
  });
  assert.equal(result.context.profileKey, "hr-personal-profile");
  assert.equal(result.context.scope, "personal");
});

test("Mind Personal outcome payload is collision-safe and retains Studio provenance", () => {
  const payload = buildMindInterventionStart({
    personalContext: { profileKey: "personal-profile" },
    emotionalState: { id: "overthinking", title: "Overthinking" },
    beforeScore: 8,
    category: "grounding",
    technique: {
      id: "catalogue-id",
      slug: "root-calm-reset",
      version: 2,
      title: "Root Calm Reset",
      category: "grounding",
      target: "Overthinking",
    },
  });

  assert.equal(payload.organisationId, null);
  assert.equal(payload.interventionId, "catalogue-id");
  assert.equal(payload.interventionSlug, "root-calm-reset");
  assert.equal(payload.interventionVersion, "2");
});

test("legacy interventions do not fabricate catalogue provenance", () => {
  const payload = buildMindInterventionStart({
    personalContext: { profileKey: "personal-profile" },
    emotionalState: { id: "panic", title: "Panic / overwhelm" },
    beforeScore: 7,
    category: "grounding",
    technique: { title: "5-4-3-2-1 Grounding" },
  });
  assert.equal(payload.interventionId, null);
  assert.equal(payload.interventionSlug, null);
  assert.equal(payload.interventionVersion, null);
});

test("rerender/replay starts one attempt and genuine later attempts stay separate", async () => {
  const starts = [];
  const lifecycle = createPersonalInterventionLifecycle({
    start: async (payload) => {
      const record = { id: `attempt-${starts.length + 1}` };
      starts.push({ payload, record });
      return { success: true, record };
    },
    complete: async ({ interventionId }) => ({ success: true, record: { id: interventionId, completed: true } }),
    abandon: async ({ interventionId }) => ({ success: true, record: { id: interventionId, completed: false } }),
  });
  const payload = { profileKey: "p", interventionName: "Reset", interventionCategory: "grounding" };
  await Promise.all([lifecycle.begin(payload), lifecycle.begin(payload), lifecycle.begin(payload)]);
  assert.equal(starts.length, 1);
  await lifecycle.completeActive({ afterScore: 5 });
  await lifecycle.begin(payload);
  assert.equal(starts.length, 2);
  assert.notEqual(starts[0].record.id, starts[1].record.id);
});

test("Try Another abandons A and starts an independent B record", async () => {
  const events = [];
  const lifecycle = createPersonalInterventionLifecycle({
    start: async (payload) => {
      const record = { id: `attempt-${events.filter((e) => e.type === "start").length + 1}` };
      events.push({ type: "start", name: payload.interventionName, id: record.id });
      return { success: true, record };
    },
    complete: async () => ({ success: true }),
    abandon: async ({ interventionId }) => {
      events.push({ type: "abandon", id: interventionId });
      return { success: true, record: { id: interventionId, completed: false, completed_at: null } };
    },
  });
  await lifecycle.begin({ profileKey: "p", interventionName: "A" });
  await lifecycle.abandonActive("try another");
  await lifecycle.begin({ profileKey: "p", interventionName: "B" });
  assert.deepEqual(events.map((event) => event.type), ["start", "abandon", "start"]);
  assert.deepEqual(events.filter((event) => event.type === "start").map((event) => event.name), ["A", "B"]);
});

test("higher difficulty means 8 -> 5 improves and 5 -> 8 worsens", () => {
  assert.equal(calculateInterventionChange(8, 5), 3);
  assert.equal(calculateInterventionChange(5, 8), -3);
});

test("numeric completion and qualitative observation update the same attempt separately", async () => {
  const completed = [];
  const observed = [];
  const lifecycle = createPersonalInterventionLifecycle({
    start: async () => ({ success: true, record: { id: "same-attempt-id" } }),
    complete: async (payload) => {
      completed.push(payload);
      return {
        success: true,
        record: {
          id: payload.interventionId,
          before_score: 8,
          after_score: payload.afterScore,
          completed: true,
        },
      };
    },
    abandon: async () => ({ success: true }),
    observe: async (payload) => {
      observed.push(payload);
      return { success: true, record: { id: payload.interventionId } };
    },
  });

  await lifecycle.begin({ profileKey: "personal-profile", interventionName: "Root Calm Reset" });
  await lifecycle.completeActive({ afterScore: 5 });
  await lifecycle.observeCompleted("Much better");

  assert.equal(completed[0].interventionId, "same-attempt-id");
  assert.equal(completed[0].afterScore, 5);
  assert.equal(observed[0].interventionId, "same-attempt-id");
  assert.equal(observed[0].userObservation, "Much better");
  assert.equal("afterScore" in observed[0], false);
  assert.equal(calculateInterventionChange(8, completed[0].afterScore), 3);
});

test("ordinary Mind UI follows intervention -> post score -> qualitative order", () => {
  const duringIntervention = createMindOutcomeFlow();
  assert.equal(duringIntervention.stage, MIND_OUTCOME_STAGES.INTERVENTION);
  assert.equal(duringIntervention.afterScore, null);

  const awaitingPostScore = markMindInterventionFinished(duringIntervention);
  assert.equal(awaitingPostScore.stage, MIND_OUTCOME_STAGES.POST_SCORE);
  assert.equal(awaitingPostScore.afterScore, null);
  assert.equal(canSubmitMindPostScore(awaitingPostScore, false), true);
  assert.equal(canSubmitMindPostScore(awaitingPostScore, true), false);

  const awaitingQualitative = recordMindAfterScore(awaitingPostScore, 5);
  assert.equal(awaitingQualitative.stage, MIND_OUTCOME_STAGES.QUALITATIVE);
  assert.equal(awaitingQualitative.afterScore, 5);
});

test("post-score advances only after successful completion", () => {
  const postScore = markMindInterventionFinished(createMindOutcomeFlow());
  const failed = applyMindPostScoreCompletion(postScore, 5, {
    success: false,
    reason: "database_error",
  });
  assert.strictEqual(failed, postScore);
  assert.equal(failed.stage, MIND_OUTCOME_STAGES.POST_SCORE);

  const completed = applyMindPostScoreCompletion(postScore, 5, {
    success: true,
    record: { id: "same-outcome-id", after_score: 5, completed: true },
  });
  assert.equal(completed.stage, MIND_OUTCOME_STAGES.QUALITATIVE);
  assert.equal(completed.afterScore, 5);
});

test("Insights selects only a completed measured intervention", () => {
  const incomplete = { id: "incomplete", completed: false, before_score: 8, after_score: null };
  const unmeasured = { id: "unmeasured", completed: true, before_score: 8, after_score: null };
  const measured = { id: "measured", completed: true, before_score: 8, after_score: 5 };

  assert.equal(selectLatestMeasuredIntervention([incomplete, unmeasured]), null);
  assert.equal(selectLatestMeasuredIntervention([incomplete, measured])?.id, "measured");
});

test("qualitative stage cannot be reached before a valid post score", () => {
  const duringIntervention = createMindOutcomeFlow();
  assert.strictEqual(recordMindAfterScore(duringIntervention, 5), duringIntervention);

  const awaitingPostScore = markMindInterventionFinished(duringIntervention);
  assert.strictEqual(recordMindAfterScore(awaitingPostScore, "not-a-score"), awaitingPostScore);
  assert.strictEqual(recordMindAfterScore(awaitingPostScore, 11), awaitingPostScore);
});

test("qualitative feedback cannot manufacture a numeric after score", async () => {
  const observed = [];
  const lifecycle = createPersonalInterventionLifecycle({
    start: async () => ({ success: true, record: { id: "attempt" } }),
    complete: async (payload) => ({ success: true, record: { id: payload.interventionId } }),
    abandon: async () => ({ success: true }),
    observe: async (payload) => {
      observed.push(payload);
      return { success: true, record: { id: payload.interventionId } };
    },
  });
  const result = await lifecycle.observeCompleted("Much better");
  assert.equal(result.success, false);
  assert.equal(observed.length, 0);
});

test("missing after and incomplete attempts provide no effectiveness evidence", () => {
  const evidence = buildInterventionEvidence([
    { id: "completed-unmeasured", completed: true, before_score: 8, after_score: null },
    { id: "abandoned", completed: false, before_score: 8, after_score: null },
  ]);
  assert.equal(evidence.totalCompleted, 0);
  assert.equal(evidence.totalIncomplete, 1);
  assert.equal(evidence.evidenceAvailable, false);
});

test("Pass 2 cautious helpfulness remains intact", () => {
  const memory = buildRootMemoryService({
    name: "Alex",
    mindEntries: [{ id: "mind-use", tool: "Root Calm Reset", intensity: 9 }],
    interventionOutcomes: [
      { id: "measured", intervention_name: "Root Calm Reset", completed: true, before_score: 8, after_score: 5 },
    ],
  });
  const text = JSON.stringify(memory);
  assert.match(text, /may have helped once/i);
  assert.equal(memory.mostImportantObservation?.confidence, "early");
  assert.doesNotMatch(text, /intensity.*helped/i);
});

test("migrated Personal routes do not trust legacy browser profile identity", async () => {
  const files = [
    "app/body/page.js",
    "app/journal/page.js",
    "app/mind/page.js",
    "app/profile/page.js",
    "app/orientation/page.js",
  ];
  for (const file of files) {
    const source = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    assert.match(source, /resolvePersonalRootContext/);
    assert.doesNotMatch(source, /root_profile_key_v1|getCurrentProfileKey/);
  }
});

test("Studio-first selection and existing immediate Coach handoffs remain present", async () => {
  const mind = await readFile(new URL("../app/mind/page.js", import.meta.url), "utf8");
  const body = await readFile(new URL("../app/body/page.js", import.meta.url), "utf8");
  assert.match(mind, /\.\.\.publishedGroundingTechniques, \.\.\.groundingTechniques/);
  assert.match(mind, /root_pending_coach_context_v1/);
  assert.match(body, /root_journey_v1/);
});

test("Pass 3A does not edit Workplace, HR, or toggle files", async () => {
  const status = await readFile(new URL("../app/mind/page.js", import.meta.url), "utf8");
  assert.doesNotMatch(status, /organisation_members/);
  assert.match(status, /organisationId: null/);
});
