import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' = đường dẫn tương đối: chạy đúng ở https://user.github.io/ten-repo/
// và cả ở https://user.github.io/ (repo dạng website người dùng) mà không phải sửa gì.
// Kết hợp với HashRouter (#/...) nên tải lại trang con không bị lỗi 404.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { outDir: 'dist', sourcemap: false },
});
