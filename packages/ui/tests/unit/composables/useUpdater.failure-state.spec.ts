import { describe, expect, it } from 'vitest'

import {
  invalidateActionableCheckState,
  type UpdaterState,
} from '../../../src/composables/system/useUpdater'

const createState = (overrides: Partial<UpdaterState> = {}): UpdaterState => ({
  hasUpdate: true,
  updateInfo: { version: '2.12.0' },
  downloadProgress: { percent: 42, transferred: 42, total: 100, bytesPerSecond: 10 },
  isDownloading: true,
  isDownloaded: false,
  isCheckingUpdate: true,
  lastCheckResult: 'available',
  lastCheckMessage: 'New version available',
  stableVersion: '2.12.0',
  stableReleaseUrl: 'https://github.com/example/repo/releases/tag/v2.12.0',
  prereleaseVersion: '2.13.0-beta.1',
  prereleaseReleaseUrl: 'https://github.com/example/repo/releases/tag/v2.13.0-beta.1',
  updateDelivery: {
    mode: 'in-app',
    reason: null,
    platform: 'win32',
    arch: 'x64',
    fallbackReleaseUrl: 'https://github.com/example/repo/releases',
  },
  releasePageError: 'Old release error',
  hasStableUpdate: true,
  hasPrereleaseUpdate: true,
  currentVersion: '2.11.7',
  isDownloadingStable: true,
  isDownloadingPrerelease: false,
  downloadMessage: { type: 'info', content: 'Download started' },
  lastDownloadAttempt: 'stable',
  isStableVersionIgnored: true,
  isPrereleaseVersionIgnored: true,
  ...overrides,
})

describe('invalidateActionableCheckState', () => {
  it('removes stale version actions while preserving an active download and delivery policy', () => {
    const state = createState()
    const deliveryPolicy = state.updateDelivery
    const downloadMessage = state.downloadMessage

    invalidateActionableCheckState(state)

    expect(state).toMatchObject({
      hasUpdate: false,
      updateInfo: null,
      hasStableUpdate: false,
      hasPrereleaseUpdate: false,
      stableVersion: null,
      stableReleaseUrl: null,
      prereleaseVersion: null,
      prereleaseReleaseUrl: null,
      isStableVersionIgnored: false,
      isPrereleaseVersionIgnored: false,
      releasePageError: null,
      isDownloading: true,
      isDownloadingStable: true,
    })
    expect(state.downloadProgress?.percent).toBe(42)
    expect(state.downloadMessage).toBe(downloadMessage)
    expect(state.updateDelivery).toBe(deliveryPolicy)
  })

  it('preserves an update that is already ready to install', () => {
    const state = createState({
      isDownloading: false,
      isDownloadingStable: false,
      isDownloaded: true,
      downloadProgress: null,
    })

    invalidateActionableCheckState(state)

    expect(state.isDownloaded).toBe(true)
  })
})
