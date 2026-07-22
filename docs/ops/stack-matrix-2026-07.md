# MindSync · 栈矩阵 · 2026-07

| 项 | 值 |
|----|-----|
| **产品** | MindSync（`xvyimu/MindSync`） |
| **文档日** | 2026-07-23 |
| **波次** | portfolio-arch-upgrade-2026h2 · **W1 + W2** |
| **Worktree tip（W1 合入）** | `2b7cd41` |
| **蓝图** | `D:\orca\.planning\portfolio-arch-upgrade-2026h2\repos\ms.md` · `crosscut.md` |

> 当前 → 半年目标 → **本波已做**（W1 基线 + **W2 架构主刀**）。生产 flip / asar 覆盖不在本表授权。

---

## 1. 运行时 / 包管理

| 项 | 当前（W1 前） | 目标（半年 / W4） | 本波（W1） | **W2** |
|----|---------------|-------------------|------------|--------|
| **Node** | `engines.node` **^24**；CI `node-version: '24'`；本机实测 `v24.16.0` | 保持 **24.x** · CI 钉 24 | **保持** · 文档化 | 保持 |
| **pnpm** | `packageManager`: **pnpm@10.6.1**；lockfileVersion **9.0** | **11.5** 线与组合对齐（crosscut X-PNPM） | **已升 pnpm@11.5.3** · 装通 · 见 §3 | 保持 11.5.3 |
| **corepack** | 可选 | 推荐 `packageManager` 驱动 | CI `pnpm/action-setup@v4` 读 packageManager | 同左 |

## 2. 前端 / 桌面

| 项 | 当前 | 目标 | 本波（W1） | **W2** |
|----|------|------|------------|--------|
| **Vue** | `^3.5.31`（ui/web） | 3.5 补丁线 | **跟线不强制 bump**（无 CVE 驱动） | 同左 |
| **Vite** | `^8.0.3`（ui/web） | 8.x 补丁 | 同左 | 同左 |
| **Naive UI / Pinia** | naive `^2.44` · pinia `^3.0` | 补丁线 | 不动 | 不动 |
| **Electron** | `^41.1.0` + electron-builder `^26.8` | 41 安全补丁线（W1–W4） | **保持 41** · 无强制 minor | 保持 41 |
| **Desktop IPC** | channel-manifest **1.1.0** · AI-Core 三通道 Gate | IPC 全绿（含依赖 mock） | 契约 6/6 + 全量 11/11（装通后 s3 假红消失） | **S3 懒加载** + status `lastHealth`；全量 11/11 仍绿；无 install 时装载 remote-storage 模块不再 MODULE_NOT_FOUND |

## 3. pnpm 11.5 对齐（W1 结论）

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

| 项 | 当前 | 目标 | 本波（W1） | **W2** |
|----|------|------|------------|--------|
| **运行时** | `requires-python >=3.11`；FastAPI/uvicorn/pydantic 下界 | 锁文件 + 健康进 status | **未**引入 poetry/uv lock | **仍未**锁文件（W3）；pytest 9/9 绿 |
| **发行** | 模式 A 开发者 sidecar（契约已冻） | ADR + runbook + status | 沿用 wave8 runbook | **ADR Accepted Mode A** · B deferred · C rejected-as-default · 见 [`adr-ai-core-distribution-w2.md`](./adr-ai-core-distribution-w2.md) |
| **桌面联调** | `AI_CORE_URL` 可选 · 默认 OFF | UX 默认路径 | 不改生产默认 | status 含 `distributionMode` + `lastHealth`；runbook 增量 |

---

## 5. 文档 / tip SSOT

| 项 | 当前（W1 前） | 目标 | W1 | **W2** |
|----|---------------|------|----|--------|
| **CURRENT tip** | `700643a`（陈旧） | = `git rev-parse --short HEAD` | **已对齐** | 本分支 tip 再对齐 |
| **版本** | 2.11.7 = package.json | 发版时同步 | 保持 2.11.7 | 保持 |
| **check:docs** | 8 子脚本 | 持续 0 | 回归必跑 | 回归必跑 |

## 6. 本波明确不做

- asar 覆盖 / 真 NSIS Release  
- redesign 生产默认 ON  
- Docker 真推 / 镜像 publish  
- push `develop` / 开 PR（总控）  
- AI-Core 打进 asar 或 Docker Web  
- Vue↔React / monorepo 六仓合并  
- Electron major 升级  
- **Mode B 默认捆绑 / Mode C 远程生产**  

## 7. 下波（W3）挂钩

1. Python 依赖锁（uv/pip-tools 择一）  
2. 可选本地模型适配器（feature flag）  
3. Mode B 仅设计/spike；asar **人 gate**  
4. Electron 安全补丁窗口评估  

---

**维护：** 栈 bump 或 engines 变更时先改本表「当前」列，再改 `package.json` / CURRENT / 报告。
