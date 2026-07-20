# 下一刀实现规格：Release-Align + F2 EvalCase 进全量导出

> **主目标**：本地工作台做深（表单冻结 2026-07-21）。  
> **刀号**：Cut-R1。  
> **前序已完成**：Cut-1 EvalCase · Cut+1 safeStorage · B3 历史 · C4 CTA · 导出脱敏 · B5 UI 去 aws-sdk · Node ^24。  
> **本刀不做**：C1/C2 实现体（另刀）；红队；主安装默认自动优化。

| 项 | 值 |
|----|-----|
| 日期 | 2026-07-21 |
| 基线 tip | push 前 `91da4e4`；F2 实现后以 `git log -1` 为准 |
| 状态 | **F2 代码 done**；**push/A5 待执行确认后** |
| 包 | `core` · `ui`（DataManager 路径）· 文档 · git remote |

---

## 1. 问题

1. 本地 `develop` **ahead 5**，CI（A5）未对最新 tip 验证。  
2. EvalCaseSet 存于 preference 键 `eval.caseSets.v1`，**全量导出/换机可能丢失用例**，与「证据可带走」不一致。

---

## 2. 目标 / 非目标

### 2.1 Must

1. **push** `origin/develop`（含 91da4e4 及之前 4 commits，若仍 ahead）。  
2. 观察 GitHub Actions：`test`（gate/lint/mcp）结果；红则修到绿。  
3. 全量导出 JSON（`exportAllData` 数据面）**包含** EvalCaseSet。  
4. 导入后 `useEvalCaseSet` / repository 能 load 到相同用例。  
5. 导出默认仍脱敏 models Key（不破坏 C5）。  
6. 更新 CURRENT / backlog A0·A5·F2 状态。

### 2.2 Must not

- 新断言类型、红队、自动优化默认开  
- Web 引入 aws-sdk  
- 改变 CTA/历史/safeStorage 已有行为（除非修回归）  
- 未确认的 force push  

---

## 3. 输入

| 输入 | 说明 |
|------|------|
| 本地 git tip | `91da4e4` 等 |
| `CORE_SERVICE_KEYS.EVAL_CASE_SET` | `eval.caseSets.v1` |
| Preference / storage 中的用例 | 现网用户数据 |
| 简报冻结 | `COMPETITIVE-BRIEF.md` §4 序 1–2 |

---

## 4. 输出

### 4.1 Git / CI

- 远端 `origin/develop` 包含本地 commits  
- Actions 链接与结论记入 backlog A5 备注  

### 4.2 导出形状（建议）

在 `exportAllData` 的 `data` 对象增加：

```json
{
  "version": 1,
  "data": {
    "history": [],
    "models": [],
    "evalCaseSets": { "version": 1, "id": "default", "name": "...", "cases": [], "updatedAt": 0 }
  },
  "meta": { "secretsIncluded": false }
}
```

键名二选一（实现时定一，写测试）：

- 推荐：`evalCaseSets`（清晰）  
- 或：与 storage 同名 `eval.caseSets.v1`（兼容直读）  

### 4.3 导入

- `importAllData` 识别该键；校验 `isEvalCaseSet`；写入 preference/storage 同一键。  
- 无效则 skip + warn，不阻断其它域导入。  

### 4.4 文档

- backlog：A0 重标（push 后 done）、A5 结果、新增 **F2 done**  
- CURRENT 一句：导出含可复现用例  

---

## 5. 实现要点

1. `DataManager.exportAllData`：读 preference 或 EvalCaseSetRepository。  
2. 若仅 UI 用 preferenceService：导出侧通过 `preferenceService.get(EVAL_CASE_SET)`。  
3. 单测：mock preference 含 case set → export 字符串含 cases → import round-trip。  
4. **不**把用例误标为 secrets；脱敏逻辑只碰 models/imageModels。  
5. push 前 `git status` 干净；文档变更可同 commit 或 docs commit。  

---

## 6. 验收（Cut-R1 Done）

| ID | 标准 | 验证 |
|----|------|------|
| R1 | 远端包含 tip | `git fetch && git status` 无 ahead（或仅文档） |
| R2 | CI 无红 | Actions |
| F2-1 | export JSON 含用例 | 单测 + 手测解析 |
| F2-2 | import 后面板可见用例 | 手测 |
| F2-3 | 默认导出仍无明文 apiKey | 单测/抽查 |
| F2-4 | 无 ui 工厂 re-export 回潮 | package-scripts |

**失败**：force push 未授权；导入擦掉 models；导出默认又含 Key。

---

## 7. 随后刀（表单已选，不在本刀编码）

| 刀 | 主题 |
|----|------|
| Cut-R2a | C2 `promptfoo.yaml` 最小导出 |
| Cut-R2b | C1 双模型轻量对照 |
| 实验轨 | D1/D2 自动优化**开关**（主安装默认关；见简报 §2.1） |

---

## 8. 任务拆分

```text
1. git push origin develop（确认后）
2. 记 A5 CI 结果
3. core: export/import eval case set + 单测
4. 手测 DataManager 导出/导入
5. 更新 BRIEF/BACKLOG/CURRENT
```

**完成定义**：§6 全是。
