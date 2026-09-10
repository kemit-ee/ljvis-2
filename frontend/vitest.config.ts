import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    server: {
      // TEDI's date components use extensionless dayjs imports that need Vite resolution.
      deps: { inline: ['@tedi-design-system/react'] },
    },
  },
});
