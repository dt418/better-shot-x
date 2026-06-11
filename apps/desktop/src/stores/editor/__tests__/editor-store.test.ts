import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Canvas } from 'fabric';
import { useEditorStore } from '../index';

// Mock Fabric.js canvas
const createMockCanvas = () => ({
  getWidth: vi.fn(() => 800),
  getHeight: vi.fn(() => 600),
  getObjects: vi.fn(() => []),
  getActiveObject: vi.fn(() => null),
  setActiveObject: vi.fn(),
  discardActiveObject: vi.fn(),
  add: vi.fn(),
  remove: vi.fn(),
  renderAll: vi.fn(),
  requestRenderAll: vi.fn(),
  toJSON: vi.fn(() => ({})),
  loadFromJSON: vi.fn().mockResolvedValue(undefined),
  setDimensions: vi.fn(),
  setViewportTransform: vi.fn(),
  setZoom: vi.fn(),
  getZoom: vi.fn(() => 1),
  zoomToPoint: vi.fn(),
  getScenePoint: vi.fn(() => ({ x: 0, y: 0 })),
  backgroundImage: null,
  isDrawingMode: false,
  selection: true,
  defaultCursor: 'default',
  forEachObject: vi.fn(),
  toBlob: vi.fn().mockResolvedValue({ arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)) }),
  freeDrawingBrush: null,
  viewportTransform: [1, 0, 0, 1, 0, 0],
  on: vi.fn(),
  off: vi.fn(),
  dispose: vi.fn(),
  clear: vi.fn(),
} as unknown as Canvas);

describe('CanvasSlice', () => {
  beforeEach(() => {
    useEditorStore.setState(useEditorStore.getInitialState());
  });

  it('has default state', () => {
    const state = useEditorStore.getState();
    expect(state.canvas).toBeNull();
    expect(state.activeTool).toBe('select');
    expect(state.fillColor).toBe('#e74c3c');
    expect(state.strokeColor).toBe('#2c3e50');
    expect(state.strokeWidth).toBe(2);
  });

  it('setCanvas stores canvas reference', () => {
    const mockCanvas = createMockCanvas();
    useEditorStore.getState().setCanvas(mockCanvas);
    expect(useEditorStore.getState().canvas).toBe(mockCanvas);
  });

  it('setActiveTool updates active tool', () => {
    useEditorStore.getState().setActiveTool('rectangle');
    expect(useEditorStore.getState().activeTool).toBe('rectangle');
  });

  it('setFillColor updates fill color', () => {
    useEditorStore.getState().setFillColor('#00ff00');
    expect(useEditorStore.getState().fillColor).toBe('#00ff00');
  });

  it('setStrokeColor updates stroke color', () => {
    useEditorStore.getState().setStrokeColor('#ff0000');
    expect(useEditorStore.getState().strokeColor).toBe('#ff0000');
  });

  it('setStrokeWidth updates stroke width', () => {
    useEditorStore.getState().setStrokeWidth(5);
    expect(useEditorStore.getState().strokeWidth).toBe(5);
  });
});

describe('TextSlice', () => {
  beforeEach(() => {
    useEditorStore.setState(useEditorStore.getInitialState());
  });

  it('has default text formatting state', () => {
    const state = useEditorStore.getState();
    expect(state.fontSize).toBe(24);
    expect(state.fontBold).toBe(false);
    expect(state.fontItalic).toBe(false);
    expect(state.fontUnderline).toBe(false);
    expect(state.textAlign).toBe('left');
    expect(state.fontFamily).toBe('Inter');
  });

  it('setFontSize updates font size', () => {
    useEditorStore.getState().setFontSize(32);
    expect(useEditorStore.getState().fontSize).toBe(32);
  });

  it('setFontBold toggles bold', () => {
    useEditorStore.getState().setFontBold(true);
    expect(useEditorStore.getState().fontBold).toBe(true);
  });

  it('setFontItalic toggles italic', () => {
    useEditorStore.getState().setFontItalic(true);
    expect(useEditorStore.getState().fontItalic).toBe(true);
  });

  it('setFontUnderline toggles underline', () => {
    useEditorStore.getState().setFontUnderline(true);
    expect(useEditorStore.getState().fontUnderline).toBe(true);
  });

  it('setTextAlign updates alignment', () => {
    useEditorStore.getState().setTextAlign('center');
    expect(useEditorStore.getState().textAlign).toBe('center');
  });

  it('setFontFamily updates font family', () => {
    useEditorStore.getState().setFontFamily('Arial');
    expect(useEditorStore.getState().fontFamily).toBe('Arial');
  });

  it('applyTextFormatting does nothing without canvas', () => {
    // Should not throw
    useEditorStore.getState().applyTextFormatting();
  });
});

describe('ViewSlice', () => {
  beforeEach(() => {
    useEditorStore.setState(useEditorStore.getInitialState());
  });

  it('has default view state', () => {
    const state = useEditorStore.getState();
    expect(state.zoom).toBe(1);
    expect(state.history).toEqual([]);
    expect(state.historyIndex).toBe(-1);
  });

  it('setZoom updates zoom level', () => {
    useEditorStore.getState().setZoom(2);
    expect(useEditorStore.getState().zoom).toBe(2);
  });

  it('pushHistory does nothing without canvas', () => {
    useEditorStore.getState().pushHistory();
    expect(useEditorStore.getState().history).toEqual([]);
  });

  it('undo does nothing without canvas', () => {
    useEditorStore.getState().undo();
    expect(useEditorStore.getState().historyIndex).toBe(-1);
  });

  it('redo does nothing without canvas', () => {
    useEditorStore.getState().redo();
    expect(useEditorStore.getState().historyIndex).toBe(-1);
  });
});

describe('CropSlice', () => {
  beforeEach(() => {
    useEditorStore.setState(useEditorStore.getInitialState());
  });

  it('has default crop state', () => {
    const state = useEditorStore.getState();
    expect(state.cropRegion).toBeNull();
    expect(state.cropPending).toBe(false);
  });

  it('setCropRegion updates crop region', () => {
    const region = { x: 0, y: 0, width: 100, height: 100 };
    useEditorStore.getState().setCropRegion(region);
    expect(useEditorStore.getState().cropRegion).toEqual(region);
  });

  it('setCropPending updates pending state', () => {
    useEditorStore.getState().setCropPending(true);
    expect(useEditorStore.getState().cropPending).toBe(true);
  });

  it('applyCrop does nothing without canvas', () => {
    useEditorStore.getState().setCropRegion({ x: 0, y: 0, width: 100, height: 100 });
    useEditorStore.getState().applyCrop();
    expect(useEditorStore.getState().cropRegion).toBeNull();
    expect(useEditorStore.getState().cropPending).toBe(false);
  });
});

describe('ResizeSlice', () => {
  beforeEach(() => {
    useEditorStore.setState(useEditorStore.getInitialState());
  });

  it('resizeCanvas does nothing without canvas', () => {
    // Should not throw
    useEditorStore.getState().resizeCanvas(1024, 768);
  });
});

describe('ResetSlice', () => {
  beforeEach(() => {
    useEditorStore.setState(useEditorStore.getInitialState());
  });

  it('reset clears all state', () => {
    useEditorStore.getState().setFillColor('#000000');
    useEditorStore.getState().setZoom(2);
    useEditorStore.getState().setCropRegion({ x: 0, y: 0, width: 100, height: 100 });

    useEditorStore.getState().reset();

    const state = useEditorStore.getState();
    expect(state.canvas).toBeNull();
    expect(state.activeTool).toBe('select');
    expect(state.zoom).toBe(1);
    expect(state.history).toEqual([]);
    expect(state.historyIndex).toBe(-1);
    expect(state.imageLoaded).toBe(false);
    expect(state.imagePath).toBeNull();
    expect(state.cropRegion).toBeNull();
    expect(state.cropPending).toBe(false);
  });
});

describe('EffectsSlice', () => {
  beforeEach(() => {
    useEditorStore.setState(useEditorStore.getInitialState());
  });

  it('applyEffect does nothing without canvas', () => {
    // Should not throw
    useEditorStore.getState().applyEffect('dropShadow');
    useEditorStore.getState().applyEffect('glow');
    useEditorStore.getState().applyEffect('outline');
    useEditorStore.getState().applyEffect('removeShadow');
  });
});

describe('AdjustmentSlice', () => {
  beforeEach(() => {
    useEditorStore.setState(useEditorStore.getInitialState());
  });

  it('applyAdjustment does nothing without canvas', () => {
    // Should not throw
    useEditorStore.getState().applyAdjustment('brightness', 0.5);
    useEditorStore.getState().applyAdjustment('contrast', 0.3);
    useEditorStore.getState().applyAdjustment('saturation', -0.2);
    useEditorStore.getState().applyAdjustment('hue', 0.1);
  });
});

describe('MultiSelectSlice', () => {
  beforeEach(() => {
    useEditorStore.setState(useEditorStore.getInitialState());
  });

  it('alignSelected does nothing without canvas', () => {
    // Should not throw
    useEditorStore.getState().alignSelected('left');
    useEditorStore.getState().alignSelected('center');
    useEditorStore.getState().alignSelected('right');
    useEditorStore.getState().alignSelected('top');
    useEditorStore.getState().alignSelected('middle');
    useEditorStore.getState().alignSelected('bottom');
  });

  it('groupSelected does nothing without canvas', () => {
    // Should not throw
    useEditorStore.getState().groupSelected();
  });

  it('deleteSelected does nothing without canvas', () => {
    // Should not throw
    useEditorStore.getState().deleteSelected();
  });
});
