import { createHash } from 'node:crypto';

export const MASTER_DOCUMENT_ID = '1ifYSbwF8LCraPb57D4Z0wJhne5HGX8pYFSf2q4q6ZCA';
export const hash = value => createHash('sha256').update(value).digest('hex');
export const termsHash = terms => hash(JSON.stringify(Object.fromEntries(Object.entries(terms).sort(([a],[b])=>a.localeCompare(b)))));
export const emailValid = value => /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value || '');
export function agreementTerms(introducer, policies, specialTerms = 'None', now = new Date()) {
  const policy = [...policies].filter(p => new Date(p.effective_from) <= now &&
    (!p.effective_until || new Date(p.effective_until) > now))
    .sort((a,b)=>new Date(b.effective_from)-new Date(a.effective_from))[0];
  if (!policy) throw new Error('An effective commercial policy is required.');
  const terms = {
    introducer_name: String(introducer.name || '').trim(),
    contact_name: String(introducer.contact_name || introducer.name || '').trim(),
    contact_email: String(introducer.contact_email || '').trim().toLowerCase(),
    market: introducer.introducer_market, introducer_type: introducer.introducer_type,
    referral_code: introducer.referral_code, commission_percent: Number(policy.commission_percent),
    commission_structure: policy.commission_structure, commission_basis: policy.commission_basis,
    vat_registered: Boolean(introducer.vat_registered), vat_number: introducer.vat_number || '',
    agreement_start: introducer.agreement_start_date || '', agreement_end: introducer.agreement_end_date || '',
    special_terms: String(specialTerms || 'None').trim() || 'None',
  };
  if (!terms.introducer_name || !emailValid(terms.contact_email)) throw new Error('A name and valid stored contact email are required.');
  if (!Number.isFinite(terms.commission_percent) || terms.commission_percent < 0 || terms.commission_percent > 100 ||
    !['one_off','recurring'].includes(terms.commission_structure) || terms.commission_basis !== 'collected_subscription_revenue' ||
    !['corporate','personal','both'].includes(terms.market)) throw new Error('Unsupported commercial terms.');
  if (terms.special_terms.length > 5000 || Object.values(terms).some(v=>typeof v==='string' && /\{\{|\}\}|[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v)))
    throw new Error('Agreement fields contain unsupported text.');
  return terms;
}
const title = value => String(value).split('_').map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(' ');
export function replacements(t) {
  return {
    INTRODUCER_NAME:t.introducer_name, CONTACT_NAME:t.contact_name, CONTACT_EMAIL:t.contact_email,
    MARKET:title(t.market), INTRODUCER_TYPE:title(t.introducer_type), REFERRAL_CODE:t.referral_code,
    COMMISSION_PERCENT:String(t.commission_percent), COMMISSION_STRUCTURE:t.commission_structure==='one_off'?'One-off':'Recurring',
    COMMISSION_BASIS:'Collected subscription revenue', VAT_STATUS:t.vat_registered?'Yes':'No', VAT_NUMBER:t.vat_number || 'Not applicable',
    AGREEMENT_START:t.agreement_start || 'Not specified', AGREEMENT_END:t.agreement_end || 'Open-ended', SPECIAL_TERMS:t.special_terms,
  };
}
export function documentText(document) {
  const parts=[];
  function visit(node) {
    if (!node || typeof node !== 'object') return;
    if (node.textRun?.content) parts.push(node.textRun.content);
    for (const [key,value] of Object.entries(node)) if(key!=='textRun') {
      if(Array.isArray(value)) value.forEach(visit); else visit(value);
    }
  }
  // With includeTabsContent, bodies live under tabs; do not count the legacy body twice.
  visit(document.tabs?.length ? document.tabs : document);
  return parts.join('');
}
export function validateTemplate(document, values) {
  const text=documentText(document);
  for(const key of Object.keys(values)) if(!text.includes(`{{${key}}}`)) throw new Error(`Master template is missing {{${key}}}.`);
  for(const token of text.match(/\{\{[^{}]+\}\}/g) || []) if(!(token.slice(2,-2) in values)) throw new Error('Master contains an unsupported placeholder.');
}
export function validateMerged(document) {
  if(/\{\{|\}\}/.test(documentText(document))) throw new Error('The agreement still contains unresolved placeholders.');
}
