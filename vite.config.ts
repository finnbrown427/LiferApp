import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode, command }) => {
  if (command === 'build') {
    const env = loadEnv(mode, process.cwd(), 'VITE_')
    const missing = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY']
      .filter((key) => !env[key]?.trim())

    if (missing.length > 0) {
      throw new Error(`Missing required build-time environment variable(s): ${missing.join(', ')}`)
    }
  }

  return {
    plugins: [react()],
  }
})
