import { Alert, Button, Dropdown, Popconfirm, Progress } from 'antd'
import { AlertTriangle, Plus, Wand2, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { AutoScheduleResult } from '../lib/autoSchedule'
import { shiftHeadcount } from '../lib/demand'
import { DAILY_CAP_HOURS, shiftHours, shiftLabel, shiftsOverlap, sortShifts } from '../lib/shifts'
import { assignedHoursByStaff, getWarnings, type Warning } from '../lib/warnings'
import { useScheduleStore } from '../store/useScheduleStore'
import type { Schedule, Shift } from '../types'

type Issues = { overMax: Set<string>; dayIssue: Set<string> }

function RosterCell({
  schedule,
  dayIndex,
  shift,
  hoursByStaff,
  issues,
}: {
  schedule: Schedule
  dayIndex: number
  shift: Shift
  hoursByStaff: Map<string, number>
  issues: Issues
}) {
  const { addAssignment, removeAssignment } = useScheduleStore.getState()
  const slot = schedule.assignments.filter((a) => a.dayIndex === dayIndex && a.shiftId === shift.id)
  const needed = shiftHeadcount(schedule, dayIndex, shift)
  const has = slot.length
  const short = needed > has
  const dayLabel = schedule.dayLabels[dayIndex]
  const length = shiftHours(shift)

  const candidates = schedule.staff
    .filter((m) => !slot.some((a) => a.staffId === m.id))
    .map((m) => {
      const used = hoursByStaff.get(m.id) ?? 0
      const sameDay = schedule.assignments.filter((a) => a.staffId === m.id && a.dayIndex === dayIndex)
      const dayHours = sameDay.reduce((sum, a) => {
        const other = schedule.shifts.find((s) => s.id === a.shiftId)
        return sum + (other ? shiftHours(other) : 0)
      }, 0)
      const clashes = sameDay.some((a) => {
        const other = schedule.shifts.find((s) => s.id === a.shiftId)
        return other ? shiftsOverlap(other, shift) : false
      })
      return { member: m, used, overWeek: used + length > m.maxWeeklyHours, busyToday: clashes || (dayHours > 0 && dayHours + length > DAILY_CAP_HOURS) }
    })
    .sort((a, b) => a.used / a.member.maxWeeklyHours - b.used / b.member.maxWeeklyHours || a.member.name.localeCompare(b.member.name))

  return (
    <td className={`align-top border p-2 ${short ? 'border-amber-300 bg-amber-50' : 'border-neutral-200 bg-white'}`}>
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

      <ul className="m-0 flex list-none flex-col gap-1 p-0">
        {slot.map((a) => {
          const member = schedule.staff.find((m) => m.id === a.staffId)
          if (!member) return null
          const flagged = issues.overMax.has(member.id) || issues.dayIssue.has(`${member.id}|${dayIndex}`)
          return (
            <li
              key={a.id}
              title={a.source === 'manual' ? 'Added by you' : 'Placed by Auto-schedule'}
              className={`flex items-center justify-between gap-1 rounded border px-1.5 py-0.5 ${
                a.source === 'manual' ? 'border-sky-300 bg-sky-50' : 'border-neutral-200 bg-neutral-50'
              }`}
            >
              <span className={`flex min-w-0 items-center gap-1 ${flagged ? 'text-red-600' : 'text-neutral-800'}`}>
                {flagged && <AlertTriangle size={12} aria-label="Needs review" className="shrink-0" />}
                <span className="truncate">{member.name}</span>
              </span>
              <button
                type="button"
                aria-label={`Remove ${member.name} from ${shiftLabel(shift)} on ${dayLabel}`}
                className="cursor-pointer rounded border-0 bg-transparent p-0.5 text-neutral-400 hover:text-neutral-800"
                onClick={() => removeAssignment(schedule.id, a.id)}
              >
                <X size={12} />
              </button>
            </li>
          )
        })}
      </ul>

      <Dropdown
        trigger={['click']}
        disabled={candidates.length === 0}
        menu={{
          style: { maxHeight: 280, overflowY: 'auto' },
          onClick: ({ key }) => addAssignment(schedule.id, { staffId: key, shiftId: shift.id, dayIndex }),
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
        <Button
          size="small"
          type="text"
          className="mt-1 text-neutral-500"
          icon={<Plus size={12} />}
          aria-label={`Add staff to ${shiftLabel(shift)} on ${dayLabel}`}
        >
          {schedule.staff.length === 0 ? 'Add staff first' : 'Add'}
        </Button>
      </Dropdown>
    </td>
  )
}

function describe(schedule: Schedule, w: Warning): string {
  const nameOf = (id: string) => schedule.staff.find((m) => m.id === id)?.name ?? 'Someone'
  switch (w.type) {
    case 'over-max':
      return `${nameOf(w.staffId)} is scheduled ${w.assignedHours}h, over their ${w.maxHours}h weekly limit.`
    case 'over-daily':
      return `${nameOf(w.staffId)} works ${w.hours}h on ${schedule.dayLabels[w.dayIndex]}, over the ${DAILY_CAP_HOURS}h daily cap.`
    case 'overlap':
      return `${nameOf(w.staffId)} has overlapping shifts on ${schedule.dayLabels[w.dayIndex]}.`
    case 'understaffed':
      return ''
  }
}

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
          <p className="m-0 mb-1">
            {result.createdCount} shifts were placed without going over anyone's weekly hours. Still short:
          </p>
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

export function RosterTab({ schedule }: { schedule: Schedule }) {
  const [result, setResult] = useState<AutoScheduleResult | null>(null)
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
  const staffProblems = warnings.map((w) => describe(schedule, w)).filter(Boolean)
  const understaffedHours = warnings.filter((w) => w.type === 'understaffed').length
  const hasRoster = schedule.assignments.length > 0
  const autoCount = schedule.assignments.filter((a) => a.source === 'auto').length

  const run = () => setResult(useScheduleStore.getState().runAutoSchedule(schedule.id))
  const showResult = result !== null && result.assignments === schedule.assignments

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="m-0 text-neutral-500">
          Who works which shift. Use Auto-schedule for a first draft, then add or remove people in any cell.
        </p>
        {autoCount > 0 ? (
          <Popconfirm
            title="Run Auto-schedule again?"
            description={`It replaces the ${autoCount} placements it made earlier. Anything you added yourself (blue) is kept.`}
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
              ? 'Add staff and upload demand data first, then run Auto-schedule. You can also add people to cells by hand.'
              : 'Click Auto-schedule for a draft, or add people to cells by hand.'
          }
        />
      )}

      {shifts.length === 0 ? (
        <Alert type="info" showIcon title="No shifts yet" description="Add a shift on the Shifts tab to start building the roster." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 w-28 border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-left font-medium">Shift</th>
                {schedule.dayLabels.map((label) => (
                  <th key={label} className="min-w-[150px] border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-left font-medium">
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
                    <RosterCell key={dayIndex} schedule={schedule} dayIndex={dayIndex} shift={shift} hoursByStaff={hoursByStaff} issues={issues} />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-2 text-xs text-neutral-500">
        Blue = added by you, grey = placed by Auto-schedule. Amber cells have fewer people than the busiest hour in that shift needs.
        In the Add list, people with the fewest hours so far come first.
      </p>

      {schedule.staff.length > 0 && (
        <div className="mt-5">
          <h2 className="mb-2 text-sm font-semibold text-neutral-900">Hours this week</h2>
          <div className="grid gap-x-8 gap-y-2 md:grid-cols-2">
            {schedule.staff.map((m) => {
              const used = hoursByStaff.get(m.id) ?? 0
              const over = used > m.maxWeeklyHours
              return (
                <div key={m.id} className="flex items-center gap-3">
                  <span className="w-32 shrink-0 truncate">{m.name}</span>
                  <Progress
                    className="m-0 flex-1"
                    size="small"
                    percent={Math.min(100, (used / m.maxWeeklyHours) * 100)}
                    status={over ? 'exception' : 'normal'}
                    showInfo={false}
                  />
                  <span className={`w-16 shrink-0 text-right tabular-nums ${over ? 'font-medium text-red-600' : 'text-neutral-600'}`}>
                    {used}/{m.maxWeeklyHours}h
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}
