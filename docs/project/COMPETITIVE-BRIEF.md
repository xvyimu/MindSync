# 决策简报：本地工作台做深（2026-07-21 · 表单冻结修订）

> **L1 决策摘要。**  
> 权威调研：  
> - 整合进度对齐：`D:\PromtOptimizer\docs\INTEGRATED-WORKBENCH-DECISION-RESEARCH-2026-07-21.md`（**≥11000 汉字**）  
> - 赛道长文：`D:\PromtOptimizer\docs\COMPETITIVE-ARCHITECTURE-RESEARCH-2026-07-21.md`  
> 本页只记**已选方案**的目标 / 约束 / 输入 / 输出 / 验收。

| 项 | 值 |
|----|-----|
| 决策日 | 2026-07-21（表单冻结同日修订） |
| 主目标 | **本地工作台做深**（非评测 CLI、非 LLMOps 平台） |
| 代码 tip | `develop` @ **`91da4e4`**（本地；`origin` 以 push 后为准） |
| 产品版本 | 2.11.7 |
| 表单会话 | 主目标 / 硬约束 / 输入权威 / 主输出 已勾选 |

---

## 1. 目标（Goal）— 表单确认

**一句话**：在隐私优先、多端一致的前提下，把「优化 → 测试 → 评估 → 收藏 → 导出证据」做成默认闭环，而不是扩成迷你 LangSmith。

| 层级 | 目标 | 非目标 |
|------|------|--------|
| 用户 | 写更好的提示，并能**复现**「为何更好」 | 强制云账号协作 |
| 产品 | 工作台闭环 + 可导出证据包 + 薄互操作 | 多租户 / 生产 Trace |
| 工程 | 包边界干净、CI 硬门禁、Desktop 可靠 | K8s 默认、通用 Agent OS |
| 维护 | 单人/小团队可持续 | 平台化大爆炸 |

**成功画像（修订）**：用户优化后固定看到测试/评估/收藏；历史接近上限有提示；导出默认无明文 Key；Desktop Key 可密文落盘；用例可进全量备份；可选导出 promptfoo / 双模型对照；`develop` CI 对 tip 绿。

---

## 2. 硬约束（Constraints）— 表单全选 + 两项钉死

1. **本地优先 / 无强制账号**  
2. **fork-only**  
3. **包边界 `app → ui → core`**（ui 不 re-export 工厂；生产 dist）  
4. **单人可维护 / 小核心**  
5. **敏感在 main**（继承宪章）  
6. **构建期无密钥**（继承宪章）  

**表单额外钉死（升级为硬约束表述）：**

7. **导出默认脱敏 API Key，禁止回退为默认含明文**（可勾选包含，须强提示）  
8. **Web 永不再引入 `@aws-sdk` / 浏览器侧 S3 客户端**；S3/R2/WebDAV 仅 Desktop IPC  

附加工程：Node ^24、pnpm 10、AGPL、Electron contextIsolation + IPC manifest。

### 2.1 表单张力处理：自动优化

表单同时勾选「六条全维持」与「放宽：允许实验默认开自动优化」。  
**冻结解释（避免战略自相矛盾）：**

- **主安装 / 默认产品路径：自动优化仍默认关**（ADR-005 不变）。  
- **允许**实现实验开关、预算、取消（D1/D2）；**实验通道**可讨论默认开，但不得替换模板+人工主路径。  
- 若要将「主安装默认开」升为产品默认，须**另开简报**，不得在本阶段 silently 改默认。

---

## 3. 输入（Inputs）— 表单全选为权威

| 输入 | 路径 | 用途 |
|------|------|------|
| **代码 tip** | `91da4e4`+ | 实现真相 |
| **整合决策调研** | `D:\PromtOptimizer\docs\INTEGRATED-WORKBENCH-DECISION-RESEARCH-2026-07-21.md` | 进度差分、方案对比、路径 |
| 简报+宪章 | 本文件 · `docs/architecture/charter.md` | 目标/约束 |
| 赛道长文 | `COMPETITIVE-ARCHITECTURE-RESEARCH-2026-07-21.md` | 战略叙事 |
| FULL-SCAN 残余 | `FULL-SCAN-PLAN-RECOMMENDATIONS-2026-07-21.md` | **雷达**；不自动升主目标 |
| SSOT | `CURRENT.md` · HANDOFF · prd | 版本/路径/范围 |

---

## 4. 输出（Outputs）— 表单勾选全做，**有序**

| 序 | 交付 | 验收一句话 |
|----|------|------------|
| 1 | **push `develop` + A5 CI 观察** | 远端 tip 对齐；Actions gate/lint/mcp 无红 |
| 2 | **F2 EvalCase 进全量导出** | export/import 含用例集；换机可跑 |
| 3 | **C2 promptfoo.yaml 导出** | 最小 contains 映射可被 CLI 读取 |
| 4 | **C1 双模型轻量对照** | 同输入两 modelKey 并排；无矩阵编辑器 |

决策包文件：

| 交付物 | 路径 |
|--------|------|
| 本简报 | `docs/project/COMPETITIVE-BRIEF.md` |
| 架构宪章 | `docs/architecture/charter.md` |
| 90 天 backlog | `docs/project/BACKLOG-90D-2026-07-21.md` |
| **下一刀规格（修订）** | `docs/project/NEXT-CUT-SPEC-2026-07-21-RELEASE-F2.md` |
| 整合调研 L0 | `D:\PromtOptimizer\docs\INTEGRATED-WORKBENCH-DECISION-RESEARCH-2026-07-21.md` |

---

## 5. 验收标准（Acceptance）

### 5.1 已基本达标（实现 done，手测/CI 收口）

| ID | 标准 | 状态 |
|----|------|------|
| A1 | 优化完成 CTA：测试/评估/收藏 | 实现 done · 手测待勾 |
| A3 | 历史上限可感知 | done |
| A4 | 证据 JSON | done 最小 |
| S1 | Desktop 磁盘 Key 可密文 | done |
| S2 | 导出默认脱敏 | done |
| S3 | UI 无 aws-sdk；Web 无 S3 提供方 | done |

### 5.2 本阶段必须关门

| ID | 标准 | 验证 |
|----|------|------|
| R1 | tip 已 push；本地不长期 ahead | `git status` |
| R2 | CI A5 绿 | Actions |
| F2a | 全量导出含 EvalCaseSet | 导出包解析 |
| F2b | 导入后用例可 load/run | 手测 |
| C2a | 导出 yaml 含 prompts/tests 最小字段 | 文件抽查 |
| C1a | UI 可选两模型同输入跑测 | 手测 |

### 5.3 约束不破（继承 + 新增）

| ID | 标准 |
|----|------|
| C1–C4 | 无强制登录；无工厂 re-export；生产 dist；IPC secure |
| C5 | 导出默认 `includeSecrets !== true` |
| C6 | `packages/ui` 依赖无 `@aws-sdk/client-s3` |
| C7 | 自动优化不得成为主安装默认路径 |

### 5.4 失败条件

- 强制云账号或默认上传对话  
- vendor Promptfoo/LangSmith 整仓  
- ui 再 re-export 工厂  
- 公网 compose 空密码默认  
- **主安装默认打开自动优化**（与实验通道区分）  
- **导出默认再次含明文 Key**  
- **Web 再引入 S3 SDK**

---

## 6. Won't do（本期）

- 多租户 / 计费 / 生产分布式 Trace  
- 通用 Agent 运行时 / 任意 Shell  
- **主安装默认**自动搜索优化  
- 默认 K8s、默认向上游开 PR  
- 重写前端框架  
- 内嵌完整 Promptfoo runner  
- Web 浏览器侧对象存储 SDK  

---

## 7. 下一刀（冻结）

**Cut-R1 = Release-Align + F2（EvalCase 进导出）**  
见 `NEXT-CUT-SPEC-2026-07-21-RELEASE-F2.md`。  

**Cut-R2**（本阶段稍后，表单已选）：C2 promptfoo 导出 → 或与 **C1 双模型** 并行小刀，但不得阻塞 R1。

---

## 8. 表单选择记录（审计）

| 维度 | 选择 |
|------|------|
| 主目标 | 本地工作台做深 |
| 硬约束 | 六条全维持 + 导出脱敏钉死 + Web 无 S3；自动优化见 §2.1 解释 |
| 输入权威 | tip + 整合调研 + 简报/宪章 + FULL-SCAN（雷达） |
| 主输出 | push/A5 + F2 + C2 + C1（有序） |

---

**维护**：改目标/约束先改本简报与 charter；版本路径只改 CURRENT。
