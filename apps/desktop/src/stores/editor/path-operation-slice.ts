import type { StateCreator } from 'zustand';
import type { EditorState } from './types';
import { applyBooleanOperation } from '@/lib/path-boolean';

// ---------------------------------------------------------------------------

export type PathOperation = 'union' | 'intersect' | 'subtract';

export interface PathOperationSlice {
  applyPathOperation: (operation: PathOperation) => void;
}

// ---------------------------------------------------------------------------

export const createPathOperationSlice: StateCreator<EditorState, [], [], PathOperationSlice> = (_set, get) => ({
  applyPathOperation: (operation: PathOperation) => {
    const { canvas } = get();
    if (!canvas) return;

    applyBooleanOperation(canvas, operation);

    // Push history so boolean ops are undoable
    get().pushHistory();
  },
});
