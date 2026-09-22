import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  buildVoicePlaybookConsentIntent,
  detectVoicePlaybookOffer,
  extractVoicePlaybookDocumentTitle,
  hasExplicitPlaybookSaveIntent,
  inferVoicePlaybookMeta,
  isCompleteVoicePlaybookContent,
  isReusablePlaybookRequest,
  persistVoicePlaybookEntry,
  isExplicitVoiceAgreement,
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

test("an explicit spoken agreement to a clear Playbook offer arms the existing save path", () => {
  const offer = detectVoicePlaybookOffer("Would you like me to create an Evening Meal and Morning Bloating Log and save it to your Playbook?");
  assert.ok(offer);
  assert.equal(offer.title, "Gut Health Plan");
  assert.equal(isExplicitVoiceAgreement("Yes please"), true);
  const intent = buildVoicePlaybookConsentIntent(offer, "Yes please");
  assert.match(intent, /create and save this to my Playbook/i);
  assert.equal(hasExplicitPlaybookSaveIntent(intent), true);
  assert.equal(buildVoicePlaybookConsentIntent(offer, "Tell me more first"), null);
  assert.equal(detectVoicePlaybookOffer("I’ll create a log for you now."), null);
});



test("natural Playbook offers do not depend on a scripted phrase", () => {
  const examples = [
    "Shall we go ahead and add this meal plan to your Playbook now",
    "I can put the written plan in your Playbook if you like.",
    "Would you like me to save that in your Playbook?",
  ];

  for (const text of examples) {
    assert.ok(detectVoicePlaybookOffer(text), text);
  }

  assert.equal(isExplicitVoiceAgreement("Go for it"), true);
  assert.equal(isExplicitVoiceAgreement("That would be great"), true);
});

test("generated Playbook document title becomes the visible entry title", () => {
  assert.equal(
    extractVoicePlaybookDocumentTitle(
      "Title: Two-Day Vegetarian Meal Plan with Recipes and Supermarket Comparison\n\nDay 1\n- Breakfast"
    ),
    "Two-Day Vegetarian Meal Plan with Recipes and Supermarket Comparison"
  );

  assert.equal(
    extractVoicePlaybookDocumentTitle(
      "ROOT HEALTH PLAYBOOK ENTRY\nTitle: Two-Day Vegan Meal Plan\n\nDay 1"
    ),
    "Two-Day Vegan Meal Plan"
  );
});

test("Coach preserves natural user request context when an offer is accepted", async () => {
  const coach = await readFile(new URL("../app/coach/page.js", import.meta.url), "utf8");
  assert.match(coach, /latestUserTranscriptRef/);
  assert.match(coach, /sourceRequest/);
  assert.match(coach, /Please save this completed resource to my Playbook/);
  assert.match(coach, /extractVoicePlaybookDocumentTitle/);
  assert.match(coach, /finalCategory/);
  assert.match(coach, /finalTitle/);
});

test("detailed Playbook generation remains in the isolated background builder", async () => {
  const coach = await readFile(new URL("../app/coach/page.js", import.meta.url), "utf8");
  assert.match(coach, /fetch\("\/api\/voice-playbook-build"/);
  assert.match(coach, /pendingPlaybookSavingRef/);
  assert.match(coach, /persistVoicePlaybookEntry/);
});



test("reusable resource requests are remembered without requiring save wording", () => {
  assert.equal(isReusablePlaybookRequest("Can you make me a two day vegetarian meal plan?"), true);
  assert.equal(isReusablePlaybookRequest("Tell me how my week is going."), false);
});

test("natural Playbook offers are accepted even without a rigid save verb", () => {
  assert.ok(detectVoicePlaybookOffer("Would you like that in your Playbook?"));
  assert.ok(detectVoicePlaybookOffer("I can put the written version in your Playbook if you like."));
});

test("Coach preserves the substantive reusable request across later clarifications", async () => {
  const coach = await readFile(new URL("../app/coach/page.js", import.meta.url), "utf8");
  assert.match(coach, /latestReusablePlaybookRequestRef/);
  assert.match(coach, /rememberedRequest\?\.transcript/);
  assert.match(coach, /sourceRequest/);
});



test("natural affirmative save can recover from a missed offer detector when Voice just mentioned Playbook", async () => {
  const coach = await readFile(new URL("../app/coach/page.js", import.meta.url), "utf8");
  assert.match(coach, /assistantJustOfferedPlaybook/);
  assert.match(coach, /fallbackOffer/);
  assert.match(coach, /pendingPlaybookOfferRef\.current \|\| fallbackOffer/);
});

test("direct save-it wording keeps the substantive remembered resource request", async () => {
  const coach = await readFile(new URL("../app/coach/page.js", import.meta.url), "utf8");
  assert.match(coach, /rememberedRequest\?\.transcript/);
  assert.match(coach, /Current instruction:/);
});

test("spoken agreement uses the normal persistence endpoint and returns a Playbook entry id", async () => {
  const offer = detectVoicePlaybookOffer("Would you like me to create an Evening Meal and Morning Bloating Log and save it to your Playbook?");
  const userIntent = buildVoicePlaybookConsentIntent(offer, "Yes please");
  let request;
  const result = await persistVoicePlaybookEntry({
    fetchImpl: async (url, options) => {
      request = { url, body: JSON.parse(options.body) };
      return { ok: true, status: 200, json: async () => ({ ok: true, id: "playbook-log-1" }) };
    },
    accessToken: "auth-token",
    profileKey: "owned-profile",
    userIntent,
    title: offer.title,
    category: offer.category,
    content: "Title: Evening Meal and Morning Bloating Log\n\nDay 1\n- Evening meal:\n- Morning bloating (0-10):",
  });
  assert.deepEqual(result, { ok: true, id: "playbook-log-1" });
  assert.equal(request.url, "/api/voice-actions");
  assert.equal(request.body.profileKey, "owned-profile");
  assert.match(request.body.userIntent, /save this to my Playbook/i);
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

test("Voice confirms only after persistence and failure wording never claims creation or a Playbook write", async () => {
  const coach = await readFile(new URL("../app/coach/page.js", import.meta.url), "utf8");
  const successCheck = coach.indexOf("if (!saveResult.ok)");
  const spokenSuccess = coach.indexOf("Saved to your Playbook.", successCheck);
  assert.ok(successCheck >= 0 && spokenSuccess > successCheck);
  assert.match(coach, /pendingPlaybookOfferRef/);
  assert.match(coach, /buildVoicePlaybookConsentIntent/);
  assert.match(coach, /I couldn’t save that to your Playbook\. The database write did not complete\./);
  const failure = "I couldn’t save that to your Playbook. The database write did not complete.";
  assert.doesNotMatch(failure, /\bsaved\b|\bcreated\b|\badded to your Playbook\b/i);
});

test("Playbook loads entries from the same authenticated profile-scoped store", async () => {
  const page = await readFile(new URL("../app/playbook/page.js", import.meta.url), "utf8");
  assert.match(page, /from\("playbook_entries"\)/);
  assert.match(page, /eq\("profile_key",\s*profileKey\)/);
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
  assert.match(coach, /I couldn’t save that to your Playbook\. The database write did not complete\./);
});
