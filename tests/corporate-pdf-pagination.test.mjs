import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PDFDocument } from 'pdf-lib';
import { renderCorporateDocument } from '../lib/corporateDocumentPdf.js';
const ending='## Evidence limitations\nWellbeing levels and change over time are unavailable for organisational interpretation because the evidence is privacy protected. No causal conclusions should be drawn.\nNo causal conclusions; small cohorts are suppressed.';
test('short trailing limitations fit safely without an almost-empty second page',async()=>{
 const content='Document title: Organisation document draft\n'+'Reviewed organisational narrative.\n'.repeat(18)+'Recorded organisational context is retained for human review. '.repeat(4)+'\n'+ending;
 const pdf=await PDFDocument.load(await renderCorporateDocument({title:'Root Document Draft',content}));assert.equal(pdf.getPageCount(),1);
});
test('genuinely long documents remain multi-page',async()=>{
 const pdf=await PDFDocument.load(await renderCorporateDocument({title:'Root Document Draft',content:'Reviewed organisational narrative.\n'.repeat(65)+ending}));assert.ok(pdf.getPageCount()>=3);
});
test('draft PDF uses neutral title wording without asserting user provenance',async()=>{
 const source=await readFile(new URL('../lib/corporateDocumentDraft.js',import.meta.url),'utf8');assert.match(source,/Document title: \$\{body.title\}/);assert.doesNotMatch(source,/Title supplied by the user/);
});
