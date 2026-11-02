import { describe, expect, it } from 'vitest'
import type { Assignment, Schedule } from '../types'
import { autoSchedule } from './autoSchedule'
import { parseTransactionCsv } from './parseTransactionCsv'
import { applyDrop, previewDrop } from './roster'
import { SAMPLE_CSV, SAMPLE_STAFF } from './sampleData'
import { buildSummary } from './summary'
import { assignedHoursByStaff } from './warnings'

const parsed = parseTransactionCsv(SAMPLE_CSV)
if (!parsed.ok) throw new Error('sample CSV must parse')

const base: Schedule = {
  id: 's',
  name: 't',
  createdAt: '',
  nPerStaff: 15,
  dayLabels: parsed.data.dayLabels,
  staff: SAMPLE_STAFF.map((m, i) => ({ id: `st${i}`, ...m })),
  shifts: [
    { id: 'am', start: '07:00', end: '15:00' },
    { id: 'pm', start: '15:00', end: '23:00' },
    { id: 'short', start: '12:00', end: '16:00' },
  ],
  transactions: parsed.data.transactions,
  assignments: [],
}

const placed = (id: string, staffId: string, shiftId: string, dayIndex: number, source: Assignment['source'] = 'auto'): Assignment => ({
  id,
  staffId,
  shiftId,
  dayIndex,
  source,
})

const withRoster = (assignments: Assignment[]): Schedule => ({ ...base, assignments })
let counter = 0
const ids = () => `n${counter++}`

describe('applyDrop', () => {
  const schedule = withRoster([placed('a1', 'st0', 'am', 0), placed('a2', 'st1', 'am', 0)])

  it('moves a placement to another cell and makes it manual', () => {
    const result = applyDrop(schedule, { staffId: 'st0', assignmentId: 'a1' }, { dayIndex: 2, shiftId: 'pm' }, ids)
    expect(result).toEqual({
      ok: true,
      assignments: [placed('a1', 'st0', 'pm', 2, 'manual'), schedule.assignments[1]],
    })
  })

  it('adds a person from the staff list as a manual placement', () => {
    const result = applyDrop(schedule, { staffId: 'st5' }, { dayIndex: 1, shiftId: 'am' }, ids)
    expect(result.ok && result.assignments).toHaveLength(3)
    expect(result.ok && result.assignments[2]).toEqual(placed(result.ok ? result.assignments[2].id : '', 'st5', 'am', 1, 'manual'))
  })

  it('rejects dropping on the same cell, or a person already on that shift', () => {
    expect(applyDrop(schedule, { staffId: 'st0', assignmentId: 'a1' }, { dayIndex: 0, shiftId: 'am' })).toEqual({ ok: false, reason: 'same-slot' })
    expect(applyDrop(schedule, { staffId: 'st1' }, { dayIndex: 0, shiftId: 'am' })).toEqual({ ok: false, reason: 'duplicate' })
    expect(applyDrop(schedule, { staffId: 'st1', assignmentId: 'a2' }, { dayIndex: 0, shiftId: 'am' })).toEqual({ ok: false, reason: 'same-slot' })
  })

  it('rejects unknown people, shifts and placements', () => {
    expect(applyDrop(schedule, { staffId: 'nobody' }, { dayIndex: 0, shiftId: 'am' })).toEqual({ ok: false, reason: 'unknown-staff' })
    expect(applyDrop(schedule, { staffId: 'st0' }, { dayIndex: 0, shiftId: 'gone' })).toEqual({ ok: false, reason: 'unknown-shift' })
    expect(applyDrop(schedule, { staffId: 'st0', assignmentId: 'gone' }, { dayIndex: 0, shiftId: 'pm' })).toEqual({ ok: false, reason: 'unknown-assignment' })
  })

  it('does not mutate the roster it was given', () => {
    const before = JSON.stringify(schedule)
    applyDrop(schedule, { staffId: 'st0', assignmentId: 'a1' }, { dayIndex: 2, shiftId: 'pm' }, ids)
    expect(JSON.stringify(schedule)).toBe(before)
  })
})

describe('the numbers follow the drag', () => {
  const roster = withRoster([placed('a1', 'st0', 'am', 0), placed('a2', 'st1', 'am', 0), placed('a3', 'st0', 'pm', 1)])

  it('moving between same-length shifts keeps total staff hours and person hours, and shifts the cell counts', () => {
    const result = applyDrop(roster, { staffId: 'st0', assignmentId: 'a1' }, { dayIndex: 3, shiftId: 'am' })
    if (!result.ok) throw new Error('expected ok')
    const after = { ...roster, assignments: result.assignments }

    const before = buildSummary(roster)
    const now = buildSummary(after)
    expect(now.totals.totalStaffHours).toBe(before.totals.totalStaffHours)
    expect(assignedHoursByStaff(after).get('st0')).toBe(assignedHoursByStaff(roster).get('st0'))
    // Friday 9am loses one person, Mon 9am (day 3) gains one
    expect(now.cells['0-9'].staffHours).toBe(before.cells['0-9'].staffHours - 1)
    expect(now.cells['3-9'].staffHours).toBe(before.cells['3-9'].staffHours + 1)
  })

  it('moving to a shorter shift lowers the person hours and total staff hours by the difference', () => {
    const result = applyDrop(roster, { staffId: 'st0', assignmentId: 'a1' }, { dayIndex: 4, shiftId: 'short' })
    if (!result.ok) throw new Error('expected ok')
    const after = { ...roster, assignments: result.assignments }
    expect(assignedHoursByStaff(after).get('st0')).toBe(assignedHoursByStaff(roster).get('st0')! - 8 + 4)
    expect(buildSummary(after).totals.totalStaffHours).toBe(buildSummary(roster).totals.totalStaffHours - 4)
  })

  it('adding from the list raises person and total hours by the shift length', () => {
    const result = applyDrop(roster, { staffId: 'st7' }, { dayIndex: 5, shiftId: 'short' })
    if (!result.ok) throw new Error('expected ok')
    const after = { ...roster, assignments: result.assignments }
    expect(assignedHoursByStaff(after).get('st7')).toBe(4)
    expect(buildSummary(after).totals.totalStaffHours).toBe(buildSummary(roster).totals.totalStaffHours + 4)
  })

  it('preview matches the committed result for every possible drop target', () => {
    const full = withRoster(autoSchedule(base, ids).assignments)
    const chip = full.assignments[0]
    const source = { staffId: chip.staffId, assignmentId: chip.id }
    let checked = 0
    for (let dayIndex = 0; dayIndex < full.dayLabels.length; dayIndex++) {
      for (const shift of full.shifts) {
        const preview = previewDrop(full, source, { dayIndex, shiftId: shift.id })
        const result = applyDrop(full, source, { dayIndex, shiftId: shift.id }, ids)
        expect(preview.ok).toBe(result.ok)
        if (!preview.ok || !result.ok) continue
        const after = { ...full, assignments: result.assignments }
        expect(preview.hoursBefore).toBe(assignedHoursByStaff(full).get(chip.staffId))
        expect(preview.hoursAfter).toBe(assignedHoursByStaff(after).get(chip.staffId))
        const cellAfter = after.assignments.filter((a) => a.dayIndex === dayIndex && a.shiftId === shift.id).length
        expect(preview.target?.after.has).toBe(cellAfter)
        expect(preview.target?.after.has).toBe(preview.target!.before.has + 1)
        expect(preview.source?.after.has).toBe(preview.source!.before.has - 1)
        checked++
      }
    }
    expect(checked).toBeGreaterThan(15)
  })

  it('preview of removing a placement shows the freed hours and the cell going short', () => {
    const full = withRoster(autoSchedule(base, ids).assignments)
    const chip = full.assignments[0]
    const preview = previewDrop(full, { staffId: chip.staffId, assignmentId: chip.id }, 'remove')
    if (!preview.ok) throw new Error('expected ok')
    expect(preview.hoursAfter).toBe(preview.hoursBefore - 8)
    expect(preview.target).toBeNull()
    expect(preview.source!.after.has).toBe(preview.source!.before.has - 1)
    expect(preview.source!.after.has).toBeLessThan(preview.source!.after.needed)
  })
})

describe('previewDrop flags limit problems without blocking', () => {
  it('warns when the weekly limit would be exceeded', () => {
    // Lan has 24h: three 8h shifts fit, a fourth does not
    const lan = base.staff[9]
    const roster = withRoster([0, 1, 2].map((d) => placed(`l${d}`, lan.id, 'am', d)))
    const preview = previewDrop(roster, { staffId: lan.id }, { dayIndex: 3, shiftId: 'am' })
    if (!preview.ok) throw new Error('expected ok')
    expect(preview).toMatchObject({ hoursBefore: 24, hoursAfter: 32, maxHours: 24 })
    expect(preview.problems).toContainEqual({ type: 'over-max', staffId: lan.id, assignedHours: 32, maxHours: 24 })
  })

  it('warns about a 16h day and about overlapping shifts', () => {
    const roster = withRoster([placed('x', 'st0', 'am', 0)])
    const longDay = previewDrop(roster, { staffId: 'st0' }, { dayIndex: 0, shiftId: 'pm' })
    if (!longDay.ok) throw new Error('expected ok')
    expect(longDay.problems).toContainEqual({ type: 'over-daily', staffId: 'st0', dayIndex: 0, hours: 16 })

    const overlap = previewDrop(roster, { staffId: 'st0' }, { dayIndex: 0, shiftId: 'short' })
    if (!overlap.ok) throw new Error('expected ok')
    expect(overlap.problems.some((p) => p.type === 'overlap')).toBe(true)
  })

  it('reports no problems for a clean drop and a failure reason for an impossible one', () => {
    const roster = withRoster([placed('x', 'st0', 'am', 0)])
    const clean = previewDrop(roster, { staffId: 'st0', assignmentId: 'x' }, { dayIndex: 1, shiftId: 'am' })
    expect(clean.ok && clean.problems).toEqual([])
    expect(previewDrop(roster, { staffId: 'st0', assignmentId: 'x' }, { dayIndex: 0, shiftId: 'am' })).toEqual({ ok: false, reason: 'same-slot' })
  })
})
