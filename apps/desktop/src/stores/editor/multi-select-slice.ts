import { ActiveSelection } from 'fabric';

import type { MultiSelectSlice, EditorState } from './types';
import type { StateCreator } from 'zustand';

export const createMultiSelectSlice: StateCreator<EditorState, [], [], MultiSelectSlice> = (_set, get) => ({
  alignSelected: (direction) => {
    const { canvas, pushHistory } = get();
    if (!canvas) return;

    const activeObj = canvas.getActiveObject();
    if (!activeObj) return;

    // For single objects, align relative to canvas
    const objs = activeObj instanceof ActiveSelection
      ? (activeObj as ActiveSelection).getObjects()
      : [activeObj];

    if (objs.length < 2) {
      // Single object: align to canvas center/edges
      const canvasW = canvas.getWidth();
      const canvasH = canvas.getHeight();
      const obj = objs[0];
      if (!obj) return;

      switch (direction) {
        case 'left':
          obj.set('left', 0);
          break;
        case 'center':
          obj.set('left', (canvasW - (obj.width ?? 0)) / 2);
          break;
        case 'right':
          obj.set('left', canvasW - (obj.width ?? 0));
          break;
        case 'top':
          obj.set('top', 0);
          break;
        case 'middle':
          obj.set('top', (canvasH - (obj.height ?? 0)) / 2);
          break;
        case 'bottom':
          obj.set('top', canvasH - (obj.height ?? 0));
          break;
      }
    } else {
      // Multiple objects: align relative to selection bounds
      const bounds = activeObj.getBoundingRect();
      const centerX = bounds.left + bounds.width / 2;
      const centerY = bounds.top + bounds.height / 2;

      for (const obj of objs) {
        switch (direction) {
          case 'left':
            obj.set('left', bounds.left);
            break;
          case 'center':
            obj.set('left', centerX - (obj.width ?? 0) / 2);
            break;
          case 'right':
            obj.set('left', bounds.left + bounds.width - (obj.width ?? 0));
            break;
          case 'top':
            obj.set('top', bounds.top);
            break;
          case 'middle':
            obj.set('top', centerY - (obj.height ?? 0) / 2);
            break;
          case 'bottom':
            obj.set('top', bounds.top + bounds.height - (obj.height ?? 0));
            break;
        }
        obj.setCoords();
      }
    }

    canvas.renderAll();
    pushHistory();
  },

  groupSelected: () => {
    const { canvas, pushHistory } = get();
    if (!canvas) return;

    const activeObj = canvas.getActiveObject();
    if (!activeObj || !(activeObj instanceof ActiveSelection)) return;

    // Fabric.js: toGroup() converts ActiveSelection → Group
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const group = (activeObj as any).toGroup();
    if (group) {
      canvas.renderAll();
      pushHistory();
    }
  },

  deleteSelected: () => {
    const { canvas, pushHistory } = get();
    if (!canvas) return;

    const activeObj = canvas.getActiveObject();
    if (!activeObj) return;

    if (activeObj instanceof ActiveSelection) {
      const objects = activeObj.getObjects();
      // Dissolve the selection first, then remove each object
      canvas.discardActiveObject();
      for (const obj of objects) {
        canvas.remove(obj);
      }
    } else {
      canvas.remove(activeObj);
    }

    canvas.renderAll();
    pushHistory();
  },
});
