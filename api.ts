import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const notify = () => window.dispatchEvent(new Event('progress-changed'));

export async function recordLesson(kind: 'letter' | 'stroke', ref: string) {
  const { data, error } = await supabase.rpc('record_lesson', { p_kind: kind, p_ref: ref });
  if (error) throw error;
  notify();
  return data as { gained: number; total: number; new_rewards: string[] };
}
export async function recordGame(game: string, score: number, total: number) {
  const { data, error } = await supabase.rpc('record_game', { p_game: game, p_score: score, p_total: total });
  if (error) throw error;
  notify();
  return data as { gained: number; total: number; new_rewards: string[]; game_stars: number };
}

// Tiến trình của 1 học sinh (học sinh tự xem, hoặc giáo viên xem học sinh thuộc lớp mình).
export function useProgress(studentId?: string) {
  const [rows, setRows] = useState<any[]>([]);
  const [rewards, setRewards] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const load = useCallback(async () => {
    if (!studentId) return;
    const [p, r, g] = await Promise.all([
      supabase.from('student_progress').select('*').eq('student_id', studentId).order('updated_at', { ascending: false }),
      supabase.from('student_rewards').select('earned_at, rewards(*)').eq('student_id', studentId).order('earned_at', { ascending: false }),
      supabase.from('game_results').select('*').eq('student_id', studentId).order('created_at', { ascending: false }).limit(30),
    ]);
    setRows(p.data || []); setRewards(r.data || []); setResults(g.data || []); setLoaded(true);
  }, [studentId]);
  useEffect(() => {
    load();
    window.addEventListener('progress-changed', load);
    return () => window.removeEventListener('progress-changed', load);
  }, [load]);
  const total = rows.reduce((s, r) => s + (r.stars || 0), 0);
  return { rows, rewards, results, total, loaded, reload: load };
}
