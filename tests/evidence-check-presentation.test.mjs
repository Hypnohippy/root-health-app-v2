import test from 'node:test';
import assert from 'node:assert/strict';
import { evidenceCheckSummary } from '../lib/evidenceCheckPresentation.js';
import { pdfPresentationBlocks } from '../lib/corporateOutputPresentation.js';
import { prepareActionReview } from '../lib/actionReviewDraft.js';
const content='The evidence shows that nine out of ten recorded active workforce people have not yet been invited.\n\n## Recommended action: Increase invitation coverage\n\n### Why this matters\nNine out of ten recorded active workforce people have not yet been invited.\n\n### Intended outcome\nIncrease invitation coverage and create a stronger basis for measuring participation.\n\n### Measure of success\nInvitation coverage increases from the current recorded level.';
test('explicit concise action and labelled supported intent prefill without invented fields',()=>{
 const draft=prepareActionReview({content});
 assert.equal(draft.title,'Increase invitation coverage');assert.match(draft.rationale,/Nine out of ten/);assert.equal(draft.expected_outcome,'Increase invitation coverage and create a stronger basis for measuring participation.');assert.equal(draft.success_measure,'Invitation coverage increases from the current recorded level.');
 assert.equal(draft.evidence_summary,'');assert.equal(draft.owner,'');assert.equal(draft.status,'planned');assert.equal(draft.start_date,null);assert.equal(draft.review_date,null);
 assert.equal(prepareActionReview({content:'## Recommendation\n\nIncrease invitation coverage\n\nSupporting discussion.'}).title,'Increase invitation coverage');
 assert.equal(prepareActionReview({content:'## Increase invitation coverage\n\nSome supporting evidence.'}).title,'Increase invitation coverage');
 assert.equal(prepareActionReview({content:'The evidence shows nine out of ten people.'}).title,'Organisation action');
});
test('uncheckable narrative is not presented as a verified document or contradiction-free evidence',()=>{
 const result=evidenceCheckSummary({claims:Array.from({length:6},()=>({status:'not_checked',text:'PRIVATE_EXCERPT'}))});
 assert.equal(result.title,'Evidence check complete');assert.match(result.messages.join(' '),/6 narrative statements/);assert.match(result.messages.join(' '),/No statements could be automatically verified/);assert.doesNotMatch(JSON.stringify(result),/No contradictions|PRIVATE_EXCERPT|Statement 1/);
});
test('matched and mismatched summaries preserve the narrow scope and disclose no hidden values',()=>{
 const success=evidenceCheckSummary({claims:[{status:'matches_released_evidence'},{status:'not_checked'}]});assert.match(success.messages.join(' '),/No contradictions were found in the statements Root can verify/);assert.match(success.messages.join(' '),/1 narrative statement/);
 const failure=evidenceCheckSummary({claims:[{status:'does_not_match_released_evidence',text:'PRIVATE_EXCERPT',expected:9},{status:'unavailable_for_interpretation',text:'SECRET'}]});assert.equal(failure.attention,true);assert.equal(failure.title,'Evidence check needs your attention');assert.doesNotMatch(JSON.stringify(failure),/PRIVATE_EXCERPT|SECRET|\b9\b/);
});
test('PDF recheck presentation replaces numbered internal statuses with the same scoped summary',()=>{
 const content='User-edited narrative\nA proposed action.\n\nDeterministic recheck\nOnly exact statements checked.\nStatement 1: not_checked\nStatement 2: unavailable_for_interpretation\n\nImmutable protected evidence appendix\n'+JSON.stringify({baselineLevels:[],matchedLongitudinalChange:[]});
 const text=pdfPresentationBlocks(content).map(b=>b.text).join('\n');assert.match(text,/Evidence check complete/);assert.match(text,/1 narrative statement/);assert.doesNotMatch(text,/Statement \d+:|not_checked|unavailable_for_interpretation/);
});
