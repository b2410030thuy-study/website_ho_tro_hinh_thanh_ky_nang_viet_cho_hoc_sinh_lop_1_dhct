import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../auth';
import { supabase } from '../../lib/supabase';
import { useContent } from '../../hooks/useContent';
import { LETTERS, STROKES, LESSON_GAMES } from '../../data/content';
import { recordLesson, recordGame, useProgress } from '../../services/api';
import { GAME_DEFS, GameCtx, Q, Opt } from '../../components/games';
import { Card, Notice, StrokeIcon, VideoBox } from '../../components/Common';

export function Home() {
  const { profile } = useAuth();
  const { total } = useProgress(profile?.id);
  const tiles = [['/hoc/chu-cai', '🔤', 'Học chữ cái'], ['/hoc/net', '〰️', 'Học các nét'], ['/hoc/video', '🎬', 'Xem video'], ['/hoc/tro-choi', '🎮', 'Chơi trò chơi'], ['/hoc/sao', '⭐', 'Ngôi sao của em'], ['/hoc/tro-ly', '🤖', 'Hỏi trợ lý']];
  return (
    <div>
      <Card className="hello"><div className="mascot">🐻</div><div><h1>Chào {profile?.display_name}!</h1><p>Em đang có <b>⭐ {total}</b> ngôi sao. Cùng học chữ nào!</p></div></Card>
      <div className="tile-grid">{tiles.map(([to, ic, l]) => <Link key={to} to={to} className="tile"><span>{ic}</span>{l}</Link>)}</div>
      <Notice>Em viết chữ trên giấy bằng bút nhé. Trên máy, em chỉ xem, nghe và chơi trò chơi!</Notice>
    </div>
  );
}

export function LetterList() {
  const { videos } = useContent(); const { profile } = useAuth(); const { rows } = useProgress(profile?.id);
  const done = new Set(rows.map((r) => r.item_key));
  return (<div><h1>29 chữ cái</h1><div className="letter-grid">
    {LETTERS.map((l) => (
      <Link key={l.id} to={`/hoc/chu-cai/${l.id}`} className="letter-tile">
        <span className="writing big-letter">{l.ch}</span><small>{l.upper}</small>
        {videos[`letter:${l.id}`] && <i title="Có video">🎬</i>}{done.has(`lesson:letter:${l.id}`) && <b>✅</b>}
      </Link>))}
  </div></div>);
}

export function StrokeList() {
  const { videos } = useContent(); const { profile } = useAuth(); const { rows } = useProgress(profile?.id);
  const done = new Set(rows.map((r) => r.item_key));
  return (<div><h1>14 nét cơ bản</h1><div className="stroke-grid">
    {STROKES.map((s) => (
      <Link key={s.id} to={`/hoc/net/${s.id}`} className="stroke-tile">
        <StrokeIcon d={s.d} size={84} /><span>{s.id}. {s.name}</span>
        {videos[`stroke:${s.id}`] && <i>🎬</i>}{done.has(`lesson:stroke:${s.id}`) && <b>✅</b>}
      </Link>))}
  </div></div>);
}

export function Lesson({ kind }: { kind: 'letter' | 'stroke' }) {
  const { id } = useParams();
  const { videos, notes } = useContent();
  const [res, setRes] = useState<string>(''); const [busy, setBusy] = useState(false);
  const letter = kind === 'letter' ? LETTERS.find((l) => l.id === id) : null;
  const stroke = kind === 'stroke' ? STROKES.find((s) => String(s.id) === id) : null;
  const key = `${kind}:${id}`;
  const note = notes[key];
  useEffect(() => setRes(''), [id]);
  if (!letter && !stroke) return <Notice kind="error">Không tìm thấy bài học.</Notice>;

  async function finish() {
    setBusy(true);
    try {
      const r = await recordLesson(kind, String(id));
      setRes(r.gained ? `Giỏi quá! Em nhận được ⭐ ${r.gained} sao.${r.new_rewards.length ? ' Huy hiệu mới: ' + r.new_rewards.join(', ') : ''}` : 'Em đã nhận sao của bài này rồi. Học lại cũng rất tốt!');
    } catch (e: any) { setRes('Chưa lưu được: ' + e.message); }
    setBusy(false);
  }
  const title = letter ? `Chữ ${letter.ch}` : `Nét ${stroke!.id}: ${stroke!.name}`;
  const idx = letter ? LETTERS.findIndex((l) => l.id === id) : STROKES.findIndex((s) => String(s.id) === id);
  const list = letter ? LETTERS : STROKES; const base = letter ? '/hoc/chu-cai/' : '/hoc/net/';
  const prev = list[idx - 1] as any, next = list[idx + 1] as any;
  return (
    <div className="lesson">
      <h1>{title}</h1>
      <Card className="sample">
        {letter ? <><span className="writing sample-letter">{letter.ch}</span><span className="writing sample-letter">{letter.upper}</span></>
          : <StrokeIcon d={stroke!.d} size={180} />}
      </Card>
      <VideoBox url={videos[key]} />
      <Card><h3>📝 Ghi chú cấu tạo</h3>
        <p>{note?.note || 'Cô giáo chưa viết ghi chú cho bài này.'}</p>
        {letter && note?.related?.length ? (<div><b>Các nét liên quan:</b>
          <div className="related">{[...new Set(note.related)].map((sid) => { const s = STROKES.find((x) => x.id === sid)!; return <Link key={sid} to={`/hoc/net/${sid}`} className="chip"><StrokeIcon d={s.d} size={28} /> {s.name}</Link>; })}</div></div>) : null}
      </Card>
      <Card><h3>🎮 Trò chơi liên quan</h3><div className="row wrap">
        {LESSON_GAMES[kind].map((g) => <Link key={g} className="btn" to={`/hoc/tro-choi/${g}`}>{GAME_DEFS.find((d) => d.id === g)?.icon} Chơi</Link>)}</div></Card>
      <button className="btn big" onClick={finish} disabled={busy}>⭐ EM HỌC XONG RỒI</button>
      {res && <Notice kind="ok">{res}</Notice>}
      <div className="row between">{prev ? <Link className="btn ghost" to={base + (prev.id)}>← Trước</Link> : <span />}{next ? <Link className="btn ghost" to={base + next.id}>Tiếp →</Link> : <span />}</div>
    </div>
  );
}

export function VideoList() {
  const { videos } = useContent();
  const items = [...LETTERS.map((l) => ({ k: `letter:${l.id}`, to: `/hoc/chu-cai/${l.id}`, t: `Chữ ${l.ch}` })), ...STROKES.map((s) => ({ k: `stroke:${s.id}`, to: `/hoc/net/${s.id}`, t: `Nét: ${s.name}` }))].filter((i) => videos[i.k]);
  return (<div><h1>🎬 Video bài học</h1>{items.length ? <div className="chip-grid">{items.map((i) => <Link key={i.k} to={i.to} className="chip big">{i.t}</Link>)}</div> : <Notice>Cô giáo chưa thêm video nào.</Notice>}</div>);
}

export function GameList() {
  const [games, setGames] = useState<any[]>([]);
  useEffect(() => { supabase.from('games').select('*').eq('is_active', true).order('sort_order').then(({ data }) => setGames(data || [])); }, []);
  return (<div><h1>🎮 Trò chơi</h1><div className="tile-grid">{games.map((g) => (
    <Link key={g.id} to={`/hoc/tro-choi/${g.id}`} className="tile"><span>{GAME_DEFS.find((d) => d.id === g.id)?.icon}</span>{g.title}<small>{g.description}</small></Link>))}</div></div>);
}

function speak(t: string) {
  if (!('speechSynthesis' in window)) return alert('Máy này chưa hỗ trợ đọc to.');
  const u = new SpeechSynthesisUtterance(t); u.lang = 'vi-VN'; u.rate = 0.8;
  window.speechSynthesis.cancel(); window.speechSynthesis.speak(u);
}

function OptionView({ o, sel, onClick, disabled }: { o: Opt; sel: boolean; onClick: () => void; disabled?: boolean }) {
  const st = o.strokeId ? STROKES.find((s) => s.id === o.strokeId) : null;
  return <button className={`opt ${sel ? 'sel' : ''}`} onClick={onClick} disabled={disabled}>{st ? <StrokeIcon d={st.d} size={64} /> : <span className="writing">{o.label}</span>}{!st && o.label && o.label.length > 2 && <small />}</button>;
}

export function GamePage() {
  const { id } = useParams();
  const def = GAME_DEFS.find((d) => d.id === id);
  const { notes } = useContent();
  const ctx: GameCtx = useMemo(() => {
    const r: Record<string, number[]> = {};
    Object.entries(notes).forEach(([k, v]) => { if (k.startsWith('letter:') && v.related.length) r[k.slice(7)] = v.related; });
    return { related: r };
  }, [notes]);
  const [qs, setQs] = useState<Q[] | null>(null);
  const [i, setI] = useState(0); const [score, setScore] = useState(0);
  const [sel, setSel] = useState<string[]>([]); const [state, setState] = useState<'idle' | 'wrong' | 'right'>('idle');
  const [firstTry, setFirstTry] = useState(true); const [result, setResult] = useState<any>(null); const [err, setErr] = useState('');

  function start() {
    if (!def) return;
    const out: Q[] = [];
    for (let n = 0; n < 200 && out.length < def.total; n++) { const q = def.make(ctx); if (q) out.push(q); }
    setQs(out.length === def.total ? out : []); setI(0); setScore(0); setSel([]); setState('idle'); setFirstTry(true); setResult(null); setErr('');
  }
  useEffect(() => { setQs(null); setResult(null); }, [id]);
  useEffect(() => { const q = qs?.[i]; if (q?.speak) speak(q.speak); }, [qs, i]);

  if (!def) return <Notice kind="error">Không tìm thấy trò chơi.</Notice>;
  if (!qs) return <Card className="center-card"><h1>{def.icon}</h1><button className="btn big" onClick={start}>BẮT ĐẦU</button></Card>;
  if (!qs.length) return <Notice>Trò chơi này cần cô giáo nhập “các nét liên quan” cho các chữ (mục Quản lý chữ cái). Em hãy chơi trò khác nhé!</Notice>;

  async function finish(finalScore: number) {
    try { setResult(await recordGame(def!.id, finalScore, def!.total)); } catch (e: any) { setErr('Chưa lưu được kết quả: ' + e.message); setResult({ gained: 0, game_stars: 0 }); }
  }
  function advance(add: number) {
    const ns = score + add;
    if (i + 1 >= qs!.length) { setScore(ns); finish(ns); return; }
    setScore(ns); setI(i + 1); setSel([]); setState('idle'); setFirstTry(true);
  }
  function check(chosen: string[]) {
    const q = qs![i];
    let ok: boolean;
    if (q.mode === 'single') ok = chosen[0] === q.answer[0];
    else if (q.mode === 'multi') ok = chosen.length === q.answer.length && q.answer.every((a) => chosen.includes(a));
    else ok = chosen.map((k) => String(q.options.find((o) => o.key === k)?.strokeId)).join(',') === q.answer.join(',');
    if (ok) { setState('right'); setTimeout(() => advance(firstTry ? 1 : 0), 900); }
    else { setState('wrong'); setFirstTry(false); }
  }

  if (result) {
    const stars = result.game_stars ?? 0;
    return (<Card className="center-card"><h1>{'⭐'.repeat(stars) || '💪'}</h1>
      <h2>Em đúng {score}/{def.total} câu</h2>
      <p>{result.gained ? `Em nhận thêm ⭐ ${result.gained} sao!` : 'Chưa có sao mới – em thử lại để được nhiều sao hơn nhé!'}</p>
      {result.new_rewards?.length ? <Notice kind="ok">Huy hiệu mới: {result.new_rewards.join(', ')}</Notice> : null}
      {err && <Notice kind="error">{err}</Notice>}
      <div className="row"><button className="btn big" onClick={start}>CHƠI LẠI</button><Link className="btn ghost" to="/hoc/tro-choi">Trò chơi khác</Link></div></Card>);
  }

  const q = qs[i];
  const tap = (o: Opt) => {
    if (state === 'right') return;
    if (q.mode === 'single') { setSel([o.key]); check([o.key]); }
    else if (q.mode === 'multi') setSel(sel.includes(o.key) ? sel.filter((k) => k !== o.key) : [...sel, o.key]);
    else if (!sel.includes(o.key)) { const n = [...sel, o.key]; setSel(n); if (n.length === q.answer.length) check(n); }
  };
  return (
    <Card className="game">
      <div className="progress"><div style={{ width: `${(i / qs.length) * 100}%` }} /></div>
      <p className="muted">Câu {i + 1}/{qs.length}</p>
      <h2>{q.prompt}</h2>
      {q.big && <div className="writing sample-letter">{q.big}</div>}
      {q.strokeBig && <StrokeIcon d={STROKES.find((s) => s.id === q.strokeBig)!.d} size={150} />}
      {q.speak && <button className="btn" onClick={() => speak(q.speak!)}>🔊 Nghe lại</button>}
      <div className="opt-grid">{q.options.map((o) => <OptionView key={o.key} o={o} sel={sel.includes(o.key)} onClick={() => tap(o)} />)}</div>
      {q.mode === 'multi' && <button className="btn big" onClick={() => check(sel)} disabled={!sel.length}>KIỂM TRA</button>}
      {q.mode === 'seq' && <button className="btn ghost" onClick={() => { setSel([]); setState('idle'); }}>Làm lại</button>}
      {state === 'right' && <Notice kind="ok">🎉 Đúng rồi! Giỏi quá!</Notice>}
      {state === 'wrong' && <Notice kind="error">Chưa đúng. 💡 Gợi ý: {q.hint}
        <div className="row"><button className="btn small" onClick={() => { setSel([]); setState('idle'); }}>Thử lại</button><button className="btn small ghost" onClick={() => advance(0)}>Bỏ qua</button></div></Notice>}
    </Card>
  );
}

export function Stars() {
  const { profile } = useAuth(); const { rows, results, total, rewards } = useProgress(profile?.id);
  return (<div><Card className="center-card"><h1>⭐ {total}</h1><p>Tổng số sao của em</p></Card>
    <Card><h3>Lịch sử nhận thưởng</h3>
      {rewards.length ? rewards.map((r: any, i: number) => <p key={i}>{r.rewards.icon} <b>{r.rewards.name}</b> – {new Date(r.earned_at).toLocaleDateString('vi-VN')}</p>) : <p className="muted">Chưa có huy hiệu nào. Cố lên nhé!</p>}</Card>
    <Card><h3>Trò chơi gần đây</h3>
      {results.slice(0, 10).map((g: any) => <p key={g.id}>{GAME_DEFS.find((d) => d.id === g.game_id)?.icon} {g.score}/{g.total} · {'⭐'.repeat(g.stars)} · {new Date(g.created_at).toLocaleDateString('vi-VN')}</p>)}
      {!results.length && <p className="muted">Em chưa chơi trò chơi nào.</p>}</Card>
    <p className="muted">Số bài đã nhận sao: {rows.length}</p></div>);
}

export function Achievements() {
  const { profile } = useAuth(); const { rows } = useProgress(profile?.id);
  const [all, setAll] = useState<any[]>([]); const { rewards } = useProgress(profile?.id);
  useEffect(() => { supabase.from('rewards').select('*').order('stars_required').then(({ data }) => setAll(data || [])); }, []);
  const got = new Set(rewards.map((r: any) => r.rewards.id));
  const letters = rows.filter((r) => r.ref.startsWith('letter:')).length, strokes = rows.filter((r) => r.ref.startsWith('stroke:')).length;
  return (<div><h1>🏆 Thành tích</h1>
    <div className="tile-grid">{all.map((r) => <div key={r.id} className={`tile ${got.has(r.id) ? '' : 'locked'}`}><span>{r.icon}</span>{r.name}<small>{r.description}</small></div>)}</div>
    <Card><p>🔤 Chữ đã học: <b>{letters}/29</b></p><p>〰️ Nét đã học: <b>{strokes}/14</b></p><p>🎮 Trò chơi đã hoàn thành: <b>{rows.filter((r) => r.kind === 'game').length}/10</b></p></Card></div>);
}
