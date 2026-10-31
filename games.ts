import { LETTERS, STROKES, strokeById } from '../data/content';

export type Opt = { key: string; label?: string; strokeId?: number };
export type Q = {
  mode: 'single' | 'multi' | 'seq';
  prompt: string; big?: string; strokeBig?: number; speak?: string;
  options: Opt[]; answer: string[]; hint: string;
};
export type GameCtx = { related: Record<string, number[]> }; // letterId -> stroke ids (do giáo viên nhập)

const shuffle = <T,>(a: T[]) => [...a].sort(() => Math.random() - 0.5);
const one = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

const strokeNameQ = (): Q => {
  const s = one(STROKES);
  const opts = shuffle([s, ...shuffle(STROKES.filter((x) => x.id !== s.id)).slice(0, 3)]);
  return { mode: 'single', prompt: 'Đây là nét gì?', strokeBig: s.id, options: opts.map((o) => ({ key: String(o.id), label: o.name })), answer: [String(s.id)], hint: 'Nhìn kỹ hình nét nhé!' };
};
const strokePicQ = (): Q => {
  const s = one(STROKES);
  const opts = shuffle([s, ...shuffle(STROKES.filter((x) => x.id !== s.id)).slice(0, 3)]);
  return { mode: 'single', prompt: `Chọn hình: ${s.name}`, options: opts.map((o) => ({ key: String(o.id), strokeId: o.id })), answer: [String(s.id)], hint: 'Nhớ lại video của nét này nhé!' };
};
const findLetterQ = (): Q => {
  const l = one(LETTERS);
  const opts = shuffle([l, ...shuffle(LETTERS.filter((x) => x.id !== l.id)).slice(0, 7)]);
  return { mode: 'single', prompt: `Tìm chữ "${l.ch}"`, big: l.ch, options: opts.map((o) => ({ key: o.id, label: o.ch })), answer: [l.id], hint: 'Chữ cần tìm là chữ to ở trên.' };
};
const upperLowerQ = (): Q => {
  const l = one(LETTERS);
  const opts = shuffle([l, ...shuffle(LETTERS.filter((x) => x.id !== l.id)).slice(0, 3)]);
  return { mode: 'single', prompt: 'Chữ in hoa này, chữ thường là chữ nào?', big: l.upper, options: opts.map((o) => ({ key: o.id, label: o.ch })), answer: [l.id], hint: 'Chữ in hoa và chữ thường có hình dạng gần giống nhau.' };
};
const listenQ = (): Q => {
  const l = one(LETTERS);
  const opts = shuffle([l, ...shuffle(LETTERS.filter((x) => x.id !== l.id)).slice(0, 3)]);
  return { mode: 'single', prompt: 'Nghe và chọn chữ đúng', speak: `chữ ${l.ch}`, options: opts.map((o) => ({ key: o.id, label: o.ch })), answer: [l.id], hint: 'Bấm nút loa để nghe lại.' };
};

const withMap = (ctx: GameCtx) => LETTERS.filter((l) => (ctx.related[l.id] || []).length > 0);

const multiQ = (ctx: GameCtx): Q | null => {
  const ls = withMap(ctx); if (!ls.length) return null;
  const l = one(ls); const ids = [...new Set(ctx.related[l.id])];
  const others = shuffle(STROKES.filter((s) => !ids.includes(s.id))).slice(0, Math.max(2, 6 - ids.length));
  return { mode: 'multi', prompt: `Chọn các nét tạo nên chữ "${l.ch}"`, big: l.ch, options: shuffle([...ids, ...others.map((s) => s.id)]).map((id) => ({ key: String(id), strokeId: id })), answer: ids.map(String), hint: 'Xem lại phần ghi chú cấu tạo chữ nhé!' };
};
const seqQ = (ctx: GameCtx): Q | null => {
  const ls = withMap(ctx); if (!ls.length) return null;
  const l = one(ls); const ids = ctx.related[l.id];
  return { mode: 'seq', prompt: `Bấm các nét theo thứ tự để tạo chữ "${l.ch}"`, big: l.ch, options: shuffle(ids.map((id, i) => ({ key: String(i), strokeId: id }))), answer: ids.map(String), hint: 'Nét nào viết trước thì bấm trước.' };
};
const inLetterQ = (ctx: GameCtx): Q | null => {
  const ls = withMap(ctx); if (!ls.length) return null;
  const l = one(ls); const ids = ctx.related[l.id]; const right = one(ids);
  const wrong = shuffle(STROKES.filter((s) => !ids.includes(s.id))).slice(0, 3).map((s) => s.id);
  return { mode: 'single', prompt: `Chữ "${l.ch}" có nét nào?`, big: l.ch, options: shuffle([right, ...wrong]).map((id) => ({ key: String(id), strokeId: id })), answer: [String(right)], hint: 'Xem lại ghi chú cấu tạo chữ.' };
};

export type GameDef = { id: string; icon: string; total: number; needsMap?: boolean; make: (ctx: GameCtx) => Q | null };
export const GAME_DEFS: GameDef[] = [
  { id: 'ghep-net', icon: '🧩', total: 5, needsMap: true, make: multiQ },
  { id: 'chon-ten-net', icon: '🏷️', total: 5, make: strokeNameQ },
  { id: 'tim-chu-cai', icon: '🔎', total: 5, make: findLetterQ },
  { id: 'chon-chu-dung', icon: '🔠', total: 5, make: upperLowerQ },
  { id: 'sap-xep-net', icon: '🔢', total: 5, needsMap: true, make: seqQ },
  { id: 'nghe-chon-chu', icon: '👂', total: 5, make: listenQ },
  { id: 'tim-net-trong-chu', icon: '🕵️', total: 5, needsMap: true, make: inLetterQ },
  { id: 'chon-hinh-net', icon: '🖼️', total: 5, make: strokePicQ },
  { id: 'on-tap-net', icon: '📘', total: 10, make: (c) => one([strokeNameQ, strokePicQ, () => inLetterQ(c) || strokeNameQ()])() },
  { id: 'on-tap-chu', icon: '📗', total: 10, make: () => one([findLetterQ, upperLowerQ, listenQ])() },
];
export { strokeById };
