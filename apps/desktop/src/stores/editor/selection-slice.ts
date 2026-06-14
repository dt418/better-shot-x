import { ActiveSelection } from 'fabric';
import type { StateCreator } from 'zustand';
import type { EditorState } from './types';
import { magicWandSelect, createMagicWandSelection } from '@/lib/magic-wand';

// ---------------------------------------------------------------------------
// Selection types
// ---------------------------------------------------------------------------

export type SelectionMode = 'rectangle' | 'lasso' | 'magicWand';

export interface SelectionSlice {
  selectionMode: SelectionMode;
  magicWandTolerance: number;

  setSelectionMode: (mode: SelectionMode) => void;
  setMagicWandTolerance: (tolerance: number) => void;
  selectByColor: (color: string, tolerance?: number) => void;
  magicWandSelectAtPoint: (x: number, y: number) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Simple color distance (Euclidean in RGB space).
 */
function colorDistance(c1: [number, number, number], c2: [number, number, number]): number {
  const dr = c1[0] - c2[0];
  const dg = c1[1] - c2[1];
  const db = c1[2] - c2[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * Parse a hex color string to RGB tuple.
 */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const num = parseInt(h, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

// ---------------------------------------------------------------------------
// Slice implementation
// ---------------------------------------------------------------------------

export const createSelectionSlice: StateCreator<EditorState, [], [], SelectionSlice> = (
  set,
  get,
) => ({
  selectionMode: 'rectangle',
  magicWandTolerance: 30,

  setSelectionMode: (mode) => set({ selectionMode: mode }),

  setMagicWandTolerance: (tolerance) => set({ magicWandTolerance: tolerance }),

  /**
   * Select all objects whose fill/stroke color is within tolerance of the target.
   */
  selectByColor: (color: string, tolerance?: number) => {
    const { canvas } = get();
    if (!canvas) return;

    const tol = tolerance ?? get().magicWandTolerance;
    const targetRgb = hexToRgb(color);

    const matches = canvas.getObjects().filter((obj) => {
      const fill = obj.fill;
      const stroke = obj.stroke;

      if (typeof fill === 'string' && fill.startsWith('#')) {
        if (colorDistance(hexToRgb(fill), targetRgb) <= tol) return true;
      }
      if (typeof stroke === 'string' && stroke.startsWith('#')) {
        if (colorDistance(hexToRgb(stroke), targetRgb) <= tol) return true;
      }
      return false;
    });

    if (matches.length > 0) {
      const selection = new ActiveSelection(matches, { canvas });
      canvas.setActiveObject(selection);
      canvas.renderAll();
    }
  },

  /**
   * Pixel-level magic wand selection using flood-fill algorithm.
   * Selects objects whose bounding rects overlap with the detected region.
   */
  magicWandSelectAtPoint: (x: number, y: number) => {
    const { canvas } = get();
    if (!canvas) return;

    const tolerance = get().magicWandTolerance;
    const result = magicWandSelect(canvas, x, y, { tolerance });
    if (!result) return;

    // Find objects whose centers fall within the detected bounds
    const { bounds } = result;
    const matches = canvas.getObjects().filter((obj) => {
      const center = obj.getCenterPoint();
      return (
        center.x >= bounds.x &&
        center.x <= bounds.x + bounds.width &&
        center.y >= bounds.y &&
        center.y <= bounds.y + bounds.height
      );
    });

    if (matches.length > 0) {
      const selection = new ActiveSelection(matches, { canvas });
      canvas.setActiveObject(selection);
    }

    // Clean up previous selection indicators
    canvas.getObjects().forEach((obj) => {
      if ((obj as { name?: string }).name === '__magicwand_indicator') {
        canvas.remove(obj);
      }
    });

    // Show selection indicator
    createMagicWandSelection(canvas, result);
  },
});
