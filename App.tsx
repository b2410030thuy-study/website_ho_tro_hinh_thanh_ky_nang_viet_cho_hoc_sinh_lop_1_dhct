import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ReactNode } from 'react';
import { AuthProvider, useAuth } from './auth';
import { ContentProvider } from './hooks/useContent';
import { isConfigured } from './lib/supabase';
import { Login, Register, Forgot, Reset } from './pages/AuthPages';
import { StudentLayout, TeacherLayout } from './components/Layouts';
import * as S from './pages/student/StudentPages';
import * as T from './pages/teacher/TeacherPages';
import { ContentEditor } from './pages/teacher/ContentEditor';
import { Worksheets } from './pages/teacher/Worksheets';
import { Assistant } from './pages/Assistant';
import { ProfileEditor } from './components/Profile';

function Guard({ role, children }: { role: 'student' | 'teacher'; children: ReactNode }) {
  const { session, profile, loading, signOut } = useAuth();
  if (loading) return <div className="center">Đang tải…</div>;
  if (!session) return <Navigate to="/login" replace />;
  if (!profile) return <div className="center">Đang tải hồ sơ… <button className="btn ghost" onClick={signOut}>Đăng xuất</button></div>;
  if (profile.role !== role) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function Landing() {
  const { session, profile, loading } = useAuth();
  if (loading) return <div className="center">Đang tải…</div>;
  if (!session) return <Navigate to="/login" replace />;
  if (!profile) return <div className="center">Đang tải hồ sơ…</div>;
  return <Navigate to={profile.role === 'teacher' ? '/gv' : '/hoc'} replace />;
}

function Setup() {
  return (
    <div className="center"><div className="auth-card">
      <h2>⚠️ Chưa cấu hình Supabase</h2>
      <p>Website chưa có <code>VITE_SUPABASE_URL</code> và <code>VITE_SUPABASE_PUBLISHABLE_KEY</code>.
        Hãy làm theo mục “Cấu hình biến môi trường” trong README.md (thêm Secrets trên GitHub rồi chạy lại Actions).</p>
    </div></div>
  );
}

export default function App() {
  if (!isConfigured) return <Setup />;
  return (
    <HashRouter>
      <AuthProvider><ContentProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot" element={<Forgot />} />
          <Route path="/reset" element={<Reset />} />

          <Route path="/hoc" element={<Guard role="student"><StudentLayout /></Guard>}>
            <Route index element={<S.Home />} />
            <Route path="chu-cai" element={<S.LetterList />} />
            <Route path="chu-cai/:id" element={<S.Lesson kind="letter" />} />
            <Route path="net" element={<S.StrokeList />} />
            <Route path="net/:id" element={<S.Lesson kind="stroke" />} />
            <Route path="video" element={<S.VideoList />} />
            <Route path="tro-choi" element={<S.GameList />} />
            <Route path="tro-choi/:id" element={<S.GamePage />} />
            <Route path="sao" element={<S.Stars />} />
            <Route path="thanh-tich" element={<S.Achievements />} />
            <Route path="ho-so" element={<ProfileEditor />} />
            <Route path="tro-ly" element={<Assistant audience="student" />} />
          </Route>

          <Route path="/gv" element={<Guard role="teacher"><TeacherLayout /></Guard>}>
            <Route index element={<T.Overview />} />
            <Route path="hoc-sinh" element={<T.Students />} />
            <Route path="chu-cai" element={<ContentEditor title="Quản lý chữ cái" kinds={['letter']} fields={['video', 'note', 'related']} />} />
            <Route path="net" element={<ContentEditor title="Quản lý nét" kinds={['stroke']} fields={['video', 'note']} />} />
            <Route path="video" element={<ContentEditor title="Quản lý video YouTube" kinds={['letter', 'stroke']} fields={['video']} />} />
            <Route path="ghi-chu" element={<ContentEditor title="Quản lý ghi chú cấu tạo chữ" kinds={['letter', 'stroke']} fields={['note', 'related']} />} />
            <Route path="tro-choi" element={<T.GamesAdmin />} />
            <Route path="phieu" element={<Worksheets />} />
            <Route path="tien-trinh" element={<T.ProgressView />} />
            <Route path="phan-thuong" element={<T.RewardsAdmin />} />
            <Route path="tro-ly" element={<Assistant audience="teacher" />} />
            <Route path="cai-dat" element={<T.Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ContentProvider></AuthProvider>
    </HashRouter>
  );
}
