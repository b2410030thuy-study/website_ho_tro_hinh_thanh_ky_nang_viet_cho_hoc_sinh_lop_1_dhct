import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const isConfigured = Boolean(url && key);

export const supabase = createClient(url || 'http://localhost:54321', key || 'missing-key', {
  // PKCE: link khôi phục mật khẩu dùng ?code=... nên không xung đột với HashRouter (#/...).
  auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

// Học sinh không có email: dùng "mã học sinh" để tạo email nội bộ.
export const toEmail = (idOrEmail: string) => {
  const v = idOrEmail.trim().toLowerCase();
  return v.includes('@') ? v : `${v.replace(/[^a-z0-9._-]/g, '')}@hocsinh.bevuihoc.app`;
};
