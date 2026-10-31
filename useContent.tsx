import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth';
import { fetchActiveFont, applyWritingFont, FontSetting } from '../lib/font';

type Note = { note: string; related: number[] };
type Ctx = {
  videos: Record<string, string>;      // 'letter:a' | 'stroke:3' -> url
  notes: Record<string, Note>;
  font: FontSetting | null;
  refresh: () => Promise<void>;
};
const C = createContext<Ctx>({ videos: {}, notes: {}, font: null, refresh: async () => {} });
export const useContent = () => useContext(C);

export function ContentProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [videos, setVideos] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, Note>>({});
  const [font, setFont] = useState<FontSetting | null>(null);

  const refresh = useCallback(async () => {
    const [v, n, f] = await Promise.all([
      supabase.from('youtube_videos').select('letter_id, stroke_id, url'),
      supabase.from('composition_notes').select('letter_id, stroke_id, note, related_stroke_ids'),
      fetchActiveFont(),
    ]);
    const vm: Record<string, string> = {};
    (v.data || []).forEach((r: any) => { vm[r.letter_id ? `letter:${r.letter_id}` : `stroke:${r.stroke_id}`] = r.url; });
    const nm: Record<string, Note> = {};
    (n.data || []).forEach((r: any) => {
      nm[r.letter_id ? `letter:${r.letter_id}` : `stroke:${r.stroke_id}`] = { note: r.note, related: r.related_stroke_ids || [] };
    });
    setVideos(vm); setNotes(nm); setFont(f);
    if (f?.url) applyWritingFont(f.url).catch(() => {});
  }, []);

  useEffect(() => { if (session) refresh(); }, [session, refresh]);
  return <C.Provider value={{ videos, notes, font, refresh }}>{children}</C.Provider>;
}
