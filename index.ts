// Supabase Edge Function: gọi Google Gemini một cách an toàn.
// GEMINI_API_KEY nằm trong Supabase Secrets, KHÔNG bao giờ gửi xuống trình duyệt.
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const BASE = `Bạn là trợ lý dạy tập viết chữ cho học sinh lớp 1 ở Việt Nam. Luôn trả lời bằng tiếng Việt chuẩn, câu ngắn, dễ hiểu, thân thiện.
Chủ đề: bảng 29 chữ cái tiếng Việt, 14 nét cơ bản, cách cấu tạo chữ, bài tập và trò chơi nhận biết chữ/nét.
Không yêu cầu trẻ viết trên máy tính; việc viết thực hiện trên giấy bằng bút. Nếu câu hỏi không liên quan đến học tập, nhẹ nhàng đưa về chủ đề học chữ. Không hỏi hay lưu thông tin cá nhân.`;
const STUDENT = BASE + '\nĐang nói chuyện với HỌC SINH lớp 1: tối đa 4 câu ngắn, từ ngữ đơn giản, có thể dùng 1 biểu tượng vui.';
const TEACHER = BASE + '\nĐang hỗ trợ GIÁO VIÊN/PHỤ HUYNH: có thể trả lời chi tiết hơn, gợi ý bài tập, câu hỏi, trò chơi, cách giải thích sư phạm.';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return json({ error: 'unauthorized' }, 401);

    const key = Deno.env.get('GEMINI_API_KEY');
    if (!key) return json({ configured: false, reply: '' });

    const { data: prof } = await sb.from('profiles').select('role').eq('id', user.id).maybeSingle();
    const system = prof?.role === 'teacher' ? TEACHER : STUDENT;

    const body = await req.json().catch(() => ({}));
    const msgs = (Array.isArray(body.messages) ? body.messages : []).slice(-10)
      .map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: String(m.text ?? '').slice(0, 1200) }],
      }));
    if (!msgs.length || msgs[msgs.length - 1].role !== 'user') return json({ error: 'bad_request' }, 400);

    const model = Deno.env.get('GEMINI_MODEL') ?? 'gemini-2.5-flash';
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: msgs,
        generationConfig: { temperature: 0.6, maxOutputTokens: 700 },
      }),
    });
    if (r.status === 429) return json({ configured: true, error: 'quota', reply: '' });
    if (!r.ok) return json({ configured: true, error: 'upstream', status: r.status, reply: '' });
    const data = await r.json();
    const reply = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? '').join('') ?? '';
    return json({ configured: true, reply });
  } catch (e) {
    return json({ error: 'server', message: String(e) }, 500);
  }
});
