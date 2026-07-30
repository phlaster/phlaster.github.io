import {
  defineConfig
} from 'vite';
import {
  execSync
} from 'child_process';
import ServerUrlCopy from 'vite-plugin-url-copy';
import mkcert from 'vite-plugin-mkcert';

function getGitInfo() {
  try {
    const hash = execSync('git rev-parse HEAD').toString().trim();
    const isDirty = execSync('git status --porcelain').toString().trim().length > 0;
    return {
      hash,
      isDirty
    };
  } catch (e) {
    return {
      hash: 'unknown',
      isDirty: false
    };
  }
}

const gitInfo = getGitInfo();

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
  define: {
    'import.meta.env.VITE_GIT_HASH': JSON.stringify(gitInfo.hash),
    'import.meta.env.VITE_IS_GIT_DIRTY': JSON.stringify(gitInfo.isDirty)
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