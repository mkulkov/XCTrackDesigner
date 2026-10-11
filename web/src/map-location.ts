export type EditorLocation = { latitude: number; longitude: number; source: 'browser' | 'ip' }

export async function locateEditorMap(signal: AbortSignal): Promise<EditorLocation> {
  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(Error('Geolocation unavailable'))
        return
      }
      const timeout = setTimeout(() => reject(Error('Geolocation timeout')), 4500)
      navigator.geolocation.getCurrentPosition(
        (position) => {
          clearTimeout(timeout)
          resolve(position)
        },
        (error) => {
          clearTimeout(timeout)
          reject(error)
        },
        { enableHighAccuracy: false, timeout: 4000, maximumAge: 3600000 },
      )
    })
    if (signal.aborted) throw Error('Aborted')
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      source: 'browser',
    }
  } catch {
    if (signal.aborted) throw Error('Aborted')
  }
  // GeoJS documents latitude/longitude strings. Send no configuration or browser coordinates.
  const response = await fetch('https://get.geojs.io/v1/ip/geo.json', {
    signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]),
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
  })
  if (!response.ok) throw Error('IP location unavailable')
  const data: unknown = await response.json()
  if (!data || typeof data !== 'object') throw Error('Invalid IP location')
  const location = data as { latitude?: unknown; longitude?: unknown }
  const latitude = Number(location.latitude),
    longitude = Number(location.longitude)
  if (
    location.latitude == null ||
    location.longitude == null ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  )
    throw Error('Invalid IP coordinates')
  return { latitude, longitude, source: 'ip' }
}
