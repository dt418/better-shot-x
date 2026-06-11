import { FabricImage } from 'fabric';

import type { FilterSlice, EditorState, FilterType } from './types';
import type { StateCreator } from 'zustand';

export const createFilterSlice: StateCreator<EditorState, [], [], FilterSlice> = (_set, get) => ({
  applyFilter: async (filterType: FilterType, intensity = 0.5) => {
    const { canvas, pushHistory } = get();
    if (!canvas) return;

    const bg = canvas.backgroundImage as FabricImage | undefined;
    if (!bg) return;

    // Clear existing filters.
    bg.filters = [];

    // Apply the selected filter.
    const { filters } = await import('fabric');
    switch (filterType) {
      case 'blur':
        bg.filters.push(new filters.Blur({ blur: intensity }));
        break;
      case 'sharpen':
        bg.filters.push(
          new filters.Convolute({
            matrix: [0, -1, 0, -1, 5, -1, 0, -1, 0],
          }),
        );
        break;
      case 'grayscale':
        bg.filters.push(new filters.Grayscale());
        break;
      case 'sepia':
        bg.filters.push(new filters.Sepia());
        break;
      case 'pixelate':
        bg.filters.push(new filters.Pixelate({ blocksize: Math.max(1, Math.round(intensity * 20)) }));
        break;
    }

    bg.applyFilters();
    canvas.renderAll();
    pushHistory();
  },
});
