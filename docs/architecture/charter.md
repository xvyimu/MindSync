# Architecture Charter — Prompt Optimizer Fork

> **L1 现行架构事实（宪章）。**  
> 决策依据：`D:\PromtOptimizer\docs\COMPETITIVE-ARCHITECTURE-RESEARCH-2026-07-21.md`  
> 产品决策：[`../project/COMPETITIVE-BRIEF.md`](../project/COMPETITIVE-BRIEF.md)  
> 实现以代码为准；本文件约束「允许的形状」，不替代 API 文档。

| 项 | 值 |
|----|-----|
| 状态 | Accepted（2026-07-21） |
| 产品定位 | 本地优先多端提示词**工作台**（非 LLMOps 平台、非 Agent OS） |
| 版本锚点 | 产品 2.11.7 · 分支 `develop` |

---

## 1. 原则（不可破）

1. **领域纯净**：`packages/core` 不得依赖 ui / web / desktop / extension / DOM / Vue。  
2. **单向依赖**：`extension|web|desktop-renderer → ui → core`；`desktop-main|mcp-server → core`。  
3. **ui 非 core facade**：`packages/ui/src/index.ts` **禁止**运行时 re-export 工厂与 Electron Proxy；类型 re-export 允许。  
4. **敏感在 main**：密钥落盘、用户数据目录、自动更新、系统代理、远程对象存储的特权路径只在 Electron main。  
5. **IPC 即边界**：新 channel 必须登记 `channel-manifest`，经 `registerSecure*` / `secureHandle` 注册，默认 `assertKnownInvokeChannel`。  
6. **本地默认**：无强制账号；网络同步与云备份必须显式用户动作。  
7. **构建期无密钥**：前端 bundle 仅允许 public `VITE_APP_*` / `VITE_PUBLIC_*`（及产品默认非敏感 flag）。  
8. **小核心**：大功能以端口/策略/适配器接入；禁止为单功能引入第二套 monorepo 平台。  
9. **fork-only**：默认不向上游开 PR；合入上游以安全与依赖为主。  
10. **文档数字单一真相**：版本与安装路径只改 `docs/project/CURRENT.md`。

---

## 2. 信任边界

```
[不可信]  Web 页面 / 扩展页面 / 渲染进程 DOM
    │  仅 public 配置 + 用户输入
    ▼
[半可信]  preload（contextIsolation + sandbox）
    │  显式 API 表面
    ▼
[可信]    Electron main · 本地文件 · 更新 · 可选远程存储
    │
    ▼
[外部]    用户配置的 LLM / 图像厂商 API（用户自有 Key）
```

MCP HTTP：Bearer +（非 loopback 时）强制 token；health 仅最小 `{ok}` 且宜限制来源。

---

## 3. 包职责

| 包 | 允许 | 禁止 |
|----|------|------|
| **core** | 领域服务、端口、纯 TS 工具 | Vue、Electron、读 userData、UI 文案 |
| **ui** | 组件、composable、i18n、主题 | 直接 `new OpenAI()`、Node fs、re-export 工厂 |
| **web/extension** | 壳、路由安装、样式入口 | 复制业务逻辑 |
| **desktop** | main/preload/IPC/更新/文件存储 | 在 renderer 实现特权 I/O |
| **mcp-server** | 工具面、参数校验、截断 | 绕过 core 私自调厂商 SDK（除非明确适配层） |

---

## 4. 数据与导出

- 全量导出必须覆盖：history、models、（imageModels）、userTemplates、userSettings、contexts、**favorites**。  
- 历史可截断，但必须**可配置或可感知**，禁止无提示丢数据。  
- 远程路径规范化：禁止 `..`、控制字符、反斜杠（Web/Desktop 规则一致）。  
- Desktop 密钥中长期目标：OS 级安全存储（safeStorage）；禁止日志打印 Key。  

---

## 5. 流式与取消

- 流式完成事件必须携带结构化 payload（至少可还原 `content`）。  
- 取消必须绑定 stream owner（sender），禁止跨窗口取消。  
- 错误通道单一：避免 `onError` + `throw` 双 toast。  

---

## 6. 评测与互操作（工作台边界内）

- 评估**可复现**优先于炫酷图表。  
- 允许：本地用例集、证据 JSON、导出 promptfoo 配置。  
- 禁止：默认 vendoring 整仓 Promptfoo；禁止默认云端评测托管。  

---

## 7. 自动优化（可选）

- 仅以 `OptimizationStrategy` 类插件存在；**默认关闭**。  
- 必须：预算、可取消、成本提示。  
- 不得替换默认「模板 + 人工迭代」主路径。  

---

## 8. Won't do（架构级）

- 多租户云账号与计费中台  
- 生产级分布式 Trace 平台  
- 通用 Agent 运行时 / 任意 Shell 工具  
- 默认 K8s  
- 为跟风重写前端框架  
- ui 再次成为 core 的公共 facade  

---

## 9. ADR 索引（决策记录）

| ID | 标题 | 状态 |
|----|------|------|
| ADR-001 | 本地优先，不做默认云账号 | Accepted |
| ADR-002 | core 为唯一领域层 | Accepted |
| ADR-003 | Desktop main 为敏感能力宿主 | Accepted |
| ADR-004 | 评估可复现优先于花哨 | Proposed → 执行中（见 backlog） |
| ADR-005 | 自动优化可选，默认人工模板 | Proposed |
| ADR-006 | fork-only | Accepted |

细节叙事见调研报告 §19。

---

## 10. 评审检查（合并前）

见调研报告 §38 十条清单；架构相关最短集：

- [ ] 依赖方向未反转  
- [ ] 无新的 ui 工厂 re-export  
- [ ] 新 IPC 已登记且 secure  
- [ ] 无密钥进 bundle/日志  
- [ ] 流式 payload/取消仍成立  
- [ ] 导出契约未静默缩水  

---

**变更流程**：修改本宪章 = 架构变更；需同步 COMPETITIVE-BRIEF 与（若影响路径/版本）CURRENT 链接说明。
