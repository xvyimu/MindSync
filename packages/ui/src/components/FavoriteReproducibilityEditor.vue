<template>
  <component
    :is="surfaceComponent"
    v-bind="surfaceProps"
    class="favorite-reproducibility-editor"
    :class="{ 'favorite-reproducibility-editor--embedded': embedded }"
  >
    <NSpace vertical :size="8">
      <NText v-if="showHint" depth="3">
        {{ t('favorites.dialog.reproducibility.hint') }}
      </NText>

      <template v-if="showVariables || showExamples">
        <section v-if="showVariables" class="favorite-reproducibility-editor__section">
          <div
            class="favorite-reproducibility-editor__section-header"
            :class="{ 'favorite-reproducibility-editor__section-header--actions-only': !showSectionHeadings }"
          >
            <NText v-if="showSectionHeadings" strong>{{ t('favorites.dialog.reproducibility.variables') }}</NText>
            <NButton
              v-if="!isReadonly"
              data-testid="favorite-repro-add-variable"
              size="small"
              secondary
              @click="handleAddVariable"
            >
              {{ t('favorites.dialog.reproducibility.addVariable') }}
            </NButton>
          </div>

          <NEmpty
            v-if="variables.length === 0"
            size="small"
            :description="t('favorites.dialog.reproducibility.noVariables')"
          />

          <NSpace v-else vertical :size="8">
            <div
              v-for="(variable, index) in variables"
              :key="`${index}-${variable.name}`"
              class="favorite-reproducibility-editor__item"
            >
              <NGrid cols="1 s:2 m:3" :x-gap="10" :y-gap="8" responsive="screen">
                <NGridItem>
                  <NInput
                    data-testid="favorite-repro-variable-name"
                    :value="variable.name"
                    :placeholder="t('favorites.dialog.reproducibility.variableNamePlaceholder')"
                    :readonly="isReadonly"
                    @update:value="updateVariable(index, { name: $event })"
                  />
                </NGridItem>
                <NGridItem>
                  <NInput
                    data-testid="favorite-repro-variable-default"
                    :value="variable.defaultValue"
                    :placeholder="t('favorites.dialog.reproducibility.variableDefaultPlaceholder')"
                    :readonly="isReadonly"
                    @update:value="updateVariable(index, { defaultValue: $event })"
                  />
                </NGridItem>
                <NGridItem>
                  <NSelect
                    data-testid="favorite-repro-variable-type"
                    :value="variable.type"
                    clearable
                    :options="variableTypeOptions"
                    :placeholder="t('favorites.dialog.reproducibility.variableTypePlaceholder')"
                    :disabled="isReadonly"
                    @update:value="updateVariable(index, { type: $event || undefined })"
                  />
                </NGridItem>
                <NGridItem>
                  <NInput
                    data-testid="favorite-repro-variable-options"
                    :value="formatOptions(variable.options)"
                    :placeholder="t('favorites.dialog.reproducibility.variableOptionsPlaceholder')"
                    :readonly="isReadonly"
                    @update:value="updateVariable(index, { options: parseListText($event) })"
                  />
                </NGridItem>
                <NGridItem>
                  <NInput
                    data-testid="favorite-repro-variable-description"
                    :value="variable.description"
                    :placeholder="t('favorites.dialog.reproducibility.variableDescriptionPlaceholder')"
                    :readonly="isReadonly"
                    @update:value="updateVariable(index, { description: $event })"
                  />
                </NGridItem>
              </NGrid>

              <div v-if="!isReadonly" class="favorite-reproducibility-editor__item-actions">
                <NCheckbox
                  data-testid="favorite-repro-variable-required"
                  :checked="variable.required"
                  @update:checked="updateVariable(index, { required: Boolean($event) })"
                >
                  {{ t('favorites.dialog.reproducibility.required') }}
                </NCheckbox>
                <NButton
                  data-testid="favorite-repro-remove-variable"
                  size="small"
                  quaternary
                  type="error"
                  @click="handleRemoveVariable(index)"
                >
                  {{ t('favorites.dialog.reproducibility.remove') }}
                </NButton>
              </div>
            </div>
          </NSpace>
        </section>

        <section v-if="showExamples" class="favorite-reproducibility-editor__section">
          <div
            class="favorite-reproducibility-editor__section-header"
            :class="{ 'favorite-reproducibility-editor__section-header--actions-only': !showSectionHeadings }"
          >
            <NText v-if="showSectionHeadings" strong>{{ t('favorites.dialog.reproducibility.examples') }}</NText>
            <NButton
              v-if="!isReadonly"
              data-testid="favorite-repro-add-example"
              size="small"
              secondary
              @click="handleAddExample"
            >
              {{ t('favorites.dialog.reproducibility.addExample') }}
            </NButton>
          </div>

          <NEmpty
            v-if="examples.length === 0"
            size="small"
            :description="t('favorites.dialog.reproducibility.noExamples')"
          />

          <NSpace v-else vertical :size="8">
            <div
              v-for="(example, index) in examples"
              :key="`${index}-${example.id || example.text || 'example'}`"
              class="favorite-reproducibility-editor__item favorite-reproducibility-editor__example"
              :class="{
                'favorite-reproducibility-editor__example--added': isAddedExample(example),
                'favorite-reproducibility-editor__example--editing': isExampleEditing(example, index),
              }"
            >
              <div class="favorite-reproducibility-editor__example-header">
                <NSpace :size="6" align="center" wrap>
                  <NText strong>
                    {{ getExampleLabel(index) }}
                  </NText>
                  <NTag v-if="isAddedExample(example)" size="small" type="warning" :bordered="false">
                    {{ t('favorites.dialog.reproducibility.newExample') }}
                  </NTag>
                  <NTag v-if="isExampleEditing(example, index)" size="small" type="info" :bordered="false">
                    {{ t('favorites.dialog.reproducibility.editingExample') }}
                  </NTag>
                </NSpace>
                <NSpace v-if="!isReadonly" :size="4" align="center">
                  <NButton
                    v-if="!isExampleEditing(example, index)"
                    data-testid="favorite-repro-edit-example"
                    size="small"
                    secondary
                    @click="handleEditExample(example, index)"
                  >
                    {{ t('favorites.dialog.reproducibility.editExample') }}
                  </NButton>
                  <NButton
                    v-else-if="!isAddedExample(example) && panelMode === 'review'"
                    data-testid="favorite-repro-done-example"
                    size="small"
                    secondary
                    @click="handleDoneExample(example, index)"
                  >
                    {{ t('favorites.dialog.reproducibility.doneEditing') }}
                  </NButton>
                  <NButton
                    data-testid="favorite-repro-remove-example"
                    size="small"
                    quaternary
                    type="error"
                    @click="handleRemoveExample(index)"
                  >
                    {{ t('favorites.dialog.reproducibility.remove') }}
                  </NButton>
                </NSpace>
              </div>

              <div
                v-if="!isExampleEditing(example, index)"
                class="favorite-reproducibility-editor__example-summary"
              >
                <NText v-if="example.text" class="favorite-reproducibility-editor__example-summary-text">
                  {{ example.text }}
                </NText>
                <NText
                  v-if="example.description"
                  depth="3"
                  class="favorite-reproducibility-editor__example-summary-text"
                >
                  {{ example.description }}
                </NText>
                <NSpace :size="[6, 6]" align="center" wrap>
                  <NTag
                    v-for="[parameterKey, parameterValue] in getParameterEntries(example.parameters)"
                    :key="parameterKey"
                    size="small"
                    :bordered="false"
                  >
                    {{ parameterKey }}: {{ parameterValue }}
                  </NTag>
                  <NTag
                    v-if="getExampleImageItems(index, 'images', example).length > 0"
                    size="small"
                    type="success"
                    :bordered="false"
                  >
                    {{ t('favorites.dialog.reproducibility.outputImageCount', { count: getExampleImageItems(index, 'images', example).length }) }}
                  </NTag>
                  <NTag
                    v-if="getExampleImageItems(index, 'inputImages', example).length > 0"
                    size="small"
                    type="success"
                    :bordered="false"
                  >
                    {{ t('favorites.dialog.reproducibility.inputImageCount', { count: getExampleImageItems(index, 'inputImages', example).length }) }}
                  </NTag>
                </NSpace>
                <NText
                  v-if="example.outputText"
                  depth="3"
                  class="favorite-reproducibility-editor__example-summary-output"
                >
                  {{ example.outputText }}
                </NText>
                <div
                  v-if="getExampleImageItems(index, 'images', example).length > 0"
                  class="favorite-reproducibility-editor__summary-media"
                >
                  <NText strong>{{ t('favorites.dialog.reproducibility.exampleImages') }}</NText>
                  <AppPreviewImageGroup>
                    <div class="favorite-reproducibility-editor__summary-image-grid">
                      <AppPreviewImage
                        v-for="item in getExampleImageItems(index, 'images', example)"
                        :key="item.key"
                        :src="item.source"
                        :alt="t('favorites.dialog.imageAlt', { index: item.displayIndex + 1 })"
                        object-fit="cover"
                        class="favorite-reproducibility-editor__summary-image"
                      />
                    </div>
                  </AppPreviewImageGroup>
                </div>
                <div
                  v-if="getExampleImageItems(index, 'inputImages', example).length > 0"
                  class="favorite-reproducibility-editor__summary-media"
                >
                  <NText strong>{{ t('favorites.dialog.reproducibility.exampleInputImages') }}</NText>
                  <AppPreviewImageGroup>
                    <div class="favorite-reproducibility-editor__summary-image-grid">
                      <AppPreviewImage
                        v-for="item in getExampleImageItems(index, 'inputImages', example)"
                        :key="item.key"
                        :src="item.source"
                        :alt="t('favorites.dialog.imageAlt', { index: item.displayIndex + 1 })"
                        object-fit="cover"
                        class="favorite-reproducibility-editor__summary-image"
                      />
                    </div>
                  </AppPreviewImageGroup>
                </div>
              </div>

              <template v-else>
              <div class="favorite-reproducibility-editor__example-basic">
                <div>
                  <NInput
                    data-testid="favorite-repro-example-id"
                    :value="example.id"
                    :placeholder="t('favorites.dialog.reproducibility.exampleIdPlaceholder')"
                    @update:value="updateExample(index, { id: $event })"
                  />
                </div>
                <div>
                  <NInput
                    data-testid="favorite-repro-example-text"
                    :value="example.text"
                    :placeholder="t('favorites.dialog.reproducibility.exampleTextPlaceholder')"
                    @update:value="updateExample(index, { text: $event })"
                  />
                </div>
                <div class="favorite-reproducibility-editor__example-description">
                  <NInput
                    data-testid="favorite-repro-example-description"
                    :value="example.description"
                    :placeholder="t('favorites.dialog.reproducibility.exampleDescriptionPlaceholder')"
                    @update:value="updateExample(index, { description: $event })"
                  />
                </div>
                <div class="favorite-reproducibility-editor__example-output-field">
                  <NText strong>{{ t('favorites.dialog.reproducibility.outputText') }}</NText>
                  <NInput
                    data-testid="favorite-repro-example-output-text"
                    type="textarea"
                    :autosize="{ minRows: 2, maxRows: 8 }"
                    :value="example.outputText"
                    :placeholder="t('favorites.dialog.reproducibility.outputText')"
                    @update:value="updateExample(index, { outputText: $event })"
                  />
                </div>
              </div>

              <div class="favorite-reproducibility-editor__example-section">
                <div class="favorite-reproducibility-editor__message-field">
                  <div class="favorite-reproducibility-editor__section-header">
                    <NText strong>{{ t('favorites.dialog.reproducibility.messages') }}</NText>
                    <NButton
                      data-testid="favorite-repro-example-add-message"
                      size="small"
                      secondary
                      @click="handleAddExampleMessage(index)"
                    >
                      {{ t('favorites.dialog.reproducibility.addMessage') }}
                    </NButton>
                  </div>
                  <NEmpty
                    v-if="!example.messages || example.messages.length === 0"
                    size="small"
                    :description="t('favorites.dialog.reproducibility.noMessages')"
                  />
                  <NSpace v-else vertical :size="6">
                    <div
                      v-for="(message, messageIndex) in example.messages"
                      :key="message.id || `${message.role}-${messageIndex}`"
                      class="favorite-reproducibility-editor__message-row"
                    >
                      <NSelect
                        data-testid="favorite-repro-example-message-role"
                        :value="message.role"
                        :options="messageRoleOptions"
                        @update:value="handleUpdateExampleMessage(index, messageIndex, { role: normalizeMessageRole($event) })"
                      />
                      <NInput
                        data-testid="favorite-repro-example-message-content"
                        type="textarea"
                        :autosize="{ minRows: 2, maxRows: 6 }"
                        :value="message.content"
                        :placeholder="t('favorites.dialog.reproducibility.messageContentPlaceholder')"
                        @update:value="handleUpdateExampleMessage(index, messageIndex, { content: $event })"
                      />
                      <NButton
                        data-testid="favorite-repro-example-remove-message"
                        size="small"
                        quaternary
                        type="error"
                        @click="handleRemoveExampleMessage(index, messageIndex)"
                      >
                        {{ t('favorites.dialog.reproducibility.remove') }}
                      </NButton>
                    </div>
                  </NSpace>
                </div>
              </div>

              <div class="favorite-reproducibility-editor__example-section">
                <div class="favorite-reproducibility-editor__parameter-field">
                  <NText strong>{{ t('favorites.dialog.reproducibility.exampleParametersLabel') }}</NText>
                  <NSpace
                    v-if="getParameterEntries(example.parameters).length > 0"
                    vertical
                    :size="6"
                  >
                    <div
                      v-for="[parameterKey, parameterValue] in getParameterEntries(example.parameters)"
                      :key="parameterKey"
                      class="favorite-reproducibility-editor__parameter-row"
                    >
                      <NText class="favorite-reproducibility-editor__parameter-key">
                        {{ parameterKey }}
                      </NText>
                      <NInput
                        data-testid="favorite-repro-example-parameter-value"
                        :value="parameterValue"
                        :placeholder="t('favorites.dialog.reproducibility.parameterValuePlaceholder')"
                        @update:value="handleUpdateExampleParameterValue(index, parameterKey, $event)"
                      />
                      <NButton
                        data-testid="favorite-repro-example-remove-parameter"
                        size="small"
                        quaternary
                        type="error"
                        @click="handleRemoveExampleParameter(index, parameterKey)"
                      >
                        {{ t('favorites.dialog.reproducibility.remove') }}
                      </NButton>
                    </div>
                  </NSpace>
                  <div class="favorite-reproducibility-editor__parameter-row">
                    <NInput
                      data-testid="favorite-repro-example-parameter-key"
                      :value="getParameterDraft(index).key"
                      :placeholder="t('favorites.dialog.reproducibility.parameterNamePlaceholder')"
                      @update:value="setParameterDraft(index, 'key', $event)"
                    />
                    <NInput
                      data-testid="favorite-repro-example-parameter-new-value"
                      :value="getParameterDraft(index).value"
                      :placeholder="t('favorites.dialog.reproducibility.parameterValuePlaceholder')"
                      @update:value="setParameterDraft(index, 'value', $event)"
                      @keydown.enter.prevent="handleAddExampleParameter(index)"
                    />
                    <NButton
                      data-testid="favorite-repro-example-add-parameter"
                      size="small"
                      secondary
                      @click="handleAddExampleParameter(index)"
                    >
                      {{ t('favorites.dialog.reproducibility.addParameter') }}
                    </NButton>
                  </div>
                </div>
              </div>

              <div class="favorite-reproducibility-editor__example-media-grid">
                <div class="favorite-reproducibility-editor__image-field">
                  <NText strong>{{ t('favorites.dialog.reproducibility.exampleImages') }}</NText>
                  <NSpace :size="6" align="center" wrap class="favorite-reproducibility-editor__image-toolbar">
                    <NInput
                      data-testid="favorite-repro-example-images"
                      :value="getImageUrlDraft(index, 'images')"
                      :placeholder="t('favorites.dialog.reproducibility.exampleImagesPlaceholder')"
                      @update:value="setImageUrlDraft(index, 'images', $event)"
                      @keydown.enter.prevent="handleAddExampleImageUrl(index, 'images')"
                    />
                    <NButton
                      data-testid="favorite-repro-example-add-image-url"
                      size="small"
                      secondary
                      class="favorite-reproducibility-editor__image-action"
                      @click="handleAddExampleImageUrl(index, 'images')"
                    >
                      {{ t('favorites.dialog.reproducibility.addImageUrl') }}
                    </NButton>
                  </NSpace>
                  <NUpload
                    data-testid="favorite-repro-example-image-upload"
                    accept="image/*"
                    multiple
                    :default-upload="false"
                    :show-file-list="false"
                    @before-upload="(options) => handleBeforeExampleImageUpload(index, 'images', options)"
                  >
                    <NButton
                      data-testid="favorite-repro-example-add-images"
                      size="small"
                      secondary
                      class="favorite-reproducibility-editor__image-action"
                    >
                      {{ t('favorites.dialog.reproducibility.addExampleImages') }}
                    </NButton>
                  </NUpload>
                  <AppPreviewImageGroup v-if="getExampleImageItems(index, 'images', example).length > 0">
                    <div class="favorite-reproducibility-editor__image-grid">
                      <div
                        v-for="item in getExampleImageItems(index, 'images', example)"
                        :key="item.key"
                        class="favorite-reproducibility-editor__image-item"
                      >
                        <AppPreviewImage
                          :src="item.source"
                          :alt="t('favorites.dialog.imageAlt', { index: item.displayIndex + 1 })"
                          object-fit="cover"
                          class="favorite-reproducibility-editor__image"
                        />
                        <NButton
                          data-testid="favorite-repro-example-add-image-to-media"
                          size="tiny"
                          secondary
                          class="favorite-reproducibility-editor__image-add-media"
                          @click="handleAddExampleImageToMedia(index, 'images', item)"
                        >
                          {{ t('favorites.dialog.reproducibility.addImageToMedia') }}
                        </NButton>
                        <NButton
                          data-testid="favorite-repro-example-remove-image"
                          size="tiny"
                          type="error"
                          quaternary
                          class="favorite-reproducibility-editor__image-remove"
                          @click="handleRemoveExampleImage(index, 'images', item)"
                        >
                          ×
                        </NButton>
                      </div>
                    </div>
                  </AppPreviewImageGroup>
                </div>

                <div class="favorite-reproducibility-editor__image-field">
                  <NText strong>{{ t('favorites.dialog.reproducibility.exampleInputImages') }}</NText>
                  <NSpace :size="6" align="center" wrap class="favorite-reproducibility-editor__image-toolbar">
                    <NInput
                      data-testid="favorite-repro-example-input-images"
                      :value="getImageUrlDraft(index, 'inputImages')"
                      :placeholder="t('favorites.dialog.reproducibility.exampleInputImagesPlaceholder')"
                      @update:value="setImageUrlDraft(index, 'inputImages', $event)"
                      @keydown.enter.prevent="handleAddExampleImageUrl(index, 'inputImages')"
                    />
                    <NButton
                      data-testid="favorite-repro-example-add-input-image-url"
                      size="small"
                      secondary
                      class="favorite-reproducibility-editor__image-action"
                      @click="handleAddExampleImageUrl(index, 'inputImages')"
                    >
                      {{ t('favorites.dialog.reproducibility.addImageUrl') }}
                    </NButton>
                  </NSpace>
                  <NUpload
                    data-testid="favorite-repro-example-input-image-upload"
                    accept="image/*"
                    multiple
                    :default-upload="false"
                    :show-file-list="false"
                    @before-upload="(options) => handleBeforeExampleImageUpload(index, 'inputImages', options)"
                  >
                    <NButton
                      data-testid="favorite-repro-example-add-input-images"
                      size="small"
                      secondary
                      class="favorite-reproducibility-editor__image-action"
                    >
                      {{ t('favorites.dialog.reproducibility.addExampleInputImages') }}
                    </NButton>
                  </NUpload>
                  <AppPreviewImageGroup v-if="getExampleImageItems(index, 'inputImages', example).length > 0">
                    <div class="favorite-reproducibility-editor__image-grid">
                      <div
                        v-for="item in getExampleImageItems(index, 'inputImages', example)"
                        :key="item.key"
                        class="favorite-reproducibility-editor__image-item"
                      >
                        <AppPreviewImage
                          :src="item.source"
                          :alt="t('favorites.dialog.imageAlt', { index: item.displayIndex + 1 })"
                          object-fit="cover"
                          class="favorite-reproducibility-editor__image"
                        />
                        <NButton
                          data-testid="favorite-repro-example-add-input-image-to-media"
                          size="tiny"
                          secondary
                          class="favorite-reproducibility-editor__image-add-media"
                          @click="handleAddExampleImageToMedia(index, 'inputImages', item)"
                        >
                          {{ t('favorites.dialog.reproducibility.addImageToMedia') }}
                        </NButton>
                        <NButton
                          data-testid="favorite-repro-example-remove-input-image"
                          size="tiny"
                          type="error"
                          quaternary
                          class="favorite-reproducibility-editor__image-remove"
                          @click="handleRemoveExampleImage(index, 'inputImages', item)"
                        >
                          ×
                        </NButton>
                      </div>
                    </div>
                  </AppPreviewImageGroup>
                </div>
              </div>
              </template>
            </div>
          </NSpace>
        </section>
      </template>
    </NSpace>
  </component>
</template>

<script setup lang="ts">
import {
  NButton,
  NCard,
  NCheckbox,
  NEmpty,
  NGrid,
  NGridItem,
  NInput,
  NSelect,
  NSpace,
  NTag,
  NText,
  NUpload,
  type UploadFileInfo,
} from 'naive-ui'
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import type {
  FavoriteReproducibilityExample,
  FavoriteReproducibilityVariable,
} from '../utils/favorite-reproducibility'
import AppPreviewImage from './media/AppPreviewImage.vue'
import AppPreviewImageGroup from './media/AppPreviewImageGroup.vue'

type FavoriteReproducibilityImagePreview = {
  assetId: string
  source: string
}

type FavoriteReproducibilityExamplePreviews = {
  images: FavoriteReproducibilityImagePreview[]
  inputImages: FavoriteReproducibilityImagePreview[]
}

type ExampleImageField = 'images' | 'inputImages'
type ExampleAssetField = 'imageAssetIds' | 'inputImageAssetIds'
type PanelMode = 'edit' | 'review' | 'readonly'
type ExampleMessage = NonNullable<FavoriteReproducibilityExample['messages']>[number]
type ExampleMessageRole = ExampleMessage['role']
type ExampleImageItem = {
  key: string
  source: string
  displayIndex: number
  kind: 'source' | 'asset'
  sourceIndex?: number
  assetId?: string
}

const props = withDefaults(defineProps<{
  variables: FavoriteReproducibilityVariable[]
  examples: FavoriteReproducibilityExample[]
  examplePreviews?: FavoriteReproducibilityExamplePreviews[]
  panelMode?: PanelMode
  addedExampleIds?: string[]
  embedded?: boolean
  showVariables?: boolean
  showExamples?: boolean
  showHint?: boolean
  showSectionHeadings?: boolean
}>(), {
  examplePreviews: undefined,
  panelMode: 'edit',
  addedExampleIds: () => [],
  embedded: false,
  showVariables: true,
  showExamples: true,
  showHint: true,
  showSectionHeadings: true,
})

const emit = defineEmits<{
  'update:variables': [variables: FavoriteReproducibilityVariable[]]
  'update:examples': [examples: FavoriteReproducibilityExample[]]
  'add-image-to-media': [payload: {
    exampleIndex: number
    field: ExampleImageField
    source: string
    assetId?: string
  }]
}>()

const { t } = useI18n()

const variableTypeOptions = computed(() => [
  { label: t('favorites.dialog.reproducibility.variableType.string'), value: 'string' },
  { label: t('favorites.dialog.reproducibility.variableType.number'), value: 'number' },
  { label: t('favorites.dialog.reproducibility.variableType.boolean'), value: 'boolean' },
  { label: t('favorites.dialog.reproducibility.variableType.enum'), value: 'enum' },
])

const messageRoleOptions = computed(() => [
  { label: t('favorites.dialog.reproducibility.messageRole.system'), value: 'system' },
  { label: t('favorites.dialog.reproducibility.messageRole.user'), value: 'user' },
  { label: t('favorites.dialog.reproducibility.messageRole.assistant'), value: 'assistant' },
  { label: t('favorites.dialog.reproducibility.messageRole.tool'), value: 'tool' },
])

const surfaceComponent = computed(() => props.embedded ? 'div' : NCard)
const surfaceProps = computed(() => props.embedded
  ? {}
  : {
      size: 'small',
      title: t('favorites.dialog.reproducibility.title'),
      segmented: { content: true },
    })
const panelMode = computed(() => props.panelMode)
const isReadonly = computed(() => props.panelMode === 'readonly')
const addedExampleIdSet = computed(() => new Set(props.addedExampleIds))

let uploadSequence = 0
let exampleKeySequence = 0
let lastEmittedExamples: FavoriteReproducibilityExample[] | null = null
const exampleDraftKeys = ref<string[]>([])
const editingExampleIdentities = ref<Set<string>>(new Set())
const imageUrlDrafts = reactive<Record<string, string>>({})
const parameterDrafts = reactive<Record<number, { key: string; value: string }>>({})

const formatOptions = (items: string[] | undefined) => (items || []).join(', ')
const dedupeStrings = (items: string[]) => Array.from(new Set(items.filter(Boolean)))
const assetFieldByImageField: Record<ExampleImageField, ExampleAssetField> = {
  images: 'imageAssetIds',
  inputImages: 'inputImageAssetIds',
}

const parseListText = (value: string): string[] => {
  return String(value || '')
    .split(/[\n,]/u)
    .map((item) => item.trim())
    .filter(Boolean)
}

const getParameterEntries = (parameters: Record<string, string> | undefined) =>
  Object.entries(parameters || {})

const getExampleIdentity = (example: FavoriteReproducibilityExample, index: number) =>
  exampleDraftKeys.value[index] || example.id || `example-${index}`

const getExampleLabel = (index: number) =>
  t('favorites.dialog.reproducibility.exampleLabel', { index: index + 1 })

const isAddedExample = (example: FavoriteReproducibilityExample) =>
  Boolean(example.id && addedExampleIdSet.value.has(example.id))

const isExampleEditing = (example: FavoriteReproducibilityExample, index: number) => {
  if (isReadonly.value) return false
  if (props.panelMode === 'edit') return true
  if (isAddedExample(example)) return true
  return editingExampleIdentities.value.has(getExampleIdentity(example, index))
}

const handleEditExample = (example: FavoriteReproducibilityExample, index: number) => {
  editingExampleIdentities.value = new Set([
    ...editingExampleIdentities.value,
    getExampleIdentity(example, index),
  ])
}

const handleDoneExample = (example: FavoriteReproducibilityExample, index: number) => {
  const next = new Set(editingExampleIdentities.value)
  next.delete(getExampleIdentity(example, index))
  editingExampleIdentities.value = next
}

const normalizeMessageRole = (value: unknown): ExampleMessageRole =>
  value === 'system' || value === 'assistant' || value === 'tool'
    ? value
    : 'user'

const getParameterDraft = (index: number) => {
  parameterDrafts[index] ||= { key: '', value: '' }
  return parameterDrafts[index]
}

const setParameterDraft = (
  index: number,
  field: 'key' | 'value',
  value: string,
) => {
  const draft = getParameterDraft(index)
  draft[field] = value
}

const getImageUrlDraftKey = (index: number, field: ExampleImageField) => `${index}:${field}`

const createExampleDraftKey = () => `example-${++exampleKeySequence}`

const clearExampleDrafts = () => {
  Object.keys(parameterDrafts).forEach((key) => {
    delete parameterDrafts[Number(key)]
  })
  Object.keys(imageUrlDrafts).forEach((key) => {
    delete imageUrlDrafts[key]
  })
}

const emitExamples = (
  examples: FavoriteReproducibilityExample[],
  draftKeys = exampleDraftKeys.value,
) => {
  exampleDraftKeys.value = draftKeys
  lastEmittedExamples = examples
  emit('update:examples', examples)
}

watch(
  () => props.examples,
  (examples) => {
    if (lastEmittedExamples) {
      lastEmittedExamples = null
      if (exampleDraftKeys.value.length !== examples.length) {
        exampleDraftKeys.value = examples.map((_, index) =>
          exampleDraftKeys.value[index] || createExampleDraftKey(),
        )
      }
      return
    }

    uploadSequence += 1
    exampleDraftKeys.value = examples.map(() => createExampleDraftKey())
    editingExampleIdentities.value = new Set()
    clearExampleDrafts()
  },
  { immediate: true },
)

const handleAddExampleParameter = (index: number) => {
  if (isReadonly.value) return

  const draft = getParameterDraft(index)
  const key = draft.key.trim()
  if (!key) return

  const example = props.examples[index]
  if (!example) return

  updateExample(index, {
    parameters: {
      ...example.parameters,
      [key]: draft.value,
    },
  })
  parameterDrafts[index] = { key: '', value: '' }
}

const handleUpdateExampleParameterValue = (
  index: number,
  key: string,
  value: string,
) => {
  if (isReadonly.value) return

  const example = props.examples[index]
  if (!example) return

  updateExample(index, {
    parameters: {
      ...example.parameters,
      [key]: value,
    },
  })
}

const handleRemoveExampleParameter = (index: number, key: string) => {
  if (isReadonly.value) return

  const example = props.examples[index]
  if (!example) return

  const nextParameters = { ...example.parameters }
  delete nextParameters[key]
  updateExample(index, { parameters: nextParameters })
}

const handleAddExampleMessage = (index: number) => {
  if (isReadonly.value) return

  const example = props.examples[index]
  if (!example) return

  updateExample(index, {
    messages: [
      ...(example.messages || []),
      {
        role: 'user',
        content: '',
      },
    ],
  })
}

const handleUpdateExampleMessage = (
  index: number,
  messageIndex: number,
  patch: Partial<ExampleMessage>,
) => {
  if (isReadonly.value) return

  const example = props.examples[index]
  const messages = example?.messages
  if (!example || !messages?.[messageIndex]) return

  updateExample(index, {
    messages: messages.map((message, currentIndex) =>
      currentIndex === messageIndex ? { ...message, ...patch } : message,
    ),
  })
}

const handleRemoveExampleMessage = (index: number, messageIndex: number) => {
  if (isReadonly.value) return

  const example = props.examples[index]
  if (!example) return

  updateExample(index, {
    messages: (example.messages || []).filter((_, currentIndex) => currentIndex !== messageIndex),
  })
}

const removeExampleDrafts = (removedIndex: number) => {
  const removedExample = props.examples[removedIndex]
  const removedIdentity = removedExample
    ? getExampleIdentity(removedExample, removedIndex)
    : exampleDraftKeys.value[removedIndex]
  const nextExampleDraftKeys = exampleDraftKeys.value.filter((_, index) => index !== removedIndex)
  const nextEditingIdentities = new Set(editingExampleIdentities.value)
  if (removedIdentity) {
    nextEditingIdentities.delete(removedIdentity)
  }
  editingExampleIdentities.value = nextEditingIdentities

  const nextParameterDrafts: Record<number, { key: string; value: string }> = {}
  Object.entries(parameterDrafts).forEach(([indexText, draft]) => {
    const index = Number(indexText)
    if (!Number.isInteger(index) || index === removedIndex) return
    nextParameterDrafts[index > removedIndex ? index - 1 : index] = draft
  })
  Object.keys(parameterDrafts).forEach((key) => {
    delete parameterDrafts[Number(key)]
  })
  Object.assign(parameterDrafts, nextParameterDrafts)

  const nextImageUrlDrafts: Record<string, string> = {}
  Object.entries(imageUrlDrafts).forEach(([key, value]) => {
    const match = key.match(/^(\d+):(images|inputImages)$/u)
    if (!match) return
    const index = Number(match[1])
    if (index === removedIndex) return
    nextImageUrlDrafts[getImageUrlDraftKey(index > removedIndex ? index - 1 : index, match[2] as ExampleImageField)] = value
  })
  Object.keys(imageUrlDrafts).forEach((key) => {
    delete imageUrlDrafts[key]
  })
  Object.assign(imageUrlDrafts, nextImageUrlDrafts)

  return nextExampleDraftKeys
}

const handleAddVariable = () => {
  if (isReadonly.value) return

  emit('update:variables', [
    ...props.variables,
    {
      name: '',
      required: false,
      options: [],
    },
  ])
}

const updateVariable = (
  index: number,
  patch: Partial<FavoriteReproducibilityVariable>,
) => {
  if (isReadonly.value) return

  emit(
    'update:variables',
    props.variables.map((variable, currentIndex) =>
      currentIndex === index ? { ...variable, ...patch } : variable,
    ),
  )
}

const handleRemoveVariable = (index: number) => {
  if (isReadonly.value) return

  emit('update:variables', props.variables.filter((_, currentIndex) => currentIndex !== index))
}

const handleAddExample = () => {
  if (isReadonly.value) return

  const draftKey = createExampleDraftKey()
  editingExampleIdentities.value = new Set([
    ...editingExampleIdentities.value,
    draftKey,
  ])

  emitExamples([
    ...props.examples,
    {
      parameters: {},
      images: [],
      imageAssetIds: [],
      inputImages: [],
      inputImageAssetIds: [],
    },
  ], [
    ...exampleDraftKeys.value,
    draftKey,
  ])
}

const updateExample = (
  index: number,
  patch: Partial<FavoriteReproducibilityExample>,
) => {
  if (isReadonly.value) return

  emitExamples(
    props.examples.map((example, currentIndex) =>
      currentIndex === index ? { ...example, ...patch } : example,
    ),
  )
}

const getImageUrlDraft = (index: number, field: ExampleImageField) =>
  imageUrlDrafts[getImageUrlDraftKey(index, field)] || ''

const setImageUrlDraft = (index: number, field: ExampleImageField, value: string) => {
  if (isReadonly.value) return

  imageUrlDrafts[getImageUrlDraftKey(index, field)] = value
}

const handleAddExampleImageUrl = (index: number, field: ExampleImageField) => {
  if (isReadonly.value) return

  const value = getImageUrlDraft(index, field).trim()
  const example = props.examples[index]
  if (!example || !value) return

  updateExample(index, {
    [field]: dedupeStrings([...(example[field] || []), value]),
  })
  imageUrlDrafts[getImageUrlDraftKey(index, field)] = ''
}

const getExampleImageItems = (
  index: number,
  field: ExampleImageField,
  example: FavoriteReproducibilityExample,
) => {
  const assetField = assetFieldByImageField[field]
  const existingAssetIds = new Set(example[assetField] || [])
  const sourceItems: ExampleImageItem[] = (example[field] || []).map((source, sourceIndex) => ({
    key: `${field}-source-${sourceIndex}-${source.slice(0, 24)}`,
    source,
    displayIndex: sourceIndex,
    kind: 'source',
    sourceIndex,
  }))
  const assetItems: ExampleImageItem[] = (props.examplePreviews?.[index]?.[field] || [])
    .filter((item) => existingAssetIds.has(item.assetId))
    .map((item, previewIndex) => ({
      key: `${field}-asset-${item.assetId}`,
      source: item.source,
      displayIndex: sourceItems.length + previewIndex,
      kind: 'asset',
      assetId: item.assetId,
    }))

  return [...sourceItems, ...assetItems]
}

const handleRemoveExampleImage = (
  index: number,
  field: ExampleImageField,
  item: ExampleImageItem,
) => {
  if (isReadonly.value) return

  const example = props.examples[index]
  if (!example) return

  if (item.kind === 'asset' && item.assetId) {
    const assetField = assetFieldByImageField[field]
    updateExample(index, {
      [assetField]: (example[assetField] || []).filter((assetId) => assetId !== item.assetId),
    })
    return
  }

  if (typeof item.sourceIndex === 'number') {
    updateExample(index, {
      [field]: (example[field] || []).filter((_, currentIndex) => currentIndex !== item.sourceIndex),
    })
  }
}

const handleAddExampleImageToMedia = (
  index: number,
  field: ExampleImageField,
  item: ExampleImageItem,
) => {
  if (isReadonly.value) return

  const source = String(item.source || '').trim()
  if (!source) return

  emit('add-image-to-media', {
    exampleIndex: index,
    field,
    source,
    ...(item.assetId ? { assetId: item.assetId } : {}),
  })
}

const handleRemoveExample = (index: number) => {
  if (isReadonly.value) return

  const nextExampleDraftKeys = removeExampleDrafts(index)
  emitExamples(
    props.examples.filter((_, currentIndex) => currentIndex !== index),
    nextExampleDraftKeys,
  )
}

const readBlobAsDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Failed to read image file'))
    reader.onload = () => resolve(String(reader.result || ''))
    reader.readAsDataURL(blob)
  })

const handleBeforeExampleImageUpload = async (
  index: number,
  field: ExampleImageField,
  options: { file: UploadFileInfo },
) => {
  if (isReadonly.value) return false

  const raw = (options.file as unknown as { file?: Blob | null }).file
  if (!raw) return false

  const requestId = uploadSequence
  const targetDraftKey = exampleDraftKeys.value[index]
  try {
    const dataUrl = await readBlobAsDataUrl(raw)
    if (requestId !== uploadSequence) return false
    if (targetDraftKey !== exampleDraftKeys.value[index]) return false

    const example = props.examples[index]
    if (!example || !dataUrl) return false

    updateExample(index, {
      [field]: dedupeStrings([...(example[field] || []), dataUrl]),
    })
  } catch (error) {
    console.error('[FavoriteReproducibilityEditor] Failed to read selected example image:', error)
  }

  return false
}
</script>

<style scoped>
.favorite-reproducibility-editor__section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.favorite-reproducibility-editor__empty {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  padding: 8px 8px;
  border: 1px dashed var(--n-border-color);
  border-radius: 8px;
  background: var(--n-color-embedded);
}

.favorite-reproducibility-editor__section-header,
.favorite-reproducibility-editor__item-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
}

.favorite-reproducibility-editor__section-header--actions-only {
  justify-content: flex-end;
}

.favorite-reproducibility-editor__item {
  min-width: 0;
  padding: 8px;
  border: 1px solid var(--n-border-color);
  border-radius: 8px;
  background: var(--n-color);
}

.favorite-reproducibility-editor__example {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.favorite-reproducibility-editor__example--added {
  border-color: rgba(240, 160, 32, 0.42);
  background: color-mix(in srgb, var(--n-color) 82%, rgba(240, 160, 32, 0.18));
  box-shadow: inset 3px 0 0 rgba(240, 160, 32, 0.78);
}

.favorite-reproducibility-editor__example--editing {
  border-style: solid;
}

.favorite-reproducibility-editor__example-header {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
}

.favorite-reproducibility-editor__example-summary {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
  border: 1px solid var(--n-border-color);
  border-radius: 8px;
  background: var(--n-color-embedded);
}

.favorite-reproducibility-editor__example-summary-text,
.favorite-reproducibility-editor__example-summary-output {
  min-width: 0;
  overflow-wrap: anywhere;
}

.favorite-reproducibility-editor__example-summary-output {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.favorite-reproducibility-editor__summary-media {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
}

.favorite-reproducibility-editor__summary-image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(72px, 92px));
  gap: 4px;
}

.favorite-reproducibility-editor__summary-image {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 6px;
  overflow: hidden;
  background: var(--n-color-embedded);
}

.favorite-reproducibility-editor__example-basic {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.favorite-reproducibility-editor__example-description,
.favorite-reproducibility-editor__example-output-field,
.favorite-reproducibility-editor__example-section {
  grid-column: 1 / -1;
}

.favorite-reproducibility-editor__message-field,
.favorite-reproducibility-editor__example-output-field {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
}

.favorite-reproducibility-editor__message-row {
  display: grid;
  min-width: 0;
  grid-template-columns: 120px minmax(0, 1fr) auto;
  gap: 4px;
  align-items: start;
}

.favorite-reproducibility-editor__example-media-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.favorite-reproducibility-editor__item-actions {
  margin-top: 8px;
}

.favorite-reproducibility-editor__item-actions--end {
  justify-content: flex-end;
}

.favorite-reproducibility-editor__parameter-field,
.favorite-reproducibility-editor__image-field {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
}

.favorite-reproducibility-editor__parameter-row {
  display: grid;
  min-width: 0;
  grid-template-columns: minmax(92px, 0.8fr) minmax(0, 1.2fr) auto;
  gap: 4px;
  align-items: center;
}

.favorite-reproducibility-editor__parameter-key {
  min-width: 0;
  padding: 4px 8px;
  border: 1px solid var(--n-border-color);
  border-radius: 6px;
  background: var(--n-color-embedded);
  overflow-wrap: anywhere;
}

.favorite-reproducibility-editor__image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(76px, 1fr));
  gap: 4px;
}

.favorite-reproducibility-editor__image-toolbar :deep(.n-input) {
  min-width: 160px;
  flex: 1 1 180px;
}

.favorite-reproducibility-editor__image-action {
  flex: 0 0 auto;
}

.favorite-reproducibility-editor__image-item {
  position: relative;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.favorite-reproducibility-editor__image {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 6px;
  overflow: hidden;
  background: var(--n-color-embedded);
}

.favorite-reproducibility-editor__image-remove {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 22px;
  height: 22px;
  min-width: 22px;
  background: var(--n-color);
  border-radius: 999px;
  opacity: 0.92;
}

.favorite-reproducibility-editor__image-add-media {
  width: 100%;
}

@media (max-width: 767px) {
  .favorite-reproducibility-editor__example-basic,
  .favorite-reproducibility-editor__example-media-grid,
  .favorite-reproducibility-editor__message-row {
    grid-template-columns: 1fr;
  }

  .favorite-reproducibility-editor__parameter-row {
    grid-template-columns: 1fr;
  }
}
</style>
