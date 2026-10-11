import { appMessages } from './i18n-app'
import { errorMessages } from './i18n-errors'
import { catalogMessages } from './i18n-catalog'
import { panelMessages } from './i18n-panels'
import { settingsMessages } from './i18n-settings'

export type EditorLanguage = 'ru' | 'en'
export type LanguagePreference = 'auto' | EditorLanguage
const storageKey = 'xctrack-designer-editor-language'
const listeners = new Set<() => void>()
let preference: LanguagePreference = 'auto'
try {
  const saved = typeof localStorage === 'undefined' ? null : localStorage.getItem(storageKey)
  if (saved === 'ru' || saved === 'en') preference = saved
} catch {
  /* Browser language remains available without storage. */
}

export function browserLanguage(languages: readonly string[]): EditorLanguage {
  return /^ru(?:-|$)/i.test(languages[0] ?? '') ? 'ru' : 'en'
}
export function editorLanguage(): EditorLanguage {
  return preference === 'auto'
    ? typeof navigator === 'undefined'
      ? 'ru'
      : browserLanguage(navigator.languages.length ? navigator.languages : [navigator.language])
    : preference
}
export const editorLanguagePreference = () => preference
export const languageSnapshot = () => `${preference}:${editorLanguage()}`
export function subscribeLanguage(listener: () => void) {
  listeners.add(listener)
  const changed = () => listener()
  if (typeof window !== 'undefined') window.addEventListener('languagechange', changed)
  return () => {
    listeners.delete(listener)
    if (typeof window !== 'undefined') window.removeEventListener('languagechange', changed)
  }
}
export function setEditorLanguagePreference(next: LanguagePreference) {
  preference = next
  try {
    localStorage.setItem(storageKey, next)
  } catch {
    /* Session-only choice. */
  }
  listeners.forEach((listener) => listener())
}
const messages: Record<string, string> = {
  ...appMessages,
  ...catalogMessages,
  ...panelMessages,
  ...settingsMessages,
  ...errorMessages,
}
const sourceMessages = Object.fromEntries(
  Object.entries(messages).map(([source, translated]) => [translated, source]),
)
export function tr(text: string, params: Record<string, string | number> = {}): string {
  const key = text.replace(/\s+/g, ' ').trim()
  const source = sourceMessages[key] ?? key
  const translated =
    editorLanguage() === 'en' ? (messages[source] ?? text) : messages[source] ? source : text
  return translated.replace(/\{([a-zA-Z]\w*)\}/g, (placeholder, name: string) =>
    Object.hasOwn(params, name) ? String(params[name]) : placeholder,
  )
}
