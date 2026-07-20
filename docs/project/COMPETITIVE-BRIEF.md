# 决策简报：本地工作台做深（2026-07-21）

> **L1 决策摘要。** 权威调研全文见 `D:\PromtOptimizer\docs\COMPETITIVE-ARCHITECTURE-RESEARCH-2026-07-21.md`。  
> 本页只记**已选方案**的目标 / 约束 / 输入 / 输出 / 验收，便于贴 CURRENT 与评审。

| 项 | 值 |
|----|-----|
| 决策日 | 2026-07-21 |
| 主目标 | **本地工作台做深**（非评测 CLI、非 LLMOps 平台、非自动优化默认开） |
| 代码 tip | `develop` @ `be0a5de+`（以 `git log -1` 为准） |
| 产品版本 | 2.11.7 |

---

## 1. 目标（Goal）

**一句话**：在隐私优先、多端一致的前提下，把「优化 → 测试 → 评估 → 收藏 → 导出证据」做成默认闭环，而不是扩成迷你 LangSmith。

| 层级 | 目标 | 非目标 |
|------|------|--------|
| 用户 | 写更好的提示，并能**复现**「为何更好」 | 强制云账号协作 |
| 产品 | 工作台闭环 + 可导出证据包 | 多租户 / 生产 Trace |
| 工程 | 包边界干净、CI 硬门禁、Desktop 可靠 | K8s 默认、通用 Agent OS |
| 维护 | 单人/小团队可持续 | 平台化大爆炸 |

**成功画像（90 天）**：用户完成一轮优化后，能固定点「测试 / 评估 / 收藏 / 导出」；工程师能用契约测试挡住 IPC/包边界回潮。

---

## 2. 硬约束（Constraints）— 已全选

1. **本地优先 / 无强制账号**：Key 与数据默认在用户设备；云能力仅 opt-in。  
2. **fork-only**：默认不向上游开 PR；只合安全/依赖类。  
3. **包边界 `app → ui → core`**：ui **不** re-export 工厂（已落地）；生产走 dist。  
4. **单人可维护 / 小核心**：拒绝 K8s 默认、通用 Agent 宿主、多租户中台。

附加工程约束（继承仓库）：Node ^22、pnpm 10、AGPL、Electron contextIsolation + IPC manifest。

---

## 3. 输入（Inputs）— 已全选为权威

| 输入 | 路径 | 用途 |
|------|------|------|
| 竞品调研 | `D:\PromtOptimizer\docs\COMPETITIVE-ARCHITECTURE-RESEARCH-2026-07-21.md` | 战略、Won't do、迁移剧本 |
| SSOT | `docs/project/CURRENT.md` · `docs/PROJECT_HANDOFF.md` · `docs/project/prd.md` | 版本/路径/模块/产品范围 |
| 扫描规划 | `D:\PromtOptimizer\docs\FULL-SCAN-PLAN-RECOMMENDATIONS-2026-07-21.md` | 已修差分、残余债 |
| 代码 | `develop` @ tip | 实现真相；勿重复已修 P0 |

---

## 4. 输出（Outputs）— 本决策包

| 交付物 | 路径 |
|--------|------|
| 本简报 | `docs/project/COMPETITIVE-BRIEF.md` |
| 架构宪章 | `docs/architecture/charter.md` |
| 90 天 backlog | `docs/project/BACKLOG-90D-2026-07-21.md` |
| 下一刀规格 | `docs/project/NEXT-CUT-SPEC-2026-07-21.md` |

---

## 5. 验收标准（Acceptance）

### 5.1 产品闭环（主目标）

| ID | 标准 | 验证 |
|----|------|------|
| A1 | 优化完成后 UI 有稳定 CTA：测试 / 评估 / 收藏 | 手测 Desktop+Web |
| A2 | 全量导出含 history + models + templates + contexts + **favorites** | 导入再导出 diff |
| A3 | 历史上限可感知（警告或配置），禁止静默「突然变少」无提示 | 造 >max 条历史 |
| A4 | 评估结果可复制/导出为本地「证据」JSON（最小字段见下一刀规格） | 单测 + 手测 |

### 5.2 约束不破

| ID | 标准 | 验证 |
|----|------|------|
| C1 | 默认无强制登录；Docker 演示不预置厂商 Key 到前端 | 代码/compose 检查 |
| C2 | `ui/src/index.ts` 无工厂/Proxy 运行时 re-export | `pnpm`/package-scripts 测试 |
| C3 | 生产 web/extension build 不强制 source alias | package-scripts 测试 |
| C4 | 新 IPC 必须进 channel-manifest 且 secure 注册 | desktop IPC 测试 |

### 5.3 工程门禁

| ID | 标准 | 验证 |
|----|------|------|
| E1 | `pnpm test:gate` + CI 中 lint/mcp:test 绿 | CI |
| E2 | `pnpm check:docs` 绿 | 本地/CI |
| E3 | Desktop 可启动并完成一次流式优化+取消 | 手测 |

### 5.4 明确失败条件（任一即方案未达成）

- 引入强制云账号或默认上传对话。  
- 把 Promptfoo/LangSmith 整仓 vendoring 进 monorepo。  
- ui 再次 re-export `createLLMService` 等工厂。  
- 公网 compose 允许空 `ACCESS_PASSWORD` 作为默认。  

---

## 6. Won't do（本期）

- 多租户 / 计费 / 生产分布式 Trace  
- 通用 Agent 运行时 / 任意 Shell 工具  
- 默认开启自动搜索优化（DSPy 类）  
- 默认 K8s、默认向上游开 PR  
- 重写为其他前端框架  

---

## 7. 下一刀（默认）

按调研 §30 与主目标对齐，**下一刀 = EvalCaseSet 最小类型 + 本地存取 + 证据导出草形**  
（规格见 `NEXT-CUT-SPEC-2026-07-21.md`；safeStorage / 远程备份 Port 列为刀+1 / 刀+2。）

---

**维护**：改目标/约束时先改本简报与 charter，再改 CURRENT 链接说明；勿复制版本号到多处。
