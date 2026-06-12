import polygonClipping from 'polygon-clipping';
import { Path, type Canvas as FabricCanvas, type FabricObject } from 'fabric';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Polygon = [number, number][];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract polygon coordinates from a Fabric.js object.
 * Uses actual path points when available (Path objects), falls back to bounding rect.
 */
function objectToPolygon(obj: FabricObject): Polygon {
  // Try to extract actual path points for Path objects
  const pathObj = obj as unknown as {
    path?: Array<{
      type: string;
      x?: number;
      y?: number;
    }>;
  };
  if (pathObj.path && Array.isArray(pathObj.path)) {
    const points: Polygon = [];
    for (const cmd of pathObj.path) {
      if (cmd.type === 'M' || cmd.type === 'L') {
        if (cmd.x !== undefined && cmd.y !== undefined) {
          points.push([cmd.x, cmd.y]);
        }
      } else if (cmd.type === 'Q' && cmd.x !== undefined && cmd.y !== undefined) {
        points.push([cmd.x, cmd.y]);
      } else if (cmd.type === 'C' && cmd.x !== undefined && cmd.y !== undefined) {
        points.push([cmd.x, cmd.y]);
      }
    }
    if (points.length >= 3) return points;
  }

  // Try polygon objects that have a points property (Polygon, Polyline)
  const maybePolygon = obj as unknown as { points?: Array<{ x: number; y: number }> };
  if (maybePolygon.points && Array.isArray(maybePolygon.points) && maybePolygon.points.length >= 3) {
    return maybePolygon.points.map((pt) => [pt.x, pt.y] as [number, number]);
  }

  // Fallback to bounding rect
  const rect = obj.getBoundingRect();
  const { left, top, width, height } = rect;

  return [
    [left, top],
    [left + width, top],
    [left + width, top + height],
    [left, top + height],
  ];
}

/**
 * Convert polygon coordinates to Fabric.js Path string.
 */
function polygonToPathData(polygon: Polygon): string {
  if (polygon.length === 0) return '';

  const [first, ...rest] = polygon;
  if (!first) return '';

  let d = `M ${first[0]} ${first[1]}`;
  for (const point of rest) {
    d += ` L ${point[0]} ${point[1]}`;
  }
  d += ' Z';
  return d;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Perform boolean union on two Fabric.js objects.
 * Returns a new Path object representing the union.
 */
export function booleanUnion(
  objA: FabricObject,
  objB: FabricObject,
  options?: { fill?: string; stroke?: string; strokeWidth?: number },
): FabricObject {
  const polyA = objectToPolygon(objA);
  const polyB = objectToPolygon(objB);

  const solution = polygonClipping.union([polyA], [polyB]);

  // Take the first result polygon
  const resultPolygon = solution[0]?.[0];
  if (!resultPolygon) {
    return objA;
  }

  const pathData = polygonToPathData(resultPolygon);
  return new Path(pathData, {
    fill: options?.fill ?? (typeof objA.fill === 'string' ? objA.fill : '#000000'),
    stroke: options?.stroke ?? (typeof objA.stroke === 'string' ? objA.stroke : '#000000'),
    strokeWidth: options?.strokeWidth ?? objA.strokeWidth ?? 1,
  });
}

/**
 * Perform boolean intersection on two Fabric.js objects.
 * Returns a new Path object representing the overlapping region.
 */
export function booleanIntersect(
  objA: FabricObject,
  objB: FabricObject,
  options?: { fill?: string; stroke?: string; strokeWidth?: number },
): FabricObject | null {
  const polyA = objectToPolygon(objA);
  const polyB = objectToPolygon(objB);

  try {
    const solution = polygonClipping.intersection([polyA], [polyB]);

    const resultPolygon = solution[0]?.[0];
    if (!resultPolygon || resultPolygon.length < 3) {
      return null;
    }

    const pathData = polygonToPathData(resultPolygon);
    return new Path(pathData, {
      fill: options?.fill ?? (typeof objA.fill === 'string' ? objA.fill : '#000000'),
      stroke: options?.stroke ?? (typeof objA.stroke === 'string' ? objA.stroke : '#000000'),
      strokeWidth: options?.strokeWidth ?? objA.strokeWidth ?? 1,
    });
  } catch {
    return null;
  }
}

/**
 * Perform boolean subtraction (difference) on two Fabric.js objects.
 * Returns a new Path object representing objA minus objB.
 */
export function booleanSubtract(
  objA: FabricObject,
  objB: FabricObject,
  options?: { fill?: string; stroke?: string; strokeWidth?: number },
): FabricObject | null {
  const polyA = objectToPolygon(objA);
  const polyB = objectToPolygon(objB);

  try {
    const solution = polygonClipping.difference([polyA], [polyB]);

    const resultPolygon = solution[0]?.[0];
    if (!resultPolygon || resultPolygon.length < 3) {
      return null;
    }

    const pathData = polygonToPathData(resultPolygon);
    return new Path(pathData, {
      fill: options?.fill ?? (typeof objA.fill === 'string' ? objA.fill : '#000000'),
      stroke: options?.stroke ?? (typeof objB.stroke === 'string' ? objB.stroke : '#000000'),
      strokeWidth: options?.strokeWidth ?? objA.strokeWidth ?? 1,
    });
  } catch {
    return null;
  }
}

/**
 * Apply a boolean operation to selected objects on canvas.
 * Removes the original objects and adds the result.
 */
export function applyBooleanOperation(
  canvas: FabricCanvas,
  operation: 'union' | 'intersect' | 'subtract',
): void {
  const activeObj = canvas.getActiveObject();
  if (!activeObj) return;

  // Get individual objects from active selection or single object
  const objects = 'getObjects' in activeObj && typeof activeObj.getObjects === 'function'
    ? (activeObj as { getObjects: () => FabricObject[] }).getObjects()
    : [activeObj];

  if (objects.length < 2) {
    console.warn('Boolean operations require at least 2 selected objects');
    return;
  }

  const objA = objects[0];
  const objB = objects[1];
  if (!objA || !objB) return;

  let result: FabricObject | null = null;

  switch (operation) {
    case 'union':
      result = booleanUnion(objA, objB);
      break;
    case 'intersect':
      result = booleanIntersect(objA, objB);
      break;
    case 'subtract':
      result = booleanSubtract(objA, objB);
      break;
  }

  if (!result) {
    console.warn(`Boolean ${operation} produced no result`);
    return;
  }

  // Remove original objects
  canvas.discardActiveObject();
  for (const obj of objects) {
    canvas.remove(obj);
  }

  // Add result
  canvas.add(result);
  canvas.setActiveObject(result);
  canvas.renderAll();
}
