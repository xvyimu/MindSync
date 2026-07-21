import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'

import type { FavoriteCategory, FavoritePrompt } from '@mindsync/core'

vi.mock('vue-i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-i18n')>()
  return {
    ...actual,
    useI18n: () => ({
      t: (key: string, params?: Record<string, unknown>) => {
        const messages: Record<string, string> = {
          'favorites.manager.preview.selectFavorite': 'Select a favorite',
          'favorites.manager.preview.backToList': 'Back to list',
          'favorites.manager.card.copyContent': 'Copy content',
          'favorites.manager.card.useNow': 'Use now',
          'favorites.manager.card.edit': 'Edit',
          'favorites.manager.card.delete': 'Delete',
          'favorites.manager.preview.updatedAt': `Updated ${params?.time ?? ''}`.trim(),
          'favorites.manager.preview.useCountInline': `${params?.count ?? 0} uses`,
          'favorites.manager.preview.contentTitle': 'Content',
          'favorites.manager.preview.extraTitle': 'Extra details',
          'favorites.manager.preview.media.title': 'Images',
          'favorites.manager.preview.media.imageAlt': `Image ${params?.index ?? ''}`.trim(),
          'favorites.manager.preview.reproducibility.title': 'Variables & Examples',
          'favorites.manager.preview.reproducibility.empty': 'No variables or examples configured',
          'favorites.manager.preview.reproducibility.variables': 'Variables',
          'favorites.manager.preview.reproducibility.examples': 'Examples',
          'favorites.manager.preview.reproducibility.variableCount': `${params?.count ?? 0} variables`,
          'favorites.manager.preview.reproducibility.exampleCount': `${params?.count ?? 0} examples`,
          'favorites.manager.preview.reproducibility.hasInputImages': 'Has input images',
          'favorites.manager.preview.reproducibility.applyExample': 'Use this example',
          'favorites.version.title': 'Versions',
          'favorites.version.current': 'Current',
          'favorites.version.itemLabel': `v${params?.version ?? ''}`,
          'favorites.version.previewTitle': `View version v${params?.version ?? ''}`,
          'favorites.version.closePreview': 'Close',
          'favorites.version.currentVersion': `Current version v${params?.version ?? ''}`,
          'favorites.version.createdAt': `Created ${params?.time ?? ''}`.trim(),
          'favorites.version.updatedAt': `Updated ${params?.time ?? ''}`.trim(),
          'favorites.version.emptyPreview': 'No content preview',
          'favorites.version.setCurrent': 'Set current',
          'favorites.version.delete': 'Delete',
          'favorites.manager.preview.reproducibility.variableName': 'Variable',
          'favorites.manager.preview.reproducibility.variableDefault': 'Default',
          'favorites.manager.preview.reproducibility.variableRequired': 'Required',
          'favorites.manager.preview.reproducibility.variableDescription': 'Description',
          'favorites.manager.preview.reproducibility.requiredYes': 'Yes',
          'favorites.manager.preview.reproducibility.requiredNo': 'No',
          'favorites.manager.preview.reproducibility.exampleLabel': `Example ${params?.index ?? ''}`.trim(),
          'favorites.manager.preview.reproducibility.parameters': 'Parameters',
          'favorites.manager.preview.reproducibility.images': 'Images',
          'favorites.manager.preview.reproducibility.inputImages': 'Input images',
          'favorites.manager.card.functionMode.basic': 'Basic',
          'favorites.manager.card.functionMode.context': 'Context',
          'favorites.manager.card.functionMode.image': 'Image',
          'favorites.manager.card.optimizationMode.system': 'System',
          'favorites.manager.card.optimizationMode.user': 'User',
          'favorites.manager.card.imageSubMode.text2image': 'Text-to-Image',
          'favorites.manager.card.imageSubMode.image2image': 'Image-to-Image',
          'favorites.manager.card.imageSubMode.multiimage': 'Multi-Image',
          'contextMode.optimizationMode.message': 'Message',
          'contextMode.optimizationMode.variable': 'Variable',
          'favorites.manager.time.justNow': 'Just now',
          'favorites.manager.time.minutesAgo': `${params?.minutes ?? 0} minutes ago`,
          'favorites.manager.time.hoursAgo': `${params?.hours ?? 0} hours ago`,
          'favorites.manager.time.yesterday': 'Yesterday',
          'favorites.manager.time.daysAgo': `${params?.days ?? 0} days ago`,
        }
        return messages[key] ?? key
      },
    }),
  }
})

import FavoriteDetailPanel from '../../../src/components/FavoriteDetailPanel.vue'

const parseFavoriteMediaMetadataMock = vi.fn()
const resolveAssetIdToDataUrlMock = vi.fn()

vi.mock('../../../src/utils/favorite-media', () => ({
  parseFavoriteMediaMetadata: (...args: unknown[]) => parseFavoriteMediaMetadataMock(...args),
}))

vi.mock('../../../src/utils/image-asset-storage', () => ({
  resolveAssetIdToDataUrl: (...args: unknown[]) => resolveAssetIdToDataUrlMock(...args),
}))

const naiveStubs = {
  NSpace: {
    name: 'NSpace',
    template: '<div class="n-space"><slot /></div>',
    props: ['vertical', 'size', 'align', 'justify', 'wrap', 'class'],
  },
  NButton: {
    name: 'NButton',
    template: '<button class="n-button" @click="$emit(\'click\', $event)"><slot name="icon" /><slot /></button>',
    emits: ['click'],
  },
  NCard: {
    name: 'NCard',
    template: '<section class="n-card"><header><slot name="header" />{{ title }}</header><div><slot /></div><footer><slot name="footer" /></footer></section>',
    props: ['size', 'segmented', 'title', 'class', 'bordered', 'role', 'ariaModal'],
  },
  NModal: {
    name: 'NModal',
    template: '<div v-if="show" class="n-modal"><slot /></div>',
    props: ['show'],
    emits: ['update:show'],
  },
  NInput: {
    name: 'NInput',
    template: '<textarea v-if="type === \'textarea\'" class="n-input" :value="value" :readonly="readonly">{{ value }}</textarea><input v-else class="n-input" :value="value" :readonly="readonly" />',
    props: ['value', 'type', 'readonly', 'autosize'],
  },
  NCollapse: {
    name: 'NCollapse',
    template: '<div class="n-collapse"><slot /></div>',
    props: ['defaultExpandedNames', 'class'],
  },
  NCollapseItem: {
    name: 'NCollapseItem',
    template: '<section class="n-collapse-item"><header>{{ title }}</header><div><slot /></div></section>',
    props: ['name', 'title'],
  },
  NScrollbar: {
    name: 'NScrollbar',
    template: '<div class="n-scrollbar"><slot /></div>',
    props: ['class'],
  },
  NEmpty: {
    name: 'NEmpty',
    template: '<div class="n-empty">{{ description }}</div>',
    props: ['description'],
  },
  NDescriptions: {
    name: 'NDescriptions',
    template: '<dl class="n-descriptions"><slot /></dl>',
    props: ['column', 'size', 'bordered', 'labelPlacement'],
  },
  NDescriptionsItem: {
    name: 'NDescriptionsItem',
    template: '<div class="n-descriptions-item"><dt>{{ label }}</dt><dd><slot /></dd></div>',
    props: ['label'],
  },
  NTable: {
    name: 'NTable',
    template: '<table class="n-table"><slot /></table>',
    props: ['size', 'striped', 'singleLine'],
  },
  NEllipsis: {
    name: 'NEllipsis',
    template: '<div class="n-ellipsis"><slot /></div>',
    props: ['lineClamp', 'tooltip', 'class'],
  },
  NIcon: {
    name: 'NIcon',
    template: '<i class="n-icon"><slot /></i>',
  },
  NTag: {
    name: 'NTag',
    template: '<span class="n-tag"><slot /></span>',
    props: ['type', 'bordered', 'color'],
  },
  NText: {
    name: 'NText',
    template: '<span class="n-text"><slot /></span>',
    props: ['depth', 'strong', 'class'],
  },
  OutputDisplayCore: {
    name: 'OutputDisplayCore',
    template: '<div class="output-display-core" :data-enabled-actions="(enabledActions || []).join(\',\')">{{ content }}</div>',
    props: ['content', 'originalContent', 'mode', 'enabledActions', 'height'],
  },
  FavoritePreviewExtensionHost: {
    name: 'FavoritePreviewExtensionHost',
    template: '<div class="favorite-preview-extension-host"></div>',
    props: ['favorite'],
    emits: ['favorite-updated'],
  },
  AppPreviewImage: {
    name: 'AppPreviewImage',
    template: '<img class="app-preview-image" :src="src" :alt="alt" />',
    props: ['src', 'alt', 'width', 'objectFit', 'previewDisabled', 'class'],
  },
  AppPreviewImageGroup: {
    name: 'AppPreviewImageGroup',
    template: '<div class="app-preview-image-group"><slot /></div>',
  },
}

const favorite: FavoritePrompt = {
  id: 'favorite-1',
  title: 'Visual prompt',
  content: 'Rendered content',
  description: 'Favorite description',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  tags: ['visual', 'hero'],
  category: 'category-1',
  useCount: 4,
  functionMode: 'image',
  imageSubMode: 'text2image',
}

const category: FavoriteCategory = {
  id: 'category-1',
  name: 'Visual',
  createdAt: Date.now(),
  sortOrder: 1,
}

const mountComponent = (favoriteOverride: FavoritePrompt | null, serviceOverrides: Record<string, unknown> = {}) =>
  mount(FavoriteDetailPanel, {
    props: {
      favorite: favoriteOverride,
      category,
    },
    global: {
      stubs: naiveStubs,
      provide: {
        services: ref({
          favoriteImageStorageService: {},
          imageStorageService: {},
          ...serviceOverrides,
        } as any),
      },
    },
  })

describe('FavoriteDetailPanel', () => {
  beforeEach(() => {
    parseFavoriteMediaMetadataMock.mockReset()
    resolveAssetIdToDataUrlMock.mockReset()
    parseFavoriteMediaMetadataMock.mockReturnValue(null)
    resolveAssetIdToDataUrlMock.mockResolvedValue(null)
  })

  it('uses the text-first template when no media is available', async () => {
    const wrapper = mountComponent({
      ...favorite,
      functionMode: 'basic',
      optimizationMode: 'system',
      imageSubMode: undefined,
    })

    await flushPromises()

    expect(wrapper.find('[data-testid="favorite-detail-panel"]').attributes('data-variant')).toBe('text')
    expect(wrapper.text()).toContain('Rendered content')
  })

  it('uses the image-first template and emits actions for media favorites', async () => {
    parseFavoriteMediaMetadataMock.mockReturnValue({
      coverAssetId: 'cover-1',
      assetIds: ['image-2'],
      urls: [],
    })
    resolveAssetIdToDataUrlMock.mockImplementation(async (assetId: string) =>
      `data:image/png;base64,${assetId}`,
    )

    const wrapper = mountComponent(favorite)

    await flushPromises()

    expect(wrapper.find('[data-testid="favorite-detail-panel"]').attributes('data-variant')).toBe('image')
    expect(wrapper.find('[data-testid="favorite-detail-media-hero"]').exists()).toBe(true)

    await wrapper.find('[data-testid="favorite-detail-use"]').trigger('click')
    await wrapper.find('[data-testid="favorite-detail-copy"]').trigger('click')
    await wrapper.find('[data-testid="favorite-detail-share"]').trigger('click')
    await wrapper.find('[data-testid="favorite-detail-edit"]').trigger('click')
    await wrapper.find('[data-testid="favorite-detail-delete"]').trigger('click')

    expect(wrapper.emitted('use')).toHaveLength(1)
    expect(wrapper.emitted('copy')).toHaveLength(1)
    expect(wrapper.emitted('share')).toHaveLength(1)
    expect(wrapper.emitted('edit')).toHaveLength(1)
    expect(wrapper.emitted('delete')).toHaveLength(1)
  })

  it('ignores stale media resolution after switching to a text-only favorite', async () => {
    let resolveCover: (value: string | null) => void = () => {}
    parseFavoriteMediaMetadataMock.mockImplementation((candidate?: FavoritePrompt | null) =>
      candidate?.id === 'media-favorite'
        ? {
            coverAssetId: 'cover-1',
            assetIds: [],
            urls: [],
          }
        : null,
    )
    resolveAssetIdToDataUrlMock.mockReturnValue(
      new Promise((resolve) => {
        resolveCover = resolve
      }),
    )

    const wrapper = mountComponent({
      ...favorite,
      id: 'media-favorite',
    })

    await wrapper.setProps({
      favorite: {
        ...favorite,
        id: 'text-favorite',
        functionMode: 'basic',
        optimizationMode: 'system',
        imageSubMode: undefined,
      },
    })
    await flushPromises()

    resolveCover('data:image/png;base64,stale-cover')
    await flushPromises()

    expect(wrapper.find('[data-testid="favorite-detail-panel"]').attributes('data-variant')).toBe('text')
    expect(wrapper.find('[data-testid="favorite-detail-media-hero"]').exists()).toBe(false)
  })

  it('enables diff actions for legacy top-level originalContent', async () => {
    const wrapper = mountComponent({
      ...favorite,
      functionMode: 'basic',
      optimizationMode: 'system',
      imageSubMode: undefined,
      originalContent: 'Original prompt',
    } as FavoritePrompt)

    await flushPromises()

    expect(wrapper.find('.output-display-core').attributes('data-enabled-actions')).toBe('diff')
  })

  it('shows variable and example reproducibility metadata in the detail panel', async () => {
    const wrapper = mountComponent({
      ...favorite,
      functionMode: 'basic',
      optimizationMode: 'system',
      imageSubMode: undefined,
      metadata: {
        gardenSnapshot: {
          variables: [
            {
              name: 'style',
              defaultValue: 'watercolor',
              required: true,
              description: 'Rendering style',
            },
          ],
          assets: {
            examples: [
              {
                id: 'example-1',
                parameters: {
                  style: 'ink',
                },
                inputImages: ['https://example.com/input.png'],
              },
            ],
          },
        },
      },
    })

    await flushPromises()

    expect(wrapper.text()).not.toContain('Variables & Examples')
    expect(wrapper.text()).toContain('Variables')
    expect(wrapper.text()).toContain('Examples')
    expect(wrapper.text()).toContain('1 variables')
    expect(wrapper.text()).toContain('style')
    expect(wrapper.text()).toContain('watercolor')
    expect(wrapper.text()).toContain('1 examples')
    expect(wrapper.text()).toContain('Example 1')
    expect(wrapper.text()).toContain('ink')
  })

  it('emits applyExample use options from a projected example apply button', async () => {
    const wrapper = mountComponent({
      ...favorite,
      functionMode: 'context',
      optimizationMode: 'user',
      imageSubMode: undefined,
      metadata: {
        reproducibility: {
          variables: [{ name: 'topic', defaultValue: 'default topic' }],
          examples: [
            {
              id: 'example-alpha',
              parameters: { topic: 'alpha' },
            },
            {
              id: 'example-beta',
              parameters: { topic: 'beta' },
            },
          ],
        },
      },
    })

    await flushPromises()

    await wrapper.get('[data-testid="favorite-repro-example-apply-1"]').trigger('click')

    expect(wrapper.emitted('use')).toEqual([
      [
        expect.objectContaining({ id: favorite.id }),
        {
          applyExample: true,
          exampleId: 'example-beta',
          exampleIndex: 1,
        },
      ],
    ])
  })

  it('resolves and displays example asset images in the detail panel', async () => {
    resolveAssetIdToDataUrlMock.mockImplementation(async (assetId: string) => {
      if (assetId === 'asset-output') return 'data:image/png;base64,output-preview'
      if (assetId === 'asset-input') return 'data:image/png;base64,input-preview'
      return null
    })

    const wrapper = mountComponent({
      ...favorite,
      functionMode: 'basic',
      optimizationMode: 'system',
      imageSubMode: undefined,
      metadata: {
        reproducibility: {
          variables: [],
          examples: [
            {
              id: 'example-assets',
              parameters: {},
              imageAssetIds: ['asset-output'],
              inputImageAssetIds: ['asset-input'],
            },
          ],
        },
      },
    })

    await flushPromises()

    expect(wrapper.findAll('.app-preview-image').map((image) => image.attributes('src'))).toEqual([
      'data:image/png;base64,output-preview',
      'data:image/png;base64,input-preview',
    ])
  })

  it('renders the embedded prompt asset current version and compact version list', async () => {
    const wrapper = mountComponent({
      ...favorite,
      functionMode: 'basic',
      optimizationMode: 'system',
      imageSubMode: undefined,
      metadata: {
        promptAsset: {
          schemaVersion: 'prompt-model/v1',
          id: 'asset-favorite-1',
          title: 'Versioned favorite',
          tags: [],
          contract: {
            family: 'basic',
            subMode: 'system',
            modeKey: 'basic-system',
            variables: [],
          },
          currentVersionId: 'version-2',
          versions: [
            {
              id: 'version-1',
              version: 1,
              content: { kind: 'text', text: 'First prompt draft' },
              createdAt: 1,
            },
            {
              id: 'version-2',
              version: 2,
              content: { kind: 'text', text: 'Current prompt draft' },
              createdAt: 2,
            },
          ],
          examples: [],
          createdAt: 1,
          updatedAt: 2,
        },
      },
    })

    await flushPromises()

    expect(wrapper.get('[data-testid="favorite-detail-current-version"]').text()).toContain('v2')
    expect(wrapper.get('[data-testid="favorite-prompt-asset-version-list"]').text()).toContain('Current prompt draft')
    expect(wrapper.get('[data-testid="favorite-prompt-asset-version-list"]').text()).toContain('First prompt draft')
    expect(wrapper.text()).not.toContain('version-1')
    expect(wrapper.text()).not.toContain('version-2')
  })

  it('opens a selected historical version in a read-only modal without changing displayed content', async () => {
    const favoriteManager = {
      updateFavorite: vi.fn(async () => {}),
      setFavoritePromptAssetCurrentVersion: vi.fn(async () => {}),
      deleteFavoritePromptAssetVersion: vi.fn(async () => {}),
    }
    const wrapper = mountComponent({
      ...favorite,
      functionMode: 'basic',
      optimizationMode: 'system',
      imageSubMode: undefined,
      content: 'Current prompt draft',
      metadata: {
        promptAsset: {
          schemaVersion: 'prompt-model/v1',
          id: 'asset-favorite-1',
          title: 'Versioned favorite',
          tags: [],
          contract: {
            family: 'basic',
            subMode: 'system',
            modeKey: 'basic-system',
            variables: [],
          },
          currentVersionId: 'version-2',
          versions: [
            {
              id: 'version-1',
              version: 1,
              content: { kind: 'text', text: 'First prompt draft' },
              createdAt: 1,
            },
            {
              id: 'version-2',
              version: 2,
              content: { kind: 'text', text: 'Current prompt draft' },
              createdAt: 2,
            },
          ],
          examples: [],
          createdAt: 1,
          updatedAt: 2,
        },
      },
    }, { favoriteManager })

    await flushPromises()
    expect(wrapper.find('.output-display-core').text()).toContain('Current prompt draft')

    await wrapper.get('[data-testid="favorite-prompt-asset-version-view-1"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('.output-display-core').text()).toContain('Current prompt draft')
    expect(wrapper.find('[data-testid="favorite-detail-viewing-version"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="favorite-prompt-asset-version-modal-content"]').text()).toContain('First prompt draft')
    expect(favoriteManager.updateFavorite).not.toHaveBeenCalled()
    expect(favoriteManager.setFavoritePromptAssetCurrentVersion).not.toHaveBeenCalled()
    expect(favoriteManager.deleteFavoritePromptAssetVersion).not.toHaveBeenCalled()
  })
})
