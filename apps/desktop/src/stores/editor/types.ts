import type { Canvas as FabricCanvas } from 'fabric';

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export type Tool =
  | 'select'
  | 'rectangle'
  | 'ellipse'
  | 'line'
  | 'arrow'
  | 'text'
  | 'freehand'
  | 'crop'
  | 'highlighter'
  | 'marker'
  | 'lasso'
  | 'magicWand';

export type ExportFormat = 'png' | 'jpeg' | 'webp';

export type FilterType = 'blur' | 'sharpen' | 'grayscale' | 'sepia' | 'pixelate';
export type EffectType = 'dropShadow' | 'glow' | 'outline' | 'removeShadow';
export type AdjustmentType = 'brightness' | 'contrast' | 'saturation' | 'hue';
// Selection slice
export type SelectionMode = 'rectangle' | 'lasso' | 'magicWand';
export interface SelectionSlice {
  selectionMode: SelectionMode;
  magicWandTolerance: number;
  setSelectionMode: (mode: SelectionMode) => void;
  setMagicWandTolerance: (tolerance: number) => void;
  selectByColor: (color: string, tolerance?: number) => void;
}

// Path operation slice
export type PathOperation = 'union' | 'intersect' | 'subtract';
export interface PathOperationSlice {
  applyPathOperation: (operation: PathOperation) => void;
}

// Free transform slice
export type TransformMode = 'skewX' | 'skewY';
export interface FreeTransformSlice {
  transformMode: TransformMode | null;
  skewAmount: number;
  setTransformMode: (mode: TransformMode | null) => void;
  setSkewAmount: (amount: number) => void;
  applySkew: (axis: 'x' | 'y', amount: number) => void;
  resetTransform: () => void;
}

// Batch slice
export interface BatchItem {
  id: string;
  name: string;
  path: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  outputPath?: string;
}
export interface BatchSlice {
  batchItems: BatchItem[];
  batchProcessing: boolean;
  batchProgress: { done: number; total: number };
  addBatchItems: (items: Omit<BatchItem, 'status'>[]) => void;
  removeBatchItem: (id: string) => void;
  clearBatchItems: () => void;
  processBatch: (operation: 'export', options: { format: ExportFormat }) => Promise<void>;
}
export type TextAlign = 'left' | 'center' | 'right';
export type TextFontFamily = 'Inter' | 'Arial' | 'Georgia' | 'Courier New' | 'Impact' | 'Comic Sans MS';

export interface CropRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Map from raw fontFamily string → our TextFontFamily enum. */
export const FONT_FAMILY_MAP = new Map<string, TextFontFamily>([
  ['Inter', 'Inter'],
  ['Arial', 'Arial'],
  ['Georgia', 'Georgia'],
  ['Courier New', 'Courier New'],
  ['Courier', 'Courier New'],
  ['Impact', 'Impact'],
  ['Comic Sans MS', 'Comic Sans MS'],
  ['Comic Sans', 'Comic Sans MS'],
]);

// ---------------------------------------------------------------------------
// Slice interfaces
// ---------------------------------------------------------------------------

export interface CanvasSlice {
  canvas: FabricCanvas | null;
  activeTool: Tool;
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;

  setCanvas: (canvas: FabricCanvas) => void;
  setActiveTool: (tool: Tool) => void;
  setFillColor: (color: string) => void;
  setStrokeColor: (color: string) => void;
  setStrokeWidth: (width: number) => void;
}

export interface TextSlice {
  fontSize: number;
  fontBold: boolean;
  fontItalic: boolean;
  fontUnderline: boolean;
  textAlign: TextAlign;
  fontFamily: TextFontFamily;

  setFontSize: (size: number) => void;
  setFontBold: (bold: boolean) => void;
  setFontItalic: (italic: boolean) => void;
  setFontUnderline: (underline: boolean) => void;
  setTextAlign: (align: TextAlign) => void;
  setFontFamily: (family: TextFontFamily) => void;
  applyTextFormatting: () => void;
  syncTextFormattingFromSelection: () => void;
}

export interface ViewSlice {
  zoom: number;
  history: string[];
  historyIndex: number;

  setZoom: (zoom: number) => void;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
}

export interface ImageSlice {
  imageLoaded: boolean;
  imagePath: string | null;

  loadImage: (dataUrl: string, path: string) => Promise<void>;
  saveFile: () => Promise<void>;
  exportFile: (format?: ExportFormat) => Promise<void>;
}

export interface CropSlice {
  cropRegion: CropRegion | null;
  cropPending: boolean;

  setCropRegion: (region: CropRegion | null) => void;
  setCropPending: (pending: boolean) => void;
  applyCrop: () => void;
}

export interface FilterSlice {
  applyFilter: (filterType: FilterType, intensity?: number) => void;
}

export interface EffectsSlice {
  applyEffect: (effectType: EffectType, options?: Record<string, number>) => void;
}

export interface AdjustmentSlice {
  applyAdjustment: (adjustmentType: AdjustmentType, value: number) => void;
}

export interface MultiSelectSlice {
  alignSelected: (direction: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
  groupSelected: () => void;
  deleteSelected: () => void;
}

export interface ResizeSlice {
  resizeCanvas: (width: number, height: number, scaleContent?: boolean) => void;
}

export interface ResetSlice {
  reset: () => void;
}

export interface AnnotationTemplate {
  id: string;
  name: string;
  createdAt: string;
  canvasJSON: string;
  objectCount: number;
  thumbnail?: string;
}

export interface TemplateSlice {
  templates: AnnotationTemplate[];
  loadTemplates: () => void;
  saveTemplate: (name: string) => AnnotationTemplate | null;
  deleteTemplate: (id: string) => void;
  applyTemplate: (id: string) => void;
}

// ---------------------------------------------------------------------------
// Combined state
// ---------------------------------------------------------------------------

export type EditorState = CanvasSlice &
  TextSlice &
  ViewSlice &
  ImageSlice &
  CropSlice &
  FilterSlice &
  EffectsSlice &
  AdjustmentSlice &
  MultiSelectSlice &
  ResizeSlice &
  ResetSlice &
  TemplateSlice &
  SelectionSlice &
  PathOperationSlice &
  FreeTransformSlice &
  BatchSlice;
