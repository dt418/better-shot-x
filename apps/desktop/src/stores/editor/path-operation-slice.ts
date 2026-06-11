import type { StateCreator } from 'zustand';
import type { EditorState } from './types';
import { applyBooleanOperation } from '@/lib/path-boolean';

// ---------------------------------------------------------------------------
// Path operation types
// ---------------------------------------------------------------------------

export type PathOperation = 'union' | 'intersect' | 'subtract';

export interface PathOperationSlice {
  applyPathOperation: (operation: PathOperation) => void;
}

// ---------------------------------------------------------------------------
// Slice implementation
// ---------------------------------------------------------------------------

export const createPathOperationSlice: StateCreator<EditorState, [], [], PathOperationSlice> = (_set, get) => ({
  applyPathOperation: (operation: PathOperation) => {
    const { canvas } = get();
    if (!canvas) return;

    applyBooleanOperation(canvas, operation);
  },
});
