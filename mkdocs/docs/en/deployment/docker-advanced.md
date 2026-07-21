# Docker Advanced Configuration

This page covers the advanced runtime configuration pattern for custom OpenAI-compatible models in Docker deployments.

## Extra Request Parameters for Custom Models

When a provider needs more than `apiKey`, `baseURL`, and `model`, use:

```bash
VITE_CUSTOM_API_PARAMS_<suffix>=json-object-string
```

Example:

```yaml
services:
  prompt-optimizer:
    image: linshen/prompt-optimizer:latest
    environment:
      VITE_CUSTOM_API_KEY_nvidia: nvapi-xxx
      VITE_CUSTOM_API_BASE_URL_nvidia: https://integrate.api.nvidia.com/v1
      VITE_CUSTOM_API_MODEL_nvidia: qwen/qwen3.5-397b-a17b
      VITE_CUSTOM_API_PARAMS_nvidia: '{"chat_template_kwargs":{"enable_thinking":true},"temperature":0.6,"top_p":0.95,"max_tokens":16384}'
```

## What It Supports

- standard request fields such as `temperature`, `top_p`, and `max_tokens`
- vendor-specific fields such as NVIDIA NIM's `chat_template_kwargs`
- stable runtime defaults supplied by Docker instead of manual UI input

## Constraints

- `PARAMS` must be a JSON object string
- reserved keys `model`, `messages`, and `stream` are ignored automatically
- `timeout` is allowed and can be used to override request timeout
- invalid JSON does not break the model configuration; only the extra params are ignored

## Verification

1. Start the container.
2. Pick the custom model in the UI.
3. Send a message.
4. Inspect the outgoing request body in browser DevTools.

## Non-root runtime

The image ships a fixed user **`app` (uid/gid `10001`)** and chowns writable runtime paths. By default the entrypoint may still be root so nginx can bind port **80**; the **MCP** program drops to `user=app` in supervisord.

For a fully non-root container, use a high port (do **not** map container port 80):

```bash
docker run -d \
  --user 10001:10001 \
  -e NGINX_PORT=8080 \
  -e MCP_AUTH_TOKEN=your_token \
  -e ACCESS_PASSWORD=your_password \
  -p 8081:8080 \
  --security-opt no-new-privileges:true \
  --name prompt-optimizer-nonroot \
  prompt-optimizer:local
```

- Healthcheck must use the real `NGINX_PORT` (e.g. `8080`).
- MCP remains behind nginx at `/mcp`; in-container MCP listens on `127.0.0.1:3000`.
- See `docs/user/deployment/docker-runtime-security.md` for public config filtering and auth rules.
