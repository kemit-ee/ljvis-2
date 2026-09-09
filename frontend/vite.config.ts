import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import checker from 'vite-plugin-checker';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const useMock = env.VITE_USE_MOCK === 'true';

  // Proxy sihtmärgid on vaikimisi kohalik dev-stack (docker-compose.yml).
  // Playwright'i testid seavad need CI-stack'i portidele (docker-compose.ci.yml:
  // 9086/9085/9888) — vt tests/playwright/. Tavaline dev-töövoog ei muutu.
  const proxyApi = env.VITE_PROXY_API || 'http://localhost:8086';
  const proxyTim = env.VITE_PROXY_TIM || 'http://localhost:8085';
  const proxyTara = env.VITE_PROXY_TARA || 'https://localhost:8888';

  return {
    plugins: [
      react(),
      checker({
        typescript: { tsconfigPath: './tsconfig.app.json' },
        overlay: false,
      }),
    ],
    server: {
      port: 3001,
      proxy: {
        '/api': {
          target: proxyApi,
          changeOrigin: true,
          ws: true, // teavituste WebSocket (/api/notifications/connect)
          rewrite: useMock
            ? (path) => path.replace(/^\/api(.+?)(\?.*)?$/, '/ljvis$1/mock$2')
            : (path) => path.replace(/^\/api/, '/ljvis'),
        },
        '/tim': {
          target: proxyTim,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/tim/, ''),
          configure: (proxy) => {
            proxy.on('proxyRes', (proxyRes) => {
              const sc = proxyRes.headers['set-cookie'];
              if (sc) {
                proxyRes.headers['set-cookie'] = sc.map((c: string) =>
                  c.replace(/SameSite=None/i, 'SameSite=Lax'),
                );
              }
            });
          },
        },
        '/tara': {
          target: proxyTara,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/tara/, ''),
        },
        // TARA-Mock's HTML uses <base href="/"> so form posts to "back"
        // resolve as /back relative to the root.
        '/back': {
          target: proxyTara,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
