import { pdfPresentationBlocks } from './corporateOutputPresentation.js';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
// Branding is separate presentation metadata, supplied only by authorised server loaders.
// No URLs, external logos, or browser-provided organisation branding are consumed.
export async function renderCorporateDocument({ title, content }, branding = {}) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica), bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const green=rgb(.16,.33,.23), ink=rgb(.16,.22,.18), muted=rgb(.38,.43,.39), rule=rgb(.79,.84,.78);
  const organisationName=typeof branding.organisationName==='string'?branding.organisationName.trim():'';
  const protectedReport=title==='Root protected organisational evidence';
  const reportTitle=protectedReport?'Organisational Evidence Review':title;
  for(const text of (title+'\n'+content+'\n'+organisationName).split(/\r?\n/))font.encodeText(text);
  let logo;
  try { logo=await pdf.embedPng(await readFile(path.join(process.cwd(),'public','root-logo.png'))); } catch { /* Restrained wordmark remains if the local asset is unavailable. */ }
  const wrap=(text,size,face)=>{
    const lines=[];let line='';
    for(const word of text.split(/\s+/)) {
      if(line && face.widthOfTextAtSize(line+' '+word,size)>499){lines.push(line);line='';}
      for(const char of (line?' ':'')+word) {if(face.widthOfTextAtSize(line+char,size)>499){lines.push(line);line='';}line+=char;}
    }
    if(line)lines.push(line);return lines;
  };
  let page,y;
  const nextPage=()=>{
    page=pdf.addPage([595.28,841.89]);y=729;
    if(logo)page.drawImage(logo,{x:48,y:775,width:34,height:34});
    page.drawText('ROOT',{x:logo?94:48,y:792,size:18,font:bold,color:green});
    page.drawText('WORKPLACE',{x:logo?94:48,y:776,size:8,font,color:muted});
    page.drawLine({start:{x:48,y:760},end:{x:547,y:760},thickness:1.2,color:green});
    page.drawLine({start:{x:48,y:46},end:{x:547,y:46},thickness:.5,color:rule});
    page.drawText(protectedReport?'Root-generated | Protected organisational evidence':'Root | Reviewed narrative with protected evidence appendix',{x:48,y:31,size:8,font,color:muted});
  };
  const paragraph=(text,size=11,face=font,color=ink)=>{
    for(const line of wrap(text,size,face)){if(y<size+65)nextPage();page.drawText(line,{x:48,y,size,font:face,color});y-=size+6;}
  };
  nextPage();paragraph(reportTitle,25,bold,green);y-=10;
  if(organisationName){paragraph('Prepared for '+organisationName,12,font,muted);y-=12;}
  const blocks=pdfPresentationBlocks(content);
  let sectionGap=8;
  for(const [index,block] of blocks.entries()){
    if(block.kind==='heading'){
      sectionGap=8;
      const tail=blocks.slice(index);
      const smallFinalSection=tail.slice(1).every(item=>item.kind!=='heading');
      const height=smallFinalSection ? 9+tail.reduce((total,item)=>total+wrap(item.text,item.kind==='heading'?14:11,item.kind==='heading'?bold:font).length*(item.kind==='heading'?20:17)+8,0) : Infinity;
      // Keep a short final section together. Tighten only its paragraph gaps
      // when that safely avoids a new page; otherwise move its heading too.
      if(height<=180 && y<height+51){
        if(y>=height-4*tail.length+51)sectionGap=4;
        else nextPage();
      }
      const required=wrap(block.text,14,bold).length*20+48;
      if(height>180 && y<required+65)nextPage();
      y-=9;page.drawLine({start:{x:48,y:y+18},end:{x:547,y:y+18},thickness:.5,color:rule});
      paragraph(block.text,14,bold,green);
    }else paragraph((block.kind==='numbered'?block.number+'. ':block.kind==='bullet'?'• ':'')+block.text);
    y-=sectionGap;
  }
  const pages=pdf.getPages();pages.forEach((sheet,index)=>sheet.drawText(`${index+1} / ${pages.length}`,{x:515,y:31,size:8,font,color:muted}));
  return pdf.save();
}
