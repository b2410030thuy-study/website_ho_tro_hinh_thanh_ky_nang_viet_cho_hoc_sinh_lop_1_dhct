# ✏️ BÉ VUI HỌC VIẾT – Luyện chữ lớp 1

Website giáo dục: React + Vite + TypeScript (chạy trên **GitHub Pages**), tài khoản/dữ liệu bằng **Supabase**, trợ lý AI bằng **Gemini** (qua Supabase Edge Function).

> GitHub Pages chỉ chứa phần giao diện tĩnh. Tài khoản, dữ liệu, phân quyền và gọi Gemini đều nằm ở Supabase.

## Cấu trúc
```
.github/workflows/deploy.yml     Tự build + deploy GitHub Pages
supabase/migrations/001_schema.sql   Bảng, RLS, hàm cộng sao, dữ liệu 29 chữ + 14 nét + 10 trò chơi
supabase/functions/gemini-assistant/ Edge Function gọi Gemini (khóa nằm trong Secrets)
src/lib/worksheet.ts             Bố cục phiếu 5 ô ly theo mm (dùng chung cho xem trước và PDF)
src/lib/pdf.ts                   Xuất PDF vector A4, nhúng font
src/pages/ , src/components/     Giao diện học sinh & giáo viên
```

## Hướng dẫn từng bước (không cần biết lập trình)

**Bước 1 – Tài khoản GitHub.** Vào https://github.com → Sign up.

**Bước 2 – Tạo Repository.** Nút **+** (góc phải) → *New repository* → đặt tên, ví dụ `be-vui-hoc-viet` → chọn **Public** → *Create repository*.

**Bước 3 – Tải mã nguồn lên.** Giải nén file ZIP trên máy. Trong repository vừa tạo bấm *uploading an existing file*, kéo **toàn bộ nội dung bên trong thư mục** đã giải nén vào (nhớ cả thư mục ẩn `.github` – nếu máy không cho kéo thư mục ẩn, dùng GitHub Desktop hoặc tạo file `.github/workflows/deploy.yml` bằng nút *Add file → Create new file*, dán nội dung file này). Bấm *Commit changes*. Nhánh phải tên **main**.

**Bước 4 – Tạo project Supabase.** https://supabase.com → New project (chọn vùng gần Việt Nam như Singapore), đặt mật khẩu database và lưu lại.

**Bước 5 – Chạy SQL.** Supabase → *SQL Editor* → *New query* → mở file `supabase/migrations/001_schema.sql`, dán toàn bộ → **Run**. Chỉ chạy **một lần**.

**Bước 6 – Cấu hình Authentication.**
- *Authentication → Providers → Email*: bật. Với học sinh đăng ký bằng mã (không có email thật), **tắt “Confirm email”**.
- *Authentication → URL Configuration*: *Site URL* = `https://TEN-GITHUB.github.io/TEN-REPO/` ; thêm cùng địa chỉ đó vào *Redirect URLs* (cần cho “Quên mật khẩu”).
- **Tạo mã mời giáo viên** (bắt buộc, để không ai tự nâng quyền): SQL Editor chạy  
  `insert into public.teacher_invites (code) values ('GV-MA-CUA-BAN');`  
  Mỗi mã dùng được **1 lần**; cần thêm giáo viên thì tạo mã mới. Dùng mã này khi đăng ký tài khoản giáo viên.

**Bước 7 – Biến môi trường cho website.** Supabase → *Project Settings → API* (hoặc *API Keys*): copy **Project URL** và khóa **anon/publishable**. Trên GitHub: repository → *Settings → Secrets and variables → Actions → New repository secret*, tạo 2 secret:
- `VITE_SUPABASE_URL` = Project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` = khóa publishable/anon  
**Tuyệt đối không** dùng `service_role` key ở đây.

**Bước 8 – Gemini API Key.** Lấy khóa miễn phí tại https://aistudio.google.com/apikey (gói miễn phí có hạn mức, không cam kết không giới hạn). Supabase → *Edge Functions → Secrets* → thêm `GEMINI_API_KEY` = khóa vừa lấy. (Tùy chọn: `GEMINI_MODEL`, mặc định `gemini-2.5-flash`; nếu Google đổi tên model, sửa ở đây.)

**Bước 9 – Triển khai Edge Function.** Supabase → *Edge Functions → Deploy a new function → Via Editor* → tên **`gemini-assistant`** → dán nội dung `supabase/functions/gemini-assistant/index.ts` → Deploy. (Giữ bật “Verify JWT”.) Bỏ qua bước 8–9 vẫn dùng được toàn bộ website, riêng Trợ lý AI sẽ báo “chưa cài đặt”.

**Bước 10 – Bật GitHub Pages.** Repository → *Settings → Pages* → mục **Build and deployment → Source: GitHub Actions**.

**Bước 11 – Chạy deploy.** Tab *Actions* → workflow “Deploy to GitHub Pages” → *Run workflow* (hoặc mỗi lần bạn commit vào `main` nó tự chạy).

**Bước 12 – Mở website.** Khi workflow có dấu ✅ xanh, vào *Settings → Pages* để lấy link: `https://TEN-GITHUB.github.io/TEN-REPO/`.

**Bước 13 – Kiểm tra** (làm lần lượt):
1. Đăng ký **giáo viên** (cần mã mời) → vào giao diện giáo viên.
2. *Cài đặt* → tải font tập viết `.ttf` (xem mục Font bên dưới).
3. *Quản lý học sinh* → tạo lớp, ghi lại **mã lớp**.
4. *Quản lý video* → dán link YouTube thật vào vài chữ/nét → *Lưu*.
5. Mở cửa sổ ẩn danh, đăng ký **học sinh** (nhập mã lớp) → mở chữ đó, thấy đúng video → bấm “Em học xong” (nhận 1 sao, bấm lại không cộng thêm).
6. Chơi vài trò chơi → xem *Ngôi sao*. Đăng xuất, đăng nhập lại → sao và tiến trình vẫn còn.
7. *Hồ sơ* → Sửa hồ sơ → đổi tên/avatar → tên hiện khắp nơi.
8. Giáo viên → *Tạo phiếu bài tập* → XEM TRƯỚC → XUẤT PDF → TẢI PDF VỀ MÁY. **In thử 1 trang ở tỷ lệ 100% (không “fit to page”) và đo ô ly bằng thước.**
9. Giáo viên → *Theo dõi tiến trình* → chọn học sinh.
10. Mở trên điện thoại.

**Bước 14 – Cập nhật website.** Sửa file trên GitHub (biểu tượng ✏️) → *Commit changes* → Actions tự deploy lại sau 1–2 phút. Thay đổi nội dung (video, ghi chú, phiếu…) **không cần deploy**, vì lưu trong Supabase.

## Font chữ tập viết
- Website **không kèm font** vì không có font tiểu học tiếng Việt nào tôi có thể xác nhận giấy phép giúp bạn. Hãy dùng font bạn có quyền sử dụng (ví dụ font do nhà trường/Sở cung cấp hoặc font bạn đã mua/được cấp phép).
- Tải lên ở *Cài đặt → Font tập viết*. Hệ thống kiểm tra font có đủ dấu tiếng Việt; thiếu sẽ báo.
- Khi chưa có font: giao diện dùng font dự phòng (**không** phải font tiểu học) và **không xuất được PDF** (tránh PDF lỗi dấu).
- Font giao diện (hệ thống) và font tập viết hoàn toàn tách riêng.

## Phiếu 5 ô ly – cách tính
- Mọi kích thước tính bằng **mm** (A4 = 210×297). Lưới luôn là các ô vuông nguyên, căn giữa trang.
- Mặc định: ô ly 5 mm, mỗi dòng 5 ô, **đường chuẩn** (đậm) cách mép trên 4 ô, **đường phụ** (nét đứt) ở độ cao chữ thường 2 ô.
- Cỡ chữ = (chiều cao chữ thường theo ô) ÷ x-height của font ⇒ chữ thường cao đúng số ô; nét khuyết/dấu do thiết kế của font.
- Mẫu vở mỗi trường khác nhau: chỉnh *cạnh ô ly, số ô mỗi dòng, vị trí đường chuẩn, chiều cao chữ* ở khung “Giấy & ô ly” cho khớp vở.

## Ghi chú quan trọng (hãy đọc)
- **Chưa được kiểm thử chạy thật.** Mã được viết trong môi trường không có mạng nên chưa chạy `npm install`/`build`, chưa thử với Supabase, GitHub Pages, Gemini hay in PDF thật. Mình chỉ kiểm tra: đủ 29 chữ, 14 nét, cú pháp TypeScript. Lần deploy đầu có thể phát sinh lỗi nhỏ; nếu Actions báo đỏ, mở log và gửi lại cho người hỗ trợ.
- **Hình minh họa 14 nét** là hình vẽ tay đơn giản, chỉ để nhận biết; video của giáo viên mới là chuẩn.
- **“Nét liên quan” của chữ** (dùng cho 3 trò chơi ghép/sắp xếp/tìm nét) được gợi ý sẵn cho 17 chữ, **giáo viên cần kiểm tra và sửa** theo sách đang dạy ở *Quản lý chữ cái*. Chữ chưa nhập thì các trò này bỏ qua chữ đó.
- Ghi chú cấu tạo chữ để trống – giáo viên tự viết. Link YouTube để trống, không bịa.
- Nội dung học (video, ghi chú, font) dùng chung cho mọi giáo viên trong hệ thống; lớp, học sinh, phiếu thì riêng từng giáo viên.
- Học sinh đăng ký chỉ bằng mã (không email) thì không tự khôi phục mật khẩu được: quản trị viên đặt lại trong Supabase → Authentication → Users.
- Sao tính ở máy chủ: bài học 1 sao/bài (1 lần); trò chơi 0–3 sao theo tỷ lệ đúng, chỉ cộng phần **cải thiện** so với lần tốt nhất.
- Học sinh **không** viết trên máy: chỉ xem, nghe, chọn, bấm. Việc viết thực hiện trên giấy qua phiếu PDF.

## Chạy trên máy (tùy chọn)
```
npm install
cp .env.example .env     # điền 2 biến VITE_...
npm run dev
```
