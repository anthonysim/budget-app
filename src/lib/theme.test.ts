import { describe, expect, it } from 'vitest'
import { THEME_STORAGE_KEY, isDark, parseTheme, themeInitScript } from './theme'

describe('theme', () => {
  it('parses stored values, defaulting to system', () => {
    expect(parseTheme('light')).toBe('light')
    expect(parseTheme('dark')).toBe('dark')
    expect(parseTheme('system')).toBe('system')
    expect(parseTheme(null)).toBe('system')
    expect(parseTheme('garbage')).toBe('system')
  })

  it('resolves dark', () => {
    expect(isDark('dark', false)).toBe(true)
    expect(isDark('light', true)).toBe(false)
    expect(isDark('system', true)).toBe(true)
    expect(isDark('system', false)).toBe(false)
  })

  it('init script reads the same storage key', () => {
    expect(themeInitScript).toContain(`'${THEME_STORAGE_KEY}'`)
  })
})
