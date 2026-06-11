import type { FabricObject } from 'fabric';

import type { ResizeSlice, EditorState } from './types';
import type { StateCreator } from 'zustand';

export const createResizeSlice: StateCreator<EditorState, [], [], ResizeSlice> = (_set, get) => ({
  resizeCanvas: (width, height, scaleContent = true) => {
    const { canvas, pushHistory } = get();
    if (!canvas) return;

    if (scaleContent) {
      const oldWidth = canvas.getWidth();
      const oldHeight = canvas.getHeight();
      const scaleX = width / oldWidth;
      const scaleY = height / oldHeight;

      // Scale all objects proportionally
      canvas.getObjects().forEach((obj: FabricObject) => {
        obj.set({
          left: (obj.left ?? 0) * scaleX,
          top: (obj.top ?? 0) * scaleY,
          scaleX: (obj.scaleX ?? 1) * scaleX,
          scaleY: (obj.scaleY ?? 1) * scaleY,
          strokeWidth: (obj.strokeWidth ?? 0) * Math.min(scaleX, scaleY),
        });
      });
    }

    canvas.setDimensions({ width, height });
    canvas.renderAll();
    pushHistory();
  },
});
