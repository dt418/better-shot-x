import type { ResetSlice, EditorState } from './types';
import type { StateCreator } from 'zustand';

export const createResetSlice: StateCreator<EditorState, [], [], ResetSlice> = (set, get) => ({
  reset: () => {
    const { canvas } = get();
    if (canvas) {
      canvas.clear();
      canvas.dispose();
    }
    set({
      canvas: null,
      activeTool: 'select',
      zoom: 1,
      history: [],
      historyIndex: -1,
      imageLoaded: false,
      imagePath: null,
      cropRegion: null,
      cropPending: false,
    });
  },
});
