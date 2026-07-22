import {
  defineConfig
} from 'vite';
import ServerUrlCopy from 'vite-plugin-url-copy';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true
  },
  server: {
    host: true,
    port: 5173
  },
  plugins: [
    ServerUrlCopy({
      qrcode: {
        disabled: false,
      },
    })
  ],
});