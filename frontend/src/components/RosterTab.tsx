import { DndContext, type DragEndEvent, type DragOverEvent, DragOverlay, type DragStartEvent, PointerSensor, pointerWithin, useSensor, useSensors } from '@dnd-kit/core'
import { Alert, App, Button, Popconfirm } from 'antd'
import { GripVertical, Wand2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { AutoScheduleResult } from '../lib/autoSchedule'
import { type DragSource, previewDrop } from '../lib/roster'
import { shiftHours, shiftLabel, sortShifts } from '../lib/shifts'
import { assignedHoursByStaff, getWarnings } from '../lib/warnings'
import { useScheduleStore } from '../store/useScheduleStore'
import type { Schedule } from '../types'
import { type DragData, type DragState, type DropData, IDLE_DRAG } from './roster/dragTypes'
import { type Issues, RosterCell } from './roster/RosterCell'
import { StaffPanel } from './roster/StaffPanel'
import { warningSentence } from './roster/text'

function ResultBanner({ schedule, result }: { schedule: Schedule; result: AutoScheduleResult }) {
  const missing = result.understaffed.reduce((sum, s) => sum + s.needed - s.assigned, 0)
  const shiftName = (id: string) => {
    const shift = schedule.shifts.find((s) => s.id === id)
    return shift ? shiftLabel(shift) : 'removed shift'
  }
  if (result.notes.length > 0 && result.createdCount === 0) {
    return <Alert className="mb-3" type="info" showIcon title="Nothing was scheduled" description={result.notes.join(' ')} />
  }
  if (result.understaffed.length === 0) {
    return (
      <Alert
        className="mb-3"
        type="success"
        showIcon
        title={`Draft ready: ${result.createdCount} shifts placed, every shift has the people it needs`}
        description={`Nobody is over their hours. ${result.unusedHours}h of contract time is left unused. Adjust anything below; the summary updates as you go.`}
      />
    )
  }
  return (
    <Alert
      className="mb-3"
      type="warning"
      showIcon
      title={`Draft ready, but ${missing} place${missing === 1 ? '' : 's'} could not be filled`}
      description={
        <div>
          <p className="m-0 mb-1">{result.createdCount} shifts were placed without going over anyone's weekly hours. Still short:</p>
          <ul className="m-0 pl-4">
            {result.understaffed.slice(0, 6).map((s) => (
              <li key={`${s.dayIndex}-${s.shiftId}`}>
                {schedule.dayLabels[s.dayIndex]}, {shiftName(s.shiftId)}: needs {s.needed}, has {s.assigned}
              </li>
            ))}
            {result.understaffed.length > 6 && <li>and {result.understaffed.length - 6} more (amber cells below)</li>}
          </ul>
          <p className="m-0 mt-1">To fix: add staff, raise weekly limits, or add people by hand, then run Auto-schedule again.</p>
        </div>
      }
    />
  )
}

const toSource = (d: DragData): DragSource => ({ staffId: d.staffId, assignmentId: d.kind === 'chip' ? d.assignmentId : undefined })

export function RosterTab({ schedule }: { schedule: Schedule }) {
  const { message } = App.useApp()
  const [result, setResult] = useState<AutoScheduleResult | null>(null)
  const [active, setActive] = useState<DragData | null>(null)
  const [hover, setHover] = useState<DropData | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const shifts = sortShifts(schedule.shifts)
  const hoursByStaff = useMemo(() => assignedHoursByStaff(schedule), [schedule])
  const warnings = useMemo(() => getWarnings(schedule), [schedule])

  const issues: Issues = useMemo(
    () => ({
      overMax: new Set(warnings.flatMap((w) => (w.type === 'over-max' ? [w.staffId] : []))),
      dayIssue: new Set(warnings.flatMap((w) => (w.type === 'over-daily' || w.type === 'overlap' ? [`${w.staffId}|${w.dayIndex}`] : []))),
    }),
    [warnings],
  )

  // what letting go right now would do; the same calculation the drop itself uses
  const preview = useMemo(() => {
    if (!active || !hover) return null
    if (hover.kind === 'pool') return active.kind === 'chip' ? previewDrop(schedule, toSource(active), 'remove') : null
    return previewDrop(schedule, toSource(active), { dayIndex: hover.dayIndex, shiftId: hover.shiftId })
  }, [schedule, active, hover])
  const drag: DragState = active ? { active, hover, preview } : IDLE_DRAG

  const staffProblems = warnings.map((w) => warningSentence(schedule, w)).filter(Boolean)
  const understaffedHours = warnings.filter((w) => w.type === 'understaffed').length
  const hasRoster = schedule.assignments.length > 0
  const autoCount = schedule.assignments.filter((a) => a.source === 'auto').length
  const nameOf = (staffId: string) => schedule.staff.find((m) => m.id === staffId)?.name ?? 'Someone'

  const run = () => setResult(useScheduleStore.getState().runAutoSchedule(schedule.id))
  const showResult = result !== null && result.assignments === schedule.assignments

  const clearDrag = () => {
    setActive(null)
    setHover(null)
  }

  const onDragStart = (e: DragStartEvent) => setActive(e.active.data.current as DragData)
  const onDragOver = (e: DragOverEvent) => setHover((e.over?.data.current as DropData | undefined) ?? null)
  const onDragEnd = (e: DragEndEvent) => {
    const dragged = e.active.data.current as DragData | undefined
    const over = e.over?.data.current as DropData | undefined
    clearDrag()
    if (!dragged || !over) return

    const store = useScheduleStore.getState()
    if (over.kind === 'pool') {
      if (dragged.kind === 'chip') store.removeAssignment(schedule.id, dragged.assignmentId)
      return
    }
    const target = { dayIndex: over.dayIndex, shiftId: over.shiftId }
    const outcome = previewDrop(schedule, toSource(dragged), target)
    const committed = store.dropOnSlot(schedule.id, toSource(dragged), target)
    if (!committed.ok) {
      if (committed.reason === 'duplicate') {
        message.info(`${nameOf(dragged.staffId)} is already on that shift on ${schedule.dayLabels[target.dayIndex]}.`)
      }
      return
    }
    if (outcome.ok && outcome.problems.length > 0) {
      message.warning(outcome.problems.map((w) => warningSentence(schedule, w)).join(' '))
    }
  }

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="m-0 text-neutral-500">
          Who works which shift. Use Auto-schedule for a first draft, then drag people between cells, or use Add in a cell.
        </p>
        {autoCount > 0 ? (
          <Popconfirm
            title="Run Auto-schedule again?"
            description={`It replaces the ${autoCount} placements it made earlier. Anything you added or moved yourself (blue) is kept.`}
            okText="Replace"
            onConfirm={run}
          >
            <Button type="primary" icon={<Wand2 size={14} />}>
              Auto-schedule
            </Button>
          </Popconfirm>
        ) : (
          <Button type="primary" icon={<Wand2 size={14} />} onClick={run}>
            Auto-schedule
          </Button>
        )}
      </div>

      {showResult && <ResultBanner schedule={schedule} result={result} />}

      {hasRoster && (staffProblems.length > 0 || understaffedHours > 0) && (
        <Alert
          className="mb-3"
          type="warning"
          showIcon
          title="Worth a look"
          description={
            <ul className="m-0 pl-4">
              {understaffedHours > 0 && (
                <li>
                  {understaffedHours} hour{understaffedHours === 1 ? ' is' : 's are'} below the staffing the demand asks for (amber cells).
                </li>
              )}
              {staffProblems.slice(0, 5).map((text) => (
                <li key={text}>{text}</li>
              ))}
              {staffProblems.length > 5 && <li>and {staffProblems.length - 5} more.</li>}
            </ul>
          }
        />
      )}

      {!hasRoster && (
        <Alert
          className="mb-3"
          type="info"
          showIcon
          title="The roster is empty"
          description={
            schedule.staff.length === 0 || Object.keys(schedule.transactions).length === 0
              ? 'Add staff and upload demand data first, then run Auto-schedule. You can also drag people from the list below onto shifts.'
              : 'Click Auto-schedule for a draft, or drag people from the list below onto shifts.'
          }
        />
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={clearDrag}
      >
        {shifts.length === 0 ? (
          <Alert type="info" showIcon title="No shifts yet" description="Add a shift on the Shifts tab to start building the roster." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 w-28 border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-left font-medium">Shift</th>
                  {schedule.dayLabels.map((label) => (
                    <th key={label} className="min-w-37.5 border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-left font-medium">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shifts.map((shift) => (
                  <tr key={shift.id}>
                    <th className="sticky left-0 z-10 border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-left align-top font-medium">
                      {shiftLabel(shift)}
                      <div className="text-xs font-normal text-neutral-500">{shiftHours(shift)} hours</div>
                    </th>
                    {schedule.dayLabels.map((_, dayIndex) => (
                      <RosterCell key={dayIndex} schedule={schedule} dayIndex={dayIndex} shift={shift} hoursByStaff={hoursByStaff} issues={issues} drag={drag} />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-2 text-xs text-neutral-500">
          Blue = added or moved by you, grey = placed by Auto-schedule. Amber cells have fewer people than the busiest hour in that shift
          needs. Drag by the grip; while you hold a person over a cell it shows the headcount and their hours after the drop.
        </p>

        {schedule.staff.length > 0 && <StaffPanel schedule={schedule} hoursByStaff={hoursByStaff} drag={drag} />}

        <DragOverlay dropAnimation={null}>
          {active && (
            <div className="pointer-events-none flex cursor-grabbing items-center gap-1 rounded border border-sky-400 bg-white px-2 py-1 shadow-md">
              <GripVertical size={12} className="text-neutral-400" aria-hidden />
              {nameOf(active.staffId)}
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </section>
  )
}
