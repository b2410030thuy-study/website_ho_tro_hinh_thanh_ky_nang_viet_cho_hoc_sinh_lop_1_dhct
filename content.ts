// 29 chữ cái và 14 nét theo đúng danh sách yêu cầu. KHÔNG tự ý thay đổi.
export const LETTERS = [
  'a','ă','â','b','c','d','đ','e','ê','g','h','i','k','l','m','n','o','ô','ơ','p','q','r','s','t','u','ư','v','x','y',
].map((ch) => ({ id: ch, ch, upper: ch.toUpperCase() }));

// Hình minh họa nét (SVG 100x100). Chỉ mang tính minh họa; video của giáo viên là chuẩn.
export const STROKES: { id: number; name: string; d: string }[] = [
  { id: 1, name: 'Nét thẳng đứng', d: 'M50 15 L50 85' },
  { id: 2, name: 'Nét ngang', d: 'M15 50 L85 50' },
  { id: 3, name: 'Nét xiên phải', d: 'M22 85 L78 15' },
  { id: 4, name: 'Nét xiên trái', d: 'M22 15 L78 85' },
  { id: 5, name: 'Nét cong kín', d: 'M50 22 C65.5 22 78 34.5 78 50 C78 65.5 65.5 78 50 78 C34.5 78 22 65.5 22 50 C22 34.5 34.5 22 50 22 Z' },
  { id: 6, name: 'Nét cong hở phải', d: 'M74 24 C20 8 20 92 74 76' },
  { id: 7, name: 'Nét cong hở trái', d: 'M26 24 C80 8 80 92 26 76' },
  { id: 8, name: 'Nét móc xuôi (móc trái)', d: 'M62 15 L62 62 C62 80 50 86 32 84' },
  { id: 9, name: 'Nét móc ngược (móc phải)', d: 'M36 15 L36 62 C36 80 48 86 68 84' },
  { id: 10, name: 'Nét móc hai đầu', d: 'M28 85 C28 40 32 24 50 24 C70 24 72 40 72 62 C72 78 76 84 84 84' },
  { id: 11, name: 'Nét thắt trên', d: 'M20 78 C40 78 78 40 68 24 C58 10 36 28 52 56 C62 74 78 80 86 78' },
  { id: 12, name: 'Nét móc hai đầu có thắt ở giữa', d: 'M18 84 C20 50 34 22 50 30 C62 36 40 56 52 72 C62 84 78 78 84 62' },
  { id: 13, name: 'Nét khuyết trên (xuôi)', d: 'M28 88 C46 66 76 22 62 10 C46 -2 34 40 66 88' },
  { id: 14, name: 'Nét khuyết dưới (ngược)', d: 'M28 12 C46 34 76 78 62 90 C46 102 34 60 66 12' },
];

export const strokeById = (id: number) => STROKES.find((s) => s.id === id);

export const LESSON_GAMES = {
  letter: ['tim-chu-cai', 'chon-chu-dung', 'nghe-chon-chu'],
  stroke: ['chon-ten-net', 'chon-hinh-net', 'ghep-net'],
};

export const AVATARS = ['🐻', '🐱', '🐶', '🐰', '🦊', '🐼', '🐯', '🦁', '🐸', '🐵', '🦄', '🐥'];
