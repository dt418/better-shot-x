import { Textbox } from 'fabric';

import type { TextSlice, EditorState, TextFontFamily, TextAlign } from './types';
import { FONT_FAMILY_MAP } from './types';
import type { StateCreator } from 'zustand';

export const createTextSlice: StateCreator<EditorState, [], [], TextSlice> = (set, get) => ({
  fontSize: 24,
  fontBold: false,
  fontItalic: false,
  fontUnderline: false,
  textAlign: 'left',
  fontFamily: 'Inter',

  setFontSize: (size) => set({ fontSize: size }),
  setFontBold: (bold) => set({ fontBold: bold }),
  setFontItalic: (italic) => set({ fontItalic: italic }),
  setFontUnderline: (underline) => set({ fontUnderline: underline }),
  setTextAlign: (align) => set({ textAlign: align }),
  setFontFamily: (family) => set({ fontFamily: family }),

  applyTextFormatting: () => {
    const {
      canvas,
      fontBold,
      fontItalic,
      fontUnderline,
      textAlign,
      fontFamily,
      fontSize,
      pushHistory,
    } = get();
    if (!canvas) return;

    const activeObj = canvas.getActiveObject();
    if (!activeObj || activeObj.type !== 'textbox') return;

    const textbox = activeObj as Textbox;
    textbox.set({
      fontWeight: fontBold ? 'bold' : 'normal',
      fontStyle: fontItalic ? 'italic' : 'normal',
      underline: fontUnderline,
      textAlign,
      fontFamily: fontFamily + ', sans-serif',
      fontSize,
    });
    textbox.dirty = true;
    canvas.renderAll();
    pushHistory();
  },

  syncTextFormattingFromSelection: () => {
    const { canvas } = get();
    if (!canvas) return;

    const activeObj = canvas.getActiveObject();
    if (!activeObj || activeObj.type !== 'textbox') return;

    const textbox = activeObj as Textbox;
    set({
      fontBold: textbox.fontWeight === 'bold',
      fontItalic: textbox.fontStyle === 'italic',
      fontUnderline: textbox.underline === true,
      textAlign: (textbox.textAlign as TextAlign) ?? 'left',
      fontFamily: (FONT_FAMILY_MAP.get(textbox.fontFamily?.split(',')[0]?.trim() ?? '') ??
        'Inter') as TextFontFamily,
      fontSize: textbox.fontSize ?? 24,
    });
  },
});
