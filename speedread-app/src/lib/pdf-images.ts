export interface ImageRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}
type Matrix = [number, number, number, number, number, number];
function multiply(a: Matrix, b: Matrix): Matrix {
  return [
    a[0] * b[0] + a[2] * b[1],
    a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3],
    a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4],
    a[1] * b[4] + a[3] * b[5] + a[5],
  ];
}
export function imageRegions(
  ops: { fnArray: number[]; argsArray: unknown[][] },
  codes: {
    save: number;
    restore: number;
    transform: number;
    paintImageXObject: number;
    paintInlineImageXObject: number;
  },
): ImageRegion[] {
  let matrix: Matrix = [1, 0, 0, 1, 0, 0];
  const stack: Matrix[] = [];
  const out: ImageRegion[] = [];
  for (let i = 0; i < ops.fnArray.length; i++) {
    const fn = ops.fnArray[i];
    if (fn === codes.save) stack.push([...matrix]);
    else if (fn === codes.restore) matrix = stack.pop() ?? [1, 0, 0, 1, 0, 0];
    else if (fn === codes.transform)
      matrix = multiply(matrix, ops.argsArray[i] as Matrix);
    else if (
      fn === codes.paintImageXObject ||
      fn === codes.paintInlineImageXObject
    ) {
      const points = [
        [0, 0],
        [1, 0],
        [0, 1],
        [1, 1],
      ].map(([x, y]) => [
        matrix[0] * x + matrix[2] * y + matrix[4],
        matrix[1] * x + matrix[3] * y + matrix[5],
      ]);
      const xs = points.map((p) => p[0]),
        ys = points.map((p) => p[1]);
      const x = Math.min(...xs),
        y = Math.min(...ys),
        width = Math.max(...xs) - x,
        height = Math.max(...ys) - y;
      if (
        width >= 35 &&
        height >= 15 &&
        !out.some(
          (r) =>
            Math.abs(r.x - x) < 1 &&
            Math.abs(r.y - y) < 1 &&
            Math.abs(r.width - width) < 1 &&
            Math.abs(r.height - height) < 1,
        )
      )
        out.push({ x, y, width, height });
    }
  }
  return out;
}
