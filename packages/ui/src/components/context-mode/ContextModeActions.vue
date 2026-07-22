<template>
  <NFlex align="center" :wrap="false" :size="8">
    <!-- 快捷操作按钮 -->
    <!-- 工具管理 -->
    <NButton
      size="small"
      type="default"
      @click="$emit('open-tool-manager')"
      :title="$t('contextMode.actions.tools')"
    >
      <template #icon>
        <span>🔧</span>
      </template>
      {{ $t('contextMode.actions.tools') }}
    </NButton>
  </NFlex>
</template>

<script setup lang="ts">
import { NButton, NFlex } from 'naive-ui'

const emit = defineEmits<{
  'open-tool-manager': []
}>()
</script>

<style scoped>
/* 确保按钮组在小屏幕上也能正常显示 */
</style>
