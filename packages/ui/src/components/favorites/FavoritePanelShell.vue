<template>
  <div
    class="favorite-panel-shell"
    :class="[
      `favorite-panel-shell--${surface}`,
      `favorite-panel-shell--${mode}`,
      { 'favorite-panel-shell--embedded': embedded },
    ]"
  >
    <div
      v-if="$slots.toolbar"
      class="favorite-panel-shell__toolbar"
    >
      <slot name="toolbar" />
    </div>

    <div class="favorite-panel-shell__body">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  surface?: 'drawer' | 'dialog' | 'pane'
  mode?: 'detail' | 'edit' | 'create' | 'save-target'
  embedded?: boolean
}>(), {
  surface: 'dialog',
  mode: 'detail',
  embedded: false,
})
</script>

<style scoped>
.favorite-panel-shell {
  display: flex;
  height: 100%;
  min-height: 0;
  flex-direction: column;
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--n-color) 94%, var(--n-primary-color) 6%) 0%,
      var(--n-color) 34%
    );
}

.favorite-panel-shell--dialog {
  height: min(78vh, 880px);
  min-height: 520px;
}

.favorite-panel-shell--drawer,
.favorite-panel-shell--pane {
  min-height: 0;
}

.favorite-panel-shell__toolbar {
  flex: none;
  border-bottom: 1px solid color-mix(in srgb, var(--n-border-color) 78%, transparent);
  background: color-mix(in srgb, var(--n-color) 92%, var(--n-primary-color) 8%);
  padding: 16px 16px;
}

.favorite-panel-shell__body {
  min-height: 0;
  flex: 1;
  padding: 16px;
}

.favorite-panel-shell--dialog.favorite-panel-shell--detail .favorite-panel-shell__body {
  overflow: hidden;
}

.favorite-panel-shell--edit .favorite-panel-shell__body,
.favorite-panel-shell--create .favorite-panel-shell__body,
.favorite-panel-shell--save-target .favorite-panel-shell__body {
  padding: 0;
}

.favorite-panel-shell--embedded {
  background: transparent;
}

.favorite-panel-shell--embedded .favorite-panel-shell__body {
  padding: 0;
}

@media (max-width: 767px) {
  .favorite-panel-shell--dialog {
    height: min(84vh, 920px);
    min-height: 480px;
  }

  .favorite-panel-shell__toolbar {
    padding: 8px 16px;
  }

  .favorite-panel-shell__body {
    padding: 16px;
  }
}
</style>
