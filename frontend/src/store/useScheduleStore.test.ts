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
})
