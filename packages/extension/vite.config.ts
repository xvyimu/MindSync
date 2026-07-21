import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  const isBuild = command === 'build'

  // production：走 package.json exports（dist），强制包边界
  // development：直指源码，便于 monorepo 联调
  const alias: Record<string, string> = {
    '@': resolve(__dirname, 'src'),
  }
  if (!isBuild) {
    alias['@mindsync/ui'] = resolve(__dirname, '../ui/src/index.ts')
    alias['@mindsync/core'] = resolve(__dirname, '../core/src/index.ts')
  }

  return {
    plugins: isBuild ? [vue()] : [vue(), basicSsl()],
    resolve: {
      alias,
    },
    base: './',  // 使用相对路径
    build: {
      outDir: 'dist',
      rollupOptions: {
        input: {
          popup: resolve(__dirname, 'index.html')
        },
        output: {
          entryFileNames: `assets/[name].js`,
          chunkFileNames: `assets/[name].js`,
          assetFileNames: (assetInfo) => {
            if (assetInfo.name === 'background.js') {
              return 'background.js';
            }
            return `assets/[name].[ext]`;
          }
        }
      },
      copyPublicDir: true
    },
    server: {
      port: 5174,
      ...(isBuild ? {} : { https: {} as const }),
    }
  }
})
