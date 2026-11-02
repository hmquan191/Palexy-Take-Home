import { describe, expect, it } from 'vitest'
import { nextSampleStaff, SAMPLE_STAFF_POOL } from './sampleData'

describe('nextSampleStaff', () => {
  it('has 20 distinct names', () => {
    expect(new Set(SAMPLE_STAFF_POOL.map((n) => n.toLowerCase())).size).toBe(20)
  })

  it('starts with An, Bình, Công, Đức, Thọ at 40h each', () => {
    expect(nextSampleStaff([])).toEqual(
      ['An', 'Bình', 'Công', 'Đức', 'Thọ'].map((name) => ({ name, maxWeeklyHours: 40 })),
    )
  })

  it('each call continues with the next five and never repeats a name', () => {
    const names: string[] = []
    for (let i = 0; i < 4; i++) names.push(...nextSampleStaff(names).map((s) => s.name))
    expect(names).toEqual(SAMPLE_STAFF_POOL)
    expect(nextSampleStaff(names)).toEqual([])
  })

  it('skips names already on the team, ignoring case and spaces, and returns fewer when the pool runs low', () => {
    expect(nextSampleStaff(['  an ', 'BÌNH']).map((s) => s.name)).toEqual(['Công', 'Đức', 'Thọ', 'Chi', 'Dũng'])
    expect(nextSampleStaff(SAMPLE_STAFF_POOL.slice(0, 18))).toHaveLength(2)
  })
})
