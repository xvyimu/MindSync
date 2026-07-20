import { ref, inject, type Ref } from 'vue'

import type { AppServices } from '../../types/services'
import type {
  ImageRequest,
  ImageResult,
  ImageModelConfig,
  Text2ImageRequest,
  Image2ImageRequest,
  MultiImageGenerationRequest,
  MultiImageRequest,
} from '@prompt-optimizer/core'
import { getI18nErrorMessage } from '../../utils/error'
import {
  normalizeImageSourceToPayload,
  persistImagePayloadAsAssetId,
} from '../../utils/image-asset-storage'

const normalizeRuntimeImageResult = async (
  result: ImageResult,
  services: AppServices | null | undefined,
): Promise<ImageResult> => {
  if (!Array.isArray(result.images) || result.images.length === 0) {
    return result
  }

  const normalizedImages = await Promise.all(
    result.images.map(async (image) => {
      if (!image?.url || image.b64) {
        return image
      }

      try {
        const payload = await normalizeImageSourceToPayload(image.url)
        if (!payload) {
          return image
        }

        if (services?.imageStorageService) {
          try {
            await persistImagePayloadAsAssetId({
              payload,
              storageService: services.imageStorageService,
              sourceType: 'generated',
              metadata: {
                prompt: result.metadata?.prompt,
                modelId: result.metadata?.modelId,
                configId: result.metadata?.configId,
              },
            })
          } catch (error) {
            console.warn('[useImageGeneration] Failed to persist normalized image payload:', error)
          }
        }

        return {
          b64: payload.b64,
          mimeType: payload.mimeType,
        }
      } catch (error) {
        console.warn('[useImageGeneration] Failed to normalize url image result:', error)
        return image
      }
    }),
  )

  return {
    ...result,
    images: normalizedImages,
  }
}

function isAbortError(error: unknown): boolean {
  if (!error) return false
  if (error instanceof Error && error.name === 'AbortError') return true
  if (typeof error === 'object' && error) {
    const e = error as { name?: string; code?: string; message?: string }
    if (e.name === 'AbortError') return true
    if (e.code === 'IPC_STREAM_CANCELLED') return true
    if (typeof e.message === 'string' && /cancel|abort/i.test(e.message)) return true
  }
  return false
}

export function useImageGeneration() {
  const services = inject<Ref<AppServices | null>>('services')
  const generating = ref(false)
  const progress = ref<string | number | { phase: string; progress: number }>('idle')
  const error = ref<string>('')
  const result = ref<ImageResult | null>(null)
  /** Active AbortController for the in-flight generation (if any). */
  const activeController = ref<AbortController | null>(null)

  const imageModels = ref<ImageModelConfig[]>([])

  const loadImageModels = async () => {
    if (!services?.value?.imageModelManager) {
      imageModels.value = []
      return
    }
    try {
      const enabledConfigs = await services.value.imageModelManager.getEnabledConfigs()
      imageModels.value = enabledConfigs
    } catch (error) {
      console.error('Failed to load image models:', error)
      imageModels.value = []
    }
  }

  const cancel = () => {
    activeController.value?.abort()
  }

  const callGenerate = async (call: (signal: AbortSignal) => Promise<ImageResult>) => {
    // Cancel any previous in-flight generation before starting a new one.
    activeController.value?.abort()
    const controller = new AbortController()
    activeController.value = controller

    error.value = ''
    result.value = null
    generating.value = true
    progress.value = 'queued'
    try {
      const res = await call(controller.signal)
      if (controller.signal.aborted) {
        const abortErr = new Error('Image generation was cancelled')
        abortErr.name = 'AbortError'
        throw abortErr
      }
      const normalized = await normalizeRuntimeImageResult(res, services?.value)
      result.value = normalized
      progress.value = 'done'
      return normalized
    } catch (e) {
      if (isAbortError(e)) {
        progress.value = 'idle'
        error.value = ''
        const abortErr = e instanceof Error ? e : new Error('Image generation was cancelled')
        abortErr.name = 'AbortError'
        throw abortErr
      }
      error.value = getI18nErrorMessage(e, 'Image generation failed')
      progress.value = 'error'
      throw e
    } finally {
      if (activeController.value === controller) {
        activeController.value = null
      }
      generating.value = false
    }
  }

  const generate = async (req: ImageRequest) => {
    if (!services?.value?.imageService) throw new Error('Image service not available')
    return await callGenerate((signal) =>
      services.value!.imageService!.generate({ ...req, signal }),
    )
  }

  const generateText2Image = async (req: Text2ImageRequest) => {
    if (!services?.value?.imageService) throw new Error('Image service not available')
    return await callGenerate((signal) =>
      services.value!.imageService!.generateText2Image({ ...req, signal }),
    )
  }

  const generateImage2Image = async (req: Image2ImageRequest) => {
    if (!services?.value?.imageService) throw new Error('Image service not available')
    return await callGenerate((signal) =>
      services.value!.imageService!.generateImage2Image({ ...req, signal }),
    )
  }

  const generateMultiImage = async (req: MultiImageGenerationRequest) => {
    if (!services?.value?.imageService) throw new Error('Image service not available')
    return await callGenerate((signal) =>
      services.value!.imageService!.generateMultiImage({ ...req, signal }),
    )
  }

  const validateText2ImageRequest = async (req: Text2ImageRequest) => {
    if (!services?.value?.imageService) throw new Error('Image service not available')
    await services.value.imageService.validateText2ImageRequest(req)
  }

  const validateImage2ImageRequest = async (req: Image2ImageRequest) => {
    if (!services?.value?.imageService) throw new Error('Image service not available')
    await services.value.imageService.validateImage2ImageRequest(req)
  }

  const validateMultiImageRequest = async (req: MultiImageRequest) => {
    if (!services?.value?.imageService) throw new Error('Image service not available')
    await services.value.imageService.validateMultiImageRequest(req)
  }

  return {
    services,
    imageModels,
    generating,
    progress,
    error,
    result,
    generate,
    generateText2Image,
    generateImage2Image,
    generateMultiImage,
    cancel,
    validateText2ImageRequest,
    validateImage2ImageRequest,
    validateMultiImageRequest,
    loadImageModels,
  }
}
