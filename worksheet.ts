// Bố cục phiếu tập viết tính bằng MILIMET. Cả bản XEM TRƯỚC (SVG) và PDF dùng chung hàm layout() này
// nên hai bản giống hệt nhau.
import { STROKES } from '../data/content';
import type { FontData } from './font';

export type Mode = 'solid' | 'faded' | 'dotted' | 'blank';
export type Cfg = {
  orientation: 'portrait' | 'landscape';
  cellMm: number;        // cạnh 1 ô ly (mm) – chỉnh theo vở của trường
  bandCells: number;     // số ô ly của 1 dòng tập viết (5)
  baselineCells: number; // đường chuẩn nằm cách mép trên dòng bao nhiêu ô
  xHeightCells: number;  // chiều cao chữ thường không có nét khuyết (ô ly)
  marginMm: number;
  gapCells: number;      // khoảng cách giữa các dòng (ô)
  letterGapCells: number;// khoảng cách giữa các chữ (ô)
  fade: number;          // độ mờ 0.05–0.9 (độ đậm của chữ mờ)
  title: string; studentName: string; className: string; date: string; showHeader: boolean;
};
export type El = { id: string; kind: 'letters' | 'strokes' | 'text'; content: string; mode: Mode; lines: number; perLine: number };

export const DEFAULT_CFG: Cfg = {
  orientation: 'portrait', cellMm: 5, bandCells: 5, baselineCells: 4, xHeightCells: 2,
  marginMm: 12, gapCells: 0, letterGapCells: 1, fade: 0.3,
  title: 'Phiếu tập viết', studentName: '', className: '', date: '', showHeader: true,
};

export type Prim =
  | { t: 'line'; x1: number; y1: number; x2: number; y2: number; w: number; c: string; dash?: [number, number] }
  | { t: 'text'; x: number; y: number; size: number; s: string; mode: Mode; o: number }
  | { t: 'path'; x: number; y: number; size: number; d: string; mode: Mode; o: number };
export type Layout = { pageW: number; pageH: number; pages: Prim[][]; warnings: string[] };

export function layout(cfg: Cfg, els: El[], font: FontData | null): Layout {
  const A4 = { w: 210, h: 297 };
  const W = cfg.orientation === 'portrait' ? A4.w : A4.h;
  const H = cfg.orientation === 'portrait' ? A4.h : A4.w;
  const cell = Math.max(2, cfg.cellMm);
  const m = cfg.marginMm;
  const cols = Math.max(4, Math.floor((W - 2 * m) / cell));
  const gridW = cols * cell;
  const gx = (W - gridW) / 2;               // lưới luôn gồm các ô vuông nguyên
  const bandH = cfg.bandCells * cell;
  const gap = cfg.gapCells * cell;
  const warnings: string[] = [];

  // chữ thường (không nét khuyết) cao đúng xHeightCells ô ly: cỡ chữ = chiều cao ô / (x-height của font)
  const size = font ? (cfg.xHeightCells * cell) / (font.xh / font.upm) : cfg.xHeightCells * cell * 2;
  const measure = (s: string, sz: number) =>
    font ? (font.fk.layout(s).advanceWidth / font.upm) * sz : s.length * sz * 0.55;

  const pages: Prim[][] = [];
  let cur: Prim[] = [];
  let y = m;
  const newPage = () => { cur = []; pages.push(cur); y = m; };
  newPage();

  if (cfg.showHeader) {
    cur.push({ t: 'text', x: W / 2 - measure(cfg.title, 7) / 2, y: y + 7, size: 7, s: cfg.title, mode: 'solid', o: 1 });
    const info = `Họ và tên: ${cfg.studentName || '.............................'}    Lớp: ${cfg.className || '..........'}    Ngày: ${cfg.date || '..../..../........'}`;
    cur.push({ t: 'text', x: gx, y: y + 16, size: 4, s: info, mode: 'solid', o: 1 });
    y += 22;
  }

  const drawBand = (top: number) => {
    for (let k = 0; k <= cfg.bandCells; k++) {
      const yy = top + k * cell;
      const base = k === cfg.baselineCells;
      cur.push({ t: 'line', x1: gx, y1: yy, x2: gx + gridW, y2: yy, w: base ? 0.35 : 0.15, c: base ? '#1d4ed8' : '#93c5fd' });
    }
    const yx = top + (cfg.baselineCells - cfg.xHeightCells) * cell; // đường phụ
    cur.push({ t: 'line', x1: gx, y1: yx, x2: gx + gridW, y2: yx, w: 0.2, c: '#60a5fa', dash: [1.2, 0.8] });
    for (let c = 0; c <= cols; c++) {
      const xx = gx + c * cell;
      cur.push({ t: 'line', x1: xx, y1: top, x2: xx, y2: top + bandH, w: 0.1, c: '#bfdbfe' });
    }
  };

  const op = (mode: Mode) => (mode === 'faded' ? cfg.fade : 1);

  for (const el of els) {
    const tokens = el.content.trim().split(/\s+/).filter(Boolean);
    let rows: string[] = [];
    if (el.kind === 'text') {
      let rowStr = '';
      for (const w of tokens) {
        const t = rowStr ? rowStr + ' ' + w : w;
        if (rowStr && measure(t, size) > gridW - 2 * cell) { rows.push(rowStr); rowStr = w; } else rowStr = t;
      }
      if (rowStr) rows.push(rowStr);
    }
    for (let i = 0; i < Math.max(1, el.lines); i++) {
      if (y + bandH > H - m) newPage();
      const top = y;
      drawBand(top);
      const baseY = top + cfg.baselineCells * cell;
      const right = gx + gridW - cell * 0.5;

      if (el.mode !== 'blank' && tokens.length) {
        if (el.kind === 'text') {
          const s = rows[i % rows.length];
          if (measure(s, size) > gridW - cell) warnings.push(`"${s.slice(0, 20)}…" quá dài cho 1 dòng`);
          cur.push({ t: 'text', x: gx + cell, y: baseY, size, s, mode: el.mode, o: op(el.mode) });
        } else if (el.kind === 'letters') {
          let x = gx + cell, idx = 0, n = 0;
          while (idx < 500) {
            const s = tokens[idx % tokens.length];
            const w = measure(s, size);
            if (x + w > right) break;
            cur.push({ t: 'text', x, y: baseY, size, s, mode: el.mode, o: op(el.mode) });
            n++; idx++;
            if (el.perLine > 0 && n >= el.perLine) break;
            x += Math.max(cell, Math.ceil((w + cfg.letterGapCells * cell) / cell) * cell);
          }
        } else {
          const ids = tokens.map(Number).filter((id) => STROKES.some((s) => s.id === id));
          const box = Math.min(3, cfg.baselineCells) * cell; // hình nét cao 3 ô, đáy chạm đường chuẩn
          const pitch = Math.ceil((box + cfg.letterGapCells * cell) / cell) * cell;
          let x = gx + cell, idx = 0, n = 0;
          while (ids.length && idx < 500 && x + box <= right + 0.01) {
            const st = STROKES.find((s) => s.id === ids[idx % ids.length])!;
            cur.push({ t: 'path', x, y: baseY - box, size: box, d: st.d, mode: el.mode, o: op(el.mode) });
            n++; idx++;
            if (el.perLine > 0 && n >= el.perLine) break;
            x += pitch;
          }
        }
      }
      y += bandH + gap;
    }
  }
  return { pageW: W, pageH: H, pages, warnings: [...new Set(warnings)] };
}
