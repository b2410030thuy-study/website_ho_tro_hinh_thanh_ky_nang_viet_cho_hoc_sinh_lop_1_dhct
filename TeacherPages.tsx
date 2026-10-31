import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../auth';
import { useContent } from '../../hooks/useContent';
import { useProgress } from '../../services/api';
import { parseFont, missingVietnamese } from '../../lib/font';
import { GAME_DEFS } from '../../components/games';
import { Card, Notice, Avatar } from '../../components/Common';
import { ProfileEditor } from '../../components/Profile';

export function Overview() {
  const { videos } = useContent();
  const [c, setC] = useState({ students: 0, classes: 0 });
  useEffect(() => {
    Promise.all([
      supabase.from('students').select('id', { count: 'exact', head: true }),
      supabase.from('classes').select('id', { count: 'exact', head: true }),
    ]).then(([s, k]) => setC({ students: s.count || 0, classes: k.count || 0 }));
  }, []);
  const lv = Object.keys(videos).filter((k) => k.startsWith('letter:')).length;
  const sv = Object.keys(videos).filter((k) => k.startsWith('stroke:')).length;
  return (<div><h1>📊 Tổng quan</h1><div className="stat-grid">
    <Card><h2>{c.classes}</h2>Lớp</Card><Card><h2>{c.students}</h2>Học sinh trong lớp của tôi</Card>
    <Card><h2>{lv}/29</h2>Chữ đã có video</Card><Card><h2>{sv}/14</h2>Nét đã có video</Card></div>
    <Notice>Bắt đầu: tạo lớp (Quản lý học sinh) → thêm link YouTube (Quản lý video) → tạo phiếu (Tạo phiếu bài tập).</Notice></div>);
}

export function Students() {
  const { session } = useAuth();
  const [classes, setClasses] = useState<any[]>([]); const [students, setStudents] = useState<any[]>([]);
  const [name, setName] = useState(''); const [stars, setStars] = useState<Record<string, number>>({}); const [err, setErr] = useState('');
  const load = useCallback(async () => {
    const [c, s, p, pr] = await Promise.all([
      supabase.from('classes').select('*').order('created_at'),
      supabase.from('students').select('id, student_code, grade, class_id'),
      supabase.from('profiles').select('id, display_name, full_name, avatar_url').neq('id', session.user.id),
      supabase.from('student_progress').select('student_id, stars'),
    ]);
    setClasses(c.data || []);
    const pm: any = {}; (p.data || []).forEach((x: any) => (pm[x.id] = x));
    setStudents((s.data || []).map((x: any) => ({ ...x, ...pm[x.id] })));
    const st: Record<string, number> = {}; (pr.data || []).forEach((r: any) => (st[r.student_id] = (st[r.student_id] || 0) + r.stars)); setStars(st);
  }, [session]);
  useEffect(() => { load(); }, [load]);
  async function addClass() {
    if (!name.trim()) return;
    const { error } = await supabase.from('classes').insert({ name: name.trim(), teacher_id: session.user.id });
    if (error) setErr(error.message); else { setName(''); load(); }
  }
  async function remove(id: string) {
    if (!confirm('Đưa học sinh này ra khỏi lớp?')) return;
    const { error } = await supabase.from('students').update({ class_id: null }).eq('id', id);
    if (error) setErr(error.message); else load();
  }
  return (<div><h1>🧒 Quản lý học sinh</h1>
    <Card><h3>Lớp học</h3>
      <div className="row"><input placeholder="Tên lớp, ví dụ: Lớp 1A" value={name} onChange={(e) => setName(e.target.value)} /><button className="btn" onClick={addClass}>Tạo lớp</button></div>
      {err && <Notice kind="error">{err}</Notice>}
      <table><thead><tr><th>Lớp</th><th>Mã lớp (đưa cho phụ huynh khi đăng ký)</th></tr></thead>
        <tbody>{classes.map((c) => <tr key={c.id}><td>{c.name}</td><td><code>{c.join_code}</code></td></tr>)}</tbody></table></Card>
    <Card><h3>Học sinh</h3><div className="scroll"><table><thead><tr><th></th><th>Tên</th><th>Mã</th><th>Lớp</th><th>Sao</th><th /></tr></thead>
      <tbody>{students.map((s) => <tr key={s.id}><td><Avatar url={s.avatar_url} size={30} /></td><td>{s.display_name}<br /><small>{s.full_name}</small></td><td>{s.student_code}</td>
        <td>{classes.find((c) => c.id === s.class_id)?.name}</td><td>⭐ {stars[s.id] || 0}</td><td><button className="btn small ghost" onClick={() => remove(s.id)}>Xóa khỏi lớp</button></td></tr>)}</tbody></table>
      {!students.length && <p className="muted">Chưa có học sinh. Cho phụ huynh mã lớp để đăng ký.</p>}</div></Card></div>);
}

export function ProgressView() {
  const [students, setStudents] = useState<any[]>([]); const [sel, setSel] = useState('');
  useEffect(() => { (async () => {
    const { data: s } = await supabase.from('students').select('id, student_code');
    const { data: p } = await supabase.from('profiles').select('id, display_name').in('id', (s || []).map((x: any) => x.id));
    setStudents((s || []).map((x: any) => ({ ...x, name: p?.find((y: any) => y.id === x.id)?.display_name })));
  })(); }, []);
  const { rows, results, total, rewards } = useProgress(sel || undefined);
  const lessons = rows.filter((r) => r.kind === 'lesson');
  return (<div><h1>📈 Theo dõi tiến trình</h1>
    <select value={sel} onChange={(e) => setSel(e.target.value)}><option value="">— Chọn học sinh —</option>{students.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.student_code})</option>)}</select>
    {sel && (<><div className="stat-grid">
      <Card><h2>⭐ {total}</h2>Tổng sao</Card>
      <Card><h2>{lessons.filter((r) => r.ref.startsWith('letter:')).length}/29</h2>Chữ đã học</Card>
      <Card><h2>{lessons.filter((r) => r.ref.startsWith('stroke:')).length}/14</h2>Nét đã học</Card>
      <Card><h2>{rows.filter((r) => r.kind === 'game').length}/10</h2>Trò chơi đã chơi</Card></div>
      <Card><h3>Kết quả trò chơi gần đây</h3>{results.map((g: any) => <p key={g.id}>{GAME_DEFS.find((d) => d.id === g.game_id)?.icon} {g.game_id}: {g.score}/{g.total} · {'⭐'.repeat(g.stars)} · {new Date(g.created_at).toLocaleString('vi-VN')}</p>)}{!results.length && <p className="muted">Chưa có.</p>}</Card>
      <Card><h3>Huy hiệu</h3>{rewards.map((r: any, i: number) => <span key={i} className="chip">{r.rewards.icon} {r.rewards.name}</span>)}</Card></>)}
    {!students.length && <Notice>Chưa có học sinh nào trong lớp của bạn.</Notice>}</div>);
}

export function GamesAdmin() {
  const [games, setGames] = useState<any[]>([]);
  const load = () => supabase.from('games').select('*').order('sort_order').then(({ data }) => setGames(data || []));
  useEffect(() => { load(); }, []);
  async function toggle(g: any) { await supabase.from('games').update({ is_active: !g.is_active }).eq('id', g.id); load(); }
  return (<div><h1>🎮 Quản lý trò chơi</h1><Card><p className="muted">Bật/tắt trò chơi hiển thị cho học sinh.</p>
    {games.map((g) => <div key={g.id} className="row between"><span>{GAME_DEFS.find((d) => d.id === g.id)?.icon} <b>{g.title}</b> – {g.description}</span>
      <button className={`btn small ${g.is_active ? '' : 'ghost'}`} onClick={() => toggle(g)}>{g.is_active ? 'Đang bật' : 'Đang tắt'}</button></div>)}</Card></div>);
}

export function RewardsAdmin() {
  const [rs, setRs] = useState<any[]>([]); const [n, setN] = useState({ name: '', icon: '🏅', stars_required: 5, description: '' });
  const load = () => supabase.from('rewards').select('*').order('stars_required').then(({ data }) => setRs(data || []));
  useEffect(() => { load(); }, []);
  async function add() { if (!n.name.trim()) return; await supabase.from('rewards').insert({ ...n, stars_required: Number(n.stars_required) }); setN({ ...n, name: '', description: '' }); load(); }
  async function del(id: string) { if (confirm('Xóa phần thưởng này?')) { await supabase.from('rewards').delete().eq('id', id); load(); } }
  return (<div><h1>🏅 Quản lý phần thưởng</h1><Card><h3>Thêm huy hiệu</h3>
    <div className="row wrap"><input style={{ width: 60 }} value={n.icon} onChange={(e) => setN({ ...n, icon: e.target.value })} /><input placeholder="Tên" value={n.name} onChange={(e) => setN({ ...n, name: e.target.value })} />
      <input type="number" min={1} style={{ width: 90 }} value={n.stars_required} onChange={(e) => setN({ ...n, stars_required: Number(e.target.value) })} /> sao<button className="btn" onClick={add}>Thêm</button></div>
    <table><tbody>{rs.map((r) => <tr key={r.id}><td>{r.icon}</td><td>{r.name}</td><td>{r.stars_required} sao</td><td><button className="btn small ghost" onClick={() => del(r.id)}>Xóa</button></td></tr>)}</tbody></table>
    <p className="muted">Huy hiệu được trao tự động khi học sinh đạt đủ số sao.</p></Card></div>);
}

export function Settings() {
  const { session } = useAuth(); const { font, refresh } = useContent();
  const [msg, setMsg] = useState<{ k: 'ok' | 'error' | 'info'; t: string } | null>(null);
  const [agree, setAgree] = useState(false); const [ai, setAi] = useState('…');
  useEffect(() => { supabase.functions.invoke('gemini-assistant', { body: { messages: [{ role: 'user', text: 'xin chào' }] } })
    .then(({ data, error }) => setAi(error ? '❌ Chưa triển khai Edge Function' : data?.configured === false ? '⚠️ Chưa có GEMINI_API_KEY' : data?.error ? '⚠️ Có lỗi: ' + data.error : '✅ Gemini hoạt động')); }, []);

  async function upload(file: File) {
    if (!agree) return setMsg({ k: 'error', t: 'Hãy tích xác nhận bạn có quyền sử dụng font này.' });
    try {
      const bytes = await file.arrayBuffer();
      const fd = await parseFont(bytes, file.name);
      const miss = missingVietnamese(fd);
      if (miss.length) return setMsg({ k: 'error', t: `Font thiếu ${miss.length} ký tự tiếng Việt (ví dụ: ${miss.slice(0, 8).join(' ')}). Hãy chọn font khác.` });
      const path = `${session.user.id}/${Date.now()}-${file.name.replace(/[^\w.-]/g, '_')}`;
      const up = await supabase.storage.from('fonts').upload(path, file, { contentType: 'font/ttf' });
      if (up.error) throw up.error;
      const url = supabase.storage.from('fonts').getPublicUrl(path).data.publicUrl;
      const { error } = await supabase.from('app_settings').upsert({ key: 'writing_font', value: { url, name: file.name }, updated_at: new Date().toISOString() });
      if (error) throw error;
      await refresh(); setMsg({ k: 'ok', t: 'Đã đặt font tập viết: ' + file.name });
    } catch (e: any) { setMsg({ k: 'error', t: 'Không dùng được font này: ' + (e.message || e) }); }
  }
  return (<div><h1>⚙️ Cài đặt</h1>
    <Card><h3>Font tập viết (khác font giao diện)</h3>
      <p>Đang dùng: <b>{font?.name || 'chưa có – đang dùng font dự phòng KHÔNG phải font tiểu học'}</b></p>
      <p className="muted">Tải lên file .ttf/.otf font chữ viết tiểu học tiếng Việt mà bạn có giấy phép sử dụng. Font được dùng cho chữ mẫu và phiếu PDF.</p>
      <label className="check"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /> Tôi xác nhận có quyền sử dụng font này</label>
      <input type="file" accept=".ttf,.otf" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      {msg && <Notice kind={msg.k as any}>{msg.t}</Notice>}</Card>
    <Card><h3>Trợ lý AI Gemini</h3><p>{ai}</p>
      <p className="muted">API Key KHÔNG nhập ở đây. Đặt <code>GEMINI_API_KEY</code> trong Supabase → Edge Functions → Secrets (xem README).</p></Card>
    <ProfileEditor /></div>);
}
