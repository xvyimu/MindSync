# 下一刀：B6 路径测 + D1/D2 实验自动优化（默认关）

| 项 | 值 |
|----|-----|
| 日期 | 2026-07-21 |
| 状态 | **代码 done** |
| 约束 | **主安装自动优化默认关**（ADR-005）；路径规则 Web/Desktop 对齐 |

---

## B6 路径规范化回归

- 实现已在：`packages/ui/src/utils/remote-backup.ts` · `packages/desktop/remote-storage.js`  
- 新增 UI 单测：`packages/ui/tests/unit/utils/normalize-object-path.spec.ts`  
- Desktop 已有：`packages/desktop/config/remote-storage.test.js`  
- 覆盖：`..` / `.` / 反斜杠 / C0 控制符 / `%2e%2e` 编码穿越  

## D1 OptimizationStrategy

- `packages/core/src/services/prompt/optimization-strategy.ts`  
- `TemplateOptimizationStrategy`：默认人工模板路径  
- `ExperimentalAutoOptimizationStrategy`：实验轨，带 `maxRounds` / `maxCharsBudget`  
- `resolveOptimizationStrategy(settings)`：**仅** `settings.enabled === true` 时选 auto  

## D2 实验开关

- Pref key：`app:settings:experimental:auto-optimize.v1`  
- 默认：`{ enabled: false, maxRounds: 3, maxCharsBudget: 20000 }`  
- UI helper：`packages/ui/src/utils/experimental-auto-optimize.ts`（load/save + normalize）  
- **不**在设置页默认打开；不接线到主优化按钮默认路径  

## 验收

| ID | 标准 |
|----|------|
| B6 | normalize 单测绿；desktop remote-storage 测仍绿 |
| D1 | template 默认；auto 标记 experimental |
| D2 | normalize 仅 true 开启；resolve 禁用时永不选 auto |

## 明确不做

- 主安装默认开自动优化  
- 自动优化 UI 作为主 CTA  
- 无预算无限轮搜索  
