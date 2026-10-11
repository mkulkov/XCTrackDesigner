export let nativeFontsReady = false
let loading: Promise<boolean> | undefined
export function loadNativeFonts(): Promise<boolean> {
  if (import.meta.env.VITE_PAGES_MODE === 'true') return Promise.resolve(false)
  loading ??= (async () => {
    try {
      const manifest = (await fetch('/__local-fonts/manifest.json').then((response) =>
        response.json(),
      )) as { available: boolean }
      if (!manifest.available) return false
      const value = new FontFace('XCValue', 'url(/__local-fonts/value.ttf)', { weight: '700' })
      const title = new FontFace('XCTitle', 'url(/__local-fonts/title.ttf)', { weight: '100 900' })
      await Promise.all([value.load(), title.load()])
      document.fonts.add(value)
      document.fonts.add(title)
      nativeFontsReady = true
      return true
    } catch {
      return false
    }
  })()
  return loading
}
