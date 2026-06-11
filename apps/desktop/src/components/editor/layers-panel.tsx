import { useCallback, useEffect, useState } from 'react';
import { Eye, EyeOff, Trash2, ChevronUp, ChevronDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useEditorStore } from '@/stores/editor';
import type { FabricObject } from 'fabric';

// ---------------------------------------------------------------------------
// Layer info derived from a Fabric.js object
// ---------------------------------------------------------------------------

interface LayerInfo {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  type: string;
}

const layerIdMap = new WeakMap<FabricObject, string>();
let layerCounter = 0;

function objectToLayer(obj: FabricObject, index: number): LayerInfo {
  const typeName = obj.type ?? 'object';
  const name = `${typeName.charAt(0).toUpperCase() + typeName.slice(1)} ${index + 1}`;
  let id = layerIdMap.get(obj);
  if (!id) {
    id = `layer-${++layerCounter}`;
    layerIdMap.set(obj, id);
  }
  return {
    id,
    name,
    visible: obj.visible !== false,
    opacity: obj.opacity ?? 1,
    type: String(typeName),
  };
}

// ---------------------------------------------------------------------------
// Layers panel component
// ---------------------------------------------------------------------------

export function LayersPanel() {
  const canvas = useEditorStore((s) => s.canvas);
  const [layers, setLayers] = useState<LayerInfo[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Sync layer list from canvas objects.
  const syncLayers = useCallback(() => {
    if (!canvas) {
      setLayers([]);
      return;
    }
    const objects = canvas.getObjects();
    setLayers(objects.map((obj, i) => objectToLayer(obj, i)));
  }, [canvas]);

  // Subscribe to Fabric.js object events instead of polling.
  useEffect(() => {
    if (!canvas) return;

    syncLayers();

    const onObjectAdded = () => syncLayers();
    const onObjectRemoved = () => syncLayers();

    canvas.on('object:added', onObjectAdded);
    canvas.on('object:removed', onObjectRemoved);

    return () => {
      canvas.off('object:added', onObjectAdded);
      canvas.off('object:removed', onObjectRemoved);
    };
  }, [canvas, syncLayers]);

  if (!canvas || layers.length === 0) {
    return (
      <div className="flex h-full flex-col border-l">
        <div className="border-b px-3 py-2">
          <span className="text-xs font-medium">Layers</span>
        </div>
        <div className="text-muted-foreground flex flex-1 items-center justify-center px-3 text-center text-xs">
          No layers yet
        </div>
      </div>
    );
  }

  const objects = canvas.getObjects();

  const toggleVisibility = (index: number) => {
    const obj = objects[index];
    if (!obj) return;
    obj.visible = !obj.visible;
    canvas.renderAll();
    syncLayers();
    useEditorStore.getState().pushHistory();
  };

  const setOpacity = (index: number, opacity: number) => {
    const obj = objects[index];
    if (!obj) return;
    obj.opacity = opacity;
    canvas.renderAll();
    syncLayers();
  };

  const deleteObject = (index: number) => {
    const obj = objects[index];
    if (!obj) return;
    canvas.remove(obj);
    canvas.renderAll();
    syncLayers();
    useEditorStore.getState().pushHistory();
  };

  const moveUp = (index: number) => {
    if (index >= objects.length - 1) return;
    const obj = objects[index];
    if (!obj) return;
    canvas.moveObjectTo(obj, index + 1);
    canvas.renderAll();
    syncLayers();
    useEditorStore.getState().pushHistory();
  };

  const moveDown = (index: number) => {
    if (index <= 0) return;
    const obj = objects[index];
    if (!obj) return;
    canvas.moveObjectTo(obj, index - 1);
    canvas.renderAll();
    syncLayers();
    useEditorStore.getState().pushHistory();
  };

  const selectLayer = (index: number) => {
    const obj = objects[index];
    if (!obj) return;
    canvas.setActiveObject(obj);
    canvas.renderAll();
    setSelectedId(layers[index]?.id ?? null);
  };

  // Render layers in reverse order (top layer first).
  const reversed = [...layers].reverse();

  return (
    <div className="flex h-full w-56 flex-col border-l">
      <div className="border-b px-3 py-2">
        <span className="text-xs font-medium">Layers</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {reversed.map((layer) => {
          const realIndex = layers.length - 1 - layers.indexOf(layer);
          const isSelected = layer.id === selectedId;
          return (
            <div
              key={layer.id}
              className={`flex items-center gap-1.5 border-b px-2 py-1.5 text-xs ${
                isSelected ? 'bg-accent' : 'hover:bg-muted'
              } cursor-pointer`}
              onClick={() => selectLayer(realIndex)}
            >
              {/* Visibility toggle */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleVisibility(realIndex);
                }}
                className="text-muted-foreground hover:text-foreground shrink-0"
                title={layer.visible ? 'Hide' : 'Show'}
              >
                {layer.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
              </button>

              {/* Layer name + type */}
              <div className="min-w-0 flex-1 truncate">
                <span className="font-medium">{layer.name}</span>
              </div>

              {/* Opacity slider */}
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={layer.opacity}
                onChange={(e) => setOpacity(realIndex, Number(e.target.value))}
                onPointerUp={() => useEditorStore.getState().pushHistory()}
                className="w-14"
                onClick={(e) => e.stopPropagation()}
                title={`Opacity: ${Math.round(layer.opacity * 100)}%`}
              />

              {/* Move up/down */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  moveUp(realIndex);
                }}
                className="text-muted-foreground hover:text-foreground shrink-0"
                title="Move up"
              >
                <ChevronUp className="h-3 w-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  moveDown(realIndex);
                }}
                className="text-muted-foreground hover:text-foreground shrink-0"
                title="Move down"
              >
                <ChevronDown className="h-3 w-3" />
              </button>

              {/* Delete */}
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteObject(realIndex);
                }}
                title="Delete layer"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
