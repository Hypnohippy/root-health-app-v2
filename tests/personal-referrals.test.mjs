import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { supportsMarket, activeReferral } from "../lib/introducerMarkets.js";
import { rememberPersonalReferral, personalReferralUrl } from "../lib/personalReferralJourney.js";
import { collectedPersonalAmount, recordPersonalReferralInvoice } from "../lib/personalReferralAccounting.js";
import { getRootDestination } from "../lib/rootNavigator.js";

const user="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const intro="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const now=new Date("2026-10-03T12:00:00Z");

test("Personal referral and Capacity Check entry routes remain public without opening protected routes",()=>{
  for(const path of ["/start","/capacity-check","/capacity-check/continue","/personal/join","/referral"])
    assert.equal(getRootDestination(null,path),null);
  for(const path of ["/admin/introducers","/coach"]) assert.equal(getRootDestination(null,path),"/welcome");
});

test("Corporate defaults, both markets, invalid/inactive/expired agreements and admin filter semantics",()=>{
  const legacy={status:"active"};
  assert.equal(activeReferral(legacy,"corporate",now),true);
  assert.equal(activeReferral(legacy,"personal",now),false);
  for(const market of ["personal","corporate","both"]) {
    const record={status:"active",introducer_market:market};
    for(const target of ["personal","corporate"]) {
      assert.equal(activeReferral(record,target,now),market===target||market==="both");
      assert.equal(supportsMarket(record,target),market===target||market==="both");
    }
  }
  for(const record of [null,{status:"inactive",introducer_market:"both"},
    {status:"active",introducer_market:"both",agreement_end_date:"2026-10-02"},
    {status:"active",introducer_market:"both",agreement_start_date:"2026-10-04"}]) {
    assert.equal(activeReferral(record,"personal",now),false);
  }
  const rows=[legacy,{introducer_market:"personal"},{introducer_market:"both"}];
  assert.equal(rows.filter(row=>supportsMarket(row,"corporate")).length,2);
  assert.equal(rows.filter(row=>supportsMarket(row,"personal")).length,2);
});

test("code survives navigation and signup verification URL without carrying commercial terms",()=>{
  const values=new Map();
  const storage={getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
  assert.equal(rememberPersonalReferral("?ref=Root-Coach",storage),"root-coach");
  assert.equal(rememberPersonalReferral("",storage),"root-coach");
  const url=personalReferralUrl("/personal/join?checkout=resume&plan=monthly",rememberPersonalReferral("",storage));
  assert.equal(url,"/personal/join?checkout=resume&plan=monthly&ref=root-coach");
  assert.equal(rememberPersonalReferral("?ref=",storage),"");
  const join=fs.readFileSync("app/personal/join/page.js","utf8");
  assert.match(join,/emailRedirectTo: returnUrl/);
  assert.match(join,/referralCode: rememberPersonalReferral/);
});

function stripeMock(invoices) {
  return {
    invoices:{list:()=>({autoPagingToArray:async()=>invoices})},
    invoicePayments:{list:({invoice})=>({autoPagingToArray:async()=>[
      {amount_paid:2000,payment:{type:"payment_intent",payment_intent:"pi_"+invoice}},
    ]})},
    paymentIntents:{retrieve:async()=>({status:"succeeded",customer:"cus_1",currency:"gbp",amount_received:2000})},
  };
}
const invoice=(id,time)=>({id,status:"paid",amount_paid:2000,currency:"gbp",customer:"cus_1",subscription:"sub_1",
  created:time,status_transitions:{paid_at:time}});
test("only verified collected money qualifies, not free, out-of-band or failed payments",async()=>{
  const stripe=stripeMock([]);
  assert.equal(await collectedPersonalAmount(stripe,invoice("in_1",1)),2000);
  for(const patch of [{amount_paid:0},{paid_out_of_band:true},{status:"open"}])
    assert.equal(await collectedPersonalAmount(stripe,{...invoice("in_1",1),...patch}),0);
  stripe.paymentIntents.retrieve=async()=>({status:"processing"});
  await assert.rejects(collectedPersonalAmount(stripe,invoice("in_1",1)),/Unverified/);
});
test("invoice accounting uses private identity metadata and orders paid invoices before RPC",async()=>{
  const calls=[];
  const stripe=stripeMock([invoice("later",2),invoice("first",1)]);
  const subscription={id:"sub_1",customer:"cus_1",metadata:{root_product:"personal",user_id:user,personal_attribution_id:intro}};
  await recordPersonalReferralInvoice({stripe,subscription,invoice:invoice("later",2),
    supabase:{rpc:async(name,args)=>{calls.push([name,args]);return {};}}});
  assert.deepEqual(calls.map(call=>call[1].p_invoice_id),["first","later"]);
  assert.ok(calls.every(call=>call[1].p_user_id===user&&call[1].p_amount_minor===2000));
  await assert.rejects(recordPersonalReferralInvoice({stripe,subscription,invoice:{...invoice("later",2),customer:"wrong"}}),/identity mismatch/);
  const before=calls.length;
  await recordPersonalReferralInvoice({subscription:{metadata:{root_product:"corporate"}},stripe});
  assert.equal(calls.length,before);
});

async function database() {
  const db=new PGlite();
  await db.exec("create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql as 'select null::uuid'; create table public.organisations(id uuid primary key); create sequence public.root_commercial_document_number_seq;");
  const schema=JSON.parse(fs.readFileSync("tests/fixtures/introducer-schema.json","utf8"));
  const tables=[...new Set(schema.filter(row=>row.object_type==="01_COLUMN").map(row=>row.object_name))];
  for(const table of tables) {
    const columns=schema.filter(row=>row.object_type==="01_COLUMN"&&row.object_name===table).map(row=>{
      const name=row.item.split(" ")[1];
      const parts=Object.fromEntries(row.definition.split("; ").map(part=>{const at=part.indexOf("=");return [part.slice(0,at),part.slice(at+1)];}));
      return `"${name}" ${parts.type}${parts.nullable==="NO"?" not null":""}${parts.default?" default "+parts.default:""}`;
    });
    await db.exec(`create table public.${table} (${columns.join(",")});`);
  }
  for(const type of ["PRIMARY KEY","UNIQUE","CHECK","FOREIGN KEY"])
    for(const row of schema.filter(row=>row.object_type==="03_CONSTRAINT"&&row.definition.startsWith("type="+type+";")))
      await db.exec(`alter table public.${row.object_name} add constraint ${row.item} ${row.definition.split("; ")[1]};`);
  for(const row of schema.filter(row=>row.object_type==="04_INDEX")) {
    if(!(await db.query("select 1 from pg_indexes where indexname=$1",[row.item])).rows.length) await db.exec(row.definition);
  }
  for(const row of schema.filter(row=>["06_TRIGGER_FUNCTION","09_REQUIRED_FUNCTION"].includes(row.object_type))) await db.exec(row.definition);
  for(const row of schema.filter(row=>row.object_type==="05_TRIGGER")) await db.exec(row.definition);
  for(const table of tables) await db.exec(`alter table public.${table} enable row level security;`);
  const definitions=async()=> (await db.query(`
    select 'constraint:'||conname key,pg_get_constraintdef(oid) definition from pg_constraint where connamespace='public'::regnamespace
    union all select 'index:'||indexname,indexdef from pg_indexes where schemaname='public'
    union all select 'function:'||proname,pg_get_functiondef(oid) from pg_proc where pronamespace='public'::regnamespace
  `)).rows;
  const before=await definitions();
  await db.exec(fs.readFileSync("supabase/migrations/20261003_personal_introducer_referrals.sql","utf8"));
  const after=new Map((await definitions()).map(row=>[row.key,row.definition]));
  for(const row of before) assert.equal(after.get(row.key),row.definition,"Existing object changed: "+row.key);
  await db.query("insert into auth.users values($1)",[user]);
  await db.query("insert into organisation_introducers(id,name,referral_code,commission_percent,commission_basis,commission_structure,status,vat_registered,vat_number) values($1,'Referrer','test-ref',20,'collected_subscription_revenue','one_off','active',true,'GB123')",[intro]);
  await db.query("insert into organisation_introducer_policies(introducer_id,commission_percent,commission_basis,commission_structure,effective_from) values($1,20,'collected_subscription_revenue','one_off',now()-interval '1 day')",[intro]);
  return db;
}
const prepare=db=>db.query("select prepare_personal_referral($1,'test-ref') id",[user]);
const pay=(db,attribution,invoiceId="in_1",amount=2000)=>db.query(
  "select record_personal_referral_payment($1,$2,$3,'sub_1','cus_1',$4,'gbp',now())",
  [attribution,user,invoiceId,amount]);

test("live-schema migration defaults Corporate, validates Personal and restricts private accounting",async()=>{
  const db=await database();
  try {
    assert.equal((await db.query("select introducer_market from organisation_introducers")).rows[0].introducer_market,"corporate");
    assert.equal((await prepare(db)).rows[0].id,null);
    for(const market of ["personal","both"]) {
      await db.query("update organisation_introducers set introducer_market=$1",[market]);
      for(const patch of ["status='inactive'","status='active',agreement_end_date=current_date-1",
        "agreement_end_date=null,agreement_start_date=current_date+1"]) {
        await db.exec("update organisation_introducers set "+patch);
        assert.equal((await prepare(db)).rows[0].id,null);
      }
      await db.exec("update organisation_introducers set status='active',agreement_start_date=null,agreement_end_date=null");
    }
    assert.equal((await db.query("select prepare_personal_referral($1,'missing') id",[user])).rows[0].id,null);
    await assert.rejects(db.exec("update organisation_introducers set introducer_market='unknown'"),/check constraint/);
    for(const role of ["anon","authenticated"]) {
      await db.exec("set role "+role);
      await assert.rejects(db.query("select * from personal_referral_attributions"),/permission denied/);
      await assert.rejects(prepare(db),/permission denied/);
      await db.exec("reset role");
    }
  } finally { await db.close(); }
});

test("confirmed payment is atomic, duplicate-safe, VAT-correct and one-off terms remain frozen",async()=>{
  const db=await database();
  try {
    await db.exec("update organisation_introducers set introducer_market='personal'");
    const attribution=(await prepare(db)).rows[0].id;
    assert.equal((await prepare(db)).rows[0].id,attribution);
    assert.equal((await db.query("select count(*)::int n from organisation_commissions")).rows[0].n,0);
    await assert.rejects(pay(db,attribution,"in_zero",0),/Invalid verified/);
    // Force the second write to fail and prove the revenue insert is rolled back.
    await db.exec("alter table organisation_commissions add constraint test_failure check (commission_amount<0) not valid");
    await assert.rejects(pay(db,attribution),/test_failure/);
    assert.equal((await db.query("select count(*)::int n from organisation_revenue_events")).rows[0].n,0);
    await db.exec("alter table organisation_commissions drop constraint test_failure");
    await pay(db,attribution);await pay(db,attribution);
    await db.exec("update organisation_introducers set commission_percent=90,vat_registered=false; update organisation_introducer_policies set commission_percent=90,commission_structure='recurring'");
    await pay(db,attribution,"in_2");
    const rows=(await db.query("select * from organisation_commissions")).rows;
    assert.equal(rows.length,1);assert.equal(Number(rows[0].commission_amount),4);
    assert.equal(Number(rows[0].vat_amount),0.8);assert.equal(Number(rows[0].total_payable),4.8);
    assert.equal(rows[0].personal_vat_number_at_conversion,"GB123");
    assert.equal(rows[0].application_id,null);
    assert.equal((await db.query("select count(*)::int n from organisation_revenue_events")).rows[0].n,2);
  } finally {await db.close();}
});

test("recurring uses frozen effective policy on subsequent collected invoices",async()=>{
  const db=await database();
  try {
    await db.exec("update organisation_introducers set introducer_market='both',vat_registered=false; update organisation_introducer_policies set commission_structure='recurring'");
    const attribution=(await prepare(db)).rows[0].id;
    await pay(db,attribution);
    await db.exec("update organisation_introducer_policies set commission_percent=90");
    await pay(db,attribution,"in_2",3000);await pay(db,attribution,"in_2",3000);
    const rows=(await db.query("select commission_event,commission_amount,vat_amount from organisation_commissions order by collected_amount")).rows;
    assert.equal(rows.length,2);
    assert.deepEqual(rows.map(row=>Number(row.commission_amount)),[4,6]);
    assert.ok(rows.every(row=>Number(row.vat_amount)===0));
    assert.equal(rows[1].commission_event,"recurring_payment");
  } finally {await db.close();}
});

test("terms are finalised at collected conversion, not abandoned checkout; Corporate ledger shape still inserts",async()=>{
  const db=await database();
  try {
    await db.exec("update organisation_introducers set introducer_market='personal'");
    const attribution=(await prepare(db)).rows[0].id;
    await db.exec("update organisation_introducer_policies set commission_percent=30");
    await pay(db,attribution);
    assert.equal(Number((await db.query("select commission_amount from organisation_commissions")).rows[0].commission_amount),6);
    const revenue=(await db.query(`insert into organisation_revenue_events(payment_source,gross_amount,net_collected_amount,received_at)
      values('stripe_checkout',100,100,now()) returning id`)).rows[0].id;
    await db.query(`insert into organisation_commissions(revenue_event_id,introducer_id,organisation_name,
      commission_percent,commission_basis,commission_structure,collected_amount,qualifying_amount,commission_amount,total_payable)
      values($1,$2,'Existing Corporate',20,'collected_subscription_revenue','one_off',100,100,20,20)`,[revenue,intro]);
    assert.equal((await db.query("select personal_attribution_id from organisation_commissions where organisation_name='Existing Corporate'")).rows[0].personal_attribution_id,null);
  } finally {await db.close();}
});
