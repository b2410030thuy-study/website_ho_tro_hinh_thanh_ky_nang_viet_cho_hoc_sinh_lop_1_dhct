import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { supabase } from './lib/supabase';

export type Profile = {
  id: string; role: 'student' | 'teacher'; full_name: string; display_name: string; avatar_url: string;
};
type Ctx = {
  session: any; profile: Profile | null; loading: boolean;
  refreshProfile: () => Promise<void>; signOut: () => Promise<void>;
};
const C = createContext<Ctx>(null as any);
export const useAuth = () => useContext(C);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (uid?: string) => {
    if (!uid) { setProfile(null); return; }
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
    setProfile((data as Profile) || null);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await load(data.session?.user.id);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === 'PASSWORD_RECOVERY') window.location.hash = '#/reset';
      setTimeout(() => load(s?.user.id), 0); // tránh gọi Supabase trực tiếp trong callback
    });
    return () => sub.subscription.unsubscribe();
  }, [load]);

  const value: Ctx = {
    session, profile, loading,
    refreshProfile: () => load(session?.user.id),
    signOut: async () => { await supabase.auth.signOut(); setProfile(null); },
  };
  return <C.Provider value={value}>{children}</C.Provider>;
}
