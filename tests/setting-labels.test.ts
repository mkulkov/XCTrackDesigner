import { test, expect } from 'vitest'
import { widgetLibrary } from '../web/src/widget-library'
import { settingLabels } from '../web/src/setting-labels'

test('every native catalog setting has a readable caption', () => {
  for (const widget of widgetLibrary)
    for (const setting of widget.settings) {
      expect(settingLabels[setting.key], `${widget.name}.${setting.key}`).toBeTruthy()
      expect(settingLabels[setting.key]).not.toBe(setting.key)
    }
})
