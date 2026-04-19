import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const appDir = path.dirname(fileURLToPath(import.meta.url))

/** GitHub Pages 等のサブパス配信用。例: /my-repo/ （末尾スラッシュ推奨） */
function normalizeBase(p) {
  if (!p || p === '/') return '/'
  const s = p.startsWith('/') ? p : `/${p}`
  return s.endsWith('/') ? s : `${s}/`
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, appDir, '')
  const apiKey =
    env.VITE_ANTHROPIC_API_KEY ||
    env.ANTHROPIC_API_KEY ||
    process.env.VITE_ANTHROPIC_API_KEY ||
    process.env.ANTHROPIC_API_KEY ||
    ''

  if (mode === 'development' && !apiKey) {
    console.warn(
      '\n[vision-retreat] Anthropic APIキーが見つかりません。AI目標提案は 401 になります。\n' +
        `  → ${path.join(appDir, '.env.local')} に次を記載し、npm run dev を再起動してください:\n` +
        '     VITE_ANTHROPIC_API_KEY=sk-ant-api03-...\n' +
        '     （または ANTHROPIC_API_KEY=... でも可）\n'
    )
  }

  const base = normalizeBase(process.env.VITE_BASE_PATH)

  return {
    base,
    plugins: [react()],
    server: {
      port: 5173,
      open: true,
      proxy: {
        '/api/messages': {
          target: 'https://api.anthropic.com',
          changeOrigin: true,
          secure: true,
          rewrite: p => p.replace(/^\/api\/messages/, '/v1/messages'),
          configure: proxy => {
            proxy.on('proxyReq', proxyReq => {
              if (apiKey) {
                proxyReq.setHeader('x-api-key', apiKey)
                proxyReq.setHeader('anthropic-version', '2023-06-01')
              }
            })
          }
        }
      }
    }
  }
})
