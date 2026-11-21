import { randomBytes, randomUUID, createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { rootAgreementAccess, loadAgreementState, queryResult } from "../../../../../lib/introducerGoogleAgreementServer.js";
import { INTRODUCER_PREVIEW_PROJECT_ID, INTRODUCER_PREVIEW_SUPABASE_REF, commercialOnboardingBridgeReady, demoAccessSummary, parseExactHttpsOrigins, validateCommercialCallbackUrl, validatePreviewActivationLink, verifiedAcceptedAgreement, signOnboardingAssertion, verifyOnboardingAssertion, verifyPreviewActivationReceipt } from "../../../../../lib/professionalIntroducerOnboarding.server.js";
import { introducerActivationMailer } from "../../../../../lib/introducerAgreementEmail.js";
import { isIntroducerDeployment } from "../../../../../lib/introducerRestrictedActions.server.js";
import { getSupabaseServerKeyIfConfigured } from "../../../../../lib/supabaseServerKey.server.js";
import { createSupabaseKeyCompatibleClient } from "../../../../../lib/supabaseKeyCompatibleClient.js";

export const runtime = "nodejs";
const reply = (body, status=200) => NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});
const uuid = value => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || "");
const sameInstant = (left,right) => Number.isFinite(Date.parse(left || "")) && Date.parse(left)===Date.parse(right || "");

function previewInternalUrl(env=process.env) {
  const raw=String(env.ROOT_AUTH_PREVIEW_URL || "").trim();
  let url;
  try { url=new URL(raw); } catch { throw new Error("Dedicated introducer Preview URL is not configured."); }
  const origins=parseExactHttpsOrigins(env.ROOT_INTRODUCER_PREVIEW_ALLOWED_ORIGINS);
  if(url.protocol!=="https:" || !url.hostname.startsWith("root-health-introducer-demo-") || !url.hostname.endsWith(".vercel.app") || url.username || url.password || url.pathname!=="/" || url.search || url.hash ||
     !origins.has(url.origin) || env.ROOT_INTRODUCER_VERCEL_PROJECT_ID!==INTRODUCER_PREVIEW_PROJECT_ID ||
     env.ROOT_INTRODUCER_SUPABASE_PROJECT_REF!==INTRODUCER_PREVIEW_SUPABASE_REF)
    throw new Error("Dedicated introducer Preview URL is invalid.");
  return `${url.origin}/api/internal/introducer-onboarding`;
}

async function signedPreviewCall(action,assertion,request,env=process.env,fetcher=fetch) {
  const secret=String(env.ROOT_INTRODUCER_ONBOARDING_SHARED_SECRET || "");
  // Vercel injects this signed, short-lived token only when secure backend
  // OIDC is configured. Forward it to the dedicated project's Trusted Source
  // rule; never fall back to a long-lived protection-bypass secret.
  const oidc=request.headers.get("x-vercel-oidc-token");
  if(!oidc) throw new Error("Protected Preview trusted OIDC is unavailable.");
  const signed=signOnboardingAssertion({action,...assertion},secret);
  const response=await fetcher(previewInternalUrl(env),{method:"POST",redirect:"error",signal:AbortSignal.timeout(25000),
    headers:{"Content-Type":"application/json","Authorization":`Bearer ${signed}`,"x-vercel-trusted-oidc-idp-token":oidc},body:JSON.stringify({action,assertion:signed})});
  const result=await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(response.status===503?"Introducer Preview handoff is not configured.":"Introducer Preview did not confirm the requested action.");
  return result;
}

async function loadOnboarding(db,introducerId) {
  const row=await queryResult(db.from("organisation_introducer_onboarding").select("*").eq("introducer_id",introducerId).maybeSingle());
  const events=row ? await queryResult(db.from("organisation_introducer_onboarding_events").select("event_type,agreement_id,request_id,occurred_at,details").eq("onboarding_id",row.id).order("occurred_at",{ascending:false}).limit(50)) : [];
  return {row,events};
}

export async function GET(request) {
  if(isIntroducerDeployment() || !commercialOnboardingBridgeReady()) return reply({error:"Demo access administration is not enabled on this verified Root commercial deployment."},404);
  let access;
  try { access=await rootAgreementAccess(request); } catch { return reply({error:"Verified Root administrator required."},403); }
  const id=new URL(request.url).searchParams.get("introducerId");
  if(!uuid(id)) return reply({error:"Invalid introducer."},400);
  try {
    const {row,events}=await loadOnboarding(access.db,id);
    const agreementState=await loadAgreementState(access.db,id);
    const summary=demoAccessSummary(agreementState,row);
    const agreementReady=summary.agreement.verified;
    if(!row) return reply({onboarding:{state:"registered",agreementReady,...summary,events:[]}});
    const canReplace=["activation_sent","activation_uncertain"].includes(row.state) && row.activation_expires_at && row.activation_expires_at<=new Date().toISOString();
    const {id: onboardingId,state,agreement_id,agreement_version,acceptance_id,recipient_email,accepted_at,
      activation_expires_at,invite_sent_at,invite_delivery_id,preview_grant_expires_at,activation_completed_at,revoked_at,created_at,updated_at}=row;
    return reply({onboarding:{id:onboardingId,state,agreement_id,agreement_version,acceptance_id,recipient_email,accepted_at,
      activation_expires_at,invite_sent_at,invite_delivery_id,preview_grant_expires_at,activation_completed_at,revoked_at,created_at,updated_at,
      agreementReady,...summary,canReplace,accessExpired:summary.accountStatus==="expired",
      displayState:summary.accountStatus==="expired"?"expired":state,events}});
  } catch { return reply({error:"Onboarding status is unavailable. Check the approved onboarding migration."},503); }
}

export async function POST(request) {
  if(isIntroducerDeployment() || !commercialOnboardingBridgeReady()) return reply({error:"Demo access administration is not enabled on this verified Root commercial deployment."},404);
  let access;
  try { access=await rootAgreementAccess(request); } catch { return reply({error:"Verified Root administrator required."},403); }
  let body;
  try { const raw=await request.text(); if(raw.length>5000) return reply({error:"Request too large."},413); body=JSON.parse(raw); } catch { return reply({error:"Invalid request."},400); }
  const {introducerId,action}=body || {};
  if(!uuid(introducerId) || !["send_invitation","replace_invitation","revoke"].includes(action)) return reply({error:"Invalid onboarding operation."},400);
  try {
    const state=await loadAgreementState(access.db,introducerId);
    if(action==="send_invitation" || action==="replace_invitation") {
      const accepted=verifiedAcceptedAgreement(state,introducerId);
      let {row}=await loadOnboarding(access.db,introducerId);
      if(row?.state==="activated" || row?.state==="revoked") return reply({error:"This onboarding is already activated or revoked."},409);
      if(action==="send_invitation" && row && row.state!=="registered") return reply({error:"An activation invitation was already started. Refresh its status and use explicit replacement only after expiry."},409);
      if(action==="replace_invitation" && (!row || !["activation_sent","activation_uncertain"].includes(row.state) || !row.activation_expires_at || row.activation_expires_at>new Date().toISOString())) return reply({error:"Only an expired, unactivated invitation can be replaced."},409);
      const requestId=uuid(body.requestId)?body.requestId:randomUUID();
      const nonce=randomBytes(32).toString("hex");
      const now=new Date();
      const expiresAt=new Date(now.getTime()+15*60*1000).toISOString();
      const assertion={introducerId,agreementId:accepted.agreementId,agreementVersion:accepted.agreementVersion,
        acceptanceId:accepted.acceptanceId,acceptedAt:accepted.acceptedAt,acceptedTermsHash:accepted.acceptedTermsHash,
        recipientEmail:accepted.recipientEmail,contactName:accepted.contactName,requestId,nonce,
        activationExpiresAt:expiresAt};
      const secret=String(process.env.ROOT_INTRODUCER_ONBOARDING_SHARED_SECRET || "");
      const signed=signOnboardingAssertion(assertion,secret,now.getTime());
      const rowValues={introducer_id:introducerId,state:"activation_preparing",agreement_id:accepted.agreementId,
        agreement_version:accepted.agreementVersion,acceptance_id:accepted.acceptanceId,recipient_email:accepted.recipientEmail,
        accepted_terms_hash:accepted.acceptedTermsHash,accepted_at:accepted.acceptedAt,activation_request_id:requestId,
        activation_nonce_hash:createHash("sha256").update(nonce).digest("hex"),activation_expires_at:expiresAt,updated_at:now.toISOString()};
      const existing=await loadOnboarding(access.db,introducerId);
      let saved;
      if(existing.row) {
        const replaceable=action==="replace_invitation" && ["activation_sent","activation_uncertain"].includes(existing.row.state) && existing.row.activation_expires_at<=now.toISOString();
        if(existing.row.state!=="registered" && !replaceable) return reply({error:"Onboarding is already in progress; refresh its status before retrying."},409);
        saved=await queryResult(access.db.from("organisation_introducer_onboarding").update(rowValues).eq("id",existing.row.id).eq("state",existing.row.state).select("id").maybeSingle());
        if(!saved) return reply({error:"Another administrator has started onboarding. Refresh status."},409);
      } else saved=await queryResult(access.db.from("organisation_introducer_onboarding").insert(rowValues).select("id").single());
      const onboardingId=saved.id;
      await queryResult(access.db.from("organisation_introducer_onboarding_events").insert({onboarding_id:onboardingId,introducer_id:introducerId,
        actor_id:access.user.id,event_type:action==="replace_invitation"?"activation_replaced":"activation_preparing",agreement_id:accepted.agreementId,request_id:requestId,details:{agreement_version:accepted.agreementVersion}}));
      let preview;
      try {
        preview=await signedPreviewCall(action==="replace_invitation"?"replace":"prepare",assertion,request);
      } catch(error) {
        await access.db.from("organisation_introducer_onboarding").update({state:"activation_uncertain",updated_at:new Date().toISOString()}).eq("id",onboardingId);
        await access.db.from("organisation_introducer_onboarding_events").insert({onboarding_id:onboardingId,introducer_id:introducerId,actor_id:access.user.id,event_type:"activation_uncertain",agreement_id:accepted.agreementId,request_id:requestId,details:{stage:"preview_prepare"}});
        return reply({error:error.message},503);
      }
      const previewOrigin=new URL(String(process.env.ROOT_AUTH_PREVIEW_URL || "")).origin;
      if(!validatePreviewActivationLink(preview.actionLink,{previewOrigin,previewSupabaseRef:process.env.ROOT_INTRODUCER_SUPABASE_PROJECT_REF}))
        throw new Error("Introducer Preview returned an invalid activation link.");
      // No action link/token is included in the browser response or logs.
      let delivery;
      try { delivery=await introducerActivationMailer()( {recipient:accepted.recipientEmail,name:accepted.contactName,actionLink:preview.actionLink,requestId} ); }
      catch {
        await access.db.from("organisation_introducer_onboarding").update({state:"activation_uncertain",updated_at:new Date().toISOString()}).eq("id",onboardingId);
        await access.db.from("organisation_introducer_onboarding_events").insert({onboarding_id:onboardingId,introducer_id:introducerId,actor_id:access.user.id,event_type:"activation_uncertain",agreement_id:accepted.agreementId,request_id:requestId,details:{stage:"email_delivery"}});
        return reply({error:"Activation email delivery is unconfirmed. Check Resend before any replacement."},409);
      }
      const sentAt=new Date().toISOString();
      await queryResult(access.db.from("organisation_introducer_onboarding").update({state:"activation_sent",invite_sent_at:sentAt,invite_delivery_id:delivery.message_id,updated_at:sentAt}).eq("id",onboardingId));
      await queryResult(access.db.from("organisation_introducer_onboarding_events").insert({onboarding_id:onboardingId,introducer_id:introducerId,actor_id:access.user.id,event_type:"activation_sent",agreement_id:accepted.agreementId,request_id:requestId,details:{delivery_id:delivery.message_id}}));
      try { await signedPreviewCall("sent",assertion,request); } catch { /* Root's confirmed receipt is retained; Preview remains fail-closed until reconciliation. */ }
      return reply({success:true,state:"activation_sent",message:action==="replace_invitation"?"A replacement activation invitation was sent.":"A secure activation invitation was sent to the agreement's verified recipient."});
    }

    const {row}=await loadOnboarding(access.db,introducerId);
    if(!row || !["activation_sent","activation_uncertain","activated"].includes(row.state)) return reply({error:"There is no active introducer access to revoke."},409);
    const requestId=randomUUID();
    const assertion={introducerId,agreementId:row.agreement_id,agreementVersion:row.agreement_version,
      acceptanceId:row.acceptance_id,acceptedAt:row.accepted_at,acceptedTermsHash:row.accepted_terms_hash,
      recipientEmail:row.recipient_email,contactName:"Root administrator",requestId,nonce:randomBytes(32).toString("hex"),
      activationExpiresAt:new Date(Date.now()+15*60*1000).toISOString()};
    await signedPreviewCall("revoke",assertion,request);
    const revokedAt=new Date().toISOString();
    await queryResult(access.db.from("organisation_introducer_onboarding").update({state:"revoked",revoked_at:revokedAt,revoked_by:access.user.id,updated_at:revokedAt}).eq("id",row.id));
    await queryResult(access.db.from("organisation_introducer_onboarding_events").insert({onboarding_id:row.id,introducer_id:introducerId,actor_id:access.user.id,event_type:"revoked",agreement_id:row.agreement_id,request_id:requestId,details:{}}));
    return reply({success:true,state:"revoked"});
  } catch(error) {
    return reply({error:error?.message?.includes("agreement acceptance")?error.message:"Onboarding action could not be completed. Refresh the status before retrying."},409);
  }
}

// Preview may verify a signed Root request, then complete only with a signed,
// one-time receipt. Preview Auth IDs are never looked up in Root Auth.
export async function PUT(request) {
  if(isIntroducerDeployment() || !commercialOnboardingBridgeReady()) return reply({error:"Demo access verification is not enabled on this verified Root commercial deployment."},404);
  const raw=await request.text();
  if(raw.length>20000) return reply({error:"Request too large."},413);
  let body; try { body=JSON.parse(raw); } catch { body={}; }
  if(!["verify","complete"].includes(body.action)) return reply({error:"Invalid onboarding verification."},401);
  try {
    const allowedOrigins=parseExactHttpsOrigins(process.env.ROOT_INTRODUCER_ALLOWED_CALLBACK_ORIGINS);
    const callback=validateCommercialCallbackUrl(request.url,allowedOrigins);
    if(!commercialOnboardingBridgeReady()) return reply({error:"Root commercial deployment identity is not verified."},503);
    const url=String(process.env.NEXT_PUBLIC_SUPABASE_URL || "");
    const key=getSupabaseServerKeyIfConfigured();
    if(!url || !key) return reply({error:"Root agreement verification is not configured."},503);
    const db=createSupabaseKeyCompatibleClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
    if(body.action==="complete") {
      const receiptToken=String(body.receipt || "");
      let expectedPreviewOrigin;
      try { previewInternalUrl(); expectedPreviewOrigin=new URL(process.env.ROOT_AUTH_PREVIEW_URL).origin; }
      catch { return reply({error:"Dedicated introducer Preview identity is not configured."},503); }
      const receipt=verifyPreviewActivationReceipt(receiptToken,process.env.ROOT_INTRODUCER_ONBOARDING_SHARED_SECRET,{audience:callback.href,expectedPreviewOrigin});
      if(!receipt) return reply({error:"Preview activation receipt is invalid, expired, or intended for another deployment."},401);
      const state=await loadAgreementState(db,receipt.introducerId);
      const accepted=verifiedAcceptedAgreement(state,receipt.introducerId);
      if(accepted.agreementId!==receipt.agreementId || accepted.agreementVersion!==receipt.agreementVersion ||
          accepted.acceptanceId!==receipt.acceptanceId || !sameInstant(accepted.acceptedAt,receipt.acceptedAt) ||
          accepted.acceptedTermsHash!==receipt.acceptedTermsHash || accepted.recipientEmail!==receipt.recipientEmail ||
          accepted.recipientEmail!==receipt.verifiedEmail || accepted.contactName!==receipt.contactName)
        return reply({error:"Current commercial agreement does not match the Preview receipt."},409);
      const {row}=await loadOnboarding(db,receipt.introducerId);
      const nonceHash=createHash("sha256").update(receipt.nonce).digest("hex");
      if(!row || !["activation_sent","activation_uncertain","activated"].includes(row.state) ||
          row.activation_request_id!==receipt.requestId || row.agreement_id!==receipt.agreementId ||
          row.agreement_version!==receipt.agreementVersion || row.acceptance_id!==receipt.acceptanceId ||
          !sameInstant(row.accepted_at,receipt.acceptedAt) || row.accepted_terms_hash!==receipt.acceptedTermsHash ||
          row.recipient_email?.toLowerCase()!==receipt.recipientEmail?.toLowerCase() ||
          !sameInstant(row.activation_expires_at,receipt.activationExpiresAt) || new Date(row.activation_expires_at)<=new Date() ||
          nonceHash!==row.activation_nonce_hash)
        return reply({error:"Preview receipt does not match the current Root authorization."},409);
      const grantExpiresAt=new Date(receipt.grantExpiresAt);
      if(!Number.isFinite(grantExpiresAt.getTime()) || grantExpiresAt<=new Date() || grantExpiresAt>new Date(Date.now()+30*86400000+60000))
        return reply({error:"Preview grant expiry is invalid."},400);
      const {data:completed,error:completionError}=await db.rpc("complete_professional_introducer_onboarding",{
        p_receipt_jti:receipt.jti,p_onboarding_id:row.id,p_introducer_id:receipt.introducerId,
        p_request_id:receipt.requestId,p_nonce_hash:nonceHash,p_agreement_id:receipt.agreementId,
        p_agreement_version:receipt.agreementVersion,p_acceptance_id:receipt.acceptanceId,
        p_accepted_at:receipt.acceptedAt,p_terms_hash:receipt.acceptedTermsHash,
        p_recipient_email:receipt.recipientEmail,p_preview_user_id:receipt.previewUserId,
        p_preview_grant_id:receipt.grantId,p_preview_grant_expires_at:grantExpiresAt.toISOString(),
        p_receipt_sha256:createHash("sha256").update(receiptToken).digest("hex"),
      });
      if(completionError || completed!==true) return reply({error:"Root could not atomically record Preview activation."},503);
      return reply({valid:true,activated:true});
    }

    const assertion=verifyOnboardingAssertion(body.assertion,process.env.ROOT_INTRODUCER_ONBOARDING_SHARED_SECRET);
    if(!assertion || !["prepare","replace"].includes(assertion.action)) return reply({error:"Invalid onboarding verification."},401);
    const state=await loadAgreementState(db,assertion.introducerId);
    const accepted=verifiedAcceptedAgreement(state,assertion.introducerId);
    if(accepted.agreementId!==assertion.agreementId || accepted.agreementVersion!==assertion.agreementVersion || accepted.acceptanceId!==assertion.acceptanceId || !sameInstant(accepted.acceptedAt,assertion.acceptedAt) || accepted.acceptedTermsHash!==assertion.acceptedTermsHash || accepted.recipientEmail!==assertion.recipientEmail) return reply({error:"Agreement evidence is no longer current."},409);
    const {row}=await loadOnboarding(db,assertion.introducerId);
    if(!row || !["activation_sent","activation_uncertain","activated"].includes(row.state) || row.activation_request_id!==assertion.requestId || row.activation_nonce_hash!==createHash("sha256").update(assertion.nonce).digest("hex") || !sameInstant(row.activation_expires_at,assertion.activationExpiresAt) || row.activation_expires_at<=new Date().toISOString()) return reply({error:"Activation has expired, been revoked, or been replaced."},409);
    return reply({valid:true,assertion:{introducerId:assertion.introducerId,contactName:assertion.contactName,recipientEmail:assertion.recipientEmail,requestId:assertion.requestId,agreementId:assertion.agreementId}});
  } catch { return reply({error:"Current agreement evidence could not be verified."},503); }
}
