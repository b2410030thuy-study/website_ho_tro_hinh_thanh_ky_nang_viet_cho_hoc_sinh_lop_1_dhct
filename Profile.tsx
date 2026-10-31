import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth';
import { AVATARS } from '../data/content';
import { Avatar, Card, Notice } from './Common';

export function ProfileEditor() {
  const { profile, session, refreshProfile } = useAuth();
  const [edit, setEdit] = useState(false);
  const [name, setName] = useState(profile?.display_name || '');
  const [full, setFull] = useState(profile?.full_name || '');
  const [avatar, setAvatar] = useState(profile?.avatar_url || 'emoji:🐻');
  const [msg, setMsg] = useState<{ k: 'ok' | 'error'; t: string } | null>(null);
  const [busy, setBusy] = useState(false);
  if (!profile) return null;

  async function upload(file: File) {
    if (!file.type.startsWith('image/') || file.size > 2 * 1024 * 1024) return setMsg({ k: 'error', t: 'Chọn ảnh dưới 2MB.' });
    setBusy(true);
    const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '');
    const path = `${session.user.id}/avatar-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    setBusy(false);
    if (error) return setMsg({ k: 'error', t: 'Tải ảnh lên không được: ' + error.message });
    setAvatar(supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl);
  }
  async function save() {
    if (!name.trim()) return setMsg({ k: 'error', t: 'Tên hiển thị không được để trống.' });
    setBusy(true);
    const { error } = await supabase.from('profiles')
      .update({ display_name: name.trim(), full_name: full.trim(), avatar_url: avatar }).eq('id', profile!.id);
    setBusy(false);
    if (error) return setMsg({ k: 'error', t: 'Lưu không được: ' + error.message });
    await refreshProfile();
    setEdit(false); setMsg({ k: 'ok', t: 'Đã lưu hồ sơ!' });
  }

  return (
    <Card>
      <div className="profile-head">
        <Avatar url={edit ? avatar : profile.avatar_url} size={96} />
        <div>
          <h2>{profile.display_name}</h2>
          <p className="muted">{profile.full_name} · {profile.role === 'student' ? 'Học sinh' : 'Giáo viên / Phụ huynh'}</p>
        </div>
      </div>
      {msg && <Notice kind={msg.k}>{msg.t}</Notice>}
      {!edit ? (
        <button className="btn big" onClick={() => { setName(profile.display_name); setFull(profile.full_name); setAvatar(profile.avatar_url); setEdit(true); setMsg(null); }}>SỬA HỒ SƠ</button>
      ) : (
        <div className="form">
          <label>Họ tên<input value={full} onChange={(e) => setFull(e.target.value)} /></label>
          <label>Tên hiển thị<input value={name} onChange={(e) => setName(e.target.value)} /></label>
          <div>Chọn avatar có sẵn
            <div className="avatar-grid">
              {AVATARS.map((a) => (
                <button type="button" key={a} className={avatar === 'emoji:' + a ? 'sel' : ''} onClick={() => setAvatar('emoji:' + a)}>{a}</button>
              ))}
            </div>
          </div>
          <label>Hoặc tải ảnh đại diện lên<input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} /></label>
          <div className="row">
            <button className="btn big" disabled={busy} onClick={save}>{busy ? 'Đang lưu…' : 'LƯU THAY ĐỔI'}</button>
            <button className="btn ghost" onClick={() => setEdit(false)}>Hủy</button>
          </div>
        </div>
      )}
    </Card>
  );
}
