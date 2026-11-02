import { describe, expect, it } from 'vitest'
import type { Assignment, Schedule } from '../types'
import { buildSummary } from './summary'
import { getWarnings } from './warnings'

const base: Schedule = {
  id: 's',
  name: 't',
  createdAt: '',
  nPerStaff: 15,
  dayLabels: ['Mon'],
  staff: [
    { id: 'a', name: 'A', maxWeeklyHours: 8 },
    { id: 'b', name: 'B', maxWeeklyHours: 40 },
    { id: 'c', name: 'C', maxWeeklyHours: 40 },
  ],
  shifts: [
    { id: 'full', start: '12:00', end: '15:00' },
    { id: 'short', start: '12:00', end: '14:00' },
  ],
  // the example from the brief: 12pm 33, 1pm 48, 2pm 33
  transactions: { '0-12': 33, '0-13': 48, '0-14': 33 },
  assignments: [],
}

const assign = (id: string, staffId: string, shiftId: string): Assignment => ({
  id,
  staffId,
  shiftId,
  dayIndex: 0,
  source: 'manual',
})

describe('buildSummary', () => {
  // two people on 12-15 plus one on 12-14 gives 3, 3, 2 staff-hours at 12pm, 1pm, 2pm
  const example = { ...base, assignments: [assign('1', 'a', 'full'), assign('2', 'b', 'full'), assign('3', 'c', 'short')] }

  it('matches the brief: 33/3, 48/3, 33/2 = 11, 16, 16.5; day 114 / 8 = 14.25; mean of cells 14.5', () => {
    const s = buildSummary(example)
    expect(s.cells['0-12']).toMatchObject({ staffHours: 3, transactions: 33 })
    expect(s.cells['0-12'].ratio).toBeCloseTo(11)
    expect(s.cells['0-13'].ratio).toBeCloseTo(16)
    expect(s.cells['0-14'].ratio).toBeCloseTo(16.5)
    expect(s.totals.totalStaffHours).toBe(8)
    expect(s.totals.totalTransactions).toBe(114)
    expect(s.totals.overallRatio).toBeCloseTo(14.25)
    expect(s.totals.averageCellRatio).toBeCloseTo(14.5)
    expect(s.dayTotals[0].ratio).toBeCloseTo(14.25)
  })

  it('reports required staff-hours from the model (3 + 4 + 3 = 10)', () => {
    expect(buildSummary(example).totals.requiredStaffHours).toBe(10)
  })

  it('has no ratio when nobody is scheduled and leaves those cells out of the mean', () => {
    const empty = buildSummary(base)
    expect(empty.cells['0-12'].ratio).toBeNull()
    expect(empty.totals.overallRatio).toBeNull()
    expect(empty.totals.averageCellRatio).toBeNull()

    const partial = buildSummary({ ...base, shifts: [{ id: 'full', start: '12:00', end: '13:00' }], assignments: [assign('1', 'a', 'full')] })
    expect(partial.cells['0-13'].ratio).toBeNull()
    expect(partial.totals.averageCellRatio).toBeCloseTo(33) // only the 12pm cell has staff
  })
})

describe('getWarnings', () => {
  it('flags understaffed hours', () => {
    const w = getWarnings({ ...base, assignments: [assign('1', 'a', 'full')] }).filter((x) => x.type === 'understaffed')
    expect(w).toHaveLength(3) // needs 3, 4, 3 and only 1 is scheduled
    expect(w).toContainEqual({ type: 'understaffed', dayIndex: 0, hour: 13, required: 4, scheduled: 1 })
  })

  it('flags a person scheduled over their weekly hours', () => {
    const w = getWarnings({ ...base, staff: [{ id: 'a', name: 'A', maxWeeklyHours: 2 }], assignments: [assign('1', 'a', 'full')] })
    expect(w).toContainEqual({ type: 'over-max', staffId: 'a', assignedHours: 3, maxHours: 2 })
  })

  it('flags more than 8 hours in a day, and overlapping shifts', () => {
    const longDay = getWarnings({
      ...base,
      shifts: [
        { id: 'am', start: '07:00', end: '15:00' },
        { id: 'pm', start: '15:00', end: '23:00' },
      ],
      assignments: [assign('1', 'b', 'am'), assign('2', 'b', 'pm')],
    })
    expect(longDay).toContainEqual({ type: 'over-daily', staffId: 'b', dayIndex: 0, hours: 16 })
    expect(longDay.some((x) => x.type === 'overlap')).toBe(false)

    const overlapping = getWarnings({ ...base, assignments: [assign('1', 'b', 'full'), assign('2', 'b', 'short')] })
    expect(overlapping.some((x) => x.type === 'overlap')).toBe(true)
  })

  it('has nothing to say about a staffed, in-limit roster', () => {
    const roster = { ...base, transactions: { '0-12': 10 }, shifts: [{ id: 'full', start: '12:00', end: '13:00' }], assignments: [assign('1', 'a', 'full')] }
    expect(getWarnings(roster)).toEqual([])
  })
})
