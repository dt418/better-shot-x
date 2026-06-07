# Plugin Development Guide

> Status: v1 API — stable for Milestone 8 (Plugins & Sync).

Better Shot X supports plugins as **WebAssembly** modules. Plugins are sandboxed and may only access the host through declared capabilities.

## Quick start

A plugin is a `.wasm` file plus a `plugin.toml` manifest. Drop both into `~/.local/share/better-shot/plugins/<plugin-id>/`.

```toml
# plugin.toml
[plugin]
id = "com.example.my-plugin"
name = "My Plugin"
version = "0.1.0"
author = "Jane Doe"
license = "MIT"
description = "Adds custom export formats"
homepage = "https://example.com/my-plugin"

[capabilities]
network = ["https://api.example.com"]
filesystem = ["/tmp/my-plugin-cache"]
clipboard = true
```

## WASM contract

The host imports and exports follow the [`wasm32-wasip2`](https://github.com/WebAssembly/WASI) ABI.

### Imported functions (host → plugin)

| Symbol                      | Signature                                              | Notes                           |
| --------------------------- | ------------------------------------------------------ | ------------------------------- |
| `host_log`                  | `(level: i32, ptr: *const u8, len: usize)`             | `level`: 0=trace … 5=error      |
| `host_emit`                 | `(channel_ptr, channel_len, payload_ptr, payload_len)` | Frontend event broadcast        |
| `host_clipboard_read_text`  | `(out_ptr: *mut u8, out_len: *mut usize)`              | Requires `clipboard` capability |
| `host_clipboard_write_text` | `(ptr, len)`                                           | Requires `clipboard` capability |

### Exported functions (plugin → host)

| Symbol              | Signature                   | Notes                                     |
| ------------------- | --------------------------- | ----------------------------------------- |
| `plugin_init`       | `() -> i32`                 | Called once at load. Return 0 on success. |
| `plugin_name`       | `(out_ptr, out_len) -> i32` | UTF-8 plugin display name.                |
| `plugin_activate`   | `() -> i32`                 | Called when user enables.                 |
| `plugin_deactivate` | `() -> i32`                 | Called when user disables.                |

## Capabilities

Capabilities are an **allowlist**, not a denylist. A plugin only has access to the resources it declares in `plugin.toml`. The host enforces these at every syscall boundary.

| Capability   | Value type    | Effect                                                |
| ------------ | ------------- | ----------------------------------------------------- |
| `network`    | `Vec<String>` | Allowed URL prefixes (e.g. `https://api.example.com`) |
| `filesystem` | `Vec<String>` | Allowed absolute paths (no globs)                     |
| `clipboard`  | `bool`        | Read/write clipboard text                             |
| `shell`      | `Vec<String>` | Allowed executable basenames                          |

Anything not declared is denied.

## SDK (optional)

A Rust SDK is provided as `better-shot-plugin-sdk` (in a separate repo / crate, planned). For now, write raw WASM using your toolchain of choice.

## Versioning

Plugins declare a `better-shot-version` minimum (e.g. `"0.1.0"`). The host refuses to load plugins that require a newer host.

## Distribution

- **Manual:** drop folder into `~/.local/share/better-shot/plugins/`.
- **Marketplace:** planned for post-v1 (M10+).

## Security considerations

- Plugins run in a separate WASM instance per load.
- No shared memory with the host.
- Capability violations are logged and result in a `PermissionDenied` error returned to the plugin.
- Plugins cannot spawn subprocesses (no `wasi:process` capability exposed).

## Example minimal plugin

```rust
// plugin.rs
#[no_mangle]
pub extern "C" fn plugin_init() -> i32 { 0 }

#[no_mangle]
pub extern "C" fn plugin_name(out_ptr: *mut u8, out_len: *mut usize) -> i32 {
    let name = b"my-plugin";
    unsafe {
        std::ptr::copy_nonoverlapping(name.as_ptr(), out_ptr, name.len());
        *out_len = name.len();
    }
    0
}
```

Build with:

```bash
cargo build --target wasm32-wasip2 --release
```

See [`crates/plugins/src/lib.rs`](../../crates/plugins/src/lib.rs) for the host-side manifest types and capability enums.
