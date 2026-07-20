#!/bin/sh
#
# Generate browser-visible runtime config for Docker/nginx.
# MUST stay aligned with packages/desktop/config/runtime-security.js:
#   - only VITE_APP_* / VITE_PUBLIC_*
#   - reject names with API_KEY|KEY|TOKEN|SECRET|PASSWORD|...
# Never inject model API keys into config.js (browser-readable).

CONFIG_FILE="/usr/share/nginx/html/config.js"

# Allow override for unit tests
if [ -n "${RUNTIME_CONFIG_OUT:-}" ]; then
  CONFIG_FILE="$RUNTIME_CONFIG_OUT"
fi

echo "========================================="
echo "Generating public runtime config..."
echo "Target: $CONFIG_FILE"
echo "========================================="

TARGET_DIR=$(dirname "$CONFIG_FILE")
if [ ! -d "$TARGET_DIR" ]; then
    echo "ERROR: target directory missing: $TARGET_DIR"
    mkdir -p "$TARGET_DIR" || {
      echo "ERROR: cannot create directory"
      exit 1
    }
fi

# Returns 0 if key is safe to expose to the browser.
is_public_runtime_key() {
  key="$1"
  case "$key" in
    VITE_APP_*|VITE_PUBLIC_*) ;;
    *) return 1 ;;
  esac

  # Sensitive segments (case-insensitive). Mirror SENSITIVE_RUNTIME_CONFIG_SEGMENT.
  upper=$(printf '%s' "$key" | tr '[:lower:]' '[:upper:]')
  case "$upper" in
    *API_KEY*) return 1 ;;
    *TOKEN*) return 1 ;;
    *SECRET*) return 1 ;;
    *PASSWORD*) return 1 ;;
    *AUTHORIZATION*) return 1 ;;
    *HEADERS*) return 1 ;;
    *CREDENTIAL*) return 1 ;;
    *COOKIE*) return 1 ;;
    *PRIVATE*) return 1 ;;
  esac
  # Standalone KEY / PASS segments: _KEY_ / _KEY end / _PASS_ / _PASS end
  case "$upper" in
    *_KEY_*|*_KEY|*_PASS_*|*_PASS) return 1 ;;
  esac
  return 0
}

CONFIG_BODY=""
COUNT=0
SKIPPED=0

echo "Scanning VITE_* environment variables (public filter)..."

for var in $(env | grep '^VITE_[A-Za-z0-9_]*=' | cut -d= -f1 | sort); do
  value=$(printenv "$var" 2>/dev/null)
  if [ -z "$value" ]; then
    continue
  fi

  if ! is_public_runtime_key "$var"; then
    SKIPPED=$((SKIPPED + 1))
    echo "Skip (not public / sensitive): $var"
    continue
  fi

  no_prefix_key=$(echo "$var" | sed 's/^VITE_//')
  escaped_value=$(printf '%s' "$value" | sed 's/\\/\\\\/g; s/"/\\"/g')

  if [ -n "$CONFIG_BODY" ]; then
    CONFIG_BODY="${CONFIG_BODY},
"
  fi
  CONFIG_BODY="${CONFIG_BODY}  ${no_prefix_key}: \"${escaped_value}\",
  ${var}: \"${escaped_value}\""

  COUNT=$((COUNT + 1))
  echo "Inject public: $var"
done

cat > "$CONFIG_FILE" << EOF
// Generated at container start. Browser-visible ONLY.
// Public keys: VITE_APP_* / VITE_PUBLIC_* without sensitive name segments.
// Model API keys must NOT appear here — configure them in the app UI or MCP env.
window.runtime_config = Object.assign({}, (window.runtime_config || {}), {
${CONFIG_BODY}
});
console.log("Runtime config loaded: ${COUNT} public VITE_* entries (sensitive keys filtered)");
EOF

echo "========================================="
echo "Wrote: $CONFIG_FILE"
echo "Injected public vars: $COUNT"
echo "Skipped non-public/sensitive: $SKIPPED"
echo "========================================="

if [ -f "$CONFIG_FILE" ]; then
    echo "OK config.js size=$(wc -c < "$CONFIG_FILE") bytes"
    echo "Preview (keys only):"
    grep -E '^\s+[A-Za-z0-9_]+:' "$CONFIG_FILE" | sed 's/:.*$/: "…"/' || true
else
    echo "ERROR: failed to write config.js"
    exit 1
fi

echo "========================================="
