import { describe, expect, it } from 'vitest'
import type { Schedule } from '../types'
import { autoSchedule } from './autoSchedule'
import { shiftHeadcount } from './demand'
import { parseTransactionCsv } from './parseTransactionCsv'
import { SAMPLE_CSV, SAMPLE_STAFF } from './sampleData'
import { assignedHoursByStaff } from './warnings'

const parsed = parseTransactionCsv(SAMPLE_CSV)
if (!parsed.ok) throw new Error('sample CSV must parse')
const sample = parsed.data

function makeSchedule(staff: { name: string; maxWeeklyHours: number }[], overrides: Partial<Schedule> = {}): Schedule {
  return {
    id: 's',
    name: 'test',
    createdAt: '',
    nPerStaff: 15,
    dayLabels: sample.dayLabels,
    staff: staff.map((m, i) => ({ id: `st${i}`, ...m })),
    shifts: [
      { id: 'morning', start: '07:00', end: '15:00' },
      { id: 'evening', start: '15:00', end: '23:00' },
    ],
    transactions: sample.transactions,
    assignments: [],
    ...overrides,
  }
}

let counter = 0
const ids = () => `a${counter++}`

const maxHoursOf = (schedule: Schedule, staffId: string) => schedule.staff.find((m) => m.id === staffId)!.maxWeeklyHours

describe('demand model on the sample week (N = 15, MAX rule)', () => {
  const schedule = makeSchedule(SAMPLE_STAFF)
  const [morning, evening] = schedule.shifts

  it('Friday morning needs 5 and evening 3 (hand-calculated)', () => {
    expect(shiftHeadcount(schedule, 0, morning)).toBe(5)
    expect(shiftHeadcount(schedule, 0, evening)).toBe(3)
  })

  it('the whole week needs 44 shift-slots = 352 staff-hours', () => {
    let slots = 0
    for (let d = 0; d < 7; d++) slots += shiftHeadcount(schedule, d, morning) + shiftHeadcount(schedule, d, evening)
    expect(slots).toBe(44)
  })
})

describe('autoSchedule', () => {
  it('covers the whole week with the 10-person sample team and respects every limit', () => {
    const schedule = makeSchedule(SAMPLE_STAFF)
    const result = autoSchedule(schedule, ids)
    expect(result.understaffed).toEqual([])
    expect(result.createdCount).toBe(44)

    for (const [staffId, hours] of assignedHoursByStaff({ ...schedule, assignments: result.assignments })) {
      expect(hours).toBeLessThanOrEqual(maxHoursOf(schedule, staffId))
    }
    const perStaffDay = new Set<string>()
    for (const a of result.assignments) {
      const key = `${a.staffId}|${a.dayIndex}`
      expect(perStaffDay.has(key)).toBe(false) // 8h shifts: at most one per person per day
      perStaffDay.add(key)
    }
  })

  it('spreads work by utilization: nobody idle while others are full', () => {
    const schedule = makeSchedule(SAMPLE_STAFF)
    const hours = assignedHoursByStaff({ ...schedule, assignments: autoSchedule(schedule, ids).assignments })
    const utilization = schedule.staff.map((m) => (hours.get(m.id) ?? 0) / m.maxWeeklyHours)
    expect(Math.min(...utilization)).toBeGreaterThan(0.6)
    expect(Math.max(...utilization) - Math.min(...utilization)).toBeLessThanOrEqual(0.4)
  })

  it('reports shortages instead of going over hours when the team is too small', () => {
    const schedule = makeSchedule(SAMPLE_STAFF.slice(0, 5))
    const result = autoSchedule(schedule, ids)
    expect(result.understaffed.length).toBeGreaterThan(0)
    for (const [staffId, hours] of assignedHoursByStaff({ ...schedule, assignments: result.assignments })) {
      expect(hours).toBeLessThanOrEqual(maxHoursOf(schedule, staffId))
    }
  })

  it('gives a 20h person at most two 8h shifts', () => {
    const schedule = makeSchedule([{ name: 'Part', maxWeeklyHours: 20 }, ...SAMPLE_STAFF])
    const result = autoSchedule(schedule, ids)
    expect(result.assignments.filter((a) => a.staffId === 'st0').length).toBeLessThanOrEqual(2)
  })

  it('is deterministic', () => {
    const schedule = makeSchedule(SAMPLE_STAFF)
    const strip = (r: ReturnType<typeof autoSchedule>) =>
      r.assignments.map(({ staffId, shiftId, dayIndex }) => `${staffId}/${shiftId}/${dayIndex}`)
    expect(strip(autoSchedule(schedule, ids))).toEqual(strip(autoSchedule(schedule, ids)))
  })

  it('keeps manual assignments, counts them, and replaces earlier auto ones', () => {
    const schedule = makeSchedule(SAMPLE_STAFF, {
      assignments: [
        { id: 'm1', staffId: 'st9', shiftId: 'morning', dayIndex: 0, source: 'manual' },
        { id: 'old', staffId: 'st0', shiftId: 'evening', dayIndex: 3, source: 'auto' },
      ],
    })
    const result = autoSchedule(schedule, ids)
    expect(result.assignments.find((a) => a.id === 'm1')).toBeDefined()
    expect(result.assignments.find((a) => a.id === 'old')).toBeUndefined()
    const fridayMorning = result.assignments.filter((a) => a.dayIndex === 0 && a.shiftId === 'morning')
    expect(fridayMorning).toHaveLength(5)
    expect(new Set(fridayMorning.map((a) => a.staffId)).size).toBe(5)
  })

  it('does not throw with no staff or no demand and says why', () => {
    const noStaff = autoSchedule(makeSchedule([]), ids)
    expect(noStaff.assignments).toEqual([])
    expect(noStaff.understaffed.length).toBeGreaterThan(0)
    expect(noStaff.notes.join(' ')).toMatch(/no staff/i)

    const noDemand = autoSchedule(makeSchedule(SAMPLE_STAFF, { transactions: {} }), ids)
    expect(noDemand.createdCount).toBe(0)
    expect(noDemand.notes.join(' ')).toMatch(/no demand/i)
  })

  it('allows two 4h shifts in one day but not a 16h day', () => {
    const solo = [{ name: 'Solo', maxWeeklyHours: 40 }]
    const twoShort = autoSchedule(
      makeSchedule(solo, {
        dayLabels: ['Mon'],
        shifts: [
          { id: 'a', start: '09:00', end: '13:00' },
          { id: 'b', start: '15:00', end: '19:00' },
        ],
        transactions: { '0-9': 5, '0-15': 5 },
      }),
      ids,
    )
    expect(twoShort.assignments).toHaveLength(2)

    const sixteen = autoSchedule(makeSchedule(solo, { dayLabels: ['Mon'], transactions: { '0-9': 5, '0-16': 5 } }), ids)
    expect(sixteen.assignments).toHaveLength(1)
    expect(sixteen.understaffed).toHaveLength(1)
  })
})
