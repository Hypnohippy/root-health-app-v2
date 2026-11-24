import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { loadAgreementState } from "./introducerGoogleAgreementServer.js";
import { loadOnboarding, previewInternalUrl } from "./introducerActivationHandoff.server.js";
import {
  commercialOnboardingBridgeReady, parseExactHttpsOrigins, validateCommercialCallbackUrl,
  verifyOnboardingAssertion, verifyPreviewActivationReceipt,
} from "./professionalIntroducerOnboarding.server.js";

const reply = (body,status=200) => Response.json(body,{status,headers:{"Cache-Control":"no-store"}});
const sameInstant = (left,right) => Number.isFinite(Date.parse(left || "")) && Date.parse(left)===Date.parse(right || "");

/** Signed, time-limited Preview callbacks. Root re-reads accepted evidence and
 * atomically consumes the completion receipt; Preview Auth ids never enter Root Auth. */
export async function handleRootIntroducerOnboardingCallback(request,{
  env=process.env,createDatabase,loadState=loadAgreementState,readOnboarding=loadOnboarding,
  verifyAccepted,now=()=>new Date(),
}={}) {
  if(!commercialOnboardingBridgeReady(env)) return reply({error:"Demo access verification is not enabled on this verified Root commercial deployment."},404);
  const raw=await request.text();
  if(raw.length>20000) return reply({error:"Request too large."},413);
  let body; try { body=JSON.parse(raw); } catch { body={}; }
  if(!["verify","complete"].includes(body.action)) return reply({error:"Invalid onboarding verification."},401);
  try {
    const allowedOrigins=parseExactHttpsOrigins(env.ROOT_INTRODUCER_ALLOWED_CALLBACK_ORIGINS);
    const callback=validateCommercialCallbackUrl(request.url,allowedOrigins);
    const url=String(env.NEXT_PUBLIC_SUPABASE_URL || "");
    const key=String(env.SUPABASE_SERVICE_ROLE_KEY || "");
    if(!url || !key) return reply({error:"Root agreement verification is not configured."},503);
    const db=createDatabase
      ? await createDatabase(env)
      : createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
    const verifyCurrent=verifyAccepted || ((state,introducerId,at)=>{
      throw new Error(`The Root agreement verifier must be provided for ${introducerId} at ${at}.`);
    });
    if(body.action==="complete") {
      const receiptToken=String(body.receipt || "");
      let expectedPreviewOrigin;
      try { previewInternalUrl(env); expectedPreviewOrigin=new URL(env.ROOT_AUTH_PREVIEW_URL).origin; }
      catch { return reply({error:"Dedicated introducer Preview identity is not configured."},503); }
      const receipt=verifyPreviewActivationReceipt(receiptToken,env.ROOT_INTRODUCER_ONBOARDING_SHARED_SECRET,{audience:callback.href,expectedPreviewOrigin,now:now().getTime()});
      if(!receipt) return reply({error:"Preview activation receipt is invalid, expired, or intended for another deployment."},401);
      const state=await loadState(db,receipt.introducerId);
      const accepted=verifyCurrent(state,receipt.introducerId,now());
      if(accepted.agreementId!==receipt.agreementId || accepted.agreementVersion!==receipt.agreementVersion ||
          accepted.acceptanceId!==receipt.acceptanceId || !sameInstant(accepted.acceptedAt,receipt.acceptedAt) ||
          accepted.acceptedTermsHash!==receipt.acceptedTermsHash || accepted.recipientEmail!==receipt.recipientEmail ||
          accepted.recipientEmail!==receipt.verifiedEmail || accepted.contactName!==receipt.contactName)
        return reply({error:"Current commercial agreement does not match the Preview receipt."},409);
      const {row}=await readOnboarding(db,receipt.introducerId);
      const nonceHash=createHash("sha256").update(receipt.nonce).digest("hex");
      if(!row || !["activation_sent","activation_uncertain","activated"].includes(row.state) ||
          row.activation_request_id!==receipt.requestId || row.agreement_id!==receipt.agreementId ||
          row.agreement_version!==receipt.agreementVersion || row.acceptance_id!==receipt.acceptanceId ||
          !sameInstant(row.accepted_at,receipt.acceptedAt) || row.accepted_terms_hash!==receipt.acceptedTermsHash ||
          row.recipient_email?.toLowerCase()!==receipt.recipientEmail?.toLowerCase() ||
          !sameInstant(row.activation_expires_at,receipt.activationExpiresAt) || new Date(row.activation_expires_at)<=now() ||
          nonceHash!==row.activation_nonce_hash)
        return reply({error:"Preview receipt does not match the current Root authorization."},409);
      const grantExpiresAt=new Date(receipt.grantExpiresAt);
      if(!Number.isFinite(grantExpiresAt.getTime()) || grantExpiresAt<=now() || grantExpiresAt>new Date(now().getTime()+30*86400000+60000))
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

    const assertion=verifyOnboardingAssertion(body.assertion,env.ROOT_INTRODUCER_ONBOARDING_SHARED_SECRET,now().getTime());
    if(!assertion || !["prepare","replace"].includes(assertion.action)) return reply({error:"Invalid onboarding verification."},401);
    const state=await loadState(db,assertion.introducerId);
    const accepted=verifyCurrent(state,assertion.introducerId,now());
    if(accepted.agreementId!==assertion.agreementId || accepted.agreementVersion!==assertion.agreementVersion ||
        accepted.acceptanceId!==assertion.acceptanceId || !sameInstant(accepted.acceptedAt,assertion.acceptedAt) ||
        accepted.acceptedTermsHash!==assertion.acceptedTermsHash || accepted.recipientEmail!==assertion.recipientEmail)
      return reply({error:"Agreement evidence is no longer current."},409);
    const {row}=await readOnboarding(db,assertion.introducerId);
    if(!row || !["activation_sent","activation_uncertain","activated"].includes(row.state) ||
        row.activation_request_id!==assertion.requestId || row.activation_nonce_hash!==createHash("sha256").update(assertion.nonce).digest("hex") ||
        !sameInstant(row.activation_expires_at,assertion.activationExpiresAt) || row.activation_expires_at<=now().toISOString())
      return reply({error:"Activation has expired, been revoked, or been replaced."},409);
    return reply({valid:true,assertion:{introducerId:assertion.introducerId,contactName:assertion.contactName,
      recipientEmail:assertion.recipientEmail,requestId:assertion.requestId,agreementId:assertion.agreementId}});
  } catch { return reply({error:"Current agreement evidence could not be verified."},503); }
}
