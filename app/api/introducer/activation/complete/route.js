import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createSupabaseKeyCompatibleClient } from "../../../../../lib/supabaseKeyCompatibleClient.js";
import { getSupabasePublicKeyIfConfigured } from "../../../../../lib/supabasePublicKey.js";
import { getSupabaseServerKeyIfConfigured } from "../../../../../lib/supabaseServerKey.server.js";
import { isIntroducerDeployment } from "../../../../../lib/introducerRestrictedActions.server.js";
import { INTRODUCER_PREVIEW_BRANCH, INTRODUCER_PREVIEW_PROJECT_ID, INTRODUCER_PREVIEW_SUPABASE_REF, parseExactHttpsOrigins, signPreviewActivationReceipt, validateCommercialCallbackUrl, validatePreviewDeployment, verifyOnboardingAssertion } from "../../../../../lib/professionalIntroducerOnboarding.server.js";
import { provisionIntroducerFictionalOrganisation } from "../../../../../lib/provisionIntroducerFictionalWorkforce.server.js";

export const runtime="nodejs";
const reply=(body,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});
const sameInstant=(left,right)=>Number.isFinite(Date.parse(left || "")) && Date.parse(left)===Date.parse(right || "");

export async function POST(request) {
  if(!isIntroducerDeployment() || process.env.PROFESSIONAL_INTRODUCER_DEMO_ENABLED!=="true") return reply({error:"Introducer activation is unavailable."},404);
  try { validatePreviewDeployment(process.env); } catch { return reply({error:"Introducer Preview identity is not verified."},503); }
  const token=request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if(!token) return reply({error:"Verified invited account required."},401);
  let url=String(process.env.NEXT_PUBLIC_SUPABASE_URL || "");
  const publicKey=getSupabasePublicKeyIfConfigured();
  const serviceKey=getSupabaseServerKeyIfConfigured();
  if(!url || !publicKey || !serviceKey) return reply({error:"Isolated introducer authentication is not configured."},503);
  const auth=createSupabaseKeyCompatibleClient(url,publicKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  const {data:{user}={},error:authError}=await auth.auth.getUser(token);
  if(authError || !user?.email_confirmed_at) return reply({error:"Invitation email must be verified before activation."},403);
  const admin=createSupabaseKeyCompatibleClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  const {data:onboarding,error}=await admin.from("professional_introducer_onboarding").select("*").eq("user_id",user.id).maybeSingle();
  if(error || !onboarding) return reply({error:"No Root-authorised introducer invitation is associated with this account."},403);
  if(onboarding.contact_email?.toLowerCase()!==user.email?.toLowerCase() || !["link_prepared","sent","activated"].includes(onboarding.state)) return reply({error:"Invitation identity is not authorised."},403);
  if(onboarding.state==="activated") {
    const {data:activeGrant,error:activeGrantError}=await admin.from("professional_introducer_demo_access")
      .select("id,user_id,expires_at,revoked_at").eq("id",onboarding.access_grant_id).maybeSingle();
    if(activeGrantError || !activeGrant || activeGrant.user_id!==user.id || activeGrant.revoked_at || new Date(activeGrant.expires_at).getTime()<=Date.now())
      return reply({error:"Introducer access has expired or been revoked."},403);
    return reply({success:true,alreadyActive:true,expiresAt:activeGrant.expires_at});
  }
  if(new Date(onboarding.activation_expires_at).getTime()<=Date.now()) return reply({error:"This activation link has expired. Root must review and replace it."},410);
  const secret=String(process.env.ROOT_INTRODUCER_ONBOARDING_SHARED_SECRET || "");
  const assertion=verifyOnboardingAssertion(onboarding.signed_assertion,secret);
  const verifyUrl=String(process.env.ROOT_INTRODUCER_COMMERCIAL_VERIFY_URL || "");
  let rootUrl;
  try { rootUrl=validateCommercialCallbackUrl(verifyUrl,parseExactHttpsOrigins(process.env.ROOT_INTRODUCER_ALLOWED_CALLBACK_ORIGINS)); }
  catch { return reply({error:"Root agreement verification destination is not in the exact isolated callback allowlist."},503); }
  let previewDeploymentOrigin;
  try {
    previewDeploymentOrigin=new URL(request.url).origin;
    const allowedPreviewOrigins=parseExactHttpsOrigins(process.env.ROOT_INTRODUCER_PREVIEW_ALLOWED_ORIGINS);
    if(!allowedPreviewOrigins.has(previewDeploymentOrigin) || previewDeploymentOrigin!==new URL(String(process.env.ROOT_AUTH_PREVIEW_URL || "")).origin)
      return reply({error:"This Preview deployment origin is not the approved activation target."},503);
  } catch { return reply({error:"The exact Preview deployment origin is not configured."},503); }
  if(!assertion || !["prepare","replace"].includes(assertion.action) ||
      assertion.introducerId!==onboarding.commercial_introducer_id || assertion.requestId!==onboarding.activation_request_id ||
      assertion.agreementId!==onboarding.agreement_id || assertion.agreementVersion!==onboarding.agreement_version ||
      assertion.acceptanceId!==onboarding.acceptance_id || !sameInstant(assertion.acceptedAt,onboarding.accepted_at) ||
      assertion.acceptedTermsHash!==onboarding.accepted_terms_hash ||
      assertion.recipientEmail?.toLowerCase()!==onboarding.contact_email?.toLowerCase() ||
      !sameInstant(assertion.activationExpiresAt,onboarding.activation_expires_at)) return reply({error:"Stored Root authorisation is invalid."},403);
  let verification;
  try {
    const response=await fetch(rootUrl,{method:"PUT",redirect:"error",signal:AbortSignal.timeout(15000),headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"verify",assertion:onboarding.signed_assertion})});
    verification=await response.json();
    if(!response.ok || verification.valid!==true) return reply({error:"Root agreement acceptance is no longer current."},403);
  } catch { return reply({error:"Root could not verify the accepted agreement. Access remains inactive."},503); }

  if(onboarding.state==="link_prepared") {
    const {error:markError}=await admin.from("professional_introducer_onboarding").update({state:"sent",invite_sent_at:new Date().toISOString(),activation_link_ciphertext:null,updated_at:new Date().toISOString()})
      .eq("id",onboarding.id).eq("state","link_prepared");
    if(markError) return reply({error:"Verified invitation state could not be reconciled. Access remains inactive."},503);
    onboarding.state="sent";
  }

  const grantIdResult=await admin.rpc("activate_professional_introducer_onboarding",{
    p_onboarding_id:onboarding.id,p_user_id:user.id,p_label:String(assertion.contactName || user.email).slice(0,80),
  });
  if(grantIdResult.error || !grantIdResult.data) return reply({error:"A time-limited demonstration grant could not be prepared."},503);
  if(onboarding.access_grant_id && onboarding.access_grant_id!==grantIdResult.data) return reply({error:"Activation grant does not match the signed onboarding record."},403);
  const grantResult=await admin.from("professional_introducer_demo_access").select("id,user_id,expires_at,revoked_at,revoked_by,demo_organisation_id").eq("id",grantIdResult.data).single();
  if(grantResult.error || !grantResult.data || grantResult.data.user_id!==user.id || grantResult.data.revoked_by || new Date(grantResult.data.expires_at).getTime()<=Date.now()) return reply({error:"Existing access is expired or revoked; Root review is required."},403);
  if(!grantResult.data.revoked_at && onboarding.state!=="activated") return reply({error:"A pending activation grant was unexpectedly active."},403);
  const grant=grantResult.data;
  try {
    await provisionIntroducerFictionalOrganisation({admin,grantId:grant.id,userId:user.id});
  } catch {
    // An unmapped grant is unusable by the demo auth gate; a retry is safe and
    // the deterministic fictional seed prevents duplicate records.
    return reply({error:"Personal Root setup is ready, but fictional Workplace mapping is incomplete. Contact Root to retry activation."},503);
  }
  const receiptToken=signPreviewActivationReceipt({
    action:"activation_complete",iss:INTRODUCER_PREVIEW_PROJECT_ID,
    previewVercelProjectId:process.env.VERCEL_PROJECT_ID,
    previewSupabaseProjectRef:INTRODUCER_PREVIEW_SUPABASE_REF,
    vercelEnvironment:process.env.VERCEL_ENV,gitBranch:process.env.VERCEL_GIT_COMMIT_REF,
    previewDeploymentOrigin,aud:rootUrl.href,jti:randomUUID(),
    previewOnboardingId:onboarding.id,
    introducerId:assertion.introducerId,agreementId:assertion.agreementId,
    agreementVersion:assertion.agreementVersion,acceptanceId:assertion.acceptanceId,
    acceptedAt:assertion.acceptedAt,acceptedTermsHash:assertion.acceptedTermsHash,
    nonce:assertion.nonce,requestId:assertion.requestId,
    activationExpiresAt:assertion.activationExpiresAt,
    recipientEmail:assertion.recipientEmail,contactName:assertion.contactName,
    previewUserId:user.id,verifiedEmail:user.email.toLowerCase(),grantId:grant.id,grantExpiresAt:grant.expires_at,
  },secret);
  try {
    const response=await fetch(rootUrl,{method:"PUT",redirect:"error",signal:AbortSignal.timeout(15000),headers:{"Content-Type":"application/json"},body:JSON.stringify({
      action:"complete",receipt:receiptToken,
    })});
    const result=await response.json().catch(()=>({}));
    if(!response.ok || result.valid!==true) return reply({error:"Preview access is prepared, but Root could not record activation. Refresh or contact Root before leaving."},503);
  } catch { return reply({error:"Preview access is prepared, but Root activation confirmation is unavailable. Retry before leaving."},503); }
  const {data:finalized,error:completeError}=await admin.rpc("confirm_professional_introducer_onboarding",{
    p_onboarding_id:onboarding.id,p_user_id:user.id,p_grant_id:grant.id,
  });
  if(completeError || finalized!==true) return reply({error:"Root accepted activation, but Preview access remains safely inactive until local finalization succeeds. Retry before leaving."},503);
  await admin.from("professional_introducer_onboarding_events").insert({onboarding_id:onboarding.id,event_type:"activation_completed",actor_user_id:user.id,details:{}});
  return reply({success:true,expiresAt:grant.expires_at,organisationName:"Northstar Studio (fictional)"});
}
