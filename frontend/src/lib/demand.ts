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
