import { computed, type Ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import type { AppServices } from '../../types/services'
import type { ImageSubMode } from '@mindsync/core'

interface UseImageSubModeApi {
  imageSubMode: Ref<ImageSubMode>
  setImageSubMode: (mode: ImageSubMode) => Promise<void>
  switchToText2Image: () => Promise<void>
  switchToImage2Image: () => Promise<void>
  switchToMultiImage: () => Promise<void>
  ensureInitialized: () => Promise<void>
}

/**
 * 图像模式的子模式管理（基于 Vue Router）
 *
 * ✅ 重构说明：
 * - 路由是唯一的真源（/image/text2image / /image/image2image / /image/multiimage）
 * - 不再使用 preference 存储，避免双写不一致
 * - setImageSubMode 通过路由导航更新子模式
 */
export function useImageSubMode(services: Ref<AppServices | null>): UseImageSubModeApi {
  // services 参数保留用于调用方兼容；该 composable 不再持久化任何偏好
  void services

  const route = useRoute()
  const router = useRouter()

  // 从路由参数读取子模式（text2image / image2image / multiimage）
  const imageSubMode = computed<ImageSubMode>(() => {
    // 路由架构（重构后）：/image/text2image | /image/image2image（无 params）
    if (route.path.startsWith('/image/image2image')) return 'image2image'
    if (route.path.startsWith('/image/multiimage')) return 'multiimage'
    if (route.path.startsWith('/image/text2image')) return 'text2image'
    return 'text2image'
  })

  const ensureInitialized = async () => {
    // 路由已初始化，无需额外操作
    console.log(`[useImageSubMode] Current sub-mode (from route): ${imageSubMode.value}`)
  }

  const setImageSubMode = async (mode: ImageSubMode) => {
    // 通过路由导航更新子模式
    const targetPath = `/image/${mode}`
    if (route.path !== targetPath) {
      await router.push(targetPath)
      console.log(`[useImageSubMode] Sub-mode switched via route navigation: ${mode}`)
    }
  }

  const switchToText2Image = () => setImageSubMode('text2image')
  const switchToImage2Image = () => setImageSubMode('image2image')
  const switchToMultiImage = () => setImageSubMode('multiimage')

  return {
    imageSubMode: imageSubMode as Ref<ImageSubMode>,
    setImageSubMode,
    switchToText2Image,
    switchToImage2Image,
    switchToMultiImage,
    ensureInitialized
  }
}
