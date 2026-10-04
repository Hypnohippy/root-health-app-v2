import nodemailer from 'nodemailer';
import { emailValid } from './introducerGoogleAgreementTerms.js';

export function agreementMail(agreement,recipient) {
  if(!emailValid(recipient) || recipient!==agreement.terms_snapshot.contact_email) throw new Error('Stored agreement recipient mismatch.');
  return {to:recipient,subject:'Your Root Health Introducer Agreement',text:
    `Hi ${agreement.terms_snapshot.contact_name},\n\nPlease review and complete your Root Health Introducer Agreement using the link below.\n\n${agreement.document_url}\n\nOnce completed, please save/share the finished copy with enquiries@roothealth.app.\n\nKind regards,\nDavid\nRoot Health App`};
}
export function agreementMailer(env=process.env,createTransport=nodemailer.createTransport) {
  const user=String(env.ROOT_SMTP_USER || '').trim();
  const pass=String(env.ROOT_SMTP_PASSWORD || '').trim();
  const from=String(env.ROOT_SMTP_FROM || '').trim();
  if(!user || !pass || !from) throw new Error('Root SMTP is not configured.');
  const sender=/<[^>]+>/.test(from)?from:`Root Health <${from}>`;
  const transport=createTransport({service:'gmail',auth:{user,pass},connectionTimeout:15000,greetingTimeout:15000,socketTimeout:20000});
  return async (agreement,recipient,operationId) => {
    const message=agreementMail(agreement,recipient);
    const info=await transport.sendMail({...message,from:sender,replyTo:'Root Health <enquiries@roothealth.app>',messageId:`<root-agreement-${operationId}@roothealth.app>`});
    if(!info.messageId || !info.accepted?.some(address=>String(address).toLowerCase()===recipient)) throw new Error('SMTP did not confirm recipient acceptance.');
    return {message_id:info.messageId,recipient};
  };
}
