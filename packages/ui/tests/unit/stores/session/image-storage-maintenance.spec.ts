import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  BASIC_SYSTEM_SESSION_KEY,
  FAVORITES_STORAGE_KEY,
  IMAGE_IMAGE2IMAGE_SESSION_KEY,
  IMAGE_MULTIIMAGE_SESSION_KEY,
  IMAGE_TEXT2IMAGE_SESSION_KEY,
  scheduleImageStorageGc,
} from '../../../../src/stores/session/imageStorageMaintenance'

const flushScheduledGc = async () => {
  await vi.runAllTimersAsync()
  await Promise.resolve()
}

describe('imageStorageMaintenance GC', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(async () => {
    await vi.runOnlyPendingTimersAsync()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('keeps Prompt Garden favorite asset ids referenced in metadata', async () => {
    const preferenceService = {
      get: vi.fn(async (key: string, defaultValue: unknown) => {
        if (key === IMAGE_TEXT2IMAGE_SESSION_KEY || key === IMAGE_IMAGE2IMAGE_SESSION_KEY || key === FAVORITES_STORAGE_KEY) {
          return null
        }

        return defaultValue
      }),
    }

    const imageStorageService = {
      listAllMetadata: vi.fn(async () => [
        { id: 'img-cover' },
        { id: 'img-show-1' },
        { id: 'img-show-2' },
        { id: 'img-input-1' },
        { id: 'img-orphan' },
      ]),
      deleteImages: vi.fn(async (_ids: string[]) => {}),
    }

    scheduleImageStorageGc(preferenceService as any, imageStorageService as any, {
      delayMs: 0,
      getFavoritesPayload: async () => [
        {
          id: 'fav-1',
          metadata: {
            gardenSnapshot: {
              assets: {
                cover: { assetId: 'img-cover' },
                showcases: [{ imageAssetIds: ['img-show-1', 'img-show-2'] }],
                examples: [{ inputImageAssetIds: ['img-input-1'] }],
              },
            },
          },
        },
      ],
    })
    await flushScheduledGc()

    expect(imageStorageService.deleteImages).toHaveBeenCalledTimes(1)
    expect(imageStorageService.deleteImages).toHaveBeenCalledWith(['img-orphan'])
  })

  it('supports stringified favorites payload when collecting referenced asset ids', async () => {
    const preferenceService = {
      get: vi.fn(async (key: string, defaultValue: unknown) => {
        if (key === IMAGE_TEXT2IMAGE_SESSION_KEY || key === IMAGE_IMAGE2IMAGE_SESSION_KEY) {
          return null
        }

        if (key === FAVORITES_STORAGE_KEY) {
          return JSON.stringify([
            {
              metadata: {
                gardenSnapshot: {
                  assets: {
                    cover: { assetId: 'img-json-cover' },
                  },
                },
              },
            },
          ])
        }

        return defaultValue
      }),
    }

    const imageStorageService = {
      listAllMetadata: vi.fn(async () => [{ id: 'img-json-cover' }, { id: 'img-orphan-2' }]),
      deleteImages: vi.fn(async (_ids: string[]) => {}),
    }

    scheduleImageStorageGc(preferenceService as any, imageStorageService as any, { delayMs: 0 })
    await flushScheduledGc()

    expect(imageStorageService.deleteImages).toHaveBeenCalledTimes(1)
    expect(imageStorageService.deleteImages).toHaveBeenCalledWith(['img-orphan-2'])
  })

  it('reuses registered favorites provider on later GC schedules', async () => {
    const preferenceService = {
      get: vi.fn(async (key: string, defaultValue: unknown) => {
        if (key === IMAGE_TEXT2IMAGE_SESSION_KEY || key === IMAGE_IMAGE2IMAGE_SESSION_KEY || key === FAVORITES_STORAGE_KEY) {
          return null
        }
        return defaultValue
      }),
    }

    const imageStorageService = {
      listAllMetadata: vi.fn(async () => [{ id: 'img-keep' }, { id: 'img-orphan-3' }]),
      deleteImages: vi.fn(async (_ids: string[]) => {}),
    }

    scheduleImageStorageGc(preferenceService as any, imageStorageService as any, {
      delayMs: 0,
      getFavoritesPayload: async () => [
        {
          metadata: {
            gardenSnapshot: {
              assets: {
                cover: { assetId: 'img-keep' },
              },
            },
          },
        },
      ],
    })

    // Simulate later schedule calls from session saves that do not pass the provider.
    scheduleImageStorageGc(preferenceService as any, imageStorageService as any, { delayMs: 0 })

    await flushScheduledGc()

    expect(imageStorageService.deleteImages).toHaveBeenCalledTimes(1)
    expect(imageStorageService.deleteImages).toHaveBeenCalledWith(['img-orphan-3'])
  })

  it('keeps multiimage input asset ids referenced by the multiimage session snapshot', async () => {
    const preferenceService = {
      get: vi.fn(async (key: string, defaultValue: unknown) => {
        if (key === IMAGE_TEXT2IMAGE_SESSION_KEY || key === IMAGE_IMAGE2IMAGE_SESSION_KEY || key === FAVORITES_STORAGE_KEY) {
          return null
        }

        if (key === IMAGE_MULTIIMAGE_SESSION_KEY) {
          return {
            inputImages: [
              { id: 'img-1', assetId: 'img-multi-1', mimeType: 'image/png' },
              { id: 'img-2', assetId: 'img-multi-2', mimeType: 'image/jpeg' },
            ],
          }
        }

        return defaultValue
      }),
    }

    const imageStorageService = {
      listAllMetadata: vi.fn(async () => [
        { id: 'img-multi-1' },
        { id: 'img-multi-2' },
        { id: 'img-orphan-multi' },
      ]),
      deleteImages: vi.fn(async (_ids: string[]) => {}),
    }

    scheduleImageStorageGc(preferenceService as any, imageStorageService as any, { delayMs: 0 })
    await flushScheduledGc()

    expect(imageStorageService.deleteImages).toHaveBeenCalledTimes(1)
    expect(imageStorageService.deleteImages).toHaveBeenCalledWith(['img-orphan-multi'])
  })

  it('keeps the Basic/System test image asset referenced by its session snapshot', async () => {
    const preferenceService = {
      get: vi.fn(async (key: string, defaultValue: unknown) => {
        if (key === BASIC_SYSTEM_SESSION_KEY) {
          return JSON.stringify({
            testImageAssetId: 'img-basic-test',
            testImageMimeType: 'image/png',
          })
        }

        return defaultValue
      }),
    }
    const imageStorageService = {
      listAllMetadata: vi.fn(async () => [
        { id: 'img-basic-test' },
        { id: 'img-orphan-basic' },
      ]),
      deleteImages: vi.fn(async (_ids: string[]) => {}),
    }

    scheduleImageStorageGc(preferenceService as any, imageStorageService as any, { delayMs: 0 })
    await flushScheduledGc()

    expect(imageStorageService.deleteImages).toHaveBeenCalledTimes(1)
    expect(imageStorageService.deleteImages).toHaveBeenCalledWith(['img-orphan-basic'])
  })
})
