import { describe, expect, it } from 'vitest'
import type { FavoritePrompt } from '@mindsync/core'

import {
  parseFavoriteGardenSnapshotPreview,
  parseGardenSnapshotPreview,
} from '../../../src/utils/garden-snapshot-preview'

describe('garden-snapshot-preview utils', () => {
  it('normalizes a garden snapshot payload for preview rendering', () => {
    const parsed = parseGardenSnapshotPreview({
      schema: 'prompt-garden.prompt.v1',
      schemaVersion: 1,
      importCode: '  ABC-123  ',
      gardenBaseUrl: ' https://garden.example.com ',
      meta: {
        title: ' Demo Title ',
        description: ' Demo Description ',
        tags: ['tag-a', 'tag-a', 'tag-b', ''],
      },
      variables: [
        {
          name: 'style',
          type: 'enum',
          required: true,
          options: ['cinematic', 'cinematic', 'anime'],
          defaultValue: 'cinematic',
          description: 'Output style',
        },
        {
          name: '  ',
          type: 'string',
        },
      ],
      assets: {
        cover: {
          url: 'https://cdn.example.com/cover.png',
        },
        showcases: [
          {
            id: 'showcase-1',
            url: 'https://cdn.example.com/showcase-main.png',
            images: [
              'https://cdn.example.com/showcase-main.png',
              'https://cdn.example.com/showcase-2.png',
            ],
          },
        ],
        examples: [
          {
            id: 'example-1',
            text: 'Prompt text',
            parameters: {
              width: 1024,
              quality: 'high',
            },
            inputImages: ['https://cdn.example.com/input-a.png', 'https://cdn.example.com/input-a.png'],
          },
        ],
      },
    })

    expect(parsed).not.toBeNull()
    expect(parsed?.importCode).toBe('ABC-123')
    expect(parsed?.gardenBaseUrl).toBe('https://garden.example.com')
    expect(parsed?.meta.title).toBe('Demo Title')
    expect(parsed?.meta.description).toBe('Demo Description')
    expect(parsed?.meta.tags).toEqual(['tag-a', 'tag-b'])

    expect(parsed?.variables).toHaveLength(1)
    expect(parsed?.variables[0]).toMatchObject({
      name: 'style',
      type: 'enum',
      required: true,
      options: ['cinematic', 'anime'],
      defaultValue: 'cinematic',
    })

    expect(parsed?.coverUrl).toBe('https://cdn.example.com/cover.png')
    expect(parsed?.showcases).toHaveLength(1)
    expect(parsed?.showcases[0]?.images).toEqual([
      'https://cdn.example.com/showcase-main.png',
      'https://cdn.example.com/showcase-2.png',
    ])

    expect(parsed?.examples).toHaveLength(1)
    expect(parsed?.examples[0]?.parameters).toEqual({
      width: '1024',
      quality: 'high',
    })
    expect(parsed?.examples[0]?.inputImages).toEqual(['https://cdn.example.com/input-a.png'])
  })

  it('returns null for invalid or empty snapshot payloads', () => {
    expect(parseGardenSnapshotPreview(null)).toBeNull()
    expect(parseGardenSnapshotPreview(undefined)).toBeNull()
    expect(parseGardenSnapshotPreview('invalid')).toBeNull()
    expect(parseGardenSnapshotPreview({ assets: { examples: [] } })).toBeNull()
  })

  it('extracts garden snapshot only when favorite metadata contains valid payload', () => {
    const baseFavorite: FavoritePrompt = {
      id: 'fav-1',
      title: 'Favorite',
      content: 'Prompt content',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tags: [],
      useCount: 0,
      functionMode: 'basic',
      optimizationMode: 'system',
    }

    expect(parseFavoriteGardenSnapshotPreview(baseFavorite)).toBeNull()

    const withSnapshot: FavoritePrompt = {
      ...baseFavorite,
      metadata: {
        gardenSnapshot: {
          importCode: 'X1',
          assets: {
            examples: [
              {
                id: 'example',
                inputImages: ['https://cdn.example.com/input.png'],
              },
            ],
          },
        },
      },
    }

    const parsed = parseFavoriteGardenSnapshotPreview(withSnapshot)
    expect(parsed).not.toBeNull()
    expect(parsed?.importCode).toBe('X1')
    expect(parsed?.examples).toHaveLength(1)
  })
})
