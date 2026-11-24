import { emailValid } from './introducerGoogleAgreementTerms.js';

export function agreementMail(agreement,recipient,link) {
  if(!emailValid(recipient) || recipient!==agreement.terms_snapshot.contact_email) throw new Error('Stored agreement recipient mismatch.');
  return {to:recipient,subject:'Your Root Health Introducer Agreement',text:
    `Hi ${agreement.terms_snapshot.contact_name},\n\nPlease review your Root Health Introducer Agreement and Commercial Terms using the private link below. Complete your details, confirm acceptance and choose Accept Agreement. You do not need a Root account.\n\n${link}\n\nAn accepted PDF copy will be emailed to you. Do not forward this private invitation. For help, contact enquiries@roothealth.app.\n\nKind regards,\nDavid\nRoot Health App`};
}
function resendSender(env,fetcher) {
  const key=String(env.RESEND_API_KEY || '').trim();
  if(!key) throw new Error('Root agreement email is not configured.');
  return async (message,recipient,operationId) => {
    try {
      const response=await fetcher('https://api.resend.com/emails',{
        method:'POST',signal:AbortSignal.timeout(20000),redirect:'error',
        headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json','Idempotency-Key':`root-agreement-${operationId}`},
        body:JSON.stringify({...message,to:[recipient],from:'Root Health <enquiries@roothealth.app>',reply_to:'enquiries@roothealth.app'}),
      });
      if(!response.ok) throw new Error('Unconfirmed delivery');
      const result=await response.json();
      if(typeof result.id!=='string' || !result.id.trim()) throw new Error('Missing delivery receipt');
      return {message_id:result.id,recipient};
    } catch {
      // A timeout or missing receipt may still mean delivery: never automatically resend.
      throw new Error('Root agreement email delivery is unconfirmed. Check Resend before an explicit resend.');
    }
  };
}
export function agreementMailer(env=process.env,fetcher=fetch) {
  const send=resendSender(env,fetcher);
  return async (agreement,recipient,operationId,link)=>{
    if(!link)throw Error('Agreement invitation is required.');
    return send(agreementMail(agreement,recipient,link),recipient,operationId);
  };
}
export function agreementAcceptanceNotifier(env=process.env,fetcher=fetch) {
  const send=resendSender(env,fetcher);
  return (channel,agreement,acceptance,pdf)=>{
    if(!['customer','root'].includes(channel))throw Error('Invalid agreement notification.');
    const recipient=channel==='customer'?agreement.terms_snapshot.contact_email:'enquiries@roothealth.app';
    if(!emailValid(recipient))throw Error('Stored agreement recipient mismatch.');
    return send({subject:'Root Health Introducer Agreement accepted',text:channel==='customer'
      ? `Hi ${acceptance.evidence.full_name},\n\nYour Root Health Introducer Agreement has been accepted. Your accepted copy is attached.\n\nKind regards,\nDavid\nRoot Health App`
      : `${agreement.terms_snapshot.introducer_name}: agreement version ${agreement.version} accepted by ${acceptance.evidence.full_name} (${acceptance.evidence.email}) at ${acceptance.accepted_at}. The accepted PDF is attached.`,
      attachments:[{filename:`Root-Health-Agreement-v${agreement.version}.pdf`,content:pdf.toString('base64')}]},recipient,`accepted-${acceptance.id}-${channel}`);
  };
}

/** The private activation link is sent only by the verified-agreement
 * coordinator. The request id is the delivery idempotency key. */
export function introducerActivationMailer(env=process.env,fetcher=fetch) {
  const send=resendSender(env,fetcher);
  return async ({recipient,name,actionLink,requestId})=>{
    if(!emailValid(recipient) || !/^https:\/\//i.test(String(actionLink || "")) || !requestId)
      throw new Error("Introducer activation email is invalid.");
    return send({subject:"Complete your Root Health Professional Introducer access",text:
      `Hi ${String(name || "there").slice(0,120)},\n\nYour Root Health introducer agreement has been accepted. Use the private link below to set your own password and activate your individual, time-limited demonstration access. This invitation is for you only and expires shortly.\n\n${actionLink}\n\nIf you did not expect this invitation, contact enquiries@roothealth.app.\n\nKind regards,\nRoot Health`},recipient,`introducer-activation-${requestId}`);
  };
}
