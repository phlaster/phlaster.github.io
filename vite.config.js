import {
  defineConfig
} from 'vite';
import ServerUrlCopy from 'vite-plugin-url-copy';
import mkcert from 'vite-plugin-mkcert'; 

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true
  },
  server: {
    host: true,
    port: 5173,
    https: true,
  },
  plugins: [
    mkcert(),
    ServerUrlCopy({
      qrcode: {
        disabled: false,
      },
    })
  ],
});