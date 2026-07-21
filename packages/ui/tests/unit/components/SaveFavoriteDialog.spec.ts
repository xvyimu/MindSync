import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import {
  PROMPT_MODEL_SCHEMA_VERSION,
  createPromptContract,
  type FavoritePrompt,
} from '@mindsync/core'

import SaveFavoriteDialog from '../../../src/components/SaveFavoriteDialog.vue'

const createFavorite = (overrides: Partial<FavoritePrompt> = {}): FavoritePrompt => ({
  id: 'favorite-linked',
  title: 'Linked favorite',
  content: 'Favorite content',
  createdAt: 1,
  updatedAt: 2,
  tags: [],
  useCount: 0,
  functionMode: 'basic',
  optimizationMode: 'system',
  metadata: {
    promptAsset: {
      schemaVersion: PROMPT_MODEL_SCHEMA_VERSION,
      id: 'asset-linked',
      title: 'Linked favorite',
      tags: [],
      contract: createPromptContract('basic-system'),
      currentVersionId: 'version-linked',
      versions: [
        {
          id: 'version-linked',
          version: 1,
          content: { kind: 'text', text: 'Favorite content' },
          createdAt: 1,
        },
      ],
      examples: [],
      createdAt: 1,
      updatedAt: 2,
    },
  },
  ...overrides,
})

const mountDialog = async (
  props: Partial<InstanceType<typeof SaveFavoriteDialog>['$props']> = {},
  favorites: FavoritePrompt[] = [createFavorite()],
) => {
  const wrapper = mount(SaveFavoriteDialog, {
    props: {
      show: true,
      content: 'Workspace content',
      originalContent: 'Original content',
      ...props,
    },
    global: {
      provide: {
        services: ref({
          favoriteManager: {
            getFavorites: vi.fn(async () => favorites),
          },
        }),
      },
      stubs: {
        NModal: defineComponent({
          name: 'NModal',
          props: ['show'],
          setup(props, { slots }) {
            return () => props.show ? h('section', { class: 'n-modal' }, slots.default?.()) : null
          },
        }),
        NButtonGroup: defineComponent({
          name: 'NButtonGroup',
          setup(_, { slots }) {
            return () => h('div', { class: 'n-button-group' }, slots.default?.())
          },
        }),
        NButton: defineComponent({
          name: 'NButton',
          props: ['type', 'secondary', 'size'],
          emits: ['click'],
          setup(_, { emit, slots }) {
            return () => h(
              'button',
              {
                type: 'button',
                class: 'n-button',
                onClick: (event: MouseEvent) => emit('click', event),
              },
              slots.default?.(),
            )
          },
        }),
        NSelect: defineComponent({
          name: 'NSelect',
          props: ['value', 'options', 'placeholder', 'filterable', 'size'],
          emits: ['update:value'],
          setup(props, { emit }) {
            return () => h(
              'select',
              {
                class: 'n-select',
                value: props.value as string,
                onChange: (event: Event) => emit('update:value', (event.target as HTMLSelectElement).value),
              },
              [
                h('option', { value: '' }, ''),
                ...((props.options as Array<{ label: string; value: string }> | undefined) ?? [])
                  .map((option) => h('option', { value: option.value }, option.label)),
              ],
            )
          },
        }),
        NSpace: defineComponent({
          name: 'NSpace',
          props: ['vertical', 'size'],
          setup(_, { slots }) {
            return () => h('div', { class: 'n-space' }, slots.default?.())
          },
        }),
        NAlert: defineComponent({
          name: 'NAlert',
          props: ['type', 'showIcon'],
          setup(_, { slots }) {
            return () => h('div', { class: 'n-alert' }, slots.default?.())
          },
        }),
        FavoritePanelShell: {
          template: '<div class="favorite-panel-shell"><slot name="toolbar" /><slot /></div>',
          props: ['surface', 'mode'],
        },
        FavoriteEditorForm: defineComponent({
          name: 'FavoriteEditorForm',
          props: {
            mode: String,
            favorite: Object,
            applyIncomingContentOnEdit: Boolean,
          },
          template: `
            <div
              class="favorite-editor-form"
              :data-mode="mode"
              :data-favorite-id="favorite?.id || ''"
              :data-apply-incoming-content-on-edit="String(applyIncomingContentOnEdit)"
            />
          `,
        }),
      },
    },
  })

  await flushPromises()
  return wrapper
}

const editor = (wrapper: ReturnType<typeof mount>) => wrapper.find('.favorite-editor-form')

const buttonByText = (wrapper: ReturnType<typeof mount>, text: string) => {
  const button = wrapper.findAll('button').find((item) => item.text().includes(text))
  if (!button) throw new Error(`Missing button: ${text}`)
  return button
}

describe('SaveFavoriteDialog', () => {
  it('defaults a bound source to update mode with the matched favorite selected', async () => {
    const wrapper = await mountDialog({
      candidateSource: {
        favoriteId: 'favorite-linked',
        assetId: 'asset-linked',
        versionId: 'version-linked',
      },
    })

    expect(editor(wrapper).attributes('data-mode')).toBe('edit')
    expect(editor(wrapper).attributes('data-favorite-id')).toBe('favorite-linked')
    expect(editor(wrapper).attributes('data-apply-incoming-content-on-edit')).toBe('true')
    expect(wrapper.find('.n-select').text()).toContain('Linked favorite')
  })

  it('defaults an unbound save to create mode and can switch to update mode', async () => {
    const wrapper = await mountDialog()

    expect(wrapper.find('.n-select').exists()).toBe(false)
    expect(editor(wrapper).attributes('data-mode')).toBe('save')

    await buttonByText(wrapper, 'Update existing').trigger('click')
    await flushPromises()

    expect(wrapper.find('.n-alert').exists()).toBe(true)
    expect(editor(wrapper).exists()).toBe(false)

    const select = wrapper.findComponent({ name: 'Select' })
    expect(select.exists()).toBe(true)
    select.vm.$emit('update:value', 'favorite-linked')
    await flushPromises()

    expect(editor(wrapper).attributes('data-mode')).toBe('edit')
    expect(editor(wrapper).attributes('data-favorite-id')).toBe('favorite-linked')
  })

  it('lets a bound save switch back to create-new mode without applying incoming content to an existing favorite', async () => {
    const wrapper = await mountDialog({
      candidateSource: {
        favoriteId: 'favorite-linked',
        assetId: 'asset-linked',
      },
    })

    await buttonByText(wrapper, 'Create new').trigger('click')
    await flushPromises()

    expect(wrapper.find('.n-select').exists()).toBe(false)
    expect(editor(wrapper).attributes('data-mode')).toBe('save')
    expect(editor(wrapper).attributes('data-favorite-id')).toBe('')
    expect(editor(wrapper).attributes('data-apply-incoming-content-on-edit')).toBe('false')
  })
})
