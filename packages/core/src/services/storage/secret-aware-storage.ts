import type { IStorageProvider } from './types';
import {
  type ISecretCodec,
  PassthroughSecretCodec,
  openStorageValue,
  sealStorageValue,
  shouldProtectStorageKey,
} from './secret-field';

/**
 * 包装底层存储：对 models / image-models 的 apiKey 等字段
 * 在落盘前加密、读回后解密。业务层始终见明文。
 *
 * Desktop：注入 Electron safeStorage codec。
 * Web：PassthroughSecretCodec（不加密）。
 */
export class SecretAwareStorageProvider implements IStorageProvider {
  private readonly codec: ISecretCodec;

  constructor(
    private readonly base: IStorageProvider,
    codec?: ISecretCodec | null,
  ) {
    this.codec = codec ?? new PassthroughSecretCodec();
  }

  async getItem(key: string): Promise<string | null> {
    const raw = await this.base.getItem(key);
    return openStorageValue(key, raw, this.codec);
  }

  async setItem(key: string, value: string): Promise<void> {
    const sealed = sealStorageValue(key, value, this.codec);
    return this.base.setItem(key, sealed);
  }

  async removeItem(key: string): Promise<void> {
    return this.base.removeItem(key);
  }

  async clearAll(): Promise<void> {
    return this.base.clearAll();
  }

  async updateData<T>(
    key: string,
    modifier: (currentValue: T | null) => T,
  ): Promise<void> {
    // 走本层 get/set，保证 modifier 看到明文、落盘为密文
    if (
      'updateData' in this.base &&
      typeof this.base.updateData === 'function' &&
      !shouldProtectStorageKey(key)
    ) {
      return this.base.updateData(key, modifier);
    }

    // 受保护键：必须在内存中以明文 modifier，再 seal 写回
    // 若底层有 updateData，用它包一层 seal/open 以保留原子性
    if (
      'updateData' in this.base &&
      typeof this.base.updateData === 'function' &&
      shouldProtectStorageKey(key)
    ) {
      return this.base.updateData<unknown>(key, (diskValue) => {
        // diskValue 是底层 JSON.parse 后的对象（可能含密文字段）
        let plain: T | null = null;
        if (diskValue != null) {
          try {
            const opened = openStorageValue(
              key,
              JSON.stringify(diskValue),
              this.codec,
            );
            plain = opened ? (JSON.parse(opened) as T) : null;
          } catch {
            plain = diskValue as T;
          }
        }
        const nextPlain = modifier(plain);
        try {
          const sealedStr = sealStorageValue(
            key,
            JSON.stringify(nextPlain),
            this.codec,
          );
          return JSON.parse(sealedStr) as unknown;
        } catch {
          return nextPlain as unknown;
        }
      }) as Promise<void>;
    }

    const currentRaw = await this.getItem(key);
    const currentValue: T | null = currentRaw ? JSON.parse(currentRaw) : null;
    const nextValue = modifier(currentValue);
    await this.setItem(key, JSON.stringify(nextValue));
  }

  async batchUpdate(
    operations: Array<{
      key: string;
      operation: 'set' | 'remove';
      value?: string;
    }>,
  ): Promise<void> {
    const sealedOps = operations.map((op) => {
      if (op.operation === 'set' && typeof op.value === 'string') {
        return {
          ...op,
          value: sealStorageValue(op.key, op.value, this.codec),
        };
      }
      return op;
    });

    if (
      'batchUpdate' in this.base &&
      typeof this.base.batchUpdate === 'function'
    ) {
      return this.base.batchUpdate(sealedOps);
    }

    for (const op of sealedOps) {
      if (op.operation === 'set' && op.value !== undefined) {
        await this.base.setItem(op.key, op.value);
      } else if (op.operation === 'remove') {
        await this.base.removeItem(op.key);
      }
    }
  }

  getCapabilities?() {
    if (
      'getCapabilities' in this.base &&
      typeof this.base.getCapabilities === 'function'
    ) {
      return this.base.getCapabilities!();
    }
    return {
      supportsAtomic: true,
      supportsBatch: false,
    };
  }

  /** 透传 FileStorageProvider.flush，供 Desktop 退出保存 */
  async flush(): Promise<void> {
    if (typeof (this.base as { flush?: () => Promise<void> }).flush === 'function') {
      return (this.base as { flush: () => Promise<void> }).flush();
    }
  }

  getBaseProvider(): IStorageProvider {
    return this.base;
  }

  getCodec(): ISecretCodec {
    return this.codec;
  }

  /**
   * 启动时把仍含明文敏感字段的 models / image-models 重写为密文。
   * codec 不可用时 no-op。
   */
  async ensureSecretsSealed(
    keys: string[] = ['models', 'image-models'],
  ): Promise<{ rewritten: string[] }> {
    const rewritten: string[] = [];
    if (!this.codec.isAvailable()) {
      return { rewritten };
    }
    for (const key of keys) {
      if (!shouldProtectStorageKey(key)) continue;
      const plain = await this.getItem(key);
      if (plain == null) continue;
      const disk = await this.base.getItem(key);
      const sealed = sealStorageValue(key, plain, this.codec);
      if (sealed !== disk) {
        await this.base.setItem(key, sealed);
        rewritten.push(key);
      }
    }
    return { rewritten };
  }
}

export function createSecretAwareStorageProvider(
  base: IStorageProvider,
  codec?: ISecretCodec | null,
): SecretAwareStorageProvider {
  return new SecretAwareStorageProvider(base, codec);
}
