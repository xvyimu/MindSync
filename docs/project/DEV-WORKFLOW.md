# MindSync · 开发工作流（整合版）

> 目标：把 Orca 运行时、Claude Code 技能、本 monorepo 约定合成**一条默认可执行路径**。  
> 日期：2026-07-21 · 源码：`D:\PromtOptimizer\src\mindsync` · **唯一远端：`xvyimu/MindSync`（`origin` only）**  
> **独立产品仓**：不设置 `upstream` remote；不默认同步 linshenkx/prompt-optimizer；不向其开 PR。  
> **许可**：AGPL-3.0-only（见 `LICENSE`）。身份：`GITHUB_IDENTITY.md`。

---

## 0. 一句话默认路径（Best Path）

```
grill → feature/<名> 从 develop 切出 → 实现 → typecheck/单测
→ 自检（架构/质量/功能/性能/安全）→ 迭代报告 → 人工审核
→ 授权后 commit；默认不 push；合 develop 须明确授权
```

**当前推进焦点（2026-07-21 · MindSync 独立体系）：**  
1. 身份与 remote：仅 `origin`；G1–G3 见 `PACKAGE-RENAME-PLAN` / `GITHUB_IDENTITY`  
2. 桌面 UI 重设计：`feature/redesign-shell`（R0 骨架，flag 默认关）  
3. 包名/appId 重命名：**未执行**，按 `PACKAGE-RENAME-PLAN-2026-07-21.md` 分阶段  
4. 发布只打 `xvyimu/MindSync`；NSIS/手测见 `CURRENT.md`

---

## 1. 三层栈

### 1.1 Orca 运行时（多 worktree / 多 agent）

| 场景 | 最佳方案 | 命令骨架 |
|------|----------|----------|
| 独立新任务 | **独立 handoff**（不叠当前 feature） | `orca worktree create --name <task> --no-parent --agent codex --prompt "..."` |
| 当前 checkout 再开 agent | **terminal create** | `orca terminal create --worktree active --command "codex"` |
| 明确 stacked 工作 | parent + base-branch | `worktree create --parent-worktree active --base-branch <feat>` |
| 完整交接后原 agent 停 | handoff，**不用** orchestration | `worktree create --no-parent --agent ...` 后停止监控 |
| 多任务监督 / inbox | orchestration | `orca orchestration ...` |
| 定时任务 | automations | `orca automations create --trigger daily ...` |
| 应用内浏览器 | snapshot 循环 | `orca goto / snapshot / click` |
| 卡片进度 | comment + status | `orca worktree set --comment "..." --workspace-status in-review` |

**规则：**
- 独立任务默认 `--no-parent`，**不要**默认叠当前 feature 分支
- agent 优先：`worktree create --agent`，避免空 shell + 再开 agent
- `terminal wait --for tui-idle` 后再 `terminal send`
- Linux 非 Orca 终端用 `orca-ide`；dev 会话优先 `orca-dev` / `ORCA_CLI_COMMAND`

### 1.2 Claude Code 技能

| 阶段 | 技能 | 最佳方案 |
|------|------|----------|
| 需求不清 | `/grilling` | 一次一问 + 推荐答案；未 shared understanding 前不 enact |
| 实现后质量 | `/review` | 双轴：Standards + Spec；fixed point 要钉死（常为 parent commit） |
| 实现后简化 | `/simplify` | 四轴：Reuse / Simplification / Efficiency / Altitude；只修不改变行为的项 |
| 上下文过长 | `/compact` | 续跑长任务 |
| 专精审查 | agency / pipeline agents | planner→coder→tester→reviewer；安全/前端等按需 |
| 外发高风险 | 人工确认 | push / 删 / 外发 / 合 PR 先确认（本工作区 CLAUDE.md） |

### 1.3 本 monorepo 约定

| 项 | 最佳方案 |
|----|----------|
| Shell | **pwsh 7**，不用 5.1 |
| Node | **^24**（本机系统 Node；勿再强制 portable 22） |
| 包管理 | pnpm workspace |
| i18n | `docs/developer/i18n-policy.md`：en-US source；UI 走 `t()`；模板中文在 allowlist |
| 测试 | `pnpm --filter @mindsync/core test`（Node 24） |
| 分支 | feature 短命；UX 栈：`feat/ux-2026-07-20` → #3；`feat/ux-2026-07-21-cancel-parity` → #4（base=#3） |
| 合入顺序 | **#3 → develop → #4 retarget/rebase → develop** |
| 不做除非要求 | 自动合 PR、NSIS 打包、unsuppress vendor、上游 #325–#330 整包 |

---

## 2. 标准迭代循环（Best Path 展开）

### Phase A · 对齐
1. `/grilling`：who / why / success / constraint  
2. 写 5–8 行 restatement，用户确认后再动 code

### Phase B · 实现
1. 从正确 base 开分支（独立 → develop；叠 → 当前 PR tip）  
2. 最小 diff；匹配周围代码风格  
3. i18n：先确认 key 存在（防 `promptOptimizer.optimizing` 类假 key）  
4. Node 24 跑相关单测

### Phase C · 质量门
1. **自审**：i18n、cancel wiring、Handlebars、import 路径  
2. **`/review`**（Standards + Spec）或 **`/simplify`**（四轴）  
3. 只修 judgement / 不改变行为的简化；altitude 级大提取标 follow-up

### Phase D · 集成
1. `git fetch origin develop`  
2. merge/rebase develop；**冲突必须解完再标可合**  
3. push；更新 PR body  
4. stacked PR：base 仍指向父分支，直到父分支合入

### Phase E · 收口
1. 可选 Electron smoke（模板列表 / Stop / ContextSystem cancel）  
2. 合 PR（人工）  
3. 更新 `memory/prompt-optimizer-ux-prs-*.md`

---

## 3. 当前交付状态（独立仓 MindSync）

| 项 | 状态 |
|----|------|
| UX #3 / #4 | **已合** `develop` |
| 上游贡献 | **暂停**（#325–#330 / #332–#337 已关） |
| 桌面 publish | `xvyimu/MindSync` |
| 下一动作 | 最新 develop 打 NSIS + smoke 清单 |

历史冲突解法仍见 git 历史 `bf2c26d`（#3 vs develop）。


---

## 4. 决策树（以后少问）

| 情况 | 做 |
|------|----|
| 新功能、范围不清 | grill，不先写 code |
| 单文件 typo / 明确 1 行 | 直接改，不 grill |
| PR 与 develop 冲突 | **优先解冲突**，不堆新功能 |
| stacked PR 父未合 | 子 PR base 保持父分支 |
| 共享 helper 抽取（altitude） | 标 follow-up，不塞进 4 文件 parity PR |
| push / 合 PR / 删 / 外发 | 先确认（除非用户已明确授权本会话） |
| Node 版本 | **^24**；系统 Node 24 即可，无需再挂 portable 22 |

---

## 5. 命令速查

```powershell
# Node 24（系统安装即可）
node -v   # expect v24.x

# 测试
pnpm --filter @mindsync/core test

# 解 #3 冲突（在 feat/ux-2026-07-20）
git fetch origin develop
git checkout feat/ux-2026-07-20
git merge origin/develop
# … resolve …
pnpm --filter @mindsync/core test
git push origin feat/ux-2026-07-20

# #3 合入后处理 #4
git checkout feat/ux-2026-07-21-cancel-parity
git rebase origin/develop   # 或 gh pr edit 4 --base develop 后 merge
git push --force-with-lease   # 仅 rebase 后需要，且已授权时
```

---

## 6. 明确不做（本工作流默认）

- 自动 merge PR 到 develop  
- 未要求时的 NSIS / 安装包  
- unsuppress 15 vendor presets  
- 上游 `linshenkx/prompt-optimizer` 默认不投 PR（独立仓；用户明确要求再开）  
- 把 shared stream-cancel helper 强塞进当前 parity PR  

---

## 7. 相关记忆 / 文档

- `memory/prompt-optimizer-ux-prs-2026-07-20.md` — 双 PR 栈  
- `docs/developer/i18n-policy.md` — i18n  
- `docs/developer/electron-ipc-best-practices.md` — IPC  
- 本文件：`docs/project/DEV-WORKFLOW.md`
