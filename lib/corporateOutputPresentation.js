// Deterministic presentation only. Never establishes evidence authority.
const labels = { stress_score:'Stress', burnout_score:'Burnout', sleep_score:'Sleep', recovery_score:'Recovery', mood_score:'Mood', focus_score:'Focus' };
export function evidenceBlocks(content) {
  let data; try { data = JSON.parse(content); } catch { return [{kind:'paragraph',text:'Protected evidence preview unavailable. Request a fresh typed response.'}]; }
  if (!Array.isArray(data.baselineLevels) || !Array.isArray(data.matchedLongitudinalChange)) return [{kind:'paragraph',text:'Protected evidence preview unavailable. Request a fresh typed response.'}];
  const blocks = [{kind:'heading',text:'Protected organisational evidence'}, {kind:'paragraph',text:data.confidence?.status || 'Authorised aggregate evidence'}];
  for (const [key,title] of [['baselineCohort','Baseline evidence reviewed'],['matchedCohort','Matched evidence reviewed']]) {
    const value=data.evidenceReviewed?.[key];
    blocks.push({kind:'paragraph',text:`${title}: ${Number.isFinite(value) ? `${value} contributors` : 'unavailable for organisational interpretation; privacy protected'}.`});
  }
  for (const [key,title,value] of [['baselineLevels','Recorded baseline levels','mean'],['matchedLongitudinalChange','Matched change over time','change']]) {
    blocks.push({kind:'heading',text:title});
    for (const row of data[key]) if(labels[row.metric]) blocks.push({kind:'paragraph',text:row.suppressed !== false || !Number.isFinite(row[value]) ? `${labels[row.metric]}: unavailable for organisational interpretation; privacy protected.` : `${labels[row.metric]}: ${row[value]}${value==='mean'?' / 10':''}.${Number.isFinite(row.contributors)?` Released contributors: ${row.contributors}.`:''}`});
  }
  blocks.push({kind:'heading',text:'Limitations'},...(data.cautions || []).filter(x=>typeof x==='string').map(text=>({kind:'paragraph',text})));
  return blocks;
}
const plain = text => text.replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/\*\*([^*]+)\*\*|__([^_]+)__/g,(_,a,b)=>a||b).replace(/`([^`]+)`/g,'$1').replace(/\*([^*]+)\*/g,'$1');
export function documentBlocks(content) {
  return String(content || '').split(/\r?\n/).flatMap((raw,index)=> {
    const line=raw.trim(); if(!line || /^```/.test(line))return [];
    const heading=line.match(/^#{1,6}\s+(.+)$/), numbered=line.match(/^(\d+)[.)]\s+(.+)$/),bullet=line.match(/^[-*•]\s+(.+)$/);
    return [{kind:heading?'heading':numbered?'numbered':bullet?'bullet':'paragraph',text:plain(heading?.[1]||numbered?.[2]||bullet?.[1]||line),number:numbered?.[1],index}];
  });
}
export function editDocumentBlock(content, block, value) {
  const lines=content.split(/\r?\n/);lines[block.index]=(block.kind==='heading'?'## ':block.kind==='numbered'?`${block.number}. `:block.kind==='bullet'?'- ':'')+value;return lines.join('\n');
}
export function pdfPresentationBlocks(content) {
  const marker='Immutable protected evidence appendix\n';
  const at=content.lastIndexOf(marker);
  if(at>=0)return [...documentBlocks(content.slice(0,at)),...evidenceBlocks(content.slice(at+marker.length))];
  if(content.trim().startsWith('{'))return evidenceBlocks(content);
  return documentBlocks(content);
}
