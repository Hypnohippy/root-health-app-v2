import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Voice Playbook building is isolated from realtime speech", async () => {
  const coach = await readFile(new URL("../app/coach/page.js", import.meta.url), "utf8");
  const realtime = await readFile(new URL("../app/api/realtime-session/route.js", import.meta.url), "utf8");

  assert.match(coach, /fetch\("\/api\/voice-playbook-build"/);
  assert.doesNotMatch(coach, /response_purpose:\s*"root_playbook_document"/);
  assert.doesNotMatch(coach, /output_modalities:\s*\["text"\]/);
  assert.match(realtime, /Do NOT generate the full Playbook document in the spoken conversation/);
  assert.match(realtime, /continue the conversation normally/);
});

test("background Playbook work still writes through the authenticated existing Playbook persistence boundary", async () => {
  const coach = await readFile(new URL("../app/coach/page.js", import.meta.url), "utf8");

  assert.match(coach, /supabase\.auth\.getSession\(\)/);
  assert.match(coach, /persistVoicePlaybookEntry\(\{/);
  assert.match(coach, /profileKey,/);
  assert.match(coach, /userIntent:\s*pending\.userIntent/);
  assert.match(coach, /Saved to your Playbook\./);
});

test("Coach still sends the shared Personal context into Realtime unchanged", async () => {
  const coach = await readFile(new URL("../app/coach/page.js", import.meta.url), "utf8");

  assert.match(coach, /profile,/);
  assert.match(coach, /history,/);
  assert.match(coach, /mindEntries,/);
  assert.match(coach, /journalEntries,/);
  assert.match(coach, /journey,/);
  assert.match(coach, /personalKnowledge,/);
});

test("shared Root knowledge continues to pool Voice and Playbook evidence", async () => {
  const service = await readFile(new URL("../lib/personalKnowledgeService.js", import.meta.url), "utf8");
  const loader = await readFile(new URL("../lib/personalEvidenceLoader.js", import.meta.url), "utf8");

  assert.match(service, /voiceSessions:\s*records\(evidence\.awareness\?\.voice\)/);
  assert.match(loader, /table:\s*"voice_sessions"/);
  assert.match(loader, /table:\s*"playbook_entries"/);
});

test("Voice never claims a Playbook save before the app confirms persistence", async () => {
  const realtime = await readFile(new URL("../app/api/realtime-session/route.js", import.meta.url), "utf8");

  assert.match(realtime, /Never say or imply that something "is saved"/);
  assert.match(realtime, /before the app has actually confirmed a successful database save/);
});

test("detailed recipe and price content defaults to written rather than spoken", async () => {
  const realtime = await readFile(new URL("../app/api/realtime-session/route.js", import.meta.url), "utf8");

  assert.match(realtime, /do not read ingredient lists, recipe methods, supermarket prices/);
  assert.match(realtime, /unless the user explicitly asks you to read them/);
});
