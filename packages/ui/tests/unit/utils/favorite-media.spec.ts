import { describe, expect, it } from 'vitest'
import type { FavoritePrompt } from '@mindsync/core'

import {
  buildFavoriteMediaMetadata,
  parseFavoriteMediaMetadata,
} from '../../../src/utils/favorite-media'

describe('favorite-media utils', () => {
  const baseFavorite: FavoritePrompt = {
    id: 'fav-1',
    title: 'Favorite',
    content: 'Prompt',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    tags: [],
    useCount: 0,
    functionMode: 'basic',
    optimizationMode: 'system',
  }

  it('parses normalized media metadata from favorite metadata', () => {
    const parsed = parseFavoriteMediaMetadata({
      ...baseFavorite,
      metadata: {
        media: {
          coverAssetId: ' img-cover ',
          assetIds: ['img-1', 'img-2', 'img-1'],
          urls: ['https://example.com/a.png', 'https://example.com/a.png'],
        },
      },
    })

    expect(parsed).toEqual({
      coverAssetId: 'img-cover',
      coverUrl: undefined,
      assetIds: ['img-1', 'img-2'],
      urls: ['https://example.com/a.png'],
    })
  })

  it('returns null when media metadata is missing', () => {
    expect(parseFavoriteMediaMetadata(baseFavorite)).toBeNull()
  })

  it('builds normalized media metadata and drops empty payload', () => {
    expect(buildFavoriteMediaMetadata({})).toBeNull()

    const built = buildFavoriteMediaMetadata({
      coverUrl: ' https://example.com/cover.png ',
      assetIds: ['img-1', 'img-1', ''],
      urls: ['https://example.com/a.png', 'https://example.com/a.png'],
    })

    expect(built).toEqual({
      coverAssetId: undefined,
      coverUrl: 'https://example.com/cover.png',
      assetIds: ['img-1'],
      urls: ['https://example.com/a.png'],
    })
  })
})
