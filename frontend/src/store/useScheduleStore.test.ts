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
})
