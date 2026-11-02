/** 0 -> "12am", 7 -> "7am", 12 -> "12pm", 22 -> "10pm" */
export function formatHour(hour: number): string {
  if (hour === 0) return '12am'
  if (hour < 12) return `${hour}am`
  if (hour === 12) return '12pm'
  return `${hour - 12}pm`
}

/** "7am", "12pm", "07:00", "7:00 AM", "13:00" -> 24h hour, or null when not a whole-hour label. */
export function parseHourLabel(label: string): number | null {
  const m = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i.exec(label.trim())
  if (!m) return null
  const hour = Number(m[1])
  if (m[2] !== undefined && m[2] !== '00') return null
  const meridiem = m[3]?.toLowerCase()
  if (!meridiem) return hour <= 23 ? hour : null
  if (hour < 1 || hour > 12) return null
  return (hour % 12) + (meridiem === 'pm' ? 12 : 0)
}
