import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { agreementTerms,termsHash } from "../lib/introducerGoogleAgreementTerms.js";
import { PR70_MIGRATION_TARGETS, validatePr70MigrationTarget } from "../lib/pr70MigrationGate.server.js";
import { INTRODUCER_PREVIEW_PROJECT_ID, INTRODUCER_PREVIEW_SUPABASE_REF, openActivationLink,parseExactHttpsOrigins,replacementDisposition,sealActivationLink,signOnboardingAssertion,signPreviewActivationReceipt,validateCommercialCallbackUrl,validatePreviewActivationLink,validatePreviewDeployment,verifiedAcceptedAgreement,verifyOnboardingAssertion,verifyPreviewActivationReceipt } from "../lib/professionalIntroducerOnboarding.server.js";

const secret="test-only-onboarding-secret-that-is-not-a-production-credential";
const introId="11111111-1111-4111-8111-111111111111";
const agreementId="22222222-2222-4222-8222-222222222222";
const acceptanceId="33333333-3333-4333-8333-333333333333";
const commercial={id:introId,name:"Jane Introducer",contact_name:"Jane Introducer",contact_email:"jane@example.test",introducer_market:"corporate",introducer_type:"corporate_introducer",referral_code:"jane",vat_registered:false,vat_number:null,agreement_start_date:"2026-11-01",agreement_end_date:null,status:"active"};
const policy={commission_percent:20,commission_basis:"collected_subscription_revenue",commission_structure:"one_off",effective_from:"2020-01-01T00:00:00.000Z",effective_until:null};
const evidence=agreementTerms(commercial,[policy],"None");
const hash=termsHash(evidence);
function acceptedState(overrides={}) {
  const acceptance={id:acceptanceId,accepted_at:"2026-11-19T10:00:00.000Z",evidence:{full_name:"Jane Introducer",email:"jane@example.test"},terms_snapshot:evidence,terms_hash:hash,archive_state:"archived"};
  const agreement={id:agreementId,version:2,status:"accepted",accepted_at:acceptance.accepted_at,sent_to:"jane@example.test",terms_snapshot:evidence,accepted_terms_snapshot:evidence,terms_hash:hash,acceptance};
  return {introducer:commercial,policies:[policy],agreements:[agreement],...overrides};
}

test("activation requires the current archived accepted agreement and exact recipient/terms evidence",()=>{
  const result=verifiedAcceptedAgreement(acceptedState(),introId);
  assert.equal(result.agreementId,agreementId);assert.equal(result.agreementVersion,2);assert.equal(result.recipientEmail,"jane@example.test");
  for(const mutate of [
    s=>{s.agreements[0].status="sent";},
    s=>{s.agreements[0].acceptance.archive_state="pending";},
    s=>{s.agreements[0].acceptance.evidence.email="other@example.test";},
    s=>{s.agreements[0].terms_hash="0".repeat(64);},
    s=>{s.agreements[0].accepted_terms_snapshot={...evidence,commission_percent:99};},
    s=>{s.introducer.status="inactive";},
    s=>{s.introducer.contact_email="other@example.test";},
    s=>{s.policies[0].commission_percent=25;},
    s=>{s.introducer.agreement_start_date="2026-12-01";},
    s=>{s.introducer.agreement_start_date="not-a-date";},
    s=>{s.introducer.agreement_end_date="2026-11-18";},
    s=>{s.introducer.agreement_end_date="2026-02-30";},
    s=>{s.agreements[0].superseded_at="2026-11-19T12:00:00.000Z";},
    s=>{s.agreements[0].cancelled_at="2026-11-19T12:00:00.000Z";},
    s=>{s.agreements[0].revoked_at="2026-11-19T12:00:00.000Z";},
    s=>{s.agreements.push({...s.agreements[0],id:randomUUID(),version:3,status:"sent"});},
  ]) { const state=acceptedState();mutate(state);assert.throws(()=>verifiedAcceptedAgreement(state,introId),/current, archived agreement acceptance/); }
  assert.throws(()=>verifiedAcceptedAgreement(acceptedState(),randomUUID()),/current, archived agreement acceptance/);
});

test("Preview activation receipt is deployment-bound, short-lived, one-use ready, and rejects forgery",()=>{
  const now=Date.now();
  const previewOrigin="https://root-health-introducer-demo-abcd.vercel.app";
  const aud="https://staging.roothealth.app/api/admin/introducers/onboarding";
  const payload={action:"activation_complete",iss:INTRODUCER_PREVIEW_PROJECT_ID,previewVercelProjectId:INTRODUCER_PREVIEW_PROJECT_ID,
    previewSupabaseProjectRef:INTRODUCER_PREVIEW_SUPABASE_REF,vercelEnvironment:"preview",gitBranch:"codex/professional-introducer-demo",
    previewDeploymentOrigin:previewOrigin,aud,jti:randomUUID(),introducerId:introId,agreementId,agreementVersion:2,acceptanceId,
    acceptedAt:"2026-11-19T10:00:00.000Z",acceptedTermsHash:hash,nonce:"a".repeat(64),requestId:randomUUID(),
    activationExpiresAt:new Date(now+60000).toISOString(),recipientEmail:"jane@example.test",contactName:"Jane Introducer",
    previewUserId:randomUUID(),previewOnboardingId:randomUUID(),verifiedEmail:"jane@example.test",grantId:randomUUID(),grantExpiresAt:new Date(now+86400000).toISOString()};
  const receipt=signPreviewActivationReceipt(payload,secret,now);
  assert.equal(verifyPreviewActivationReceipt(receipt,secret,{audience:aud,expectedPreviewOrigin:previewOrigin,now}).previewUserId,payload.previewUserId);
  assert.equal(verifyPreviewActivationReceipt(receipt,secret,{audience:"https://evil.example/api/admin/introducers/onboarding",expectedPreviewOrigin:previewOrigin,now}),null);
  assert.equal(verifyPreviewActivationReceipt(receipt,secret,{audience:aud,expectedPreviewOrigin:"https://other.vercel.app",now}),null);
  assert.equal(verifyPreviewActivationReceipt(`${receipt}x`,secret,{audience:aud,expectedPreviewOrigin:previewOrigin,now}),null);
  assert.equal(verifyPreviewActivationReceipt(receipt,secret,{audience:aud,expectedPreviewOrigin:previewOrigin,now:now+301000}),null);
  const badBranch=signPreviewActivationReceipt({...payload,gitBranch:"main"},secret,now);
  assert.equal(verifyPreviewActivationReceipt(badBranch,secret,{audience:aud,expectedPreviewOrigin:previewOrigin,now}),null);
});

test("callback and Supabase invitation URLs require exact allowlisted identities",()=>{
  const origins=parseExactHttpsOrigins("https://roothealth-staging.vercel.app,https://roothealth.app");
  assert.equal(validateCommercialCallbackUrl("https://roothealth-staging.vercel.app/api/admin/introducers/onboarding",origins).origin,"https://roothealth-staging.vercel.app");
  for(const url of ["https://roothealth-staging.vercel.app.evil.example/api/admin/introducers/onboarding","https://evil.example/api/admin/introducers/onboarding","http://roothealth.app/api/admin/introducers/onboarding","https://roothealth.app/api/admin/introducers/onboarding?next=https://evil.example"])
    assert.throws(()=>validateCommercialCallbackUrl(url,origins));
  assert.throws(()=>parseExactHttpsOrigins("https://*.vercel.app"));
  const activation="https://waluyphoafylzcjuskcl.supabase.co/auth/v1/verify?token=opaque&type=invite&redirect_to=https%3A%2F%2Froot-health-introducer-demo-abcd.vercel.app%2Freset-password%3Fnext%3D%252Fintroducer";
  assert.equal(validatePreviewActivationLink(activation,{previewOrigin:"https://root-health-introducer-demo-abcd.vercel.app",previewSupabaseRef:INTRODUCER_PREVIEW_SUPABASE_REF}),true);
  assert.equal(validatePreviewActivationLink(activation.replace("waluyphoafylzcjuskcl","otherproject"),{previewOrigin:"https://root-health-introducer-demo-abcd.vercel.app",previewSupabaseRef:INTRODUCER_PREVIEW_SUPABASE_REF}),false);
  assert.equal(validatePreviewActivationLink(activation.replace("type=invite","type=recovery"),{previewOrigin:"https://root-health-introducer-demo-abcd.vercel.app",previewSupabaseRef:INTRODUCER_PREVIEW_SUPABASE_REF}),false);
  assert.equal(validatePreviewActivationLink(activation.replace("%252Fintroducer","%252Fadmin"),{previewOrigin:"https://root-health-introducer-demo-abcd.vercel.app",previewSupabaseRef:INTRODUCER_PREVIEW_SUPABASE_REF}),false);
});

test("invitation replacement is expiry-gated and retries are recoverable only for the same pending request",()=>{
  const now=Date.parse("2026-11-20T12:00:00.000Z");
  const row={state:"sent",activation_request_id:randomUUID(),activation_expires_at:new Date(now-1).toISOString(),access_grant_id:null};
  assert.equal(replacementDisposition(row,{requestId:randomUUID(),now}),"begin");
  assert.equal(replacementDisposition({...row,state:"delivery_uncertain",activation_expires_at:new Date(now+60000).toISOString()},{requestId:randomUUID(),now}),"reject");
  const pending={...row,state:"replacement_pending",activation_expires_at:new Date(now+60000).toISOString()};
  assert.equal(replacementDisposition(pending,{requestId:pending.activation_request_id,now}),"resume");
  assert.equal(replacementDisposition(pending,{requestId:randomUUID(),now}),"reject");
  assert.equal(replacementDisposition({...pending,activation_expires_at:new Date(now-1).toISOString()},{requestId:randomUUID(),now}),"begin");
  assert.equal(replacementDisposition({...row,access_grant_id:randomUUID()},{requestId:randomUUID(),now}),"reject");
});

test("Preview deployment identity fails closed on wrong project, database, environment, or branch",()=>{
  const env={ROOT_INTRODUCER_VERCEL_PROJECT_ID:INTRODUCER_PREVIEW_PROJECT_ID,ROOT_INTRODUCER_SUPABASE_PROJECT_REF:INTRODUCER_PREVIEW_SUPABASE_REF,
    VERCEL_PROJECT_ID:INTRODUCER_PREVIEW_PROJECT_ID,VERCEL_ENV:"preview",VERCEL_GIT_COMMIT_REF:"codex/professional-introducer-demo",
    NEXT_PUBLIC_SUPABASE_URL:`https://${INTRODUCER_PREVIEW_SUPABASE_REF}.supabase.co`};
  assert.equal(validatePreviewDeployment(env),true);
  for(const mutate of [e=>e.VERCEL_ENV="production",e=>e.VERCEL_PROJECT_ID="production",e=>e.VERCEL_GIT_COMMIT_REF="main",
    e=>e.ROOT_INTRODUCER_SUPABASE_PROJECT_REF="witkwlgldxjwwxmpcyva",e=>e.NEXT_PUBLIC_SUPABASE_URL="https://witkwlgldxjwwxmpcyva.supabase.co",
    e=>e.NEXT_PUBLIC_SUPABASE_URL=`https://user@${INTRODUCER_PREVIEW_SUPABASE_REF}.supabase.co`,
    e=>e.NEXT_PUBLIC_SUPABASE_URL=`https://${INTRODUCER_PREVIEW_SUPABASE_REF}.supabase.co.evil.example`,
    e=>e.NEXT_PUBLIC_SUPABASE_URL=`https://${INTRODUCER_PREVIEW_SUPABASE_REF}.supabase.co/path`]){
    const bad={...env};mutate(bad);assert.throws(()=>validatePreviewDeployment(bad));
  }
});

test("project-specific migration gate rejects wrong targets, histories, and Production identities",()=>{
  const preview=PR70_MIGRATION_TARGETS.preview;
  assert.equal(validatePr70MigrationTarget({target:"preview",...preview,projectRef:preview.supabaseRef,vercelProjectId:preview.vercelProjectId,
    migrationHistory:[...preview.requiredHistory],verifiedSchemaObjects:true}).ready,true);
  for(const bad of [
    {projectRef:"witkwlgldxjwwxmpcyva"},
    {vercelProjectId:"prj_XRyykP2byrJeHZ5hkI3QpGOjF2oO"},
    {migration:"20261120130000_introducer_onboarding_admin.sql"},
    {migrationHistory:[...preview.requiredHistory,"20261120131000"]},
    {migrationHistory:[preview.requiredHistory[0]]},
    {verifiedSchemaObjects:false},
  ]) assert.throws(()=>validatePr70MigrationTarget({target:"preview",...preview,projectRef:preview.supabaseRef,vercelProjectId:preview.vercelProjectId,migrationHistory:[...preview.requiredHistory],verifiedSchemaObjects:true,...bad}));
  assert.throws(()=>validatePr70MigrationTarget({target:"root-staging",migration:PR70_MIGRATION_TARGETS.rootStaging.migration,
    projectRef:"witkwlgldxjwwxmpcyva",vercelProjectId:"prj_XRyykP2byrJeHZ5hkI3QpGOjF2oO",
    migrationHistory:["20261004","20261005","20261006"],verifiedSchemaObjects:true,
    env:{PR70_ROOT_STAGING_SUPABASE_PROJECT_REF:"witkwlgldxjwwxmpcyva",PR70_ROOT_STAGING_VERCEL_PROJECT_ID:"prj_XRyykP2byrJeHZ5hkI3QpGOjF2oO"}}));
  assert.throws(()=>validatePr70MigrationTarget({target:"preview",...preview,projectRef:preview.supabaseRef,vercelProjectId:preview.vercelProjectId,
    migrationHistory:[...preview.requiredHistory,...preview.requiredHistory],verifiedSchemaObjects:true}));
});

test("signed onboarding assertion is short lived, tamper evident and validates identity fields",()=>{
  const now=Date.now();
  const payload={introducerId:introId,agreementId,agreementVersion:2,acceptanceId,acceptedAt:"2026-11-19T10:00:00.000Z",acceptedTermsHash:hash,
    recipientEmail:"jane@example.test",contactName:"Jane Introducer",requestId:randomUUID(),nonce:"n".repeat(64),activationExpiresAt:new Date(now+900000).toISOString()};
  const token=signOnboardingAssertion(payload,secret,now);
  assert.deepEqual(verifyOnboardingAssertion(token,secret,now),{...payload,iat:Math.floor(now/1000),exp:Math.floor(now/1000)+900});
  assert.equal(verifyOnboardingAssertion(token,secret+"x",now),null);
  assert.equal(verifyOnboardingAssertion(`${token}x`,secret,now),null);
  assert.equal(verifyOnboardingAssertion(token,secret,now+901000),null);
  assert.throws(()=>signOnboardingAssertion(payload,"short"),/not configured/);
});

test("prepared activation URL is encrypted at rest and tampering fails closed",()=>{
  const link="https://waluyphoafylzcjuskcl.supabase.co/auth/v1/verify?token=one-time-fixture";
  const cipher=sealActivationLink(link,secret);
  assert.notEqual(cipher,link);assert.doesNotMatch(cipher,/waluy|token|one-time/);
  assert.equal(openActivationLink(cipher,secret),link);
  assert.throws(()=>openActivationLink(`${cipher.slice(0,-1)}x`,secret));
});

test("account activation and API secrets are not rendered by the Root admin component",async()=>{
  const fs=await import("node:fs/promises");
  const ui=await fs.readFile(new URL("../components/IntroducerOnboarding.js",import.meta.url),"utf8");
  assert.match(ui,/Send activation invitation/);assert.match(ui,/agreementReady/);assert.match(ui,/Revoke demo access/);
  assert.doesNotMatch(ui,/actionLink|SUPABASE_SERVICE_ROLE|ROOT_INTRODUCER_ONBOARDING_SHARED_SECRET/);
  const registration=await fs.readFile(new URL("../app/api/admin/introducers/route.js",import.meta.url),"utf8");
  const post=registration.slice(registration.indexOf("export async function POST"),registration.indexOf("export async function PATCH"));
  assert.match(post,/organisation_introducer_onboarding/);assert.doesNotMatch(post,/generateLink|sendEmail|introducerActivationMailer/);
  const preview=await fs.readFile(new URL("../app/api/internal/introducer-onboarding/route.js",import.meta.url),"utf8");
  assert.match(preview,/isIntroducerDeployment\(\)/);assert.match(preview,/generateLink\(\{type:"invite"/);assert.match(preview,/sealActivationLink/);
  assert.match(preview,/if\(error\) throw/);
  const rootRoute=await fs.readFile(new URL("../app/api/admin/introducers/onboarding/route.js",import.meta.url),"utf8");
  assert.match(rootRoute,/x-vercel-oidc-token/);assert.match(rootRoute,/x-vercel-trusted-oidc-idp-token/);
  assert.doesNotMatch(rootRoute,/x-vercel-protection-bypass|VERCEL_AUTOMATION_BYPASS_SECRET/);
  const rootVerification=rootRoute.slice(rootRoute.indexOf("export async function PUT"));
  assert.match(rootVerification,/verifyPreviewActivationReceipt/);
  assert.match(rootVerification,/complete_professional_introducer_onboarding/);
  assert.doesNotMatch(rootVerification,/auth\.admin\.getUserById\(body\.userId\)|body\.userId/,
    "Preview Auth identifiers must never be resolved through Root Auth");
  assert.match(rootRoute,/validatePreviewActivationLink/);
  assert.match(rootRoute,/ROOT_INTRODUCER_VERCEL_PROJECT_ID!==INTRODUCER_PREVIEW_PROJECT_ID/);
  const callback=await fs.readFile(new URL("../app/api/introducer/activation/complete/route.js",import.meta.url),"utf8");
  assert.match(callback,/signPreviewActivationReceipt/);
  assert.match(callback,/verifiedEmail:user\.email\.toLowerCase\(\)/);
  assert.match(callback,/action:"complete",receipt:receiptToken/);
  assert.doesNotMatch(callback,/action:"complete"[\s\S]{0,100}userId/);
  assert.match(callback,/validatePreviewDeployment/);
  assert.match(callback,/validateCommercialCallbackUrl/);
  const previewInternal=await fs.readFile(new URL("../app/api/internal/introducer-onboarding/route.js",import.meta.url),"utf8");
  assert.match(previewInternal,/replacement_pending/);
  assert.ok(previewInternal.indexOf('state:"replacement_pending"')<previewInternal.indexOf('auth.admin.deleteUser(replacementUserId'),
    "replacement intent must persist before deleting the previous invitation identity");
  assert.match(previewInternal,/validatePreviewActivationLink/);
});

test("both onboarding migrations apply additively and Preview activation is transactionally serialized",async()=>{
  const production=new PGlite();
  await production.exec(`create schema auth; create table auth.users(id uuid primary key); create role anon;create role authenticated;create role service_role;
    create table public.organisation_introducers(id uuid primary key);
    create table public.organisation_introducer_agreements(id uuid primary key);
    create table public.introducer_agreement_acceptances(id uuid unique);
    insert into public.organisation_introducers values('${introId}');`);
  await production.exec(await readFile(new URL("../supabase/migrations/20261120130000_introducer_onboarding_admin.sql",import.meta.url),"utf8"));
  assert.equal((await production.query("select count(*)::int n from organisation_introducers")).rows[0].n,1);
  assert.equal((await production.query("select relrowsecurity from pg_class where oid='public.organisation_introducer_onboarding'::regclass")).rows[0].relrowsecurity,true);
  assert.equal((await production.query("select has_table_privilege('authenticated','public.organisation_introducer_onboarding','select') allowed")).rows[0].allowed,false);

  const preview=new PGlite();
  const userId="44444444-4444-4444-8444-444444444444";
  await preview.exec(`create schema auth;create table auth.users(id uuid primary key);create role anon;create role authenticated;create role service_role;
    create table public.professional_introducer_demo_access(id uuid primary key default gen_random_uuid(),user_id uuid not null,consultant_label text not null,granted_by uuid,created_at timestamptz not null default now(),expires_at timestamptz not null,revoked_at timestamptz,revoked_by uuid,demo_organisation_id uuid);
    alter table public.professional_introducer_demo_access enable row level security;
    insert into public.professional_introducer_demo_access(user_id,consultant_label,expires_at) values('${userId}','Existing test account','2026-12-01T00:00:00Z');
    insert into auth.users(id) values('${userId}');`);
  await preview.exec(await readFile(new URL("../supabase/migrations/20261120131000_pr70_preview_introducer_onboarding.sql",import.meta.url),"utf8"));
  assert.equal((await preview.query("select count(*)::int n from professional_introducer_demo_access")).rows[0].n,1);
  assert.equal((await preview.query("select relrowsecurity from pg_class where oid='public.professional_introducer_onboarding'::regclass")).rows[0].relrowsecurity,true);
  assert.equal((await preview.query("select has_table_privilege('anon','public.professional_introducer_onboarding','select') allowed")).rows[0].allowed,false);
  assert.equal((await preview.query("select has_function_privilege('authenticated','public.activate_professional_introducer_onboarding(uuid,uuid,text)','execute') allowed")).rows[0].allowed,false);
  assert.equal((await preview.query("select has_function_privilege('service_role','public.activate_professional_introducer_onboarding(uuid,uuid,text)','execute') allowed")).rows[0].allowed,true);
  assert.equal((await preview.query("select has_function_privilege('authenticated','public.confirm_professional_introducer_onboarding(uuid,uuid,uuid)','execute') allowed")).rows[0].allowed,false);
  assert.equal((await preview.query("select has_function_privilege('authenticated','public.revoke_professional_introducer_onboarding(uuid,uuid)','execute') allowed")).rows[0].allowed,false);

  const onboardingId="55555555-5555-4555-8555-555555555555";
  const requestId="66666666-6666-4666-8666-666666666666";
  await preview.query(`insert into professional_introducer_onboarding(id,commercial_introducer_id,activation_request_id,assertion_jti,signed_assertion,contact_email,contact_name,agreement_id,agreement_version,accepted_terms_hash,acceptance_id,accepted_at,user_id,state,activation_expires_at)
    values($1,$2,$3,$3,$4,'jane@example.test','Jane Introducer',$5,2,$6,$7,now(),$8,'sent',now()+interval '15 minutes')`,[onboardingId,introId,requestId,"a".repeat(128),agreementId,hash,acceptanceId,userId]);
  const first=await preview.query("select activate_professional_introducer_onboarding($1,$2,$3) id",[onboardingId,userId,"Jane Introducer"]);
  const second=await preview.query("select activate_professional_introducer_onboarding($1,$2,$3) id",[onboardingId,userId,"Jane Introducer"]);
  assert.equal(first.rows[0].id,second.rows[0].id);
  assert.ok((await preview.query("select revoked_at from professional_introducer_demo_access where id=$1",[first.rows[0].id])).rows[0].revoked_at,
    "grant must remain unusable until Root confirms the signed receipt");
  assert.equal((await preview.query("select confirm_professional_introducer_onboarding($1,$2,$3) ok",[onboardingId,userId,first.rows[0].id])).rows[0].ok,true);
  assert.equal((await preview.query("select revoked_at from professional_introducer_demo_access where id=$1",[first.rows[0].id])).rows[0].revoked_at,null);
  assert.equal((await preview.query("select state from professional_introducer_onboarding where id=$1",[onboardingId])).rows[0].state,"activated");
  assert.equal((await preview.query("select revoke_professional_introducer_onboarding($1,$2) ok",[onboardingId,introId])).rows[0].ok,true);
  assert.ok((await preview.query("select revoked_at from professional_introducer_demo_access where id=$1",[first.rows[0].id])).rows[0].revoked_at);
  assert.equal((await preview.query("select state from professional_introducer_onboarding where id=$1",[onboardingId])).rows[0].state,"revoked");
  await assert.rejects(()=>preview.query("select confirm_professional_introducer_onboarding($1,$2,$3)",[onboardingId,userId,first.rows[0].id]));
  assert.equal((await preview.query("select count(*)::int n from professional_introducer_demo_access where user_id=$1",[userId])).rows[0].n,2);
  assert.equal((await preview.query("select count(*)::int n from professional_introducer_demo_access where demo_organisation_id is null",[])).rows[0].n,2);
});

test("Root atomically consumes only a current archived agreement-bound Preview receipt",async()=>{
  const db=new PGlite();
  await db.exec(`create schema auth;create table auth.users(id uuid primary key);create role anon;create role authenticated;create role service_role;
    create table public.organisation_introducers(id uuid primary key,status text not null,agreement_start_date date,agreement_end_date date);
    create table public.organisation_introducer_agreements(id uuid primary key,introducer_id uuid,version int,status text,superseded_at timestamptz,accepted_at timestamptz,accepted_by uuid,terms_hash text,terms_snapshot jsonb,accepted_terms_snapshot jsonb);
    create table public.introducer_agreement_acceptances(id uuid unique,agreement_id uuid,accepted_at timestamptz,archive_state text,terms_hash text,evidence jsonb);
    insert into public.organisation_introducers values('${introId}','active',current_date-1,current_date+30);`);
  const sql=await readFile(new URL("../supabase/migrations/20261120130000_introducer_onboarding_admin.sql",import.meta.url),"utf8");
  await db.exec(sql);
  const onboardingId=randomUUID(),requestId=randomUUID(),previewUser=randomUUID(),previewGrant=randomUUID(),receiptJti=randomUUID();
  const acceptedAt=new Date().toISOString(), nonceHash="a".repeat(64), termsHashValue="b".repeat(64),receiptHash="c".repeat(64);
  const expiresAt=new Date(Date.now()+10*60*1000).toISOString(),grantExpiresAt=new Date(Date.now()+86400000).toISOString();
  const terms=JSON.stringify({contact_email:"jane@example.test",contact_name:"Jane Introducer"});
  await db.query(`insert into public.organisation_introducer_agreements
    (id,introducer_id,version,status,accepted_at,accepted_by,terms_hash,terms_snapshot,accepted_terms_snapshot)
    values($1,$2,2,'accepted',$3,$4,$5,$6::jsonb,$6::jsonb)`,[agreementId,introId,acceptedAt,acceptanceId,termsHashValue,terms]);
  await db.query(`insert into public.introducer_agreement_acceptances(id,agreement_id,accepted_at,archive_state,terms_hash,evidence)
    values($1,$2,$3,'archived',$4,$5::jsonb)`,[acceptanceId,agreementId,acceptedAt,termsHashValue,JSON.stringify({email:"jane@example.test",full_name:"Jane Introducer"})]);
  await db.query(`insert into public.organisation_introducer_onboarding
    (id,introducer_id,state,agreement_id,agreement_version,acceptance_id,recipient_email,accepted_terms_hash,accepted_at,activation_request_id,activation_nonce_hash,activation_expires_at)
    values($1,$2,'activation_sent',$3,2,$4,'jane@example.test',$5,$6,$7,$8,$9)`,[onboardingId,introId,agreementId,acceptanceId,termsHashValue,acceptedAt,requestId,nonceHash,expiresAt]);
  const args=[receiptJti,onboardingId,introId,requestId,nonceHash,agreementId,2,acceptanceId,acceptedAt,termsHashValue,"jane@example.test",previewUser,previewGrant,grantExpiresAt,receiptHash];
  assert.equal((await db.query(`select public.complete_professional_introducer_onboarding(${args.map((_,i)=>`$${i+1}`).join(",")}) ok`,args)).rows[0].ok,true);
  const row=(await db.query("select state,preview_user_id,preview_grant_id from public.organisation_introducer_onboarding where id=$1",[onboardingId])).rows[0];
  assert.deepEqual(row,{state:"activated",preview_user_id:previewUser,preview_grant_id:previewGrant});
  await assert.rejects(()=>db.query(`select public.complete_professional_introducer_onboarding(${args.map((_,i)=>`$${i+1}`).join(",")})`,args),/duplicate key|unique/i);
  const retry=[randomUUID(),...args.slice(1)];
  assert.equal((await db.query(`select public.complete_professional_introducer_onboarding(${retry.map((_,i)=>`$${i+1}`).join(",")}) ok`,retry)).rows[0].ok,true);
  const mismatch=[randomUUID(),...args.slice(1)];mismatch[11]=randomUUID();
  await assert.rejects(()=>db.query(`select public.complete_professional_introducer_onboarding(${mismatch.map((_,i)=>`$${i+1}`).join(",")})`,mismatch),/conflicts with completed access/i);
});

test("new onboarding SQL is additive and never applies or copies customer rows",async()=>{
  const fs=await import("node:fs/promises");
  const root=await fs.readFile(new URL("../supabase/migrations/20261120130000_introducer_onboarding_admin.sql",import.meta.url),"utf8");
  const demo=await fs.readFile(new URL("../supabase/migrations/20261120131000_pr70_preview_introducer_onboarding.sql",import.meta.url),"utf8");
  for(const sql of [root,demo]) assert.doesNotMatch(sql,/\b(drop\s+table|truncate\s|delete\s+from)\b/i);
  assert.match(root,/organisation_introducer_agreements/);assert.match(root,/introducer_agreement_acceptances/);
  assert.match(demo,/professional_introducer_demo_access/);assert.doesNotMatch(demo,/witkwlgldxjwwxmpcyva|SUPABASE_SERVICE_ROLE_KEY|service_role_key/);
});
