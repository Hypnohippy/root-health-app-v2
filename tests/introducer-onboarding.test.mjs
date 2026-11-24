import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { agreementTerms,termsHash } from "../lib/introducerGoogleAgreementTerms.js";
import { PR70_CATALOG_REQUIREMENTS, PR70_MIGRATION_TARGETS, validatePr70MigrationTarget } from "../lib/pr70MigrationGate.server.js";
import { INTRODUCER_PREVIEW_PROJECT_ID, INTRODUCER_PREVIEW_SUPABASE_REF, ROOT_COMMERCIAL_SUPABASE_REF, ROOT_COMMERCIAL_VERCEL_PROJECT_ID, activationRequestOriginAllowed, commercialOnboardingBridgeReady, demoAccessSummary, introducerActivationOrigin, introducerCustomerOrigin, introducerInternalTargetOrigin, openActivationLink,parseExactHttpsOrigins,replacementDisposition,sealActivationLink,signOnboardingAssertion,signPreviewActivationReceipt,validateCommercialCallbackUrl,validatePreviewActivationLink,validatePreviewDeployment,verifiedAcceptedAgreement,verifyOnboardingAssertion,verifyPreviewActivationReceipt } from "../lib/professionalIntroducerOnboarding.server.js";

const secret="test-only-onboarding-secret-that-is-not-a-production-credential";
const introId="11111111-1111-4111-8111-111111111111";
const agreementId="22222222-2222-4222-8222-222222222222";
const acceptanceId="33333333-3333-4333-8333-333333333333";
const northstarOrganisationId="7e700070-0070-4070-8070-000000000070";
const commercial={id:introId,name:"Jane Introducer",contact_name:"Jane Introducer",contact_email:"jane@example.test",introducer_market:"corporate",introducer_type:"corporate_introducer",referral_code:"jane",vat_registered:false,vat_number:null,agreement_start_date:"2026-11-01",agreement_end_date:null,status:"active"};
const policy={commission_percent:20,commission_basis:"collected_subscription_revenue",commission_structure:"one_off",effective_from:"2020-01-01T00:00:00.000Z",effective_until:null};
const evidence=agreementTerms(commercial,[policy],"None");
const hash=termsHash(evidence);
function acceptedState(overrides={}) {
  const acceptance={id:acceptanceId,accepted_at:"2026-11-19T10:00:00.000Z",evidence:{full_name:"Jane Introducer",email:"jane@example.test"},terms_snapshot:evidence,terms_hash:hash,archive_state:"archived"};
  const agreement={id:agreementId,version:2,status:"accepted",accepted_at:acceptance.accepted_at,sent_to:"jane@example.test",terms_snapshot:evidence,accepted_terms_snapshot:evidence,terms_hash:hash,acceptance};
  return {introducer:commercial,policies:[policy],agreements:[agreement],...overrides};
}

async function previewMigrationFixture({organisationId=northstarOrganisationId,name="Northstar Studio (fictional)",status="demo",mappedOrganisationId=organisationId,mappedGrantCount=1}={}) {
  const preview=new PGlite();
  const userId="44444444-4444-4444-8444-444444444444";
  const alternateOrganisationId=organisationId==="7e700070-0070-4070-8070-000000000071" ? "7e700070-0070-4070-8070-000000000072" : "7e700070-0070-4070-8070-000000000071";
  await preview.exec(`create schema auth;create table auth.users(id uuid primary key);create role anon;create role authenticated;create role service_role;
    create function public.professional_introducer_access_active() returns boolean language sql security invoker set search_path=pg_catalog as $$ select true $$;
    revoke all on function public.professional_introducer_access_active() from public,anon,authenticated,service_role;
    grant execute on function public.professional_introducer_access_active() to authenticated;
    create table public.organisations(id uuid primary key,name text not null,status text not null);
    create table public.professional_introducer_demo_access(id uuid primary key default gen_random_uuid(),user_id uuid not null,consultant_label text not null,granted_by uuid,created_at timestamptz not null default now(),expires_at timestamptz not null,revoked_at timestamptz,revoked_by uuid,demo_organisation_id uuid references public.organisations(id),check(expires_at>created_at and expires_at<=created_at+interval '30 days'));
    alter table public.professional_introducer_demo_access enable row level security;
    insert into public.organisations values('${organisationId}','${name.replaceAll("'","''")}','${status.replaceAll("'","''")}');
    insert into public.organisations values('${alternateOrganisationId}','Other fictional organisation','demo');
    grant select,insert,update on public.professional_introducer_demo_access to service_role;
    insert into public.professional_introducer_demo_access(user_id,consultant_label,expires_at,demo_organisation_id)
      select case when n=1 then '${userId}'::uuid else gen_random_uuid() end,'Existing test account','2026-12-01T00:00:00Z','${mappedOrganisationId}'
      from generate_series(1,${mappedGrantCount}) n;
    insert into auth.users(id) values('${userId}');`);
  return {preview,userId};
}

test("existing Root Demo Access status reflects only the latest verified agreement and lifecycle",()=>{
  const now=new Date("2026-11-21T12:00:00.000Z");
  const signed=demoAccessSummary(acceptedState(),null,now);
  assert.equal(signed.agreement.status,"signed_verified");
  assert.equal(signed.agreement.verified,true);
  assert.equal(signed.invitationStatus,"not_issued");
  assert.equal(signed.accountStatus,"awaiting_activation");
  const draft=acceptedState();draft.agreements[0].status="draft";
  assert.equal(demoAccessSummary(draft,null,now).agreement.status,"draft");
  const sent=acceptedState();sent.agreements[0].status="sent";
  assert.equal(demoAccessSummary(sent,null,now).agreement.status,"sent");
  const pendingArchive=acceptedState();pendingArchive.agreements[0].acceptance.archive_state="pending";
  assert.equal(demoAccessSummary(pendingArchive,null,now).agreement.status,"signed_archive_pending");
  const duplicateVersion=acceptedState();duplicateVersion.agreements.push({...duplicateVersion.agreements[0],id:randomUUID()});
  assert.equal(demoAccessSummary(duplicateVersion,null,now).agreement.status,"review_required");
  const futureInvite={state:"activation_sent",activation_expires_at:"2026-11-21T12:15:00.000Z"};
  assert.equal(demoAccessSummary(acceptedState(),futureInvite,now).invitationStatus,"sent");
  assert.equal(demoAccessSummary(acceptedState(),{...futureInvite,activation_expires_at:"2026-11-21T11:59:59.000Z"},now).invitationStatus,"expired");
  assert.equal(demoAccessSummary(acceptedState(),{state:"activated",preview_grant_expires_at:"2026-11-22T00:00:00.000Z"},now).accountStatus,"active");
  assert.equal(demoAccessSummary(acceptedState(),{state:"activated",preview_grant_expires_at:"2026-11-20T00:00:00.000Z"},now).accountStatus,"expired");
  assert.equal(demoAccessSummary(acceptedState(),{state:"activated"},now).accountStatus,"expired");
  assert.equal(demoAccessSummary(acceptedState(),{state:"revoked"},now).accountStatus,"revoked");
});

test("commercial Demo Access bridge fails closed outside the exact existing Root production deployment",()=>{
  const env={ROOT_INTRODUCER_ONBOARDING_ENABLED:"true",VERCEL_ENV:"production",VERCEL_PROJECT_ID:ROOT_COMMERCIAL_VERCEL_PROJECT_ID,
    VERCEL_GIT_COMMIT_REF:"main",ROOT_PRODUCTION_SUPABASE_PROJECT_REF:ROOT_COMMERCIAL_SUPABASE_REF,
    NEXT_PUBLIC_SUPABASE_URL:`https://${ROOT_COMMERCIAL_SUPABASE_REF}.supabase.co`,
    ROOT_INTRODUCER_ALLOWED_CALLBACK_ORIGINS:"https://www.roothealth.app,https://roothealth.app",
    ROOT_INTRODUCER_VERCEL_PROJECT_ID:INTRODUCER_PREVIEW_PROJECT_ID,
    ROOT_INTRODUCER_SUPABASE_PROJECT_REF:INTRODUCER_PREVIEW_SUPABASE_REF,
    ROOT_INTRODUCER_HANDOFF_MODE:"preview",
    ROOT_INTRODUCER_CUSTOMER_URL:"https://partners.roothealth.example",
    ROOT_INTRODUCER_CUSTOMER_ALLOWED_ORIGINS:"https://partners.roothealth.example",
    ROOT_AUTH_PREVIEW_URL:"https://root-health-introducer-demo-preview.vercel.app",
    ROOT_INTRODUCER_PREVIEW_ALLOWED_ORIGINS:"https://root-health-introducer-demo-preview.vercel.app"};
  assert.equal(commercialOnboardingBridgeReady(env),true);
  const previewOnly={...env};delete previewOnly.ROOT_INTRODUCER_CUSTOMER_URL;delete previewOnly.ROOT_INTRODUCER_CUSTOMER_ALLOWED_ORIGINS;
  assert.equal(commercialOnboardingBridgeReady(previewOnly),true,"internal Preview operation must not depend on customer-domain configuration");
  assert.equal(commercialOnboardingBridgeReady({...previewOnly,ROOT_INTRODUCER_HANDOFF_MODE:"customer"}),false);
  for(const mutate of [e=>delete e.ROOT_INTRODUCER_ONBOARDING_ENABLED,e=>e.ROOT_INTRODUCER_ONBOARDING_ENABLED="false",
    e=>e.VERCEL_ENV="preview",e=>e.VERCEL_PROJECT_ID="prj_5FntyaVgI1tQ7Q3IMKfkSTb2ETut",e=>e.VERCEL_GIT_COMMIT_REF="codex/professional-introducer-demo",
    e=>e.ROOT_PRODUCTION_SUPABASE_PROJECT_REF=INTRODUCER_PREVIEW_SUPABASE_REF,e=>e.NEXT_PUBLIC_SUPABASE_URL=`https://${INTRODUCER_PREVIEW_SUPABASE_REF}.supabase.co`,
    e=>e.ROOT_INTRODUCER_ALLOWED_CALLBACK_ORIGINS="https://root-health-introducer-demo-test.vercel.app",
    e=>{e.ROOT_INTRODUCER_HANDOFF_MODE="customer";e.ROOT_INTRODUCER_CUSTOMER_URL="https://roothealth.app";},
    e=>{e.ROOT_INTRODUCER_HANDOFF_MODE="customer";e.ROOT_INTRODUCER_CUSTOMER_ALLOWED_ORIGINS="https://elsewhere.example";}]){
    const bad={...env};mutate(bad);assert.equal(commercialOnboardingBridgeReady(bad),false);
  }
});

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
  const customer="https://partners.roothealth.example";
  const customerActivation=activation.replace(encodeURIComponent("https://root-health-introducer-demo-abcd.vercel.app"),encodeURIComponent(customer));
  assert.equal(validatePreviewActivationLink(customerActivation,{previewOrigin:"https://root-health-introducer-demo-abcd.vercel.app",activationOrigin:customer,previewSupabaseRef:INTRODUCER_PREVIEW_SUPABASE_REF}),true);
  assert.equal(validatePreviewActivationLink(customerActivation,{previewOrigin:"https://root-health-introducer-demo-abcd.vercel.app",activationOrigin:"https://evil.example",previewSupabaseRef:INTRODUCER_PREVIEW_SUPABASE_REF}),false);
  assert.equal(validatePreviewActivationLink(activation.replace("waluyphoafylzcjuskcl","otherproject"),{previewOrigin:"https://root-health-introducer-demo-abcd.vercel.app",previewSupabaseRef:INTRODUCER_PREVIEW_SUPABASE_REF}),false);
  assert.equal(validatePreviewActivationLink(activation.replace("type=invite","type=recovery"),{previewOrigin:"https://root-health-introducer-demo-abcd.vercel.app",previewSupabaseRef:INTRODUCER_PREVIEW_SUPABASE_REF}),false);
  assert.equal(validatePreviewActivationLink(activation.replace("%252Fintroducer","%252Fadmin"),{previewOrigin:"https://root-health-introducer-demo-abcd.vercel.app",previewSupabaseRef:INTRODUCER_PREVIEW_SUPABASE_REF}),false);
});

test("customer activation origin is exact, custom-domain-only, and separately pinned from Preview",()=>{
  const env={ROOT_INTRODUCER_CUSTOMER_URL:"https://partners.roothealth.example",
    ROOT_INTRODUCER_CUSTOMER_ALLOWED_ORIGINS:"https://partners.roothealth.example"};
  assert.equal(introducerCustomerOrigin(env),"https://partners.roothealth.example");
  for(const bad of [
    {...env,ROOT_INTRODUCER_CUSTOMER_URL:"https://www.roothealth.app"},
    {...env,ROOT_INTRODUCER_CUSTOMER_URL:"https://root-health-introducer-demo-abc.vercel.app"},
    {...env,ROOT_INTRODUCER_CUSTOMER_URL:"http://partners.roothealth.example"},
    {...env,ROOT_INTRODUCER_CUSTOMER_URL:"https://partners.roothealth.example/path"},
    {...env,ROOT_INTRODUCER_CUSTOMER_ALLOWED_ORIGINS:"https://partners.roothealth.example,https://evil.example"},
    {...env,ROOT_INTRODUCER_CUSTOMER_URL:"https://evil.example"},
  ]) assert.throws(()=>introducerCustomerOrigin(bad));
});

test("Root handoff has explicit protected Preview and dedicated-customer modes with exact project identity",()=>{
  const preview={ROOT_INTRODUCER_HANDOFF_MODE:"preview",ROOT_AUTH_PREVIEW_URL:"https://root-health-introducer-demo-preview.vercel.app",
    ROOT_INTRODUCER_PREVIEW_ALLOWED_ORIGINS:"https://root-health-introducer-demo-preview.vercel.app",
    ROOT_INTRODUCER_VERCEL_PROJECT_ID:INTRODUCER_PREVIEW_PROJECT_ID,ROOT_INTRODUCER_SUPABASE_PROJECT_REF:INTRODUCER_PREVIEW_SUPABASE_REF,
    ROOT_INTRODUCER_CUSTOMER_URL:"https://partners.roothealth.example",ROOT_INTRODUCER_CUSTOMER_ALLOWED_ORIGINS:"https://partners.roothealth.example"};
  assert.equal(introducerInternalTargetOrigin(preview),"https://root-health-introducer-demo-preview.vercel.app");
  const customerMode={...preview,ROOT_INTRODUCER_HANDOFF_MODE:"customer"};
  assert.equal(introducerInternalTargetOrigin(customerMode),"https://root-health-introducer-demo-preview.vercel.app");
  assert.equal(introducerActivationOrigin(customerMode),"https://partners.roothealth.example");
  for(const bad of [
    {...preview,ROOT_INTRODUCER_HANDOFF_MODE:""},
    {...preview,ROOT_INTRODUCER_VERCEL_PROJECT_ID:"prj_XRyykP2byrJeHZ5hkI3QpGOjF2oO"},
    {...preview,ROOT_INTRODUCER_SUPABASE_PROJECT_REF:"witkwlgldxjwwxmpcyva"},
    {...preview,ROOT_AUTH_PREVIEW_URL:"https://other.vercel.app"},
  ]) assert.throws(()=>introducerInternalTargetOrigin(bad));
  assert.throws(()=>introducerActivationOrigin({...customerMode,ROOT_INTRODUCER_CUSTOMER_URL:"https://www.roothealth.app"}));
});

test("activation completion accepts only the exact signed Preview or customer origin",()=>{
  const previewOrigin="https://root-health-introducer-demo-preview.vercel.app";
  const customerOrigin="https://partners.roothealth.example";
  const previewAllowedOrigins=new Set([previewOrigin]);
  assert.equal(activationRequestOriginAllowed({requestOrigin:previewOrigin,signedActivationOrigin:previewOrigin,previewOrigin,previewAllowedOrigins,customerOrigin}),true);
  assert.equal(activationRequestOriginAllowed({requestOrigin:customerOrigin,signedActivationOrigin:customerOrigin,previewOrigin,previewAllowedOrigins,customerOrigin}),true);
  assert.equal(activationRequestOriginAllowed({requestOrigin:customerOrigin,signedActivationOrigin:previewOrigin,previewOrigin,previewAllowedOrigins,customerOrigin}),false);
  assert.equal(activationRequestOriginAllowed({requestOrigin:"https://evil.example",signedActivationOrigin:"https://evil.example",previewOrigin,previewAllowedOrigins,customerOrigin}),false);
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

function catalogEvidenceFor(target){
  const key=target==="root-commercial"?"rootCommercial":target;
  const requirements=PR70_CATALOG_REQUIREMENTS[key];
  const tables=Object.fromEntries(Object.entries(requirements.tables).map(([name,item])=>[name,{
    columns:[...item.columns],rlsEnabled:item.rlsEnabled===true,serviceRolePrivileges:[...(item.serviceRolePrivileges||[])],
    clientPrivileges:Object.fromEntries(Object.entries(item.clientPrivileges||{}).map(([role,values])=>[role,[...values]])),
  }]));
  const functions=Object.fromEntries(Object.entries(requirements.functions || {}).map(([name,value])=>[name,{
    ...value,executableBy:[...value.executableBy],deniedTo:[...value.deniedTo],
  }]));
  const installed={presentTables:Object.keys(requirements.tables).filter(name=>name.includes("introducer_onboarding")),
    presentFunctions:[...requirements.presentFunctions],presentColumns:[...(requirements.presentColumns || [])],functions};
  if(key==="rootCommercial") return {
    ...installed,
    projectRef:PR70_MIGRATION_TARGETS.rootCommercial.supabaseRef,tables,
    clientSelectDenied:[...requirements.clientSelectDenied],constraints:[...requirements.constraints],
  };
  return {
    ...installed,
    projectRef:PR70_MIGRATION_TARGETS.preview.supabaseRef,tables,
    constraints:[...requirements.constraints],
    policies:Object.fromEntries(Object.entries(requirements.policies).map(([name,value])=>[name,{...value}])),
    preservedFixtures:{...requirements.preservedFixtures},existingCommercialIdentityValuesUnique:true,
    mappedGrantOrganisationIsNorthstar:true,
  };
}

function validateGate(args){
  const key=args.target==="root-commercial"?"rootCommercial":args.target;
  return validatePr70MigrationTarget({...args,migrationLedger:args.migrationLedger || PR70_MIGRATION_TARGETS[key].requiredLedger});
}

test("project-specific migration gate accepts the verified ledgers only with complete schema and security evidence",()=>{
  const preview=PR70_MIGRATION_TARGETS.preview;
  const previewEvidence=catalogEvidenceFor("preview");
  assert.equal(validateGate({target:"preview",...preview,projectRef:preview.supabaseRef,vercelProjectId:preview.vercelProjectId,
    migrationHistory:[...preview.requiredHistory],schemaEvidence:previewEvidence}).ready,true);
  const badPreviewEvidence=[
    {...previewEvidence,projectRef:"witkwlgldxjwwxmpcyva"},
    {...previewEvidence,tables:{...previewEvidence.tables,"public.professional_introducer_demo_access":{...previewEvidence.tables["public.professional_introducer_demo_access"],rlsEnabled:false}}},
    {...previewEvidence,functions:{...previewEvidence.functions,"public.professional_introducer_access_active()":{...previewEvidence.functions["public.professional_introducer_access_active()"],securityDefiner:true}}},
    {...previewEvidence,functions:{...previewEvidence.functions,"public.professional_introducer_access_active()":{...previewEvidence.functions["public.professional_introducer_access_active()"],deniedTo:["public"]}}},
    {...previewEvidence,functions:{...previewEvidence.functions,"public.professional_introducer_access_active()":{...previewEvidence.functions["public.professional_introducer_access_active()"],executableBy:["authenticated","service_role"]}}},
    {...previewEvidence,policies:{...previewEvidence.policies,assessment_insert_self:{ownerScoped:false,activeGrantRequired:true}}},
    {...previewEvidence,preservedFixtures:{...previewEvidence.preservedFixtures,fictionalAssessments:54}},
    {...previewEvidence,mappedGrantOrganisationIsNorthstar:false},
    {...previewEvidence,constraints:previewEvidence.constraints.filter(name=>name!=="professional_introducer_demo_access.demo_organisation_id.foreign_key")},
    {...previewEvidence,presentTables:previewEvidence.presentTables.filter(name=>name!=="public.professional_introducer_onboarding")},
    {...previewEvidence,presentFunctions:previewEvidence.presentFunctions.filter(name=>!name.includes("activate_professional_introducer_onboarding"))},
    {...previewEvidence,tables:{...previewEvidence.tables,"public.professional_introducer_demo_access":{...previewEvidence.tables["public.professional_introducer_demo_access"],serviceRolePrivileges:["SELECT"]}}},
    {...previewEvidence,tables:{...previewEvidence.tables,"public.professional_introducer_onboarding":{...previewEvidence.tables["public.professional_introducer_onboarding"],clientPrivileges:{anon:[],authenticated:["SELECT"]}}}},
  ];
  for(const schemaEvidence of badPreviewEvidence) assert.throws(()=>validateGate({target:"preview",...preview,
    projectRef:preview.supabaseRef,vercelProjectId:preview.vercelProjectId,migrationHistory:[...preview.requiredHistory],schemaEvidence}));
  for(const bad of [
    {projectRef:"witkwlgldxjwwxmpcyva"},
    {vercelProjectId:"prj_XRyykP2byrJeHZ5hkI3QpGOjF2oO"},
    {migration:"20261120130000_introducer_onboarding_admin.sql"},
    {migrationHistory:[...preview.requiredHistory,"20261121130000"]},
    {migrationHistory:["20261118150000","20261118153000"]},
    {migrationLedger:[...preview.requiredLedger.slice(0,2),{version:"20261121102218",name:"20261121130000_pr70_preview_introducer_onboarding.sql"}]},
    {migrationLedger:[]},
    {schemaEvidence:undefined},
  ]) assert.throws(()=>validateGate({target:"preview",...preview,projectRef:preview.supabaseRef,
    vercelProjectId:preview.vercelProjectId,migrationHistory:[...preview.requiredHistory],schemaEvidence:previewEvidence,...bad}));

  const root=PR70_MIGRATION_TARGETS.rootCommercial;
  const rootEvidence=catalogEvidenceFor("root-commercial");
  assert.equal(validateGate({target:"root-commercial",...root,projectRef:root.supabaseRef,vercelProjectId:root.vercelProjectId,
    migrationHistory:[...root.requiredHistory],schemaEvidence:rootEvidence}).ready,true);
  const badRootEvidence=[
    {...rootEvidence,projectRef:INTRODUCER_PREVIEW_SUPABASE_REF},
    {...rootEvidence,clientSelectDenied:rootEvidence.clientSelectDenied.filter(name=>name!=="public.introducer_agreement_acceptances")},
    {...rootEvidence,constraints:rootEvidence.constraints.filter(name=>name!=="introducer_agreement_acceptances.archive_state.check")},
    {...rootEvidence,presentTables:rootEvidence.presentTables.filter(name=>name!=="public.organisation_introducer_onboarding_events")},
    {...rootEvidence,presentColumns:rootEvidence.presentColumns.filter(name=>name!=="public.organisation_introducers.archived_at")},
    {...rootEvidence,presentFunctions:rootEvidence.presentFunctions.filter(name=>name!=="public.remove_test_organisation_introducer(uuid,uuid)")},
    {...rootEvidence,tables:{...rootEvidence.tables,"public.organisation_introducers":{...rootEvidence.tables["public.organisation_introducers"],serviceRolePrivileges:["SELECT"]}}},
    {...rootEvidence,tables:{...rootEvidence.tables,"public.organisation_introducer_onboarding":{...rootEvidence.tables["public.organisation_introducer_onboarding"],clientPrivileges:{anon:[],authenticated:["SELECT"]}}}},
  ];
  for(const schemaEvidence of badRootEvidence) assert.throws(()=>validateGate({target:"root-commercial",...root,
    projectRef:root.supabaseRef,vercelProjectId:root.vercelProjectId,migrationHistory:[...root.requiredHistory],schemaEvidence}));
  const excessRootAcl={...rootEvidence,tables:{...rootEvidence.tables,"public.organisation_introducers":{
    ...rootEvidence.tables["public.organisation_introducers"],serviceRolePrivileges:["SELECT","UPDATE","TRUNCATE","REFERENCES","TRIGGER","MAINTAIN"],
  }}};
  assert.throws(()=>validateGate({target:"root-commercial",...root,projectRef:root.supabaseRef,vercelProjectId:root.vercelProjectId,
    migrationHistory:[...root.requiredHistory],schemaEvidence:excessRootAcl}),/exact reviewed ACL/);
  const excessPreviewAcl={...previewEvidence,tables:{...previewEvidence.tables,"public.professional_introducer_demo_access":{
    ...previewEvidence.tables["public.professional_introducer_demo_access"],serviceRolePrivileges:["SELECT","INSERT","UPDATE","TRUNCATE","REFERENCES","TRIGGER","MAINTAIN"],
  }}};
  assert.throws(()=>validateGate({target:"preview",...preview,projectRef:preview.supabaseRef,vercelProjectId:preview.vercelProjectId,
    migrationHistory:[...preview.requiredHistory],schemaEvidence:excessPreviewAcl}),/exact reviewed ACL/);
  assert.throws(()=>validateGate({target:"root-commercial",...root,projectRef:INTRODUCER_PREVIEW_SUPABASE_REF,
    vercelProjectId:INTRODUCER_PREVIEW_PROJECT_ID,migrationHistory:[...root.requiredHistory],schemaEvidence:rootEvidence}));
  assert.throws(()=>validateGate({target:"root-commercial",...root,projectRef:root.supabaseRef,
    vercelProjectId:root.vercelProjectId,migrationHistory:["20261004","20261005","20261006"],schemaEvidence:rootEvidence}));
  assert.throws(()=>validateGate({target:"preview",...preview,projectRef:preview.supabaseRef,vercelProjectId:preview.vercelProjectId,
    migrationHistory:[...preview.requiredHistory,...preview.requiredHistory],schemaEvidence:previewEvidence}));
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
  assert.match(ui,/Send Demo Invitation/);assert.match(ui,/agreement\?\.verified/);assert.match(ui,/agreementLabels/);assert.match(ui,/invitationLabels|inviteLabels/);assert.match(ui,/Revoke demo access/);
  assert.doesNotMatch(ui,/actionLink|SUPABASE_SERVICE_ROLE|ROOT_INTRODUCER_ONBOARDING_SHARED_SECRET/);
  const registration=await fs.readFile(new URL("../app/api/admin/introducers/route.js",import.meta.url),"utf8");
  const post=registration.slice(registration.indexOf("export async function POST"),registration.indexOf("export async function PATCH"));
  assert.match(post,/organisation_introducer_onboarding/);assert.doesNotMatch(post,/generateLink|sendEmail|introducerActivationMailer/);
  const preview=await fs.readFile(new URL("../app/api/internal/introducer-onboarding/route.js",import.meta.url),"utf8");
  assert.match(preview,/isIntroducerDeployment\(\)/);assert.match(preview,/generateLink\(\{type:"invite"/);assert.match(preview,/sealActivationLink/);
  assert.match(preview,/if\(error\) throw/);
  const rootRoute=await fs.readFile(new URL("../app/api/admin/introducers/onboarding/route.js",import.meta.url),"utf8");
  assert.match(rootRoute,/commercialOnboardingBridgeReady\(\)/);
  assert.match(rootRoute,/demoAccessSummary\(agreementState,row\)/);
  assert.doesNotMatch(rootRoute,/ROOT_INTRODUCER_STAGING_MODE|isolatedRootStagingReady/);
  assert.match(rootRoute,/sendIntroducerActivation/);
  const handoff=await fs.readFile(new URL("../lib/introducerActivationHandoff.server.js",import.meta.url),"utf8");
  assert.match(handoff,/x-vercel-oidc-token/);assert.match(handoff,/x-vercel-trusted-oidc-idp-token/);
  assert.doesNotMatch(handoff,/x-vercel-protection-bypass|VERCEL_AUTOMATION_BYPASS_SECRET/);
  const rootVerification=rootRoute.slice(rootRoute.indexOf("export async function PUT"));
  assert.match(rootVerification,/verifyPreviewActivationReceipt/);
  assert.match(rootVerification,/complete_professional_introducer_onboarding/);
  assert.doesNotMatch(rootVerification,/auth\.admin\.getUserById\(body\.userId\)|body\.userId/,
    "Preview Auth identifiers must never be resolved through Root Auth");
  assert.match(handoff,/validatePreviewActivationLink/);
  assert.match(handoff,/introducerInternalTargetOrigin/);
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
  await production.exec(`create schema auth; create table auth.users(id uuid primary key); create role anon;create role authenticated;create role service_role bypassrls;
    create table public.organisation_introducers(id uuid primary key,name text not null,notes text,status text not null,agreement_start_date date,agreement_end_date date);
    create table public.organisation_introducer_policies(id uuid primary key default gen_random_uuid(),introducer_id uuid not null);
    create table public.organisation_applications(id uuid primary key,introducer_id uuid);
    create table public.organisation_commissions(id uuid primary key,introducer_id uuid);
    create table public.organisation_commercial_documents(id uuid primary key,introducer_id uuid);
    create table public.personal_referral_attributions(id uuid primary key,introducer_id uuid);
    create table public.organisation_introducer_campaigns(id uuid primary key,introducer_id uuid);
    create table public.introducer_google_agreement_operations(id uuid primary key,introducer_id uuid);
    create table public.organisation_introducer_agreements(id uuid primary key,introducer_id uuid,version integer,status text,superseded_at timestamptz,accepted_at timestamptz,accepted_by uuid,terms_hash text,terms_snapshot jsonb,accepted_terms_snapshot jsonb);
    create table public.introducer_agreement_acceptances(id uuid unique,agreement_id uuid,accepted_at timestamptz,archive_state text,terms_hash text,evidence jsonb);
    alter table public.organisation_introducer_agreements enable row level security;
    alter table public.introducer_agreement_acceptances enable row level security;
    grant select,update on public.organisation_introducers to service_role;
    grant select on public.organisation_introducer_agreements,public.introducer_agreement_acceptances to service_role;
    insert into auth.users values('88888888-8888-4888-8888-888888888888');
    insert into public.organisation_introducers(id,name,notes,status,agreement_start_date,agreement_end_date) values('${introId}','Existing Root test','', 'active',current_date-1,current_date+30);`);
  await production.exec(await readFile(new URL("../supabase/migrations/20261120130000_introducer_onboarding_admin.sql",import.meta.url),"utf8"));
  assert.equal((await production.query("select count(*)::int n from organisation_introducers")).rows[0].n,1);
  assert.equal((await production.query("select relrowsecurity from pg_class where oid='public.organisation_introducer_onboarding'::regclass")).rows[0].relrowsecurity,true);
  assert.equal((await production.query("select has_table_privilege('authenticated','public.organisation_introducer_onboarding','select') allowed")).rows[0].allowed,false);
  assert.equal((await production.query("select relrowsecurity from pg_class where oid='public.organisation_introducer_lifecycle_events'::regclass")).rows[0].relrowsecurity,true);
  assert.equal((await production.query("select has_table_privilege('anon','public.organisation_introducer_lifecycle_events','select') allowed")).rows[0].allowed,false);
  assert.equal((await production.query("select has_function_privilege('service_role','public.remove_test_organisation_introducer(uuid,uuid)','execute') allowed")).rows[0].allowed,true);
  assert.equal((await production.query("select has_function_privilege('authenticated','public.remove_test_organisation_introducer(uuid,uuid)','execute') allowed")).rows[0].allowed,false);
  assert.deepEqual((await production.query("select attname from pg_attribute where attrelid='public.organisation_introducers'::regclass and attname like 'archive_%' and not attisdropped order by attname")).rows.map(row=>row.attname),
    ["archive_previous_status","archive_requested_at","archived_at","archived_by"]);
  const testRecordId="99999999-9999-4999-8999-999999999999";
  await production.query("insert into organisation_introducers(id,name,notes,status) values($1,'Unused test','[TEST RECORD] unused','inactive')",[testRecordId]);
  await production.query("insert into organisation_introducer_policies(introducer_id) values($1)",[testRecordId]);
  await production.exec("select set_config('request.jwt.claim.role','service_role',false)");
  assert.equal((await production.query("select public.remove_test_organisation_introducer($1,$2) ok",[testRecordId,"88888888-8888-4888-8888-888888888888"])).rows[0].ok,true);
  assert.equal((await production.query("select count(*)::int n from organisation_introducer_policies where introducer_id=$1",[testRecordId])).rows[0].n,0);
  assert.equal((await production.query("select count(*)::int n from organisation_introducers where id=$1",[testRecordId])).rows[0].n,0);
  assert.equal((await production.query("select count(*)::int n from organisation_introducer_lifecycle_events where introducer_ref=$1 and event_type='removed'",[testRecordId])).rows[0].n,1);
  await production.exec("select set_config('request.jwt.claim.role','anon',false)");
  const deniedId="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  await production.query("insert into organisation_introducers(id,name,notes,status) values($1,'Denied test','[TEST RECORD] denied','inactive')",[deniedId]);
  await assert.rejects(()=>production.query("select public.remove_test_organisation_introducer($1,$2)",[deniedId,"88888888-8888-4888-8888-888888888888"]),/service_role is required/);
  await production.exec("select set_config('request.jwt.claim.role','service_role',false)");

  const blockedId="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  await production.query("insert into organisation_introducers(id,name,notes,status) values($1,'Dependent test','[TEST RECORD] dependent','inactive')",[blockedId]);
  await production.query("insert into organisation_introducer_policies(introducer_id) values($1)",[blockedId]);
  await production.query("insert into organisation_commissions(id,introducer_id) values(gen_random_uuid(),$1)",[blockedId]);
  await assert.rejects(()=>production.query("select public.remove_test_organisation_introducer($1,$2)",[blockedId,"88888888-8888-4888-8888-888888888888"]),/Related legal, referral, financial/);
  assert.equal((await production.query("select count(*)::int n from organisation_introducer_policies where introducer_id=$1",[blockedId])).rows[0].n,1,
    "a failed transactional removal must preserve policy rows");

  const {preview,userId}=await previewMigrationFixture();
  await preview.exec(await readFile(new URL("../supabase/migrations/20261121130000_pr70_preview_introducer_onboarding.sql",import.meta.url),"utf8"));
  assert.deepEqual((await preview.query("select o.id,o.name,o.status,count(g.id)::int as mappings from organisations o join professional_introducer_demo_access g on g.demo_organisation_id=o.id group by o.id,o.name,o.status")).rows,
    [{id:northstarOrganisationId,name:"Northstar Studio (fictional)",status:"demo",mappings:1}],
    "the existing fictional organisation and its one access mapping must be preserved");
  assert.equal((await preview.query("select count(*)::int n from professional_introducer_demo_access")).rows[0].n,1);
  assert.equal((await preview.query("select relrowsecurity from pg_class where oid='public.professional_introducer_onboarding'::regclass")).rows[0].relrowsecurity,true);
  assert.equal((await preview.query("select has_table_privilege('anon','public.professional_introducer_onboarding','select') allowed")).rows[0].allowed,false);
  assert.equal((await preview.query("select has_function_privilege('authenticated','public.activate_professional_introducer_onboarding(uuid,uuid,text)','execute') allowed")).rows[0].allowed,false);
  assert.equal((await preview.query("select has_function_privilege('service_role','public.activate_professional_introducer_onboarding(uuid,uuid,text)','execute') allowed")).rows[0].allowed,true);
  assert.equal((await preview.query("select has_function_privilege('authenticated','public.confirm_professional_introducer_onboarding(uuid,uuid,uuid)','execute') allowed")).rows[0].allowed,false);
  assert.equal((await preview.query("select has_function_privilege('authenticated','public.revoke_professional_introducer_onboarding(uuid,uuid)','execute') allowed")).rows[0].allowed,false);
  assert.equal((await preview.query("select has_function_privilege('authenticated','public.professional_introducer_access_active()','execute') allowed")).rows[0].allowed,true);
  assert.equal((await preview.query("select has_function_privilege('anon','public.professional_introducer_access_active()','execute') allowed")).rows[0].allowed,false);
  assert.equal((await preview.query("select has_function_privilege('service_role','public.professional_introducer_access_active()','execute') allowed")).rows[0].allowed,false);

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
  assert.equal((await preview.query("select count(*)::int n from professional_introducer_demo_access where demo_organisation_id=$1",[northstarOrganisationId])).rows[0].n,2);
});

test("Preview onboarding migration rejects any Northstar identity or access-mapping mismatch",async()=>{
  const migration=await readFile(new URL("../supabase/migrations/20261121130000_pr70_preview_introducer_onboarding.sql",import.meta.url),"utf8");
  for(const fixture of [
    {organisationId:"7e700070-0070-4070-8070-000000000071"},
    {name:"Northstar Studio"},
    {status:"active"},
    {mappedOrganisationId:"7e700070-0070-4070-8070-000000000071"},
    {mappedGrantCount:0},
    {mappedGrantCount:2},
  ]){
    const {preview}=await previewMigrationFixture(fixture);
    await assert.rejects(()=>preview.exec(migration),/verified fictional Northstar Studio demo fixture/,
      `must reject fixture ${JSON.stringify(fixture)}`);
  }
});

test("Root atomically consumes only a current archived agreement-bound Preview receipt",async()=>{
  const db=new PGlite();
  await db.exec(`create schema auth;create table auth.users(id uuid primary key);create role anon;create role authenticated;create role service_role bypassrls;
    create table public.organisation_introducers(id uuid primary key,name text not null,notes text,status text not null,agreement_start_date date,agreement_end_date date);
    create table public.organisation_introducer_policies(id uuid primary key default gen_random_uuid(),introducer_id uuid not null);
    create table public.organisation_applications(id uuid primary key,introducer_id uuid);
    create table public.organisation_commissions(id uuid primary key,introducer_id uuid);
    create table public.organisation_commercial_documents(id uuid primary key,introducer_id uuid);
    create table public.personal_referral_attributions(id uuid primary key,introducer_id uuid);
    create table public.organisation_introducer_campaigns(id uuid primary key,introducer_id uuid);
    create table public.introducer_google_agreement_operations(id uuid primary key,introducer_id uuid);
    create table public.organisation_introducer_agreements(id uuid primary key,introducer_id uuid,version int,status text,superseded_at timestamptz,accepted_at timestamptz,accepted_by uuid,terms_hash text,terms_snapshot jsonb,accepted_terms_snapshot jsonb);
    create table public.introducer_agreement_acceptances(id uuid unique,agreement_id uuid,accepted_at timestamptz,archive_state text,terms_hash text,evidence jsonb);
    alter table public.organisation_introducer_agreements enable row level security;
    alter table public.introducer_agreement_acceptances enable row level security;
    grant select,update on public.organisation_introducers to service_role;
    grant select on public.organisation_introducer_agreements,public.introducer_agreement_acceptances to service_role;
    insert into public.organisation_introducers(id,name,notes,status,agreement_start_date,agreement_end_date) values('${introId}','Jane','', 'active',current_date-1,current_date+30);`);
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
  await db.exec("set role service_role");
  const args=[receiptJti,onboardingId,introId,requestId,nonceHash,agreementId,2,acceptanceId,acceptedAt,termsHashValue,"jane@example.test",previewUser,previewGrant,grantExpiresAt,receiptHash];
  assert.equal((await db.query(`select public.complete_professional_introducer_onboarding(${args.map((_,i)=>`$${i+1}`).join(",")}) ok`,args)).rows[0].ok,true);
  const row=(await db.query("select state,preview_user_id,preview_grant_id from public.organisation_introducer_onboarding where id=$1",[onboardingId])).rows[0];
  assert.deepEqual(row,{state:"activated",preview_user_id:previewUser,preview_grant_id:previewGrant});
  await assert.rejects(()=>db.query(`select public.complete_professional_introducer_onboarding(${args.map((_,i)=>`$${i+1}`).join(",")})`,args),/duplicate key|unique/i);
  const retry=[randomUUID(),...args.slice(1)];
  assert.equal((await db.query(`select public.complete_professional_introducer_onboarding(${retry.map((_,i)=>`$${i+1}`).join(",")}) ok`,retry)).rows[0].ok,true);
  const mismatch=[randomUUID(),...args.slice(1)];mismatch[11]=randomUUID();
  await assert.rejects(()=>db.query(`select public.complete_professional_introducer_onboarding(${mismatch.map((_,i)=>`$${i+1}`).join(",")})`,mismatch),/conflicts with completed access/i);
  await db.exec("reset role");
});

test("new onboarding SQL is additive and never applies or copies customer rows",async()=>{
  const fs=await import("node:fs/promises");
  const root=await fs.readFile(new URL("../supabase/migrations/20261120130000_introducer_onboarding_admin.sql",import.meta.url),"utf8");
  const demo=await fs.readFile(new URL("../supabase/migrations/20261121130000_pr70_preview_introducer_onboarding.sql",import.meta.url),"utf8");
  assert.doesNotMatch(root,/\b(drop\s+table|truncate\s)\b/i);
  assert.match(root,/delete from public\.organisation_introducer_policies where introducer_id=p_introducer_id/);
  assert.match(root,/delete from public\.organisation_introducers where id=p_introducer_id/);
  assert.match(root,/organisation_commissions where introducer_id=p_introducer_id/);
  assert.doesNotMatch(demo,/\b(drop\s+table|truncate\s|delete\s+from)\b/i);
  assert.match(root,/organisation_introducer_agreements/);assert.match(root,/introducer_agreement_acceptances/);
  assert.match(demo,/professional_introducer_demo_access/);assert.doesNotMatch(demo,/witkwlgldxjwwxmpcyva|SUPABASE_SERVICE_ROLE_KEY|service_role_key/);
});
