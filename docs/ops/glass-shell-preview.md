# MindSync · Fluent 玻璃预览

> 与 HTML sandbox（用户已确认）参数对齐 · **默认 OFF**

## 启用

开发 Web / Desktop web-dist 任一入口：

```text
?glassShell=1
```

或控制台：

```js
localStorage.setItem('ui:glass-shell', '1')
location.reload()
```

与 redesign 壳组合：

```text
?redesignShell=1&glassShell=1
```

## 关闭

```text
?glassShell=0
```

或 `localStorage.removeItem('ui:glass-shell')` 后刷新。

## 预期

| 区域 | 效果 |
|------|------|
| 模态 / 抽屉 | L3 白基底毛玻璃 |
| redesign 侧栏 + 顶栏 | L2 玻璃 |
| 主工作区 | **实心**（无 blur） |
| 主题切换 | `data-glass-scheme` 跟随产品深/浅 |

## 对照

- 包：`D:\orca\.planning\portfolio-visual-fluent-glass-2026-07-23\`
- HTML：`sandbox/index.html` · `refs/calibration.html`
- 代码：`packages/ui/src/config/glass-shell.ts` · `styles/glass-shell.css`
