# 现行事实快照（CURRENT）

> **L1 活文档 · 版本与路径只在这里维护权威数字。**  
> 其他文档应链接本文，勿复制过期版本号。  
> 文档体系：方案 C（双层真相源）— 见 `D:\PromtOptimizer\docs\DOC-SYSTEM-PLAN-2026-07-20.md`

| 项 | 值 |
|----|-----|
| **产品版本** | **2.11.7**（= 根 `package.json` / desktop） |
| **日期** | 2026-07-20 |
| **分支** | `develop` |
| **远端 tip（写文档时）** | `a1e1a71` — 以 `git log -1` 为准 |
| **Fork** | https://github.com/xvyimu/prompt-optimizer |
| **策略** | **fork-only**（默认不向上游开 PR） |
| **上游 remote** | `upstream` → `linshenkx/prompt-optimizer`（可拉取，不默认贡献） |

---

## 本机路径（维护者）

| 用途 | 路径 |
|------|------|
| 源码 | `D:\PromtOptimizer\src\prompt-optimizer` |
| **运行安装** | **`D:\PromtOptimizer\app\PromptOptimizer.exe`** |
| 安装包归档 | `D:\PromtOptimizer\nsis-2026-07-20-paper-theme\` 等 |
| 工具链 | `D:\PromtOptimizer\tools`（portable Node 22） |
| 用户模板 | `D:\PromtOptimizer\custom-templates\`（勿删） |

旧热替换树 `D:\PromtOptimizer\PromptOptimizer\` **已废弃**。

---

## 文档入口（L0 / L1）

| 你想… | 打开 |
|--------|------|
| 安装/启动 | `D:\PromtOptimizer\README.md` |
| 开发/模块/测试 | [`../PROJECT_HANDOFF.md`](../PROJECT_HANDOFF.md) |
| 全面检查/安全/模块审计 | `D:\PromtOptimizer\docs\FULL-AUDIT-REPORT-2026-07-20.md` |
| 文档怎么管 | `D:\PromtOptimizer\docs\DOC-SYSTEM-PLAN-2026-07-20.md` |
| 产品范围 | [`prd.md`](./prd.md) |
| 部署（Vercel 等） | [`../user/deployment/`](../user/deployment/) |
| 现行架构白名单 | [`../architecture/README.md`](../architecture/README.md) |

---

## 本轮产品能力摘要（2.11.7 fork）

- Desktop hardening：stream cancel、IPC 域拆分、sender 校验  
- UX quiet-workbench + 取消文案  
- **Paper / 纸感**主题（离线字体）  
- 打包含 `icons/**`；安装为 **app.asar**  
- **P0 安全**：Docker `config.js` 仅 public `VITE_*`；Vercel HMAC 会话 Cookie（非明文密码）  

---

## 构建 / 验证（摘要）

```powershell
cd D:\PromtOptimizer\src\prompt-optimizer
# Node 22 推荐
pnpm -F @prompt-optimizer/core build
pnpm -F @prompt-optimizer/ui build:bundle
pnpm -F @prompt-optimizer/desktop build:ci

node --test packages/desktop/config/*.test.js
node --test scripts/desktop-ipc-handlers.test.mjs
node --test api/access-session.test.mjs scripts/generate-config-public-filter.test.mjs
```

细节与命令全集见 HANDOFF / FULL-AUDIT。

---

## 明确不做（文档层）

- 不把 `docs/workspace/**`、`docs/archives/**`、`.pipeline/**` 当现行规范  
- 不在用户文档写本机绝对路径  
- 不默认 reopen 上游 PR  

**维护：** 发版或安装根变更时只先改本文件，再改 HANDOFF/安装 README 链接叙述。
