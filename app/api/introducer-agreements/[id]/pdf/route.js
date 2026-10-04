import { agreementAccess, privateJson, privateHeaders, result, ownedAcceptance, hash } from '../../../../../lib/introducerAgreementServer.js';
import { contractContent } from '../../../../../lib/introducerAgreementPdf.js';

export async function GET(request, { params }) {
  try {
    const { db, user, isAdmin } = await agreementAccess(request);
    const a = await ownedAcceptance(db, user, isAdmin, params.id);
    const archive = await result(db.from('introducer_agreement_archives').select('*').eq('acceptance_id', a.id).maybeSingle());
    if (!archive) return privateJson({ error: 'Archive pending.' }, 409);
    if (hash(contractContent(a)) !== archive.content_hash) throw new Error('Snapshot integrity failure');
    const { data, error } = await db.storage.from('introducer-agreements').download(archive.storage_path);
    if (error) throw error;
    const bytes = Buffer.from(await data.arrayBuffer());
    if (hash(bytes) !== archive.pdf_hash) throw new Error('Archive integrity failure');
    return new Response(bytes, { headers: { ...privateHeaders, 'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="root-agreement-${a.id}.pdf"`, 'X-Content-Type-Options': 'nosniff' } });
  } catch { return privateJson({ error: 'Agreement unavailable.' }, 403); }
}
