import { create } from 'zustand';

import type { EditorState } from './types';
import { createCanvasSlice } from './canvas-slice';
import { createTextSlice } from './text-slice';
import { createViewSlice } from './view-slice';
import { createImageSlice } from './image-slice';
import { createCropSlice } from './crop-slice';
import { createFilterSlice } from './filter-slice';
import { createEffectsSlice } from './effects-slice';
import { createAdjustmentSlice } from './adjustment-slice';
import { createMultiSelectSlice } from './multi-select-slice';
import { createResizeSlice } from './resize-slice';
import { createResetSlice } from './reset-slice';
import { createTemplateSlice } from './template-slice';

// Re-export types so consumers only need to import from '@/stores/editor'
export type {
  Tool,
  FilterType,
  EffectType,
  AdjustmentType,
  ExportFormat,
  TextAlign,
  TextFontFamily,
  CropRegion,
  EditorState,
  AnnotationTemplate,
  CanvasSlice,
  TextSlice,
  ViewSlice,
  ImageSlice,
  CropSlice,
  FilterSlice,
  EffectsSlice,
  AdjustmentSlice,
  MultiSelectSlice,
  ResizeSlice,
  ResetSlice,
  TemplateSlice,
} from './types';

export const useEditorStore = create<EditorState>()((...a) => ({
  ...createCanvasSlice(...a),
  ...createTextSlice(...a),
  ...createViewSlice(...a),
  ...createImageSlice(...a),
  ...createCropSlice(...a),
  ...createFilterSlice(...a),
  ...createEffectsSlice(...a),
  ...createAdjustmentSlice(...a),
  ...createMultiSelectSlice(...a),
  ...createResizeSlice(...a),
  ...createResetSlice(...a),
  ...createTemplateSlice(...a),
}));
