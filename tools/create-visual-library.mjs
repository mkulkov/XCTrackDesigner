import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
const catalog = JSON.parse(readFileSync('web/src/widget-catalog.json', 'utf8'))
const first = ['WThermalAssistant', 'WXCAssistant', 'WCompMap', 'WCompass']
const entries = [
  ...first.map((name) => catalog.find((w) => w.name === name)),
  ...catalog.filter((w) => !first.includes(w.name)),
]
const pages = []
for (let start = 0; start < entries.length; start += 8) {
  pages.push({
    CLASS: 'org.xcontest.XCTrack.widget.wp.WPXCAssistant',
    navigations: 'all',
    widgets: entries.slice(start, start + 8).map((w, i) => ({
      ...Object.fromEntries(
        w.settings.filter((s) => Object.hasOwn(s, 'default')).map((s) => [s.key, s.default]),
      ),
      CLASS: `org.xcontest.XCTrack.widget.w.${w.name}`,
      X1: (i % 2) * 5000,
      Y1: Math.floor(i / 2) * 2500,
      X2: ((i % 2) + 1) * 5000,
      Y2: (Math.floor(i / 2) + 1) * 2500,
      _theme: i % 2 ? 'WhiteHCTheme' : 'BlackHCTheme',
      _border: true,
      _bg: 0,
      ...(w.name === 'WFreeText' ? { text: 'XCTrack QA' } : {}),
    })),
  })
}
mkdirSync('.local/android-qa', { recursive: true })
writeFileSync(
  '.local/android-qa/visual-library.xcfg',
  JSON.stringify({
    info: { versionCode: 91260, versionName: '0.9.12.6', exportType: 'pages' },
    layout: { portrait: pages, landscape: [] },
  }),
)
writeFileSync(
  '.local/android-qa/visual-library-index.json',
  JSON.stringify(
    pages.map((p, i) => ({
      page: i + 1,
      widgets: p.widgets.map((w) => w.CLASS.split('.').at(-1)),
    })),
    null,
    2,
  ),
)
console.log(
  `Created ${pages.length} pages / ${entries.length} widgets in .local/android-qa/visual-library.xcfg`,
)
