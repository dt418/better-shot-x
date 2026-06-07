import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';

import { useSettingsStore, type AppConfig } from '@/stores/settings';

/** Tauri command name registered in `apps/desktop/src-tauri/src/lib.rs::build_specta`. */
const CMD_GET = 'getSettings';
const CMD_UPDATE = 'updateSettings';

const queryKey = ['settings'] as const;

/**
 * Live read of the application config. The query is keyed on
 * `['settings']`; the mutation below invalidates it on success so
 * the next render sees the authoritative backend state.
 */
export function useSettings() {
  return useQuery({
    queryKey,
    queryFn: async (): Promise<AppConfig> => {
      return invoke<AppConfig>(CMD_GET);
    },
    staleTime: 30_000,
  });
}

/**
 * Save the full next config. The backend (`update_settings`)
 * performs the canonical merge; the frontend treats the input as
 * the desired post-save state.
 *
 * On success: the store is updated, the query cache is replaced,
 * and the dirty flag is cleared. On error: the store keeps the
 * dirty state so the UI can show a toast and let the user retry.
 */
export function useUpdateSettings() {
  const queryClient = useQueryClient();
  const setConfig = useSettingsStore((s) => s.setConfig);
  const markClean = useSettingsStore((s) => s.markClean);

  return useMutation({
    mutationFn: async (next: AppConfig): Promise<void> => {
      await invoke<void>(CMD_UPDATE, { patch: next });
    },
    onSuccess: async () => {
      const fresh = await queryClient.fetchQuery({
        queryKey,
        queryFn: async () => invoke<AppConfig>(CMD_GET),
      });
      setConfig(fresh);
      markClean();
    },
  });
}
