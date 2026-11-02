import type { Assignment, Schedule, Shift, Staff } from '../types'
import { shiftHeadcount } from './demand'
import { DAILY_CAP_HOURS, shiftHours, shiftsOverlap, sortShifts } from './shifts'

export type UnderstaffedSlot = { dayIndex: number; shiftId: string; needed: number; assigned: number }

export type AutoScheduleResult = {
  /** manual assignments kept as they are, plus the newly generated ones */
  assignments: Assignment[]
  createdCount: number
  understaffed: UnderstaffedSlot[]
  /** contract hours nobody was scheduled for */
  unusedHours: number
  notes: string[]
}

/**
 * Greedy, deterministic draft roster.
 * Per (day, shift): headcount = busiest hour in the shift (MAX rule). Each open slot goes to the eligible person with
 * the lowest utilization (assigned / max hours); ties go to more remaining hours, then name.
 * Eligible = not already in this slot, enough weekly hours left, no overlapping shift that day, and the day stays
 * within DAILY_CAP_HOURS (a shift longer than the cap is allowed only as that person's sole shift of the day).
 * Manual assignments are kept and count against hours and the daily cap.
 */
export function autoSchedule(schedule: Schedule, newId: () => string = () => crypto.randomUUID()): AutoScheduleResult {
  const manual = schedule.assignments.filter((a) => a.source === 'manual')
  const shiftById = new Map(schedule.shifts.map((s) => [s.id, s]))
  const used = new Map<string, number>(schedule.staff.map((m) => [m.id, 0]))
  const dayShifts = new Map<string, Shift[]>()

  const place = (staffId: string, dayIndex: number, shift: Shift) => {
    used.set(staffId, (used.get(staffId) ?? 0) + shiftHours(shift))
    const key = `${staffId}|${dayIndex}`
    dayShifts.set(key, [...(dayShifts.get(key) ?? []), shift])
  }
  for (const a of manual) {
    const shift = shiftById.get(a.shiftId)
    if (shift) place(a.staffId, a.dayIndex, shift)
  }

  const notes: string[] = []
  if (schedule.staff.length === 0) notes.push('There is no staff yet, so nobody can be scheduled. Add staff first.')
  if (Object.keys(schedule.transactions).length === 0) {
    notes.push('There is no demand data, so no shift needs anyone. Upload a transaction CSV first.')
  }

  const eligible = (member: Staff, taken: Set<string>, dayIndex: number, shift: Shift): boolean => {
    if (taken.has(member.id)) return false
    const length = shiftHours(shift)
    if (member.maxWeeklyHours - (used.get(member.id) ?? 0) < length) return false
    const today = dayShifts.get(`${member.id}|${dayIndex}`) ?? []
    if (today.some((other) => shiftsOverlap(other, shift))) return false
    const hoursToday = today.reduce((sum, s) => sum + shiftHours(s), 0)
    return hoursToday === 0 || hoursToday + length <= DAILY_CAP_HOURS
  }

  // lowest used/max first; cross-multiplied so there is no float comparison
  const better = (a: Staff, b: Staff): boolean => {
    const ua = used.get(a.id) ?? 0
    const ub = used.get(b.id) ?? 0
    const byUtilization = ua * b.maxWeeklyHours - ub * a.maxWeeklyHours
    if (byUtilization !== 0) return byUtilization < 0
    const byRemaining = b.maxWeeklyHours - ub - (a.maxWeeklyHours - ua)
    if (byRemaining !== 0) return byRemaining > 0
    return a.name.localeCompare(b.name) < 0 || (a.name === b.name && a.id < b.id)
  }

  const created: Assignment[] = []
  const understaffed: UnderstaffedSlot[] = []
  for (let dayIndex = 0; dayIndex < schedule.dayLabels.length; dayIndex++) {
    for (const shift of sortShifts(schedule.shifts)) {
      const needed = shiftHeadcount(schedule, dayIndex, shift)
      if (needed === 0) continue
      const slotManual = manual.filter((a) => a.dayIndex === dayIndex && a.shiftId === shift.id)
      const taken = new Set(slotManual.map((a) => a.staffId))
      let assigned = slotManual.length
      while (assigned < needed) {
        let best: Staff | null = null
        for (const member of schedule.staff) {
          if (eligible(member, taken, dayIndex, shift) && (best === null || better(member, best))) best = member
        }
        if (!best) break
        place(best.id, dayIndex, shift)
        taken.add(best.id)
        created.push({ id: newId(), staffId: best.id, shiftId: shift.id, dayIndex, source: 'auto' })
        assigned++
      }
      if (assigned < needed) understaffed.push({ dayIndex, shiftId: shift.id, needed, assigned })
    }
  }

  const unusedHours = schedule.staff.reduce((sum, m) => sum + Math.max(0, m.maxWeeklyHours - (used.get(m.id) ?? 0)), 0)
  return { assignments: [...manual, ...created], createdCount: created.length, understaffed, unusedHours, notes }
}
