#!/bin/sh

if [ -z "${MCP_AUTH_TOKEN:-}" ]; then
    echo "ERROR: MCP_AUTH_TOKEN is required for Docker deployments." >&2
    exit 1
fi

# 创建日志目录
mkdir -p /var/log/supervisor

# 处理nginx配置文件中的环境变量
echo "Processing nginx configuration with environment variables..."
envsubst '${NGINX_PORT}' < /etc/nginx/http.d/default.conf > /tmp/nginx.conf
mv /tmp/nginx.conf /etc/nginx/http.d/default.conf
echo "Nginx configuration updated with NGINX_PORT=${NGINX_PORT}"

# 运行原有的nginx初始化脚本
echo "Running nginx initialization scripts..."
for script in /docker-entrypoint.d/*.sh; do
    if [ -f "$script" ] && [ -x "$script" ]; then
        echo "Running $script"
        sh "$script" || echo "WARNING: $script failed with exit code $?"
    elif [ -f "$script" ]; then
        echo "WARNING: $script is not executable, attempting to run anyway..."
        sh "$script" || echo "WARNING: $script failed with exit code $?"
    fi
done

# 验证config.js是否已生成
if [ -f "/usr/share/nginx/html/config.js" ]; then
    echo "OK config.js generated (keys only preview):"
    # Never dump raw values — may historically have held secrets before the public filter.
    grep -E '^\s+[A-Za-z0-9_]+:' /usr/share/nginx/html/config.js | sed 's/:.*$/: "…"/' || true
else
    echo "ERROR: config.js was not generated!"
    echo "Attempting manual generation..."
    sh /docker-entrypoint.d/40-generate-config.sh || echo "Manual generation failed"
fi

echo "Starting services with supervisor..."
echo "MCP Server will run on port: ${MCP_HTTP_PORT}"
echo "MCP Server log level: ${MCP_LOG_LEVEL}"

# 启动supervisor
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
