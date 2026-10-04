import { PDFDocument } from "pdf-lib";
import fontkit from '@pdf-lib/fontkit';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
// Retain the font notice in the traced server package and embedded PDF metadata.
const fontLicense = readFileSync(join(process.cwd(),'lib/assets/introducer-agreement-fonts/LICENSE'),'utf8');
const fontFiles = [
  readFileSync(join(process.cwd(),'lib/assets/introducer-agreement-fonts/latin.woff')),
  readFileSync(join(process.cwd(),'lib/assets/introducer-agreement-fonts/latin-ext.woff')),
  readFileSync(join(process.cwd(),'lib/assets/introducer-agreement-fonts/greek.woff')),
  readFileSync(join(process.cwd(),'lib/assets/introducer-agreement-fonts/cyrillic.woff')),
];
const characterSets = fontFiles.map(bytes => new Set(fontkit.create(bytes).characterSet));
function fontIndex(character) {
  const index = characterSets.findIndex(set => set.has(character.codePointAt(0)));
  if (index < 0) throw new Error('The PDF font cannot represent a character in these terms or accepting details. Ask Root to arrange a supported archive before accepting.');
  return index;
}
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])]));
  return value;
}

export function contractContent(acceptance) {
  return JSON.stringify(canonical({
    id: acceptance.id, introducer_id: acceptance.introducer_id,
    version: acceptance.version, agreement_text: acceptance.agreement_text,
    terms: acceptance.terms, accepting_name: acceptance.accepting_name,
    accepting_capacity: acceptance.accepting_capacity, verified_email: acceptance.verified_email,
    account_id: acceptance.account_id, accepted_at: acceptance.accepted_at,
    acceptance_version: acceptance.acceptance_version, acceptance_text: acceptance.acceptance_text,
    agreed: acceptance.agreed, authority_confirmed: acceptance.authority_confirmed,
    agreement_confirmation_text: acceptance.agreement_confirmation_text,
    authority_confirmation_text: acceptance.authority_confirmation_text,
  }));
}

export async function agreementPdf(a) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  pdf.setCreationDate(new Date(a.accepted_at));
  pdf.setModificationDate(new Date(a.accepted_at));
  pdf.setTitle(`Root Introducer Agreement ${a.id}`);
  pdf.setSubject(`Embedded Noto Sans font licence:\n${fontLicense}`);
  const fonts = await Promise.all(fontFiles.map(bytes=>pdf.embedFont(bytes,{subset:true})));
  let page, y;
  const newPage = () => { page = pdf.addPage([595, 842]); y = 794; };
  newPage();
  const text = `${a.agreement_text}\n\nCOMMERCIAL TERMS\n${Object.entries(canonical(a.terms)).map(([k,v])=>`${k.replaceAll('_',' ')}: ${v ?? 'Not specified'}`).join('\n')}\n\nELECTRONIC ACCEPTANCE\n${a.acceptance_text}\n\nAccepted by: ${a.accepting_name}\nRole/capacity: ${a.accepting_capacity}\nVerified email: ${a.verified_email}\nAccepted at (UTC): ${a.accepted_at}\nAgreement version: ${a.version}\nAcceptance wording version: ${a.acceptance_version}\nAcceptance ID: ${a.id}\nBoth required confirmations: accepted`;
  const drawLine = line => {
    if (y < 48) newPage();
    let x=48, run='', index=0;
    const drawRun=()=>{if(run){page.drawText(run,{x,y,font:fonts[index],size:10});x+=fonts[index].widthOfTextAtSize(run,10);run='';}};
    for(const character of line){const next=fontIndex(character);if(next!==index){drawRun();index=next;}run+=character;}
    drawRun();y-=15;
  };
  for (const paragraph of text.split('\n')) {
    if (paragraph === 'ELECTRONIC ACCEPTANCE' && y < 350) newPage();
    let line = '', width = 0;
    // Wrap words normally; split long identifiers only when a whole word exceeds a line.
    for (const word of paragraph.match(/\S+\s*|\s+/gu) || []) {
      const wordWidth=[...word].reduce((sum,c)=>sum+fonts[fontIndex(c)].widthOfTextAtSize(c,10),0);
      if(line && width+wordWidth>499){drawLine(line);line='';width=0;}
      for (const character of word) {
      const charWidth=fonts[fontIndex(character)].widthOfTextAtSize(character,10);
      if (width + charWidth > 499) {
        drawLine(line); line = ''; width=0;
      }
      line += character;
      width += charWidth;
      }
    }
    drawLine(line);
  }
  for(const confirmation of [a.agreement_confirmation_text,a.authority_confirmation_text].filter(Boolean)) {
    let line='';
    for(const word of confirmation.split(' ')) {
      const next=line ? line+' '+word : word;
      if(fonts[0].widthOfTextAtSize(next,10)>499){drawLine(line);line=word;}else line=next;
    }
    drawLine(line);drawLine('');
  }
  pdf.getPages().forEach((page,index)=>page.drawText(`Root Health App | Accepted agreement | Page ${index+1} of ${pdf.getPageCount()}`,
    {x:48,y:25,font:fonts[0],size:8}));
  return pdf.save({ useObjectStreams: false });
}
