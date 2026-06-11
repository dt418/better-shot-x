import { create } from 'zustand';

import type { EditorState } from './types';
import { createCanvasSlice } from './canvas-slice';
import { createTextSlice } from './text-slice';
import { createViewSlice } from './view-slice';
import { createImageSlice } from './image-slice';
import { createCropSlice } from './crop-slice';
import { createFilterSlice } from './filter-slice';
import { createResizeSlice } from './resize-slice';
import { createResetSlice } from './reset-slice';

// Re-export types so consumers only need to import from '@/stores/editor'
export type {
  Tool,
  FilterType,
  ExportFormat,
  TextAlign,
  TextFontFamily,
  CropRegion,
  EditorState,
  CanvasSlice,
  TextSlice,
  ViewSlice,
  ImageSlice,
  CropSlice,
  FilterSlice,
  ResizeSlice,
  ResetSlice,
} from './types';

export const useEditorStore = create<EditorState>()((...a) => ({
  ...createCanvasSlice(...a),
  ...createTextSlice(...a),
  ...createViewSlice(...a),
  ...createImageSlice(...a),
  ...createCropSlice(...a),
  ...createFilterSlice(...a),
  ...createResizeSlice(...a),
  ...createResetSlice(...a),
}));
