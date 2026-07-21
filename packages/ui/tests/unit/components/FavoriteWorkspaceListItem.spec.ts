import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'

import type { FavoriteCategory, FavoritePrompt } from '@mindsync/core'

import FavoriteWorkspaceListItem from '../../../src/components/FavoriteWorkspaceListItem.vue'

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
  NTag: {
    name: 'NTag',
    template: '<span class="n-tag"><slot /></span>',
    props: ['type', 'size', 'bordered', 'color'],
  },
  NText: {
    name: 'NText',
    template: '<span class="n-text"><slot /></span>',
    props: ['depth'],
  },
  NIcon: {
    name: 'NIcon',
    template: '<i class="n-icon"><slot /></i>',
  },
  NButton: {
    name: 'NButton',
    template: '<button class="n-button" v-bind="$attrs" @click="$emit(\'click\', $event)"><slot name="icon" /><slot /></button>',
    emits: ['click'],
  },
  NEllipsis: {
    name: 'NEllipsis',
    template: '<span class="n-ellipsis"><slot /></span>',
    props: ['lineClamp', 'tooltip', 'class'],
  },
  NThing: {
    name: 'NThing',
    template: '<div class="n-thing"><div><slot name="header" /></div><div><slot name="description" /></div></div>',
  },
  NDropdown: {
    name: 'NDropdown',
    template: `
      <div class="n-dropdown">
        <slot />
        <button
          v-for="option in normalizedOptions"
          :key="option.key"
          class="n-dropdown-option"
          :data-key="option.key"
          @click="$emit('select', option.key)"
        >
          {{ option.key }}
        </button>
      </div>
    `,
    props: ['options'],
    emits: ['select'],
    computed: {
      normalizedOptions() {
        return (this.options || []).filter((option: any) => !option.type)
      },
    },
  },
  AppPreviewImage: {
    name: 'AppPreviewImage',
    template: '<img class="app-preview-image" :src="src" :alt="alt" />',
    props: ['src', 'alt', 'objectFit', 'previewDisabled', 'class'],
  },
}

const createFavorite = (overrides: Partial<FavoritePrompt> = {}): FavoritePrompt => ({
  id: 'favorite-1',
  title: 'Very long favorite prompt title that should remain bounded in the card',
  content: 'A long favorite content block that should be summarized and clamped inside the card body.',
  description: 'A reusable favorite description.',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  tags: ['tag-a', 'tag-b', 'tag-c', 'tag-d'],
  category: 'category-1',
  useCount: 7,
  functionMode: 'image',
  imageSubMode: 'text2image',
  ...overrides,
})

const category: FavoriteCategory = {
  id: 'category-1',
  name: 'Visual Reference',
  color: '#3366ff',
  createdAt: Date.now(),
  sortOrder: 1,
}

const mountComponent = (props: Partial<InstanceType<typeof FavoriteWorkspaceListItem>['$props']> = {}) =>
  mount(FavoriteWorkspaceListItem, {
    props: {
      favorite: createFavorite(),
      category,
      variant: 'card',
      showQuickActions: true,
      ...props,
    },
    global: {
      stubs: naiveStubs,
      provide: {
        services: ref({
          favoriteImageStorageService: {},
          imageStorageService: {},
        } as any),
      },
    },
  })

describe('FavoriteWorkspaceListItem', () => {
  beforeEach(() => {
    parseFavoriteMediaMetadataMock.mockReset()
    resolveAssetIdToDataUrlMock.mockReset()
    parseFavoriteMediaMetadataMock.mockReturnValue(null)
    resolveAssetIdToDataUrlMock.mockResolvedValue(null)
  })

  it('renders card variant with bounded visible tags only', async () => {
    const wrapper = mountComponent()

    await flushPromises()

    expect(wrapper.classes()).toContain('favorite-workspace-list-item--card')
    expect(wrapper.attributes('role')).toBe('button')
    expect(wrapper.text()).toContain('Very long favorite prompt title')
    expect(wrapper.text()).toContain('Visual Reference')
    expect(wrapper.text()).toContain('tag-a')
    expect(wrapper.text()).toContain('tag-b')
    expect(wrapper.text()).not.toContain('+2 tags')
    expect(wrapper.text()).not.toContain('tag-c')
  })

  it('renders variables and examples as compact reproducibility chips', async () => {
    const wrapper = mountComponent({
      favorite: createFavorite({
        metadata: {
          reproducibility: {
            variables: [
              {
                name: 'style',
                defaultValue: 'watercolor',
              },
            ],
            examples: [
              {
                id: 'example-1',
                parameters: {
                  style: 'ink',
                },
              },
            ],
          },
        },
      }),
    })

    await flushPromises()

    expect(wrapper.text()).toContain('1 vars')
    expect(wrapper.text()).toContain('1 examples')
  })

  it('keeps quick actions from selecting the card', async () => {
    const wrapper = mountComponent()

    await flushPromises()
    await wrapper.find('[title="Use now"]').trigger('click')
    await wrapper.find('[title="Copy content"]').trigger('click')
    await wrapper.trigger('keydown', { key: 'Enter' })

    expect(wrapper.emitted('use')).toHaveLength(1)
    expect(wrapper.emitted('copy')).toHaveLength(1)
    expect(wrapper.emitted('select')).toHaveLength(1)
  })

  it('does not reload the cover image when only non-media fields change', async () => {
    const metadata = {
      media: {
        coverAssetId: 'cover-1',
        assetIds: ['cover-1'],
        urls: [],
      },
    }
    const favorite = createFavorite({ metadata })
    parseFavoriteMediaMetadataMock.mockImplementation((input: FavoritePrompt) => ({
      coverAssetId: (input.metadata?.media as { coverAssetId?: string }).coverAssetId,
      assetIds: [],
      urls: [],
    }))
    resolveAssetIdToDataUrlMock.mockResolvedValue('data:image/png;base64,cover')

    const wrapper = mountComponent({ favorite })
    await flushPromises()

    expect(parseFavoriteMediaMetadataMock).toHaveBeenCalledTimes(1)
    expect(resolveAssetIdToDataUrlMock).toHaveBeenCalledTimes(1)

    await wrapper.setProps({
      favorite: {
        ...favorite,
        title: 'Updated title',
        useCount: favorite.useCount + 1,
        updatedAt: favorite.updatedAt + 1000,
      },
    })
    await flushPromises()

    expect(parseFavoriteMediaMetadataMock).toHaveBeenCalledTimes(1)
    expect(resolveAssetIdToDataUrlMock).toHaveBeenCalledTimes(1)

    await wrapper.setProps({
      favorite: {
        ...favorite,
        metadata: {
          media: {
            coverAssetId: 'cover-2',
            assetIds: ['cover-2'],
            urls: [],
          },
        },
      },
    })
    await flushPromises()

    expect(parseFavoriteMediaMetadataMock).toHaveBeenCalledTimes(2)
    expect(resolveAssetIdToDataUrlMock).toHaveBeenCalledTimes(2)
  })

  it('keeps stale async cover resolves from replacing the current cover', async () => {
    const createMediaFavorite = (coverAssetId: string) =>
      createFavorite({
        metadata: {
          media: {
            coverAssetId,
            assetIds: [coverAssetId],
            urls: [],
          },
        },
      })
    const favorite = createMediaFavorite('cover-1')
    let resolveFirst!: (value: string | null) => void
    let resolveSecond!: (value: string | null) => void

    parseFavoriteMediaMetadataMock.mockImplementation((input: FavoritePrompt) => ({
      coverAssetId: (input.metadata?.media as { coverAssetId?: string }).coverAssetId,
      assetIds: [],
      urls: [],
    }))
    resolveAssetIdToDataUrlMock.mockImplementation((assetId: string) =>
      new Promise<string | null>((resolve) => {
        if (assetId === 'cover-1') {
          resolveFirst = resolve
        } else if (assetId === 'cover-2') {
          resolveSecond = resolve
        } else {
          resolve(null)
        }
      }),
    )

    const wrapper = mountComponent({ favorite })
    await flushPromises()

    await wrapper.setProps({ favorite: createMediaFavorite('cover-2') })
    await flushPromises()

    resolveSecond('data:image/png;base64,current')
    await flushPromises()

    expect(wrapper.find('img.app-preview-image').attributes('src')).toBe('data:image/png;base64,current')

    resolveFirst('data:image/png;base64,stale')
    await flushPromises()

    expect(wrapper.find('img.app-preview-image').attributes('src')).toBe('data:image/png;base64,current')
  })
})
