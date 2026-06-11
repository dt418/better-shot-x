import { useEffect, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowRight,
  Bold,
  Circle,
  Crop,
  Download,
  FolderOpen,
  Highlighter,
  Italic,
  Link,
  Minus,
  MousePointer2,
  Pencil,
  Redo2,
  Save,
  Square,
  Sparkles,
  Stamp,
  Trash2,
  Type,
  Underline,
  Undo2,
  ZoomIn,
  ZoomOut,
  Wand2,
  Lasso,
  Merge,
  Scissors,
  Layers,
  RotateCcw,
  FileImage,
  CheckSquare,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useEditorStore, type Tool, type FilterType, type EffectType, type AdjustmentType, type ExportFormat, type TextAlign, type TextFontFamily } from '@/stores/editor';

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

const TOOLS: { id: Tool; icon: LucideIcon; label: string; shortcut: string }[] = [
  { id: 'select', icon: MousePointer2, label: 'Select', shortcut: 'V' },
  { id: 'lasso', icon: Lasso, label: 'Lasso Select', shortcut: 'Q' },
  { id: 'magicWand', icon: Wand2, label: 'Magic Wand', shortcut: 'W' },
  { id: 'rectangle', icon: Square, label: 'Rectangle', shortcut: 'R' },
  { id: 'ellipse', icon: Circle, label: 'Ellipse', shortcut: 'O' },
  { id: 'line', icon: Minus, label: 'Line', shortcut: 'L' },
  { id: 'arrow', icon: ArrowRight, label: 'Arrow', shortcut: 'A' },
  { id: 'text', icon: Type, label: 'Text', shortcut: 'T' },
  { id: 'freehand', icon: Pencil, label: 'Freehand', shortcut: 'P' },
  { id: 'highlighter', icon: Highlighter, label: 'Highlighter', shortcut: 'H' },
  { id: 'marker', icon: Stamp, label: 'Marker', shortcut: 'M' },
  { id: 'crop', icon: Crop, label: 'Crop', shortcut: 'C' },
];

const STROKE_WIDTHS = [1, 2, 3, 4, 6, 8];

const FILTERS: { id: FilterType; label: string }[] = [
  { id: 'blur', label: 'Blur' },
  { id: 'sharpen', label: 'Sharpen' },
  { id: 'grayscale', label: 'Grayscale' },
  { id: 'sepia', label: 'Sepia' },
  { id: 'pixelate', label: 'Pixelate' },
];

const FONT_FAMILIES: { id: TextFontFamily; label: string }[] = [
  { id: 'Inter', label: 'Inter' },
  { id: 'Arial', label: 'Arial' },
  { id: 'Georgia', label: 'Georgia' },
  { id: 'Courier New', label: 'Courier New' },
  { id: 'Impact', label: 'Impact' },
  { id: 'Comic Sans MS', label: 'Comic Sans MS' },
];

const TEXT_ALIGNMENTS: { id: TextAlign; icon: LucideIcon; label: string }[] = [
  { id: 'left', icon: AlignLeft, label: 'Align left' },
  { id: 'center', icon: AlignCenter, label: 'Align center' },
  { id: 'right', icon: AlignRight, label: 'Align right' },
];

const EFFECTS: { id: EffectType; label: string }[] = [
  { id: 'dropShadow', label: 'Drop Shadow' },
  { id: 'glow', label: 'Glow' },
  { id: 'outline', label: 'Outline' },
  { id: 'removeShadow', label: 'Remove Shadow' },
];

const ADJUSTMENTS: { id: AdjustmentType; label: string; min: number; max: number; step: number }[] = [
  { id: 'brightness', label: 'Brightness', min: -1, max: 1, step: 0.05 },
  { id: 'contrast', label: 'Contrast', min: -1, max: 1, step: 0.05 },
  { id: 'saturation', label: 'Saturation', min: -1, max: 1, step: 0.05 },
  { id: 'hue', label: 'Hue', min: -1, max: 1, step: 0.05 },
];

const EXPORT_FORMATS: { id: ExportFormat; label: string; ext: string }[] = [
  { id: 'png', label: 'PNG (lossless)', ext: 'png' },
  { id: 'jpeg', label: 'JPEG (smaller)', ext: 'jpg' },
  { id: 'webp', label: 'WebP (modern)', ext: 'webp' },
];

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function Divider() {
  return <div className="mx-1 h-6 w-px bg-border" />;
}

function ColorSwatch({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (c: string) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-1.5" title={label}>
      <span className="text-muted-foreground select-none text-xs">{label}</span>
      <span className="relative">
        <span
          className="block h-5 w-5 rounded border border-border"
          style={{ backgroundColor: value }}
        />
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </span>
    </label>
  );
}

// ---------------------------------------------------------------------------
// Selection tools popover (lasso, magic wand)
// ---------------------------------------------------------------------------

function SelectionToolsPopover() {
  const [open, setOpen] = useState(false);
  const selectionMode = useEditorStore((s) => s.selectionMode);
  const setSelectionMode = useEditorStore((s) => s.setSelectionMode);
  const magicWandTolerance = useEditorStore((s) => s.magicWandTolerance);
  const setMagicWandTolerance = useEditorStore((s) => s.setMagicWandTolerance);

  const isSelectionTool = useEditorStore((s) => s.activeTool === 'lasso' || s.activeTool === 'magicWand');

  if (!isSelectionTool) return null;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 px-2"
          title="Selection options"
        >
          <MousePointer2 className="h-4 w-4" />
          <span className="text-xs">Select</span>
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={4}
          className="w-48 rounded-md border bg-popover p-2 shadow-md"
        >
          <div className="mb-2 text-xs font-medium">Selection Mode</div>
          <div className="flex gap-1">
            <Button
              variant={selectionMode === 'rectangle' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setSelectionMode('rectangle')}
            >
              Rectangle
            </Button>
            <Button
              variant={selectionMode === 'lasso' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setSelectionMode('lasso')}
            >
              Lasso
            </Button>
            <Button
              variant={selectionMode === 'magicWand' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setSelectionMode('magicWand')}
            >
              Magic Wand
            </Button>
          </div>

          {selectionMode === 'magicWand' && (
            <div className="mt-2">
              <label className="text-muted-foreground mb-1 block text-xs">
                Tolerance: {magicWandTolerance}
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={magicWandTolerance}
                onChange={(e) => setMagicWandTolerance(Number(e.target.value))}
                className="w-full"
              />
            </div>
          )}
          <Popover.Arrow className="fill-popover" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

// ---------------------------------------------------------------------------
// Path operations popover
// ---------------------------------------------------------------------------

function PathOperationsPopover() {
  const [open, setOpen] = useState(false);
  const applyPathOperation = useEditorStore((s) => s.applyPathOperation);
  const canvas = useEditorStore((s) => s.canvas);
  const hasSelection = canvas?.getActiveObject() != null;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 px-2"
          title="Path operations"
          disabled={!hasSelection}
        >
          <Merge className="h-4 w-4" />
          <span className="text-xs">Path</span>
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={4}
          className="w-40 rounded-md border bg-popover p-1 shadow-md"
        >
          <button
            className="hover:bg-accent flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm"
            onClick={() => {
              applyPathOperation('union');
              setOpen(false);
            }}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Union</span>
          </button>
          <button
            className="hover:bg-accent flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm"
            onClick={() => {
              applyPathOperation('intersect');
              setOpen(false);
            }}
          >
            <CheckSquare className="h-3.5 w-3.5" />
            <span>Intersect</span>
          </button>
          <button
            className="hover:bg-accent flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm"
            onClick={() => {
              applyPathOperation('subtract');
              setOpen(false);
            }}
          >
            <Scissors className="h-3.5 w-3.5" />
            <span>Subtract</span>
          </button>
          <Popover.Arrow className="fill-popover" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

// ---------------------------------------------------------------------------
// Free transform popover
// ---------------------------------------------------------------------------

function FreeTransformPopover() {
  const [open, setOpen] = useState(false);
  const transformMode = useEditorStore((s) => s.transformMode);
  const setTransformMode = useEditorStore((s) => s.setTransformMode);
  const skewAmount = useEditorStore((s) => s.skewAmount);
  const setSkewAmount = useEditorStore((s) => s.setSkewAmount);
  const resetTransform = useEditorStore((s) => s.resetTransform);
  const canvas = useEditorStore((s) => s.canvas);
  const hasSelection = canvas?.getActiveObject() != null;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 px-2"
          title="Transform"
          disabled={!hasSelection}
        >
          <RotateCcw className="h-4 w-4" />
          <span className="text-xs">Transform</span>
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={4}
          className="w-52 rounded-md border bg-popover p-3 shadow-md"
        >
          <div className="mb-2 text-xs font-medium">Transform Mode</div>
          <div className="flex flex-wrap gap-1">
            <Button
              variant={transformMode === 'skewX' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setTransformMode('skewX')}
            >
              Skew X
            </Button>
            <Button
              variant={transformMode === 'skewY' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setTransformMode('skewY')}
            >
              Skew Y
            </Button>
          </div>

          {transformMode && (
            <div className="mt-2">
              <label className="text-muted-foreground mb-1 block text-xs">
                Amount: {skewAmount.toFixed(1)}
              </label>
              <input
                type="range"
                min={-100}
                max={100}
                value={skewAmount}
                onChange={(e) => setSkewAmount(Number(e.target.value))}
                className="w-full"
              />
            </div>
          )}

          <div className="mt-2 flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={resetTransform}
            >
              Reset
            </Button>
          </div>
          <Popover.Arrow className="fill-popover" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

// ---------------------------------------------------------------------------
// Batch processing dialog
// ---------------------------------------------------------------------------

function BatchDialog({ onClose }: { onClose: () => void }) {
  const batchItems = useEditorStore((s) => s.batchItems);
  const addBatchItems = useEditorStore((s) => s.addBatchItems);
  const removeBatchItem = useEditorStore((s) => s.removeBatchItem);
  const clearBatchItems = useEditorStore((s) => s.clearBatchItems);
  const processBatch = useEditorStore((s) => s.processBatch);
  const batchProcessing = useEditorStore((s) => s.batchProcessing);
  const batchProgress = useEditorStore((s) => s.batchProgress);
  const [format, setFormat] = useState<ExportFormat>('png');

  const handleAddFiles = async () => {
    // In a real implementation, this would open a file dialog
    // For now, we'll use the Tauri open dialog
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const files = await open({
        multiple: true,
        filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif'] }],
      });

      if (files) {
        const paths = Array.isArray(files) ? files : [files];
        addBatchItems(
          paths.map((path) => ({
            id: crypto.randomUUID(),
            name: path.split('/').pop() ?? path,
            path,
          })),
        );
      }
    } catch {
      console.error('Failed to open file dialog');
    }
  };

  const handleProcess = async () => {      await processBatch({ format });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-background rounded-lg border p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-4 text-lg font-semibold">Batch Processing</h3>

        <div className="mb-4">
          <Button variant="outline" size="sm" onClick={handleAddFiles}>
            <FileImage className="mr-2 h-4 w-4" />
            Add Files
          </Button>
          {batchItems.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearBatchItems} className="ml-2">
              Clear All
            </Button>
          )}
        </div>

        {/* Format selection */}
        <div className="mb-4">
          <label className="text-muted-foreground mb-2 block text-xs font-medium">Export Format</label>
          <div className="flex gap-2">
            {EXPORT_FORMATS.map((f) => (
              <Button
                key={f.id}
                variant={format === f.id ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setFormat(f.id)}
              >
                {f.label}
              </Button>
            ))}
          </div>
        </div>

        {/* File list */}
        {batchItems.length > 0 && (
          <div className="mb-4 max-h-48 overflow-y-auto">
            <div className="text-muted-foreground mb-2 text-xs">
              {batchItems.length} file(s) queued
            </div>
            {batchItems.map((item) => (
              <div key={item.id} className="flex items-center gap-2 py-1 text-sm">
                <span className="min-w-0 flex-1 truncate">{item.name}</span>
                <span className={`text-xs ${
                  item.status === 'done' ? 'text-green-500' :
                  item.status === 'error' ? 'text-red-500' :
                  item.status === 'processing' ? 'text-yellow-500' :
                  'text-muted-foreground'
                }`}>
                  {item.status}
                </span>
                <button
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => removeBatchItem(item.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Progress */}
        {batchProcessing && (
          <div className="mb-4">
            <div className="text-muted-foreground text-xs">
              Processing {batchProgress.done} of {batchProgress.total}...
            </div>
            <div className="bg-muted mt-1 h-2 rounded-full">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${(batchProgress.done / batchProgress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            size="sm"
            onClick={handleProcess}
            disabled={batchItems.length === 0 || batchProcessing}
          >
            {batchProcessing ? 'Processing...' : 'Process Batch'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Filter popover
// ---------------------------------------------------------------------------

function FilterPopover() {
  const [open, setOpen] = useState(false);
  const applyFilter = useEditorStore((s) => s.applyFilter);
  const imageLoaded = useEditorStore((s) => s.imageLoaded);

  if (!imageLoaded) return null;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 px-2"
          title="Apply filter"
        >
          <Sparkles className="h-4 w-4" />
          <span className="text-xs">Filter</span>
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={4}
          className="w-40 rounded-md border bg-popover p-1 shadow-md"
        >
          {FILTERS.map((f) => (
            <button
              key={f.id}
              className="hover:bg-accent w-full rounded-sm px-2 py-1.5 text-left text-sm"
              onClick={() => {
                applyFilter(f.id);
                setOpen(false);
              }}
            >
              {f.label}
            </button>
          ))}
          <Popover.Arrow className="fill-popover" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function EffectsPopover() {
  const [open, setOpen] = useState(false);
  const applyEffect = useEditorStore((s) => s.applyEffect);
  const canvas = useEditorStore((s) => s.canvas);
  const hasSelection = canvas?.getActiveObject() != null;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 px-2"
          title="Apply effect"
          disabled={!hasSelection}
        >
          <Sparkles className="h-4 w-4" />
          <span className="text-xs">Effects</span>
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={4}
          className="w-40 rounded-md border bg-popover p-1 shadow-md"
        >
          {EFFECTS.map((e) => (
            <button
              key={e.id}
              className="hover:bg-accent w-full rounded-sm px-2 py-1.5 text-left text-sm"
              onClick={() => {
                applyEffect(e.id);
                setOpen(false);
              }}
            >
              {e.label}
            </button>
          ))}
          <Popover.Arrow className="fill-popover" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

// ---------------------------------------------------------------------------
// Template manager
// ---------------------------------------------------------------------------

function SaveTemplateDialog({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const saveTemplate = useEditorStore((s) => s.saveTemplate);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    saveTemplate(trimmed);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-background rounded-lg border p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-4 text-lg font-semibold">Save as Template</h3>
        <p className="text-muted-foreground mb-3 text-sm">
          Save the current canvas annotations as a reusable template.
        </p>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Template name"
          className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') onClose();
          }}
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={!name.trim()}>Save</Button>
        </div>
      </div>
    </div>
  );
}

function TemplateManagerPopover() {
  const [open, setOpen] = useState(false);
  const [showSave, setShowSave] = useState(false);
  const canvas = useEditorStore((s) => s.canvas);
  const templates = useEditorStore((s) => s.templates);
  const loadTemplates = useEditorStore((s) => s.loadTemplates);
  const deleteTemplate = useEditorStore((s) => s.deleteTemplate);
  const applyTemplate = useEditorStore((s) => s.applyTemplate);
  const objectCount = canvas?.getObjects().length ?? 0;

  // Load templates from storage on first open
  useEffect(() => {
    if (open) loadTemplates();
  }, [open, loadTemplates]);

  return (
    <>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 px-2"
            title="Templates"
          >
            <Sparkles className="h-4 w-4" />
            <span className="text-xs">Templates</span>
          </Button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="start"
            sideOffset={4}
            className="w-64 rounded-md border bg-popover p-2 shadow-md"
          >
            {/* Save button */}
            <button
              className="hover:bg-accent flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm"
              onClick={() => {
                setOpen(false);
                setShowSave(true);
              }}
              disabled={objectCount === 0}
            >
              <Save className="h-3.5 w-3.5" />
              <span>Save as Template</span>
              <span className="text-muted-foreground ml-auto text-xs">{objectCount} objects</span>
            </button>

            {/* Divider */}
            {templates.length > 0 && <div className="my-1 h-px bg-border" />}

            {/* Saved templates */}
            {templates.length === 0 ? (
              <div className="text-muted-foreground px-2 py-3 text-center text-xs">
                No templates saved yet
              </div>
            ) : (
              templates.map((t) => (
                <div
                  key={t.id}
                  className="hover:bg-accent flex items-center gap-2 rounded-sm px-2 py-1.5"
                >
                  <button
                    className="min-w-0 flex-1 truncate text-left text-sm"
                    onClick={() => {
                      applyTemplate(t.id);
                      setOpen(false);
                    }}
                    title={`Load "${t.name}"`}
                  >
                    <span className="font-medium">{t.name}</span>
                    <span className="text-muted-foreground ml-1.5 text-xs">{t.objectCount} objects</span>
                  </button>
                  <button
                    className="text-muted-foreground hover:text-destructive shrink-0 p-0.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteTemplate(t.id);
                    }}
                    title={`Delete "${t.name}"`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))
            )}
            <Popover.Arrow className="fill-popover" />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      {showSave && <SaveTemplateDialog onClose={() => setShowSave(false)} />}
    </>
  );
}

function AdjustmentsPopover() {
  const [open, setOpen] = useState(false);
  const applyAdjustment = useEditorStore((s) => s.applyAdjustment);
  const imageLoaded = useEditorStore((s) => s.imageLoaded);

  if (!imageLoaded) return null;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 px-2"
          title="Adjust image"
        >
          <Sparkles className="h-4 w-4" />
          <span className="text-xs">Adjust</span>
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={4}
          className="w-52 rounded-md border bg-popover p-3 shadow-md"
        >
          {ADJUSTMENTS.map((a) => (
            <div key={a.id} className="mb-2">
              <label className="text-muted-foreground mb-1 block text-xs font-medium">
                {a.label}
              </label>
              <input
                type="range"
                min={a.min}
                max={a.max}
                step={a.step}
                defaultValue={0}
                onChange={(e) => applyAdjustment(a.id, Number(e.target.value))}
                className="w-full"
              />
            </div>
          ))}
          <button
            className="text-muted-foreground hover:text-foreground mt-1 w-full text-center text-xs"
            onClick={() => setOpen(false)}
          >
            Done
          </button>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

// ---------------------------------------------------------------------------
// Export dialog
// ---------------------------------------------------------------------------

function ExportDialog({ onClose }: { onClose: () => void }) {
  const exportFile = useEditorStore((s) => s.exportFile);
  const [format, setFormat] = useState<ExportFormat>('png');
  const [exporting, setExporting] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportFile(format);
      onClose();
    } catch {
      // Error handled by store
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-background rounded-lg border p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-lg font-semibold">Export Image</h3>
        <div className="flex flex-col gap-2">
          {EXPORT_FORMATS.map((f) => (
            <label
              key={f.id}
              className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 transition-colors ${
                format === f.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:bg-muted'
              }`}
            >
              <input
                type="radio"
                name="export-format"
                value={f.id}
                checked={format === f.id}
                onChange={() => setFormat(f.id)}
                className="accent-primary"
              />
              <div>
                <span className="text-sm font-medium">{f.label}</span>
                <span className="text-muted-foreground ml-2 text-xs">.{f.ext}</span>
              </div>
            </label>
          ))}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={() => void handleExport()} disabled={exporting}>
            {exporting ? 'Exporting…' : 'Export'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Resize dialog
// ---------------------------------------------------------------------------

function ResizeDialog({ onClose }: { onClose: () => void }) {
  const canvas = useEditorStore((s) => s.canvas);
  const resizeCanvas = useEditorStore((s) => s.resizeCanvas);
  const [width, setWidth] = useState(canvas?.getWidth() ?? 800);
  const [height, setHeight] = useState(canvas?.getHeight() ?? 600);
  const [lockRatio, setLockRatio] = useState(true);

  const aspectRatio = (canvas?.getWidth() ?? 800) / (canvas?.getHeight() ?? 600);

  const handleWidthChange = (w: number) => {
    setWidth(w);
    if (lockRatio) setHeight(Math.round(w / aspectRatio));
  };

  const handleHeightChange = (h: number) => {
    setHeight(h);
    if (lockRatio) setWidth(Math.round(h * aspectRatio));
  };

  const handleResize = () => {
    resizeCanvas(width, height, true);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-background rounded-lg border p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-4 text-lg font-semibold">Resize Canvas</h3>
        <div className="flex items-end gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-muted-foreground text-xs">Width</span>
            <input
              type="number"
              value={width}
              onChange={(e) => handleWidthChange(Number(e.target.value))}
              className="border-input bg-background h-9 w-24 rounded-md border px-3 text-sm"
            />
          </label>
          <button
            onClick={() => setLockRatio(!lockRatio)}
            className={`mb-0.5 rounded p-1.5 transition-colors ${
              lockRatio ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
            title={lockRatio ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
          >
            <Link className="h-4 w-4" />
          </button>
          <label className="flex flex-col gap-1">
            <span className="text-muted-foreground text-xs">Height</span>
            <input
              type="number"
              value={height}
              onChange={(e) => handleHeightChange(Number(e.target.value))}
              className="border-input bg-background h-9 w-24 rounded-md border px-3 text-sm"
            />
          </label>
        </div>
        <p className="text-muted-foreground mt-2 text-xs">
          Content will be scaled proportionally.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleResize}>Resize</Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Text formatting toolbar
// ---------------------------------------------------------------------------

function TextFormattingToolbar() {
  const fontBold = useEditorStore((s) => s.fontBold);
  const fontItalic = useEditorStore((s) => s.fontItalic);
  const fontUnderline = useEditorStore((s) => s.fontUnderline);
  const textAlign = useEditorStore((s) => s.textAlign);
  const fontFamily = useEditorStore((s) => s.fontFamily);
  const fontSize = useEditorStore((s) => s.fontSize);
  const setFontBold = useEditorStore((s) => s.setFontBold);
  const setFontItalic = useEditorStore((s) => s.setFontItalic);
  const setFontUnderline = useEditorStore((s) => s.setFontUnderline);
  const setTextAlign = useEditorStore((s) => s.setTextAlign);
  const setFontFamily = useEditorStore((s) => s.setFontFamily);
  const setFontSize = useEditorStore((s) => s.setFontSize);
  const applyTextFormatting = useEditorStore((s) => s.applyTextFormatting);

  // Sync from selected text object whenever the toolbar renders
  useEffect(() => {
    const canvas = useEditorStore.getState().canvas;
    if (!canvas) return;
    const onSelection = () => useEditorStore.getState().syncTextFormattingFromSelection();
    canvas.on('selection:created', onSelection);
    canvas.on('selection:updated', onSelection);
    return () => {
      canvas.off('selection:created', onSelection);
      canvas.off('selection:updated', onSelection);
    };
  }, []);

  const toggle = (setter: (v: boolean) => void, current: boolean) => {
    setter(!current);
    applyTextFormatting();
  };

  return (
    <>
      {/* Font family */}
      <select
        value={fontFamily}
        onChange={(e) => {
          setFontFamily(e.target.value as TextFontFamily);
          applyTextFormatting();
        }}
        className="border-input bg-background h-8 rounded-md border px-1.5 text-xs"
        title="Font family"
      >
        {FONT_FAMILIES.map((f) => (
          <option key={f.id} value={f.id}>
            {f.label}
          </option>
        ))}
      </select>

      {/* Font size */}
      <input
        type="number"
        min={8}
        max={200}
        value={fontSize}
        onChange={(e) => {
          setFontSize(Number(e.target.value));
          applyTextFormatting();
        }}
        className="border-input bg-background h-8 w-14 rounded-md border px-1.5 text-xs"
        title="Font size"
      />

      <Divider />

      {/* Bold */}
      <Button
        variant={fontBold ? 'default' : 'ghost'}
        size="icon"
        className="h-8 w-8"
        onClick={() => toggle(setFontBold, fontBold)}
        title="Bold (applied to selected text)"
      >
        <Bold className="h-4 w-4" />
      </Button>

      {/* Italic */}
      <Button
        variant={fontItalic ? 'default' : 'ghost'}
        size="icon"
        className="h-8 w-8"
        onClick={() => toggle(setFontItalic, fontItalic)}
        title="Italic (applied to selected text)"
      >
        <Italic className="h-4 w-4" />
      </Button>

      {/* Underline */}
      <Button
        variant={fontUnderline ? 'default' : 'ghost'}
        size="icon"
        className="h-8 w-8"
        onClick={() => toggle(setFontUnderline, fontUnderline)}
        title="Underline (applied to selected text)"
      >
        <Underline className="h-4 w-4" />
      </Button>

      <Divider />

      {/* Alignment */}
      {TEXT_ALIGNMENTS.map((a) => (
        <Button
          key={a.id}
          variant={textAlign === a.id ? 'default' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={() => {
            setTextAlign(a.id);
            applyTextFormatting();
          }}
          title={a.label}
        >
          <a.icon className="h-4 w-4" />
        </Button>
      ))}

      <Divider />
    </>
  );
}

// ---------------------------------------------------------------------------
// Toolbar
// ---------------------------------------------------------------------------

interface EditorToolbarProps {
  onOpenFile: () => void;
}

export function EditorToolbar({ onOpenFile }: EditorToolbarProps) {
  const activeTool = useEditorStore((s) => s.activeTool);
  const setActiveTool = useEditorStore((s) => s.setActiveTool);
  const fillColor = useEditorStore((s) => s.fillColor);
  const strokeColor = useEditorStore((s) => s.strokeColor);
  const strokeWidth = useEditorStore((s) => s.strokeWidth);
  const zoom = useEditorStore((s) => s.zoom);
  const historyIndex = useEditorStore((s) => s.historyIndex);
  const historyLength = useEditorStore((s) => s.history.length);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const setFillColor = useEditorStore((s) => s.setFillColor);
  const setStrokeColor = useEditorStore((s) => s.setStrokeColor);
  const setStrokeWidth = useEditorStore((s) => s.setStrokeWidth);
  const setZoom = useEditorStore((s) => s.setZoom);
  const canvas = useEditorStore((s) => s.canvas);
  const imageLoaded = useEditorStore((s) => s.imageLoaded);
  const saveFile = useEditorStore((s) => s.saveFile);

  const [showResize, setShowResize] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showBatch, setShowBatch] = useState(false);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < historyLength - 1;

  // -- Zoom helpers ----------------------------------------------------------

  const zoomBy = (factor: number) => {
    if (!canvas) return;
    const next = Math.min(Math.max(canvas.getZoom() * factor, 0.1), 10);
    canvas.setZoom(next);
    canvas.renderAll();
    setZoom(next);
  };

  const resetZoom = () => {
    if (!canvas) return;
    canvas.setZoom(1);
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    canvas.renderAll();
    setZoom(1);
  };

  // -- Render ----------------------------------------------------------------

  return (
    <>
      <div className="flex flex-wrap items-center gap-1 border-b px-3 py-1.5">
        {/* File */}
        <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2" onClick={onOpenFile} title="Open file (Ctrl+O)">
          <FolderOpen className="h-4 w-4" />
          <span className="text-xs">Open</span>
        </Button>

        {imageLoaded && (
          <>
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2" onClick={() => void saveFile()} title="Save (Ctrl+S)">
              <Save className="h-4 w-4" />
              <span className="text-xs">Save</span>
            </Button>
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2" onClick={() => setShowExport(true)} title="Export as… (Ctrl+Shift+S)">
              <Download className="h-4 w-4" />
              <span className="text-xs">Export</span>
            </Button>
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2" onClick={() => setShowBatch(true)} title="Batch processing">
              <Layers className="h-4 w-4" />
              <span className="text-xs">Batch</span>
            </Button>
          </>
        )}

        <Divider />

        {/* Tools */}
        {TOOLS.map((tool) => (
          <Button
            key={tool.id}
            variant={activeTool === tool.id ? 'default' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setActiveTool(tool.id)}
            title={`${tool.label} (${tool.shortcut})`}
          >
            <tool.icon className="h-4 w-4" />
          </Button>
        ))}

        <Divider />

        {/* Colors (hidden in crop mode) */}
        {activeTool !== 'crop' && (
          <>
            <ColorSwatch value={fillColor} onChange={setFillColor} label="Fill" />
            <ColorSwatch value={strokeColor} onChange={setStrokeColor} label="Stroke" />

            {/* Stroke width */}
            <select
              value={strokeWidth}
              onChange={(e) => setStrokeWidth(Number(e.target.value))}
              className="border-input bg-background h-8 rounded-md border px-1.5 text-xs"
              title="Stroke width"
            >
              {STROKE_WIDTHS.map((w) => (
                <option key={w} value={w}>
                  {w}px
                </option>
              ))}
            </select>

            <Divider />
          </>
        )}

        {/* Text formatting (shown when text tool is active) */}
        {activeTool === 'text' && <TextFormattingToolbar />}

        {/* Crop confirm/cancel */}
        {activeTool === 'crop' && (
          <>
            <Button
              variant="default"
              size="sm"
              className="h-8 gap-1.5 px-2"
              onClick={() => useEditorStore.getState().applyCrop()}
              title="Apply crop (Enter)"
            >
              <span className="text-xs">Apply Crop</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 px-2"
              onClick={() => setActiveTool('select')}
              title="Cancel crop (Escape)"
            >
              <span className="text-xs">Cancel</span>
            </Button>

            <Divider />
          </>
        )}

        {/* Selection tools options */}
        <SelectionToolsPopover />

        {/* Path operations */}
        <PathOperationsPopover />

        {/* Free transform */}
        <FreeTransformPopover />

        {/* Undo / Redo */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          disabled={!canUndo}
          onClick={undo}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          disabled={!canRedo}
          onClick={redo}
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo2 className="h-4 w-4" />
        </Button>

        <Divider />

        {/* Filter */}
        <FilterPopover />

        {/* Effects */}
        <EffectsPopover />

        {/* Adjustments */}
        <AdjustmentsPopover />

        {/* Templates */}
        <TemplateManagerPopover />

        {/* Resize */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 px-2"
          onClick={() => setShowResize(true)}
          title="Resize canvas"
        >
          <span className="text-xs">Resize</span>
        </Button>

        <Divider />

        {/* Zoom */}
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => zoomBy(1 / 1.2)} title="Zoom out">
          <ZoomOut className="h-4 w-4" />
        </Button>
        <button
          onClick={resetZoom}
          className="text-muted-foreground hover:text-foreground min-w-[3.5rem] cursor-pointer text-center text-xs"
          title="Reset zoom (100 %)"
        >
          {Math.round(zoom * 100)}%
        </button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => zoomBy(1.2)} title="Zoom in">
          <ZoomIn className="h-4 w-4" />
        </Button>
      </div>

      {showResize && <ResizeDialog onClose={() => setShowResize(false)} />}
      {showExport && <ExportDialog onClose={() => setShowExport(false)} />}
      {showBatch && <BatchDialog onClose={() => setShowBatch(false)} />}
    </>
  );
}
