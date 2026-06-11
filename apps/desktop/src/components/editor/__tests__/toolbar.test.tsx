import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EditorToolbar } from '../toolbar';
import { useEditorStore } from '@/stores/editor';

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
    Type: mock('Type'),
    Underline: mock('Underline'),
    Undo2: mock('Undo2'),
    ZoomIn: mock('ZoomIn'),
    ZoomOut: mock('ZoomOut'),
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

describe('EditorToolbar', () => {
  const mockOnOpenFile = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useEditorStore.setState(useEditorStore.getInitialState());
  });

  it('renders file open button', () => {
    render(<EditorToolbar onOpenFile={mockOnOpenFile} />);
    expect(screen.getByText('Open')).toBeInTheDocument();
  });

  it('renders tool buttons', () => {
    render(<EditorToolbar onOpenFile={mockOnOpenFile} />);
    expect(screen.getByTitle('Select (V)')).toBeInTheDocument();
    expect(screen.getByTitle('Rectangle (R)')).toBeInTheDocument();
    expect(screen.getByTitle('Ellipse (O)')).toBeInTheDocument();
    expect(screen.getByTitle('Line (L)')).toBeInTheDocument();
    expect(screen.getByTitle('Arrow (A)')).toBeInTheDocument();
    expect(screen.getByTitle('Text (T)')).toBeInTheDocument();
    expect(screen.getByTitle('Freehand (P)')).toBeInTheDocument();
    expect(screen.getByTitle('Crop (C)')).toBeInTheDocument();
    expect(screen.getByTitle('Highlighter (H)')).toBeInTheDocument();
    expect(screen.getByTitle('Marker (M)')).toBeInTheDocument();
  });

  it('renders color swatches', () => {
    render(<EditorToolbar onOpenFile={mockOnOpenFile} />);
    expect(screen.getByText('Fill')).toBeInTheDocument();
    expect(screen.getByText('Stroke')).toBeInTheDocument();
  });

  it('renders undo/redo buttons', () => {
    render(<EditorToolbar onOpenFile={mockOnOpenFile} />);
    expect(screen.getByTitle('Undo (Ctrl+Z)')).toBeInTheDocument();
    expect(screen.getByTitle('Redo (Ctrl+Shift+Z)')).toBeInTheDocument();
  });

  it('renders zoom controls', () => {
    render(<EditorToolbar onOpenFile={mockOnOpenFile} />);
    expect(screen.getByTitle('Zoom out')).toBeInTheDocument();
    expect(screen.getByTitle('Zoom in')).toBeInTheDocument();
    expect(screen.getByTitle('Reset zoom (100 %)')).toBeInTheDocument();
  });

  it('renders filter button when image loaded', () => {
    useEditorStore.setState({ imageLoaded: true });
    render(<EditorToolbar onOpenFile={mockOnOpenFile} />);
    expect(screen.getByText('Filter')).toBeInTheDocument();
  });

  it('renders effects button', () => {
    render(<EditorToolbar onOpenFile={mockOnOpenFile} />);
    expect(screen.getByText('Effects')).toBeInTheDocument();
  });

  it('renders adjustments button when image loaded', () => {
    useEditorStore.setState({ imageLoaded: true });
    render(<EditorToolbar onOpenFile={mockOnOpenFile} />);
    expect(screen.getByText('Adjust')).toBeInTheDocument();
  });

  it('does not show save/export when no image loaded', () => {
    render(<EditorToolbar onOpenFile={mockOnOpenFile} />);
    expect(screen.queryByText('Save')).not.toBeInTheDocument();
    expect(screen.queryByText('Export')).not.toBeInTheDocument();
  });

  it('shows save/export when image is loaded', () => {
    useEditorStore.setState({ imageLoaded: true });
    render(<EditorToolbar onOpenFile={mockOnOpenFile} />);
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText('Export')).toBeInTheDocument();
  });

  it('renders resize button', () => {
    render(<EditorToolbar onOpenFile={mockOnOpenFile} />);
    expect(screen.getByText('Resize')).toBeInTheDocument();
  });
});
