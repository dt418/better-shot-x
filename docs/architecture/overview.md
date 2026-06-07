# Better Shot X — Architecture Overview

> Status: Milestone 0 (scaffold). This document evolves with the codebase.

## High-level shape

```
+---------------------+        +-------------------+
|   React + Vite UI   |  IPC   |   Tauri 2 shell   |
| (TypeScript strict) | <----> | (apps/desktop)    |
+---------------------+   ^    +---------+---------+
                          |              |
            tauri::command|              | Rust crates (workspace)
                          v              v
                  +--------------------------------+
                  |  core  platform  capture  ... |
                  |  editor ocr recording          |
                  |  clipboard storage uploads     |
                  |  sync plugins settings tray    |
                  +----------------+-----------------+
                                   |
                          +--------v--------+
                          | System services |
                          | Wayland/X11     |
                          | xdg-desktop-    |
                          |  portal / D-Bus |
                          | Tesseract       |
                          | FFmpeg          |
                          +-----------------+
```

## Crate responsibilities

| Crate       | Purpose                                                                            |
| ----------- | ---------------------------------------------------------------------------------- |
| `core`      | Shared types (`Rect`, `ImageFormat`, `Id`), `AppError`, `AppPaths`                 |
| `platform`  | Linux-only abstraction: backend detection, portals, D-Bus, notifications           |
| `capture`   | Screenshot capture (region / fullscreen / window) via screenshots-rs or grim+slurp |
| `editor`    | Document / layer / command / blend-mode model (serializable, undoable)             |
| `ocr`       | Tesseract wrapper (language packs, image → text)                                   |
| `recording` | Screen recording (FFmpeg, codec selection, audio mixing)                           |
| `clipboard` | Cross-DE clipboard access (wl-copy / xclip / xsel)                                 |
| `storage`   | SQLite history database + on-disk file layout (FTS5 search)                        |
| `uploads`   | Pluggable upload providers (S3, R2, SFTP, custom)                                  |
| `sync`      | Self-hosted sync: local folder + WebDAV, optional E2E encryption (age)             |
| `plugins`   | Plugin SDK: manifest, capabilities, WASM sandbox host                              |
| `settings`  | TOML-backed user settings with merge / defaults                                    |
| `tray`      | System tray icon + menu                                                            |

## Frontend ↔ backend boundary

The frontend **never** touches:

- the filesystem directly (no `fs.readFile` etc.)
- the shell directly (no `child_process.spawn` etc.)
- native dialogs (uses `tauri-plugin-dialog`)

Every privileged operation is a `#[tauri::command]` in `apps/desktop/src-tauri/src/commands/`. The Tauri capability system enforces a least-privilege allowlist (see `apps/desktop/src-tauri/capabilities/default.json`).

**Type-safe bindings:** `tauri-specta` is declared as a dependency in the desktop crate's `Cargo.toml` and the chosen versions are pinned (`tauri-specta = "=2.0.0-rc.25"`, `specta = "=2.0.0-rc.25"`). The `collect_commands!` / `generate_bindings!` macros are **planned for Milestone 1** — at scaffold time, the command handler list is hand-written in `lib.rs::run()` and the TypeScript side consumes `@tauri-apps/api` directly.

## Error model

- Engines return `Result<T, better_shot_core::AppError>`.
- `AppError` is `thiserror`-derived, with `From` impls for `std::io::Error`, `serde_json::Error`, `rusqlite::Error`, `image::ImageError`, `anyhow::Error`.
- At the Tauri command boundary, errors are flattened to `String` (`CmdResult<T> = Result<T, String>`).
- Frontend wraps Tauri calls and converts to typed `Result<T, AppError>` in TypeScript.

## Logging

`tracing` + `tracing-subscriber` everywhere. `apps/desktop/src-tauri/src/lib.rs::init_logging` sets up a daily-rolling file appender under `paths.log_dir()` plus an `EnvFilter` (default `info,better_shot=debug`).

## Concurrency

- Tauri commands are `async` where the underlying work is.
- Shared state lives in `apps/desktop/src-tauri/src/state.rs` behind `parking_lot::Mutex` / `RwLock`.
- Heavy IO is spawned onto the Tokio runtime.

## Persistence

- **Settings:** `<data_dir>/config/config.toml` (TOML). On Linux this resolves to `~/.local/share/Better Shot/config/config.toml` via `directories::ProjectDirs`.
- **Storage DB:** `<data_dir>/better-shot.db` (SQLite with FTS5).
- **Captures:** `<data_dir>/screenshots/`.
- **Recordings:** `<data_dir>/recordings/`.
- **Logs:** `<data_dir>/logs/` (rotated daily, JSON + stderr).
- **Plugins:** `<data_dir>/plugins/`.
- **Sync working dir:** `<data_dir>/sync/`.

`<data_dir>` is computed by `crates/core/src/paths.rs::AppPaths` and follows the XDG Base Directory spec on Linux. The same struct has an `at(base)` constructor for tests.

## Security posture

- Tauri 2 capability allowlist (no global `core:default` for `fs:default`).
- Strict CSP locked to `self` + `ipc:` + `asset:`.
- All bundles signed (Tauri updater) and verifiable with `cosign` (see release workflow).
- Plugin host isolates untrusted code in WASM with a capability-based syscall filter.

## Plugin model (v1)

See [docs/plugin-dev/README.md](../plugin-dev/README.md).

## Sync model (v1)

- Targets: local folder, WebDAV (Nextcloud, etc.).
- Optional end-to-end encryption with [`age`](https://age-encryption.org/).
- No central server. No telemetry. No analytics.

## Testing strategy

- **Unit tests:** in-crate `#[cfg(test)]` modules, `cargo test --workspace`.
- **Integration tests:** in `crates/<name>/tests/`.
- **E2E:** Playwright drives the bundled app (planned for M3+).
- **Distro matrix:** nightly workflow covers Ubuntu 24.04/22.04/20.04, Fedora 40/39.

## Milestones

See [PLAN.md](../../PLAN.md).
