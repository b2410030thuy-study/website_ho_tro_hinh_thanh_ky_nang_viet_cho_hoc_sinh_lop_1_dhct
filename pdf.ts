import {
  PDFDocument, rgb, LineCapStyle, pushGraphicsState, popGraphicsState,
  setTextRenderingMode, TextRenderingMode, setLineWidth, setLineDashPattern, setStrokingColor,
} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { layout, Cfg, El } from './worksheet';
import type { FontData } from './font';

const K = 72 / 25.4; // mm -> pt
const hex = (h: string) => rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);
const INK = rgb(0.07, 0.07, 0.07);

// PDF vector, khổ A4, nhúng font (subset) => đủ dấu tiếng Việt.
export async function buildPdf(cfg: Cfg, els: El[], font: FontData): Promise<Uint8Array> {
  const L = layout(cfg, els, font);
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit as any);
  const pf = await pdf.embedFont(font.bytes, { subset: true });
  pdf.setTitle(cfg.title || 'Phiếu tập viết');

  for (const prims of L.pages) {
    const page = pdf.addPage([L.pageW * K, L.pageH * K]);
    const Y = (mm: number) => (L.pageH - mm) * K;
    for (const p of prims) {
      if (p.t === 'line') {
        page.drawLine({
          start: { x: p.x1 * K, y: Y(p.y1) }, end: { x: p.x2 * K, y: Y(p.y2) },
          thickness: p.w * K, color: hex(p.c), dashArray: p.dash ? p.dash.map((d) => d * K) : undefined,
        });
      } else if (p.t === 'text') {
        if (p.mode === 'dotted') {
          page.pushOperators(
            pushGraphicsState(), setTextRenderingMode(TextRenderingMode.Outline),
            setLineWidth(0.25 * K), setLineDashPattern([0.35 * K, 0.7 * K], 0), setStrokingColor(INK),
          );
          page.drawText(p.s, { x: p.x * K, y: Y(p.y), size: p.size * K, font: pf, color: INK });
          page.pushOperators(popGraphicsState());
        } else {
          page.drawText(p.s, { x: p.x * K, y: Y(p.y), size: p.size * K, font: pf, color: INK, opacity: p.o });
        }
      } else {
        // hình nét: border tính theo đơn vị đường dẫn (đã bị scale) => quy đổi từ mm
        const u = 100 / p.size;
        const dotted = p.mode === 'dotted';
        page.drawSvgPath(p.d, {
          x: p.x * K, y: Y(p.y), scale: (p.size / 100) * K,
          borderColor: INK, borderWidth: 0.9 * u, borderOpacity: p.o, borderLineCap: LineCapStyle.Round,
          borderDashArray: dotted ? [0.01, 1.8 * u] : undefined,
        });
      }
    }
  }
  return pdf.save();
}
