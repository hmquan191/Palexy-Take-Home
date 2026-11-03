import { App, Button, Popconfirm } from 'antd'
import { ChevronDown, ChevronUp, FlaskConical } from 'lucide-react'
import { useMemo, useState } from 'react'
import { formatRatio } from '../lib/format'
import { SCENARIOS, scenarioById } from '../lib/scenarios'
import { buildSummary } from '../lib/summary'
import { assignedHoursByStaff, getWarnings } from '../lib/warnings'
import { useScheduleStore } from '../store/useScheduleStore'
import type { ScenarioId, Schedule } from '../types'

function Bullets({ title, items, tone }: { title: string; items: string[]; tone: 'good' | 'bad' }) {
  return (
    <div>
      <h3 className={`mb-1 text-xs font-semibold uppercase tracking-wide ${tone === 'good' ? 'text-emerald-700' : 'text-amber-700'}`}>{title}</h3>
      <ul className="m-0 list-disc space-y-1 pl-4 text-neutral-700">
        {items.map((text) => (
          <li key={text}>{text}</li>
        ))}
      </ul>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-32">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="text-base font-semibold tabular-nums text-neutral-900">{value}</div>
    </div>
  )
}

/** Demo scenarios: one click sets up the schedule, runs Auto-schedule and explains the trade-off with live numbers. */
export function ScenarioBar({ schedule, onApplied }: { schedule: Schedule; onApplied: () => void }) {
  const { message } = App.useApp()
  const [open, setOpen] = useState(true)
  const active = schedule.scenario ? scenarioById(schedule.scenario) : null

  // live numbers, so the explanation always matches what the scheduler actually produced
  const live = useMemo(() => {
    const summary = buildSummary(schedule)
    const warnings = getWarnings(schedule)
    const contract = schedule.staff.reduce((sum, m) => sum + m.maxWeeklyHours, 0)
    const used = [...assignedHoursByStaff(schedule).values()].reduce((a, b) => a + b, 0)
    return {
      placements: schedule.assignments.length,
      scheduled: summary.totals.totalStaffHours,
      required: summary.totals.requiredStaffHours,
      ratio: summary.totals.overallRatio,
      shortHours: warnings.filter((w) => w.type === 'understaffed').length,
      unused: contract - used,
    }
  }, [schedule])

  const hasOwnData = !schedule.scenario && (schedule.staff.length > 0 || schedule.assignments.length > 0 || Object.keys(schedule.transactions).length > 0)

  const apply = (id: ScenarioId) => {
    useScheduleStore.getState().applyScenario(schedule.id, id)
    message.success(`${scenarioById(id).button} applied and scheduled.`)
    onApplied()
  }

  return (
    <div className="mb-4 rounded-md border border-sky-200 bg-sky-50/50 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 flex items-center gap-1 font-medium text-neutral-800">
          <FlaskConical size={14} aria-hidden /> Demo scenarios
        </span>
        {SCENARIOS.map((s) => (
          <Popconfirm
            key={s.id}
            title="Replace this schedule's data?"
            description="Staff, shifts, N, demand data and the roster are replaced by the scenario's. Use a new schedule to keep your own."
            okText="Replace"
            okButtonProps={{ danger: true }}
            disabled={!hasOwnData}
            onConfirm={() => apply(s.id)}
          >
            <Button type={schedule.scenario === s.id ? 'primary' : 'default'} onClick={hasOwnData ? undefined : () => apply(s.id)}>
              {s.button}
            </Button>
          </Popconfirm>
        ))}
        <span className="text-xs text-neutral-500">One click sets up the team, shifts and N, runs Auto-schedule and shows the trade-off. Uses the provided sample week.</span>
        {active && (
          <Button type="text" size="small" className="ml-auto" icon={open ? <ChevronUp size={14} /> : <ChevronDown size={14} />} onClick={() => setOpen(!open)}>
            {open ? 'Hide' : 'Show'} explanation
          </Button>
        )}
      </div>

      {active && open && (
        <div className="mt-3 space-y-3 border-t border-sky-200 pt-3">
          <div>
            <h2 className="m-0 text-sm font-semibold text-neutral-900">{active.title}</h2>
            <p className="m-0 mt-1 text-neutral-700">{active.idea}</p>
          </div>

          <ul className="m-0 list-disc space-y-0.5 pl-4 text-neutral-600">
            {active.setup.map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ul>

          <div className="flex flex-wrap gap-x-8 gap-y-2 rounded border border-neutral-200 bg-white px-3 py-2">
            <Metric label="Placements" value={String(live.placements)} />
            <Metric label="Staff hours scheduled / asked for" value={`${live.scheduled} / ${live.required}`} />
            <Metric label="Hours below demand" value={String(live.shortHours)} />
            <Metric label="Contract hours unused" value={`${live.unused}h`} />
            <Metric label="Transactions per staff hour" value={formatRatio(live.ratio)} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Bullets title="Pros" items={active.pros} tone="good" />
            <Bullets title="Cons" items={active.cons} tone="bad" />
          </div>

          <p className="m-0 rounded bg-white px-3 py-2 text-neutral-800">
            <span className="font-semibold">Trade-off: </span>
            {active.tradeoff}
          </p>
          <p className="m-0 text-xs text-neutral-500">Numbers are for this sample week and the greedy scheduler. They update if you edit the roster, N or the team.</p>
        </div>
      )}
    </div>
  )
}
