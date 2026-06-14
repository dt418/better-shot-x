import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditorToolbar } from '../toolbar';
import { LayersPanel } from '../layers-panel';
import { useEditorStore } from '@/stores/editor';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock lucide-react icons
vi.mock('lucide-react', () => {
  const mock = (name: string) => {
    const Component = (props: React.SVGProps<SVGSVGElement>) => (
      <svg data-testid={`icon-${name}`} {...props} />
    );
    Component.displayName = name;
    return Component;
  };
  return {
    AlignCenter: mock('AlignCenter'),
    AlignLeft: mock('AlignLeft'),
    AlignRight: mock('AlignRight'),
    ArrowRight: mock('ArrowRight'),
    Bold: mock('Bold'),
    Circle: mock('Circle'),
    Crop: mock('Crop'),
    Download: mock('Download'),
    Eye: mock('Eye'),
    EyeOff: mock('EyeOff'),
    FolderOpen: mock('FolderOpen'),
    Highlighter: mock('Highlighter'),
    Italic: mock('Italic'),
    Link: mock('Link'),
    Minus: mock('Minus'),
    MousePointer2: mock('MousePointer2'),
    Pencil: mock('Pencil'),
    Redo2: mock('Redo2'),
    Save: mock('Save'),
    Square: mock('Square'),
    Sparkles: mock('Sparkles'),
    Stamp: mock('Stamp'),
    Trash2: mock('Trash2'),
    Type: mock('Type'),
    Underline: mock('Underline'),
    Undo2: mock('Undo2'),
    ZoomIn: mock('ZoomIn'),
    ZoomOut: mock('ZoomOut'),
    ChevronUp: mock('ChevronUp'),
    ChevronDown: mock('ChevronDown'),
    Lasso: mock('Lasso'),
    Wand2: mock('Wand2'),
    Merge: mock('Merge'),
    Scissors: mock('Scissors'),
    Layers: mock('Layers'),
    RotateCcw: mock('RotateCcw'),
    FileImage: mock('FileImage'),
    CheckSquare: mock('CheckSquare'),
  };
});

// Mock Fabric.js objects for layers panel tests
const createMockFabricObject = (type: string, overrides?: Record<string, unknown>) => ({
  type,
  visible: true,
  opacity: 1,
  width: 100,
  height: 50,
  left: 0,
  top: 0,
  set: vi.fn(),
  setCoords: vi.fn(),
  getBoundingRect: vi.fn(() => ({ left: 0, top: 0, width: 100, height: 50 })),
  ...overrides,
});

const createMockCanvas = () => {
  const objects: ReturnType<typeof createMockFabricObject>[] = [];
  return {
    getWidth: vi.fn(() => 800),
    getHeight: vi.fn(() => 600),
    getObjects: vi.fn(() => objects),
    getActiveObject: vi.fn(() => null),
    getActiveObjects: vi.fn(() => []),
    setActiveObject: vi.fn(),
    discardActiveObject: vi.fn(),
    add: vi.fn((obj: ReturnType<typeof createMockFabricObject>) => {
      objects.push(obj);
    }),
    remove: vi.fn((obj: ReturnType<typeof createMockFabricObject>) => {
      const idx = objects.indexOf(obj);
      if (idx !== -1) objects.splice(idx, 1);
    }),
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
    forEachObject: vi.fn((fn: (obj: ReturnType<typeof createMockFabricObject>) => void) => {
      objects.forEach(fn);
    }),
    toBlob: vi.fn().mockResolvedValue({ arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)) }),
    freeDrawingBrush: null,
    viewportTransform: [1, 0, 0, 1, 0, 0],
    moveObjectTo: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    dispose: vi.fn(),
    clear: vi.fn(),
    // Store internal objects array for getObjects mock
    _objects: objects,
  };
};

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  useEditorStore.setState(useEditorStore.getInitialState());
});

afterEach(() => {
  vi.clearAllTimers();
});

// ---------------------------------------------------------------------------
// Toolbar integration — tool selection updates store
// ---------------------------------------------------------------------------

describe('Toolbar → Store integration', () => {
  const mockOnOpenFile = vi.fn();

  it('clicking a tool button updates activeTool in store', async () => {
    const user = userEvent.setup();
    render(<EditorToolbar onOpenFile={mockOnOpenFile} />);

    expect(useEditorStore.getState().activeTool).toBe('select');

    await user.click(screen.getByTitle('Rectangle (R)'));
    expect(useEditorStore.getState().activeTool).toBe('rectangle');

    await user.click(screen.getByTitle('Text (T)'));
    expect(useEditorStore.getState().activeTool).toBe('text');

    await user.click(screen.getByTitle('Crop (C)'));
    expect(useEditorStore.getState().activeTool).toBe('crop');

    await user.click(screen.getByTitle('Select (V)'));
    expect(useEditorStore.getState().activeTool).toBe('select');
  });

  it('undo button is disabled when history is empty', () => {
    render(<EditorToolbar onOpenFile={mockOnOpenFile} />);
    const undoBtn = screen.getByTitle('Undo (Ctrl+Z)');
    expect(undoBtn).toBeDisabled();
  });

  it('redo button is disabled when at end of history', () => {
    render(<EditorToolbar onOpenFile={mockOnOpenFile} />);
    const redoBtn = screen.getByTitle('Redo (Ctrl+Shift+Z)');
    expect(redoBtn).toBeDisabled();
  });

  it('open button calls onOpenFile', async () => {
    const user = userEvent.setup();
    render(<EditorToolbar onOpenFile={mockOnOpenFile} />);
    await user.click(screen.getByTitle('Open file (Ctrl+O)'));
    expect(mockOnOpenFile).toHaveBeenCalledTimes(1);
  });

  it('save/export buttons appear only when image is loaded', () => {
    const { rerender } = render(<EditorToolbar onOpenFile={mockOnOpenFile} />);
    expect(screen.queryByText('Save')).not.toBeInTheDocument();
    expect(screen.queryByText('Export')).not.toBeInTheDocument();

    useEditorStore.setState({ imageLoaded: true });
    rerender(<EditorToolbar onOpenFile={mockOnOpenFile} />);
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText('Export')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Text formatting toolbar — appears only in text mode
// ---------------------------------------------------------------------------

describe('Text formatting toolbar', () => {
  const mockOnOpenFile = vi.fn();

  it('does not appear when select tool is active', () => {
    render(<EditorToolbar onOpenFile={mockOnOpenFile} />);
    expect(screen.queryByTitle('Bold (applied to selected text)')).not.toBeInTheDocument();
  });

  it('appears when text tool is active', async () => {
    const user = userEvent.setup();
    render(<EditorToolbar onOpenFile={mockOnOpenFile} />);

    await user.click(screen.getByTitle('Text (T)'));
    expect(useEditorStore.getState().activeTool).toBe('text');

    expect(screen.getByTitle('Bold (applied to selected text)')).toBeInTheDocument();
    expect(screen.getByTitle('Italic (applied to selected text)')).toBeInTheDocument();
    expect(screen.getByTitle('Underline (applied to selected text)')).toBeInTheDocument();
    expect(screen.getByTitle('Font family')).toBeInTheDocument();
    expect(screen.getByTitle('Font size')).toBeInTheDocument();
    expect(screen.getByTitle('Align left')).toBeInTheDocument();
    expect(screen.getByTitle('Align center')).toBeInTheDocument();
    expect(screen.getByTitle('Align right')).toBeInTheDocument();
  });

  it('bold button toggles fontBold in store', async () => {
    const user = userEvent.setup();
    render(<EditorToolbar onOpenFile={mockOnOpenFile} />);

    await user.click(screen.getByTitle('Text (T)'));
    expect(useEditorStore.getState().fontBold).toBe(false);

    await user.click(screen.getByTitle('Bold (applied to selected text)'));
    expect(useEditorStore.getState().fontBold).toBe(true);

    await user.click(screen.getByTitle('Bold (applied to selected text)'));
    expect(useEditorStore.getState().fontBold).toBe(false);
  });

  it('italic button toggles fontItalic in store', async () => {
    const user = userEvent.setup();
    render(<EditorToolbar onOpenFile={mockOnOpenFile} />);

    await user.click(screen.getByTitle('Text (T)'));
    expect(useEditorStore.getState().fontItalic).toBe(false);

    await user.click(screen.getByTitle('Italic (applied to selected text)'));
    expect(useEditorStore.getState().fontItalic).toBe(true);
  });

  it('underline button toggles fontUnderline in store', async () => {
    const user = userEvent.setup();
    render(<EditorToolbar onOpenFile={mockOnOpenFile} />);

    await user.click(screen.getByTitle('Text (T)'));
    expect(useEditorStore.getState().fontUnderline).toBe(false);

    await user.click(screen.getByTitle('Underline (applied to selected text)'));
    expect(useEditorStore.getState().fontUnderline).toBe(true);
  });

  it('alignment buttons update textAlign in store', async () => {
    const user = userEvent.setup();
    render(<EditorToolbar onOpenFile={mockOnOpenFile} />);

    await user.click(screen.getByTitle('Text (T)'));
    expect(useEditorStore.getState().textAlign).toBe('left');

    await user.click(screen.getByTitle('Align center'));
    expect(useEditorStore.getState().textAlign).toBe('center');

    await user.click(screen.getByTitle('Align right'));
    expect(useEditorStore.getState().textAlign).toBe('right');

    await user.click(screen.getByTitle('Align left'));
    expect(useEditorStore.getState().textAlign).toBe('left');
  });

  it('font family select updates fontFamily in store', async () => {
    const user = userEvent.setup();
    render(<EditorToolbar onOpenFile={mockOnOpenFile} />);

    await user.click(screen.getByTitle('Text (T)'));
    const fontSelect = screen.getByTitle('Font family');
    await user.selectOptions(fontSelect, 'Arial');
    expect(useEditorStore.getState().fontFamily).toBe('Arial');

    await user.selectOptions(fontSelect, 'Georgia');
    expect(useEditorStore.getState().fontFamily).toBe('Georgia');
  });

  it('font size input updates fontSize in store', async () => {
    const user = userEvent.setup();
    render(<EditorToolbar onOpenFile={mockOnOpenFile} />);

    await user.click(screen.getByTitle('Text (T)'));
    expect(useEditorStore.getState().activeTool).toBe('text');

    const sizeInput = screen.getByTitle('Font size');
    fireEvent.change(sizeInput, { target: { value: '32' } });
    expect(useEditorStore.getState().fontSize).toBe(32);
  });

  it('disappears when switching away from text tool', async () => {
    const user = userEvent.setup();
    render(<EditorToolbar onOpenFile={mockOnOpenFile} />);

    await user.click(screen.getByTitle('Text (T)'));
    expect(screen.getByTitle('Bold (applied to selected text)')).toBeInTheDocument();

    await user.click(screen.getByTitle('Select (V)'));
    expect(screen.queryByTitle('Bold (applied to selected text)')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Export dialog
// ---------------------------------------------------------------------------

describe('Export dialog', () => {
  const mockOnOpenFile = vi.fn();

  it('opens when Export button is clicked and image is loaded', async () => {
    const user = userEvent.setup();
    useEditorStore.setState({ imageLoaded: true });
    render(<EditorToolbar onOpenFile={mockOnOpenFile} />);

    await user.click(screen.getByText('Export'));
    expect(screen.getByText('Export Image')).toBeInTheDocument();
    expect(screen.getByText('PNG (lossless)')).toBeInTheDocument();
    expect(screen.getByText('JPEG (smaller)')).toBeInTheDocument();
    expect(screen.getByText('WebP (modern)')).toBeInTheDocument();
  });

  it('PNG is selected by default', async () => {
    const user = userEvent.setup();
    useEditorStore.setState({ imageLoaded: true });
    render(<EditorToolbar onOpenFile={mockOnOpenFile} />);

    await user.click(screen.getByText('Export'));
    const pngRadio = screen.getByDisplayValue('png');
    expect(pngRadio).toBeChecked();
  });

  it('can switch format and cancel closes dialog', async () => {
    const user = userEvent.setup();
    useEditorStore.setState({ imageLoaded: true });
    render(<EditorToolbar onOpenFile={mockOnOpenFile} />);

    await user.click(screen.getByText('Export'));
    expect(screen.getByText('Export Image')).toBeInTheDocument();

    await user.click(screen.getByDisplayValue('jpeg'));
    expect(screen.getByDisplayValue('jpeg')).toBeChecked();

    await user.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Export Image')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Resize dialog
// ---------------------------------------------------------------------------

describe('Resize dialog', () => {
  const mockOnOpenFile = vi.fn();

  it('opens when Resize button is clicked', async () => {
    const user = userEvent.setup();
    render(<EditorToolbar onOpenFile={mockOnOpenFile} />);

    await user.click(screen.getByText('Resize'));
    expect(screen.getByText('Resize Canvas')).toBeInTheDocument();
    expect(screen.getByText('Width')).toBeInTheDocument();
    expect(screen.getByText('Height')).toBeInTheDocument();
  });

  it('cancel closes dialog', async () => {
    render(<EditorToolbar onOpenFile={mockOnOpenFile} />);

    fireEvent.click(screen.getByText('Resize'));
    expect(screen.getByText('Resize Canvas')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Resize Canvas')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Crop workflow — shows apply/cancel when crop tool active
// ---------------------------------------------------------------------------

describe('Crop workflow', () => {
  const mockOnOpenFile = vi.fn();

  it('shows Apply Crop and Cancel buttons when crop tool is active', async () => {
    const user = userEvent.setup();
    render(<EditorToolbar onOpenFile={mockOnOpenFile} />);

    await user.click(screen.getByTitle('Crop (C)'));
    expect(useEditorStore.getState().activeTool).toBe('crop');

    expect(screen.getByText('Apply Crop')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('hides color swatches in crop mode', async () => {
    const user = userEvent.setup();
    render(<EditorToolbar onOpenFile={mockOnOpenFile} />);

    expect(screen.getByText('Fill')).toBeInTheDocument();
    expect(screen.getByText('Stroke')).toBeInTheDocument();

    await user.click(screen.getByTitle('Crop (C)'));
    expect(screen.queryByText('Fill')).not.toBeInTheDocument();
    expect(screen.queryByText('Stroke')).not.toBeInTheDocument();
  });

  it('Cancel button switches back to select tool', async () => {
    const user = userEvent.setup();
    render(<EditorToolbar onOpenFile={mockOnOpenFile} />);

    await user.click(screen.getByTitle('Crop (C)'));
    expect(useEditorStore.getState().activeTool).toBe('crop');

    await user.click(screen.getByText('Cancel'));
    expect(useEditorStore.getState().activeTool).toBe('select');
  });

  it('Apply Crop calls applyCrop on the store', async () => {
    const user = userEvent.setup();
    const applyCropSpy = vi.spyOn(useEditorStore.getState(), 'applyCrop');
    render(<EditorToolbar onOpenFile={mockOnOpenFile} />);

    await user.click(screen.getByTitle('Crop (C)'));
    await user.click(screen.getByText('Apply Crop'));

    expect(applyCropSpy).toHaveBeenCalledTimes(1);
    applyCropSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// Filter / Effects / Adjustments popovers
// ---------------------------------------------------------------------------

describe('Filter popover', () => {
  const mockOnOpenFile = vi.fn();

  it('does not appear without image loaded', () => {
    render(<EditorToolbar onOpenFile={mockOnOpenFile} />);
    expect(screen.queryByText('Filter')).not.toBeInTheDocument();
  });

  it('appears when image is loaded and opens popover', async () => {
    const user = userEvent.setup();
    useEditorStore.setState({ imageLoaded: true });
    render(<EditorToolbar onOpenFile={mockOnOpenFile} />);

    await user.click(screen.getByText('Filter'));
    expect(screen.getByText('Blur')).toBeInTheDocument();
    expect(screen.getByText('Sharpen')).toBeInTheDocument();
    expect(screen.getByText('Grayscale')).toBeInTheDocument();
    expect(screen.getByText('Sepia')).toBeInTheDocument();
    expect(screen.getByText('Pixelate')).toBeInTheDocument();
  });
});

describe('Effects popover', () => {
  const mockOnOpenFile = vi.fn();

  it('always renders but is disabled without canvas selection', () => {
    render(<EditorToolbar onOpenFile={mockOnOpenFile} />);
    const effectsBtn = screen.getByText('Effects').closest('button');
    expect(effectsBtn).toBeInTheDocument();
    expect(effectsBtn).toBeDisabled();
  });

  it('opens and shows all effects', async () => {
    const user = userEvent.setup();
    const mockCanvas = createMockCanvas();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockCanvas.getActiveObject as any).mockReturnValue({ type: 'rect' });
    useEditorStore.setState({
      canvas: mockCanvas as unknown as ReturnType<typeof useEditorStore.getState>['canvas'],
    });

    render(<EditorToolbar onOpenFile={mockOnOpenFile} />);

    await user.click(screen.getByText('Effects'));
    expect(screen.getByText('Drop Shadow')).toBeInTheDocument();
    expect(screen.getByText('Glow')).toBeInTheDocument();
    expect(screen.getByText('Outline')).toBeInTheDocument();
    expect(screen.getByText('Remove Shadow')).toBeInTheDocument();
  });
});

describe('Adjustments popover', () => {
  const mockOnOpenFile = vi.fn();

  it('does not appear without image loaded', () => {
    render(<EditorToolbar onOpenFile={mockOnOpenFile} />);
    expect(screen.queryByText('Adjust')).not.toBeInTheDocument();
  });

  it('appears when image loaded and shows sliders', async () => {
    const user = userEvent.setup();
    useEditorStore.setState({ imageLoaded: true });
    render(<EditorToolbar onOpenFile={mockOnOpenFile} />);

    await user.click(screen.getByText('Adjust'));
    expect(screen.getByText('Brightness')).toBeInTheDocument();
    expect(screen.getByText('Contrast')).toBeInTheDocument();
    expect(screen.getByText('Saturation')).toBeInTheDocument();
    expect(screen.getByText('Hue')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Layers panel
// ---------------------------------------------------------------------------

describe('Layers panel', () => {
  it('shows empty state when no canvas', () => {
    render(<LayersPanel />);
    expect(screen.getByText('No layers yet')).toBeInTheDocument();
  });

  it('shows empty state when canvas has no objects', () => {
    const mockCanvas = createMockCanvas();
    useEditorStore.setState({
      canvas: mockCanvas as unknown as ReturnType<typeof useEditorStore.getState>['canvas'],
    });
    render(<LayersPanel />);
    expect(screen.getByText('No layers yet')).toBeInTheDocument();
  });

  it('renders layers when objects exist', () => {
    const mockCanvas = createMockCanvas();
    const obj1 = createMockFabricObject('rect');
    const obj2 = createMockFabricObject('textbox');
    mockCanvas._objects.push(obj1, obj2);
    useEditorStore.setState({
      canvas: mockCanvas as unknown as ReturnType<typeof useEditorStore.getState>['canvas'],
    });

    render(<LayersPanel />);
    expect(screen.getByText('Layers')).toBeInTheDocument();
    expect(screen.getByText(/Rect 1/)).toBeInTheDocument();
    expect(screen.getByText(/Textbox 2/)).toBeInTheDocument();
  });

  it('shows Layers header', () => {
    render(<LayersPanel />);
    expect(screen.getByText('Layers')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Toolbar state synchronization
// ---------------------------------------------------------------------------

describe('Toolbar state synchronization', () => {
  const mockOnOpenFile = vi.fn();

  it('active tool button has default variant styling', async () => {
    render(<EditorToolbar onOpenFile={mockOnOpenFile} />);

    // Select tool should be active by default
    const selectBtn = screen.getByTitle('Select (V)');
    expect(selectBtn).toHaveClass('bg-primary');

    // Other tools should not have the active class
    const rectBtn = screen.getByTitle('Rectangle (R)');
    expect(rectBtn).not.toHaveClass('bg-primary');
  });

  it('active tool changes when clicking different tools', async () => {
    const user = userEvent.setup();
    render(<EditorToolbar onOpenFile={mockOnOpenFile} />);

    await user.click(screen.getByTitle('Ellipse (O)'));
    expect(useEditorStore.getState().activeTool).toBe('ellipse');

    await user.click(screen.getByTitle('Freehand (P)'));
    expect(useEditorStore.getState().activeTool).toBe('freehand');
  });

  it('zoom controls display correct percentage', () => {
    useEditorStore.setState({ zoom: 1.5 });
    render(<EditorToolbar onOpenFile={mockOnOpenFile} />);
    expect(screen.getByText('150%')).toBeInTheDocument();
  });

  it('zoom controls update on store change', () => {
    const { rerender } = render(<EditorToolbar onOpenFile={mockOnOpenFile} />);
    expect(screen.getByText('100%')).toBeInTheDocument();

    useEditorStore.setState({ zoom: 0.5 });
    rerender(<EditorToolbar onOpenFile={mockOnOpenFile} />);
    expect(screen.getByText('50%')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Keyboard shortcut integration (via store)
// ---------------------------------------------------------------------------

describe('Keyboard shortcuts via store', () => {
  beforeEach(() => {
    useEditorStore.setState(useEditorStore.getInitialState());
  });

  it('setActiveTool switches tools correctly', () => {
    const { setActiveTool } = useEditorStore.getState();

    setActiveTool('rectangle');
    expect(useEditorStore.getState().activeTool).toBe('rectangle');

    setActiveTool('text');
    expect(useEditorStore.getState().activeTool).toBe('text');

    setActiveTool('select');
    expect(useEditorStore.getState().activeTool).toBe('select');
  });

  it('setZoom updates zoom level', () => {
    const { setZoom } = useEditorStore.getState();
    setZoom(2.0);
    expect(useEditorStore.getState().zoom).toBe(2.0);
    setZoom(0.5);
    expect(useEditorStore.getState().zoom).toBe(0.5);
  });

  it('pushHistory / undo / redo cycle works with canvas', async () => {
    const mockCanvas = createMockCanvas();
    mockCanvas.toJSON = vi.fn(() => ({ objects: [] }));
    // Make loadFromJSON resolve and trigger the .then() callback
    mockCanvas.loadFromJSON = vi.fn().mockImplementation(() => {
      return {
        then: (cb: () => void) => {
          cb();
          return { catch: () => {} };
        },
        catch: () => {},
      };
    });

    useEditorStore.setState({
      canvas: mockCanvas as unknown as ReturnType<typeof useEditorStore.getState>['canvas'],
    });
    const { pushHistory, undo, redo } = useEditorStore.getState();

    // Initial state
    expect(useEditorStore.getState().history).toEqual([]);
    expect(useEditorStore.getState().historyIndex).toBe(-1);

    // Push first snapshot
    pushHistory();
    expect(useEditorStore.getState().history).toHaveLength(1);
    expect(useEditorStore.getState().historyIndex).toBe(0);

    // Push second snapshot
    mockCanvas.toJSON = vi.fn(() => ({ objects: [{ type: 'rect' }] }));
    pushHistory();
    expect(useEditorStore.getState().history).toHaveLength(2);
    expect(useEditorStore.getState().historyIndex).toBe(1);

    // Undo → back to index 0
    undo();
    // loadFromJSON is called with the first snapshot
    expect(mockCanvas.loadFromJSON).toHaveBeenCalled();
    // historyIndex stays at 0 until promise resolves, but our mock resolves synchronously
    // via .then() callback

    // Redo → back to index 1
    redo();
  });
});

// ---------------------------------------------------------------------------
// Full user workflow simulation
// ---------------------------------------------------------------------------

describe('Full user workflow', () => {
  const mockOnOpenFile = vi.fn();

  it('user can select text tool, toggle bold, then switch to rectangle', async () => {
    const user = userEvent.setup();
    render(<EditorToolbar onOpenFile={mockOnOpenFile} />);

    // Start with select tool
    expect(useEditorStore.getState().activeTool).toBe('select');

    // Switch to text tool
    await user.click(screen.getByTitle('Text (T)'));
    expect(useEditorStore.getState().activeTool).toBe('text');

    // Toggle bold
    await user.click(screen.getByTitle('Bold (applied to selected text)'));
    expect(useEditorStore.getState().fontBold).toBe(true);

    // Toggle italic
    await user.click(screen.getByTitle('Italic (applied to selected text)'));
    expect(useEditorStore.getState().fontItalic).toBe(true);

    // Change alignment
    await user.click(screen.getByTitle('Align center'));
    expect(useEditorStore.getState().textAlign).toBe('center');

    // Switch to rectangle — formatting toolbar should disappear
    await user.click(screen.getByTitle('Rectangle (R)'));
    expect(useEditorStore.getState().activeTool).toBe('rectangle');
    expect(screen.queryByTitle('Bold (applied to selected text)')).not.toBeInTheDocument();

    // Formatting state persists in store even when toolbar is hidden
    expect(useEditorStore.getState().fontBold).toBe(true);
    expect(useEditorStore.getState().fontItalic).toBe(true);
    expect(useEditorStore.getState().textAlign).toBe('center');
  });

  it('crop tool workflow: select crop → Apply Crop → back to select', async () => {
    const applyCropSpy = vi.spyOn(useEditorStore.getState(), 'applyCrop');
    const user = userEvent.setup();
    render(<EditorToolbar onOpenFile={mockOnOpenFile} />);

    // Switch to crop tool
    await user.click(screen.getByTitle('Crop (C)'));
    expect(useEditorStore.getState().activeTool).toBe('crop');

    // Apply Crop button is visible
    expect(screen.getByText('Apply Crop')).toBeInTheDocument();

    // Click Apply Crop
    await user.click(screen.getByText('Apply Crop'));
    expect(applyCropSpy).toHaveBeenCalledTimes(1);

    applyCropSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// Store reset integration
// ---------------------------------------------------------------------------

describe('Store reset', () => {
  it('reset clears canvas-level and view-level state', () => {
    useEditorStore.setState({
      fillColor: '#ff0000',
      strokeColor: '#00ff00',
      strokeWidth: 5,
      fontBold: true,
      fontItalic: true,
      fontUnderline: true,
      textAlign: 'center' as const,
      fontFamily: 'Arial' as const,
      fontSize: 48,
      zoom: 2.5,
      activeTool: 'text' as const,
    });

    useEditorStore.getState().reset();

    const state = useEditorStore.getState();
    // reset() only clears: canvas, activeTool, zoom, history, imageLoaded, imagePath, cropRegion, cropPending
    expect(state.canvas).toBeNull();
    expect(state.activeTool).toBe('select');
    expect(state.zoom).toBe(1);
    expect(state.history).toEqual([]);
    expect(state.historyIndex).toBe(-1);
    expect(state.imageLoaded).toBe(false);
    expect(state.imagePath).toBeNull();
    expect(state.cropRegion).toBeNull();
    expect(state.cropPending).toBe(false);
    // Colors and text formatting are NOT reset by reset()
    expect(state.fillColor).toBe('#ff0000');
    expect(state.fontBold).toBe(true);
  });
});
