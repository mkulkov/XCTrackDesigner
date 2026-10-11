import data from './widget-catalog.json'
import type { Json } from './xcfg'
export type NativeSetting = { key: string; type: string; default?: Json }
export type LibraryWidget = {
  name: string
  title: string
  titleEn: string
  group: string
  groupTitle: string
  family: string
  pro: boolean
  debugOnly: boolean
  settings: NativeSetting[]
}
export const widgetLibrary = data as LibraryWidget[]
export function libraryWidget(name: string) {
  return widgetLibrary.find(
    (entry) => entry.name === name || `org.xcontest.XCTrack.widget.w.${entry.name}` === name,
  )
}
