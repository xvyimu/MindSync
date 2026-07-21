import type { PromptRecordChain, PromptRecordType } from '@mindsync/core'
import { v4 as uuidv4 } from 'uuid'

export const createImagePromptAnalysisVersion = (
  prompt: string,
  type: PromptRecordType,
): PromptRecordChain['versions'][number] => {
  const id = uuidv4()

  return {
    id,
    chainId: '',
    version: 0,
    originalPrompt: prompt,
    optimizedPrompt: prompt,
    type,
    timestamp: Date.now(),
    modelKey: '',
    templateId: '',
  }
}
