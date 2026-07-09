import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import checker from 'vite-plugin-checker';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const useMock = env.VITE_USE_MOCK === 'true';

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
        target: 'http://localhost:8086',
        changeOrigin: true,
        rewrite: useMock
          ? (path) => path.replace(/^\/api(.+?)(\?.*)?$/, '/ljvis$1/mock$2')
          : (path) => path.replace(/^\/api/, '/ljvis'),
      },
      '/tim': {
        target: 'http://localhost:8085',
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
    },
  },
  };
});
