-- =====================================================================
-- BÉ VUI HỌC VIẾT – Database + RLS.
-- Chạy toàn bộ file này trong Supabase → SQL Editor → New query → Run.
-- =====================================================================
create extension if not exists pgcrypto;

-- ---------- BẢNG ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'student' check (role in ('student','teacher')),
  full_name text not null default '',
  display_name text not null default '',
  avatar_url text not null default 'emoji:🐻',
  created_at timestamptz not null default now()
);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  join_code text not null unique default upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6)),
  created_at timestamptz not null default now()
);

create table public.students (
  id uuid primary key references public.profiles(id) on delete cascade,
  student_code text unique,
  grade text not null default '1',
  class_id uuid references public.classes(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.letters (
  id text primary key,
  upper_ch text not null,
  sort_order int not null
);

create table public.strokes (
  id int primary key,
  name text not null
);

create table public.youtube_videos (
  id uuid primary key default gen_random_uuid(),
  letter_id text unique references public.letters(id) on delete cascade,
  stroke_id int unique references public.strokes(id) on delete cascade,
  url text not null,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint one_target check ((letter_id is not null)::int + (stroke_id is not null)::int = 1)
);

create table public.composition_notes (
  id uuid primary key default gen_random_uuid(),
  letter_id text unique references public.letters(id) on delete cascade,
  stroke_id int unique references public.strokes(id) on delete cascade,
  note text not null default '',
  related_stroke_ids int[] not null default '{}',
  updated_at timestamptz not null default now(),
  constraint one_target check ((letter_id is not null)::int + (stroke_id is not null)::int = 1)
);

create table public.games (
  id text primary key,
  title text not null,
  description text not null default '',
  sort_order int not null default 0,
  is_active boolean not null default true
);

create table public.game_results (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  game_id text not null references public.games(id) on delete cascade,
  score int not null check (score >= 0),
  total int not null check (total > 0),
  stars int not null check (stars between 0 and 3),
  created_at timestamptz not null default now()
);

-- Mỗi (học sinh, mục) chỉ MỘT dòng => sao không bị cộng trùng khi tải lại / mở lại bài.
create table public.student_progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  item_key text not null,
  kind text not null check (kind in ('lesson','game')),
  ref text not null,
  stars int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, item_key)
);

create table public.rewards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  icon text not null default '🏅',
  description text not null default '',
  stars_required int not null default 1
);

create table public.student_rewards (
  student_id uuid not null references public.students(id) on delete cascade,
  reward_id uuid not null references public.rewards(id) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (student_id, reward_id)
);

create table public.worksheets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'Phiếu tập viết',
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.worksheet_elements (
  id uuid primary key default gen_random_uuid(),
  worksheet_id uuid not null references public.worksheets(id) on delete cascade,
  position int not null default 0,
  kind text not null check (kind in ('letters','strokes','text')),
  content text not null default '',
  mode text not null default 'faded' check (mode in ('solid','faded','dotted','blank')),
  lines int not null default 1,
  per_line int not null default 0
);

create table public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Mã mời giáo viên (dùng 1 lần). Không có policy nào => chỉ quản trị viên (SQL Editor) thấy.
create table public.teacher_invites (
  code text primary key,
  expires_at timestamptz,
  used_by uuid,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------- HÀM TRỢ GIÚP ----------
create or replace function public.is_teacher() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher');
$$;

create or replace function public.teaches_student(sid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.students s join public.classes c on c.id = s.class_id
    where s.id = sid and c.teacher_id = auth.uid());
$$;

-- Tạo hồ sơ khi có tài khoản mới. Giáo viên BẮT BUỘC có mã mời hợp lệ.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  r text := 'student';
  cls uuid;
  n int;
begin
  if meta->>'role' = 'teacher' then
    update public.teacher_invites
       set used_by = new.id, used_at = now()
     where code = upper(trim(coalesce(meta->>'invite_code','')))
       and used_by is null and (expires_at is null or expires_at > now());
    get diagnostics n = row_count;
    if n = 0 then raise exception 'Mã mời giáo viên không hợp lệ'; end if;
    r := 'teacher';
  end if;

  insert into public.profiles (id, role, full_name, display_name, avatar_url)
  values (new.id, r,
          coalesce(meta->>'full_name',''),
          coalesce(nullif(meta->>'display_name',''), meta->>'full_name', ''),
          coalesce(nullif(meta->>'avatar_url',''), 'emoji:🐻'));

  if r = 'student' then
    select id into cls from public.classes where join_code = upper(trim(coalesce(meta->>'class_code','')));
    insert into public.students (id, student_code, grade, class_id)
    values (new.id, nullif(trim(coalesce(meta->>'student_code','')),''), coalesce(nullif(meta->>'grade',''),'1'), cls);
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- Người dùng không thể tự đổi vai trò (quản trị viên dùng SQL Editor vẫn đổi được).
create or replace function public.prevent_role_change() returns trigger
language plpgsql as $$
begin
  if new.role <> old.role and auth.uid() is not null then
    raise exception 'Không được tự thay đổi vai trò';
  end if;
  return new;
end $$;
create trigger profiles_no_role_change before update on public.profiles
for each row execute function public.prevent_role_change();

-- Cộng sao + trao huy hiệu (hàm nội bộ).
create or replace function public.finish_award(uid uuid, gained int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare total int; names jsonb;
begin
  select coalesce(sum(stars),0) into total from public.student_progress where student_id = uid;
  with ins as (
    insert into public.student_rewards (student_id, reward_id)
    select uid, r.id from public.rewards r where r.stars_required <= total
    on conflict do nothing returning reward_id)
  select coalesce(jsonb_agg(r.name), '[]'::jsonb) into names from ins join public.rewards r on r.id = ins.reward_id;
  return jsonb_build_object('gained', gained, 'total', total, 'new_rewards', names);
end $$;

-- Hoàn thành bài học: 1 sao, mỗi bài chỉ được 1 lần.
create or replace function public.record_lesson(p_kind text, p_ref text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); gained int := 0;
begin
  if uid is null or not exists (select 1 from public.students where id = uid) then
    raise exception 'Chỉ học sinh mới nhận sao';
  end if;
  if p_kind = 'letter' then
    if not exists (select 1 from public.letters where id = p_ref) then raise exception 'Chữ không tồn tại'; end if;
  elsif p_kind = 'stroke' then
    if not exists (select 1 from public.strokes where id::text = p_ref) then raise exception 'Nét không tồn tại'; end if;
  else
    raise exception 'Loại bài không hợp lệ';
  end if;
  insert into public.student_progress (student_id, item_key, kind, ref, stars)
  values (uid, 'lesson:' || p_kind || ':' || p_ref, 'lesson', p_kind || ':' || p_ref, 1)
  on conflict (student_id, item_key) do nothing;
  get diagnostics gained = row_count;
  return public.finish_award(uid, gained);
end $$;

-- Kết thúc trò chơi: sao tính ở máy chủ (0–3); chỉ cộng phần cải thiện so với kết quả tốt nhất.
create or replace function public.record_game(p_game text, p_score int, p_total int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); s int; old int; gained int;
begin
  if uid is null or not exists (select 1 from public.students where id = uid) then
    raise exception 'Chỉ học sinh mới nhận sao';
  end if;
  if not exists (select 1 from public.games where id = p_game and is_active) then raise exception 'Trò chơi không hợp lệ'; end if;
  if p_total < 1 or p_total > 20 or p_score < 0 or p_score > p_total then raise exception 'Kết quả không hợp lệ'; end if;
  s := ceil(3.0 * p_score / p_total)::int;
  insert into public.game_results (student_id, game_id, score, total, stars) values (uid, p_game, p_score, p_total, s);
  select stars into old from public.student_progress where student_id = uid and item_key = 'game:' || p_game;
  insert into public.student_progress (student_id, item_key, kind, ref, stars)
  values (uid, 'game:' || p_game, 'game', p_game, s)
  on conflict (student_id, item_key) do update
    set stars = greatest(public.student_progress.stars, excluded.stars), updated_at = now();
  gained := greatest(s - coalesce(old,0), 0);
  return public.finish_award(uid, gained) || jsonb_build_object('game_stars', s);
end $$;

revoke all on function public.finish_award(uuid,int) from public, anon, authenticated;
revoke all on function public.record_lesson(text,text) from public, anon;
revoke all on function public.record_game(text,int,int) from public, anon;
grant execute on function public.record_lesson(text,text) to authenticated;
grant execute on function public.record_game(text,int,int) to authenticated;

-- ---------- RLS ----------
alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.students enable row level security;
alter table public.letters enable row level security;
alter table public.strokes enable row level security;
alter table public.youtube_videos enable row level security;
alter table public.composition_notes enable row level security;
alter table public.games enable row level security;
alter table public.game_results enable row level security;
alter table public.student_progress enable row level security;
alter table public.rewards enable row level security;
alter table public.student_rewards enable row level security;
alter table public.worksheets enable row level security;
alter table public.worksheet_elements enable row level security;
alter table public.app_settings enable row level security;
alter table public.teacher_invites enable row level security;  -- không policy = đóng hoàn toàn

create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.teaches_student(id));
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy classes_teacher_all on public.classes for all to authenticated
  using (teacher_id = auth.uid()) with check (teacher_id = auth.uid() and public.is_teacher());
create policy classes_student_select on public.classes for select to authenticated
  using (id in (select class_id from public.students where id = auth.uid()));

create policy students_select on public.students for select to authenticated
  using (id = auth.uid() or public.teaches_student(id));
create policy students_teacher_update on public.students for update to authenticated
  using (public.teaches_student(id))
  with check (class_id is null or class_id in (select id from public.classes where teacher_id = auth.uid()));

create policy letters_read on public.letters for select to authenticated using (true);
create policy strokes_read on public.strokes for select to authenticated using (true);
create policy videos_read on public.youtube_videos for select to authenticated using (true);
create policy videos_write on public.youtube_videos for all to authenticated using (public.is_teacher()) with check (public.is_teacher());
create policy notes_read on public.composition_notes for select to authenticated using (true);
create policy notes_write on public.composition_notes for all to authenticated using (public.is_teacher()) with check (public.is_teacher());
create policy games_read on public.games for select to authenticated using (true);
create policy games_update on public.games for update to authenticated using (public.is_teacher()) with check (public.is_teacher());
create policy rewards_read on public.rewards for select to authenticated using (true);
create policy rewards_write on public.rewards for all to authenticated using (public.is_teacher()) with check (public.is_teacher());
create policy settings_read on public.app_settings for select to authenticated using (true);
create policy settings_write on public.app_settings for all to authenticated using (public.is_teacher()) with check (public.is_teacher());

-- Kết quả học tập: chỉ ĐỌC trực tiếp (ghi qua hàm record_*). Học sinh chỉ thấy của mình.
create policy results_select on public.game_results for select to authenticated
  using (student_id = auth.uid() or public.teaches_student(student_id));
create policy progress_select on public.student_progress for select to authenticated
  using (student_id = auth.uid() or public.teaches_student(student_id));
create policy srewards_select on public.student_rewards for select to authenticated
  using (student_id = auth.uid() or public.teaches_student(student_id));

create policy ws_owner on public.worksheets for all to authenticated
  using (owner_id = auth.uid() and public.is_teacher()) with check (owner_id = auth.uid() and public.is_teacher());
create policy wse_owner on public.worksheet_elements for all to authenticated
  using (exists (select 1 from public.worksheets w where w.id = worksheet_id and w.owner_id = auth.uid()))
  with check (exists (select 1 from public.worksheets w where w.id = worksheet_id and w.owner_id = auth.uid()));

-- ---------- STORAGE ----------
insert into storage.buckets (id, name, public) values ('avatars','avatars',true), ('fonts','fonts',true)
on conflict (id) do nothing;

create policy "public read avatars fonts" on storage.objects for select using (bucket_id in ('avatars','fonts'));
create policy "avatar insert own" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatar update own" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatar delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "font insert teacher" on storage.objects for insert to authenticated
  with check (bucket_id = 'fonts' and public.is_teacher());
create policy "font delete teacher" on storage.objects for delete to authenticated
  using (bucket_id = 'fonts' and public.is_teacher());

-- ---------- DỮ LIỆU KHỞI TẠO ----------
insert into public.letters (id, upper_ch, sort_order) values
 ('a','A',1),('ă','Ă',2),('â','Â',3),('b','B',4),('c','C',5),('d','D',6),('đ','Đ',7),('e','E',8),
 ('ê','Ê',9),('g','G',10),('h','H',11),('i','I',12),('k','K',13),('l','L',14),('m','M',15),
 ('n','N',16),('o','O',17),('ô','Ô',18),('ơ','Ơ',19),('p','P',20),('q','Q',21),('r','R',22),
 ('s','S',23),('t','T',24),('u','U',25),('ư','Ư',26),('v','V',27),('x','X',28),('y','Y',29);

insert into public.strokes (id, name) values
 (1,'Nét thẳng đứng'),(2,'Nét ngang'),(3,'Nét xiên phải'),(4,'Nét xiên trái'),(5,'Nét cong kín'),
 (6,'Nét cong hở phải'),(7,'Nét cong hở trái'),(8,'Nét móc xuôi (móc trái)'),(9,'Nét móc ngược (móc phải)'),
 (10,'Nét móc hai đầu'),(11,'Nét thắt trên'),(12,'Nét móc hai đầu có thắt ở giữa'),
 (13,'Nét khuyết trên (xuôi)'),(14,'Nét khuyết dưới (ngược)');

-- Link YouTube để TRỐNG: giáo viên tự thêm trong trang quản lý (không bịa link).

-- Gợi ý "nét liên quan" ban đầu (giáo viên NÊN kiểm tra/sửa theo sách đang dạy).
insert into public.composition_notes (letter_id, note, related_stroke_ids) values
 ('a','','{5,9}'),('ă','','{5,9}'),('â','','{5,9}'),('c','','{6}'),('o','','{5}'),('ô','','{5}'),('ơ','','{5}'),
 ('d','','{5,9}'),('đ','','{5,9,2}'),('q','','{5,1}'),('p','','{1,10}'),('n','','{8,10}'),
 ('m','','{8,8,10}'),('h','','{13,10}'),('k','','{13,12}'),('b','','{13,11}'),('g','','{5,14}');

insert into public.games (id, title, description, sort_order) values
 ('ghep-net','Ghép nét tạo chữ','Chọn các nét tạo nên chữ',1),
 ('chon-ten-net','Chọn tên nét đúng','Nhìn hình, chọn tên nét',2),
 ('tim-chu-cai','Tìm chữ cái','Tìm đúng chữ trong bảng',3),
 ('chon-chu-dung','Chọn chữ đúng','Chữ hoa – chữ thường',4),
 ('sap-xep-net','Sắp xếp các nét','Bấm các nét theo thứ tự',5),
 ('nghe-chon-chu','Nghe và chọn chữ','Nghe rồi chọn chữ',6),
 ('tim-net-trong-chu','Tìm nét trong chữ','Chữ này có nét nào?',7),
 ('chon-hinh-net','Chọn hình nét đúng','Chọn hình đúng với tên nét',8),
 ('on-tap-net','Ôn tập 14 nét','10 câu ôn về các nét',9),
 ('on-tap-chu','Ôn tập 29 chữ','10 câu ôn về chữ cái',10);

insert into public.rewards (name, icon, description, stars_required) values
 ('Ngôi sao đầu tiên','⭐','Nhận sao đầu tiên',1),
 ('Chăm chỉ','🌱','Đạt 10 sao',10),
 ('Bé giỏi','🌟','Đạt 30 sao',30),
 ('Bé siêu giỏi','🏅','Đạt 60 sao',60),
 ('Nhà vô địch','🏆','Đạt 100 sao',100);

-- ---------- TẠO MÃ MỜI GIÁO VIÊN (bỏ dấu -- và đổi mã khi cần) ----------
-- insert into public.teacher_invites (code) values ('GV-DOI-MA-NAY');
