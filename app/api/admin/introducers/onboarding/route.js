import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { rootAgreementAccess, loadAgreementState, queryResult } from "../../../../../lib/introducerGoogleAgreementServer.js";
import { INTRODUCER_PREVIEW_PROJECT_ID, INTRODUCER_PREVIEW_SUPABASE_REF, commercialOnboardingBridgeReady, demoAccessSummary, parseExactHttpsOrigins, validateCommercialCallbackUrl, verifyOnboardingAssertion, verifyPreviewActivationReceipt } from "../../../../../lib/professionalIntroducerOnboarding.server.js";
import { isIntroducerDeployment } from "../../../../../lib/introducerRestrictedActions.server.js";
import { getSupabaseServerKeyIfConfigured } from "../../../../../lib/supabaseServerKey.server.js";
import { createSupabaseKeyCompatibleClient } from "../../../../../lib/supabaseKeyCompatibleClient.js";
import { revokeIntroducerPreviewAccess } from "../../../../../lib/introducerPreviewBridge.server.js";
import { ActivationHandoffError, loadOnboarding, previewInternalUrl, sendIntroducerActivation } from "../../../../../lib/introducerActivationHandoff.server.js";

export const runtime = "nodejs";
const reply = (body, status=200) => NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});
const uuid = value => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || "");
const sameInstant = (left,right) => Number.isFinite(Date.parse(left || "")) && Date.parse(left)===Date.parse(right || "");

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
    if(action==="send_invitation" || action==="replace_invitation") {
      const result=await sendIntroducerActivation({db:access.db,introducerId,request,actorId:access.user.id,action,requestId:body.requestId});
      return reply({success:true,state:result.state,message:action==="replace_invitation"?"A replacement activation invitation was sent.":"A secure activation invitation was sent to the agreement's verified recipient."});
    }

    const revocation=await revokeIntroducerPreviewAccess({db:access.db,introducerId,actorId:access.user.id,request});
    if(revocation.state==="not_provisioned" || revocation.state==="registered" || revocation.state==="failed")
      return reply({error:"There is no active introducer access to revoke."},409);
    return reply({success:true,state:revocation.state});
  } catch(error) {
    if(error instanceof ActivationHandoffError) return reply({error:error.message},error.status);
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
