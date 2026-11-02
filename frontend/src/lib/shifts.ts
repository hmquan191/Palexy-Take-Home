import type { Shift } from '../types'

export const DAILY_CAP_HOURS = 8

export const toMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export const shiftHours = (shift: Shift): number => (toMinutes(shift.end) - toMinutes(shift.start)) / 60

export const shiftLabel = (shift: Shift): string => `${shift.start}–${shift.end}`

/** Clock hours (0-23) the shift touches; a cell is "covered" when any part of its hour is inside the shift. */
export function coveredHours(shift: Shift): number[] {
  const first = Math.floor(toMinutes(shift.start) / 60)
  const last = Math.ceil(toMinutes(shift.end) / 60) - 1
  return Array.from({ length: Math.max(0, last - first + 1) }, (_, i) => first + i)
}

export const shiftsOverlap = (a: Shift, b: Shift): boolean =>
  toMinutes(a.start) < toMinutes(b.end) && toMinutes(b.start) < toMinutes(a.end)

export const sortShifts = (shifts: Shift[]): Shift[] =>
  [...shifts].sort((a, b) => toMinutes(a.start) - toMinutes(b.start) || toMinutes(a.end) - toMinutes(b.end))
