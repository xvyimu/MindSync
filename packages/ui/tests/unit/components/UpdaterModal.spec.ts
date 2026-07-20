import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, reactive } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'

const updaterModuleMock = vi.hoisted(() => ({
  useUpdater: vi.fn(),
}))

vi.mock('../../../src/composables/system/useUpdater', () => ({
  useUpdater: updaterModuleMock.useUpdater,
}))

import UpdaterModal from '../../../src/components/UpdaterModal.vue'

const ModalStub = defineComponent({
  name: 'Modal',
  setup(_, { slots }) {
    return () => h('section', { 'data-testid': 'modal-stub' }, [
      slots.title?.(),
      slots.default?.(),
      slots.footer?.(),
    ])
  },
})

const PassthroughStub = defineComponent({
  inheritAttrs: false,
  setup(_, { attrs, slots }) {
    return () => h('div', attrs, [
      slots.header?.(),
      slots.default?.(),
      slots.description?.(),
    ])
  },
})

const AlertStub = defineComponent({
  name: 'NAlert',
  inheritAttrs: false,
  props: {
    type: String,
  },
  setup(props, { attrs, slots }) {
    return () => h('div', {
      ...attrs,
      'data-stub': 'alert',
      'data-alert-type': props.type,
    }, slots.default?.())
  },
})

const ButtonStub = defineComponent({
  name: 'NButton',
  inheritAttrs: false,
  props: {
    disabled: Boolean,
    loading: Boolean,
  },
  emits: ['click'],
  setup(props, { attrs, emit, slots }) {
    return () => h('button', {
      ...attrs,
      disabled: props.disabled,
      'data-loading': String(props.loading),
      onClick: () => emit('click'),
    }, slots.default?.())
  },
})

const ProgressStub = defineComponent({
  name: 'NProgress',
  setup() {
    return () => h('div', { 'data-testid': 'download-progress' })
  },
})

type UpdateDelivery = {
  mode: 'in-app' | 'manual-release'
  reason: 'macos-unsigned' | null
  platform: string
  arch: string
  fallbackReleaseUrl: string | null
}

const manualDelivery = (arch = 'arm64'): UpdateDelivery => ({
  mode: 'manual-release',
  reason: 'macos-unsigned',
  platform: 'darwin',
  arch,
  fallbackReleaseUrl: 'https://github.com/linshenkx/prompt-optimizer/releases',
})

const inAppDelivery: UpdateDelivery = {
  mode: 'in-app',
  reason: null,
  platform: 'win32',
  arch: 'x64',
  fallbackReleaseUrl: 'https://github.com/linshenkx/prompt-optimizer/releases',
}

const createState = (overrides: Record<string, unknown> = {}) => reactive({
  hasUpdate: false,
  updateInfo: null,
  downloadProgress: null,
  isDownloading: false,
  isDownloaded: false,
  isCheckingUpdate: false,
  lastCheckResult: 'none',
  lastCheckMessage: '',
  stableVersion: null,
  stableReleaseUrl: null,
  prereleaseVersion: null,
  prereleaseReleaseUrl: null,
  updateDelivery: null,
  releasePageError: null,
  hasStableUpdate: false,
  hasPrereleaseUpdate: false,
  currentVersion: '2.11.7',
  isDownloadingStable: false,
  isDownloadingPrerelease: false,
  downloadMessage: null,
  lastDownloadAttempt: null,
  isStableVersionIgnored: false,
  isPrereleaseVersionIgnored: false,
  ...overrides,
})

const createUpdater = (stateOverrides: Record<string, unknown> = {}) => {
  const updater = {
    state: createState(stateOverrides),
    checkUpdate: vi.fn().mockResolvedValue(undefined),
    installUpdate: vi.fn().mockResolvedValue(undefined),
    ignoreUpdate: vi.fn().mockResolvedValue(undefined),
    unignoreUpdate: vi.fn().mockResolvedValue(undefined),
    openVersionReleaseUrl: vi.fn().mockResolvedValue(true),
    downloadStableVersion: vi.fn().mockResolvedValue(undefined),
    downloadPrereleaseVersion: vi.fn().mockResolvedValue(undefined),
  }

  updaterModuleMock.useUpdater.mockReturnValue(updater)
  return updater
}

const mountUpdaterModal = () => mount(UpdaterModal, {
  props: {
    modelValue: true,
  },
  global: {
    stubs: {
      Modal: ModalStub,
      NAlert: AlertStub,
      NButton: ButtonStub,
      NCard: PassthroughStub,
      NProgress: ProgressStub,
      NSpace: PassthroughStub,
      NSpin: PassthroughStub,
      NTag: PassthroughStub,
      NText: PassthroughStub,
    },
  },
})

describe('UpdaterModal update delivery actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows manual guidance and opens the stable release page without downloading', async () => {
    const updater = createUpdater({
      updateDelivery: manualDelivery('arm64'),
      stableVersion: '2.12.0',
      stableReleaseUrl: 'https://github.com/linshenkx/prompt-optimizer/releases/tag/v2.12.0',
      hasStableUpdate: true,
      hasUpdate: true,
    })
    const wrapper = mountUpdaterModal()

    const guidance = wrapper.get('[data-testid="macos-manual-update-guidance"]')
    expect(guidance.text()).toContain('macOS currently requires a manual update')

    await wrapper.get('[data-testid="stable-update-primary-action"]').trigger('click')
    await flushPromises()

    expect(updater.openVersionReleaseUrl).toHaveBeenCalledOnce()
    expect(updater.openVersionReleaseUrl).toHaveBeenCalledWith('stable')
    expect(updater.downloadStableVersion).not.toHaveBeenCalled()
    expect(updater.downloadPrereleaseVersion).not.toHaveBeenCalled()
  })

  it('opens the prerelease page in manual mode without starting a prerelease download', async () => {
    const updater = createUpdater({
      updateDelivery: manualDelivery('x64'),
      prereleaseVersion: '2.12.0-rc.1',
      prereleaseReleaseUrl: 'https://github.com/linshenkx/prompt-optimizer/releases/tag/v2.12.0-rc.1',
      hasPrereleaseUpdate: true,
      hasUpdate: true,
    })
    const wrapper = mountUpdaterModal()

    await wrapper.get('[data-testid="prerelease-update-primary-action"]').trigger('click')
    await flushPromises()

    expect(updater.openVersionReleaseUrl).toHaveBeenCalledOnce()
    expect(updater.openVersionReleaseUrl).toHaveBeenCalledWith('prerelease')
    expect(updater.downloadPrereleaseVersion).not.toHaveBeenCalled()
    expect(updater.downloadStableVersion).not.toHaveBeenCalled()
  })

  it('does not recommend a specific installer architecture', () => {
    createUpdater({
      updateDelivery: manualDelivery('x64'),
      stableVersion: '2.12.0',
      hasStableUpdate: true,
      hasUpdate: true,
    })
    const wrapper = mountUpdaterModal()

    const guidance = wrapper.get('[data-testid="macos-manual-update-guidance"]')
    expect(guidance.text()).not.toContain('mac-arm64.dmg')
    expect(guidance.text()).not.toContain('mac-x64.dmg')
  })

  it('fails closed when update delivery policy is unavailable', async () => {
    const updater = createUpdater({
      updateDelivery: null,
      stableVersion: '2.12.0',
      hasStableUpdate: true,
      hasUpdate: true,
    })
    const wrapper = mountUpdaterModal()

    await wrapper.get('[data-testid="stable-update-primary-action"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('A manual update is currently required')
    expect(updater.openVersionReleaseUrl).toHaveBeenCalledWith('stable')
    expect(updater.downloadStableVersion).not.toHaveBeenCalled()
  })

  it('hides in-app progress and installation UI when manual delivery state is stale', () => {
    const updater = createUpdater({
      updateDelivery: manualDelivery(),
      stableVersion: '2.12.0',
      hasStableUpdate: true,
      hasUpdate: true,
      isDownloading: true,
      isDownloadingStable: true,
      downloadProgress: {
        percent: 50,
        transferred: 512,
        total: 1024,
        bytesPerSecond: 128,
      },
      isDownloaded: true,
    })
    const wrapper = mountUpdaterModal()

    expect(wrapper.find('[data-testid="download-progress"]').exists()).toBe(false)
    expect(wrapper.find('[data-stub="alert"][data-alert-type="success"]').exists()).toBe(false)
    expect(updater.installUpdate).not.toHaveBeenCalled()
  })

  it('keeps stable and prerelease download actions in in-app delivery mode', async () => {
    const updater = createUpdater({
      updateDelivery: inAppDelivery,
      stableVersion: '2.12.0',
      stableReleaseUrl: 'https://github.com/linshenkx/prompt-optimizer/releases/tag/v2.12.0',
      prereleaseVersion: '2.13.0-beta.1',
      prereleaseReleaseUrl: 'https://github.com/linshenkx/prompt-optimizer/releases/tag/v2.13.0-beta.1',
      hasStableUpdate: true,
      hasPrereleaseUpdate: true,
      hasUpdate: true,
    })
    const wrapper = mountUpdaterModal()

    expect(wrapper.find('[data-testid="macos-manual-update-guidance"]').exists()).toBe(false)

    await wrapper.get('[data-testid="stable-update-primary-action"]').trigger('click')
    await wrapper.get('[data-testid="prerelease-update-primary-action"]').trigger('click')
    await flushPromises()

    expect(updater.downloadStableVersion).toHaveBeenCalledOnce()
    expect(updater.downloadPrereleaseVersion).toHaveBeenCalledOnce()
    expect(updater.openVersionReleaseUrl).not.toHaveBeenCalled()
  })

  it('renders a release-page error from updater state', () => {
    createUpdater({
      updateDelivery: manualDelivery(),
      releasePageError: 'The release page could not be opened.',
    })
    const wrapper = mountUpdaterModal()

    expect(wrapper.text()).toContain('The release page could not be opened.')
  })
})
