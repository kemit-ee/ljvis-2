import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
    proxy: {
      '/api': {
        target: 'http://localhost:8086',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/ljvis'),
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
                c.replace(/SameSite=None/i, 'SameSite=Lax')
              );
            }
          });
        },
      },
    },
  },
})
