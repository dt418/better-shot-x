# Changelog

All notable changes to Better Shot X will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **M2 Window Capture**: window enumeration via `grim` (Wayland) and `xdotool` (X11), per-window capture with automatic save to screenshots directory, window picker UI at `/capture`
- **M3 History**: SQLite storage with FTS5 OCR search, history commands (list/search/delete/favorite/tag), history grid UI at `/history`
- **M4 Editor**: Fabric.js v7 canvas with 10 drawing tools, Zustand feature-sliced state management (14 slices), toolbar, layers panel, keyboard shortcuts, crop/resize/export dialogs
- **Text Formatting**: bold, italic, underline, font family, font size, text alignment (left/center/right) with toolbar that appears when text tool is active; syncs from selected text objects via selection events
- **Effects**: drop shadow, glow, outline, remove shadow applied to selected objects via Fabric.js Shadow API
- **Adjustments**: brightness, contrast, saturation, hue using Fabric.js filter API (Brightness/Contrast/Saturation/HueRotation)
- **Multi-select**: align objects (6 directions: left/center/right/top/middle/bottom), group selection, delete multiple objects
- **Templates**: save/load/delete annotation layouts as named templates via localStorage; SaveTemplateDialog with name input, TemplateManagerPopover with load/delete actions and object count display
- **Smart Alignment Guides**: objects snap to canvas edges/center and other objects during drag with 6px threshold; dashed cyan guide lines appear on alignment and clean up on drag end and object:modified
- **History Metadata**: image info panel (format, dimensions, megapixels, file size, date, path), format badges on thumbnails
- **Batch Export**: batch select mode with select all/deselect all, export selected screenshots in PNG/JPEG/WebP with format conversion and progress bar
- **Batch Delete**: delete multiple selected screenshots
- **Integration Tests**: 40+ tests covering toolbar interactions, text formatting, export/resize dialogs, crop workflow, filter/effects/adjustments popovers, layers panel, keyboard shortcuts, full user workflows
- **Unit Tests**: 117 tests across 6 test files covering store slices (canvas, text, view, crop, resize, reset, effects, adjustments, multi-select, templates), toolbar component, and alignment snapping utility
- **Test Setup**: ResizeObserver mock and HTMLCanvasElement.getContext mock for jsdom environment
- Workspace scaffold: 13 Rust crates + Tauri 2 desktop app
- React + Vite + TypeScript strict frontend
- shadcn/ui + Radix UI primitives
- i18n: English, Vietnamese, Simplified Chinese
- SQLite storage with FTS5 schema
- Tauri capability allowlist (least-privilege)
- CI, release, nightly GitHub Actions workflows
- Tier 1 distro test matrix (nightly: Ubuntu 24.04/22.04/20.04, Fedora 40/39)

### Changed

- N/A

### Fixed

- N/A

### Removed

- N/A

## [0.0.0] — Initial scaffold

- Project structure, workspace manifests, documentation.
- No functional features yet (Milestone 0).
