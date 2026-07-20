import type {
  IImageModelManager,
  IImageService,
  ImageRequest,
  ImageResult,
  ImageModelConfig,
  ImageModelConfigInput,
  ImageModel,
  Text2ImageRequest,
  Image2ImageRequest,
  MultiImageGenerationRequest,
  MultiImageRequest,
} from './types'
import { BaseError } from '../llm/errors'
import { IMAGE_ERROR_CODES } from '../../constants/error-codes'
import { safeSerializeForIPC } from '../../utils/ipc-serialization'

type ElectronAPI = {
  image: {
    generate: (request: ImageRequest, signal?: AbortSignal) => Promise<ImageResult>
    generateText2Image: (request: Text2ImageRequest, signal?: AbortSignal) => Promise<ImageResult>
    generateImage2Image: (request: Image2ImageRequest, signal?: AbortSignal) => Promise<ImageResult>
    generateMultiImage: (request: MultiImageGenerationRequest, signal?: AbortSignal) => Promise<ImageResult>
    validateRequest: (request: ImageRequest) => Promise<void>
    validateText2ImageRequest: (request: Text2ImageRequest) => Promise<void>
    validateImage2ImageRequest: (request: Image2ImageRequest) => Promise<void>
    validateMultiImageRequest: (request: MultiImageRequest) => Promise<void>
    testConnection: (config: ImageModelConfig) => Promise<ImageResult>
    getDynamicModels: (providerId: string, connectionConfig: Record<string, unknown>) => Promise<ImageModel[]>
  }
  imageModel: {
    ensureInitialized: () => Promise<void>
    isInitialized: () => Promise<boolean>
    addConfig: (config: ImageModelConfigInput) => Promise<void>
    updateConfig: (id: string, updates: Partial<ImageModelConfigInput>) => Promise<void>
    deleteConfig: (id: string) => Promise<void>
    getConfig: (id: string) => Promise<ImageModelConfig | null>
    getAllConfigs: () => Promise<ImageModelConfig[]>
    getEnabledConfigs: () => Promise<ImageModelConfig[]>
    exportData: () => Promise<unknown>
    importData: (data: unknown) => Promise<void>
    getDataType: () => Promise<string>
    validateData: (data: unknown) => Promise<boolean>
  }
}

export class ElectronImageServiceProxy implements IImageService {
  private electronAPI: ElectronAPI

  constructor() {
    if (typeof window === 'undefined' || !window.electronAPI) {
      throw new BaseError(IMAGE_ERROR_CODES.GENERATION_FAILED, 'ElectronImageServiceProxy can only be used in Electron renderer process')
    }
    this.electronAPI = (window as unknown as { electronAPI: ElectronAPI }).electronAPI
  }

  async generate(request: ImageRequest): Promise<ImageResult> {
    const { signal, ...rest } = request
    const safeReq = safeSerializeForIPC(rest) as ImageRequest
    return await this.electronAPI.image.generate(safeReq, signal)
  }

  async generateText2Image(request: Text2ImageRequest): Promise<ImageResult> {
    const { signal, ...rest } = request
    const safeReq = safeSerializeForIPC(rest) as Text2ImageRequest
    return await this.electronAPI.image.generateText2Image(safeReq, signal)
  }

  async generateImage2Image(request: Image2ImageRequest): Promise<ImageResult> {
    const { signal, ...rest } = request
    const safeReq = safeSerializeForIPC(rest) as Image2ImageRequest
    return await this.electronAPI.image.generateImage2Image(safeReq, signal)
  }

  async generateMultiImage(request: MultiImageGenerationRequest): Promise<ImageResult> {
    const { signal, ...rest } = request
    const safeReq = safeSerializeForIPC(rest) as MultiImageGenerationRequest
    return await this.electronAPI.image.generateMultiImage(safeReq, signal)
  }

  async validateRequest(request: ImageRequest): Promise<void> {
    const safeReq = safeSerializeForIPC(request)
    await this.electronAPI.image.validateRequest(safeReq)
  }

  async validateText2ImageRequest(request: Text2ImageRequest): Promise<void> {
    const safeReq = safeSerializeForIPC(request)
    await this.electronAPI.image.validateText2ImageRequest(safeReq)
  }

  async validateImage2ImageRequest(request: Image2ImageRequest): Promise<void> {
    const safeReq = safeSerializeForIPC(request)
    await this.electronAPI.image.validateImage2ImageRequest(safeReq)
  }

  async validateMultiImageRequest(request: MultiImageRequest): Promise<void> {
    const safeReq = safeSerializeForIPC(request)
    await this.electronAPI.image.validateMultiImageRequest(safeReq)
  }

  async testConnection(config: ImageModelConfig): Promise<ImageResult> {
    const safeCfg = safeSerializeForIPC(config)
    return await this.electronAPI.image.testConnection(safeCfg)
  }

  async getDynamicModels(providerId: string, connectionConfig: Record<string, any>) {
    const safeConn = safeSerializeForIPC(connectionConfig || {})
    return await this.electronAPI.image.getDynamicModels(providerId, safeConn)
  }
}

export class ElectronImageModelManagerProxy implements IImageModelManager {
  private electronAPI: ElectronAPI

  constructor() {
    if (typeof window === 'undefined' || !window.electronAPI) {
      throw new BaseError(IMAGE_ERROR_CODES.CONFIG_INVALID, 'ElectronImageModelManagerProxy can only be used in Electron renderer process')
    }
    this.electronAPI = (window as unknown as { electronAPI: ElectronAPI }).electronAPI
  }

  async ensureInitialized(): Promise<void> {
    await this.electronAPI.imageModel.ensureInitialized()
  }

  async isInitialized(): Promise<boolean> {
    return await this.electronAPI.imageModel.isInitialized()
  }

  // 新的配置 CRUD 操作
  async addConfig(config: ImageModelConfigInput): Promise<void> {
    const safeCfg = safeSerializeForIPC(config)
    await this.electronAPI.imageModel.addConfig(safeCfg)
  }

  async updateConfig(id: string, updates: Partial<ImageModelConfigInput>): Promise<void> {
    const safeUpdates = safeSerializeForIPC(updates)
    await this.electronAPI.imageModel.updateConfig(id, safeUpdates)
  }

  async deleteConfig(id: string): Promise<void> {
    await this.electronAPI.imageModel.deleteConfig(id)
  }

  async getConfig(id: string): Promise<ImageModelConfig | null> {
    return await this.electronAPI.imageModel.getConfig(id)
  }

  async getAllConfigs(): Promise<ImageModelConfig[]> {
    return await this.electronAPI.imageModel.getAllConfigs()
  }

  async getEnabledConfigs(): Promise<ImageModelConfig[]> {
    return await this.electronAPI.imageModel.getEnabledConfigs()
  }

  // IImportExportable 接口
  async exportData(): Promise<any> {
    return await this.electronAPI.imageModel.exportData()
  }

  async importData(data: any): Promise<void> {
    const safe = safeSerializeForIPC(data)
    await this.electronAPI.imageModel.importData(safe)
  }

  async getDataType(): Promise<string> {
    return await this.electronAPI.imageModel.getDataType()
  }

  async validateData(data: any): Promise<boolean> {
    const safe = safeSerializeForIPC(data)
    return await this.electronAPI.imageModel.validateData(safe)
  }
}
