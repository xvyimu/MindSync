# Spec: D3 ServiceContainer 瘦 main + D4 非 root Docker 里程碑

## OPEN QUESTIONS

**无阻塞 OPEN QUESTIONS。** 下列采用规划默认，Coder 按此执行，勿再追问：

| 项 | 默认 |
|----|------|
| D3 深度 | **增量**：只抽「业务服务装配 / 偏好初始化 / 残余业务 IPC」；不重写窗口、菜单、更新、退出落盘、proxy。 |
| D3 模块边界 | 装配真相源继续是 `packages/desktop/config/service-container.js`；IPC 域注册列表可抽到 `packages/desktop/config/ipc/register-domain-handlers.js`（新建）。 |
| D4 兼容 | **默认对外端口语义保持可映射到容器 80**；非 root 作为**可文档化 + 镜像已支持**的路径（默认 `NGINX_PORT=8080` 时整容器非 root），不强制破坏现有 `28081:80` 用户习惯。 |
| D4 实现策略 | **分两层**：(A) 镜像内创建非 root 用户 + supervisord 子进程降权；(B) 文档 + compose 示例说明「整容器 USER 非 root」需高位端口。不引入 K8s/Helm。 |
| 测试 | 无 Docker 时 D4 以静态检查 + 文档验收为主；有 Docker 则可选 build 烟测。D3 以现有 desktop node:test 契约为准。 |
| 提交/推送 | 本任务**不**要求 commit/push（由后续流程决定）。 |

---

## 1. Goals

### D3 — ServiceContainer continue slim main

1. Desktop `main.js` **不再持有** core 业务服务的创建顺序与依赖装配细节。
2. `createCoreServices`（ServiceContainer）成为唯一业务装配入口：storage → preference → managers → LLM/Prompt/Image → data。
3. `main.js` 只做 composition root：环境、生命周期、窗口、安全 IPC 胶水、把装配结果交给 domain handlers。
4. 验收语义对齐 backlog：**main 无业务装配细节**（允许保留 register 调用列表，但列表可下沉到模块）。

### D4 — non-root Docker milestone

1. 镜像具备**非 root 运行能力**（用户/目录权限/文档齐全）。
2. 默认部署路径仍可用；非 root 路径有明确 compose/文档与端口约定。
3. 现有安全基线不回退：`MCP_AUTH_TOKEN` 必填、public `config.js` 过滤、`no-new-privileges`、Basic Auth 文件权限。

---

## 2. Non-goals / Explicit won't-do

以下 **禁止** 实现或顺手改掉（即使看起来相关）：

| 禁止项 | 说明 |
|--------|------|
| 主安装默认 auto-optimize **ON** | D2 已默认关；不得改默认 |
| Auto-optimize 作为主 CTA | 不改优化完成主按钮语义 |
| 无限轮、无预算自动搜索 | 不扩 D2 预算/轮次策略 |
| 破坏 local-first | 不引入云同步为默认 |
| 破坏导出默认脱敏 | 不改 `exportAllData` 默认 |
| 破坏 Web 无 S3 规则 | 不把 `@aws-sdk` 拉回 Web/UI |
| 大重构 main 生命周期 | 不拆 `createWindow` / 菜单 / autoUpdater 整文件迁移（除非为编译所必需的最小移动） |
| K8s / 多租户 / 计费 | backlog won't |
| 为 D4 强制改 upstream 镜像名 / CI 推送目标 | 可本地/文档验证；不强制改 Docker Hub 账号逻辑 |
| 新增 runtime 依赖 | 不 `pnpm add` 新包 |

---

## 3. Current state (verified)

### D3

| 事实 | 路径/说明 |
|------|-----------|
| 已有雏形 | `packages/desktop/config/service-container.js` 导出 `createCoreServices(deps)` |
| main 仍做装配胶水 | `packages/desktop/main.js`：`initializeServices` ~L593–702 仍 require 一堆 core 工厂、env 探测、解构绑定全局 |
| preference 仍在 main | `initializePreferenceService` 写模块级 `preferenceService`，再经 `getPreferenceService` 回调进 container |
| IPC 域已拆 | `packages/desktop/config/ipc/*-handlers.js`；`setupIPC` 仅装配调用 |
| 残余业务 IPC 在 main | `image-understanding-understand` 内联于 `setupIPC`（~L835–838） |
| 契约测 | `packages/desktop/config/ipc-domain-handlers.test.js` 等；**尚无** service-container 单测 |

### D4

| 事实 | 路径/说明 |
|------|-----------|
| 镜像 root 入口 | 根 `Dockerfile` final stage 无 `USER`；`CMD sh /start-services.sh` |
| 启动需写特权路径 | `docker/start-services.sh`：写 nginx conf、`/var/log/supervisor`、entrypoint 脚本 |
| supervisord 注释已预留降权 | `docker/supervisord.conf` 注释写明 prefer per-program drop |
| compose 已有 | `security_opt: no-new-privileges:true`（prod compose） |
| 文档 | `docs/user/deployment/docker-runtime-security.md`（config 过滤/Auth）；mkdocs docker-basic/advanced **未**写非 root |
| 默认端口 | `NGINX_PORT=80` → 非 root 绑定需 cap 或改高端口 |

---

## 4. Design

### D3 设计（最小增量）

**目标形态：**

```
main.js
  ├── require('./config/service-container')  // createCoreServices only needs electron/env deps
  ├── initializeServices() → thin: call createCoreServices + assign module refs
  ├── setupIPC() → registerSensitiveIpc factory + registerDomainIpcHandlers(...)
  └── window / lifecycle / proxy / update (unchanged ownership)

service-container.js
  ├── require('@prompt-optimizer/core') factories internally (prefer)
  ├── create PreferenceService inside container (no main callback mutation)
  ├── env key presence logging (optional helper)
  └── return services bag (same shape as today)

ipc/register-domain-handlers.js  (new, optional but preferred)
  └── one function that calls all register*IpcHandlers + image-understanding channel
```

**接口（Coder 必须保持/落地）：**

```js
// packages/desktop/config/service-container.js
/**
 * @param {object} deps
 * @param {() => string} deps.getUserDataPath
 * @param {import('electron').safeStorage} [deps.safeStorage]
 * @param {() => Promise<void>} [deps.setupGlobalProxyDispatcherFromSystem]
 * @param {(input: any) => Promise<any>} [deps.convertImageInputWithElectronNativeImage]
 * @param {(msg: string, ...args: any[]) => void} [deps.log]
 * @param {NodeJS.ProcessEnv} [deps.env] — default process.env；用于 API key 探测日志
 * @returns {Promise<{ ok: true, services: DesktopCoreServices } | { ok: false, error: Error }>}
 */
async function createCoreServices(deps)

// DesktopCoreServices 至少包含（与现 return 对齐）:
// storageProvider, modelManager, templateLanguageService, templateManager,
// historyManager, imageAdapterRegistry, imageModelManager, llmService,
// imageUnderstandingService, promptService, imageService, contextRepo,
// favoriteManager, dataManager, preferenceService
```

**main 侧 `initializeServices` 目标形态（示意，非抄写强制）：**

```js
async function initializeServices() {
  const result = await createCoreServices({
    getUserDataPath: () => app.getPath('userData'),
    safeStorage,
    setupGlobalProxyDispatcherFromSystem,
    convertImageInputWithElectronNativeImage,
    env: process.env,
  });
  if (!result.ok) return false;
  Object.assign(/* module-level service vars */, result.services);
  // 或显式解构赋值，保持现有标识符供 setupIPC 使用
  return true;
}
```

**必须从 main 移除的业务装配细节：**

1. `require('@prompt-optimizer/core')` 中的 **业务工厂列表**（`createModelManager`…）——下沉到 service-container（main 可保留仅当仍被别处需要的符号；当前目标是 main 不再为装配解构工厂）。
2. `initializePreferenceService` 实现 —— 迁入 container；删除 main 对 `new PreferenceService` 的直接创建。
3. env static/dynamic API key 扫描循环 —— 迁入 container 或 `config/env-probe.js`（新建仅当更干净）。
4. 内联 `image-understanding-understand` —— 迁入 `config/ipc/image-handlers.js`（或极小 `image-understanding-handlers.js`，优先并入 image-handlers 以少文件）。

**允许仍留在 main 的：**

- `safeSerialize` / IPC response helpers（多处 IPC 依赖）
- `setupGlobalProxyDispatcherFromSystem`（Electron session 耦合）
- `convertImageInputWithElectronNativeImage`（nativeImage 耦合；作为 **deps 注入** container）
- `createWindow`、菜单、zoom、flush、update handlers 工厂、streamRegistry
- `registerSensitiveIpc` 闭包工厂（依赖 mainWindow/session 选项）

**模式复制自：**

- 现有 `packages/desktop/config/service-container.js`（装配返回 bag）
- 现有 `packages/desktop/config/ipc/*-handlers.js` + `ipc-domain-handlers.test.js`（域注册与契约）

### D4 设计（文档 + 安全镜像变更）

**两层里程碑（都要交付）：**

#### Layer A — 镜像内非 root 用户 + 子进程降权（默认路径仍可 root 入口）

1. `Dockerfile` final stage：
   - 创建用户/组，例如 `app` / uid **10001** gid **10001**（固定数字，便于 K8s/compose `user:`）。
   - 预建并 `chown` 运行期可写路径：
     - `/var/log/supervisor`
     - `/var/run`（或专用 `/var/run/prompt-optimizer`；若改 sock 路径需同步 supervisord）
     - `/usr/share/nginx/html`（`config.js` 生成）
     - `/etc/nginx/http.d`、`/etc/nginx/auth`（auth.conf / htpasswd）
     - nginx 临时/缓存目录（alpine nginx 常用 `/var/lib/nginx`、`/var/log/nginx`、`/run/nginx`）
   - **不要**在默认路径强行 `USER app` 若仍默认 `NGINX_PORT=80` 且无 cap（会绑端口失败）。
2. `docker/supervisord.conf`：
   - `[program:mcp-server]` 增加 `user=app`（或 `uid`/`gid` 兼容写法；以 alpine supervisord 支持为准）。
   - nginx：若 alpine 的 nginx master 需 root 绑 80，可保持 nginx 由 root 起、worker 自降权；**至少 MCP 非 root**。
   - 若 Layer B 启用整容器非 root，nginx 与 mcp 均 `user=app` 且端口 ≥1024。
3. `docker/start-services.sh` / `generate-*.sh`：
   - 避免假设仅 root；`mkdir -p` 失败时给出明确错误。
   - 权限：auth 文件保持 `0640` + 组可读；在 app 用户场景下组/属主与 nginx 读权限一致。
4. `docker/docker-compose.yml`（prod）：
   - 保留 `security_opt: no-new-privileges:true`。
   - 可选注释块展示 `user: "10001:10001"` + `NGINX_PORT=8080` + ports `28081:8080`（默认注释掉，避免 silent break）。

#### Layer B — 整容器非 root 文档 + 可切换默认高端口支持

1. 当 `NGINX_PORT` ≥ 1024 且目录属主正确时，支持：
   - Dockerfile 可选 `USER app` **仅当**通过 build-arg 启用，例如：
     - `ARG RUN_AS_NONROOT=false`
     - `RUN if [ "$RUN_AS_NONROOT" = "true" ]; then ...; fi` 不推荐复杂 shell；更简单：**文档指导** `docker run --user 10001:10001 -e NGINX_PORT=8080 -p 8081:8080`，镜像不强制 USER。
   - **推荐默认交付**：镜像内用户存在 + 权限正确 + **不**强制 `USER`（兼容 80）；文档给非 root 一键示例。
2. 文档必须写清：
   - 非 root 时 **不要** 映射到容器 80；用 `NGINX_PORT=8080`。
   - healthcheck 使用 `${NGINX_PORT}`。
   - MCP 仍经 nginx `/mcp`；容器内 MCP 仍 `127.0.0.1:3000`。
   - 与现有 public config / ACCESS_PASSWORD / MCP_AUTH_TOKEN 规则的关系。

**D4 不要求：** 改 Docker Hub 推送 CI 的 registry 账号；不要求 multi-stage 彻底去掉 apk 工具链 root build（build stage root 可接受）。

---

## 5. Files to create or modify

### D3

| 路径 | 动作 | 说明 |
|------|------|------|
| `packages/desktop/config/service-container.js` | **modify** | 内聚 core require + PreferenceService 创建；去掉对 main `initializePreferenceService`/`getPreferenceService` 的双向耦合；可选 env probe |
| `packages/desktop/main.js` | **modify** | 瘦 `initializeServices`；删除业务工厂 require 与 preference 初始化；`setupIPC` 改调 register-domain（若新建） |
| `packages/desktop/config/ipc/image-handlers.js` | **modify** | 接收 `imageUnderstandingService`，注册 `image-understanding-understand` |
| `packages/desktop/config/ipc/register-domain-handlers.js` | **create（推荐）** | 集中 `register*IpcHandlers` 调用；签名见下 |
| `packages/desktop/config/service-container.test.js` | **create** | 对 createCoreServices 做 **mock core** 单测：调用顺序/返回 bag/失败 ok:false |
| `packages/desktop/config/ipc-domain-handlers.test.js` | **modify** | 覆盖 image-understanding channel 若迁入 image-handlers |
| `docs/project/BACKLOG-90D-2026-07-21.md` | **modify** | D3 → `done` + 短备注（commit 时或本变更一并） |
| `docs/project/CURRENT.md` | **modify（轻）** | 能力摘要一行：ServiceContainer 装配下沉 |

### D4

| 路径 | 动作 | 说明 |
|------|------|------|
| `Dockerfile` | **modify** | 创建 `app` 用户 10001；chown 可写路径；注释/ARG 说明非 root |
| `docker/supervisord.conf` | **modify** | MCP（及可行时 nginx）`user=app`；更新注释 |
| `docker/start-services.sh` | **modify** | 权限友好；非 root 失败信息清晰 |
| `docker/generate-auth.sh` | **modify** | chown/chmod 兼容 app 用户与 nginx 读 |
| `docker/docker-compose.yml` | **modify** | 注释非 root 示例；可选 `read_only` **不要**默认开（config 生成需写） |
| `docker/docker-compose.dev.yml` | **modify（可选）** | 同步注释示例；dev 可不强制 |
| `docs/user/deployment/docker-runtime-security.md` | **modify** | 新增「非 root 运行」小节 |
| `mkdocs/docs/zh/deployment/docker-advanced.md` | **modify** | 非 root 示例（与实现一致） |
| `mkdocs/docs/en/deployment/docker-advanced.md` | **modify** | 同上英文 |
| `docs/project/BACKLOG-90D-2026-07-21.md` | **modify** | D4 → `done` |
| `docs/project/CURRENT.md` | **modify（轻）** | Docker 非 root 里程碑一句 |

### 禁止触碰（除非编译断裂的最小修复）

- `packages/ui/**` 产品 CTA / auto-optimize 默认
- `packages/core` 导出脱敏 / Web S3 边界
- `.github/workflows/docker.yml` registry secrets（可不改；若仅加注释可）

---

## 6. Function / interface signatures

### D3

```js
// register-domain-handlers.js
/**
 * @param {object} ctx
 * @param {(channel: string, handler: Function, validateArgs?: Function) => void} ctx.registerSensitiveIpc
 * @param {object} ctx.services — DesktopCoreServices 字段
 * @param {object} ctx.streamRegistry
 * @param {Function} ctx.runOwnedStream
 * @param {Function} ctx.safeSerialize
 * @param {Function} ctx.assertValidStreamId
 * @param {typeof import('electron').app} ctx.app
 * @param {typeof import('electron').shell} ctx.shell
 * @param {object} ctx.consoleLogger
 * @param {Function} ctx.getPublicRuntimeConfig
 * @param {Function} ctx.isSafeExternalUrl
 * @param {Function} ctx.createIpcError
 * @param {(locale: string|null) => void} ctx.setUiLocale
 * @param {Function} ctx.normalizeUiLocale
 * @param {Function} [ctx.setupUpdateHandlers]
 */
function registerDomainIpcHandlers(ctx)
```

`createCoreServices`：**删除** deps 中的：

- `core` 工厂 bag（改为 container 内部 require）
- `initializePreferenceService`
- `getPreferenceService`

**保留/新增** deps：

- `getUserDataPath`（必填）
- `safeStorage`（可选）
- `setupGlobalProxyDispatcherFromSystem`（可选；在 LLM 创建前调用，与现序一致）
- `convertImageInputWithElectronNativeImage`（可选）
- `log` / `env`（可选）

### D4

无新对外 TS API。运维契约：

| 变量/约定 | 值 |
|-----------|-----|
| 非 root uid:gid | `10001:10001`（用户名 `app`） |
| 非 root 推荐端口 | `NGINX_PORT=8080` |
| 必填 | `MCP_AUTH_TOKEN`（不变） |
| compose 示例 | `user: "10001:10001"` + port map host→8080 |

---

## 7. Edge cases

### D3

1. `createSecretAwareStorageProvider` 不存在时回退 `FileStorageProvider`（保持现逻辑）。
2. `safeStorage` 不可用：明文落盘日志警告仍在 container。
3. `ensureSecretsSealed` 迁移失败：warn 不阻断启动。
4. `createCoreServices` 抛错：返回 `{ ok:false, error }`；main 退出，不半初始化 IPC。
5. PreferenceService 必须在 templateLanguageService 之前创建且同一 storageProvider。
6. Proxy setup 失败不得阻断服务创建（现 proxy 函数已吞错；调用序保持在 LLM 创建前）。
7. IPC channel 名 **不得** 改名（契约/preload 依赖）。
8. `setupUpdateHandlers` 仍依赖 preferenceService getter；装配完成后、窗口前注册顺序不变：`initializeServices` → `setupIPC` → `createWindow`。

### D4

1. `NGINX_PORT=80` + `--user 10001`：应失败或文档标明不支持；不要静默坏掉。
2. 只读根文件系统：本里程碑 **不** 默认 `read_only: true`（需写 config.js/auth）。
3. Windows 行尾：保留 `dos2unix`。
4. auth 关闭（空 `ACCESS_PASSWORD`）：仍可启动；compose prod 仍要求密码 env 的 `:?` 语义不削弱。
5. healthcheck 必须用实际 `NGINX_PORT`。
6. 权限：nginx 需读 htpasswd；mcp 不需读 htpasswd。
7. 现有 `linshen/prompt-optimizer:latest` 拉取用户：文档说明自建/ fork 镜像差异即可，不强制改镜像名。

---

## 8. Acceptance criteria

### D3

- [ ] `main.js` 中 **无** `createModelManager` / `createLLMService` / `new PreferenceService` / `new FileStorageProvider` 等业务构造（grep 清零）。
- [ ] `createCoreServices` 可在不加载完整 Electron app 生命周期的情况下被单测 mock 调用。
- [ ] `image-understanding-understand` 不在 `main.js` 内联。
- [ ] 现有 desktop 契约测试绿：`pnpm -F @prompt-optimizer/desktop test`（或等价 `node --test packages/desktop/config/*.test.js`）。
- [ ] IPC 契约：`node --test scripts/desktop-ipc-handlers.test.mjs` 绿（若仓库仍用该脚本）。
- [ ] 行为不变：服务创建顺序与返回字段兼容现 IPC handlers。

### D4

- [ ] 镜像构建定义中存在固定 uid `10001` 用户 `app`。
- [ ] 运行期可写路径属主允许该用户写入 `config.js` / supervisor 日志 / auth 生成物。
- [ ] MCP 进程在 supervisord 配置中以非 root 用户运行（Layer A）。
- [ ] 文档（`docker-runtime-security.md` + zh/en advanced）包含非 root 一键示例与端口注意。
- [ ] prod compose 保留 `no-new-privileges`；非 root 示例以注释或独立 snippet 提供。
- [ ] 未引入「默认自动优化开」等 won't-do。

---

## 9. Test plan

### D3（必须）

```text
# 工作根：D:\PromtOptimizer\src\prompt-optimizer
pnpm -F @prompt-optimizer/desktop test
# 或：
node --test packages/desktop/config/*.test.js
node --test scripts/desktop-ipc-handlers.test.mjs
```

新增 `service-container.test.js` 最小断言：

1. mock `FileStorageProvider` / factories：成功路径返回 `ok:true` 且含 `preferenceService`、`promptService`。
2. 工厂抛错 → `ok:false`。
3. **不**启动 Electron GUI。

可选烟测：`pnpm -F @prompt-optimizer/desktop exec electron .`（生产 web-dist）进程不秒崩。

### D4（有 Docker 则跑；无则静态）

```text
# 静态
# - Dockerfile 含 app/10001
# - supervisord 含 user=app（mcp）
# - docs 含 NGINX_PORT=8080 示例

# 可选构建（耗时长，非阻塞若环境无 Docker）
docker build -t prompt-optimizer:d4 .
docker run --rm -e MCP_AUTH_TOKEN=test -e ACCESS_PASSWORD=test -e NGINX_PORT=8080 --user 10001:10001 -p 18081:8080 prompt-optimizer:d4
# curl health via published port / 或 docker exec curl localhost:8080/healthz
```

**不要**在测试中调用真实模型 API。

---

## 10. Implementation order (Coder)

1. **D3 service-container 内聚** + 单测 mock。
2. **D3 main 瘦身** + image-understanding 下沉 +（推荐）register-domain-handlers。
3. 跑 desktop 契约测试，修回归。
4. **D4 Dockerfile 用户/权限** + supervisord MCP user。
5. 调整 start/generate 脚本权限兼容。
6. 写/改三处文档 + backlog/CURRENT 状态。
7. 若有 Docker，可选非 root 烟测。

---

## 11. Risks

| 风险 | 缓解 |
|------|------|
| D3 循环依赖 / main 解构遗漏导致 IPC undefined | 单测 + 启动顺序不变；handlers 入参显式 |
| PreferenceService 双实例 | 禁止 main 再 `new`；只从 bag 取 |
| D4 非 root 绑 80 失败 | 文档强制高端口；默认镜像不强制 USER |
| nginx 读不到 auth 文件 | generate-auth 后统一 chown/chmod 矩阵写进脚本注释 |
| supervisord sock 权限 | 预建 `/var/run` 属主；或把 sock 放到 app 可写目录 |
| 改动面过大拖垮 review | 严格按本 spec 文件表；不做窗口/更新迁移 |
| 文档与镜像漂移 | CURRENT/BACKLOG 各一行；security 文档与 Dockerfile 同 PR |

---

## 12. Patterns to follow

| 模式 | 复制/对齐文件 |
|------|----------------|
| 服务 bag 返回 | `packages/desktop/config/service-container.js`（现有） |
| 域 IPC 注册 | `packages/desktop/config/ipc/model-handlers.js` 等 |
| 域契约测试 | `packages/desktop/config/ipc-domain-handlers.test.js` |
| safeStorage 包装 | `packages/desktop/config/safe-storage-secrets.js` |
| Docker public config 过滤 | `docker/generate-config.sh` + `packages/desktop/config/runtime-security.js` |
| Compose 安全基线 | `docker/docker-compose.yml`（`no-new-privileges`、必填 token/password） |

---

## 13. Done definition

- D3 + D4 验收框均可勾选。
- BACKLOG 表 D3/D4 状态为 `done`。
- 无 won't-do 项被实现。
- Coder 在 `.pipeline/changes.md` 记录实际改动文件与验证命令（由 Coder 阶段写；Planner 不写代码）。
