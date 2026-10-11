import type { Bounds } from './xcfg'

export type Handle = 'move' | 'nw' | 'ne' | 'sw' | 'se'
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))

// Use the same cell count as the native preview. Stored coordinates remain integers.
export function cellStep(pixels: number) {
  return 10000 / Math.max(1, Math.round(pixels / (0.11952191 * 420)))
}

export function gestureBounds(
  original: Bounds,
  handle: Handle,
  dx: number,
  dy: number,
  width: number,
  height: number,
  snap: boolean,
): Bounds {
  const stepX = cellStep(width)
  const stepY = cellStep(height)
  const delta = (n: number, step: number) => Math.round(snap ? Math.round(n / step) * step : n)
  const x = delta(dx, stepX)
  const y = delta(dy, stepY)
  if (x === 0 && y === 0) return original
  if (handle === 'move') {
    const mx = clamp(x, -original.X1, 10000 - original.X2)
    const my = clamp(y, -original.Y1, 10000 - original.Y2)
    return {
      X1: original.X1 + mx,
      X2: original.X2 + mx,
      Y1: original.Y1 + my,
      Y2: original.Y2 + my,
    }
  }
  const result = { ...original }
  const minX = Math.ceil(stepX)
  const minY = Math.ceil(stepY)
  if (handle.endsWith('w')) result.X1 = clamp(original.X1 + x, 0, Math.max(0, original.X2 - minX))
  else result.X2 = clamp(original.X2 + x, Math.min(10000, original.X1 + minX), 10000)
  if (handle.startsWith('n')) result.Y1 = clamp(original.Y1 + y, 0, Math.max(0, original.Y2 - minY))
  else result.Y2 = clamp(original.Y2 + y, Math.min(10000, original.Y1 + minY), 10000)
  return result
}
