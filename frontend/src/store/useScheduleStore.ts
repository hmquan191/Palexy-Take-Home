import { create } from 'zustand'
import { persist, type PersistStorage } from 'zustand/middleware'
import type { Schedule } from '../types'

export const STORAGE_KEY = 'staff-scheduling-v1'
export const DEFAULT_N_PER_STAFF = 15
const DEFAULT_DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DEFAULT_SHIFTS = [
  { start: '07:00', end: '15:00' },
  { start: '15:00', end: '23:00' },
]

type State = { schedules: Schedule[] }
type Actions = {
  createSchedule: (name: string) => string | null
  deleteSchedule: (id: string) => void
}

let storageWasReset = false

/** True once if saved data was unreadable and the app fell back to empty state. */
export function consumeStorageReset(): boolean {
  const was = storageWasReset
  storageWasReset = false
  return was
}

// The one place that touches localStorage and the one try/catch: unreadable data must not crash the app.
const storage: PersistStorage<State> = {
  getItem: (name) => {
    const raw = localStorage.getItem(name)
    if (raw === null) return null
    try {
      return JSON.parse(raw)
    } catch {
      storageWasReset = true
      return null
    }
  },
  setItem: (name, value) => localStorage.setItem(name, JSON.stringify(value)),
  removeItem: (name) => localStorage.removeItem(name),
}

export const useScheduleStore = create<State & Actions>()(
  persist(
    (set) => ({
      schedules: [],

      createSchedule: (name) => {
        const trimmed = name.trim()
        if (!trimmed) return null
        const schedule: Schedule = {
          id: crypto.randomUUID(),
          name: trimmed,
          createdAt: new Date().toISOString(),
          nPerStaff: DEFAULT_N_PER_STAFF,
          dayLabels: DEFAULT_DAY_LABELS,
          staff: [],
          shifts: DEFAULT_SHIFTS.map((s) => ({ id: crypto.randomUUID(), ...s })),
          transactions: {},
          assignments: [],
        }
        set((state) => ({ schedules: [...state.schedules, schedule] }))
        return schedule.id
      },

      deleteSchedule: (id) =>
        set((state) => ({ schedules: state.schedules.filter((s) => s.id !== id) })),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage,
      partialize: (state) => ({ schedules: state.schedules }),
      // shortcut: unknown versions reset to empty, add real migrations when the shape changes
      migrate: () => ({ schedules: [] }),
      merge: (persisted, current) => {
        const saved = persisted as Partial<State> | null
        if (!saved || !Array.isArray(saved.schedules)) {
          if (saved) storageWasReset = true
          return current
        }
        return { ...current, schedules: saved.schedules }
      },
    },
  ),
)
