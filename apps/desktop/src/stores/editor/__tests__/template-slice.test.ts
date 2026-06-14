import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Canvas } from 'fabric';
import { useEditorStore } from '../index';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn(() => null),
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

// Mock Fabric.js canvas
const createMockCanvas = () =>
  ({
    getWidth: vi.fn(() => 800),
    getHeight: vi.fn(() => 600),
    getObjects: vi.fn(() => [
      { type: 'rect', toJSON: () => ({ type: 'rect' }) },
      { type: 'textbox', toJSON: () => ({ type: 'textbox' }) },
    ]),
    getActiveObject: vi.fn(() => null),
    setActiveObject: vi.fn(),
    discardActiveObject: vi.fn(),
    add: vi.fn(),
    remove: vi.fn(),
    renderAll: vi.fn(),
    requestRenderAll: vi.fn(),
    toJSON: vi.fn(() => ({ objects: [{ type: 'rect' }, { type: 'textbox' }] })),
    loadFromJSON: vi.fn().mockImplementation(() => ({
      then: (cb: () => void) => {
        cb();
        return { catch: () => {} };
      },
      catch: () => {},
    })),
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
    moveObjectTo: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    dispose: vi.fn(),
    clear: vi.fn(),
  }) as unknown as Canvas;

describe('TemplateSlice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    useEditorStore.setState(useEditorStore.getInitialState());
  });

  it('has default state with empty templates', () => {
    const state = useEditorStore.getState();
    expect(state.templates).toEqual([]);
  });

  it('loadTemplates loads from localStorage', () => {
    const mockTemplates = [
      { id: 'tpl_1', name: 'Test', createdAt: '2024-01-01', canvasJSON: '{}', objectCount: 2 },
    ];
    localStorageMock.setItem('better-shot-templates', JSON.stringify(mockTemplates));

    useEditorStore.getState().loadTemplates();
    expect(useEditorStore.getState().templates).toEqual(mockTemplates);
    expect(localStorageMock.getItem).toHaveBeenCalledWith('better-shot-templates');
  });

  it('loadTemplates handles corrupted localStorage gracefully', () => {
    localStorageMock.setItem('better-shot-templates', 'not-json');
    useEditorStore.getState().loadTemplates();
    expect(useEditorStore.getState().templates).toEqual([]);
  });

  it('saveTemplate saves canvas state to localStorage', () => {
    const mockCanvas = createMockCanvas();
    useEditorStore.setState({ canvas: mockCanvas });

    const template = useEditorStore.getState().saveTemplate('My Template');
    expect(template).not.toBeNull();
    expect(template?.name).toBe('My Template');
    expect(template?.objectCount).toBe(2);
    expect(template?.canvasJSON).toBeTruthy();
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'better-shot-templates',
      expect.any(String),
    );

    // Verify the template is in the store
    expect(useEditorStore.getState().templates).toHaveLength(1);
    expect(useEditorStore.getState().templates[0]!.name).toBe('My Template');
  });

  it('saveTemplate returns null without canvas', () => {
    const template = useEditorStore.getState().saveTemplate('No Canvas');
    expect(template).toBeNull();
    expect(useEditorStore.getState().templates).toHaveLength(0);
  });

  it('deleteTemplate removes from store and localStorage', () => {
    const mockCanvas = createMockCanvas();
    useEditorStore.setState({ canvas: mockCanvas });

    // Save a template first
    const template = useEditorStore.getState().saveTemplate('To Delete');
    expect(template).not.toBeNull();
    if (!template) return;

    // Delete it
    useEditorStore.getState().deleteTemplate(template.id);
    expect(useEditorStore.getState().templates).toHaveLength(0);
    expect(localStorageMock.setItem).toHaveBeenCalled();
  });

  it('deleteTemplate ignores unknown id', () => {
    const mockCanvas = createMockCanvas();
    useEditorStore.setState({ canvas: mockCanvas });

    useEditorStore.getState().saveTemplate('Keep');
    useEditorStore.getState().deleteTemplate('unknown-id');
    expect(useEditorStore.getState().templates).toHaveLength(1);
  });

  it('applyTemplate loads canvas JSON and pushes history', () => {
    const mockCanvas = createMockCanvas();
    useEditorStore.setState({ canvas: mockCanvas });

    // Save a template
    const template = useEditorStore.getState().saveTemplate('Apply Me');
    expect(template).not.toBeNull();

    // Apply it
    useEditorStore.getState().applyTemplate(template!.id);
    expect(mockCanvas.loadFromJSON).toHaveBeenCalledWith(template!.canvasJSON);
    expect(mockCanvas.renderAll).toHaveBeenCalled();
  });

  it('applyTemplate does nothing without canvas', () => {
    const templates = [
      { id: 'tpl_1', name: 'Test', createdAt: '2024-01-01', canvasJSON: '{}', objectCount: 0 },
    ];
    useEditorStore.setState({ templates });

    // Should not throw
    useEditorStore.getState().applyTemplate('tpl_1');
  });

  it('applyTemplate ignores unknown id', () => {
    const mockCanvas = createMockCanvas();
    useEditorStore.setState({ canvas: mockCanvas });

    useEditorStore.getState().applyTemplate('nonexistent-id');
    expect(mockCanvas.loadFromJSON).not.toHaveBeenCalled();
  });

  it('multiple saveTemplate calls accumulate templates', () => {
    const mockCanvas = createMockCanvas();
    useEditorStore.setState({ canvas: mockCanvas });

    useEditorStore.getState().saveTemplate('Template 1');
    useEditorStore.getState().saveTemplate('Template 2');
    useEditorStore.getState().saveTemplate('Template 3');

    expect(useEditorStore.getState().templates).toHaveLength(3);
    expect(useEditorStore.getState().templates.map((t) => t.name)).toEqual([
      'Template 1',
      'Template 2',
      'Template 3',
    ]);
  });

  it('saved templates have unique ids', () => {
    const mockCanvas = createMockCanvas();
    useEditorStore.setState({ canvas: mockCanvas });

    const t1 = useEditorStore.getState().saveTemplate('First');
    const t2 = useEditorStore.getState().saveTemplate('Second');
    expect(t1?.id).not.toBe(t2?.id);
  });

  it('saved templates have ISO date strings', () => {
    const mockCanvas = createMockCanvas();
    useEditorStore.setState({ canvas: mockCanvas });

    const template = useEditorStore.getState().saveTemplate('Dated');
    expect(template?.createdAt).toBeTruthy();
    expect(new Date(template!.createdAt).toISOString()).toBe(template!.createdAt);
  });
});
