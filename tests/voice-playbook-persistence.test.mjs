import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  hasExplicitPlaybookSaveIntent,
  inferVoicePlaybookMeta,
  isCompleteVoicePlaybookContent,
  persistVoicePlaybookEntry,
} from "../lib/voicePlaybookAction.js";

const explicitIntent =
  "Please create an intervention for stress and save it to my Playbook.";
const stressIntervention = `Title: Two-minute stress reset

Practice
- Put both feet on the floor and notice the support beneath you.
- Let your exhale lengthen without forcing it.
- Name one thing you can do next, then pause.`;

test("a clear Voice Coach request is eligible and a mere Playbook mention is not", () => {
  assert.equal(hasExplicitPlaybookSaveIntent(explicitIntent), true);
  assert.equal(hasExplicitPlaybookSaveIntent("What is already in my Playbook?"), false);
  assert.equal(hasExplicitPlaybookSaveIntent("Could you make a stress intervention?"), false);
});

test("a structured stress intervention is accepted, not only meal/day plans", () => {
  assert.equal(isCompleteVoicePlaybookContent(stressIntervention), true);
  assert.deepEqual(inferVoicePlaybookMeta(explicitIntent), {
    title: "Stress & Anxiety Support Plan",
    category: "Stress & Anxiety",
  });
});

test("successful persistence carries the authenticated profile key and explicit intent", async () => {
  let request;
  const result = await persistVoicePlaybookEntry({
    fetchImpl: async (url, options) => {
      request = { url, options, body: JSON.parse(options.body) };
      return { ok: true, status: 200, json: async () => ({ ok: true, id: "entry-1" }) };
    },
    accessToken: "auth-token",
    profileKey: "owned-profile",
    userIntent: explicitIntent,
    title: "Stress reset",
    category: "Stress & Anxiety",
    content: stressIntervention,
  });

  assert.deepEqual(result, { ok: true, id: "entry-1" });
  assert.equal(request.url, "/api/voice-actions");
  assert.equal(request.options.headers.Authorization, "Bearer auth-token");
  assert.equal(request.body.profileKey, "owned-profile");
  assert.equal(request.body.userIntent, explicitIntent);
});

test("failed persistence cannot be reported as saved", async () => {
  const result = await persistVoicePlaybookEntry({
    fetchImpl: async () => ({
      ok: false,
      status: 403,
      json: async () => ({ ok: false, error: "Profile ownership failed." }),
    }),
    accessToken: "auth-token",
    profileKey: "another-profile",
    userIntent: explicitIntent,
    content: stressIntervention,
  });

  assert.deepEqual(result, { ok: false, error: "Profile ownership failed." });
});

test("no explicit save intent performs no database request", async () => {
  let called = false;
  const result = await persistVoicePlaybookEntry({
    fetchImpl: async () => {
      called = true;
    },
    userIntent: "Tell me about my Playbook.",
  });

  assert.equal(called, false);
  assert.equal(result.ok, false);
});

test("the API revalidates intent and authenticated ownership before writing", async () => {
  const route = await readFile(new URL("../app/api/voice-actions/route.js", import.meta.url), "utf8");
  const coach = await readFile(new URL("../app/coach/page.js", import.meta.url), "utf8");

  assert.match(route, /hasExplicitPlaybookSaveIntent\(body\.userIntent\)/);
  assert.match(route, /\.from\("profiles"\)[\s\S]*?\.eq\("user_id", userData\.user\.id\)[\s\S]*?\.eq\("profile_key", profileKey\)/);
  assert.match(route, /This Playbook does not belong to your Root account/);
  assert.ok(coach.indexOf("if (!saveResult.ok)") < coach.indexOf('content: "Saved to your Playbook."'));
  assert.match(coach, /I created that entry, but I couldn’t save it to your Playbook/);
});
