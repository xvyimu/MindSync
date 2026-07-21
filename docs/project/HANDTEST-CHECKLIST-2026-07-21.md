# 手测清单（15 分钟 · 工作台闭环）

| 项 | 值 |
|----|-----|
| 日期 | 2026-07-21 |
| 产品 | 2.11.7 fork · `develop` |
| 源码 tip | 以 `git log -1` / Actions 为准 |
| 安装 | `D:\PromtOptimizer\app\PromptOptimizer.exe` 或 `pnpm` 本地 web/desktop |
| 硬约束 | 导出默认脱敏 · Web 无 S3 · 主安装无默认自动优化 |

> 勾选即过；失败写备注。与 `SMOKE-CHECKLIST-UX-CANCEL.md` 互补（本表偏闭环/安全/C1–C2）。

---

## 1. 优化闭环与 CTA（~3 min）

| # | 步骤 | Pass |
|---|------|------|
| 1 | Basic **System**：输入提示 → 优化成功 | ☐ |
| 2 | 优化完成后出现 **PostOptimize CTA**：测试 / 评估 / 收藏 | ☐ |
| 3 | 点「测试」能进入测试区；点「评估/用例」可开 EvalCase（System） | ☐ |
| 4 | Basic **User**：同样优化 → CTA 可见 | ☐ |

---

## 2. 历史与上限（~2 min）

| # | 步骤 | Pass |
|---|------|------|
| 5 | 打开历史抽屉：显示占用 `count/max` | ☐ |
| 6 | 将上限调到接近当前条数 → near/full 警告文案 | ☐ |
| 7 | 应用合法上限成功；非法值有错误提示 | ☐ |

---

## 3. 导出脱敏 + 密钥二次确认 + EvalCase（~4 min）

| # | 步骤 | Pass |
|---|------|------|
| 8 | 数据管理 → 导出：**不勾**「包含密钥」→ 下载 | ☐ |
| 9 | 解析 JSON：`models`/`imageModels` **无**明文 `apiKey`；`meta.secretsIncluded` 为 false 或等价 | ☐ |
| 10 | 导出含 **evalCaseSets**（若本机有用例） | ☐ |
| 11 | **勾选**包含密钥 → 点导出 → 出现 **二次确认** 对话框 | ☐ |
| 12 | 取消确认 → 不下载；确认后下载且可含密钥（勿分享该文件） | ☐ |

---

## 4. C2 promptfoo 导出（~2 min）

| # | 步骤 | Pass |
|---|------|------|
| 13 | Basic System → 用例面板：至少 1 条 contains 用例 + 有优化/原始提示 | ☐ |
| 14 | 点 **导出 promptfoo.yaml** → 文件下载 | ☐ |
| 15 | 文件含 `prompts` / `tests` / `contains`；**无** `apiKey` / `sk-` | ☐ |

---

## 5. C1 双模型（~2 min）

| # | 步骤 | Pass |
|---|------|------|
| 16 | 启用 ≥2 个文本模型 | ☐ |
| 17 | 测试区点 **双模型** → 列数 2、A/B 同为工作区版本、model 不同 | ☐ |
| 18 | **测试全部**：两列各自产出（或可解释错误，非静默） | ☐ |

---

## 6. 远程与 Desktop（可选）

| # | 步骤 | Pass |
|---|------|------|
| 19 | **Web**：远程备份仅 Google Drive，无 S3/R2/WebDAV 提供方 | ☐ |
| 20 | **Desktop**（若 OS 支持）：models 落盘为密文 `__enc:v1:` 或等价 | ☐ |

---

## 7. 结果

| 区域 | Pass/Fail | 备注 |
|------|-----------|------|
| CTA |  |  |
| 历史 |  |  |
| 导出脱敏/二次确认 |  |  |
| EvalCase / F2 |  |  |
| promptfoo C2 |  |  |
| 双模型 C1 |  |  |
| Web/Desktop 边界 |  |  |

**签名 / 日期：** ________________  

**相关文档：** `COMPETITIVE-BRIEF.md` · `BACKLOG-90D` · `NEXT-CUT-SPEC-*-R2-C1/C2` · `SMOKE-CHECKLIST-UX-CANCEL.md`
