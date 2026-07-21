import { describe, expect, it } from 'vitest'

import {
  PROMPT_MODEL_SCHEMA_VERSION,
  createPromptContract,
  type PromptAsset,
  type PromptModeKey,
} from '@mindsync/core'
import {
  createFavoriteWorkspaceApplyDraft,
  promptModeKeyToWorkspaceTargetKey,
} from '../../../src/utils/favorite-workspace-apply'

const createAsset = (overrides: Partial<PromptAsset> = {}): PromptAsset => ({
  schemaVersion: PROMPT_MODEL_SCHEMA_VERSION,
  id: 'asset-1',
  title: 'Asset prompt',
  tags: [],
  contract: createPromptContract('basic-system'),
  currentVersionId: 'version-1',
  versions: [
    {
      id: 'version-1',
      version: 1,
      content: { kind: 'text', text: 'Asset current prompt' },
      createdAt: 1,
    },
  ],
  examples: [],
  createdAt: 1,
  updatedAt: 2,
  ...overrides,
})

describe('favorite-workspace-apply', () => {
  it('maps standard prompt modes to existing workspace target keys', () => {
    const cases: Array<[PromptModeKey, string]> = [
      ['basic-system', 'basic-system'],
      ['basic-user', 'basic-user'],
      ['pro-variable', 'pro-variable'],
      ['pro-conversation', 'pro-multi'],
      ['image-text2image', 'image-text2image'],
      ['image-image2image', 'image-image2image'],
      ['image-multiimage', 'image-multiimage'],
    ]

    for (const [modeKey, targetKey] of cases) {
      expect(promptModeKeyToWorkspaceTargetKey(modeKey)).toBe(targetKey)
    }
  })

  it('uses the prompt asset current version content before legacy favorite content', () => {
    const promptAsset = createAsset({
      contract: createPromptContract('basic-user'),
      currentVersionId: 'version-2',
      versions: [
        {
          id: 'version-1',
          version: 1,
          content: { kind: 'text', text: 'Old asset prompt' },
          createdAt: 1,
        },
        {
          id: 'version-2',
          version: 2,
          content: { kind: 'text', text: 'New asset prompt' },
          createdAt: 2,
        },
      ],
    })

    const draft = createFavoriteWorkspaceApplyDraft({
      content: 'Legacy favorite prompt',
      functionMode: 'basic',
      optimizationMode: 'system',
      metadata: { promptAsset },
    })

    expect(draft.targetKey).toBe('basic-user')
    expect(draft.favoriteMode).toEqual({ functionMode: 'basic', optimizationMode: 'user' })
    expect(draft.content).toBe('New asset prompt')
    expect(draft.promptContent).toEqual({ kind: 'text', text: 'New asset prompt' })
  })

  it('falls back to legacy content when the current asset version is missing', () => {
    const promptAsset = createAsset({
      currentVersionId: 'missing-version',
      versions: [
        {
          id: 'version-1',
          version: 1,
          content: { kind: 'text', text: 'Stale asset prompt' },
          createdAt: 1,
        },
      ],
    })

    const draft = createFavoriteWorkspaceApplyDraft({
      content: 'Legacy fallback prompt',
      functionMode: 'basic',
      optimizationMode: 'system',
      metadata: { promptAsset },
    })

    expect(draft.targetKey).toBe('basic-system')
    expect(draft.content).toBe('Legacy fallback prompt')
    expect(draft.promptContent).toBeNull()
  })

  it('keeps legacy favorites behavior when no prompt asset is present', () => {
    expect(createFavoriteWorkspaceApplyDraft({
      content: 'Legacy pro prompt',
      functionMode: 'context',
      optimizationMode: 'system',
    }).targetKey).toBe('pro-multi')

    const defaultProDraft = createFavoriteWorkspaceApplyDraft({
      content: 'Legacy default pro prompt',
      functionMode: 'context',
    })
    expect(defaultProDraft.targetKey).toBe('pro-variable')
    expect(defaultProDraft.favoriteMode).toEqual({ functionMode: 'context' })

    expect(createFavoriteWorkspaceApplyDraft({
      content: 'Legacy image prompt',
      functionMode: 'image',
      imageSubMode: 'multiimage',
    }).targetKey).toBe('image-multiimage')
  })

  it('selects examples through the prompt asset projection before legacy metadata', () => {
    const promptAsset = createAsset({
      contract: createPromptContract('pro-variable', {
        variables: [{ name: 'topic', required: false }],
      }),
      examples: [
        {
          id: 'asset-first',
          basedOnVersionId: 'version-1',
          input: { parameters: { topic: 'alpha' } },
        },
        {
          id: 'asset-second',
          basedOnVersionId: 'version-1',
          input: { text: 'Asset example input', parameters: { topic: 'beta' } },
        },
      ],
    })

    const draft = createFavoriteWorkspaceApplyDraft({
      content: 'Write about {{topic}}',
      functionMode: 'context',
      optimizationMode: 'user',
      metadata: {
        promptAsset,
        reproducibility: {
          variables: [{ name: 'topic', defaultValue: 'legacy' }],
          examples: [{ id: 'legacy-example', parameters: { topic: 'legacy' } }],
        },
      },
    }, {
      applyExample: true,
      exampleId: 'asset-second',
    })

    expect(draft.targetKey).toBe('pro-variable')
    expect(draft.reproducibility.source).toBe('promptAsset')
    expect(draft.selectedExample?.id).toBe('asset-second')
    expect(draft.selectedExample?.parameters).toEqual({ topic: 'beta' })
    expect(draft.selectedExampleText).toBe('Asset example input')
  })

  it('degrades message content to role-labeled non-empty messages for workspace application', () => {
    const promptAsset = createAsset({
      contract: createPromptContract('pro-conversation'),
      currentVersionId: 'messages-version',
      versions: [
        {
          id: 'messages-version',
          version: 1,
          content: {
            kind: 'messages',
            messages: [
              { role: 'system', content: '   ' },
              { role: 'system', content: 'You are concise.' },
              { role: 'user', content: 'Summarize {{topic}}.' },
            ],
          },
          createdAt: 1,
        },
      ],
    })

    const draft = createFavoriteWorkspaceApplyDraft({
      content: 'Legacy message fallback',
      functionMode: 'context',
      optimizationMode: 'system',
      metadata: { promptAsset },
    })

    expect(draft.targetKey).toBe('pro-multi')
    expect(draft.content).toBe('[system]\nYou are concise.\n\n[user]\nSummarize {{topic}}.')
    expect(draft.promptContent?.kind).toBe('messages')
    expect(draft.conversationMessages).toEqual([
      expect.objectContaining({
        id: 'favorite-asset-asset-1-messages-version-message-1',
        role: 'system',
        content: '   ',
        originalContent: '   ',
      }),
      expect.objectContaining({
        id: 'favorite-asset-asset-1-messages-version-message-2',
        role: 'system',
        content: 'You are concise.',
        originalContent: 'You are concise.',
      }),
      expect.objectContaining({
        id: 'favorite-asset-asset-1-messages-version-message-3',
        role: 'user',
        content: 'Summarize {{topic}}.',
        originalContent: 'Summarize {{topic}}.',
      }),
    ])
  })

  it('uses selected example messages before asset template messages', () => {
    const promptAsset = createAsset({
      contract: createPromptContract('pro-conversation'),
      currentVersionId: 'messages-version',
      versions: [
        {
          id: 'messages-version',
          version: 1,
          content: {
            kind: 'messages',
            messages: [
              { role: 'system', content: 'Asset template system' },
              { role: 'user', content: 'Asset template user' },
            ],
          },
          createdAt: 1,
        },
      ],
      examples: [
        {
          id: 'example-1',
          basedOnVersionId: 'messages-version',
          input: {
            messages: [
              { role: 'system', content: 'Example system' },
              {
                id: 'example-user-message',
                role: 'user',
                content: 'Example user',
                originalContent: 'Original example user',
              },
              {
                id: 'example-user-message',
                role: 'assistant',
                content: 'Tool call',
                name: 'lookup',
                tool_calls: [
                  {
                    id: 'call-1',
                    type: 'function',
                    function: { name: 'search', arguments: '{}' },
                  },
                ],
              },
              { role: 'tool', content: 'Tool result', tool_call_id: 'call-1' },
            ],
          },
        },
      ],
    })

    const draft = createFavoriteWorkspaceApplyDraft({
      content: 'Legacy message fallback',
      functionMode: 'context',
      optimizationMode: 'system',
      metadata: { promptAsset },
    }, {
      applyExample: true,
      exampleId: 'example-1',
    })

    expect(draft.targetKey).toBe('pro-multi')
    expect(draft.content).toBe('[system]\nExample system\n\n[user]\nExample user\n\n[assistant]\nTool call\n\n[tool]\nTool result')
    expect(draft.selectedExample?.id).toBe('example-1')
    expect(draft.conversationMessages).toEqual([
      expect.objectContaining({
        id: 'favorite-example-example-1-message-1',
        role: 'system',
        content: 'Example system',
        originalContent: 'Example system',
      }),
      expect.objectContaining({
        id: 'example-user-message',
        role: 'user',
        content: 'Example user',
        originalContent: 'Original example user',
      }),
      expect.objectContaining({
        id: 'favorite-example-example-1-message-3',
        role: 'assistant',
        content: 'Tool call',
        name: 'lookup',
        tool_calls: [
          {
            id: 'call-1',
            type: 'function',
            function: { name: 'search', arguments: '{}' },
          },
        ],
      }),
      expect.objectContaining({
        id: 'favorite-example-example-1-message-4',
        role: 'tool',
        content: 'Tool result',
        tool_call_id: 'call-1',
      }),
    ])
  })
})
