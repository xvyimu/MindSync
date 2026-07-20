import { AbstractImageProviderAdapter } from './abstract-adapter'
import type {
  ImageProvider,
  ImageModel,
  ImageRequest,
  ImageResult,
  ImageModelConfig,
  ImageParameterDefinition,
  ImageInputRef
} from '../types'
import { ImageError } from '../errors'
import { IMAGE_ERROR_CODES } from '../../../constants/error-codes'

export class GrokImageAdapter extends AbstractImageProviderAdapter {
  private static readonly FORCED_SINGLE_OUTPUT_PARAM_KEYS = ['n', 'batch_size', 'count']
  private static readonly MAX_INPUT_IMAGES = 3

  protected normalizeBaseUrl(base: string): string {
    const trimmed = base.replace(/\/$/, '')
    return /\/v1$/.test(trimmed) ? trimmed : `${trimmed}/v1`
  }

  getProvider(): ImageProvider {
    return {
      id: 'grok',
      name: 'Grok',
      description: 'xAI Grok Imagine image generation and editing service',
      requiresApiKey: true,
      defaultBaseURL: 'https://api.x.ai/v1',
      supportsDynamicModels: true,
      apiKeyUrl: 'https://console.x.ai/team/default/api-keys',
      connectionSchema: {
        required: ['apiKey'],
        optional: ['baseURL'],
        fieldTypes: {
          apiKey: 'string',
          baseURL: 'string'
        }
      }
    }
  }

  getModels(): ImageModel[] {
    return [
      {
        id: 'grok-imagine-image-quality',
        name: 'Grok Imagine Image Quality',
        description: 'xAI Grok Imagine image generation and JSON-based image editing model',
        providerId: 'grok',
        capabilities: {
          text2image: true,
          image2image: true,
          multiImage: true
        },
        parameterDefinitions: this.getParameterDefinitions('grok-imagine-image-quality'),
        defaultParameterValues: this.getDefaultParameterValues('grok-imagine-image-quality')
      }
    ]
  }

  public async getModelsAsync(connectionConfig: Record<string, any>): Promise<ImageModel[]> {
    const baseURL = this.normalizeBaseUrl(connectionConfig?.baseURL || this.getProvider().defaultBaseURL)
    const apiKey = connectionConfig?.apiKey

    try {
      const response = await fetch(`${baseURL}/image-generation-models`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
        }
      })

      if (!response.ok) {
        console.warn(`Grok image models API error: ${response.status}`)
        return this.getModels()
      }

      const data = await response.json()
      const rawModels = Array.isArray(data?.models)
        ? data.models
        : Array.isArray(data?.data)
          ? data.data
          : []

      const models = rawModels
        .map((model: any) => {
          const id = typeof model === 'string' ? model : model?.id
          if (!id || typeof id !== 'string') {
            return null
          }

          return {
            ...this.buildDefaultModel(id),
            name: typeof model?.name === 'string' ? model.name : id,
            description: typeof model?.description === 'string'
              ? model.description
              : `${id} image generation model`
          }
        })
        .filter((model: ImageModel | null): model is ImageModel => !!model)
        .sort((a: ImageModel, b: ImageModel) => a.id.localeCompare(b.id))

      return models.length > 0 ? models : this.getModels()
    } catch (error) {
      console.warn('Failed to fetch Grok image models:', error)
      return this.getModels()
    }
  }

  protected getTestImageRequest(testType: 'text2image' | 'image2image'): Omit<ImageRequest, 'configId'> {
    if (testType === 'text2image') {
      return {
        prompt: 'a simple red flower',
        count: 1
      }
    }

    if (testType === 'image2image') {
      return {
        prompt: 'make this image more colorful',
        inputImage: {
          b64: AbstractImageProviderAdapter.TEST_IMAGE_BASE64.split(',')[1],
          mimeType: 'image/png'
        },
        count: 1
      }
    }

    throw new ImageError(IMAGE_ERROR_CODES.UNSUPPORTED_TEST_TYPE, undefined, { testType })
  }

  protected getParameterDefinitions(_modelId: string): readonly ImageParameterDefinition[] {
    return [
      {
        name: 'aspect_ratio',
        labelKey: 'image.params.aspect_ratio.label',
        descriptionKey: 'image.params.aspect_ratio.description',
        type: 'string',
        defaultValue: 'auto',
        allowedValues: ['auto', '1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3', '2:1', '1:2', '19.5:9', '9:19.5', '20:9', '9:20']
      },
      {
        name: 'resolution',
        labelKey: 'image.params.resolution.label',
        descriptionKey: 'image.params.resolution.description',
        type: 'string',
        defaultValue: '1k',
        allowedValues: ['1k', '2k']
      }
    ]
  }

  protected getDefaultParameterValues(_modelId: string): Record<string, unknown> {
    return {
      aspect_ratio: 'auto',
      resolution: '1k',
      response_format: 'b64_json'
    }
  }

  protected async doGenerate(request: ImageRequest, config: ImageModelConfig): Promise<ImageResult> {
    const inputImages = this.getInputImages(request)

    return inputImages.length > 0
      ? await this.generateImageEdit(request, config, inputImages)
      : await this.generateImage(request, config)
  }

  private async generateImage(request: ImageRequest, config: ImageModelConfig): Promise<ImageResult> {
    const payload = {
      model: config.modelId,
      prompt: request.prompt,
      response_format: 'b64_json',
      ...this.getParamOverrides(request, config),
      n: 1
    }

    const response = await this.apiCall(config, '/images/generations', {
      method: 'POST',
      headers: this.getJsonHeaders(config),
      body: JSON.stringify(payload),
      signal: request.signal,
    })

    return this.parseImageResponse(response, config)
  }

  private async generateImageEdit(
    request: ImageRequest,
    config: ImageModelConfig,
    inputImages: ImageInputRef[]
  ): Promise<ImageResult> {
    if (inputImages.length === 0) {
      throw new ImageError(IMAGE_ERROR_CODES.IMAGE2IMAGE_INPUT_IMAGE_REQUIRED)
    }

    if (inputImages.length > GrokImageAdapter.MAX_INPUT_IMAGES) {
      throw new ImageError(IMAGE_ERROR_CODES.INPUT_IMAGE_TOO_MANY, undefined, {
        maxCount: GrokImageAdapter.MAX_INPUT_IMAGES,
        actualCount: inputImages.length
      })
    }

    const imageRefs = inputImages.map((inputImage) => ({
      type: 'image_url',
      url: this.toDataUrl(inputImage)
    }))
    const payload = {
      model: config.modelId,
      prompt: request.prompt,
      response_format: 'b64_json',
      ...this.getParamOverrides(request, config),
      n: 1,
      ...(imageRefs.length === 1 ? { image: imageRefs[0] } : { images: imageRefs })
    }

    const response = await this.apiCall(config, '/images/edits', {
      method: 'POST',
      headers: this.getJsonHeaders(config),
      body: JSON.stringify(payload),
      signal: request.signal,
    })

    return this.parseImageResponse(response, config)
  }

  private getInputImages(request: ImageRequest): ImageInputRef[] {
    if (Array.isArray(request.inputImages) && request.inputImages.length > 0) {
      return request.inputImages
    }

    return request.inputImage ? [request.inputImage] : []
  }

  private getParamOverrides(
    request: ImageRequest,
    config: ImageModelConfig
  ): Record<string, any> {
    const params: Record<string, any> = { ...config.paramOverrides, ...request.paramOverrides }
    for (const key of GrokImageAdapter.FORCED_SINGLE_OUTPUT_PARAM_KEYS) {
      delete params[key]
    }
    return params
  }

  private getJsonHeaders(config: ImageModelConfig): Record<string, string> {
    return {
      Authorization: `Bearer ${config.connectionConfig?.apiKey}`,
      'Content-Type': 'application/json'
    }
  }

  private toDataUrl(inputImage: ImageInputRef): string {
    const mimeType = inputImage.mimeType || 'image/png'
    const b64 = inputImage.b64.includes(',') ? inputImage.b64.split(',')[1] : inputImage.b64
    return `data:${mimeType};base64,${b64}`
  }

  private parseImageResponse(response: any, config: ImageModelConfig): ImageResult {
    if (!response.data || !Array.isArray(response.data)) {
      throw new ImageError(IMAGE_ERROR_CODES.INVALID_RESPONSE_FORMAT)
    }

    const images = response.data.map((item: any) => {
      const b64Json = typeof item.b64_json === 'string' ? item.b64_json : ''
      const responseUrl = typeof item.url === 'string' ? item.url : ''

      if (b64Json) {
        const parsed = this.parseBase64Image(b64Json)
        return {
          b64: parsed.b64,
          mimeType: parsed.mimeType,
          url: `data:${parsed.mimeType};base64,${parsed.b64}`
        }
      }

      if (responseUrl) {
        if (responseUrl.startsWith('data:')) {
          const parsed = this.parseDataUrl(responseUrl)
          return {
            b64: parsed.b64,
            mimeType: parsed.mimeType,
            url: responseUrl
          }
        }

        return {
          url: responseUrl
        }
      }

      throw new ImageError(IMAGE_ERROR_CODES.INVALID_RESPONSE_FORMAT)
    })

    return {
      images,
      text: response.data[0]?.revised_prompt,
      metadata: {
        providerId: 'grok',
        modelId: config.modelId,
        configId: config.id,
        usage: response.usage
      }
    }
  }

  private parseBase64Image(value: string): { b64: string; mimeType: string } {
    return value.startsWith('data:')
      ? this.parseDataUrl(value)
      : { b64: value, mimeType: 'image/jpeg' }
  }

  private parseDataUrl(value: string): { b64: string; mimeType: string } {
    const [header, b64] = value.split(',')
    const mimeType = header.match(/data:([^;]+)/)?.[1] || 'image/jpeg'

    if (!b64) {
      throw new ImageError(IMAGE_ERROR_CODES.INVALID_RESPONSE_FORMAT)
    }

    return { b64, mimeType }
  }

  private async apiCall(config: ImageModelConfig, endpoint: string, options: RequestInit) {
    const url = this.resolveEndpointUrl(config, endpoint)
    const response = await fetch(url, options)

    if (!response.ok) {
      let errorMessage = `Grok API error: ${response.status} ${response.statusText}`
      try {
        const errorData = await response.json()
        if (errorData.error?.message) {
          errorMessage = errorData.error.message
        }
      } catch {
        try {
          const errorText = await response.text()
          if (errorText) {
            errorMessage = `${errorMessage}: ${errorText}`
          }
        } catch {
          // ignore
        }
      }

      throw new ImageError(IMAGE_ERROR_CODES.GENERATION_FAILED, errorMessage)
    }

    return await response.json()
  }
}
