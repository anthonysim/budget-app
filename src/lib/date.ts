/** 'YYYY-MM-DD' for the local calendar day. */
export function todayString(now: Date = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Format a 'YYYY-MM-DD' string using the budget's date format. */
export function formatDateString(date: string, format = 'MM/DD/YYYY'): string {
  const [y = '', m = '', d = ''] = date.split('-')
  switch (format) {
    case 'DD/MM/YYYY':
      return `${d}/${m}/${y}`
    case 'YYYY-MM-DD':
      return date
    default:
      return `${m}/${d}/${y}`
  }
}
