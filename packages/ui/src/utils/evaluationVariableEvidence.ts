import { PREDEFINED_VARIABLES } from '@mindsync/core'

const VARIABLE_TOKEN_PATTERN = /\{\{\s*([^{}]+?)\s*\}\}/g

export const collectReferencedBusinessVariableNames = (promptText: string): string[] => {
  const referenced = new Set<string>()
  const predefined = new Set<string>(PREDEFINED_VARIABLES)

  VARIABLE_TOKEN_PATTERN.lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = VARIABLE_TOKEN_PATTERN.exec(promptText)) !== null) {
    const name = match[1]?.trim() || ''
    if (!name || predefined.has(name)) continue
    referenced.add(name)
  }

  return Array.from(referenced)
}

export const formatVariableEvidenceEntries = (
  entries: Array<{ name: string; value?: string }>,
  emptyFallback: string,
): string => {
  if (!entries.length) return emptyFallback

  return entries
    .map((entry) => `${entry.name}=${String(entry.value ?? '')}`)
    .join('\n')
}
