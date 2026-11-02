import { DAILY_CAP_HOURS } from '../../lib/shifts'
import type { Warning } from '../../lib/warnings'
import type { Schedule } from '../../types'

/** A full sentence for a staff-related warning; empty for understaffed hours (those are shown as amber cells). */
export function warningSentence(schedule: Schedule, w: Warning): string {
  const nameOf = (id: string) => schedule.staff.find((m) => m.id === id)?.name ?? 'Someone'
  switch (w.type) {
    case 'over-max':
      return `${nameOf(w.staffId)} is scheduled ${w.assignedHours}h, over their ${w.maxHours}h weekly limit.`
    case 'over-daily':
      return `${nameOf(w.staffId)} works ${w.hours}h on ${schedule.dayLabels[w.dayIndex]}, over the ${DAILY_CAP_HOURS}h daily cap.`
    case 'overlap':
      return `${nameOf(w.staffId)} has overlapping shifts on ${schedule.dayLabels[w.dayIndex]}.`
    case 'understaffed':
      return ''
  }
}

/** Short fragment for the drag preview, e.g. "over the 40h weekly limit". */
export function problemPhrase(w: Warning): string {
  switch (w.type) {
    case 'over-max':
      return `over the ${w.maxHours}h weekly limit`
    case 'over-daily':
      return `${w.hours}h that day, over the ${DAILY_CAP_HOURS}h cap`
    case 'overlap':
      return 'overlaps another shift that day'
    case 'understaffed':
      return ''
  }
}
