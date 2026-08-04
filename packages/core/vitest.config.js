import { configDefaults, defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import path from 'path'
import { fileURLToPath } from 'node:url'

/** 始终相对本配置文件定位 package 根，避免 monorepo 根目录调用时找错 setup/src。 */
const packageRoot = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => {
  // 优先加载 packages/core 下的 env，其次当前 cwd
  const envFromPackage = loadEnv(mode, packageRoot, '')
  const envFromCwd = loadEnv(mode, process.cwd(), '')
  process.env = { ...process.env, ...envFromCwd, ...envFromPackage }

  // tests/integration/** 会打真实 LLM API（21 个文件，14 个自带 key 检查）。
  // 默认排除，避免 `pnpm test` 在无凭据时红、在有凭据时产生真实调用与费用；
  // 需要时用 `pnpm test:integration`（等价 --mode int）显式启用。
  // 注意 configDefaults.exclude 必须展开而非替换，否则 node_modules/dist 会被扫。
  const integrationOnly = mode === 'int'

  return {
    // 固定 root 为 core 包，保证包含路径与别名稳定
    root: packageRoot,
    test: {
      ...(integrationOnly
        ? { include: ['tests/integration/**/*.{test,spec}.{ts,js}'] }
        : { exclude: [...configDefaults.exclude, 'tests/integration/**'] }),
      // Avoid Windows OOM with forked workers on large suites
      pool: 'threads',
      globals: true,
      environment: 'node',
      // 绝对路径 setup，从仓库根或 packages/core 调用均可
      setupFiles: [path.join(packageRoot, 'tests/setup.js')],
      // 设置测试超时时间
      testTimeout: 30000, // 默认30秒
      hookTimeout: 30000, // 钩子超时30秒
      // 环境变量配置
      env: {
        ...process.env
      }
    }
  }
}) 
