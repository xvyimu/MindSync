# 桌面软件重设计方案（评审稿 · 2026-07-21 · v2）

> 状态：**R0 已落地于分支 `feature/redesign-shell` · 未 push · 未合 develop**。默认 flag OFF，旧布局零影响。
> 目标：重新设计一个"我想要的"桌面软件；**全局 UI 强制规范**（§4）吸收自用户提供的设计宪法，全站严格遵守。
> 参照：**Naive UI Admin**（侧栏 + 顶栏后台骨架）。
> 前置澄清：MindSync 已是 `app→ui→core` + Electron——本方案聚焦桌面 UI，不拆后端、不换栈。

---

## 0. 决策状态（v2 已根据设计宪法收敛）

| # | 决策 | 状态 | 说明 |
|---|------|------|------|
| D1 | 布局范式 | **已定 · 侧边栏 + 顶部导航** | 设计宪法 §4 + 参照 Naive UI Admin |
| D2 | 功能与交互 | **已定 · 保功能换壳** | 用户确认 1 |
| D3 | 视觉方向 | **已定 · 现代极简 + Paper 收口** | 见 §4 |
| 参照 | Naive UI Admin | **已定** | 用户确认 3 |
| 起步 | R0 | **已完成（flag 默认关）** | 用户确认 2；见 §10 阶段报告 |

---

## 1. 现状盘点（已读代码）

**布局骨架**（`MainLayout.vue`）：单层 `NLayoutHeader`（`title │ core-nav │ actions`）+ 全高 `NLayoutContent`，工作区靠 `RouterView` 切换。

**顶栏承载**（`AppHeaderActions.vue`）：页面型入口（收藏夹）+ 弹窗型入口（模板/历史/模型/数据/变量）+ 辅助区（主题/GitHub/关于/语言/更新）——**顶栏过载**。

**设计系统**（`config/naive-theme.ts` + `styles/paper.css`）：

- 7 套主题走 Naive UI `themeOverrides`；Paper 已接近设计宪法色板
- Paper token：8pt 间距、`--paper-radius-*`、离线字体、WCAG AA、hairline
- 127 个组件

**结论**：底子成熟 → **"收口 + 重排"而非推倒**。杠杆点 = 布局范式 + 顶栏过载 + **token 强制对齐设计宪法**。

---

## 2. 核心痛点

| P | 痛点 | 证据 |
|---|------|------|
| P1 | 顶栏过载 | 模式选择 + 6 管理入口 + 5 辅助图标挤一行 |
| P2 | 管理功能靠 modal | 打断工作流、无法并列参考 |
| P3 | 无持久导航骨架 | 功能模式靠顶栏 radio |
| P4 | 工作区三段等权 | 缺主次 |
| P5 | token 未强制 | Paper 有 12px/48px 间距、按钮圆角 6px 等，与宪法"仅允许值"有偏差；7 主题并存削弱"全局强制" |

---

## 3. 目标布局（三区骨架 · 全站固定）

```
┌──────────────────────────────────────────────────────────┐
│ 顶栏（瘦身 · 固定高）  Logo · 面包屑/工作区名 ··· 主题 语言 更新 关于 │
├────────────┬─────────────────────────────────────────────┤
│            │                                              │
│ 左侧栏      │            主内容区（RouterView · 卡片式）      │
│ (可折叠)    │                                              │
│            │   优化工作区 / 收藏页 / 评估页 …               │
│ · 基础      │                                              │
│ · 上下文     │                                              │
│ · 图像      │                                              │
│ ────────   │                                              │
│ 模板        │                                              │
│ 历史        │                                              │
│ 模型        │                                              │
│ 变量        │                                              │
│ 数据        │                                              │
│ 收藏        │                                              │
└────────────┴─────────────────────────────────────────────┘
```

- **左侧栏**（`NLayoutSider`）：上=功能模式；下=管理入口。
- **顶栏瘦身**：Logo + 面包屑 + 辅助区。
- **管理入口**：优先侧滑抽屉（与主区并列），modal 作 fallback。
- **主内容**：卡片式模块分隔；优化结果为主焦点，原始输入可折叠，测试区按需展开。

---

## 4. 全局 UI 强制规范（设计宪法 · 全站遵守 · 禁止自行改动）

> 本节吸收用户提供的规范，并映射到现有 Naive UI / Paper 实现路径。  
> **编码时任何页面、组件不得自创配色 / 尺寸 / 风格。** 偏离 = 缺陷。

### 4.1 整体风格

| 要 | 不要 |
|----|------|
| 现代极简、干净克制、留白充足 | 多余装饰、渐变、发光、花哨特效 |
| 扁平化高级简约 | 多重阴影、拟物、炫光 |
| Vue3 + Naive UI 统一设计语言 | 引入第二套组件库 / 换栈 |

### 4.2 色彩体系（唯一合法值）

| 角色 | 值 | 用途 |
|------|-----|------|
| 主色（强调） | `#3b82f6` | 仅强调：主按钮、链接、active、焦点环 |
| 主色悬停 / 按下 | `#2563eb` / `#1d4ed8` | 交互态（沿用 Paper） |
| 大面积底 | `#ffffff` · `#f8fafc` · `#f1f5f9` | 卡片 / 页面底 / 次级面 |
| 主文字 | `#1e293b` | 标题、正文 |
| 次要文字 | `#64748b` | 说明、标签 |
| 辅助文字 | `#94a3b8` | 占位、次级 meta |
| 边框 / 分割 | `#e2e8f0` · `#eef2f6` | hairline |
| 成功 / 警告 / 错误 | `#059669` / `#d97706` / `#dc2626` | 语义色（沿用 Paper） |

**深色模式**：自动跟随系统（`auto`）或用户选择；配色柔和，主色仍为蓝系强调，不刺眼。实现路径：现有 `dark` + `prefers-color-scheme` 监听。

**主题收敛策略（强制）**：

- **产品默认视觉 = Paper 收口版**（色板对齐上表）。
- 其余 6 套主题（light/blue/classic/green/purple 等）：**开发期可保留源码，产品默认不暴露入口**；若保留切换，也必须通过 `themeOverrides` 映射到同一套间距/圆角/字号 token，禁止各自为政。

### 4.3 固定尺寸 Token（禁止自定义其它数值）

| Token | 合法值 | 映射 |
|-------|--------|------|
| 圆角 · 卡片 | **8px** | `common.borderRadius` / Card |
| 圆角 · 弹窗 | **8px** | Modal / Drawer |
| 圆角 · 按钮 | **4px** | Button `borderRadius`（Paper 当前 `borderRadiusSmall: 6px` → **改为 4px**） |
| 间距 | **仅** `4 / 8 / 16 / 24 / 32` px | 废除 Paper 现有 `12px`、`48px` 档；组件 gap/padding 只准这五档 |
| 阴影 | **单层极淡** 一例 | 推荐：`0 1px 2px rgba(15, 23, 42, 0.06)`；**禁止**多重阴影；Paper 当前 hairline 可保留为卡片默认，需要抬升时只用这一层 |

### 4.4 排版规则（四档字号 · 禁止其它）

| 档 | 字号 | 用途 |
|----|------|------|
| 标题 | **18px** | 页面/卡片标题 |
| 副标题 | **16px** | 区块标题、强调正文 |
| 正文 | **14px** | 默认正文、表单、列表 |
| 辅助 | **12px** | meta、标签、说明 |

- 行高放宽（建议 body `1.6`、标题 `1.4`），页面大量留白，元素不拥挤。
- 字体栈：沿用 Paper 离线栈（IBM Plex Sans / JetBrains Mono + 系统 fallback），**不拉 CDN 字体**。

### 4.5 布局规范（全站结构固定）

1. **经典后台布局**：左侧栏 + 顶部导航 + 右侧内容区——**所有页面同一骨架**，禁止某页另起炉灶。
2. **卡片式模块**：模块之间分隔清晰（卡片圆角 8px + 合法边框/单层淡阴影）。
3. 主内容区内区块划分先于编码：先画区块树，再分块写组件。

### 4.6 UX 交互规范

| 项 | 要求 | 实现路径（既有能力优先） |
|----|------|--------------------------|
| 路由 / 弹窗动画 | 柔和短动画（≤ 220ms，沿用 `--paper-dur-med`） | Naive 默认 transition + 既有 duration token |
| 异步 | 骨架屏 + Loading | `NSkeleton` / `NSpin`（已在 init 使用） |
| 操作反馈 | 轻量 Toast | 既有 toast 体系 |
| 表单 | 实时校验 | Naive `Form` rules + blur/input |
| 主题记忆 | 自动保存用户设置 | 已有 `useGlobalSettings` 持久化 |
| 自适应 | 支持窄窗 / 小屏 | 侧栏可折叠；**桌面主场景**，移动端为加分非阻断；不单独做手机 App |

### 4.7 硬性编码约束（开发纪律）

| # | 约束 |
|---|------|
| C1 | **不写内联样式**（`style=""` / `:style` 动态拼色尺寸禁止；动态 class 绑定除外） |
| C2 | **不新增 ad-hoc 自定义 CSS 文件**；样式只走两条合法通道：① Naive `themeOverrides` ② 既有 `paper.css` token（仅扩展 token，不写组件级花活） |
| C3 | **先划分页面区块，再分块编码**；禁止一次性生成整页大文件 |
| C4 | **不自由发挥装饰**：无额外图标堆砌、无渐变、无发光、无自定义插画除非产品明确要求 |
| C5 | **Token 越界 = bug**：间距/圆角/字号/色值不在 §4.2–4.4 列表内，PR/自检一律打回 |
| C6 | **分层边界**：只在 `packages/ui`（+ 必要时 `app` 壳）改布局/视觉；**禁止改 `core` 业务语义** 只为换皮 |

### 4.8 与现有 Paper 的差异收敛表（落地时必须改）

| 项 | 现状 Paper | 宪法要求 | 动作 |
|----|------------|----------|------|
| 主色 / 页面底 / 卡片白 | 已对齐 `#3b82f6` / `#f8fafc` / `#fff` | 同左 | 保持 |
| 次要文字 | `#475569`（textColor2） | `#64748b` | **themeOverrides 对齐** |
| 辅助文字 | `#64748b`（textColor3） | `#94a3b8` | **themeOverrides 对齐** |
| 间距档 | 含 12、48 | 仅 4/8/16/24/32 | **删档 + 组件 gap 审计** |
| 按钮圆角 | small 6px | **4px** | overrides 改 |
| 卡片/弹窗圆角 | 8px | 8px | 保持 |
| 阴影 | 默认 hairline 无 elevation | 单层极淡可选 | 统一一个 shadow token |
| 字号 | 未锁四档 | 18/16/14/12 | Typography 约定 + 组件自检 |
| 多主题入口 | 7 套可切 | 全局强制统一语言 | 默认 Paper；其它入口产品侧隐藏或 token 化 |

---

## 5. 组件影响清单

| 层 | 文件 | 改动 | 风险 |
|----|------|------|------|
| 布局 | `MainLayout.vue` | `NLayoutSider` + 折叠；顶栏 slot 重排 | 中 |
| 导航 | `AppCoreNav.vue` | 逻辑复用，迁侧栏 | 低 |
| 顶栏 | `AppHeaderActions.vue` | 管理入口迁侧栏；辅助区留顶 | 中 |
| 新增 | `AppSideNav.vue` | 侧栏（模式 + 管理） | 隔离新增 |
| 主题 | `naive-theme.ts` | §4.8 收敛；默认 Paper；Button 圆角 4px；文字级色 | 中（视觉全站） |
| Token | `paper.css` | 间距仅五档；shadow token；禁止新装饰类 | 低 |
| 工作区 | `Basic*/Context*Workspace.vue` | 卡片式主次布局（分阶段） | 中 |
| 审计 | 全 `packages/ui` | 间距/字号/内联 style 扫描 | 一次性 |

**不碰**：`core`、IPC、导出脱敏、评估引擎、路由 path 定义（仅复用）。

---

## 6. 分阶段落地（每阶段可验证、可回滚）

| 阶段 | 内容 | 验收 |
|------|------|------|
| **R0** | `feature/redesign-shell`；`MainLayout` 空侧栏骨架 + feature flag（默认关） | 旧布局零影响；typecheck 过 |
| **R1** | §4.8 token 收敛进 `naive-theme.ts` + `paper.css`；默认 Paper | 色/圆角/间距合法；抽检页面无越界 |
| **R2** | `AppSideNav`：功能模式迁侧栏 | 三模式切换 ≡ 旧顶栏 |
| **R3** | 管理入口迁侧栏 + 抽屉化；顶栏瘦身 | 六类管理可达；modal fallback |
| **R4** | 工作区卡片式主次布局 + 骨架/Toast 审计 | 优化闭环手测；§4.6 交互项勾选 |
| **R5** | 全仓 token 审计（间距/字号/内联 style）+ 自检报告 | C1–C6 全绿 |

每阶段纪律（吸收 Vibe Coding 交付节奏）：

1. 子任务 + 验收标准写清再编码  
2. 只在 feature 分支改  
3. 五维自检：架构合规 / 代码质量 / 功能完整 / 性能 / 安全  
4. 阶段小结：改动文件 · 合规结论 · 风险 · 是否建议进入下一阶段  
5. **不 push / 不合 develop**，除非你明确授权  

---

## 7. 自检清单（合并前必过）

- [ ] 无内联样式承载色/尺寸  
- [ ] 无新增 ad-hoc CSS 文件  
- [ ] 间距仅 4/8/16/24/32  
- [ ] 圆角：按钮 4 / 卡片·弹窗 8  
- [ ] 字号仅 12/14/16/18  
- [ ] 主色仅 `#3b82f6` 作强调，无大面积色块滥用  
- [ ] 无渐变 / 发光 / 多重阴影  
- [ ] 全页同一：侧栏 + 顶栏 + 内容  
- [ ] 异步有 Spin/Skeleton；操作有 Toast  
- [ ] 主题选择可持久化  
- [ ] 未改 `core` 业务语义  

---

## 8. 已知风险

| 风险 | 缓解 |
|------|------|
| 127 组件历史间距含 12/48，一次改完易漏 | R5 专门审计 + rg 扫描；分批修 |
| "不写自定义 CSS" 与既有 scoped 样式冲突 | 新代码严守 C1–C2；旧 scoped 仅在触达时收敛，不顺手大扫除 |
| 侧栏改布局可能影响 E2E / testid | 保留关键 `data-testid`；R2/R3 后跑既有 UI 测试 |
| 用户期望"彻底改造" vs 实际是收口重排 | 文档开篇已说明；视觉宪法落地后观感会明显统一 |

---

## 9. 下一步

- **R0 完成**（本分支）→ 待你验收 flag ON 预览后进 **R1（token 收敛）**。
- 预览 shell：浏览器/桌面 dev 控制台执行 `localStorage.setItem('ui:redesign-shell','1')` 后刷新；或 URL `?redesignShell=1`。
- 关回旧布局：`localStorage.removeItem('ui:redesign-shell')` 或 `?redesignShell=0`。
- **不 push / 不合 develop**，除非你明确授权。

---

## 10. R0 阶段报告（2026-07-21）

### 功能概述
落地 Naive UI Admin 风格壳的**空骨架**：左侧 `NLayoutSider`（可折叠）+ 顶栏 + 内容区；由 feature flag 控制，**默认 OFF**，与旧布局并存。侧栏仅占位文案，**无导航接线**（R2/R3）。

### 改动文件清单
| 文件 | 动作 |
|------|------|
| `packages/ui/src/config/redesign-shell.ts` | 新增 flag（localStorage + query） |
| `packages/ui/src/components/app-layout/AppSideNav.vue` | 新增侧栏骨架 |
| `packages/ui/src/components/MainLayout.vue` | flag 双路径：legacy / shell |
| `packages/ui/src/components/app-layout/index.ts` | 导出 `AppSideNav` |
| `packages/ui/tests/unit/redesign-shell.test.ts` | 新增 4 用例 |
| `docs/project/REDESIGN-PROPOSAL-2026-07-21.md` | 方案 v2 + 本报告 |

### 验收
| 项 | 结果 |
|----|------|
| flag 默认 OFF | **pass**（单测 + 代码） |
| `?redesignShell=1` / localStorage 开启 | **pass**（单测 4/4） |
| `pnpm -F @prompt-optimizer/ui typecheck` | **pass** |
| 未改 `core` / IPC / 业务语义 | **pass** |
| 间距 token 新代码仅 4/8/16/24/32 | **pass**（AppSideNav） |

### 架构合规自检
- 分层：仅 `packages/ui` → **合规**
- 不擅自加第三方依赖 → **合规**
- 设计宪法 C1：MainLayout 去掉根节点内联 fixed 样式，改 class → **改善**；content-style 仍走 Naive 的 `content-style` prop（库约定，等同组件 API 非手写 style 标签）
- 参照 Naive UI Admin：`NLayout has-sider` + `NLayoutSider collapse-mode=width` → **对齐**

### 已知风险
- R0 开启后顶栏仍保留 `core-nav` + 全部 actions（保证可用）；视觉上侧栏与顶栏功能重复，属预期，R2/R3 消化。
- `MainLayout.vue` 仍有历史 `!important` 与 12px padding（旧路径）；R1 token 收敛时一并处理。
- fetch origin 本环境 SSL 失败，分支仅本地。

### 合并建议
**不合并**。等你本地 flag ON 预览 OK → 授权后进 R1；整包 redesign 完成前保持 feature 分支。

---

## 附录 A · 设计宪法原文要点索引

| 原文块 | 落入本节 |
|--------|----------|
| 整体风格 / 组件库 | §4.1 |
| 色彩体系 | §4.2 |
| 固定尺寸 Token | §4.3 |
| 排版规则 | §4.4 |
| 布局规范 | §3 + §4.5 |
| UX 交互 | §4.6 |
| 硬性约束 | §4.7 |
| 与 Paper 对齐 | §4.8 |
