# MindSync · 栈矩阵 · 2026-07

| 项 | 值 |
|----|-----|
| **产品** | MindSync（`xvyimu/MindSync`） |
| **文档日** | 2026-07-23 |
| **波次** | portfolio-arch-upgrade-2026h2 · **W1–W4 收口** |
| **Worktree tip（W4 收口）** | 以 `git rev-parse --short HEAD` + `pnpm check:docs-tip` 为准（W4 开工 tip `f1ff0c2`） |
| **蓝图** | `D:\orca\.planning\portfolio-arch-upgrade-2026h2\repos\ms.md` · `crosscut.md` |
| **W4 报告** | [`w4-arch-upgrade-mindsync-claude.md`](./w4-arch-upgrade-mindsync-claude.md) |

> 当前 → 半年目标 → **W1 基线 + W2 架构主刀 + W3 深化 + W4 收口**。生产 flip / asar 覆盖不在本表授权。

---

## 0. W4 终态收口（本波钉死）

| 维度 | 值 |
|------|-----|
| **当前 tip（SSOT）** | 见 `docs/project/CURRENT.md` · 门闩 `pnpm check:docs-tip` |
| **半年目标完成度（MS · 估）** | **~90%**（栈对齐 + Mode A 发行 + IPC 全绿 + tip 门闩 + **uv 锁文件**；asar / Mode B / 真本地 runtime **人 gate 未做** 属正确留白） |
| **下半年 backlog（3 条）** | ① Electron **41 安全补丁窗**评估（无 major） ② **R5** 产品刀（架构已稳） ③ Mode B **仅设计/spike** 或 asar 覆盖（**人 gate**；禁默认捆绑 Python） |

| 半年项（S6 / repos/ms） | 状态 |
|-------------------------|------|
| pnpm → 11.5 | **done** · `pnpm@11.5.3` |
| Node 24 · CI 钉 | **done** |
| AI-Core 发行模型 + status/health | **done** · Mode A ADR + `healthState` |
| IPC 全绿（含 mock） | **done** · 11/11 |
| CURRENT tip 自动 | **done** · `check-docs-current-tip` |
| Python 锁文件 | **done（W4）** · `services/ai-core/uv.lock` |
| 可选本地模型 flag | **done** · 默认 OFF · [`local-model-adapter-flag-w3.md`](./local-model-adapter-flag-w3.md) |
| asar 重打 | **NOT EXECUTED**（人 gate） |

---

## 1. 运行时 / 包管理

| 项 | 当前（W1 前） | 目标（半年 / W4） | 本波（W1） | **W2** | **W3** | **W4 收口** |
|----|---------------|-------------------|------------|--------|--------|-------------|
| **Node** | `engines.node` **^24**；CI `node-version: '24'`；本机实测 `v24.16.0` | 保持 **24.x** · CI 钉 24 | **保持** · 文档化 | 保持 | 保持 | **终态：24.x 钉死** |
| **pnpm** | `packageManager`: **pnpm@10.6.1**；lockfileVersion **9.0** | **11.5** 线与组合对齐（crosscut X-PNPM） | **已升 pnpm@11.5.3** · 装通 · 见 §3 | 保持 11.5.3 | 保持 11.5.3 | **终态：11.5.3** |
| **corepack** | 可选 | 推荐 `packageManager` 驱动 | CI `pnpm/action-setup@v4` 读 packageManager | 同左 | 同左 | 同左 |

## 2. 前端 / 桌面

| 项 | 当前 | 目标 | 本波（W1） | **W2** | **W3** | **W4 收口** |
|----|------|------|------------|--------|--------|-------------|
| **Vue** | `^3.5.31`（ui/web） | 3.5 补丁线 | **跟线不强制 bump**（无 CVE 驱动） | 同左 | 同左 | 补丁线 · 下半年跟 CVE |
| **Vite** | `^8.0.3`（ui/web） | 8.x 补丁 | 同左 | 同左 | 同左 | 同左 |
| **Naive UI / Pinia** | naive `^2.44` · pinia `^3.0` | 补丁线 | 不动 | 不动 | 不动 | 不动 |
| **Electron** | `^41.1.0` + electron-builder `^26.8` | 41 安全补丁线（W1–W4） | **保持 41** · 无强制 minor | 保持 41 | 保持 41 | **保持 41** · 补丁窗 → 下半年 backlog① |
| **Desktop IPC** | channel-manifest **1.1.0** · AI-Core 三通道 Gate | IPC 全绿（含依赖 mock） | 契约 6/6 + 全量 11/11（装通后 s3 假红消失） | **S3 懒加载** + status `lastHealth`；全量 11/11 仍绿 | **status `healthState`** 与 runbook 对齐；IPC 11/11 仍绿 | **终态：11/11 门闩保持** |

## 3. pnpm 11.5 对齐（W1 结论 · W4 仍有效）

| 字段 | 值 |
|------|-----|
| **改前** | `packageManager`: `pnpm@10.6.1` |
| **改后** | `packageManager`: `pnpm@11.5.3`（11.5 线补丁；目标「11.5」） |
| **lock** | `lockfileVersion: '9.0'` **未改写**（11.5 可直接消费） |
| **CI** | `.github/workflows/test.yml` 已用 `pnpm/action-setup@v4`（读 packageManager）· **无需** 另钉 version |
| **配套** | `pnpm-workspace.yaml` → `allowBuilds` 放行 electron/esbuild/msw/protobufjs/electron-winstaller；去掉冲突 `ignoredBuiltDependencies` |
| **阻断** | 无；首装 `ERR_PNPM_IGNORED_BUILDS` 经 allowBuilds 消除 |
| **回滚** | 还原 `packageManager` + `pnpm-workspace.yaml`；`corepack prepare pnpm@10.6.1 --activate` |

细节与装通证据见 [`w1-arch-upgrade-mindsync-claude.md`](./w1-arch-upgrade-mindsync-claude.md) §1.3。

## 4. AI-Core（Python）

| 项 | 当前 | 目标 | 本波（W1） | **W2** | **W3** | **W4 收口** |
|----|------|------|------------|--------|--------|-------------|
| **运行时** | `requires-python >=3.11`；FastAPI/uvicorn/pydantic 下界 | 锁文件 + 健康进 status | **未**引入 poetry/uv lock | **仍未**锁文件 | **仍未**锁文件（延期 W4） | **`uv.lock` 已入库** · `uv sync --extra dev` 可复现 |
| **发行** | 模式 A 开发者 sidecar（契约已冻） | ADR + runbook + status | 沿用 wave8 runbook | **ADR Accepted Mode A** · B deferred · C rejected-as-default · 见 [`adr-ai-core-distribution-w2.md`](./adr-ai-core-distribution-w2.md) | Mode A 加固：`healthState` + runbook 表与 IPC 一致 | 终态 Mode A · B/C 不变 |
| **桌面联调** | `AI_CORE_URL` 可选 · 默认 OFF | UX 默认路径 | 不改生产默认 | status 含 `distributionMode` + `lastHealth`；runbook 增量 | status 增 `healthState`；Mode B 仍不默认 | runbook 增 uv 路径 |
| **本地模型** | Ollama / chrome-built-in 已有 | 可选 flag 适配器 | — | — | **`local-model` stub + flag 默认 OFF** · 见 [`local-model-adapter-flag-w3.md`](./local-model-adapter-flag-w3.md) | **文档×CURRENT 交叉** · 仍默认 OFF |

### 4.1 Python 锁文件（W4 选定：uv）

| 字段 | 值 |
|------|-----|
| **工具** | **uv**（本机 `uv 0.11.x`；禁 poetry 平行锁） |
| **产物** | `services/ai-core/uv.lock`（提交）· `.venv/` 已 gitignore |
| **源** | `services/ai-core/pyproject.toml`（`requires-python >=3.11` + deps + optional `dev`） |
| **装依赖** | `cd services/ai-core && uv sync --extra dev` |
| **测** | `uv run pytest tests -q` 或 venv 内 `pytest` |
| **回滚** | 删 `uv.lock` + 恢复 README 纯 pip 路径（不推荐） |

---

## 5. 文档 / tip SSOT

| 项 | 当前（W1 前） | 目标 | W1 | **W2** | **W3** | **W4 收口** |
|----|---------------|------|----|--------|--------|-------------|
| **CURRENT tip** | `700643a`（陈旧） | = `git rev-parse --short HEAD` | **已对齐** | 本分支 tip 再对齐 | **`check-docs-current-tip.mjs`** 进 `pnpm check:docs` / `check:docs-tip` | 每波交付前对齐 + 门闩 0 |
| **版本** | 2.11.7 = package.json | 发版时同步 | 保持 2.11.7 | 保持 | 保持 | 保持 2.11.7 |
| **check:docs** | 8 子脚本 | 持续 0 | 回归必跑 | 回归必跑 | **9 子脚本**（+ tip 门闩） | **9 子脚本 · W4 回归 0** |

## 6. 本波（W4）明确不做

- asar 覆盖 / 真 NSIS Release（**ASAR: NOT EXECUTED**）  
- redesign 生产默认 ON  
- Docker 真推 / 镜像 publish  
- push `develop` / 开 PR（总控）  
- AI-Core 打进 asar 或 Docker Web  
- Vue↔React / monorepo 六仓合并  
- Electron major 升级  
- **Mode B 默认捆绑 / Mode C 远程生产**  
- 本地模型 flag **默认 ON** / 真密钥 / 真本地 runtime 绑定生产  

## 7. 下半年 backlog（接 §0 · 非 W5 波次名）

1. Electron 41 **安全补丁**窗口评估（有 CVE 再 bump minor/patch）  
2. **R5** 或其它产品能力刀（架构主刀已收口）  
3. Mode B 设计/spike **或** asar 覆盖（**仅人 gate**；禁止无选项塞 Python）  

---

**维护：** 栈 bump 或 engines 变更时先改本表「当前」列，再改 `package.json` / CURRENT / 报告。
