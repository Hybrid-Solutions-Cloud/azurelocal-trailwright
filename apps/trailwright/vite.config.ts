import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// SITE_BASE is set by the Pages workflow (for example /azurelocal-trailwright/); locally and offline the paths stay relative.
export default defineConfig({
  base: process.env.SITE_BASE || './',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    globals: false
  }
});