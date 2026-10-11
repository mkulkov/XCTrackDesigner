import { afterEach, describe, expect, it } from 'vitest'
import { browserLanguage, setEditorLanguagePreference, tr } from '../web/src/i18n'

afterEach(() => setEditorLanguagePreference('auto'))
describe('editor localization', () => {
  it('uses the primary browser language with English fallback', () => {
    expect(browserLanguage(['ru-RU', 'en-US'])).toBe('ru')
    expect(browserLanguage(['RU'])).toBe('ru')
    expect(browserLanguage(['en-US', 'ru'])).toBe('en')
    expect(browserLanguage(['fr-FR'])).toBe('en')
    expect(browserLanguage([])).toBe('en')
  })
  it('translates messages and parameters without altering unknown content', () => {
    setEditorLanguagePreference('en')
    expect(tr('Новая конфигурация')).toBe('New configuration')
    expect(tr('Страница {number} · {count} виджетов', { number: 2, count: 3 })).toBe(
      'Page 2 · 3 widgets',
    )
    expect(tr('user route 123')).toBe('user route 123')
    setEditorLanguagePreference('ru')
    expect(tr('New configuration')).toBe('Новая конфигурация')
  })
})
