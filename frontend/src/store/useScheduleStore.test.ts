import { beforeEach, describe, expect, it, vi } from 'vitest'

function stubLocalStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial))
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  })
  return data
}

async function loadStore() {
  vi.resetModules()
  return import('./useScheduleStore')
}

describe('useScheduleStore', () => {
  beforeEach(() => {
    stubLocalStorage()
  })

  it('creates a schedule seeded with the two default shifts and N=15', async () => {
    const { useScheduleStore } = await loadStore()
    const id = useScheduleStore.getState().createSchedule('  Week 1  ')
    const schedule = useScheduleStore.getState().schedules.find((s) => s.id === id)
    expect(schedule?.name).toBe('Week 1')
    expect(schedule?.nPerStaff).toBe(15)
    expect(schedule?.shifts.map((s) => `${s.start}-${s.end}`)).toEqual(['07:00-15:00', '15:00-23:00'])
  })

  it('rejects blank names', async () => {
    const { useScheduleStore } = await loadStore()
    expect(useScheduleStore.getState().createSchedule('   ')).toBeNull()
    expect(useScheduleStore.getState().schedules).toHaveLength(0)
  })

  it('deletes only the requested schedule', async () => {
    const { useScheduleStore } = await loadStore()
    const a = useScheduleStore.getState().createSchedule('A')!
    useScheduleStore.getState().createSchedule('B')
    useScheduleStore.getState().deleteSchedule(a)
    expect(useScheduleStore.getState().schedules.map((s) => s.name)).toEqual(['B'])
  })

  it('persists to localStorage and restores after a reload', async () => {
    const data = stubLocalStorage()
    const first = await loadStore()
    first.useScheduleStore.getState().createSchedule('Saved')
    expect(data.has(first.STORAGE_KEY)).toBe(true)

    const second = await loadStore()
    expect(second.useScheduleStore.getState().schedules.map((s) => s.name)).toEqual(['Saved'])
    expect(second.consumeStorageReset()).toBe(false)
  })

  it('falls back to empty state and reports it when saved data is corrupt', async () => {
    stubLocalStorage({ 'staff-scheduling-v1': '{not json' })
    const { useScheduleStore, consumeStorageReset } = await loadStore()
    expect(useScheduleStore.getState().schedules).toEqual([])
    expect(consumeStorageReset()).toBe(true)
    expect(consumeStorageReset()).toBe(false)
  })

  it('falls back to empty state when saved data has the wrong shape', async () => {
    stubLocalStorage({
      'staff-scheduling-v1': JSON.stringify({ state: { schedules: 'oops' }, version: 1 }),
    })
    const { useScheduleStore, consumeStorageReset } = await loadStore()
    expect(useScheduleStore.getState().schedules).toEqual([])
    expect(consumeStorageReset()).toBe(true)
  })

  it('manages staff and trims names', async () => {
    const { useScheduleStore } = await loadStore()
    const store = useScheduleStore.getState()
    const id = store.createSchedule('S')!
    store.addStaff(id, { name: '  An  ', maxWeeklyHours: 40 })
    store.addStaff(id, { name: 'Binh', maxWeeklyHours: 20 })
    const [an] = useScheduleStore.getState().schedules[0].staff
    expect(an.name).toBe('An')

    store.updateStaff(id, an.id, { name: 'An Nguyen', maxWeeklyHours: 36 })
    expect(useScheduleStore.getState().schedules[0].staff[0]).toMatchObject({ name: 'An Nguyen', maxWeeklyHours: 36 })

    store.removeStaff(id, an.id)
    expect(useScheduleStore.getState().schedules[0].staff.map((m) => m.name)).toEqual(['Binh'])
  })

  it('removing staff also removes their assignments', async () => {
    const { useScheduleStore } = await loadStore()
    const store = useScheduleStore.getState()
    const id = store.createSchedule('S')!
    store.addStaff(id, { name: 'An', maxWeeklyHours: 40 })
    const staffId = useScheduleStore.getState().schedules[0].staff[0].id
    useScheduleStore.setState((state) => ({
      schedules: state.schedules.map((s) => ({
        ...s,
        assignments: [{ id: 'a1', staffId, shiftId: 's', dayIndex: 0, source: 'manual' as const }],
      })),
    }))
    store.removeStaff(id, staffId)
    expect(useScheduleStore.getState().schedules[0].assignments).toEqual([])
  })

  it('setNPerStaff accepts whole numbers >= 1 only', async () => {
    const { useScheduleStore } = await loadStore()
    const store = useScheduleStore.getState()
    const id = store.createSchedule('S')!
    store.setNPerStaff(id, 20)
    expect(useScheduleStore.getState().schedules[0].nPerStaff).toBe(20)
    for (const bad of [0, -5, 2.5, Number.NaN]) store.setNPerStaff(id, bad)
    expect(useScheduleStore.getState().schedules[0].nPerStaff).toBe(20)
  })

  it('importing demand replaces data and drops assignments on days that no longer exist', async () => {
    const { useScheduleStore } = await loadStore()
    const store = useScheduleStore.getState()
    const id = store.createSchedule('S')!
    useScheduleStore.setState((state) => ({
      schedules: state.schedules.map((s) => ({
        ...s,
        assignments: [0, 6].map((d) => ({ id: `a${d}`, staffId: 'x', shiftId: 'y', dayIndex: d, source: 'auto' as const })),
      })),
    }))
    store.importTransactions(id, { dayLabels: ['Mon', 'Tue'], transactions: { '0-7': 5 } })
    const s = useScheduleStore.getState().schedules[0]
    expect(s.dayLabels).toEqual(['Mon', 'Tue'])
    expect(s.transactions).toEqual({ '0-7': 5 })
    expect(s.assignments.map((a) => a.dayIndex)).toEqual([0])
  })

  it('shifts: add, edit, and removing one also removes its assignments', async () => {
    const { useScheduleStore } = await loadStore()
    const store = useScheduleStore.getState()
    const id = store.createSchedule('S')!
    store.addShift(id, { start: '09:00', end: '13:00' })
    const shifts = () => useScheduleStore.getState().schedules[0].shifts
    expect(shifts()).toHaveLength(3)

    const added = shifts()[2]
    store.updateShift(id, added.id, { start: '10:00', end: '14:00' })
    expect(shifts()[2]).toMatchObject({ start: '10:00', end: '14:00' })

    store.addStaff(id, { name: 'An', maxWeeklyHours: 40 })
    const staffId = useScheduleStore.getState().schedules[0].staff[0].id
    store.addAssignment(id, { staffId, shiftId: added.id, dayIndex: 0 })
    store.removeShift(id, added.id)
    expect(shifts()).toHaveLength(2)
    expect(useScheduleStore.getState().schedules[0].assignments).toEqual([])
  })

  it('assignments: manual source, no duplicates, removable', async () => {
    const { useScheduleStore } = await loadStore()
    const store = useScheduleStore.getState()
    const id = store.createSchedule('S')!
    store.addStaff(id, { name: 'An', maxWeeklyHours: 40 })
    const schedule = () => useScheduleStore.getState().schedules[0]
    const slot = { staffId: schedule().staff[0].id, shiftId: schedule().shifts[0].id, dayIndex: 2 }
    store.addAssignment(id, slot)
    store.addAssignment(id, slot)
    expect(schedule().assignments).toHaveLength(1)
    expect(schedule().assignments[0].source).toBe('manual')
    store.removeAssignment(id, schedule().assignments[0].id)
    expect(schedule().assignments).toEqual([])
  })

  it('sample schedule is ready to auto-schedule, and running it fills the roster', async () => {
    const { useScheduleStore } = await loadStore()
    const id = useScheduleStore.getState().createSampleSchedule()
    const before = useScheduleStore.getState().schedules[0]
    expect(before.staff).toHaveLength(10)
    expect(before.dayLabels).toHaveLength(7)
    expect(before.assignments).toEqual([])

    const result = useScheduleStore.getState().runAutoSchedule(id)!
    expect(result.understaffed).toEqual([])
    const after = useScheduleStore.getState().schedules[0]
    expect(after.assignments).toBe(result.assignments)
    expect(after.assignments).toHaveLength(44)
    expect(useScheduleStore.getState().runAutoSchedule('missing')).toBeNull()
  })

  it('dropOnSlot moves a placement (manual), and refuses duplicates with a reason', async () => {
    const { useScheduleStore } = await loadStore()
    const store = useScheduleStore.getState()
    const id = store.createSampleSchedule()
    store.runAutoSchedule(id)
    const schedule = () => useScheduleStore.getState().schedules[0]
    const chip = schedule().assignments.find((a) => a.dayIndex === 0)!
    const pm = schedule().shifts[1].id

    const moved = store.dropOnSlot(id, { staffId: chip.staffId, assignmentId: chip.id }, { dayIndex: 0, shiftId: pm })
    expect(moved.ok).toBe(true)
    expect(schedule().assignments).toHaveLength(44)
    expect(schedule().assignments.find((a) => a.id === chip.id)).toMatchObject({ shiftId: pm, source: 'manual' })

    const again = store.dropOnSlot(id, { staffId: chip.staffId }, { dayIndex: 0, shiftId: pm })
    expect(again).toEqual({ ok: false, reason: 'duplicate' })
    expect(schedule().assignments).toHaveLength(44)
  })

  it('clearAssignments empties the roster but keeps staff, shifts and demand', async () => {
    const { useScheduleStore } = await loadStore()
    const store = useScheduleStore.getState()
    const id = store.createSampleSchedule()
    store.runAutoSchedule(id)
    const other = store.createSchedule('Other')!
    store.addStaff(other, { name: 'An', maxWeeklyHours: 40 })
    store.addAssignment(other, { staffId: useScheduleStore.getState().schedules[1].staff[0].id, shiftId: useScheduleStore.getState().schedules[1].shifts[0].id, dayIndex: 0 })

    store.clearAssignments(id)
    const [sample, untouched] = useScheduleStore.getState().schedules
    expect(sample.assignments).toEqual([])
    expect(sample.staff).toHaveLength(10)
    expect(Object.keys(sample.transactions)).toHaveLength(112)
    expect(untouched.assignments).toHaveLength(1)
  })

  it('removeAllStaff clears staff and their placements but keeps shifts and demand, and only for that schedule', async () => {
    const { useScheduleStore } = await loadStore()
    const store = useScheduleStore.getState()
    const id = store.createSampleSchedule()
    store.runAutoSchedule(id)
    const other = store.createSampleSchedule()

    store.removeAllStaff(id)
    const [cleared, untouched] = useScheduleStore.getState().schedules
    expect(cleared.staff).toEqual([])
    expect(cleared.assignments).toEqual([])
    expect(cleared.shifts).toHaveLength(2)
    expect(Object.keys(cleared.transactions)).toHaveLength(112)
    expect(untouched.id).toBe(other)
    expect(untouched.staff).toHaveLength(10)
  })

  it('applyScenario sets up and schedules each demo scenario with the measured numbers', async () => {
    const { useScheduleStore } = await loadStore()
    const { buildSummary } = await import('../lib/summary')
    const { assignedHoursByStaff } = await import('../lib/warnings')
    const id = useScheduleStore.getState().createSchedule('Demo')!
    const run = (scenario: 'baseline' | 'short-staffed' | 'short-shifts') => {
      const result = useScheduleStore.getState().applyScenario(id, scenario)!
      const schedule = useScheduleStore.getState().schedules[0]
      const missing = result.understaffed.reduce((sum, s) => sum + s.needed - s.assigned, 0)
      return { schedule, missing, totals: buildSummary(schedule).totals }
    }

    const base = run('baseline')
    expect(base.schedule.scenario).toBe('baseline')
    expect(base.schedule.assignments).toHaveLength(44)
    expect(base.missing).toBe(0)
    expect(base.totals).toMatchObject({ totalStaffHours: 352, requiredStaffHours: 257 })

    const small = run('short-staffed')
    expect(small.schedule.staff).toHaveLength(5)
    expect(small.schedule.assignments).toHaveLength(25)
    expect(small.missing).toBe(19)
    for (const [staffId, hours] of assignedHoursByStaff(small.schedule)) {
      expect(hours).toBeLessThanOrEqual(small.schedule.staff.find((m) => m.id === staffId)!.maxWeeklyHours)
    }

    const short = run('short-shifts')
    expect(short.schedule.shifts).toHaveLength(4)
    expect(short.schedule.assignments).toHaveLength(82)
    expect(short.missing).toBe(0)
    expect(short.totals).toMatchObject({ totalStaffHours: 328, requiredStaffHours: 257 })

    expect(useScheduleStore.getState().applyScenario('missing', 'baseline')).toBeNull()
  })
})
