import type { StateCreator } from 'zustand';
import type { EditorState, ExportFormat } from './types';
import { processImageFile, type BatchFilterType } from '@/lib/batch-processing';

// ---------------------------------------------------------------------------
// Batch processing types
// ---------------------------------------------------------------------------

export interface BatchItem {
  id: string;
  name: string;
  path: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  outputPath?: string;
  error?: string;
}

export interface BatchSlice {
  batchItems: BatchItem[];
  batchProcessing: boolean;
  batchProgress: { done: number; total: number };

  addBatchItems: (items: Omit<BatchItem, 'status'>[]) => void;
  removeBatchItem: (id: string) => void;
  clearBatchItems: () => void;
  processBatch: (options: { format: ExportFormat; filter?: BatchFilterType }) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatToExtension(format: ExportFormat): string {
  switch (format) {
    case 'jpeg': return 'jpg';
    case 'webp': return 'webp';
    case 'png': return 'png';
  }
}

// ---------------------------------------------------------------------------
// Slice implementation
// ---------------------------------------------------------------------------

export const createBatchSlice: StateCreator<EditorState, [], [], BatchSlice> = (set, get) => ({
  batchItems: [],
  batchProcessing: false,
  batchProgress: { done: 0, total: 0 },

  addBatchItems: (items) => {
    const newItems: BatchItem[] = items.map((item) => ({
      ...item,
      status: 'pending' as const,
    }));
    set((state) => ({ batchItems: [...state.batchItems, ...newItems] }));
  },

  removeBatchItem: (id) => {
    set((state) => ({
      batchItems: state.batchItems.filter((item) => item.id !== id),
    }));
  },

  clearBatchItems: () => set({ batchItems: [] }),

  processBatch: async (options) => {
    const { batchItems } = get();
    if (batchItems.length === 0) return;

    set({ batchProcessing: true, batchProgress: { done: 0, total: batchItems.length } });

    let done = 0;
    const total = batchItems.length;

    for (const item of batchItems) {
      set((state) => ({
        batchItems: state.batchItems.map((bi) =>
          bi.id === item.id ? { ...bi, status: 'processing' as const } : bi,
        ),
      }));

      try {
        if (options.filter) {
          // Apply filter to image file
          const result = await processImageFile(item.path, { filter: options.filter });

          set((state) => ({
            batchItems: state.batchItems.map((bi) =>
              bi.id === item.id
                ? {
                    ...bi,
                    status: result.success ? 'done' : 'error',
                    outputPath: result.outputPath,
                    error: result.error,
                  }
                : bi,
            ),
          }));
        } else {
          // Export-only: copy/convert file format
          const ext = formatToExtension(options.format);
          const outputPath = item.path.replace(/\.[^.]+$/, `.${ext}`);

          // For now, we record the output path — actual file I/O
          // requires Tauri FS plugin which is called from the batch dialog
          set((state) => ({
            batchItems: state.batchItems.map((bi) =>
              bi.id === item.id
                ? { ...bi, status: 'done', outputPath }
                : bi,
            ),
          }));
        }
        done++;
        set({ batchProgress: { done, total } });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.warn('Batch processing failed for item:', item.name, errorMsg);
        set((state) => ({
          batchItems: state.batchItems.map((bi) =>
            bi.id === item.id ? { ...bi, status: 'error', error: errorMsg } : bi,
          ),
        }));
        done++;
        set({ batchProgress: { done, total } });
      }
    }

    set({ batchProcessing: false });
  },
});
