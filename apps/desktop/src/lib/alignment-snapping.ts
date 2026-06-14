import { Line, type Canvas as FabricCanvas, type FabricObject } from 'fabric';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SnapGuide {
  /** 'vertical' | 'horizontal' */
  orientation: 'vertical' | 'horizontal';
  /** Position in canvas coords */
  position: number;
  /** Which edge/center snapped: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom' */
  edge: string;
}

export interface SnapResult {
  /** Adjusted left position after snapping */
  left: number;
  /** Adjusted top position after snapping */
  top: number;
  /** Guides to render */
  guides: SnapGuide[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Max pixel distance to trigger snap (in scene coords) */
export const SNAP_THRESHOLD = 6;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface ObjBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
}

function getObjBounds(obj: FabricObject): ObjBounds {
  const left = obj.left ?? 0;
  const top = obj.top ?? 0;
  const width = (obj.width ?? 0) * (obj.scaleX ?? 1);
  const height = (obj.height ?? 0) * (obj.scaleY ?? 1);
  return {
    left,
    top,
    right: left + width,
    bottom: top + height,
    centerX: left + width / 2,
    centerY: top + height / 2,
    width,
    height,
  };
}

function getCanvasBounds(canvas: FabricCanvas): ObjBounds {
  const w = canvas.getWidth();
  const h = canvas.getHeight();
  return {
    left: 0,
    top: 0,
    right: w,
    bottom: h,
    centerX: w / 2,
    centerY: h / 2,
    width: w,
    height: h,
  };
}

interface SnapAxis {
  /** Candidate snap position on the moving object */
  movingEdge: number;
  /** Label for this edge */
  label: string;
}

/**
 * Compute all candidate snap positions on the moving object for one axis.
 */
function getMovingEdges(bounds: ObjBounds, axis: 'h' | 'v'): SnapAxis[] {
  if (axis === 'h') {
    return [
      { movingEdge: bounds.left, label: 'left' },
      { movingEdge: bounds.centerX, label: 'center' },
      { movingEdge: bounds.right, label: 'right' },
    ];
  }
  return [
    { movingEdge: bounds.top, label: 'top' },
    { movingEdge: bounds.centerY, label: 'middle' },
    { movingEdge: bounds.bottom, label: 'bottom' },
  ];
}

/**
 * Compute all candidate snap positions for the reference objects along one axis.
 */
function getTargetPositions(
  obj: FabricObject,
  others: FabricObject[],
  canvas: FabricCanvas,
  axis: 'h' | 'v',
): { position: number; label: string }[] {
  const positions: { position: number; label: string }[] = [];

  // Canvas edges + center
  const cb = getCanvasBounds(canvas);
  if (axis === 'h') {
    positions.push({ position: cb.left, label: 'canvas-left' });
    positions.push({ position: cb.centerX, label: 'canvas-center' });
    positions.push({ position: cb.right, label: 'canvas-right' });
  } else {
    positions.push({ position: cb.top, label: 'canvas-top' });
    positions.push({ position: cb.centerY, label: 'canvas-center' });
    positions.push({ position: cb.bottom, label: 'canvas-bottom' });
  }

  // Other objects
  for (const other of others) {
    if (other === obj) continue;
    const b = getObjBounds(other);
    if (axis === 'h') {
      positions.push({ position: b.left, label: `obj-left` });
      positions.push({ position: b.centerX, label: `obj-center` });
      positions.push({ position: b.right, label: `obj-right` });
    } else {
      positions.push({ position: b.top, label: `obj-top` });
      positions.push({ position: b.centerY, label: `obj-center` });
      positions.push({ position: b.bottom, label: `obj-bottom` });
    }
  }

  return positions;
}

/**
 * Find the closest snap for one axis.
 * Returns { snapPosition, delta, guide } or null if nothing within threshold.
 */
function findSnap(
  movingEdges: SnapAxis[],
  targetPositions: { position: number; label: string }[],
  threshold: number,
): { snapPosition: number; delta: number; edge: string; position: number } | null {
  let best: { snapPosition: number; delta: number; edge: string; position: number } | null = null;
  let bestDist = threshold + 1;

  for (const me of movingEdges) {
    for (const tp of targetPositions) {
      const dist = Math.abs(me.movingEdge - tp.position);
      if (dist < bestDist) {
        bestDist = dist;
        best = {
          snapPosition: tp.position,
          delta: tp.position - me.movingEdge,
          edge: me.label,
          position: tp.position,
        };
      }
    }
  }

  return bestDist <= threshold ? best : null;
}

// ---------------------------------------------------------------------------
// Main API
// ---------------------------------------------------------------------------

/**
 * Compute snapped position + guides for a moving object.
 *
 * @param movingObj  The object being dragged
 * @param canvas     The Fabric.js canvas
 * @param threshold  Max snap distance (default SNAP_THRESHOLD)
 * @returns          Snapped coordinates + guide lines to render
 */
export function computeSnap(
  movingObj: FabricObject,
  canvas: FabricCanvas,
  threshold: number = SNAP_THRESHOLD,
): SnapResult {
  const bounds = getObjBounds(movingObj);
  const objects = canvas.getObjects().filter((o) => o !== movingObj && o.selectable !== false);

  // --- Horizontal snapping (left / center / right) ---
  const movingH = getMovingEdges(bounds, 'h');
  const targetsH = getTargetPositions(movingObj, objects, canvas, 'h');
  const snapH = findSnap(movingH, targetsH, threshold);

  // --- Vertical snapping (top / middle / bottom) ---
  const movingV = getMovingEdges(bounds, 'v');
  const targetsV = getTargetPositions(movingObj, objects, canvas, 'v');
  const snapV = findSnap(movingV, targetsV, threshold);

  let left = bounds.left;
  let top = bounds.top;
  const guides: SnapGuide[] = [];

  if (snapH) {
    left += snapH.delta;
    guides.push({
      orientation: 'vertical',
      position: snapH.position,
      edge: snapH.edge,
    });
  }

  if (snapV) {
    top += snapV.delta;
    guides.push({
      orientation: 'horizontal',
      position: snapV.position,
      edge: snapV.edge,
    });
  }

  return { left, top, guides };
}

// ---------------------------------------------------------------------------
// Guide line rendering helpers
// ---------------------------------------------------------------------------

const GUIDE_COLOR = '#00bfff';
const GUIDE_WIDTH = 1;
const GUIDE_DASH = [4, 4];

/**
 * Create temporary guide lines on the canvas.
 * Returns an array of Line objects to add/remove.
 */
export function createGuideLines(canvas: FabricCanvas, guides: SnapGuide[]): Line[] {
  const lines: Line[] = [];
  const w = canvas.getWidth();
  const h = canvas.getHeight();

  for (const guide of guides) {
    let line: Line;
    if (guide.orientation === 'vertical') {
      // Vertical line spanning full canvas height
      line = new Line([guide.position, 0, guide.position, h], {
        stroke: GUIDE_COLOR,
        strokeWidth: GUIDE_WIDTH,
        strokeDashArray: GUIDE_DASH,
        selectable: false,
        evented: false,
        excludeFromExport: true,
        hasControls: false,
      });
    } else {
      // Horizontal line spanning full canvas width
      line = new Line([0, guide.position, w, guide.position], {
        stroke: GUIDE_COLOR,
        strokeWidth: GUIDE_WIDTH,
        strokeDashArray: GUIDE_DASH,
        selectable: false,
        evented: false,
        excludeFromExport: true,
        hasControls: false,
      });
    }
    canvas.add(line);
    // Move guide line to the very top
    canvas.bringObjectForward(line);
    lines.push(line);
  }

  return lines;
}

/**
 * Remove specific guide lines from the canvas.
 * Pass the tracked array from createGuideLines for safe, targeted removal.
 */
export function removeGuideLines(canvas: FabricCanvas, lines: Line[]): void {
  for (const line of lines) {
    canvas.remove(line);
  }
}
