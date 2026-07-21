# Reference Image Dialog Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the text-to-image reference-image dialog into a simpler, clearer flow with thumbnail-first context, user-facing mode names, no undo complexity, and a hard 5-variable cap.

**Architecture:** Keep the existing three-stage reference pipeline intact (`ReferenceSpec -> PromptDraft -> VariableizedPrompt`) and only reshape the dialog state, layout, copy, and variable extraction policy around it. Treat the modal as a confirmation-and-light-edit surface rather than a strongly synchronized editor, so prompt text and variables can diverge temporarily without triggering re-extraction logic.

**Tech Stack:** Vue 3, Naive UI, TypeScript, Vitest, existing core template system

---

## File Map

### Core files to modify

- `packages/ui/src/components/image-mode/ImageText2ImageWorkspace.vue`
  - Reference-image modal structure, layout, user-facing wording hooks, thumbnail presentation, and removal of undo banner UI.
- `packages/ui/src/composables/image/useReferencePromptDialog.ts`
  - Dialog state model, removal of apply snapshot/undo, addition of current-prompt preview state if needed.
- `packages/ui/src/services/ImageStyleExtractor.ts`
  - Service-layer variable cap and any helper for trimming extracted variables to 5 high-priority entries.
- `packages/ui/src/i18n/locales/zh-CN.ts`
  - Main Chinese copy changes for the dialog.
- `packages/ui/src/i18n/locales/zh-TW.ts`
  - Traditional Chinese parity for the same copy.
- `packages/ui/src/i18n/locales/en-US.ts`
  - English parity for the same copy.
- `packages/core/src/services/template/default-templates/variable-extraction/extraction.ts`
  - Tighten extraction policy and cap guidance to 5 variables in Chinese.
- `packages/core/src/services/template/default-templates/variable-extraction/extraction_en.ts`
  - Tighten extraction policy and cap guidance to 5 variables in English.

### Test files to modify

- `packages/ui/tests/unit/composables/useReferencePromptDialog.spec.ts`
  - Update expectations away from undo and toward simplified apply behavior.
- `packages/ui/tests/unit/services/ImageStyleExtractor.reference-migration.spec.ts`
  - Add assertions for the 5-variable hard cap and final-prompt-only retention.
- `packages/ui/tests/unit/image/reference-image-theme-guards.spec.ts`
  - Update source guard assertions to match thumbnail layout, no undo banner, and controlled modal sizing.

### Optional new tests

- `packages/ui/tests/unit/image/reference-image-dialog-layout.spec.ts`
  - Add only if the existing theme guard becomes too brittle to express the new structure cleanly.

---

### Task 1: Simplify Dialog State and Remove Undo

**Files:**
- Modify: `packages/ui/src/composables/image/useReferencePromptDialog.ts`
- Test: `packages/ui/tests/unit/composables/useReferencePromptDialog.spec.ts`

- [ ] **Step 1: Write the failing composable test for “apply without undo”**

```ts
it('applies prompt and variables without exposing undo state', () => {
  const dialog = useReferencePromptDialog(/* ... */)
  dialog.openDialog()
  dialog.setGeneratedPreview(createPreview())

  dialog.applyToCurrentPrompt()

  expect(dialog).not.toHaveProperty('canUndoLastApply')
  expect(dialog).not.toHaveProperty('undoLastApply')
})
```

- [ ] **Step 2: Add a failing test for current-prompt preview behavior**

```ts
it('stores detected current prompt for preview while keeping full prompt available for migration decisions', () => {
  const dialog = useReferencePromptDialog(/* original prompt is long text */)
  dialog.openDialog()

  expect(dialog.detectedOriginalPrompt.value).toContain('当前提示词')
})
```

Note:
- If the implementation chooses a computed preview string instead of a second ref, assert the chosen public API instead of inventing a new property.

- [ ] **Step 3: Run the composable test file**

Run:

```powershell
pnpm -F @mindsync/ui test -- tests/unit/composables/useReferencePromptDialog.spec.ts
```

Expected:
- FAIL because undo APIs still exist and the new preview expectation is not implemented yet.

- [ ] **Step 4: Remove undo state from the composable**

Implementation direction:

```ts
// Remove:
// - lastApplySnapshot
// - canUndoLastApply
// - undoLastApply()

const applyToCurrentPrompt = () => {
  if (!canApply.value) return false

  options.applyPrompt(workingPrompt.value)
  options.applyVariables(cloneVariables(workingVariables.value))
  options.resetPromptArtifacts?.()
  closeDialog()
  return true
}
```

- [ ] **Step 5: Add or expose a small current-prompt preview value**

Implementation direction:

```ts
const detectedOriginalPromptPreview = computed(() =>
  detectedOriginalPrompt.value.trim(),
)
```

Rules:
- Keep the full original prompt for mode-switch logic.
- Let the workspace decide how many lines to show visually.

- [ ] **Step 6: Re-run the composable tests**

Run:

```powershell
pnpm -F @mindsync/ui test -- tests/unit/composables/useReferencePromptDialog.spec.ts
```

Expected:
- PASS

- [ ] **Step 7: Commit**

```powershell
git add packages/ui/src/composables/image/useReferencePromptDialog.ts packages/ui/tests/unit/composables/useReferencePromptDialog.spec.ts
git commit -m "refactor(ui): simplify reference dialog state"
```

---

### Task 2: Rebuild the Modal Information Architecture and Layout

**Files:**
- Modify: `packages/ui/src/components/image-mode/ImageText2ImageWorkspace.vue`
- Test: `packages/ui/tests/unit/image/reference-image-theme-guards.spec.ts`

- [ ] **Step 1: Write the failing UI source guard updates**

Add expectations for:
- thumbnail-oriented reference image block
- separate detected-current-prompt section
- `风格迁移 / 复刻图片` copy hooks
- no undo banner markup

Example:

```ts
expect(source).toMatch(/reference-dialog-context-grid/)
expect(source).toMatch(/reference-dialog-thumbnail/)
expect(source).toMatch(/detectedCurrentPromptTitle/)
expect(source).not.toMatch(/reference-image-undo-button/)
expect(source).not.toMatch(/undoBanner/)
```

- [ ] **Step 2: Run the UI source guard test**

Run:

```powershell
pnpm -F @mindsync/ui test -- tests/unit/image/reference-image-theme-guards.spec.ts
```

Expected:
- FAIL because the current modal still uses the old arrangement and undo markup.

- [ ] **Step 3: Replace the large reference preview with a compact thumbnail layout**

Implementation direction inside `ImageText2ImageWorkspace.vue`:

```vue
<div class="reference-dialog-source-row">
  <button class="reference-dialog-thumbnail">
    <NImage ... />
  </button>
  <div class="reference-dialog-source-meta">
    <NText strong>{{ referenceDialog.sourceImageName || t(...) }}</NText>
    <NText depth="3">{{ t('imageWorkspace.referenceImage.sourceImageHint') }}</NText>
    <NButton size="small" secondary>{{ ... }}</NButton>
  </div>
</div>
```

Rules:
- Thumbnail should not dominate vertical space.
- Keep Naive UI theming and avoid hardcoded light-only backgrounds.

- [ ] **Step 4: Split “detected current prompt” into its own section**

Implementation direction:

```vue
<NCard v-if="referenceDialog.showModeSwitch" ...>
  <NText strong>{{ t('imageWorkspace.referenceImage.detectedCurrentPromptTitle') }}</NText>
  <NText depth="3" class="reference-dialog-current-prompt-preview">
    {{ referenceDialog.detectedOriginalPromptPreview }}
  </NText>
</NCard>
```

Rules:
- Show only preview text visually via CSS line clamp.
- Do not place it under the usage-mode heading.

- [ ] **Step 5: Convert the mode selector into user-facing option cards**

Implementation direction:

```vue
<NRadioGroup ...>
  <div class="reference-dialog-mode-grid">
    <label class="reference-dialog-mode-card">
      <NRadio value="migrate" />
      <NText strong>{{ t('imageWorkspace.referenceImage.styleTransfer') }}</NText>
      <NText depth="3">{{ t('imageWorkspace.referenceImage.styleTransferDescription') }}</NText>
    </label>
  </div>
</NRadioGroup>
```

Rules:
- Preserve the underlying radio semantics.
- Increase selection clarity with border/background states derived from theme tokens.

- [ ] **Step 6: Move the result area to a mixed layout**

Implementation direction:

```vue
<div class="reference-dialog-results-grid">
  <NCard class="reference-dialog-section reference-dialog-section--prompt">...</NCard>
  <NCard class="reference-dialog-section reference-dialog-section--variables">...</NCard>
</div>
```

Rules:
- Desktop: `2fr / 1fr`
- Narrow widths: stack vertically
- Prompt textarea gets a stable minimum height
- Variable list gets a stable min/max height with scrolling

- [ ] **Step 7: Remove the undo banner from the workspace**

Delete:
- success alert block above the template/model controls
- `handleReferenceDialogUndo` wiring
- any `referenceDialog.canUndoLastApply` template branches

- [ ] **Step 8: Re-run the UI source guard test**

Run:

```powershell
pnpm -F @mindsync/ui test -- tests/unit/image/reference-image-theme-guards.spec.ts
```

Expected:
- PASS

- [ ] **Step 9: Commit**

```powershell
git add packages/ui/src/components/image-mode/ImageText2ImageWorkspace.vue packages/ui/tests/unit/image/reference-image-theme-guards.spec.ts
git commit -m "feat(ui): redesign reference image dialog layout"
```

---

### Task 3: Update Dialog Copy Across Locales

**Files:**
- Modify: `packages/ui/src/i18n/locales/zh-CN.ts`
- Modify: `packages/ui/src/i18n/locales/zh-TW.ts`
- Modify: `packages/ui/src/i18n/locales/en-US.ts`

- [ ] **Step 1: Add a failing check in the UI source guard or locale-aware test**

If no locale test exists, extend the existing source guard to assert the new translation keys are referenced and old ones are gone.

Example:

```ts
expect(source).toMatch(/styleTransfer/)
expect(source).toMatch(/replicateImage/)
expect(source).not.toMatch(/migrateToCurrentPrompt/)
expect(source).not.toMatch(/replicateOnly/)
```

- [ ] **Step 2: Run the relevant test file**

Run:

```powershell
pnpm -F @mindsync/ui test -- tests/unit/image/reference-image-theme-guards.spec.ts
```

Expected:
- FAIL until the component and locale keys agree.

- [ ] **Step 3: Update the locale entries**

Chinese target copy:

```ts
styleTransfer: "风格迁移",
styleTransferDescription: "在原提示词的基础上学习图片风格进行改造",
replicateImage: "复刻图片",
replicateImageDescription: "丢弃原始提示词内容，反推图片对应提示词",
detectedCurrentPromptTitle: "检测到当前提示词",
```

Also remove:
- `undoBanner`
- `undo`
- `undoSuccess`

- [ ] **Step 4: Keep cross-locale parity**

Do not leave `zh-TW` and `en-US` behind even if the main product language is Chinese.

- [ ] **Step 5: Re-run the UI test**

Run:

```powershell
pnpm -F @mindsync/ui test -- tests/unit/image/reference-image-theme-guards.spec.ts
```

Expected:
- PASS

- [ ] **Step 6: Commit**

```powershell
git add packages/ui/src/i18n/locales/zh-CN.ts packages/ui/src/i18n/locales/zh-TW.ts packages/ui/src/i18n/locales/en-US.ts packages/ui/src/components/image-mode/ImageText2ImageWorkspace.vue packages/ui/tests/unit/image/reference-image-theme-guards.spec.ts
git commit -m "refactor(ui): update reference dialog copy"
```

---

### Task 4: Tighten Variable Extraction to 5 High-Value Variables

**Files:**
- Modify: `packages/core/src/services/template/default-templates/variable-extraction/extraction.ts`
- Modify: `packages/core/src/services/template/default-templates/variable-extraction/extraction_en.ts`
- Modify: `packages/ui/src/services/ImageStyleExtractor.ts`
- Test: `packages/ui/tests/unit/services/ImageStyleExtractor.reference-migration.spec.ts`

- [ ] **Step 1: Add a failing service test for the 5-variable cap**

Example:

```ts
it('caps extracted variables at 5 entries', async () => {
  const result = await extractPromptVariables({
    prompt: SOME_PROMPT,
    modelKey: 'text-model',
    variableExtractionService: {
      extract: vi.fn().mockResolvedValue({
        variables: Array.from({ length: 7 }, (_, index) => ({
          name: `变量${index + 1}`,
          value: `值${index + 1}`,
          position: { originalText: `词${index + 1}`, occurrence: 1 },
          reason: 'test',
        })),
      }),
    } as any,
  })

  expect(Object.keys(result.variableDefaults)).toHaveLength(5)
})
```

- [ ] **Step 2: Run the reference-migration service tests**

Run:

```powershell
pnpm -F @mindsync/ui test -- tests/unit/services/ImageStyleExtractor.reference-migration.spec.ts
```

Expected:
- FAIL because no hard cap exists yet.

- [ ] **Step 3: Tighten the variable-extraction prompt templates**

Chinese and English template changes should:
- reduce max variable count from 20 to 5
- instruct the model to prioritize subject, count, color, key action, and key scene/style anchor
- avoid low-value decorative fragments

Example rule block:

```ts
- 最多返回5个变量，按重要性排序
- 优先保留主体、数量、颜色、关键动作、关键场景或核心风格锚点
- 避免提取低价值修饰词、重复限定词和局部装饰
```

- [ ] **Step 4: Add a hard-cap safeguard in `ImageStyleExtractor.ts`**

Implementation direction:

```ts
const MAX_REFERENCE_DIALOG_VARIABLES = 5

const limitedVariables = result.variables.slice(0, MAX_REFERENCE_DIALOG_VARIABLES)
const variableizedPrompt = replaceExtractedVariablesInPrompt(prompt, limitedVariables)
const keptVariableNames = scanVariablesFromValue(variableizedPrompt)

return {
  prompt: variableizedPrompt,
  variableDefaults: buildFilteredDefaultsFromExtractedVariables(keptVariableNames, limitedVariables),
  rawText,
}
```

- [ ] **Step 5: Re-run the service tests**

Run:

```powershell
pnpm -F @mindsync/ui test -- tests/unit/services/ImageStyleExtractor.reference-migration.spec.ts
```

Expected:
- PASS

- [ ] **Step 6: Commit**

```powershell
git add packages/core/src/services/template/default-templates/variable-extraction/extraction.ts packages/core/src/services/template/default-templates/variable-extraction/extraction_en.ts packages/ui/src/services/ImageStyleExtractor.ts packages/ui/tests/unit/services/ImageStyleExtractor.reference-migration.spec.ts
git commit -m "refactor(image): cap reference dialog variables"
```

---

### Task 5: Final Verification and Manual Smoke Check

**Files:**
- Verify all files from Tasks 1-4
- Optional notes update in: `docs/superpowers/specs/2026-03-31-reference-image-dialog-redesign-design.md`

- [ ] **Step 1: Run the targeted UI and service tests together**

Run:

```powershell
pnpm -F @mindsync/ui test -- tests/unit/composables/useReferencePromptDialog.spec.ts tests/unit/image/reference-image-theme-guards.spec.ts tests/unit/services/ImageStyleExtractor.reference-migration.spec.ts
```

Expected:
- PASS

- [ ] **Step 2: Run UI typecheck**

Run:

```powershell
pnpm -F @mindsync/ui typecheck
```

Expected:
- PASS

- [ ] **Step 3: Run a local manual smoke test**

Run:

```powershell
pnpm dev:fresh
```

Manual checklist:
- Open `http://127.0.0.1:18181/#/image/text2image`
- Click `参考图`
- Confirm there is no undo banner in the workspace after apply
- Confirm the reference image is shown as a thumbnail, not a large preview
- Confirm `检测到当前提示词` is separate from the mode area
- Confirm `风格迁移 / 复刻图片` are clearly distinguishable
- Confirm the prompt editor and variables panel both have stable visible height

If model/auth config blocks full end-to-end generation, still verify the static layout and state behavior around modal opening, mode switching, and absence of undo affordances.

- [ ] **Step 4: Commit the verified final state**

```powershell
git add packages/ui/src/components/image-mode/ImageText2ImageWorkspace.vue packages/ui/src/composables/image/useReferencePromptDialog.ts packages/ui/src/services/ImageStyleExtractor.ts packages/ui/src/i18n/locales/zh-CN.ts packages/ui/src/i18n/locales/zh-TW.ts packages/ui/src/i18n/locales/en-US.ts packages/core/src/services/template/default-templates/variable-extraction/extraction.ts packages/core/src/services/template/default-templates/variable-extraction/extraction_en.ts packages/ui/tests/unit/composables/useReferencePromptDialog.spec.ts packages/ui/tests/unit/image/reference-image-theme-guards.spec.ts packages/ui/tests/unit/services/ImageStyleExtractor.reference-migration.spec.ts
git commit -m "feat(ui): simplify reference image migration dialog"
```

---

## Notes for the Implementer

- Do not reintroduce “sync variables” or “undo once” under new names.
- Keep the modal built on Naive UI primitives and theme tokens.
- Prefer CSS line-clamp or constrained container height for current-prompt preview rather than trimming the underlying source text aggressively.
- Keep the three-stage service architecture intact; this plan is a UI and policy refinement, not a pipeline rewrite.
- If the workspace file becomes too hard to reason about, it is acceptable to extract a small presentational subcomponent for the mode cards or result grid, but only if it reduces complexity instead of spreading it.
