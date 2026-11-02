import type { DropPreview } from '../../lib/roster'

/** A placement chip in a cell, or a person in the staff list. */
export type DragData = { kind: 'chip'; assignmentId: string; staffId: string } | { kind: 'staff'; staffId: string }

/** A roster cell, or the staff list (dropping a chip there takes the person off that shift). */
export type DropData = { kind: 'cell'; dayIndex: number; shiftId: string } | { kind: 'pool' }

export type DragState = {
  active: DragData | null
  hover: DropData | null
  /** what releasing over `hover` would do, null when nothing is being dragged over a valid area */
  preview: DropPreview | null
}

export const IDLE_DRAG: DragState = { active: null, hover: null, preview: null }

export const cellId = (dayIndex: number, shiftId: string) => `cell:${dayIndex}:${shiftId}`
