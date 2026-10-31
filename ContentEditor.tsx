import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../auth';
import { useContent } from '../../hooks/useContent';
import { LETTERS, STROKES } from '../../data/content';
import { youtubeId } from '../../lib/youtube';
import { Card, Notice, VideoBox } from '../../components/Common';

type Field = 'video' | 'note' | 'related';
type Kind = 'letter' | 'stroke';

function Row({ kind, refId, label, fields }: { kind: Kind; refId: string | number; label: string; fields: Field[] }) {
  const { session } = useAuth(); const { videos, notes, refresh } = useContent();
  const key = `${kind}:${refId}`;
  const [url, setUrl] = useState(videos[key] || '');
  const [note, setNote] = useState(notes[key]?.note || '');
  const [rel, setRel] = useState<number[]>(notes[key]?.related || []);
  const [prev, setPrev] = useState(false); const [msg, setMsg] = useState<{ k: 'ok' | 'error'; t: string } | null>(null);
  const col = kind === 'letter' ? 'letter_id' : 'stroke_id';

  async function save() {
    try {
      if (fields.includes('video')) {
        if (url.trim()) {
          if (!youtubeId(url)) return setMsg({ k: 'error', t: 'Link không phải YouTube hợp lệ.' });
          const { error } = await supabase.from('youtube_videos').upsert({ [col]: refId, url: url.trim(), updated_by: session.user.id, updated_at: new Date().toISOString() }, { onConflict: col });
          if (error) throw error;
        } else {
          const { error } = await supabase.from('youtube_videos').delete().eq(col, refId); if (error) throw error;
        }
      }
      if (fields.includes('note') || fields.includes('related')) {
        const row: any = { [col]: refId, updated_at: new Date().toISOString() };
        if (fields.includes('note')) row.note = note;
        if (fields.includes('related') && kind === 'letter') row.related_stroke_ids = rel;
        const { error } = await supabase.from('composition_notes').upsert(row, { onConflict: col }); if (error) throw error;
      }
      await refresh(); setMsg({ k: 'ok', t: 'Đã lưu' });
    } catch (e: any) { setMsg({ k: 'error', t: e.message }); }
  }
  return (
    <Card className="editor-row">
      <h3 className="writing-label">{label}</h3>
      {fields.includes('video') && (<div><label>Link YouTube<input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." /></label>
        <div className="row"><button className="btn small ghost" onClick={() => setPrev(!prev)}>👁 Xem trước</button>
          <button className="btn small ghost" onClick={() => setUrl('')}>🗑 Xóa link</button></div>
        {prev && <VideoBox url={url} />}</div>)}
      {fields.includes('note') && <label>Ghi chú cấu tạo<textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></label>}
      {fields.includes('related') && kind === 'letter' && (<div>Các nét liên quan (bấm theo thứ tự viết; bấm “↺” để xóa)
        <div className="row wrap">{STROKES.map((s) => <button key={s.id} className="chip" onClick={() => setRel([...rel, s.id])}>{s.id}. {s.name}</button>)}</div>
        <p>Đã chọn: <b>{rel.map((id) => STROKES.find((s) => s.id === id)?.name).join(' → ') || '(chưa có)'}</b> <button className="btn small ghost" onClick={() => setRel([])}>↺</button></p></div>)}
      <button className="btn" onClick={save}>Lưu</button>
      {msg && <Notice kind={msg.k}>{msg.t}</Notice>}
    </Card>
  );
}

export function ContentEditor({ title, kinds, fields }: { title: string; kinds: Kind[]; fields: Field[] }) {
  const { videos, notes } = useContent();
  const [tab, setTab] = useState<Kind>(kinds[0]);
  // chỉ dựng lại các ô nhập một lần khi dữ liệu vừa tải xong (không mất chữ đang gõ khi lưu 1 dòng)
  const stamp = Object.keys(videos).length + Object.keys(notes).length > 0 ? 'loaded' : 'empty';
  return (<div><h1>{title}</h1>
    {kinds.length > 1 && <div className="tabs"><button className={tab === 'letter' ? 'on' : ''} onClick={() => setTab('letter')}>29 chữ cái</button><button className={tab === 'stroke' ? 'on' : ''} onClick={() => setTab('stroke')}>14 nét</button></div>}
    {(kinds.length > 1 ? tab : kinds[0]) === 'letter'
      ? LETTERS.map((l) => <Row key={l.id + stamp} kind="letter" refId={l.id} label={`Chữ ${l.ch}`} fields={fields} />)
      : STROKES.map((s) => <Row key={s.id + '-' + stamp} kind="stroke" refId={s.id} label={`${s.id}. ${s.name}`} fields={fields.filter((f) => f !== 'related')} />)}
  </div>);
}
