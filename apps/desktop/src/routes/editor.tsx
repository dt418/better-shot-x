import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { ActiveSelection } from 'fabric';

import { EditorCanvas } from '@/components/editor/canvas';
import { EditorToolbar } from '@/components/editor/toolbar';
import { LayersPanel } from '@/components/editor/layers-panel';
import { useEditorStore } from '@/stores/editor';

// ---------------------------------------------------------------------------
// Editor page
// ---------------------------------------------------------------------------

export function EditorPage() {
  const { t } = useTranslation();
  const location = useLocation();

  const canvas = useEditorStore((s) => s.canvas);
  const imageLoaded = useEditorStore((s) => s.imageLoaded);
  const imagePath = useEditorStore((s) => s.imagePath);
  const loadImage = useEditorStore((s) => s.loadImage);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const pushHistory = useEditorStore((s) => s.pushHistory);
  const setActiveTool = useEditorStore((s) => s.setActiveTool);
  const saveFile = useEditorStore((s) => s.saveFile);

  // -- Load image from navigation state (e.g. from History page) -------------

  useEffect(() => {
    const state = location.state as { imagePath?: string } | null;
    if (!state?.imagePath || imageLoaded) return;

    const loadFromPath = async (path: string) => {
      try {
        const { readFile } = await import('@tauri-apps/plugin-fs');
        const data = await readFile(path);

        // Convert Uint8Array → data-URL via FileReader (handles large files).
        const blob = new Blob([data]);
        const reader = new FileReader();
        reader.onload = () => {
          void loadImage(reader.result as string, path);
        };
        reader.readAsDataURL(blob);
      } catch (err) {
        toast.error(String(err));
      }
    };

    void loadFromPath(state.imagePath);
  }, [location.state, imageLoaded, loadImage]);

  // -- File open dialog ------------------------------------------------------

  const handleOpenFile = async () => {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const { readFile } = await import('@tauri-apps/plugin-fs');

      const file = await open({
        multiple: false,
        filters: [
          { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'] },
        ],
      });

      if (!file) return;

      const filePath = file as string;
      const data = await readFile(filePath);
      const blob = new Blob([data]);
      const reader = new FileReader();
      reader.onload = () => {
        void loadImage(reader.result as string, filePath);
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      toast.error(String(err));
    }
  };

  // -- Keyboard shortcuts ----------------------------------------------------

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Skip when typing in inputs.
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      // Skip when editing a Fabric.js textbox.
      const activeObj = canvas?.getActiveObject();
      if (activeObj && 'isEditing' in activeObj && (activeObj as { isEditing: boolean }).isEditing) return;

      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (mod && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        redo();
      } else if (mod && e.key === 'y') {
        e.preventDefault();
        redo();
      } else if (mod && e.key === 's' && !e.shiftKey) {
        e.preventDefault();
        void saveFile().catch(() => toast.error('Save failed'));
      } else if (mod && e.key === 'a') {
        e.preventDefault();
        if (canvas && useEditorStore.getState().activeTool === 'select') {
          canvas.discardActiveObject();
          const sel = new ActiveSelection(canvas.getObjects(), { canvas });
          canvas.setActiveObject(sel);
          canvas.renderAll();
        }
      } else if (!mod && !e.shiftKey) {
        switch (e.key.toLowerCase()) {
          case 'v':
            setActiveTool('select');
            break;
          case 'r':
            setActiveTool('rectangle');
            break;
          case 'o':
            setActiveTool('ellipse');
            break;
          case 'l':
            setActiveTool('line');
            break;
          case 'a':
            setActiveTool('arrow');
            break;
          case 't':
            setActiveTool('text');
            break;
          case 'p':
            setActiveTool('freehand');
            break;
          case 'c':
            setActiveTool('crop');
            break;
          case 'h':
            setActiveTool('highlighter');
            break;
          case 'm':
            setActiveTool('marker');
            break;
          case 'enter': {
            const state = useEditorStore.getState();
            if (state.activeTool === 'crop' && state.cropPending) {
              state.applyCrop();
            }
            break;
          }
          case 'escape': {
            const st = useEditorStore.getState();
            if (st.activeTool === 'crop') {
              st.setActiveTool('select');
            }
            break;
          }
          case 'delete':
          case 'backspace': {
            const objects = canvas?.getActiveObjects();
            if (objects && objects.length > 0) {
              objects.forEach((obj: import('fabric').FabricObject) => canvas?.remove(obj));
              canvas?.discardActiveObject();
              canvas?.renderAll();
              pushHistory();
            }
            break;
          }
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [canvas, undo, redo, setActiveTool, pushHistory, saveFile]);

  // -- Zoom display ----------------------------------------------------------

  const zoom = useEditorStore((s) => s.zoom);

  // -- Render ----------------------------------------------------------------

  return (
    <div className="flex h-screen flex-col">
      <EditorToolbar onOpenFile={handleOpenFile} />
      <div className="flex flex-1 overflow-hidden">
        <EditorCanvas />
        <LayersPanel />
      </div>
      <div className="flex items-center justify-between border-t px-3 py-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span>{imageLoaded ? t('editor.ready') : t('editor.openPrompt')}</span>
          {imageLoaded && canvas && (
            <>
              <span className="flex items-center gap-1">
                {Math.round(canvas.getWidth())}×{Math.round(canvas.getHeight())}
              </span>
              {imagePath && (
                <span className="max-w-48 truncate" title={imagePath}>
                  {imagePath.split('/').pop()}
                </span>
              )}
            </>
          )}
        </div>
        <span>{Math.round(zoom * 100)}%</span>
      </div>
    </div>
  );
}
