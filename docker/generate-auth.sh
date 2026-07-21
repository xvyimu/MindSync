#!/bin/sh

# 检查是否设置了ACCESS_PASSWORD环境变量
if [ -n "$ACCESS_PASSWORD" ]; then
    # 检查密码是否为空字符串
    if [ "$ACCESS_PASSWORD" = "" ]; then
        echo "警告: 设置了空密码，不安全。不启用Basic认证"
        # 创建空的auth配置（禁用认证）
        cat > /etc/nginx/http.d/auth.conf << EOF
# Basic认证未启用 - 密码为空
auth_basic off;
EOF
        exit 0
    fi

    echo "启用Basic认证..."

    # 创建认证文件目录
    if ! mkdir -p /etc/nginx/auth; then
        echo "ERROR: cannot create /etc/nginx/auth (permission denied)." >&2
        exit 1
    fi

    # 确定用户名（如果未设置ACCESS_USERNAME则使用默认值"admin"）
    USERNAME=${ACCESS_USERNAME:-admin}

    # 生成htpasswd文件 - 使用printf避免特殊字符问题
    printf '%s' "$ACCESS_PASSWORD" | htpasswd -i -c /etc/nginx/auth/.htpasswd "$USERNAME"

    # 仅 nginx / 入口用户需要读认证文件；禁止 world-readable
    # 属主矩阵：
    # - 默认 root 入口 + nginx 组：root:nginx 0640
    # - 整容器 non-root (app/10001)：app:app 或 app:nginx 0640
    chmod 0750 /etc/nginx/auth
    chmod 0640 /etc/nginx/auth/.htpasswd
    if id nginx >/dev/null 2>&1 && [ "$(id -u)" = "0" ]; then
      chown -R root:nginx /etc/nginx/auth 2>/dev/null || true
    elif id app >/dev/null 2>&1; then
      # non-root entry or app-owned paths: keep readable by app (and nginx group if present)
      if id nginx >/dev/null 2>&1; then
        chown -R app:nginx /etc/nginx/auth 2>/dev/null || chown -R app:app /etc/nginx/auth 2>/dev/null || true
      else
        chown -R app:app /etc/nginx/auth 2>/dev/null || true
      fi
    fi

    # 创建启用认证的配置
    cat > /etc/nginx/http.d/auth.conf << EOF
# 此文件由generate-auth.sh脚本自动生成
auth_basic "请输入访问凭据 (Please enter your credentials)";
auth_basic_user_file /etc/nginx/auth/.htpasswd;
EOF

    echo "Basic认证已配置，用户名: $USERNAME"
else
    echo "未设置ACCESS_PASSWORD环境变量，不启用Basic认证（compose 部署请设置 ACCESS_PASSWORD）"

    # 创建空的auth配置（禁用认证）
    cat > /etc/nginx/http.d/auth.conf << EOF
# Basic认证未启用
auth_basic off;
EOF
fi
