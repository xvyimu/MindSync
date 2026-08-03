# MS-HARDEN-IPC · Channel Matrix · 2026-07-24

> **模块：** M-MS-harden-ipc · 切片 1/3（G0=B Electron 硬化）  
> **协议：** `IPC_PROTOCOL_VERSION` **1.1.0**（无破坏性信封/名变更 → **未 bump**）  
> **基线 tip：** `221b767` · 分支 `xvyimu/ms-harden-ipc`

## 1. 域计数（加固后）

| 域 | 数 | 说明 |
|----|---:|------|
| llm | 7 | 含 `stream-cancel` |
| prompt | 11 | sync + stream |
| model | 11 | 已删幽灵 `model-getModels` |
| image | 23 | model-config + generate + understanding |
| template | 15 | 已删幽灵 `template-getSupportedLanguages` |
| history | 17 | |
| context | 16 | |
| favorite | 25 | |
| data | 4 | |
| preference | 10 | |
| system | 4 | 已删 `logs-get-paths` / `logs-open-directory` |
| ai-core | 3 | optional side-car |
| update | 9 | 含 `updater-open-release-page` |
| remote-storage | 1 | `remote-storage:invoke` |
| **ALL_DOMAIN_CHANNELS** | **156** | invoke 合计 |
| UPDATE_EVENT_CHANNELS | 6 | main → renderer 事件（非 invoke） |

## 2. 三面对照（preload / manifest / handle）

| 面 | 计数 | 备注 |
|----|-----:|------|
| preload invoke（字面量 + `IPC_EVENTS` + `REMOTE_STORAGE_CHANNEL`） | 156 | 与 manifest 对齐 |
| manifest `ALL_DOMAIN_CHANNELS` | 156 | |
| `registerSensitiveIpc` / `secureHandle` | 156 | 域 handler + update + remote-storage 主路径 |
| bare `ipcMain.handle('…')` 字面量 | 0 | remote-storage legacy 仅变量 fallback（测试/裸 ipcMain） |

| Gap 类 | 结果 |
|--------|------|
| preload-only | **[]** |
| manifest-only | **[]**（收敛后） |
| handle-only | **[]**（忽略注释示例 `...`） |
| 未走 registerSensitiveIpc / secureHandle | **[]**（领域敏感面全覆盖；update 用 secureHandle+sender） |

## 3. 本轮收敛的幽灵 / 缺口

| Channel | 原状态 | 动作 |
|---------|--------|------|
| `model-getModels` | manifest + handler；preload `getModels` 实际 invoke `model-getAllModels` | **移除** handler+manifest；preload deprecated alias 保留 |
| `template-getSupportedLanguages` | manifest + handler；无 preload / 无 Electron proxy 调用 | **移除** |
| `logs-get-paths` | manifest + handler；无 preload / 无 UI | **移除** |
| `logs-open-directory` | 同上 | **移除** |
| `updater-open-release-page` | manifest + secureHandle；**preload 未暴露** → UI `openReleasePage` 失效 | **补 preload**（`IPC_EVENTS.UPDATE_OPEN_RELEASE_PAGE`） |
| `remote-storage:invoke` | manifest + secure 注册；preload 用常量 | 保持；契约测显式解析常量 |

## 4. 全量清单（按域）

### llm (7)
`llm-testConnection`, `llm-sendMessage`, `llm-sendMessageStructured`, `llm-fetchModelList`, `llm-sendMessageStream`, `llm-sendMessageStreamWithTools`, `stream-cancel`

### prompt (11)
`prompt-optimizePrompt`, `prompt-optimizeMessage`, `prompt-iteratePrompt`, `prompt-testPrompt`, `prompt-getHistory`, `prompt-getIterationChain`, `prompt-optimizePromptStream`, `prompt-optimizeMessageStream`, `prompt-iteratePromptStream`, `prompt-testPromptStream`, `prompt-testCustomConversationStream`

### model (11)
`model-addModel`, `model-updateModel`, `model-deleteModel`, `model-ensureInitialized`, `model-isInitialized`, `model-getAllModels`, `model-getEnabledModels`, `model-exportData`, `model-importData`, `model-getDataType`, `model-validateData`

### image (23)
`image-model-ensureInitialized`, `image-model-isInitialized`, `image-model-getAllConfigs`, `image-model-getConfig`, `image-model-addConfig`, `image-model-updateConfig`, `image-model-deleteConfig`, `image-model-getEnabledConfigs`, `image-model-exportData`, `image-model-importData`, `image-model-getDataType`, `image-model-validateData`, `image-generate`, `image-generateText2Image`, `image-generateImage2Image`, `image-generateMultiImage`, `image-validateRequest`, `image-validateText2ImageRequest`, `image-validateImage2ImageRequest`, `image-validateMultiImageRequest`, `image-testConnection`, `image-getDynamicModels`, `image-understanding-understand`

### template (15)
`template-getTemplates`, `template-getTemplate`, `template-createTemplate`, `template-updateTemplate`, `template-deleteTemplate`, `template-listTemplatesByType`, `template-exportTemplate`, `template-importTemplate`, `template-exportData`, `template-importData`, `template-getDataType`, `template-validateData`, `template-changeBuiltinTemplateLanguage`, `template-getCurrentBuiltinTemplateLanguage`, `template-getSupportedBuiltinTemplateLanguages`

### history (17)
`history-getHistory`, `history-addRecord`, `history-deleteRecord`, `history-clearHistory`, `history-getIterationChain`, `history-getAllChains`, `history-getChain`, `history-createNewChain`, `history-addIteration`, `history-deleteChain`, `history-exportData`, `history-importData`, `history-getDataType`, `history-validateData`, `history-getUsage`, `history-getMaxRecords`, `history-setMaxRecords`

### context (16)
`context-list`, `context-getCurrentId`, `context-setCurrentId`, `context-get`, `context-create`, `context-duplicate`, `context-rename`, `context-save`, `context-update`, `context-remove`, `context-exportAll`, `context-importAll`, `context-exportData`, `context-importData`, `context-getDataType`, `context-validateData`

### favorite (25)
`favorite-addFavorite`, `favorite-getFavorites`, `favorite-getFavorite`, `favorite-updateFavorite`, `favorite-setFavoritePromptAssetCurrentVersion`, `favorite-deleteFavoritePromptAssetVersion`, `favorite-deleteFavorite`, `favorite-deleteFavorites`, `favorite-incrementUseCount`, `favorite-getCategories`, `favorite-addCategory`, `favorite-updateCategory`, `favorite-deleteCategory`, `favorite-getStats`, `favorite-searchFavorites`, `favorite-exportFavorites`, `favorite-importFavorites`, `favorite-getAllTags`, `favorite-addTag`, `favorite-renameTag`, `favorite-mergeTags`, `favorite-deleteTag`, `favorite-reorderCategories`, `favorite-getCategoryUsage`, `favorite-ensureDefaultCategories`

### data (4)
`data-exportAllData`, `data-importAllData`, `data-getStorageInfo`, `data-openStorageDirectory`

### preference (10)
`preference-get`, `preference-set`, `preference-delete`, `preference-keys`, `preference-clear`, `preference-getAll`, `preference-exportData`, `preference-importData`, `preference-getDataType`, `preference-validateData`

### system (4)
`config-getEnvironmentVariables`, `shell-openExternal`, `app-get-version`, `app-set-locale`

### ai-core (3)
`ai-core-get-status`, `ai-core-probe-health`, `ai-core-run-evaluation`

### update (9)
`updater-check-update`, `updater-check-all-versions`, `updater-start-download`, `updater-install-update`, `updater-ignore-version`, `updater-unignore-version`, `updater-get-ignored-versions`, `updater-download-specific-version`, `updater-open-release-page`

### remote-storage (1)
`remote-storage:invoke`

### update events (6 · 非 invoke)
`update-available-info`, `update-not-available`, `update-download-progress`, `update-downloaded`, `update-error`, `updater-download-started`

## 5. 安全结论（切片 1）

- 领域 invoke 一律经 `registerSensitiveIpc` → `registerSecureIpcHandler`（sender 校验 + 信封 + 已知 channel 断言）。
- update 经 `secureHandle`（自行信封，强制 `assertTrustedRendererSender` + `assertKnownInvokeChannel`）。
- 本轮缩小 main 未授权面：去掉 4 个无 preload 消费者的 channel；补齐 manual-release 所需 preload 暴露。
- **风险一句：** 移除未暴露 log channel 与别名 handler 对当前 UI 无调用面；若外部脚本直接 `ipcRenderer.invoke` 旧名会失败——属预期收敛。
