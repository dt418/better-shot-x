import { FabricImage } from 'fabric';

import type { ImageSlice, EditorState, ExportFormat } from './types';
import type { StateCreator } from 'zustand';

export const createImageSlice: StateCreator<EditorState, [], [], ImageSlice> = (set, get) => ({
  imageLoaded: false,
  imagePath: null,

  loadImage: async (dataUrl, path) => {
    const { canvas, pushHistory } = get();
    if (!canvas) return;

    const img = await FabricImage.fromURL(dataUrl);

    canvas.clear();
    canvas.backgroundImage = img;
    canvas.setDimensions({ width: img.width ?? 800, height: img.height ?? 600 });

    // Reset viewport transform.
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    canvas.renderAll();

    set({ imageLoaded: true, imagePath: path, zoom: 1 });
    pushHistory();
  },

  saveFile: async () => {
    const { canvas, imagePath } = get();
    if (!canvas || !imagePath) return;

    const blob = await canvas.toBlob({ format: 'png', quality: 1, multiplier: 1 });
    if (!blob) return;

    const arrayBuffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    const { writeFile } = await import('@tauri-apps/plugin-fs');
    await writeFile(imagePath, uint8Array);
  },

  exportFile: async (format: ExportFormat = 'png') => {
    const { canvas } = get();
    if (!canvas) return;

    const quality = format === 'png' ? undefined : 0.92;

    const blob = await canvas.toBlob({ format, quality: quality ?? 1, multiplier: 1 });
    if (!blob) return;

    const arrayBuffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    const { save } = await import('@tauri-apps/plugin-dialog');
    const { writeFile } = await import('@tauri-apps/plugin-fs');

    const ext = format === 'jpeg' ? 'jpg' : format;
    const filePath = await save({
      filters: [{ name: format.toUpperCase(), extensions: [ext] }],
      defaultPath: `screenshot.${ext}`,
    });

    if (filePath) {
      await writeFile(filePath as string, uint8Array);
    }
  },
});
