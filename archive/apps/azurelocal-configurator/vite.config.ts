/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import metadata from './package.json' with { type: 'json' }
const release = { name: metadata.name, version: metadata.version, commit: process.env.CI_COMMIT_SHA || 'development' }
export default defineConfig({
  base: './',
  define: { __RELEASE__: JSON.stringify(release) },
  // Browser specs under e2e/ run with Playwright, not Vitest.
  test: { include: ['src/**/*.test.ts'] },
  server: { watch: { ignored: /[\\/]\.artifacts(?:[\\/]|$)/ } },
  plugins: [react(), { name: 'release-metadata', generateBundle() { this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify(release, null, 2) }) } }],
})
