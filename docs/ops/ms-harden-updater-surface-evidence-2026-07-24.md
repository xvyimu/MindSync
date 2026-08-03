# MS-HARDEN-UPDATER-SURFACE · 证据 · 2026-07-24

> **模块：** M-MS-harden-updater-surface  
> **范围：** 更新检查/下载/安装/忽略版本/openReleasePage 路径审计 + 安全小修  
> **基线：** `develop@221b767`  
> **分支：** `xvyimu/ms-harden-updater-surface`  
> **禁止已守：** `git push develop` · asar · 生产默认 CSP 大改 · 改更新源到不可信 host

## 结论

| 项 | 值 |
|----|-----|
| 交付态 | **DONE · in-review** |
| 业务范围 | Desktop updater 面：`update-handlers` / `update-config` / preload 暴露 / main 注入 |
| 代码改动 | **有**（最小安全修） |
| 相对 develop | feature tip（本证据 commit） |
| 风险一句 | openRelease 现 fail-closed 到 github.com https；若未来切 generic feed 须同步 delivery policy，否则 release 外链会拒 |

## Scout 矩阵

| 路径 | 现状 | 判定 |
|------|------|------|
| **检查** `updater-check-update` / `updater-check-all-versions` | `secureHandle` + `assertTrustedRendererSender`；锁 `isCheckingForUpdate`；benign `latest.yml` 404 → 无更新 | OK |
| **下载** `updater-start-download` / `updater-download-specific-version` | manual-release（macOS）→ `UPDATER_MANUAL_DOWNLOAD_REQUIRED`；in-app 才 `downloadUpdate` | OK |
| **安装** `updater-install-update` | 同上 manual gate；`quitAndInstall` + `isUpdaterQuitting` | OK |
| **忽略** `updater-ignore-version` / unignore / get | 版本格式校验；本轮补 **versionType ∈ {stable,prerelease}** | 小修 |
| **openReleasePage** | main 已 `secureHandle`；**preload 未暴露** + **shell 未注入 ctx** → 运行时 `ReferenceError` | **修** |
| **sender 校验** | 全部 update invoke 经 `secureHandle` → `assertTrustedRendererSender`；未授权 → `IPC_UNTRUSTED_SENDER` 信封 | OK |
| **publish 源解析** | `getPublishRepositoryInfo` 仅 github object；array/generic → null + fail-closed `unknown`；host 白名单 `github.com` | OK |
| **release URL** | `buildReleaseUrl` / `buildFallbackReleaseUrl` 拒 unknown / 畸形 slug；本轮 open 再校验 **https + github.com** | 加固 |
| **macOS 策略** | `getUpdateDeliveryPolicy` → `manual-release` / `macos-unsigned`；下载安装拒；UI 走 release 页 | OK |
| **错误泄密** | `createDetailedErrorResponse` 已禁 stack 跨 IPC；但 `UPDATE_ERROR` 曾塞 **原始 Error 对象**；check-all 曾回 `error.message` | **修** |

## 本轮最小修

| 文件 | 变更 |
|------|------|
| `packages/desktop/config/ipc/update-handlers.js` | 要求 `ctx.shell`；openRelease 校验 version + host；ignore 校验 versionType；收敛 `UPDATE_ERROR` 与 check-all 错误字段 |
| `packages/desktop/main.js` | `createUpdateHandlers({ shell, … })` 注入 |
| `packages/desktop/preload.js` | `IPC_EVENTS.UPDATE_OPEN_RELEASE_PAGE` + `updater.openReleasePage` |

## 门闩 · 实跑 exit

| # | 命令 | Exit | 结果 |
|---|------|-----:|------|
| 1 | `node --test packages/desktop/config/update-config.test.js packages/desktop/config/update-delivery-policy.test.js packages/desktop/config/ipc-security.test.js` | **0** | **19/19** |
| 2 | `node --test packages/desktop/config/*.test.js` | **0** | **89/89** |
| 3 | `node --test scripts/desktop-ipc-handlers.test.mjs` | **0** | **11/11** |

## 不做（边界）

- 不 push `develop` / 不打 asar  
- 不改生产 CSP 默认 / 不拆 desktop 主路径  
- 不把更新源改到非 `github.com` host  
- 不修 core 全量既有 fail（另刀）

## 验证提示（人审）

1. Windows in-app：检查更新仍走 `xvyimu/MindSync` publish。  
2. macOS / manual：下载按钮应打开 release 页而非 in-app download。  
3. 渲染侧 `electronAPI.updater.openReleasePage()` 不再 undefined。  
