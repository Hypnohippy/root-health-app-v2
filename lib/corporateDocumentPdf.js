import { pdfPresentationBlocks } from './corporateOutputPresentation.js';
// Reuses the pdf-lib framework and cream/green/Helvetica styling of Root's
// commercial document renderer, without its service-role/remittance access path.
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
export async function renderCorporateDocument({ title, content }) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  // Fail explicitly for unsupported characters rather than silently changing text.
  for (const text of (title + '\n' + content).split(/\r?\n/)) font.encodeText(text);
  let page, y;
  const nextPage = () => {
    page = pdf.addPage([595.28, 841.89]); y = 756;
    page.drawRectangle({ x: 0, y: 790, width: 596, height: 52, color: rgb(.97, .95, .91) });
    page.drawText('ROOT | Organisation working document', { x: 45, y: 808, size: 11, font: bold, color: rgb(.09, .18, .12) });
    page.drawText(`Human-reviewed draft | ${pdf.getPageCount()}`, { x: 45, y: 25, size: 9, font, color: rgb(.38, .45, .39) });
  };
  nextPage();
  const line = (text, size, face) => {
    if (y < 60) nextPage();
    page.drawText(text, { x: 45, y, size, font: face, color: rgb(.09, .18, .12) }); y -= size + 6;
  };
  const paragraph = (text, size, face) => {
    let buffer = '';
    for (const character of text) {
      if (face.widthOfTextAtSize(buffer + character, size) > 505) { line(buffer, size, face); buffer = ''; }
      buffer += character;
    }
    line(buffer, size, face);
  };
  paragraph(title, 18, bold); y -= 10;
  for (const block of pdfPresentationBlocks(content)) {
    if (block.kind === 'heading') y -= 8;
    paragraph((block.kind === 'numbered' ? block.number + '. ' : block.kind === 'bullet' ? '• ' : '') + block.text, block.kind === 'heading' ? 14 : 11, block.kind === 'heading' ? bold : font);
    y -= 5;
  }
  return pdf.save();
}
