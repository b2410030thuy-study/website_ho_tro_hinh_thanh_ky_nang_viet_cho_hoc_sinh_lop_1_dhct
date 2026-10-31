// BÉ VUI HỌC VIẾT - backend không phụ thuộc thư viện ngoài. Cần Node >= 22.13 (có node:sqlite).
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');
const PORT = process.env.PORT || 3000, PUB = path.join(__dirname, 'public');
const db = new DatabaseSync(process.env.DB_FILE || path.join(__dirname, 'data.db'));
db.exec(`PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY,username TEXT UNIQUE NOT NULL,name TEXT,display TEXT,role TEXT,pw TEXT,avatar TEXT,cls TEXT,created TEXT);
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,uid INTEGER,ts INTEGER);
CREATE TABLE IF NOT EXISTS items(key TEXT PRIMARY KEY,title TEXT,url TEXT,note TEXT);
CREATE TABLE IF NOT EXISTS progress(uid INTEGER,key TEXT,stars INTEGER DEFAULT 0,score INTEGER,ts TEXT,PRIMARY KEY(uid,key));
CREATE TABLE IF NOT EXISTS worksheets(id INTEGER PRIMARY KEY,owner INTEGER,name TEXT,json TEXT,created TEXT);
CREATE TABLE IF NOT EXISTS settings(k TEXT PRIMARY KEY,v TEXT);`);
try { db.exec("ALTER TABLE items ADD COLUMN strokes TEXT DEFAULT ''"); } catch { }
const all = (s, ...a) => db.prepare(s).all(...a), one = (s, ...a) => db.prepare(s).get(...a), run = (s, ...a) => db.prepare(s).run(...a);
const getS = k => one('SELECT v FROM settings WHERE k=?', k)?.v, setS = (k, v) => run('INSERT OR REPLACE INTO settings VALUES(?,?)', k, v);
let tc = process.env.TEACHER_CODE || getS('tcode');
if (!tc) { tc = crypto.randomBytes(4).toString('hex'); setS('tcode', tc); }
const DEFR = { lessonStars: 1, badges: [[1, '🌱', 'Bé chăm học'], [10, '🌿', 'Bé chăm luyện chữ'], [25, '🌟', 'Bé thông minh'], [45, '🏆', 'Siêu sao học viết']] };
const GIDS = ['g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8', 'g9'];
const cfg = () => { const c = JSON.parse(getS('config') || '{}'); return { games: Object.fromEntries(GIDS.map(g => [g, { on: 1, stars: 1, count: 5, ...(c.games || {})[g] }])), rewards: { ...DEFR, ...c.rewards } }; };
const STRN = ['Nét thẳng đứng', 'Nét ngang', 'Nét xiên phải', 'Nét xiên trái', 'Nét cong kín', 'Nét cong hở phải', 'Nét cong hở trái', 'Nét móc xuôi', 'Nét móc ngược', 'Nét móc hai đầu', 'Nét thắt trên', 'Nét móc hai đầu có thắt ở giữa', 'Nét khuyết trên', 'Nét khuyết dưới'];
const gem = () => JSON.parse(getS('gemini') || '{}'), rl = new Map();
async function callGemini(sys, contents) {
  const g = gem(); if (!g.key) throw new Error('Chưa cấu hình API Key Gemini.');
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(g.model || 'gemini-2.5-flash')}:generateContent`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': g.key }, body: JSON.stringify({ systemInstruction: { parts: [{ text: sys }] }, contents, generationConfig: { maxOutputTokens: 900, temperature: 0.4 } }), signal: AbortSignal.timeout(30000) });
  const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error('Gemini báo lỗi: ' + (j.error?.message || r.status));
  return (j.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('').trim() || 'Mình chưa có câu trả lời, bạn hỏi lại nhé.';
}
const SYS = `Bạn là trợ lý giáo dục chuyên hỗ trợ dạy học kỹ năng viết tiếng Việt cho học sinh lớp 1. Bạn đồng thời hỗ trợ giáo viên và phụ huynh trong việc xây dựng bài học, trò chơi và phiếu tập viết.
Bạn phải trả lời bằng tiếng Việt chuẩn, dễ hiểu, nhẹ nhàng và chính xác.
Khi giao tiếp với học sinh, sử dụng câu ngắn, từ ngữ đơn giản, lời động viên tích cực và phù hợp lứa tuổi.
Khi hỗ trợ giáo viên, đưa ra nội dung có cấu trúc, thực tế và phù hợp chương trình tiểu học.
Không tự ý bịa đặt thông tin về cấu tạo chữ hoặc quy tắc viết. Khi chưa chắc chắn, cần nói rõ để giáo viên kiểm tra.
Học sinh không viết trên máy; việc luyện viết thực hiện bằng bút trên giấy. Không hỏi hay nhận thông tin cá nhân.
14 nét cơ bản của website: ` + STRN.map((n, i) => (i + 1) + '. ' + n).join('; ') + '.';
const hash = (p, s = crypto.randomBytes(16).toString('hex')) => s + ':' + crypto.scryptSync(p, s, 64).toString('hex');
const check = (p, h) => { const [s, x] = h.split(':'); return crypto.timingSafeEqual(crypto.scryptSync(p, s, 64), Buffer.from(x, 'hex')); };
const AV = ['🐼', '🐰', '🐻', '🐱', '🐶', '🦁', '🐯', '🐸', '🐨', '🦊'];
const pub = u => ({ id: Number(u.id), username: u.username, name: u.name, display: u.display, role: u.role, avatar: u.avatar, cls: u.cls, created: u.created });
const send = (res, c, o, h = {}) => { res.writeHead(c, { 'Content-Type': 'application/json; charset=utf-8', ...h }); res.end(JSON.stringify(o)); };
const body = req => new Promise((ok, no) => { const ch = []; let n = 0; req.on('data', d => { n += d.length; if (n > 12e6) { no(new Error('big')); req.destroy(); } else ch.push(d); }); req.on('end', () => { try { ok(ch.length ? JSON.parse(Buffer.concat(ch).toString()) : {}); } catch (e) { no(e); } }); });
const sid = req => Object.fromEntries((req.headers.cookie || '').split(';').map(s => s.trim().split('=')).filter(a => a[0])).sid;
const auth = req => { const t = sid(req); return t ? one('SELECT u.* FROM sessions s JOIN users u ON u.id=s.uid WHERE s.token=? AND s.ts>?', t, Date.now() - 30 * 864e5) : null; };
const avOk = a => AV.includes(a) || (typeof a === 'string' && /^data:image\/(png|jpe?g|webp);base64,/.test(a) && a.length < 3e5);
const now = () => new Date().toISOString();

async function api(req, res, url) {
  const p = url.pathname.slice(5), k = req.method + ' ' + p;
  const b = ['POST', 'PUT'].includes(req.method) ? await body(req) : {}, u = auth(req);
  const E = (c, m) => send(res, c, { error: m });
  const need = r => !u ? (E(401, 'Vui lòng đăng nhập.'), 1) : r && u.role !== r ? (E(403, 'Bạn không có quyền thực hiện thao tác này.'), 1) : 0;

  if (k === 'POST register') {
    const un = String(b.username || '').trim().toLowerCase(), pw = String(b.password || ''), role = b.role === 'teacher' ? 'teacher' : 'student';
    const name = String(b.name || '').trim().slice(0, 60), dp = String(b.display || name).trim().slice(0, 40);
    if (!/^[a-z0-9_.@-]{3,40}$/.test(un)) return E(400, 'Mã tài khoản gồm 3-40 ký tự (chữ không dấu, số, . _ - @).');
    if (pw.length < 6) return E(400, 'Mật khẩu tối thiểu 6 ký tự.');
    if (!name || !dp) return E(400, 'Vui lòng nhập họ tên và tên hiển thị.');
    if (role === 'teacher' && b.code !== tc) return E(403, 'Mã xác nhận giáo viên không đúng.');
    if (one('SELECT 1 x FROM users WHERE username=?', un)) return E(409, 'Mã tài khoản đã tồn tại.');
    run('INSERT INTO users(username,name,display,role,pw,avatar,cls,created) VALUES(?,?,?,?,?,?,?,?)', un, name, dp, role, hash(pw), avOk(b.avatar) ? b.avatar : '🐼', String(b.cls || '').trim().slice(0, 20), now());
    return send(res, 200, { ok: 1 });
  }
  if (k === 'POST login') {
    const x = one('SELECT * FROM users WHERE username=?', String(b.username || '').trim().toLowerCase());
    if (!x || !check(String(b.password || ''), x.pw)) return E(401, 'Tên đăng nhập hoặc mật khẩu không chính xác.');
    const t = crypto.randomBytes(24).toString('hex'); run('INSERT INTO sessions VALUES(?,?,?)', t, x.id, Date.now());
    return send(res, 200, { user: pub(x) }, { 'Set-Cookie': `sid=${t}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000${process.env.COOKIE_SECURE ? '; Secure' : ''}` });
  }
  if (k === 'POST logout') { if (sid(req)) run('DELETE FROM sessions WHERE token=?', sid(req)); return send(res, 200, { ok: 1 }, { 'Set-Cookie': 'sid=; Path=/; Max-Age=0' }); }
  if (k === 'GET me') return u ? send(res, 200, { user: pub(u) }) : E(401, 'Chưa đăng nhập.');
  if (need()) return;

  if (k === 'POST profile') {
    const dp = String(b.display || '').trim().slice(0, 40); if (!dp) return E(400, 'Tên hiển thị không được để trống.');
    if (!avOk(b.avatar)) return E(400, 'Ảnh đại diện không hợp lệ (tối đa ~200KB).');
    run('UPDATE users SET display=?,avatar=? WHERE id=?', dp, b.avatar, u.id);
    return send(res, 200, { user: pub(one('SELECT * FROM users WHERE id=?', u.id)) });
  }
  if (k === 'GET items') return send(res, 200, { items: all('SELECT * FROM items') });
  if (k === 'PUT items') {
    if (need('teacher')) return;
    if (!/^[ls]:\S{1,2}$/.test(b.key || '')) return E(400, 'Mã nội dung không hợp lệ.');
    const url = String(b.url || '').trim();
    if (url && !/^https?:\/\/(www\.|m\.)?(youtube\.com|youtu\.be|youtube-nocookie\.com)\//.test(url)) return E(400, 'Link không phải YouTube hợp lệ.');
    const stk = String(b.strokes || '').split(',').map(Number).filter(n => n >= 1 && n <= 14).slice(0, 8).join(',');
    if (!url && !b.note && !b.title && !stk) run('DELETE FROM items WHERE key=?', b.key);
    else run('INSERT OR REPLACE INTO items(key,title,url,note,strokes) VALUES(?,?,?,?,?)', b.key, String(b.title || '').slice(0, 200), url, String(b.note || '').slice(0, 3000), stk);
    return send(res, 200, { ok: 1 });
  }
  if (k === 'GET progress') return send(res, 200, { rows: all('SELECT key,stars,score,ts FROM progress WHERE uid=?', u.id) });
  if (k === 'POST progress') {
    if (need('student')) return;
    if (!/^((view|done):[ls]:\S{1,2}|game:g[1-9])$/.test(b.key || '')) return E(400, 'Dữ liệu không hợp lệ.');
    const C = cfg(); if (b.key.startsWith('game:') && !C.games[b.key.slice(5)].on) return E(400, 'Trò chơi này đang tắt.');
    const st = b.key.startsWith('view') ? 0 : b.key.startsWith('game') ? C.games[b.key.slice(5)].stars : C.rewards.lessonStars, ex = one('SELECT * FROM progress WHERE uid=? AND key=?', u.id, b.key);
    if (ex) { run('UPDATE progress SET score=MAX(COALESCE(score,0),?),ts=? WHERE uid=? AND key=?', +b.score || 0, now(), u.id, b.key); return send(res, 200, { stars: 0 }); }
    run('INSERT INTO progress VALUES(?,?,?,?,?)', u.id, b.key, st, +b.score || 0, now()); return send(res, 200, { stars: st });
  }
  if (k === 'GET students') {
    if (need('teacher')) return;
    const c = (like) => `(SELECT COUNT(*) FROM progress WHERE uid=u.id AND key LIKE '${like}')`;
    return send(res, 200, { students: all(`SELECT u.id,u.username,u.display,u.avatar,u.cls,u.created,${c('done:l:%')} letters,${c('done:s:%')} strokes,${c('game:%')} games,(SELECT COALESCE(SUM(stars),0) FROM progress WHERE uid=u.id) stars,(SELECT MAX(ts) FROM progress WHERE uid=u.id) last FROM users u WHERE role='student' ORDER BY cls,display`) });
  }
  if (k === 'POST student-reset') {
    if (need('teacher')) return;
    if (String(b.password || '').length < 6) return E(400, 'Mật khẩu tối thiểu 6 ký tự.');
    run("UPDATE users SET pw=? WHERE id=? AND role='student'", hash(b.password), +b.id); run('DELETE FROM sessions WHERE uid=?', +b.id); return send(res, 200, { ok: 1 });
  }
  if (k === 'GET config') return send(res, 200, cfg());
  if (k === 'PUT config') {
    if (need('teacher')) return;
    const r = b.rewards || {}, g = {};
    for (const i of GIDS) { const x = (b.games || {})[i] || {}; g[i] = { on: x.on ? 1 : 0, stars: Math.min(5, Math.max(0, Math.round(+x.stars) || 0)), count: Math.min(10, Math.max(3, Math.round(+x.count) || 5)) }; }
    const bd = (r.badges || []).slice(0, 8).map(x => [Math.max(1, Math.round(+x[0]) || 1), String(x[1] || '⭐').slice(0, 8), String(x[2] || '').slice(0, 40)]).filter(x => x[2]).sort((a, b) => a[0] - b[0]);
    setS('config', JSON.stringify({ games: g, rewards: { lessonStars: Math.min(5, Math.max(0, Math.round(+r.lessonStars) || 0)), badges: bd.length ? bd : DEFR.badges } })); return send(res, 200, { ok: 1 });
  }
  if (k === 'POST bonus') {
    if (need('teacher')) return;
    const st = Math.round(+b.stars);
    if (!(st >= 1 && st <= 10) || !one("SELECT 1 x FROM users WHERE id=? AND role='student'", +b.uid)) return E(400, 'Dữ liệu không hợp lệ (tặng 1-10 sao cho một học sinh).');
    run('INSERT INTO progress VALUES(?,?,?,?,?)', +b.uid, 'bonus:' + Date.now() + ':' + String(b.reason || 'Thưởng của giáo viên').replace(/[\r\n]/g, ' ').slice(0, 40), st, 0, now()); return send(res, 200, { ok: 1 });
  }
  if (k === 'GET ai') { const g = gem(); return send(res, 200, { enabled: !!(g.on && g.key), on: !!g.on, hasKey: !!g.key, model: g.model || 'gemini-2.5-flash' }); }
  if (k === 'PUT ai') {
    if (need('teacher')) return;
    const g = gem(); if (typeof b.key === 'string' && b.key.trim()) g.key = b.key.trim().slice(0, 300); if (b.clear) delete g.key;
    if (b.model) g.model = String(b.model).trim().slice(0, 60); g.on = b.on ? 1 : 0; setS('gemini', JSON.stringify(g)); return send(res, 200, { ok: 1 });
  }
  if (k === 'POST ai/test') { if (need('teacher')) return; try { await callGemini('Trả lời ngắn gọn.', [{ role: 'user', parts: [{ text: 'Xin chào' }] }]); return send(res, 200, { ok: 1 }); } catch (e) { return E(502, e.message); } }
  if (k === 'POST ai/chat') {
    if (!gem().on) return E(400, 'Trợ lý AI đang tắt.');
    const msg = String(b.message || '').trim().slice(0, 1000); if (!msg) return E(400, 'Hãy nhập câu hỏi.');
    const ts = (rl.get(u.id) || []).filter(t => Date.now() - t < 36e5); if (ts.length >= 40) return E(429, 'Bạn hỏi nhiều quá, hãy thử lại sau ít phút nhé.'); ts.push(Date.now()); rl.set(u.id, ts);
    let hist = (Array.isArray(b.history) ? b.history : []).slice(-6).map(m => ({ role: m.r === 'user' ? 'user' : 'model', parts: [{ text: String(m.t || '').slice(0, 1000) }] })); while (hist.length && hist[0].role !== 'user') hist.shift();
    const notes = all("SELECT key,note,strokes FROM items WHERE note!='' OR strokes!=''").map(i => `${i.key.replace('l:', 'Chữ ').replace('s:', 'Nét số ')}: ${i.note || ''}${i.strokes ? ' [thứ tự nét: ' + i.strokes + ']' : ''}`).join('\n').slice(0, 4000);
    const sys = SYS + (u.role === 'student' ? '\nNgười đang hỏi là HỌC SINH LỚP 1: trả lời tối đa 3 câu ngắn, từ đơn giản, có lời khen.' : '\nNgười đang hỏi là GIÁO VIÊN/PHỤ HUYNH: trả lời có cấu trúc, thực tế.') + '\nDữ liệu cấu tạo chữ do giáo viên đã nhập (chỉ dùng nguồn này khi nói về cấu tạo chữ; nếu thiếu thì nói giáo viên cần kiểm tra):\n' + (notes || '(chưa có)');
    try { return send(res, 200, { text: await callGemini(sys, [...hist, { role: 'user', parts: [{ text: msg }] }]) }); } catch (e) { return E(502, e.message); }
  }
  if (k === 'GET worksheets') { if (need('teacher')) return; return send(res, 200, { rows: all('SELECT * FROM worksheets WHERE owner=? ORDER BY id DESC', u.id) }); }
  if (k === 'POST worksheets') {
    if (need('teacher')) return;
    const nm = String(b.name || 'Phiếu mới').slice(0, 100), js = JSON.stringify(b.json || {});
    if (b.id && one('SELECT 1 x FROM worksheets WHERE id=? AND owner=?', +b.id, u.id)) { run('UPDATE worksheets SET name=?,json=? WHERE id=?', nm, js, +b.id); return send(res, 200, { id: +b.id }); }
    const r = run('INSERT INTO worksheets(owner,name,json,created) VALUES(?,?,?,?)', u.id, nm, js, now()); return send(res, 200, { id: Number(r.lastInsertRowid) });
  }
  if (k === 'DELETE worksheets') { if (need('teacher')) return; run('DELETE FROM worksheets WHERE id=? AND owner=?', +url.searchParams.get('id'), u.id); return send(res, 200, { ok: 1 }); }
  if (k === 'GET font') { const f = getS('font'); return send(res, 200, f ? { data: JSON.parse(f).data, name: JSON.parse(f).name } : {}); }
  if (k === 'PUT font') {
    if (need('teacher')) return;
    if (!/^[A-Za-z0-9+/=]+$/.test(b.data || '') || b.data.length > 9e6) return E(400, 'File font không hợp lệ hoặc quá lớn.');
    setS('font', JSON.stringify({ name: String(b.name || 'font.ttf').slice(0, 100), data: b.data })); return send(res, 200, { ok: 1 });
  }
  if (k === 'DELETE font') { if (need('teacher')) return; run("DELETE FROM settings WHERE k='font'"); return send(res, 200, { ok: 1 }); }
  if (k === 'GET teachercode') { if (need('teacher')) return; return send(res, 200, { code: tc }); }
  return E(404, 'Không tìm thấy.');
}
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.ttf': 'font/ttf', '.png': 'image/png' };
http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    let f = path.normalize(path.join(PUB, decodeURIComponent(url.pathname)));
    if (!f.startsWith(PUB) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(PUB, 'index.html');
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
  } catch (e) { try { send(res, 500, { error: 'Lỗi máy chủ hoặc dữ liệu gửi lên không hợp lệ.' }); } catch { } }
}).listen(PORT, () => console.log(`Bé Vui Học Viết chạy tại http://localhost:${PORT}\nMÃ XÁC NHẬN GIÁO VIÊN: ${tc}`));
