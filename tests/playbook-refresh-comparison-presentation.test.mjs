import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Playbook review refreshes the authoritative saved row after PATCH", async () => {
  const page = await readFile(new URL("../app/playbook/page.js", import.meta.url), "utf8");
  assert.match(page, /from\("playbook_entries"\)/);
  assert.match(page, /\.eq\("id", reviewEntry\.id\)/);
  assert.match(page, /setReviewEntry\(visibleEntry\)/);
  assert.match(page, /setOpenEntryId\(reviewEntry\.id\)/);
});

test("Playbook review comparisons use one consolidated Markdown table", async () => {
  const route = await readFile(new URL("../app/api/playbook-review/route.js", import.meta.url), "utf8");
  assert.match(route, /COMPARISON PRESENTATION RULE/);
  assert.match(route, /ONE consolidated Markdown table/);
  assert.match(route, /Do not scatter the same comparison across small tables/);
});

test("Voice Playbook background builder uses one consolidated comparison table", async () => {
  const route = await readFile(new URL("../app/api/voice-playbook-build/route.js", import.meta.url), "utf8");
  assert.match(route, /ONE consolidated Markdown comparison table/);
  assert.match(route, /do not create separate mini comparison tables/);
});


test("comparison tables name the actual supermarkets or providers", async () => {
  const builder = await readFile(new URL("../app/api/voice-playbook-build/route.js", import.meta.url), "utf8");
  const review = await readFile(new URL("../app/api/playbook-review/route.js", import.meta.url), "utf8");

  assert.match(builder, /NEVER label comparison columns with placeholders/);
  assert.match(builder, /use those exact names as the table column headings/);
  assert.match(review, /NEVER use placeholder comparison headings/);
  assert.match(review, /preserve those exact names in the table headings/);
});


test("Voice Playbook comparisons are opt-in to the current request only", async () => {
  const builder = await readFile(new URL("../app/api/voice-playbook-build/route.js", import.meta.url), "utf8");
  const realtime = await readFile(new URL("../app/api/realtime-session/route.js", import.meta.url), "utf8");

  assert.match(builder, /do NOT add a price comparison/);
  assert.match(builder, /CURRENT user's request explicitly asks/);
  assert.match(builder, /If no comparison was requested in the current user intent, omit comparison pricing entirely/);
  assert.match(realtime, /Do not introduce supermarket prices, price comparisons/);
});
