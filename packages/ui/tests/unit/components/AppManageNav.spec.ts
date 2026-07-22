import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('naive-ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('naive-ui')>()
  return {
    ...actual,
    NButton: defineComponent({
      name: 'NButton',
      props: ['type', 'title'],
      emits: ['click'],
      setup(props, { slots, attrs, emit }) {
        return () =>
          h(
            'button',
            {
              ...attrs,
              'data-type': props.type,
              title: props.title,
              onClick: () => emit('click'),
            },
            slots.default?.(),
          )
      },
    }),
    NBadge: defineComponent({
      name: 'NBadge',
      props: ['show'],
      setup(props, { slots }) {
        return () =>
          h(
            'span',
            { class: 'n-badge-stub', 'data-show': String(Boolean(props.show)) },
            slots.default?.(),
          )
      },
    }),
  }
})

import AppManageNav from '../../../src/components/app-layout/AppManageNav.vue'

describe('AppManageNav (R3)', () => {
  it('emits all six management actions', async () => {
    const wrapper = mount(AppManageNav, {
      props: {
        favoritesActive: false,
        backupReminderDue: false,
      },
    })

    await wrapper.get('[data-testid="side-nav-favorites"]').trigger('click')
    await wrapper.get('[data-testid="side-nav-templates"]').trigger('click')
    await wrapper.get('[data-testid="side-nav-history"]').trigger('click')
    await wrapper.get('[data-testid="side-nav-models"]').trigger('click')
    await wrapper.get('[data-testid="side-nav-data"]').trigger('click')
    await wrapper.get('[data-testid="side-nav-variables"]').trigger('click')

    expect(wrapper.emitted('open-favorites')).toHaveLength(1)
    expect(wrapper.emitted('open-templates')).toHaveLength(1)
    expect(wrapper.emitted('open-history')).toHaveLength(1)
    expect(wrapper.emitted('open-model-manager')).toHaveLength(1)
    expect(wrapper.emitted('open-data-manager')).toHaveLength(1)
    expect(wrapper.emitted('open-variables')).toHaveLength(1)
  })

  it('marks favorites active and data backup warning', () => {
    const wrapper = mount(AppManageNav, {
      props: {
        favoritesActive: true,
        backupReminderDue: true,
      },
    })

    expect(wrapper.get('[data-testid="side-nav-favorites"]').attributes('data-type')).toBe(
      'primary',
    )
    expect(wrapper.get('[data-testid="side-nav-data"]').attributes('data-type')).toBe('warning')
    expect(wrapper.find('.n-badge-stub[data-show="true"]').exists()).toBe(true)
  })

  it('hides text labels when collapsed', () => {
    const wrapper = mount(AppManageNav, {
      props: { collapsed: true },
    })
    expect(wrapper.find('.app-manage-nav__text').exists()).toBe(false)
    expect(wrapper.find('.app-manage-nav--collapsed').exists()).toBe(true)
  })
})
