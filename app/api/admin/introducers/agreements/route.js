import { randomBytes } from 'node:crypto';
import { agreementAccess, privateJson, result, hash, ownedAcceptance, archiveAcceptance } from '../../../../../lib/introducerAgreementServer.js';
import { AGREEMENT_VERSION, AGREEMENT_TEXT, ACCEPTANCE_VERSION, ACCEPTANCE_TEXT } from '../../../../../lib/introducerAgreement.js';
import { corporateEmailUrl } from '../../../../../lib/corporateEmailUrl.js';

export async function GET(request) {
  try {
    const { db } = await agreementAccess(request, true);
    const id = new URL(request.url).searchParams.get('introducerId');
    const acceptances = await result(db.from('introducer_agreement_acceptances').select('id,version,accepted_at,accepting_name,verified_email').eq('introducer_id', id).order('accepted_at', { ascending: false }));
    for (const a of acceptances) a.archived = Boolean(await result(db.from('introducer_agreement_archives').select('acceptance_id').eq('acceptance_id', a.id).maybeSingle()));
    const introducer = await result(db.from('organisation_introducers').select('agreement_legacy,status').eq('id', id).single());
    return privateJson({ acceptances, introducer });
  } catch { return privateJson({ error: 'Root administrator access required.' }, 403); }
}
export async function POST(request) {
  try {
    const { db, user } = await agreementAccess(request, true);
    const body = await request.json();
    if (body.action === 'revoke') {
      await result(db.rpc('revoke_introducer_agreement', {p_introducer:body.introducerId}));
      return privateJson({revoked:true});
    }
    if (body.action === 'retry') {
      const a = await ownedAcceptance(db, user, true, body.id);
      await archiveAcceptance(db, a);
      return privateJson({ archived: true });
    }
    if (body.action !== 'issue') return privateJson({ error: 'Unknown action.' }, 400);
    const base = corporateEmailUrl('/introducer-agreement');
    const token = randomBytes(32).toString('hex');
    const id = await result(db.rpc('issue_introducer_agreement', {
      p_introducer: body.introducerId, p_email: String(body.email || '').trim().toLowerCase(),
      p_token_hash: hash(token), p_version: AGREEMENT_VERSION, p_agreement: AGREEMENT_TEXT,
      p_acceptance_version: ACCEPTANCE_VERSION, p_acceptance: ACCEPTANCE_TEXT, p_admin: user.id,
      p_changes: body.changes || {},
    }));
    return privateJson({ id, url: `${base}#token=${token}` });
  } catch { return privateJson({ error: 'Unable to issue/archive agreement. Check contact email, effective policy and pending changes.' }, 400); }
}
