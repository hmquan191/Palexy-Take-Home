import { create } from 'zustand'
import { persist, type PersistStorage } from 'zustand/middleware'
import { type AutoScheduleResult, autoSchedule } from '../lib/autoSchedule'
import { type ParsedDemand, parseTransactionCsv } from '../lib/parseTransactionCsv'
import { SAMPLE_CSV, SAMPLE_STAFF } from '../lib/sampleData'
import type { Schedule, Shift, Staff } from '../types'

export const STORAGE_KEY = 'staff-scheduling-v1'
export const DEFAULT_N_PER_STAFF = 15
const DEFAULT_DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DEFAULT_SHIFTS = [
  { start: '07:00', end: '15:00' },
  { start: '15:00', end: '23:00' },
]

type State = { schedules: Schedule[] }
export type StaffInput = Pick<Staff, 'name' | 'maxWeeklyHours'>
export type ShiftInput = Pick<Shift, 'start' | 'end'>
type Actions = {
  createSchedule: (name: string) => string | null
  createSampleSchedule: () => string
  deleteSchedule: (id: string) => void
  setNPerStaff: (scheduleId: string, n: number) => void
  addStaff: (scheduleId: string, input: StaffInput) => void
  updateStaff: (scheduleId: string, staffId: string, input: StaffInput) => void
  removeStaff: (scheduleId: string, staffId: string) => void
  importTransactions: (scheduleId: string, demand: Pick<ParsedDemand, 'dayLabels' | 'transactions'>) => void
  addShift: (scheduleId: string, input: ShiftInput) => void
  updateShift: (scheduleId: string, shiftId: string, input: ShiftInput) => void
  removeShift: (scheduleId: string, shiftId: string) => void
  addAssignment: (scheduleId: string, slot: { staffId: string; shiftId: string; dayIndex: number }) => void
  removeAssignment: (scheduleId: string, assignmentId: string) => void
  /** Replaces auto-generated assignments, keeps manual ones. Returns what happened, or null if the schedule is gone. */
  runAutoSchedule: (scheduleId: string) => AutoScheduleResult | null
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

function newSchedule(name: string): Schedule {
  return {
    id: crypto.randomUUID(),
    name,
    createdAt: new Date().toISOString(),
    nPerStaff: DEFAULT_N_PER_STAFF,
    dayLabels: DEFAULT_DAY_LABELS,
    staff: [],
    shifts: DEFAULT_SHIFTS.map((s) => ({ id: crypto.randomUUID(), ...s })),
    transactions: {},
    assignments: [],
  }
}

type Set = (fn: (state: State) => Partial<State>) => void

function update(set: Set, scheduleId: string, patch: (schedule: Schedule) => Partial<Schedule>) {
  set((state) => ({
    schedules: state.schedules.map((s) => (s.id === scheduleId ? { ...s, ...patch(s) } : s)),
  }))
}

export const useScheduleStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      schedules: [],

      createSchedule: (name) => {
        const trimmed = name.trim()
        if (!trimmed) return null
        const schedule = newSchedule(trimmed)
        set((state) => ({ schedules: [...state.schedules, schedule] }))
        return schedule.id
      },

      createSampleSchedule: () => {
        const parsed = parseTransactionCsv(SAMPLE_CSV)
        if (!parsed.ok) throw new Error('Bundled sample CSV is invalid')
        const base = newSchedule('Sample week (Aug 2026)')
        const schedule: Schedule = {
          ...base,
          dayLabels: parsed.data.dayLabels,
          transactions: parsed.data.transactions,
          staff: SAMPLE_STAFF.map((m) => ({ id: crypto.randomUUID(), ...m })),
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

      addShift: (scheduleId, input) =>
        update(set, scheduleId, (s) => ({ shifts: [...s.shifts, { id: crypto.randomUUID(), ...input }] })),

      updateShift: (scheduleId, shiftId, input) =>
        update(set, scheduleId, (s) => ({ shifts: s.shifts.map((x) => (x.id === shiftId ? { ...x, ...input } : x)) })),

      removeShift: (scheduleId, shiftId) =>
        update(set, scheduleId, (s) => ({
          shifts: s.shifts.filter((x) => x.id !== shiftId),
          assignments: s.assignments.filter((a) => a.shiftId !== shiftId),
        })),

      addAssignment: (scheduleId, slot) =>
        update(set, scheduleId, (s) => {
          const exists = s.assignments.some(
            (a) => a.staffId === slot.staffId && a.shiftId === slot.shiftId && a.dayIndex === slot.dayIndex,
          )
          return exists ? {} : { assignments: [...s.assignments, { id: crypto.randomUUID(), source: 'manual', ...slot }] }
        }),

      removeAssignment: (scheduleId, assignmentId) =>
        update(set, scheduleId, (s) => ({ assignments: s.assignments.filter((a) => a.id !== assignmentId) })),

      runAutoSchedule: (scheduleId) => {
        const schedule = get().schedules.find((s) => s.id === scheduleId)
        if (!schedule) return null
        const result = autoSchedule(schedule)
        update(set, scheduleId, () => ({ assignments: result.assignments }))
        return result
      },
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
