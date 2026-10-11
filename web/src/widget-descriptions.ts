import { libraryWidget } from './widget-library'

const descriptions: Record<string, string> = {
  WSpeed: 'Скорость движения относительно земли по GPS.',
  WVerticalSpeed: 'Вертикальная скорость: подъём или снижение.',
  WAMSL: 'Высота над уровнем моря.',
  WAirTime: 'Продолжительность текущего полёта.',
  WCompass: 'Курс, направление к цели и ветер на круговой шкале.',
  WVerticalGraph: 'История вертикальной скорости за выбранный интервал.',
  WAltitudeDataGraph: 'График высоты, скорости или ветра.',
  WThermalAssistant: 'Траектория движения в термике, подъём и направление ветра.',
  WSideView: 'Боковой профиль высоты, рельефа и прибытия к цели.',
  WCompTaskSummary: 'Сводка маршрута: следующий пункт, расстояние и прибытие.',
  WXCAssistant: 'Карта полёта с треком и навигационными слоями.',
  WCompMap: 'Карта задачи и её поворотных пунктов.',
  WStatusLine: 'Состояние GPS, датчиков, связи, батареи и часов.',
  WFreeText: 'Произвольная надпись с настройками размера и цвета.',
  WAirspaceProximity: 'Расстояние до контуров ближайших воздушных зон.',
  WWindSpeed: 'Скорость ветра.',
  WWindDirection: 'Направление, откуда дует ветер.',
  WGlide: 'Отношение горизонтальной скорости к скорости снижения.',
}
export function widgetDescription(name: string): string {
  const current = libraryWidget(name)
  return current
    ? (descriptions[current.name] ??
        (current.family === 'button'
          ? `Кнопка «${current.title}». В XCTrack выполняет соответствующее действие; в редакторе служит для компоновки экрана.`
          : current.debugOnly
            ? `Диагностический виджет «${current.title}» для проверки состояния приложения.`
            : current.family === 'webview'
              ? 'Область веб-содержимого. В редакторе отображается без загрузки и исполнения страницы.'
              : `Отображает ${current.title.toLowerCase()}.`))
    : 'Описание этого виджета отсутствует в библиотеке XCTrack.'
}
