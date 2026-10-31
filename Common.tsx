import { ReactNode } from 'react';
import { youtubeId, embedUrl } from '../lib/youtube';

export function Avatar({ url, size = 44 }: { url?: string; size?: number }) {
  const v = url || 'emoji:🐻';
  if (v.startsWith('emoji:')) return <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.62 }}>{v.slice(6)}</span>;
  return <img className="avatar" src={v} alt="" style={{ width: size, height: size }} />;
}

export function StrokeIcon({ d, size = 72 }: { d: string; size?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden>
      <path d={d} fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function VideoBox({ url }: { url?: string }) {
  const id = url ? youtubeId(url) : null;
  if (!url) return <div className="video-empty">🎬 Cô giáo chưa thêm video cho bài này.</div>;
  if (!id) return <div className="video-empty">⚠️ Link video chưa đúng định dạng YouTube.</div>;
  return (
    <div className="video-wrap">
      <iframe src={embedUrl(id)} title="Video bài học" allow="accelerometer; encrypted-media; picture-in-picture" allowFullScreen />
    </div>
  );
}

export const Card = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div className={`card ${className}`}>{children}</div>
);

export function Notice({ kind = 'info', children }: { kind?: 'info' | 'error' | 'ok'; children: ReactNode }) {
  return <div className={`notice ${kind}`}>{children}</div>;
}
