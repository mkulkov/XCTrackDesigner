// APK widget/helper/x.b,c: intersect the wind-from ray with the inset viewport.
export function windEdge(
  width: number,
  height: number,
  x: number,
  y: number,
  from: number,
  inset: number,
) {
  if (x <= 0 || x >= width || y <= 0 || y >= height || width <= 2 * inset || height <= 2 * inset)
    return null
  const angle = (from * Math.PI) / 180
  const dx = Math.sin(angle)
  const dy = -Math.cos(angle)
  const distances = [
    dx < -1e-9 ? (inset - x) / dx : dx > 1e-9 ? (width - inset - x) / dx : Infinity,
    dy < -1e-9 ? (inset - y) / dy : dy > 1e-9 ? (height - inset - y) / dy : Infinity,
  ].filter((t) => t >= 0)
  const t = Math.min(...distances)
  if (!Number.isFinite(t)) return null
  return { x: x + t * dx, y: y + t * dy, dx: dx * inset, dy: dy * inset }
}

// map/n0.a: scale lengths chosen from native 3/4/5/6/8/10/12/15/20/25 steps.
export function nativeMapScale(zoom: number, latitude: number, screenShort = 1080) {
  const metresPerPixel =
    (Math.cos((latitude * Math.PI) / 180) * 40030173.59204114) / (256 * 2 ** (zoom / 2))
  const target = Math.max(20, Math.trunc(screenShort / 3)) * metresPerPixel
  let distance = 0
  for (let power = -5; power <= 9; power++) {
    for (const value of [3, 4, 5, 6, 8, 10, 12, 15, 20, 25]) {
      const candidate = value * 10 ** power
      if (candidate <= target) distance = Math.max(distance, candidate)
    }
  }
  return { distance, pixels: Math.round(distance / metresPerPixel) }
}
