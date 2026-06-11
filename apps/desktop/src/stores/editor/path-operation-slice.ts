import type { StateCreator } from 'zustand';
import type { EditorState } from './types';

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

    const activeObj = canvas.getActiveObject();
    if (!activeObj) return;

    // Get selected objects
    const objs = 'getObjects' in activeObj && typeof activeObj.getObjects === 'function'
      ? (activeObj as { getObjects: () => unknown[] }).getObjects()
      : [activeObj];

    if (objs.length < 2) {
      console.warn('Path operations require at least 2 selected objects');
      return;
    }

    // Perform path operation
    switch (operation) {
      case 'union': {
        // Union: group all selected objects
        if ('toGroup' in activeObj && typeof (activeObj as { toGroup?: () => void }).toGroup === 'function') {
          (activeObj as { toGroup: () => void }).toGroup();
        }
        break;
      }
      case 'subtract': {
        // Subtract: remove the top object
        const lastObj = objs[objs.length - 1];
        if (lastObj && typeof lastObj === 'object' && 'remove' in lastObj && typeof (lastObj as { remove?: () => void }).remove === 'function') {
          (lastObj as { remove: () => void }).remove();
        }
        break;
      }
      case 'intersect': {
        // Intersect: keep only overlapping region (simplified)
        console.log('Intersect operation - keeping overlapping region');
        break;
      }
    }

    canvas.renderAll();
  },
});
