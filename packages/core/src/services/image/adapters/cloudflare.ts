import { AbstractImageProviderAdapter } from './abstract-adapter'
import { ImageError } from '../errors'
import type {
  ImageModel,
  ImageModelConfig,
  ImageParameterDefinition,
  ImageProvider,
  ImageRequest,
  ImageResult
} from '../types'
import { IMAGE_ERROR_CODES } from '../../../constants/error-codes'

const MODEL_ID = '@cf/black-forest-labs/flux-2-klein-4b'
const DEFAULT_MIME_TYPE = 'image/jpeg'
const MAX_RETRY_ATTEMPTS = 3

export class CloudflareImageAdapter extends AbstractImageProviderAdapter {
  protected normalizeBaseUrl(base: string): string {
    const trimmed = base.replace(/\/$/, '')
    return /\/client\/v4$/.test(trimmed) ? trimmed : `${trimmed}/client/v4`
  }

  getProvider(): ImageProvider {
    return {
      id: 'cloudflare',
      name: 'Cloudflare',
      description: 'Cloudflare Workers AI image generation with FLUX.2 [klein] 4B',
      corsRestricted: true,
      requiresApiKey: true,
      defaultBaseURL: 'https://api.cloudflare.com/client/v4',
      supportsDynamicModels: false,
      apiKeyUrl: 'https://dash.cloudflare.com/profile/api-tokens',
      connectionSchema: {
        required: ['apiKey', 'accountId'],
        optional: ['baseURL'],
        fieldTypes: {
          apiKey: 'string',
          accountId: 'string',
          baseURL: 'string'
        }
      }
    }
  }

  getModels(): ImageModel[] {
    return [
      {
        id: MODEL_ID,
        name: 'FLUX.2 [klein] 4B',
        description: 'Cloudflare-hosted FLUX.2 [klein] 4B model for text-to-image and image editing',
        providerId: 'cloudflare',
        capabilities: {
          text2image: true,
          image2image: true,
          multiImage: false
        },
        parameterDefinitions: this.getDefaultParameterDefinitions(),
        defaultParameterValues: this.getDefaultParameterValues(MODEL_ID)
      }
    ]
  }

  protected getTestImageRequest(testType: 'text2image' | 'image2image'): Omit<ImageRequest, 'configId'> {
    if (testType === 'text2image') {
      return {
        prompt: 'a simple orange tabby cat portrait',
        count: 1
      }
    }

    if (testType === 'image2image') {
      return {
        prompt: 'give the cat a blue knitted hat',
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
    return this.getDefaultParameterDefinitions()
  }

  protected getDefaultParameterValues(_modelId: string): Record<string, unknown> {
    return {
      width: 1024,
      height: 1024,
      seed: 42
    }
  }

  protected validateConfig(config: ImageModelConfig): void {
    super.validateConfig(config)
    this.validateConnectionConfig(config.connectionConfig || {})

    const accountId = config.connectionConfig?.accountId
    if (typeof accountId !== 'string' || !accountId.trim()) {
      throw new ImageError(IMAGE_ERROR_CODES.CONNECTION_CONFIG_MISSING_FIELD, undefined, { field: 'accountId' })
    }
  }

  protected async doGenerate(request: ImageRequest, config: ImageModelConfig): Promise<ImageResult> {
    const accountId = String(config.connectionConfig?.accountId || '').trim()
    const endpoint = `/accounts/${encodeURIComponent(accountId)}/ai/run/${config.modelId}`

    let lastTransportError: unknown

    for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
      let response: Response
      const formData = this.buildFormData(request, config)

      try {
        response = await fetch(this.resolveEndpointUrl(config, endpoint), {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${config.connectionConfig?.apiKey}`
          },
          body: formData,
          signal: request.signal,
        })
      } catch (error) {
        // Do not retry cancellations.
        if (error instanceof Error && error.name === 'AbortError') {
          throw error
        }
        lastTransportError = error
        if (attempt < MAX_RETRY_ATTEMPTS) {
          continue
        }
        throw error
      }

      if (!response.ok) {
        if (this.shouldRetryStatus(response.status) && attempt < MAX_RETRY_ATTEMPTS) {
          continue
        }

        throw new ImageError(
          IMAGE_ERROR_CODES.GENERATION_FAILED,
          await this.getErrorMessage(response)
        )
      }

      const data = await response.json()
      const imageBase64 = data?.result?.image
      if (typeof imageBase64 !== 'string' || !imageBase64.trim()) {
        throw new ImageError(IMAGE_ERROR_CODES.INVALID_RESPONSE_FORMAT)
      }

      const mimeType = DEFAULT_MIME_TYPE
      return {
        images: [
          {
            b64: imageBase64,
            mimeType,
            url: `data:${mimeType};base64,${imageBase64}`
          }
        ],
        metadata: {
          providerId: 'cloudflare',
          modelId: config.modelId,
          configId: config.id
        }
      }
    }

    throw new ImageError(
      IMAGE_ERROR_CODES.GENERATION_FAILED,
      lastTransportError instanceof Error ? lastTransportError.message : String(lastTransportError ?? 'Unknown Cloudflare image error')
    )
  }

  private getDefaultParameterDefinitions(): ImageParameterDefinition[] {
    return [
      {
        name: 'width',
        labelKey: 'image.params.width.label',
        descriptionKey: 'image.params.width.description',
        type: 'integer',
        defaultValue: 1024,
        minValue: 256,
        maxValue: 2048
      },
      {
        name: 'height',
        labelKey: 'image.params.height.label',
        descriptionKey: 'image.params.height.description',
        type: 'integer',
        defaultValue: 1024,
        minValue: 256,
        maxValue: 2048
      },
      {
        name: 'seed',
        labelKey: 'image.params.seed.label',
        descriptionKey: 'image.params.seed.description',
        type: 'integer',
        defaultValue: 42,
        minValue: 0,
        maxValue: 2147483647
      }
    ]
  }

  private buildFormData(request: ImageRequest, config: ImageModelConfig): FormData {
    const formData = new FormData()
    formData.append('prompt', request.prompt)

    const mergedParams = {
      ...this.getDefaultParameterValues(config.modelId),
      ...config.paramOverrides,
      ...request.paramOverrides
    }

    for (const [key, value] of Object.entries(mergedParams)) {
      if (value !== undefined && value !== null) {
        formData.append(key, String(value))
      }
    }

    if (request.inputImage) {
      const mimeType = request.inputImage.mimeType || 'image/png'
      const imageBlob = this.base64ToBlob(request.inputImage.b64, mimeType)
      const extension = mimeType.split('/')[1] || 'png'
      formData.append('input_image_0', imageBlob, `input.${extension}`)
    }

    return formData
  }

  private base64ToBlob(base64: string, mimeType: string): Blob {
    const cleanBase64 = base64.includes(',') ? base64.split(',')[1] : base64

    if (typeof atob === 'function') {
      const binary = atob(cleanBase64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i)
      }
      return new Blob([bytes], { type: mimeType })
    }

    if (typeof (globalThis as { Buffer?: { from(input: string, encoding: string): Uint8Array } }).Buffer !== 'undefined') {
      const buffer = (globalThis as { Buffer: { from(input: string, encoding: string): Uint8Array } }).Buffer.from(cleanBase64, 'base64')
      const bytes = new Uint8Array(buffer.length)
      for (let i = 0; i < buffer.length; i++) {
        bytes[i] = buffer[i]
      }
      return new Blob([bytes], { type: mimeType })
    }

    throw new ImageError(IMAGE_ERROR_CODES.BASE64_DECODING_NOT_SUPPORTED)
  }

  private async getErrorMessage(response: Response): Promise<string> {
    const fallbackMessage = `Cloudflare API error: ${response.status} ${response.statusText}`

    try {
      const data = await response.json()
      return data?.errors?.[0]?.message || data?.result?.error || data?.message || fallbackMessage
    } catch {
      try {
        const text = await response.text()
        return text || fallbackMessage
      } catch {
        return fallbackMessage
      }
    }
  }

  private shouldRetryStatus(status: number): boolean {
    return status >= 500 && status < 600
  }
}
