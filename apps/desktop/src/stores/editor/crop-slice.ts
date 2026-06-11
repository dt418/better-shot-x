import { FabricImage } from 'fabric';

import type { CropSlice, EditorState } from './types';
import type { StateCreator } from 'zustand';

export const createCropSlice: StateCreator<EditorState, [], [], CropSlice> = (set, get) => ({
  cropRegion: null,
  cropPending: false,

  setCropRegion: (region) => set({ cropRegion: region }),

  setCropPending: (pending) => set({ cropPending: pending }),

  applyCrop: () => {
    const { canvas, cropRegion, loadImage } = get();
    if (!canvas || !cropRegion) {
      set({ cropRegion: null, cropPending: false });
      return;
    }

    const bg = canvas.backgroundImage as FabricImage | undefined;
    if (!bg) {
      set({ cropRegion: null, cropPending: false });
      return;
    }

    // Create a temporary canvas to crop the background image.
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = cropRegion.width;
    tempCanvas.height = cropRegion.height;
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) {
      set({ cropRegion: null, cropPending: false });
      return;
    }

    // Draw the cropped region of the background.
    const element = bg.getElement();
    ctx.drawImage(
      element as CanvasImageSource,
      cropRegion.x,
      cropRegion.y,
      cropRegion.width,
      cropRegion.height,
      0,
      0,
      cropRegion.width,
      cropRegion.height,
    );

    const croppedDataUrl = tempCanvas.toDataURL('image/png');

    // Rebuild canvas with cropped image.
    const { imagePath } = get();
    void loadImage(croppedDataUrl, imagePath ?? '');

    set({ cropRegion: null, cropPending: false });
  },
});
