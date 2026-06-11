import type { ViewSlice, EditorState } from './types';
import type { StateCreator } from 'zustand';

export const createViewSlice: StateCreator<EditorState, [], [], ViewSlice> = (set, get) => ({
  zoom: 1,
  history: [],
  historyIndex: -1,

  setZoom: (zoom) => set({ zoom }),

  pushHistory: () => {
    const { canvas, history, historyIndex } = get();
    if (!canvas) return;

    const json = JSON.stringify(canvas.toJSON());
    const trimmed = history.slice(0, historyIndex + 1);
    trimmed.push(json);

    // Keep at most 50 snapshots to bound memory.
    if (trimmed.length > 50) trimmed.shift();

    set({
      history: trimmed,
      historyIndex: trimmed.length - 1,
    });
  },

  undo: () => {
    const { canvas, history, historyIndex } = get();
    if (!canvas || historyIndex <= 0) return;

    const newIndex = historyIndex - 1;
    const snapshot = history[newIndex];
    if (!snapshot) return;
    void canvas.loadFromJSON(snapshot).then(() => {
      canvas.renderAll();
      set({ historyIndex: newIndex });
    }).catch(console.error);
  },

  redo: () => {
    const { canvas, history, historyIndex } = get();
    if (!canvas || historyIndex >= history.length - 1) return;

    const newIndex = historyIndex + 1;
    const snapshot = history[newIndex];
    if (!snapshot) return;
    void canvas.loadFromJSON(snapshot).then(() => {
      canvas.renderAll();
      set({ historyIndex: newIndex });
    }).catch(console.error);
  },
});
