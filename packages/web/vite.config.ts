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
export default defineConfig(({ mode, command }) => {
  const monorepoRoot = resolve(__dirname, '../..')
  const env = loadEnv(mode, monorepoRoot)
  const filteredEnv = Object.fromEntries(
    Object.entries(env).filter(([key]) => isSafeViteDefineKey(key)),
  )
  const processEnv = {
    ...DEFAULT_VITE_ENV,
    ...filteredEnv,
  }

  // production build：走 workspace 包 exports（dist），强制包边界
  // development：直指源码，保证 monorepo HMR / 未 build 也能开发
  const isBuild = command === 'build'
  const packageAliases: Record<string, string> = {
    '@': resolve(__dirname, 'src'),
    // style 始终用已构建 CSS
    '@mindsync/ui/dist/style.css': path.resolve(__dirname, '../ui/dist/style.css'),
    '@mindsync/ui/style.css': path.resolve(__dirname, '../ui/dist/style.css'),
  }

  if (!isBuild) {
    Object.assign(packageAliases, {
      '@mindsync/core/electron': path.resolve(__dirname, '../core/src/electron.ts'),
      '@mindsync/core': path.resolve(__dirname, '../core/src/index.ts'),
      '@mindsync/ui': path.resolve(__dirname, '../ui/src/index.ts'),
      '@mindsync/web': path.resolve(__dirname, '../web'),
      '@mindsync/extension': path.resolve(__dirname, '../extension'),
    })
  }

  return {
    envDir: monorepoRoot,
    plugins: [vue()],
    optimizeDeps: {
      // pnpm may hoist naive-ui under ui; declare peers on web + include for prebundle
      include: [
        'naive-ui',
        'date-fns',
        'date-fns/locale',
        'css-render',
        '@css-render/plugin-bem',
        '@css-render/vue3-ssr',
        '@emotion/hash',
        'seemly',
        'vueuc',
        'vooks',
        'evtd',
        'vdirs',
        'date-fns-tz',
      ],
    },
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
        ignored: ['!**/node_modules/@mindsync/**']
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
        'codemirror',
        'css-render',
        '@css-render/plugin-bem',
        '@emotion/hash',
        'naive-ui',
        'vue',
      ],
      alias: packageAliases,
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
