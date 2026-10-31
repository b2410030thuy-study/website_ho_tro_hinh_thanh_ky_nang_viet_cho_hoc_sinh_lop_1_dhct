import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Card, Notice } from '../components/Common';

type Msg = { role: 'user' | 'assistant'; text: string };
const SUGG = {
  student: ['Nét móc xuôi là nét gì?', 'Chữ b có những nét nào?', 'Cho em một câu đố về chữ cái'],
  teacher: ['Gợi ý bài tập luyện nét khuyết trên', 'Tạo 5 câu hỏi trắc nghiệm về chữ ơ', 'Cách giải thích nét thắt cho học sinh lớp 1'],
};

export function Assistant({ audience }: { audience: 'student' | 'teacher' }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState(''); const [busy, setBusy] = useState(false); const [note, setNote] = useState('');

  async function send(t = text) {
    if (!t.trim() || busy) return;
    const next: Msg[] = [...msgs, { role: 'user', text: t.trim() }];
    setMsgs(next); setText(''); setBusy(true); setNote('');
    const { data, error } = await supabase.functions.invoke('gemini-assistant', { body: { messages: next } });
    setBusy(false);
    if (error) return setNote('Chưa kết nối được trợ lý AI. Phần học vẫn dùng bình thường nhé!');
    if (data?.configured === false) return setNote('Trợ lý AI chưa được cài đặt (cần Gemini API Key trong Supabase Secrets). Các phần khác vẫn hoạt động bình thường.');
    if (data?.error === 'quota') return setNote('Trợ lý đang hết lượt dùng tạm thời. Hãy thử lại sau.');
    if (!data?.reply) return setNote('Trợ lý chưa trả lời được. Hãy thử lại.');
    setMsgs([...next, { role: 'assistant', text: data.reply }]);
  }

  return (
    <Card className="chat">
      <h2>🤖 Trợ lý AI</h2>
      <div className="chat-log">
        {!msgs.length && <p className="muted">Hãy hỏi mình nhé! Ví dụ:</p>}
        {!msgs.length && SUGG[audience].map((s) => <button key={s} className="chip" onClick={() => send(s)}>{s}</button>)}
        {msgs.map((m, i) => <div key={i} className={`bubble ${m.role}`}>{m.text}</div>)}
        {busy && <div className="bubble assistant">Đang nghĩ…</div>}
      </div>
      {note && <Notice>{note}</Notice>}
      <div className="row">
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder="Nhập câu hỏi…" />
        <button className="btn" onClick={() => send()} disabled={busy}>Gửi</button>
      </div>
    </Card>
  );
}
