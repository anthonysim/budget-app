export type Theme = 'light' | 'dark' | 'system'

export const THEME_STORAGE_KEY = 'theme'

export function parseTheme(raw: unknown): Theme {
  return raw === 'light' || raw === 'dark' ? raw : 'system'
}

export function isDark(theme: Theme, systemPrefersDark: boolean): boolean {
  return theme === 'dark' || (theme === 'system' && systemPrefersDark)
}

/**
 * Inline script run in <head> before first paint so the right theme class is on <html>
 * (avoids a light-mode flash for dark-mode users). Keep in sync with isDark().
 */
export const themeInitScript = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');var d=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d)}catch(e){}})()`
