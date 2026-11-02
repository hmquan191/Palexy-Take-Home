import type { Assignment, Schedule } from '../types'
import { shiftHeadcount } from './demand'
import { assignedHoursByStaff, getWarnings, type Warning } from './warnings'

/** What is being dragged: a person (from the staff list) or one of their existing placements (a chip in a cell). */
export type DragSource = { staffId: string; assignmentId?: string }
export type DropTarget = { dayIndex: number; shiftId: string }

export type DropFailure = 'same-slot' | 'duplicate' | 'unknown-shift' | 'unknown-staff' | 'unknown-assignment'
export type DropResult = { ok: true; assignments: Assignment[] } | { ok: false; reason: DropFailure }

/**
 * The single place that decides what a drop does to the roster. The store commits its result and the drag preview
 * reads it, so what you see while dragging is exactly what you get on release. A moved or added placement is
 * always manual, so a later Auto-schedule keeps it.
 */
export function applyDrop(
  schedule: Schedule,
  source: DragSource,
  target: DropTarget,
  newId: () => string = () => crypto.randomUUID(),
): DropResult {
  if (!schedule.staff.some((m) => m.id === source.staffId)) return { ok: false, reason: 'unknown-staff' }
  if (!schedule.shifts.some((s) => s.id === target.shiftId)) return { ok: false, reason: 'unknown-shift' }

  const moving = source.assignmentId ? schedule.assignments.find((a) => a.id === source.assignmentId) : undefined
  if (source.assignmentId && !moving) return { ok: false, reason: 'unknown-assignment' }
  if (moving && moving.dayIndex === target.dayIndex && moving.shiftId === target.shiftId) {
    return { ok: false, reason: 'same-slot' }
  }

  const alreadyThere = schedule.assignments.some(
    (a) => a.id !== moving?.id && a.staffId === source.staffId && a.dayIndex === target.dayIndex && a.shiftId === target.shiftId,
  )
  if (alreadyThere) return { ok: false, reason: 'duplicate' }

  if (moving) {
    return {
      ok: true,
      assignments: schedule.assignments.map((a) => (a.id === moving.id ? { ...a, ...target, source: 'manual' } : a)),
    }
  }
  return { ok: true, assignments: [...schedule.assignments, { id: newId(), staffId: source.staffId, ...target, source: 'manual' }] }
}

export type SlotCount = { dayIndex: number; shiftId: string; has: number; needed: number }

export type DropPreview =
  | { ok: false; reason: DropFailure }
  | {
      ok: true
      staffId: string
      hoursBefore: number
      hoursAfter: number
      maxHours: number
      /** the cell it lands in (null when the placement is being removed) */
      target: { before: SlotCount; after: SlotCount } | null
      /** the cell it leaves (null when a person is added from the staff list) */
      source: { before: SlotCount; after: SlotCount } | null
      /** this person's limit problems once the drop has happened */
      problems: Warning[]
    }

function slotCount(schedule: Schedule, dayIndex: number, shiftId: string): SlotCount {
  const shift = schedule.shifts.find((s) => s.id === shiftId)
  return {
    dayIndex,
    shiftId,
    has: schedule.assignments.filter((a) => a.dayIndex === dayIndex && a.shiftId === shiftId).length,
    needed: shift ? shiftHeadcount(schedule, dayIndex, shift) : 0,
  }
}

/** Numbers for "if you let go here": hours for the person and headcount for the cells involved. */
export function previewDrop(schedule: Schedule, source: DragSource, target: DropTarget | 'remove'): DropPreview {
  const staff = schedule.staff.find((m) => m.id === source.staffId)
  if (!staff) return { ok: false, reason: 'unknown-staff' }
  const existing = source.assignmentId ? schedule.assignments.find((a) => a.id === source.assignmentId) : undefined
  if (source.assignmentId && !existing) return { ok: false, reason: 'unknown-assignment' }

  let assignments: Assignment[]
  if (target === 'remove') {
    if (!existing) return { ok: false, reason: 'unknown-assignment' }
    assignments = schedule.assignments.filter((a) => a.id !== existing.id)
  } else {
    const result = applyDrop(schedule, source, target)
    if (!result.ok) return result
    assignments = result.assignments
  }

  const after: Schedule = { ...schedule, assignments }
  return {
    ok: true,
    staffId: staff.id,
    hoursBefore: assignedHoursByStaff(schedule).get(staff.id) ?? 0,
    hoursAfter: assignedHoursByStaff(after).get(staff.id) ?? 0,
    maxHours: staff.maxWeeklyHours,
    target:
      target === 'remove'
        ? null
        : { before: slotCount(schedule, target.dayIndex, target.shiftId), after: slotCount(after, target.dayIndex, target.shiftId) },
    source: existing
      ? { before: slotCount(schedule, existing.dayIndex, existing.shiftId), after: slotCount(after, existing.dayIndex, existing.shiftId) }
      : null,
    problems: getWarnings(after).filter((w): w is Exclude<Warning, { type: 'understaffed' }> => w.type !== 'understaffed' && w.staffId === staff.id),
  }
}
