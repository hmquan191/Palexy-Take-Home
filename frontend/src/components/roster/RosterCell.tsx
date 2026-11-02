import { useDraggable, useDroppable } from '@dnd-kit/core'
import { Button, Dropdown } from 'antd'
import { AlertTriangle, GripVertical, Plus, X } from 'lucide-react'
import { shiftHeadcount } from '../../lib/demand'
import { DAILY_CAP_HOURS, shiftHours, shiftLabel, shiftsOverlap } from '../../lib/shifts'
import { useScheduleStore } from '../../store/useScheduleStore'
import type { Assignment, Schedule, Shift } from '../../types'
import { cellId, type DragData, type DragState, type DropData } from './dragTypes'
import { problemPhrase } from './text'

export type Issues = { overMax: Set<string>; dayIssue: Set<string> }

function PlacementChip({
  scheduleId,
  assignment,
  name,
  flagged,
  label,
}: {
  scheduleId: string
  assignment: Assignment
  name: string
  flagged: boolean
  label: string
}) {
  const data: DragData = { kind: 'chip', assignmentId: assignment.id, staffId: assignment.staffId }
  const { setNodeRef, setActivatorNodeRef, listeners, attributes, isDragging } = useDraggable({ id: `chip:${assignment.id}`, data })
  return (
    <li
      ref={setNodeRef}
      title={assignment.source === 'manual' ? 'Added or moved by you' : 'Placed by Auto-schedule'}
      className={`flex items-center justify-between gap-1 rounded border px-1 py-0.5 ${isDragging ? 'opacity-40' : ''} ${
        assignment.source === 'manual' ? 'border-sky-300 bg-sky-50' : 'border-neutral-200 bg-neutral-50'
      }`}
    >
      <span
        ref={setActivatorNodeRef}
        {...listeners}
        {...attributes}
        aria-label={`Drag ${name} (${label}) to another shift`}
        className={`flex min-w-0 cursor-grab touch-none items-center gap-0.5 ${flagged ? 'text-red-600' : 'text-neutral-800'}`}
      >
        <GripVertical size={12} className="shrink-0 text-neutral-400" aria-hidden />
        {flagged && <AlertTriangle size={12} aria-label="Needs review" className="shrink-0" />}
        <span className="truncate">{name}</span>
      </span>
      <button
        type="button"
        aria-label={`Remove ${name} from ${label}`}
        className="cursor-pointer rounded border-0 bg-transparent p-0.5 text-neutral-400 hover:text-neutral-800"
        onClick={() => useScheduleStore.getState().removeAssignment(scheduleId, assignment.id)}
      >
        <X size={12} />
      </button>
    </li>
  )
}

export function RosterCell({
  schedule,
  dayIndex,
  shift,
  hoursByStaff,
  issues,
  drag,
}: {
  schedule: Schedule
  dayIndex: number
  shift: Shift
  hoursByStaff: Map<string, number>
  issues: Issues
  drag: DragState
}) {
  const dropData: DropData = { kind: 'cell', dayIndex, shiftId: shift.id }
  const { setNodeRef } = useDroppable({ id: cellId(dayIndex, shift.id), data: dropData })

  const slot = schedule.assignments.filter((a) => a.dayIndex === dayIndex && a.shiftId === shift.id)
  const needed = shiftHeadcount(schedule, dayIndex, shift)
  const has = slot.length
  const short = needed > has
  const dayLabel = schedule.dayLabels[dayIndex]
  const label = `${shiftLabel(shift)} on ${dayLabel}`
  const length = shiftHours(shift)

  const dragging = drag.active !== null
  const isTarget = drag.hover?.kind === 'cell' && drag.hover.dayIndex === dayIndex && drag.hover.shiftId === shift.id
  const preview = isTarget ? drag.preview : null
  const leaving =
    !isTarget && drag.preview?.ok && drag.preview.source?.before.dayIndex === dayIndex && drag.preview.source.before.shiftId === shift.id
      ? drag.preview.source
      : null
  const previewName = preview?.ok ? schedule.staff.find((m) => m.id === preview.staffId)?.name : undefined

  const candidates = schedule.staff
    .filter((m) => !slot.some((a) => a.staffId === m.id))
    .map((m) => {
      const used = hoursByStaff.get(m.id) ?? 0
      const sameDay = schedule.assignments.filter((a) => a.staffId === m.id && a.dayIndex === dayIndex)
      const lengthOf = (a: Assignment) => {
        const other = schedule.shifts.find((s) => s.id === a.shiftId)
        return other ? shiftHours(other) : 0
      }
      const dayHours = sameDay.reduce((sum, a) => sum + lengthOf(a), 0)
      const clashes = sameDay.some((a) => {
        const other = schedule.shifts.find((s) => s.id === a.shiftId)
        return other ? shiftsOverlap(other, shift) : false
      })
      return { member: m, used, overWeek: used + length > m.maxWeeklyHours, busyToday: clashes || (dayHours > 0 && dayHours + length > DAILY_CAP_HOURS) }
    })
    .sort((a, b) => a.used / a.member.maxWeeklyHours - b.used / b.member.maxWeeklyHours || a.member.name.localeCompare(b.member.name))

  let tone = short ? 'border-amber-300 bg-amber-50' : 'border-neutral-200 bg-white'
  if (dragging && !isTarget) tone += ' outline-dashed outline-1 -outline-offset-4 outline-neutral-300'
  if (preview) {
    if (!preview.ok) tone = 'border-neutral-300 bg-neutral-100 outline outline-2 -outline-offset-2 outline-neutral-300'
    else if (preview.problems.length > 0) tone = 'border-amber-300 bg-amber-50 outline outline-2 -outline-offset-2 outline-amber-400'
    else tone = 'border-sky-300 bg-sky-50 outline outline-2 -outline-offset-2 outline-sky-400'
  }

  return (
    <td ref={setNodeRef} className={`align-top border p-2 ${tone}`}>
      {preview ? (
        <div className="mb-1.5 space-y-0.5 text-xs">
          {!preview.ok ? (
            <div className="text-neutral-600">
              {preview.reason === 'duplicate' ? 'Already on this shift' : preview.reason === 'same-slot' ? 'Already here' : 'Cannot drop here'}
            </div>
          ) : (
            <>
              {preview.target && (
                <div className={preview.target.after.has < preview.target.after.needed ? 'font-medium text-amber-700' : 'font-medium text-sky-700'}>
                  After drop: {preview.target.after.has} of {preview.target.after.needed} needed
                </div>
              )}
              <div className={preview.problems.length > 0 ? 'text-amber-800' : 'text-neutral-600'}>
                {previewName}: {preview.hoursBefore} → {preview.hoursAfter}/{preview.maxHours}h
                {preview.problems.map((w) => (
                  <div key={w.type} className="font-medium">
                    {problemPhrase(w)}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="mb-1.5 flex items-center justify-between text-xs">
          {needed > 0 ? (
            <span className={short ? 'font-medium text-amber-700' : 'text-neutral-500'}>
              {short ? `Needs ${needed}, has ${has}` : `${has} of ${needed} needed`}
              {has > needed && <span className="text-sky-600"> (+{has - needed})</span>}
            </span>
          ) : (
            <span className="text-neutral-400">{has === 0 ? 'No demand data' : `${has} scheduled`}</span>
          )}
        </div>
      )}

      {leaving && (
        <div className={`mb-1.5 text-xs ${leaving.after.has < leaving.after.needed ? 'font-medium text-amber-700' : 'text-neutral-500'}`}>
          If they leave: {leaving.after.has} of {leaving.after.needed} needed
        </div>
      )}

      <ul className="m-0 flex list-none flex-col gap-1 p-0">
        {slot.map((a) => {
          const member = schedule.staff.find((m) => m.id === a.staffId)
          if (!member) return null
          const flagged = issues.overMax.has(member.id) || issues.dayIssue.has(`${member.id}|${dayIndex}`)
          return <PlacementChip key={a.id} scheduleId={schedule.id} assignment={a} name={member.name} flagged={flagged} label={label} />
        })}
      </ul>

      <Dropdown
        trigger={['click']}
        disabled={candidates.length === 0}
        menu={{
          style: { maxHeight: 280, overflowY: 'auto' },
          onClick: ({ key }) => useScheduleStore.getState().addAssignment(schedule.id, { staffId: key, shiftId: shift.id, dayIndex }),
          items: candidates.map(({ member, used, overWeek, busyToday }) => ({
            key: member.id,
            label: (
              <span className="flex items-center justify-between gap-4">
                <span>{member.name}</span>
                <span className={`text-xs tabular-nums ${overWeek || busyToday ? 'text-red-600' : 'text-neutral-500'}`}>
                  {used}/{member.maxWeeklyHours}h{overWeek ? ' over limit' : busyToday ? ' busy that day' : ''}
                </span>
              </span>
            ),
          })),
        }}
      >
        <Button size="small" type="text" className="mt-1 text-neutral-500" icon={<Plus size={12} />} aria-label={`Add staff to ${label}`}>
          {schedule.staff.length === 0 ? 'Add staff first' : 'Add'}
        </Button>
      </Dropdown>
    </td>
  )
}
