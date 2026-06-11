import { useEffect, useRef } from 'react';
import {
  Canvas,
  Ellipse,
  Line,
  PencilBrush,
  Path,
  Point,
  Rect,
  Textbox,
  type FabricObject,
} from 'fabric';

import { useEditorStore } from '@/stores/editor';
import { hexToRgba } from '@/lib/utils';
import { computeSnap, createGuideLines, removeGuideLines } from '@/lib/alignment-snapping';

// ---------------------------------------------------------------------------
// Canvas component
// ---------------------------------------------------------------------------

export function EditorCanvas() {
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fabricRef = useRef<Canvas | null>(null);

  // Store actions ------------------------------------------------------------
  const setCanvas = useEditorStore((s) => s.setCanvas);
  const pushHistory = useEditorStore((s) => s.pushHistory);

  // Refs so event handlers always see latest values without re-registering ---
  const activeToolRef = useRef(useEditorStore.getState().activeTool);
  const fillColorRef = useRef(useEditorStore.getState().fillColor);
  const strokeColorRef = useRef(useEditorStore.getState().strokeColor);
  const strokeWidthRef = useRef(useEditorStore.getState().strokeWidth);
  const fontSizeRef = useRef(useEditorStore.getState().fontSize);
  const fontBoldRef = useRef(useEditorStore.getState().fontBold);
  const fontItalicRef = useRef(useEditorStore.getState().fontItalic);
  const fontUnderlineRef = useRef(useEditorStore.getState().fontUnderline);
  const textAlignRef = useRef(useEditorStore.getState().textAlign);
  const fontFamilyRef = useRef(useEditorStore.getState().fontFamily);
  const cropOverlayRef = useRef<Rect | null>(null);

  useEffect(
    () =>
      useEditorStore.subscribe((s) => {
        activeToolRef.current = s.activeTool;
        fillColorRef.current = s.fillColor;
        strokeColorRef.current = s.strokeColor;
        strokeWidthRef.current = s.strokeWidth;
        fontSizeRef.current = s.fontSize;
        fontBoldRef.current = s.fontBold;
        fontItalicRef.current = s.fontItalic;
        fontUnderlineRef.current = s.fontUnderline;
        textAlignRef.current = s.textAlign;
        fontFamilyRef.current = s.fontFamily;
      }),
    [],
  );

  // -------------------------------------------------------------------------
  // Initialise Fabric.js canvas + event handlers
  // -------------------------------------------------------------------------

  useEffect(() => {
    const el = canvasElRef.current;
    const container = containerRef.current;
    if (!el || !container || fabricRef.current) return;

    let canvas: Canvas;
    try {
      canvas = new Canvas(el, {
        width: container.clientWidth,
        height: container.clientHeight,
        backgroundColor: '#1e1e1e',
        selection: true,
        preserveObjectStacking: true,
      });
    } catch {
      // Canvas init failed — render nothing, the container stays blank
      return;
    }

    fabricRef.current = canvas;
    setCanvas(canvas);

    // -- Resize observer -----------------------------------------------------
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      canvas.setDimensions({ width, height });
      canvas.renderAll();
    });
    ro.observe(container);

    // -- Internal drawing state ----------------------------------------------
    let isDrawing = false;
    let isPanning = false;
    let startX = 0;
    let startY = 0;
    let lastPanX = 0;
    let lastPanY = 0;
    let tempObject: FabricObject | null = null;
    let spaceHeld = false;

    // -- Space-key pan mode --------------------------------------------------
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        spaceHeld = true;
        canvas.selection = false;
        canvas.defaultCursor = 'grab';
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spaceHeld = false;
        canvas.selection = activeToolRef.current === 'select';
        canvas.defaultCursor = 'default';
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // -- Mouse:down ----------------------------------------------------------
    const onMouseDown = (opt: { e: Event }) => {
      const e = opt.e as MouseEvent;

      // Pan: middle-click or space held
      if (e.button === 1 || (spaceHeld && e.button === 0)) {
        isPanning = true;
        lastPanX = e.clientX;
        lastPanY = e.clientY;
        canvas.selection = false;
        canvas.defaultCursor = 'grabbing';
        return;
      }

      const tool = activeToolRef.current;
      const isDrawingTool = tool === 'freehand' || tool === 'highlighter' || tool === 'marker';
      if (tool === 'select' || isDrawingTool) return;

      const pointer = canvas.getScenePoint(e);
      startX = pointer.x;
      startY = pointer.y;

      // Crop tool
      if (tool === 'crop') {
        isDrawing = true;
        // Remove previous overlay
        if (cropOverlayRef.current) {
          canvas.remove(cropOverlayRef.current);
          cropOverlayRef.current = null;
        }
        const overlay = new Rect({
          left: startX,
          top: startY,
          width: 0,
          height: 0,
          fill: 'rgba(0, 0, 0, 0.4)',
          stroke: '#fff',
          strokeWidth: 1,
          strokeDashArray: [5, 5],
          selectable: false,
          evented: false,
          excludeFromExport: true,
        });
        cropOverlayRef.current = overlay;
        canvas.add(overlay);
        useEditorStore.getState().setCropPending(false);
        return;
      }

      isDrawing = true;

      // Text tool – place and enter editing immediately
      if (tool === 'text') {
        const textbox = new Textbox('Type here…', {
          left: startX,
          top: startY,
          fontSize: fontSizeRef.current,
          fill: fillColorRef.current,
          fontFamily: fontFamilyRef.current + ', sans-serif',
          fontWeight: fontBoldRef.current ? 'bold' : 'normal',
          fontStyle: fontItalicRef.current ? 'italic' : 'normal',
          underline: fontUnderlineRef.current,
          textAlign: textAlignRef.current,
          width: 200,
        });
        canvas.add(textbox);
        canvas.setActiveObject(textbox);
        textbox.enterEditing();
        textbox.selectAll();
        isDrawing = false;
        pushHistory();
        return;
      }

      let shape: FabricObject | null = null;
      switch (tool) {
        case 'rectangle':
          shape = new Rect({
            left: startX,
            top: startY,
            width: 0,
            height: 0,
            fill: fillColorRef.current,
            stroke: strokeColorRef.current,
            strokeWidth: strokeWidthRef.current,
          });
          break;
        case 'ellipse':
          shape = new Ellipse({
            left: startX,
            top: startY,
            rx: 0,
            ry: 0,
            fill: fillColorRef.current,
            stroke: strokeColorRef.current,
            strokeWidth: strokeWidthRef.current,
          });
          break;
        case 'line':
        case 'arrow':
          shape = new Line([startX, startY, startX, startY], {
            stroke: strokeColorRef.current,
            strokeWidth: strokeWidthRef.current,
          });
          break;
      }

      if (shape) {
        canvas.add(shape);
        tempObject = shape;
      }
    };

    // -- Mouse:move ----------------------------------------------------------
    const onMouseMove = (opt: { e: Event }) => {
      const e = opt.e as MouseEvent;

      if (isPanning) {
        const vpt = canvas.viewportTransform;
        if (vpt) {
          vpt[4] += e.clientX - lastPanX;
          vpt[5] += e.clientY - lastPanY;
          canvas.requestRenderAll();
        }
        lastPanX = e.clientX;
        lastPanY = e.clientY;
        return;
      }

      if (!isDrawing) return;

      const pointer = canvas.getScenePoint(e);
      const tool = activeToolRef.current;

      // Crop tool movement
      if (tool === 'crop' && cropOverlayRef.current) {
        const w = pointer.x - startX;
        const h = pointer.y - startY;
        cropOverlayRef.current.set({
          left: w < 0 ? pointer.x : startX,
          top: h < 0 ? pointer.y : startY,
          width: Math.abs(w),
          height: Math.abs(h),
        });
        canvas.renderAll();
        return;
      }

      if (!tempObject) return;

      switch (tool) {
        case 'rectangle': {
          const rect = tempObject as Rect;
          const w = pointer.x - startX;
          const h = pointer.y - startY;
          rect.set({
            left: w < 0 ? pointer.x : startX,
            top: h < 0 ? pointer.y : startY,
            width: Math.abs(w),
            height: Math.abs(h),
          });
          break;
        }
        case 'ellipse': {
          const ellipse = tempObject as Ellipse;
          ellipse.set({
            left: Math.min(startX, pointer.x),
            top: Math.min(startY, pointer.y),
            rx: Math.abs(pointer.x - startX) / 2,
            ry: Math.abs(pointer.y - startY) / 2,
          });
          break;
        }
        case 'line':
        case 'arrow': {
          const line = tempObject as Line;
          line.set({ x2: pointer.x, y2: pointer.y });
          break;
        }
      }

      canvas.renderAll();
    };

    // -- Mouse:up ------------------------------------------------------------
    const onMouseUp = () => {
      if (isPanning) {
        isPanning = false;
        canvas.selection = activeToolRef.current === 'select';
        canvas.defaultCursor = 'default';
        return;
      }

      // Crop tool mouse up — set crop region, keep overlay visible
      if (activeToolRef.current === 'crop' && cropOverlayRef.current) {
        const overlay = cropOverlayRef.current;
        const w = overlay.width ?? 0;
        const h = overlay.height ?? 0;
        if (w > 4 && h > 4) {
          useEditorStore.getState().setCropRegion({
            x: overlay.left ?? 0,
            y: overlay.top ?? 0,
            width: w,
            height: h,
          });
          useEditorStore.getState().setCropPending(true);
        } else {
          canvas.remove(overlay);
          cropOverlayRef.current = null;
        }
        isDrawing = false;
        return;
      }

      if (isDrawing && tempObject) {
        const tool = activeToolRef.current;

        // Discard shapes that are too small (accidental clicks)
        let tooSmall = false;
        if (tool === 'rectangle') {
          const r = tempObject as Rect;
          tooSmall = (r.width ?? 0) < 2 && (r.height ?? 0) < 2;
        } else if (tool === 'ellipse') {
          const el2 = tempObject as Ellipse;
          tooSmall = (el2.rx ?? 0) < 2 && (el2.ry ?? 0) < 2;
        } else if (tool === 'line' || tool === 'arrow') {
          const l = tempObject as Line;
          const dx = (l.x2 ?? 0) - (l.x1 ?? 0);
          const dy = (l.y2 ?? 0) - (l.y1 ?? 0);
          tooSmall = Math.sqrt(dx * dx + dy * dy) < 4;
        }

        if (tooSmall) {
          canvas.remove(tempObject);
        } else if (tool === 'arrow') {
          // Replace the temporary line with a proper arrow path
          const line = tempObject as Line;
          const x1 = line.x1 ?? startX;
          const y1 = line.y1 ?? startY;
          const x2 = line.x2 ?? startX;
          const y2 = line.y2 ?? startY;

          canvas.remove(line);

          const dx = x2 - x1;
          const dy = y2 - y1;
          const length = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx);
          const headLen = Math.min(length * 0.3, 20);
          const headAngle = Math.PI / 6;

          const hx1 = x2 - headLen * Math.cos(angle - headAngle);
          const hy1 = y2 - headLen * Math.sin(angle - headAngle);
          const hx2 = x2 - headLen * Math.cos(angle + headAngle);
          const hy2 = y2 - headLen * Math.sin(angle + headAngle);

          const pathStr = `M ${x1} ${y1} L ${x2} ${y2} M ${x2} ${y2} L ${hx1} ${hy1} M ${x2} ${y2} L ${hx2} ${hy2}`;
          const arrow = new Path(pathStr, {
            stroke: strokeColorRef.current,
            strokeWidth: strokeWidthRef.current,
            fill: 'transparent',
            selectable: true,
          });
          canvas.add(arrow);
          tempObject = arrow;
        }

        pushHistory();
      }

      isDrawing = false;
      tempObject = null;
    };

    // -- Wheel → zoom --------------------------------------------------------
    const onWheel = (opt: { e: Event }) => {
      const e = opt.e as WheelEvent;
      e.preventDefault();
      e.stopPropagation();

      const delta = e.deltaY;
      let zoom = canvas.getZoom();
      zoom *= delta > 0 ? 0.95 : 1.05;
      zoom = Math.min(Math.max(zoom, 0.1), 10);

      canvas.zoomToPoint(new Point(e.offsetX, e.offsetY), zoom);
      useEditorStore.getState().setZoom(zoom);
    };

    // -- Alignment snapping --------------------------------------------------
    let activeGuideLines: ReturnType<typeof createGuideLines> = [];

    const cleanupGuides = () => {
      if (activeGuideLines.length > 0) {
        removeGuideLines(canvas, activeGuideLines);
        activeGuideLines = [];
        canvas.renderAll();
      }
    };

    const onObjectMoving = (opt: { target: FabricObject }) => {
      const movingObj = opt.target;
      if (!movingObj || movingObj.selectable === false) return;

      // Remove previous guide lines
      cleanupGuides();

      // Compute snap
      const result = computeSnap(movingObj, canvas);

      // Apply snapped position
      movingObj.set({ left: result.left, top: result.top });

      // Draw new guide lines
      if (result.guides.length > 0) {
        activeGuideLines = createGuideLines(canvas, result.guides);
      }

      canvas.renderAll();
    };

    // -- Selection / object events -------------------------------------------
    const onObjectModified = () => {
      cleanupGuides();
      pushHistory();
    };
    const onPathCreated = () => pushHistory();

    // -- Register ------------------------------------------------------------
    canvas.on('mouse:down', onMouseDown);
    canvas.on('mouse:move', onMouseMove);
    canvas.on('mouse:up', onMouseUp);
    canvas.on('mouse:wheel', onWheel);
    canvas.on('object:modified', onObjectModified);
    canvas.on('path:created', onPathCreated);
    canvas.on('object:moving', onObjectMoving);

    // -- Cleanup on unmount --------------------------------------------------
    return () => {
      ro.disconnect();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas.off('mouse:down', onMouseDown);
      canvas.off('mouse:move', onMouseMove);
      canvas.off('mouse:up', onMouseUp);
      canvas.off('mouse:wheel', onWheel);
      canvas.off('object:modified', onObjectModified);
      canvas.off('path:created', onPathCreated);
      canvas.off('object:moving', onObjectMoving);
      canvas.dispose();
      fabricRef.current = null;
    };
  }, [setCanvas, pushHistory]);

  // -------------------------------------------------------------------------
  // React to active-tool / style changes (configure drawing mode)
  // -------------------------------------------------------------------------

  const activeTool = useEditorStore((s) => s.activeTool);
  const strokeColor = useEditorStore((s) => s.strokeColor);
  const strokeWidth = useEditorStore((s) => s.strokeWidth);

  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const isDrawingTool = activeTool === 'freehand' || activeTool === 'highlighter' || activeTool === 'marker';
    canvas.isDrawingMode = isDrawingTool;

    if (isDrawingTool) {
      const brush = new PencilBrush(canvas);
      if (activeTool === 'highlighter') {
        brush.color = hexToRgba(strokeColor, 0.4);
        brush.width = Math.max(strokeWidth * 3, 12);
      } else if (activeTool === 'marker') {
        brush.color = strokeColor;
        brush.width = Math.max(strokeWidth * 2, 6);
      } else {
        brush.color = strokeColor;
        brush.width = strokeWidth;
      }
      canvas.freeDrawingBrush = brush;
    }

    canvas.selection = activeTool === 'select';
    canvas.forEachObject((obj: FabricObject) => {
      obj.selectable = activeTool === 'select';
      obj.evented = activeTool === 'select';
    });

    // Clean up crop overlay when switching away from crop tool.
    // Uses cropOverlayRef.current (shared ref) — no desync with init effect.
    if (activeTool !== 'crop') {
      if (cropOverlayRef.current) {
        canvas.remove(cropOverlayRef.current);
        cropOverlayRef.current = null;
      }
      useEditorStore.getState().setCropRegion(null);
      useEditorStore.getState().setCropPending(false);
    }

    canvas.discardActiveObject();
    canvas.renderAll();
  }, [activeTool, strokeColor, strokeWidth]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div ref={containerRef} className="relative flex-1 overflow-hidden bg-neutral-900">
      <canvas ref={canvasElRef} />
    </div>
  );
}
