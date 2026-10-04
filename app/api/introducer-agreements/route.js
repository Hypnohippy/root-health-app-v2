import { agreementAccess, privateJson, result, hash, ownedAcceptance, archiveAcceptance } from '../../../lib/introducerAgreementServer.js';
import { validateAcceptance } from '../../../lib/introducerAgreement.js';
import { agreementPdf } from '../../../lib/introducerAgreementPdf.js';
import { corporateEmailUrl } from '../../../lib/corporateEmailUrl.js';

export async function GET(request) {
  try {
    const { db, user } = await agreementAccess(request);
    const rows = await result(db.from('introducer_agreement_acceptances').select('id,introducer_id,version,accepted_at').eq('account_id', user.id).order('accepted_at', { ascending: false }));
    const acceptances = [];
    for (const a of rows) {
      const archive = await result(db.from('introducer_agreement_archives').select('acceptance_id').eq('acceptance_id', a.id).maybeSingle());
      const introducer = await result(db.from('organisation_introducers').select('status,referral_code,introducer_market').eq('id', a.introducer_id).single());
      const links = [];
      if (archive && introducer.status === 'active') {
        if (['corporate','both'].includes(introducer.introducer_market)) links.push({market:'Corporate',url:corporateEmailUrl('/referral')+'?ref='+encodeURIComponent(introducer.referral_code)});
        if (['personal','both'].includes(introducer.introducer_market)) links.push({market:'Personal',url:corporateEmailUrl('/start')+'?ref='+encodeURIComponent(introducer.referral_code)});
      }
      acceptances.push({...a,archived:Boolean(archive),links});
    }
    return privateJson({ acceptances });
  } catch { return privateJson({ error: 'Verified sign-in required.' }, 403); }
}
export async function POST(request) {
  try {
    const { db, user } = await agreementAccess(request);
    const body = await request.json();
    if (body.action === 'retry') {
      const a = await ownedAcceptance(db, user, false, body.id);
      await archiveAcceptance(db, a);
      return privateJson({ accepted: true, archived: true, id: a.id });
    }
    const token = String(body.token || '');
    if (!/^[a-f0-9]{64}$/.test(token)) return privateJson({ error: 'Invitation unavailable.' }, 404);
    const offer = await result(db.from('introducer_agreement_offers').select('*').eq('token_hash', hash(token)).maybeSingle());
    if (!offer || offer.invited_email !== user.email.toLowerCase() || offer.revoked_at || Date.parse(offer.expires_at) <= Date.now())
      return privateJson({ error: 'Invitation unavailable for this verified account.' }, 404);
    if (body.action === 'review') {
      const version = await result(db.from('introducer_agreement_versions').select('*').eq('version', offer.version).single());
      return privateJson({ offer: { id: offer.id, terms: offer.terms, expires_at: offer.expires_at }, version, email: user.email });
    }
    if (body.action !== 'accept') return privateJson({ error: 'Unknown action.' }, 400);
    const identity = validateAcceptance(body);
    const version = await result(db.from('introducer_agreement_versions').select('*').eq('version', offer.version).single());
    // Fail before recording consent if the frozen text cannot be represented faithfully.
    try {
      await agreementPdf({ ...version, terms: offer.terms, accepting_name: identity.name, accepting_capacity: identity.capacity,
        verified_email: user.email, accepted_at: new Date().toISOString(), id: offer.id });
    } catch {
      return privateJson({ error: 'These details cannot be archived faithfully. Ask Root to review the document before accepting; no acceptance has been recorded.' }, 400);
    }
    const id = await result(db.rpc('accept_introducer_agreement', {
      p_token_hash: hash(token), p_account: user.id, p_email: user.email,
      p_name: identity.name, p_capacity: identity.capacity, p_agreed: body.agreed, p_authority: body.authority,
    }));
    const a = await ownedAcceptance(db, user, false, id);
    try { await archiveAcceptance(db, a); }
    catch { return privateJson({ accepted: true, archived: false, id, error: 'Acceptance recorded. Archive pending; retry to complete activation.' }, 202); }
    return privateJson({ accepted: true, archived: true, id });
  } catch { return privateJson({ error: 'Agreement unavailable. Check verified sign-in, identity and both confirmations.' }, 400); }
}
