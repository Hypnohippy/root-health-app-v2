import { createClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';
import { agreementPdf, contractContent } from './introducerAgreementPdf.js';

export const hash = value => createHash('sha256').update(value).digest('hex');
export const privateHeaders = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' };
export function privateJson(body, status = 200) {
  return Response.json(body, { status, headers: privateHeaders });
}
export async function verifiedAgreementUser(auth, token, adminEmails) {
  const { data, error } = await auth.auth.getUser(token);
  const user = data?.user;
  if (error || !user?.email_confirmed_at || !user.email) throw new Error('Verified sign-in required');
  return { user, isAdmin: adminEmails.includes(user.email.toLowerCase()) };
}
export async function agreementAccess(request, admin = false) {
  const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
  if (!token) throw new Error('Verified sign-in required');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const auth = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { user, isAdmin } = await verifiedAgreementUser(auth, token,
    String(process.env.ROOT_ADMIN_EMAIL || '').toLowerCase().split(',').map(s=>s.trim()).filter(Boolean));
  if (admin && !isAdmin) throw new Error('Root administrator required');
  const db = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  return { db, user, isAdmin };
}
export async function result(query) {
  const { data, error } = await query;
  if (error) throw new Error('Agreement operation unavailable');
  return data;
}
export async function ownedAcceptance(db, user, isAdmin, id) {
  const a = await result(db.from('introducer_agreement_acceptances').select('*').eq('id', id).maybeSingle());
  if (!a || (!isAdmin && a.account_id !== user.id)) throw new Error('Agreement unavailable');
  return a;
}
export async function archiveAcceptance(db, a) {
  const existing = await result(db.from('introducer_agreement_archives').select('*').eq('acceptance_id', a.id).maybeSingle());
  if (existing) return existing;
  const bytes = await agreementPdf(a);
  const pdfHash = hash(bytes);
  const path = `introducer-agreements/${a.introducer_id}/${a.id}.pdf`;
  const bucket = db.storage.from('introducer-agreements');
  const upload = await bucket.upload(path, bytes, { contentType: 'application/pdf', upsert: false });
  if (upload.error) {
    // A previous upload may have succeeded before the database acknowledgement failed.
    const download = await bucket.download(path);
    if (download.error || hash(Buffer.from(await download.data.arrayBuffer())) !== pdfHash) throw new Error('Archive pending; retry required');
  }
  await result(db.rpc('complete_introducer_agreement', {
    p_acceptance: a.id, p_path: path, p_content_hash: hash(contractContent(a)), p_pdf_hash: pdfHash,
  }));
  return { acceptance_id: a.id, storage_path: path, pdf_hash: pdfHash };
}
