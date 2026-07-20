# Docker 部署安全说明（fork）

> 用户文档 · 不写本机绝对路径。现行产品版本见源码 `docs/project/CURRENT.md`。

## 浏览器运行时配置（config.js）

容器启动时 `generate-config.sh` **只会**把下列变量写入前端可读的 `config.js`：

- `VITE_APP_*`
- `VITE_PUBLIC_*`
- 且名称中 **不能** 含 `API_KEY` / `TOKEN` / `SECRET` / `PASSWORD` 等敏感段

因此：

- **不要**再依赖 `VITE_OPENAI_API_KEY` 等变量给网页预置模型密钥（即使环境变量仍存在，也**不会**注入浏览器）。
- 模型 API Key：在应用内「模型管理」填写，或仅给 **MCP 服务端** 环境变量使用。
- 日志只会打印注入的**键名**，避免 dump 密钥值。

## 访问控制

| 机制 | 说明 |
|------|------|
| `ACCESS_PASSWORD` | 可选；**不要**使用弱默认密码。compose 默认已改为空（关闭认证） |
| `ACCESS_USERNAME` | Basic Auth 用户名，默认 `admin` |
| MCP | `MCP_AUTH_TOKEN` **必填**（Docker） |

## Compose 提示

```yaml
environment:
  - ACCESS_PASSWORD=        # 空 = 关闭 Basic Auth；公网务必设强密码
  - MCP_AUTH_TOKEN=...      # 必填
  # 不要指望 VITE_*_API_KEY 进入前端
```

## 相关

- 实现：`docker/generate-config.sh` · `packages/desktop/config/runtime-security.js`（规则对齐）
- Vercel 会话：`docs/user/deployment/vercel.md`（HMAC Cookie，非明文密码）
