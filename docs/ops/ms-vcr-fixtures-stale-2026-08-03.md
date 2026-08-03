# VCR fixtures stale after the EN template rewrite (2026-08-03)

**状态：** 未修复 · 需要真实 API key + 产生费用 · **等人决定**

## 现象

`pnpm test:e2e:gate` 里 `optimize/basic-user.spec.ts` 单条失败，其余 13 条通过：

```
[VCR] ❌ Fixture interaction not found for test:
       optimize/basic-user.spec.ts - 优化提示词并生成优化结果
[console.error] 400 Bad Request @ https://api.deepseek.com/chat/completions
```

fixture 文件**存在**（`tests/e2e/fixtures/vcr/optimize-basic-user-spec-ts/优化提示词并生成优化结果.json`），是里面的 interaction 匹配不上。

## 根因

VCR 按 `requestHash` 匹配请求。`f0aef0b`（*feat(templates): rewrite 7 EN built-in templates to match CN 726e84c*）改写了内置英文模板正文 → 发给 provider 的 prompt 变了 → hash 变了 → 录制于旧模板的 fixture 失配。

fixture 里录的仍是旧文案：

```
[system] __system_role:User Prompt Precise Description Expert__
[user]   Please convert the following vague user prompt into precise, specific description.
```

对照 `packages/core/src/services/template/default-templates/user-optimize/user-prompt-basic_en.ts`
自 `221b767` 起 +45/−40，措辞已整体重写。

## 为什么现在才暴露

CI 自 2026-07-23 起 20 次 run 全红，但**卡在更早的 `Run repo and gate checks`**（`check-docs-current-tip` 自指导致无法满足，见该脚本注释），E2E 步骤从未真正执行。tip 门修好后 E2E 第一次跑起来，这条一直存在的失配才浮现。

**它不是 tip 门修复引入的回归**，是被它掩盖了。

## 影响范围（未逐条验证，但同因）

`f0aef0b` 改了 7 个 EN 模板：

```
iterate/iterate_en.ts
optimize/{analytical,general,output-format}-optimize_en.ts
user-optimize/user-prompt-{basic,planning,professional}_en.ts
```

用到这些模板的 fixture 都可能同样失配。gate 组只暴露了 `optimize-basic-user`；`extended` 组里的
`optimize/{basic-system,pro-multi,pro-variable}` 各有 1 个 fixture，很可能同病 —— extended 未在本次 CI 跑。

## 修法（需要人）

```powershell
pnpm test:e2e:record    # = E2E_VCR_MODE=record，走真实 provider
```

**前置：需要有效的 DeepSeek API key，且会产生实际调用费用。** 本机环境未设
`DEEPSEEK_API_KEY` / `VITE_DEEPSEEK_API_KEY` / `OPENAI_API_KEY`。

建议一次性把受影响的 optimize 系 fixture 全部重录，而不是只补 gate 那条 —— 否则 extended 组下次跑起来还会红。

录完 `git add tests/e2e/fixtures/vcr/` 提交。

## 备选（若暂不想重录）

按本目录 `e2e-groups.js` 已有的先例（单图生图/多图持久化因 provider/VCR 契约脆弱降级到 extended），
可临时把 `optimize/basic-user.spec.ts` 移出 `gate`。**但这只是让门闭嘴，不建议**：它掩盖的正是
"模板改了但录制没跟上" 这个真实契约漂移，而这恰恰是 gate 该拦的东西。

## 教训

模板/prompt 正文属于 **VCR 契约的一部分**。改内置模板要连带重录 fixture，否则 E2E 会在下一次真正跑起来时失败 —— 可能是几周以后，届时已很难关联到当初那次改动。
