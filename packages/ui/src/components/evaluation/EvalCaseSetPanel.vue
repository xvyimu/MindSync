<template>
  <NDrawer
    :show="show"
    :width="480"
    placement="right"
    :on-update:show="handleUpdateShow"
    data-testid="eval-case-set-panel"
  >
    <NDrawerContent :title="t('evalCase.title')" closable>
      <NSpace vertical :size="16">
        <NAlert type="info" :bordered="false">
          {{ t('evalCase.hint') }}
        </NAlert>

        <NAlert
          v-if="error"
          type="error"
          :bordered="false"
          data-testid="eval-case-error"
        >
          {{ error }}
        </NAlert>

        <NCard size="small" :title="t('evalCase.addTitle')">
          <NSpace vertical :size="10">
            <NInput
              v-model:value="form.name"
              :placeholder="t('evalCase.fields.name')"
              data-testid="eval-case-name"
            />
            <NInput
              v-model:value="form.input"
              type="textarea"
              :rows="3"
              :placeholder="t('evalCase.fields.input')"
              data-testid="eval-case-input"
            />
            <NInput
              v-model:value="form.systemPrompt"
              type="textarea"
              :rows="2"
              :placeholder="t('evalCase.fields.systemPromptOptional')"
              data-testid="eval-case-system"
            />
            <NInput
              v-model:value="form.contains"
              :placeholder="t('evalCase.fields.contains')"
              data-testid="eval-case-contains"
            />
            <NButton
              type="primary"
              :disabled="!canAdd"
              :loading="isSaving"
              data-testid="eval-case-add"
              @click="handleAdd"
            >
              {{ editingId ? t('evalCase.update') : t('evalCase.add') }}
            </NButton>
          </NSpace>
        </NCard>

        <NCard size="small" :title="t('evalCase.listTitle', { count: cases.length })">
          <NEmpty v-if="cases.length === 0" :description="t('evalCase.empty')" />
          <NSpace v-else vertical :size="8">
            <div
              v-for="item in cases"
              :key="item.id"
              class="eval-case-row"
              :data-testid="`eval-case-row-${item.id}`"
            >
              <div class="eval-case-row__main">
                <NText strong>{{ item.name }}</NText>
                <NText depth="3" class="eval-case-row__meta">
                  {{ assertionLabel(item) }}
                </NText>
              </div>
              <NSpace :size="4">
                <NButton size="tiny" quaternary @click="handleEdit(item)">
                  {{ t('common.edit') }}
                </NButton>
                <NButton size="tiny" quaternary type="error" @click="handleRemove(item.id)">
                  {{ t('common.delete') }}
                </NButton>
              </NSpace>
            </div>
          </NSpace>
        </NCard>

        <NCard v-if="lastBundle" size="small" :title="t('evalCase.resultsTitle')">
          <NSpace vertical :size="8">
            <NText>
              {{
                t('evalCase.summary', {
                  total: lastBundle.summary.total,
                  passed: lastBundle.summary.passed,
                  failed: lastBundle.summary.failed,
                })
              }}
            </NText>
            <div
              v-for="r in lastBundle.results"
              :key="r.caseId"
              class="eval-result-row"
              :data-testid="`eval-result-${r.caseId}`"
            >
              <NTag size="small" :type="r.passed ? 'success' : 'error'" round>
                {{ r.passed ? t('evalCase.pass') : t('evalCase.fail') }}
              </NTag>
              <NText>{{ r.caseName }}</NText>
              <NText v-if="r.error" depth="3" type="error">{{ r.error }}</NText>
              <NText v-else depth="3" class="eval-result-preview">{{ r.outputPreview }}</NText>
            </div>
          </NSpace>
        </NCard>
      </NSpace>

      <template #footer>
        <NSpace justify="space-between" style="width: 100%">
          <NText depth="3">{{ t('evalCase.model', { model: modelKey || '—' }) }}</NText>
          <NSpace>
            <NButton
              v-if="isRunning"
              type="warning"
              data-testid="eval-case-cancel"
              @click="$emit('cancel')"
            >
              {{ t('common.cancel') }}
            </NButton>
            <NButton
              type="primary"
              :loading="isRunning"
              :disabled="!canRun"
              data-testid="eval-case-run"
              @click="$emit('run')"
            >
              {{ t('evalCase.runAll') }}
            </NButton>
            <NButton
              :disabled="!lastBundle"
              data-testid="eval-case-export"
              @click="$emit('export')"
            >
              {{ t('evalCase.export') }}
            </NButton>
            <NButton
              :disabled="cases.length === 0"
              data-testid="eval-case-export-promptfoo"
              @click="$emit('export-promptfoo')"
            >
              {{ t('evalCase.exportPromptfoo') }}
            </NButton>
          </NSpace>
        </NSpace>
      </template>
    </NDrawerContent>
  </NDrawer>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  NAlert,
  NButton,
  NCard,
  NDrawer,
  NDrawerContent,
  NEmpty,
  NInput,
  NSpace,
  NTag,
  NText,
} from 'naive-ui'
import type { EvalCase, EvalCaseSet, EvalEvidenceBundle } from '@mindsync/core'

const props = defineProps<{
  show: boolean
  caseSet: EvalCaseSet
  modelKey: string
  isRunning: boolean
  canRun: boolean
  lastBundle: EvalEvidenceBundle | null
  /** 编排层错误（保存失败 / 跑批失败等） */
  error?: string | null
  /** 保存中（父组件 await upsert 时） */
  isSaving?: boolean
  /**
   * 父组件在保存成功后递增；仅此时清空表单，
   * 避免「emit 后立刻清空」导致失败时表单丢失。
   */
  saveGeneration?: number
}>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'add', payload: { name: string; input: string; systemPrompt?: string; contains: string; id?: string }): void
  (e: 'remove', id: string): void
  (e: 'run'): void
  (e: 'cancel'): void
  (e: 'export'): void
  (e: 'export-promptfoo'): void
}>()

const { t } = useI18n()

const form = reactive({
  name: '',
  input: '',
  systemPrompt: '',
  contains: '',
})
const editingId = ref<string | undefined>(undefined)

const cases = computed(() => props.caseSet.cases)

const canAdd = computed(
  () =>
    form.name.trim().length > 0 &&
    form.input.trim().length > 0 &&
    form.contains.trim().length > 0 &&
    !props.isSaving,
)

const resetForm = () => {
  editingId.value = undefined
  form.name = ''
  form.input = ''
  form.systemPrompt = ''
  form.contains = ''
}

watch(
  () => props.show,
  (open) => {
    if (!open) {
      resetForm()
    }
  },
)

// 仅在父组件确认保存成功后清空（saveGeneration 递增）
watch(
  () => props.saveGeneration,
  (gen, prev) => {
    if (typeof gen === 'number' && typeof prev === 'number' && gen > prev) {
      resetForm()
    } else if (typeof gen === 'number' && prev === undefined && gen > 0) {
      resetForm()
    }
  },
)

const handleUpdateShow = (value: boolean) => {
  emit('update:show', value)
}

const assertionLabel = (item: EvalCase): string => {
  const a = item.assertions[0]
  if (!a) return ''
  return `${a.type}: ${a.value}`
}

const handleAdd = () => {
  if (!canAdd.value) return
  emit('add', {
    id: editingId.value,
    name: form.name.trim(),
    input: form.input.trim(),
    systemPrompt: form.systemPrompt.trim() || undefined,
    contains: form.contains.trim(),
  })
  // 不清空：等 saveGeneration 或关闭抽屉
}

const handleEdit = (item: EvalCase) => {
  editingId.value = item.id
  form.name = item.name
  form.input = item.input
  form.systemPrompt = item.systemPrompt || ''
  const contains = item.assertions.find((a) => a.type === 'contains')
  form.contains = contains?.value || ''
}

const handleRemove = (id: string) => {
  emit('remove', id)
}
</script>

<style scoped>
.eval-case-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid var(--n-border-color);
}
.eval-case-row__main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.eval-case-row__meta,
.eval-result-preview {
  font-size: 12px;
  word-break: break-word;
  white-space: pre-wrap;
}
.eval-result-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 4px 0;
  border-bottom: 1px solid var(--n-border-color);
}
</style>
