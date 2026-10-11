import { tr } from './i18n'
import { useEffect, useState } from 'react'
import { SunMoon } from 'lucide-react'

const storageKey = 'xctrack-designer-editor-theme'
type Theme = 'dark' | 'light'

export function EditorThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      return localStorage.getItem(storageKey) === 'light' ? 'light' : 'dark'
    } catch {
      return 'dark'
    }
  })
  useEffect(() => {
    document.documentElement.dataset.editorTheme = theme
    try {
      localStorage.setItem(storageKey, theme)
    } catch {
      /* Theme remains usable without storage. */
    }
  }, [theme])
  return (
    <label className="editor-theme-toggle">
      {tr('Тема редактора')}
      <SunMoon size={17} aria-hidden="true" />
      <select
        aria-label={tr('Тема редактора')}
        value={theme}
        onChange={(event) => setTheme(event.target.value as Theme)}
      >
        <option value="dark">{tr('Тёмная')}</option>
        <option value="light">{tr('Светлая')}</option>
      </select>
    </label>
  )
}
