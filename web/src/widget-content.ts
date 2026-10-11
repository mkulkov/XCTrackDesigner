import type { Json, Widget } from './xcfg'

// Labels and formatter families from pinned 91260 APK widget/w/W*.java,
// util/x.java, util/e1.java and values[-ru]/strings.xml. SVG approximation;
// these sources do not prove Android pixel or flight algorithm parity.
type Format =
  | 'altitude'
  | 'signedAltitude'
  | 'speed'
  | 'xcSpeed'
  | 'glide'
  | 'distance'
  | 'optiDistance'
  | 'vertical'
  | 'temperature'
  | 'humidity'
  | 'percentage'
  | 'pressure'
  | 'flightLevel'
  | 'direction'
  | 'digitalCompass'
  | 'sunset'
  | 'clock'
  | 'interval'
  | 'text'
  | 'freeText'
type Spec = { title: string; englishTitle: string; format: Format; textWidget: boolean }

export const contentSpecs: Record<string, Spec> = {
  WSunset: { title: 'Закат', englishTitle: 'Sunset', format: 'sunset', textWidget: false },
  WSunsetCivil: {
    title: 'Гражданские сумерки',
    englishTitle: 'Civil twilight',
    format: 'sunset',
    textWidget: false,
  },
  WOptiResult: {
    title: 'XC дистанция полета',
    englishTitle: 'XC Distance',
    format: 'optiDistance',
    textWidget: false,
  },
  WOptiUnfinishedTriangle: {
    title: 'НЕЗАВЕРШЕННЫЙ Треугольник',
    englishTitle: 'UNFINISHED Triangle',
    format: 'optiDistance',
    textWidget: false,
  },
  WCompassDigital: {
    title: 'Компас',
    englishTitle: 'Compass',
    format: 'digitalCompass',
    textWidget: false,
  },
  WCompPercentage: {
    title: '% от скоростной секции',
    englishTitle: '% of speed section',
    format: 'percentage',
    textWidget: false,
  },
  WCompTimeToStart: {
    title: 'Время до старта',
    englishTitle: 'Time to start',
    format: 'text',
    textWidget: true,
  },
  WNextTurnpoint: {
    title: 'Следующая точка',
    englishTitle: 'Next Turnpoint',
    format: 'text',
    textWidget: true,
  },
  WAltitude: {
    title: 'GPS Высота',
    englishTitle: 'GPS Alt',
    format: 'altitude',
    textWidget: false,
  },
  WAltitudeAboveGround: {
    title: 'Высота над землей',
    englishTitle: 'AGL',
    format: 'altitude',
    textWidget: false,
  },
  WAltitudeMaximum: {
    title: 'Максимальная высота',
    englishTitle: 'Max altitude',
    format: 'altitude',
    textWidget: false,
  },
  WBaroAltitude: {
    title: 'Высота по барометру',
    englishTitle: 'Baro Alt',
    format: 'altitude',
    textWidget: false,
  },
  WTakeoffHeightAbove: {
    title: 'Высота над стартом',
    englishTitle: 'Altitude above takeoff',
    format: 'altitude',
    textWidget: false,
  },
  WThermalAltGain: {
    title: 'Выигрыш в термике',
    englishTitle: 'Thermal gain',
    format: 'signedAltitude',
    textWidget: false,
  },
  WCompAltitudeOverGoal: {
    title: 'Высота над финишем',
    englishTitle: 'Altitude over goal',
    format: 'signedAltitude',
    textWidget: false,
  },
  WCompAltitudeOverESS: {
    title: 'Высота над ESS',
    englishTitle: 'Altitude over ESS',
    format: 'signedAltitude',
    textWidget: false,
  },
  WNextTurnpointAlt: {
    title: 'Следующая высота поворотного пункта',
    englishTitle: 'Next TP Height',
    format: 'signedAltitude',
    textWidget: false,
  },
  WAirSpeed: {
    title: 'Воздушная скорость',
    englishTitle: 'Airspeed',
    format: 'speed',
    textWidget: false,
  },
  WWindSpeed: {
    title: 'Скорость ветра',
    englishTitle: 'Wind Speed',
    format: 'speed',
    textWidget: false,
  },
  WCompSpeedToStart: {
    title: 'Скорость до старта',
    englishTitle: 'Speed to start',
    format: 'speed',
    textWidget: false,
  },
  WXCSpeed: {
    title: 'Средняя XC скорость',
    englishTitle: 'Average XC speed',
    format: 'xcSpeed',
    textWidget: false,
  },
  WGlide: { title: 'Качество', englishTitle: 'Glide Ratio', format: 'glide', textWidget: false },
  WCompGlideToGoal: {
    title: 'Качество до финиша',
    englishTitle: 'Glide to goal',
    format: 'glide',
    textWidget: false,
  },
  WCompGlideToESS: {
    title: 'Качество до ESS',
    englishTitle: 'Glide to ESS',
    format: 'glide',
    textWidget: false,
  },
  WNextTurnpointGlideTo: {
    title: 'Аэродинамическое качество к поворотному пункту',
    englishTitle: 'Glide Ratio to TP',
    format: 'glide',
    textWidget: false,
  },
  WTakeoffDistance: {
    title: 'Дистанция от старта',
    englishTitle: 'Distance from takeoff',
    format: 'distance',
    textWidget: false,
  },
  WCompDistanceToGoal: {
    title: 'Дистанция до финиша',
    englishTitle: 'Distance to goal',
    format: 'distance',
    textWidget: false,
  },
  WCompDistanceToESS: {
    title: 'Расстояние до ESS',
    englishTitle: 'Distance to ESS',
    format: 'distance',
    textWidget: false,
  },
  WNextTurnpointDistance: {
    title: 'Дистанция до следующей',
    englishTitle: 'Distance Next',
    format: 'distance',
    textWidget: false,
  },
  WNettoVario: {
    title: 'Нетто варио',
    englishTitle: 'Netto vario',
    format: 'vertical',
    textWidget: false,
  },
  WAirTemperature: {
    title: 'Температура воздуха',
    englishTitle: 'Air Temperature',
    format: 'temperature',
    textWidget: false,
  },
  WAirHumidity: {
    title: 'Влажность воздуха',
    englishTitle: 'Air Humidity',
    format: 'humidity',
    textWidget: false,
  },
  WQNH: {
    title: 'Атмосферное давление в данной точке',
    englishTitle: 'QNH',
    format: 'pressure',
    textWidget: false,
  },
  WFL: { title: 'Эшелон', englishTitle: 'Flight Level', format: 'flightLevel', textWidget: false },
  WWindDirection: {
    title: 'Направление ветра',
    englishTitle: 'Wind Direction',
    format: 'direction',
    textWidget: true,
  },
  WBearing: { title: 'Курс', englishTitle: 'Bearing', format: 'direction', textWidget: true },
  WTakeoffCourse: {
    title: 'Курс на старт',
    englishTitle: 'Course to takeoff',
    format: 'direction',
    textWidget: false,
  },
  WTime: { title: 'Время', englishTitle: 'Time', format: 'clock', textWidget: true },
  WCompTimeAtStart: {
    title: 'Время старта',
    englishTitle: 'Time at start',
    format: 'interval',
    textWidget: false,
  },
  WNextTurnpointTimeOfArrival: {
    title: 'Время прибытия к следующему поворотному пункту',
    englishTitle: 'Next TP TOA',
    format: 'interval',
    textWidget: false,
  },
  WExternalData: {
    title: 'Отображение внешних данных',
    englishTitle: 'External data display',
    format: 'text',
    textWidget: true,
  },
  WLocation: {
    title: 'Местоположение',
    englishTitle: 'Location',
    format: 'text',
    textWidget: true,
  },
  WLastEvent: {
    title: 'Последнее событие',
    englishTitle: 'Last event',
    format: 'text',
    textWidget: true,
  },
  WLastKey: {
    title: 'Последняя нажатая кнопка',
    englishTitle: 'Last key pressed',
    format: 'text',
    textWidget: true,
  },
  WBrightnessInfo: {
    title: 'Яркость дисплея',
    englishTitle: 'Brightness of the display',
    format: 'text',
    textWidget: true,
  },
  WFreeText: { title: 'Текст', englishTitle: 'Free text', format: 'freeText', textWidget: false },
}

// Supplied numeric readings are SI (m, m/s, Celsius, Pa, degrees), except
// flight level and glide ratio. Text readings are supplied display strings.
// Never infer wind, terrain, navigation or sensor readings from legacy Frame.
export type WidgetValues = Readonly<Record<string, number | string | null>>
const speedFactors: Record<string, number> = {
  'km/h': 3.6,
  'm/s': 1,
  mph: 2.236936292054402,
  kt: 1.943844,
}
const altitudeFactors: Record<string, number> = {
  m: 1,
  ft: 3.280839895013123,
  yd: 1.0936132983377078,
}
const verticalFactors: Record<string, number> = {
  'm/s': 1,
  'ft/min': 196.85039370078738,
  '100ft/min': 1.968503937007874,
}
const unitLabels: Record<string, string> = {
  m: 'м',
  km: 'км',
  ft: 'фт',
  yd: 'ярд',
  mi: 'миль',
  kt: 'узл',
  'm/s': 'м/с',
  'km/h': 'км/ч',
  mph: 'миль/ч',
  'ft/min': 'фт',
  '100ft/min': '100фт',
}

// util/x.java i/k/l/h accept milliseconds; public supplied readings use seconds.
export function intervalText(seconds: number, format: Json | undefined, ru: boolean, plus = false) {
  if (Math.abs(seconds) > 360000) return '∞'
  const prefix = seconds < 0 ? '-' : plus ? '+' : ''
  const n = Math.floor(Math.abs(seconds))
  const hours = Math.floor(n / 3600)
  const minutes = Math.floor(n / 60) % 60
  const secs = n % 60
  const pad = (v: number) => String(v).padStart(2, '0')
  if (format === 'HM') return `${prefix}${hours}:${pad(minutes)}`
  if (format === 'HMS') return `${prefix}${hours}:${pad(minutes)}:${pad(secs)}`
  if (format === 'WITH_UNITS') {
    const minute = ru ? 'мин' : 'min'
    const grammatical = (v: number, words: string[]) => words[v >= 0 && v < 5 ? v : 0]
    const secondsWord = ru
      ? grammatical(n, ['секунд', 'секунда', 'секунд', 'секунд', 'секунд'])
      : n === 1
        ? 'second'
        : 'seconds'
    const minutesWord = ru
      ? grammatical(Math.floor(n / 60), ['минут', 'минута', 'минуты', 'минуты', 'минуты'])
      : Math.floor(n / 60) === 1
        ? 'minute'
        : 'minutes'
    const hour = ru
      ? grammatical(hours, ['часов', 'час', 'часа', 'часа', 'часа'])
      : hours === 1
        ? 'hour'
        : 'hours'
    if (n < 60) return `${prefix}${n} ${secondsWord}`
    if (n < 1200) return `${prefix}${Math.floor(n / 60)} ${minute} ${secs} ${ru ? 'сек' : 'sec'}`
    if (n < 3600) return `${prefix}${Math.floor(n / 60)} ${minutesWord}`
    return `${prefix}${hours} ${hour} ${minutes} ${minute}`
  }
  return hours > 0
    ? `${prefix}${hours}:${pad(minutes)}:${pad(secs)}`
    : `${prefix}${pad(minutes)}:${pad(secs)}`
}

// WGS84 transverse Mercator. Only display conversion; never a flight calculation.
function utmCoordinates(lat: number, lon: number) {
  let zone = Math.min(60, Math.max(1, Math.floor((lon + 180) / 6) + 1))
  if (lat >= 56 && lat < 64 && lon >= 3 && lon < 12) zone = 32
  if (lat >= 72 && lat < 84 && lon >= 0 && lon < 42)
    zone = lon < 9 ? 31 : lon < 21 ? 33 : lon < 33 ? 35 : 37
  const rad = Math.PI / 180
  const phi = lat * rad
  const eccentricity = 0.0066943799901413165
  const e2 = eccentricity / (1 - eccentricity)
  const n = 6378137 / Math.sqrt(1 - eccentricity * Math.sin(phi) ** 2)
  const t = Math.tan(phi) ** 2
  const c = e2 * Math.cos(phi) ** 2
  const a = Math.cos(phi) * (lon - (zone * 6 - 183)) * rad
  const m =
    6378137 *
    ((1 - eccentricity / 4 - (3 * eccentricity ** 2) / 64 - (5 * eccentricity ** 3) / 256) * phi -
      ((3 * eccentricity) / 8 + (3 * eccentricity ** 2) / 32 + (45 * eccentricity ** 3) / 1024) *
        Math.sin(2 * phi) +
      ((15 * eccentricity ** 2) / 256 + (45 * eccentricity ** 3) / 1024) * Math.sin(4 * phi) -
      ((35 * eccentricity ** 3) / 3072) * Math.sin(6 * phi))
  const east =
    500000 +
    0.9996 *
      n *
      (a + ((1 - t + c) * a ** 3) / 6 + ((5 - 18 * t + t ** 2 + 72 * c - 58 * e2) * a ** 5) / 120)
  const north =
    (lat < 0 ? 10000000 : 0) +
    0.9996 *
      (m +
        n *
          Math.tan(phi) *
          (a ** 2 / 2 +
            ((5 - t + 9 * c + 4 * c ** 2) * a ** 4) / 24 +
            ((61 - 58 * t + t ** 2 + 600 * c - 330 * e2) * a ** 6) / 720))
  const band = 'CDEFGHJKLMNPQRSTUVWX'[Math.min(19, Math.max(0, Math.floor((lat + 80) / 8)))]
  return `${zone} ${band}\n${Math.round(east).toString().padStart(7, '0')}\n${Math.round(north).toString().padStart(7, '0')}`
}

function locationText(format: Json | undefined, position?: { lat: number; lon: number } | null) {
  if (!position || !Number.isFinite(position.lat) || !Number.isFinite(position.lon)) {
    if (format === 'DEG_MIN') return "--° --.----' -\n--° --.----' -"
    if (format === 'DEG_MIN_SEC') return '--° --\' --" -\n--° --\' --" -'
    if (format === 'UTM') return '-- -\n-------\n-------'
    return '--.---- -\n--.---- -'
  }
  if (format === 'UTM')
    return position.lat >= -80 && position.lat < 84
      ? utmCoordinates(position.lat, position.lon)
      : '-- -\n-------\n-------'
  return [position.lat, position.lon]
    .map((coordinate, index) => {
      const absolute = Math.abs(coordinate)
      const hemisphere = index === 0 ? (coordinate >= 0 ? 'N' : 'S') : coordinate >= 0 ? 'E' : 'W'
      const degree = Math.floor(absolute)
      const minutes = (absolute - degree) * 60
      if (format === 'DEG_MIN') return `${degree}° ${minutes.toFixed(4)}' ${hemisphere}`
      if (format === 'DEG_MIN_SEC')
        return `${degree}° ${Math.floor(minutes)}' ${Math.floor((minutes % 1) * 60 + 0.5)}" ${hemisphere}`
      return `${absolute.toFixed(4)} ${hemisphere}`
    })
    .join('\n')
}

export function contentReading(
  w: Widget,
  prefs: Record<string, Json>,
  values: WidgetValues = {},
  position?: { lat: number; lon: number } | null,
) {
  const name = w.CLASS.replace('org.xcontest.XCTrack.widget.w.', '')
  const spec = contentSpecs[name]
  if (
    !spec ||
    !Object.hasOwn(contentSpecs, name) ||
    !w.CLASS.startsWith('org.xcontest.XCTrack.widget.w.')
  )
    return null
  const ru = prefs['Display.Language'] !== 'en'
  const raw = values[name]
  const value = typeof raw === 'number' && Number.isFinite(raw) ? raw : null
  let text = ''
  let unit = ''
  let number = value
  let decimals = 0
  let signed = false
  const floorRounding =
    spec.format === 'distance' ||
    spec.format === 'optiDistance' ||
    name === 'WCompAltitudeOverGoal' ||
    name === 'WCompAltitudeOverESS' ||
    name === 'WNextTurnpointAlt' ||
    name === 'WNextTurnpointGlideTo'
  if (spec.format === 'freeText') {
    text =
      typeof w.text === 'string'
        ? w.text
        : ru
          ? 'Редактирование текста по умолчанию'
          : 'Change me in widget settings'
  } else if (spec.format === 'digitalCompass') {
    unit = '°'
    if (value !== null) {
      const degrees = Math.floor(value + 0.5)
      if (w.relative !== false) {
        const arrow =
          degrees > 120
            ? '⬊'
            : degrees > 60
              ? '⮕'
              : degrees > 0
                ? '⬈'
                : degrees === 0
                  ? '⬆'
                  : degrees > -60
                    ? '⬉'
                    : degrees > -120
                      ? '⬅'
                      : '⬋'
        text = `${arrow}${Math.abs(degrees)}`
      } else text = String(Math.floor((((value % 360) + 360) % 360) + 0.5))
    }
  } else if (spec.format === 'sunset') {
    const supplied = values[`${name}.remaining`]
    const remaining =
      typeof supplied === 'number' && Number.isFinite(supplied)
        ? supplied
        : w.relative === 'RELATIVE_TIME'
          ? value
          : null
    if (typeof raw === 'string') text = raw
    else if (value !== null) {
      const seconds =
        w.relative === 'RELATIVE_TIME'
          ? Math.floor(Math.abs(remaining ?? value) / 60) * 60
          : ((value % 86400) + 86400) % 86400
      text = `${w.relative === 'RELATIVE_TIME' ? '+' : ''}${Math.floor(seconds / 3600)}:${String(Math.floor(seconds / 60) % 60).padStart(2, '0')}`
      if (w.relative !== 'RELATIVE_TIME') text = text.padStart(5, '0')
    }
    if (
      remaining !== null &&
      typeof w.showBefore === 'number' &&
      w.showBefore > 0 &&
      Math.floor(remaining / 60) * 60000 > w.showBefore
    )
      text = ''
  } else if (name === 'WLocation') {
    const pair =
      typeof raw === 'string' ? raw.match(/^\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*$/) : null
    text =
      position || pair || typeof raw !== 'string'
        ? locationText(
            w._format,
            position ?? (pair ? { lat: Number(pair[1]), lon: Number(pair[2]) } : null),
          )
        : raw
  } else if (spec.format === 'interval') {
    text =
      typeof raw === 'string'
        ? raw
        : value === null
          ? ''
          : intervalText(value, w.time_format, ru, name === 'WCompTimeAtStart')
  } else if (spec.format === 'text' || spec.format === 'clock') {
    text =
      typeof raw === 'string'
        ? raw
        : spec.format === 'clock'
          ? w.showSec === false
            ? '--:--'
            : '--:--:--'
          : name === 'WExternalData'
            ? '-'
            : name === 'WBrightnessInfo'
              ? '?'
              : name === 'WLastKey'
                ? ru
                  ? 'Ничего'
                  : 'None'
                : ''
    if (spec.format === 'clock' && w.showSec === false && /^\d{2}:\d{2}:\d{2}$/.test(text))
      text = text.slice(0, 5)
    if (name === 'WExternalData' && typeof w.suffix === 'string') text += w.suffix
    if (name === 'WCompTimeToStart' && value !== null)
      text = intervalText(-Math.abs(value), 'COMPACT', ru)
    if (name === 'WBrightnessInfo' && value !== null) text = `${Math.round(value)}%`
  } else if (spec.format === 'direction') {
    if (value !== null) {
      const degrees = ((value % 360) + 360) % 360
      if (w.degrees === true)
        text = `${Math.floor(degrees + 0.5)}${name === 'WTakeoffCourse' ? '' : '°'}`
      else {
        const compass = ru
          ? [
              'С',
              'ССВ',
              'СВ',
              'ВСВ',
              'В',
              'ВЮВ',
              'ЮВ',
              'ЮЮВ',
              'Ю',
              'ЮЮЗ',
              'ЮЗ',
              'ЗЮЗ',
              'З',
              'ЗСЗ',
              'СЗ',
              'ССЗ',
            ]
          : [
              'N',
              'NNE',
              'NE',
              'ENE',
              'E',
              'ESE',
              'SE',
              'SSE',
              'S',
              'SSW',
              'SW',
              'WSW',
              'W',
              'WNW',
              'NW',
              'NNW',
            ]
        text = compass[Math.floor((degrees + 11.25) / 22.5) % 16]!
      }
    }
  } else {
    if (spec.format === 'altitude' || spec.format === 'signedAltitude') {
      const overrides: Record<string, string> = { METER: 'm', FOOT: 'ft', YARD: 'yd' }
      const override =
        (name === 'WAltitude' || name === 'WBaroAltitude') &&
        w._units !== undefined &&
        w._units !== 'SYS_UNIT'
      const selected = override
        ? typeof w._units === 'string'
          ? overrides[w._units]
          : undefined
        : (prefs['Unit.Altitude'] ?? 'm')
      if (typeof selected !== 'string' || altitudeFactors[selected] === undefined) return null
      unit = selected
      number = value === null ? null : value * altitudeFactors[unit]!
      if (name === 'WAltitudeAboveGround' && number !== null) number = Math.max(0, number)
      signed = spec.format === 'signedAltitude' && name !== 'WNextTurnpointAlt'
    } else if (spec.format === 'speed' || spec.format === 'xcSpeed') {
      const selected = prefs[name === 'WWindSpeed' ? 'Unit.WindSpeed' : 'Unit.Speed'] ?? 'km/h'
      if (typeof selected !== 'string' || speedFactors[selected] === undefined) return null
      unit = selected
      number = value === null ? null : value * speedFactors[unit]!
      decimals = unit === 'm/s' || spec.format === 'xcSpeed' ? 1 : 0
    } else if (spec.format === 'vertical') {
      const selected = prefs['Unit.VerticalSpeed'] ?? 'm/s'
      if (typeof selected !== 'string' || verticalFactors[selected] === undefined) return null
      unit = selected
      number = value === null ? null : value * verticalFactors[unit]!
      decimals = unit === 'ft/min' ? 0 : 1
      signed = true
    } else if (spec.format === 'temperature') {
      if (w._units !== undefined && w._units !== 'CELSIUS' && w._units !== 'FAHRENHEIT') return null
      unit = w._units === 'FAHRENHEIT' ? '°F' : '°C'
      number = value === null ? null : unit === '°F' ? value * 1.8 + 32 : value
      decimals = 1
    } else if (spec.format === 'humidity') unit = '%'
    else if (spec.format === 'percentage') {
      number = null
      if (value !== null && value >= 0 && value <= 100) {
        const floor = Math.floor(value)
        // Math.rint in WCompPercentage uses ties-to-even rather than Math.round.
        const integer =
          value - floor === 0.5 ? (floor % 2 === 0 ? floor : floor + 1) : Math.round(value)
        text = `${integer}%`
      }
    } else if (spec.format === 'pressure') {
      unit = 'hPa'
      number = value === null ? null : value / 100
      decimals = 2
    } else if (spec.format === 'flightLevel') {
      unit = 'FL'
      // A supplied flight level, never calculated from pressure or AMSL here.
      if (w._decimals !== undefined && !['0', '0.0', '0.00'].includes(String(w._decimals)))
        return null
      decimals = w._decimals === '0.00' ? 2 : w._decimals === '0.0' ? 1 : 0
    } else if (spec.format === 'glide') {
      if (value !== null) {
        const prefix = w.headless === true ? '' : '1:'
        if (value < 0) text = ''
        else if (value >= 100) text = prefix
        else
          text =
            prefix +
            (
              Math.floor(value * (value < 15 ? 10 : 1) + (floorRounding ? 0 : 0.5)) /
              (value < 15 ? 10 : 1)
            ).toFixed(value < 15 ? 1 : 0)
      }
      number = null
    } else if (spec.format === 'distance' || spec.format === 'optiDistance') {
      const distanceFactors: Record<string, number> = {
        ...altitudeFactors,
        km: 0.001,
        mi: 0.0006213711922373339,
        nm: 0.0005399568034557236,
      }
      const units = String(
        prefs[spec.format === 'optiDistance' ? 'Unit.Distance' : 'Unit.CompetitionDistance'] ??
          'm,km',
      ).split(',')
      if (units.some((u) => !Object.hasOwn(distanceFactors, u)) || units.length > 2) return null
      const second = units[1]
      const useLarge =
        second !== undefined && value !== null && Math.abs(value * distanceFactors[second]!) >= 1
      unit = useLarge ? second! : units[0]!
      number = value === null ? null : value * distanceFactors[unit]!
      // util/p precision threshold is in SI metres; small paired unit is integer.
      decimals =
        second && !useLarge
          ? 0
          : value !== null && Math.abs(value) < 10
            ? 2
            : value !== null && Math.abs(value) < 100
              ? 1
              : second &&
                  number !== null &&
                  Math.abs(number) < (spec.format === 'optiDistance' ? 500 : 1000)
                ? 1
                : 0
    }
    if (number !== null) {
      text = (
        Math.floor(number * 10 ** decimals + (floorRounding ? 0 : 0.5)) /
        10 ** decimals
      ).toFixed(decimals)
      if (signed && !text.startsWith('-')) text = '+' + text
    }
    if (ru) text = text.replace('.', ',')
  }
  if (ru) unit = unitLabels[unit] ?? unit
  if (
    text &&
    w.use_brackets !== false &&
    [
      'WNextTurnpointDistance',
      'WNextTurnpointAlt',
      'WNextTurnpointGlideTo',
      'WNextTurnpointTimeOfArrival',
      'WCompTimeAtStart',
      'WCompSpeedToStart',
    ].includes(name)
  ) {
    const target = w.navigation_target ?? 'OPTIMIZED'
    if (target === 'OPTIMIZED') text = `[${text}]`
    else if (target === 'CYLINDER') text = `(${text})`
  }
  let title = ru ? spec.title : spec.englishTitle
  if (name === 'WAirSpeed') title += w.speed_type === 'IAS' ? ' IAS' : ' TAS'
  if (name === 'WNextTurnpointAlt')
    title += ` ${w.altitude === 'AMSL' ? 'AMSL' : w.altitude === 'DROP' ? 'DROP' : 'AGL'}`
  if (name === 'WBaroAltitude' && w._altType === 'STD') title += ' STD'
  if (name === 'WCompassDigital') {
    const targets: Record<string, string> = ru
      ? {
          N_BEARING: 'Курс',
          N_HEADING: 'Направление',
          N_NAVIGATION_POINT: 'Точка',
          N_NAVIGATION: 'Оптимизированная',
          N_NAVIGATION_CYLINDER: 'Цилиндр',
          N_WIND: 'Направление ветра',
        }
      : {
          N_BEARING: 'Bearing',
          N_HEADING: 'Heading',
          N_NAVIGATION_POINT: 'Point',
          N_NAVIGATION: 'Optimized',
          N_NAVIGATION_CYLINDER: 'Cylinder',
          N_WIND: 'Wind Direction',
        }
    title += ` ${targets[String(w.target ?? 'N_NAVIGATION')] ?? ''}`
  }
  let tone = 'normal'
  if (value !== null) {
    if (name === 'WNettoVario') tone = value >= 0 ? 'green' : value <= -1 ? 'red' : 'normal'
    if (name === 'WThermalAltGain') tone = value > 0 ? 'green' : 'red'
    if (name === 'WCompAltitudeOverGoal' || name === 'WCompAltitudeOverESS')
      tone = value < 0 ? 'red' : 'green'
    if (name === 'WCompTimeAtStart') tone = value > 0 ? 'green' : 'red'
    if (name === 'WCompassDigital' && w.relative !== false) tone = value >= 0 ? 'green' : 'red'
  }
  if (spec.format === 'sunset') {
    const supplied = values[`${name}.remaining`]
    const remaining =
      typeof supplied === 'number' ? supplied : w.relative === 'RELATIVE_TIME' ? value : null
    if (remaining !== null) tone = remaining < 0 ? 'red' : remaining <= 1800 ? 'orange' : 'normal'
  }
  return {
    name,
    text,
    unit,
    split: unit.includes('/'),
    tone,
    kind: spec.textWidget || spec.format === 'freeText' ? 'text' : 'value',
    formatterValue: ['WAirSpeed', 'WNettoVario', 'WWindSpeed', 'WQNH'].includes(name),
    missing:
      spec.format === 'freeText'
        ? false
        : spec.format === 'text' ||
            spec.format === 'clock' ||
            spec.format === 'interval' ||
            spec.format === 'sunset'
          ? typeof raw !== 'string' && value === null
          : value === null && !['WAirSpeed', 'WNettoVario', 'WWindSpeed', 'WQNH'].includes(name),
    title,
    lineWeights:
      (name === 'WNextTurnpoint' || name === 'WCompTimeToStart') && text.includes('\n')
        ? [2, 1]
        : undefined,
    align: name === 'WLocation' ? ('right' as const) : ('center' as const),
  }
}
