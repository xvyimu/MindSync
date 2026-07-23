<template>
  <!--
    AppSideNav — redesign shell left rail.

    Naive UI Admin pattern:
    - Fixed sider, collapsible to icon rail
    - Upper: workspace modes (R2 — core-nav / AppCoreNav)
    - Lower: management entries (R3 — manage slot / AppManageNav)

    Flag-gated by parent MainLayout via isRedesignShellEnabled().
  -->
  <NLayoutSider
    bordered
    collapse-mode="width"
    :collapsed-width="64"
    :width="220"
    :collapsed="collapsed"
    show-trigger
    :native-scrollbar="false"
    class="app-side-nav"
    data-testid="app-side-nav"
    @collapse="collapsed = true"
    @expand="collapsed = false"
  >
    <div class="app-side-nav__body">
      <div
        class="app-side-nav__section app-side-nav__section--modes"
        data-testid="app-side-nav-modes"
      >
        <span v-if="!collapsed" class="app-side-nav__label">{{ t('nav.workspace') }}</span>
        <div class="app-side-nav__modes" :class="{ 'app-side-nav__modes--collapsed': collapsed }">
          <slot name="modes">
            <span class="app-side-nav__placeholder">
              {{ collapsed ? '···' : t('nav.modesPlaceholder') }}
            </span>
          </slot>
        </div>
      </div>

      <NDivider class="app-side-nav__divider" />

      <div class="app-side-nav__section" data-testid="app-side-nav-manage">
        <span v-if="!collapsed" class="app-side-nav__label">{{ t('nav.manage') }}</span>
        <div
          class="app-side-nav__manage"
          :class="{ 'app-side-nav__manage--collapsed': collapsed }"
        >
          <slot name="manage" :collapsed="collapsed">
            <span class="app-side-nav__placeholder">
              {{ collapsed ? '···' : t('nav.managePlaceholder') }}
            </span>
          </slot>
        </div>
      </div>
    </div>
  </NLayoutSider>
</template>

<script setup lang="ts">
/**
 * Side navigation for redesign shell.
 * R2: modes slot hosts AppCoreNav.
 * R3: manage slot hosts AppManageNav (slot props: collapsed).
 */
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { NDivider, NLayoutSider } from 'naive-ui'

const { t } = useI18n()
const collapsed = ref(false)
</script>

<style scoped>
/* Paper scale: 4/8/16/24/32 · radius 4/8 · no ad-hoc hex */
.app-side-nav {
  background: var(--n-color, #ffffff);
}

.app-side-nav__body {
  display: flex;
  flex-direction: column;
  gap: var(--paper-space-3, 16px);
  padding: var(--paper-space-3, 16px) var(--paper-space-2, 8px);
  min-height: 100%;
  box-sizing: border-box;
}

.app-side-nav__section {
  display: flex;
  flex-direction: column;
  gap: var(--paper-space-2, 8px);
  padding: 0 var(--paper-space-2, 8px);
  min-width: 0;
}

.app-side-nav__label {
  font-size: var(--paper-font-meta, 12px);
  line-height: 1.4;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-weight: 600;
  color: var(--n-text-color-3, #94a3b8);
  padding-inline: var(--paper-space-1, 4px);
}

.app-side-nav__modes,
.app-side-nav__manage {
  display: flex;
  flex-direction: column;
  gap: var(--paper-space-2, 8px);
  min-width: 0;
}

.app-side-nav__modes--collapsed,
.app-side-nav__manage--collapsed {
  align-items: center;
}

/* Stack AppCoreNav vertically in the rail */
.app-side-nav__modes :deep([data-testid='core-nav']) {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: var(--paper-space-2, 8px);
  flex-wrap: wrap;
  width: 100%;
}

.app-side-nav__modes :deep(.n-space) {
  display: flex !important;
  flex-direction: column !important;
  align-items: stretch !important;
  gap: var(--paper-space-2, 8px) !important;
  flex-wrap: wrap !important;
  width: 100%;
}

.app-side-nav__modes :deep(.function-mode-selector),
.app-side-nav__modes :deep(.n-radio-group) {
  display: flex;
  flex-direction: column;
  flex-wrap: nowrap;
  width: 100%;
  gap: var(--paper-space-1, 4px);
}

.app-side-nav__modes :deep(.n-radio-button) {
  flex: 0 0 auto;
  justify-content: flex-start;
  width: 100%;
  border-radius: var(--paper-radius-md, 8px) !important;
}

.app-side-nav__modes :deep(.n-radio-button .n-radio-button__state-border) {
  border-radius: var(--paper-radius-md, 8px) !important;
}

.app-side-nav__placeholder {
  font-size: var(--paper-font-meta, 12px);
  line-height: var(--paper-lh-body, 1.6);
  padding: var(--paper-space-2, 8px);
  border-radius: var(--paper-radius-md, 8px);
  border: 1px dashed var(--n-border-color, #e2e8f0);
  color: var(--n-text-color-3, #94a3b8);
  text-align: center;
}

.app-side-nav__divider {
  margin: 0 var(--paper-space-2, 8px) !important;
}

/* Manage entries: full-width click targets */
.app-side-nav__manage :deep(.n-button) {
  width: 100%;
  justify-content: flex-start;
  border-radius: var(--paper-radius-md, 8px);
}

.app-side-nav__manage--collapsed :deep(.n-button) {
  width: auto;
  justify-content: center;
}
</style>
