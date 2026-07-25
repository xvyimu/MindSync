# MindSync · 品牌与素材清单

| 项 | 值 |
|----|-----|
| **日期** | 2026-07-22 |
| **产品名（发行/Electron）** | **MindSync** |
| **UI 产品文案（i18n 可能仍用）** | Prompt Optimizer / 提示词优化器 |
| **appId** | `com.xvyimu.mindsync` |
| **许可** | AGPL-3.0-only；素材若源自上游则保留 NOTICE 归属 |

> 发布与替换素材时以本表为准；勿混用旧「仅 PromptOptimizer 路径」作为官方品牌说明。

---

## 1. 命名

| 场景 | 使用 |
|------|------|
| GitHub / npm 根 / Electron productName | **MindSync** |
| 用户可见窗口/安装目录（历史） | 安装树可能仍为 `PromptOptimizer.exe`（见 CURRENT）— **逐步**对齐 MindSync |
| Docker 官方目标名 | `xvyimu/mindsync`（启用发布后） |
| 上游对照镜像名 | `linshen/prompt-optimizer`（**非** MindSync 官方承诺名） |
| 衍生声明 | 始终保留 linshenkx/prompt-optimizer + NOTICE |

---

## 2. Logo / 图标文件

| 路径 | 用途 | 备注 |
|------|------|------|
| `images/logo/1024-1024.png` | 通用高分辨率 logo | 营销/文档插图 |
| `images/logo/1024-1024.svg` | 矢量 logo | 优先缩放场景 |
| `images/logo/electron-icons.md` | Electron 图标生成说明 | 局部流程 |
| `packages/desktop/icons/**` | 桌面打包图标（含 `.ico` 等） | `electron-builder` `win.icon` 等 |
| `images/demo/**`（若存在） | 演示截图/动图 | README 功能演示 |

**替换流程（建议）：**

1. 更新源 SVG/PNG（保持正方形 1024 基准）。
2. 按 `images/logo/electron-icons.md` 再生 desktop `icons/**`。
3. 重建 desktop 包；更新 README 插图引用。
4. 不改 appId 除非刻意破坏自动更新身份。

---

## 3. 禁止混用

- 不要把 `D:\PromtOptimizer\...` 写成现行源码/安装 SSOT（SSOT：`docs/project/CURRENT.md` → `D:\projects\MindSync`）。
- 不要在发行说明里把上游 Docker Hub 镜像写成「MindSync 官方镜像」而不加对照声明。
- 不要删除 LICENSE/NOTICE 中的上游版权行以「换品牌」。

---

## 4. 相关

- 身份：[`../GITHUB_IDENTITY.md`](../GITHUB_IDENTITY.md)
- 现行路径：[`project/CURRENT.md`](./project/CURRENT.md)
- 目标架构：[`ARCHITECTURE_TARGET.md`](./ARCHITECTURE_TARGET.md)
