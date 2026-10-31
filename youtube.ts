// Hỗ trợ: watch?v=, youtu.be/, /embed/, /shorts/, /live/, m.youtube.com, youtube-nocookie.com
export function youtubeId(input: string): string | null {
  const s = (input || '').trim();
  if (!s) return null;
  try {
    const u = new URL(s.startsWith('http') ? s : 'https://' + s);
    const host = u.hostname.replace(/^www\.|^m\./, '');
    let id: string | null = null;
    if (host === 'youtu.be') id = u.pathname.split('/')[1];
    else if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
      if (u.searchParams.get('v')) id = u.searchParams.get('v');
      else {
        const m = u.pathname.match(/^\/(embed|shorts|live|v)\/([\w-]{11})/);
        if (m) id = m[2];
      }
    }
    return id && /^[\w-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}
export const embedUrl = (id: string) => `https://www.youtube-nocookie.com/embed/${id}?rel=0`;
