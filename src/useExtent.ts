/**
 * Utility to track the extent of a set of points.
 *
 * @returns a tuple of the current extent and a function to set the extent
 */
export function useExtent(): UseExtentsReturn {
  const extent: Extent = {
    x: [Infinity, -Infinity],
    y: [Infinity, -Infinity],
  };

  return [
    extent,
    (x?: number, y?: number) => {
      extent.x = minmax(x, ...extent.x);
      extent.y = minmax(y, ...extent.y);
      return extent;
    },
  ];
}

export function padExtent({ x, y }: Extent, padding: number): Extent {
  return {
    x: [x[0] - padding, x[1] + padding],
    y: [y[0] - padding, y[1] + padding],
  };
}

function minmax(
  candidate: number | undefined | null,
  min: number,
  max: number,
): [number, number] {
  if (typeof candidate !== "number") return [min, max];
  return [Math.min(min, candidate), Math.max(max, candidate)];
}

export type Extent = { x: [number, number]; y: [number, number] };

export type UseExtentsReturn = [Extent, (x?: number, y?: number) => Extent];
