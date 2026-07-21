import { describe, expect, it } from 'vitest'

import {
  appendFavoriteReproducibilityDraftToMetadata,
  applyFavoriteReproducibilityToMetadata,
  assignSequentialFavoriteExampleIds,
  createFavoriteReproducibilityProjection,
  favoriteReproducibilityExampleFromPromptExample,
  parseFavoriteReproducibility,
  parseFavoriteReproducibilityFromMetadata,
  pickFavoriteReproducibilityExample,
} from '../../../src/utils/favorite-reproducibility'
import {
  PROMPT_MODEL_SCHEMA_VERSION,
  createPromptContract,
  type FavoritePrompt,
  type PromptAsset,
} from '@mindsync/core'

const createFavorite = (overrides: Partial<FavoritePrompt> = {}): FavoritePrompt => ({
  id: 'fav-1',
  title: 'Favorite title',
  content: 'Write a concise summary.',
  createdAt: 1000,
  updatedAt: 2000,
  tags: [],
  useCount: 0,
  functionMode: 'basic',
  optimizationMode: 'system',
  ...overrides,
})

describe('favorite-reproducibility', () => {
  it('parses Prompt Garden variables and examples from metadata', () => {
    const repro = parseFavoriteReproducibilityFromMetadata({
      gardenSnapshot: {
        variables: [
          {
            name: 'style',
            defaultValue: 'watercolor',
            required: true,
            description: 'Rendering style',
          },
        ],
        assets: {
          examples: [
            {
              id: 'example-1',
              parameters: {
                style: 'ink',
              },
              inputImages: ['https://example.com/input.png'],
            },
          ],
        },
      },
    })

    expect(repro.source).toBe('garden')
    expect(repro.variableCount).toBe(1)
    expect(repro.exampleCount).toBe(1)
    expect(repro.hasInputImages).toBe(true)
    expect(repro.variables[0]).toMatchObject({
      name: 'style',
      defaultValue: 'watercolor',
      required: true,
    })
    expect(repro.examples[0]?.parameters).toEqual({ style: 'ink' })
  })

  it('projects a full favorite through a generated prompt asset before reading reproducibility', () => {
    const favorite = createFavorite({
      metadata: {
        gardenSnapshot: {
          variables: [{ name: 'style', required: true }],
          assets: {
            examples: [{ id: 'example-1', parameters: { style: 'ink' } }],
          },
        },
      },
    })
    const projection = createFavoriteReproducibilityProjection(favorite)
    const repro = parseFavoriteReproducibility(favorite)

    expect(projection.promptAsset?.source).toEqual({ kind: 'garden', id: 'fav-1' })
    expect(repro.source).toBe('promptAsset')
    expect(repro.variableCount).toBe(1)
    expect(repro.exampleCount).toBe(1)
  })

  it('prefers a non-destructive reproducibility draft over Garden data when both exist', () => {
    const repro = parseFavoriteReproducibilityFromMetadata({
      gardenSnapshot: {
        variables: [{ name: 'gardenStyle', required: true }],
        assets: {
          examples: [{ id: 'garden-example', parameters: { gardenStyle: 'ink' } }],
        },
      },
      reproducibility: {
        variables: [{ name: 'draftTopic', required: true }],
        examples: [{ id: 'draft-example', parameters: { draftTopic: 'release' } }],
      },
    })

    expect(repro.source).toBe('reproducibility')
    expect(repro.variables.map((variable) => variable.name)).toEqual(['draftTopic'])
    expect(repro.examples.map((example) => example.id)).toEqual(['draft-example'])
  })

  it('prefers embedded prompt assets for read-only favorite reproducibility', () => {
    const promptAsset: PromptAsset = {
      schemaVersion: PROMPT_MODEL_SCHEMA_VERSION,
      id: 'asset-1',
      title: 'Embedded asset',
      tags: [],
      contract: createPromptContract('image-image2image', {
        variables: [
          {
            name: 'style',
            description: 'Rendering style',
            type: 'enum',
            required: true,
            defaultValue: 'watercolor',
            options: ['watercolor', 'ink'],
            source: 'asset',
          },
        ],
      }),
      currentVersionId: 'version-1',
      versions: [
        {
          id: 'version-1',
          version: 1,
          content: {
            kind: 'image-prompt',
            text: 'Create a poster for {{style}}.',
          },
          createdAt: 1,
        },
      ],
      examples: [
        {
          id: 'example-1',
          basedOnVersionId: 'version-1',
          title: 'Sample',
          input: {
            text: 'Create a poster',
            parameters: {
              style: 'ink',
            },
            images: [
              { kind: 'url', url: 'https://example.com/input.png' },
              { kind: 'asset', assetId: 'input-asset-1' },
            ],
          },
          output: {
            images: [
              { kind: 'url', url: 'https://example.com/output.png' },
              { kind: 'asset', assetId: 'output-asset-1' },
            ],
          },
        },
      ],
      createdAt: 1,
      updatedAt: 2,
    }

    const repro = parseFavoriteReproducibility(createFavorite({
      metadata: {
        promptAsset,
        gardenSnapshot: {
          variables: [{ name: 'ignored' }],
        },
      },
    }))

    expect(repro.source).toBe('promptAsset')
    expect(repro.variables[0]).toEqual({
      name: 'style',
      description: 'Rendering style',
      type: 'enum',
      required: true,
      defaultValue: 'watercolor',
      options: ['watercolor', 'ink'],
      source: 'asset',
    })
    expect(repro.examples[0]).toMatchObject({
      id: 'example-1',
      text: 'Create a poster',
      description: 'Sample',
      parameters: { style: 'ink' },
      images: ['https://example.com/output.png'],
      imageAssetIds: ['output-asset-1'],
      inputImages: ['https://example.com/input.png'],
      inputImageAssetIds: ['input-asset-1'],
    })
  })

  it('projects PromptExample messages, output text, image refs, and metadata', () => {
    const example = favoriteReproducibilityExampleFromPromptExample({
      id: 'test-run:run-1',
      basedOnVersionId: 'version-1',
      input: {
        text: 'Summarize {{topic}}',
        messages: [
          { id: 'msg-1', role: 'system', content: 'Be concise.' },
          { id: 'msg-2', role: 'user', content: 'Topic: {{topic}}' },
        ],
        parameters: { topic: 'release' },
        images: [
          { kind: 'url', url: 'https://example.com/input.png' },
          { kind: 'asset', assetId: 'input-asset' },
        ],
      },
      output: {
        text: 'Release summary.',
        images: [
          { kind: 'url', url: 'https://example.com/output.png' },
          { kind: 'asset', assetId: 'output-asset' },
        ],
      },
      metadata: {
        testRunId: 'run-1',
      },
      source: {
        kind: 'workspace',
        id: 'implicit:basic-system',
        metadata: {
          assetBinding: {
            assetId: 'asset-1',
            versionId: 'version-1',
            status: 'linked',
          },
        },
      },
    })

    expect(example).toMatchObject({
      id: 'test-run:run-1',
      basedOnVersionId: 'version-1',
      text: 'Summarize {{topic}}',
      messages: [
        { id: 'msg-1', role: 'system', content: 'Be concise.' },
        { id: 'msg-2', role: 'user', content: 'Topic: {{topic}}' },
      ],
      parameters: { topic: 'release' },
      outputText: 'Release summary.',
      images: ['https://example.com/output.png'],
      imageAssetIds: ['output-asset'],
      inputImages: ['https://example.com/input.png'],
      inputImageAssetIds: ['input-asset'],
      source: {
        kind: 'workspace',
        id: 'implicit:basic-system',
        metadata: {
          assetBinding: {
            assetId: 'asset-1',
            versionId: 'version-1',
            status: 'linked',
          },
        },
      },
      metadata: {
        testRunId: 'run-1',
      },
    })
  })

  it('round-trips messages and output text through favorite metadata', () => {
    const next = applyFavoriteReproducibilityToMetadata({}, {
      variables: [],
      examples: [
        {
          id: 'conversation-example',
          basedOnVersionId: 'version-1',
          source: { kind: 'workspace', id: 'implicit:pro-conversation' },
          messages: [
            { id: 'msg-1', role: 'system', content: 'Be concise.' },
            { id: 'msg-2', role: 'user', content: 'Summarize {{topic}}.' },
          ],
          parameters: { topic: 'release' },
          outputText: 'Concise release summary.',
          images: [],
          imageAssetIds: [],
          inputImages: [],
          inputImageAssetIds: [],
          metadata: { testRunId: 'run-1' },
        },
      ],
    })

    const repro = parseFavoriteReproducibilityFromMetadata(next)
    expect(repro.examples[0]).toMatchObject({
      id: 'conversation-example',
      basedOnVersionId: 'version-1',
      source: { kind: 'workspace', id: 'implicit:pro-conversation' },
      messages: [
        { id: 'msg-1', role: 'system', content: 'Be concise.' },
        { id: 'msg-2', role: 'user', content: 'Summarize {{topic}}.' },
      ],
      parameters: { topic: 'release' },
      outputText: 'Concise release summary.',
      metadata: { testRunId: 'run-1' },
    })
  })

  it('appends test example drafts while preserving existing variables and external metadata', () => {
    const promptAsset: PromptAsset = {
      schemaVersion: PROMPT_MODEL_SCHEMA_VERSION,
      id: 'asset-1',
      title: 'Embedded asset',
      tags: [],
      contract: createPromptContract('basic-system', {
        variables: [
          {
            name: 'topic',
            description: 'Existing topic',
            required: true,
            options: [],
            source: 'asset',
          },
        ],
      }),
      currentVersionId: 'version-1',
      versions: [
        {
          id: 'version-1',
          version: 1,
          content: {
            kind: 'text',
            text: 'Summarize {{topic}}.',
          },
          createdAt: 1,
        },
      ],
      examples: [
        {
          id: 'existing-example',
          basedOnVersionId: 'version-1',
          input: {
            text: 'Summarize release notes.',
            parameters: {
              topic: 'release',
            },
          },
          output: {
            text: 'Existing output.',
          },
        },
      ],
      createdAt: 1,
      updatedAt: 2,
    }
    const gardenSnapshot = {
      importCode: 'garden-1',
      variables: [{ name: 'gardenOnly' }],
    }
    const next = appendFavoriteReproducibilityDraftToMetadata(createFavorite({
      metadata: {
        promptAsset,
        gardenSnapshot,
        modelKey: 'model-a',
      },
    }), {
      variables: [
        {
          name: 'topic',
          required: false,
          options: [],
          source: 'test-run',
        },
        {
          name: 'audience',
          required: false,
          options: [],
          source: 'test-run',
        },
      ],
      examples: [
        {
          id: 'new-example',
          basedOnVersionId: 'implicit:basic-system:draft',
          text: 'Summarize for executives.',
          parameters: {
            topic: 'roadmap',
            audience: 'executives',
          },
          outputText: 'New output.',
          images: [],
          imageAssetIds: [],
          inputImages: [],
          inputImageAssetIds: [],
          source: {
            kind: 'workspace',
            id: 'implicit:basic-system',
            metadata: {
              origin: { kind: 'favorite', id: 'fav-1' },
            },
          },
          metadata: {
            modelKey: 'text-model',
          },
        },
      ],
    })

    expect(next.promptAsset).toBe(promptAsset)
    expect(next.gardenSnapshot).toBe(gardenSnapshot)
    expect(next.modelKey).toBe('model-a')

    const repro = parseFavoriteReproducibilityFromMetadata(next)
    expect(repro.variables.map((variable) => variable.name)).toEqual(['topic', 'audience'])
    expect(repro.variables[0]).toMatchObject({
      name: 'topic',
      description: 'Existing topic',
      required: true,
      source: 'asset',
    })
    expect(repro.examples.map((example) => example.id)).toEqual(['existing-example', 'new-example'])
    expect(repro.examples[1]).toMatchObject({
      basedOnVersionId: 'implicit:basic-system:draft',
      parameters: {
        topic: 'roadmap',
        audience: 'executives',
      },
      outputText: 'New output.',
      metadata: {
        modelKey: 'text-model',
      },
    })
  })

  it('picks favorite examples using the shared asset projection helper', () => {
    const projection = createFavoriteReproducibilityProjection(createFavorite({
      metadata: {
        reproducibility: {
          variables: [{ name: 'topic' }],
          examples: [
            { id: 'first', parameters: { topic: 'alpha' } },
            { id: 'second', parameters: { topic: 'beta' } },
          ],
        },
      },
    }))

    expect(pickFavoriteReproducibilityExample(
      projection.reproducibility.examples,
      { applyExample: true, exampleId: 'second' },
    )?.parameters).toEqual({ topic: 'beta' })
    expect(pickFavoriteReproducibilityExample(
      projection.reproducibility.examples,
      { applyExample: true, exampleIndex: 0 },
    )?.id).toBe('first')
    expect(pickFavoriteReproducibilityExample(
      projection.reproducibility.examples,
      { applyExample: false, exampleId: 'first' },
    )).toBeNull()
  })

  it('assigns short sequential ids to implicit test-run examples', () => {
    const examples = assignSequentialFavoriteExampleIds(
      [
        { id: 'ex-001', parameters: { topic: 'old' } },
        { id: 'manual-case', parameters: { topic: 'manual' } },
      ],
      [
        {
          id: 'test-run:implicit:image-text2image:test:b',
          parameters: { topic: 'new' },
          metadata: { testRunId: 'run-1' },
        },
        {
          id: 'custom-case',
          parameters: { topic: 'custom' },
        },
      ],
    )

    expect(examples.map((example) => example.id)).toEqual(['ex-003', 'custom-case'])
    expect(examples[0].metadata).toEqual({ testRunId: 'run-1' })
  })

  it('renumbers pre-normalized draft ids when updating an existing favorite', () => {
    const examples = assignSequentialFavoriteExampleIds(
      [
        { id: 'ex-001', parameters: { topic: 'first' } },
        { id: 'ex-002', parameters: { topic: 'second' } },
      ],
      [
        {
          id: 'ex-001',
          parameters: { topic: 'incoming' },
          metadata: { testRunId: 'run-1' },
        },
      ],
    )

    expect(examples).toEqual([
      expect.objectContaining({
        id: 'ex-003',
        parameters: { topic: 'incoming' },
        metadata: { testRunId: 'run-1' },
      }),
    ])
  })

  it('keeps Garden snapshots immutable and stores drafts under namespaced metadata', () => {
    const metadata = {
      modelKey: 'model-a',
      gardenSnapshot: {
        importCode: 'abc',
        assets: {
          cover: {
            assetId: 'cover-1',
          },
        },
      },
    }

    const next = applyFavoriteReproducibilityToMetadata(metadata, {
      variables: [
        {
          name: 'theme',
          required: false,
          defaultValue: 'forest',
          options: ['forest', 'city'],
        },
      ],
      examples: [
        {
          id: 'sample',
          parameters: {
            theme: 'city',
          },
          images: [],
          imageAssetIds: [],
          inputImages: [],
          inputImageAssetIds: [],
        },
      ],
    })

    expect(next.modelKey).toBe('model-a')
    expect(next.gardenSnapshot).toEqual(metadata.gardenSnapshot)
    expect(next.reproducibility).toEqual({
      variables: [
        {
          name: 'theme',
          defaultValue: 'forest',
          options: ['forest', 'city'],
        },
      ],
      examples: [
        {
          id: 'sample',
          parameters: {
            theme: 'city',
          },
        },
      ],
    })
  })

  it('stores new non-Garden configuration under namespaced metadata', () => {
    const next = applyFavoriteReproducibilityToMetadata({}, {
      variables: [
        {
          name: 'audience',
          required: true,
          options: [],
        },
      ],
      examples: [],
    })

    expect(next).toEqual({
      reproducibility: {
        variables: [
          {
            name: 'audience',
            required: true,
          },
        ],
        examples: [],
      },
    })
  })

  it('normalizes legacy metadata variables and examples into reproducibility on write', () => {
    const next = applyFavoriteReproducibilityToMetadata({
      variables: [{ name: 'legacyTopic' }],
      examples: [{ id: 'legacy-example' }],
      modelKey: 'model-a',
    }, {
      variables: [
        {
          name: 'topic',
          required: false,
          options: [],
        },
      ],
      examples: [
        {
          id: 'draft-example',
          parameters: { topic: 'release' },
          images: [],
          imageAssetIds: [],
          inputImages: [],
          inputImageAssetIds: [],
        },
      ],
    })

    expect(next.variables).toBeUndefined()
    expect(next.examples).toBeUndefined()
    expect(next.modelKey).toBe('model-a')
    expect(next.reproducibility).toEqual({
      variables: [{ name: 'topic' }],
      examples: [{ id: 'draft-example', parameters: { topic: 'release' } }],
    })
  })
})
