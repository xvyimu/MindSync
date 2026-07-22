<template>
  <!--
    AppManageNav — redesign shell management rail (R3).

    Six management destinations, same emits as legacy AppHeaderActions.
    Modal/drawer openers stay in parent (PromptOptimizerApp); this is chrome only.
  -->
  <nav
    class="app-manage-nav"
    :class="{ 'app-manage-nav--collapsed': collapsed }"
    data-testid="app-side-nav-manage-list"
    aria-label="manage"
  >
    <NButton
      quaternary
      block
      class="app-manage-nav__item"
      :type="favoritesActive ? 'primary' : 'default'"
      :title="t('favorites.page.title')"
      :aria-current="favoritesActive ? 'page' : undefined"
      data-testid="side-nav-favorites"
      @click="emit('open-favorites')"
    >
      <span class="app-manage-nav__icon" aria-hidden="true">⭐</span>
      <span v-if="!collapsed" class="app-manage-nav__text">{{ t('nav.favorites') }}</span>
    </NButton>

    <NButton
      quaternary
      block
      class="app-manage-nav__item"
      data-testid="side-nav-templates"
      :title="t('nav.templates')"
      @click="emit('open-templates')"
    >
      <span class="app-manage-nav__icon" aria-hidden="true">📝</span>
      <span v-if="!collapsed" class="app-manage-nav__text">{{ t('nav.templates') }}</span>
    </NButton>

    <NButton
      quaternary
      block
      class="app-manage-nav__item"
      data-testid="side-nav-history"
      :title="t('nav.history')"
      @click="emit('open-history')"
    >
      <span class="app-manage-nav__icon" aria-hidden="true">📜</span>
      <span v-if="!collapsed" class="app-manage-nav__text">{{ t('nav.history') }}</span>
    </NButton>

    <NButton
      quaternary
      block
      class="app-manage-nav__item"
      data-testid="side-nav-models"
      :title="t('nav.modelManager')"
      @click="emit('open-model-manager')"
    >
      <span class="app-manage-nav__icon" aria-hidden="true">⚙️</span>
      <span v-if="!collapsed" class="app-manage-nav__text">{{ t('nav.modelManager') }}</span>
    </NButton>

    <NBadge :show="backupReminderDue" dot processing class="app-manage-nav__badge">
      <NButton
        quaternary
        block
        class="app-manage-nav__item"
        :type="backupReminderDue ? 'warning' : 'default'"
        data-testid="side-nav-data"
        :title="
          backupReminderDue ? t('dataManager.backupReminder.tooltip') : t('nav.dataManager')
        "
        @click="emit('open-data-manager')"
      >
        <span class="app-manage-nav__icon" aria-hidden="true">💾</span>
        <span v-if="!collapsed" class="app-manage-nav__text">{{ t('nav.dataManager') }}</span>
      </NButton>
    </NBadge>

    <NButton
      quaternary
      block
      class="app-manage-nav__item"
      data-testid="side-nav-variables"
      :title="t('nav.variableManager')"
      @click="emit('open-variables')"
    >
      <span class="app-manage-nav__icon" aria-hidden="true">🔣</span>
      <span v-if="!collapsed" class="app-manage-nav__text">{{ t('nav.variableManager') }}</span>
    </NButton>
  </nav>
</template>

<script setup lang="ts">
/**
 * Side-rail management entries for redesign shell (R3).
 * Opens existing modal/drawer surfaces via parent handlers (modal fallback OK).
 */
import { useI18n } from 'vue-i18n'
import { NBadge, NButton } from 'naive-ui'

withDefaults(
  defineProps<{
    collapsed?: boolean
    favoritesActive?: boolean
    backupReminderDue?: boolean
  }>(),
  {
    collapsed: false,
    favoritesActive: false,
    backupReminderDue: false,
  },
)

const emit = defineEmits<{
  'open-templates': []
  'open-history': []
  'open-model-manager': []
  'open-favorites': []
  'open-data-manager': []
  'open-variables': []
}>()

const { t } = useI18n()
</script>

<style scoped>
/* Token-only: gap 4/8 · radius 4 (button) · type 12/14 */
.app-manage-nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  min-width: 0;
}

.app-manage-nav--collapsed {
  align-items: center;
}

.app-manage-nav__item {
  justify-content: flex-start;
  gap: 8px;
  padding: 8px;
  height: auto;
  border-radius: 4px;
}

.app-manage-nav--collapsed .app-manage-nav__item {
  justify-content: center;
  width: 40px;
  min-width: 40px;
  padding: 8px 4px;
}

.app-manage-nav__icon {
  font-size: 14px;
  line-height: 1;
  flex-shrink: 0;
}

.app-manage-nav__text {
  font-size: 14px;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
}

.app-manage-nav__badge {
  width: 100%;
}

.app-manage-nav__badge :deep(.n-badge-sup) {
  z-index: 1;
}

.app-manage-nav--collapsed .app-manage-nav__badge {
  width: auto;
}
</style>
