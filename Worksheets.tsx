import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../auth';
import { useContent } from '../../hooks/useContent';
import { loadFontFromUrl, parseFont, FontData } from '../../lib/font';
import { layout, DEFAULT_CFG, Cfg, El, Mode } from '../../lib/worksheet';
import { buildPdf } from '../../lib/pdf';
import { LETTERS, STROKES } from '../../data/content';
import { Card, Notice } from '../../components/Common';

let uid = 0;
const mk = (p: Partial<El> = {}): El => ({ id: 'e' + ++uid, kind: 'letters', content: 'a', mode: 'faded', lines: 2, perLine: 0, ...p });

const TEMPLATES: Record<string, () => { title: string; els: El[] }> = {
  'Luyện 14 nét': () => ({ title: 'Luyện 14 nét cơ bản', els: STROKES.map((s) => mk({ kind: 'strokes', content: String(s.id), mode: 'faded', lines: 1 })) }),
  'Luyện 29 chữ': () => ({ title: 'Luyện 29 chữ cái', els: LETTERS.map((l) => mk({ kind: 'letters', content: l.ch, mode: 'faded', lines: 1 })) }),
  'Luyện nhóm chữ': () => ({ title: 'Luyện nhóm chữ', els: [mk({ content: 'a ă â', mode: 'solid', lines: 1 }), mk({ content: 'a ă â', mode: 'faded', lines: 2 }), mk({ content: 'a ă â', mode: 'dotted', lines: 2 }), mk({ content: 'a ă â', mode: 'blank', lines: 2 })] }),
  'Luyện từ': () => ({ title: 'Luyện viết từ', els: [mk({ kind: 'text', content: 'bà bé', mode: 'solid', lines: 1 }), mk({ kind: 'text', content: 'bà bé', mode: 'faded', lines: 2 }), mk({ kind: 'text', content: 'bà bé', mode: 'blank', lines: 2 })] }),
  'Luyện câu': () => ({ title: 'Luyện viết câu', els: [mk({ kind: 'text', content: 'Bé tập viết chữ đẹp.', mode: 'solid', lines: 1 }), mk({ kind: 'text', content: 'Bé tập viết chữ đẹp.', mode: 'dotted', lines: 2 }), mk({ kind: 'text', content: 'Bé tập viết chữ đẹp.', mode: 'blank', lines: 2 })] }),
};
const MODES: [Mode, string][] = [['solid', 'Chữ mẫu đậm'], ['faded', 'Chữ mờ'], ['dotted', 'Chữ chấm mờ'], ['blank', 'Dòng trống']];

export function Worksheets() {
  const { session } = useAuth(); const { font: active } = useContent();
  const [cfg, setCfg] = useState<Cfg>(DEFAULT_CFG);
  const [els, setEls] = useState<El[]>([mk()]);
  const [fd, setFd] = useState<FontData | null>(null); const [family, setFamily] = useState('serif');
  const [saved, setSaved] = useState<any[]>([]); const [cur, setCur] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ k: 'ok' | 'error' | 'info'; t: string } | null>(null);
  const [pdf, setPdf] = useState<{ url: string; name: string } | null>(null); const [busy, setBusy] = useState(false);
  const [showPrev, setShowPrev] = useState(true);

  async function useFont(f: FontData) {
    setFd(f);
    const fam = 'WS' + Date.now();
    const ff = new FontFace(fam, f.bytes.slice(0)); await ff.load(); document.fonts.add(ff); setFamily(fam);
  }
  useEffect(() => { if (active?.url) loadFontFromUrl(active.url, active.name).then(useFont).catch(() => setMsg({ k: 'error', t: 'Không tải được font tập viết đã cài.' })); }, [active?.url]);
  const loadSaved = () => supabase.from('worksheets').select('*').order('updated_at', { ascending: false }).then(({ data }) => setSaved(data || []));
  useEffect(() => { loadSaved(); }, []);

  const L = useMemo(() => layout(cfg, els, fd), [cfg, els, fd]);
  const setC = (k: keyof Cfg, v: any) => setCfg((c) => {
    const n = { ...c, [k]: v } as Cfg;
    n.baselineCells = Math.min(n.baselineCells, n.bandCells);
    n.xHeightCells = Math.min(n.xHeightCells, n.baselineCells);
    return n;
  });
  const num = (k: keyof Cfg, label: string, min: number, max: number, step = 1) => (
    <label>{label}<input type="number" min={min} max={max} step={step} value={cfg[k] as number} onChange={(e) => setC(k, Math.min(max, Math.max(min, Number(e.target.value) || min)))} /></label>);
  const setEl = (id: string, p: Partial<El>) => setEls(els.map((e) => (e.id === id ? { ...e, ...p } : e)));

  async function exportPdf() {
    if (!fd) return setMsg({ k: 'error', t: 'Chưa có font tập viết. Hãy tải font ở Cài đặt, hoặc chọn font từ máy ở khung “Font”.' });
    setBusy(true); setMsg(null);
    try {
      const bytes = await buildPdf(cfg, els, fd);
      const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
      setPdf({ url, name: (cfg.title || 'phieu-tap-viet').replace(/[^\w\u00C0-\u1EF9 -]/g, '').trim().replace(/\s+/g, '-') + '.pdf' });
      setMsg({ k: 'ok', t: 'Đã tạo PDF thành công!' });
    } catch (e: any) { setMsg({ k: 'error', t: 'Tạo PDF lỗi: ' + (e.message || e) }); }
    setBusy(false);
  }
  async function save() {
    const row = { owner_id: session.user.id, title: cfg.title || 'Phiếu tập viết', config: cfg, updated_at: new Date().toISOString() };
    let id = cur;
    if (id) { const { error } = await supabase.from('worksheets').update(row).eq('id', id); if (error) return setMsg({ k: 'error', t: error.message }); }
    else { const { data, error } = await supabase.from('worksheets').insert(row).select('id').single(); if (error) return setMsg({ k: 'error', t: error.message }); id = data.id; setCur(id); }
    await supabase.from('worksheet_elements').delete().eq('worksheet_id', id);
    const { error } = await supabase.from('worksheet_elements').insert(els.map((e, i) => ({ worksheet_id: id, position: i, kind: e.kind, content: e.content, mode: e.mode, lines: e.lines, per_line: e.perLine })));
    if (error) return setMsg({ k: 'error', t: error.message });
    setMsg({ k: 'ok', t: 'Đã lưu phiếu.' }); loadSaved();
  }
  async function open(w: any) {
    const { data } = await supabase.from('worksheet_elements').select('*').eq('worksheet_id', w.id).order('position');
    setCfg({ ...DEFAULT_CFG, ...w.config }); setCur(w.id); setPdf(null);
    setEls((data || []).map((e: any) => mk({ kind: e.kind, content: e.content, mode: e.mode, lines: e.lines, perLine: e.per_line })));
  }
  async function del(id: string) { if (!confirm('Xóa phiếu này?')) return; await supabase.from('worksheets').delete().eq('id', id); if (cur === id) setCur(null); loadSaved(); }
  const tpl = (k: string) => { const t = TEMPLATES[k](); setCfg({ ...cfg, title: t.title }); setEls(t.els); setCur(null); setPdf(null); };

  return (
    <div><h1>🖨️ Tạo phiếu bài tập</h1>
      <div className="ws-layout">
        <div className="ws-panel">
          <Card><h3>Mẫu có sẵn</h3><div className="row wrap">{Object.keys(TEMPLATES).map((k) => <button key={k} className="chip" onClick={() => tpl(k)}>{k}</button>)}</div></Card>
          <Card><h3>Thông tin phiếu</h3>
            <label>Tiêu đề<input value={cfg.title} onChange={(e) => setC('title', e.target.value)} /></label>
            <label>Tên học sinh<input value={cfg.studentName} onChange={(e) => setC('studentName', e.target.value)} /></label>
            <label>Lớp<input value={cfg.className} onChange={(e) => setC('className', e.target.value)} /></label>
            <label>Ngày<input value={cfg.date} onChange={(e) => setC('date', e.target.value)} placeholder="vd: 05/09/2026" /></label>
            <label className="check"><input type="checkbox" checked={cfg.showHeader} onChange={(e) => setC('showHeader', e.target.checked)} /> Hiện phần đầu phiếu</label></Card>
          <Card><h3>Giấy & ô ly (mm)</h3>
            <label>Hướng giấy A4<select value={cfg.orientation} onChange={(e) => setC('orientation', e.target.value)}><option value="portrait">Dọc</option><option value="landscape">Ngang</option></select></label>
            {num('cellMm', 'Cạnh 1 ô ly (mm)', 3, 10, 0.5)}{num('bandCells', 'Số ô ly mỗi dòng', 3, 8)}{num('baselineCells', 'Đường chuẩn cách mép trên (ô)', 2, 8)}
            {num('xHeightCells', 'Chiều cao chữ thường (ô)', 1, 4, 0.5)}{num('marginMm', 'Lề giấy (mm)', 5, 25)}{num('gapCells', 'Khoảng cách giữa các dòng (ô)', 0, 3)}{num('letterGapCells', 'Khoảng cách giữa các chữ (ô)', 0, 4)}
            <label>Độ mờ chữ mờ ({Math.round(cfg.fade * 100)}%)<input type="range" min={0.05} max={0.9} step={0.05} value={cfg.fade} onChange={(e) => setC('fade', Number(e.target.value))} /></label>
            <p className="muted">Cỡ chữ được tính để chữ thường (a, o, n…) cao đúng số ô đã chọn, dựa trên số đo của font. Hãy so với vở của trường rồi chỉnh số ô.</p></Card>
          <Card><h3>Font</h3><p>Đang dùng: <b>{fd?.name || 'chưa có'}</b></p>
            <label>Dùng font từ máy (tạm thời)<input type="file" accept=".ttf,.otf" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { try { await useFont(await parseFont(await f.arrayBuffer(), f.name)); } catch { setMsg({ k: 'error', t: 'File font không đọc được.' }); } } }} /></label></Card>
        </div>
        <div className="ws-main">
          <Card><h3>Nội dung luyện tập</h3>
            {els.map((e, i) => (
              <div key={e.id} className="el-row">
                <b>{i + 1}.</b>
                <select value={e.kind} onChange={(ev) => setEl(e.id, { kind: ev.target.value as any, content: ev.target.value === 'strokes' ? '1' : 'a' })}><option value="letters">Chữ / nhóm chữ</option><option value="strokes">Nét</option><option value="text">Từ / câu</option></select>
                {e.kind === 'strokes'
                  ? <span className="row wrap">{STROKES.map((s) => { const ids = e.content.split(/\s+/).filter(Boolean); const on = ids.includes(String(s.id)); return <button key={s.id} className={`chip ${on ? 'on' : ''}`} title={s.name} onClick={() => setEl(e.id, { content: (on ? ids.filter((x) => x !== String(s.id)) : [...ids, String(s.id)]).join(' ') })}>{s.id}</button>; })}</span>
                  : <input value={e.content} onChange={(ev) => setEl(e.id, { content: ev.target.value })} placeholder={e.kind === 'letters' ? 'a ă â (cách nhau bởi dấu cách)' : 'Bé tập viết'} />}
                <select value={e.mode} onChange={(ev) => setEl(e.id, { mode: ev.target.value as Mode })}>{MODES.map(([m, l]) => <option key={m} value={m}>{l}</option>)}</select>
                <label className="inl">Dòng<input type="number" min={1} max={30} value={e.lines} onChange={(ev) => setEl(e.id, { lines: Math.max(1, Number(ev.target.value) || 1) })} /></label>
                <label className="inl">Số chữ/dòng (0 = đầy dòng)<input type="number" min={0} max={30} value={e.perLine} onChange={(ev) => setEl(e.id, { perLine: Math.max(0, Number(ev.target.value) || 0) })} /></label>
                <button className="btn small ghost" onClick={() => setEls(els.filter((x) => x.id !== e.id))}>✕</button>
              </div>))}
            <button className="btn" onClick={() => setEls([...els, mk()])}>+ Thêm nội dung</button></Card>
          <div className="row wrap">
            <button className="btn" onClick={() => setShowPrev(true)}>XEM TRƯỚC</button>
            <button className="btn big" onClick={exportPdf} disabled={busy}>{busy ? 'Đang tạo…' : 'XUẤT PDF'}</button>
            {pdf && <a className="btn big green" href={pdf.url} download={pdf.name}>TẢI PDF VỀ MÁY</a>}
            <button className="btn ghost" onClick={save}>💾 Lưu phiếu</button>
            <button className="btn ghost" onClick={() => { setCur(null); setEls([mk()]); setCfg(DEFAULT_CFG); setPdf(null); }}>Phiếu mới</button>
          </div>
          {msg && <Notice kind={msg.k}>{msg.t}</Notice>}
          {L.warnings.map((w) => <Notice key={w}>⚠️ {w}</Notice>)}
          {!fd && <Notice>Chưa có font tập viết nên bản xem trước dùng font tạm và chưa thể xuất PDF. Hãy tải font ở mục Cài đặt.</Notice>}
          {showPrev && <div className="ws-preview">{L.pages.map((prims, pi) => (
            <svg key={pi} viewBox={`0 0 ${L.pageW} ${L.pageH}`} className="ws-page" style={{ aspectRatio: `${L.pageW}/${L.pageH}` }}>
              <rect width={L.pageW} height={L.pageH} fill="#fff" />
              {prims.map((p, i) => p.t === 'line'
                ? <line key={i} x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} stroke={p.c} strokeWidth={p.w} strokeDasharray={p.dash ? p.dash.join(' ') : undefined} />
                : p.t === 'text'
                  ? <text key={i} x={p.x} y={p.y} fontSize={p.size} fontFamily={`${family}, sans-serif`} style={{ whiteSpace: 'pre' }}
                      fill={p.mode === 'dotted' ? 'none' : '#111'} fillOpacity={p.o} stroke={p.mode === 'dotted' ? '#111' : undefined} strokeWidth={0.25} strokeDasharray={p.mode === 'dotted' ? '0.35 0.7' : undefined}>{p.s}</text>
                  : <g key={i} transform={`translate(${p.x} ${p.y}) scale(${p.size / 100})`}>
                      <path d={p.d} fill="none" stroke="#111" strokeOpacity={p.o} strokeWidth={(0.9 * 100) / p.size} strokeLinecap="round" strokeDasharray={p.mode === 'dotted' ? `0.01 ${(1.8 * 100) / p.size}` : undefined} /></g>)}
              <text x={L.pageW - 8} y={L.pageH - 4} fontSize={3} fill="#999" textAnchor="end">Trang {pi + 1}/{L.pages.length}</text>
            </svg>))}</div>}
        </div>
        <div className="ws-saved"><Card><h3>Phiếu đã lưu</h3>
          {saved.map((w) => <div key={w.id} className="row between"><button className="link" onClick={() => open(w)}>{w.title}</button><button className="btn small ghost" onClick={() => del(w.id)}>Xóa</button></div>)}
          {!saved.length && <p className="muted">Chưa có phiếu nào.</p>}</Card></div>
      </div>
    </div>
  );
}
