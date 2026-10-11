import { libraryWidget } from './widget-library'
import { editorLanguage, tr } from './i18n'

export function widgetTitle(name: string): string {
  const current = libraryWidget(name)
  return current ? (editorLanguage() === 'en' ? current.titleEn : current.title) : name
}

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
  const description = current ? descriptions[current.name] : undefined
  return current
    ? description
      ? tr(description)
      : current.family === 'button'
        ? tr(
            'Кнопка «{title}». В XCTrack выполняет соответствующее действие; в редакторе служит для компоновки экрана.',
            { title: widgetTitle(name) },
          )
        : current.debugOnly
          ? tr('Диагностический виджет «{title}» для проверки состояния приложения.', {
              title: widgetTitle(name),
            })
          : current.family === 'webview'
            ? tr(
                'Область веб-содержимого. В редакторе отображается без загрузки и исполнения страницы.',
              )
            : tr('Отображает {title}.', { title: widgetTitle(name).toLowerCase() })
    : tr('Описание этого виджета отсутствует в библиотеке XCTrack.')
}
