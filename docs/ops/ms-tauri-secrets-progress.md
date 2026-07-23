# MS-TAURI-SECRETS · progress · 2026-07-24

> **任务：** M3 `ms-tauri-secrets`（orch `task_33599d65a63a`）  
> **范围：** safeStorage 等价 `SecretCodec` 设计 + 可测实现（供 Tauri/desktop 后续挂接）  
> **禁止已守：** `git push` · 不删 Electron · 不换 UI · 不拆 Electron 主路径  

## 结论

| 项 | 值 |
|----|-----|
| 分支 | `xvyimu/ms-tauri-secrets` |
| 落点 | `@mindsync/core` `services/storage/secret-codec-platform.ts` |
| Electron 主路径 | **未改**（`packages/desktop/config/safe-storage-secrets.js` 仍为 composition root） |
| 磁盘标记 | 仍为 `__enc:v1:<base64-payload>`（`secret-field.ts`） |
| 交付态 | codec 工厂 + 单测 + 本文对接步骤；**未**接 Tauri 运行时 / **未** push |

## 设计（与 Electron 对齐）

### 接口

既有 `ISecretCodec`（`secret-field.ts`，导出别名 `SecretCodec`）：

| 方法 | 语义（= `createElectronSafeStorageCodec`） |
|------|-------------------------------------------|
| `isAvailable()` | 探测失败 / 无后端 → `false`（吞异常） |
| `encrypt(plain)` | → **base64 payload**（**不含** `__enc:v1:` 前缀） |
| `decrypt(payload)` | base64 → 明文；不可用时 **throw**，不返回伪密文 |

`sealSecretField` / `openSecretField` 负责前缀；业务层始终见明文。

### 工厂

| API | 用途 |
|-----|------|
| `createSecretCodecFromBackend(backend)` | 任意 safeStorage 形后端 → `ISecretCodec` |
| `createUnavailableSecretCodec(reason?)` | 明确不可用；encrypt/decrypt throw |
| `createCompositeSecretCodec(primary, legacies)` | 写 primary；读 primary 失败再试 legacy（cutover） |
| `createPlatformSecretCodec(options)` | 注入 backend / providers / legacyDecryptBackends；不可用时 **warn，不伪装已加密** |
| `createDesktopShellSecretCodec(options)` | Windows 额外尝试可选 Node DPAPI 模块；否则同 platform |
| `tryCreateNodeDpapiBackend(requireFn?, platform?)` | 软加载 `@primno/dpapi` 等；**非** core 硬依赖 |

### Windows / DPAPI / keyring 取舍

| 方案 | 取舍 |
|------|------|
| **Tauri/Rust `keyring` 或 DPAPI（`CryptProtectData`）** | **长期首选**：OS 用户会话绑定；由 shell 实现 `SecretCodecBackend` 注入 core，core 保持零 native 依赖 |
| **可选 Node `@primno/dpapi` / `node-dpapi*`** | 工具链/过渡用；`tryCreateNodeDpapiBackend` 动态 require，缺模块 → `null` |
| **Electron `safeStorage`（现状）** | 主路径不变；Windows 上为 Chromium OSCrypt（DPAPI + 应用材料） |
| **跨壳字节兼容** | **不保证**。Electron OSCrypt blob ≠ 裸 DPAPI / keyring。迁移见下 |

不可用时行为与 Electron 一致：

- `isAvailable() === false`
- `createPlatformSecretCodec` 默认 `console.warn(... remain plaintext on disk)`
- `sealStorageValue` / `SecretAwareStorageProvider` **不写** `__enc:v1:` 标记

## `__enc:v1:` 兼容策略

1. **同 codec 族**：payload 格式不变 → 直接 round-trip（单测覆盖）。  
2. **Electron → Tauri（算法不同）**：  
   - **推荐：** 在 Electron 壳 `exportAllData({ includeSecrets: true })` → 新壳 import（明文进新 codec 再 seal）。  
   - **Cutover 双壳：** `createPlatformSecretCodec({ backend: tauriBackend, legacyDecryptBackends: [electronSafeStorageBackend] })` — 仅解密旧 blob，新写入走 Tauri。  
3. **无任何可用 codec 读到密文：** `openSecretField` 已有路径 → warn + 空串（不炸整库）。

## 与 `service-container` 对接步骤（后续壳工作，本任务不改 Electron 装配）

当前 Electron（`packages/desktop/config/service-container.js`）：

```js
const secretCodec = createElectronSafeStorageCodec(deps.safeStorage);
const storageProvider = createSecretAwareStorageProvider(fileStorage, secretCodec);
```

Tauri / 新 desktop 壳建议：

1. **Shell 侧**实现 `SecretCodecBackend`（Rust command 或 Node DPAPI）：  
   `isEncryptionAvailable` / `encryptString` / `decryptString`。  
2. **装配**（Tauri composition root，**不是**改掉 Electron 文件）：

```js
const { createPlatformSecretCodec, createSecretAwareStorageProvider } = require('@mindsync/core');
// 或 ESM: import { createPlatformSecretCodec, ... } from '@mindsync/core'

const secretCodec = createPlatformSecretCodec({
  backend: tauriOrDpapiBackend,
  // 可选 cutover：
  // legacyDecryptBackends: [electronSafeStorageBackend],
  warn: log.warn.bind(log),
});

const storageProvider = createSecretAwareStorageProvider(fileStorage, secretCodec);

if (secretCodec.isAvailable()) {
  log('[DESKTOP] platform secret encryption available');
} else {
  log('[DESKTOP] secret encryption unavailable — model API keys remain plaintext on disk');
}

// 与现网一致：明文 → 密文迁移
if (typeof storageProvider.ensureSecretsSealed === 'function') {
  await storageProvider.ensureSecretsSealed();
}
```

3. **Facade：** 密钥加解密 **不要** 暴露给 renderer；继续只在主进程/ Rust 侧 seal，经已有 storage / preference IPC。  
4. **验证：**  
   - 无后端：磁盘 `models` 无 `__enc:v1:` + 有 warn。  
   - 有后端：`apiKey` 磁盘为 `__enc:v1:...`，UI/ModelManager 仍见明文。  
   - 旧 Electron 用户数据：export/import 或 legacy decrypt 后再 `ensureSecretsSealed`。

## 本轮改动文件

| 路径 | 说明 |
|------|------|
| `packages/core/src/services/storage/secret-codec-platform.ts` | 新建：工厂 + DPAPI 软加载 |
| `packages/core/src/index.ts` | 导出 `SecretCodec` 别名 + platform factories |
| `packages/core/tests/unit/storage/secret-codec-platform.test.ts` | mock round-trip / unavailable / composite / `__enc:v1:` |
| `docs/ops/ms-tauri-secrets-progress.md` | 本文 |

**未改：** `safe-storage-secrets.js`、`service-container.js`、UI、Electron 删除。

## 验证（实跑）

| 命令 | Exit | 备注 |
|------|-----:|------|
| `pnpm -F @mindsync/core exec vitest run tests/unit/storage/secret-codec-platform.test.ts tests/unit/storage/secret-field.test.ts` | **0** | **30 passed**（2 files） |
| `pnpm -F @mindsync/core typecheck` | **0** | `tsc --noEmit` |

## 风险

| 风险 | 等级 | 缓解 |
|------|------|------|
| Electron OSCrypt ≠ 裸 DPAPI 字节 | 高（迁移） | 文档强制 export/import 或 legacyDecrypt；禁止假设可直接读旧 blob |
| 可选 Node native 模块 ABI / Electron 版本 | 中 | 不进 core 硬依赖；Tauri 路径优先 Rust |
| 不可用时明文落盘 | 中（与现网同） | warn 文案对齐；产品侧可后续强制阻断 |
| `createDesktopShellSecretCodec` 在 pure ESM 测里 `require` | 低 | 仅 win32 provider；测试注入 `requireFn` / 不调用真实加载 |
| 误在 renderer 用 codec | 中 | 约定主进程/ Rust only；facade 不导出 encrypt API |

## 不做（本任务）

- 新建 `packages/desktop-tauri` 包 / Rust crate  
- 修改 Electron `service-container` 装配  
- `git push` / 删 Electron / 换 UI 栈  
- 真实 DPAPI e2e（无 native 模块时 mock 覆盖契约）
