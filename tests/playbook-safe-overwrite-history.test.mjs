import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Voice Playbook collisions require an explicit new-or-overwrite choice", async () => {
  const route = await readFile(new URL("../app/api/voice-actions/route.js", import.meta.url), "utf8");
  assert.match(route, /conflictResolution/);
  assert.match(route, /status:\s*409/);
  assert.match(route, /conflict:\s*true/);
  assert.match(route, /Previous version preserved/);
});

test("Voice overwrite snapshots the previous Playbook row before updating it", async () => {
  const route = await readFile(new URL("../app/api/voice-actions/route.js", import.meta.url), "utf8");
  assert.match(route, /from\("playbook_entry_versions"\)/);
  assert.match(route, /playbook_entry_id:\s*existingEntry\.id/);
  assert.match(route, /updated_at:\s*new Date\(\)\.toISOString\(\)/);
});

test("Coach asks naturally before overwriting a colliding Playbook item", async () => {
  const coach = await readFile(new URL("../app/coach/page.js", import.meta.url), "utf8");
  assert.match(coach, /pendingPlaybookConflictRef/);
  assert.match(coach, /classifyPlaybookConflictChoice/);
  assert.match(coach, /replace that existing entry/);
  assert.match(coach, /save this as a new entry/);
});

test("Playbook review updates preserve a previous version", async () => {
  const route = await readFile(new URL("../app/api/personal-playbook/route.js", import.meta.url), "utf8");
  assert.match(route, /playbook_entry_versions/);
  assert.match(route, /original_created_at/);
  assert.match(route, /updated_at:\s*new Date\(\)\.toISOString\(\)/);
});

test("Playbook UI shows latest activity date and can restore a previous version", async () => {
  const page = await readFile(new URL("../app/playbook/page.js", import.meta.url), "utf8");
  assert.match(page, /entry\.updated_at \|\| entry\.created_at/);
  assert.match(page, /Restore previous version/);
  assert.match(page, /\/api\/playbook-versions/);
});

test("Playbook version history migration is owner-scoped with RLS", async () => {
  const sql = await readFile(new URL("../supabase/migrations/20260922_playbook_entry_versions.sql", import.meta.url), "utf8");
  assert.match(sql, /create table if not exists public\.playbook_entry_versions/);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /user_id = auth\.uid\(\)/);
  assert.match(sql, /add column if not exists updated_at/);
});
