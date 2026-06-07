# Better Shot X

> A free, open-source, Snagit-tier screenshot and screen-recording tool for Linux.

**Status:** Pre-alpha (Milestone 0 — scaffold complete). See [PLAN.md](./PLAN.md) for the roadmap.

## Features (planned)

- Region / window / fullscreen / scrolling capture
- Built-in editor: annotations, arrows, blur, shapes, text, callouts
- OCR (English, Vietnamese, Chinese — Tesseract)
- Screen recording with audio (Wayland + X11)
- Self-hosted sync (folder + WebDAV, optional end-to-end encryption)
- Stable plugin API (WASM sandbox, capability-based)
- Localized: English, Vietnamese, Simplified Chinese

## Quick start (developer)

### System dependencies (Ubuntu 24.04)

```bash
sudo apt-get update && sudo apt-get install -y \
  libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev \
  librsvg2-dev libavutil-dev libavformat-dev libavcodec-dev \
  libavfilter-dev libavdevice-dev libswscale-dev libswresample-dev \
  libleptonica-dev libtesseract-dev libclang-dev clang \
  pkg-config build-essential patchelf
```

Other distros: see [scripts/install-deps.sh](./scripts/install-deps.sh).

### Build

```bash
pnpm install
cargo check --workspace
pnpm --filter @better-shot/desktop dev    # dev server + Tauri
pnpm --filter @better-shot/desktop build  # production bundle (AppImage, deb, rpm)
```

### Verify

```bash
cargo check --workspace
cargo clippy --workspace --all-targets -- -D warnings
cargo fmt --all -- --check
cargo test --workspace
pnpm install
pnpm --filter @better-shot/desktop typecheck
```

## Project layout

```
.
├── apps/
│   └── desktop/                 Tauri 2 desktop application
├── crates/
│   ├── core/                    Shared types, errors, paths, config
│   ├── platform/                Linux platform layer (Wayland/X11, portals, D-Bus)
│   ├── capture/                 Screenshot capture engine
│   ├── editor/                  Image editor (layers, commands, blend modes)
│   ├── ocr/                     Tesseract OCR wrapper
│   ├── recording/               FFmpeg-based screen recording
│   ├── clipboard/               Clipboard management
│   ├── storage/                 SQLite history database
│   ├── uploads/                 Upload providers (S3, R2, SFTP, ...)
│   ├── sync/                    Self-hosted sync (folder + WebDAV)
│   ├── plugins/                 Plugin SDK (WASM sandbox)
│   ├── settings/                TOML-backed settings
│   └── tray/                    System tray
├── docs/
│   ├── architecture/overview.md
│   └── plugin-dev/README.md
├── scripts/
│   └── install-deps.sh
├── .github/workflows/           CI, release, nightly
├── PLAN.md                      Full plan + decision log
├── Cargo.toml                   Workspace manifest
└── package.json                 Frontend workspace
```

## License

[MIT](./LICENSE)
