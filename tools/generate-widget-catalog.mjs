import { readFileSync, writeFileSync } from 'node:fs'
const report = JSON.parse(
  readFileSync(new URL('../docs/research/widget-library.json', import.meta.url), 'utf8'),
)
const runtime = JSON.parse(
  readFileSync(new URL('../docs/research/widget-native-defaults.json', import.meta.url), 'utf8'),
)
const entries = report.entries.map((entry) => ({
  name: entry.name,
  title: entry.titleRu,
  titleEn: entry.titleEn,
  group: entry.group,
  groupTitle: entry.groupRu,
  family: entry.family,
  pro: entry.pro,
  debugOnly: entry.debugOnly,
  settings: [
    ...new Map(
      [
        ...Object.entries(
          runtime.widgets.find((widget) => widget.CLASS.endsWith(`.${entry.name}`)) ?? {},
        )
          .filter(([key]) => !['CLASS', 'X1', 'Y1', 'X2', 'Y2'].includes(key))
          .map(([key, value]) => ({
            key,
            type:
              typeof value === 'number'
                ? Number.isInteger(value)
                  ? 'integer'
                  : 'number'
                : ['boolean', 'string'].includes(typeof value)
                  ? typeof value
                  : 'json',
            default: value,
          })),
        ...entry.inheritedSettings,
        ...entry.settings,
      ].map((setting) => [
        setting.key,
        {
          key: setting.key,
          type: setting.type,
          ...(Object.hasOwn(setting, 'default') ? { default: setting.default } : {}),
          ...(Object.hasOwn(
            runtime.widgets.find((widget) => widget.CLASS.endsWith(`.${entry.name}`)) ?? {},
            setting.key,
          )
            ? {
                default: runtime.widgets.find((widget) => widget.CLASS.endsWith(`.${entry.name}`))[
                  setting.key
                ],
              }
            : {}),
        },
      ]),
    ).values(),
  ],
}))
writeFileSync(
  new URL('../web/src/widget-catalog.json', import.meta.url),
  JSON.stringify(entries, null, 2) + '\n',
)
console.log(`Generated ${entries.length} catalog entries for profile 91260`)
