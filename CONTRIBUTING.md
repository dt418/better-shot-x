# Contributing to Better Shot X

Thanks for your interest in contributing! This is a small, solo-maintained project at this stage, so the bar for getting changes in is intentionally high and focused.

## Ground rules

1. **Discuss first.** Open an issue before opening a PR for non-trivial changes. We align on direction before code.
2. **One thing at a time.** Small, focused PRs are easier to review and revert.
3. **No new dependencies without justification.** The dependency graph is curated. Adding a heavy dep needs a strong reason.
4. **Tests required.** New features and bug fixes need unit tests. UI changes need manual test notes.
5. **No `unwrap()` / `expect()` in production code.** Errors flow through `Result<T, AppError>`.

## Development setup

See [README.md](./README.md#quick-start-developer) for the system dependency list and build commands.

## Coding conventions

- **Rust:** `cargo fmt`, `cargo clippy -- -D warnings` must pass. Follow existing patterns in each crate.
- **TypeScript:** `pnpm typecheck` must pass. No `any` unless wrapped in a comment explaining why.
- **Errors:** Add a new `AppError` variant if your error doesn't fit an existing one. Don't stringly-typed throw.
- **Logging:** Use `tracing` (Rust) / structured logger (TS). No `println!` / `console.log` in production code paths.
- **i18n:** All user-facing strings go through i18n. Add keys to `src/locales/en/common.json` first, then translate.
- **Security:** All filesystem / shell access goes through the platform layer. The frontend never touches `fs` or `child_process`.

## Architecture

Read [docs/architecture/overview.md](./docs/architecture/overview.md) before proposing architectural changes.

## Plugins

See [docs/plugin-dev/README.md](./docs/plugin-dev/README.md) for the plugin API spec.

## Pull request checklist

- [ ] Linked issue or rationale
- [ ] Tests pass: `cargo test --workspace && pnpm --filter @better-shot/desktop test`
- [ ] Lint clean: `cargo clippy --workspace --all-targets -- -D warnings && pnpm lint`
- [ ] Format clean: `cargo fmt --all -- --check && pnpm format:check`
- [ ] Type check: `pnpm --filter @better-shot/desktop typecheck`
- [ ] No new warnings
- [ ] Updated `PLAN.md` if milestone scope changed
