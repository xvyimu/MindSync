/**
 * R4 workspace card layout helpers.
 * Used by Basic/Context workspaces under redesign shell for primary/secondary hierarchy.
 */

export type WorkspaceCardRole = 'primary' | 'secondary' | 'support'

/** CSS class for a workspace module card role (constitution card layout). */
export function workspaceCardClass(role: WorkspaceCardRole): string {
  return `workspace-card workspace-card--${role}`
}

/**
 * Default left split % when shell is on: give more room to the optimize column
 * (primary result focus). Legacy keeps session-persisted value.
 */
export function redesignDefaultLeftSplitPct(): number {
  return 42
}

/**
 * Whether the test column should start collapsed under redesign shell.
 * Primary path is optimize; test expands on demand (PostOptimize CTA / explicit expand).
 */
export function redesignDefaultTestCollapsed(): boolean {
  return true
}

/**
 * Resolve initial test collapsed state: redesign defaults collapsed unless user already
 * expanded this session (caller may override with persisted preference later).
 */
export function resolveInitialTestCollapsed(shellEnabled: boolean, sessionOverride?: boolean | null): boolean {
  if (typeof sessionOverride === 'boolean') return sessionOverride
  return shellEnabled ? redesignDefaultTestCollapsed() : false
}
