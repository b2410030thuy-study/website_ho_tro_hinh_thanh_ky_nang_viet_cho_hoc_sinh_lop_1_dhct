import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase, toEmail } from '../lib/supabase';
import { AVATARS } from '../data/content';
import { Notice } from '../components/Common';

const friendly = (m: string) => {
  if (/Invalid login/i.test(m)) return 'Sai tên đăng nhập hoặc mật khẩu.';
  if (/already registered|already been registered/i.test(m)) return 'Tên đăng nhập/email này đã có người dùng.';
  if (/Database error/i.test(m)) return 'Không tạo được tài khoản: mã mời giáo viên không đúng/đã dùng, hoặc mã học sinh bị trùng.';
  if (/Password should be/i.test(m)) return 'Mật khẩu quá ngắn (tối thiểu 6 ký tự).';
  if (/Email not confirmed/i.test(m)) return 'Email chưa được xác nhận. Hãy kiểm tra hộp thư.';
  return m;
};

function PasswordInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="pw">
      <input type={show ? 'text' : 'password'} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} required minLength={6} />
      <button type="button" className="ghost-btn" onClick={() => setShow(!show)}>{show ? '🙈 Ẩn' : '👁 Hiện'}</button>
    </span>
  );
}

const Shell = ({ title, children }: any) => (
  <div className="auth-page"><div className="auth-card">
    <div className="logo">✏️</div><h1>BÉ VUI HỌC VIẾT</h1><p className="muted">Luyện chữ lớp 1</p>
    <h2>{title}</h2>{children}
  </div></div>
);

export function Login() {
  const nav = useNavigate();
  const [id, setId] = useState(''); const [pw, setPw] = useState('');
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setErr('');
    const { error } = await supabase.auth.signInWithPassword({ email: toEmail(id), password: pw });
    setBusy(false);
    if (error) setErr(friendly(error.message)); else nav('/');
  }
  return (
    <Shell title="Đăng nhập">
      <form className="form" onSubmit={submit}>
        <label>Mã học sinh hoặc email<input value={id} onChange={(e) => setId(e.target.value)} required autoComplete="username" /></label>
        <label>Mật khẩu<PasswordInput value={pw} onChange={setPw} /></label>
        {err && <Notice kind="error">{err}</Notice>}
        <button className="btn big" disabled={busy}>{busy ? 'Đang vào…' : 'ĐĂNG NHẬP'}</button>
      </form>
      <p><Link to="/forgot">Quên mật khẩu?</Link> · <Link to="/register">Đăng ký tài khoản</Link></p>
    </Shell>
  );
}

export function Register() {
  const nav = useNavigate();
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [f, setF] = useState<any>({ full_name: '', display_name: '', student_code: '', email: '', pw: '', pw2: '', grade: '1', class_code: '', invite_code: '', avatar: '🐻' });
  const [err, setErr] = useState(''); const [ok, setOk] = useState(''); const [busy, setBusy] = useState(false);
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target ? e.target.value : e });

  async function submit(e: FormEvent) {
    e.preventDefault(); setErr(''); setOk('');
    if (f.pw !== f.pw2) return setErr('Hai mật khẩu chưa giống nhau.');
    let email = f.email.trim();
    if (role === 'student') {
      if (!/^[A-Za-z0-9._-]{3,30}$/.test(f.student_code.trim())) return setErr('Mã học sinh gồm 3–30 chữ không dấu, số, . _ -');
      if (!email) email = toEmail(f.student_code);
    } else if (!email) return setErr('Vui lòng nhập email.');
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email, password: f.pw,
      options: { data: {
        role, full_name: f.full_name.trim(), display_name: f.display_name.trim() || f.full_name.trim(),
        avatar_url: 'emoji:' + f.avatar, student_code: f.student_code.trim(), grade: f.grade,
        class_code: f.class_code.trim(), invite_code: f.invite_code.trim(),
      } },
    });
    setBusy(false);
    if (error) return setErr(friendly(error.message));
    if (data.session) nav('/');
    else setOk('Tạo tài khoản thành công! Hãy kiểm tra email để xác nhận rồi đăng nhập.');
  }

  return (
    <Shell title="Đăng ký">
      <div className="tabs">
        <button className={role === 'student' ? 'on' : ''} onClick={() => setRole('student')} type="button">🧒 Học sinh</button>
        <button className={role === 'teacher' ? 'on' : ''} onClick={() => setRole('teacher')} type="button">👩‍🏫 Giáo viên / Phụ huynh</button>
      </div>
      <form className="form" onSubmit={submit}>
        <label>Họ tên<input value={f.full_name} onChange={set('full_name')} required /></label>
        <label>Tên hiển thị<input value={f.display_name} onChange={set('display_name')} placeholder="Tên bé muốn được gọi" /></label>
        {role === 'student' && (<>
          <label>Mã tài khoản học sinh (dùng để đăng nhập)<input value={f.student_code} onChange={set('student_code')} required /></label>
          <label>Lớp<select value={f.grade} onChange={set('grade')}><option value="1">Lớp 1</option><option value="1A">Lớp 1A</option><option value="1B">Lớp 1B</option><option value="1C">Lớp 1C</option></select></label>
          <label>Mã lớp của cô giáo (nếu có)<input value={f.class_code} onChange={set('class_code')} placeholder="Ví dụ: A1B2C3" /></label>
          <label>Email phụ huynh (không bắt buộc – nếu nhập thì đăng nhập bằng email này)<input type="email" value={f.email} onChange={set('email')} /></label>
        </>)}
        {role === 'teacher' && (<>
          <label>Email<input type="email" value={f.email} onChange={set('email')} required /></label>
          <label>Mã mời giáo viên<input value={f.invite_code} onChange={set('invite_code')} required placeholder="Do quản trị viên cấp" /></label>
        </>)}
        <label>Mật khẩu<PasswordInput value={f.pw} onChange={set('pw')} /></label>
        <label>Nhập lại mật khẩu<PasswordInput value={f.pw2} onChange={set('pw2')} /></label>
        <div>Chọn avatar
          <div className="avatar-grid">{AVATARS.map((a) => <button type="button" key={a} className={f.avatar === a ? 'sel' : ''} onClick={() => set('avatar')(a)}>{a}</button>)}</div>
        </div>
        {err && <Notice kind="error">{err}</Notice>}
        {ok && <Notice kind="ok">{ok}</Notice>}
        <button className="btn big" disabled={busy}>{busy ? 'Đang tạo…' : 'TẠO TÀI KHOẢN'}</button>
      </form>
      <p>Đã có tài khoản? <Link to="/login">Đăng nhập</Link></p>
    </Shell>
  );
}

export function Forgot() {
  const [email, setEmail] = useState(''); const [msg, setMsg] = useState(''); const [err, setErr] = useState('');
  async function submit(e: FormEvent) {
    e.preventDefault(); setErr(''); setMsg('');
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin + window.location.pathname });
    if (error) setErr(error.message); else setMsg('Nếu email đúng, hệ thống đã gửi link đặt lại mật khẩu. Hãy kiểm tra hộp thư.');
  }
  return (
    <Shell title="Quên mật khẩu">
      <form className="form" onSubmit={submit}>
        <label>Email đã đăng ký<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        <Notice>Học sinh đăng ký chỉ bằng mã học sinh (không có email): nhờ cô giáo/quản trị viên đặt lại mật khẩu.</Notice>
        {err && <Notice kind="error">{err}</Notice>}{msg && <Notice kind="ok">{msg}</Notice>}
        <button className="btn big">GỬI LINK</button>
      </form>
      <p><Link to="/login">← Quay lại đăng nhập</Link></p>
    </Shell>
  );
}

export function Reset() {
  const nav = useNavigate();
  const [pw, setPw] = useState(''); const [err, setErr] = useState('');
  async function submit(e: FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) setErr(friendly(error.message)); else nav('/');
  }
  return (
    <Shell title="Đặt mật khẩu mới">
      <form className="form" onSubmit={submit}>
        <label>Mật khẩu mới<PasswordInput value={pw} onChange={setPw} /></label>
        {err && <Notice kind="error">{err}</Notice>}
        <button className="btn big">LƯU MẬT KHẨU</button>
      </form>
    </Shell>
  );
}
