import type { Schedule, Shift } from '../types'
import { coveredHours } from './shifts'

/** One staff member per N transactions, at least one while the store is open. */
export const requiredStaff = (transactions: number, n: number): number => Math.max(1, Math.ceil(transactions / n))

/** Staff the model asks for in one hour; 0 when the file has no data for it (store closed). */
export function requiredAt(schedule: Schedule, dayIndex: number, hour: number): number {
  const count = schedule.transactions[`${dayIndex}-${hour}`]
  return count === undefined ? 0 : requiredStaff(count, schedule.nPerStaff)
}

/** A shift is a fixed block, so it needs as many people as its busiest hour (MAX rule). */
export function shiftHeadcount(schedule: Schedule, dayIndex: number, shift: Shift): number {
  return Math.max(0, ...coveredHours(shift).map((hour) => requiredAt(schedule, dayIndex, hour)))
}

export function requiredStaffHours(schedule: Schedule): number {
  return Object.values(schedule.transactions).reduce((sum, count) => sum + requiredStaff(count, schedule.nPerStaff), 0)
}

export type MaxExample = { dayLabel: string; shift: Shift; needs: number[]; max: number; averageRounded: number }

/** The busiest shift of the week, with its hourly needs, to show why MAX and the average differ. Null without demand data. */
export function maxExample(schedule: Schedule): MaxExample | null {
  let best: MaxExample | null = null
  for (let dayIndex = 0; dayIndex < schedule.dayLabels.length; dayIndex++) {
    for (const shift of schedule.shifts) {
      const needs = coveredHours(shift)
        .filter((hour) => schedule.transactions[`${dayIndex}-${hour}`] !== undefined)
        .map((hour) => requiredAt(schedule, dayIndex, hour))
      if (needs.length === 0) continue
      const max = Math.max(...needs)
      const gap = max - Math.ceil(needs.reduce((a, b) => a + b, 0) / needs.length)
      const bestGap = best ? best.max - best.averageRounded : -1
      if (!best || max > best.max || (max === best.max && gap > bestGap)) {
        best = { dayLabel: schedule.dayLabels[dayIndex], shift, needs, max, averageRounded: Math.ceil(needs.reduce((a, b) => a + b, 0) / needs.length) }
      }
    }
  }
  return best
}
