// XCTrack 0.9.12.6: theme.a.H and om.h/om.b. Zoom alternates two doubling sequences.
export function thermalColor(vario: number, fade: number) {
  const alpha = (255 - Math.trunc(Math.max(0, Math.min(1, fade)) * 200)) / 255
  const rgb =
    vario < 0
      ? [128, 128, 128]
      : vario < 1
        ? [
            128 - Math.trunc(vario * 128),
            128 + Math.trunc(vario * 128),
            128 - Math.trunc(vario * 128),
          ]
        : vario < 2
          ? [Math.trunc((vario - 1) * 255), 255, 0]
          : [255, 255 - Math.min(255, Math.trunc((vario - 2) * 85)), 0]
  return { color: `rgb(${rgb.join(',')})`, alpha }
}
export function thermalZoomScale(zoom: number) {
  const z = Math.max(0, Math.min(38, Math.trunc(zoom)))
  return (z % 2 === 0 ? 256 : 362) * 2 ** Math.floor(z / 2)
}
export function mercatorY(latitude: number) {
  const lat = Math.max(-85.05112878, Math.min(85.05112878, latitude))
  return (1 - Math.log(Math.tan((lat * Math.PI) / 360 + Math.PI / 4)) / Math.PI) / 2
}
