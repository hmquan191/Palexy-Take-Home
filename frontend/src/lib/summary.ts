import type { Schedule } from '../types'
import { requiredAt, requiredStaffHours } from './demand'
import { coveredHours } from './shifts'

export type Cell = {
  transactions: number
  staffHours: number
  required: number
  /** transactions / staffHours, null when nobody is scheduled */
  ratio: number | null
}

export type Summary = {
  hours: number[]
  /** key `${dayIndex}-${hour}` */
  cells: Record<string, Cell>
  dayTotals: { transactions: number; staffHours: number; ratio: number | null }[]
  totals: {
    totalStaffHours: number
    totalTransactions: number
    /** total transactions / total staff hours */
    overallRatio: number | null
    /** mean of the per-cell ratios, over cells that have staff */
    averageCellRatio: number | null
    requiredStaffHours: number
  }
}

const divide = (a: number, b: number): number | null => (b === 0 ? null : a / b)

export function buildSummary(schedule: Schedule): Summary {
  const shiftById = new Map(schedule.shifts.map((s) => [s.id, s]))
  const staffHoursAt = new Map<string, number>()
  for (const a of schedule.assignments) {
    const shift = shiftById.get(a.shiftId)
    if (!shift) continue
    for (const hour of coveredHours(shift)) {
      const key = `${a.dayIndex}-${hour}`
      staffHoursAt.set(key, (staffHoursAt.get(key) ?? 0) + 1)
    }
  }

  const keys = new Set([...Object.keys(schedule.transactions), ...staffHoursAt.keys()])
  const cells: Record<string, Cell> = {}
  const hourSet = new Set<number>()
  for (const key of keys) {
    const [day, hour] = key.split('-').map(Number)
    hourSet.add(hour)
    const transactions = schedule.transactions[key] ?? 0
    const staffHours = staffHoursAt.get(key) ?? 0
    cells[key] = { transactions, staffHours, required: requiredAt(schedule, day, hour), ratio: divide(transactions, staffHours) }
  }

  const dayTotals = schedule.dayLabels.map((_, day) => {
    let transactions = 0
    let staffHours = 0
    for (const [key, cell] of Object.entries(cells)) {
      if (Number(key.split('-')[0]) === day) {
        transactions += cell.transactions
        staffHours += cell.staffHours
      }
    }
    return { transactions, staffHours, ratio: divide(transactions, staffHours) }
  })

  const totalTransactions = dayTotals.reduce((s, d) => s + d.transactions, 0)
  const totalStaffHours = dayTotals.reduce((s, d) => s + d.staffHours, 0)
  const ratios = Object.values(cells).flatMap((c) => (c.ratio === null ? [] : [c.ratio]))

  return {
    hours: [...hourSet].sort((a, b) => a - b),
    cells,
    dayTotals,
    totals: {
      totalStaffHours,
      totalTransactions,
      overallRatio: divide(totalTransactions, totalStaffHours),
      averageCellRatio: ratios.length ? ratios.reduce((a, b) => a + b, 0) / ratios.length : null,
      requiredStaffHours: requiredStaffHours(schedule),
    },
  }
}
