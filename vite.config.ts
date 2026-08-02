import path from "path"
import { fileURLToPath } from "url"
// `defineConfig` do pacote `vitest/config`, e não do `vite`: só ele conhece a
// chave `test` abaixo. Com o do `vite`, o `tsc -b` do build recusa o arquivo.
import { defineConfig } from 'vitest/config'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // O fuso fica fixo em UTC, como o container de produção: sem isso um teste
    // de data passa na máquina do dev (America/Sao_Paulo) e erra no deploy.
    env: { TZ: 'UTC' },
    css: false,
  },
})
