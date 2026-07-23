# M2 · ms-tauri-facade progress

| 项 | 值 |
|----|-----|
| **日期** | 2026-07-25 |
| **任务** | M2-design · 桌面 facade（P0）+ 探测 + mock 单测 |
| **分支 / wt** | `xvyimu/ms-tauri-facade` |
| **并行** | M1 shell 脚手架另 wt；本 wt **不**建 Tauri 工程、**不**实现 160 IPC |
| **禁** | push · 删 Electron · 换 UI |

---

## 1. 取舍（facade 形状）

| 选项 | 结论 | 理由 |
|------|------|------|
| **A. 只改名 `desktopAPI`，全面弃用 `electronAPI`** | 否 | Vue/core 大量 `window.electronAPI` 与 Electron*Proxy；全仓改名爆炸 |
| **B. 仅保持 `electronAPI`，Tauri 直接塞同名** | 可用但弱 | 命名误导；探测难区分壳 |
| **C.  canonical `desktopAPI` + 默认别名 `electronAPI`（采纳）** | **是** | 新壳装 `desktopAPI`；`installDesktopApi` 默认镜像到 `electronAPI`，现有 proxy **零改**；Web 无 bridge 不误判 |

**实现要点：**

- 工厂：`createDesktopApiFromBackend(backend)` — shell/commands 只实现 `invoke(command, …args)`  
- 安装：`installDesktopApi(api, { aliasElectronAPI?, aliasDesktopAPI? })`  
- 解析：`resolveDesktopApi()` 优先 `desktopAPI` → 回退 `electronAPI`  
- 探测：新增 `isRunningInDesktop` / `isDesktopApiReady` / `waitForDesktopApi`；`isRunningInElectron` 保留兼容（env=`electron` 严格；自动探测见 bridge 则 true，便于旧路径；env=`tauri` 时 desktop=true、electron=false）  
- AppInitializer：分支条件改为 `isRunningInDesktop()`，仍动态 import `@mindsync/core/electron` 代理（G3 前 Electron 代理名可保留）

**明确不做（本切片）：**

- 完整 160 channel 类型  
- `@tauri-apps/api` 进 UI/core  
- 密钥 / 流式 / updater  
- 删除或拆 `packages/desktop`

---

## 2. 代码落点

| 路径 | 角色 |
|------|------|
| `packages/core/src/desktop/commands.ts` | P0 invoke 名表 SSOT |
| `packages/core/src/desktop/types.ts` | `DesktopP0API` / `DesktopCommandBackend` |
| `packages/core/src/desktop/backend.ts` | backend → P0 API 工厂 |
| `packages/core/src/desktop/mock.ts` | 可测 mock 后端 |
| `packages/core/src/desktop/install.ts` | window 安装 / resolve / uninstall |
| `packages/core/src/desktop/index.ts` | 包内入口 |
| `packages/core/src/utils/environment.ts` | 桌面探测扩展 |
| `packages/core/src/index.ts` | 导出 facade + 探测 |
| `packages/core/src/types/global.d.ts` | `window.desktopAPI` 类型 |
| `packages/core/tests/unit/desktop/facade.test.ts` | 探测 + mock 单测 |
| `packages/ui/.../useAppInitializer.ts` | `isRunningInDesktop` 分支（少改） |

---

## 3. commands wt 对接 · P0 invoke 名表

> shell/commands 实现时 **必须** 使用下列 channel/command 名（与现 Electron IPC 对齐；`desktop-ping` 为新增）。

| 能力 | invoke 名 | 参数 | 返回（业务层，unwrap 后） |
|------|-----------|------|---------------------------|
| 读版本 | **`app-get-version`** | — | `string` |
| 偏好读（非密） | **`preference-get`** | `(key: string, defaultValue: unknown)` | `T` |
| 偏好写（非密） | **`preference-set`** | `(key: string, value: unknown)` | `void` |
| 健康 ping | **`desktop-ping`** | — | `{ ok: true, shell: 'electron'\|'tauri'\|'mock'\|'unknown', ts: number }` |
| 外链 | **`shell-openExternal`** | `(url: string)` | 任意成功值（Electron 现行为 `data`） |

常量导出：`DESKTOP_P0_COMMANDS` / `DESKTOP_P0_COMMAND_LIST`（`@mindsync/core`）。

**对接伪码（commands wt）：**

```ts
import {
  createDesktopApiFromBackend,
  installDesktopApi,
  DESKTOP_P0_COMMANDS,
  type DesktopCommandBackend,
} from '@mindsync/core'

const backend: DesktopCommandBackend = {
  shellKind: 'tauri',
  invoke: (command, ...args) => tauriInvoke(command, args), // 自行适配 payload 形状
}
installDesktopApi(createDesktopApiFromBackend(backend, { shellKind: 'tauri' }))
// → window.desktopAPI + window.electronAPI 均可用
```

Electron 现状：preload 已实现除 **`desktop-ping`** 外的四条；commands/shell 侧可补 ping 或由 facade 层在 Electron 上 polyfill（后续小 PR）。

---

## 4. 验证（本消息内实跑）

```text
pnpm -F @mindsync/core exec vitest run tests/unit/desktop/facade.test.ts
```

| 结果 | 值 |
|------|-----|
| Test Files | **1 passed** |
| Tests | **11 passed** |
| Duration | ~1.5s |
| **exit code** | **0** |

覆盖：Web 不误判 · env web/electron/tauri · electronAPI / desktopAPI 自动探测 · wait 轮询 · mock version/preference/ping/openExternal · command 名表。

---

## 5. 后续（非本任务）

| 项 | 负责 |
|----|------|
| Tauri `invoke` 实现上表 5 命令 | ms-tauri-shell / commands wt |
| Electron preload 补 `desktop-ping` + 可选 `desktopAPI` 镜像 | desktop 小 PR |
| 密钥 / 流式 | M3 / M4 |
| 160 channel 分批 | cutover B1–B8 |

---

*M2-design facade · 无 push · 与 M1 并行。*
