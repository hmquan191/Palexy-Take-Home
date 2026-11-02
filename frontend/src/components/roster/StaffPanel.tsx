import { useDraggable, useDroppable } from '@dnd-kit/core'
import { Progress } from 'antd'
import { GripVertical } from 'lucide-react'
import type { Schedule, Staff } from '../../types'
import type { DragData, DragState, DropData } from './dragTypes'

function StaffRow({ member, used, drag }: { member: Staff; used: number; drag: DragState }) {
  const data: DragData = { kind: 'staff', staffId: member.id }
  const { setNodeRef, setActivatorNodeRef, listeners, attributes, isDragging } = useDraggable({ id: `staff:${member.id}`, data })

  // while a drag is hovering a valid spot, this person's bar shows the hours they would have after the drop
  const preview = drag.preview?.ok && drag.preview.staffId === member.id ? drag.preview : null
  const shown = preview ? preview.hoursAfter : used
  const over = shown > member.maxWeeklyHours

  return (
    <div ref={setNodeRef} className={`flex items-center gap-3 ${isDragging ? 'opacity-40' : ''}`}>
      <span
        ref={setActivatorNodeRef}
        {...listeners}
        {...attributes}
        aria-label={`Drag ${member.name} onto a shift`}
        className="flex w-36 shrink-0 cursor-grab touch-none items-center gap-0.5 rounded border border-transparent px-0.5 hover:border-neutral-200"
      >
        <GripVertical size={12} className="shrink-0 text-neutral-400" aria-hidden />
        <span className="truncate">{member.name}</span>
      </span>
      <Progress
        className="m-0 flex-1"
        size="small"
        percent={Math.min(100, (shown / member.maxWeeklyHours) * 100)}
        status={over ? 'exception' : preview ? 'active' : 'normal'}
        showInfo={false}
      />
      <span className={`w-24 shrink-0 text-right tabular-nums ${over ? 'font-medium text-red-600' : 'text-neutral-600'}`}>
        {preview && preview.hoursAfter !== preview.hoursBefore ? `${preview.hoursBefore} → ` : ''}
        {shown}/{member.maxWeeklyHours}h
      </span>
    </div>
  )
}

/** Hours per person. Doubles as the pool people are dragged from, and where a placement is dropped to remove it. */
export function StaffPanel({ schedule, hoursByStaff, drag }: { schedule: Schedule; hoursByStaff: Map<string, number>; drag: DragState }) {
  const dropData: DropData = { kind: 'pool' }
  const { setNodeRef } = useDroppable({ id: 'pool', data: dropData })
  const removing = drag.active?.kind === 'chip'
  const hovering = drag.hover?.kind === 'pool'

  return (
    <div
      ref={setNodeRef}
      className={`mt-5 rounded-md p-3 ${
        removing ? (hovering ? 'bg-red-50 outline outline-2 -outline-offset-2 outline-red-300' : 'outline-dashed outline-1 -outline-offset-2 outline-neutral-300') : ''
      }`}
    >
      <h2 className="mb-1 text-sm font-semibold text-neutral-900">Hours this week</h2>
      <p className="mb-2 text-xs text-neutral-500">
        {removing
          ? 'Drop here to take this person off the shift.'
          : 'Drag a name onto a shift to add them. The bar shows their hours after the drop before you let go.'}
      </p>
      <div className="grid gap-x-8 gap-y-2 md:grid-cols-2">
        {schedule.staff.map((m) => (
          <StaffRow key={m.id} member={m} used={hoursByStaff.get(m.id) ?? 0} drag={drag} />
        ))}
      </div>
    </div>
  )
}
