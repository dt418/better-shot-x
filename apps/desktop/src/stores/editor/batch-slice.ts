import type { StateCreator } from 'zustand';
import type { EditorState } from './types';
import type { ExportFormat } from './types';

// ---------------------------------------------------------------------------
// Batch processing types
// ---------------------------------------------------------------------------

export interface BatchItem {
  id: string;
  name: string;
  path: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  outputPath?: string;
}

export interface BatchSlice {
  batchItems: BatchItem[];
  batchProcessing: boolean;
  batchProgress: { done: number; total: number };

  addBatchItems: (items: Omit<BatchItem, 'status'>[]) => void;
  removeBatchItem: (id: string) => void;
  clearBatchItems: () => void;
  processBatch: (operation: 'export', options: { format: ExportFormat }) => Promise<void>;
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

  processBatch: async (operation, options) => {
    const { batchItems } = get();
    if (batchItems.length === 0) return;

    set({ batchProcessing: true, batchProgress: { done: 0, total: batchItems.length } });

    let done = 0;
    const total = batchItems.length;

    for (const item of batchItems) {
      // Mark as processing
      set((state) => ({
        batchItems: state.batchItems.map((bi) =>
          bi.id === item.id ? { ...bi, status: 'processing' as const } : bi,
        ),
      }));

      try {
        if (operation === 'export') {
          // In a real implementation, this would load each image and apply the operation
          // For now, we simulate the batch export
          const outputPath = item.path.replace(/\.[^.]+$/, `.${options.format === 'jpeg' ? 'jpg' : options.format}`);

          // Simulate processing delay
          await new Promise((resolve) => setTimeout(resolve, 100));

          set((state) => ({
            batchItems: state.batchItems.map((bi) =>
              bi.id === item.id ? { ...bi, status: 'done' as const, outputPath } : bi,
            ),
          }));
        }
        done++;
        set({ batchProgress: { done, total } });
      } catch (err) {
        console.warn('Batch processing failed for item:', item.name, err);
        set((state) => ({
          batchItems: state.batchItems.map((bi) =>
            bi.id === item.id ? { ...bi, status: 'error' as const } : bi,
          ),
        }));
        done++;
        set({ batchProgress: { done, total } });
      }
    }

    set({ batchProcessing: false });
  },
});
