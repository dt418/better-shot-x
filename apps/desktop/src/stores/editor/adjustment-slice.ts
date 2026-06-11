import { FabricImage, filters } from 'fabric';

import type { AdjustmentSlice, EditorState, AdjustmentType } from './types';
import type { StateCreator } from 'zustand';

/** Maps each adjustment type to its Fabric.js filter class and option key. */
const ADJUSTMENT_FILTER_CONFIG: Record<
  AdjustmentType,
  { filterClass: string; optionKey: string }
> = {
  brightness: { filterClass: 'Brightness', optionKey: 'brightness' },
  contrast: { filterClass: 'Contrast', optionKey: 'contrast' },
  saturation: { filterClass: 'Saturation', optionKey: 'saturation' },
  hue: { filterClass: 'HueRotation', optionKey: 'rotation' },
};

export const createAdjustmentSlice: StateCreator<EditorState, [], [], AdjustmentSlice> = (_set, get) => ({
  applyAdjustment: (adjustmentType: AdjustmentType, value: number) => {
    const { canvas, pushHistory } = get();
    if (!canvas) return;

    const bg = canvas.backgroundImage as FabricImage | null;
    if (!bg) return;

    const config = ADJUSTMENT_FILTER_CONFIG[adjustmentType];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const FilterClass = (filters as any)[config.filterClass];
    if (!FilterClass) return;

    // Remove any previous filter of the same type by constructor name
    if (bg.filters) {
      bg.filters = bg.filters.filter((f) => f.constructor.name !== config.filterClass);
    } else {
      bg.filters = [];
    }

    // Create filter with the correct property key
    const filterInstance = new FilterClass({ [config.optionKey]: value });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    bg.filters.push(filterInstance as any);

    bg.applyFilters();
    canvas.renderAll();
    pushHistory();
  },
});
