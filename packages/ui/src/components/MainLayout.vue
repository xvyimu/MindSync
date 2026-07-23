<template>
  <!-- 使用ToastUI包装整个布局以提供NMessageProvider -->
  <ToastUI>
    <!--
      R0 redesign shell (feature flag, default OFF):
      Naive UI Admin skeleton = thin header + left sider + content.
      When flag is off, layout is byte-equivalent to pre-redesign (legacy path).
      Enable: localStorage ui:redesign-shell=1  or  ?redesignShell=1
    -->
    <NLayout
      class="main-layout-root"
      :has-sider="redesignShell"
      content-style="height: 100%; max-height: 100%; min-height: 0; overflow: hidden;"
    >
      <!-- ===== Redesign shell: sider + column (Naive UI Admin) ===== -->
      <template v-if="redesignShell">
        <!-- R2 modes + R3 manage live in the sider -->
        <AppSideNav>
          <template #modes>
            <slot name="core-nav"></slot>
          </template>
          <template #manage="manageSlot">
            <slot name="manage" v-bind="manageSlot"></slot>
          </template>
        </AppSideNav>
        <NLayout class="main-layout-column">
          <NLayoutHeader class="theme-header nav-header-enhanced nav-header-shell">
            <NFlex justify="space-between" align="center" class="w-full nav-content" :wrap="false" :size="[16, 8]">
              <NFlex align="center" :size="16" :wrap="false">
                <NButton text class="brand-link" @click="openBrandWebsite">
                  <NFlex align="center" :size="8" :wrap="false">
                    <AppPreviewImage
                      :src="logoSrc"
                      alt="Logo"
                      :width="logoSize"
                      :height="logoSize"
                      object-fit="cover"
                      class="logo-image"
                      :show-toolbar="false"
                      :preview-disabled="true"
                      :fallback-src="fallbackLogoSrc"
                    />
                    <NText class="text-lg sm:text-xl font-bold theme-title" tag="h2">
                      <slot name="title">{{ t('common.appName') }}</slot>
                    </NText>
                  </NFlex>
                </NButton>
                <!-- R2: modes moved to sider — no duplicate core-nav in shell header -->
              </NFlex>
              <NFlex align="center" :size="8" :wrap="true" justify="end" class="nav-actions">
                <slot name="actions"></slot>
              </NFlex>
            </NFlex>
          </NLayoutHeader>
          <NLayoutContent
            class="main-layout-content main-layout-content--shell"
            content-style="height: 100%; max-height: 100%; min-height: 0; box-sizing: border-box; padding: 24px 16px 32px; display: flex; flex-direction: column; align-items: stretch; overflow: hidden;"
          >
            <div class="main-content-wrapper">
              <slot name="main"></slot>
            </div>
          </NLayoutContent>
        </NLayout>
      </template>

      <!-- ===== Legacy shell: single header (default, flag OFF) ===== -->
      <NFlex
        v-else
        vertical
        class="main-layout-legacy"
      >
        <NLayoutHeader class="theme-header nav-header-enhanced">
          <NFlex justify="space-between" align="center" class="w-full nav-content" :wrap="false" :size="[16, 8]">
            <NFlex align="center" :size="16" :wrap="false">
              <NButton text class="brand-link" @click="openBrandWebsite">
                <NFlex align="center" :size="8" :wrap="false">
                  <AppPreviewImage
                    :src="logoSrc"
                    alt="Logo"
                    :width="logoSize"
                    :height="logoSize"
                    object-fit="cover"
                    class="logo-image"
                    :show-toolbar="false"
                    :preview-disabled="true"
                    :fallback-src="fallbackLogoSrc"
                  />
                  <NText class="text-lg sm:text-xl font-bold theme-title" tag="h2">
                    <slot name="title">{{ t('common.appName') }}</slot>
                  </NText>
                </NFlex>
              </NButton>
              <div class="core-navigation">
                <slot name="core-nav"></slot>
              </div>
            </NFlex>
            <NFlex align="center" :size="8" :wrap="true" justify="end" class="nav-actions">
              <slot name="actions"></slot>
            </NFlex>
          </NFlex>
        </NLayoutHeader>
        <NLayoutContent
          has-sider
          class="main-layout-content"
          content-style="height: 100%; max-height: 100%; min-height: 0; box-sizing: border-box; padding: 24px clamp(16px, 2vw, 32px) 32px; display: flex; flex-direction: column; align-items: stretch; overflow: hidden;"
        >
          <div class="main-content-wrapper">
            <slot name="main"></slot>
          </div>
        </NLayoutContent>
      </NFlex>

      <!-- 弹窗插槽 -->
      <slot name="modals"></slot>
    </NLayout>
  </ToastUI>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'

import { useI18n } from 'vue-i18n'
import { NButton, NLayout, NLayoutHeader, NLayoutContent, NFlex, NText } from 'naive-ui'
import ToastUI from './Toast.vue'
import logoImage from '../assets/logo.png'
import AppPreviewImage from './media/AppPreviewImage.vue'
import AppSideNav from './app-layout/AppSideNav.vue'
import { isRedesignShellEnabled } from '../config/redesign-shell'
import {
  applyGlassShellDocumentClass,
  isGlassShellEnabled,
} from '../config/glass-shell'
import { openExternalUrl } from '../utils/open-external-url'

const { t } = useI18n()

/** R0: Naive UI Admin shell behind flag (default false). */
const redesignShell = isRedesignShellEnabled()

/** Fluent glass atmosphere (default false) — modals/sider only. */
const glassShell = isGlassShellEnabled()

// Logo图片配置
const logoSrc = logoImage

// 创建简单的SVG fallback logo
const createFallbackSvg = () => {
  const svg = `data:image/svg+xml,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="6" fill="#3b82f6"/>
      <text x="16" y="21" text-anchor="middle" fill="white" font-family="system-ui" font-size="14" font-weight="bold">P</text>
    </svg>
  `)}`
  return svg
}

const fallbackLogoSrc = createFallbackSvg()

// 响应式Logo尺寸 - 使用更智能的检测
const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1024)

const updateWindowWidth = () => {
  windowWidth.value = window.innerWidth
}

onMounted(() => {
  applyGlassShellDocumentClass(glassShell)
  // Theme store may hydrate after first paint — re-sync light/dark glass tokens.
  if (glassShell && typeof window !== 'undefined') {
    window.setTimeout(() => {
      applyGlassShellDocumentClass(true)
    }, 0)
  }
  if (typeof window !== 'undefined') {
    windowWidth.value = window.innerWidth
    window.addEventListener('resize', updateWindowWidth)
  }
})

onUnmounted(() => {
  applyGlassShellDocumentClass(false)
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', updateWindowWidth)
  }
})

const logoSize = computed(() => {
  if (windowWidth.value < 480) {
    return 20 // 超小屏幕
  } else if (windowWidth.value < 640) {
    return 24 // 小屏幕
  }
  return 28 // 默认尺寸
})

const openBrandWebsite = async () => {
  await openExternalUrl('https://always200.com', { logPrefix: 'MainLayout' })
}
</script>

<style>
/* Root fills viewport (replaces previous inline fixed positioning). */
.main-layout-root {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  max-height: 100vh;
  overflow: hidden;
  display: flex;
  min-height: 0;
}

.main-layout-legacy {
  position: fixed;
  inset: 0;
  width: 100vw;
  max-height: 100vh;
  height: 100vh;
  min-height: 0;
}

.main-layout-column {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.main-layout-content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.main-content-wrapper {
  width: 100%;
  margin: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.main-content-wrapper > * {
  flex: 1;
  min-height: 0;
}

/* 增强导航栏样式 — spacing only 4/8/16/24/32 (R1 constitution) */
.nav-header-enhanced {
  min-height: 64px !important;
  padding: 8px 16px !important;
}

/* Shell header: slightly tighter vertical padding (token 8). */
.nav-header-shell {
  min-height: 56px !important;
  padding: 8px 16px !important;
}

/* Paper theme: flat hairline header, roomier horizontal padding (24). */
html[data-app-theme='paper'] .nav-header-enhanced {
  min-height: 56px !important;
  padding: 8px 24px !important;
  background: var(--paper-surface, var(--n-card-color));
  border-bottom: 1px solid var(--paper-rule, var(--n-border-color));
  box-shadow: none !important;
}

.nav-content {
  min-height: 40px;
}

.nav-actions {
  min-height: 40px;
}

.brand-link {
  align-items: center;
  padding: 4px 8px 4px 4px;
  border-radius: 8px;
  color: inherit;
  transition:
    background-color var(--paper-dur-med, 220ms) var(--paper-ease, ease-in-out),
    box-shadow var(--paper-dur-med, 220ms) var(--paper-ease, ease-in-out),
    transform var(--paper-dur-med, 220ms) var(--paper-ease, ease-in-out);
}

.brand-link:hover {
  background: color-mix(in srgb, var(--n-primary-color) 10%, transparent);
  transform: translateY(-1px);
}

.brand-link:hover .logo-image {
  transform: scale(1.05);
}

.brand-link:hover .theme-title {
  opacity: 0.88;
}

.brand-link:focus-visible {
  outline: none;
  background: color-mix(in srgb, var(--n-primary-color) 14%, transparent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--n-primary-color) 28%, transparent);
}

/* Logo样式优化 — button radius 4px */
.logo-image {
  border-radius: 4px;
  transition: transform var(--paper-dur-med, 220ms) var(--paper-ease, ease-in-out);
  flex-shrink: 0;
}

/* 标题文字对齐优化 */
.theme-title {
  line-height: 1.2 !important;
  margin: 0 !important;
  white-space: nowrap;
  transition: opacity 0.2s ease-in-out;
}

/* 核心导航样式 */
.core-navigation {
  display: flex;
  align-items: center;
  margin-left: 16px;
  padding-left: 16px;
  border-left: 1px solid var(--n-border-color);
  min-height: 32px;
}

/* 响应式优化 */
@media (max-width: 639px) {
  .logo-image {
    border-radius: 4px;
  }

  .core-navigation {
    margin-left: 8px;
    padding-left: 8px;
  }
}

.custom-select {
  -webkit-appearance: none !important;
  -moz-appearance: none !important;
  appearance: none !important;
  background-image: none !important;
}

.custom-select::-ms-expand {
  display: none;
}
</style>
