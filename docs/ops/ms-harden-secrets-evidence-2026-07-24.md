# MS-harden-secrets · W2 切片 2 evidence · 2026-07-24

> **模块：** `M-MS-harden-secrets` · G0=B Electron 硬化 · 密钥落盘 / codec / 日志脱敏  
> **分支：** `xvyimu/ms-harden-secrets` · base `develop` tip（本 wt 进改前 `221b767`）  
> **禁止已守：** `git push` · asar · Tauri · 拆 desktop 主路径 · React 平行 · 假绿 · 大爆炸重构  
> **与 W1：** 独立 secrets 刀；**未** cherry `xvyimu/ms-harden-ipc@881cca9`（ghost channel 删除）

---

## Scout（边界图）

| 层 | 路径 / 行为 |
|----|-------------|
| **Codec 适配（主进程）** | `packages/desktop/config/safe-storage-secrets.js` → `createElectronSafeStorageCodec(safeStorage)` |
| **装配** | `service-container.js`：`FileStorageProvider` → `createSecretAwareStorageProvider(file, codec)` |
| **字段编解码（core）** | `packages/core/src/services/storage/secret-field.ts` · 前缀 **`__enc:v1:`** |
| **存储包装** | `secret-aware-storage.ts` · 保护键 **`models`** · **`image-models`** |
| **IPC 落盘入口** | `ipc/model-handlers.js` · `ipc/image-handlers.js`（明文进 manager → seal 写盘） |
| **keytar** | **未使用**（仓内无依赖/调用） |
| **导出脱敏** | `export-secrets.ts`（默认不含明文 Key；与磁盘 safeStorage 互补） |

### 密钥字段

| 位置 | 字段 |
|------|------|
| `connectionConfig` | `apiKey` · `secretAccessKey` · `accessKeyId` |
| 顶层 legacy | `apiKey`（无 connectionConfig 时） |
| 存储键 | `models` · `image-models` |

### 失败回退

| 场景 | 行为 |
|------|------|
| `safeStorage` / `isEncryptionAvailable()` 假或抛 | codec `isAvailable()=false` → **明文落盘**（Web 同构透传） |
| 启动迁移 `ensureSecretsSealed` 抛 | warn 后跳过；不阻断启动 |
| 磁盘已是 `__enc:v1:` 但 codec 不可用 | `openSecretField` → **空串**（不回退明文） |
| decrypt 抛 | 空串 + 日志（本刀改为只记 error name） |

### 日志 / 错误信封（本刀前）

| 点 | 风险 |
|----|------|
| `createErrorResponse` | 原样 `error.message` → 上游若拼 config/apiKey 会进 renderer 信封 |
| `openSecretField` catch | `console.error(..., error)` 可能带 OS 回显片段 |
| `service-container` 迁移/装配失败 | `console.warn/error` 原样 Error 对象 |
| `probeApiKeyEnv` | 仅 `[CONFIGURED]` / Missing，**不打印值**（OK） |
| model/image handlers | 不直接 log config（OK） |

---

## 加固 diff（最小）

| 文件 | 变更 |
|------|------|
| `safe-storage-secrets.js` | encrypt/decrypt 固定错误文案（不附带底层 message）；类型校验；导出 **`redactSecretsInText`** |
| `safe-storage-secrets.test.js` | round-trip · unavailable · 失败不泄明文 · redact 单测 |
| `ipc-security.js` | `createErrorResponse` message 经 redact |
| `ipc-security.test.js` | 信封脱敏断言 |
| `service-container.js` | 迁移/装配失败日志 redact |
| `secret-field.ts` | decrypt 失败只记 `(ErrorName)`，不 dump message |
| `secret-field.test.ts` | unavailable / decrypt-fail → 空串 |

**未改：** channel manifest · model/image handler 契约 · 默认明文-when-unavailable 产品策略（Web 兼容；改策略需独立 ADR）。

---

## 验证（exit code）

| 命令 | Exit |
|------|-----:|
| `node --test packages/desktop/config/safe-storage-secrets.test.js` | **0**（12 pass） |
| `node --test packages/desktop/config/*.test.js` | **0**（99 pass） |
| `pnpm -F @mindsync/core exec vitest run tests/unit/storage/secret-field.test.ts` | **0**（15 pass） |
| `pnpm -F @mindsync/core build` | **0**（dist 在 `.gitignore`，本地/CI 构建产物） |
| `git push` | **未执行** |

---

## 风险（一句）

**codec 不可用时 models/image-models 仍明文落盘**（设计保留）；本刀堵的是**错误消息与日志路径**的二次泄漏，非把 Web 透传改成强制加密。
