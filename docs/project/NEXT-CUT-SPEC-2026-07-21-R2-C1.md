# 下一刀实现规格：Cut-R2b · C1 双模型轻对照

> **主目标**：本地工作台做深。  
> **刀号**：Cut-R2b。  
> **前序**：C2 promptfoo 导出 done；A5 CI 绿。  
> **本刀不做**：N×M 矩阵编辑器；structured-compare 评委流；自动优选模型。

| 项 | 值 |
|----|-----|
| 日期 | 2026-07-21 |
| 状态 | **代码 done**（待 push/CI） |
| 范围 | Basic System / Basic User 测试区 |

---

## 1. 问题

用户要「同一提示、两个 modelKey 并排看输出」。现有列已可各选模型，但缺少一键「双模型」产品化入口与验收口径。

## 2. Must

1. 纯函数 `seedDualModelKeys`：给定模型列表，产出 A/B 两个 key（优先不同）。  
2. Basic System / Basic User 测试区工具栏按钮「双模型」：  
   - 列数设为 2  
   - A/B 版本均为「工作区」（同一提示）  
   - A/B modelKey 种子为不同模型（若至少 2 个 enabled）  
3. 已有每列 model select + Run All 保持可用。  
4. 单测覆盖 seed 逻辑。  

## 3. Must not

- 矩阵编辑器  
- 复用 structured-compare 当双模型  
- 强制第二模型（仅一台模型时 toast 说明）  

## 4. 验收

| ID | 标准 |
|----|------|
| C1a | 两 modelKey 可并排；Run All 各自请求 |
| C1b | 一键预设后 A≠B（≥2 模型时） |
| C1c | 与评委 compare 评估解耦 |

## 5. 挂载

- `packages/ui/src/utils/dual-model-seed.ts`  
- `BasicSystemWorkspace.vue` / `BasicUserWorkspace.vue` 工具栏  
- i18n `test.layout.dualModel*`  
