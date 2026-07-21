# NEXT-CUT SPEC · E0 手测 / E1 入口铺全 / E2 发版（R3 表单冻结）

| 项 | 值 |
|----|-----|
| 日期 | 2026-07-21 |
| 基线 tip | `develop` @ 以 `git log -1` 为准（E1 前功能 tip `fe12cbf` / 文档 `9070556`） |
| 决策 | R3 交互表单 · 方案 **P1** |
| 配套 | `INTEGRATED-WORKBENCH-DECISION-RESEARCH-2026-07-21-R3.md` · `COMPETITIVE-BRIEF.md` |

---

## 表单冻结（审计）

| 维度 | 选择 |
|------|------|
| 主目标 | **P1 可交付工作台** |
| 硬约束 | 全部维持；**允许实验 auto UI**（默认关，非主 CTA） |
| 主输出 | **E0 + E1 + E2 + E3** |
| E1 深度 | **CTA + EvalCase + 双模型** |
| 竞品带回 | Context CTA（已并入 E1） |

硬约束钉死：导出默认脱敏 · Web 无 S3 · 主安装 auto-opt **关** · 独立仓 MindSync · 包边界。

---

## E0 — 真机手测签字

| 项 | 内容 |
|----|------|
| 目标 | `HANDTEST-CHECKLIST-2026-07-21.md` 关键项勾选 |
| 非目标 | 新功能 |
| 验收 | §1–§5 Pass 或 Fail 入 E3 列表 |
| 状态 | **待真机**（机器侧：vue-tsc 绿 · UI 929 pass · core gate 绿） |

---

## E1 — 入口铺全（本刀实现）

### 范围

| 工作区 | CTA | EvalCase 入口+面板 | 双模型一键 |
|--------|-----|-------------------|------------|
| Basic System | 已有 | 已有 | 已有 |
| Basic User | 已有 | **本刀补** | 已有 |
| Context System | **本刀** | **本刀** | **本刀** |
| Context User | **本刀** | **本刀** | **本刀** |

### 实现要点

- 复用 `PostOptimizeActions` / `EvalCaseSetPanel` / `seedDualModelKeys` / `useEvalCaseSet`
- preference 键不变：`eval.caseSets.v1`
- Context CTA 显示：`isOptimizing` false 边沿 + 有 optimized 文本
- Evaluate CTA：Context → 打开 EvalCase 面板；Basic User 保留 prompt-only 评估，**另提供** EvalCase 工具按钮
- promptfoo 导出随面板走

### 文件

- `packages/ui/src/components/context-mode/ContextSystemWorkspace.vue`
- `packages/ui/src/components/context-mode/ContextUserWorkspace.vue`
- `packages/ui/src/components/basic-mode/BasicUserWorkspace.vue`

### 验收

| ID | 标准 | 验证 |
|----|------|------|
| E1a | Context System/User 优化完成后可见 CTA | 手测 |
| E1b | 四工作区均可打开 EvalCase 面板 | 手测 data-testid |
| E1c | Context + Basic 测试区有双模型按钮 | 手测 |
| E1d | vue-tsc / UI unit 绿 | CI/本地 |

### 状态

**代码 done**（2026-07-21）· 手测待 E0

---

## E2 — 发版 / NSIS

| 项 | 内容 |
|----|------|
| 目标 | version + 安装包 + CURRENT |
| 前置 | E0 关键项无阻塞 Fail；E1 已合 tip |
| 步骤 | 见 `RELEASE-RUNBOOK.md` · `version:sync` |
| 状态 | **todo**（表单：手测全绿后再说 / 或用户显式「装 NSIS」） |

---

## E3 — 手测缺陷

| 项 | 内容 |
|----|------|
| 触发 | E0 Fail |
| 状态 | 按需 |

---

## 实验 auto UI（表单附加）

- 允许设置页/数据管理旁路开关；**默认 enabled=false**
- **禁止**主 CTA / 主安装默认开
- 实现可后置；helpers 已在 `experimental-auto-optimize.ts`

---

## Won't

多租户 · 生产 Trace 云 · Agent OS · 默认 K8s · 整仓 Promptfoo · 主安装默认 auto-opt · Web S3 SDK
