import type { TemplateSlice, EditorState, AnnotationTemplate } from './types';
import type { StateCreator } from 'zustand';

const STORAGE_KEY = 'better-shot-templates';

function generateId(): string {
  return `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function loadFromStorage(): AnnotationTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as AnnotationTemplate[];
  } catch {
    return [];
  }
}

function saveToStorage(templates: AnnotationTemplate[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

export const createTemplateSlice: StateCreator<EditorState, [], [], TemplateSlice> = (set, get) => ({
  templates: [],

  loadTemplates: () => {
    set({ templates: loadFromStorage() });
  },

  saveTemplate: (name: string) => {
    const { canvas } = get();
    if (!canvas) return null;

    const canvasJSON = JSON.stringify(canvas.toJSON());
    const objectCount = canvas.getObjects().length;

    const template: AnnotationTemplate = {
      id: generateId(),
      name,
      createdAt: new Date().toISOString(),
      canvasJSON,
      objectCount,
    };

    const templates = [...get().templates, template];
    saveToStorage(templates);
    set({ templates });

    return template;
  },

  deleteTemplate: (id: string) => {
    const templates = get().templates.filter((t) => t.id !== id);
    saveToStorage(templates);
    set({ templates });
  },

  applyTemplate: (id: string) => {
    const { canvas } = get();
    if (!canvas) return;

    const template = get().templates.find((t) => t.id === id);
    if (!template) return;

    void canvas.loadFromJSON(template.canvasJSON).then(() => {
      canvas.renderAll();
      get().pushHistory();
    }).catch(console.error);
  },
});
