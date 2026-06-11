import { Shadow } from 'fabric';

import type { EffectsSlice, EditorState, EffectType } from './types';
import type { StateCreator } from 'zustand';

export const createEffectsSlice: StateCreator<EditorState, [], [], EffectsSlice> = (_set, get) => ({
  applyEffect: (effectType: EffectType, options?: Record<string, number>) => {
    const { canvas, pushHistory } = get();
    if (!canvas) return;

    const activeObj = canvas.getActiveObject();
    if (!activeObj) return;

    switch (effectType) {
      case 'dropShadow': {
        const offsetX = options?.offsetX ?? 4;
        const offsetY = options?.offsetY ?? 4;
        const blur = options?.blur ?? 6;
        const color = options?.color ? `rgba(0,0,0,${options.color})` : 'rgba(0,0,0,0.5)';
        activeObj.set('shadow', new Shadow({
          color,
          offsetX,
          offsetY,
          blur,
        }));
        break;
      }
      case 'glow': {
        const blur = options?.blur ?? 10;
        const color = options?.color ? `rgba(255,255,0,${options.color})` : 'rgba(255,255,0,0.6)';
        activeObj.set('shadow', new Shadow({
          color,
          offsetX: 0,
          offsetY: 0,
          blur,
        }));
        break;
      }
      case 'outline': {
        const strokeWidth = options?.strokeWidth ?? 2;
        const color = options?.color ?? '#000000';
        activeObj.set({
          stroke: color,
          strokeWidth,
        });
        break;
      }
      case 'removeShadow':
        activeObj.set('shadow', null);
        break;
    }

    activeObj.dirty = true;
    canvas.renderAll();
    pushHistory();
  },
});
