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
    NLayoutSider: defineComponent({
      name: 'NLayoutSider',
      setup(_, { slots, attrs }) {
        return () =>
          h(
            'aside',
            {
              'data-testid': (attrs['data-testid'] as string) || 'app-side-nav',
              class: 'n-layout-sider-stub',
            },
            slots.default?.(),
          )
      },
    }),
    NDivider: defineComponent({
      name: 'NDivider',
      setup() {
        return () => h('hr')
      },
    }),
  }
})

import AppSideNav from '../../../src/components/app-layout/AppSideNav.vue'

describe('AppSideNav (R2/R3)', () => {
  it('renders modes slot content inside the modes section', () => {
    const wrapper = mount(AppSideNav, {
      slots: {
        modes: () => h('div', { 'data-testid': 'core-nav' }, 'modes'),
      },
    })

    const modes = wrapper.get('[data-testid="app-side-nav-modes"]')
    expect(modes.find('[data-testid="core-nav"]').exists()).toBe(true)
    expect(modes.find('[data-testid="core-nav"]').text()).toBe('modes')
    expect(wrapper.get('[data-testid="app-side-nav-manage"]').exists()).toBe(true)
  })

  it('renders manage slot and passes collapsed prop', () => {
    const wrapper = mount(AppSideNav, {
      slots: {
        manage: (props: { collapsed: boolean }) =>
          h(
            'div',
            { 'data-testid': 'manage-slot', 'data-collapsed': String(props.collapsed) },
            'manage',
          ),
      },
    })

    const manage = wrapper.get('[data-testid="app-side-nav-manage"]')
    expect(manage.find('[data-testid="manage-slot"]').exists()).toBe(true)
    expect(manage.find('[data-testid="manage-slot"]').attributes('data-collapsed')).toBe(
      'false',
    )
  })

  it('shows placeholders when slots are empty', () => {
    const wrapper = mount(AppSideNav)
    expect(wrapper.get('[data-testid="app-side-nav-modes"]').text()).toContain(
      'nav.modesPlaceholder',
    )
    expect(wrapper.get('[data-testid="app-side-nav-manage"]').text()).toContain(
      'nav.managePlaceholder',
    )
  })
})
