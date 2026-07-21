<template>
  <!--
    AppSideNav — redesign shell left rail (R0 skeleton).

    Naive UI Admin pattern:
    - Fixed sider, collapsible to icon rail
    - Upper: workspace modes (placeholder in R0)
    - Lower: management entries (placeholder in R0)

    R0: structure + chrome only. No navigation wiring (R2/R3).
    Flag-gated by parent MainLayout via isRedesignShellEnabled().
  -->
  <NLayoutSider
    bordered
    collapse-mode="width"
    :collapsed-width="64"
    :width="200"
    :collapsed="collapsed"
    show-trigger
    :native-scrollbar="false"
    class="app-side-nav"
    data-testid="app-side-nav"
    @collapse="collapsed = true"
    @expand="collapsed = false"
  >
    <div class="app-side-nav__body">
      <div class="app-side-nav__section" data-testid="app-side-nav-modes">
        <span v-if="!collapsed" class="app-side-nav__label">工作区</span>
        <span class="app-side-nav__placeholder">
          {{ collapsed ? '···' : '模式导航 · R2' }}
        </span>
      </div>

      <NDivider class="app-side-nav__divider" />

      <div class="app-side-nav__section" data-testid="app-side-nav-manage">
        <span v-if="!collapsed" class="app-side-nav__label">管理</span>
        <span class="app-side-nav__placeholder">
          {{ collapsed ? '···' : '管理入口 · R3' }}
        </span>
      </div>
    </div>
  </NLayoutSider>
</template>

<script setup lang="ts">
/**
 * Side navigation skeleton for redesign shell (R0).
 * Navigation behavior lands in R2 (modes) and R3 (management).
 * Placeholder copy is temporary Chinese; i18n lands with real nav items.
 */
import { ref } from 'vue'
import { NDivider, NLayoutSider } from 'naive-ui'

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
