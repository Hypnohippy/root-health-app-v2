import { evidenceCheckSummary } from './evidenceCheckPresentation.js';
// Deterministic presentation only. Never establishes evidence authority.
const labels = { stress_score:'Stress', burnout_score:'Burnout', sleep_score:'Sleep', recovery_score:'Recovery', mood_score:'Mood', focus_score:'Focus' };
export function evidenceBlocks(content) {
  let data; try { data = JSON.parse(content); } catch { return [{kind:'paragraph',text:'Protected evidence preview unavailable. Request a fresh typed response.'}]; }
  if (!Array.isArray(data.baselineLevels) || !Array.isArray(data.matchedLongitudinalChange)) return [{kind:'paragraph',text:'Protected evidence preview unavailable. Request a fresh typed response.'}];
  const blocks = [{kind:'heading',text:'Protected organisational evidence'}, {kind:'paragraph',text:data.confidence?.status || 'Authorised aggregate evidence'}];
  const groups=[['baselineLevels','Recorded baseline levels','mean'],['matchedLongitudinalChange','Matched change over time','change']];
  const entirelyProtected=groups.every(([key])=>data[key].length>0 && data[key].every(row=>row.suppressed===true));
  if(entirelyProtected) {
    blocks.push({kind:'heading',text:'Protected wellbeing evidence'},{kind:'paragraph',text:'Individual wellbeing measures are not reported because the available cohort does not meet Root’s privacy threshold. No individual or inferential values are disclosed.'});
  } else {
    for(const [key,title] of [['baselineCohort','Baseline evidence reviewed'],['matchedCohort','Matched evidence reviewed']]) {
      const value=data.evidenceReviewed?.[key];if(Number.isFinite(value))blocks.push({kind:'paragraph',text:title+': '+value+' contributors.'});
    }
    for(const [key,title,value] of groups) {
      blocks.push({kind:'heading',text:title});
      const protectedLabels=[];
      for(const row of data[key]) if(labels[row.metric]) {
        if(row.suppressed===true)protectedLabels.push(labels[row.metric]);
        else if(row.suppressed===false && Number.isFinite(row[value]))blocks.push({kind:'paragraph',text:labels[row.metric]+': '+row[value]+(value==='mean'?' / 10':'')+'.'+(Number.isFinite(row.contributors)?' Released contributors: '+row.contributors+'.':'')});
        else blocks.push({kind:'paragraph',text:labels[row.metric]+': evidence unavailable for organisational interpretation.'});
      }
      if(protectedLabels.length)blocks.push({kind:'paragraph',text:protectedLabels.join(', ')+': evidence unavailable for organisational interpretation because the privacy threshold is not met. No individual or inferential values are disclosed.'});
    }
  }
  blocks.push({kind:'heading',text:'Evidence limitations'});
  if(entirelyProtected)blocks.push({kind:'paragraph',text:'Wellbeing levels and change over time are unavailable for organisational interpretation because the evidence is privacy protected. No causal conclusions should be drawn.'});
  blocks.push(...(data.cautions || []).filter(x=>typeof x==='string').map(text=>({kind:'paragraph',text})));
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
  // The server still emits its unchanged recheck record; format that record only.
  if(at>=0) {
    const prefix=content.slice(0,at), checkAt=prefix.lastIndexOf('Deterministic recheck\n');
    if(checkAt>=0) {
      const claims=[...prefix.slice(checkAt).matchAll(/^Statement \d+: (matches_released_evidence|does_not_match_released_evidence|unavailable_for_interpretation|not_checked)$/gm)].map(match=>({status:match[1]}));
      const summary=evidenceCheckSummary({claims});
      return [...documentBlocks(prefix.slice(0,checkAt)),{kind:'heading',text:summary.title},...summary.messages.map(text=>({kind:'paragraph',text})),...evidenceBlocks(content.slice(at+marker.length))];
    }
  }
  if(at>=0)return [...documentBlocks(content.slice(0,at)),...evidenceBlocks(content.slice(at+marker.length))];
  if(content.trim().startsWith('{'))return evidenceBlocks(content);
  return documentBlocks(content);
}
