import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  recordPersonalAcquisitionCheckout,
  recordPersonalAcquisitionSubscription,
} from "../lib/personalAcquisitionLifecycle.js";

test("checkout lifecycle records only non-clinical identity and funnel state", async () => {
  const calls = [];
  const supabase = {
    rpc: async (name, args) => {
      calls.push([name, args]);
      return { data: "contact-1", error: null };
    },
  };

  const user = {
    id: "user-1",
    email: "Person@Example.com",
    created_at: "2026-10-06T07:00:00.000Z",
  };

  const result = await recordPersonalAcquisitionCheckout({
    supabase,
    user,
    plan: "annual",
    checkoutSessionId: "cs_123",
    checkoutStartedAt: "2026-10-06T08:00:00.000Z",
  });

  assert.equal(result.tracked, true);
  assert.equal(calls[0][0], "record_personal_acquisition_checkout");
  assert.deepEqual(calls[0][1], {
    p_user_id: "user-1",
    p_email: "person@example.com",
    p_signup_at: "2026-10-06T07:00:00.000Z",
    p_plan: "annual",
    p_checkout_session_id: "cs_123",
    p_checkout_started_at: "2026-10-06T08:00:00.000Z",
  });

  const serialized = JSON.stringify(calls[0][1]);
  for (const forbidden of [
    "stress_score",
    "sleep_score",
    "recovery_score",
    "energy_score",
    "mood_score",
    "focus_score",
    "burnout_score",
    "dominant_signal",
  ]) {
    assert.equal(serialized.includes(forbidden), false);
  }
});

test("subscription lifecycle records subscriber state against verified user identity", async () => {
  const calls = [];
  const supabase = {
    rpc: async (name, args) => {
      calls.push([name, args]);
      return { data: "contact-1", error: null };
    },
  };

  const result = await recordPersonalAcquisitionSubscription({
    supabase,
    user: { id: "user-1", email: "person@example.com" },
    plan: "monthly",
    status: "active",
    active: true,
    activatedAt: "2026-10-06T09:00:00.000Z",
    updatedAt: "2026-10-06T09:01:00.000Z",
  });

  assert.equal(result.tracked, true);
  assert.equal(calls[0][0], "record_personal_acquisition_subscription");
  assert.equal(calls[0][1].p_user_id, "user-1");
  assert.equal(calls[0][1].p_active, true);
  assert.equal(calls[0][1].p_status, "active");
});

test("missing verified identity fails closed without writing", async () => {
  let writes = 0;
  const supabase = {
    rpc: async () => {
      writes += 1;
      return { data: null, error: null };
    },
  };

  const checkout = await recordPersonalAcquisitionCheckout({
    supabase,
    user: { id: "user-1", email: "" },
    plan: "monthly",
    checkoutSessionId: "cs_1",
  });

  const subscription = await recordPersonalAcquisitionSubscription({
    supabase,
    user: null,
    plan: "monthly",
    status: "active",
    active: true,
  });

  assert.equal(checkout.tracked, false);
  assert.equal(subscription.tracked, false);
  assert.equal(writes, 0);
});

test("migration keeps acquisition lifecycle service-only and copies no wellbeing scores", () => {
  const sql = fs.readFileSync(
    "supabase/migrations/20261006_personal_acquisition_lifecycle.sql",
    "utf8"
  );

  assert.match(sql, /personal_acquisition_contacts/);
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /revoke all on table public\.personal_acquisition_contacts from public, anon, authenticated/i);
  assert.match(sql, /record_personal_acquisition_checkout/);
  assert.match(sql, /record_personal_acquisition_subscription/);
  assert.match(sql, /trg_sync_personal_acquisition_from_capacity_lead/);

  const contactTable = sql.slice(
    sql.indexOf("create table if not exists public.personal_acquisition_contacts"),
    sql.indexOf("create index if not exists personal_acquisition_contacts_user_idx")
  );

  for (const forbidden of [
    "stress_score",
    "sleep_score",
    "recovery_score",
    "energy_score",
    "mood_score",
    "focus_score",
    "burnout_score",
    "dominant_signal",
    "dominant_score",
    "result_band",
  ]) {
    assert.equal(contactTable.includes(forbidden), false);
  }
});
