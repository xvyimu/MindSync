# MS-core-api-boundary · 边界矩阵 · 2026-07-24

> **模块：** `M-MS-core-api-boundary`  
> **范围：** `@mindsync/core` 公开导出 · `./electron` 子路径 · 防泄漏面 · web/extension 依赖正确性  
> **基线：** `develop` @ **`221b767`**  
> **分支：** `xvyimu/ms-core-api-boundary`  
> **禁止已守：** `git push develop` · asar · Tauri · React · 假绿 · 大爆炸重构 · 拆 desktop

---

## 1. 公开导出面（package.json exports）

| 子路径 | 产物 | 消费者 | 说明 |
|--------|------|--------|------|
| `@mindsync/core` (`.`) | `dist/index.{js,cjs,d.ts}` | ui / web / extension / mcp / desktop main | 领域 SSOT；**无** Electron Proxy 类 |
| `@mindsync/core/electron` | `dist/electron.{js,cjs,d.ts}` | ui（Electron 分支动态 import） | **仅** renderer 代理 + `waitForElectronApi` |
| 其他 deep path | **无** | — | exports 仅上述 2 键；Node resolution 禁 deep import |

**门闩：** `scripts/package-scripts.test.mjs` 断言 `Object.keys(exports) === ['.', './electron']`。

---

## 2. Electron 子路径清单

| 导出符号 | 源文件 | 谁用 |
|----------|--------|------|
| `ElectronTemplateManagerProxy` | `template/electron-proxy` | ui `useAppInitializer`（Electron） |
| `ElectronTemplateLanguageServiceProxy` | `template/electron-language-proxy` | 同上 |
| `ElectronHistoryManagerProxy` | `history/electron-proxy` | 同上 |
| `ElectronLLMProxy` | `llm/electron-proxy` | 同上 |
| `ElectronModelManagerProxy` | `model/electron-proxy` | 同上 |
| `ElectronImageServiceProxy` / `ElectronImageModelManagerProxy` | `image/electron-proxy` | 同上 |
| `ElectronPromptServiceProxy` | `prompt/electron-proxy` | 同上 |
| `ElectronDataManagerProxy` | `data/electron-proxy` | 同上 |
| `ElectronPreferenceServiceProxy` | `preference/electron-proxy` | 同上 |
| `ElectronContextRepoProxy` | `context/electron-proxy` | 同上 |
| `FavoriteManagerElectronProxy` | `favorite/electron-proxy` | 同上 |
| **`ElectronImageUnderstandingServiceProxy`** | `image-understanding/electron-proxy` | 同上（**本刀从主入口迁入**） |
| `waitForElectronApi` | `utils/environment` | 同上 |

**本刀收口：** `ElectronImageUnderstandingServiceProxy` 曾从 `src/index.ts` 再导出，导致 browser 主图可静态拉到 Electron-only 类；现仅 `@mindsync/core/electron`。

---

## 3. 主入口敏感 / Node-only 面（保留理由）

| 符号 | 性质 | 为何仍在 `.` | 风险评级 |
|------|------|--------------|----------|
| `FileStorageProvider` | Node `fs` | desktop `service-container.js` `require('@mindsync/core')` | **中**：web 若误实例化会在浏览器炸；**非**密钥泄漏。生产 web 不走此路径 |
| `ElectronConfigManager` / `isElectronRenderer` | renderer env sync | `ModelManager` 内部依赖；desktop/renderer 共享 | **低**：无 API 时 throw / no-op |
| `SecretAwareStorageProvider` / `sealSecretField` / `openSecretField` / `PassthroughSecretCodec` / `SECRET_*` | 密钥字段编解码 **API** | desktop main 用 safeStorage codec；web 用 Passthrough | **中（API 面）**：暴露的是 **codec 接口**，不是密钥值；web 默认透传。禁止在 UI 日志打印 open 后明文 |
| `export-secrets` 脱敏函数 | 导出红action | ui DataManager / 导出路径 | **低**：主动脱敏，利于安全 |
| `createSecretAwareStorageProvider` | 工厂 | desktop composition root | 同 secret API |

> **不做本刀：** 把 `FileStorageProvider` / secret API 拆第三子路径（会动 desktop main + 多入口，超独立刀范围）。记为 follow-up。

---

## 4. 消费方依赖矩阵

| 包 | 依赖声明 | 生产解析 | 开发 alias | 直引 `@mindsync/core` | 直引 `./electron` |
|----|----------|----------|------------|----------------------|-------------------|
| `@mindsync/ui` | workspace:*（间接消费） | vite external | vitest 指 src | 大量类型+工厂 | **动态** `import('@mindsync/core/electron')` 仅 Electron 分支 |
| `@mindsync/web` | `workspace:*` core+ui | package exports | 仅 dev 指 src | 经 ui；本包 src **无**直引 | vite dev alias 存在；**运行时不 import** |
| `@mindsync/extension` | `workspace:*` core+ui | package exports | 仅 dev 指 src | 经 ui；本包 src **无**直引 | **无** electron alias / import |
| `@mindsync/mcp-server` | workspace:* | dist | — | 直接 core 工厂 | 无 |
| `@mindsync/desktop` | main `require('@mindsync/core')` | dist CJS | — | main + service-container | 无（主进程用真实现，不走 proxy） |

**结论：** web/extension **正确**声明 core 依赖；production build **不**绕过 exports 指源码；extension **不**碰 electron 子路径。

---

## 5. 防泄漏检查（本刀）

| 检查项 | 结果 |
|--------|------|
| 主入口 `index.ts` 无 `Electron*Proxy` 导出 | **PASS**（含 ImageUnderstanding 收口） |
| `dist/index.d.ts` 无 `ElectronImageUnderstanding` | **PASS**（rebuild 后） |
| `dist/electron.d.ts` 含全部 Proxy | **PASS** |
| `dist/index.js` 无 ImageUnderstanding proxy 符号 | **PASS** |
| deep import `@mindsync/core/services/*` | exports 无匹配 → 解析失败（设计意图） |
| web/extension src 直引 core 内部路径 | **无** |
| 密钥值进 bundle | 未在本刀发现硬编码密钥；密钥走 env / safeStorage / user storage |

---

## 6. 本刀代码变更

| 文件 | 动作 |
|------|------|
| `packages/core/src/index.ts` | 去掉 `ElectronImageUnderstandingServiceProxy` 再导出 |
| `packages/core/src/electron.ts` | 补导出该 Proxy |
| `packages/ui/.../useAppInitializer.ts` | Proxy 改从动态 `core/electron` 解构 |
| `scripts/package-scripts.test.mjs` | 加 exports 键集 + ImageUnderstanding 边界断言 |

---

## 7. Follow-up（非本刀）

1. 可选 `./node` 子路径：迁出 `FileStorageProvider` + secret codec 工厂，desktop 改 require 子路径。  
2. 审计主入口巨型 export 面是否可 type-only 分包（避免 web tree 误带 Node 图）——需 bundle 分析，非最小收口。  
3. `ElectronConfigManager` 是否可完全内聚、不从 index 再导出（对外仅 `isElectronRenderer`）。
