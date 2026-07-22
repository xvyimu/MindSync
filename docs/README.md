# 项目文档索引

> **文档体系：方案 C — 双层真相源 + 冻结噪音**  
> 规划全文：`docs/project/archives/install-side-2026-07/DOC-SYSTEM-PLAN-2026-07-20.md`  
> **现行版本/路径一页纸：** [`project/CURRENT.md`](./project/CURRENT.md)

---

## 30 秒入口（先读这里）

| 你是… | 你想… | 打开 |
|--------|--------|------|
| 本机使用者 | 启动软件 / 安装在哪 | `D:\MindSync\app\PromptOptimizer.exe` · [`project/CURRENT.md`](./project/CURRENT.md) |
| 开发维护者 | 改代码 / 测试 / 模块 | [`PROJECT_HANDOFF.md`](./PROJECT_HANDOFF.md) |
| 审计 / 排障 | 边界、安全、模块全景 | `docs/project/archives/install-side-2026-07/FULL-AUDIT-REPORT-2026-07-20.md` |
| 任何人 | 当前版本与策略 | [`project/CURRENT.md`](./project/CURRENT.md) |

---

## 文档分层

| 层 | 含义 | 目录 |
|----|------|------|
| **L0 入口** | 必须正确，短 | `PROJECT_HANDOFF.md` · 安装侧 `README.md` |
| **L1 活文档** | 改代码时应更新 | `project/` · `developer/` · `user/` · `architecture/`（白名单）· `testing/` |
| **L2 冻文档** | **默认只读** · 非现行规范 | `archives/` · `workspace/` · 仓库 `.pipeline/` · 安装侧 `CLOSEOUT.md` |

**规则摘要**

1. 版本号权威：只在 [`project/CURRENT.md`](./project/CURRENT.md)  
2. 禁止在 `workspace/` 沉淀正式结论（应升到 L1）  
3. `archives/` 仅历史排障，不代表当前行为  
4. 用户文档（`user/`）不要写本机绝对路径  

---

## 分类导航

### 用户 · [`user/`](./user/)

使用与部署（Vercel / Docker / MCP 等）。

- 安全相关：访问密码为 **会话 Cookie**（[`user/deployment/vercel.md`](./user/deployment/vercel.md)）
- Docker 运行时：[`user/deployment/docker-runtime-security.md`](./user/deployment/docker-runtime-security.md)（**不会**把模型 API Key 注入浏览器 `config.js`）
- 策略：[`DOCS_POLICY.md`](./DOCS_POLICY.md)

### 开发者 · [`developer/`](./developer/)

环境、结构、排障。日常命令以 HANDOFF 与 [`project/DEV-WORKFLOW.md`](./project/DEV-WORKFLOW.md) 为准。

### 项目 · [`project/`](./project/)

- [`CURRENT.md`](./project/CURRENT.md) — **现行快照**  
- [`prd.md`](./project/prd.md) — 产品范围  
- [`DEV-WORKFLOW.md`](./project/DEV-WORKFLOW.md) · 冒烟清单等  

### 架构 · [`architecture/`](./architecture/)

仅 [`architecture/README.md`](./architecture/README.md) **白名单**篇视为现行；其余可能过期。

### 测试 · [`testing/`](./testing/)

测试说明与场景（L1，按需更新）。

### 归档 · [`archives/`](./archives/) · 工作区 · [`workspace/`](./workspace/)

**L2 冻结。** 新结论不要写在这里。

---

## 维护

| 变更类型 | 更新 |
|----------|------|
| 发版 / 安装路径 | `CURRENT.md` → 安装 README → HANDOFF §0 |
| 安全/部署行为 | `user/deployment/*` + FULL-AUDIT 或新审计 |
| 领域架构 | `architecture/` 白名单篇 + architecture/README |
| 过程实验 | `.pipeline/` 或个人笔记 — **不**当 SSOT |
