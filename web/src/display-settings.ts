import type { Json } from './xcfg'

// APK: UnitsFragment.java and util/e1.java; values are native serialized unit names.
export const unitChoices: Record<string, readonly (readonly [string, string])[]> = {
  'Unit.Distance': [
    ['m,km', 'Метры / километры'],
    ['mi', 'Мили'],
    ['yd,mi', 'Ярды / мили'],
    ['nm', 'Морские мили'],
  ],
  'Unit.CompetitionDistance': [
    ['m,km', 'Метры / километры'],
    ['mi', 'Мили'],
    ['nm', 'Морские мили'],
  ],
  'Unit.RelativeDistance': [
    ['km', 'Километры'],
    ['nm', 'Морские мили'],
    ['mi', 'Мили'],
  ],
  'Unit.Altitude': [
    ['m', 'Метры'],
    ['ft', 'Футы'],
  ],
  'Unit.AirspaceAltitude': [
    ['m', 'Метры'],
    ['ft', 'Футы'],
  ],
  'Unit.Speed': [
    ['km/h', 'км/ч'],
    ['m/s', 'м/с'],
    ['mph', 'мили/ч'],
    ['kt', 'Узлы'],
  ],
  'Unit.WindSpeed': [
    ['km/h', 'км/ч'],
    ['m/s', 'м/с'],
    ['mph', 'мили/ч'],
    ['kt', 'Узлы'],
  ],
  'Unit.VerticalSpeed': [
    ['m/s', 'м/с'],
    ['ft/min', 'футы/мин'],
    ['100ft/min', '100 футов/мин'],
  ],
}
export const unitLabels: Record<string, string> = {
  'Unit.Distance': 'Расстояние XC',
  'Unit.CompetitionDistance': 'Расстояние в соревновании',
  'Unit.RelativeDistance': 'Относительное расстояние',
  'Unit.Altitude': 'Высота',
  'Unit.AirspaceAltitude': 'Высота воздушных зон',
  'Unit.Speed': 'Скорость',
  'Unit.WindSpeed': 'Скорость ветра',
  'Unit.VerticalSpeed': 'Вертикальная скорость',
}

// APK 91260: preferences_display.xml, values/arrays.xml and config/t0.java:621–632.
export const displayChoices: Record<string, readonly (readonly [string, string])[]> = {
  'Display.Language': [
    ['', 'Язык устройства'],
    ['ru', 'Русский'],
    ['en', 'English'],
  ],
  'Display.Theme': [
    ['BlackTheme', 'Чёрная'],
    ['BlackHCTheme', 'Чёрная, высокий контраст'],
    ['WhiteTheme', 'Белая'],
    ['WhiteHCTheme', 'Белая, высокий контраст'],
    ['WhiteEInkTheme', 'Белая E-ink'],
  ],
  'Display.Orientation': [
    ['SENSOR', 'Автоматически'],
    ['PORTRAIT', 'Портретная'],
    ['LANDSCAPE', 'Альбомная'],
    ['REVERSE_PORTRAIT', 'Обратная портретная'],
    ['REVERSE_LANDSCAPE', 'Обратная альбомная'],
  ],
  'Display.RepaintInterval': [
    ['5000', 'Раз в 5 секунд'],
    ['2000', 'Раз в 2 секунды'],
    ['1000', 'Раз в секунду'],
    ['500', 'Дважды в секунду'],
    ['250', '4 раза в секунду'],
    ['125', 'Экстремальная (расход батареи)'],
    ['1', 'Максимальная (не рекомендуется)'],
  ],
  'Display.WidgetTitleSize': [
    70, 80, 90, 100, 110, 120, 140, 160, 180, 200, 220, 240, 260, 280, 300, 320,
  ].map((value) => [String(value), `${value} %`] as const),
  'Display.WidgetTitleFont': [
    ['default', 'По умолчанию'],
    ['normal', 'Обычный'],
    ['condensed', 'Узкий'],
  ],
}

export const displayDefaults: Record<string, Json> = {
  'Display.Language': '',
  'Display.Theme': 'WhiteTheme',
  'Display.Fullscreen': true,
  'Display.Orientation': 'PORTRAIT',
  'Display.RepaintInterval': '500',
  'Display.WidgetTitleSize': '100',
  'Display.WidgetTitleFont': 'default',
  'Display.WidgetTitleColor': -8421505,
  'Display.WidgetTitleOutline': false,
  'Display.WidgetTitleOutlineColor': -1,
}

export const displayColorKeys = ['Display.WidgetTitleColor', 'Display.WidgetTitleOutlineColor']

/** Only native display settings may enter a preferences command through this panel. */
export function validateDisplayFields(fields: Record<string, Json>): void {
  for (const [key, value] of Object.entries(fields)) {
    if (unitChoices[key]) {
      if (typeof value !== 'string' || !unitChoices[key].some(([choice]) => choice === value))
        throw new Error(`Недопустимая единица: ${key}`)
      continue
    }
    if (!Object.hasOwn(displayDefaults, key))
      throw new Error(`Неизвестная настройка экрана: ${key}`)
    if (displayChoices[key]) {
      if (typeof value !== 'string' || !displayChoices[key].some(([choice]) => choice === value))
        throw new Error(`Недопустимое значение настройки ${key}`)
    } else if (displayColorKeys.includes(key)) {
      if (
        typeof value !== 'number' ||
        !Number.isInteger(value) ||
        value < -2147483648 ||
        value > 4294967295
      )
        throw new Error(`Ожидается целый цвет ARGB: ${key}`)
    } else if (typeof value !== 'boolean') throw new Error(`Ожидается логическое значение: ${key}`)
  }
}

export function displayArgbHex(value: Json): string {
  return typeof value === 'number' && Number.isInteger(value)
    ? `#${(value >>> 0).toString(16).padStart(8, '0').toUpperCase()}`
    : ''
}

export function parseDisplayArgb(value: string): number {
  if (!/^#[\da-f]{8}$/i.test(value)) throw new Error('Цвет должен быть в формате #AARRGGBB')
  return parseInt(value.slice(1), 16) | 0
}
