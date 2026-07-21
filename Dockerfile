FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install -g corepack@latest && corepack enable

FROM base AS build
COPY . /app
WORKDIR /app
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm run build
RUN pnpm mcp:build

FROM node:22-alpine
# 安装htpasswd工具、dos2unix和supervisor
RUN apk add --no-cache nginx apache2-utils dos2unix supervisor gettext curl

# 安装pnpm
RUN npm install -g pnpm

# 非 root 运行支持（Layer A）：固定 uid/gid 便于 compose `user: "10001:10001"`。
# 默认入口仍以 root 启动（兼容 NGINX_PORT=80）；整容器非 root 见 docs 与 NGINX_PORT>=1024。
# 勿在默认路径强制 USER app — 绑 80 会失败。
RUN addgroup -g 10001 -S app \
  && adduser -u 10001 -S -G app -h /home/app -s /sbin/nologin app

# 复制Nginx配置
COPY docker/nginx.conf /etc/nginx/http.d/default.conf

# 复制Web应用
COPY --from=build /app/packages/web/dist /usr/share/nginx/html

# 复制MCP服务器
COPY --from=build /app/packages/mcp-server/dist /app/mcp-server/dist
COPY --from=build /app/packages/mcp-server/package.json /app/mcp-server/
COPY --from=build /app/packages/mcp-server/preload-env.js /app/mcp-server/
COPY --from=build /app/packages/mcp-server/preload-env.cjs /app/mcp-server/

# 复制构建后的包到正确位置（MCP服务器依赖）
COPY --from=build /app/packages /app/packages
# 复制必要的node_modules
COPY --from=build /app/node_modules /app/node_modules

# 设置默认环境变量（向前兼容；非 root 部署请设 NGINX_PORT=8080）
ENV NGINX_PORT=80

# 设置MCP服务器工作目录
WORKDIR /app/mcp-server

# 复制并设置启动脚本
COPY docker/generate-config.sh /docker-entrypoint.d/40-generate-config.sh
COPY docker/generate-auth.sh /docker-entrypoint.d/30-generate-auth.sh
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY docker/start-services.sh /start-services.sh

# 确保脚本有执行权限
RUN chmod +x /docker-entrypoint.d/40-generate-config.sh
RUN chmod +x /docker-entrypoint.d/30-generate-auth.sh
RUN chmod +x /start-services.sh

# 转换可能的Windows行尾符为Unix格式
RUN dos2unix /docker-entrypoint.d/40-generate-config.sh
RUN dos2unix /docker-entrypoint.d/30-generate-auth.sh
RUN dos2unix /start-services.sh

# 运行期可写路径：config.js 生成、auth、supervisor 日志、nginx 缓存/临时
RUN mkdir -p \
      /var/log/supervisor \
      /var/run \
      /var/lib/nginx/tmp \
      /var/log/nginx \
      /run/nginx \
      /etc/nginx/auth \
      /etc/nginx/http.d \
      /usr/share/nginx/html \
  && chown -R app:app \
      /var/log/supervisor \
      /var/run \
      /var/lib/nginx \
      /var/log/nginx \
      /run/nginx \
      /etc/nginx/auth \
      /etc/nginx/http.d \
      /usr/share/nginx/html \
      /app \
  && chmod 775 /var/log/supervisor /var/run /etc/nginx/http.d /etc/nginx/auth /usr/share/nginx/html

# 不强制 USER app（兼容默认 80）。非 root 示例：
#   docker run --user 10001:10001 -e NGINX_PORT=8080 -e MCP_AUTH_TOKEN=... -p 8081:8080 ...
EXPOSE 80

# 使用自定义启动脚本
CMD ["sh", "/start-services.sh"]
