import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { useProgress } from '../services/api';
import { Avatar } from './Common';

const studentNav = [
  ['/hoc', '🏠', 'Trang chủ'], ['/hoc/chu-cai', '🔤', '29 chữ cái'], ['/hoc/net', '〰️', '14 nét'],
  ['/hoc/video', '🎬', 'Video'], ['/hoc/tro-choi', '🎮', 'Trò chơi'], ['/hoc/sao', '⭐', 'Ngôi sao'],
  ['/hoc/thanh-tich', '🏆', 'Thành tích'], ['/hoc/ho-so', '🙂', 'Hồ sơ'], ['/hoc/tro-ly', '🤖', 'Trợ lý AI'],
];
const teacherNav = [
  ['/gv', '📊', 'Tổng quan'], ['/gv/hoc-sinh', '🧒', 'Quản lý học sinh'], ['/gv/chu-cai', '🔤', 'Quản lý chữ cái'],
  ['/gv/net', '〰️', 'Quản lý nét'], ['/gv/video', '🎬', 'Quản lý video'], ['/gv/ghi-chu', '📝', 'Quản lý ghi chú'],
  ['/gv/tro-choi', '🎮', 'Quản lý trò chơi'], ['/gv/phieu', '🖨️', 'Tạo phiếu bài tập'],
  ['/gv/tien-trinh', '📈', 'Theo dõi tiến trình'], ['/gv/phan-thuong', '🏅', 'Quản lý phần thưởng'],
  ['/gv/tro-ly', '🤖', 'Trợ lý AI'], ['/gv/cai-dat', '⚙️', 'Cài đặt'],
];

export function StudentLayout() {
  const { profile, signOut } = useAuth();
  const nav = useNavigate();
  const { total } = useProgress(profile?.id);
  return (
    <div className="student-shell">
      <header className="s-top">
        <strong className="brand">✏️ Bé Vui Học Viết</strong>
        <span className="stars-pill">⭐ {total}</span>
        <span className="who"><Avatar url={profile?.avatar_url} size={38} /> {profile?.display_name}</span>
        <button className="btn ghost" onClick={async () => { await signOut(); nav('/login'); }}>Đăng xuất</button>
      </header>
      <nav className="s-nav">{studentNav.map(([to, ic, label]) => (
        <NavLink key={to} to={to} end={to === '/hoc'} className={({ isActive }) => (isActive ? 'on' : '')}><span>{ic}</span>{label}</NavLink>
      ))}</nav>
      <main className="s-main"><Outlet /></main>
    </div>
  );
}

export function TeacherLayout() {
  const { profile, signOut } = useAuth();
  const nav = useNavigate();
  return (
    <div className="teacher-shell">
      <aside className="t-side">
        <div className="t-brand">✏️ Bé Vui Học Viết<small>Giáo viên / Phụ huynh</small></div>
        <nav>{teacherNav.map(([to, ic, label]) => (
          <NavLink key={to} to={to} end={to === '/gv'} className={({ isActive }) => (isActive ? 'on' : '')}>{ic} {label}</NavLink>
        ))}</nav>
        <div className="t-user"><Avatar url={profile?.avatar_url} size={32} /> {profile?.display_name}
          <button className="btn ghost small" onClick={async () => { await signOut(); nav('/login'); }}>Đăng xuất</button></div>
      </aside>
      <main className="t-main"><Outlet /></main>
    </div>
  );
}
