import { describe, expect, it } from 'vitest'
import {
  redesignDefaultLeftSplitPct,
  redesignDefaultTestCollapsed,
  resolveInitialTestCollapsed,
  workspaceCardClass,
} from '../../../src/composables/ui/useWorkspaceCardLayout'

describe('useWorkspaceCardLayout (R4)', () => {
  it('maps card roles to constitution class names', () => {
    expect(workspaceCardClass('primary')).toBe('workspace-card workspace-card--primary')
    expect(workspaceCardClass('secondary')).toBe('workspace-card workspace-card--secondary')
    expect(workspaceCardClass('support')).toBe('workspace-card workspace-card--support')
  })

  it('defaults redesign left split toward optimize column', () => {
    expect(redesignDefaultLeftSplitPct()).toBe(42)
  })

  it('defaults test pane collapsed only under redesign shell', () => {
    expect(redesignDefaultTestCollapsed()).toBe(true)
    expect(resolveInitialTestCollapsed(true)).toBe(true)
    expect(resolveInitialTestCollapsed(false)).toBe(false)
    expect(resolveInitialTestCollapsed(true, false)).toBe(false)
    expect(resolveInitialTestCollapsed(false, true)).toBe(true)
  })
})
