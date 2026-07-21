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

## 非 root 运行

镜像内已创建固定用户 **`app`（uid/gid `10001`）**，并预 chown 运行期可写路径（nginx conf/auth、`config.js`、supervisor 日志等）。

| 模式 | 说明 |
|------|------|
| **默认（兼容）** | 入口仍为 root，便于 `NGINX_PORT=80`；**MCP 进程**在 supervisord 中以 `user=app` 降权 |
| **整容器非 root** | `docker run --user 10001:10001` + **`NGINX_PORT≥1024`**（推荐 `8080`）；**不要**把非 root 容器映射到容器内 80 |

### 一键示例（整容器非 root）

```bash
docker run --rm \
  --user 10001:10001 \
  -e NGINX_PORT=8080 \
  -e MCP_AUTH_TOKEN=change-me \
  -e ACCESS_PASSWORD=change-me \
  -p 8081:8080 \
  --security-opt no-new-privileges:true \
  prompt-optimizer:local
# health: curl -fsS http://localhost:8081/healthz
```

Compose 片段见 `docker/docker-compose.yml` 末尾注释（默认注释掉，避免 silent break）。

注意：

- Healthcheck 必须使用实际 **`NGINX_PORT`**（非 root 时为 `8080`）。
- MCP 仍经 nginx **`/mcp`** 反代；容器内 MCP 监听 `127.0.0.1:3000`。
- `MCP_AUTH_TOKEN` 仍**必填**；public `config.js` 过滤规则不变。
- 不要默认 `read_only: true`（启动需写 `config.js` / auth）。

## 相关

- 实现：`docker/generate-config.sh` · `packages/desktop/config/runtime-security.js`（规则对齐）
- Vercel 会话：`docs/user/deployment/vercel.md`（HMAC Cookie，非明文密码）
