# ADR-0001 · Desktop 主交付目标改为 Tauri 2（仅壳）

| 项 | 值 |
|----|-----|
| **状态** | **Proposed → 待 G1 人批开工实现**（G0 已批：写 ADR + 范围 **A1 仅壳**） |
| **日期** | 2026-07-24 |
| **产品** | MindSync · `D:\MindSync\src\mindsync` |
| **决策人 gate** | G0 = **A + A1**（2026-07-24）；**G1** = 批准 Phase2 代码 / 要改 ADR / 中止 |
| **测绘** | [`../ops/ms-tauri-migration-scout-2026-07-24.md`](../ops/ms-tauri-migration-scout-2026-07-24.md) |
| **切流计划** | [`../ops/ms-tauri-cutover-plan.md`](../ops/ms-tauri-cutover-plan.md) |
| **栈 SSOT** | [`../PROJECT.md`](../PROJECT.md)（本文 Accepted 且 G3 前：**目标** Tauri2，**默认交付**仍 Electron） |
| **组合策略** | `D:\orca\.planning\portfolio-stack-policy-2026-07-24\STACK-POLICY.md`（本 ADR **有意**推翻其 §5.1「MS 不换栈」建议，仅在本仓 + 人 gate 下生效） |

---

## 1. 背景

1. Desktop 现行：**Electron 41** + electron-builder NSIS · appId `com.xvyimu.mindsync` · 版本 **2.11.7** · tip 测绘时 `221b767`。  
2. 安装树约 **411 MB**，zip 约 **146 MB**；`app.asar` ~68 MB。存在体积/常驻内存动机。  
3. 领域与 UI 已分层：`@mindsync/core` + Vue3/Naive；**160** IPC invoke channel；密钥走 `safeStorage`；流式有 `streamId` + Abort。  
4. Web / 扩展 / MCP **不**依赖 Electron 壳，可继续共用 core/ui。  
5. 组合默认建议曾为「不换栈、只硬化」；维护者于 G0 明确选择 **继续写 ADR，目标 Tauri2 主交付，范围仅壳（A1）**。

---

## 2. 决策

| 决策 | 内容 |
|------|------|
| **D1** | **目标** Desktop 主交付壳 = **Tauri 2**（WebView + Rust commands / 必要 sidecar）。 |
| **D2** | **范围仅壳（A1）**：保留 **Vue3 · Naive UI · Vite · Pinia · `@mindsync/core` · pnpm workspace · Web / 扩展 / MCP 入口形态**。 |
| **D3** | **过渡期默认交付仍为 Electron**，直至 **人 Gate G3** 批准 cutover。 |
| **D4** | Electron 目录与启动路径在 G3 前 **不得拆除**；最多短窗双轨，**禁止**功能双写为常态。 |
| **D5** | 渲染面继续通过 **稳定 facade**（兼容现 `window.electronAPI` 形状或显式 `desktopAPI` 别名）访问本机能力；UI 不散落 Tauri API。 |
| **D6** | 密钥须 OS 级加密等价物（Windows DPAPI / keyring 等）；**禁止**以明文落盘为默认成功路径。 |
| **D7** | 流式生成须可 **Abort**（对齐现 stream-cancel 语义）。 |
| **D8** | `services/ai-core` **默认 OFF**，不进默认安装资源（继承 AI-Core ADR）。 |
| **D9** | **自动更新**可与 Electron `electron-updater` 不等价首发；须在 cutover-plan 标 **DEFER** 与用户可见降级（如仅打开 Release 页），不得静默无更新策略。 |

**非决策（明确不做）：**

- React / 第二 UI 框架  
- Prisma / LangGraph / AutoGen  
- 无证据「重写一切」  
- Orca / MCP / codebase-memory 写进产品运行时依赖  
- 无 G3 将 Tauri 设为默认安装产物  

---

## 3. 替代方案

| 方案 | 结论 | 理由 |
|------|------|------|
| **A. 迁 Tauri2 主交付（本 ADR）** | **采纳为目标** | 体积/内存潜力；壳与领域已部分解耦；人 G0 选择 A1 |
| **B. 留 Electron + 硬化** | 未采纳为终态；**过渡期仍执行硬化不冲突** | 风险最低；与旧 STACK-POLICY 一致；作为回滚面与对照基线 |
| **C. 长期双壳并行** | **拒绝** | 双写成本、测试矩阵爆炸 |
| **D. 换 UI 框架或重写 core** | **拒绝（A1）** | 爆炸半径升维，与北极星冲突 |

---

## 4. 后果

### 4.1 正面

- 有望显著降低安装包与 Chromium 常驻成本（**须 Phase 4 同机测量，不可空口**）。  
- 逼出更清晰的 Desktop adapter 边界，利于 Web/扩展长期。  
- 与组合内 LexVoyage（已 Tauri）运维经验可部分互通（**不**复制 LV 的 React 栈）。

### 4.2 负面 / 成本

- **~160** channel 与安全模型平移工作量大。  
- `electron-updater`、proxy dispatcher、remote-storage 主进程实现需重做或 sidecar。  
- 用户数据路径与 `__enc:v1:` 密钥迁移一旦失败即为 P0。  
- 过渡期文档与 CI 矩阵变复杂。  
- 推翻组合 §5.1 默认建议 → 须在本机策略笔记/后续 STACK-POLICY 修订中挂链接（**不在本 ADR 改六仓文件**）。

### 4.3 回滚

- G3 前：默认安装与 `PROJECT` 交付描述保持 Electron；Tauri 仅开发/预览通道。  
- G3 后若失败：恢复 Electron 为默认 builder 产物；Tauri 标 `experimental` 或移除默认分发；保留用户数据兼容说明。  
- **回滚窗建议：** cutover 后至少 **2 个发版周期** 或 **30 天**（以先到为准）保留可安装的 Electron 产物与文档入口。

---

## 5. 迁移阶段（摘要）

详见 [`../ops/ms-tauri-cutover-plan.md`](../ops/ms-tauri-cutover-plan.md)。

| 阶段 | 内容 | 人 gate |
|------|------|---------|
| Phase 0 | 只读测绘 | G0 ✅ |
| Phase 1 | 本文 + cutover + PROJECT 指针 | **G1** |
| Phase 2 | 脚手架 + 垂直切片（开窗 / P0 command / 流式取消证明） | G2 |
| Phase 3 | 按 IPC 优先级批次平移 | 每批 DoD |
| Phase 4 | 体积/内存/启动对比 + 回归 | — |
| Cutover | 默认交付改 Tauri | **G3** |

---

## 6. 验收（目标态，G3 前为方向性）

1. 密钥：safeStorage 历史数据可读或有迁移工具；新写入加密。  
2. 流式：优化/对话可取消，有自动化或脚本证据。  
3. 本机路径：userData / 日志 / 导出导入行为有迁移说明。  
4. Web / 扩展 / MCP：`pnpm test:gate` 相关路径不因换壳红（允许 desktop 包专有测新增）。  
5. 体积与内存：同机对比表写入 ops，数字优于或可接受权衡 Electron 基线。  
6. 可回滚：Electron 启动与打包路径在回滚窗内可用。

---

## 7. 状态机

```
Proposed (G0 A1 后写就)
  → Accepted-for-implementation（G1 批 Phase2）
  → In-migration（Phase2–4）
  → Mainline（G3 cutover）
  → Superseded / Rolled-back（若 G3 否或事后回滚）
```

**当前：Proposed（文档已写，等 G1）。禁止在 G1 前合并 Tauri 业务实现到默认交付路径。**
