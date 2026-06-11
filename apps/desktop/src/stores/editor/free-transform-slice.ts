import type { StateCreator } from 'zustand';
import type { EditorState, TransformMode } from './types';

// ---------------------------------------------------------------------------
// Free transform types
// ---------------------------------------------------------------------------



export interface FreeTransformSlice {
  transformMode: TransformMode | null;
  skewAmount: number;

  setTransformMode: (mode: TransformMode | null) => void;
  setSkewAmount: (amount: number) => void;
  applySkew: (axis: 'x' | 'y', amount: number) => void;
  resetTransform: () => void;
}

// ---------------------------------------------------------------------------
// Slice implementation
// ---------------------------------------------------------------------------

export const createFreeTransformSlice: StateCreator<EditorState, [], [], FreeTransformSlice> = (set, get) => ({
  transformMode: null,
  skewAmount: 0,

  setTransformMode: (mode) => set({ transformMode: mode }),

  setSkewAmount: (amount) => {
    set({ skewAmount: amount });
    // Apply skew in real-time to selected object
    const { canvas } = get();
    if (!canvas) return;
    const obj = canvas.getActiveObject();
    if (!obj) return;

    const currentMode = get().transformMode;
    if (currentMode === 'skewX') {
      obj.set({ skewX: amount });
    } else if (currentMode === 'skewY') {
      obj.set({ skewY: amount });
    }
    canvas.renderAll();
  },

  applySkew: (axis, amount) => {
    const { canvas } = get();
    if (!canvas) return;
    const obj = canvas.getActiveObject();
    if (!obj) return;

    if (axis === 'x') {
      obj.set({ skewX: amount });
    } else {
      obj.set({ skewY: amount });
    }
    canvas.renderAll();
  },

  resetTransform: () => {
    const { canvas } = get();
    if (!canvas) return;
    const obj = canvas.getActiveObject();
    if (!obj) return;

    obj.set({
      skewX: 0,
      skewY: 0,
      scaleX: 1,
      scaleY: 1,
      angle: 0,
    });
    canvas.renderAll();
    set({ transformMode: null, skewAmount: 0 });
  },
});
