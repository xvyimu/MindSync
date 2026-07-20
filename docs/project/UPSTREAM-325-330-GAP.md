# Gap audit: contrib/* vs upstream/develop vs fork develop (2026-07-20)

| PR (old) | Branch tip | Ahead of upstream | On fork develop? | On upstream? | Gap for resubmit |
|----------|------------|-------------------|------------------|--------------|------------------|
| #325 XSS | `2553b84` (1 commit, 5 files) | 1 | **Yes** (fix already in CategoryManager) | **No** (`v-html` still present) | **High value, tiny** — pure XSS fix + unit test |
| #326 security | `c669494` (4 commits, 11 files) | 4 | Partially (files exist; main.js evolved) | **No** (ipc/window/runtime security missing) | **High value** — needs rebase; avoid dumping whole main.js from fork |
| #327 stream cancel | `7d7eafb` (7 commits, 33 files; stacks #326) | 7 | **Yes** (stream-registry same hash as tip) | **No** | Medium-large; rebase on #326 |
| #328 electron entry | `36bd1d9` (2 commits, 15 files) | 2 | Partial (sdk-loaders same; electron.ts DIFF) | **No** | Medium; check electron.ts drift |
| #329 MCP/Docker | `aac731d` (1 commit, 14 files) | 1 | **Yes** (http-security same) | **No** | Medium; docs+auth |
| #330 IPC domain split | `e28375f` (8 commits, 49 files; stacks #327) | 8 | **Yes** (modular IPC on develop) | **No** | Largest; after 326+327 |

## Conclusions

1. **Author closed #325–#330 unmerged** — still valid contribution surface.
2. **Fork develop already absorbed most hardening** for self-use; **upstream has almost none**.
3. **XSS is the cleanest resubmit**: 1 commit, still broken upstream (`v-html` + HTML in i18n).
4. **Security (#326) is next**: modules missing on upstream; fork main.js has drifted — resubmit from `contrib/01` commits, not whole fork develop main.js.
5. **Do not reopen closed PR numbers** — open new PRs from rebased branches.

## Execution plan (B → A)

- **B now:** resubmit XSS + security as new PRs to `linshenkx/prompt-optimizer` base `develop`.
- **A after B lands or in parallel if independent:** 327 → 328/329 → 330, each rebased on previous.
