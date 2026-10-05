import { emailValid } from './introducerGoogleAgreementTerms.js';
import { completionLink, returnConfig } from './introducerAgreementReturn.js';

export function agreementMail(agreement,recipient,link) {
  if(!emailValid(recipient) || recipient!==agreement.terms_snapshot.contact_email) throw new Error('Stored agreement recipient mismatch.');
  return {to:recipient,subject:'Your Root Health Introducer Agreement',text:
    `Hi ${agreement.terms_snapshot.contact_name},\n\nPlease review and complete your Root Health Introducer Agreement using the link below.\n\n${agreement.document_url}\n\nWhen you have completed the agreement, click "I've completed my agreement" at the link below. Root Health will then review it and confirm acceptance.\n\n${link}\n\nFor help, contact enquiries@roothealth.app.\n\nKind regards,\nDavid\nRoot Health App`};
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
  const config=returnConfig(env);
  return async (agreement,recipient,operationId)=>send(agreementMail(agreement,recipient,completionLink(agreement,config)),recipient,operationId);
}
export function agreementReturnNotifier(env=process.env,fetcher=fetch) {
  const send=resendSender(env,fetcher);
  return (agreement,reviewLink)=>send({subject:'Introducer agreement returned - review required',text:
    `${agreement.terms_snapshot.introducer_name} (${agreement.terms_snapshot.contact_email}) has returned agreement version ${agreement.version} for Root review.\n\n${reviewLink}\n\nReview the Google Doc before choosing Accept Agreement. No acceptance or PDF archive has been created by this return.`},
    'enquiries@roothealth.app',`returned-${agreement.id}`);
}
