<template>
  <!--
    AppSideNav — redesign shell left rail.

    Naive UI Admin pattern:
    - Fixed sider, collapsible to icon rail
    - Upper: workspace modes (R2 — reuses core-nav slot / AppCoreNav)
    - Lower: management entries (placeholder until R3)

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
        <span class="app-side-nav__placeholder">
          {{ collapsed ? '···' : t('nav.managePlaceholder') }}
        </span>
      </div>
    </div>
  </NLayoutSider>
</template>

<script setup lang="ts">
/**
 * Side navigation for redesign shell.
 * R2: modes slot hosts AppCoreNav (same router logic as legacy header).
 * R3: management entries + drawer wiring.
 */
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { NDivider, NLayoutSider } from 'naive-ui'

const { t } = useI18n()
const collapsed = ref(false)
</script>

<style scoped>
/* Token-only: spacing 4/8/16/24/32 · type 12 · radius 8 · no ad-hoc colors */
.app-side-nav {
  background: var(--n-color, #ffffff);
}

.app-side-nav__body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px 8px;
  min-height: 100%;
  box-sizing: border-box;
}

.app-side-nav__section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0 8px;
}

.app-side-nav__label {
  font-size: 12px;
  line-height: 1.4;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--n-text-color-3, #94a3b8);
}

.app-side-nav__modes {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.app-side-nav__modes--collapsed {
  align-items: center;
}

/* Stack AppCoreNav (NSpace + mode selectors) vertically in the rail */
.app-side-nav__modes :deep([data-testid='core-nav']) {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
  flex-wrap: wrap;
}

.app-side-nav__modes :deep(.n-space) {
  display: flex !important;
  flex-direction: column !important;
  align-items: stretch !important;
  gap: 8px !important;
  flex-wrap: wrap !important;
}

.app-side-nav__modes :deep(.function-mode-selector),
.app-side-nav__modes :deep(.n-radio-group) {
  display: flex;
  flex-wrap: wrap;
  width: 100%;
}

.app-side-nav__modes :deep(.n-radio-button) {
  flex: 1 1 auto;
  justify-content: center;
}

.app-side-nav__placeholder {
  font-size: 12px;
  line-height: 1.6;
  padding: 8px;
  border-radius: 8px;
  border: 1px dashed var(--n-border-color, #e2e8f0);
  color: var(--n-text-color-3, #94a3b8);
  text-align: center;
}

.app-side-nav__divider {
  margin: 0 8px !important;
}
</style>
