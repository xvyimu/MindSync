# MS-HARDEN-PRELOAD-CSP · Electron 隔离 / preload 暴露面 · 2026-07-24

> **模块：** M-MS-harden-preload-csp（G0=B Electron 硬化 · W4）  
> **基线：** `develop@221b767`  
> **分支：** `xvyimu/ms-harden-preload-csp`  
> **范围：** 审计 + 安全小修；**不**做生产 CSP 大改、不拆 desktop 主路径、不 asar。

## 结论

| 项 | 值 |
|----|-----|
| 隔离基线 | **已锁**：`nodeIntegration:false` · `contextIsolation:true` · `sandbox:true` · **显式** `webSecurity:true` |
| 导航/外链门闩 | 已有 `installMainFrameNavigationGuard`（will-navigate / windowOpen / webview 禁挂） |
| preload 事件面 | **收口**：`electronAPI.on/off` 仅 6 个 updater 事件白名单 |
| 生产 CSP HTTP 头 | **未引入**（本刀明确禁大改；file 协议 + 导航门闩为当前等价控制） |
| 验证 | `node --test packages/desktop/config/*.test.js` → **exit 0 · 92/92** |

**交付态：** 最小 diff + 矩阵文档 + 可测小修；feature 支可 push；**不 push develop**。

---

## 1. Scout 矩阵

### 1.1 `webPreferences`（`packages/desktop/main.js` → `createSecureWebPreferences`）

| 开关 | 本刀前 | 本刀后 | 说明 |
|------|--------|--------|------|
| `preload` | `preload.js` | 同左（必填） | 沙箱 preload |
| `nodeIntegration` | `false` | **强制 false** | 锁死，overrides 无效 |
| `contextIsolation` | `true` | **强制 true** | 锁死 |
| `sandbox` | `true` | **强制 true** | 锁死 |
| `webSecurity` | 未写（Electron 默认 true） | **显式 true** | 防漂移 |
| `allowRunningInsecureContent` | 默认 false | **显式 false** | 锁死 |
| `experimentalFeatures` | 默认 false | **显式 false** | 锁死 |

实现：`packages/desktop/config/window-security.js` · `SECURE_WEB_PREFERENCE_LOCKS` + `createSecureWebPreferences`。

### 1.2 导航 / 外链 / webview

| 控制 | 位置 | 状态 |
|------|------|------|
| 主 frame 允许源 | `isAllowedMainFrameNavigation` | prod=`file:` ∩ packagedRoot；dev=devServer origin |
| `will-navigate` 拒绝后外开 | `installMainFrameNavigationGuard` | 仅 http(s)+hostname → `shell.openExternal` |
| `setWindowOpenHandler` | 同左 | 一律 deny + 安全 URL 外开 |
| `will-attach-webview` | 同左 | preventDefault |
| `shell-openExternal` IPC | `system-handlers` + `isSafeExternalUrl` | 参数校验 |
| IPC sender 信任 | `ipc-security.isTrustedRendererSender` | 主 frame + 允许 URL |

### 1.3 preload 暴露面（`window.electronAPI`）

| 面 | 评估 | 本刀动作 |
|----|------|----------|
| 领域 invoke 代理（llm/model/template/…） | 宽但 **经 main `registerSecureIpcHandler` + channel-manifest** | 保留；IPC 硬化属既有 W 刀 |
| `config.getEnvironmentVariables` | 主进程 `getPublicRuntimeConfig` 过滤 | 保留 |
| `aiCore.*` | 无 Bearer 入 renderer | 保留 |
| `shell.openExternal` | main 侧 URL 校验 | 保留 |
| **`on` / `off` 任意 channel** | **过宽**：XSS 可挂任意 `ipcRenderer.on` | **收口白名单**（6 updater 事件） |
| 流式 `stream-*-${id}` | preload 内部注册；不经 `on` | 保持内部-only |
| 生产 HTTP CSP | 无 `session.webRequest` / meta CSP 加固 | **文档化 deferred**（禁本刀大改） |

#### `on`/`off` 白名单（与 `useUpdater` 对齐）

```
update-available-info
update-not-available
update-download-progress
update-downloaded
update-error
updater-download-started
```

注：main 另有 `preference-service-warning` send，**未**暴露给 renderer `on`（本刀前也未订阅）；保持不在白名单。

### 1.4 CSP 等价现状（非 HTTP CSP）

| 层 | 机制 | 覆盖 |
|----|------|------|
| 源隔离 | contextIsolation + sandbox + no nodeIntegration | 渲染进程无 Node |
| 同源/混合内容 | webSecurity true | 默认同源策略 |
| 顶层导航 | navigation guard | 防任意 page 加载 |
| 新窗/webview | deny / prevent | 防子面 |
| 外链 | isSafeExternalUrl | 仅 http(s) |
| IPC | trusted sender + known channels | 防外页 invoke |
| 公共 env | runtime-security 白名单 | 密钥不进 renderer |

**风险一句：** 未部署严格 HTTP CSP 时，若 renderer 出现 XSS，仍可调用已暴露的业务 `electronAPI` 域方法（invoke 面仍宽）；本刀收口事件订阅并锁 webPreferences，**不**替代后续「invoke 面最小化 / CSP」刀。

---

## 2. 代码变更

| 文件 | 变更 |
|------|------|
| `packages/desktop/config/window-security.js` | +`createSecureWebPreferences` · +event allowlist helpers |
| `packages/desktop/main.js` | webPreferences 改走 helper |
| `packages/desktop/preload.js` | `on` 拒绝非白名单 channel |
| `packages/desktop/config/window-security.test.js` | +2 测 |
| `packages/desktop/config/preload-stream-cancellation.test.js` | +allowlist 拒绝测 |

---

## 3. 验证（本条消息实跑）

```text
node --test packages/desktop/config/window-security.test.js \
  packages/desktop/config/preload-stream-cancellation.test.js \
  packages/desktop/config/runtime-security.test.js
→ exit 0 · 11/11

node --test packages/desktop/config/*.test.js
→ exit 0 · 92/92 · duration ~271ms
```

---

## 4. 不做 / 后续

| 项 | 原因 |
|----|------|
| 生产 meta/HTTP CSP 全量策略 | 任务禁大改；file 协议 + 导航门闩优先 |
| 收缩全部 invoke 代理为 per-channel expose | 范围大、易破 UI；属独立刀 |
| `session.setPermissionRequestHandler` | 无媒体/地理需求；可后续加固 |
| push develop / asar | 任务禁 |

---

## 5. Git

| 项 | 值 |
|----|-----|
| 基线 | `221b767` |
| 分支 | `xvyimu/ms-harden-preload-csp` |
| 提交 | 见本支 conventional commit |
| push | feature 支可选；**不** push develop |
