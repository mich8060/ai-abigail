import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { abigailApiPlugin } from './server/abigailApi.ts'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const rawBase = process.env.BASE_PATH || '/'
  const base = rawBase === '/' ? '/' : `/${rawBase.replace(/^\/+|\/+$/g, '')}/`

  return {
    base,
    plugins: [
      react(),
      abigailApiPlugin({
        apiKey: env.OPENAI_API_KEY ?? '',
        model: env.OPENAI_MODEL || 'gpt-4o-mini',
      }),
    ],
  }
})
