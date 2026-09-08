import { requireHRCoachOrganisationAccess, loadAuthorisedHRCoachEvidence, HRCoachAccessError } from './hrCoachServerAuth.js';
import { buildOrganisationContext } from './rootOrganisationContext.js';
import { buildOrganisationModelEvidence } from './organisationModelEvidence.js';
import { renderCorporateDocument } from './corporateDocumentPdf.js';
import { createHmac, createHash, timingSafeEqual } from 'node:crypto';

const signingKey = () => process.env.CORPORATE_DOCUMENT_SIGNING_SECRET || process.env.OPENAI_API_KEY;
const digest = document => createHash('sha256').update(JSON.stringify(document)).digest('hex');
const signature = (payload, key) => createHmac('sha256', key).update('root-corporate-document-v1:' + payload).digest();

export function createCorporateDocumentHandoff({ evidence, userId, key = signingKey(), now = Date.now() }) {
  if (!key || !userId) return null;
  const document = protectedCorporateDocument(evidence);
  const expiresAt = now + 15 * 60 * 1000;
  const payload = Buffer.from(JSON.stringify({ organisationId: evidence.organisation.id, userId, expiresAt, digest: digest(document) })).toString('base64url');
  return { ...document, expiresAt, reference: payload + '.' + signature(payload, key).toString('base64url') };
}

export function resolveCorporateDocument(body, evidence, access, key = signingKey(), now = Date.now()) {
  if (body?.confirmed !== true || !key || typeof body.reference !== 'string' || body.reference.length > 2000 ||
    Object.keys(body).some(field => !['confirmed', 'reference'].includes(field))) throw new Error('Trusted reference required');
  const [payload, signed, extra] = body.reference.split('.');
  if (!payload || !signed || extra) throw new Error('Invalid reference');
  const supplied = Buffer.from(signed, 'base64url');
  const expected = signature(payload, key);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) throw new Error('Invalid signature');
  const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  if (claims.userId !== access.user?.id || claims.organisationId !== access.organisationId || evidence?.organisation?.id !== access.organisationId ||
    !Number.isFinite(claims.expiresAt) || claims.expiresAt <= now) throw new Error('Expired or foreign reference');
  const document = protectedCorporateDocument(evidence);
  if (claims.digest !== digest(document)) throw new Error('Protected evidence changed; review a new document');
  return document;
}

// Only server-derived protected aggregates can establish exportable content.
// Do not accept client labels, prior dialogue, action notes or private narrative
// as evidence that an arbitrary draft is safe. No second privacy classifier.
export function protectedCorporateDocument(evidence) {
  if (!evidence?.organisation?.id) throw new Error('Authorised evidence required.');
  const review = buildOrganisationModelEvidence(evidence);
  return {
    title: 'Root protected organisational evidence',
    content: JSON.stringify({
      evidenceReviewed: review.evidenceReviewed,
      confidence: review.confidence,
      baselineLevels: review.observedEvidence,
      matchedLongitudinalChange: review.longitudinal,
      cautions: review.cautions,
    }, null, 2),
  };
}

export function validateCorporateDocument(body, evidence) {
  if (body?.confirmed !== true) throw new Error('Review and confirm the document first.');
  if (typeof body.title !== 'string' || !body.title.trim() || body.title.length > 200 || typeof body.content !== 'string' || !body.content.trim() || body.content.length > 30000) throw new Error('Provide a title and a document of at most 30,000 characters.');
  const document = protectedCorporateDocument(evidence);
  // Exact comparison preserves what the human reviewed. Never silently replace
  // an unsafe draft with a different report or export client-provided evidence.
  if (body.title !== document.title || body.content !== document.content) throw new Error('This draft cannot be established as protected organisational evidence.');
  return document;
}
export function createCorporateDocumentHandler({ authorise = requireHRCoachOrganisationAccess, loadEvidence = loadAuthorisedHRCoachEvidence, render = renderCorporateDocument, getSigningKey = signingKey } = {}) {
  return async request => {
    try {
      const organisationId = new URL(request.url).searchParams.get('organisation_id');
      const access = await authorise({ request, organisationId });
      const body = await request.json();
      const evidence = await loadEvidence({ supabase: access.supabase, organisationId: access.organisationId, buildSharedContext: buildOrganisationContext });
      if (evidence?.organisation?.id !== access.organisationId) throw new Error('Evidence scope mismatch.');
      const document = resolveCorporateDocument(body, evidence, access, getSigningKey());
      let bytes;
      try { bytes = await render(document); }
      catch { return Response.json({ error: 'Document could not be rendered. Use standard Latin text and remove unsupported symbols.' }, { status: 400 }); }
      return new Response(bytes, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="root-organisation-document.pdf"', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
    } catch (error) {
      const status = error instanceof HRCoachAccessError ? error.status : 400;
      return Response.json({ error: status === 401 || status === 403 ? 'Organisation admin or HR admin access required.' : 'Document unavailable: this reviewed draft cannot be verified against the current protected organisational evidence. Free-text export is not available.' }, { status, headers: { 'Cache-Control': 'no-store' } });
    }
  };
}
