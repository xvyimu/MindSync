# 下一刀实现规格：Cut-R2a · C2 promptfoo.yaml 最小导出

> **主目标**：本地工作台做深（表单冻结 2026-07-21 R2）。  
> **刀号**：Cut-R2a。  
> **前序**：Cut-R1 F2 EvalCase 进导出 · A5 收口中。  
> **本刀不做**：vendor Promptfoo · 红队 · C1 双模型 · 主安装默认自动优化。

| 项 | 值 |
|----|-----|
| 日期 | 2026-07-21 |
| 状态 | **实现中** |
| 包 | `core` · `ui` · i18n · 单测 |

---

## 1. 问题

专业评测用户需要把本机用例接到 Promptfoo/CI，但本产品不应内嵌评测引擎。

## 2. Must / Must not

**Must**

1. core 纯函数 `exportPromptfooYaml`：EvalCaseSet + prompt → yaml  
2. 映射 `contains` / `not_contains` → Promptfoo `contains` / `not-contains`  
3. **永不**写入 apiKey / Authorization / sk- 形态密钥  
4. UI：EvalCaseSetPanel 增加「导出 promptfoo.yaml」  
5. 单测覆盖最小 yaml、空用例、转义、无密钥守卫  

**Must not**

- 依赖 `promptfoo` npm 包  
- 在应用内执行 promptfoo eval  
- 导出 providers 凭证  

## 3. 验收

| ID | 标准 |
|----|------|
| C2a | yaml 含 `prompts` / `tests` / contains 断言 |
| C2b | 单测绿；`assertPromptfooYamlHasNoSecrets` 通过 |
| C2c | UI 可下载 `.yaml`（Basic System 用例面板） |

## 4. 挂载点

- `packages/core/src/services/evaluation/promptfoo-export.ts`  
- `packages/ui/.../useEvalCaseSet.ts` · `EvalCaseSetPanel.vue` · `BasicSystemWorkspace.vue`  
