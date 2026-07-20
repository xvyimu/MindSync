/**
 * 可复现评估用例集（Cut-1）— UI 编排
 * 存储：preferenceService（跨 Web/Desktop 代理可用）
 * 运行：llmService.sendMessage + core runEvalCaseSet
 */

import { ref, computed, type Ref } from 'vue'
import {
  CORE_SERVICE_KEYS,
  createEmptyEvalCaseSet,
  createEvalCaseId,
  createEvalEvidenceFileName,
  evaluateAssertions,
  isEvalCaseSet,
  runEvalCaseSet,
  serializeEvalEvidenceBundle,
  type EvalCase,
  type EvalCaseSet,
  type EvalEvidenceBundle,
  type ILLMService,
  type IPreferenceService,
} from '@prompt-optimizer/core'

export interface UseEvalCaseSetOptions {
  preferenceService: Ref<IPreferenceService | null | undefined>
  llmService: Ref<ILLMService | null | undefined>
  modelKey: Ref<string>
}

const STORAGE_KEY = CORE_SERVICE_KEYS.EVAL_CASE_SET

export function useEvalCaseSet(options: UseEvalCaseSetOptions) {
  const caseSet = ref<EvalCaseSet>(createEmptyEvalCaseSet())
  const isLoading = ref(false)
  const isRunning = ref(false)
  const error = ref<string | null>(null)
  const lastBundle = ref<EvalEvidenceBundle | null>(null)
  const showPanel = ref(false)

  let abortController: AbortController | null = null

  const caseCount = computed(() => caseSet.value.cases.length)
  const canRun = computed(
    () =>
      !!options.llmService.value &&
      !!options.modelKey.value?.trim() &&
      caseSet.value.cases.length > 0 &&
      !isRunning.value,
  )

  const load = async (): Promise<void> => {
    const pref = options.preferenceService.value
    if (!pref) {
      caseSet.value = createEmptyEvalCaseSet()
      return
    }
    isLoading.value = true
    error.value = null
    try {
      const raw = await pref.get<EvalCaseSet | string | null>(STORAGE_KEY, null)
      if (!raw) {
        caseSet.value = createEmptyEvalCaseSet()
        return
      }
      const parsed: unknown = typeof raw === 'string' ? JSON.parse(raw) : raw
      if (isEvalCaseSet(parsed)) {
        caseSet.value = parsed
      } else {
        caseSet.value = createEmptyEvalCaseSet()
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      caseSet.value = createEmptyEvalCaseSet()
    } finally {
      isLoading.value = false
    }
  }

  const persist = async (): Promise<void> => {
    const pref = options.preferenceService.value
    if (!pref) {
      throw new Error('Preference service is not available')
    }
    const next: EvalCaseSet = {
      ...caseSet.value,
      version: 1,
      updatedAt: Date.now(),
    }
    if (!isEvalCaseSet(next)) {
      throw new Error('Invalid case set')
    }
    // preference 层自行序列化；存对象避免双重 stringify
    await pref.set(STORAGE_KEY, next)
    caseSet.value = next
  }

  const upsertCase = async (input: {
    id?: string
    name: string
    input: string
    systemPrompt?: string
    contains: string
  }): Promise<void> => {
    const name = input.name.trim()
    const caseInput = input.input.trim()
    const contains = input.contains.trim()
    if (!name || !caseInput || !contains) {
      throw new Error('name, input and contains assertion are required')
    }

    const nextCase: EvalCase = {
      id: input.id || createEvalCaseId(),
      name,
      input: caseInput,
      systemPrompt: input.systemPrompt?.trim() || undefined,
      assertions: [{ type: 'contains', value: contains }],
    }

    const cases = [...caseSet.value.cases]
    const idx = cases.findIndex((c) => c.id === nextCase.id)
    if (idx >= 0) {
      cases[idx] = nextCase
    } else {
      cases.push(nextCase)
    }

    caseSet.value = {
      ...caseSet.value,
      cases,
      updatedAt: Date.now(),
    }
    await persist()
  }

  const removeCase = async (id: string): Promise<void> => {
    caseSet.value = {
      ...caseSet.value,
      cases: caseSet.value.cases.filter((c) => c.id !== id),
      updatedAt: Date.now(),
    }
    await persist()
  }

  const runAll = async (): Promise<EvalEvidenceBundle> => {
    const llm = options.llmService.value
    const modelKey = options.modelKey.value?.trim()
    if (!llm) throw new Error('LLM service is not available')
    if (!modelKey) throw new Error('modelKey is required')
    if (caseSet.value.cases.length === 0) {
      throw new Error('No eval cases to run')
    }

    abortController?.abort()
    abortController = new AbortController()
    isRunning.value = true
    error.value = null
    try {
      const bundle = await runEvalCaseSet(caseSet.value, {
        llmService: llm,
        modelKey,
        signal: abortController.signal,
      })
      lastBundle.value = bundle
      return bundle
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        error.value = 'cancelled'
        throw e
      }
      error.value = e instanceof Error ? e.message : String(e)
      throw e
    } finally {
      isRunning.value = false
      abortController = null
    }
  }

  const cancel = (): void => {
    abortController?.abort()
  }

  const exportEvidence = (): { fileName: string; json: string } | null => {
    if (!lastBundle.value) return null
    return {
      fileName: createEvalEvidenceFileName(),
      json: serializeEvalEvidenceBundle(lastBundle.value),
    }
  }

  const downloadEvidence = (): boolean => {
    const exported = exportEvidence()
    if (!exported || typeof document === 'undefined') return false
    const blob = new Blob([exported.json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = exported.fileName
    a.click()
    URL.revokeObjectURL(url)
    return true
  }

  return {
    caseSet,
    caseCount,
    canRun,
    isLoading,
    isRunning,
    error,
    lastBundle,
    showPanel,
    load,
    persist,
    upsertCase,
    removeCase,
    runAll,
    cancel,
    exportEvidence,
    downloadEvidence,
    // re-export pure helper for optional UI dry-check
    evaluateAssertions,
  }
}
