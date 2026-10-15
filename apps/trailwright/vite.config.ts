import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// SITE_BASE is set by the Pages workflow (for example /azurelocal-trailwright/); locally and offline the paths stay relative.
export default defineConfig({
  base: process.env.SITE_BASE || './',
  plugins: [react()],
  // The PDF libraries load on demand (see exports/handoffPdf.ts); what remains in the main chunk is the app, React and the form libraries.
  build: { chunkSizeWarningLimit: 650 },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    globals: false
  }
});