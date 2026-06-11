import { PencilBrush, type Canvas as FabricCanvas, type FabricObject } from 'fabric';

import { hexToRgba } from '@/lib/utils';
import type { CanvasSlice, EditorState } from './types';
import type { StateCreator } from 'zustand';

export const createCanvasSlice: StateCreator<EditorState, [], [], CanvasSlice> = (set, get) => ({
  canvas: null,
  activeTool: 'select',
  fillColor: '#e74c3c',
  strokeColor: '#2c3e50',
  strokeWidth: 2,

  setCanvas: (canvas: FabricCanvas) => set({ canvas }),

  setActiveTool: (tool) => {
    const { canvas, strokeColor, strokeWidth } = get();
    if (canvas) {
      const isDrawingTool = tool === 'freehand' || tool === 'highlighter' || tool === 'marker';
      canvas.isDrawingMode = isDrawingTool;

      if (isDrawingTool) {
        const brush = new PencilBrush(canvas);
        if (tool === 'highlighter') {
          brush.color = hexToRgba(strokeColor, 0.4);
          brush.width = Math.max(strokeWidth * 3, 12);
        } else if (tool === 'marker') {
          brush.color = strokeColor;
          brush.width = Math.max(strokeWidth * 2, 6);
        } else {
          brush.color = strokeColor;
          brush.width = strokeWidth;
        }
        canvas.freeDrawingBrush = brush;
      }

      canvas.selection = tool === 'select';
      canvas.forEachObject((obj: FabricObject) => {
        obj.selectable = tool === 'select';
        obj.evented = tool === 'select';
      });

      canvas.discardActiveObject();
      canvas.renderAll();
    }
    set({ activeTool: tool, cropRegion: null, cropPending: false });
  },

  setFillColor: (color) => set({ fillColor: color }),

  setStrokeColor: (color) => {
    const { canvas } = get();
    if (canvas?.freeDrawingBrush) {
      canvas.freeDrawingBrush.color = color;
    }
    set({ strokeColor: color });
  },

  setStrokeWidth: (width) => {
    const { canvas } = get();
    if (canvas?.freeDrawingBrush) {
      canvas.freeDrawingBrush.width = width;
    }
    set({ strokeWidth: width });
  },
});
