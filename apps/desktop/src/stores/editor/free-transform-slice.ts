import type { StateCreator } from 'zustand';
import type { EditorState, FreeTransformSlice } from './types';

// ---------------------------------------------------------------------------
// Slice implementation
// ---------------------------------------------------------------------------

export const createFreeTransformSlice: StateCreator<EditorState, [], [], FreeTransformSlice> = (
  set,
  get,
) => ({
  transformMode: null,
  skewAmount: 0,
  distortAmount: 0,

  setTransformMode: (mode) => set({ transformMode: mode, skewAmount: 0, distortAmount: 0 }),

  setSkewAmount: (amount) => {
    set({ skewAmount: amount });
    const { canvas, transformMode } = get();
    if (!canvas) return;
    const obj = canvas.getActiveObject();
    if (!obj) return;

    if (transformMode === 'skewX') {
      obj.set({ skewX: amount });
    } else if (transformMode === 'skewY') {
      obj.set({ skewY: amount });
    }
    canvas.renderAll();
  },

  setDistortAmount: (amount) => {
    set({ distortAmount: amount });
    const { canvas, transformMode } = get();
    if (!canvas) return;
    const obj = canvas.getActiveObject();
    if (!obj) return;

    if (transformMode === 'distort') {
      const scaleX = 1 + amount * 0.01;
      const scaleY = 1 - amount * 0.01;
      obj.set({ scaleX, scaleY });
    } else if (transformMode === 'perspective') {
      obj.set({
        skewX: amount * 0.5,
        skewY: amount * 0.3,
        scaleX: 1 + amount * 0.005,
        scaleY: 1 - amount * 0.005,
      });
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
    set({ transformMode: null, skewAmount: 0, distortAmount: 0 });
  },
});
