"use client";
import { documentBlocks, evidenceBlocks } from '../lib/corporateOutputPresentation.js';
export default function CorporateDocumentPreview({ content, evidence = false }) {
  const blocks=evidence?evidenceBlocks(content):documentBlocks(content);
  return <div className="root-document-preview">{blocks.map((block,index)=>block.kind==='heading'?<h3 key={index}>{block.text}</h3>:<p key={index}>{block.kind==='numbered'?`${block.number}. `:block.kind==='bullet'?'• ':''}{block.text}</p>)}</div>;
}
