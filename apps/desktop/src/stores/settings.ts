import { create } from 'zustand';

/**
 * Mirror of the Rust `AppConfig` struct in `crates/core/src/config.rs`.
 *
 * Kept in lockstep manually — no codegen. If you add a field to
 * `AppConfig`, add it here too. The Tauri command `getSettings`
 * returns this shape; the `updateSettings` command takes a full
 * `AppConfig` as the `patch` argument (the backend performs the
 * actual merge via `better_shot_settings::merge`).
 */
export type Theme = 'light' | 'dark' | 'system';

export type ImageFormat = 'png' | 'jpeg' | 'webp' | 'gif' | 'bmp';

export interface AppConfig {
  /** Internal schema version — surfaced for diagnostics, not editable. */
  schemaVersion: number;
  /** UI locale code (e.g. `"en"`, `"vi"`, `"zh-CN"`). */
  locale: string;
  theme: Theme;
  /** `null` means "use the platform default" (`AppPaths::screenshots_dir`). */
  defaultSaveDir: string | null;
  defaultFormat: ImageFormat;
  trayEnabled: boolean;
  autoStart: boolean;
}

export const DEFAULT_APP_CONFIG: AppConfig = {
  schemaVersion: 1,
  locale: 'en',
  theme: 'system',
  defaultSaveDir: null,
  defaultFormat: 'png',
  trayEnabled: true,
  autoStart: false,
};

interface SettingsState {
  config: AppConfig | null;
  isDirty: boolean;
  setConfig: (next: AppConfig) => void;
  /** Apply a partial patch to the current config; marks state dirty. */
  patch: (patch: Partial<AppConfig>) => void;
  reset: (config?: AppConfig) => void;
  markClean: () => void;
}

/**
 * Optimistic-write cache for the settings page.
 *
 * The authoritative state lives in the backend (TOML on disk). The
 * React Query hook drives the fetch / save round-trip; this store
 * is the in-flight buffer that keeps the form responsive while
 * `updateSettings` is in flight.
 */
export const useSettingsStore = create<SettingsState>((set) => ({
  config: null,
  isDirty: false,
  setConfig: (next) => set({ config: next, isDirty: false }),
  patch: (patch) =>
    set((state) =>
      state.config === null
        ? state
        : { config: { ...state.config, ...patch }, isDirty: true },
    ),
  reset: (config) =>
    set({ config: config ?? null, isDirty: config ? false : false }),
  markClean: () => set({ isDirty: false }),
}));
