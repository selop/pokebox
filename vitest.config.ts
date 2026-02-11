import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import glsl from 'vite-plugin-glsl'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue(), glsl()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    exclude: ['**/node_modules/**', '**/e2e/**', '**/*.spec.ts'],
    include: ['**/__tests__/**/*.test.ts'],
  },
})
