import { describe, it, expect, vi } from 'vitest';
import { computeSnap, createGuideLines, removeGuideLines } from '../alignment-snapping';
import type { Canvas as FabricCanvas, FabricObject, Line } from 'fabric';

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

const createMockObj = (overrides: Partial<FabricObject> = {}): FabricObject =>
  ({
    left: 0,
    top: 0,
    width: 100,
    height: 60,
    scaleX: 1,
    scaleY: 1,
    selectable: true,
    ...overrides,
  }) as unknown as FabricObject;

const createMockCanvas = (overrides: Partial<FabricCanvas> = {}): FabricCanvas => {
  const objects: FabricObject[] = [];
  return {
    getWidth: vi.fn(() => 800),
    getHeight: vi.fn(() => 600),
    getObjects: vi.fn(() => objects),
    add: vi.fn((obj: FabricObject) => {
      objects.push(obj);
    }),
    remove: vi.fn((obj: FabricObject) => {
      const idx = objects.indexOf(obj);
      if (idx !== -1) objects.splice(idx, 1);
    }),
    renderAll: vi.fn(),
    bringObjectForward: vi.fn(),
    forEachObject: vi.fn((fn: (obj: FabricObject) => void) => objects.forEach(fn)),
    ...overrides,
  } as unknown as FabricCanvas;
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('computeSnap', () => {
  it('returns original position when no snap targets nearby', () => {
    const canvas = createMockCanvas();
    const obj = createMockObj({ left: 200, top: 150 });

    const result = computeSnap(obj, canvas);

    expect(result.left).toBe(200);
    expect(result.top).toBe(150);
    expect(result.guides).toEqual([]);
  });

  it('snaps left edge to canvas left (0)', () => {
    const canvas = createMockCanvas();
    const obj = createMockObj({ left: 3, top: 100 });

    const result = computeSnap(obj, canvas);

    expect(result.left).toBe(0);
    expect(result.guides).toHaveLength(1);
    const guide = result.guides[0]!;
    expect(guide.orientation).toBe('vertical');
    expect(guide.position).toBe(0);
    expect(guide.edge).toBe('left');
  });

  it('snaps center to canvas center', () => {
    const canvas = createMockCanvas(); // 800x600, center = 400
    const obj = createMockObj({ left: 345, top: 100, width: 100 }); // center = 345 + 50 = 395

    const result = computeSnap(obj, canvas);

    expect(result.left).toBe(350); // 400 - 50 = 350
    expect(result.guides).toHaveLength(1);
    const guide = result.guides[0]!;
    expect(guide.position).toBe(400);
    expect(guide.edge).toBe('center');
  });

  it('snaps right edge to canvas right', () => {
    const canvas = createMockCanvas(); // width = 800
    const obj = createMockObj({ left: 700, top: 100, width: 100 }); // right = 800

    const result = computeSnap(obj, canvas);

    expect(result.left).toBe(700); // right = 700 + 100 = 800 ✓
    expect(result.guides).toHaveLength(1);
    const guide = result.guides[0]!;
    expect(guide.position).toBe(800);
    expect(guide.edge).toBe('right');
  });

  it('snaps top edge to canvas top (0)', () => {
    const canvas = createMockCanvas();
    const obj = createMockObj({ left: 100, top: 2 });

    const result = computeSnap(obj, canvas);

    expect(result.top).toBe(0);
    expect(result.guides).toHaveLength(1);
    const guide = result.guides[0]!;
    expect(guide.orientation).toBe('horizontal');
    expect(guide.position).toBe(0);
  });

  it('snaps middle to canvas center (vertical)', () => {
    const canvas = createMockCanvas(); // height = 600, center = 300
    const obj = createMockObj({ left: 100, top: 265, height: 60 }); // middle = 265 + 30 = 295

    const result = computeSnap(obj, canvas);

    expect(result.top).toBe(270); // 300 - 30 = 270
    expect(result.guides).toHaveLength(1);
    const guide = result.guides[0]!;
    expect(guide.position).toBe(300);
  });

  it("snaps to another object's left edge", () => {
    const canvas = createMockCanvas();
    const existingObj = createMockObj({ left: 200, top: 0, width: 100, height: 50 });
    const movingObj = createMockObj({ left: 198, top: 100, width: 80, height: 40 });

    // Mock getObjects to return the existing object
    canvas.getObjects = vi.fn(() => [existingObj]);

    const result = computeSnap(movingObj, canvas);

    expect(result.left).toBe(200);
    expect(result.guides).toHaveLength(1);
    const guide = result.guides[0]!;
    expect(guide.position).toBe(200);
  });

  it("snaps to another object's right edge", () => {
    const canvas = createMockCanvas();
    const existingObj = createMockObj({ left: 100, top: 0, width: 100 }); // right = 200
    const movingObj = createMockObj({ left: 198, top: 100, width: 80 }); // moving right = 278

    canvas.getObjects = vi.fn(() => [existingObj]);

    const result = computeSnap(movingObj, canvas);

    // Moving right edge = 198 + 80 = 278, existing right = 200, diff = 78 (beyond threshold)
    // But moving left edge = 198, existing right = 200, diff = 2 (within threshold)
    expect(result.left).toBe(200);
    const guide = result.guides[0]!;
    expect(guide.position).toBe(200);
  });

  it('snaps both horizontal and vertical simultaneously', () => {
    const canvas = createMockCanvas(); // 800x600
    const obj = createMockObj({ left: 397, top: 297, width: 100, height: 60 });
    // Moving h-edges: left=397, center=447, right=497
    // Canvas h-targets: left=0, center=400, right=800
    // Best H snap: left edge (397) → canvas-center (400), delta=3
    // Moving v-edges: top=297, middle=327, bottom=357
    // Canvas v-targets: top=0, center=300, bottom=600
    // Best V snap: top edge (297) → canvas-center (300), delta=3

    const result = computeSnap(obj, canvas);

    expect(result.left).toBe(400); // 397 + 3
    expect(result.top).toBe(300); // 297 + 3
    expect(result.guides).toHaveLength(2);
    expect(result.guides.some((g) => g.orientation === 'vertical')).toBe(true);
    expect(result.guides.some((g) => g.orientation === 'horizontal')).toBe(true);
  });

  it('respects custom threshold', () => {
    const canvas = createMockCanvas();
    const obj = createMockObj({ left: 20, top: 100 }); // left = 20, canvas left = 0, diff = 20

    const result = computeSnap(obj, canvas, 15);

    // 20 > 15, should NOT snap
    expect(result.left).toBe(20);
    expect(result.guides).toEqual([]);
  });

  it('snaps within custom threshold', () => {
    const canvas = createMockCanvas();
    const obj = createMockObj({ left: 12, top: 100 }); // diff = 12

    const result = computeSnap(obj, canvas, 15);

    expect(result.left).toBe(0);
    expect(result.guides).toHaveLength(1);
  });

  it('ignores non-selectable objects as snap targets', () => {
    const canvas = createMockCanvas();
    const existingObj = createMockObj({ left: 200, top: 0, width: 100, selectable: false });
    const movingObj = createMockObj({ left: 198, top: 100, width: 80 });

    canvas.getObjects = vi.fn(() => [existingObj]);

    const result = computeSnap(movingObj, canvas);

    // Should NOT snap to the non-selectable object
    expect(result.left).toBe(198);
    expect(result.guides).toEqual([]);
  });

  it('does not snap when beyond threshold', () => {
    const canvas = createMockCanvas();
    const obj = createMockObj({ left: 15, top: 100 }); // diff = 15, threshold = 6

    const result = computeSnap(obj, canvas);

    expect(result.left).toBe(15);
    expect(result.guides).toEqual([]);
  });
});

describe('createGuideLines', () => {
  it('creates vertical guide line for vertical snap', () => {
    const canvas = createMockCanvas();
    const lines = createGuideLines(canvas, [
      { orientation: 'vertical', position: 400, edge: 'center' },
    ]);

    expect(lines).toHaveLength(1);
    expect(canvas.add).toHaveBeenCalledTimes(1);
    expect(canvas.bringObjectForward).toHaveBeenCalledTimes(1);
  });

  it('creates horizontal guide line for horizontal snap', () => {
    const canvas = createMockCanvas();
    const lines = createGuideLines(canvas, [
      { orientation: 'horizontal', position: 300, edge: 'middle' },
    ]);

    expect(lines).toHaveLength(1);
    expect(canvas.add).toHaveBeenCalledTimes(1);
  });

  it('creates multiple guide lines', () => {
    const canvas = createMockCanvas();
    const lines = createGuideLines(canvas, [
      { orientation: 'vertical', position: 400, edge: 'center' },
      { orientation: 'horizontal', position: 300, edge: 'middle' },
    ]);

    expect(lines).toHaveLength(2);
    expect(canvas.add).toHaveBeenCalledTimes(2);
  });
});

describe('removeGuideLines', () => {
  it('removes specific guide lines from canvas', () => {
    const canvas = createMockCanvas();
    const mockRemove = canvas.remove as ReturnType<typeof vi.fn>;
    const mockLine1 = { id: 'guide-1' } as unknown as Line;
    const mockLine2 = { id: 'guide-2' } as unknown as Line;

    // Pass tracked array — only line1 should be removed
    removeGuideLines(canvas, [mockLine1]);

    expect(mockRemove).toHaveBeenCalledTimes(1);
    expect(mockRemove).toHaveBeenCalledWith(mockLine1);
    expect(mockRemove).not.toHaveBeenCalledWith(mockLine2);
  });

  it('removes multiple guide lines at once', () => {
    const canvas = createMockCanvas();
    const mockRemove = canvas.remove as ReturnType<typeof vi.fn>;
    const mockLine1 = { id: 'guide-1' } as unknown as Line;
    const mockLine2 = { id: 'guide-2' } as unknown as Line;

    removeGuideLines(canvas, [mockLine1, mockLine2]);

    expect(mockRemove).toHaveBeenCalledTimes(2);
    expect(mockRemove).toHaveBeenCalledWith(mockLine1);
    expect(mockRemove).toHaveBeenCalledWith(mockLine2);
  });

  it('does nothing when empty array is passed', () => {
    const canvas = createMockCanvas();

    removeGuideLines(canvas, []);

    expect(canvas.remove).not.toHaveBeenCalled();
  });
});
