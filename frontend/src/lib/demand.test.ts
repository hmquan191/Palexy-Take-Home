import { describe, expect, it } from 'vitest'
import type { Schedule } from '../types'
import { maxExample } from './demand'
import { parseTransactionCsv } from './parseTransactionCsv'
import { SAMPLE_CSV } from './sampleData'

const parsed = parseTransactionCsv(SAMPLE_CSV)
if (!parsed.ok) throw new Error('sample must parse')

const schedule: Schedule = {
  id: 's', name: 't', createdAt: '', nPerStaff: 15,
  dayLabels: parsed.data.dayLabels,
  staff: [],
  shifts: [{ id: 'am', start: '07:00', end: '15:00' }, { id: 'pm', start: '15:00', end: '23:00' }],
  transactions: parsed.data.transactions,
  assignments: [],
}

describe('maxExample', () => {
  it('finds the busiest shift and shows MAX against the rounded average', () => {
    const example = maxExample(schedule)!
    expect(example.max).toBe(5)
    expect(example.needs).toHaveLength(8)
    expect(example.averageRounded).toBeLessThan(example.max)
    expect(Math.max(...example.needs)).toBe(example.max)
  })

  it('matches the hand-worked Friday morning when it is the only data', () => {
    const friday = Object.fromEntries(Object.entries(schedule.transactions).filter(([k]) => k.startsWith('0-')))
    const example = maxExample({ ...schedule, transactions: friday, dayLabels: [schedule.dayLabels[0]] })!
    expect(example.needs).toEqual([2, 2, 2, 3, 3, 2, 5, 3])
    expect([example.max, example.averageRounded]).toEqual([5, 3])
  })

  it('is null without demand data, and ignores hours with no data', () => {
    expect(maxExample({ ...schedule, transactions: {} })).toBeNull()
    expect(maxExample({ ...schedule, transactions: { '0-9': 30, '0-10': 15 }, dayLabels: ['Mon'] })!.needs).toEqual([2, 1])
  })
})
