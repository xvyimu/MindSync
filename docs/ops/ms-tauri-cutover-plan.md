# MindSync · Tauri 2 Desktop 切流计划（A1 仅壳）

| 项 | 值 |
|----|-----|
| **日期** | 2026-07-24 |
| **状态** | Phase 1 文档 · **G1 前人禁止 src 实现** |
| **ADR** | [`../adr/0001-tauri-desktop-mainline.md`](../adr/0001-tauri-desktop-mainline.md) |
| **测绘** | [`ms-tauri-migration-scout-2026-07-24.md`](./ms-tauri-migration-scout-2026-07-24.md) |
| **范围** | Electron → Tauri2 **壳**；保留 Vue3/Naive/Vite/Pinia/core/pnpm/Web/扩展/MCP |
| **默认交付** | **G3 前 = Electron** |

---

## 0. 硬规则

1. **无 G1 → 禁止** 新建 Tauri 业务代码、改 UI 框架、拆 Electron。  
2. **最多一阶段** 功能双轨；禁止「Electron 改一处、Tauri 再抄一处」常态。  
3. UI **不**直接散落 `@tauri-apps/api`；经 adapter / 兼容 `electronAPI` facade。  
4. AI-Core 默认 OFF；Orca/开发面工具不进产品依赖。  
5. 高风险（push、删安装态、force、改生产更新源）先问人。  
6. 完成声明必须带 **命令 + exit code**。

---

## 1. 阶段总览

| 阶段 | 名 | 出口 | 人 gate |
|------|----|------|---------|
| M0 | 文档（本文件 + ADR + PROJECT 指针） | 文档可审 | **G1** |
| M1 | 脚手架 + 开窗 + 加载现 UI 构建 | 开发可起 Tauri 窗 | — |
| M2 | P0 commands + facade | version / 非密 preference / ping | — |
| M3 | 密钥 codec 等价 + 读旧数据 | 加密往返测 | — |
| M4 | 流式 + Abort 最小路径 | 取消有效证据 | **G2** |
| M5… | IPC 批次 B1–Bn | 每批测/脚本 | — |
| M6 | 远程存储 / 代理 | 与 Electron 行为对照 | — |
| M7 | 更新机制 | 可 **DEFER** | ADR D9 |
| M8 | 测量 + 全量回归清单 | 对比表 | — |
| M9 | cutover | 默认产物切换 | **G3** |

---

## 2. 阶段细则

### M0 · 文档（当前）

**做：**

- [x] scout  
- [x] ADR-0001  
- [x] 本 cutover-plan  
- [x] PROJECT / PRODUCT-LAYERS / CURRENT 指针（目标 vs 现行交付）

**验证：** 人审链接与范围 A1；**不**跑业务构建作为门闩。

**G1 问句：**  
「请审 ADR + cutover-plan。回复：批准开工 Phase2 / 要改 ADR / 中止。」

---

### M1 · 脚手架（G1 后 · wt 建议 `ms-tauri-shell`）

**做：**

- 仓内约定目录（建议 `packages/desktop-tauri` 或 `apps/desktop-tauri`，**实现时以开 PR 时目录为准，开前在 progress 钉死**）  
- Tauri2 + 现有 Vite UI（`@mindsync/web` / `web-dist` 同源构建）  
- `pnpm` 脚本：`dev:desktop-tauri`（名可调整）  
- **不删** `packages/desktop`

**验证（示例，落地时改真实脚本名）：**

```powershell
# 期望：进程起窗；exit 0 或人工确认窗体
pnpm dev:desktop-tauri
# 并行：Electron 仍可
pnpm -F @mindsync/desktop test   # 期望 exit 0
```

**DoD：** 窗体加载工作台壳；Electron 测试不红。

---

### M2 · P0 commands + adapter（wt `ms-tauri-commands`）

**P0 最小集：**

| 能力 | 现 channel / API | 优先级 |
|------|------------------|--------|
| 读版本 | `app-get-version` | P0 |
| preference get/set 非密 | `preference-*` 子集 | P0 |
| 健康 ping | 新建 `desktop-ping` 可接受 | P0 |
| openExternal | `shell-openExternal` | P0 |

**做：**

- Rust commands 或 Node sidecar（**选型在实现首 PR 写清；优先少引入第二运行时**）  
- TS facade：保持 `window.electronAPI` 兼容 **或** `desktopAPI` + 薄别名  
- `isRunningInElectron` 语义扩展为「桌面壳」或并行 `isRunningInDesktop`（**改探测须测 web 不被误判**）

**验证：**

```powershell
# adapter / command 单测（落地后补路径）
pnpm -F @mindsync/core test --run
# 期望：与桌面无关用例仍绿；新增测 exit 0
```

---

### M3 · 密钥

**做：**

- 替换 `createElectronSafeStorageCodec` 的后端为 Tauri 安全存储  
- 读取现有 `__enc:v1:` 或提供一次性迁移  
- 不可用时行为与 Electron 一致（警告，不伪装已加密）

**验证：** 单元测 round-trip；手工：保存 key → 重启 → 仍可用。

---

### M4 · 流式 + Abort（G2 入口）

**做：**

- 对齐 `owned-stream-runner` / `stream-cancel` 语义  
- 最小：一条 llm 或 prompt stream + UI Stop  
- 可 mock 模型

**验证：** 脚本或测：start → abort → 无继续 chunk；exit 0。

**G2 问句：**  
「垂直切片是否达标（开窗/P0 command/流式取消/测）？批准 Phase3 功能平移 / 退回 / 中止。」

---

### M5 · IPC 批次（Phase 3）

按 scout 域拆批；**一批一个 wt，完成再开下批**。

| 批 | 域 | 含 | DoD |
|----|----|----|-----|
| B1 | system + app 窗体 | version、locale、logs、zoom/menu 必要项 | 测或 smoke |
| B2 | preference + template + history + context | 非密配置与本地库 | core 代理测 |
| B3 | model + image-model | **密钥路径** | 加密 + CRUD |
| B4 | llm + prompt 全量流 | 含 tools stream | 取消 + 契约 |
| B5 | data + favorite | 导入导出、打开目录 | 脱敏默认 |
| B6 | remote-storage | S3/WebDAV | 凭证不进日志 |
| B7 | ai-core | 3 channel fail-closed | 默认 OFF |
| B8 | update | **DEFER 可选** | 见 M7 |

每批：**不破坏** core 公共 API；**Electron 仍可启动**。

---

### M6 · 代理与远程

- `proxy-dispatcher` / undici 行为对照  
- remote-storage 主进程逻辑迁移策略（Rust vs 保留 Node helper）

---

### M7 · 更新（DEFER 默认）

| 选项 | 说明 |
|------|------|
| DEFER | cutover 后首发仅「打开 GitHub Release」；文档写明 |
| 并行 | tauri-updater + 签名管道（另开子 ADR） |

**未完成 M7 不得在发行说明中宣称「与 Electron 同等自动更新」。**

---

### M8 · 测量与回归（Phase 4）

**同机对比表（必填模板）：**

| 指标 | Electron 基线 | Tauri | 步骤 |
|------|---------------|-------|------|
| 安装包 / zip MB | zip ~145.5 · 树 ~411（2026-07-24） | _ | 写命令 |
| 冷启动 s | _ | _ | 写步骤 |
| 空闲内存 MB | _ | _ | 任务管理器/脚本 |
| app 资源体积 | asar ~67.9 | _ | |

**回归清单（最小）：**

- [ ] `pnpm test:gate`（记录 exit）  
- [ ] desktop IPC 契约（Electron）仍绿  
- [ ] 新 Tauri 测  
- [ ] 手测：保存密钥、一次完整优化流、取消、导出脱敏、打开日志目录  

**默认交付仍为 Electron。**

---

### M9 · Cutover（G3）

**G3 问句：**  
「是否将 Desktop 默认交付改为 Tauri 并降级 Electron 为回滚面？批准 cutover / 维持双轨 / 回滚放弃 Tauri。」

**仅批准后：**

1. `PROJECT.md` 主形态句改为 Tauri2；Electron = 回滚面（写时长）  
2. 默认 builder / 安装说明改指向  
3. CURRENT 版本策略按发版 runbook（**勿瞎改版本号**）  
4. 保留 Electron 产物 ≥ 回滚窗  

---

## 3. 数据 / 密钥迁移

| 数据 | 策略 |
|------|------|
| `%APPDATA%\MindSync` | 优先同路径或显式迁移工具；禁止静默写到无关目录丢数据 |
| 历史 PromptOptimizer userData | 已有 `user-data-migration.js` 逻辑须有 Tauri 侧等价或复用 Node 一次性工具 |
| `__enc:v1:` keys | 可读旧 blob 或引导用户导出/再导入（导出默认脱敏 → 含密钥须确认） |
| IndexedDB 图像库 | 现 Electron 渲染进程 IndexedDB；WebView 同源策略须验证 |
| custom-templates | 仓外路径，**只读兼容、勿删** |

---

## 4. 双壳窗口规则

| 允许 | 禁止 |
|------|------|
| 开发脚本并存 `dev:desktop` 与 `dev:desktop-tauri` | 同一功能在两壳各写一套业务逻辑长期维护 |
| 以 Electron 为对照 oracle | G3 前拆 Electron 主路径 |
| facade 一套、双后端 | UI 内 `if (tauri) … else if (electron)` 蔓延无抽象 |

---

## 5. 风险登记

| ID | 风险 | 缓解 |
|----|------|------|
| R1 | 密钥迁移失败 | M3 硬门闩；保留导出 |
| R2 | 160 channel 尾部 | 分批 B1–B8；manifest 驱动清单 |
| R3 | 更新空洞 | M7 DEFER 明示 |
| R4 | 性能收益不达预期 | M8 数字；可 G3 选维持双轨或回滚 |
| R5 | 误伤 Web | 桌面探测单测；web 包不引入 Tauri |
| R6 | 范围蔓延换 UI | A1 门闩；总控 stop |

---

## 6. 工人前缀（分派复制）

```
---
产品：MindSync · D:\MindSync\src\mindsync
先读：docs/PROJECT.md · docs/adr/0001-tauri-desktop-mainline.md · 本任务范围
栈：Vue3/Naive/Vite/pnpm/@mindsync/core 不变；壳仅在任务允许目录
禁：push、删 Electron 主路径、换 UI 框架、AI-Core 默认进包、空口完成
验证：列出命令与 exit code
做完：短 findings → docs/ops/ 或 wt progress.md
---
```

---

## 7. 文档修订记录

| 日期 | 变更 |
|------|------|
| 2026-07-24 | 初版 · G0 A1 · 等 G1 |
