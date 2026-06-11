# Better Shot Linux

## Master Project Plan

Version: 2.0

Status: Planning

Project Type: Linux Native Desktop Application

Technology: Tauri 2 + Rust + React

License: MIT

Team: Solo developer

Timeline: 6–12 months for Milestone 9 (Production Release)

---

# Decisions Log

| #   | Decision           | Choice                        | Rationale                                                       |
| --- | ------------------ | ----------------------------- | --------------------------------------------------------------- |
| 1   | Team structure     | **Solo**                      | Tốc độ quyết định nhanh, ít ceremony, phù hợp passion project   |
| 2   | License            | **MIT**                       | Permissive, thân thiện cộng đồng, dễ fork                       |
| 3   | UI library         | **shadcn/ui + Radix**         | Copy-in components, không vendor lock-in, accessible by default |
| 4   | Build tool         | **Vite**                      | Tauri 2 default, HMR nhanh, đơn giản                            |
| 5   | Rust structure     | **Multi-crate workspace**     | Biên giới engine rõ ràng, parallel compile                      |
| 6   | Editor scope (v1)  | **Full editor (Snagit-tier)** | Mở rộng scope: layers, filters, color picker, advanced tools    |
| 7   | AI features (v1)   | **Không, core only**          | Tập trung capture/editor/OCR, AI là v2+                         |
| 8   | Plugin system (v1) | **Stable API**                | Thiết kế extension points từ đầu, tài liệu đầy đủ               |
| 9   | Cloud sync         | **Optional self-hosted**      | Privacy-first, user tự host (Nextcloud/Syncthing/custom)        |
| 10  | Auto-update        | **Opt-in**                    | Mặc định tắt, an toàn cho người dùng bảo thủ                    |
| 11  | Funding            | **Miễn phí, tình nguyện**     | Không doanh thu, dựa passion + sponsorship                      |
| 12  | i18n (v1)          | **EN + VI + ZH**              | 3 ngôn ngữ ngay từ đầu                                          |
| 13  | Test distros       | **All Tier 1 parallel**       | Ma trận test rộng, CI matrix                                    |
| 14  | Timeline (v1)      | **6–12 tháng**                | Realistic cho solo, có thời gian test kỹ                        |

---

# Vision

Create a Linux-native alternative to CleanShot X, Shottr, and Snagit while maintaining:

- Native Linux integrations
- Wayland support
- X11 compatibility
- Modern UX
- Open source transparency

The application must feel like a first-class desktop application rather than a wrapped web application.

---

# Product Goals

Users should be able to:

- Capture screenshots instantly
- Annotate images quickly
- Extract text via OCR
- Record screens
- Share content easily
- Work entirely offline

The application must launch quickly and remain lightweight.

---

# Supported Platforms

## Tier 1

- Ubuntu 22.04+, 24.04+
- Debian 11+, 12+
- Linux Mint 21+
- Fedora 40+, 41+
- Arch Linux (rolling)

## Tier 2

- Ubuntu 20.04 LTS
- Linux Mint 20
- openSUSE Leap
- Pop!\_OS
- Kubuntu, Xubuntu
- Manjaro
- NixOS (unstable)

---

# Linux Desktop Support

## Wayland

- GNOME 45+
- KDE Plasma 6+
- Hyprland
- Sway
- COSMIC

## X11

- XFCE, MATE, Cinnamon, LXQt
- Legacy desktops

---

# Architecture Principles

- **Linux First** — No macOS/Windows assumptions
- **Desktop First** — Desktop experience over web paradigms
- **Wayland First** — Primary: Wayland, Fallback: X11, Fallback: XDG Portals
- **Offline First** — No internet required for core features
- **Privacy First** — No telemetry, tracking, analytics, or cloud dependency
- **Open Source First** — All dependencies must be FOSS-compatible

---

# Core System Architecture

```
Desktop Application
├── Capture Engine
├── Editor Engine
├── OCR Engine
├── Recording Engine
├── Clipboard Engine
├── Storage Engine
├── Upload Engine
├── Settings Engine
├── Platform Layer
└── UI Layer
```

**Rules**:

- UI is presentation only
- Business logic lives in engines
- Engines depend on Platform Layer, not UI
- Platform Layer depends on nothing in the app

---

# Plugin System (v1 Stable API)

## Goals

- Allow third-party extensions without forking the codebase
- Maintain security and stability guarantees
- Stable API across minor versions (semver)

## Plugin Types

### Capture Plugins

- Custom capture sources (e.g., specific camera, scanner)
- Pre-capture transformations
- Custom save destinations

### Editor Plugins

- Custom tools (e.g., specific shape generator)
- Custom filters/effects (WebAssembly)
- Export format converters

### Upload Plugins

- Custom upload providers
- Pre/post-upload hooks
- URL shorteners

### UI Plugins

- Custom panels in the editor
- Custom shortcuts
- Theme contributions

## Architecture

### Runtime

- **WebAssembly** (WASM) for sandboxed execution
- **WASI** for filesystem and network access (capability-based)
- Plugins run in isolated workers, cannot access main process directly

### API Surface

```rust
// Stable Rust API (v1)
pub trait Plugin: Send + Sync {
    fn metadata() -> PluginMetadata;
    fn initialize(ctx: &mut PluginContext) -> Result<()>;
    fn shutdown(&mut self) -> Result<()>;
}

pub trait CapturePlugin: Plugin {
    fn capture(&self, request: CaptureRequest) -> Result<Capture>;
}

pub trait EditorToolPlugin: Plugin {
    fn tool_definition() -> ToolDefinition;
    fn on_event(&mut self, event: ToolEvent) -> Result<()>;
}

// ... more traits
```

### Manifest (plugin.toml)

```toml
[plugin]
id = "com.example.better-shot-plugin"
name = "Example Plugin"
version = "1.0.0"
api_version = "1"
author = "Example Author"
license = "MIT"

[capabilities]
filesystem = ["read"]
network = ["upload"]
capture = ["region"]
```

### Discovery & Loading

- Plugin directory: `~/.local/share/better-shot/plugins/`
- System plugins: `/usr/lib/better-shot/plugins/`
- Scanned at startup, validated, then loaded
- Hot-reload: opt-in via CLI flag (dev only)

### Security

- Plugins run in WASM sandbox
- Capabilities declared in manifest, enforced at runtime
- No direct memory sharing
- Resource limits: CPU, memory, execution time
- Signed plugins (optional, recommended for distribution)
- Plugin permission audit log

## Plugin SDK

- **Rust crate**: `better-shot-plugin-sdk` (stable API)
- **TypeScript bindings**: for plugins written in JS/TS
- **CLI tool**: `better-shot-plugin-cli` for scaffolding/testing
- **Template repo**: github.com/better-shot/plugin-template

## Distribution

- Plugin registry: github.com/better-shot/awesome-plugins (curated list)
- Plugins installed via Settings UI or CLI
- `better-shot plugin install <name>` CLI command

## API Stability Guarantees

- v1 API stable until v2.0 release
- Deprecations announced 3 months in advance
- Breaking changes only on major version bumps
- ABI compatibility for WASM modules

## Testing

- Plugin SDK includes test harness
- Reference plugin implementations
- Compatibility test suite

## Documentation

- Plugin Development Guide
- API reference (rustdoc + TypeDoc)
- Example plugins (5+ included)

---

# Capture Engine

## Capabilities

- Region capture
- Fullscreen capture
- Window capture
- Multi-monitor capture
- Delayed capture (timer)
- Scroll capture (long screenshot) — Phase 2

## Wayland Backend

Priority:

1. `grim` + `slurp` (native, low-latency)
2. `xdg-desktop-portal` (compatibility fallback)
3. `screenshots-rs` (unified Rust library)

## X11 Backend

Priority:

1. `screenshots-rs` (unified)
2. `maim`
3. `scrot`
4. `gnome-screenshot`

## Detection Strategy

- Probe backends at runtime
- Cache detection result in settings
- Allow manual override in settings
- Graceful degradation if all backends fail

---

# Editor Engine

**Scope (v1)**: Full editor — Snagit-tier feature parity

## Capabilities

### Core Tools (Milestone 4)

- **Selection**: Rectangle, Lasso, Magic Wand, Color Range
- **Crop & Resize**: Freeform, fixed ratios, custom dimensions
- **Drawing**: Brush, Pencil, Eraser (variable size/hardness)
- **Shapes**: Rectangle, Ellipse, Polygon, Line, Arrow, Curve
- **Text**: Rich text (font, size, color, weight, alignment, outline, shadow)
- **Effects**: Drop shadow, inner shadow, glow, outline
- **Adjustments**: Brightness, Contrast, Saturation, Hue, Curves, Levels
- **Filters**: Blur (Gaussian, box, motion), Sharpen, Pixelate, Emboss, Grayscale, Sepia
- **Color Tools**: Eyedropper, color palette, fill, stroke
- **Numbered Markers, Highlighter, Stamps, Callouts**

### Advanced Features

- **Layers**: Multi-layer support, blend modes, opacity, lock, group
- **History**: Unlimited undo/redo (configurable depth)
- **Copy/Paste**: Within editor, between sessions
- **Templates**: Save & reuse annotation layouts
- **Snapping**: To grid, edges, other objects
- **Alignment guides**: Smart guides between objects
- **Zoom**: 1%–6400%, fit-to-screen
- **Pan**: Space + drag, middle-click drag
- **Rulers & Grids**: Configurable, with units
- **Multi-selection**: Shift+click, marquee, Select All
- **Transform**: Move, scale, rotate, skew, distort, free transform
- **Path operations**: Boolean ops (union, intersect, subtract)

### Import/Export

- **Import**: PNG, JPEG, WebP, GIF, BMP, TIFF, SVG (rasterize)
- **Export**: PNG, JPEG, WebP, BMP, copy to clipboard, save as template
- **Batch operations**: Apply to multiple files (Milestone 8)

## Technical Approach

### Rendering

- **Primary**: HTML5 Canvas + OffscreenCanvas
- **Acceleration**: WebGL for filters (blur, pixelate, color adjustments)
- **WASM plugins**: User-defined effects via plugin system

### State Management

- **Zustand feature slices** for modular, type-safe state
- **Command pattern** for undo/redo (50-snapshot history)
- **CRDT-like** structure for collaborative-friendly state (future)
- **Immutable snapshots** for layer state
- **Dirty region tracking** for performance

### Performance

- Render only dirty regions
- Debounce state changes (16ms / 60fps target)
- Web Workers for heavy filters
- Memory-mapped file access for large images
- Virtualized layer panel for many layers

### Architecture

```
Editor Engine (Rust)
├── Document Model (CRDT)
├── Command System (undo/redo)
├── Render Pipeline (WebGL)
├── Filter System (WASM plugins)
├── Selection Engine
└── Plugin Adapter

UI Layer (React)
├── Toolbar
├── Canvas View
├── Layer Panel
├── Properties Inspector
├── Color Picker
└── Effects Library
```

---

# OCR Engine

## Phase 1 — Tesseract

Languages (launch):

- English
- Vietnamese
- Chinese (Simplified + Traditional)
- Japanese
- Korean

Architecture:

- Tesseract via `leptess` or `tesseract-rs` bindings
- Lazy-load language data
- Cache OCR results in SQLite

## Phase 2 — Local AI OCR

Options (evaluate):

- Tesseract LSTM improvements
- ONNX Runtime + PaddleOCR / EasyOCR (quantized)
- TrOCR (Microsoft, transformer-based)

Model storage: `~/.local/share/better-shot/models/`

## Responsibilities

- OCR extraction
- Search indexing (FTS5 in SQLite)
- Language management
- OCR history

---

# Recording Engine

## Capabilities

- Screen recording (full + region)
- Window recording
- GIF export
- Audio recording (system + mic) — Phase 2

## Backend Priority

1. `wf-recorder` (Wayland, native, low-overhead)
2. `ffmpeg` (universal, with x11grab or pipewire)
3. Native Rust recorder (custom) — Phase 3

## Codecs

- VP9 (open, high compression)
- AV1 (next-gen, hardware-accelerated)
- H.264 (compat, requires openH264)

## Audio

- PipeWire (modern Linux)
- PulseAudio (legacy)

---

# Clipboard Engine

## Capabilities

- Copy image (PNG, JPEG)
- Copy OCR text
- Copy file path
- Copy upload links

## Requirements

- Operations must complete in <50ms
- Use `arboard` for cross-DE compatibility
- Use `wl-copy`/`xclip` as fallback

## Image Format Strategy

- Default: PNG (lossless)
- Optional: JPEG (size optimization)
- Detect clipboard targets on Wayland

---

# Storage Engine

## Database

SQLite via `rusqlite` (sync) or `sqlx` (async)

Schema versioning: built-in migration system

## Tables

- `screenshots` (id, path, hash, created_at, metadata_json)
- `ocr_results` (id, screenshot_id, text, language, confidence)
- `recordings` (id, path, duration, codec, created_at)
- `uploads` (id, provider, url, expires_at, metadata)
- `settings` (key, value_json, updated_at)
- `ocr_fts` (FTS5 virtual table for OCR search)

## Storage Locations

- Database: `~/.local/share/better-shot/better-shot.db`
- Screenshots: `~/.local/share/better-shot/screenshots/`
- Recordings: `~/.local/share/better-shot/recordings/`
- Models: `~/.local/share/better-shot/models/`
- Cache: `~/.cache/better-shot/`

## Cleanup

- Configurable retention policy
- LRU eviction for cache
- Manual cleanup via Settings

---

# Upload Engine

## Supported Providers (Milestone 7)

- S3 (AWS, MinIO, Wasabi)
- Cloudflare R2
- MinIO
- SFTP
- WebDAV (Nextcloud, etc.)

## Future

- Google Drive
- Dropbox
- OneDrive

## Requirements

- Uploads must be optional
- Credentials encrypted at rest (using OS keyring via `keyring` crate)
- Support anonymous public links
- Pre-signed URLs when possible
- Multipart upload for large files

---

# Self-Hosted Sync (Optional)

## Goals

- Sync screenshot history, settings, and annotations across user's own devices
- Privacy-first: no central server, no third-party cloud
- User maintains full control of their data

## Sync Targets (v1)

### Tier 1

- **Folder-based sync** (Syncthing, Nextcloud, Dropbox, rsync)
  - User points to a local folder
  - App reads/writes within that folder
  - External sync tool handles transport

- **WebDAV** (Nextcloud, ownCloud, Apache, Nginx)
  - Standard protocol, well-supported
  - Built-in to many NAS devices

### Tier 2 (Future)

- **S3-compatible storage** as sync backend
- **Custom server protocol** (libp2p or simple HTTP+WebSocket)
- **Syncthing integration** (native, no folder setup)

## What Syncs

### Always Synced (when enabled)

- Settings (excluding local-only prefs like backend override)
- Custom themes
- Custom shortcuts

### User Choice

- Screenshot history (metadata + thumbnails)
- Full screenshot files
- OCR results
- Annotations/templates

### Never Synced (Local-Only)

- Cache files
- Log files
- Crash dumps
- Model files (too large)

## Conflict Resolution

### Strategy

- **Last-write-wins** for settings (with manual override)
- **Vector clocks** for history events
- **Three-way merge** for annotations (when possible)
- **Manual resolution** UI for unresolvable conflicts

### Storage Format

- JSON metadata with content hash
- Binary blobs in content-addressed store (CAS)
- Deduplication via SHA-256 hashes
- Tombstones for deletions (30-day retention)

## Architecture

### Sync Engine (`crates/sync/`)

- Watches local DB and sync folder for changes
- Applies remote changes idempotently
- Maintains sync state (last sync time, per-device cursors)
- Periodic background sync + on-change trigger

### Protocol (v1)

- File-based: read/write JSON + binary files in sync folder
- Compatible with any folder-sync tool
- No network code in app itself for v1

### Security

- Optional E2E encryption (age or GPG)
- Keys derived from user passphrase
- Sync target can be untrusted (e.g., cloud folder)
- File integrity verified via SHA-256

## Configuration

```toml
[sync]
enabled = true
mode = "folder"  # or "webdav"

[sync.folder]
path = "~/Nextcloud/better-shot"

[sync.webdav]
url = "https://nextcloud.example.com/remote.php/dav/files/user/better-shot"
username = "user"
# password stored in OS keyring

[sync.options]
sync_history = true
sync_full_files = true
encrypt_at_rest = true
```

## Performance

- Initial sync: incremental, resumable
- Bandwidth-efficient: delta sync, compression
- Background sync throttled
- Manual "Sync Now" button

## Limitations (v1)

- No real-time collaboration
- No multi-user editing
- No version history beyond local retention
- No selective sync UI (config file only initially)

---

# Settings Engine

## Configuration Format

**TOML** for human-editable files, JSON in DB

Rationale: TOML is human-friendly, has comments, Rust-native support via `serde` + `toml` crate.

## Settings Categories

- Capture (default mode, save location, format)
- Shortcuts (key bindings, conflict detection)
- Editor (default tools, font, colors)
- OCR (languages, model selection)
- Recording (codec, quality, audio)
- Uploads (providers, credentials, defaults)
- Privacy (telemetry off by default — hardcoded)
- Advanced (backend override, debug)

## Storage

- File: `~/.config/better-shot/config.toml`
- DB: `settings` table (overrides file)
- Validation: JSON Schema for each section

## Migration

- Versioned config schema
- Auto-migrate on schema change
- Backup before migration

---

# Logging & Error Handling

## Logging Framework

**`tracing`** + `tracing-subscriber` (Rust standard)

## Log Levels

- `error` — User-facing failures
- `warn` — Recoverable issues
- `info` — Lifecycle events (start, stop, config loaded)
- `debug` — Diagnostic detail
- `trace` — Per-operation detail

## Log Output

- File: `~/.local/share/better-shot/logs/better-shot.log` (rotated, max 10MB × 5)
- Console (dev only)
- Structured JSON for production

## Error Handling Strategy

- **All public APIs return `Result<T, AppError>`**
- `AppError` is a single enum with `thiserror`
- All variants include user-facing message + technical detail
- Errors are logged with full context, shown to user as actionable messages
- No `unwrap()` or `expect()` in production code
- Use `anyhow` only at app boundary (main.rs, Tauri commands)

## Crash Reporting

- Optional opt-in (off by default)
- Local crash dumps only — never auto-upload

---

# Platform Layer

## Responsibilities

- Wayland integration
- X11 integration
- File system access
- Native dialogs
- Notifications
- Global shortcuts
- Tray integration
- Power management (inhibit during recording)

## Rules

- UI never talks directly to Linux APIs
- All platform access goes through Platform Layer
- Platform Layer uses feature flags for conditional compilation
- No business logic in Platform Layer

---

# Global Shortcuts

## Defaults

- `Ctrl+Shift+1` — Region Capture
- `Ctrl+Shift+2` — Fullscreen Capture
- `Ctrl+Shift+3` — Window Capture
- `Ctrl+Shift+4` — Record Region
- `Ctrl+Shift+S` — Quick Search History
- `PrintScreen` — Last used capture mode
- `Esc` — Cancel current capture

## Conflict Detection

- Detect conflicts with DE shortcuts (GNOME, KDE, etc.)
- Warn user on conflict
- Allow override with confirmation
- Test mode: log shortcut events to verify binding

## Implementation

- Use `tauri-plugin-global-shortcut` (Tauri 2 official plugin; covers Wayland + X11)
- Allow per-DE overrides

---

# System Tray

## Required Capabilities

- Quick Capture (region)
- Recent Screenshots (last 5)
- Start Recording
- Settings
- Quit

## Implementation

- Use the `tray-icon` API (built into Tauri 2 core via the `tray-icon` feature — `tauri-plugin-tray` does not exist on crates.io)
- StatusNotifierItem spec on Linux
- Fallback to XEmbed systray if needed

---

# UI Layer (React)

## Component Library

**shadcn/ui** + Radix UI primitives (recommendation)

Rationale: Copy-in components, no vendor lock-in, accessible by default, Tailwind-based, modern.

## State Management

- **Server state**: TanStack Query (for sync operations)
- **Client state**: Zustand (for editor, capture state)
- **Form state**: react-hook-form + Zod

## Architecture Rules

- **No business logic in components**
- **No filesystem access from React**
- **No shell command execution from React**
- All side effects go through Tauri commands (typed)
- Use `tauri-specta` for type-safe command bindings

## Accessibility (a11y)

- WCAG 2.1 AA compliance target
- Full keyboard navigation
- Screen reader support (Orca, etc.)
- Focus management on modals
- High contrast theme support
- Reduced motion respect (`prefers-reduced-motion`)

## Internationalization (i18n)

- **i18next** + `react-i18next`
- All user-facing strings in locale files
- Launch locales: `en`, `vi`, `zh-CN`
- Phase 2: `ja`, `ko`, `de`, `fr`, `es`
- RTL support: Phase 3

## Theming

- Light, Dark, System (default)
- CSS variables for tokens
- User customizable accent color

---

# Performance Targets

| Metric             | Target |
| ------------------ | ------ |
| Application Launch | <2s    |
| Region Capture     | <100ms |
| Clipboard Copy     | <50ms  |
| OCR Startup        | <500ms |
| History Search     | <100ms |
| Memory (idle)      | <300MB |
| Memory (recording) | <500MB |
| Editor Open        | <200ms |
| AppImage Size      | <80MB  |

## Performance Budget

- Bundle size warnings at 100MB
- Per-route bundle <500KB
- No blocking main thread >50ms

---

# Security Model

## Threat Model

Protected against:

- Path traversal (all file ops validated against allowed roots)
- Command injection (no shell exec, all commands parameterized)
- Credential leakage (OS keyring, no plaintext)
- Upload token exposure (short-lived pre-signed URLs)
- Clipboard leakage (clipboard manager detection, warn user)
- Unsigned binary execution (no binary downloads)
- Malicious config files (TOML parse with size limit, no eval)

## Sandboxing

- **AppArmor profile** (mandatory for Flatpak, recommended for others)
- Tauri capability system (explicit permissions per command)
- Webview isolation for untrusted content
- File access restricted to user-selected paths + app data dir

## Hardening

- No network access for core features (uploads are explicit)
- All uploads require user confirmation
- HTTPS-only for upload providers
- Certificate validation via system trust store
- Auto-update verifies signatures (Sigstore/cosign)

## Audit Checklist

- Dependency scan in CI (cargo audit, npm audit)
- No telemetry of any kind (verifiable via network capture)
- Privacy policy: "zero data leaves your machine unless you explicitly upload"

---

# Repository Structure

```
better-shot/
├── apps/
│   └── desktop/                    # Tauri app entrypoint
├── crates/
│   ├── capture/                    # Capture engine
│   ├── editor/                     # Editor engine (full Snagit-tier)
│   ├── ocr/                        # OCR engine
│   ├── recording/                  # Recording engine
│   ├── clipboard/                  # Clipboard engine
│   ├── storage/                    # SQLite + file storage
│   ├── uploads/                    # Upload providers
│   ├── sync/                       # Self-hosted sync engine
│   ├── plugins/                    # Plugin system + SDK
│   ├── settings/                   # Config + preferences
│   ├── platform/                   # Linux platform layer
│   ├── tray/                       # System tray
│   ├── core/                       # Shared types, errors
│   └── ui/                         # React UI
├── plugins/                        # Bundled reference plugins
│   ├── plugin-template/            # Scaffolding template
│   └── plugin-ocr-translate/       # Example: OCR → translate
├── docs/
│   ├── architecture/
│   ├── api/
│   ├── plugin-dev/                 # Plugin development guide
│   ├── packaging/
│   └── contributing/
├── locales/                        # i18n source files
│   ├── en/
│   ├── vi/
│   └── zh-CN/
├── skills/                         # AI agent skills
├── ai/                             # AI integration code (future)
├── .github/
│   └── workflows/                  # CI/CD
├── Cargo.toml                      # Workspace
├── package.json                    # UI deps
└── README.md
```

---

# Development Standards

## Rust

- No `unwrap()` or `expect()` in production
- Use `Result<T, E>` for all fallible operations
- `thiserror` for error types, `anyhow` only at app boundary
- `clippy::pedantic` enabled, denied lints documented
- `rustfmt` enforced (max_width = 100)
- All public APIs documented (rustdoc)
- `tracing` for logging (not `println!` or `eprintln!`)

## TypeScript / React

- TypeScript strict mode
- No `any` (use `unknown` + narrowing)
- No business logic in components
- No filesystem or shell access from React
- All side effects via typed Tauri commands
- ESLint + Prettier enforced
- Component tests with Vitest + Testing Library

## Architecture

- Prefer composition over inheritance
- Follow engine boundaries strictly
- Dependency direction: UI → Engines → Platform → Core
- No circular dependencies (enforced by `cargo-deny` + workspace layout)

---

# Testing Strategy

## Coverage Targets

- Rust unit tests: 80% line coverage minimum
- TypeScript: 80% line coverage minimum
- E2E: All critical user flows

## Test Pyramid

```
        E2E (Playwright)
      ┌──────────────┐
    Integration (Vitest + cargo test)
   ┌────────────────────┐
  Unit (cargo test, Vitest)
 ┌──────────────────────────┐
```

## Test Categories

### Rust

- Unit tests per module (`#[cfg(test)]`)
- Integration tests in `crates/*/tests/`
- Snapshot tests for serialization
- Property tests with `proptest` (configs, parsers)

### TypeScript

- Component tests (Vitest + Testing Library)
- Hook tests
- Store tests (Zustand)
- Type tests (tsd)

### E2E

- Playwright for full user flows
- WebdriverIO for native Tauri tests (Phase 2)
- Visual regression tests (Percy/Playwright screenshots)

## CI Requirements

- All tests pass
- Coverage ≥80% (block merge if below)
- No new lints
- Format check passes
- Audit clean

---

# CI/CD Pipeline

## Platform: GitHub Actions (primary)

### Workflows

**`ci.yml`** — On PR and push to main:

- Format check (`cargo fmt --check`, `prettier --check`)
- Lint (`cargo clippy`, `eslint`)
- Type check (`tsc --noEmit`, `cargo check`)
- Test (unit + integration)
- Coverage report
- Security audit (`cargo audit`, `npm audit`)
- Build smoke test

**`release.yml`** — On tag push:

- Build AppImage
- Build .deb (Debian, Ubuntu)
- Build .rpm (Fedora, openSUSE)
- Build Flatpak
- Generate checksums
- Sign binaries (Sigstore cosign)
- Publish to GitHub Releases
- Update AUR package
- Generate changelog

**`nightly.yml`** — Nightly:

- Run full E2E suite on multiple distros
- Update dependency lockfile
- Report flaky tests

## Caching

- Cargo registry + target dir
- npm cache
- Playwright browsers
- Tauri build artifacts

---

# Release Targets

## Tier 1 (Launch)

- **AppImage** — Universal Linux binary
- **.deb** — Debian, Ubuntu, derivatives
- **.rpm** — Fedora, openSUSE, RHEL

## Tier 2 (Milestone 8+)

- **Flatpak** — Flathub distribution (broader reach)
- **AUR** — Arch Linux

## Tier 3 (Future)

- **Nix flake** — NixOS
- **Snap** — Optional (sandboxed but heavy)

## Auto-Update

- Tauri updater plugin
- Updates checked on launch (opt-out)
- Differential updates for AppImage
- Flatpak updates via Flathub
- Signature verification mandatory

---

# Milestones

## Milestone 1 — Core Capture

**Deliverables**:

- Tauri 2 + Rust + React scaffold
- Configuration system (TOML)
- Logging infrastructure (`tracing`)
- Settings UI (basic)
- Region capture (Wayland + X11)
- Fullscreen capture
- Clipboard copy
- Global shortcuts
- System tray

**Exit Criteria**:

- Captures work on GNOME Wayland, KDE Wayland, XFCE X11
- <100ms capture latency
- All tests pass, coverage ≥80%

## Milestone 2 — Window Capture

**Deliverables**:

- Window detection
- Multi-monitor support
- Per-monitor DPI handling
- Window picker UI

## Milestone 3 — History

**Deliverables**:

- [x] SQLite storage
- [x] Screenshot history (grid view with thumbnails)
- [x] Search (FTS5 on OCR text)
- [x] Metadata (format, dimensions, megapixels, file size, date, path)
- [x] Favorites + tags
- [x] Export / delete actions
- [x] Image info panel (detailed metadata view)
- [x] Batch selection mode (select all/deselect all)
- [x] Batch export (PNG/JPEG/WebP format conversion + progress)
- [x] Batch delete
- [x] Format badges on thumbnails

## Milestone 4 — Editor (Full Snagit-tier)

**Phase 4a — Core Tools**:

- [x] Crop, Resize (with aspect ratio lock + content scaling)
- [ ] Selection (rect, lasso, magic wand)
- [x] Drawing (brush, pencil, freehand)
- [x] Shapes (rectangle, ellipse, line, arrow)
- [x] Text (font family, size, bold, italic, underline, alignment)
- [x] Effects (drop shadow, glow, outline)
- [x] Filters (blur, sharpen, grayscale, sepia, pixelate)
- [x] Color tools (fill, stroke swatches)
- [x] Highlighter, marker tools
- [x] Undo/redo (50-snapshot history)
- [x] Layers (visibility, opacity, reorder, delete)
- [x] Zoom (mouse-wheel zoom, space+drag pan)
- [x] Alignment guides between objects (smart snap to edges + center)
- [x] Import (PNG, JPEG, WebP, GIF, BMP via file dialog)
- [x] Export (PNG, JPEG, WebP via export dialog)

**Phase 4a — Completed (this session)**:

- Fabric.js v7 canvas component with 10 drawing tools
- Zustand feature-sliced state management (14 slices)
- Toolbar with tool buttons, colors, stroke width, undo/redo, zoom
- Text formatting toolbar (bold/italic/underline/alignment/font family/size)
- Crop tool with overlay + confirmation
- Resize dialog with aspect ratio lock + proportional scaling
- Filter popover (5 filters)
- Export dialog with format selection (PNG/JPEG/WebP)
- Layers panel with visibility, opacity, reorder, delete
- Keyboard shortcuts (V/R/O/L/A/T/P/C/H/M, Ctrl+Z/Y/S, Ctrl+A, Delete)
- Status bar with canvas dimensions + filename
- Ctrl+S save, Escape cancel crop
- Effects: drop shadow, glow, outline on selected objects
- Adjustments: brightness, contrast, saturation, hue via Fabric.js filters
- Multi-select: align (6 directions), group, delete multiple objects
- Templates: save/load/delete annotation layouts via localStorage
- Smart alignment guides: snap to canvas edges/center + other objects during drag
- Integration tests: 40+ tests covering toolbar, dialogs, popovers, layers, workflows
- Unit tests: 117 tests across 6 test files (store slices, toolbar, templates, snapping)

**Phase 4b — Advanced**:

- [x] Adjustments (brightness, contrast, saturation, hue)
- [ ] Path operations (boolean: union, intersect, subtract)
- [ ] Free transform (skew, distort, perspective)
- [x] Templates (save & reuse annotation layouts)
- [x] Multi-select + bulk operations (align, group, delete)
- [ ] Batch processing (apply to multiple files)

**Exit Criteria**:

- Feature parity with Snagit for static image annotation
- 60fps editing for images up to 8K
- Plugin SDK supports editor extensions

## Milestone 5 — OCR

**Deliverables**:

- Tesseract integration (5 languages)
- OCR search in history
- Language manager UI
- Copy OCR text action

## Milestone 6 — Recording

**Deliverables**:

- Screen recording (region + full)
- wf-recorder + ffmpeg backends
- Audio recording (PipeWire)
- GIF export
- Recording controls (pause, resume, stop)

## Milestone 7 — Uploads

**Deliverables**:

- S3 / R2 / MinIO support
- SFTP, WebDAV support
- Encrypted credential storage
- Pre-signed URL handling
- Upload history

## Milestone 8 — Plugins & Sync

**Phase 8a — Plugin System (stable v1 API)**:

- `better-shot-plugin-sdk` Rust crate
- TypeScript bindings
- WASM runtime with capability sandbox
- Plugin manifest + signing
- 3+ reference plugins (e.g., watermark, blur-region, translate)
- Plugin installer UI + CLI
- Plugin documentation site

**Phase 8b — Self-Hosted Sync**:

- Folder-based sync (Syncthing/Nextcloud/Dropbox compatible)
- WebDAV target support
- Sync engine (delta, conflict resolution)
- Optional E2E encryption
- Settings sync
- History metadata + thumbnail sync
- Manual conflict resolution UI

**Exit Criteria**:

- At least 3 third-party plugins published (community)
- Sync works between 2 test devices
- Plugin API documented with rustdoc + guide

## Milestone 9 — Production Release

**Deliverables**:

- All Tier 1 packages (AppImage, .deb, .rpm)
- Auto-update infrastructure (opt-in)
- Sigstore signing
- Documentation site
- AUR package
- Flatpak submission
- Privacy audit (external)
- Performance benchmarks met on all Tier 1 distros
- Localization (en, vi, zh-CN)
- CI matrix: all Tier 1 distros tested in parallel
- Marketing site + screenshots
- Launch announcement

## Milestone 10+ — Future

- Local AI OCR
- Smart editor features (background removal, smart cleanup)
- More cloud providers (Google Drive, Dropbox, OneDrive)
- Mobile companion app (Android)
- Real-time collaboration
- Plugin marketplace
- More locales (ja, ko, de, fr, es)
- Theme marketplace

---

# Definition of Done

A feature is complete only when:

1. **Implemented** — Code merged to main
2. **Tested** — Unit + integration tests, ≥80% coverage
3. **Reviewed** — At least one code review approval
4. **Documented** — Public APIs documented, user docs updated
5. **Benchmarked** — Performance targets verified
6. **Localized** — All user-facing strings in en + vi
7. **Accessible** — Keyboard + screen reader tested
8. **Released** — Included in next release notes

All conditions are mandatory.

---

# Risk Register

| Risk                                     | Likelihood | Impact | Mitigation                              |
| ---------------------------------------- | ---------- | ------ | --------------------------------------- |
| Wayland security restrictions vary by DE | High       | High   | Use XDG portals as universal fallback   |
| Tauri 2 breaking changes                 | Medium     | Medium | Pin versions, track releases            |
| OCR performance on low-end hardware      | Medium     | Medium | Allow model selection, GPU opt-in       |
| Distribution fragmentation               | High       | Medium | AppImage + Flatpak as universal options |
| Clipboard manager interference           | Medium     | Low    | Detect + warn, allow disable            |
| Multi-monitor DPI mismatch               | Medium     | Medium | Per-monitor DPI handling from M2        |
| Privacy-sensitive users                  | Low        | High   | Public audit, no telemetry verifiable   |

---

# Resolved Decisions

All major product decisions are tracked in the **Decisions Log** at the top of this document. New questions that arise during implementation should be added there.

---

# Long-Term Vision

- Become the default screenshot application for Linux
- Provide a CleanShot-quality experience
- Remain fully open source
- Remain Linux native
- Remain privacy focused
- Foster a community of contributors and packagers

---

# References

- Tauri 2 docs
- Wayland screen capture protocols
- XDG Desktop Portals specification
- CleanShot X (macOS) — UX reference
- Shottr (macOS) — UX reference
- Flathub submission guidelines
