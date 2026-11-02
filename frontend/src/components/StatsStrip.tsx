import { useMemo } from 'react'
import { formatRatio } from '../lib/format'
import { buildSummary } from '../lib/summary'
import { getWarnings } from '../lib/warnings'
import type { Schedule } from '../types'

function Item({ label, value, tone = 'normal' }: { label: string; value: string; tone?: 'normal' | 'warn' }) {
  return (
    <div className="min-w-[120px]">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className={`text-base font-semibold tabular-nums ${tone === 'warn' ? 'text-amber-700' : 'text-neutral-900'}`}>{value}</div>
    </div>
  )
}

/** Always-visible live numbers, so every edit anywhere shows its effect. */
export function StatsStrip({ schedule }: { schedule: Schedule }) {
  const { totals, understaffedHours, flagged } = useMemo(() => {
    const summary = buildSummary(schedule)
    const warnings = getWarnings(schedule)
    return {
      totals: summary.totals,
      understaffedHours: schedule.assignments.length > 0 ? warnings.filter((w) => w.type === 'understaffed').length : 0,
      flagged: new Set(warnings.flatMap((w) => (w.type === 'understaffed' ? [] : [w.staffId]))).size,
    }
  }, [schedule])

  if (Object.keys(schedule.transactions).length === 0 && schedule.assignments.length === 0) return null

  return (
    <div className="mb-4 flex flex-wrap gap-x-8 gap-y-2 rounded-md border border-neutral-200 bg-white px-4 py-3">
      <Item label="Staff hours scheduled" value={`${totals.totalStaffHours} of ${totals.requiredStaffHours} asked for`} />
      <Item label="Transactions per staff hour" value={formatRatio(totals.overallRatio)} />
      <Item label="Hours short of demand" value={String(understaffedHours)} tone={understaffedHours > 0 ? 'warn' : 'normal'} />
      <Item label="Staff to review" value={String(flagged)} tone={flagged > 0 ? 'warn' : 'normal'} />
    </div>
  )
}
