import { createHmac, timingSafeEqual } from 'node:crypto';
import { resolveCorporateDocument } from './corporateDocumentServer.js';
import { requireHRCoachOrganisationAccess, loadAuthorisedHRCoachEvidence, HRCoachAccessError } from './hrCoachServerAuth.js';
import { buildOrganisationContext } from './rootOrganisationContext.js';
import { renderCorporateDocument } from './corporateDocumentPdf.js';
const keyFromEnv = () => process.env.CORPORATE_DOCUMENT_SIGNING_SECRET || process.env.OPENAI_API_KEY;
const sign = (payload, key) => createHmac('sha256', key).update('root-draft-origin-v1:' + payload).digest();
export function createDraftOrigin(content, access, key = keyFromEnv(), now = Date.now()) {
  if (!key || !access.user?.id) return null;
  const payload = Buffer.from(JSON.stringify({ content, userId: access.user.id, organisationId: access.organisationId, expiresAt: now + 900000 })).toString('base64url');
  return payload + '.' + sign(payload, key).toString('base64url');
}
function originalText(token, access, key, now) {
  if (!key || typeof token !== 'string' || token.length > 180000) throw new Error('Origin required');
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra) throw new Error('Invalid origin');
  const actual = Buffer.from(signature, 'base64url'), expected = sign(payload, key);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error('Invalid origin');
  const claims = JSON.parse(Buffer.from(payload, 'base64url').toString());
  if (claims.userId !== access.user.id || claims.organisationId !== access.organisationId || !Number.isFinite(claims.expiresAt) || claims.expiresAt <= now) throw new Error('Expired or foreign origin');
  return claims.content;
}
// Intentionally narrow grammar. Ordinary narrative remains unchecked, never
// promoted to verified evidence. No counts are derived or reconstructed.
export function recheckDraft(content, protectedDocument) {
  const evidence = JSON.parse(protectedDocument.content);
  const claims = content.split(/\r?\n/).filter(line => line.trim()).map(line => {
    const match = line.match(/^(stress_score|burnout_score|sleep_score|recovery_score|mood_score|focus_score) (baseline mean|matched change): (-?\d+(?:\.\d+)?)$/);
    if (!match) return { text: line, status: 'not_checked' };
    const rows = match[2] === 'baseline mean' ? evidence.baselineLevels : evidence.matchedLongitudinalChange;
    const row = rows.find(item => item.metric === match[1]);
    if (!row || row.suppressed) return { text: line, status: 'unavailable_for_interpretation' };
    const value = match[2] === 'baseline mean' ? row.mean : row.change;
    return { text: line, status: value === Number(match[3]) ? 'matches_released_evidence' : 'does_not_match_released_evidence' };
  });
  return { claims, scope: 'Only exact metric baseline mean / matched change statements are checked. Narrative, causes, people, counts and percentages are not revalidated. No hidden values are returned.' };
}
export function createDraftHandler({ authorise = requireHRCoachOrganisationAccess, loadEvidence = loadAuthorisedHRCoachEvidence, render = renderCorporateDocument, getKey = keyFromEnv } = {}) {
  return async request => {
    try {
      const access = await authorise({ request, organisationId: new URL(request.url).searchParams.get('organisation_id') });
      const body = await request.json();
      if (!['recheck', 'export'].includes(body.operation) || typeof body.content !== 'string' || !body.content.trim() || body.content.length > 30000 || typeof body.title !== 'string' || !body.title.trim() || body.title.length > 200) throw new Error('Invalid draft');
      if (body.operation === 'export' && body.confirmed !== true) throw new Error('Confirmation required');
      const key = getKey();
      const original = originalText(body.origin, access, key, Date.now());
      const evidence = await loadEvidence({ supabase: access.supabase, organisationId: access.organisationId, buildSharedContext: buildOrganisationContext });
      const protectedDocument = resolveCorporateDocument({ reference: body.reference, confirmed: true }, evidence, access, key);
      const review = recheckDraft(body.content, protectedDocument);
      const provenance = body.content === original ? 'Root-generated narrative - not independently revalidated' : 'User-edited narrative - not independently revalidated';
      if (body.operation === 'recheck') return Response.json({ ...review, provenance }, { headers: { 'Cache-Control': 'no-store' } });
      const content = `${provenance}\nDocument title: ${body.title}\n\n${body.content}\n\nDeterministic recheck\n${review.scope}\n${review.claims.map((claim, i) => `Statement ${i + 1}: ${claim.status}`).join('\n')}\n\nImmutable protected evidence appendix\n${protectedDocument.content}`;
      const bytes = await render({ title: 'Root Document Draft', content }, { organisationName: evidence.organisation.name });
      return new Response(bytes, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="root-document-draft.pdf"', 'Cache-Control': 'no-store' } });
    } catch (error) {
      return Response.json({ error: 'Draft unavailable. Check access, reference expiry, supported text and confirmation. Request a fresh typed response if evidence changed.' }, { status: error instanceof HRCoachAccessError ? error.status : 400, headers: { 'Cache-Control': 'no-store' } });
    }
  };
}
