import {
  createImageUnderstandingService,
  TemplateProcessor,
  type ITemplateManager,
  type Message,
  type Template,
  type TextModelConfig,
} from '@mindsync/core'
import { VARIABLE_VALIDATION, isValidVariableName } from '../types/variable'

export type ImagePromptExtractionMode = 'text2image' | 'image2image'
export type ReferenceApplicationMode = 'replicate' | 'migrate'
export type ReferencePromptResolutionStage = 'generating-preview'

export interface ReferencePromptPreview {
  prompt: string
  variableDefaults: Record<string, string>
  rawText: string
}

interface ExtractionPrompts {
  systemPrompt: string
  userPrompt: string
}

interface ResolveReferencePromptPreviewOptions {
  mode: ReferenceApplicationMode
  originalPrompt: string
  referenceMode?: ImagePromptExtractionMode
  modelConfig?: TextModelConfig
  imageB64?: string
  mimeType?: string
  templateManager?: ITemplateManager | null
  onStageChange?: (stage: ReferencePromptResolutionStage) => void
}

const MAX_REFERENCE_DIALOG_VARIABLES = 5
const IMAGE_PROMPT_COMPOSITION_TEMPLATE_ID = 'image-prompt-from-reference-image'
const IMAGE_PROMPT_MIGRATION_TEMPLATE_ID = 'image-prompt-migration'
const imageUnderstandingService = createImageUnderstandingService()

export async function resolveReferencePromptPreview(
  options: ResolveReferencePromptPreviewOptions,
): Promise<ReferencePromptPreview> {
  const {
    mode,
    originalPrompt,
    referenceMode = 'text2image',
    modelConfig,
    imageB64,
    mimeType,
    templateManager,
    onStageChange,
  } = options

  const effectiveOriginalPrompt = mode === 'migrate' ? originalPrompt.trim() : ''

  if (!modelConfig || !imageB64 || !mimeType) {
    throw new Error('Reference image and image model are required')
  }

  const templateId =
    mode === 'migrate' && effectiveOriginalPrompt
      ? IMAGE_PROMPT_MIGRATION_TEMPLATE_ID
      : IMAGE_PROMPT_COMPOSITION_TEMPLATE_ID

  const prompts = await buildReferencePromptPrompts(templateManager, templateId, {
    originalPrompt: effectiveOriginalPrompt,
    referenceMode,
  })

  onStageChange?.('generating-preview')
  const response = await imageUnderstandingService.understand({
    modelConfig,
    systemPrompt: prompts.systemPrompt || undefined,
    userPrompt: prompts.userPrompt,
    images: [
      {
        b64: imageB64,
        mimeType,
      },
    ],
    paramOverrides: {
      temperature: 0.2,
    },
    responseMimeType: 'application/json',
  })

  const rawText = typeof response.content === 'string' ? response.content.trim() : ''
  if (!rawText) {
    throw new Error('Model did not return a valid structured prompt')
  }

  return normalizeReferencePromptPreview(rawText)
}

async function buildReferencePromptPrompts(
  templateManager: ITemplateManager | null | undefined,
  templateId: string,
  context: {
    originalPrompt: string
    referenceMode: ImagePromptExtractionMode
  },
): Promise<ExtractionPrompts> {
  if (!templateManager) {
    throw new Error('Template manager is not initialized')
  }

  const template = await templateManager.getTemplate(templateId)
  const messages = TemplateProcessor.processTemplate(
    template,
    createReferencePromptTemplateContext(context, template),
  )

  const systemPrompt = collectPromptByRole(messages, 'system')
  const userPrompt = collectPromptByRole(messages, 'user')

  if (!userPrompt) {
    throw new Error('Reference image template is missing a user prompt')
  }

  return {
    systemPrompt,
    userPrompt,
  }
}

function normalizeReferencePromptPreview(rawText: string): ReferencePromptPreview {
  const parsed = parseJsonObject(rawText)
  const variableDefaults = normalizeVariableDefaults(
    isRecord(parsed.defaults)
      ? parsed.defaults
      : isRecord(parsed.variableDefaults)
        ? parsed.variableDefaults
        : {},
  )
  const promptObject = normalizePromptObject(
    resolvePromptObject(parsed.prompt ?? parsed.promptJson ?? parsed),
    Object.keys(variableDefaults),
  )
  const constrainedPromptObject = constrainPromptVariables(promptObject, variableDefaults)
  const formattedPrompt = JSON.stringify(constrainedPromptObject, null, 2)

  if (!formattedPrompt || formattedPrompt === 'null') {
    throw new Error('Model response is not a valid JSON prompt object')
  }

  const variableNames = scanVariablesFromValue(constrainedPromptObject)
  const defaults = buildFilteredDefaults(variableNames, variableDefaults)

  return {
    prompt: formattedPrompt,
    variableDefaults: defaults,
    rawText,
  }
}

function normalizeVariableDefaults(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {}

  return Object.entries(value).reduce<Record<string, string>>((acc, [name, rawValue]) => {
    const variableName = name.trim()
    if (!isValidVariableName(variableName)) {
      return acc
    }

    if (typeof rawValue !== 'string') {
      return acc
    }

    const trimmedValue = rawValue.trim()
    if (!trimmedValue) {
      return acc
    }

    acc[variableName] = trimmedValue
    return acc
  }, {})
}

function normalizePromptObject(
  value: Record<string, unknown>,
  knownVariableNames: string[] = [],
): Record<string, unknown> {
  const knownVariableSet = new Set(
    knownVariableNames
      .map((name) => name.trim())
      .filter((name) => isValidVariableName(name)),
  )

  const normalizeString = (content: string): string => {
    let normalized = content.replace(
      /(?<!\{)\{([a-zA-Z0-9_\-\u4e00-\u9fa5]+)\}(?!\})/g,
      '{{$1}}',
    )

    if (knownVariableSet.size === 0) {
      return normalized
    }

    normalized = normalized.replace(
      /「([a-zA-Z0-9_\-\u4e00-\u9fa5]+)」/g,
      (match, rawVariableName: string) => {
        const variableName = rawVariableName.trim()
        return knownVariableSet.has(variableName) ? `{{${variableName}}}` : match
      },
    )

    normalized = normalized.replace(
      /『([a-zA-Z0-9_\-\u4e00-\u9fa5]+)』/g,
      (match, rawVariableName: string) => {
        const variableName = rawVariableName.trim()
        return knownVariableSet.has(variableName) ? `{{${variableName}}}` : match
      },
    )

    return normalized
  }

  const normalize = (current: unknown): unknown => {
    if (typeof current === 'string') {
      return normalizeString(current)
    }

    if (Array.isArray(current)) {
      return current.map((item) => normalize(item))
    }

    if (isRecord(current)) {
      return Object.fromEntries(
        Object.entries(current).map(([key, child]) => [key, normalize(child)]),
      )
    }

    return current
  }

  return normalize(value) as Record<string, unknown>
}

function resolvePromptObject(value: unknown): Record<string, unknown> {
  if (isRecord(value)) {
    return value
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (isRecord(parsed)) {
        return parsed
      }
    } catch {
      // ignore and fall through
    }
  }

  throw new Error('Model response is missing a usable JSON prompt object')
}

function constrainPromptVariables(
  promptObject: Record<string, unknown>,
  defaults: Record<string, string>,
): Record<string, unknown> {
  const variableNames = scanVariablesFromValue(promptObject)
  const keptNames = variableNames.slice(0, MAX_REFERENCE_DIALOG_VARIABLES)
  const keptSet = new Set(keptNames)

  return replacePlaceholdersInValue(promptObject, keptSet, defaults) as Record<string, unknown>
}

function replacePlaceholdersInValue(
  value: unknown,
  keptNames: Set<string>,
  defaults: Record<string, string>,
): unknown {
  if (typeof value === 'string') {
    VARIABLE_VALIDATION.VARIABLE_SCAN_PATTERN.lastIndex = 0

    return value.replace(
      VARIABLE_VALIDATION.VARIABLE_SCAN_PATTERN,
      (match, rawVariableName: string) => {
        const variableName = rawVariableName.trim()

        if (!isValidVariableName(variableName)) {
          return match
        }

        if (keptNames.has(variableName)) {
          return `{{${variableName}}}`
        }

        return defaults[variableName] ?? match
      },
    )
  }

  if (Array.isArray(value)) {
    return value.map((item) => replacePlaceholdersInValue(item, keptNames, defaults))
  }

  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [
        key,
        replacePlaceholdersInValue(child, keptNames, defaults),
      ]),
    )
  }

  return value
}

function buildFilteredDefaults(
  variableNames: string[],
  defaults: Record<string, string>,
): Record<string, string> {
  return variableNames.reduce<Record<string, string>>((acc, name) => {
    if (!isValidVariableName(name)) {
      return acc
    }

    acc[name] = defaults[name] ?? ''
    return acc
  }, {})
}

function parseJsonObject(rawText: string): Record<string, unknown> {
  const trimmed = rawText.trim()
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  const candidate = fencedMatch?.[1]?.trim() || trimmed
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  const jsonText =
    start >= 0 && end >= start
      ? candidate.slice(start, end + 1)
      : candidate

  try {
    const parsed = JSON.parse(jsonText)
    if (!isRecord(parsed)) {
      throw new Error('Model response is not a valid JSON object')
    }
    return parsed
  } catch (error) {
    if (error instanceof Error && error.message === 'Model response is not a valid JSON object') {
      throw error
    }
    throw new Error('Model response is not valid JSON', { cause: error })
  }
}

function createReferencePromptTemplateContext(
  context: {
    originalPrompt: string
    referenceMode: ImagePromptExtractionMode
  },
  template: Template,
): Record<string, string> {
  const isEnglish = template.metadata.language === 'en'
  const trimmedOriginalPrompt = context.originalPrompt.trim()

  return {
    referenceMode: context.referenceMode,
    originalPrompt: trimmedOriginalPrompt,
    generationGoal:
      context.referenceMode === 'image2image'
        ? isEnglish
          ? 'image-to-image reference editing'
          : '图生图参考编辑'
        : isEnglish
          ? 'text-to-image reference generation'
          : '文生图参考生成',
    promptRequirement: trimmedOriginalPrompt
      ? trimmedOriginalPrompt
      : isEnglish
        ? 'No original prompt is provided. Infer a reusable structured image prompt directly from the reference image.'
        : '当前没有原始提示词，请直接根据参考图反推一份可复用的结构化生图提示词。',
  }
}

function collectPromptByRole(messages: Message[], role: Message['role']): string {
  return messages
    .filter((message) => message.role === role && typeof message.content === 'string')
    .map((message) => message.content.trim())
    .filter(Boolean)
    .join('\n\n')
}

function scanVariablesFromValue(value: unknown): string[] {
  const found: string[] = []

  const visitString = (content: string) => {
    VARIABLE_VALIDATION.VARIABLE_SCAN_PATTERN.lastIndex = 0
    const matches = content.matchAll(VARIABLE_VALIDATION.VARIABLE_SCAN_PATTERN)

    for (const match of matches) {
      const variableName = match[1]?.trim() || ''
      if (!variableName || !isValidVariableName(variableName)) continue
      if (!found.includes(variableName)) {
        found.push(variableName)
      }
    }
  }

  const visit = (current: unknown) => {
    if (typeof current === 'string') {
      visitString(current)
      return
    }

    if (Array.isArray(current)) {
      for (const item of current) {
        visit(item)
      }
      return
    }

    if (isRecord(current)) {
      for (const child of Object.values(current)) {
        visit(child)
      }
    }
  }

  visit(value)
  return found
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
