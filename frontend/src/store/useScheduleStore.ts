import { create } from 'zustand'
import { persist, type PersistStorage } from 'zustand/middleware'
import type { ParsedDemand } from '../lib/parseTransactionCsv'
import type { Schedule, Staff } from '../types'

export const STORAGE_KEY = 'staff-scheduling-v1'
export const DEFAULT_N_PER_STAFF = 15
const DEFAULT_DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DEFAULT_SHIFTS = [
  { start: '07:00', end: '15:00' },
  { start: '15:00', end: '23:00' },
]

type State = { schedules: Schedule[] }
export type StaffInput = Pick<Staff, 'name' | 'maxWeeklyHours'>
type Actions = {
  createSchedule: (name: string) => string | null
  deleteSchedule: (id: string) => void
  setNPerStaff: (scheduleId: string, n: number) => void
  addStaff: (scheduleId: string, input: StaffInput) => void
  updateStaff: (scheduleId: string, staffId: string, input: StaffInput) => void
  removeStaff: (scheduleId: string, staffId: string) => void
  importTransactions: (scheduleId: string, demand: Pick<ParsedDemand, 'dayLabels' | 'transactions'>) => void
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

type Set = (fn: (state: State) => Partial<State>) => void

function update(set: Set, scheduleId: string, patch: (schedule: Schedule) => Partial<Schedule>) {
  set((state) => ({
    schedules: state.schedules.map((s) => (s.id === scheduleId ? { ...s, ...patch(s) } : s)),
  }))
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

      setNPerStaff: (scheduleId, n) => {
        if (Number.isInteger(n) && n >= 1) update(set, scheduleId, () => ({ nPerStaff: n }))
      },

      addStaff: (scheduleId, input) =>
        update(set, scheduleId, (s) => ({
          staff: [...s.staff, { id: crypto.randomUUID(), name: input.name.trim(), maxWeeklyHours: input.maxWeeklyHours }],
        })),

      updateStaff: (scheduleId, staffId, input) =>
        update(set, scheduleId, (s) => ({
          staff: s.staff.map((m) =>
            m.id === staffId ? { ...m, name: input.name.trim(), maxWeeklyHours: input.maxWeeklyHours } : m,
          ),
        })),

      removeStaff: (scheduleId, staffId) =>
        update(set, scheduleId, (s) => ({
          staff: s.staff.filter((m) => m.id !== staffId),
          assignments: s.assignments.filter((a) => a.staffId !== staffId),
        })),

      importTransactions: (scheduleId, { dayLabels, transactions }) =>
        update(set, scheduleId, (s) => ({
          dayLabels,
          transactions,
          assignments: s.assignments.filter((a) => a.dayIndex < dayLabels.length),
        })),
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
