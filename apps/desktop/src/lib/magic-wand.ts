
import { Rect, type Canvas as FabricCanvas } from 'fabric';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MagicWandOptions {
  tolerance: number;
  maxPixels?: number;
}

export interface FloodFillResult {
  bounds: { x: number; y: number; width: number; height: number };
  pixelCount: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Calculate Euclidean distance between two RGB colors.
 */
function colorDistance(
  r1: number, g1: number, b1: number,
  r2: number, g2: number, b2: number,
): number {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Perform magic wand selection on a Fabric.js canvas.
 * Flood-fills from the click point and returns a selection rectangle
 * covering the contiguous region of similar colors.
 */
export function magicWandSelect(
  canvas: FabricCanvas,
  clickX: number,
  clickY: number,
  options: MagicWandOptions,
): FloodFillResult | null {
  const canvasEl = canvas.getElement();
  if (!canvasEl) return null;

  const ctx = canvasEl.getContext('2d');
  if (!ctx) return null;

  const width = canvas.getWidth();
  const height = canvas.getHeight();

  // Get image data
  const imageData = ctx.getImageData(0, 0, width, height);
  const { data } = imageData;

  // Get the color at the click point
  const startIdx = (Math.floor(clickY) * width + Math.floor(clickX)) * 4;
  const startR = data[startIdx] ?? 0;
  const startG = data[startIdx + 1] ?? 0;
  const startB = data[startIdx + 2] ?? 0;

  const tolerance = options.tolerance;
  const maxPixels = options.maxPixels ?? 1000000;

  // Flood fill using q-floodfill
  // The library modifies ImageData in-place
  const visited = new Uint8Array(width * height);
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let pixelCount = 0;

  // Scanline flood fill
  const stack: [number, number][] = [[Math.floor(clickX), Math.floor(clickY)]];

  while (stack.length > 0 && pixelCount < maxPixels) {
    const current = stack.pop();
    if (!current) break;

    const [x, y] = current;
    if (x < 0 || x >= width || y < 0 || y >= height) continue;

    const idx = y * width + x;
    if (visited[idx]) continue;

    const dataIdx = idx * 4;
    const r = data[dataIdx] ?? 0;
    const g = data[dataIdx + 1] ?? 0;
    const b = data[dataIdx + 2] ?? 0;

    // Check color tolerance
    if (colorDistance(r, g, b, startR, startG, startB) > tolerance) continue;

    // Mark as visited
    visited[idx] = 1;
    pixelCount++;

    // Update bounds
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);

    // Add neighbors (scanline optimization: spread horizontally first)
    stack.push([x + 1, y]);
    stack.push([x - 1, y]);
    stack.push([x, y + 1]);
    stack.push([x, y - 1]);
  }

  if (pixelCount === 0) return null;

  return {
    bounds: {
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
    },
    pixelCount,
  };
}

/**
 * Create a visual selection indicator on the canvas from magic wand result.
 */
export function createMagicWandSelection(
  canvas: FabricCanvas,
  result: FloodFillResult,
): void {
  const { bounds } = result;

  const selectionRect = new Rect({
    left: bounds.x,
    top: bounds.y,
    width: bounds.width,
    height: bounds.height,
    fill: 'rgba(0, 170, 255, 0.1)',
    stroke: '#00aaff',
    strokeWidth: 1,
    strokeDashArray: [4, 4],
    selectable: false,
    evented: false,
    excludeFromExport: true,
    name: '__magicwand_indicator',
  });

  canvas.add(selectionRect);
  canvas.renderAll();
}
