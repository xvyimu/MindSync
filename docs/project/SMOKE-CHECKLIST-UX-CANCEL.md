# Desktop smoke checklist (fork develop)

Date: 2026-07-20  
Target: local `develop` after UX #3/#4 merges  
Binary (if installed): `D:\PromtOptimizer\app\PromptOptimizer.exe`  
Source run: Node 24 + pnpm desktop package

## Preflight
- [ ] `node -v` is v22.x (portable path if needed)
- [ ] `git checkout develop && git pull`
- [ ] Optional: `pnpm --filter @mindsync/core test` green

## UX quiet-workbench
- [ ] Open Basic System / Basic User
- [ ] Template select shows two-line cards (name + description)
- [ ] **推理增强优化** / Reasoning-Enhanced Optimization appears in optimize templates
- [ ] Start optimize → **Stop** visible; status shows optimizing copy (not raw i18n key)
- [ ] Stop ends stream promptly; no ghost tokens after stop

## Context modes
- [ ] Context User: optimize + Stop cancel works
- [ ] Context System (multi): optimize selected message; Stop swaps primary button; cancel works
- [ ] Cancel toast appears (`Generation stopped` / `已停止生成`)

## Image modes
- [ ] Text2Image / Image2Image optimize button shows **optimizing** copy while running
- [ ] MultiImage still uses its own optimizing string (no regression)

## Desktop hardening (if using hardening build)
- [ ] Custom model connect works on Windows (no false `IPC request sender is not trusted`)
- [ ] Stream cancel from UI still aborts provider work
- [ ] External link open / env config IPC still function

## Result
| Area | Pass/Fail | Notes |
|------|-----------|-------|
| Templates |  |  |
| Stop cancel basic |  |  |
| ContextUser cancel |  |  |
| ContextSystem cancel |  |  |
| Image copy |  |  |
| IPC trust |  |  |

Sign-off: ________  Date: ________
