import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import path from 'path'
import { DEFAULT_VITE_ENV } from '../core/src/utils/default-env'

/** 与 desktop/runtime-security 对齐：仅公共配置可进前端 bundle。 */
const PUBLIC_RUNTIME_CONFIG_PATTERN = /^VITE_(?:APP|PUBLIC)_[A-Z0-9_]+$/
const SENSITIVE_RUNTIME_CONFIG_SEGMENT =
  /(?:^|_)(?:API_KEY|KEY|TOKEN|SECRET|PASSWORD|PASS|AUTHORIZATION|HEADERS|CREDENTIALS?|COOKIE|PRIVATE)(?:_|$)/i

const isSafeViteDefineKey = (key: string): boolean => {
  // 产品默认 feature flag 始终可注入（非密钥）
  if (Object.prototype.hasOwnProperty.call(DEFAULT_VITE_ENV, key)) {
    return true
  }
  return (
    PUBLIC_RUNTIME_CONFIG_PATTERN.test(key) &&
    !SENSITIVE_RUNTIME_CONFIG_SEGMENT.test(key)
  )
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const monorepoRoot = resolve(__dirname, '../..')
  const env = loadEnv(mode, monorepoRoot)
  const filteredEnv = Object.fromEntries(
    Object.entries(env).filter(([key]) => isSafeViteDefineKey(key)),
  )
  const processEnv = {
    ...DEFAULT_VITE_ENV,
    ...filteredEnv,
  }

  return {
    envDir: monorepoRoot,
    plugins: [vue()],
    server: {
      port: 18181,
      host: true,
      fs: {
        // 允许为工作区依赖提供服务
        allow: ['..']
      },
      hmr: true,
      watch: {
        // 确保监视monorepo中其他包的变化
        ignored: ['!**/node_modules/@prompt-optimizer/**']
      }
    },
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html')
        }
      }
    },
    publicDir: 'public',
    resolve: {
      preserveSymlinks: true,
      // CodeMirror relies on instanceof checks between its packages. pnpm
      // symlinks can otherwise make Vite bundle more than one state runtime.
      dedupe: [
        '@codemirror/autocomplete',
        '@codemirror/language',
        '@codemirror/state',
        '@codemirror/view',
        'codemirror'
      ],
      alias: {
        '@': resolve(__dirname, 'src'),
        // Prefer source for monorepo electron/desktop builds so newly added
        // templates and proxies ship without a stale package dist.
        // Keep style subpath on built CSS (ui vite emits dist/style.css).
        '@prompt-optimizer/ui/dist/style.css': path.resolve(__dirname, '../ui/dist/style.css'),
        '@prompt-optimizer/ui/style.css': path.resolve(__dirname, '../ui/dist/style.css'),
        '@prompt-optimizer/core/electron': path.resolve(__dirname, '../core/src/electron.ts'),
        '@prompt-optimizer/core': path.resolve(__dirname, '../core/src/index.ts'),
        '@prompt-optimizer/ui': path.resolve(__dirname, '../ui/src/index.ts'),
        '@prompt-optimizer/web': path.resolve(__dirname, '../web'),
        '@prompt-optimizer/extension': path.resolve(__dirname, '../extension')
      }
    },
    define: {
      'process.env': {
        NODE_ENV: JSON.stringify(process.env.NODE_ENV || 'development'),
        ...Object.keys(processEnv).reduce((acc, key) => {
          acc[key] = processEnv[key as keyof typeof processEnv]
          return acc
        }, {} as Record<string, string>)
      }
    }
  }
})
