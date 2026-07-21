import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockUnderstand, mockProcessTemplate } = vi.hoisted(() => ({
  mockUnderstand: vi.fn(),
  mockProcessTemplate: vi.fn(),
}))

vi.mock('@mindsync/core', async () => {
  const actual = await vi.importActual<typeof import('@mindsync/core')>(
    '@mindsync/core',
  )

  return {
    ...actual,
    createImageUnderstandingService: () => ({
      understand: mockUnderstand,
    }),
    TemplateProcessor: {
      processTemplate: mockProcessTemplate,
    },
  }
})

import { resolveReferencePromptPreview } from '../../../src/services/ImageStyleExtractor'

describe('ImageStyleExtractor reference migration pipeline', () => {
  const modelConfig = {
    provider: 'gemini',
    model: 'gemini-2.5-flash',
    apiKey: 'test-key',
  } as any

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('按参考图生成时，单次视觉调用直接返回最终提示词和变量', async () => {
    const templateManager = {
      getTemplate: vi.fn().mockResolvedValue({
        id: 'image-prompt-from-reference-image',
        name: 'Generate Prompt From Reference Image',
        content: 'unused',
        metadata: {
          version: '1.0.0',
          lastModified: Date.now(),
          templateType: 'image-prompt-composition',
          language: 'zh',
        },
      }),
    }

    mockProcessTemplate.mockReturnValue([
      { role: 'system', content: 'generate prompt from image' },
      { role: 'user', content: 'describe the image and return prompt plus defaults' },
    ])

    mockUnderstand.mockResolvedValue({
      content: JSON.stringify({
        prompt: {
          场景: {
            主体: '一只{{主体颜色}}的猫',
            风格: '胶片感插画',
          },
        },
        defaults: {
          主体颜色: '棕色',
        },
      }),
    })

    const phases: string[] = []
    const preview = await resolveReferencePromptPreview({
      mode: 'replicate',
      originalPrompt: '',
      imageB64: 'ZmFrZS1pbWFnZQ==',
      mimeType: 'image/png',
      modelConfig,
      templateManager: templateManager as any,
      referenceMode: 'text2image',
      onStageChange: (stage) => phases.push(stage),
    })

    expect(templateManager.getTemplate).toHaveBeenCalledWith('image-prompt-from-reference-image')
    expect(mockUnderstand).toHaveBeenCalledTimes(1)
    expect(mockUnderstand).toHaveBeenCalledWith(
      expect.objectContaining({
        modelConfig,
        systemPrompt: 'generate prompt from image',
        userPrompt: 'describe the image and return prompt plus defaults',
        responseMimeType: 'application/json',
        images: [
          {
            b64: 'ZmFrZS1pbWFnZQ==',
            mimeType: 'image/png',
          },
        ],
      }),
    )
    expect(preview.prompt).toContain('{{主体颜色}}')
    expect(preview.variableDefaults).toEqual({
      主体颜色: '棕色',
    })
    expect(preview.rawText).toContain('"defaults"')
    expect(phases).toEqual(['generating-preview'])
  })

  it('风格迁移时，单次视觉调用保留原始主体语义并吸收参考图风格', async () => {
    const templateManager = {
      getTemplate: vi.fn().mockResolvedValue({
        id: 'image-prompt-migration',
        name: 'Migrate Prompt With Reference Image',
        content: 'unused',
        metadata: {
          version: '1.0.0',
          lastModified: Date.now(),
          templateType: 'image-prompt-migration',
          language: 'zh',
        },
      }),
    }

    mockProcessTemplate.mockReturnValue([
      { role: 'system', content: 'migrate prompt with image style' },
      { role: 'user', content: 'keep original subject, transfer the image style' },
    ])

    mockUnderstand.mockResolvedValue({
      content: JSON.stringify({
        prompt: {
          场景: {
            主体: '两只{{主体颜色}}的猫',
            气氛: '胶片感、傍晚逆光',
          },
        },
        defaults: {
          主体颜色: '棕色',
          参考主体: '金毛犬',
        },
      }),
    })

    const preview = await resolveReferencePromptPreview({
      mode: 'migrate',
      originalPrompt: '两只棕色的猫',
      imageB64: 'ZmFrZS1pbWFnZQ==',
      mimeType: 'image/png',
      modelConfig,
      templateManager: templateManager as any,
      referenceMode: 'text2image',
    })

    expect(templateManager.getTemplate).toHaveBeenCalledWith('image-prompt-migration')
    expect(mockUnderstand).toHaveBeenCalledTimes(1)
    expect(preview.prompt).toContain('两只{{主体颜色}}的猫')
    expect(preview.prompt).toContain('胶片感、傍晚逆光')
    expect(preview.prompt).not.toContain('金毛犬')
    expect(preview.variableDefaults).toEqual({
      主体颜色: '棕色',
    })
  })

  it('复刻图片时即使当前已有原始提示词，也只根据参考图生成结果', async () => {
    const templateManager = {
      getTemplate: vi.fn().mockResolvedValue({
        id: 'image-prompt-from-reference-image',
        name: 'Generate Prompt From Reference Image',
        content: 'unused',
        metadata: {
          version: '1.0.0',
          lastModified: Date.now(),
          templateType: 'image-prompt-composition',
          language: 'zh',
        },
      }),
    }

    mockProcessTemplate.mockImplementation((_template, context) => {
      expect(context).toMatchObject({
        originalPrompt: '',
      })
      expect(context.promptRequirement).toContain('当前没有原始提示词')

      return [
        { role: 'system', content: 'replicate from image only' },
        { role: 'user', content: 'ignore current prompt and reconstruct from the image' },
      ]
    })

    mockUnderstand.mockResolvedValue({
      content: JSON.stringify({
        prompt: {
          场景: {
            主体: '一只{{主体颜色}}的小猫',
            构图: '居中近景',
          },
        },
        defaults: {
          主体颜色: '橘色',
        },
      }),
    })

    const preview = await resolveReferencePromptPreview({
      mode: 'replicate',
      originalPrompt: '两只棕色的猫，发在朋友圈',
      imageB64: 'ZmFrZS1pbWFnZQ==',
      mimeType: 'image/png',
      modelConfig,
      templateManager: templateManager as any,
      referenceMode: 'text2image',
    })

    expect(templateManager.getTemplate).toHaveBeenCalledWith('image-prompt-from-reference-image')
    expect(mockUnderstand).toHaveBeenCalledTimes(1)
    expect(preview.prompt).toContain('{{主体颜色}}')
    expect(preview.prompt).not.toContain('朋友圈')
    expect(preview.variableDefaults).toEqual({
      主体颜色: '橘色',
    })
  })

  it('只保留 prompt 中实际出现且合法的前 5 个变量默认值', async () => {
    const templateManager = {
      getTemplate: vi.fn().mockResolvedValue({
        id: 'image-prompt-from-reference-image',
        name: 'Generate Prompt From Reference Image',
        content: 'unused',
        metadata: {
          version: '1.0.0',
          lastModified: Date.now(),
          templateType: 'image-prompt-composition',
          language: 'zh',
        },
      }),
    }

    mockProcessTemplate.mockReturnValue([
      { role: 'system', content: 'generate prompt from image' },
      { role: 'user', content: 'return prompt plus defaults' },
    ])

    mockUnderstand.mockResolvedValue({
      content: JSON.stringify({
        prompt: {
          场景: {
            主体: '{{数量}}只{{颜色}}的{{主体}}在{{场景}}里{{动作}}',
            光线: '黄昏逆光',
          },
        },
        defaults: {
          主体: '猫',
          数量: '两',
          颜色: '棕色',
          动作: '奔跑',
          场景: '草地',
          光线: '黄昏逆光',
          '无 效': 'bad',
        },
      }),
    })

    const preview = await resolveReferencePromptPreview({
      mode: 'replicate',
      originalPrompt: '',
      imageB64: 'ZmFrZS1pbWFnZQ==',
      mimeType: 'image/png',
      modelConfig,
      templateManager: templateManager as any,
      referenceMode: 'text2image',
    })

    expect(preview.variableDefaults).toEqual({
      主体: '猫',
      数量: '两',
      颜色: '棕色',
      动作: '奔跑',
      场景: '草地',
    })
    expect(preview.variableDefaults).not.toHaveProperty('光线')
    expect(preview.variableDefaults).not.toHaveProperty('无 效')
  })

  it('会将单花括号占位规范化为双花括号，并在缺失 defaults 时保留空变量值', async () => {
    const templateManager = {
      getTemplate: vi.fn().mockResolvedValue({
        id: 'image-prompt-migration',
        name: 'Migrate Prompt With Reference Image',
        content: 'unused',
        metadata: {
          version: '1.0.0',
          lastModified: Date.now(),
          templateType: 'image-prompt-migration',
          language: 'zh',
        },
      }),
    }

    mockProcessTemplate.mockReturnValue([
      { role: 'system', content: 'migrate prompt with image style' },
      { role: 'user', content: 'keep original subject, transfer the image style' },
    ])

    mockUnderstand.mockResolvedValue({
      content: JSON.stringify({
        prompt: {
          主体: '一辆 {跑车颜色} 的未来感跑车',
          场景: '{场景主题}',
          风格: '3D动画渲染，电影级氛围',
        },
        defaults: {},
      }),
    })

    const preview = await resolveReferencePromptPreview({
      mode: 'migrate',
      originalPrompt: '一辆银色的未来感跑车，停在雨夜街头',
      imageB64: 'ZmFrZS1pbWFnZQ==',
      mimeType: 'image/png',
      modelConfig,
      templateManager: templateManager as any,
      referenceMode: 'text2image',
    })

    expect(preview.prompt).toContain('{{跑车颜色}}')
    expect(preview.prompt).toContain('{{场景主题}}')
    expect(preview.variableDefaults).toEqual({
      跑车颜色: '',
      场景主题: '',
    })
  })

  it('会将中文书名号包裹的变量占位规范化为双花括号', async () => {
    const templateManager = {
      getTemplate: vi.fn().mockResolvedValue({
        id: 'image-prompt-migration',
        name: 'Migrate Prompt With Reference Image',
        content: 'unused',
        metadata: {
          version: '1.0.0',
          lastModified: Date.now(),
          templateType: 'image-prompt-migration',
          language: 'zh',
        },
      }),
    }

    mockProcessTemplate.mockReturnValue([
      { role: 'system', content: 'migrate prompt with image style' },
      { role: 'user', content: 'keep original subject, transfer the image style' },
    ])

    mockUnderstand.mockResolvedValue({
      content: JSON.stringify({
        prompt: {
          主体: '一个「主体人物」，「人物动作」',
          背景: '保留参考图的「背景元素」和灯光结构',
        },
        defaults: {
          主体人物: '年轻男生',
          人物动作: '戴着耳机，侧脸特写',
          背景元素: '城市夜景',
        },
      }),
    })

    const preview = await resolveReferencePromptPreview({
      mode: 'migrate',
      originalPrompt: '一个戴着耳机的年轻男生侧脸特写',
      imageB64: 'ZmFrZS1pbWFnZQ==',
      mimeType: 'image/png',
      modelConfig,
      templateManager: templateManager as any,
      referenceMode: 'text2image',
    })

    expect(preview.prompt).toContain('{{主体人物}}')
    expect(preview.prompt).toContain('{{人物动作}}')
    expect(preview.prompt).toContain('{{背景元素}}')
    expect(preview.prompt).not.toContain('「主体人物」')
    expect(preview.variableDefaults).toEqual({
      主体人物: '年轻男生',
      人物动作: '戴着耳机，侧脸特写',
      背景元素: '城市夜景',
    })
  })
})
