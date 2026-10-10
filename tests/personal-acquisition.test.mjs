import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { PGlite } from "@electric-sql/pglite";
import Stripe from "stripe";
import { neutralAttribution, acquisitionEvent } from "../lib/personalAcquisition.js";
import * as server from "../lib/personalAcquisition.server.js";
import { rememberPersonalReferral } from "../lib/personalReferralJourney.js";

const acquisition = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", asset = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", user = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const secret = "fixture-only-signing-secret-01234567890123456789";
process.env.PERSONAL_ACQUISITION_COOKIE_SECRET = secret;
process.env.PERSONAL_ACQUISITION_ENABLED = "true";
const journey = () => server.captureJourney(null, { acquisition_id: acquisition, utm_campaign: `pa-${acquisition}`, asset_id: asset, utm_source: "linkedin", utm_medium: "social" });
const response = { NextResponse: { json(body, options = {}) { return { body, status: options.status || 200, headers: options.headers, cookies: { set(name, value, settings) { this.saved = { name, value, settings }; } } }; } } };
function loadRoute(file, dependencies) {
  const source = fs.readFileSync(file, "utf8").replace(/import \{([^}]+)\} from "([^"]+)";/g, (_, names, module) => `const {${names}} = dependencies[${JSON.stringify(module)}];`)
    .replace(/import (\w+) from "([^"]+)";/g, (_, name, module) => `const ${name} = dependencies[${JSON.stringify(module)}];`)
    .replace(/export async function /g, "async function ");
  return vm.runInNewContext(`${source}\n({POST});`, { dependencies, URL, Buffer, console, process });
}
async function database() {
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key); insert into auth.users values('${user}');`);
  await db.exec(fs.readFileSync("supabase/migrations/20261010114550_personal_acquisition_events.sql", "utf8"));
  const admin = {
    from(table) {
      assert.equal(table, "personal_acquisition_events");
      const filters = {};
      return {
        async upsert(row, options) {
          assert.equal(options.ignoreDuplicates, true);
          const keys = Object.keys(row);
          await db.query(`insert into personal_acquisition_events(${keys.join(",")}) values(${keys.map((_,i)=>`$${i+1}`).join(",")}) on conflict(dedupe_key) do nothing`, Object.values(row));
          return { error: null };
        },
        select() { return this; }, eq(key,value) { filters[key] = value; return this; },
        async maybeSingle() { const data = await db.query("select occurred_at from personal_acquisition_events where attribution_session_id=$1 and event_name=$2", [filters.attribution_session_id, filters.event_name]); return { data: data.rows[0] || null }; },
      };
    },
    auth: { getUser: async token => token === "valid-own-session" ? { data: { user: { id: user, created_at: new Date().toISOString(), email_confirmed_at: new Date().toISOString() } } } : { error: "invalid" },
      admin: { getUserById: async id => ({ data: { user: { id } } }) } },
    rpc: async (name,args) => { const result = await db.query(`select * from ${name}($1::uuid[])`, [args.p_acquisition_ids]); return { data: result.rows }; },
  };
  return { db, admin };
}
function eventRoute(admin) {
  return loadRoute("app/api/personal/acquisition/event/route.js", { "next/server": response,
    "../../../../../lib/personalAcquisition": { acquisitionEvent },
    "../../../../../lib/personalAcquisition.server": { ...server, acquisitionAdmin: () => admin } });
}
function request(body, token = null, auth = null, origin = "https://root.fixture") {
  return { url: "https://root.fixture/api/personal/acquisition/event", headers: new Headers({ origin, ...(auth ? { authorization: `Bearer ${auth}` } : {}) }),
    cookies: { get: () => token ? { value: token } : undefined }, text: async () => JSON.stringify(body), json: async () => body };
}

test("neutral identifiers survive while arbitrary health, identity and referral fields are dropped", () => {
  const j = journey();
  const row = acquisitionEvent({ ...j, email: "private@example.test", scores: { stress: 9 }, original_post: "private text", ref: "introducer" }, "capacity_check_completed");
  assert.equal(row.acquisition_id, acquisition); assert.equal(row.asset_id, asset);
  assert.deepEqual(Object.keys(row).sort(), ["acquisition_id","campaign_id","asset_id","source","medium","event_name","attribution_session_id","user_id","occurred_at","dedupe_key"].sort());
  assert.doesNotMatch(JSON.stringify(row), /private|stress|introducer/);
  const invalid = neutralAttribution({ acquisition_id: "email@example.test", utm_campaign: "burnout", utm_content: "named-person", source: "depression", medium: "private" });
  assert.ok(Object.values(invalid).every(v => v === null));
});
test("signed first-touch journey is persistent, tamper resistant and independent of introducer storage", () => {
  const j = journey(), token = server.signJourney(j, secret);
  assert.deepEqual(server.verifyJourney(token, secret), j);
  assert.equal(server.verifyJourney(token + "x", secret), null);
  assert.equal(server.verifyJourney(token, "wrong".repeat(10)), null);
  assert.equal(server.verifyJourney(token, secret, j.created_at + server.JOURNEY_MAX_AGE * 1000 + 1), null);
  assert.deepEqual(server.captureJourney(j, { acquisition_id: asset }), j);
  assert.ok(token.length <= 500, "Stripe metadata value limit");
  const values = new Map(), storage = { getItem:key=>values.get(key), setItem:(key,value)=>values.set(key,value), removeItem:key=>values.delete(key) };
  assert.equal(rememberPersonalReferral("?ref=root-coach", storage), "root-coach");
  server.captureJourney(null, { ref: "another-code" });
  assert.equal(rememberPersonalReferral("", storage), "root-coach");
});
test("real event handler and SQL dedupe views/start/completion; completion requires no lead/email save", async () => {
  const { db, admin } = await database();
  try {
    const route = eventRoute(admin);
    const first = await route.POST(request({ eventName: "capacity_check_viewed", attribution: { acquisition_id: acquisition, utm_campaign: `pa-${acquisition}`, asset_id: asset, utm_source: "linkedin", utm_medium: "social" } }));
    assert.equal(first.status, 200);
    const cookie = first.cookies.saved; assert.equal(cookie.settings.httpOnly, true); assert.equal(cookie.settings.secure, true); assert.equal(cookie.settings.sameSite, "lax");
    for (const name of ["capacity_check_viewed", "capacity_check_started", "capacity_check_completed"]) for (let retry = 0; retry < 2; retry++) {
      const result = await route.POST(request({ eventName: name, email: "secret@example.test", scores: { burnout: 9 } }, cookie.value)); assert.equal(result.status, 200);
    }
    const rows = (await db.query("select * from personal_acquisition_events order by event_name")).rows;
    assert.equal(rows.length, 3); assert.ok(rows.every(row => row.acquisition_id === acquisition)); assert.doesNotMatch(JSON.stringify(rows), /secret@|burnout/);
    assert.equal((await db.query("select count(*)::int as n from information_schema.tables where table_name='consumer_capacity_leads'")).rows[0].n, 0);
  } finally { await db.close(); }
});
test("unattributed events remain uncorrelated; API refuses fake subscription, cross-origin and invalid auth events", async () => {
  const { db, admin } = await database(); try {
    const route = eventRoute(admin);
    const result = await route.POST(request({ eventName: "capacity_check_viewed", attribution: { utm_campaign: "anxiety-person" } }));
    assert.equal(result.status, 200); const row = (await db.query("select * from personal_acquisition_events")).rows[0]; assert.equal(row.acquisition_id, null); assert.equal(row.campaign_id, null);
    assert.equal((await route.POST(request({ eventName: "subscription_started" }, result.cookies.saved.value))).status, 400);
    assert.equal((await route.POST(request({ eventName: "capacity_check_viewed" }, null, null, "https://attacker.fixture"))).status, 403);
    assert.equal((await route.POST(request({ eventName: "signup_completed" }, result.cookies.saved.value, "invalid"))).status, 401);
  } finally { await db.close(); }
});
test("own verified auth journey records signup completion once; old-account login does not invent signup", async () => {
  const { db, admin } = await database(); try {
    const j = journey(); await server.recordAcquisitionEvent(admin, acquisitionEvent(j, "signup_started", { occurredAt: "2026-10-10T10:00:00Z" }));
    const created = { id: user, created_at: "2026-10-10T10:01:00Z", email_confirmed_at: "2026-10-10T10:02:00Z" };
    assert.equal(await server.correlateSignup(admin, j, { ...created, created_at: "2026-01-01T00:00:00Z" }), false);
    assert.equal(await server.correlateSignup(admin, j, { ...created, email_confirmed_at: null }), false);
    assert.equal(await server.correlateSignup(admin, j, created), true); await server.correlateSignup(admin, j, created);
    assert.equal((await db.query("select count(*)::int as n from personal_acquisition_events where event_name='signup_completed'")).rows[0].n, 1);
    const metadata = server.stripeAcquisitionMetadata(j); assert.deepEqual(server.verifyJourney(metadata.personal_acquisition_journey), j);
    assert.equal("personal_attribution_id" in metadata, false);
  } finally { await db.close(); }
});
test("verified paid Stripe evidence records one subscriber; trial/unpaid/forged/missing attribution do not", async () => {
  const { db, admin } = await database(); try {
    const j = journey(), subscription = { id: "sub_fixture1", status: "active", metadata: { root_product: "personal", user_id: user, ...server.stripeAcquisitionMetadata(j) } };
    const invoice = { paid: true, amount_paid: 1200, status_transitions: { paid_at: 1791626520 } };
    for (const override of [{ metadata: { root_product: "personal", user_id: user } }, { status: "trialing" }, { metadata: { ...subscription.metadata, personal_acquisition_journey: "forged" } }]) assert.equal(await server.recordPaidAcquisitionSubscription({ admin, subscription: { ...subscription, ...override }, invoice }), false);
    for (const override of [{ paid: false }, { amount_paid: 0 }]) assert.equal(await server.recordPaidAcquisitionSubscription({ admin, subscription, invoice: { ...invoice, ...override } }), false);
    for (let retry = 0; retry < 2; retry++) assert.equal(await server.recordPaidAcquisitionSubscription({ admin, subscription, invoice }), true);
    const row = (await db.query("select * from personal_acquisition_events")).rows[0]; assert.equal(row.event_name, "subscription_started"); assert.equal(row.user_id, user); assert.equal(row.acquisition_id, acquisition);
    assert.equal((await db.query("select count(*)::int as n from personal_acquisition_events")).rows[0].n, 1);
  } finally { await db.close(); }
});
test("RLS/grants reject public access; service aggregate exposes only counts and connected zeroes", async () => {
  const { db, admin } = await database(); try {
    await server.recordAcquisitionEvent(admin, acquisitionEvent(journey(), "capacity_check_completed"));
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`set role ${role}`);
      await assert.rejects(db.query("select * from personal_acquisition_events"), /permission denied/);
      await assert.rejects(db.query("select * from personal_acquisition_counts($1::uuid[])", [[acquisition]]), /permission denied/);
      await assert.rejects(db.query("select * from personal_acquisition_campaign_counts($1::text[])", [[`pa-${acquisition}`]]), /permission denied/);
      await assert.rejects(db.query("insert into personal_acquisition_events(event_name,attribution_session_id,dedupe_key) values('capacity_check_viewed',$1,'blocked')", [asset]), /permission denied/);
      await db.exec("reset role");
    }
    await db.exec("set role service_role");
    const rows = (await db.query("select * from personal_acquisition_counts($1::uuid[])", [[acquisition, asset]])).rows;
    assert.equal(rows.find(row => row.acquisition_id === acquisition).capacity_check_completed, 1);
    assert.equal(rows.find(row => row.acquisition_id === asset).capacity_check_completed, 0);
    assert.deepEqual(Object.keys(rows[0]).sort(), ["acquisition_id","capacity_check_viewed","capacity_check_started","capacity_check_completed","signup_started","signup_completed","subscription_started"].sort());
    assert.doesNotMatch(JSON.stringify(rows), /user_id|email|scores|session_id/);
    const campaign = (await db.query("select * from personal_acquisition_campaign_counts($1::text[])", [[`pa-${acquisition}`]])).rows[0];
    assert.equal(campaign.campaign_id, `pa-${acquisition}`); assert.equal(campaign.capacity_check_completed, 1);
  } finally { await db.close(); }
});
test("authenticated aggregate route returns counts only and unavailable storage is never a fabricated zero", async () => {
  process.env.PERSONAL_ACQUISITION_OPS_TOKEN = "fixture-ops-secret-01234567890123456789";
  const { db, admin } = await database(); try {
    const deps = { "node:crypto": await import("node:crypto"), "next/server": response, "../../../../../lib/personalAcquisition": { UUID: (await import("../lib/personalAcquisition.js")).UUID }, "../../../../../lib/personalAcquisition.server": { ...server, acquisitionAdmin: () => admin } };
    const route = loadRoute("app/api/personal/acquisition/aggregate/route.js", deps);
    const req = token => ({ headers: new Headers({ authorization: `Bearer ${token}` }), json: async () => ({ acquisitionIds: [acquisition] }) });
    assert.equal((await route.POST(req("invalid"))).status, 401);
    const result = await route.POST(req(process.env.PERSONAL_ACQUISITION_OPS_TOKEN)); assert.equal(result.body.available, true); assert.equal(result.body.counts.length, 1);
    assert.doesNotMatch(JSON.stringify(result.body), /user_id|email|scores|session_id/);
    admin.rpc = async () => ({ error: "table unavailable" });
    assert.equal((await route.POST(req(process.env.PERSONAL_ACQUISITION_OPS_TOKEN))).status, 503);
  } finally { await db.close(); }
});
test("existing pages emit explicit events without changing result save or introducer metadata", () => {
  const capacity = fs.readFileSync("app/capacity-check/page.js", "utf8"), join = fs.readFileSync("app/personal/join/page.js", "utf8"), checkout = fs.readFileSync("app/api/stripe/personal-checkout/route.js", "utf8"), webhook = fs.readFileSync("app/api/stripe/personal-webhook/route.js", "utf8");
  assert.match(capacity, /const reveal = \(\) => \{[\s\S]*trackPersonalAcquisition\("capacity_check_completed"\)/);
  assert.match(capacity, /fetch\("\/api\/capacity-check"/); assert.match(capacity, /scores,\s+snapshot,/);
  assert.match(join, /await trackPersonalAcquisition\("signup_started"\);\s+const \{ data, error \} = await supabase.auth.signUp/);
  assert.equal((checkout.match(/\.\.\.referralMetadata/g) || []).length, 2); assert.equal((checkout.match(/\.\.\.acquisitionMetadata/g) || []).length, 2);
  assert.match(checkout, /journeyFromRequest\(request\)/); assert.doesNotMatch(checkout, /requestBody\?\.acquisition/);
  assert.match(webhook, /recordPersonalReferralInvoice/); assert.match(webhook, /recordPaidAcquisitionSubscription/);
});
test("actual checkout route carries signed first-party acquisition and separate introducer metadata in both Stripe objects", async () => {
  const { db, admin } = await database(); try {
    process.env.STRIPE_SECRET_KEY = "sk_test_fixture"; process.env.STRIPE_PERSONAL_MONTHLY_PRICE_ID = "price_fixture";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://fixture.supabase.co"; process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "fixture-only";
    const j = journey(), commercial = "dddddddd-dddd-4ddd-8ddd-dddddddddddd"; let submitted;
    const originalRpc = admin.rpc;
    admin.rpc = async (name,args) => name === "prepare_personal_referral" ? (assert.equal(args.p_code,"root-coach"), { data: commercial }) : originalRpc(name,args);
    const Stripe = class { constructor() { this.checkout = { sessions: { create: async payload => { submitted = payload; return { url:"https://stripe.fixture/checkout" }; } } }; } };
    const route = loadRoute("app/api/stripe/personal-checkout/route.js", { "next/server": response, stripe: Stripe, "@supabase/supabase-js": { createClient:()=>admin }, "../../../../lib/personalAcquisition.server": server });
    const result = await route.POST(request({ plan:"monthly", referralCode:"root-coach", acquisition_id:asset },server.signJourney(j),"valid-own-session"));
    assert.equal(result.status,200);
    for (const metadata of [submitted.metadata,submitted.subscription_data.metadata]) {
      assert.equal(metadata.personal_attribution_id,commercial); assert.equal(server.verifyJourney(metadata.personal_acquisition_journey).acquisition_id,acquisition);
      assert.equal(metadata.user_id,user); assert.equal(metadata.root_product,"personal");
    }
    assert.equal(submitted.client_reference_id,user);
  } finally { await db.close(); }
});
test("actual signature-verified Stripe webhook records one paid subscriber and preserves entitlement/referral processing", async () => {
  const { db, admin } = await database(); try {
    process.env.STRIPE_SECRET_KEY="sk_test_fixture"; process.env.STRIPE_PERSONAL_WEBHOOK_SECRET="fixture-only-webhook";
    process.env.SUPABASE_SERVICE_ROLE_KEY="fixture-only-service-key";
    const j=journey(), subscription={id:"sub_fixture2",status:"active",metadata:{root_product:"personal",user_id:user,...server.stripeAcquisitionMetadata(j)},items:{data:[{price:{id:"price_fixture"}}]}};
    const invoice={id:"in_fixture",subscription:subscription.id,paid:true,amount_paid:1200,status_transitions:{paid_at:1791626520}};
    let entitlement, referrals=0;
    const wrapped={...admin,from(table){if(table!=="personal_subscriptions")return admin.from(table);const q={select(){return q;},eq(){return q;},limit(){return q;},maybeSingle:async()=>({data:null}),upsert:async values=>{entitlement=values;return {};}};return q;}};
    const stripe=new Stripe("sk_test_fixture");stripe.subscriptions.retrieve=async()=>subscription;
    const payload=JSON.stringify({id:"evt_fixture",type:"invoice.paid",data:{object:invoice}});
    const signature=stripe.webhooks.generateTestHeaderString({payload,secret:process.env.STRIPE_PERSONAL_WEBHOOK_SECRET});
    const FixtureStripe=class{constructor(){return stripe;}};
    const route=loadRoute("app/api/stripe/personal-webhook/route.js",{"next/server":response,stripe:FixtureStripe,"@supabase/supabase-js":{createClient:()=>wrapped},"../../../../lib/personalReferralAccounting":{recordPersonalReferralInvoice:async()=>referrals++},"../../../../lib/personalAcquisition.server":server});
    const req=value=>({headers:new Headers({"stripe-signature":value}),text:async()=>payload});
    for(let retry=0;retry<2;retry++)assert.equal((await route.POST(req(signature))).status,200);
    assert.equal(entitlement.subscription_active,true);assert.equal(entitlement.stripe_subscription_id,subscription.id);assert.equal(referrals,2);
    assert.equal((await db.query("select count(*)::int as n from personal_acquisition_events where event_name='subscription_started'")).rows[0].n,1);
    assert.equal((await route.POST(req("invalid"))).status,400);
  }finally{await db.close();}
});
test("client serialises explicit events, retries failure and never sends scores/email/query identity",async()=>{
  const requests=[];let available=false;
  const source=fs.readFileSync("lib/personalAcquisition.client.js","utf8").replace("export function trackPersonalAcquisition","function trackPersonalAcquisition");
  const client=vm.runInNewContext(`${source}\n({trackPersonalAcquisition});`,{URLSearchParams,AbortSignal,window:{location:{search:`?acquisition_id=${acquisition}&email=private%40example.test&scores=secret&ref=root-coach`}},fetch:async(url,options)=>{requests.push({url,body:JSON.parse(options.body)});return {ok:available};}});
  await client.trackPersonalAcquisition("capacity_check_viewed",{capture:true});available=true;
  await client.trackPersonalAcquisition("capacity_check_viewed",{capture:true});
  await Promise.all([client.trackPersonalAcquisition("capacity_check_started"),client.trackPersonalAcquisition("capacity_check_started"),client.trackPersonalAcquisition("capacity_check_completed")]);
  assert.deepEqual(requests.map(r=>r.body.eventName),["capacity_check_viewed","capacity_check_viewed","capacity_check_started","capacity_check_completed"]);
  assert.doesNotMatch(JSON.stringify(requests),/private|scores|secret|root-coach/);
});
