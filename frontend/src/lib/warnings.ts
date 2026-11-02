import type { Schedule, Shift } from '../types'
import { buildSummary } from './summary'
import { DAILY_CAP_HOURS, shiftHours, shiftsOverlap } from './shifts'

export type Warning =
  | { type: 'over-max'; staffId: string; assignedHours: number; maxHours: number }
  | { type: 'over-daily'; staffId: string; dayIndex: number; hours: number }
  | { type: 'overlap'; staffId: string; dayIndex: number }
  | { type: 'understaffed'; dayIndex: number; hour: number; required: number; scheduled: number }

export function assignedHoursByStaff(schedule: Schedule): Map<string, number> {
  const shiftById = new Map(schedule.shifts.map((s) => [s.id, s]))
  const hours = new Map<string, number>()
  for (const a of schedule.assignments) {
    const shift = shiftById.get(a.shiftId)
    if (shift) hours.set(a.staffId, (hours.get(a.staffId) ?? 0) + shiftHours(shift))
  }
  return hours
}

/** Problems worth showing the manager. Never blocks an edit. Understaffing is reported per clock hour. */
export function getWarnings(schedule: Schedule): Warning[] {
  const warnings: Warning[] = []
  const shiftById = new Map(schedule.shifts.map((s) => [s.id, s]))

  for (const [staffId, assignedHours] of assignedHoursByStaff(schedule)) {
    const member = schedule.staff.find((m) => m.id === staffId)
    if (member && assignedHours > member.maxWeeklyHours) {
      warnings.push({ type: 'over-max', staffId, assignedHours, maxHours: member.maxWeeklyHours })
    }
  }

  const byStaffDay = new Map<string, { staffId: string; dayIndex: number; shifts: (Shift | undefined)[] }>()
  for (const a of schedule.assignments) {
    const key = `${a.staffId}|${a.dayIndex}`
    const entry = byStaffDay.get(key) ?? { staffId: a.staffId, dayIndex: a.dayIndex, shifts: [] }
    entry.shifts.push(shiftById.get(a.shiftId))
    byStaffDay.set(key, entry)
  }
  for (const { staffId, dayIndex, shifts } of byStaffDay.values()) {
    const list = shifts.flatMap((s) => (s ? [s] : []))
    if (list.length < 2) continue
    if (list.some((a, i) => list.slice(i + 1).some((b) => shiftsOverlap(a, b)))) {
      warnings.push({ type: 'overlap', staffId, dayIndex })
    }
    const hours = list.reduce((sum, s) => sum + shiftHours(s), 0)
    if (hours > DAILY_CAP_HOURS) warnings.push({ type: 'over-daily', staffId, dayIndex, hours })
  }

  const summary = buildSummary(schedule)
  for (const [key, cell] of Object.entries(summary.cells)) {
    const [dayIndex, hour] = key.split('-').map(Number)
    if (cell.staffHours < cell.required) {
      warnings.push({ type: 'understaffed', dayIndex, hour, required: cell.required, scheduled: cell.staffHours })
    }
  }
  return warnings
}
